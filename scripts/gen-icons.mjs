import sharp from "sharp";
import { mkdirSync } from "fs";

const svg = `
<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bar" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#FBE39A"/>
      <stop offset="45%" stop-color="#E8B93F"/>
      <stop offset="100%" stop-color="#C4881A"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="96" fill="#22314F"/>

  <rect x="112" y="322" width="180" height="96" rx="18" fill="#8A5F10"/>
  <rect x="220" y="322" width="180" height="96" rx="18" fill="#8A5F10"/>
  <rect x="166" y="196" width="180" height="96" rx="18" fill="#8A5F10"/>

  <rect x="104" y="312" width="180" height="96" rx="18" fill="url(#bar)" stroke="#7A5410" stroke-width="6"/>
  <rect x="128" y="328" width="132" height="16" rx="8" fill="#FFF1C2" opacity="0.85"/>

  <rect x="228" y="312" width="180" height="96" rx="18" fill="url(#bar)" stroke="#7A5410" stroke-width="6"/>
  <rect x="252" y="328" width="132" height="16" rx="8" fill="#FFF1C2" opacity="0.85"/>

  <rect x="166" y="188" width="180" height="96" rx="18" fill="url(#bar)" stroke="#7A5410" stroke-width="6"/>
  <rect x="190" y="204" width="132" height="16" rx="8" fill="#FFF1C2" opacity="0.85"/>

  <path d="M382,120 C386,140 390,144 410,148 C390,152 386,156 382,176 C378,156 374,152 354,148 C374,144 378,140 382,120 Z" fill="#FFF3C4"/>
  <path d="M420,168 C423,180 425,182 437,185 C425,188 423,190 420,202 C417,190 415,188 403,185 C415,182 417,180 420,168 Z" fill="#FFF3C4"/>
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
