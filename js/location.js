// DOM Elements
const locationSearch = document.getElementById('location-search');
const currentLocationBtn = document.getElementById('current-location-btn');
const locationLoading = document.getElementById('location-loading');

// Initialize Leaflet Geosearch Provider
const provider = new GeoSearch.OpenStreetMapProvider({
    params: {
        // Set appropriate parameters to avoid overusing the API
        'accept-language': 'en',
        countrycodes: '',
        addressdetails: 1, 
        limit: 5
    }
});

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Add event listeners once DOM is fully loaded
    if (currentLocationBtn) {
        currentLocationBtn.addEventListener('click', getCurrentLocation);
    }
    
    if (locationSearch) {
        // Ensure the parent has relative positioning for dropdown
        let parent = locationSearch.parentNode;
        if (parent && parent.style.position !== 'relative') {
            parent.style.position = 'relative';
        }
        
        locationSearch.addEventListener('input', debounce(handleLocationSearch, 500));
        
        // Clear dropdown on blur, but delay to allow click events
        locationSearch.addEventListener('blur', function() {
            setTimeout(() => {
                const dropdown = document.getElementById('address-dropdown');
                if (dropdown) dropdown.remove();
            }, 200);
        });
    }
    
    // Check if there's a stored location and display it
    const storedLocation = localStorage.getItem('userLocation');
    if (storedLocation && locationSearch) {
        try {
            const location = JSON.parse(storedLocation);
            if (location.address) {
                locationSearch.value = location.address;
            }
        } catch (e) {
            console.error('Error parsing stored location', e);
        }
    }
});

// Get current location using browser's Geolocation API
function getCurrentLocation() {
    if (!navigator.geolocation) {
        showError('Geolocation is not supported by your browser');
        return;
    }

    showLoading(true);
    navigator.geolocation.getCurrentPosition(
        position => {
            const { latitude, longitude } = position.coords;
            console.log('Got coordinates:', latitude, longitude);
            reverseGeocode(latitude, longitude);
        },
        error => {
            showLoading(false);
            handleGeolocationError(error);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
}

// Create and update address dropdown with map icons
function createAddressDropdown(addresses) {
    if (!locationSearch) return;
    
    // Remove existing dropdown if any
    const existingDropdown = document.getElementById('address-dropdown');
    if (existingDropdown) {
        existingDropdown.remove();
    }

    const dropdownContainer = document.createElement('div');
    dropdownContainer.id = 'address-dropdown';
    dropdownContainer.className = 'address-dropdown bg-white rounded shadow-sm position-absolute w-100 mt-1';
    
    // Ensure parent has relative positioning
    const parent = locationSearch.parentNode;
    parent.style.position = 'relative';
    
    // Append dropdown directly to the parent
    parent.appendChild(dropdownContainer);

    // Add current location option
    const currentLocationItem = document.createElement('div');
    currentLocationItem.className = 'p-2 hover-bg-light cursor-pointer location-dropdown-item d-flex align-items-center current-location-item';
    
    const iconSpan = document.createElement('span');
    iconSpan.className = 'location-icon me-2 d-flex align-items-center justify-content-center';
    const icon = document.createElement('i');
    icon.className = 'bi bi-crosshair text-primary';
    iconSpan.appendChild(icon);
    
    const textSpan = document.createElement('span');
    textSpan.className = 'location-text fw-bold';
    textSpan.textContent = 'Use Current Location';
    
    currentLocationItem.appendChild(iconSpan);
    currentLocationItem.appendChild(textSpan);
    currentLocationItem.addEventListener('click', getCurrentLocation);
    dropdownContainer.appendChild(currentLocationItem);
    
    // Add address items
    addresses.forEach((address) => {
        const item = document.createElement('div');
        item.className = 'p-2 hover-bg-light cursor-pointer location-dropdown-item d-flex align-items-center';
        
        // Add map icon
        const iconSpan = document.createElement('span');
        iconSpan.className = 'location-icon me-2 d-flex align-items-center justify-content-center';
        const icon = document.createElement('i');
        icon.className = 'bi bi-geo-alt-fill text-primary';
        iconSpan.appendChild(icon);
        
        // Add text
        const textSpan = document.createElement('span');
        textSpan.className = 'location-text';
        textSpan.textContent = address.label;
        
        item.appendChild(iconSpan);
        item.appendChild(textSpan);
        
        item.addEventListener('click', () => selectAddress(address));
        dropdownContainer.appendChild(item);
    });

    // Add highlight to first regular item (after current location)
    if (addresses.length > 0 && dropdownContainer.children.length > 1) {
        const firstItem = dropdownContainer.children[1];
        if (firstItem) {
            firstItem.classList.add('active');
        }
    }
}

// Handle address selection
function selectAddress(address) {
    locationSearch.value = address.label;
    locationSearch.blur(); // Remove focus from input
    
    const location = {
        lat: address.y,
        lng: address.x,
        address: address.label
    };
    
    storeLocation(location);
    
    // Dispatch a custom event for address selection
    const event = new CustomEvent('addressSelected', {
        detail: location
    });
    document.dispatchEvent(event);

    // Remove dropdown after selection
    const dropdown = document.getElementById('address-dropdown');
    if (dropdown) {
        dropdown.remove();
    }
}

// Handle location search using Leaflet Geosearch
async function handleLocationSearch() {
    const searchTerm = locationSearch.value.trim();
    if (searchTerm.length < 3) {
        const dropdown = document.getElementById('address-dropdown');
        if (dropdown) dropdown.remove();
        return;
    }

    showLoading(true);
    try {
        console.log("Searching for location:", searchTerm);
        // Use the leaflet-geosearch provider to search for addresses
        const results = await provider.search({ query: searchTerm });
        console.log("Search results:", results);
        
        if (results && results.length > 0) {
            createAddressDropdown(results);
            console.log("Dropdown created with", results.length, "results");
        } else {
            console.log("No results found for:", searchTerm);
        }
    } catch (error) {
        showError('Error searching location');
        console.error('Location search error:', error);
    } finally {
        showLoading(false);
    }
}

// Add styles to the document
const style = document.createElement('style');
style.textContent = `
    .address-dropdown {
        max-height: 200px;
        overflow-y: auto;
        z-index: 1000;
        display: block;
        background: white;
        border: 1px solid #ddd;
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        z-index: 1050;
        border-radius: 8px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.1);
    }
    .hover-bg-light:hover {
        background-color: #f8f9fa;
    }
    .cursor-pointer {
        cursor: pointer;
    }
    .location-dropdown-item {
        border-bottom: 1px solid rgba(0,0,0,0.05);
        transition: all 0.2s ease;
    }
    .location-dropdown-item:last-child {
        border-bottom: none;
    }
    .location-dropdown-item:hover {
        background-color: rgba(var(--primary-rgb), 0.05) !important;
    }
    .location-dropdown-item.active {
        background-color: rgba(var(--primary-rgb), 0.05);
    }
    .location-icon {
        width: 24px;
        height: 24px;
        min-width: 24px;
        border-radius: 50%;
        background-color: rgba(var(--primary-rgb), 0.1);
    }
    .location-icon i {
        font-size: 14px;
    }
    .location-text {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .current-location-item {
        background-color: #f8f9fa;
    }
`;
document.head.appendChild(style);

// Reverse geocode coordinates to address using Leaflet
async function reverseGeocode(lat, lng) {
    try {
        console.log('Reverse geocoding for:', lat, lng);
        
        // Use Leaflet's built-in reverse geocoding through a provider
        const results = await provider.search({ query: { lat, lon: lng } });
        console.log('Reverse geocode results:', results);
        
        if (results && results.length > 0) {
            const address = results[0];
            console.log('Found address:', address);
            
            locationSearch.value = address.label;
            
            storeLocation({
                lat,
                lng,
                address: address.label
            });
        } else {
            console.log('No address found, using coordinates');
            
            // If no results, just store the coordinates
            locationSearch.value = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
            storeLocation({
                lat,
                lng,
                address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`
            });
        }
    } catch (error) {
        console.error('Reverse geocoding failed:', error);
        showError('Error getting address');
    } finally {
        showLoading(false);
    }
}

// Store location in localStorage
function storeLocation(location) {
    localStorage.setItem('userLocation', JSON.stringify(location));
    // Dispatch a custom event that other parts of the app can listen to
    window.dispatchEvent(new CustomEvent('locationUpdated', { detail: location }));
}

// Helper function to show/hide loading spinner
function showLoading(show) {
    locationLoading.style.display = show ? 'block' : 'none';
}

// Handle geolocation errors
function handleGeolocationError(error) {
    console.error('Geolocation error:', error);
    
    switch(error.code) {
        case error.PERMISSION_DENIED:
            showError('Location permission denied');
            break;
        case error.POSITION_UNAVAILABLE:
            showError('Location information unavailable');
            break;
        case error.TIMEOUT:
            showError('Location request timed out');
            break;
        default:
            showError('An unknown error occurred');
    }
}

// Show error message
function showError(message) {
    const toastContainer = document.createElement('div');
    toastContainer.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 1050;';
    
    const toast = document.createElement('div');
    toast.className = 'bg-danger text-white p-3 rounded shadow-sm';
    toast.textContent = message;
    
    toastContainer.appendChild(toast);
    document.body.appendChild(toastContainer);
    
    setTimeout(() => {
        toastContainer.remove();
    }, 3000);
}

// Debounce helper function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}