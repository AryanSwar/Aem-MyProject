document.addEventListener("DOMContentLoaded", () => {
    const badge = document.querySelector(".cmp-header__cart-badge");
    const CART_STORAGE_KEY = "aem_spa_cart";

    const updateBadge = () => {
        if (!badge) return;
        const cart = JSON.parse(localStorage.getItem(CART_STORAGE_KEY)) || [];
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        badge.textContent = totalItems;
        badge.style.display = totalItems > 0 ? "inline-block" : "none";
    };

    updateBadge(); // Initial load
    window.addEventListener("aemCartUpdated", updateBadge); // Listen for real-time updates
});