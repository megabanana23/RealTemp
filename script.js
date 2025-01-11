// OpenWeatherMap API key
const API_KEY = '40c7b9c4d6ed9fd778a1c407d01c4e65';

// DOM elements
const cityElement = document.getElementById('city');
const dateElement = document.getElementById('date');
const feelsLikeElement = document.getElementById('feels-like');
const actualTempElement = document.getElementById('actual-temp');
const humidityElement = document.getElementById('humidity');
const windElement = document.getElementById('wind');
const conditionElement = document.getElementById('condition');
const loadingElement = document.getElementById('loading');
const weatherInfoElement = document.getElementById('weather-info');
const celsiusRadio = document.getElementById('celsius');
const fahrenheitRadio = document.getElementById('fahrenheit');
const saveSettingsBtn = document.getElementById('saveSettings');

// Update date
function updateDate() {
    const now = new Date();
    dateElement.textContent = now.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Save location to localStorage
function saveLocation(lat, lon) {
    const locationData = {
        latitude: lat,
        longitude: lon,
        timestamp: new Date().getTime()
    };
    localStorage.setItem('weatherLocation', JSON.stringify(locationData));
}

// Get saved location
function getSavedLocation() {
    const savedLocation = localStorage.getItem('weatherLocation');
    if (savedLocation) {
        const locationData = JSON.parse(savedLocation);
        const hoursSinceLastUpdate = (new Date().getTime() - locationData.timestamp) / (1000 * 60 * 60);
        
        // Return location if it's less than 24 hours old
        if (hoursSinceLastUpdate < 24) {
            return locationData;
        }
    }
    return null;
}

// Fetch weather data
async function getWeatherData(lat, lon) {
    try {
        const response = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`
        );
        const data = await response.json();
        
        // Store the original Celsius values
        originalFeelsLike = Math.round(data.main.feels_like);
        originalActualTemp = Math.round(data.main.temp);
        
        // Set initial values
        feelsLikeElement.textContent = originalFeelsLike;
        actualTempElement.textContent = originalActualTemp;
        humidityElement.textContent = data.main.humidity;
        windElement.textContent = Math.round(data.wind.speed * 3.6);
        conditionElement.textContent = data.weather[0].description;
        cityElement.textContent = `${data.name}, ${data.sys.country}`;

        // Update the display based on selected unit
        updateTemperatureDisplay();

        loadingElement.style.display = 'none';
        weatherInfoElement.style.display = 'block';
        
        saveLocation(lat, lon);
    } catch (error) {
        console.error('Error fetching weather data:', error);
        cityElement.textContent = 'Error loading weather data';
    }
}

// Get user's location
function getUserLocation() {
    // First check if we have a saved location
    const savedLocation = getSavedLocation();
    if (savedLocation) {
        getWeatherData(savedLocation.latitude, savedLocation.longitude);
        return;
    }

    // If no saved location, request new location
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                getWeatherData(position.coords.latitude, position.coords.longitude);
            },
            (error) => {
                console.error('Error getting location:', error);
                cityElement.textContent = 'Error getting location';
            }
        );
    } else {
        cityElement.textContent = 'Geolocation is not supported by your browser';
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    updateDate();
    getUserLocation();
    loadSettings();
    
    saveSettingsBtn.addEventListener('click', saveSettings);
});

// Update weather every 30 minutes
setInterval(() => {
    const savedLocation = getSavedLocation();
    if (savedLocation) {
        getWeatherData(savedLocation.latitude, savedLocation.longitude);
    }
}, 30 * 60 * 1000);

function saveSettings() {
    const unit = document.querySelector('input[name="tempUnit"]:checked').value;
    localStorage.setItem('tempUnit', unit);
    updateTemperatureDisplay();
    
    // Fix modal closing
    const settingsModal = document.getElementById('settingsModal');
    const modalInstance = bootstrap.Modal.getInstance(settingsModal);
    if (modalInstance) {
        modalInstance.hide();
    }
}

function loadSettings() {
    const savedUnit = localStorage.getItem('tempUnit') || 'celsius';
    document.querySelector(`input[value="${savedUnit}"]`).checked = true;
    return savedUnit;
}

function celsiusToFahrenheit(celsius) {
    return (celsius * 9/5) + 32;
}

function updateTemperatureDisplay() {
    const unit = localStorage.getItem('tempUnit') || 'celsius';
    const feelsLikeTemp = parseFloat(feelsLikeElement.textContent);
    const actualTemp = parseFloat(actualTempElement.textContent);
    
    if (!isNaN(feelsLikeTemp) && !isNaN(actualTemp)) {
        if (unit === 'fahrenheit') {
            feelsLikeElement.textContent = Math.round(celsiusToFahrenheit(feelsLikeTemp));
            actualTempElement.textContent = Math.round(celsiusToFahrenheit(actualTemp));
            document.querySelectorAll('.temperature-unit').forEach(el => {
                el.textContent = '°F';
            });
        } else {
            feelsLikeElement.textContent = Math.round(feelsLikeTemp);
            actualTempElement.textContent = Math.round(actualTemp);
            document.querySelectorAll('.temperature-unit').forEach(el => {
                el.textContent = '°C';
            });
        }
    }
}

// Add these variables to store the original Celsius values
let originalFeelsLike = null;
let originalActualTemp = null;
