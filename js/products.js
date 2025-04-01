// Products page JavaScript
document.addEventListener('DOMContentLoaded', function() {
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
            if (category === 'all' || item.getAttribute('data-product-type') === category) {
                item.style.display = '';
            } else {
                item.style.display = 'none';
            }
        });
    }
});