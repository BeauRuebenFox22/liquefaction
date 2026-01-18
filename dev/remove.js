const fs = require('fs-extra');
const nodeFs = require('fs');
const path = require('path');
const readline = require('readline');
const ops = require('./ops');

const libRoot = path.resolve(__dirname, '../');

function normalize(name) {
  const base = name.startsWith('lib-') ? name.slice(4) : name;
  const libName = `lib-${base}`;
  return { base, libName };
};

function askConfirmPrompt(message) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(`${message} (y/n): `, (answer) => {
      rl.close();
      const val = String(answer || '').trim().toLowerCase();
      resolve(val === 'y');
    });
  });
};

async function findComponentDir(base, libName) {
  const preferred = path.join(libRoot, 'components', libName);
  if(await fs.pathExists(preferred)) return preferred;
  const legacy = path.join(libRoot, 'components', base);
  if(await fs.pathExists(legacy)) return legacy;
  return null;
};

async function findLegacyRootFiles(libName) {
  const exts = ['.liquid', '.css', '.js'];
  const paths = exts.map(ext => path.join(libRoot, 'components', `${libName}${ext}`));
  const existing = [];
  for(const p of paths) {
    if (await fs.pathExists(p)) existing.push(p);
  };
  return existing;
};

async function makeWritableRecursive(targetPath) {
  try {
    const stats = await fs.stat(targetPath);
    const mode = stats.isDirectory() ? 0o777 : 0o666;
    await fs.chmod(targetPath, mode);
    if(stats.isDirectory()) {
      const entries = await fs.readdir(targetPath);
      for(const entry of entries) {
        await makeWritableRecursive(path.join(targetPath, entry));
      };
    };
  } catch {
    // best-effort
  };
};

async function removeDirRobust(dirPath) {
  if(!dirPath) return true;
  const maxRetries = 5;
  const delay = (ms) => new Promise(res => setTimeout(res, ms));
  for(let i = 0; i < maxRetries; i++) {
    try {
      if(nodeFs.promises?.rm) {
        await nodeFs.promises.rm(dirPath, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
      } else {
        await fs.remove(dirPath);
      };
      return true;
    } catch (err) {
      if(err && (err.code === 'EPERM' || err.code === 'EBUSY' || err.code === 'ENOTEMPTY')) {
        await makeWritableRecursive(dirPath);
        await delay(150 + i * 100);
        continue;
      };
      throw err;
    };
  };
  try {
    const quarantine = `${dirPath}.deleted-${Date.now()}`;
    await fs.move(dirPath, quarantine, { overwrite: true });
    try {
      if(nodeFs.promises?.rm) {
        await nodeFs.promises.rm(quarantine, { recursive: true, force: true });
      } else {
        await fs.remove(quarantine);
      }
    } catch {}
    return true;
  } catch {
    return false;
  };
};

module.exports = async function removeComponent(name, options = {}) {
  try {
    if(!name) throw new Error('Component name is required.');
    const { base, libName } = normalize(name);
    const registry = await ops.getRegistryData();
    const existsInRegistry = !!(registry && registry[libName]);
    const dirPath = await findComponentDir(base, libName);
    const legacyFiles = await findLegacyRootFiles(libName);
    if(!existsInRegistry && !dirPath && legacyFiles.length === 0) {
      console.error(`Target for deletion ${libName}, does not exist`);
      process.exit(1);
    };
    const proceed = options.yes ? true : await askConfirmPrompt(`Are you sure you want to delete ${libName}?`);
    if(!proceed) {
      console.log('Deletion cancelled.');
      process.exit(0);
    };
    if(existsInRegistry) {
      const removed = await ops.removeFromComponentRegistry(libName);
      if(!removed) {
        console.warn(`Registry entry for ${libName} was not found or could not be removed.`);
      } else {
        console.log(`Registry updated: removed ${libName}`);
      };
    };
    if(dirPath) {
      const ok = await removeDirRobust(dirPath);
      if (ok) {
        console.log(`Deleted directory: ${dirPath}`);
      } else {
        console.warn(`Unable to fully delete directory: ${dirPath}. It may be locked by another process.`);
      };
    } else if (legacyFiles.length) {
      for (const file of legacyFiles) {
        try {
          await fs.remove(file);
          console.log(`Deleted file: ${file}`);
        } catch {}
      };
    };
    console.log('Component removal complete.');
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  };
};