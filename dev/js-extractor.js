const fs = require('fs');

module.exports = {

  extract: (filePath) => {

    if(!fs.existsSync(filePath)) return null;
    
    const content = fs.readFileSync(filePath, 'utf8');

    const metadata = {
      scope: (content.match(/@scope:\s*(.*)/)?.[1] || 'global')
        .split(',')
        .map(s => s.trim()),
      docs: content.match(/@docs:\s*(.*)/)?.[1] || '',
      dependencies: []
    };

    const depMatch = content.match(/@dependencies:\s*\[(.*?)\]/);

    if(depMatch && depMatch[1]) {
      metadata.dependencies = depMatch[1].split(',').map(d => d.trim().replace(/['"\[\]]/g, ''));
    };

    const propsMatch = content.match(/static\s+get\s+props\s*\(\)\s*\{[\s\S]*?return\s*(\{[\s\S]*?\})[;|\s]*\}/);

    if(propsMatch) {
      try {
        const propsObj = new Function(`return ${propsMatch[1]}`)();
        metadata.props = Object.entries(propsObj).map(([key, value]) => {
          return {
            "name": key,
            "type": typeof value === 'string' ? value : 'string',
            "required": false,
            "description": ""  
          };
        });
      } catch (e) {
        console.error(`:warning: Manifest sync failed for ${componentName}:`, e.message);
        metadata.props = [];
      };
    };

    return metadata;

  }

};