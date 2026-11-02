import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import sharp from "sharp";

const dir = join(process.cwd(), "public", "icons");
mkdirSync(dir, { recursive: true });

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#faf8f4"/>
  <path fill="#5065A8" d="M257.6 33.6c62.4-4.8 121.6 14.4 166.4 54.4 46.4 41.6 73.6 100.8 72.8 164-.8 65.6-28.8 126.4-77.6 167.2-48 40-112 60.8-176 56-60.8-4.8-118.4-30.4-158.4-75.2C44.8 353.6 20.8 292.8 24 228.8c3.2-65.6 33.6-124.8 83.2-164.8C156.8 25.6 212.8 36.8 257.6 33.6z"/>
  <path fill="#ffffff" d="M256 97.6c46.4-3.2 91.2 11.2 124.8 41.6 35.2 32 55.2 76.8 54.4 124-.8 49.6-22.4 96-59.2 127.2-36.8 31.2-86.4 46.4-135.2 43.2-46.4-3.2-90.4-24-120.8-57.6-31.2-34.4-47.2-80-44.8-127.2 2.4-48.8 24.8-93.6 63.2-123.2 36-28 77.6-25.6 117.6-28z"/>
  <text x="256" y="300" text-anchor="middle" fill="#5065A8" font-family="Segoe UI, Arial, sans-serif" font-weight="800" font-size="128" letter-spacing="4">IPS</text>
  <path fill="#34a172" d="M372 340c54.4-14.4 89.6-49.6 102.4-97.6-44.8 9.6-81.6 38.4-100.8 81.6-3.2 8-4.8 14.4-1.6 16z"/>
  <path stroke="#ffffff" stroke-width="10" stroke-linecap="round" fill="none" d="M377.6 336c22.4-25.6 51.2-44.8 84.8-56"/>
</svg>`;

const buf = Buffer.from(svg);
await Promise.all([
  sharp(buf).resize(192, 192).png().toFile(join(dir, "icon-192.png")),
  sharp(buf).resize(512, 512).png().toFile(join(dir, "icon-512.png")),
  sharp(buf).resize(512, 512).png().toFile(join(dir, "icon-maskable-512.png")),
  sharp(buf).resize(180, 180).png().toFile(join(dir, "apple-touch-icon.png")),
]);
writeFileSync(join(dir, "mark.svg"), svg);
console.log("Icons generated in public/icons (IPS + hoja nutrición)");
