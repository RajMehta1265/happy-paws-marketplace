const fs = require('fs');
const path = require('path');

const imgPath = path.join(__dirname, '..', 'public', 'woolfindia.jpg');
console.log('Image path:', imgPath);
console.log('Exists:', fs.existsSync(imgPath));

if (fs.existsSync(imgPath)) {
  const stats = fs.statSync(imgPath);
  console.log('Size:', stats.size, 'bytes');
}
