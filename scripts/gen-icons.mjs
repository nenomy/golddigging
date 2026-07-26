import sharp from "sharp";
import { mkdirSync } from "fs";

const svg = `
<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="#22314F"/>
  <circle cx="256" cy="256" r="184" fill="#D9A536"/>
  <circle cx="256" cy="256" r="184" fill="none" stroke="#97730E" stroke-width="12"/>
  <text x="256" y="318" font-family="Georgia, 'Noto Serif KR', serif" font-size="210" font-weight="700" fill="#6E5410" text-anchor="middle">금</text>
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
