const fs = require('fs-extra');

function stripComments(liquid) {
  const s = String(liquid || '');
  // Remove Liquid comment blocks and HTML comments from consideration
  return s
    .replace(/\{%-?\s*comment\s*-?%}[\s\S]*?\{%-?\s*endcomment\s*-?%}/g, '')
    .replace(/<!--[\s\S]*?-->/g, '');
}

function stripStrings(liquid) {
  const noSingle = String(liquid || '').replace(/'[^']*'/g, '');
  const noDouble = noSingle.replace(/"[^"]*"/g, '');
  return noDouble;
}

function parseScopeFromHeader(liquid) {
  // Search all Liquid comment blocks; allow optional leading '-' before @scope
  const re = /\{%-?\s*comment\s*-?%}([\s\S]*?)\{%-?\s*endcomment\s*-?%}/g;
  const text = String(liquid || '');
  let m;
  while ((m = re.exec(text)) !== null) {
    const block = m[1] || '';
    const scopeLine = block.match(/-?\s*@scope\s*=\s*([^\n]+)/i);
    if (scopeLine) {
      const raw = scopeLine[1].trim();
      return raw.split(/[,|]/).map(s => s.trim()).filter(Boolean);
    }
  }
  return [];
}

function parsePropDescriptionsFromHeader(liquid) {
  // Parse lines like: @prop _title: Button label text
  const headerMatch = String(liquid || '').match(/\{%-?\s*comment\s*-?%}([\s\S]*?)\{%-?\s*endcomment\s*-?%}/);
  if (!headerMatch) return {};
  const header = headerMatch[1] || '';
  const lines = header.split(/\r?\n/);
  const map = {};
  for (const line of lines) {
    const m = line.match(/[\-*•]?\s*@prop\s+(_[a-z0-9_]+)\s*:\s*(.+)/i);
    if (m) {
      // Strip any optional trailing attributes after a pipe, keep description only
      const desc = m[2].split('|')[0].trim();
      map[m[1]] = desc;
    }
  }
  return map;
}

function extractProps(text) {
  const props = new Set();
  // Print tags: {{ _name }} with filters allowed
  const printRe = /\{\{\s*(_[a-z0-9_]+)\b[^}]*\}\}/gi;
  let m;
  while ((m = printRe.exec(text)) !== null) props.add(m[1]);
  // Assign tags: {% assign _name = ... %}
  const assignRe = /\{%\s*assign\s+(_[a-z0-9_]+)\b[^%]*%\}/gi;
  while ((m = assignRe.exec(text)) !== null) props.add(m[1]);
  return Array.from(props);
}

function extractDependencies(liquid) {
  const deps = new Set();
  const source = stripComments(liquid);
  const re = /\{%\s*render\s*['"](lib-[a-z0-9-]+)['"][^%]*%}/gi;
  let m;
  while ((m = re.exec(source)) !== null) deps.add(m[1]);
  return Array.from(deps);
}

function derivePropEntries(liquid) {
  // required=true if a default value is detected; placeholder set to default string
  const entries = [];
  const text = stripStrings(stripComments(liquid));
  const names = extractProps(text);
  const headerDescriptions = parsePropDescriptionsFromHeader(liquid);
  const defaultMap = (function findDefaults(src){
    const map = {};
    const ps = /\{\{-?\s*(_[a-z0-9_]+)\b[^}]*\|\s*default\s*:\s*'([^']*)'[^}]*\}\}/gi;
    const pd = /\{\{-?\s*(_[a-z0-9_]+)\b[^}]*\|\s*default\s*:\s*"([^"]*)"[^}]*\}\}/gi;
    const as = /\{%-?\s*assign\s+(_[a-z0-9_]+)\b[^%]*default\s*:\s*'([^']*)'[^%]*%\}/gi;
    const ad = /\{%-?\s*assign\s+(_[a-z0-9_]+)\b[^%]*default\s*:\s*"([^"]*)"[^%]*%\}/gi;
    let m;
    while ((m = ps.exec(src)) !== null) map[m[1]] = m[2];
    while ((m = pd.exec(src)) !== null) map[m[1]] = m[2];
    while ((m = as.exec(src)) !== null) map[m[1]] = m[2];
    while ((m = ad.exec(src)) !== null) map[m[1]] = m[2];
    return map;
  })(liquid);
  for (const name of names) {
    // Detect default anchored within Liquid print tag: {{ _prop | default: 'value' }} or {{ _prop | default: "value" }}
    const defaultRe = new RegExp(`\\{\\{\\s*${name}\\s*\\|\\s*default\\s*:\\s*(['"])((?:[^\\\\]|\\\\.)*?)\\1\\s*\\}\\}`, 'i');
    let m = liquid.match(defaultRe);
    if (!m) {
      const defaultPrintSingle = new RegExp("\\{\\{-?\\s*" + name + "\\s*\\|\\s*default\\s*:\\s*'([^']*)'\\s*\\}\\}", 'i');
      const defaultPrintDouble = new RegExp("\\{\\{-?\\s*" + name + "\\s*\\|\\s*default\\s*:\\s*\"([^\"]*)\"\\s*\\}\\}", 'i');
      m = liquid.match(defaultPrintSingle) || liquid.match(defaultPrintDouble);
    }
    let hasDefault = Boolean(m);
    let placeholder = m ? m[2] : undefined;
    if (!placeholder && Object.prototype.hasOwnProperty.call(defaultMap, name)) {
      placeholder = defaultMap[name];
    }
    if (!hasDefault) {
      // Also detect default in assign lines: {% assign _prop = _prop | default: 'value' %} or any RHS using default
      const assignDefaultSingle = new RegExp("\\{%\\s*assign\\s+" + name + "\\b[^%]*default\\s*:\\s*'([^']*)'[^%]*%\\}", 'i');
      const assignDefaultDouble = new RegExp("\\{%\\s*assign\\s+" + name + "\\b[^%]*default\\s*:\\s*\"([^\"]*)\"[^%]*%\\}", 'i');
      m = liquid.match(assignDefaultSingle) || liquid.match(assignDefaultDouble);
      hasDefault = Boolean(m);
      if (m && !placeholder) placeholder = m[2];
    }
    entries.push({
      name,
      type: 'string',
      required: hasDefault || Object.prototype.hasOwnProperty.call(defaultMap, name),
      description: headerDescriptions[name] || '',
      ...(placeholder ? { placeholder } : {}),
    });
  }
  return entries;
}

async function extractFromFile(primaryPath) {
  const liquid = await fs.readFile(primaryPath, 'utf8');
  const props = derivePropEntries(liquid);
  const dependencies = extractDependencies(liquid);
  const scope = parseScopeFromHeader(liquid);
  return { props, dependencies, scope };
}

module.exports = {
  extractFromFile,
};
