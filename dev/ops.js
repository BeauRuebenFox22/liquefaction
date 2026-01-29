const fs = require('fs');
const fse = require('fs-extra');
const path = require('path');
const crypto = require('crypto');

const libRoot = path.resolve(__dirname, '../');
const registryPath = path.join(libRoot, 'registry.json');

async function generateHash(filePath) {
  try {
    if(!fs.existsSync(filePath)) { return null; }
    const fileBuffer = fs.readFileSync(filePath);
    const hashSum = crypto.createHash('md5');
    hashSum.update(fileBuffer);
    return hashSum.digest('hex');
  } catch {
    return null;
  };
};

async function verifyHash(filePath, expectedHash) {
  const currentHash = await generateHash(filePath);
  return currentHash === expectedHash;
};

async function getRegistryData() {
  try {
    if(!fs.existsSync(registryPath)) {
      await fse.writeJson(registryPath, {}, { spaces: 2 });
    };
    const content = fs.readFileSync(registryPath, 'utf8');
    return JSON.parse(content || '{}');
  } catch (err) {
    console.error('Failed to read registry.json:', err.message);
    return null;
  };
};

async function saveRegistryData(registryData) {
  await fse.writeJson(registryPath, registryData, { spaces: 2 });
};

function normalizeNames(name) {
  const baseName = name.startsWith('lib-') ? name.slice(4) : name;
  const libName = `lib-${baseName}`;
  return { baseName, libName };
};

function resolvePrimaryFilePath(libName, baseName, type) {
  const candidates = [];
  if(type === 'liquid') {
    candidates.push(
      path.join(libRoot, 'components', `${libName}.liquid`),
      path.join(libRoot, 'components', baseName, `lib-${baseName}.liquid`),
      path.join(libRoot, 'components', libName, `lib-${libName}.liquid`)
    );
  } else {
    candidates.push(
      path.join(libRoot, 'components', `${libName}.js`),
      path.join(libRoot, 'components', baseName, `lib-${baseName}.js`),
      path.join(libRoot, 'components', libName, `lib-${libName}.js`)
    );
  };
  for(const p of candidates) {
    if(fs.existsSync(p)) return p;
  };
  return null;
};

async function addToComponentRegistry(name, type, description) {
  const registryData = await getRegistryData();
  if(!registryData) return false;
  const { baseName, libName } = normalizeNames(name);
  const typeLabel = (type === 'liquid') ? 'snippet-component' : 'web-component';
  let files = [];
  if(type === 'liquid') {
    files = [
      { src: `components/${libName}/${libName}.liquid`, destDir: 'snippets' }
    ];
    const cssPath = path.join(libRoot, 'components', libName, `${libName}.css`);
    if(fs.existsSync(cssPath)) {
      files.unshift({ src: `components/${libName}/${libName}.css`, destDir: 'assets' });
    };
    const jsPath = path.join(libRoot, 'components', libName, `${libName}.js`);
    if(fs.existsSync(jsPath)) {
      files.push({ src: `components/${libName}/${libName}.js`, destDir: 'assets' });
    };
  } else {
    files = [
      { src: `components/${libName}/${libName}.js`, destDir: 'assets' }
    ];
    const cssPath = path.join(libRoot, 'components', libName, `${libName}.css`);
    if(fs.existsSync(cssPath)) {
      files.push({ src: `components/${libName}/${libName}.css`, destDir: 'assets' });
    };
  };
  const primaryFilePath = resolvePrimaryFilePath(libName, baseName, type);
  const hash = primaryFilePath ? await generateHash(primaryFilePath) : null;
  const now = new Date().toISOString();
  registryData[libName] = {
    type: typeLabel,
    version: '0.0.1',
    description: description || '',
    hash: hash || '',
    createdAt: now,
    updatedAt: [],
    props: [],
    files,
    dependencies: [],
    scope: []
  };
  await saveRegistryData(registryData);
  console.log(`Registry updated: added ${libName}`);
  return true;
};

async function removeFromComponentRegistry(libName) {
  const registryData = await getRegistryData();
  if(!registryData) return false;
  if(!registryData[libName]) return false;
  delete registryData[libName];
  await saveRegistryData(registryData);
  return true;
};

async function updateComponentRegistry(name, updates) {
  try {
    const { libName } = normalizeNames(name);
    const registryData = await getRegistryData();
    if(!registryData || !registryData[libName]) return false;
    const entry = registryData[libName];
    const now = new Date().toISOString();
    entry.updatedAt = Array.isArray(entry.updatedAt) ? entry.updatedAt : [];
    entry.updatedAt.push(now);
    if(updates && typeof updates === 'object') {
      if(updates.hash) entry.hash = updates.hash;
      if(updates.version) entry.version = updates.version;
      if(Array.isArray(updates.files)) entry.files = updates.files;
      if(Array.isArray(updates.props)) entry.props = updates.props;
      if(Array.isArray(updates.dependencies)) entry.dependencies = updates.dependencies;
      if(Array.isArray(updates.scope)) entry.scope = updates.scope;
      // Future: merge other fields (files, props, dependencies, version)
      // Future: Only publish components listed in registry
    };
    await saveRegistryData(registryData);
    return true;
  } catch {
    return false;
  };
};

module.exports = {
  generateHash,
  verifyHash,
  getRegistryData,
  addToComponentRegistry,
  removeFromComponentRegistry,
  updateComponentRegistry
};