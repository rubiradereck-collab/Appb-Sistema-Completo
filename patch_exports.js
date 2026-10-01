const fs = require('fs');
let content = fs.readFileSync('pwa-client/src/utils/exportUtils.js', 'utf8');

// The replacement logic:
const oldPattern = /if \(Capacitor\.isNativePlatform\(\)\) \{\s*pdfDocGenerator\.getBase64\(async \(base64\) => \{\s*await saveNativeFile\(base64, filename\);\s*\}\);\s*\} else \{\s*pdfDocGenerator\.download\(filename\);\s*\}\s*window\.dispatchEvent\(new CustomEvent\('app-success', \{detail: '.*?'\}\)\);\s*resolve\(\);/g;

const newPattern = `if (Capacitor.isNativePlatform()) {
        const base64 = await pdfDocGenerator.getBase64();
        await saveNativeFile(base64, filename);
        resolve();
      } else {
        pdfDocGenerator.download(filename);
        window.dispatchEvent(new CustomEvent('app-success', {detail: 'Reporte PDF generado y descargado'}));
        resolve();
      }`;

content = content.replace(oldPattern, newPattern);

fs.writeFileSync('pwa-client/src/utils/exportUtils.js', content, 'utf8');
