const fs = require('fs');
const path = require('path');

const srcDir = __dirname;
const destDir = path.join(__dirname, 'www');

// Files to copy
const filesToCopy = [
  'index.html',
  'play.html',
  'tutorial.html',
  'styles.css',
  'favicon.png',
  'sitemap.xml',
  'robots.txt'
];

// Directories to copy recursively
const dirsToCopy = [
  'js'
];

console.log('Starting copy of static assets to "www" folder...');

// Ensure destDir exists
if (fs.existsSync(destDir)) {
  fs.rmSync(destDir, { recursive: true, force: true });
}
fs.mkdirSync(destDir, { recursive: true });

// Copy files
filesToCopy.forEach(file => {
  const src = path.join(srcDir, file);
  const dest = path.join(destDir, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`Copied file: ${file} -> www/${file}`);
  } else {
    console.warn(`Warning: File not found: ${file}`);
  }
});

// Copy directories
dirsToCopy.forEach(dir => {
  const src = path.join(srcDir, dir);
  const dest = path.join(destDir, dir);
  copyFolderSync(src, dest);
});

function copyFolderSync(from, to) {
  if (!fs.existsSync(from)) return;
  fs.mkdirSync(to, { recursive: true });
  fs.readdirSync(from).forEach(element => {
    const srcPath = path.join(from, element);
    const destPath = path.join(to, element);
    if (fs.lstatSync(srcPath).isDirectory()) {
      copyFolderSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  });
  console.log(`Copied directory: ${path.basename(from)}/ -> www/${path.basename(from)}/`);
}

console.log('Static assets successfully copied to "www"!');
