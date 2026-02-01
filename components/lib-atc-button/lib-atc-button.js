// lib-atc-button.js
// Basic JS for Add to Cart button (P1 test)
document.addEventListener('DOMContentLoaded', function() {
	document.querySelectorAll('.atc-btn[data-lib="atc-button"]')
		.forEach(function(btn) {
			btn.addEventListener('click', function() {
				// Basic test: show alert (replace with real ATC logic later)
				alert('Added to cart!');
			});
		});
});