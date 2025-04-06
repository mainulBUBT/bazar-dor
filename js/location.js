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

// Create a hidden map container for geocoding
let geocodingMap = null;

// Initialize Leaflet geocoder when needed
function initializeGeocoder() {
    if (geocodingMap) return;
    
    // Create a hidden map container
    const mapContainer = document.createElement('div');
    mapContainer.style.display = 'none';
    document.body.appendChild(mapContainer);
    
    // Initialize map
    geocodingMap = L.map(mapContainer, {
        center: [0, 0],
        zoom: 1
    });
    
    // Add a tile layer (not visible, but required)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(geocodingMap);
}

// Format address for better readability
function formatAddress(data) {
    if (!data) return '';
    
    // If it's a GeoSearchResult, use the label
    if (data.label) {
        return data.label;
    }
    
    // Otherwise create a readable version from components
    const components = [];
    
    if (data.name) components.push(data.name);
    if (data.street) components.push(data.street);
    if (data.city) components.push(data.city);
    if (data.state) components.push(data.state);
    if (data.country) components.push(data.country);
    
    return components.length > 0 ? components.join(', ') : 'Unknown location';
}

// Track current active index for keyboard navigation
let activeAddressIndex = 0;
let currentAddresses = [];

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Initialize hidden map for geocoding
    initializeGeocoder();
    
    // Check if we have a saved location and display it
    const savedLocation = localStorage.getItem('userLocation');
    if (savedLocation) {
        try {
            const location = JSON.parse(savedLocation);
            if (location && location.address) {
                locationSearch.value = location.address;
            }
        } catch (e) {
            console.error('Error parsing saved location', e);
        }
    }
    
    currentLocationBtn.addEventListener('click', getCurrentLocation);
    locationSearch.addEventListener('input', debounce(handleLocationSearch, 500));
    locationSearch.addEventListener('focus', function() {
        if (locationSearch.value.trim().length >= 3) {
            handleLocationSearch();
        }
    });
    
    // Add keyboard navigation
    locationSearch.addEventListener('keydown', handleKeyboardNavigation);
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.location-bar')) {
            const dropdown = document.getElementById('address-dropdown');
            if (dropdown) dropdown.remove();
        }
    });
});

// Handle keyboard navigation in dropdown
function handleKeyboardNavigation(e) {
    const dropdown = document.getElementById('address-dropdown');
    if (!dropdown) return;
    
    const items = dropdown.querySelectorAll('.address-item');
    if (items.length === 0) return;
    
    switch (e.key) {
        case 'ArrowDown':
            e.preventDefault();
            activeAddressIndex = Math.min(activeAddressIndex + 1, items.length - 1);
            updateActiveItem(items);
            break;
        case 'ArrowUp':
            e.preventDefault();
            activeAddressIndex = Math.max(activeAddressIndex - 1, 0);
            updateActiveItem(items);
            break;
        case 'Enter':
            e.preventDefault();
            if (activeAddressIndex >= 0 && activeAddressIndex < currentAddresses.length) {
                selectAddress(currentAddresses[activeAddressIndex]);
            }
            break;
        case 'Escape':
            e.preventDefault();
            dropdown.remove();
            break;
    }
}

// Update active item in dropdown
function updateActiveItem(items) {
    items.forEach((item, index) => {
        if (index === activeAddressIndex) {
            item.classList.add('active');
            item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        } else {
            item.classList.remove('active');
        }
    });
}

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
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
}

// Create and update address dropdown
function createAddressDropdown(addresses) {
    // Store current addresses for keyboard navigation
    currentAddresses = addresses;
    activeAddressIndex = 0;
    
    // Remove existing dropdown if any
    const existingDropdown = document.getElementById('address-dropdown');
    if (existingDropdown) {
        existingDropdown.remove();
    }

    const dropdownContainer = document.createElement('div');
    dropdownContainer.id = 'address-dropdown';
    dropdownContainer.className = 'address-dropdown bg-white rounded shadow-sm position-absolute w-100 mt-1';
    
    // Ensure the location search has a proper parent for positioning
    const parent = locationSearch.closest('.location-bar');
    if (!parent) return;

    parent.style.position = 'relative';
    parent.appendChild(dropdownContainer);

    if (addresses.length === 0) {
        const noResults = document.createElement('div');
        noResults.className = 'p-3 text-center text-muted';
        noResults.textContent = 'No locations found';
        dropdownContainer.appendChild(noResults);
        return;
    }

    addresses.forEach((address, index) => {
        const item = document.createElement('div');
        item.className = 'p-2 address-item d-flex align-items-center';
        if (index === 0) item.classList.add('active');
        
        // Add map marker icon
        const icon = document.createElement('div');
        icon.className = 'address-icon me-2';
        icon.innerHTML = '<i class="bi bi-geo-alt text-primary"></i>';
        
        // Add address text with primary and secondary lines
        const textContainer = document.createElement('div');
        textContainer.className = 'address-text-container';
        
        // Split the address into parts
        const addressParts = address.label.split(',').map(part => part.trim());
        
        // Primary address (first part)
        const primaryText = document.createElement('div');
        primaryText.className = 'address-primary-text';
        primaryText.textContent = addressParts[0];
        
        // Secondary address (city, country)
        const secondaryText = document.createElement('div');
        secondaryText.className = 'address-secondary-text';
        
        // Get last two parts or whatever is available
        const secondaryParts = addressParts.slice(1, 3);
        secondaryText.textContent = secondaryParts.join(', ');
        
        textContainer.appendChild(primaryText);
        textContainer.appendChild(secondaryText);
        
        item.appendChild(icon);
        item.appendChild(textContainer);
        
        item.addEventListener('click', () => selectAddress(address));
        // Add mouseover event to update active index
        item.addEventListener('mouseover', () => {
            activeAddressIndex = index;
            updateActiveItem(dropdownContainer.querySelectorAll('.address-item'));
        });
        
        dropdownContainer.appendChild(item);
    });
}

// Handle address selection
function selectAddress(address) {
    if (!address) return;
    
    // Format the display label for better readability
    const displayAddress = address.label.split(',').slice(0, 3).join(',');
    
    locationSearch.value = displayAddress;
    locationSearch.blur(); // Remove focus from input
    
    const location = {
        lat: address.y,
        lng: address.x,
        address: displayAddress,
        fullAddress: address.label // Store full address for reference
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
    
    // Show success toast
    showSuccess('Location updated successfully');
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
        // Use the leaflet-geosearch provider to search for addresses
        const results = await provider.search({ query: searchTerm });
        
        if (results && results.length > 0) {
            // Process results to remove duplicates and improve display
            const uniqueResults = removeDuplicateAddresses(results);
            createAddressDropdown(uniqueResults);
        } else {
            // Fallback to Leaflet's geocoding if provider search fails
            try {
                // Ensure geocodingMap is initialized
                initializeGeocoder();
                
                // Use Leaflet's geocoding control to search
                const geocodingControl = L.Control.geocoder({
                    defaultMarkGeocode: false
                }).addTo(geocodingMap);
                
                geocodingControl.geocode(searchTerm, results => {
                    if (results && results.length > 0) {
                        // Convert Leaflet geocoder results to our format
                        const convertedResults = results.map(result => ({
                            x: result.center.lng,
                            y: result.center.lat,
                            label: result.name,
                            raw: result
                        }));
                        
                        createAddressDropdown(convertedResults);
                    } else {
                        createAddressDropdown([]); // No results found
                    }
                    showLoading(false);
                });
                return; // Early return as the callback will handle loading state
            } catch (leafletError) {
                console.error('Leaflet geocoding error:', leafletError);
                createAddressDropdown([]); // Show no results
            }
        }
    } catch (error) {
        showError('Error searching location');
        console.error('Location search error:', error);
        createAddressDropdown([]); // Show no results
    } finally {
        showLoading(false);
    }
}

// Remove duplicate addresses from results
function removeDuplicateAddresses(addresses) {
    const seen = new Set();
    return addresses.filter(addr => {
        // Create a key from coordinates (rounded to 4 decimal places for nearby locations)
        const key = `${parseFloat(addr.y).toFixed(4)},${parseFloat(addr.x).toFixed(4)}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

// Add styles to the document
const style = document.createElement('style');
style.textContent = `
    .address-dropdown {
        max-height: 260px;
        overflow-y: auto;
        z-index: 1050;
        display: block;
        background: white;
        border: 1px solid #eee;
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }
    .address-item {
        cursor: pointer;
        transition: background-color 0.2s ease;
        border-bottom: 1px solid #f5f5f5;
        padding: 10px 12px;
    }
    .address-item:last-child {
        border-bottom: none;
    }
    .address-item:hover {
        background-color: #f8f9fa;
    }
    .address-item.active {
        background-color: #f0f0f0;
    }
    .address-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        min-width: 32px;
        background-color: rgba(var(--primary-color-rgb), 0.1);
        border-radius: 50%;
    }
    .address-icon i {
        font-size: 0.85rem;
    }
    .address-text-container {
        display: flex;
        flex-direction: column;
        flex: 1;
        overflow: hidden;
    }
    .address-primary-text {
        font-size: 0.9rem;
        color: var(--text-dark);
        line-height: 1.3;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font-weight: 500;
    }
    .address-secondary-text {
        font-size: 0.75rem;
        color: var(--text-muted);
        line-height: 1.2;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
`;
document.head.appendChild(style);

// Reverse geocode coordinates to address using Leaflet
async function reverseGeocode(lat, lng) {
    showLoading(true);
    try {
        // First try using the provider directly for reverse geocoding
        const results = await provider.search({ 
            query: {
                lat: lat,
                lon: lng
            }
        });
        
        if (results && results.length > 0) {
            const address = results[0];
            locationSearch.value = address.label;
            
            storeLocation({
                lat,
                lng,
                address: address.label
            });
            
            // Show success toast
            showSuccess('Location updated successfully');
        } else {
            // Fallback to Leaflet's native reverse geocoding
            try {
                // Ensure geocoding map is initialized
                initializeGeocoder();
                
                // Use Leaflet's geocoding control
                const geocoder = L.Control.geocoder({
                    defaultMarkGeocode: false
                }).addTo(geocodingMap);
                
                // Use reverse method
                geocoder.options.geocoder.reverse(
                    L.latLng(lat, lng),
                    geocodingMap.options.crs.scale(geocodingMap.getZoom()),
                    results => {
                        if (results && results.length > 0) {
                            const result = results[0];
                            const displayAddress = result.name;
                            
                            locationSearch.value = displayAddress;
                            storeLocation({
                                lat,
                                lng,
                                address: displayAddress
                            });
                            
                            showSuccess('Location updated successfully');
                        } else {
                            // If all attempts fail, display coordinates
                            locationSearch.value = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
                            storeLocation({
                                lat,
                                lng,
                                address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`
                            });
                        }
                        showLoading(false);
                    }
                );
                return; // Early return as callback handles loading state
            } catch (leafletError) {
                console.error('Leaflet reverse geocoding error:', leafletError);
                // Fall back to coordinates
                locationSearch.value = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
                storeLocation({
                    lat,
                    lng,
                    address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`
                });
                showError('Could not get address name');
            }
        }
    } catch (error) {
        console.error('Reverse geocoding error:', error);
        
        // As a last resort, try with Leaflet's native geocoder
        try {
            // Ensure geocoding map is initialized
            initializeGeocoder();
            
            const geocoder = L.Control.geocoder({
                defaultMarkGeocode: false
            }).addTo(geocodingMap);
            
            // Use reverse method
            geocoder.options.geocoder.reverse(
                L.latLng(lat, lng),
                geocodingMap.options.crs.scale(geocodingMap.getZoom()),
                results => {
                    if (results && results.length > 0) {
                        const result = results[0];
                        const displayAddress = result.name;
                        
                        locationSearch.value = displayAddress;
                        storeLocation({
                            lat,
                            lng,
                            address: displayAddress
                        });
                        
                        showSuccess('Location updated successfully');
                    } else {
                        // If all attempts fail, display coordinates
                        locationSearch.value = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
                        storeLocation({
                            lat,
                            lng,
                            address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`
                        });
                        showError('Could not get address name');
                    }
                    showLoading(false);
                }
            );
            return; // Early return as callback handles loading state
        } catch (finalError) {
            console.error('Final geocoding attempt error:', finalError);
            locationSearch.value = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
            storeLocation({
                lat,
                lng,
                address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`
            });
            showError('Could not get address name');
        }
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

// Show success message
function showSuccess(message) {
    const toastContainer = document.createElement('div');
    toastContainer.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 1050;';
    
    const toast = document.createElement('div');
    toast.className = 'bg-success text-white p-3 rounded shadow-sm';
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