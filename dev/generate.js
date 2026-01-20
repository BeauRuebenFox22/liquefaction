const fs = require('fs-extra');
const path = require('path');
const readline = require('readline');

const libRoot = path.resolve(__dirname, '../');
const ops = require('./ops');
const { renderTemplate, toPascalCase } = require('./templates');

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

function askAssetsPrompt(defaultChoice = 'none') {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const promptText = [
    'Select static assets to include:',
    '  1) JavaScript only',
    '  2) CSS only',
    '  3) Both',
    '  4) None',
    'Enter choice (1-4): '
  ].join('\n');
  return new Promise((resolve) => {
    rl.question(promptText, (answer) => {
      rl.close();
      const val = String(answer || '').trim().toLowerCase();
      if (val === '1' || val === 'js' || val === 'javascript') return resolve('js');
      if (val === '2' || val === 'css') return resolve('css');
      if (val === '3' || val === 'both') return resolve('both');
      if (val === '4' || val === 'none' || val === 'no') return resolve('none');
      return resolve(defaultChoice);
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

async function scaffoldJavaScriptComponent(dir, libName, baseName, includeCSS) {
  await fs.ensureDir(dir);
  const tokens = {
    LIB_NAME: libName,
    KEBAB_NAME: baseName,
    PASCAL_NAME: `Lib${toPascalCase(baseName)}`,
  };
  const jsPath = path.join(dir, `${libName}.js`);
  if (await fs.pathExists(jsPath)) {
    console.log(`Skipped: ${jsPath} already exists.`);
  } else {
    const tpl = await renderTemplate('web/primary.js', tokens);
    await fs.writeFile(jsPath, tpl || `// ${libName}.js`, 'utf8');
    console.log(`Created: ${jsPath}`);
  }
  if (includeCSS) {
    const cssPath = path.join(dir, `${libName}.css`);
    if (await fs.pathExists(cssPath)) {
      console.log(`Skipped: ${cssPath} already exists.`);
    } else {
      const tpl = await renderTemplate('web/style.css', tokens);
      await fs.writeFile(cssPath, tpl || `/* ${libName}.css */`, 'utf8');
      console.log(`Created: ${cssPath}`);
    }
  }
};

async function scaffoldLiquidComponent(dir, libName, baseName, includeJS, includeCSS) {
  await fs.ensureDir(dir);
  const tokens = {
    LIB_NAME: libName,
    KEBAB_NAME: baseName,
    PASCAL_NAME: `Lib${toPascalCase(baseName)}`,
  };
  const liquidPath = path.join(dir, `${libName}.liquid`);
  if (await fs.pathExists(liquidPath)) {
    console.log(`Skipped: ${liquidPath} already exists.`);
  } else {
    const tpl = await renderTemplate('liquid/primary.liquid', tokens);
    await fs.writeFile(liquidPath, tpl || `{% comment %} ${libName}.liquid {% endcomment %}`, 'utf8');
    console.log(`Created: ${liquidPath}`);
  }
  if (includeCSS) {
    const cssPath = path.join(dir, `${libName}.css`);
    if (await fs.pathExists(cssPath)) {
      console.log(`Skipped: ${cssPath} already exists.`);
    } else {
      const tpl = await renderTemplate('liquid/style.css', tokens);
      await fs.writeFile(cssPath, tpl || `/* ${libName}.css */`, 'utf8');
      console.log(`Created: ${cssPath}`);
    }
  }
  if (includeJS) {
    const jsPath = path.join(dir, `${libName}.js`);
    if (await fs.pathExists(jsPath)) {
      console.log(`Skipped: ${jsPath} already exists.`);
    } else {
      const tpl = await renderTemplate('liquid/behavior.js', tokens);
      await fs.writeFile(jsPath, tpl || `// ${libName}.js`, 'utf8');
      console.log(`Created: ${jsPath}`);
    }
  }
};

async function writeManifest(dir, manifest) {
  const filePath = path.join(dir, 'manifest.json');
  await fs.writeJson(filePath, manifest, { spaces: 2 });
  console.log(`Created: ${filePath}`);
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
    const assetChoice = await askAssetsPrompt(type === 'javascript' ? 'js' : 'none');
    const includeJS = assetChoice === 'js' || assetChoice === 'both';
    const includeCSS = assetChoice === 'css' || assetChoice === 'both' || (type === 'javascript' && assetChoice === 'css');
    console.log(`Generating ${type} component: ${libName}`);
    if(type === 'javascript') {
      await scaffoldJavaScriptComponent(dir, libName, baseName, includeCSS);
    } else {
      await scaffoldLiquidComponent(dir, libName, baseName, includeJS, includeCSS);
    };
    // Compute initial hash of primary file for manifest & registry
    const now = new Date().toISOString();
    const primaryFileName = type === 'liquid' ? `${libName}.liquid` : `${libName}.js`;
    const primaryFullPath = path.join(dir, primaryFileName);
    const initialHash = await ops.generateHash(primaryFullPath);
    const manifest = {
      name: libName,
      type: type === 'liquid' ? 'snippet-component' : 'web-component',
      version: '0.0.1',
      description: `${type} component scaffold`,
      primary: {
        path: primaryFileName,
        hash: initialHash || ''
      },
      files: (type === 'liquid'
        ? [
            ...(includeCSS ? [{ src: `components/${libName}.css`, destDir: 'assets' }] : []),
            { src: `components/${libName}.liquid`, destDir: 'snippets' }
          ]
        : [
            { src: `components/${libName}.js`, destDir: 'assets' },
            ...(includeCSS ? [{ src: `components/${libName}.css`, destDir: 'assets' }] : [])
          ]
      ),
      assets: {
        ...(includeCSS ? { css: [`${libName}.css`] } : {}),
        ...(includeJS && type === 'liquid' ? { js: [`${libName}.js`] } : {})
      },
      props: [],
      dependencies: [],
      registry: {
        createdAt: now,
        hash: initialHash || ''
      },
      build: {
        lastAuditAt: ''
      }
    };
    await writeManifest(dir, manifest);
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