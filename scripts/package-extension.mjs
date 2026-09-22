import { createWriteStream } from "node:fs";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import archiver from "archiver";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
const releases = path.join(root, "releases");
const destination = path.join(releases, `peek-v${packageJson.version}.zip`);

await mkdir(releases, { recursive: true });

await new Promise((resolve, reject) => {
  const output = createWriteStream(destination, { flags: "w" });
  const archive = archiver("zip", { zlib: { level: 9 } });
  output.on("close", resolve);
  output.on("error", reject);
  archive.on("error", reject);
  archive.pipe(output);
  archive.directory(path.join(root, "dist"), false);
  void archive.finalize();
});

process.stdout.write(`${destination}\n`);
