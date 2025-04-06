// DOM Elements
const locationSearch = document.getElementById('location-search');
const currentLocationBtn = document.getElementById('current-location-btn');
const locationLoading = document.getElementById('location-loading');

// Initialize Leaflet Geosearch Provider with better parameters
const provider = new GeoSearch.OpenStreetMapProvider({
    params: {
        // Set appropriate parameters to avoid overusing the API
        'accept-language': 'en',
        countrycodes: '',
        addressdetails: 1, 
        limit: 5,
        // Add more details to get better results
        'polygon_geojson': 0,
        'namedetails': 1
    }
});

// Create a hidden map container for geocoding
let geocodingMap = null;

// Initialize multiple geocoder providers for better results
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
    if (data.city || data.town || data.village) components.push(data.city || data.town || data.village);
    if (data.county || data.state) components.push(data.county || data.state);
    if (data.country) components.push(data.country);
    
    return components.length > 0 ? components.join(', ') : 'Unknown location';
}

// Build a more detailed address string from geocoding results
function buildDetailedAddress(result) {
    if (!result) return '';
    
    // If it has a formatted name, use it
    if (result.name && result.name.includes(',')) {
        return result.name;
    }
    
    // Extract address components
    const components = [];
    
    // For Photon geocoder format
    if (result.properties) {
        const props = result.properties;
        if (props.name) components.push(props.name);
        if (props.street) components.push(props.housenumber ? `${props.housenumber} ${props.street}` : props.street);
        if (props.district) components.push(props.district);
        if (props.city) components.push(props.city);
        if (props.county) components.push(props.county);
        if (props.state) components.push(props.state);
        if (props.country) components.push(props.country);
    } 
    // For standard Leaflet geocoder format
    else {
        if (result.name) components.push(result.name);
        if (result.address) {
            const addr = result.address;
            if (addr.road || addr.street) components.push(addr.road || addr.street);
            if (addr.neighbourhood || addr.suburb) components.push(addr.neighbourhood || addr.suburb);
            if (addr.city || addr.town || addr.village) components.push(addr.city || addr.town || addr.village);
            if (addr.county || addr.state) components.push(addr.county || addr.state);
            if (addr.country) components.push(addr.country);
        }
    }
    
    // If we still don't have enough components, use name
    if (components.length < 2 && result.name) {
        return result.name;
    }
    
    return components.join(', ');
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

// Reverse geocode coordinates to address using multiple providers for better results
async function reverseGeocode(lat, lng) {
    showLoading(true);
    
    try {
        // First attempt: Use the Photon geocoder (often provides better detail)
        const photonResponse = await fetch(`https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}&lang=en`);
        const photonData = await photonResponse.json();
        
        if (photonData && photonData.features && photonData.features.length > 0) {
            const feature = photonData.features[0];
            const properties = feature.properties;
            
            // Build a detailed address from Photon data
            let detailedAddress = '';
            const addressParts = [];
            
            // Build address from most specific to least specific
            if (properties.name) addressParts.push(properties.name);
            if (properties.street) {
                if (properties.housenumber) {
                    addressParts.push(`${properties.housenumber} ${properties.street}`);
                } else {
                    addressParts.push(properties.street);
                }
            }
            if (properties.district) addressParts.push(properties.district);
            if (properties.city) addressParts.push(properties.city);
            if (properties.state) addressParts.push(properties.state);
            if (properties.country) addressParts.push(properties.country);
            
            detailedAddress = addressParts.join(', ');
            
            // Use the address if it has enough detail
            if (addressParts.length >= 2) {
                locationSearch.value = detailedAddress;
                storeLocation({
                    lat,
                    lng,
                    address: detailedAddress
                });
                
                showSuccess('Location updated successfully');
                showLoading(false);
                return;
            }
        }
        
        // Second attempt: Use the provider for reverse geocoding
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
            
            showSuccess('Location updated successfully');
            showLoading(false);
            return;
        }
        
        // Third attempt: Leaflet's geocoding control
        // Ensure geocoding map is initialized
        initializeGeocoder();
        
        // Create a custom geocoder with Nominatim for better detail
        const geocoder = L.Control.Geocoder.nominatim({
            geocodingQueryParams: {
                addressdetails: 1,
                extratags: 1,
                namedetails: 1
            }
        });
        
        // Perform reverse geocoding
        geocoder.reverse(
            L.latLng(lat, lng),
            18, // higher zoom level for more detailed results
            results => {
                if (results && results.length > 0) {
                    const result = results[0];
                    
                    // Extract detailed address components
                    let displayAddress = '';
                    
                    if (result.html) {
                        // Some geocoders return formatted HTML
                        const div = document.createElement('div');
                        div.innerHTML = result.html;
                        displayAddress = div.textContent || div.innerText;
                    } else if (result.name) {
                        displayAddress = result.name;
                    }
                    
                    // If we have address details, build a more detailed address
                    if (result.address) {
                        const addr = result.address;
                        const parts = [];
                        
                        // Build from most specific to least specific
                        if (addr.road) {
                            const houseNumber = addr.house_number ? `${addr.house_number} ` : '';
                            parts.push(houseNumber + addr.road);
                        }
                        if (addr.neighbourhood || addr.suburb) parts.push(addr.neighbourhood || addr.suburb);
                        if (addr.city || addr.town || addr.village) parts.push(addr.city || addr.town || addr.village);
                        if (addr.county) parts.push(addr.county);
                        if (addr.state || addr.province) parts.push(addr.state || addr.province);
                        if (addr.country) parts.push(addr.country);
                        
                        if (parts.length >= 2) {
                            displayAddress = parts.join(', ');
                        }
                    }
                    
                    locationSearch.value = displayAddress;
                    storeLocation({
                        lat,
                        lng,
                        address: displayAddress
                    });
                    
                    showSuccess('Location updated successfully');
                } else {
                    // If all attempts fail, display coordinates with a message
                    locationSearch.value = `Location at ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
                    storeLocation({
                        lat,
                        lng,
                        address: `Location at ${lat.toFixed(6)}, ${lng.toFixed(6)}`
                    });
                }
                showLoading(false);
            }
        );
    } catch (error) {
        console.error('Reverse geocoding error:', error);
        
        // As a last resort, try with OpenStreetMap Nominatim directly
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=en`);
            const data = await response.json();
            
            if (data && data.display_name) {
                // Parse address components to create a cleaner display
                const addr = data.address || {};
                const parts = [];
                
                // Build from most specific to least specific
                if (addr.road) {
                    const houseNumber = addr.house_number ? `${addr.house_number} ` : '';
                    parts.push(houseNumber + addr.road);
                }
                if (addr.neighbourhood || addr.suburb) parts.push(addr.neighbourhood || addr.suburb);
                if (addr.city || addr.town || addr.village) parts.push(addr.city || addr.town || addr.village);
                if (addr.county) parts.push(addr.county);
                if (addr.state || addr.province) parts.push(addr.state || addr.province);
                if (addr.country) parts.push(addr.country);
                
                const displayAddress = parts.length >= 2 ? parts.join(', ') : data.display_name;
                
                locationSearch.value = displayAddress;
                storeLocation({
                    lat,
                    lng,
                    address: displayAddress
                });
                
                showSuccess('Location updated successfully');
            } else {
                // If everything fails, display coordinates
                locationSearch.value = `Location at ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
                storeLocation({
                    lat,
                    lng,
                    address: `Location at ${lat.toFixed(6)}, ${lng.toFixed(6)}`
                });
                showError('Could not get detailed address');
            }
        } catch (finalError) {
            console.error('Final geocoding attempt error:', finalError);
            locationSearch.value = `Location at ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
            storeLocation({
                lat,
                lng,
                address: `Location at ${lat.toFixed(6)}, ${lng.toFixed(6)}`
            });
            showError('Could not get address name');
        } finally {
            showLoading(false);
        }
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