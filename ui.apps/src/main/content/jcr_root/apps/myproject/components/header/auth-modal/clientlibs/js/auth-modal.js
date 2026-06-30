document.addEventListener("DOMContentLoaded", () => {
    const modal = document.querySelector(".js-auth-modal");
    
    if (!modal) return;

    const closeBtns = document.querySelectorAll(".js-close-auth");
    
    // Saari views ko select kiya
    const viewLogin = document.querySelector(".js-view-login");
    const viewVerify = document.querySelector(".js-view-verify");
    const viewDetails = document.querySelector(".js-view-details");
    const viewForgotMobile = document.querySelector(".js-view-forgot-mobile");
    const viewForgotOtp = document.querySelector(".js-view-forgot-otp");
    
    const authTitle = document.querySelector(".js-auth-title");
    const authDesc = document.querySelector(".js-auth-desc");

    // Ek view dikhate waqt baaki sabko hide karne ka helper function
    const hideAllViews = () => {
        const allViews = modal.querySelectorAll(".cmp-auth-view");
        allViews.forEach(v => {
            if (v) v.style.display = "none";
        });
    };

    window.addEventListener("openAuthModal", () => {
        modal.showModal(); 
        document.body.style.overflow = "hidden";
        showLoginView();
    });

    const showLoginView = () => {
        hideAllViews();
        viewLogin.style.display = "flex";
        authTitle.textContent = "Login";
        authDesc.textContent = "Get access to your Orders, Wishlist and Recommendations";
    };

    const showVerifyView = () => {
        hideAllViews();
        viewVerify.style.display = "flex";
        authTitle.textContent = "Looks like you're new here!";
        authDesc.textContent = "Sign up with your mobile number to get started";
    };

    const showDetailsView = () => {
        hideAllViews();
        viewDetails.style.display = "flex";
        authTitle.textContent = "Almost there!";
        authDesc.textContent = "Please provide your details to create your account";
    };

    // 🌟 NAYA FUNCTION: Forgot Password Mobile View
    const showForgotMobileView = () => {
        hideAllViews();
        viewForgotMobile.style.display = "flex";
        authTitle.textContent = "Reset Password";
        authDesc.textContent = "Enter your mobile number to receive a verification OTP";
    };

    // 🌟 NAYA FUNCTION: Forgot Password OTP View
    const showForgotOtpView = () => {
        hideAllViews();
        viewForgotOtp.style.display = "flex";
        authTitle.textContent = "Verify OTP";
        authDesc.textContent = "Enter the 6-digit OTP sent to your mobile";
    };

    const closeModal = () => {
        modal.close(); 
        document.body.style.overflow = ""; 
    };

    closeBtns.forEach(btn => {
        btn.addEventListener("click", closeModal);
    });

    modal.addEventListener("click", (e) => {
        const dialogDimensions = modal.getBoundingClientRect();
        if (
            e.clientX < dialogDimensions.left || e.clientX > dialogDimensions.right ||
            e.clientY < dialogDimensions.top || e.clientY > dialogDimensions.bottom
        ) {
            closeModal();
        }
    });

    document.querySelectorAll(".js-go-register").forEach(link => {
        link.addEventListener("click", (e) => { e.preventDefault(); showVerifyView(); });
    });

    document.querySelectorAll(".js-go-login").forEach(link => {
        link.addEventListener("click", (e) => { e.preventDefault(); showLoginView(); });
    });


    // --- 🌟 NAYA CODE: LOGIN BUTTON LOGIC ---
    const loginSubmitBtn = document.querySelector(".js-login-submit-btn");
    if (loginSubmitBtn) {
        loginSubmitBtn.addEventListener("click", () => {
            const email = document.getElementById("login-email-input").value.trim();
            const pass = document.getElementById("login-pass-input").value.trim();
            
            if (email !== "" && pass !== "") {
                localStorage.setItem("isUserLoggedIn", "true"); // User ko logged in set karo
                window.dispatchEvent(new CustomEvent("authStatusChanged")); // Header ko batao
                closeModal(); // Modal band karo
                alert("Logged in successfully!");
            } else {
                alert("Please enter both Email and Password.");
            }
        });
    }

    // --- 🌟 NAYA CODE: FORGOT PASSWORD FLOW LOGIC ---
    document.querySelectorAll(".js-go-forgot").forEach(link => {
        link.addEventListener("click", (e) => {
            e.preventDefault();
            showForgotMobileView();
        });
    });

    const sendOtpBtn = document.querySelector(".js-send-otp-btn");
    if (sendOtpBtn) {
        sendOtpBtn.addEventListener("click", () => {
            const mobileVal = document.querySelector(".js-forgot-mobile-input").value.trim();
            if (mobileVal.length >= 10) {
                sendOtpBtn.textContent = "Sending OTP...";
                setTimeout(() => {
                    sendOtpBtn.textContent = "Send OTP";
                    showForgotOtpView(); // OTP fill karne wala view kholo
                }, 1000);
            } else {
                alert("Please enter a valid mobile number");
            }
        });
    }

    const verifyForgotOtpBtn = document.querySelector(".js-verify-forgot-otp-btn");
    if (verifyForgotOtpBtn) {
        verifyForgotOtpBtn.addEventListener("click", () => {
            const otpVal = document.querySelector(".js-forgot-otp-input").value.trim();
            if (otpVal.length === 6) {
                alert("OTP Verified Successfully! (You can reset your password now)");
                showLoginView(); // Wapas login pe bhej do
            } else {
                alert("Please enter a 6-digit OTP.");
            }
        });
    }


    // --- AAPKA PURANA VERIFY REGISTRATION LOGIC ---
    const verifyBtn = document.querySelector(".js-verify-btn");
    const mobileInput = document.querySelector(".js-mobile-input");

    if (verifyBtn) {
        verifyBtn.addEventListener("click", () => {
            const mobileVal = mobileInput.value.trim();
            if (mobileVal.length >= 10) {
                verifyBtn.textContent = "Verifying...";
                setTimeout(() => {
                    verifyBtn.textContent = "Verify Mobile";
                    showDetailsView();
                }, 1000);
            } else {
                alert("Please enter a valid mobile number");
            }
        });
    }
});