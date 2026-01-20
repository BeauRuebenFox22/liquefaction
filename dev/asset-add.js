const fs = require('fs-extra');
const path = require('path');
const readline = require('readline');
const ops = require('./ops');

const libRoot = path.resolve(__dirname, '../');
const componentsDir = path.join(libRoot, 'components');

function askPrompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (answer) => {
    rl.close();
    resolve(String(answer || '').trim());
  }));
};

async function loadManifest(componentName) {
  const manifestPath = path.join(componentsDir, componentName, 'manifest.json');
  if(!(await fs.pathExists(manifestPath))) return null;
  const manifest = await fs.readJSON(manifestPath);
  return { manifest, manifestPath };
};

function ensureComponentPrefix(name) {
  return name.startsWith('lib-') ? name : `lib-${name}`;
};

async function addCssAsset(componentName, manifest, manifestPath) {
  const cssName = `${componentName}.css`;
  const cssPath = path.join(componentsDir, componentName, cssName);
  if(await fs.pathExists(cssPath)){
    console.log(`CSS asset already exists at ${cssPath}; skipping creation.`);
    return false;
  };
  await fs.writeFile(cssPath, `/* ${cssName} */`, 'utf8');
  manifest.assets = manifest.assets || {};
  manifest.assets.css = Array.isArray(manifest.assets.css) ? manifest.assets.css : [];
  if(!manifest.assets.css.includes(cssName)) manifest.assets.css.push(cssName);
  manifest.files = Array.isArray(manifest.files) ? manifest.files : [];
  const fileEntry = { src: `components/${cssName}`, destDir: 'assets' };
  if(!manifest.files.find(f => f.src === fileEntry.src)) manifest.files.push(fileEntry);
  await fs.writeJson(manifestPath, manifest, { spaces: 2 });
  console.log(`Created CSS asset and updated manifest at ${manifestPath}`);
  return true;
};
 
async function addJsAsset(componentName, manifest, manifestPath) {
  const jsName = `${componentName}.js`;
  const jsPath = path.join(componentsDir, componentName, jsName);
  if(await fs.pathExists(jsPath)){
    console.log(`JS asset already exists at ${jsPath}; skipping creation.`);
    return false;
  };
  await fs.writeFile(jsPath, `/* ${jsName} */`, 'utf8');
  manifest.assets = manifest.assets || {};
  manifest.assets.js = Array.isArray(manifest.assets.js) ? manifest.assets.js : [];
  if(!manifest.assets.js.includes(jsName)) manifest.assets.js.push(jsName);
  manifest.files = Array.isArray(manifest.files) ? manifest.files : [];
  const fileEntry = { src: `components/${jsName}`, destDir: 'assets' };
  if(!manifest.files.find(f => f.src === fileEntry.src)) manifest.files.push(fileEntry);
  await fs.writeJson(manifestPath, manifest, { spaces: 2 });
  console.log(`Created JS asset and updated manifest at ${manifestPath}`);
  return true;
};

module.exports = async function assetsAdd(name, options = {}) {
  try {
    const compName = ensureComponentPrefix(name || await askPrompt('Enter component name: '));
    const dir = path.join(componentsDir, compName);
    if(!(await fs.pathExists(dir))) {
      console.error(`No component exists with the name ${compName}`);
      process.exit(1);
    };
    const loaded = await loadManifest(compName);
    if(!loaded) {
      console.error(`Manifest missing for ${compName}`);
      process.exit(1);
    };
    const { manifest, manifestPath } = loaded;
    let typeChoice = options.type ? String(options.type).trim().toLowerCase() : '';
    if(!['css', 'js'].includes(typeChoice)) {
      const ans = await askPrompt('Select asset type: 1) CSS  2) JS : ');
      if(ans === '1') typeChoice = 'css';
      else if (ans === '2') typeChoice = 'js';
    }
    if(!['css', 'js'].includes(typeChoice)) {
      console.error('Invalid selection. Choose 1 or 2.');
      process.exit(1);
    };
    const didCreate = typeChoice === 'css'
      ? await addCssAsset(compName, manifest, manifestPath)
      : await addJsAsset(compName, manifest, manifestPath);
    if(didCreate) {
      try {
        const registry = await ops.getRegistryData();
        if(registry && registry[compName]) {
          const entry = registry[compName];
          const files = Array.isArray(entry.files) ? entry.files.slice() : [];
          const assetName = `${compName}.${typeChoice}`; // e.g., lib-button.css
          const regFile = { src: `components/${assetName}`, destDir: 'assets' };
          if(!files.find(f => f.src === regFile.src)) files.push(regFile);
          await ops.updateComponentRegistry(compName, { files });
          console.log(`Registry files updated for ${compName}.`);
        } else {
          console.log(`Component ${compName} not present in registry; skipped registry sync.`);
        };
      } catch (e) {
        console.warn(`Registry sync skipped: ${e.message}`);
      };
    };
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  };
};