import sharp from "sharp";
import { mkdirSync } from "fs";

const svg = `
<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="#22314F"/>
  <rect x="120" y="330" width="272" height="72" rx="10" fill="#D9A536" stroke="#6E5410" stroke-width="8"/>
  <rect x="140" y="345" width="232" height="14" rx="4" fill="#F0C860"/>
  <rect x="146" y="228" width="220" height="72" rx="10" fill="#D9A536" stroke="#6E5410" stroke-width="8"/>
  <rect x="164" y="243" width="184" height="14" rx="4" fill="#F0C860"/>
  <rect x="172" y="126" width="168" height="72" rx="10" fill="#D9A536" stroke="#6E5410" stroke-width="8"/>
  <rect x="188" y="141" width="136" height="14" rx="4" fill="#F0C860"/>
</svg>
`;

mkdirSync("public/icons", { recursive: true });

const sizes = [192, 512];
for (const size of sizes) {
  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toFile(`public/icons/icon-${size}.png`);
  console.log(`created public/icons/icon-${size}.png`);
}

await sharp(Buffer.from(svg))
  .resize(180, 180)
  .png()
  .toFile("public/icons/apple-touch-icon.png");
console.log("created public/icons/apple-touch-icon.png");
