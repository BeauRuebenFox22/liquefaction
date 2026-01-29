const fs = require('fs');
const path = require('path');

module.exports = function (componentString, contextString) {

  const components = componentString
    ? componentString
        .split(/[, ]+/)
        .map(c => c.trim())
        .filter(Boolean)
        .map(c => c.startsWith('lib-') ? c : `lib-${c}`)
    : [];

  if(components.length < 1) console.log('No components specified, starting with empty preview.');
  if(!contextString) console.log('No context specified, starting with empty preview.');

  const registryPath = path.resolve(__dirname, '../registry.json');
  let registry = {};
  if(fs.existsSync(registryPath)) registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));

  let cssLinks = '';
  let jsScripts = '';
  let renderBlocks = '';

  components.forEach(name => {
    const entry = registry[name];

    if(!entry) return;

    if(entry.files && entry.files.some(f => f.src.endsWith('.css'))) {
      const cssFile = entry.files.find(f => f.src.endsWith('.css'));
      cssLinks += `<link rel="stylesheet" href="${cssFile.src}">\n`;
    };

    if(entry.files && entry.files.some(f => f.src.endsWith('.js'))) {
      const jsFile = entry.files.find(f => f.src.endsWith('.js'));
      jsScripts += `<script src="../${jsFile.src}"></script>\n`;
    };

    let props = '';
    if(entry.props && Array.isArray(entry.props)) {
      props = entry.props
        .map(p => `  ${p.name}: "${p.placeholder || p.name}"`)
        .join(',\n    '); 
    };
    renderBlocks += `{% render "${name}"${props ? ',\n    ' + props : ''} %}`;
  });

  // Fallback if no components
  if(!components.length) {
    cssLinks = '<!-- No components selected. Add some with liq serve lib-foo,lib-bar -->';
    renderBlocks = '<!-- No components selected. -->';
  };

  // Generate index.liquid
  const indexPath = path.resolve(__dirname, '../backend/index.liquid');
  const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Component Preview</title>
  <link rel="stylesheet" href="/dist/output.css">
  ${cssLinks.trim()}
</head>
<body>
  <h1>Component Preview: ${components.join(', ')}</h1>
  ${renderBlocks.trim()}
  ${jsScripts.trim()}
  <script id="__bs_script__">document.write("<script async src='/browser-sync/browser-sync-client.js'><\\/script>");</script>
</body>
</html>`; 
  fs.writeFileSync(indexPath, indexHtml, 'utf8');

  process.env.CONTEXT = contextString;
  // Start the dev server
  require('../backend/server');

};