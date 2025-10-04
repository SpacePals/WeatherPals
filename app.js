document.addEventListener('DOMContentLoaded', function() {
    // Initialize tab system
    initializeTabs();
    const API_KEY = '6efef74b7ebb46e8a2185624250410';
    
    // Scroll to top button functionality
    const scrollToTopButton = document.getElementById('scrollToTop');
    
    // Show/hide scroll to top button based on scroll position
    window.addEventListener('scroll', () => {
        if (window.pageYOffset > 300) { // Show button after scrolling 300px
            scrollToTopButton.classList.add('visible');
        } else {
            scrollToTopButton.classList.remove('visible');
        }
    });
    
    // Scroll to top when button is clicked
    scrollToTopButton.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
    
    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId === '#') return; // Skip if href is just "#"
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
    
    // Get DOM elements
    const locationInput = document.getElementById('location-search');
    const dateInput = document.getElementById('weather-date');
    const timeInput = document.getElementById('weather-time');
    const searchBtn = document.getElementById('search-btn');
    const selectedLocation = document.getElementById('selected-location');

    // Set default date to today
    const today = new Date();
    dateInput.valueAsDate = today;

    // Set default time to current time (rounded to nearest hour)
    const now = new Date();
    now.setMinutes(0);
    timeInput.value = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });

    async function fetchWeatherData(location, date, time) {
        // Calculate if we need forecast or history based on the date
        const selectedDate = new Date(date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        selectedDate.setHours(0, 0, 0, 0);

        let apiUrl;
        const baseUrl = 'https://api.weatherapi.com/v1';

        if (selectedDate.getTime() === today.getTime()) {
            // Current weather
            apiUrl = `${baseUrl}/current.json?key=${API_KEY}&q=${encodeURIComponent(location)}`;
        } else if (selectedDate.getTime() < today.getTime()) {
            // Historical weather
            const formattedDate = date.split('-').join('');
            apiUrl = `${baseUrl}/history.json?key=${API_KEY}&q=${encodeURIComponent(location)}&dt=${formattedDate}`;
        } else {
            // Forecast weather
            apiUrl = `${baseUrl}/forecast.json?key=${API_KEY}&q=${encodeURIComponent(location)}&dt=${date}`;
        }

        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error('Weather data fetch failed');
        }
        return await response.json();
    }

    // Initialize tab system
    function initializeTabs() {
        const tabButtons = document.querySelectorAll('.tab-button');
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                // Remove active class from all buttons and contents
                tabButtons.forEach(btn => btn.classList.remove('active', 'text-blue-600', 'border-b-2', 'border-blue-600'));
                document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
                
                // Add active class to clicked button and its content
                button.classList.add('active', 'text-blue-600', 'border-b-2', 'border-blue-600');
                const tabId = button.getAttribute('data-tab');
                document.getElementById(`${tabId}-tab`).classList.add('active');
            });
        });
    }

    function displayActivityCard(activity) {
        return `
            <div class="bg-white rounded-lg p-3 shadow-sm">
                <div class="flex items-center mb-2">
                    <span class="text-2xl mr-2">${activity.icon}</span>
                    <h4 class="font-bold">${activity.name}</h4>
                </div>
                <p class="text-sm text-gray-600">${activity.description}</p>
                <div class="mt-2 text-xs text-gray-500">
                    <span class="mr-2">🕒 ${activity.duration}</span>
                    <span>💪 ${activity.intensity}</span>
                </div>
            </div>
        `;
    }

    function displayWeatherData(weatherData, date, time) {
        const weatherResults = document.getElementById('weather-results');
        const temperatureData = document.getElementById('temperature-data');
        const windData = document.getElementById('wind-data');
        const humidityData = document.getElementById('humidity-data');
        
        let currentData;
        if (weatherData.current) {
            currentData = weatherData.current;
        } else if (weatherData.forecast) {
            const forecast = weatherData.forecast.forecastday[0].hour;
            let targetHour = 12; // Default to noon if no time specified
            if (time) {
                targetHour = parseInt(time.split(':')[0]);
            }
            currentData = forecast[targetHour];
        }
        
        if (currentData) {
            // Temperature Box
            temperatureData.innerHTML = `
                <div class="mb-1">${currentData.temp_c}°C / ${currentData.temp_f}°F</div>
                <div class="text-sm text-gray-600">Feels like: ${currentData.feelslike_c}°C / ${currentData.feelslike_f}°F</div>
                <div class="mt-2 text-sm font-medium">${currentData.condition.text}</div>
            `;

            // Wind Box
            windData.innerHTML = `
                <div class="mb-1">${currentData.wind_kph} km/h</div>
                <div class="text-sm">Direction: ${currentData.wind_dir}</div>
            `;

            // Humidity Box
            humidityData.innerHTML = `
                <div class="mb-1">${currentData.humidity}%</div>
                <div class="text-sm">${getHumidityDescription(currentData.humidity)}</div>
                ${weatherData.forecast ? `<div class="mt-2 text-sm">Chance of Rain: ${currentData.chance_of_rain}%</div>` : ''}
            `;

            // Display activities
            const activityRecommender = new ActivityRecommender(currentData);
            const recommendations = activityRecommender.getRecommendations();
            
            const outdoorList = document.getElementById('outdoor-activities-list');
            const indoorList = document.getElementById('indoor-activities-list');
            const sportsList = document.getElementById('sports-activities-list');
            
            outdoorList.innerHTML = recommendations.outdoor.map(displayActivityCard).join('') || '<p class="text-gray-500">No outdoor activities recommended at this time.</p>';
            indoorList.innerHTML = recommendations.indoor.map(displayActivityCard).join('') || '<p class="text-gray-500">No indoor activities recommended at this time.</p>';
            sportsList.innerHTML = recommendations.sports.map(displayActivityCard).join('') || '<p class="text-gray-500">No sports activities recommended at this time.</p>';
        }

        // Show the weather results container
        weatherResults.style.display = 'grid';
        
        // Reset and trigger animations
        const weatherBoxes = document.querySelectorAll('.weather-box');
        weatherBoxes.forEach(box => {
            box.classList.remove('animate');
            // Force a reflow to restart the animation
            void box.offsetWidth;
            box.classList.add('animate');
        });
        
        selectedLocation.classList.remove('text-red-600');
    }

    // Helper function to get humidity description
    function getHumidityDescription(humidity) {
        if (humidity < 30) return 'Very Dry';
        if (humidity < 50) return 'Comfortable';
        if (humidity < 70) return 'Moderate';
        return 'Humid';
    }

    searchBtn.addEventListener('click', async function() {
        const location = locationInput.value;
        const date = dateInput.value;
        const time = timeInput.value;

        if (!location) {
            selectedLocation.textContent = 'Please enter a location';
            selectedLocation.classList.add('text-red-600');
            return;
        }

        // Reset error styling
        selectedLocation.classList.remove('text-red-600');
        selectedLocation.textContent = 'Loading weather data...';

        try {
            const weatherData = await fetchWeatherData(location, date, time);
            displayWeatherData(weatherData, date, time);
        } catch (error) {
            selectedLocation.textContent = 'Error fetching weather data. Please try again.';
            selectedLocation.classList.add('text-red-600');
            console.error('Weather API Error:', error);
        }
    });

    // Add event listener for Enter key in the location input
    locationInput.addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            searchBtn.click();
        }
    });
});
