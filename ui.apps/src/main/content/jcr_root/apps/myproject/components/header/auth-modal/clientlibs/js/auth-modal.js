document.addEventListener("DOMContentLoaded", () => {
    const modal = document.querySelector(".js-auth-modal");
    
    if (!modal) return;

    const closeBtns = document.querySelectorAll(".js-close-auth");
    
    const viewLogin = document.querySelector(".js-view-login");
    const viewVerify = document.querySelector(".js-view-verify");
    const viewRegisterOtp = document.querySelector(".js-view-register-otp"); 
    const viewDetails = document.querySelector(".js-view-details");
    const viewForgotMobile = document.querySelector(".js-view-forgot-mobile");
    const viewForgotOtp = document.querySelector(".js-view-forgot-otp");
    
    const authTitle = document.querySelector(".js-auth-title");
    const authDesc = document.querySelector(".js-auth-desc");

    const viewResetPass = document.querySelector(".js-view-reset-pass");

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
        
        // Reset login fields
        document.getElementById("login-mobile-input").value = "";
        document.getElementById("login-pass-input").value = "";
    };

    const showVerifyView = () => {
        hideAllViews();
        viewVerify.style.display = "flex";
        authTitle.textContent = "Looks like you're new here!";
        authDesc.textContent = "Sign up with your mobile number to get started";
    };

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
        document.querySelector(".js-forgot-mobile-input").value = "";
        const errorMsg = document.querySelector(".js-forgot-error-msg");
        if(errorMsg) errorMsg.style.display = "none";
    };

    const showForgotOtpView = () => {
        hideAllViews();
        viewForgotOtp.style.display = "flex";
        authTitle.textContent = "Verify OTP";
        authDesc.textContent = "Enter the 6-digit OTP sent to your mobile";
    };

    const showResetPassView = () => {
        hideAllViews();
        viewResetPass.style.display = "flex";
        authTitle.textContent = "Create New Password";
        authDesc.textContent = "Set a strong new password for your account";
        document.querySelector(".js-reset-pass-input").value = "";
        document.querySelector(".js-reset-reenter-pass-input").value = "";
        const errorMsg = document.querySelector(".js-reset-pass-error-msg");
        if(errorMsg) errorMsg.style.display = "none";
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

    // 🌟 LOGOUT LOGIC 🌟
    document.addEventListener("click", (e) => {
        if (e.target.closest(".js-logout-btn")) {
            e.preventDefault();
            localStorage.setItem("isUserLoggedIn", "false");
            localStorage.removeItem("userMobile");
            window.dispatchEvent(new CustomEvent("authStatusChanged"));
            alert("You have been logged out.");
        }
    });

    // --- LOGIN BUTTON LOGIC ---
    const loginSubmitBtn = document.querySelector(".js-login-submit-btn");
    if (loginSubmitBtn) {
        loginSubmitBtn.addEventListener("click", () => {
            // 🌟 UPDATE: Changed ID to login-mobile-input
            const identifier = document.getElementById("login-mobile-input").value.trim();
            const pass = document.getElementById("login-pass-input").value.trim();
            
            if (identifier === "" || pass === "") {
                alert("Please enter both Mobile Number and Password.");
                return;
            }

            // 🌟 UPDATE: Strict mobile number validation added
            if (identifier.length !== 10 || isNaN(identifier)) {
                alert("Please enter a valid 10-digit Mobile Number.");
                return;
            }

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
                    
                    // 🌟 UPDATE: Email logic removed. Seedha mobile number save hoga.
                    localStorage.setItem("userMobile", identifier); 
                    
                    window.dispatchEvent(new CustomEvent("authStatusChanged")); 
                    closeModal(); 
                } else {
                    alert("Login Failed: Invalid Mobile Number or Password.");
                }
            })
            .catch(error => {
                console.error('Login Error:', error);
            })
            .finally(() => {
                loginSubmitBtn.textContent = "Login";
                loginSubmitBtn.disabled = false;
            });
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
    const forgotErrorMsg = document.querySelector(".js-forgot-error-msg");

    if (sendOtpBtn) {
        sendOtpBtn.addEventListener("click", () => {
            const mobileVal = document.querySelector(".js-forgot-mobile-input").value.trim();
            if (mobileVal.length >= 10) {
                sendOtpBtn.textContent = "Checking...";
                sendOtpBtn.disabled = true;
                if(forgotErrorMsg) forgotErrorMsg.style.display = "none";

                fetch('/libs/granite/csrf/token.json')
                .then(response => response.json())
                .then(tokenData => {
                    const csrfToken = tokenData.token;
                    
                    const checkData = new URLSearchParams();
                    checkData.append("mobile", mobileVal);
                    
                    return fetch('/bin/checkUser', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded',
                            'CSRF-Token': csrfToken
                        },
                        body: checkData.toString()
                    })
                    .then(res => res.json())
                    .then(checkResult => {
                        if (checkResult.status === "exists") {
                            sendOtpBtn.textContent = "Sending OTP...";
                            
                            const otpData = new URLSearchParams();
                            otpData.append("action", "generate");
                            otpData.append("mobile", mobileVal);
                            
                            return fetch('/bin/otpHandler', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/x-www-form-urlencoded',
                                    'CSRF-Token': csrfToken
                                },
                                body: otpData.toString()
                            }).then(r => r.json());
                        } else {
                            throw new Error("USER_NOT_FOUND");
                        }
                    });
                })
                .then(otpResponse => {
                    if (otpResponse && otpResponse.status === "success") {
                        alert("TESTING MODE OTP: " + otpResponse.otp);
                        showForgotOtpView(); 
                    } else if (otpResponse) {
                        console.log("Failed to send OTP.");
                    }
                })
                .catch(error => {
                    if (error.message === "USER_NOT_FOUND") {
                        if(forgotErrorMsg) forgotErrorMsg.style.display = "block"; 
                    } else {
                        console.error('Error during forgot password process:', error);
                    }
                })
                .finally(() => {
                    sendOtpBtn.textContent = "Send OTP";
                    sendOtpBtn.disabled = false;
                });

            } else {
                alert("Please enter a valid 10-digit mobile number");
            }
        });
    }

    const verifyForgotOtpBtn = document.querySelector(".js-verify-forgot-otp-btn");
    if (verifyForgotOtpBtn) {
        verifyForgotOtpBtn.addEventListener("click", () => {
            const otpVal = document.querySelector(".js-forgot-otp-input").value.trim();
            if (otpVal.length === 6) {
                showResetPassView(); 
            } else {
                alert("Please enter a 6-digit OTP.");
            }
        });
    }

    // --- SEND OTP FOR REGISTRATION ---
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
                        alert("TESTING MODE OTP: " + data.otp); 
                        showRegisterOtpView(); 
                    } else {
                        console.log("Failed to send OTP.");
                    }
                })
                .catch(error => {
                    console.error('OTP Generation Error:', error);
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

    const verifyRegisterOtpBtn = document.querySelector(".js-verify-register-otp-btn");
    const registerOtpInput = document.querySelector(".js-register-otp-input");
    const detailsMobileInput = document.querySelector(".js-details-mobile-input"); 

    if (verifyRegisterOtpBtn) {
        verifyRegisterOtpBtn.addEventListener("click", () => {
            const otpVal = registerOtpInput.value.trim();
            const mobileVal = mobileInput.value.trim(); 

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
                        if(detailsMobileInput) {
                            detailsMobileInput.value = mobileVal; 
                        }
                        showDetailsView(); 
                    } else {
                        console.log("Incorrect OTP. Please try again.");
                    }
                })
                .catch(error => console.error('OTP Verification Error:', error))
                .finally(() => {
                    verifyRegisterOtpBtn.textContent = "Verify OTP";
                    verifyRegisterOtpBtn.disabled = false;
                });
            } else {
                alert("Please enter the 6-digit OTP.");
            }
        });
    }

    // --- CREATE ACCOUNT VALIDATION & DB LOGIC ---
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
            passErrorMsg.style.display = (reenterPassInput.value !== "" && reenterPassInput.value !== createPassInput.value) ? "block" : "none";
        });
        createPassInput.addEventListener("input", () => {
            passErrorMsg.style.display = (reenterPassInput.value !== "" && reenterPassInput.value !== createPassInput.value) ? "block" : "none";
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
                alert("Please fill out all mandatory fields.");
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
                    console.log("Registration Failed: " + data.message);
                }
            })
            .catch(error => console.error('Error during registration:', error))
            .finally(() => {
                signUpSubmitBtn.textContent = "Sign Up";
                signUpSubmitBtn.disabled = false;
            });
        });
    }

    // --- RESET PASSWORD DB LOGIC ---
    const resetPassInput = document.querySelector(".js-reset-pass-input");
    const resetReenterPassInput = document.querySelector(".js-reset-reenter-pass-input");
    const resetPassErrorMsg = document.querySelector(".js-reset-pass-error-msg");
    const resetSubmitBtn = document.querySelector(".js-reset-submit-btn");

    if (resetSubmitBtn) {
        const validateResetPasswords = () => {
            resetPassErrorMsg.style.display = (resetReenterPassInput.value !== "" && resetReenterPassInput.value !== resetPassInput.value) ? "block" : "none";
        };

        resetPassInput.addEventListener("input", validateResetPasswords);
        resetReenterPassInput.addEventListener("input", validateResetPasswords);

        resetSubmitBtn.addEventListener("click", () => {
            const newPass = resetPassInput.value.trim();
            const reenterPass = resetReenterPassInput.value.trim();
            const mobileVal = document.querySelector(".js-forgot-mobile-input").value.trim();

            if (newPass === "" || reenterPass === "") {
                alert("Please fill in both password fields.");
                return;
            }
            if (newPass !== reenterPass) {
                resetPassErrorMsg.style.display = "block";
                return;
            }

            resetSubmitBtn.textContent = "Updating...";
            resetSubmitBtn.disabled = true;

            const formData = new URLSearchParams();
            formData.append("mobile", mobileVal);
            formData.append("newPassword", newPass);

            fetch('/libs/granite/csrf/token.json')
            .then(response => response.json())
            .then(tokenData => {
                return fetch('/bin/resetPassword', {
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
                    alert("Password updated successfully! Please login.");
                    showLoginView();
                } else {
                    console.log("Failed to update password.");
                }
            })
            .catch(error => console.error('Password Update Error:', error))
            .finally(() => {
                resetSubmitBtn.textContent = "Save Password";
                resetSubmitBtn.disabled = false;
            });
        });
    }
});