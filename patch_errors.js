const fs = require('fs');
const glob = require('glob');
const path = require('path');

const files = glob.sync('pwa-client/src/pages/*.jsx');
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  // We'll do a regex replace that finds catch (ERROR_VAR) { ... window.dispatchEvent(...) }
  // Since regex across multiple lines is tricky, we'll replace the app-error dispatch directly
  // by looking at the catch block parameter. However, a simpler way is:
  // Most files use `catch (error)` or `catch (err)`.
  
  content = content.replace(/catch\s*\(\s*([a-zA-Z0-9_]+)\s*\)\s*\{([\s\S]*?)window\.dispatchEvent\(new CustomEvent\('app-error',\s*\{detail:\s*'([^']+)'\}\)\);/g, 
    (match, errVar, before, defaultMsg) => {
      return `catch (${errVar}) {${before}const errorMsg = ${errVar}.response?.data?.message || '${defaultMsg}';\n      window.dispatchEvent(new CustomEvent('app-error', {detail: errorMsg}));`;
  });
  
  // For the case in IncidentDetail where it's deeply nested:
  // e.g. .catch(err => { ... window.dispatchEvent(...) })
  content = content.replace(/\.catch\(\s*([a-zA-Z0-9_]+)\s*=>\s*\{([\s\S]*?)window\.dispatchEvent\(new CustomEvent\('app-error',\s*\{detail:\s*'([^']+)'\}\)\);/g, 
    (match, errVar, before, defaultMsg) => {
      return `.catch(${errVar} => {${before}const errorMsg = ${errVar}.response?.data?.message || '${defaultMsg}';\n      window.dispatchEvent(new CustomEvent('app-error', {detail: errorMsg}));`;
  });

  fs.writeFileSync(file, content, 'utf8');
});
