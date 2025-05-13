// Check if Leaflet (L) is loaded
if (typeof L === 'undefined') {
    console.error('Leaflet library (L) is not loaded. Please ensure the Leaflet script is included and loaded correctly.');
    throw new Error('Leaflet library (L) is not loaded.');
}

// Initialize the map
let map;
let gridLayer;
let predictionLayer;
let isMapInitialized = false;
let currentLat = 21.24053314;
let currentLng = 81.31921654;
let showPrediction = false; // Flag to control prediction overlay visibility

function initializeMap(lat = currentLat, lng = currentLng) {
    map = L.map('map', {
        zoomControl: true,
        scrollWheelZoom: true
    }).setView([lat, lng], 25);
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles © Esri'
    }).addTo(map);
    console.log('Map initialized at', lat, lng);
    currentLat = lat;
    currentLng = lng;
    isMapInitialized = false;
    gridLayer = L.layerGroup().addTo(map);
    predictionLayer = L.layerGroup().addTo(map);
}

// Convert meters to latitude/longitude degrees
function metersToLatLng(metersLat, metersLng, centerLat) {
    const latDegree = metersLat / 111000;
    const lngDegree = metersLng / (111000 * Math.cos(centerLat * Math.PI / 180));
    return { lat: latDegree, lng: lngDegree };
}

// Draw the grid (base layer without predictions)
function drawGrid(centerLat, centerLng) {
    if (gridLayer) gridLayer.clearLayers();
    const gridWidth = 50, gridHeight = 50, cellsX = 10, cellsY = 10;
    const cellWidth = gridWidth / cellsX, cellHeight = gridHeight / cellsY;
    const halfWidth = gridWidth / 2, halfHeight = gridHeight / 2;
    const { lat: latOffset, lng: lngOffset } = metersToLatLng(halfHeight, halfWidth, centerLat);

    for (let i = 1; i <= cellsY; i++) {
        for (let j = 1; j <= cellsX; j++) {
            const cellLatOffset = metersToLatLng(cellHeight * (i - cellsY / 2 + 0.5), 0, centerLat).lat;
            const cellLngOffset = metersToLatLng(0, cellWidth * (j - cellsX / 2 + 0.5), centerLat).lng;
            const cellBounds = [
                [centerLat + cellLatOffset - metersToLatLng(cellHeight / 2, 0, centerLat).lat, centerLng + cellLngOffset - metersToLatLng(0, cellWidth / 2, centerLat).lng],
                [centerLat + cellLatOffset + metersToLatLng(cellHeight / 2, 0, centerLat).lat, centerLng + cellLngOffset + metersToLatLng(0, cellWidth / 2, centerLat).lng]
            ];
            let fillColor = '#98ff98'; // Default green for no flood
            let fillOpacity = 0.05;

            L.rectangle(cellBounds, {
                color: '#ffffff', // Bright white grid lines
                weight: 1,
                fillColor: fillColor,
                fillOpacity: fillOpacity,
                interactive: false
            }).addTo(gridLayer).bindPopup(`Row: ${i}, Col: ${j}`);
        }
    }
    if (!isMapInitialized) {
        const radiusLatLng = metersToLatLng(100, 100, centerLat);
        map.fitBounds([
            [centerLat - radiusLatLng.lat, centerLng - radiusLatLng.lng],
            [centerLat + radiusLatLng.lat, centerLng + radiusLatLng.lng]
        ]);
        isMapInitialized = true;
    }
}

// Fetch data from Google Sheet
async function fetchDataFromGoogleSheet() {
    try {
        const response = await fetch('https://script.google.com/macros/s/AKfycbwNrmVyiFoLnMNrEB4bJapW96p-NHtf2K1bAZDly3fjmXduw1zKAziw6twGhoEbozVs5A/exec', {
            method: 'GET',
            mode: 'cors'
        });
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        const data = await response.json();
        console.log('Fetched data:', data);
        return data;
    } catch (error) {
        console.error('Error fetching data:', error.message);
        return [];
    }
}

// Send data to Google Sheet
async function sendDataToGoogleSheet(data) {
    try {
        const response = await fetch('https://script.google.com/macros/s/AKfycbwNrmVyiFoLnMNrEB4bJapW96p-NHtf2K1bAZDly3fjmXduw1zKAziw6twGhoEbozVs5A/exec', {
            method: 'POST',
            mode: 'cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        const result = await response.json();
        console.log('Data sent successfully:', result);
    } catch (error) {
        console.error('Error sending data:', error.message);
    }
}

// Update grid with current data (base layer)
async function updateGridWithSheetData(sheetData, centerLat, centerLng) {
    const cellsX = 10, cellsY = 10;
    const gridWidth = 50, gridHeight = 50;
    const cellWidth = gridWidth / cellsX, cellHeight = gridHeight / cellsY;

    let totalSurvivors = 0, floodCount = 0, noFloodCount = 0, buildingDamageCount = 0;

    if (gridLayer) gridLayer.clearLayers();
    drawGrid(centerLat, centerLng);

    sheetData.forEach(({ row, col, survivors, buildingDamage, flood }) => {
        if (row >= 1 && row <= cellsY && col >= 1 && col <= cellsX) {
            const cellLatOffset = metersToLatLng(cellHeight * (row - cellsY / 2 + 0.5), 0, centerLat).lat;
            const cellLngOffset = metersToLatLng(0, cellWidth * (col - cellsX / 2 + 0.5), centerLat).lng;
            const cellCenter = [centerLat + cellLatOffset, centerLng + cellLngOffset];
            const cellBounds = [
                [cellCenter[0] - metersToLatLng(cellHeight / 2, 0, centerLat).lat, cellCenter[1] - metersToLatLng(0, cellWidth / 2, centerLat).lng],
                [cellCenter[0] + metersToLatLng(cellHeight / 2, 0, centerLat).lat, cellCenter[1] + metersToLatLng(0, cellWidth / 2, centerLat).lng]
            ];

            let fillColor = '#98ff98';
            let fillOpacity = 0.05;
            if (flood) {
                fillColor = 'blue';
                fillOpacity = 0.5;
                floodCount++;
            } else {
                noFloodCount++;
            }

            L.rectangle(cellBounds, {
                color: '#ffffff', // Bright white grid lines
                weight: 1,
                fillColor: fillColor,
                fillOpacity: fillOpacity,
                interactive: false
            }).addTo(gridLayer);

            let labels = [];
            if (survivors > 0) {
                totalSurvivors += survivors;
                labels.push({ text: `${survivors}`, color: '#f587b1' });
            }
            if (buildingDamage) {
                buildingDamageCount++;
                labels.push({ text: 'BD', color: 'pink' });
            }

            if (labels.length > 0) {
                // Combine labels into a single line, separated by a small space, and centered
                const combinedLabel = labels.map(label => `<span style="color: ${label.color}; font-weight: bold;">${label.text}</span>`).join(' ');
                const icon = L.divIcon({
                    className: 'cell-label',
                    html: `<div style="display: flex; justify-content: center; align-items: center; font-size: 8px;">${combinedLabel}</div>`,
                    iconSize: [24, 10], // Slightly wider to accommodate multiple labels
                    iconAnchor: [12, 5] // Center the label horizontally and vertically
                });
                L.marker(cellCenter, { icon: icon, zIndexOffset: 1000 }).addTo(gridLayer);
            }
        }
    });

    document.getElementById('totalSurvivors').textContent = totalSurvivors;
    document.getElementById('floodCount').textContent = floodCount > 0 ? floodCount : '0';
    document.getElementById('noFloodCount').textContent = noFloodCount > 0 ? noFloodCount : '0';
    document.getElementById('buildingDamageCount').textContent = buildingDamageCount > 0 ? buildingDamageCount : '0';
}

// Update prediction overlay
async function updatePredictionOverlay(sheetData, centerLat, centerLng) {
    const cellsX = 10, cellsY = 10;
    const gridWidth = 50, gridHeight = 50;
    const cellWidth = gridWidth / cellsX, cellHeight = gridHeight / cellsY;

    if (predictionLayer) predictionLayer.clearLayers();

    sheetData.forEach(({ row, col, flood_prediction }) => {
        if (row >= 1 && row <= cellsY && col >= 1 && col <= cellsX && flood_prediction === 1) {
            const cellLatOffset = metersToLatLng(cellHeight * (row - cellsY / 2 + 0.5), 0, centerLat).lat;
            const cellLngOffset = metersToLatLng(0, cellWidth * (col - cellsX / 2 + 0.5), centerLat).lng;
            const cellCenter = [centerLat + cellLatOffset, centerLng + cellLngOffset];
            const cellBounds = [
                [cellCenter[0] - metersToLatLng(cellHeight / 2, 0, centerLat).lat, cellCenter[1] - metersToLatLng(0, cellWidth / 2, centerLat).lng],
                [cellCenter[0] + metersToLatLng(cellHeight / 2, 0, centerLat).lat, cellCenter[1] + metersToLatLng(0, cellWidth / 2, centerLat).lng]
            ];

            L.rectangle(cellBounds, {
                color: '#ffffff', // Bright white grid lines
                weight: 1,
                fillColor: 'yellow',
                fillOpacity: 0.5,
                interactive: false
            }).addTo(predictionLayer);
        }
    });
}

// Update grid with flood prediction overlay
async function updateGridWithPrediction(sheetData, centerLat, centerLng) {
    await updateGridWithSheetData(sheetData, centerLat, centerLng);
    await updatePredictionOverlay(sheetData, centerLat, centerLng);
}

// Simulate real-time data update
async function simulateDataUpdate(centerLat, centerLng) {
    const sampleData = {
        row: Math.floor(Math.random() * 10) + 1,
        col: Math.floor(Math.random() * 10) + 1,
        survivors: Math.floor(Math.random() * 5),
        buildingDamage: Math.round(Math.random()),
        flood: Math.round(Math.random()),
        flood_prediction: Math.round(Math.random()),
        notes: "Simulated update"
    };
    await sendDataToGoogleSheet(sampleData);
    const data = await fetchDataFromGoogleSheet();
    await updateGridWithSheetData(data, centerLat, centerLng);
    if (showPrediction) await updatePredictionOverlay(data, centerLat, centerLng); // Only update prediction if flag is true
}

// Periodic update
async function updateGridPeriodically(centerLat, centerLng) {
    while (true) {
        await simulateDataUpdate(centerLat, centerLng);
        await new Promise(resolve => setTimeout(resolve, 3000));
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    initializeMap();
});

document.getElementById('mapBtn').addEventListener('click', () => {
    const lat = parseFloat(prompt('Enter latitude:', currentLat));
    const lng = parseFloat(prompt('Enter longitude:', currentLng));
    
    if (isNaN(lat) || isNaN(lng)) {
        alert('Please enter valid coordinates.');
        return;
    }
    
    showPrediction = false; // Disable prediction overlay
    if (predictionLayer) predictionLayer.clearLayers(); // Clear any existing prediction
    initializeMap(lat, lng);
    updateGridPeriodically(lat, lng);
});

document.getElementById('floodPredictionBtn').addEventListener('click', async () => {
    const lat = parseFloat(prompt('Enter latitude:', currentLat));
    const lng = parseFloat(prompt('Enter longitude:', currentLng));
    
    if (isNaN(lat) || isNaN(lng)) {
        alert('Please enter valid coordinates.');
        return;
    }
    
    showPrediction = true; // Enable prediction overlay
    initializeMap(lat, lng);
    const data = await fetchDataFromGoogleSheet();
    await updateGridWithPrediction(data, lat, lng);
    updateGridPeriodically(lat, lng); // Continue periodic updates with prediction enabled
});