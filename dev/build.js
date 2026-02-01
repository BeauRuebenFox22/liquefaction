const fs = require('fs-extra');
const path = require('path');
const ops = require('./ops');
const { extractFromFile } = require('./liquid-extractor');
const { extract } = require('./js-extractor');

const libRoot = path.resolve(__dirname, '../');
const componentsDir = path.join(libRoot, 'components');

function loadManifest(libName) {
  try {
    const manifestPath = path.join(componentsDir, libName, 'manifest.json');
    if (fs.existsSync(manifestPath)) {
      return fs.readJsonSync(manifestPath);
    }
  } catch {}
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
    if(!registry) throw new Error(' Unable to read registry.json');
    const libNames = await listLibNames();
    console.log(` Auditing ${libNames.length} components...`);
    let processed = 0;
    const requireBump = [];
    const invalidLower = [];
    for(const libName of libNames) {
      processed += 1;
      renderProgress(processed, libNames.length);
      const entry = registry[libName];
      const manifest = loadManifest(libName);
      if (!manifest) {
        console.log(` Manifest missing for ${libName}; skipping.`);
        continue;
      }
      // --- Begin: Expanded static asset hash check ---
      const primaryRel = manifest && manifest.primary && manifest.primary.path ? manifest.primary.path : null;
      const primaryPath = primaryRel ? path.join(componentsDir, libName, primaryRel) : null;
      if(!primaryPath) {
        console.log(` Primary file missing for ${libName}; skipping.`);
        continue;
      };
      const currentHash = await ops.generateHash(primaryPath);
      if(!currentHash) {
        console.log(` Unable to hash ${libName}; skipping.`);
        continue;
      };
      const expected = (manifest.registry && manifest.registry.hash) || (manifest.primary && manifest.primary.hash) || '';
      const manifestVersion = manifest.version || '0.0.0';
      const registryVersion = entry && entry.version ? entry.version : '0.0.0';

      // Check static asset file hashes (manifest.files)
      let filesChanged = false;
      if(Array.isArray(manifest.files)) {
        for(let file of manifest.files) {
          if(!file.hash) continue; // Guard: skip if no hash present
          const filePath = path.join(libRoot, file.src);
          if(!(await fs.pathExists(filePath))) continue;
          const fileCurrentHash = await ops.generateHash(filePath);
          if(fileCurrentHash && fileCurrentHash !== file.hash) {
            filesChanged = true;
            file.hash = fileCurrentHash;
          }
        }
      }

      if (currentHash === expected && !filesChanged) {
        console.log(` Component ${libName} synced`);
        if (entry) {
          const ok = await ops.updateComponentRegistry(libName, { hash: currentHash });
          if (ok) console.log(` Registry hash synchronized for ${libName}`);
        } else {
          console.log(` Component ${libName} not registered; skipping registry sync.`);
        }
      } else {
        const cmp = semverCompare(manifestVersion, registryVersion);
        if(cmp === 0) {
          console.error(` Hash mismatch for ${libName} but version not bumped (v${manifestVersion}). Please bump version.`);
          requireBump.push(libName);
        } else if (cmp < 0) {
          console.error(` Hash mismatch and manifest version (v${manifestVersion}) is lower than registry (v${registryVersion}) for ${libName}.`);
          invalidLower.push(libName);
        } else {
          // Accept version bump: write new hashes to manifest and update registry version+hash
          try {
            const manifestPath = path.join(componentsDir, libName, 'manifest.json');
            manifest.primary = manifest.primary || {};
            manifest.primary.hash = currentHash;
            manifest.registry = manifest.registry || {};
            manifest.registry.hash = currentHash;
            manifest.build = manifest.build || {};
            manifest.build.lastAuditAt = new Date().toISOString();

            // Write updated static asset file hashes to registry as well
            let filesForRegistry = Array.isArray(manifest.files) ? manifest.files.map(f => ({ ...f })) : [];

            if(manifest.type === 'snippet-component') {
              try {
                const result = await extractFromFile(primaryPath);
                manifest.props = Array.isArray(result.props) ? result.props : [];
                manifest.dependencies = Array.isArray(result.dependencies) ? result.dependencies : [];
                manifest.scope = Array.isArray(result.scope) ? result.scope : [];
                if(result.description) manifest.description = result.description;
              } catch (e) {
                manifest.props = [];
                manifest.dependencies = [];
                manifest.scope = [];
                console.warn(`Extraction skipped for ${libName}: ${e.message}`);
              }
            };

            if(manifest.type === 'web-component') {
              try {
                const { props, dependencies, scope, docs } = extract(primaryPath);
                if(Array.isArray(props)) manifest.props = props;
                if(Array.isArray(dependencies)) manifest.dependencies = dependencies;
                if(Array.isArray(scope)) manifest.scope = scope;
                if(manifest.description) manifest.description = docs; 
              } catch (e) {
                console.warn(`Extraction skipped for ${libName}: ${e.message}`);
              };
            };
            await fs.writeJson(manifestPath, manifest, { spaces: 2 });
            if(entry) {
              const updates = { hash: currentHash, version: manifestVersion, files: filesForRegistry };
              if (manifest.type === 'snippet-component') {
                updates.props = manifest.props || [];
                updates.dependencies = manifest.dependencies || [];
                updates.scope = manifest.scope || [];
              }
              const ok = await ops.updateComponentRegistry(libName, updates);
              if (ok) console.log(` Accepted version bump for ${libName}; updated registry to v${manifestVersion}.`);
            } else {
              console.log(` Component ${libName} not registered; skipping registry sync.`);
            }
          } catch (e) {
            console.error(` Failed to update manifest/registry for ${libName}: ${e.message}`);
            requireBump.push(libName);
          }
        }
      }
      // --- End: Expanded static asset hash check ---
    };
    if (requireBump.length > 0 || invalidLower.length > 0) {
      console.error('Build audit failed. The following component(s) require attention:');
      for (const name of requireBump) console.error(` - ${name}: bump version to proceed`);
      for (const name of invalidLower) console.error(` - ${name}: manifest version is lower than registry`);
      process.exit(1);
    }
    console.log('Build audit complete.');
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  };
};

function semverCompare(a, b) {
  const pa = String(a || '0.0.0').split('.').map(n => parseInt(n, 10) || 0);
  const pb = String(b || '0.0.0').split('.').map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] || 0;
    const y = pb[i] || 0;
    if (x > y) return 1;
    if (x < y) return -1;
  }
  return 0;
}