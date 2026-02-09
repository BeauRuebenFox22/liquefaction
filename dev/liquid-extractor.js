const fs = require('fs-extra');

function stripComments(liquid) {
  const s = String(liquid || '');
  return s
    .replace(/\{%-?\s*comment\s*-?%}[\s\S]*?\{%-?\s*endcomment\s*-?%}/g, '')
    .replace(/<!--[\s\S]*?-->/g, '');
};

function stripStrings(liquid) {
  const noSingle = String(liquid || '').replace(/'[^']*'/g, '');
  const noDouble = noSingle.replace(/"[^"]*"/g, '');
  return noDouble;
};

function parseDescriptionFromHeader(liquid) {
  const re = /\{%-?\s*comment\s*-?%}([\s\S]*?)\{%-?\s*endcomment\s*-?%}/g;
  const text = String(liquid || '');
  let m;
  while((m = re.exec(text)) !== null) {
    const block = m[1] || '';
    const descriptionLine = block.match(/-?\s*@description\s*:\s*([^\n]+)/i);
    if(descriptionLine) {
      return descriptionLine[1].trim();
    };
  };
  return [];
};

function parseScopeFromHeader(liquid) {
  const re = /\{%-?\s*comment\s*-?%}([\s\S]*?)\{%-?\s*endcomment\s*-?%}/g;
  const text = String(liquid || '');
  let m;
  while((m = re.exec(text)) !== null) {
    const block = m[1] || '';
    const scopeLine = block.match(/-?\s*@scope\s*=\s*([^\n]+)/i);
    if(scopeLine) {
      const raw = scopeLine[1].trim();
      return raw.split(/[,|]/).map(s => s.trim()).filter(Boolean);
    };
  };
  return [];
};

function parsePropDescriptionsFromHeader(liquid) {
  const headerMatch = String(liquid || '').match(/\{%-?\s*comment\s*-?%}([\s\S]*?)\{%-?\s*endcomment\s*-?%}/);
  if(!headerMatch) return {};
  const header = headerMatch[1] || '';
  const lines = header.split(/\r?\n/);
  const map = {};
  for(const line of lines) {
    const m = line.match(/[\-*•]?\s*@prop\s+(_[a-z0-9_]+)\s*:\s*(.+)/i);
    if(m) {
      const desc = m[2].split('|')[0].trim();
      map[m[1]] = desc;
    };
  };
  return map;
};

function extractProps(text) {
  const props = new Set();
  const printRe = /\{\{\s*(_[a-z0-9_]+)\b[^}]*\}\}/gi;
  let m;
  while((m = printRe.exec(text)) !== null) props.add(m[1]);
  const assignRe = /\{%\s*assign\s+(_[a-z0-9_]+)\b[^%]*%\}/gi;
  while((m = assignRe.exec(text)) !== null) props.add(m[1]);
  return Array.from(props);
};

function extractDependencies(liquid) {
  const deps = new Set();
  const source = stripComments(liquid);
  const re = /\{%\s*render\s*['"](lib-[a-z0-9-]+)['"][^%]*%}/gi;
  let m;
  while((m = re.exec(source)) !== null) deps.add(m[1]);
  return Array.from(deps);
};

function derivePropEntries(liquid) {
  const entries = [];
  const text = stripStrings(stripComments(liquid));
  const names = extractProps(text);
  const headerDescriptions = parsePropDescriptionsFromHeader(liquid);
  // Find all default assignments, including non-string values
  const defaultMap = (function findDefaults(src){
    const map = {};
    // Match default: ... in prints and assigns (string, boolean, numbers, Shopify objects, etc.)
    const allDefault = /\{\{-?\s*(_[a-z0-9_]+)\b[^}]*\|\s*default\s*:\s*([^}|]+)[^}]*\}\}/gi;
    const assignDefault = /\{%-?\s*assign\s+(_[a-z0-9_]+)\b[^%]*default\s*:\s*([^%]*)%\}/gi;
    let m;
    while((m = allDefault.exec(src)) !== null) map[m[1]] = (m[2] || '').trim();
    while((m = assignDefault.exec(src)) !== null) map[m[1]] = (m[2] || '').trim();
    return map;
  })(liquid);

  function inferTypeFromDefault(expr) {
    if(!expr) return 'string';
    const raw = String(expr).trim();
    const lower = raw.toLowerCase();
    // Boolean
    if(lower === 'true' || lower === 'false') return 'boolean';
    // Number
    if(/^[0-9]+(?:\.[0-9]+)?$/.test(raw)) return 'number';
    // Shopify object-like (product.price, collection.title, cart, etc.)
    if(/^(product|collection|cart|search|variant|line_item|shop|blog|article|customer)\b/i.test(raw)) {
      return 'shopify_object';
    }
    // Quoted string literal
    if((raw.startsWith("'") && raw.endsWith("'")) || (raw.startsWith('"') && raw.endsWith('"'))) {
      return 'string';
    }
    // Fallback
    return 'string';
  };

  for(const name of names) {
    const defaultRe = new RegExp(`\\{\\{\\s*${name}\\s*\\|\\s*default\\s*:\\s*(['"])((?:[^\\\\]|\\\\.)*?)\\1\\s*\\}\\}`, 'i');
    let m = liquid.match(defaultRe);
    if(!m) {
      const defaultPrintSingle = new RegExp("\\{\\{-?\\s*" + name + "\\s*\\|\\s*default\\s*:\\s*'([^']*)'\\s*\\}\\}", 'i');
      const defaultPrintDouble = new RegExp("\\{\\{-?\\s*" + name + "\\s*\\|\\s*default\\s*:\\s*\"([^\"]*)\"\\s*\\}\\}", 'i');
      m = liquid.match(defaultPrintSingle) || liquid.match(defaultPrintDouble);
    };

    // Treat as required if any default is present (string, boolean, number, or Shopify object)
    let hasDefault = Object.prototype.hasOwnProperty.call(defaultMap, name);
    const rawDefault = hasDefault ? defaultMap[name] : undefined;
    const propType = inferTypeFromDefault(rawDefault);
    let placeholder;
    if(typeof rawDefault === 'string' && rawDefault.length) {
      const raw = rawDefault.trim();
      const isQuoted = (raw.startsWith("'") && raw.endsWith("'")) || (raw.startsWith('"') && raw.endsWith('"'));
      placeholder = isQuoted ? raw.slice(1, -1) : raw;
    };
    entries.push({
      name,
      type: propType,
      required: hasDefault,
      description: headerDescriptions[name] || '',
      ...(placeholder ? { placeholder } : {}),
    });
  };
  return entries;
};

async function extractFromFile(primaryPath) {
  const liquid = await fs.readFile(primaryPath, 'utf8');
  const props = derivePropEntries(liquid);
  const dependencies = extractDependencies(liquid);
  const scope = parseScopeFromHeader(liquid);
  const description = parseDescriptionFromHeader(liquid);
  return { props, dependencies, scope, description };
};

module.exports = {
  extractFromFile,
};