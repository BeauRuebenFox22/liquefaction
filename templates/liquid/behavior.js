// lib-{{LIB_NAME}}.js (optional behavior for Liquid components)
(() => {
  const selector = '.lib-{{KEBAB_NAME}}[data-lib="{{KEBAB_NAME}}"]';
  document.querySelectorAll(selector).forEach((el) => {
    // Hook point for interactive behavior
    // Example: el.addEventListener('click', () => {});
  });
})();
