import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(root, "src/assets/peek-mark.svg");
const target = path.join(root, "public/icons");

await mkdir(target, { recursive: true });

await Promise.all(
  [16, 32, 48, 128].map((size) =>
    sharp(source)
      .resize(size, size)
      .png({ compressionLevel: 9 })
      .toFile(path.join(target, `icon-${size}.png`)),
  ),
);
