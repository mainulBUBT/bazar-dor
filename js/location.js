// DOM Elements
const locationSearch = document.getElementById('location-search');
const currentLocationBtn = document.getElementById('current-location-btn');
const locationLoading = document.getElementById('location-loading');

// Map related variables
let map;
let currentMarker;
let currentLatLng = { lat: 23.8103, lng: 90.4125 }; // Default to Dhaka, Bangladesh
let dragHintTimeout;

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
    
    // Initialize map if map element exists
    if (document.getElementById('map')) {
        try {
            console.log("Initializing map on DOMContentLoaded...");
            initMap();
            
            // Set up map-specific elements if they exist
            if (document.getElementById('map-search-input')) {
                setupMapSearch();
            }
            
            if (document.getElementById('map-current-location')) {
                document.getElementById('map-current-location').addEventListener('click', getCurrentLocation);
            }
            
            if (document.getElementById('map-fullscreen')) {
                document.getElementById('map-fullscreen').addEventListener('click', toggleMapFullscreen);
            }
            
            if (document.getElementById('visible-latitude') && document.getElementById('visible-longitude')) {
                setupCoordinateInputs();
            }
            
            // Check geolocation permission
            checkGeolocationPermission();
            
            // Ensure map container has proper height
            const mapContainer = document.getElementById('map-container');
            if (mapContainer && !mapContainer.style.height) {
                mapContainer.style.height = '250px';
            }
        } catch (error) {
            console.error("Error initializing map on DOMContentLoaded: ", error);
        }
    }
});

// Backup initialization when window fully loads
window.addEventListener('load', function() {
    if (document.getElementById('map')) {
        try {
            console.log("Window load event fired, checking map...");
            if (!map || !map._loaded) {
                console.log("Map not initialized on DOMContentLoaded, initializing now...");
                initMap();
            } else {
                console.log("Map already initialized, forcing resize");
                map.invalidateSize(true);
                hideMapLoading();
            }
        } catch (error) {
            console.error("Error initializing map on window load: ", error);
        }
    }
});

// Function to hide map loading overlay
function hideMapLoading() {
    const mapLoading = document.getElementById('map-loading');
    if (mapLoading) {
        mapLoading.style.display = 'none';
    }
}

// Initialize Leaflet map
function initMap() {
    // Check if map already exists
    if (map) {
        console.log("Map already initialized, resizing...");
        map.invalidateSize(true);
        return;
    }
    
    console.log("Creating new map instance...");
    
    // Create map instance
    try {
        map = L.map('map', {
            zoomControl: false,  // We'll add zoom control in a better position
            attributionControl: true
        }).setView([currentLatLng.lat, currentLatLng.lng], 15);
        
        // Add OpenStreetMap tiles (free to use)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19
        }).addTo(map);
        
        // Add zoom control to top-right
        L.control.zoom({
            position: 'topright'
        }).addTo(map);
        
        // Hide loading overlay
        hideMapLoading();
        
        // Show drag hint for a few seconds
        showDragHint();
        
        // Update coordinates when map is dragged
        map.on('move', function() {
            const center = map.getCenter();
            currentLatLng = {
                lat: center.lat,
                lng: center.lng
            };
            
            // Update form fields
            updateCoordinateFields(currentLatLng);
            
            // Hide drag hint after user starts moving
            hideDragHint();
        });
        
        // Debug: log when map is fully loaded
        map.on('load', function() {
            console.log("Map fully loaded");
        });
        
        // Force a resize after a short delay to ensure proper rendering
        setTimeout(function() {
            map.invalidateSize(true);
            console.log("Map resized after initialization");
            hideMapLoading();
            
            // Ensure controls are visible
            const zoomControl = document.querySelector('.leaflet-control-zoom');
            if (zoomControl) {
                zoomControl.style.display = 'block';
            }
        }, 500);
        
        console.log("Map initialized successfully");
    } catch (error) {
        console.error("Error creating map: ", error);
    }
}

// Show drag hint
function showDragHint() {
    const dragHint = document.querySelector('.drag-hint');
    if (dragHint) {
        dragHint.classList.remove('fade-out');
        // Auto-hide after a few seconds
        dragHintTimeout = setTimeout(() => {
            hideDragHint();
        }, 5000);
    }
}

// Hide drag hint
function hideDragHint() {
    const dragHint = document.querySelector('.drag-hint');
    if (dragHint) {
        dragHint.classList.add('fade-out');
    }
    
    // Clear the timeout if it exists
    if (dragHintTimeout) {
        clearTimeout(dragHintTimeout);
    }
}

// Set up coordinate input fields
function setupCoordinateInputs() {
    const latInput = document.getElementById('visible-latitude');
    const lngInput = document.getElementById('visible-longitude');
    const hiddenLatInput = document.getElementById('latitude');
    const hiddenLngInput = document.getElementById('longitude');
    
    // Initial values
    updateCoordinateFields(currentLatLng);
    
    // Update map when coordinates change
    latInput.addEventListener('change', updateMapFromCoordinates);
    lngInput.addEventListener('change', updateMapFromCoordinates);
}

// Update coordinate fields from map position
function updateCoordinateFields(latLng) {
    const latInput = document.getElementById('visible-latitude');
    const lngInput = document.getElementById('visible-longitude');
    const hiddenLatInput = document.getElementById('latitude');
    const hiddenLngInput = document.getElementById('longitude');
    
    if (latInput && lngInput && hiddenLatInput && hiddenLngInput) {
        // Format to 8 decimal places for display
        latInput.value = latLng.lat.toFixed(8);
        lngInput.value = latLng.lng.toFixed(8);
        
        // Update hidden fields with full precision
        hiddenLatInput.value = latLng.lat;
        hiddenLngInput.value = latLng.lng;
    }
}

// Update map position from coordinate fields
function updateMapFromCoordinates() {
    const latInput = document.getElementById('visible-latitude');
    const lngInput = document.getElementById('visible-longitude');
    
    if (latInput && lngInput && map) {
        const lat = parseFloat(latInput.value);
        const lng = parseFloat(lngInput.value);
        
        if (!isNaN(lat) && !isNaN(lng)) {
            map.setView([lat, lng], map.getZoom());
            currentLatLng = { lat, lng };
            
            // Update hidden fields
            document.getElementById('latitude').value = lat;
            document.getElementById('longitude').value = lng;
        }
    }
}

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

// Get map current location
function getCurrentLocation() {
    console.log("Getting current location for map...");
    
    // Add pulse effect to button
    const locationButton = document.getElementById('map-current-location');
    if (locationButton) {
        locationButton.classList.add('pulsing');
    }
    
    // Check if geolocation is available
    if (!navigator.geolocation) {
        showLocationError("Geolocation is not supported by your browser.");
        return;
    }

    // Request current position with options
    const options = {
        enableHighAccuracy: true,
        timeout: 10000,  // 10 seconds
        maximumAge: 0    // Don't use cached position
    };
    
    navigator.geolocation.getCurrentPosition(
        // Success
        function(position) {
            console.log("Got position:", position);
            
            // Remove pulsing effect
            if (locationButton) {
                locationButton.classList.remove('pulsing');
            }
            
            // Update map with current location
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            
            // Update map
            if (map) {
                map.setView([lat, lng], 16);
                
                // Set current position
                currentLatLng = { lat, lng };
                
                // Update form fields
                updateCoordinateFields(currentLatLng);
                
                // Show success toast
                const locationSuccessToast = document.getElementById('locationSuccessToast');
                if (locationSuccessToast) {
                    const toast = new bootstrap.Toast(locationSuccessToast);
                    toast.show();
                } else {
                    showSuccess('Successfully found your location!');
                }
                
                // Add marker pulse animation
                const markerIcon = document.querySelector('.map-marker-centered');
                if (markerIcon) {
                    markerIcon.classList.add('marker-pulse');
                    setTimeout(() => {
                        markerIcon.classList.remove('marker-pulse');
                    }, 2000);
                }
                
                // Try to reverse geocode the location
                mapReverseGeocode(lat, lng);
            }
        },
        // Error
        function(error) {
            console.error("Geolocation error:", error);
            
            // Remove pulsing effect
            if (locationButton) {
                locationButton.classList.remove('pulsing');
            }
            
            // Show error message
            let errorMessage = "Could not get your current location.";
            
            switch(error.code) {
                case error.PERMISSION_DENIED:
                    errorMessage = "Location access was denied. Please check your browser settings and ensure location access is allowed for this site.";
                    break;
                case error.POSITION_UNAVAILABLE:
                    errorMessage = "Location information is unavailable. Please try again or search for your location manually.";
                    break;
                case error.TIMEOUT:
                    errorMessage = "The request to get your location timed out. Please try again or check your connection.";
                    break;
                case error.UNKNOWN_ERROR:
                    errorMessage = "An unknown error occurred while getting your location. Please try again later.";
                    break;
            }
            
            showLocationError(errorMessage);
        },
        // Options
        options
    );
}

// Show location error modal with message
function showLocationError(message) {
    // Update error message
    const errorMessageElement = document.getElementById('location-error-message');
    if (errorMessageElement) {
        errorMessageElement.textContent = message;
        
        // Show modal
        const locationErrorModal = new bootstrap.Modal(document.getElementById('locationErrorModal'));
        locationErrorModal.show();
        
        // Set up retry button
        document.getElementById('retry-location-btn').addEventListener('click', function() {
            // Hide modal
            locationErrorModal.hide();
            
            // Show retrying toast
            const retryingToast = document.getElementById('retryingToast');
            if (retryingToast) {
                const toast = new bootstrap.Toast(retryingToast);
                toast.show();
            } else {
                showSuccess('Retrying with different settings...');
            }
            
            // Retry with looser options
            retryWithLooserOptions();
        });
    } else {
        // Fallback to simple error if modal doesn't exist
        showError(message);
    }
}

// Retry getting location with more permissive options
function retryWithLooserOptions() {
    console.log("Retrying with looser options...");
    
    if (!navigator.geolocation) {
        showLocationError("Geolocation is not supported by your browser.");
        return;
    }
    
    // Check if we're in map context
    const isMapContext = !!document.getElementById('map');
    
    // Less strict options
    const options = {
        enableHighAccuracy: false,  // Less accuracy is okay
        timeout: 15000,             // Longer timeout (15 seconds)
        maximumAge: 60000           // Allow cached positions up to 1 minute old
    };
    
    navigator.geolocation.getCurrentPosition(
        // Success handler
        function(position) {
            console.log("Got position (retry):", position);
            
            // Get coordinates
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            
            if (isMapContext) {
                // Update map
                if (map) {
                    map.setView([lat, lng], 16);
                    
                    // Set current position
                    currentLatLng = { lat, lng };
                    
                    // Update form fields
                    updateCoordinateFields(currentLatLng);
                    
                    // Show success toast
                    const locationSuccessToast = document.getElementById('locationSuccessToast');
                    if (locationSuccessToast) {
                        const toast = new bootstrap.Toast(locationSuccessToast);
                        toast.show();
                    } else {
                        showSuccess('Successfully found your location!');
                    }
                    
                    // Add marker pulse animation
                    const markerIcon = document.querySelector('.map-marker-centered');
                    if (markerIcon) {
                        markerIcon.classList.add('marker-pulse');
                        setTimeout(() => {
                            markerIcon.classList.remove('marker-pulse');
                        }, 2000);
                    }
                }
            }
            
            // Use the consolidated reverse geocode function for both contexts
            reverseGeocode(lat, lng);
        },
        // Error handler
        function(error) {
            console.error("Geolocation retry error:", error);
            
            // Show error message
            let errorMessage = "Still could not get your location. Please enter it manually.";
            showLocationError(errorMessage);
        },
        // Options
        options
    );
}

// Reverse geocode for map update
function mapReverseGeocode(lat, lng) {
    console.log("Reverse geocoding coordinates for map:", lat, lng);
    
    // Try to use our existing reverseGeocode function for map
    if (typeof reverseGeocode === 'function') {
        // Use the existing function if it exists
        reverseGeocode(lat, lng, function(address) {
            if (document.getElementById('address-line-1')) {
                document.getElementById('address-line-1').value = address;
            }
        });
        return;
    }
    
    // Fallback to showing the detected location modal
    const locationDetectedModal = document.getElementById('locationDetectedModal');
    if (locationDetectedModal) {
        // Show modal
        const modal = new bootstrap.Modal(locationDetectedModal);
        modal.show();
        
        // Set up use detected location button
        document.getElementById('use-detected-location').addEventListener('click', function() {
            // Get the detected address (in a real app this would come from the geocoding API)
            if (document.getElementById('address-line-1')) {
                document.getElementById('address-line-1').value = '123 Main Street';
            }
            
            // Hide modal
            modal.hide();
        });
    } else {
        // Fallback if modal doesn't exist - use OpenStreetMap Nominatim directly
        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=en`)
            .then(response => response.json())
            .then(data => {
                if (data && data.display_name && document.getElementById('address-line-1')) {
                    document.getElementById('address-line-1').value = data.display_name;
                }
            })
            .catch(error => {
                console.error('Error reverse geocoding:', error);
            });
    }
}

// Toggle map fullscreen
function toggleMapFullscreen() {
    const mapContainer = document.getElementById('map-container');
    
    if (document.fullscreenElement !== mapContainer) {
        // Enter fullscreen
        if (mapContainer.requestFullscreen) {
            mapContainer.requestFullscreen();
        } else if (mapContainer.webkitRequestFullscreen) {
            mapContainer.webkitRequestFullscreen();
        } else if (mapContainer.msRequestFullscreen) {
            mapContainer.msRequestFullscreen();
        }
        
        // Change icon
        document.getElementById('map-fullscreen').innerHTML = '<i class="bi bi-fullscreen-exit"></i>';
    } else {
        // Exit fullscreen
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
        
        // Change icon back
        document.getElementById('map-fullscreen').innerHTML = '<i class="bi bi-fullscreen"></i>';
    }
    
    // Make sure map resizes correctly
    setTimeout(() => {
        if (map) {
            map.invalidateSize(true);
        }
    }, 100);
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
async function reverseGeocode(lat, lng, callback) {
    // Check if we're in map context
    const isMapContext = !!document.getElementById('map');
    
    if (!isMapContext) {
    showLoading(true);
    }
    
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
                if (isMapContext) {
                    // In map context, update address field
                    const addressInput = document.getElementById('address-line-1');
                    if (addressInput) {
                        addressInput.value = detailedAddress;
                    }
                    
                    // Also update the detected location modal if it exists
                    updateDetectedLocationModal(detailedAddress);
                    
                    // Call callback if provided
                    if (typeof callback === 'function') {
                        callback(detailedAddress);
                    }
                } else {
                    // In location search context
                locationSearch.value = detailedAddress;
                storeLocation({
                    lat,
                    lng,
                    address: detailedAddress
                });
                
                showSuccess('Location updated successfully');
                }
                
                if (!isMapContext) {
                showLoading(false);
                }
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
            
            if (isMapContext) {
                // In map context, update address field
                const addressInput = document.getElementById('address-line-1');
                if (addressInput) {
                    addressInput.value = address.label;
                }
                
                // Also update the detected location modal if it exists
                updateDetectedLocationModal(address.label);
                
                // Call callback if provided
                if (typeof callback === 'function') {
                    callback(address.label);
                }
            } else {
                // In location search context
            locationSearch.value = address.label;
            
            storeLocation({
                lat,
                lng,
                address: address.label
            });
            
            showSuccess('Location updated successfully');
            }
            
            if (!isMapContext) {
            showLoading(false);
            }
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
                    
                    if (isMapContext) {
                        // In map context, update address field
                        const addressInput = document.getElementById('address-line-1');
                        if (addressInput) {
                            addressInput.value = displayAddress;
                        }
                        
                        // Also update the detected location modal if it exists
                        updateDetectedLocationModal(displayAddress);
                        
                        // Call callback if provided
                        if (typeof callback === 'function') {
                            callback(displayAddress);
                        }
                    } else {
                        // In location search context
                    locationSearch.value = displayAddress;
                    storeLocation({
                        lat,
                        lng,
                        address: displayAddress
                    });
                    
                    showSuccess('Location updated successfully');
                    }
                } else {
                    // If all attempts fail, display coordinates with a message
                    const coordsStr = `Location at ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
                    
                    if (isMapContext) {
                        // In map context, update address field
                        const addressInput = document.getElementById('address-line-1');
                        if (addressInput) {
                            addressInput.value = coordsStr;
                        }
                        
                        // Also update the detected location modal if it exists
                        updateDetectedLocationModal(coordsStr);
                        
                        // Call callback if provided
                        if (typeof callback === 'function') {
                            callback(coordsStr);
                        }
                    } else {
                        // In location search context
                        locationSearch.value = coordsStr;
                    storeLocation({
                        lat,
                        lng,
                            address: coordsStr
                    });
                }
                }
                
                if (!isMapContext) {
                showLoading(false);
                }
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
                
                if (isMapContext) {
                    // In map context, update address field
                    const addressInput = document.getElementById('address-line-1');
                    if (addressInput) {
                        addressInput.value = displayAddress;
                    }
                    
                    // Also update the detected location modal if it exists
                    updateDetectedLocationModal(displayAddress);
                    
                    // Call callback if provided
                    if (typeof callback === 'function') {
                        callback(displayAddress);
                    }
                } else {
                    // In location search context
                locationSearch.value = displayAddress;
                storeLocation({
                    lat,
                    lng,
                    address: displayAddress
                });
                
                showSuccess('Location updated successfully');
                }
            } else {
                // If everything fails, display coordinates
                const coordsStr = `Location at ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
                
                if (isMapContext) {
                    // In map context, update address field
                    const addressInput = document.getElementById('address-line-1');
                    if (addressInput) {
                        addressInput.value = coordsStr;
                    }
                    
                    // Also update the detected location modal if it exists
                    updateDetectedLocationModal(coordsStr);
                    
                    // Call callback if provided
                    if (typeof callback === 'function') {
                        callback(coordsStr);
                    }
                } else {
                    // In location search context
                    locationSearch.value = coordsStr;
                storeLocation({
                    lat,
                    lng,
                        address: coordsStr
                });
                    
                showError('Could not get detailed address');
                }
            }
        } catch (finalError) {
            console.error('Final geocoding attempt error:', finalError);
            const coordsStr = `Location at ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
            
            if (isMapContext) {
                // In map context, update address field
                const addressInput = document.getElementById('address-line-1');
                if (addressInput) {
                    addressInput.value = coordsStr;
                }
                
                // Also update the detected location modal if it exists
                updateDetectedLocationModal(coordsStr);
                
                // Call callback if provided
                if (typeof callback === 'function') {
                    callback(coordsStr);
                }
            } else {
                // In location search context
                locationSearch.value = coordsStr;
            storeLocation({
                lat,
                lng,
                    address: coordsStr
            });
                
            showError('Could not get address name');
            }
        } finally {
            if (!isMapContext) {
            showLoading(false);
            }
        }
    }
}

// Helper function to update detected location modal
function updateDetectedLocationModal(address) {
    const locationDetectedModal = document.getElementById('locationDetectedModal');
    if (!locationDetectedModal) return;
    
    // Update address text
    const addressText = locationDetectedModal.querySelector('p.fw-bold');
    if (addressText) {
        addressText.textContent = address;
    }
    
    // Show modal
    const modal = new bootstrap.Modal(locationDetectedModal);
    modal.show();
    
    // Set up use detected location button
    document.getElementById('use-detected-location').addEventListener('click', function() {
        // Update address field
        if (document.getElementById('address-line-1')) {
            document.getElementById('address-line-1').value = address;
        }
        
        // Hide modal
        modal.hide();
    });
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

// Basic implementation of map search
function setupMapSearch() {
    const searchInput = document.getElementById('map-search-input');
    const clearButton = document.querySelector('.map-search-clear');
    const resultsContainer = document.getElementById('map-search-results');
    
    if (!searchInput || !clearButton || !resultsContainer) return;
    
    // Show/hide clear button based on input
    searchInput.addEventListener('input', function() {
        if (this.value.length > 0) {
            clearButton.classList.add('visible');
        } else {
            clearButton.classList.remove('visible');
            resultsContainer.classList.remove('show');
        }
    });
    
    // Clear search
    clearButton.addEventListener('click', function() {
        searchInput.value = '';
        clearButton.classList.remove('visible');
        resultsContainer.classList.remove('show');
        searchInput.focus();
    });
    
    // Search on Enter key
    searchInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && this.value.trim().length > 0) {
            e.preventDefault();
            performMapSearch(this.value.trim());
        }
    });
}

// Perform search for map interface
function performMapSearch(query) {
    console.log("Searching for location:", query);
    const resultsContainer = document.getElementById('map-search-results');
    
    // Show loading
    resultsContainer.innerHTML = '<div class="p-3 text-center"><div class="spinner-border spinner-border-sm text-primary" role="status"></div> Searching...</div>';
    resultsContainer.classList.add('show');
    
    // Try to use Nominatim directly
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`)
        .then(response => response.json())
        .then(data => {
            if (data && data.length > 0) {
                let html = '';
                data.forEach((place) => {
                    const name = place.display_name.split(',')[0];
                    const address = place.display_name.split(',').slice(1).join(',').trim();
                    
                    html += `
                        <div class="map-search-result-item" data-lat="${place.lat}" data-lng="${place.lon}">
                            <div class="fw-medium">${name}</div>
                            <div class="small text-muted">${address}</div>
                        </div>
                    `;
                });
                
                resultsContainer.innerHTML = html;
                
                // Add click events to results
                document.querySelectorAll('.map-search-result-item').forEach(item => {
                    item.addEventListener('click', function() {
                        const lat = parseFloat(this.getAttribute('data-lat'));
                        const lng = parseFloat(this.getAttribute('data-lng'));
                        
                        // Update map
                        if (map && !isNaN(lat) && !isNaN(lng)) {
                            map.setView([lat, lng], 16);
                            currentLatLng = { lat, lng };
                            updateCoordinateFields(currentLatLng);
                        }
                        
                        // Hide results
                        resultsContainer.classList.remove('show');
                        
                        // Update search input with selected place
                        document.getElementById('map-search-input').value = this.querySelector('.fw-medium').textContent;
                        
                        // Also update address if it exists
                        const addressInput = document.getElementById('address-line-1');
                        if (addressInput) {
                            addressInput.value = this.querySelector('.fw-medium').textContent + ', ' + 
                                            this.querySelector('.small').textContent;
                        }
                    });
                });
            } else {
                resultsContainer.innerHTML = '<div class="p-3 text-center">No results found</div>';
            }
        })
        .catch(error => {
            console.error('Search error:', error);
            resultsContainer.innerHTML = '<div class="p-3 text-center text-danger">Error searching for locations</div>';
        });
}

// Check geolocation permission
function checkGeolocationPermission() {
    if (navigator.permissions && navigator.permissions.query) {
        navigator.permissions.query({ name: 'geolocation' }).then(result => {
            console.log("Geolocation permission status:", result.state);
            
            // Listen for permission changes
            result.addEventListener('change', function() {
                console.log("Geolocation permission changed to:", this.state);
            });
            
            // If permission is already granted, show the current location button with pulse
            if (result.state === 'granted') {
                const locationButton = document.getElementById('map-current-location');
                if (locationButton) {
                    locationButton.classList.add('pulsing');
                    setTimeout(() => {
                        locationButton.classList.remove('pulsing');
                    }, 3000);
                }
            }
        });
    }
}