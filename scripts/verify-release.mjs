import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const allowPlaceholders = process.argv.includes("--allow-placeholders");
const failures = [];

async function read(relativePath) {
  return readFile(path.join(root, relativePath), "utf8");
}

async function filesUnder(directory) {
  const entries = await readdir(directory);
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(directory, entry);
    if ((await stat(absolute)).isDirectory()) files.push(...(await filesUnder(absolute)));
    else files.push(absolute);
  }
  return files;
}

function requireCondition(condition, message) {
  if (!condition) failures.push(message);
}

const packageJson = JSON.parse(await read("package.json"));
let manifest;
try {
  manifest = JSON.parse(await read("dist/manifest.json"));
} catch {
  failures.push("dist/manifest.json is missing or invalid; run npm run build first");
}

if (manifest) {
  requireCondition(manifest.manifest_version === 3, "manifest must use Manifest V3");
  requireCondition(manifest.version === packageJson.version, "package and manifest versions must match");
  requireCondition(JSON.stringify(manifest.permissions) === JSON.stringify(["storage"]), "manifest permissions changed unexpectedly");
  requireCondition(
    JSON.stringify(manifest.host_permissions) === JSON.stringify(["http://*/*", "https://*/*"]),
    "manifest host permissions changed unexpectedly",
  );
  for (const relativePath of [
    manifest.background?.service_worker,
    manifest.action?.default_popup,
    manifest.options_page,
    "icons/icon-16.png",
    "icons/icon-32.png",
    "icons/icon-48.png",
    "icons/icon-128.png",
  ]) {
    if (!relativePath) {
      failures.push("manifest is missing a required entry point");
      continue;
    }
    try {
      await stat(path.join(dist, relativePath));
    } catch {
      failures.push(`dist is missing ${relativePath}`);
    }
  }
}

let distFiles = [];
try {
  distFiles = await filesUnder(dist);
} catch {
  if (!failures.some((failure) => failure.includes("manifest.json"))) failures.push("dist is missing; run npm run build first");
}

const forbiddenNames = /(?:^|\/)(?:\.env(?:\..*)?|\.dev\.vars|[^/]+\.(?:pem|key|map))$/i;
for (const absolute of distFiles) {
  const relative = path.relative(dist, absolute).split(path.sep).join("/");
  requireCondition(!forbiddenNames.test(relative), `forbidden release file: ${relative}`);
  if (/\.(?:css|html|js|json|txt)$/i.test(relative)) {
    const contents = await readFile(absolute, "utf8");
    requireCondition(!/(?:BEGIN PRIVATE KEY|CREEM_API_KEY)/.test(contents), `secret marker in ${relative}`);
    if (!allowPlaceholders) {
      requireCondition(!/(?:REPLACE_ME|example\.workers\.dev)/.test(contents), `placeholder marker in ${relative}`);
    }
  }
}

if (!allowPlaceholders) {
  const extensionConfig = await read("src/config.ts");
  const workerConfig = await read("worker/wrangler.jsonc");
  requireCondition(!/(?:REPLACE_ME|example\.workers\.dev)/.test(extensionConfig), "replace extension license placeholders");
  requireCondition(!/checkoutUrl:\s*""/.test(extensionConfig), "configure the Creem checkout URL");
  requireCondition(!/receiptPublicJwk:\s*null/.test(extensionConfig), "configure the receipt public JWK");
  requireCondition(/creemMode:\s*"prod"/.test(extensionConfig), "set the extension to Creem production mode");
  requireCondition(!/(?:REPLACE_ME|chrome-extension:\/\/test)/.test(workerConfig), "replace Worker production placeholders");
  requireCondition(/"CREEM_MODE":\s*"prod"/.test(workerConfig), "set the Worker to Creem production mode");
}

if (failures.length > 0) {
  process.stderr.write(`Release verification failed:\n${failures.map((failure) => `- ${failure}`).join("\n")}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`Release verification passed${allowPlaceholders ? " (configuration placeholders allowed)" : ""}.\n`);
}
