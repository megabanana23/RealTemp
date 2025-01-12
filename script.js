// OpenWeatherMap API key
const API_KEY = '40c7b9c4d6ed9fd778a1c407d01c4e65';

// Variables for storing original temperature values
let originalFeelsLike = null;
let originalActualTemp = null;
let originalWindSpeed = null;

// Wait for DOM to be fully loaded before accessing elements
document.addEventListener('DOMContentLoaded', () => {
    // Get DOM elements after the document is loaded
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
    const settingsToggle = document.getElementById('settingsToggle');
    const settingsPanel = document.getElementById('settingsPanel');
    const settingsOverlay = document.getElementById('settingsOverlay');
    const closeSettings = document.getElementById('closeSettings');
    const themeRadios = document.querySelectorAll('input[name="theme"]');
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');
    const searchResults = document.getElementById('searchResults');
    const currentLocationButton = document.getElementById('currentLocationButton');
    const kilometersRadio = document.getElementById('kilometers');
    const milesRadio = document.getElementById('miles');
    const pinsToggle = document.getElementById('pinsToggle');
    const pinsPanel = document.getElementById('pinsPanel');
    const pinsOverlay = document.getElementById('pinsOverlay');
    const closePins = document.getElementById('closePins');
    const pinnedLocations = document.getElementById('pinnedLocations');
    const noPins = document.getElementById('noPins');

    // Temperature conversion function
    function celsiusToFahrenheit(celsius) {
        return (celsius * 9/5) + 32;
    }

    // Update date function
    function updateDate() {
        const now = new Date();
        dateElement.textContent = now.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    // Settings functions
    function loadSettings() {
        // Load temperature unit preference
        const savedUnit = localStorage.getItem('tempUnit') || 'celsius';
        const unitRadio = document.querySelector(`input[name="tempUnit"][value="${savedUnit}"]`);
        if (unitRadio) {
            unitRadio.checked = true;
        }

        // Load theme preference
        const savedTheme = localStorage.getItem('theme') || 'light';
        const themeRadio = document.querySelector(`input[name="theme"][value="${savedTheme}"]`);
        if (themeRadio) {
            themeRadio.checked = true;
        }
        document.documentElement.setAttribute('data-theme', savedTheme);

        return savedUnit;
    }

    function updateTemperatureDisplay() {
        const unit = localStorage.getItem('tempUnit') || 'celsius';
        
        if (originalFeelsLike !== null && originalActualTemp !== null) {
            if (unit === 'fahrenheit') {
                feelsLikeElement.textContent = Math.round(celsiusToFahrenheit(originalFeelsLike));
                actualTempElement.textContent = Math.round(celsiusToFahrenheit(originalActualTemp));
                document.querySelectorAll('.temperature-unit').forEach(el => {
                    el.textContent = '°F';
                });
            } else {
                feelsLikeElement.textContent = originalFeelsLike;
                actualTempElement.textContent = originalActualTemp;
                document.querySelectorAll('.temperature-unit').forEach(el => {
                    el.textContent = '°C';
                });
            }
        }
    }

    function saveSettings() {
        // Get selected temperature unit
        const selectedUnit = document.querySelector('input[name="tempUnit"]:checked');
        if (selectedUnit) {
            localStorage.setItem('tempUnit', selectedUnit.value);
            updateTemperatureDisplay();
        }

        // Get selected theme
        const selectedTheme = document.querySelector('input[name="theme"]:checked');
        if (selectedTheme) {
            localStorage.setItem('theme', selectedTheme.value);
            document.documentElement.setAttribute('data-theme', selectedTheme.value);
        }

        // Close settings panel
        toggleSettings();
    }

    // Location functions
    function saveLocation(lat, lon) {
        const locationData = {
            latitude: lat,
            longitude: lon,
            timestamp: new Date().getTime()
        };
        localStorage.setItem('weatherLocation', JSON.stringify(locationData));
    }

    function getSavedLocation() {
        const savedLocation = localStorage.getItem('weatherLocation');
        if (savedLocation) {
            const locationData = JSON.parse(savedLocation);
            const hoursSinceLastUpdate = (new Date().getTime() - locationData.timestamp) / (1000 * 60 * 60);
            
            if (hoursSinceLastUpdate < 24) {
                return locationData;
            }
        }
        return null;
    }

    // Weather data functions
    async function getWeatherData(lat, lon) {
        try {
            loadingElement.style.display = 'block';
            weatherInfoElement.style.display = 'none';
            
            await Promise.all([
                fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`),
                getAirQuality(lat, lon),
                getForecastData(lat, lon),
                getTenDayForecast(lat, lon)
            ]).then(async ([weatherResponse]) => {
                if (!weatherResponse.ok) {
                    throw new Error(`HTTP error! status: ${weatherResponse.status}`);
                }
                
                const data = await weatherResponse.json();
                
                originalFeelsLike = Math.round(data.main.feels_like);
                originalActualTemp = Math.round(data.main.temp);
                originalWindSpeed = data.wind.speed;
                
                updateTemperatureDisplay();
                
                const humidityLevel = data.main.humidity;
                const humidityDesc = getHumidityDescription(humidityLevel);
                humidityElement.textContent = humidityDesc; // Only show description
                
                const windSpeedKmh = Math.round(data.wind.speed * 3.6);
                const windDesc = getWindDescription(windSpeedKmh);
                windElement.textContent = windDesc.split(' - ')[0];
                conditionElement.textContent = data.weather[0].description;
                cityElement.textContent = `${data.name}, ${data.sys.country}`;

                // Update all modals with the new data
                updateModals(data);

                loadingElement.style.display = 'none';
                weatherInfoElement.style.display = 'block';
                
                saveLocation(lat, lon);
            });
            
        } catch (error) {
            console.error('Error fetching weather data:', error);
            loadingElement.style.display = 'none';
            cityElement.textContent = 'Error loading weather data. Please refresh the page.';
        }
    }

    function getUserLocation() {
        const savedLocation = getSavedLocation();
        if (savedLocation) {
            getWeatherData(savedLocation.latitude, savedLocation.longitude);
            return;
        }

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    getWeatherData(position.coords.latitude, position.coords.longitude);
                },
                (error) => {
                    console.error('Error getting location:', error);
                    loadingElement.style.display = 'none';
                    switch(error.code) {
                        case error.PERMISSION_DENIED:
                            cityElement.textContent = 'Please allow location access to see weather data';
                            break;
                        case error.POSITION_UNAVAILABLE:
                            cityElement.textContent = 'Location information unavailable';
                            break;
                        case error.TIMEOUT:
                            cityElement.textContent = 'Location request timed out';
                            break;
                        default:
                            cityElement.textContent = 'Error getting location';
                    }
                },
                {
                    enableHighAccuracy: true,
                    timeout: 5000,
                    maximumAge: 0
                }
            );
        } else {
            loadingElement.style.display = 'none';
            cityElement.textContent = 'Geolocation is not supported by your browser';
        }
    }

    // Add this function to get air quality data
    async function getAirQuality(lat, lon) {
        try {
            const response = await fetch(
                `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${API_KEY}`
            );
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            const aqi = data.list[0].main.aqi;
            const airQualityElement = document.getElementById('air-quality');
            const modalAirQualityElement = document.getElementById('modal-air-quality');
            const aqiDescriptionElement = document.getElementById('aqi-description');
            
            // AQI descriptions
            const aqiDescriptions = {
                1: 'Good - Ideal air quality for outdoor activities',
                2: 'Fair - Acceptable air quality',
                3: 'Moderate - May cause breathing discomfort for sensitive people',
                4: 'Poor - May cause breathing discomfort to most people',
                5: 'Very Poor - May cause respiratory illness on prolonged exposure'
            };

            // Update the display
            let aqiText = '';
            let aqiClass = '';
            switch(aqi) {
                case 1:
                    aqiText = 'Good';
                    aqiClass = 'aqi-good';
                    break;
                case 2:
                    aqiText = 'Fair';
                    aqiClass = 'aqi-fair';
                    break;
                case 3:
                    aqiText = 'Moderate';
                    aqiClass = 'aqi-moderate';
                    break;
                case 4:
                    aqiText = 'Poor';
                    aqiClass = 'aqi-poor';
                    break;
                case 5:
                    aqiText = 'Very Poor';
                    aqiClass = 'aqi-very-poor';
                    break;
            }

            airQualityElement.textContent = aqiText;
            airQualityElement.className = aqiClass;
            modalAirQualityElement.textContent = `${aqiText} (${aqi})`;
            aqiDescriptionElement.textContent = aqiDescriptions[aqi];
            
        } catch (error) {
            console.error('Error fetching air quality data:', error);
            document.getElementById('air-quality').textContent = 'Unavailable';
        }
    }

    // Add this function after getAirQuality
    function updateModals(data) {
        const unit = localStorage.getItem('tempUnit') || 'celsius';
        
        // Update Actual Temperature Modal
        const modalActualTemp = document.getElementById('modal-actual-temp');
        if (modalActualTemp) {
            if (unit === 'fahrenheit') {
                modalActualTemp.textContent = Math.round(celsiusToFahrenheit(originalActualTemp));
            } else {
                modalActualTemp.textContent = Math.round(originalActualTemp);
            }
        }

        // Update Humidity Modal
        const modalHumidity = document.getElementById('modal-humidity');
        if (modalHumidity) {
            const humidityLevel = data.main.humidity;
            const humidityDesc = getHumidityDescription(humidityLevel);
            modalHumidity.innerHTML = `
                <div class="current-humidity-info">
                    <div class="humidity-level">${humidityLevel}%</div>
                    <div class="humidity-description">${humidityDesc}</div>
                </div>
            `;

            // Highlight current humidity category
            document.querySelectorAll('.humidity-category').forEach(category => {
                category.classList.remove('current');
                const range = category.textContent.split(':')[0];
                const [min, max] = range.split('-').map(num => parseInt(num.replace(/[^0-9]/g, '')));
                if (humidityLevel >= min && humidityLevel <= (max || 100)) {
                    category.classList.add('current');
                }
            });
        }

        // Update Wind Modal
        const modalWind = document.getElementById('modal-wind');
        if (modalWind) {
            const windSpeedKmh = Math.round(data.wind.speed * 3.6);
            const windDesc = getWindDescription(windSpeedKmh);
            const speedDisplay = getSpeedWithUnit(windSpeedKmh);
            
            modalWind.innerHTML = `
                <div class="current-wind-info">
                    <div class="wind-speed">${speedDisplay}</div>
                    <div class="wind-description">${windDesc}</div>
                </div>
            `;

            // Update wind categories with the correct unit
            const speedUnit = localStorage.getItem('speedUnit') || 'kilometers';
            document.querySelectorAll('.wind-category').forEach(category => {
                category.classList.remove('current');
                const categoryText = category.textContent;
                const [speedRange, description] = categoryText.split(':');
                
                // Extract the numbers from the range
                const [min, max] = speedRange.split('-').map(num => {
                    return parseInt(num.replace(/[^0-9]/g, '')) || 999;
                });

                // Convert speeds if necessary
                let displayMin = min;
                let displayMax = max;
                if (speedUnit === 'miles') {
                    displayMin = Math.round(kmhToMph(min));
                    displayMax = max === 999 ? 999 : Math.round(kmhToMph(max));
                }

                // Update the category text with the correct unit
                const unitText = speedUnit === 'miles' ? 'mph' : 'km/h';
                const newSpeedRange = displayMax === 999 ? 
                    `>${displayMin} ${unitText}` : 
                    `${displayMin}-${displayMax} ${unitText}`;
                
                category.textContent = `${newSpeedRange}:${description}`;

                // Highlight the current category
                const currentSpeed = speedUnit === 'miles' ? kmhToMph(windSpeedKmh) : windSpeedKmh;
                if (currentSpeed >= displayMin && currentSpeed <= displayMax) {
                    category.classList.add('current');
                }
            });
        }

        // Update Feels Like Modal
        const modalFeelsLike = document.getElementById('modal-feels-like');
        if (modalFeelsLike) {
            if (unit === 'fahrenheit') {
                modalFeelsLike.textContent = Math.round(celsiusToFahrenheit(originalFeelsLike));
            } else {
                modalFeelsLike.textContent = Math.round(originalFeelsLike);
            }
        }
    }

    // Function to toggle settings panel
    function toggleSettings() {
        settingsPanel.classList.toggle('active');
        settingsOverlay.classList.toggle('active');
    }

    // Function to load theme
    function loadTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        document.querySelector(`input[value="${savedTheme}"]`).checked = true;
    }

    // Function to save theme
    function saveTheme(theme) {
        localStorage.setItem('theme', theme);
        document.documentElement.setAttribute('data-theme', theme);
    }

    // Event listeners for settings panel
    settingsToggle.addEventListener('click', toggleSettings);
    closeSettings.addEventListener('click', toggleSettings);
    settingsOverlay.addEventListener('click', toggleSettings);

    // Event listeners for theme changes
    themeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            saveTheme(e.target.value);
        });
    });

    // Load theme on startup
    loadTheme();

    // Initialize
    loadSettings();
    updateDate();
    
    // Add event listeners
    if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', saveSettings);
    }
    
    // Add event listeners for all radio buttons
    document.querySelectorAll('input[name="tempUnit"], input[name="theme"]').forEach(radio => {
        radio.addEventListener('change', saveSettings);
    });

    // Remove the old theme radio event listeners since they're now handled by saveSettings
    themeRadios.forEach(radio => {
        radio.removeEventListener('change', (e) => {
            saveTheme(e.target.value);
        });
    });

    // Start getting location
    cityElement.textContent = 'Requesting location access...';
    getUserLocation();

    // Set up automatic updates
    setInterval(() => {
        const savedLocation = getSavedLocation();
        if (savedLocation) {
            getWeatherData(savedLocation.latitude, savedLocation.longitude);
        }
    }, 30 * 60 * 1000);

    // Add this function to fetch forecast data
    async function getForecastData(lat, lon) {
        try {
            // Get current time
            const currentTime = Math.floor(Date.now() / 1000);
            
            const response = await fetch(
                `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`
            );
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Filter and process forecast data to get next 24 hours
            const next24Hours = data.list.filter(item => item.dt > currentTime)
                                        .slice(0, 8); // API returns data in 3-hour intervals
            
            updateForecastDisplay(next24Hours);
        } catch (error) {
            console.error('Error fetching forecast data:', error);
        }
    }

    // Update the forecast display function
    function updateForecastDisplay(forecastList) {
        const hourlyForecast = document.getElementById('hourlyForecast');
        const detailedForecast = document.getElementById('detailedForecast');
        const unit = localStorage.getItem('tempUnit') || 'celsius';
        
        // Clear existing content
        hourlyForecast.innerHTML = '';
        detailedForecast.innerHTML = '';
        
        // Get current hour
        const currentHour = new Date().getHours();
        
        // Create an array of 24 hours starting from current hour
        const hours = Array.from({length: 24}, (_, i) => (currentHour + i) % 24);
        
        // Calculate temperature for each hour using linear interpolation
        hours.forEach((hour, index) => {
            // Find the closest forecast entries
            const forecastIndex = Math.floor(index / 3);
            const forecast = forecastList[forecastIndex];
            
            if (!forecast) return;

            const temp = unit === 'fahrenheit' ? 
                Math.round(celsiusToFahrenheit(forecast.main.temp)) :
                Math.round(forecast.main.temp);
            
            const weatherIcon = getWeatherIcon(forecast.weather[0].icon);
            
            // Convert hour to 12-hour format with AM/PM
            let displayHour = hour % 12;
            displayHour = displayHour === 0 ? 12 : displayHour; // Convert 0 to 12
            const ampm = hour >= 12 ? 'PM' : 'AM';
            const timeString = `${displayHour}${ampm}`;
            
            // Add hour item to the horizontal scroll
            hourlyForecast.innerHTML += `
                <div class="hour-item">
                    <div class="time">${timeString}</div>
                    <i class="weather-icon ${weatherIcon}"></i>
                    <div class="temp">${temp}°${unit === 'fahrenheit' ? 'F' : 'C'}</div>
                </div>
            `;
            
            // Add detailed item to the modal
            if (index % 3 === 0) { // Show every 3 hours in detailed view
                detailedForecast.innerHTML += `
                    <div class="forecast-detail-item">
                        <div class="detail-header">${timeString}</div>
                        <i class="detail-icon ${weatherIcon}"></i>
                        <div class="detail-info">
                            <p>Temperature: ${temp}°${unit === 'fahrenheit' ? 'F' : 'C'}</p>
                            <p>Humidity: ${forecast.main.humidity}%</p>
                            <p>Wind: ${Math.round(forecast.wind.speed * 3.6)} km/h</p>
                            <p>${forecast.weather[0].description}</p>
                            <p>Feels Like: ${unit === 'fahrenheit' ? 
                                Math.round(celsiusToFahrenheit(forecast.main.feels_like)) :
                                Math.round(forecast.main.feels_like)}°${unit === 'fahrenheit' ? 'F' : 'C'}</p>
                        </div>
                    </div>
                `;
            }
        });
    }

    // Add this helper function to get weather icons
    function getWeatherIcon(iconCode) {
        const iconMap = {
            '01d': 'fas fa-sun',
            '01n': 'fas fa-moon',
            '02d': 'fas fa-cloud-sun',
            '02n': 'fas fa-cloud-moon',
            '03d': 'fas fa-cloud',
            '03n': 'fas fa-cloud',
            '04d': 'fas fa-cloud',
            '04n': 'fas fa-cloud',
            '09d': 'fas fa-cloud-rain',
            '09n': 'fas fa-cloud-rain',
            '10d': 'fas fa-cloud-sun-rain',
            '10n': 'fas fa-cloud-moon-rain',
            '11d': 'fas fa-bolt',
            '11n': 'fas fa-bolt',
            '13d': 'fas fa-snowflake',
            '13n': 'fas fa-snowflake',
            '50d': 'fas fa-smog',
            '50n': 'fas fa-smog'
        };
        return iconMap[iconCode] || 'fas fa-question';
    }

    // Add this function to fetch 10-day forecast data
    async function getTenDayForecast(lat, lon) {
        try {
            const response = await fetch(
                `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`
            );
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Process the 5-day forecast data
            const dailyForecasts = processDailyForecasts(data.list);
            updateDailyForecastDisplay(dailyForecasts);
        } catch (error) {
            console.error('Error fetching forecast data:', error);
        }
    }

    // Add this function to process forecast data into daily format
    function processDailyForecasts(forecastList) {
        const dailyData = {};
        
        forecastList.forEach(item => {
            const date = new Date(item.dt * 1000).toLocaleDateString();
            
            if (!dailyData[date]) {
                dailyData[date] = {
                    date: new Date(item.dt * 1000),
                    temps: [],
                    humidity: [],
                    wind: [],
                    weather: item.weather[0],
                    icon: item.weather[0].icon
                };
            }
            
            dailyData[date].temps.push(item.main.temp);
            dailyData[date].humidity.push(item.main.humidity);
            dailyData[date].wind.push(item.wind.speed);
        });
        
        // Convert to array and calculate min/max values
        return Object.values(dailyData).map(day => ({
            date: day.date,
            temp: {
                max: Math.max(...day.temps),
                min: Math.min(...day.temps)
            },
            humidity: Math.round(day.humidity.reduce((a, b) => a + b) / day.humidity.length),
            speed: Math.round(day.wind.reduce((a, b) => a + b) / day.wind.length),
            weather: day.weather,
            icon: day.icon
        }));
    }

    // Update the updateDailyForecastDisplay function
    function updateDailyForecastDisplay(forecastList) {
        const dailyForecast = document.getElementById('dailyForecast');
        const detailedDailyForecast = document.getElementById('detailedDailyForecast');
        const unit = localStorage.getItem('tempUnit') || 'celsius';
        
        // Clear existing content
        dailyForecast.innerHTML = '';
        detailedDailyForecast.innerHTML = '';
        
        forecastList.forEach((day) => {
            const maxTemp = unit === 'fahrenheit' ? 
                Math.round(celsiusToFahrenheit(day.temp.max)) :
                Math.round(day.temp.max);
            
            const minTemp = unit === 'fahrenheit' ? 
                Math.round(celsiusToFahrenheit(day.temp.min)) :
                Math.round(day.temp.min);
            
            const weatherIcon = getWeatherIcon(day.icon);
            const date = day.date;
            
            // Add day item to the horizontal scroll
            dailyForecast.innerHTML += `
                <div class="day-item">
                    <div class="day-name">${date.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                    <div class="date">${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                    <i class="weather-icon ${weatherIcon}"></i>
                    <div class="temp-range">
                        <span class="temp-high">${maxTemp}°</span>
                        <span class="temp-low">${minTemp}°</span>
                    </div>
                </div>
            `;
            
            // Add detailed item to the modal
            detailedDailyForecast.innerHTML += `
                <div class="daily-detail-item">
                    <div class="daily-detail-date">
                        <h4>${date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</h4>
                    </div>
                    <div class="daily-detail-temps">
                        <p>High: ${maxTemp}°${unit === 'fahrenheit' ? 'F' : 'C'}</p>
                        <p>Low: ${minTemp}°${unit === 'fahrenheit' ? 'F' : 'C'}</p>
                    </div>
                    <div class="daily-detail-info">
                        <p>Humidity: ${day.humidity}%</p>
                        <p>Wind: ${getSpeedWithUnit(day.speed * 3.6)}</p>
                        <p>${day.weather.description}</p>
                    </div>
                </div>
            `;
        });
    }

    // Add the geocoding function
    async function searchLocations(query) {
        try {
            const response = await fetch(
                `https://api.openweathermap.org/geo/1.0/direct?q=${query}&limit=5&appid=${API_KEY}`
            );
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error searching locations:', error);
            return [];
        }
    }

    // Add the search results display function
    function displaySearchResults(results) {
        searchResults.innerHTML = '';
        const pins = JSON.parse(localStorage.getItem('pinnedLocations')) || [];
        
        if (results.length > 0) {
            results.forEach(result => {
                const resultItem = document.createElement('div');
                resultItem.className = 'search-result-item';
                
                let locationDetail = '';
                if (result.state) {
                    locationDetail = `${result.state}, ${result.country}`;
                } else {
                    locationDetail = result.country;
                }
                
                const isPinned = pins.some(pin => pin.lat === result.lat.toString() && pin.lon === result.lon.toString());
                
                resultItem.innerHTML = `
                    <div>
                        <i class="fas fa-map-marker-alt"></i>
                        <div class="location-name">${result.name}</div>
                        <div class="location-detail">${locationDetail}</div>
                    </div>
                    <button class="pin-button ${isPinned ? 'pinned' : ''}" title="${isPinned ? 'Unpin location' : 'Pin location'}">
                        <i class="fas fa-thumbtack"></i>
                    </button>
                `;
                
                const pinButton = resultItem.querySelector('.pin-button');
                pinButton.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const location = {
                        name: result.name,
                        detail: locationDetail,
                        lat: result.lat.toString(),
                        lon: result.lon.toString()
                    };
                    
                    if (isPinned) {
                        unpinLocation(location.lat, location.lon);
                        pinButton.classList.remove('pinned');
                    } else {
                        // Pin the location and update display
                        pinLocation(location);
                        pinButton.classList.add('pinned');
                        
                        // Close search results
                        searchResults.style.display = 'none';
                        
                        // Update search input with selected location
                        searchInput.value = `${result.name}, ${locationDetail}`;
                        
                        // Get weather data for the pinned location
                        getWeatherData(result.lat, result.lon);
                        
                        // Show confirmation toast
                        showToast(`${result.name} has been pinned to your locations`);
                    }
                });
                
                resultItem.addEventListener('click', () => {
                    getWeatherData(result.lat, result.lon);
                    searchResults.style.display = 'none';
                    searchInput.value = `${result.name}, ${locationDetail}`;
                });
                
                searchResults.appendChild(resultItem);
            });
            
            searchResults.style.display = 'block';
        } else {
            searchResults.style.display = 'none';
        }
    }

    // Add debounce function for search optimization
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

    // Add event listeners for search functionality
    searchInput.addEventListener('input', debounce(async (e) => {
        const query = e.target.value.trim();
        if (query.length >= 3) {
            const results = await searchLocations(query);
            displaySearchResults(results);
        } else {
            searchResults.style.display = 'none';
        }
    }, 300));

    searchButton.addEventListener('click', async () => {
        const query = searchInput.value.trim();
        if (query.length >= 3) {
            const results = await searchLocations(query);
            if (results.length > 0) {
                getWeatherData(results[0].lat, results[0].lon);
                searchResults.style.display = 'none';
            }
        }
    });

    // Close search results when clicking outside
    document.addEventListener('click', (e) => {
        if (!searchResults.contains(e.target) && !searchInput.contains(e.target)) {
            searchResults.style.display = 'none';
        }
    });

    // Add keyboard navigation for search results
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const firstResult = searchResults.querySelector('.search-result-item');
            if (firstResult) {
                firstResult.click();
            }
        }
    });

    // Add this function to get wind description
    function getWindDescription(speedKmh) {
        if (speedKmh < 2) return "Calm - Smoke rises vertically";
        if (speedKmh < 6) return "Light Air - Smoke drifts";
        if (speedKmh < 12) return "Light Breeze - Leaves rustle";
        if (speedKmh < 20) return "Gentle Breeze - Leaves in motion";
        if (speedKmh < 29) return "Moderate Breeze - Small branches move";
        if (speedKmh < 39) return "Fresh Breeze - Small trees sway";
        if (speedKmh < 50) return "Strong Breeze - Large branches move";
        if (speedKmh < 62) return "High Wind - Whole trees in motion";
        if (speedKmh < 75) return "Gale - Walking is difficult";
        if (speedKmh < 89) return "Strong Gale - Structural damage";
        return "Storm - Severe damage possible";
    }

    // Add this function to get humidity description
    function getHumidityDescription(humidity) {
        if (humidity < 30) return "Very Dry";
        if (humidity < 50) return "Comfortable";
        if (humidity < 70) return "Moderate";
        return "High";
    }

    // Add this event listener with your other listeners
    currentLocationButton.addEventListener('click', () => {
        // Clear the search input
        searchInput.value = '';
        // Get current location
        if (navigator.geolocation) {
            loadingElement.style.display = 'block';
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    getWeatherData(position.coords.latitude, position.coords.longitude);
                },
                (error) => {
                    console.error('Error getting location:', error);
                    loadingElement.style.display = 'none';
                    cityElement.textContent = 'Error getting location. Please try again.';
                }
            );
        } else {
            cityElement.textContent = 'Geolocation is not supported by your browser.';
        }
    });

    // Add this with your other event listeners in the DOMContentLoaded section
    document.querySelector('.navbar-brand').addEventListener('click', (e) => {
        e.preventDefault(); // Prevent default anchor behavior
        window.location.reload();
    });

    // Add conversion function
    function kmhToMph(kmh) {
        return kmh * 0.621371;
    }

    // Add function to get speed with unit
    function getSpeedWithUnit(speedKmh) {
        const speedUnit = localStorage.getItem('speedUnit') || 'kilometers';
        const speed = speedUnit === 'miles' ? kmhToMph(speedKmh) : speedKmh;
        return `${Math.round(speed)} ${speedUnit === 'miles' ? 'mph' : 'km/h'}`;
    }

    // Update the event listeners for speed unit radio buttons
    kilometersRadio.addEventListener('change', () => {
        localStorage.setItem('speedUnit', 'kilometers');
        settingsPanel.classList.remove('active');
        settingsOverlay.classList.remove('active');
        
        // Update displays with stored original value
        if (originalWindSpeed !== null) {
            const windSpeedKmh = Math.round(originalWindSpeed * 3.6);
            const windDesc = getWindDescription(windSpeedKmh);
            windElement.textContent = windDesc.split(' - ')[0];
            updateModals({ wind: { speed: originalWindSpeed } });
        }
    });

    milesRadio.addEventListener('change', () => {
        localStorage.setItem('speedUnit', 'miles');
        settingsPanel.classList.remove('active');
        settingsOverlay.classList.remove('active');
        
        // Update displays with stored original value
        if (originalWindSpeed !== null) {
            const windSpeedKmh = Math.round(originalWindSpeed * 3.6);
            const windDesc = getWindDescription(windSpeedKmh);
            windElement.textContent = windDesc.split(' - ')[0];
            updateModals({ wind: { speed: originalWindSpeed } });
        }
    });

    // Add this helper function to update all forecast displays
    function updateForecastDisplays() {
        const lat = localStorage.getItem('lat');
        const lon = localStorage.getItem('lon');
        if (lat && lon) {
            getForecastData(lat, lon);
            getTenDayForecast(lat, lon);
        }
    }

    // Initialize saved settings
    function initializeSettings() {
        // Initialize temperature unit
        const savedTempUnit = localStorage.getItem('tempUnit') || 'celsius';
        if (savedTempUnit === 'celsius') {
            celsiusRadio.checked = true;
        } else {
            fahrenheitRadio.checked = true;
        }

        // Initialize theme
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.querySelector(`input[name="theme"][value="${savedTheme}"]`).checked = true;
        document.documentElement.setAttribute('data-theme', savedTheme);

        // Initialize speed unit
        const savedSpeedUnit = localStorage.getItem('speedUnit') || 'kilometers';
        if (savedSpeedUnit === 'kilometers') {
            kilometersRadio.checked = true;
        } else {
            milesRadio.checked = true;
        }
    }

    // Call initialization function
    initializeSettings();

    // Add function to handle pinned locations
    function initializePinnedLocations() {
        // Get pinned locations from localStorage
        const pins = JSON.parse(localStorage.getItem('pinnedLocations')) || [];
        updatePinnedLocationsDisplay(pins);
    }

    function updatePinnedLocationsDisplay(pins) {
        if (pins.length === 0) {
            noPins.style.display = 'block';
            pinnedLocations.innerHTML = '';
            return;
        }

        noPins.style.display = 'none';
        pinnedLocations.innerHTML = pins.map(pin => `
            <div class="pinned-location" data-lat="${pin.lat}" data-lon="${pin.lon}">
                <div class="pinned-location-info">
                    <div class="pinned-location-name">${pin.name}</div>
                    <div class="pinned-location-detail">${pin.detail}</div>
                </div>
                <button class="unpin-button" data-lat="${pin.lat}" data-lon="${pin.lon}">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `).join('');

        // Add click handlers
        document.querySelectorAll('.pinned-location').forEach(location => {
            location.addEventListener('click', (e) => {
                if (!e.target.closest('.unpin-button')) {
                    const lat = location.dataset.lat;
                    const lon = location.dataset.lon;
                    getWeatherData(lat, lon);
                    pinsPanel.classList.remove('active');
                    pinsOverlay.classList.remove('active');
                }
            });
        });

        document.querySelectorAll('.unpin-button').forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const lat = button.dataset.lat;
                const lon = button.dataset.lon;
                unpinLocation(lat, lon);
            });
        });
    }

    function pinLocation(location) {
        const pins = JSON.parse(localStorage.getItem('pinnedLocations')) || [];
        const exists = pins.some(pin => pin.lat === location.lat && pin.lon === location.lon);
        
        if (!exists) {
            pins.push(location);
            localStorage.setItem('pinnedLocations', JSON.stringify(pins));
            updatePinnedLocationsDisplay(pins);
        }
    }

    function unpinLocation(lat, lon) {
        const pins = JSON.parse(localStorage.getItem('pinnedLocations')) || [];
        const filtered = pins.filter(pin => pin.lat !== lat || pin.lon !== lon);
        localStorage.setItem('pinnedLocations', JSON.stringify(filtered));
        updatePinnedLocationsDisplay(filtered);
    }

    // Add event listeners for pins panel
    pinsToggle.addEventListener('click', () => {
        pinsPanel.classList.add('active');
        pinsOverlay.classList.add('active');
    });

    closePins.addEventListener('click', () => {
        pinsPanel.classList.remove('active');
        pinsOverlay.classList.remove('active');
    });

    pinsOverlay.addEventListener('click', () => {
        pinsPanel.classList.remove('active');
        pinsOverlay.classList.remove('active');
    });

    // Initialize pinned locations
    initializePinnedLocations();

    // Add this function to show a toast notification
    function showToast(message) {
        // Create toast element
        const toast = document.createElement('div');
        toast.className = 'toast-notification';
        toast.textContent = message;
        
        // Add toast to the document
        document.body.appendChild(toast);
        
        // Trigger animation
        setTimeout(() => toast.classList.add('show'), 100);
        
        // Remove toast after animation
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
});
