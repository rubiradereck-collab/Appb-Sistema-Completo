const fs = require('fs');
let content = fs.readFileSync('index.js', 'utf8');
content = content.replace('};\n\n  }\n};\nconst app = express();', '};\n\nconst app = express();');
content = content.replace(/\\s*\\}\\s*\\};\\s*const app = express\\(\\);/, '\\n\\nconst app = express();');
fs.writeFileSync('index.js', content);

