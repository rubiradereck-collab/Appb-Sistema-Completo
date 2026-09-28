const fs = require('fs');
let lines = fs.readFileSync('index.js', 'utf8').split('\\n');
lines.splice(55, 2);
fs.writeFileSync('index.js', lines.join('\\n'));
