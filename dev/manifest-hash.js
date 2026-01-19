const fs = require('fs-extra');
const path = require('path');
const ops = require('./ops');

const libRoot = path.resolve(__dirname, '../');
const componentsDir = path.join(libRoot, 'components');

async function listComponentsWithManifest() {
  const out = [];
  if (!(await fs.pathExists(componentsDir))) return out;
  const entries = await fs.readdir(componentsDir);
  for (const entry of entries) {
    if (!entry.startsWith('lib-')) continue;
    const manifestPath = path.join(componentsDir, entry, 'manifest.json');
    if (await fs.pathExists(manifestPath)) out.push(entry);
  }
  return out;
}

async function updateManifestHash(libName) {
  const manifestPath = path.join(componentsDir, libName, 'manifest.json');
  if (!(await fs.pathExists(manifestPath))) {
    console.log(`No manifest for ${libName}; skipping.`);
    return false;
  }
  const manifest = await fs.readJson(manifestPath);
  const primaryRel = manifest && manifest.primary && manifest.primary.path;
  if (!primaryRel) {
    console.log(`No primary.path in manifest for ${libName}; skipping.`);
    return false;
  }
  const primaryFull = path.join(componentsDir, libName, primaryRel);
  if (!(await fs.pathExists(primaryFull))) {
    console.log(`Primary file not found for ${libName}; skipping.`);
    return false;
  }
  const hash = await ops.generateHash(primaryFull);
  if (!hash) {
    console.log(`Unable to hash ${libName}; skipping.`);
    return false;
  }
  manifest.primary = manifest.primary || {};
  manifest.primary.hash = hash;
  manifest.registry = manifest.registry || {};
  manifest.registry.hash = hash;
  manifest.build = manifest.build || {};
  manifest.build.lastAuditAt = new Date().toISOString();
  await fs.writeJson(manifestPath, manifest, { spaces: 2 });
  // Keep central registry in sync as well
  await ops.updateComponentRegistry(libName, { hash });
  console.log(`Updated manifest and registry hash for ${libName}`);
  return true;
}

module.exports = async function manifestHash(name, options = {}) {
  try {
    if (options.all) {
      const names = await listComponentsWithManifest();
      for (const libName of names) {
        await updateManifestHash(libName);
      }
      console.log('Manifest hash update complete.');
      return;
    }
    if (!name) {
      console.error('Please provide a component name or use --all.');
      process.exit(1);
    }
    const libName = name.startsWith('lib-') ? name : `lib-${name}`;
    await updateManifestHash(libName);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
};
