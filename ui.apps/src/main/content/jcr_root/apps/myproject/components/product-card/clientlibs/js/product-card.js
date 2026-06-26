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

    document.querySelectorAll(".cmp-product-listing").forEach(async (listingEl) => {
        const gridEl = listingEl.querySelector(".cmp-product-listing__grid");
        const paginationEl = listingEl.querySelector(".cmp-product-listing__pagination");
        
        let allProducts = [];
        let currentPage = 1;

        const url = `/graphql/execute.json/myproject/get-all-products`;

        // 🛠️ EXACT FIX: 100% WORKING SCROLL METHOD 🛠️
        const scrollToGridTop = () => {
            setTimeout(() => {
                // Ye native method hai jo internal scrolling containers me bhi chalega
                listingEl.style.scrollMarginTop = "100px"; // Header ko overlap hone se rokne ke liye gap
                listingEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 35); // 35ms delay taaki naye items render ho jayein
        };

        try {
            const response = await fetch(url);
            const data = await response.json();
            allProducts = data?.data?.productModelList?.items || [];

            if (allProducts.length === 0) {
                gridEl.innerHTML = `<p style="color:red; text-align:center; width:100%;">No products available.</p>`;
                return;
            }

            const renderGrid = () => {
                gridEl.innerHTML = ""; 
                
                const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
                const endIndex = startIndex + ITEMS_PER_PAGE;
                const paginatedProducts = allProducts.slice(startIndex, endIndex);

                const cartData = JSON.parse(localStorage.getItem(CART_STORAGE_KEY)) || [];

                paginatedProducts.forEach(product => {
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
                        const prod = allProducts.find(p => String(p.productid) === pid);
                        if(prod) updateCartQuantity(prod, 1);
                    });
                });
                gridEl.querySelectorAll(".js-card-decrease").forEach(btn => {
                    btn.addEventListener("click", (e) => {
                        const pid = e.target.getAttribute("data-id");
                        const prod = allProducts.find(p => String(p.productid) === pid);
                        if(prod) updateCartQuantity(prod, -1);
                    });
                });
            };

            const renderPagination = () => {
                const totalPages = Math.ceil(allProducts.length / ITEMS_PER_PAGE);
                
                if (totalPages <= 1) {
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
                        renderGrid(); 
                        renderPagination();
                        scrollToGridTop(); // Yahan Call
                    }
                });
                paginationEl.appendChild(prevBtn);

                // Page Number Buttons (1, 2, 3...)
                for (let i = 1; i <= totalPages; i++) {
                    const pageBtn = document.createElement("button");
                    pageBtn.className = `cmp-pagination-btn ${i === currentPage ? 'cmp-pagination-btn--active' : ''}`;
                    pageBtn.textContent = i;
                    pageBtn.addEventListener("click", () => {
                        currentPage = i;
                        renderGrid(); 
                        renderPagination();
                        scrollToGridTop(); // Yahan Call
                    });
                    paginationEl.appendChild(pageBtn);
                }

                // Next Button
                const nextBtn = document.createElement("button");
                nextBtn.className = "cmp-pagination-btn";
                nextBtn.textContent = "Next";
                nextBtn.disabled = currentPage === totalPages;
                nextBtn.addEventListener("click", () => {
                    if (currentPage < totalPages) {
                        currentPage++;
                        renderGrid(); 
                        renderPagination();
                        scrollToGridTop(); // Yahan Call
                    }
                });
                paginationEl.appendChild(nextBtn);
            };

            renderGrid();
            renderPagination();
            window.addEventListener("aemCartUpdated", renderGrid);

        } catch (error) {
            gridEl.innerHTML = `<p style="color:red; text-align:center; width:100%;">API Request Failed.</p>`;
            console.error("Fetch Error:", error);
        }
    });
});