const fs = require('fs-extra');
const path = require('path');

const libRoot = path.resolve(__dirname, '../');
const componentsDir = path.join(libRoot, 'components');

async function listComponentManifests() {
  const results = [];
  if (!(await fs.pathExists(componentsDir))) return results;
  const entries = await fs.readdir(componentsDir);
  for (const entry of entries) {
    if (!entry.startsWith('lib-')) continue;
    const manifestPath = path.join(componentsDir, entry, 'manifest.json');
    if (await fs.pathExists(manifestPath)) {
      results.push({ libName: entry, manifestPath });
    }
  }
  return results;
}

function pruneManifest(manifest) {
  let changed = false;
  if (manifest && manifest.registry && Array.isArray(manifest.registry.updatedAt)) {
    delete manifest.registry.updatedAt;
    changed = true;
  }
  if (manifest && manifest.build && Array.isArray(manifest.build.warnings)) {
    delete manifest.build.warnings;
    changed = true;
  }
  return changed;
}

module.exports = async function manifestClean(name, options = {}) {
  try {
    const dryRun = !!options.dryRun;
    const items = await listComponentManifests();
    const targets = name
      ? items.filter(i => i.libName === (name.startsWith('lib-') ? name : `lib-${name}`))
      : items;

    if (targets.length === 0) {
      console.log('No manifests found for cleanup.');
      return;
    }

    let total = 0;
    for (const { libName, manifestPath } of targets) {
      try {
        const manifest = await fs.readJson(manifestPath);
        const changed = pruneManifest(manifest);
        if (changed) {
          total += 1;
          if (!dryRun) await fs.writeJson(manifestPath, manifest, { spaces: 2 });
          console.log(`${dryRun ? '[dry-run] ' : ''}Cleaned ${libName}`);
        }
      } catch (e) {
        console.warn(`Skipping ${libName}: ${e.message}`);
      }
    }
    console.log(`Cleanup ${dryRun ? 'preview' : 'complete'}: ${total} file(s) updated.`);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
};
