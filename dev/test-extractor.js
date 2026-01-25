const path = require('path');
const fs = require('fs');
const extractor = require('./liquid-extractor');

(async () => {
  const tmp = path.join(__dirname, '__tmp_test.liquid');
  const sample = `{% comment %}
 @scope= all
 - Guidance:
   - Example (ignored): {% render 'lib-child' %}
   - Example prop (ignored): {{ _twinkle_toes }}
@prop _title: Button label text
@prop _price: Display price for the product
{% endcomment %}
{{ _title | default: 'Hello' }}
{{ _price | default: "9.99" }}
{% render 'lib-button' %}`;
  fs.writeFileSync(tmp, sample, 'utf8');
  try {
    const res = await extractor.extractFromFile(tmp);
    console.log(JSON.stringify(res, null, 2));
  } catch (e) {
    console.error('Extractor error:', e);
    process.exitCode = 1;
  } finally {
    try { fs.unlinkSync(tmp); } catch {}
  }
})();