// Products page JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Initialize update price modal functionality
    initUpdatePriceModal();
    // DOM Elements
    const searchToggle = document.getElementById('search-toggle');
    const searchBar = document.getElementById('search-bar');
    const searchClose = document.getElementById('search-close');
    const productsSearch = document.getElementById('products-search');
    const productsList = document.getElementById('products-list');
    const marketTitle = document.querySelector('header h5');
    
    // Get market ID from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const marketId = urlParams.get('marketId');
    
    // Event Listeners
    if (searchToggle) {
        searchToggle.addEventListener('click', () => {
            searchBar.style.display = 'flex';
            productsSearch.focus();
        });
    }
    
    if (searchClose) {
        searchClose.addEventListener('click', () => {
            searchBar.style.display = 'none';
            productsSearch.value = '';
            filterProducts('');
        });
    }
    
    if (productsSearch) {
        productsSearch.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            filterProducts(searchTerm);
        });
    }
    
    // Filter category buttons
    const filterButtons = document.querySelectorAll('.filter-pills button[data-filter]');
    if (filterButtons.length > 0) {
        filterButtons.forEach(button => {
            button.addEventListener('click', function() {
                // Remove active class from all buttons
                filterButtons.forEach(btn => btn.classList.remove('active'));
                // Add active class to clicked button
                this.classList.add('active');
                
                const filterValue = this.getAttribute('data-filter');
                filterProductsByCategory(filterValue);
            });
        });
    }
    
    // Load market data if marketId is present
    if (marketId) {
        loadMarketData(marketId);
    }
    
    /**
     * Load market data based on market ID
     * @param {string} marketId - The ID of the selected market
     */
    function loadMarketData(marketId) {
        // In a real application, this would fetch data from an API
        // For demo purposes, we'll use static data
        
        // Example market data (would come from API in real app)
        const markets = {
            '1': { name: 'Mirpur 11 Kacha Bazar', location: 'Mirpur 11, Block C' },
            '2': { name: 'Mirpur 10 Bazar', location: 'Mirpur 10 Circle' },
            '3': { name: 'Dhanmondi 15 Market', location: 'Road 15, Dhanmondi' },
            '4': { name: 'Rayer Bazar', location: 'Dhanmondi' },
            '5': { name: 'Gulshan DCC Market', location: 'Gulshan 1' },
            '6': { name: 'Gulshan 2 Market', location: 'Gulshan 2' }
        };
        
        // Update page title with market name
        const market = markets[marketId];
        if (market && marketTitle) {
            marketTitle.textContent = market.name;
            document.title = `${market.name} - Products | Bazar Dor`;
        }
        
        // In a real app, you would load products specific to this market
        // For now, we'll just use the existing products on the page
    }
    
    /**
     * Filter products based on search term
     * @param {string} searchTerm - The search term to filter by
     */
    function filterProducts(searchTerm) {
        const productItems = productsList.querySelectorAll('.col-12');
        
        productItems.forEach(item => {
            const productName = item.querySelector('.card-title').textContent.toLowerCase();
            const productCategory = item.querySelector('.card-subtitle').textContent.toLowerCase();
            
            if (productName.includes(searchTerm) || productCategory.includes(searchTerm)) {
                item.style.display = '';
            } else {
                item.style.display = 'none';
            }
        });
    }
    
    /**
     * Filter products by category
     * @param {string} category - The category to filter by
     */
    function filterProductsByCategory(category) {
        const productItems = productsList.querySelectorAll('.col-12');
        
        productItems.forEach(item => {
            if (category === 'all') {
                item.style.display = '';
            } else {
                const productType = item.getAttribute('data-product-type');
                if (productType === category) {
                    item.style.display = '';
                } else {
                    item.style.display = 'none';
                }
            }
        });
    }
    
    /**
     * Initialize the update price modal functionality
     */
    function initUpdatePriceModal() {
        const updatePriceButtons = document.querySelectorAll('.update-price-btn');
        const updatePriceModal = document.getElementById('updatePriceModal');
        const productIdInput = document.getElementById('productId');
        const productNameInput = document.getElementById('productName');
        const currentPriceInput = document.getElementById('currentPrice');
        const newPriceInput = document.getElementById('newPrice');
        const submitPriceUpdateBtn = document.getElementById('submitPriceUpdate');
        
        // Add event listeners to all update price buttons
        updatePriceButtons.forEach(button => {
            button.addEventListener('click', function() {
                const productId = this.getAttribute('data-product-id');
                const productName = this.getAttribute('data-product-name');
                const productPrice = this.getAttribute('data-product-price');
                
                // Populate the modal with product data
                productIdInput.value = productId;
                productNameInput.value = productName;
                currentPriceInput.value = productPrice;
                newPriceInput.value = productPrice; // Default to current price
                
                // Focus on the new price input
                setTimeout(() => {
                    newPriceInput.focus();
                    newPriceInput.select();
                }, 500);
            });
        });
        
        // Handle form submission
        submitPriceUpdateBtn.addEventListener('click', function() {
            const productId = productIdInput.value;
            const newPrice = newPriceInput.value;
            
            // Validate form
            if (!newPrice || isNaN(newPrice) || newPrice <= 0) {
                alert('Please enter a valid price');
                return;
            }
            
            // In a real app, this would send data to a server
            // For demo purposes, we'll just update the UI
            updateProductPrice(productId, newPrice);
            
            // Close the modal
            const modalInstance = bootstrap.Modal.getInstance(updatePriceModal);
            modalInstance.hide();
            
            // Show success message
            showToast('Price updated successfully!');
        });
    }
    
    /**
     * Update the product price in the UI
     * @param {string} productId - The ID of the product to update
     * @param {string} newPrice - The new price value
     */
    function updateProductPrice(productId, newPrice) {
        const productCard = document.querySelector(`.product-card[data-product-id="${productId}"]`);
        if (productCard) {
            const priceElement = productCard.querySelector('.text-primary');
            const timeUpdateElement = productCard.querySelector('.time-update');
            
            // Update price display
            priceElement.textContent = `৳${newPrice}`;
            
            // Update time display
            timeUpdateElement.innerHTML = '<span class="update-icon">🔄</span>Updated just now';
            
            // Add a visual indicator that the price was updated
            productCard.classList.add('border-primary');
            setTimeout(() => {
                productCard.classList.remove('border-primary');
            }, 3000);
        }
    }
    
    /**
     * Show a toast notification
     * @param {string} message - The message to display
     */
    function showToast(message) {
        // Create toast element
        const toastContainer = document.createElement('div');
        toastContainer.className = 'position-fixed bottom-0 end-0 p-3';
        toastContainer.style.zIndex = '5';
        
        const toastElement = document.createElement('div');
        toastElement.className = 'toast align-items-center text-white bg-primary border-0';
        toastElement.setAttribute('role', 'alert');
        toastElement.setAttribute('aria-live', 'assertive');
        toastElement.setAttribute('aria-atomic', 'true');
        
        toastElement.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">
                    <i class="bi bi-check-circle-fill me-2"></i>${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        `;
        
        toastContainer.appendChild(toastElement);
        document.body.appendChild(toastContainer);
        
        // Initialize and show the toast
        const toast = new bootstrap.Toast(toastElement, { delay: 3000 });
        toast.show();
        
        // Remove the toast element after it's hidden
        toastElement.addEventListener('hidden.bs.toast', function() {
            document.body.removeChild(toastContainer);
        });
    }
});