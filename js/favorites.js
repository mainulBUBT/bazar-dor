/**
 * Bazar Dor - Favorites Management
 * Handles saving, loading, and managing user favorites
 */

// Initialize favorites from localStorage
let favorites = {
    markets: [],
    items: []
};

// Load favorites on page load
document.addEventListener('DOMContentLoaded', function() {
    loadFavorites();
});

/**
 * Load favorites from localStorage
 */
function loadFavorites() {
    const savedFavorites = localStorage.getItem('bazarDorFavorites');
    if (savedFavorites) {
        favorites = JSON.parse(savedFavorites);
    }
}

/**
 * Save favorites to localStorage
 */
function saveFavorites() {
    localStorage.setItem('bazarDorFavorites', JSON.stringify(favorites));
}

/**
 * Add an item to favorites
 * @param {string} type - 'market' or 'item'
 * @param {object} data - The data to save
 */
function addToFavorites(type, data) {
    if (type === 'market') {
        // Check if market already exists in favorites
        const exists = favorites.markets.some(market => market.id === data.id);
        if (!exists) {
            favorites.markets.push(data);
            saveFavorites();
            return true;
        }
    } else if (type === 'item') {
        // Check if item already exists in favorites
        const exists = favorites.items.some(item => item.id === data.id);
        if (!exists) {
            favorites.items.push(data);
            saveFavorites();
            return true;
        }
    }
    return false;
}

/**
 * Remove an item from favorites
 * @param {string} type - 'market' or 'item'
 * @param {string} id - The ID of the item to remove
 */
function removeFromFavorites(type, id) {
    if (type === 'market') {
        favorites.markets = favorites.markets.filter(market => market.id !== id);
    } else if (type === 'item') {
        favorites.items = favorites.items.filter(item => item.id !== id);
    }
    saveFavorites();
}

/**
 * Check if an item is in favorites
 * @param {string} type - 'market' or 'item'
 * @param {string} id - The ID to check
 * @returns {boolean} - True if the item is in favorites
 */
function isInFavorites(type, id) {
    if (type === 'market') {
        return favorites.markets.some(market => market.id === id);
    } else if (type === 'item') {
        return favorites.items.some(item => item.id === id);
    }
    return false;
}

/**
 * Toggle favorite status for an item
 * @param {string} type - 'market' or 'item'
 * @param {string} id - The ID of the item
 * @param {object} data - The data to save if adding
 * @returns {boolean} - The new favorite status
 */
function toggleFavorite(type, id, data) {
    if (isInFavorites(type, id)) {
        removeFromFavorites(type, id);
        return false;
    } else {
        addToFavorites(type, data);
        return true;
    }
}