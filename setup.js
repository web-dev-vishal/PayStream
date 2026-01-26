const fs = require('fs');
const path = require('path');

const directories = [
  'src',
  'src/config',
  'src/middleware',
  'src/routes',
  'src/controllers',
  'src/services',
  'src/models',
  'src/utils',
  'src/workers',
  'src/validators',
  'logs'
];

directories.forEach(dir => {
  const dirPath = path.join(__dirname, dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
});

console.log('Project structure created successfully!');