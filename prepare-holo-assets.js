// Apply the imagegen matte to the original photograph without regenerating the
// face, then produce web-sized assets. Requires the existing sharp dependency.
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const dir = path.join(__dirname, 'assets/holo-card');

async function prepare() {
  const alpha = await sharp(path.join(dir, 'subject-mask.png'))
    .resize(1024, 1024).greyscale().linear(255 / 240, -8).raw().toBuffer();
  await sharp(path.join(__dirname, 'profile.jpg')).resize(1024, 1024)
    .joinChannel(alpha, { raw: { width: 1024, height: 1024, channels: 1 } })
    .png().toFile(path.join(dir, 'subject.png'));
  await sharp(path.join(dir, 'subject.png')).webp({ quality: 94 })
    .toFile(path.join(dir, 'subject.webp'));
  await sharp(path.join(dir, 'background.png')).resize(680, 1020)
    .webp({ quality: 86 }).toFile(path.join(dir, 'background.webp'));
  const { data, info } = await sharp(path.join(dir, 'subject.png')).raw().toBuffer({ resolveWithObject: true });
  let transparent = 0;
  let opaque = 0;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] === 0) transparent++;
    if (data[i] === 255) opaque++;
  }
  const report = { width: info.width, height: info.height, channels: info.channels,
    transparentPixels: transparent, opaquePixels: opaque,
    faceSource: 'Original profile.jpg; only generated alpha matte applied' };
  if (info.channels !== 4 || !transparent || !opaque) throw new Error('Invalid foreground alpha');
  fs.writeFileSync(path.join(dir, 'asset-validation.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(report);
}
prepare().catch(error => { console.error(error); process.exitCode = 1; });
