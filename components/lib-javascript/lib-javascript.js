/**
 * @scope: {{SCOPE}}
 * @docs: Add documentation for LibJavascript here.
 * @dependencies: []
 */

// lib-lib-javascript.js (Light DOM)
export class LibJavascript extends HTMLElement {
  static get is() { return 'lib-javascript'; }
  
  // These are the "Props" your Registry/In-situ docs will scrape
  static get props() { 
    return {
      'aria-label': 'string',
      'theme': 'primary | secondary',
      'disabled': 'boolean'
    };
  };

  static get observedAttributes() { 
    return Object.keys(LibJavascript.props); 
  };

  connectedCallback() {

    if(this._initialized) return;
    this._initialized = true;
    this.classList.add('lib-javascript');

    // Initial attribute check
    if(!this.hasAttribute('aria-label')) {
      this.setAttribute('aria-label', 'Lib LibJavascript');
    };

    // "Lego" Root Construction
    let root = this.querySelector('.lib-javascript__root');
    if(!root) {
      root = document.createElement('div');
      root.className = 'lib-javascript__root';
      root.setAttribute('role', 'region');
      const slot = document.createElement('slot');
      root.appendChild(slot);
      this.appendChild(root);
    };

  };

  attributeChangedCallback(name, _oldVal, newVal) {
    const root = this.querySelector('.lib-javascript__root');
    if(root && name === 'aria-label') {
      root.setAttribute('aria-label', newVal || '');
    };
  };

};

// Safe Registry Handshake
if (!customElements.get(LibJavascript.is)) {
  customElements.define(LibJavascript.is, LibJavascript);
}