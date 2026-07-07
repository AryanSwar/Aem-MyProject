document.addEventListener("DOMContentLoaded", () => {
    const CART_STORAGE_KEY = "aem_spa_cart";
    const PRODUCT_CACHE_KEY = "aem_product_catalog_cache"; // 🌟 NEW: Product catalog cache

    const checkIsLoggedIn = () => localStorage.getItem("isUserLoggedIn") === "true";

    // 🌟 HELPER: Product ki saari info ko persistent cache me save karna
    const cacheProductDetails = (productObj) => {
        if (!productObj || !productObj.productid) return;
        let catalog = JSON.parse(localStorage.getItem(PRODUCT_CACHE_KEY)) || {};
        catalog[String(productObj.productid)] = {
            title: productObj.title || "Product Name",
            price: parseFloat(productObj.price) || 0.00,
            image: productObj.image || "https://dummyimage.com/70x70/f5f5f5/666666&text=No+Img"
        };
        localStorage.setItem(PRODUCT_CACHE_KEY, JSON.stringify(catalog));
    };

    // DB ko sirf ID aur Quantity bhejte hain
    const syncCartToDB = (cartData) => {
        if (!checkIsLoggedIn()) return;
        const mobile = localStorage.getItem("userMobile");
        
        const minimalCartData = cartData.map(item => ({
            productid: String(item.productid),
            quantity: item.quantity
        }));

        fetch('/libs/granite/csrf/token.json')
        .then(response => response.json())
        .then(tokenData => {
            fetch('/bin/userCart', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'CSRF-Token': tokenData.token
                },
                body: JSON.stringify({ mobile: mobile, cartData: minimalCartData })
            }).catch(err => console.error("Error saving cart to DB:", err));
        });
    };

    // 🌟 FIX: Minimal cart ko enrich karna (Pehle Cache -> Phir DOM -> Fallback)
    const enrichCartData = (minimalCart) => {
        const catalogCache = JSON.parse(localStorage.getItem(PRODUCT_CACHE_KEY)) || {};
        const existingCart = JSON.parse(localStorage.getItem(CART_STORAGE_KEY)) || [];

        return minimalCart.map(minimalItem => {
            const pid = String(minimalItem.productid);

            // 1. Pehle dekho kya humare Product Catalog Cache mein hai? (Best & Reliable)
            if (catalogCache[pid] && catalogCache[pid].price > 0) {
                return {
                    productid: pid,
                    quantity: minimalItem.quantity,
                    title: catalogCache[pid].title,
                    price: catalogCache[pid].price,
                    image: catalogCache[pid].image
                };
            }

            // 2. Dekho kya purane localStorage Cart mein saved hai?
            const cachedItem = existingCart.find(i => String(i.productid) === pid);
            if (cachedItem && cachedItem.title && cachedItem.price > 0) {
                cacheProductDetails(cachedItem); // Future ke liye cache karein
                return { ...cachedItem, quantity: minimalItem.quantity };
            }

            // 3. Current Page ke HTML (DOM) me dhoondhein (Agar product listing page open hai)
            const productCard = document.querySelector(`[data-product-id="${pid}"], [data-id="${pid}"]`);
            if (productCard) {
                const title = productCard.getAttribute("data-title") || productCard.querySelector('.cmp-product-card__title')?.textContent || `Product #${pid}`;
                const priceText = productCard.getAttribute("data-price") || productCard.querySelector('.cmp-product-card__price')?.textContent || "0";
                const price = parseFloat(String(priceText).replace(/[^0-9.]/g, '')) || 0.00;
                const image = productCard.getAttribute("data-image") || productCard.querySelector('img')?.src || "";

                const extractedInfo = { productid: pid, title, price, image };
                if (price > 0) cacheProductDetails(extractedInfo);

                return { ...extractedInfo, quantity: minimalItem.quantity };
            }

            // 4. Fallback (Agar kahin na mile abhi tak)
            return {
                productid: pid,
                quantity: minimalItem.quantity,
                title: "Product #" + pid,
                price: 0.00,
                image: "https://dummyimage.com/70x70/f5f5f5/666666&text=No+Img"
            };
        });
    };

    const fetchCartFromDB = () => {
        if (!checkIsLoggedIn()) return;
        const mobile = localStorage.getItem("userMobile");
        
        fetch(`/bin/userCart?mobile=${mobile}`)
        .then(res => res.json())
        .then(data => {
            if (data.status === "success" && data.cartData) {
                const enrichedCart = enrichCartData(data.cartData);
                localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(enrichedCart));
                renderAllCarts(); 
            }
        })
        .catch(err => console.error("Error fetching cart from DB:", err));
    };

    const renderAllCarts = () => {
        let cartData = JSON.parse(localStorage.getItem(CART_STORAGE_KEY)) || [];
        
        // Render karte waqt ek baar aur try karein kya DOM se price mil sakti hai agar 0.00 ho
        let needsUpdate = false;
        cartData = cartData.map(item => {
            if (item.price === 0 || item.title.startsWith("Product #")) {
                const enriched = enrichCartData([item])[0];
                if (enriched.price > 0) {
                    needsUpdate = true;
                    return enriched;
                }
            }
            return item;
        });

        if (needsUpdate) {
            localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartData));
        }

        let totalItemsCount = 0; 

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
                    const safePrice = parseFloat(item.price) || 0;
                    const itemTotal = safePrice * item.quantity;
                    grandTotal += itemTotal;
                    totalItemsCount += item.quantity; 

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

    // 🌟 FIX: Jab bhi koi Add to Cart par click kare, turant details cache kar lo
    document.addEventListener("click", (e) => {
        const addToCartBtn = e.target.closest(".js-add-to-cart");
        if (addToCartBtn) {
            if (!checkIsLoggedIn()) {
                e.preventDefault();
                e.stopPropagation(); 
                e.stopImmediatePropagation();
                window.dispatchEvent(new CustomEvent("openAuthModal")); 
                return false; 
            }

            // Product card se details cache me daal do taaki logout/login pe hamesha mil jaye
            const productCard = addToCartBtn.closest('.product-card, [data-product-id], [data-id]');
            if (productCard) {
                const productid = productCard.getAttribute("data-product-id") || productCard.getAttribute("data-id");
                const title = productCard.getAttribute("data-title") || productCard.querySelector('.cmp-product-card__title')?.textContent;
                const priceText = productCard.getAttribute("data-price") || productCard.querySelector('.cmp-product-card__price')?.textContent || "0";
                const price = parseFloat(String(priceText).replace(/[^0-9.]/g, '')) || 0.00;
                const image = productCard.getAttribute("data-image") || productCard.querySelector('img')?.src;

                cacheProductDetails({ productid, title, price, image });
            }
        }
    }, true); 

    // 🌟 FIX: Jab Product Listing page par AJAX se products load ho jayein, to cart auto-refresh kar do
    const observeProductListing = () => {
        const grid = document.querySelector('.cmp-product-listing__grid');
        if (!grid) return;

        const observer = new MutationObserver(() => {
            // Check agar real products aa gaye hain
            if (grid.querySelector('.js-add-to-cart')) {
                // Page ke saare products cache kar lo
                grid.querySelectorAll('.product-card, [data-product-id], [data-id]').forEach(card => {
                    const productid = card.getAttribute("data-product-id") || card.getAttribute("data-id");
                    const title = card.getAttribute("data-title") || card.querySelector('.cmp-product-card__title')?.textContent;
                    const priceText = card.getAttribute("data-price") || card.querySelector('.cmp-product-card__price')?.textContent || "0";
                    const price = parseFloat(String(priceText).replace(/[^0-9.]/g, '')) || 0.00;
                    const image = card.getAttribute("data-image") || card.querySelector('img')?.src;
                    cacheProductDetails({ productid, title, price, image });
                });

                renderAllCarts(); // Cart UI ko update karo taaki $0.00 sahi price ban jaye
            }
        });

        observer.observe(grid, { childList: true, subtree: true });
    };

    observeProductListing();

    if (checkIsLoggedIn()) {
        fetchCartFromDB();
    } else {
        renderAllCarts();
    }

    document.addEventListener("click", (e) => {
        if (e.target.dataset.action === "increase") updateCartQuantity(e.target.dataset.id, 1);
        if (e.target.dataset.action === "decrease") updateCartQuantity(e.target.dataset.id, -1);
        
        if (e.target.dataset.cartTarget === "checkout") {
            e.preventDefault();
            const total = document.querySelector('[data-cart-target="total"]')?.textContent;
            alert(`Proceeding to Payment...\n\nAmount: ${total}`);
        }
    });

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
                if (itemsContainer) itemsContainer.scrollTop = 0; 
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

    // =====================================================================
    // 🌟 SMART UPDATED CODE: Auto-Detect GraphQL JSON Structure
    // =====================================================================
    const resolveMissingProductsViaGraphQL = async () => {
        let cartData = JSON.parse(localStorage.getItem(CART_STORAGE_KEY)) || [];
        let needsReRender = false;

        for (let i = 0; i < cartData.length; i++) {
            let item = cartData[i];
            
            if (item.price === 0 || String(item.title).startsWith("Product #")) {
                try {
                    const endpoint = `/graphql/execute.json/myproject/get-productById;productId=${item.productid}`;
                    const response = await fetch(endpoint);
                    const json = await response.json();
                    
                    console.log(`[GraphQL Auto-Detect] Full Response for ID ${item.productid}:`, json);

                    let productData = null;

                    // 🧠 SMART LOGIC: Automatically dhoondho ki data kahan chhipa hai
                    if (json && json.data) {
                        const queryName = Object.keys(json.data)[0]; // Ye automatically pehla key nikal lega (e.g., productList)
                        if (queryName) {
                            const queryResult = json.data[queryName];
                            
                            if (queryResult.items && queryResult.items.length > 0) {
                                productData = queryResult.items[0]; // Array format ke liye
                            } else if (queryResult.item) {
                                productData = queryResult.item; // Single item format ke liye
                            } else {
                                productData = queryResult; // Direct object ke liye
                            }
                        }
                    }
                    
                    if (productData) {
                        console.log(`[GraphQL Auto-Detect] Successfully Extracted Data:`, productData);

                        // ⚠️ IMPORTANT: Yahan check karein ki aapke AEM model mein fields ka kya naam hai
                        // Agar aapne AEM mein 'productTitle' banaya hai, toh 'productData.title' ki jagah 'productData.productTitle' likhein
                        const fetchedTitle = productData.title || productData.name || productData.productName || `Product #${item.productid}`;
                        const fetchedPrice = parseFloat(productData.price || productData.productPrice) || 0.00;
                        
                        // Image ka path handle karna (AEM usually image._path mein URL deta hai)
                        let fetchedImage = "https://dummyimage.com/70x70/f5f5f5/666666&text=No+Img";
                        if (productData.image && productData.image._path) {
                            fetchedImage = productData.image._path;
                        } else if (productData.productImage && productData.productImage._path) {
                            fetchedImage = productData.productImage._path;
                        } else if (typeof productData.image === 'string') {
                            fetchedImage = productData.image;
                        }

                        // Cart item ko update karein
                        cartData[i].title = fetchedTitle;
                        cartData[i].price = fetchedPrice;
                        cartData[i].image = fetchedImage;

                        // Cache mein save karein
                        cacheProductDetails({
                            productid: item.productid,
                            title: fetchedTitle,
                            price: fetchedPrice,
                            image: fetchedImage
                        });

                        needsReRender = true;
                    } else {
                        console.error(`[GraphQL Error] Data nahi mila for ID ${item.productid}. JSON structure ajeeb hai.`);
                    }
                } catch (error) {
                    console.error(`[GraphQL Error] API call fail ho gayi for ID ${item.productid}:`, error);
                }
            }
        }

        // UI ko turant refresh karo
        if (needsReRender) {
            localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartData));
            renderAllCarts(); 
        }
    };

    // Original code badle bina, fetchCartFromDB ke chalne ke theek 1 second baad is function ko run karenge
    window.addEventListener("authStatusChanged", () => {
        if (checkIsLoggedIn()) {
            setTimeout(resolveMissingProductsViaGraphQL, 1000); 
        }
    });

    // Page load hone par ek baar check karein ki koi product dummy state mein toh nahi fasa.
    setTimeout(resolveMissingProductsViaGraphQL, 1000);
    // =====================================================================
});