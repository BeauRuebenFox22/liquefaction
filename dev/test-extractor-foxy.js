const path = require('path');
const fs = require('fs');
const extractor = require('./liquid-extractor');

(async () => {
  const tmp = path.join(__dirname, '__tmp_foxy.liquid');
  const sample = `{%- comment -%}
Component: lib-foxy
Type: snippet-component

Props (snake_case with leading underscore):
- _foxy_content: string (required)
- _aria_label: string (optional)
- _foxy_id: string (optional)

Scope (theme contexts):
- @scope= all

Docs (inline prop descriptions):
- @prop _empty: Describe the main content when empty.
- @prop _test: Test for required flagging.
{%- endcomment -%}

{% assign _empty = 'Empty' | default: 'Empty' %}
{% assign _test = 'Test for require flag' %}
{% assign test = 'Test for omission in build' %}

<div class="lib-foxy" data-lib="foxy" role="region">
  {% render 'lib-button' %}
  {%- if _foxy_content -%}
    <div class="lib-foxy__content">
      {{ _foxy_content }}
    </div>
  {%- else -%}
    <div class="lib-foxy__content lib-foxy__content--empty" aria-hidden="true">
      {{ _empty }}
    </div>
  {%- endif -%}
  {% render 'lib-footer' %}
</div>`;
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