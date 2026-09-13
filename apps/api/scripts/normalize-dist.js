const fs = require('fs');
const path = require('path');

const distSrc = path.join(__dirname, '..', 'dist', 'src');
const distRoot = path.join(__dirname, '..', 'dist');

function moveContents(srcDir, destDir) {
  if (!fs.existsSync(srcDir)) return;
  const items = fs.readdirSync(srcDir);
  for (const item of items) {
    const from = path.join(srcDir, item);
    const to = path.join(destDir, item);
    if (fs.existsSync(to)) {
      const stat = fs.statSync(to);
      if (stat.isDirectory()) {
        fs.rmSync(to, { recursive: true, force: true });
      } else {
        fs.unlinkSync(to);
      }
    }
    fs.renameSync(from, to);
  }
}

try {
  if (fs.existsSync(distSrc)) {
    moveContents(distSrc, distRoot);
    fs.rmSync(distSrc, { recursive: true, force: true });
    console.log('Normalized dist: moved dist/src/* -> dist/');
  } else {
    console.log('No dist/src directory to normalize.');
  }
} catch (err) {
  console.error('Failed to normalize dist structure:', err);
  process.exit(1);
}
