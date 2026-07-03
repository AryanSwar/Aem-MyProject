document.addEventListener("DOMContentLoaded", () => {
    const CART_STORAGE_KEY = "aem_spa_cart";

    const checkIsLoggedIn = () => localStorage.getItem("isUserLoggedIn") === "true";

    const syncCartToDB = (cartData) => {
        if (!checkIsLoggedIn()) return;
        const mobile = localStorage.getItem("userMobile");
        
        fetch('/libs/granite/csrf/token.json')
        .then(response => response.json())
        .then(tokenData => {
            fetch('/bin/userCart', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'CSRF-Token': tokenData.token
                },
                body: JSON.stringify({ mobile: mobile, cartData: cartData })
            }).catch(err => console.error("Error saving cart to DB:", err));
        });
    };

    const fetchCartFromDB = () => {
        if (!checkIsLoggedIn()) return;
        const mobile = localStorage.getItem("userMobile");
        
        fetch(`/bin/userCart?mobile=${mobile}`)
        .then(res => res.json())
        .then(data => {
            if (data.status === "success" && data.cartData) {
                localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(data.cartData));
                renderAllCarts(); 
            }
        })
        .catch(err => console.error("Error fetching cart from DB:", err));
    };

    const renderAllCarts = () => {
        const cartData = JSON.parse(localStorage.getItem(CART_STORAGE_KEY)) || [];
        let totalItemsCount = 0; // Badge count ke liye

        document.querySelectorAll('[data-cart-wrapper="true"]').forEach(cartWrapper => {
            const itemsContainer = cartWrapper.querySelector('[data-cart-target="items"]');
            const totalEl = cartWrapper.querySelector('[data-cart-target="total"]');
            const summaryEl = cartWrapper.querySelector('[data-cart-target="summary"]');

            if (!itemsContainer) return;

            itemsContainer.innerHTML = "";
            let grandTotal = 0;

            if (cartData.length === 0) {
                itemsContainer.innerHTML = '<p class="cmp-cart__empty-msg">Your cart is currently empty.</p>';
                if(totalEl) totalEl.textContent = "$0.00";
                if(summaryEl) summaryEl.classList.add("cmp-cart__summary--hidden");
            } else {
                cartData.forEach((item) => {
                    const rawPrice = String(item.price).replace(/[^0-9.]/g, '');
                    const safePrice = parseFloat(rawPrice) || 0;
                    const itemTotal = safePrice * item.quantity;
                    grandTotal += itemTotal;
                    totalItemsCount += item.quantity; // Total items calculate ho rahe hain

                    let imagePath = "https://dummyimage.com/70x70/f5f5f5/666666&text=No+Img"; 
                    if (item.image && typeof item.image === 'object' && item.image._path) {
                        imagePath = item.image._path;
                    } else if (typeof item.image === 'string' && item.image.trim() !== "") {
                        imagePath = item.image;
                    }

                    const row = document.createElement("div");
                    row.className = "cmp-cart__item";
                    
                    row.innerHTML = `
                        <div class="cmp-cart__item-info">
                            <img 
                                src="${imagePath}" 
                                alt="${item.title || 'Product'}" 
                                class="cmp-cart__item-image"
                                onerror="this.onerror=null; this.src='https://dummyimage.com/70x70/f5f5f5/666666&text=No+Img';"
                            >
                            <div>
                                <h4 class="cmp-cart__item-title">${item.title}</h4>
                                <div class="cmp-cart__item-price">$${safePrice.toFixed(2)}</div>
                            </div>
                        </div>
                        <div class="cmp-cart__item-bottom-row">
                            <div class="cmp-cart__controls">
                                <button class="cmp-cart__qty-btn" data-action="decrease" data-id="${item.productid}">-</button>
                                <span class="cmp-cart__qty-display">${item.quantity}</span>
                                <button class="cmp-cart__qty-btn" data-action="increase" data-id="${item.productid}">+</button>
                            </div>
                            <div class="cmp-cart__item-total">
                                $${itemTotal.toFixed(2)}
                            </div>
                        </div>
                    `;
                    itemsContainer.appendChild(row);
                });

                if(totalEl) totalEl.textContent = `$${grandTotal.toFixed(2)}`;
                if(summaryEl) summaryEl.classList.remove("cmp-cart__summary--hidden");
            }
        });

        // 🌟 FIX: UI pe Header ka Badge number update
        document.querySelectorAll('.js-cart-badge').forEach(badge => {
            badge.textContent = totalItemsCount;
            badge.style.display = totalItemsCount > 0 ? 'inline-block' : 'none';
        });
    };

    const updateCartQuantity = (productid, change) => {
        let cart = JSON.parse(localStorage.getItem(CART_STORAGE_KEY)) || [];
        const index = cart.findIndex(i => String(i.productid) === String(productid));
        if (index > -1) {
            cart[index].quantity += change;
            if (cart[index].quantity <= 0) cart.splice(index, 1);
        }
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
        window.dispatchEvent(new CustomEvent("aemCartUpdated"));
    };

    // DB aur UI map karne ke events
    window.addEventListener("authStatusChanged", () => {
        if (checkIsLoggedIn()) {
            fetchCartFromDB();
        } else {
            renderAllCarts(); 
        }
    });

    window.addEventListener("aemCartUpdated", () => {
        renderAllCarts();
        const cart = JSON.parse(localStorage.getItem(CART_STORAGE_KEY)) || [];
        syncCartToDB(cart);
    });

    if (checkIsLoggedIn()) {
        fetchCartFromDB();
    } else {
        renderAllCarts();
    }

    // 🌟 FIX: STRICT ADD TO CART INTERCEPTOR - Bina login block karna 🌟
    // Ye event listener 'true' (capturing phase) me hai, isliye button ka apna logic trigger hone se pehle ye run hoga.
    document.addEventListener("click", (e) => {
        const addToCartBtn = e.target.closest(".js-add-to-cart");
        if (addToCartBtn) {
            if (!checkIsLoggedIn()) {
                e.preventDefault();
                e.stopPropagation(); 
                e.stopImmediatePropagation(); // Kisi bhi dusre event ko aage badhne se tok dega
                window.dispatchEvent(new CustomEvent("openAuthModal")); // Login popup khulega
                return false; 
            }
        }
    }, true); 

    document.addEventListener("click", (e) => {
        if (e.target.dataset.action === "increase") updateCartQuantity(e.target.dataset.id, 1);
        if (e.target.dataset.action === "decrease") updateCartQuantity(e.target.dataset.id, -1);
        
        if (e.target.dataset.cartTarget === "checkout") {
            e.preventDefault();
            const total = document.querySelector('[data-cart-target="total"]')?.textContent;
            alert(`Proceeding to Payment...\n\nAmount: ${total}`);
        }
    });

    // POPUP DRAWER OPEN/CLOSE LOGIC
    const cartModalOverlay = document.getElementById("cartModalOverlay");
    const closeCartBtn = document.getElementById("closeCartBtn");

    if (cartModalOverlay && cartModalOverlay.parentNode !== document.body) {
        document.body.appendChild(cartModalOverlay);
    }

    document.addEventListener("click", (e) => {
        if (e.target.closest(".js-open-cart")) {
            e.preventDefault(); 
            if(cartModalOverlay) {
                cartModalOverlay.classList.add("show-cart-modal");
                
                const itemsContainer = cartModalOverlay.querySelector('.cmp-cart__items');
                if (itemsContainer) {
                    itemsContainer.scrollTop = 0; 
                }
            }
        }
    });

    if (closeCartBtn) {
        closeCartBtn.addEventListener("click", () => {
            cartModalOverlay.classList.remove("show-cart-modal");
        });
    }

    if (cartModalOverlay) {
        cartModalOverlay.addEventListener("click", (e) => {
            if (e.target === cartModalOverlay) {
                cartModalOverlay.classList.remove("show-cart-modal");
            }
        });
    }
});