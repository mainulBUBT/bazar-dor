// Markets page specific JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const searchToggle = document.getElementById('search-toggle');
    const searchBar = document.getElementById('search-bar');
    const searchClose = document.getElementById('search-close');
    const marketSearch = document.getElementById('market-search');
    const marketsList = document.getElementById('markets-list');
    const noMarketsMessage = document.getElementById('no-markets-message');
    const paginationContainer = document.getElementById('pagination-container');
    const sortDropdown = document.querySelectorAll('.dropdown-item[data-sort]');
    const selectLocationBtn = document.getElementById('select-location-btn');
    const locationWarningModal = new bootstrap.Modal(document.getElementById('locationWarningModal'));
    const locationSearch = document.getElementById('location-search');
    const currentLocationBtn = document.getElementById('current-location-btn');
    const locationLoading = document.getElementById('location-loading');
    
    // Check for saved location on page load
    checkSavedLocation();
    
    // Listen for location updates
    window.addEventListener('locationUpdated', function(event) {
        const location = event.detail;
        updateMarketsBasedOnLocation(location);
    });
    
    // Listen for address selection from location.js
    document.addEventListener('addressSelected', function(event) {
        const location = event.detail;
        updateMarketsBasedOnLocation(location);
    });
    
    // Constants for pagination
    const itemsPerPage = 6; // Show 6 items per page (2 rows of 3 on desktop)
    const marketItems = marketsList.querySelectorAll('.col-12');
    const totalItems = marketItems.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    // Event Listeners
    searchToggle.addEventListener('click', () => {
        searchBar.style.display = 'flex';
        marketSearch.focus();
    });

    searchClose.addEventListener('click', () => {
        searchBar.style.display = 'none';
        marketSearch.value = '';
        filterMarkets('');
    });

    marketSearch.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        filterMarkets(searchTerm);
    });

    // Add click event listeners to all sort options
    sortDropdown.forEach(option => {
        option.addEventListener('click', (e) => {
            e.preventDefault();
            const sortBy = e.target.getAttribute('data-sort');
            sortMarkets(sortBy);
        });
    });

    // Select location button in modal
    if (selectLocationBtn) {
        selectLocationBtn.addEventListener('click', () => {
            // Focus on search input instead
            document.getElementById('location-search').focus();
        });
    }
    
    // Initialize pagination
    initDemoPagination();
    
    // Initialize demo pagination functionality
    function initDemoPagination() {
        // Don't show pagination if there's only one page
        if (totalPages <= 1) {
            paginationContainer.style.display = 'none';
            return;
        }
        
        // Create pagination controls with a simpler design
        createDemoPaginationControls(totalPages, paginationContainer);
        
        // Show first page by default
        showPage(1, marketItems, itemsPerPage);
        
        // Add event listeners to pagination buttons
        const pageButtons = paginationContainer.querySelectorAll('.page-link');
        pageButtons.forEach(button => {
            button.addEventListener('click', function(e) {
                e.preventDefault();
                
                // Handle prev/next buttons
                if (this.getAttribute('aria-label') === 'Previous') {
                    const activePage = parseInt(paginationContainer.querySelector('.active').getAttribute('data-page'));
                    if (activePage > 1) {
                        showPage(activePage - 1, marketItems, itemsPerPage);
                        updateActivePage(activePage - 1, paginationContainer);
                    }
                    return;
                }
                
                if (this.getAttribute('aria-label') === 'Next') {
                    const activePage = parseInt(paginationContainer.querySelector('.active').getAttribute('data-page'));
                    if (activePage < totalPages) {
                        showPage(activePage + 1, marketItems, itemsPerPage);
                        updateActivePage(activePage + 1, paginationContainer);
                    }
                    return;
                }
                
                // Handle numbered page buttons
                const pageNum = parseInt(this.parentElement.getAttribute('data-page'));
                showPage(pageNum, marketItems, itemsPerPage);
                updateActivePage(pageNum, paginationContainer);
            });
        });
    }

    // Filter markets based on search
    function filterMarkets(searchTerm) {
        const marketItems = marketsList.querySelectorAll('.col-12');
        let visibleCount = 0;
        
        marketItems.forEach(item => {
            const marketName = item.querySelector('.card-title').textContent.toLowerCase();
            const marketAddress = item.querySelector('.card-subtitle').textContent.toLowerCase();
            
            if (marketName.includes(searchTerm) || marketAddress.includes(searchTerm)) {
                item.classList.remove('d-none');
                visibleCount++;
            } else {
                item.classList.add('d-none');
            }
        });
        
        if (visibleCount === 0) {
            noMarketsMessage.style.display = 'block';
            paginationContainer.style.display = 'none';
        } else {
            noMarketsMessage.style.display = 'none';
            
            // Reinitialize pagination with filtered items
            const visibleItems = marketsList.querySelectorAll('.col-12:not(.d-none)');
            const filteredTotalPages = Math.ceil(visibleItems.length / itemsPerPage);
            
            if (filteredTotalPages <= 1) {
                paginationContainer.style.display = 'none';
            } else {
                paginationContainer.style.display = 'block';
                createDemoPaginationControls(filteredTotalPages, paginationContainer);
                showPage(1, visibleItems, itemsPerPage);
            }
        }
    }

    // Sort markets based on criteria
    function sortMarkets(sortBy) {
        const marketItems = Array.from(marketsList.querySelectorAll('.col-12'));
        
        marketItems.sort((a, b) => {
            switch(sortBy) {
                case 'distance':
                    const distanceA = parseFloat(a.querySelector('.badge.bg-primary-light').textContent.match(/\d+\.\d+/)[0]);
                    const distanceB = parseFloat(b.querySelector('.badge.bg-primary-light').textContent.match(/\d+\.\d+/)[0]);
                    return distanceA - distanceB;
                case 'name':
                    const nameA = a.querySelector('.card-title').textContent;
                    const nameB = b.querySelector('.card-title').textContent;
                    return nameA.localeCompare(nameB);
                case 'popularity':
                    const ratingA = parseFloat(a.querySelector('.badge.bg-warning-light').textContent.match(/\d+\.\d+/)[0]);
                    const ratingB = parseFloat(b.querySelector('.badge.bg-warning-light').textContent.match(/\d+\.\d+/)[0]);
                    return ratingB - ratingA;
                default:
                    return 0;
            }
        });
        
        // Reappend sorted items
        marketItems.forEach(item => {
            marketsList.appendChild(item);
        });
        
        // Reinitialize pagination with sorted items
        initDemoPagination();
    }

    // Handle market selection
    function selectMarket(market) {
        // Get the market ID from the clicked card
        const marketId = market.getAttribute('data-market-id');
        // Redirect to the products page with the market ID
        window.location.href = `products.html?marketId=${marketId}`;
    }
    
    // Add click event to all market cards
    document.querySelectorAll('.market-card').forEach(card => {
        card.addEventListener('click', function() {
            selectMarket(this);
        });
    });
    
    /**
     * Create demo pagination controls with a cleaner design
     * @param {number} totalPages - Total number of pages
     * @param {HTMLElement} container - Container for pagination controls
     */
    function createDemoPaginationControls(totalPages, container) {
        // Create a simpler pagination design
        let html = `
        <nav aria-label="Markets pagination">
            <ul class="pagination justify-content-center">
                <li class="page-item">
                    <a class="page-link rounded-pill" href="#" aria-label="Previous">
                        <span aria-hidden="true">&laquo;</span>
                    </a>
                </li>
        `;
        
        // Limit the number of page buttons to show (max 5)
        const maxVisiblePages = 5;
        const startPage = 1;
        const endPage = Math.min(totalPages, maxVisiblePages);
        
        for (let i = startPage; i <= endPage; i++) {
            const activeClass = i === 1 ? 'active' : '';
            html += `
                <li class="page-item ${activeClass}" data-page="${i}">
                    <a class="page-link rounded-pill" href="#">${i}</a>
                </li>
            `;
        }
        
        // Add ellipsis if there are more pages than we're showing
        if (totalPages > maxVisiblePages) {
            html += `
                <li class="page-item disabled">
                    <a class="page-link rounded-pill" href="#">...</a>
                </li>
                <li class="page-item" data-page="${totalPages}">
                    <a class="page-link rounded-pill" href="#">${totalPages}</a>
                </li>
            `;
        }
        
        html += `
                <li class="page-item">
                    <a class="page-link rounded-pill" href="#" aria-label="Next">
                        <span aria-hidden="true">&raquo;</span>
                    </a>
                </li>
            </ul>
        </nav>
        `;
        
        container.innerHTML = html;
    }

    /**
     * Show a specific page of items with a fade effect
     * @param {number} pageNum - Page number to show
     * @param {NodeList} items - All items to paginate
     * @param {number} itemsPerPage - Number of items per page
     */
    function showPage(pageNum, items, itemsPerPage) {
        const startIndex = (pageNum - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        
        // Hide all items first
        items.forEach((item, index) => {
            if (index >= startIndex && index < endIndex) {
                // Add a simple fade-in effect
                item.style.opacity = '0';
                item.style.display = 'block';
                setTimeout(() => {
                    item.style.transition = 'opacity 0.3s ease';
                    item.style.opacity = '1';
                }, 50);
            } else {
                item.style.display = 'none';
            }
        });
        
        // Scroll to top of market list with smooth scrolling
        marketsList.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    /**
     * Update the active page in pagination controls
     * @param {number} pageNum - Active page number
     * @param {HTMLElement} container - Pagination container
     */
    function updateActivePage(pageNum, container) {
        const pageItems = container.querySelectorAll('.page-item');
        pageItems.forEach(item => {
            if (item.getAttribute('data-page') == pageNum) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
        
        // If we have more than 5 pages, we need to update the pagination controls
        const totalPages = Math.ceil(marketsList.querySelectorAll('.col-12:not(.d-none)').length / itemsPerPage);
        if (totalPages > 5) {
            // Recreate pagination controls to center around current page
            createDemoPaginationControls(totalPages, container);
            // Re-select the active page
            const newPageItems = container.querySelectorAll('.page-item');
            newPageItems.forEach(item => {
                if (item.getAttribute('data-page') == pageNum) {
                    item.classList.add('active');
                }
            });
        }
    }
});


    // Check if user has a saved location
    function checkSavedLocation() {
        const savedLocation = localStorage.getItem('userLocation');
        if (savedLocation) {
            const location = JSON.parse(savedLocation);
            locationSearch.value = location.address;
            updateMarketsBasedOnLocation(location);
        } else {
            // Show location warning modal if no location is saved
            locationWarningModal.show();
        }
    }
    
    // Update markets based on location
    function updateMarketsBasedOnLocation(location) {
        // In a real app, you would fetch markets near this location
        // For demo, we'll just update the UI to show we have the location
        document.querySelector('h2.h4').textContent = `Markets Near ${location.address.split(',')[0]}`;
        
        // You could also update distances or filter markets based on location
        // This would typically involve an API call to get markets near the coordinates
        console.log(`Location updated: ${location.lat}, ${location.lng}`);
    }