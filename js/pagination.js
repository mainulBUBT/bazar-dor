/**
 * Bazar Dor - Pagination Functionality
 * Handles pagination for favorites and other list views
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize pagination if the container exists
    const paginationContainer = document.getElementById('pagination-container');
    if (paginationContainer) {
        initPagination();
    }
});

/**
 * Initialize pagination functionality
 */
function initPagination() {
    const itemsPerPage = 6; // Show 6 items per page (2 rows of 3 on desktop)
    const favoritesList = document.getElementById('favorites-list');
    const paginationContainer = document.getElementById('pagination-container');
    const favoriteItems = favoritesList.querySelectorAll('[data-favorite-type]');
    const totalItems = favoriteItems.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    
    // Don't show pagination if there's only one page
    if (totalPages <= 1) {
        paginationContainer.style.display = 'none';
        return;
    }
    
    // Create pagination controls
    createPaginationControls(totalPages, paginationContainer);
    
    // Show first page by default
    showPage(1, favoriteItems, itemsPerPage);
    
    // Add event listeners to pagination buttons
    const pageButtons = paginationContainer.querySelectorAll('.page-link');
    pageButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Handle prev/next buttons
            if (this.getAttribute('aria-label') === 'Previous') {
                const activePage = parseInt(paginationContainer.querySelector('.active').getAttribute('data-page'));
                if (activePage > 1) {
                    showPage(activePage - 1, favoriteItems, itemsPerPage);
                    updateActivePage(activePage - 1, paginationContainer);
                }
                return;
            }
            
            if (this.getAttribute('aria-label') === 'Next') {
                const activePage = parseInt(paginationContainer.querySelector('.active').getAttribute('data-page'));
                if (activePage < totalPages) {
                    showPage(activePage + 1, favoriteItems, itemsPerPage);
                    updateActivePage(activePage + 1, paginationContainer);
                }
                return;
            }
            
            // Handle numbered page buttons
            const pageNum = parseInt(this.parentElement.getAttribute('data-page'));
            showPage(pageNum, favoriteItems, itemsPerPage);
            updateActivePage(pageNum, paginationContainer);
        });
    });
}

/**
 * Create pagination controls
 * @param {number} totalPages - Total number of pages
 * @param {HTMLElement} container - Container for pagination controls
 */
function createPaginationControls(totalPages, container) {
    let html = `
    <nav aria-label="Favorites pagination">
        <ul class="pagination pagination-sm justify-content-center">
            <li class="page-item">
                <a class="page-link" href="#" aria-label="Previous">
                    <span aria-hidden="true">&laquo;</span>
                </a>
            </li>
    `;
    
    for (let i = 1; i <= totalPages; i++) {
        const activeClass = i === 1 ? 'active' : '';
        html += `
            <li class="page-item ${activeClass}" data-page="${i}">
                <a class="page-link" href="#">${i}</a>
            </li>
        `;
    }
    
    html += `
            <li class="page-item">
                <a class="page-link" href="#" aria-label="Next">
                    <span aria-hidden="true">&raquo;</span>
                </a>
            </li>
        </ul>
    </nav>
    `;
    
    container.innerHTML = html;
}

/**
 * Show a specific page of items
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
            item.style.display = 'block';
        } else {
            item.style.display = 'none';
        }
    });
    
    // Removed auto-scroll behavior to prevent unwanted scrolling
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
}