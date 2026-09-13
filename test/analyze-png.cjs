const { PNG } = require('pngjs');
const fs = require('fs');
const path = require('path');

function analyze(pngPath) {
  const png = PNG.sync.read(fs.readFileSync(pngPath));
  let nonBlack = 0;
  let bright = 0;
  let earthBlue = 0;
  let warm = 0;
  let total = png.width * png.height;
  const uniq = new Set();
  for (let i = 0; i < png.data.length; i += 4) {
    const r = png.data[i];
    const g = png.data[i + 1];
    const b = png.data[i + 2];
    uniq.add(((r / 16) | 0) * 256 * 16 + ((g / 16) | 0) * 16 + ((b / 16) | 0));
    if (r + g + b < 60) continue;
    nonBlack++;
    if (r + g + b > 330) bright++;
    if (b > 50 && b > r * 1.35 && g < b) earthBlue++;
    if (r > 110 && r > b) warm++;
  }
  console.log(`${path.basename(pngPath)} ${png.width}x${png.height}`);
  console.log('  visible %:', ((nonBlack / total) * 100).toFixed(1));
  console.log('  earth-blue px:', earthBlue, ' warm px:', warm, ' bright px:', bright);
  console.log('  unique color buckets:', uniq.size);
}

for (const f of process.argv.slice(2)) {
  if (fs.existsSync(f)) analyze(f);
}