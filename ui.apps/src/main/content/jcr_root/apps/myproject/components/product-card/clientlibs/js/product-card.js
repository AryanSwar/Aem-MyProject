document.addEventListener("DOMContentLoaded", () => {
    const CART_STORAGE_KEY = "aem_spa_cart";
    const ITEMS_PER_PAGE = 16;  // 16 products per page

    const updateCartQuantity = (product, change) => {
        let cart = JSON.parse(localStorage.getItem(CART_STORAGE_KEY)) || [];
        const index = cart.findIndex(item => String(item.productid) === String(product.productid));
        
        if (index > -1) {
            cart[index].quantity += change;
            if (cart[index].quantity <= 0) cart.splice(index, 1);
        } else if (change > 0) {
            const rawPrice = String(product.price).replace(/[^0-9.]/g, '');
            const safePrice = parseFloat(rawPrice) || 0;
            cart.push({ ...product, price: safePrice, quantity: 1 });
        }
        
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
        window.dispatchEvent(new CustomEvent("aemCartUpdated")); 
    };

    document.querySelectorAll(".cmp-product-listing").forEach((listingEl) => {
        const gridEl = listingEl.querySelector(".cmp-product-listing__grid");
        const paginationEl = listingEl.querySelector(".cmp-product-listing__pagination");
        
        let currentProducts = []; 
        let currentPage = 1;
        let totalKnownPages = 1; // 🔥 NAYA TRACKER: Count API se calculate karke yahan store karenge

        const scrollToGridTop = () => {
            setTimeout(() => {
                listingEl.style.scrollMarginTop = "100px"; 
                listingEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 35); 
        };

        // 🔥 STEP 1: Pehle total count nikal ke pages decide karne wali API
        const initPaginationCount = async () => {
            const countUrl = `/graphql/execute.json/myproject/get-totalcount-products`;
            try {
                const res = await fetch(countUrl);
                const countData = await res.json();
                const allItems = countData?.data?.productModelList?.items || [];
                
                if (allItems.length > 0) {
                    // Total items ko 16 se divide karke round-up kar diya (e.g., 45/16 = 3 pages)
                    totalKnownPages = Math.ceil(allItems.length / ITEMS_PER_PAGE);
                }
            } catch (err) {
                console.error("Total Count fetch failed, falling back to basic pagination", err);
            }
        };

        const fetchProducts = async (page) => {
            gridEl.innerHTML = `<p style="text-align: center; width: 100%; padding: 40px; font-size: 1.2rem;">Loading Products...</p>`;
            paginationEl.style.display = "none";
            
            const offset = (page - 1) * ITEMS_PER_PAGE;
            const fetchUrl = `/graphql/execute.json/myproject/get-limit-products;limit=${ITEMS_PER_PAGE};offset=${offset};`;

            try {
                const response = await fetch(fetchUrl);
                const data = await response.json();

                if (data.errors && data.errors.length > 0) {
                    gridEl.innerHTML = `<p style="color:red; text-align:center; width:100%; padding:20px; border:1px solid red;">
                        <strong>GraphQL Error:</strong> ${data.errors[0].message}
                    </p>`;
                    return;
                }

                currentProducts = data?.data?.productModelList?.items || [];

                if (currentProducts.length === 0 && currentPage === 1) {
                    gridEl.innerHTML = `<p style="color:red; text-align:center; width:100%;">No products available.</p>`;
                    return;
                } else if (currentProducts.length === 0) {
                    gridEl.innerHTML = `<p style="color:red; text-align:center; width:100%;">No more products found.</p>`;
                    return;
                }

                renderGrid();
                renderPagination();

            } catch (error) {
                gridEl.innerHTML = `<p style="color:red; text-align:center; width:100%;">Fetch Error: Could not connect to AEM.</p>`;
                console.error("Fetch Error:", error);
            }
        };

        const renderGrid = () => {
            gridEl.innerHTML = ""; 
            
            const cartData = JSON.parse(localStorage.getItem(CART_STORAGE_KEY)) || [];

            currentProducts.forEach(product => {
                const imgPath = product.image?._path || "/content/dam/default.png";
                const descHtml = product.description?.html || "";
                const rawPrice = String(product.price).replace(/[^0-9.]/g, '');
                const safePrice = parseFloat(rawPrice) || 0;

                const cartItem = cartData.find(item => String(item.productid) === String(product.productid));
                
                let actionHTML = '';
                if (cartItem) {
                    actionHTML = `
                        <div class="cmp-product-card__qty-controls">
                            <button class="cmp-product-card__qty-btn js-card-decrease" data-id="${product.productid}">-</button>
                            <span class="cmp-product-card__qty-count">${cartItem.quantity}</span>
                            <button class="cmp-product-card__qty-btn js-card-increase" data-id="${product.productid}">+</button>
                        </div>
                    `;
                } else {
                    actionHTML = `<button class="cmp-product-card__btn js-add-to-cart" data-id="${product.productid}">Add to Cart</button>`;
                }

                const cardHtml = document.createElement("div");
                cardHtml.className = "cmp-product-card";
                cardHtml.innerHTML = `
                    <img class="cmp-product-card__img" src="${imgPath}" alt="${product.title}" />
                    <h3 class="cmp-product-card__title">${product.title}</h3>
                    <div class="cmp-product-card__desc">${descHtml}</div>
                    <div class="cmp-product-card__price">$${safePrice.toFixed(2)}</div>
                    <div class="cmp-product-card__action-area">
                        ${actionHTML}
                    </div>
                `;
                gridEl.appendChild(cardHtml);
            });

            gridEl.querySelectorAll(".js-add-to-cart, .js-card-increase").forEach(btn => {
                btn.addEventListener("click", (e) => {
                    const pid = e.target.getAttribute("data-id");
                    const prod = currentProducts.find(p => String(p.productid) === pid);
                    if(prod) updateCartQuantity(prod, 1);
                });
            });
            gridEl.querySelectorAll(".js-card-decrease").forEach(btn => {
                btn.addEventListener("click", (e) => {
                    const pid = e.target.getAttribute("data-id");
                    const prod = currentProducts.find(p => String(p.productid) === pid);
                    if(prod) updateCartQuantity(prod, -1);
                });
            });
        };

        const renderPagination = () => {
            // Agar total page 1 hi hai, toh pagination chupao
            if (totalKnownPages <= 1) {
                paginationEl.style.display = "none";
                return;
            }

            paginationEl.style.display = "flex";
            paginationEl.innerHTML = "";

            // Previous Button
            const prevBtn = document.createElement("button");
            prevBtn.className = "cmp-pagination-btn";
            prevBtn.textContent = "Previous";
            prevBtn.disabled = currentPage === 1; 
            prevBtn.addEventListener("click", () => {
                if (currentPage > 1) {
                    currentPage--;
                    fetchProducts(currentPage); 
                    scrollToGridTop(); 
                }
            });
            paginationEl.appendChild(prevBtn);

            // 🔥 AB YE HAMESHA TOTAL PAGES (e.g., 1 se 5 tak) DIKHAYEGA
            for (let i = 1; i <= totalKnownPages; i++) {
                const pageBtn = document.createElement("button");
                pageBtn.className = `cmp-pagination-btn ${i === currentPage ? 'cmp-pagination-btn--active' : ''}`;
                pageBtn.textContent = i;
                pageBtn.addEventListener("click", () => {
                    if (currentPage !== i) { // Same page pe dobara click karne se rokne ke liye
                        currentPage = i;
                        fetchProducts(currentPage); 
                        scrollToGridTop(); 
                    }
                });
                paginationEl.appendChild(pageBtn);
            }

            // Next Button
            const nextBtn = document.createElement("button");
            nextBtn.className = "cmp-pagination-btn";
            nextBtn.textContent = "Next";
            nextBtn.disabled = currentPage === totalKnownPages; // Last page pe aate hi Next disable ho jayega
            nextBtn.addEventListener("click", () => {
                if (currentPage < totalKnownPages) {
                    currentPage++;
                    fetchProducts(currentPage); 
                    scrollToGridTop(); 
                }
            });
            paginationEl.appendChild(nextBtn);
        };

        // 🔥 MASTER EXECUTION: Pehle count calculate hoga, fir Page 1 load hoga
        const startApp = async () => {
            await initPaginationCount();
            fetchProducts(currentPage);
        };

        startApp();
        
        window.addEventListener("aemCartUpdated", renderGrid);
    });
});