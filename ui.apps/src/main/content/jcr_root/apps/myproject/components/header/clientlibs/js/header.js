document.addEventListener("DOMContentLoaded", () => {
    
    // --- AAPKA PURANA CART LOGIC (NO CHANGE) ---
    const badge = document.querySelector(".cmp-header__cart-badge");
    const CART_STORAGE_KEY = "aem_spa_cart";

    const updateBadge = () => {
        if (!badge) return;
        const cart = JSON.parse(localStorage.getItem(CART_STORAGE_KEY)) || [];
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        badge.textContent = totalItems;
        badge.style.display = totalItems > 0 ? "inline-block" : "none";
    };

    updateBadge(); 
    window.addEventListener("aemCartUpdated", updateBadge); 


    // --- 🌟 NAYA CODE: Login / Logout Switch Logic ---
    const authBtn = document.getElementById("header-auth-btn");
    
    // UI Update karne ka function
    const updateAuthUI = () => {
        if (!authBtn) return;
        const isLoggedIn = localStorage.getItem("isUserLoggedIn") === "true";
        if (isLoggedIn) {
            authBtn.innerHTML = "<span>🔓 Logout</span>";
        } else {
            authBtn.innerHTML = "<span>👤 Login</span>";
        }
    };

    updateAuthUI(); // Page load hote hi check karega
    
    // Modal se jab login success ka signal aayega, tab ye UI update karega
    window.addEventListener("authStatusChanged", updateAuthUI); 

    if (authBtn) {
        authBtn.addEventListener("click", () => {
            const isLoggedIn = localStorage.getItem("isUserLoggedIn") === "true";
            
            if (isLoggedIn) {
                // Agar user logged in hai, toh click karne par Logout kar do
                localStorage.removeItem("isUserLoggedIn");
                updateAuthUI();
                // Logout success alert removed here
                window.location.reload(); // Page refresh kardo
            } else {
                // Agar login nahi hai, toh purane jaisa popup open karo
                window.dispatchEvent(new CustomEvent("openAuthModal"));
            }
        });
    }
});