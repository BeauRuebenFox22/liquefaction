#!/usr/bin/env node
const { program, Command } = require('commander'); 
const addAction = require('../src/commands/add');
let generateComponentAction = null;
let removeComponentAction = null;
let buildAction = null;
try {
  // Dev-only: present in repo, excluded from npm package
  generateComponentAction = require('../dev/generate');
} catch (_) {
  // Generate command unavailable in published package
}
try {
  removeComponentAction = require('../dev/remove');
} catch (_) {
  // Remove command unavailable in published package
}
try {
  buildAction = require('../dev/build');
} catch (_) {
  // Build command unavailable in published package
}

program
  .version('1.0.0')
  .description('Agency UI Component Manager');

program
  .command('add <name>')
  .description('Install a component from the library')
  .action(addAction);

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

  if (removeComponentAction) {
    const removeCmd = new Command('remove');
    removeCmd.description('Remove scaffolds');
    removeCmd
      .command('component <name>')
      .description('Remove an existing component')
      .option('-y, --yes', 'Confirm removal without prompt')
      .action((name, options) => removeComponentAction(name, options));
    program.addCommand(removeCmd);
  }

  if (buildAction) {
    program
      .command('build')
      .description('Audit components and sync registry hashes')
      .action(() => buildAction());
  }

program.parse(process.argv);