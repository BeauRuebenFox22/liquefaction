// lib-lib-grapes.js (no Shadow DOM)
// @scope= product, collection
export class LibGrapes extends HTMLElement {
  
  static get is() { return 'lib-grapes'; }
  static get observedAttributes() { return ['aria-label']; }

  connectedCallback() {

    if(this._initialized) return;
    
    this._initialized = true;
    this.classList.add('lib-grapes');

    if(!this.hasAttribute('aria-label')) {
      this.setAttribute('aria-label', 'Lib LibGrapes');
    };

    let root = this.querySelector('.lib-grapes__root');
    if(!root) {
      root = document.createElement('div');
      root.className = 'lib-grapes__root';
      root.setAttribute('role', 'region');
      root.setAttribute('aria-label', this.getAttribute('aria-label') || '');
      const slot = document.createElement('slot');
      root.appendChild(slot);
      this.appendChild(root);
    };
  };

  attributeChangedCallback(name, _oldVal, newVal) {
    if(name === 'aria-label') {
      const root = this.querySelector('.lib-grapes__root');
      if(root) root.setAttribute('aria-label', newVal || '');
    };
  };

};

if(!customElements.get(LibGrapes.is)) {
  customElements.define(LibGrapes.is, LibGrapes);
};