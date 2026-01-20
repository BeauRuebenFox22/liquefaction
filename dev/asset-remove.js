const fs = require('fs-extra');
const path = require('path');
const readline = require('readline');
const ops = require('./ops');

const libRoot = path.resolve(__dirname, '../');
const componentsDir = path.join(libRoot, 'components');

function askPrompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (ans) => { rl.close(); resolve(String(ans || '').trim()); }));
};

function ensureLibPrefix(name) {
  return name.startsWith('lib-') ? name : `lib-${name}`;
};

async function loadManifest(libName) {
  const manifestPath = path.join(componentsDir, libName, 'manifest.json');
  if(!(await fs.pathExists(manifestPath))) return null;
  const manifest = await fs.readJson(manifestPath);
  return { manifest, manifestPath };
};

async function removeCss(libName, manifest, manifestPath) {
  const cssName = `${libName}.css`;
  const cssPath = path.join(componentsDir, libName, cssName);
  if(!(await fs.pathExists(cssPath))) {
    console.log(`No CSS asset exists for ${libName}.`);
    return false;
  };
  await fs.remove(cssPath);
  manifest.assets = manifest.assets || {};
  manifest.assets.css = Array.isArray(manifest.assets.css) ? manifest.assets.css.filter(n => n !== cssName) : [];
  manifest.files = Array.isArray(manifest.files) ? manifest.files.filter(f => f.src !== `components/${cssName}`) : [];
  await fs.writeJson(manifestPath, manifest, { spaces: 2 });

  const registry = await ops.getRegistryData();
  if(registry && registry[libName]) {
    const entry = registry[libName];
    const files = Array.isArray(entry.files) ? entry.files.filter(f => f.src !== `components/${cssName}`) : [];
    await ops.updateComponentRegistry(libName, { files });
    console.log(`Removed CSS asset from registry for ${libName}.`);
  };
  console.log(`Removed CSS asset for ${libName}.`);
  return true;
};

async function removeJs(libName, manifest, manifestPath) {
  if(manifest.type === 'web-component') {
    console.log(`JS asset removal is not applicable for web-component ${libName}.`);
    return false;
  };
  const jsName = `${libName}.js`;
  const jsPath = path.join(componentsDir, libName, jsName);
  if(!(await fs.pathExists(jsPath))) {
    console.log(`No JS asset exists for ${libName}.`);
    return false;
  };
  await fs.remove(jsPath);
  manifest.assets = manifest.assets || {};
  manifest.assets.js = Array.isArray(manifest.assets.js) ? manifest.assets.js.filter(n => n !== jsName) : [];
  manifest.files = Array.isArray(manifest.files) ? manifest.files.filter(f => f.src !== `components/${jsName}`) : [];
  await fs.writeJson(manifestPath, manifest, { spaces: 2 });

  const registry = await ops.getRegistryData();
  if(registry && registry[libName]) {
    const entry = registry[libName];
    const files = Array.isArray(entry.files) ? entry.files.filter(f => f.src !== `components/${jsName}`) : [];
    await ops.updateComponentRegistry(libName, { files });
    console.log(`Removed JS asset from registry for ${libName}.`);
  };
  console.log(`Removed JS asset for ${libName}.`);
  return true;
};

module.exports = async function assetsRemove(name, options = {}) {
  try {
    const compName = ensureLibPrefix(name || await askPrompt('Enter component name: '));
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
      const ans = await askPrompt('Select asset type to remove: 1) CSS  2) JS : ');
      if(ans === '1') typeChoice = 'css'; else if (ans === '2') typeChoice = 'js';
    }
    if(!['css', 'js'].includes(typeChoice)) {
      console.error('Invalid selection. Choose 1 or 2.');
      process.exit(1);
    };
    if(typeChoice === 'css') {
      await removeCss(compName, manifest, manifestPath);
    } else {
      await removeJs(compName, manifest, manifestPath);
    };
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  };
};
