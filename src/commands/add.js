const fs = require('fs-extra');
const path = require('path');
const libRoot = path.resolve(__dirname, '../../'); 

module.exports = async function add(name) {
  
  const themeRoot = process.cwd();
  try {
    const registry = await fs.readJson(path.join(libRoot, 'registry.json'));
    const component = registry[name];
    if(!component) throw new Error(`Component ${name} not found.`);
    console.log(`Installing ${name}...`);
    for(const file of component.files) {
      const src = path.join(libRoot, file.src);
      const dest = path.join(themeRoot, file.destDir, `lib-${path.basename(file.src)}`);
      await fs.ensureDir(path.dirname(dest));
      await fs.copy(src, dest);
    }  
    console.log(`Successfully added ${name} to your theme.`);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  };

};