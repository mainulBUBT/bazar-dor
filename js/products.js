// Products page JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Initialize Bootstrap tooltips
    initTooltips();
    
    // Initialize filter chips functionality
    initFilterChips();
    
    // Initialize search functionality
    initSearch();
    
    // Initialize favorite buttons
    initFavoriteButtons();
    
    // Initialize pagination
    initPagination();
    
    /**
     * Initialize Bootstrap tooltips
     */
    function initTooltips() {
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.forEach(function(tooltipTriggerEl) {
            new bootstrap.Tooltip(tooltipTriggerEl);
        });
    }
    
    /**
     * Initialize filter chips functionality
     */
    function initFilterChips() {
        const filterChips = document.querySelectorAll('.filter-chip');
        filterChips.forEach(chip => {
            chip.addEventListener('click', function() {
                const filter = this.getAttribute('data-filter');
                const productCards = document.querySelectorAll('[data-product-type]');
                
                // Remove active class from all chips
                filterChips.forEach(c => c.classList.remove('active'));
                
                // Add active class to clicked chip
                this.classList.add('active');
                
                // Filter product cards
                productCards.forEach(card => {
                    if (filter === 'all' || card.getAttribute('data-product-type') === filter) {
                        card.closest('.col-6').style.display = '';
                    } else {
                        card.closest('.col-6').style.display = 'none';
                    }
                });
            });
        });
    }
    
    /**
     * Initialize search functionality
     */
    function initSearch() {
        const searchBar = document.getElementById('search-bar');
        const searchClose = document.getElementById('search-close');
        const productsSearch = document.getElementById('products-search');
        
        if (searchClose && productsSearch) {
            searchClose.addEventListener('click', function() {
                productsSearch.value = '';
                const productItems = document.querySelectorAll('#products-list .col-6');
                productItems.forEach(item => {
                    item.style.display = '';
                });
            });
        }
        
        if (productsSearch) {
            productsSearch.addEventListener('input', function(e) {
                const searchTerm = e.target.value.toLowerCase();
                const productItems = document.querySelectorAll('#products-list .col-6');
                
                productItems.forEach(item => {
                    const productName = item.querySelector('.card-title').textContent.toLowerCase();
                    const productCategory = item.querySelector('.card-subtitle').textContent.toLowerCase();
                    
                    if (productName.includes(searchTerm) || productCategory.includes(searchTerm)) {
                        item.style.display = '';
                    } else {
                        item.style.display = 'none';
                    }
                });
            });
        }
    }
    
    /**
     * Initialize favorite buttons functionality
     */
    function initFavoriteButtons() {
        document.querySelectorAll('.favorite-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation(); // Prevent card click
                const icon = this.querySelector('i');
                
                if (icon.classList.contains('bi-heart')) {
                    icon.classList.remove('bi-heart');
                    icon.classList.add('bi-heart-fill');
                    icon.classList.remove('text-muted');
                    icon.classList.add('text-danger');
                } else {
                    icon.classList.remove('bi-heart-fill');
                    icon.classList.add('bi-heart');
                    icon.classList.remove('text-danger');
                    icon.classList.add('text-muted');
                }
            });
        });
    }
    
    /**
     * Initialize mobile pagination functionality
     */
    function initPagination() {
        const prevPageBtn = document.getElementById('prev-page');
        const nextPageBtn = document.getElementById('next-page');
        const currentPageSpan = document.getElementById('current-page');
        const totalPagesSpan = document.getElementById('total-pages');
        const paginationLinks = document.querySelectorAll('.pagination .page-link');
        
        if (!prevPageBtn || !nextPageBtn || !currentPageSpan || !totalPagesSpan) return;
        
        // Initialize pagination state
        let currentPage = 1;
        const totalPages = parseInt(totalPagesSpan.textContent) || 5;
        
        // Update pagination UI based on current state
        function updatePaginationUI() {
            currentPageSpan.textContent = currentPage;
            prevPageBtn.disabled = currentPage === 1;
            nextPageBtn.disabled = currentPage === totalPages;
            
            if (paginationLinks.length) {
                paginationLinks.forEach(link => {
                    const pageNum = parseInt(link.textContent);
                    if (pageNum === currentPage) {
                        link.classList.add('active');
                    } else {
                        link.classList.remove('active');
                    }
                });
            }
        }
        
        // Add event listeners to pagination buttons
        prevPageBtn.addEventListener('click', function() {
            if (currentPage > 1) {
                currentPage--;
                updatePaginationUI();
                
                // Scroll to top of products list
                document.getElementById('products-list').scrollIntoView({ behavior: 'smooth' });
            }
        });
        
        nextPageBtn.addEventListener('click', function() {
            if (currentPage < totalPages) {
                currentPage++;
                updatePaginationUI();
                
                // Scroll to top of products list
                document.getElementById('products-list').scrollIntoView({ behavior: 'smooth' });
            }
        });
        
        // Add event listeners to desktop pagination links
        if (paginationLinks.length) {
            paginationLinks.forEach(link => {
                link.addEventListener('click', function(e) {
                    e.preventDefault();
                    const pageNum = parseInt(this.textContent);
                    if (!isNaN(pageNum)) {
                        currentPage = pageNum;
                        updatePaginationUI();
                        
                        // Scroll to top of products list
                        document.getElementById('products-list').scrollIntoView({ behavior: 'smooth' });
                    }
                });
            });
        }
        
        // Initialize pagination UI
        updatePaginationUI();
    }
}); 