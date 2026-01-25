// lib-lib-cheese.js (optional behavior for Liquid components)
(() => {
  const selector = '.lib-cheese[data-lib="cheese"]';
  document.querySelectorAll(selector).forEach((el) => {
    // Hook point for interactive behavior
    // Example: el.addEventListener('click', () => {});
  });
})();
