#!/usr/bin/env node
const { program, Command } = require('commander'); 
const addAction = require('../src/commands/add');
let generateComponentAction = null;
let removeComponentAction = null;
let buildAction = null;
let manifestHashAction = null;
let manifestCleanAction = null;
let assetAddAction = null;
let assetRemoveAction = null;
let serveAction = null;

try {
  serveAction = require('../dev/serve');
} catch (_) {};

try {
  generateComponentAction = require('../dev/generate');
} catch (_) {};

try {
  removeComponentAction = require('../dev/remove');
} catch (_) {};

try {
  buildAction = require('../dev/build');
} catch (_) {};

try {
  manifestHashAction = require('../dev/manifest-hash');
} catch (_) {};

try {
  manifestCleanAction = require('../dev/manifest-clean');
} catch (_) {};

try {
  assetAddAction = require('../dev/asset-add');
} catch(_) {};
try {
  assetRemoveAction = require('../dev/asset-remove');
} catch(_) {};

program
  .version('1.0.0')
  .description('Agency UI Component Manager');

program
  .command('add <name>')
  .description('Install a component from the library')
  .action(addAction);

if(assetAddAction || assetRemoveAction) {
  const assetCmd = new Command('asset');
  assetCmd.description("Manage asset files on components");
  if (assetAddAction) {
    assetCmd
      .command('add [name]')
      .description('Add asset files (CSS/JS) to an existing component')
      .option('-t, --type <type>', 'Asset type (css|js)')
      .action((name, options) => assetAddAction(name, options));
  }
  if (assetRemoveAction) {
    assetCmd
      .command('remove [name]')
      .description('Remove asset files (CSS/JS) from an existing component')
      .option('-t, --type <type>', 'Asset type (css|js)')
      .action((name, options) => assetRemoveAction(name, options));
  }
  program.addCommand(assetCmd);
};

if(generateComponentAction) {
  const generateCmd = new Command('generate');
  generateCmd.description('Generate scaffolds');
  generateCmd
    .command('component <name>')
    .description('Generate a new component')
    .option('-t, --type <type>', 'Component type (javascript|liquid)')
    .action((name, options) => generateComponentAction(name, options));
  program.addCommand(generateCmd);
};

if(removeComponentAction) {
  const removeCmd = new Command('remove');
  removeCmd.description('Remove scaffolds');
  removeCmd
    .command('component <name>')
    .description('Remove an existing component')
    .option('-y, --yes', 'Confirm removal without prompt')
    .action((name, options) => removeComponentAction(name, options));
  program.addCommand(removeCmd);
};

if(buildAction) {
  program
    .command('build')
    .description('Audit components and sync registry hashes')
    .action(() => buildAction());
};

if(manifestHashAction) {
  program
    .command('manifest-hash [name]')
    .description('Compute and write manifest + registry hash for a component')
    .option('-a, --all', 'Process all components with a manifest')
    .action((name, options) => manifestHashAction(name, options));
};

if(manifestCleanAction) {
  program
    .command('manifest-clean [name]')
    .description('Remove unused keys from component manifest(s)')
    .option('--dry-run', 'Preview changes without writing')
    .action((name, options) => manifestCleanAction(name, options));
};

if(serveAction) {
  program
    .command('serve [components] [context]')
    .description('Start the local dev server for component preview')
    .action((components, context) => serveAction(components, context));
};
  
program.parse(process.argv);