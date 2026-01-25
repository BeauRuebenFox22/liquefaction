// lib-lib-foxy.js (optional behavior for Liquid components)
(() => {
  const selector = '.lib-foxy[data-lib="foxy"]';
  document.querySelectorAll(selector).forEach((el) => {
    // Hook point for interactive behavior
    // Example: el.addEventListener('click', () => {});
  });
})();
