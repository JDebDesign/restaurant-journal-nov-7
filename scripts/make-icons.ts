// Generates placeholder PWA icons. Run: npx tsx scripts/make-icons.ts
import sharp from 'sharp'

const svg = (size: number, pad: number) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="#c2410c"/>
  <circle cx="${size / 2}" cy="${size / 2}" r="${size * 0.5 - pad - size * 0.18}" fill="none" stroke="#fff" stroke-width="${size * 0.06}"/>
  <circle cx="${size / 2}" cy="${size / 2}" r="${size * 0.1}" fill="#fff"/>
</svg>`

for (const [name, size, pad] of [
  ['icon-192', 192, 0],
  ['icon-512', 512, 0],
  ['icon-512-maskable', 512, 60],
  ['apple-touch-icon', 180, 0],
] as const) {
  await sharp(Buffer.from(svg(size, pad))).png().toFile(`public/icons/${name}.png`)
}
console.log('icons written')
