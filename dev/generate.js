const fs = require('fs-extra');
const path = require('path');
const readline = require('readline');

const libRoot = path.resolve(__dirname, '../');
const ops = require('./ops');

function askTypePrompt() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    const promptText = [
      'Select component type:',
      '  1) JavaScript',
      '  2) Liquid',
      'Enter choice (1 or 2): ',
    ].join('\n');
    rl.question(promptText, (answer) => {
      rl.close();
      const val = String(answer).trim().toLowerCase();
      if(val === '1' || val === 'javascript' || val === 'js') return resolve('javascript');
      if(val === '2' || val === 'liquid') return resolve('liquid');
      return resolve(null);
    });
  });
};

function askNamePrompt(message, defaultName) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const promptText = defaultName ? `${message} (current: ${defaultName})\nEnter a new name: ` : `${message}\nEnter a component name: `;
  return new Promise((resolve) => {
    rl.question(promptText, (answer) => {
      rl.close();
      const val = String(answer || '').trim();
      resolve(val);
    });
  });
};

async function componentExists(baseName, libName) {
  try {
    const dirPath = path.join(libRoot, 'components', baseName);
    const registry = await ops.getRegistryData();
    if(registry && registry[libName]) return true;
    if(await fs.pathExists(dirPath)) return true;
    const candidates = [
      path.join(libRoot, 'components', `${libName}.liquid`),
      path.join(libRoot, 'components', `${libName}.css`),
      path.join(libRoot, 'components', `${libName}.js`),
      path.join(libRoot, 'components', baseName, `${libName}.liquid`),
      path.join(libRoot, 'components', baseName, `${libName}.css`),
      path.join(libRoot, 'components', baseName, `${libName}.js`),
    ];
    for(const p of candidates) {
      if(await fs.pathExists(p)) return true;
    };
    return false;
  } catch {
    return false;
  };
};

async function scaffoldJavaScriptComponent(dir, libName) {
  await fs.ensureDir(dir);
  const jsPath = path.join(dir, `${libName}.js`);
  const content = `// ${libName}.js\n// TODO: add boilerplate Web Component implementation`;
  if(await fs.pathExists(jsPath)) {
    console.log(`Skipped: ${jsPath} already exists.`);
  } else {
    await fs.writeFile(jsPath, content, 'utf8');
    console.log(`Created: ${jsPath}`);
  };
};

async function scaffoldLiquidComponent(dir, libName) {
  await fs.ensureDir(dir);
  const liquidPath = path.join(dir, `${libName}.liquid`);
  const cssPath = path.join(dir, `${libName}.css`);
  const jsPath = path.join(dir, `${libName}.js`);
  const liquidContent = `{% comment %} ${libName}.liquid {% endcomment %}`;
  const cssContent = `/* ${libName}.css */`;
  const jsContent = `// ${libName}.js\n// TODO: add boilerplate for Liquid component behavior`;
  for(const [p, c] of [
    [liquidPath, liquidContent],
    [cssPath, cssContent],
    [jsPath, jsContent],
  ]) {
    if(await fs.pathExists(p)) {
      console.log(`Skipped: ${p} already exists.`);
    } else {
      await fs.writeFile(p, c, 'utf8');
      console.log(`Created: ${p}`);
    };
  };
};

module.exports = async function generateComponent(name, options = {}) {
  try {
    if(!name) throw new Error('Component name is required.');
    let baseName = name.startsWith('lib-') ? name.slice(4) : name;
    let libName = `lib-${baseName}`;
    while(await componentExists(baseName, libName)) {
      console.error(`A component with the name "${libName}" already exists.`);
      const newName = await askNamePrompt('Please choose a different component name:', baseName);
      const trimmed = (newName || '').trim();
      if(!trimmed) {
        console.error('No name provided. Cancelled.');
        process.exit(1);
      }
      baseName = trimmed.startsWith('lib-') ? trimmed.slice(4) : trimmed;
      libName = `lib-${baseName}`;
    }

    const dir = path.join(libRoot, 'components', `lib-${baseName}`);
    const typeFlag = options.type ? String(options.type).trim().toLowerCase() : null;
    let type = null;
    if(typeFlag === 'javascript' || typeFlag === 'js') type = 'javascript';
    else if (typeFlag === 'liquid') type = 'liquid';
    else type = await askTypePrompt();
    if(!type) {
      console.error('Invalid selection. Please choose 1 or 2.');
      process.exit(1);
    };
    console.log(`Generating ${type} component: ${libName}`);
    if(type === 'javascript') {
      await scaffoldJavaScriptComponent(dir, libName);
    } else {
      await scaffoldLiquidComponent(dir, libName);
    };
    // Update component registry
    try {
      await ops.addToComponentRegistry(libName, type, `${type} component scaffold`);
    } catch (e) {
      console.warn('Registry update skipped:', e.message);
    }
    console.log('Component scaffolding complete.');
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  };
};