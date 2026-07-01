document.addEventListener("DOMContentLoaded", () => {
    const modal = document.querySelector(".js-auth-modal");
    
    if (!modal) return;

    const closeBtns = document.querySelectorAll(".js-close-auth");
    
    // Saari views ko select kiya
    const viewLogin = document.querySelector(".js-view-login");
    const viewVerify = document.querySelector(".js-view-verify");
    const viewRegisterOtp = document.querySelector(".js-view-register-otp"); // 🌟 NAYA: Registration OTP view
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

    // 🌟 NAYA: Show Registration OTP View
    const showRegisterOtpView = () => {
        hideAllViews();
        viewRegisterOtp.style.display = "flex";
        authTitle.textContent = "Verify Mobile Number";
        authDesc.textContent = "Enter the 6-digit OTP sent to your mobile";
    };

    const showDetailsView = () => {
        hideAllViews();
        viewDetails.style.display = "flex";
        authTitle.textContent = "Almost there!";
        authDesc.textContent = "Please provide your details to create your account";
    };

    const showForgotMobileView = () => {
        hideAllViews();
        viewForgotMobile.style.display = "flex";
        authTitle.textContent = "Reset Password";
        authDesc.textContent = "Enter your mobile number to receive a verification OTP";
    };

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

    // --- LOGIN BUTTON LOGIC WITH DB VERIFICATION ---
    const loginSubmitBtn = document.querySelector(".js-login-submit-btn");
    if (loginSubmitBtn) {
        loginSubmitBtn.addEventListener("click", () => {
            const identifier = document.getElementById("login-email-input").value.trim();
            const pass = document.getElementById("login-pass-input").value.trim();
            
            if (identifier !== "" && pass !== "") {
                loginSubmitBtn.textContent = "Logging in...";
                loginSubmitBtn.disabled = true;

                const loginData = new URLSearchParams();
                loginData.append("identifier", identifier); 
                loginData.append("password", pass);

                fetch('/libs/granite/csrf/token.json')
                .then(response => response.json())
                .then(tokenData => {
                    return fetch('/bin/loginUser', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded',
                            'CSRF-Token': tokenData.token
                        },
                        body: loginData.toString()
                    });
                })
                .then(response => response.json())
                .then(data => {
                    if (data.status === "success") {
                        localStorage.setItem("isUserLoggedIn", "true"); 
                        window.dispatchEvent(new CustomEvent("authStatusChanged")); 
                        closeModal(); 
                        alert("Logged in successfully!");
                    } else {
                        alert("Login Failed: Invalid Email/Mobile or Password.");
                    }
                })
                .catch(error => {
                    console.error('Login Error:', error);
                    alert("Something went wrong with the login process.");
                })
                .finally(() => {
                    loginSubmitBtn.textContent = "Login";
                    loginSubmitBtn.disabled = false;
                });
            } else {
                alert("Please enter both Email/Mobile and Password.");
            }
        });
    }

    // --- FORGOT PASSWORD FLOW LOGIC ---
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
                    showForgotOtpView(); 
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
                showLoginView(); 
            } else {
                alert("Please enter a 6-digit OTP.");
            }
        });
    }

    // --- 🌟 UPDATE: SEND OTP FOR REGISTRATION (STEP 1) ---
    const verifyBtn = document.querySelector(".js-verify-btn");
    const mobileInput = document.querySelector(".js-mobile-input");
    
    if (verifyBtn) {
        verifyBtn.addEventListener("click", () => {
            const mobileVal = mobileInput.value.trim();
            if (mobileVal.length >= 10) {
                verifyBtn.textContent = "Sending OTP...";
                verifyBtn.disabled = true;

                const formData = new URLSearchParams();
                formData.append("action", "generate");
                formData.append("mobile", mobileVal);

                fetch('/libs/granite/csrf/token.json')
                .then(response => response.json())
                .then(tokenData => {
                    return fetch('/bin/otpHandler', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded',
                            'CSRF-Token': tokenData.token
                        },
                        body: formData.toString()
                    });
                })
                .then(response => response.json())
                .then(data => {
                    if (data.status === "success") {
                        // 🔴 TESTING MODE: Alert dikha rahe hain taaki aap OTP dekh kar type kar sakein
                        alert("TESTING MODE OTP: " + data.otp); 
                        showRegisterOtpView(); 
                    } else {
                        alert("Failed to send OTP.");
                    }
                })
                .catch(error => {
                    console.error('OTP Generation Error:', error);
                    alert("Something went wrong with the backend.");
                })
                .finally(() => {
                    verifyBtn.textContent = "Send OTP";
                    verifyBtn.disabled = false;
                });

            } else {
                alert("Please enter a valid 10-digit mobile number");
            }
        });
    }

    // --- 🌟 NAYA: VERIFY THE GENERATED OTP (STEP 2) ---
    const verifyRegisterOtpBtn = document.querySelector(".js-verify-register-otp-btn");
    const registerOtpInput = document.querySelector(".js-register-otp-input");
    const detailsMobileInput = document.querySelector(".js-details-mobile-input"); 

    if (verifyRegisterOtpBtn) {
        verifyRegisterOtpBtn.addEventListener("click", () => {
            const otpVal = registerOtpInput.value.trim();
            const mobileVal = mobileInput.value.trim(); // Jo mobile pehle dala tha

            if (otpVal.length === 6) {
                verifyRegisterOtpBtn.textContent = "Verifying...";
                verifyRegisterOtpBtn.disabled = true;

                const formData = new URLSearchParams();
                formData.append("action", "verify");
                formData.append("mobile", mobileVal);
                formData.append("otp", otpVal);

                fetch('/libs/granite/csrf/token.json')
                .then(response => response.json())
                .then(tokenData => {
                    return fetch('/bin/otpHandler', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded',
                            'CSRF-Token': tokenData.token
                        },
                        body: formData.toString()
                    });
                })
                .then(response => response.json())
                .then(data => {
                    if (data.status === "success") {
                        alert("Mobile Verified Successfully!");
                        if(detailsMobileInput) {
                            detailsMobileInput.value = mobileVal; // Details me autofill ho gaya
                        }
                        showDetailsView(); // Details form par bhej diya
                    } else {
                        alert("Incorrect OTP. Please try again.");
                    }
                })
                .catch(error => {
                    console.error('OTP Verification Error:', error);
                    alert("Something went wrong during verification.");
                })
                .finally(() => {
                    verifyRegisterOtpBtn.textContent = "Verify OTP";
                    verifyRegisterOtpBtn.disabled = false;
                });

            } else {
                alert("Please enter the 6-digit OTP.");
            }
        });
    }

    // --- CREATE ACCOUNT VALIDATION & POSTGRESQL DB LOGIC (STEP 3) ---
    const createPassInput = document.querySelector(".js-create-pass-input");
    const reenterPassInput = document.querySelector(".js-reenter-pass-input");
    const passErrorMsg = document.querySelector(".js-pass-error-msg");
    const signUpSubmitBtn = document.querySelector(".js-signup-submit-btn");

    const fnameInput = document.querySelector(".js-fname-input");
    const mnameInput = document.querySelector(".js-mname-input"); 
    const lnameInput = document.querySelector(".js-lname-input");
    const emailSignupInput = document.querySelector(".js-email-signup-input");
    const dobInput = document.querySelector(".cmp-auth-input[type='date']"); 

    if (createPassInput && reenterPassInput && passErrorMsg && signUpSubmitBtn) {
        
        reenterPassInput.addEventListener("input", () => {
            if (reenterPassInput.value !== "" && reenterPassInput.value !== createPassInput.value) {
                passErrorMsg.style.display = "block";
            } else {
                passErrorMsg.style.display = "none";
            }
        });

        createPassInput.addEventListener("input", () => {
            if (reenterPassInput.value !== "" && reenterPassInput.value !== createPassInput.value) {
                passErrorMsg.style.display = "block";
            } else {
                passErrorMsg.style.display = "none";
            }
        });

        signUpSubmitBtn.addEventListener("click", () => {
            const fname = fnameInput.value.trim();
            const mname = mnameInput ? mnameInput.value.trim() : ""; 
            const lname = lnameInput.value.trim();
            const email = emailSignupInput.value.trim();
            const dob = dobInput ? dobInput.value : "";
            const pass1 = createPassInput.value.trim();
            const pass2 = reenterPassInput.value.trim();
            const mobileNumber = detailsMobileInput.value; 

            if (fname === "" || lname === "" || email === "" || pass1 === "" || pass2 === "") {
                alert("Please fill out all mandatory fields (First Name, Last Name, Email, and Passwords).");
                return; 
            }

            if (pass1 !== pass2) {
                passErrorMsg.style.display = "block";
                return; 
            }

            passErrorMsg.style.display = "none";

            signUpSubmitBtn.textContent = "Registering...";
            signUpSubmitBtn.disabled = true;

            const formData = new URLSearchParams();
            formData.append("firstName", fname);
            formData.append("middleName", mname);
            formData.append("lastName", lname);
            formData.append("email", email);
            formData.append("dob", dob);
            formData.append("password", pass1);
            formData.append("mobileNumber", mobileNumber); 

            fetch('/libs/granite/csrf/token.json')
            .then(response => response.json())
            .then(tokenData => {
                return fetch('/bin/registerUser', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'CSRF-Token': tokenData.token 
                    },
                    body: formData.toString()
                });
            })
            .then(response => {
                if (!response.ok) throw new Error("HTTP Status " + response.status);
                return response.json();
            })
            .then(data => {
                if (data.status === "success") {
                    alert("Account created successfully!");
                    fnameInput.value = "";
                    if(mnameInput) mnameInput.value = "";
                    lnameInput.value = "";
                    emailSignupInput.value = "";
                    createPassInput.value = "";
                    reenterPassInput.value = "";
                    if(dobInput) dobInput.value = "";
                    if(detailsMobileInput) detailsMobileInput.value = "";
                    
                    showLoginView(); 
                } else {
                    alert("Registration Failed: " + data.message);
                }
            })
            .catch(error => {
                console.error('Error during registration:', error);
                alert("Something went wrong with the database connection.");
            })
            .finally(() => {
                signUpSubmitBtn.textContent = "Sign Up";
                signUpSubmitBtn.disabled = false;
            });
        });
    }
});