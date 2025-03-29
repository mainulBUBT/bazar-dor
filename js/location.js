// DOM Elements
const locationSearch = document.getElementById('location-search');
const currentLocationBtn = document.getElementById('current-location-btn');
const locationLoading = document.getElementById('location-loading');

// Constants
const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    currentLocationBtn.addEventListener('click', getCurrentLocation);
    locationSearch.addEventListener('input', debounce(handleLocationSearch, 500));
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
            reverseGeocode(latitude, longitude);
        },
        error => {
            showLoading(false);
            handleGeolocationError(error);
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
}

// Handle location search input
// Create and update address dropdown
function createAddressDropdown(addresses) {
    // Remove existing dropdown if any
    const existingDropdown = document.getElementById('address-dropdown');
    if (existingDropdown) {
        existingDropdown.remove();
    }

    const dropdownContainer = document.createElement('div');
    dropdownContainer.id = 'address-dropdown';
    dropdownContainer.className = 'address-dropdown bg-white rounded shadow-sm position-absolute w-100 mt-1';
    dropdownContainer.style.maxHeight = '200px';
    dropdownContainer.style.overflowY = 'auto';
    dropdownContainer.style.zIndex = '1000';
    dropdownContainer.style.display = 'block';

    // Create a wrapper div for positioning
    const wrapper = document.createElement('div');
    wrapper.style.position = 'relative';
    wrapper.style.width = '100%';

    // Wrap the location search input with the wrapper
    const parent = locationSearch.parentNode;
    parent.insertBefore(wrapper, locationSearch);
    wrapper.appendChild(locationSearch);
    wrapper.appendChild(dropdownContainer);

    addresses.forEach((address, index) => {
        const item = document.createElement('div');
        item.className = 'p-2 hover-bg-light cursor-pointer';
        item.textContent = address.display_name;
        item.addEventListener('click', () => selectAddress(address));
        dropdownContainer.appendChild(item);
    });

    // Add highlight to first item
    if (addresses.length > 0) {
        const firstItem = dropdownContainer.children[0];
        if (firstItem) {
            firstItem.classList.add('active');
        }
    }
}

// Handle address selection
function selectAddress(address) {
    locationSearch.value = address.display_name;
    locationSearch.blur(); // Remove focus from input
    storeLocation({
        lat: parseFloat(address.lat),
        lng: parseFloat(address.lon),
        address: address.display_name
    });
    
    // Dispatch a custom event for address selection
    const event = new CustomEvent('addressSelected', {
        detail: {
            address: address.display_name,
            lat: parseFloat(address.lat),
            lng: parseFloat(address.lon)
        }
    });
    document.dispatchEvent(event);

    // Remove dropdown after selection
    const dropdown = document.getElementById('address-dropdown');
    if (dropdown) {
        dropdown.remove();
    }
}

// Modify handleLocationSearch function
async function handleLocationSearch() {
    const searchTerm = locationSearch.value.trim();
    if (searchTerm.length < 3) {
        const dropdown = document.getElementById('address-dropdown');
        if (dropdown) dropdown.remove();
        return;
    }

    showLoading(true);
    try {
        const response = await fetch(
            `${NOMINATIM_BASE_URL}/search?format=json&q=${encodeURIComponent(searchTerm)}`
        );
        const data = await response.json();

        if (data && data.length > 0) {
            createAddressDropdown(data);
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
        background: white;
        border: 1px solid #ddd;
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        z-index: 1050;
    }
    .hover-bg-light:hover {
        background-color: #f8f9fa;
    }
    .cursor-pointer {
        cursor: pointer;
    }
`;
document.head.appendChild(style);

// Reverse geocode coordinates to address
async function reverseGeocode(lat, lng) {
    try {
        const response = await fetch(
            `${NOMINATIM_BASE_URL}/reverse?format=json&lat=${lat}&lon=${lng}`
        );
        const data = await response.json();

        if (data && data.display_name) {
            locationSearch.value = data.display_name;
            storeLocation({
                lat,
                lng,
                address: data.display_name
            });
        }
    } catch (error) {
        showError('Error getting address');
        console.error('Reverse geocoding error:', error);
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