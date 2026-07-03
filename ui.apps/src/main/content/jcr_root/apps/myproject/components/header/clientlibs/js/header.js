document.addEventListener("DOMContentLoaded", () => {
    
    // --- 🌟 LOGIN / LOGOUT UI SWITCH & LOGIC ---
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
                // 🌟 FIX: Agar user logged in hai, toh click karne par Logout aur Cart Empty dono karo
                localStorage.setItem("isUserLoggedIn", "false");
                localStorage.removeItem("userMobile");
                localStorage.removeItem("aem_spa_cart"); // Cart clear
                
                updateAuthUI();
                window.location.reload(); // Uske baad page refresh kardo
            } else {
                // Agar login nahi hai, toh purane jaisa popup open karo
                window.dispatchEvent(new CustomEvent("openAuthModal"));
            }
        });
    }
});