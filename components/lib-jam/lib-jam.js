// lib-lib-jam.js (optional behavior for Liquid components)
(() => {
  const selector = '.lib-jam[data-lib="jam"]';
  document.querySelectorAll(selector).forEach((el) => {
    // Hook point for interactive behavior
    // Example: el.addEventListener('click', () => {});
  });
})();
