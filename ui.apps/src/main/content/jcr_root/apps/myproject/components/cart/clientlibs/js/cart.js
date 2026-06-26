document.addEventListener("DOMContentLoaded", () => {
    const CART_STORAGE_KEY = "aem_spa_cart";

    const renderAllCarts = () => {
        const cartData = JSON.parse(localStorage.getItem(CART_STORAGE_KEY)) || [];

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
                return;
            }

            cartData.forEach((item) => {
                const rawPrice = String(item.price).replace(/[^0-9.]/g, '');
                const safePrice = parseFloat(rawPrice) || 0;
                const itemTotal = safePrice * item.quantity;
                grandTotal += itemTotal;

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

    document.addEventListener("click", (e) => {
        if (e.target.dataset.action === "increase") updateCartQuantity(e.target.dataset.id, 1);
        if (e.target.dataset.action === "decrease") updateCartQuantity(e.target.dataset.id, -1);
        
        if (e.target.dataset.cartTarget === "checkout") {
            e.preventDefault();
            const total = document.querySelector('[data-cart-target="total"]')?.textContent;
            alert(`Proceeding to Payment...\n\nAmount: ${total}`);
        }
    });

    window.addEventListener("aemCartUpdated", renderAllCarts);
    renderAllCarts();

    // POPUP DRAWER OPEN/CLOSE LOGIC
    const cartModalOverlay = document.getElementById("cartModalOverlay");
    const closeCartBtn = document.getElementById("closeCartBtn");

    // Modal Overlay ko body ke aakhir mein move kar rahe hain taaki container bounds use block na karein
    if (cartModalOverlay && cartModalOverlay.parentNode !== document.body) {
        document.body.appendChild(cartModalOverlay);
    }

    document.addEventListener("click", (e) => {
        if (e.target.closest(".js-open-cart")) {
            e.preventDefault(); 
            if(cartModalOverlay) {
                cartModalOverlay.classList.add("show-cart-modal");
                
                // NAYA FIX: Jaise hi cart khulega, uske items wapas Top par aa jayenge
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