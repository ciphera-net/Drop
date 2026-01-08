const fs = require('fs');
const path = require('path');

const sourceDir = path.join(__dirname, '../../ciphera-captcha/ui/src');
const destDir = path.join(__dirname, '../lib/captcha');

// * Remove existing captcha files
if (fs.existsSync(destDir)) {
  fs.rmSync(destDir, { recursive: true, force: true });
}

// * Copy files recursively
function copyRecursive(src, dest) {
  const exists = fs.existsSync(src);
  if (!exists) {
    console.error(`Source directory does not exist: ${src}`);
    process.exit(1);
  }
  
  const stats = fs.statSync(src);
  const isDirectory = stats.isDirectory();
  
  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach(childItemName => {
      copyRecursive(
        path.join(src, childItemName),
        path.join(dest, childItemName)
      );
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

copyRecursive(sourceDir, destDir);
console.log('✓ Captcha files copied from ciphera-captcha/ui to drop-frontend/lib/captcha');
