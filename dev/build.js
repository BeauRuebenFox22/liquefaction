const fs = require('fs-extra');
const path = require('path');
const ops = require('./ops');

const libRoot = path.resolve(__dirname, '../');
const componentsDir = path.join(libRoot, 'components');

function resolvePrimaryFilePath(libName, type) {
  const candidates = [];
  if(type === 'snippet-component') {
    candidates.push(
      path.join(componentsDir, libName, `${libName}.liquid`),
      path.join(componentsDir, `${libName}.liquid`)
    );
  } else {
    candidates.push(
      path.join(componentsDir, libName, `${libName}.js`),
      path.join(componentsDir, `${libName}.js`)
    );
  };
  for(const p of candidates) {
    if(fs.existsSync(p)) return p;
  };
  return null;
};

async function listLibNames() {
  const names = new Set();
  if(await fs.pathExists(componentsDir)) {
    const entries = await fs.readdir(componentsDir);
    for(const entry of entries) {
      const full = path.join(componentsDir, entry);
      const stat = await fs.stat(full);
      if(stat.isDirectory()) {
        const libName = entry.startsWith('lib-') ? entry : `lib-${entry}`;
        names.add(libName);
      } else {
        const m = entry.match(/^lib\-.+\.(liquid|js)$/i);
        if(m) {
          const base = entry.replace(/\.(liquid|js)$/i, '');
          names.add(base);
        };
      };
    };
  };
  return Array.from(names);
};

function renderProgress(current, total) {
  const width = 20;
  const ratio = total > 0 ? Math.min(1, current / total) : 1;
  const filled = Math.round(width * ratio);
  const bar = '[' + '#'.repeat(filled) + '.'.repeat(width - filled) + ']';
  process.stdout.write(`\r${bar} ${current}/${total}`);
  if(current === total) process.stdout.write('\n');
};

module.exports = async function buildAudit() {
  try {
    const registry = await ops.getRegistryData();
    if(!registry) throw new Error('Unable to read registry.json');
    const libNames = await listLibNames();
    console.log(`Auditing ${libNames.length} components...`);
    let processed = 0;
    for(const libName of libNames) {
      processed += 1;
      renderProgress(processed, libNames.length);
      const entry = registry[libName];
      if(!entry) {
        console.log(`Component ${libName} not registered; skipping.`);
        continue;
      };
      const type = entry.type; // 'snippet-component' or 'web-component'
      const primaryPath = resolvePrimaryFilePath(libName, type);
      if(!primaryPath) {
        console.log(`Primary file missing for ${libName}; skipping.`);
        continue;
      };
      const currentHash = await ops.generateHash(primaryPath);
      if(!currentHash) {
        console.log(`Unable to hash ${libName}; skipping.`);
        continue;
      };
      if(currentHash === entry.hash) {
        console.log(`Component ${libName} synced`);
      } else {
        const ok = await ops.updateComponentRegistry(libName, { hash: currentHash });
        if (ok) console.log(`Component ${libName} updated and synced`);
        else console.log(`Component ${libName} could not update registry`);
      };
    };
    console.log('Build audit complete.');
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  };
};