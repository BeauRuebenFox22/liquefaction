const fs = require('fs-extra');
const path = require('path');

const libRoot = path.resolve(__dirname, '../');
const templatesDir = path.join(libRoot, 'templates');

function toPascalCase(str) {
  return String(str || '')
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map(s => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase())
    .join('');
}

async function renderTemplate(relPath, tokens) {
  const filePath = path.join(templatesDir, relPath);
  const exists = await fs.pathExists(filePath);
  if (!exists) return null;
  let content = await fs.readFile(filePath, 'utf8');
  const keys = Object.keys(tokens || {});
  for (const k of keys) {
    const re = new RegExp(`\\{\\{${k}\\}\\}`, 'g');
    content = content.replace(re, String(tokens[k]));
  }
  return content;
}

module.exports = {
  templatesDir,
  renderTemplate,
  toPascalCase,
};
