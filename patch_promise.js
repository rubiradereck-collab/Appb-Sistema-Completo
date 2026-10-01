const fs = require('fs');
let content = fs.readFileSync('pwa-client/src/utils/exportUtils.js', 'utf8');
content = content.replace(/new Promise\(\(resolve, reject\) => \{/g, 'new Promise(async (resolve, reject) => {');
fs.writeFileSync('pwa-client/src/utils/exportUtils.js', content, 'utf8');
