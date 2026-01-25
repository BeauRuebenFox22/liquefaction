// lib-{{LIB_NAME}}.js (no Shadow DOM)
// @scope= product, collection
export class {{PASCAL_NAME}} extends HTMLElement {
  static get is() { return '{{LIB_NAME}}'; }
  static get observedAttributes() { return ['aria-label']; }

  connectedCallback() {
    if (this._initialized) return;
    this._initialized = true;
    this.classList.add('lib-{{KEBAB_NAME}}');

    if (!this.hasAttribute('aria-label')) {
      this.setAttribute('aria-label', 'Lib {{PASCAL_NAME}}');
    }

    let root = this.querySelector('.lib-{{KEBAB_NAME}}__root');
    if (!root) {
      root = document.createElement('div');
      root.className = 'lib-{{KEBAB_NAME}}__root';
      root.setAttribute('role', 'region');
      root.setAttribute('aria-label', this.getAttribute('aria-label') || '');
      const slot = document.createElement('slot');
      root.appendChild(slot);
      this.appendChild(root);
    }
  }

  attributeChangedCallback(name, _oldVal, newVal) {
    if (name === 'aria-label') {
      const root = this.querySelector('.lib-{{KEBAB_NAME}}__root');
      if (root) root.setAttribute('aria-label', newVal || '');
    }
  }
}

if (!customElements.get({{PASCAL_NAME}}.is)) {
  customElements.define({{PASCAL_NAME}}.is, {{PASCAL_NAME}});
}
