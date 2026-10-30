import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import sharp from "sharp";

const dir = join(process.cwd(), "public", "icons");
mkdirSync(dir, { recursive: true });

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="112" fill="#34a172"/>
  <path d="M144 360c0-120 80-200 224-208-4.8 140.8-84.8 220.8-204.8 222.4" fill="#e3f5ea"/>
  <path d="M168 344c41.6-54.4 86.4-92.8 136-120" stroke="#157453" stroke-width="28" stroke-linecap="round" fill="none"/>
</svg>`;

const buf = Buffer.from(svg);
await Promise.all([
  sharp(buf).resize(192, 192).png().toFile(join(dir, "icon-192.png")),
  sharp(buf).resize(512, 512).png().toFile(join(dir, "icon-512.png")),
  sharp(buf).resize(512, 512).png().toFile(join(dir, "icon-maskable-512.png")),
  sharp(buf).resize(180, 180).png().toFile(join(dir, "apple-touch-icon.png")),
]);
console.log("Icons generated in public/icons");
