// DOM Elements
const locationDropdown = document.getElementById('location-dropdown');
const marketsSection = document.getElementById('markets-section');
const itemsSection = document.getElementById('items-section');
const itemsList = document.getElementById('items-list');
const searchItems = document.getElementById('search-items');
const categoryCards = document.querySelectorAll('.category-card');
const locationWarningModal = new bootstrap.Modal(document.getElementById('locationWarningModal'));

// Market data (example)
const marketsByLocation = {
    mirpur: [
        { id: 1, name: 'Mirpur 11 Kacha Bazar', address: 'Mirpur 11, Block C', distance: '0.5 km' },
        { id: 2, name: 'Mirpur 10 Bazar', address: 'Mirpur 10 Circle', distance: '1.2 km' }
    ],
    dhanmondi: [
        { id: 3, name: 'Dhanmondi 15 Market', address: 'Road 15, Dhanmondi', distance: '0.3 km' },
        { id: 4, name: 'Rayer Bazar', address: 'Dhanmondi', distance: '1.5 km' }
    ],
    gulshan: [
        { id: 5, name: 'Gulshan DCC Market', address: 'Gulshan 1', distance: '0.8 km' },
        { id: 6, name: 'Gulshan 2 Market', address: 'Gulshan 2', distance: '1.7 km' }
    ]
};

// WebSocket connection
let ws;
function connectWebSocket() {
    // Replace with your WebSocket server URL
    ws = new WebSocket('wss://your-websocket-server.com');

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        updatePrices(data);
    };

    ws.onclose = () => {
        // Reconnect after 5 seconds
        setTimeout(connectWebSocket, 5000);
    };
}

// Event Listeners
locationDropdown.addEventListener('change', (e) => {
    const location = e.target.value;
    displayMarkets(location);
});

searchItems.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    filterItems(searchTerm);
});

// Add click event listeners to all category cards
categoryCards.forEach(card => {
    card.addEventListener('click', () => {
        // Check if location is selected
        if (locationDropdown.value === '' || locationDropdown.selectedIndex === 0) {
            // Show warning modal if no location selected
            locationWarningModal.show();
        } else {
            // Process category selection (you can add category-specific logic here)
            const categoryName = card.querySelector('.category-title').textContent;
            displayMarkets(locationDropdown.value);
        }
    });
});

// Display markets for selected location
function displayMarkets(location) {
    const markets = marketsByLocation[location];
    marketsSection.innerHTML = '';
    marketsSection.style.display = 'flex';
    itemsSection.style.display = 'none';

    markets.forEach(market => {
        const marketCard = document.createElement('div');
        marketCard.className = 'col-md-6 col-lg-4';
        marketCard.innerHTML = `
            <div class="card market-card" data-market-id="${market.id}">
                <div class="card-body">
                    <h5 class="card-title">${market.name}</h5>
                    <p class="card-text">${market.address}</p>
                    <p class="card-text"><small class="text-muted">${market.distance}</small></p>
                </div>
            </div>
        `;
        marketCard.querySelector('.market-card').addEventListener('click', () => selectMarket(market));
        marketsSection.appendChild(marketCard);
    });
}

// Handle market selection
function selectMarket(market) {
    marketsSection.style.display = 'none';
    itemsSection.style.display = 'block';
    loadMarketItems(market.id);
}

// Load items for selected market
function loadMarketItems(marketId) {
    // Example items data
    const items = [
        { name: 'Rice', price: 75, unit: 'kg', lastUpdated: '2 mins ago' },
        { name: 'Potato', price: 35, unit: 'kg', lastUpdated: '5 mins ago' },
        { name: 'Onion', price: 45, unit: 'kg', lastUpdated: '1 min ago' }
    ];
    displayItems(items);
}

// Display items in table
function displayItems(items) {
    itemsList.innerHTML = items.map(item => `
        <tr>
            <td>${item.name}</td>
            <td>${item.price} Tk</td>
            <td>${item.unit}</td>
            <td>${item.lastUpdated}</td>
        </tr>
    `).join('');
}

// Filter items based on search
function filterItems(searchTerm) {
    const rows = itemsList.getElementsByTagName('tr');
    Array.from(rows).forEach(row => {
        const itemName = row.cells[0].textContent.toLowerCase();
        row.style.display = itemName.includes(searchTerm) ? '' : 'none';
    });
}

// Update prices with WebSocket data
function updatePrices(data) {
    const row = itemsList.querySelector(`tr[data-item-id="${data.itemId}"]`);
    if (row) {
        const priceCell = row.cells[1];
        const oldPrice = parseFloat(priceCell.textContent);
        const newPrice = data.price;

        priceCell.textContent = `${newPrice} Tk`;
        priceCell.className = newPrice > oldPrice ? 'price-up' : 'price-down';
    }
}

// Initialize WebSocket connection
// connectWebSocket(); // Uncomment when WebSocket server is ready