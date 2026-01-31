/**
 * @scope: global
 * @docs: This is to test data extraction for WP's.
 * @dependencies: [lib-helpers, lib-widgets]
 */

// lib-lib-foxiness.js (Light DOM)
export class LibFoxiness extends HTMLElement {
  static get is() { return 'lib-foxiness'; }
  
  // These are the "Props" your Registry/In-situ docs will scrape
  static get props() { 
    return {
      'aria-label': 'string',
      'theme': 'primary | secondary',
      'disabled': 'boolean'
    };
  };

  static get observedAttributes() { 
    return Object.keys(LibFoxiness.props); 
  };

  connectedCallback() {

    if(this._initialized) return;
    this._initialized = true;
    this.classList.add('lib-foxiness');

    // Initial attribute check
    if(!this.hasAttribute('aria-label')) {
      this.setAttribute('aria-label', 'Lib LibFoxiness');
    };

    // "Lego" Root Construction
    let root = this.querySelector('.lib-foxiness__root');
    if(!root) {
      root = document.createElement('div');
      root.className = 'lib-foxiness__root';
      root.setAttribute('role', 'region');
      const slot = document.createElement('slot');
      root.appendChild(slot);
      this.appendChild(root);
    };

  };

  attributeChangedCallback(name, _oldVal, newVal) {
    const root = this.querySelector('.lib-foxiness__root');
    if(root && name === 'aria-label') {
      root.setAttribute('aria-label', newVal || '');
    };
  };

};

// Safe Registry Handshake
if(!customElements.get(LibFoxiness.is)) {
  customElements.define(LibFoxiness.is, LibFoxiness);
};