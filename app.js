// Scroll to top button functionality
const scrollToTopButton = document.getElementById('scrollToTop');

window.addEventListener('scroll', () => {
    if (window.pageYOffset > 300) {
        scrollToTopButton.classList.add('visible');
    } else {
        scrollToTopButton.classList.remove('visible');
    }
});

scrollToTopButton.addEventListener('click', () => {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
});

// State management
let selectedEvent = null;
let selectedLocation = { lat: null, lng: null, name: '' };
let currentMarker = null;

// Set default date/time to tomorrow at noon
function setDefaultDateTime() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(12, 0, 0, 0);
    
    const dateInput = document.getElementById('event-date');
    const timeInput = document.getElementById('event-time');
    
    if (dateInput && timeInput) {
        dateInput.valueAsDate = tomorrow;
        timeInput.value = '12:00';
        
        // Set min date to today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        dateInput.min = today.toISOString().split('T')[0];
        
        // Set max date to 15 days from now
        const maxDate = new Date();
        maxDate.setDate(maxDate.getDate() + 15);
        dateInput.max = maxDate.toISOString().split('T')[0];
    }
}

// Validate date selection
function validateDate() {
    const dateInput = document.getElementById('event-date');
    if (!dateInput || !dateInput.value) return true;
    
    const selectedDate = new Date(dateInput.value);
    selectedDate.setHours(0, 0, 0, 0);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 15);
    maxDate.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
        alert('⚠️ Cannot select a past date. Please choose today or a future date.');
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        dateInput.valueAsDate = tomorrow;
        return false;
    }
    
    if (selectedDate > maxDate) {
        alert('⚠️ Weather forecast is only available up to 15 days in advance. Please select a date within the next 15 days.');
        dateInput.valueAsDate = maxDate;
        return false;
    }
    
    return true;
}

// Initialize Mapbox
mapboxgl.accessToken = 'pk.eyJ1IjoibWFhemluYWx0aGFmIiwiYSI6ImNtZ2NhdzVwNjE4d2Iya3IwZXhwa3RtajMifQ.bbzlFHtKRT6QtwCGsVRqMA';

let map;

try {
    map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/satellite-streets-v12',
        center: [0, 0],
        zoom: 2
    });

    map.on('load', () => {
        console.log('Map loaded successfully');
        setDefaultDateTime();
        
        // Add date validation listener
        const dateInput = document.getElementById('event-date');
        if (dateInput) {
            dateInput.addEventListener('change', validateDate);
            dateInput.addEventListener('blur', validateDate);
        }
    });

    map.on('error', (e) => {
        console.error('Mapbox error:', e);
        document.getElementById('map').innerHTML = `
            <div class="flex items-center justify-center h-full bg-gray-100 rounded-2xl">
                <div class="text-center p-6">
                    <p class="text-red-500 font-bold mb-2">Map failed to load</p>
                    <p class="text-gray-600">Please check your Mapbox access token</p>
                </div>
            </div>
        `;
    });

    map.addControl(new mapboxgl.NavigationControl());

    // Function to update location
    function updateLocation(lng, lat, locationName = '') {
        if (currentMarker) currentMarker.remove();
        
        currentMarker = new mapboxgl.Marker({ color: '#3B82F6' })
            .setLngLat([lng, lat])
            .addTo(map);
        
        map.flyTo({ center: [lng, lat], zoom: 12, duration: 2000 });
        
        selectedLocation = { lat, lng, name: locationName };
        
        const displayText = locationName 
            ? `${locationName}`
            : `${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E`;
        
        // Update search input to show coordinates
        document.getElementById('location-search').value = displayText;
        
        new mapboxgl.Popup()
            .setLngLat([lng, lat])
            .setHTML(`<p class="font-poppins"><strong>Selected Location</strong><br>${displayText}</p>`)
            .addTo(map);
        
        updateAnalyzeButton();
    }

    // Search functionality
    document.getElementById('search-btn').addEventListener('click', async () => {
        const searchInput = document.getElementById('location-search').value.trim();
        if (!searchInput) {
            alert('Please enter a location');
            return;
        }
        
        console.log('Searching for:', searchInput);
        
        const coordPattern = /^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/;
        const coordMatch = searchInput.match(coordPattern);
        
        if (coordMatch) {
            const lat = parseFloat(coordMatch[1]);
            const lng = parseFloat(coordMatch[2]);
            
            // Validate coordinates
            if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
                alert('Invalid coordinates. Latitude must be between -90 and 90, longitude between -180 and 180.');
                return;
            }
            
            updateLocation(lng, lat);
        } else {
            try {
                const geocodeUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchInput)}.json?access_token=${mapboxgl.accessToken}`;
                console.log('Geocoding URL:', geocodeUrl);
                
                const response = await fetch(geocodeUrl);
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const data = await response.json();
                console.log('Geocoding response:', data);
                
                if (data.features && data.features.length > 0) {
                    const [lng, lat] = data.features[0].center;
                    const placeName = data.features[0].place_name;
                    updateLocation(lng, lat, placeName);
                } else {
                    alert('Location not found. Please try another search term.');
                }
            } catch (error) {
                console.error('Geocoding error:', error);
                alert('Error searching for location. Please check your internet connection and try again.');
            }
        }
    });

    document.getElementById('location-search').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') document.getElementById('search-btn').click();
    });

    map.on('click', (e) => {
        updateLocation(e.lngLat.lng, e.lngLat.lat);
    });

} catch (error) {
    console.error('Failed to initialize map:', error);
    document.getElementById('map').innerHTML = `
        <div class="flex items-center justify-center h-full bg-gray-100 rounded-2xl">
            <div class="text-center p-6">
                <p class="text-red-500 font-bold mb-2">Map failed to load</p>
                <p class="text-gray-600">Please check your Mapbox access token</p>
            </div>
        </div>
    `;
}

// Event type selection
document.querySelectorAll('.event-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.event-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        selectedEvent = this.dataset.event;
        updateAnalyzeButton();
    });
});

function updateAnalyzeButton() {
    const analyzeBtn = document.getElementById('analyze-btn');
    analyzeBtn.disabled = !(selectedEvent && selectedLocation.lat && selectedLocation.lng);
}

// Weather analysis with future forecast
document.getElementById('analyze-btn').addEventListener('click', async () => {
    // Validate date before proceeding
    if (!validateDate()) {
        return;
    }
    
    document.getElementById('results').classList.remove('hidden');
    document.getElementById('loading').classList.remove('hidden');
    document.getElementById('weather-results').classList.add('hidden');
    
    setTimeout(() => {
        document.getElementById('results').scrollIntoView({ behavior: 'smooth' });
    }, 100);

    try {
        const { lat, lng } = selectedLocation;
        
        // Get selected date and time
        const dateInput = document.getElementById('event-date');
        const timeInput = document.getElementById('event-time');
        
        let targetDateTime;
        if (dateInput.value && timeInput.value) {
            targetDateTime = new Date(`${dateInput.value}T${timeInput.value}`);
        } else {
            // Default to tomorrow at noon
            targetDateTime = new Date();
            targetDateTime.setDate(targetDateTime.getDate() + 1);
            targetDateTime.setHours(12, 0, 0, 0);
        }
        
        // Double-check date is within valid range
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const maxDate = new Date();
        maxDate.setDate(maxDate.getDate() + 15);
        
        if (targetDateTime < today) {
            alert('⚠️ Cannot analyze weather for past dates. Please select a current or future date.');
            document.getElementById('loading').classList.add('hidden');
            return;
        }
        
        if (targetDateTime > maxDate) {
            alert('⚠️ Weather forecast is only available up to 15 days in advance.');
            document.getElementById('loading').classList.add('hidden');
            return;
        }
        
        // Format date for API (YYYY-MM-DD)
        const startDate = targetDateTime.toISOString().split('T')[0];
        const endDate = startDate; // Same day
        
        // Fetch hourly forecast data with precipitation probability
        const response = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&hourly=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation_probability,precipitation,rain,showers,snowfall,weather_code,cloud_cover,wind_speed_10m,wind_gusts_10m&start_date=${startDate}&end_date=${endDate}&timezone=auto`
        );
        
        if (!response.ok) {
            throw new Error(`Weather API error: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.hourly || !data.hourly.time) {
            throw new Error('Invalid weather data received');
        }
        
        // Find the closest hour to the selected time
        const targetHour = targetDateTime.getHours();
        const hourlyData = data.hourly;
        
        // Get the index for the target hour
        const targetIndex = hourlyData.time.findIndex(time => {
            const dt = new Date(time);
            return dt.getHours() === targetHour;
        });
        
        if (targetIndex === -1) {
            throw new Error('Could not find weather data for the selected time');
        }
        
        // Extract weather data for that specific hour
        const weatherAtTime = {
            temperature_2m: hourlyData.temperature_2m[targetIndex],
            apparent_temperature: hourlyData.apparent_temperature[targetIndex],
            precipitation_probability: hourlyData.precipitation_probability[targetIndex] || 0,
            precipitation: hourlyData.precipitation[targetIndex] || 0,
            rain: hourlyData.rain[targetIndex] || 0,
            showers: hourlyData.showers[targetIndex] || 0,
            snowfall: hourlyData.snowfall[targetIndex] || 0,
            weather_code: hourlyData.weather_code[targetIndex],
            cloud_cover: hourlyData.cloud_cover[targetIndex],
            wind_speed_10m: hourlyData.wind_speed_10m[targetIndex],
            wind_gusts_10m: hourlyData.wind_gusts_10m[targetIndex]
        };
        
        displayWeatherResults(weatherAtTime, targetDateTime);
    } catch (error) {
        console.error('Weather API error:', error);
        alert('Failed to fetch weather data. Please try again. Error: ' + error.message);
    } finally {
        document.getElementById('loading').classList.add('hidden');
    }
});

function displayWeatherResults(current, targetDateTime) {
    // Display basic weather data
    document.getElementById('temp-value').textContent = `${Math.round(current.temperature_2m)}°C`;
    document.getElementById('temp-feel').textContent = `Feels like ${Math.round(current.apparent_temperature)}°C`;
    
    latestWeatherData = current;
    latestTargetDateTime = targetDateTime;


    // Safely calculate total precipitation
    const precipTotal = 
        (current.precipitation ?? 0) + 
        (current.rain ?? 0) + 
        (current.showers ?? 0) + 
        (current.snowfall ?? 0);
    const precipProb = current.precipitation_probability ?? 0;
    const snowfall = current.snowfall ?? 0;
    
    // Show probability percentage as main value
    document.getElementById('precip-value').textContent = `${Math.round(precipProb)}%`;
    
    // Show detailed description with amount
    let precipDesc = 'No precipitation expected';
    
    if (snowfall > 0.1) {
        if (precipProb > 70) {
            precipDesc = `Snow likely (${precipTotal.toFixed(1)} mm, ${precipProb}% chance)`;
        } else {
            precipDesc = `Snow possible (${precipTotal.toFixed(1)} mm, ${precipProb}% chance)`;
        }
    } else if (precipProb > 70) {
        if (precipTotal > 2) {
            precipDesc = `Heavy rain likely (${precipTotal.toFixed(1)} mm)`;
        } else if (precipTotal > 0.5) {
            precipDesc = `Rain expected (${precipTotal.toFixed(1)} mm)`;
        } else {
            precipDesc = `Light rain likely (${precipTotal.toFixed(1)} mm)`;
        }
    } else if (precipProb > 40) {
        if (precipTotal > 0.1) {
            precipDesc = `Rain possible (${precipTotal.toFixed(1)} mm, ${precipProb}% chance)`;
        } else {
            precipDesc = `${precipProb}% chance of rain`;
        }
    } else if (precipProb > 20) {
        precipDesc = `Slight rain chance (${precipProb}%)`;
    } else if (precipTotal > 0.1) {
        precipDesc = `Trace precipitation (${precipTotal.toFixed(1)} mm)`;
    } else if (precipProb > 0) {
        precipDesc = `Minimal rain chance (${precipProb}%)`;
    }
    
    document.getElementById('precip-desc').textContent = precipDesc;
    
    document.getElementById('wind-value').textContent = `${Math.round(current.wind_speed_10m)} km/h`;
    document.getElementById('wind-desc').textContent = getWindDescription(current.wind_speed_10m);
    
    document.getElementById('cloud-value').textContent = `${Math.round(current.cloud_cover)}%`;
    document.getElementById('cloud-desc').textContent = getCloudDescription(current.cloud_cover);
    
    // Generate recommendation
    const recommendation = generateRecommendation(current, selectedEvent);
    
    latestRecommendation = recommendation;   

    // Format the date and time nicely
    const dateStr = targetDateTime.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    const timeStr = targetDateTime.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    document.getElementById('event-location-display').textContent = 
        `${getEventName(selectedEvent)} at ${selectedLocation.name || 'selected location'} on ${dateStr} at ${timeStr}`;
    
    const overallCard = document.getElementById('overall-recommendation');
    overallCard.className = `weather-card rounded-2xl p-8 shadow-xl mb-8 animate-slideUp recommendation-${recommendation.level}`;
    
    document.getElementById('recommendation-icon').textContent = recommendation.icon;
    document.getElementById('recommendation-title').textContent = recommendation.title;
    document.getElementById('recommendation-text').textContent = recommendation.summary;
    document.getElementById('recommendation-details').textContent = recommendation.details;
    
    // Display detailed advice
    const adviceContainer = document.getElementById('detailed-advice');
    adviceContainer.innerHTML = recommendation.advice.map(item => `
        <div class="flex items-start bg-gray-50 p-4 rounded-lg">
            <span class="text-2xl mr-4 mt-1">${item.icon}</span>
            <div>
                <h4 class="font-semibold text-gray-800 mb-1">${item.title}</h4>
                <p class="text-gray-600 text-sm">${item.text}</p>
            </div>
        </div>
    `).join('');
    
    document.getElementById('weather-results').classList.remove('hidden');
}

function generateRecommendation(weather, eventType) {
    const temp = weather.temperature_2m;
    const precip = (weather.precipitation || 0) + (weather.rain || 0) + (weather.showers || 0) + (weather.snowfall || 0);
    const precipProb = weather.precipitation_probability || 0;
    const wind = weather.wind_speed_10m;
    const clouds = weather.cloud_cover;
    
    let score = 100;
    let issues = [];
    let advice = [];
    
    // Temperature assessment based on defined ranges
    if (temp < 0) {
        // Challenging: Below 0°C
        score -= 75;
        issues.push('freezing temperatures');
        advice.push({
            icon: '❄️',
            title: 'Freezing Conditions',
            text: 'Extremely cold! Temperatures below freezing. Provide heated areas, warm clothing, hot beverages, and monitor for hypothermia risks.'
        });
    } else if (temp >= 0 && temp <= 5) {
        // Fair: 0°C - 5°C
        score -= 30;
        issues.push('very cold temperatures');
        advice.push({
            icon: '🧥',
            title: 'Very Cold Weather',
            text: 'Very cold conditions. Attendees should wear heavy winter clothing, and warm shelter should be available.'
        });
    } else if (temp > 5 && temp < 10) {
        // Between Fair and Good
        score -= 15;
        issues.push('cold temperatures');
        advice.push({
            icon: '🧥',
            title: 'Cold Weather',
            text: 'Cold temperatures. Attendees should dress warmly with jackets and layers.'
        });
    } else if (temp >= 10 && temp < 18) {
        // Good: 10°C - 17°C
        score -= 5;
        advice.push({
            icon: '🌡️',
            title: 'Cool & Comfortable',
            text: 'Cool but pleasant weather. Light jackets or sweaters recommended for comfort.'
        });
    } else if (temp >= 18 && temp <= 25) {
        // Excellent: 18°C - 25°C
        advice.push({
            icon: '✨',
            title: 'Perfect Temperature',
            text: 'Ideal temperature range! Comfortable conditions for outdoor activities.'
        });
    } else if (temp > 25 && temp <= 30) {
        // Good: 26°C - 30°C
        score -= 5;
        advice.push({
            icon: '☀️',
            title: 'Warm Weather',
            text: 'Warm and pleasant. Ensure water is available and consider providing shaded areas.'
        });
    } else if (temp > 30 && temp <= 36) {
        // Good: 31°C - 36°C
        score -= 10;
        issues.push('hot temperatures');
        advice.push({
            icon: '🌡️',
            title: 'Hot Weather',
            text: 'Hot conditions. Provide plenty of water, shade areas, and encourage sun protection.'
        });
    } else if (temp > 36 && temp <= 39) {
        // Fair: 36°C - 39°C
        score -= 40;
        issues.push('very hot temperatures');
        advice.push({
            icon: '🔥',
            title: 'Very Hot Weather',
            text: 'Very hot conditions! Essential to have abundant water, cooling stations, shaded areas, and medical support. Monitor attendees for heat exhaustion.'
        });s
    } else if (temp > 39 && temp <= 40) {
        // Approaching Challenging
        score -= 60;
        issues.push('extreme heat');
        advice.push({
            icon: '🔥',
            title: 'Extreme Heat',
            text: 'Dangerously hot! Strongly consider rescheduling. If proceeding, mandatory cooling stations, medical staff, and frequent hydration breaks required.'
        });
    } else if (temp > 40) {
        // Challenging: Above 40°C
        score -= 70;
        issues.push('dangerously hot temperatures');
        advice.push({
            icon: '⚠️',
            title: 'Dangerous Heat',
            text: 'Extreme heat danger! Temperatures above 40°C pose serious health risks. Strongly recommend postponing or moving event indoors with air conditioning.'
        });
    }
    
    // Precipitation assessment
    if (precip > 5 || precipProb > 80) {
        score -= 80;
        issues.push('heavy rain');
        advice.push({
            icon: '☔',
            title: 'Heavy Rain Expected',
            text: `Significant rainfall expected (${precipProb}% chance). Strong recommendation to have covered areas, provide rain gear, or consider postponement.`
        });
    } else if (precip > 1 || precipProb > 60) {
        score -= 60;
        issues.push('rain');
        advice.push({
            icon: '🌧️',
            title: 'Rain Expected',
            text: `Rain is likely (${precipProb}% chance). Set up tents or covered areas, and inform attendees to bring umbrellas and waterproof clothing.`
        });
    } else if (precip > 0.1 || precipProb > 30) {
        score -= 50;
        issues.push('light rain possible');
        advice.push({
            icon: '💧',
            title: 'Rain Possible',
            text: `There's a ${precipProb}% chance of rain. Have some covered areas ready and suggest attendees bring light rain gear just in case.`
        });
    } else if (precipProb > 15) {
        score -= 30;
        advice.push({
            icon: '🌤️',
            title: 'Slight Rain Chance',
            text: `Low chance of rain (${precipProb}%). Weather should be mostly dry, but keep an eye on conditions.`
        });
    }
    
    // Wind assessment
    if (wind > 40) {
        score -= 35;
        issues.push('very strong winds');
        advice.push({
            icon: '💨',
            title: 'Very Strong Winds',
            text: 'Dangerous wind conditions! Secure all equipment, decorations, and structures. Consider postponing outdoor activities.'
        });
    } else if (wind > 25) {
        score -= 20;
        issues.push('strong winds');
        advice.push({
            icon: '🌬️',
            title: 'Strong Winds',
            text: 'Windy conditions. Secure tents, decorations, and loose items. Avoid large inflatables or unstable structures.'
        });
    } else if (wind > 15) {
        score -= 10;
        issues.push('moderate winds');
        advice.push({
            icon: '🍃',
            title: 'Moderate Winds',
            text: 'Moderate winds expected. Secure light decorations and ensure structures are properly anchored.'
        });
    }
    
    // Cloud cover assessment
    if (clouds > 80) {
        advice.push({
            icon: '☁️',
            title: 'Overcast',
            text: 'Mostly cloudy skies. Good for outdoor photos without harsh shadows, but natural lighting will be limited.'
        });
    } else if (clouds < 30) {
        advice.push({
            icon: '☀️',
            title: 'Clear Skies',
            text: 'Mostly clear skies! Great visibility and natural lighting. Remember sun protection for attendees.'
        });
    }
    
    // Event-specific advice
    const eventSpecificAdvice = getEventSpecificAdvice(eventType, weather);
    advice.push(...eventSpecificAdvice);
    
    // Determine overall recommendation
    let level, icon, title, summary, details;
    
    if (score >= 80) {
        level = 'excellent';
        icon = '🎉';
        title = 'Excellent Conditions!';
        summary = `Perfect weather for your ${getEventName(eventType).toLowerCase()}!`;
        details = 'Weather conditions are ideal. Your event should go smoothly with minimal weather-related concerns.';
    } else if (score >= 60) {
        level = 'good';
        icon = '👍';
        title = 'Good Conditions';
        summary = `Generally favorable weather for your ${getEventName(eventType).toLowerCase()}.`;
        details = issues.length > 0 
            ? `Minor concerns: ${issues.join(', ')}. With proper preparation, your event should proceed well.`
            : 'Weather should be manageable with standard preparations.';
    } else if (score >= 40) {
        level = 'fair';
        icon = '⚠️';
        title = 'Fair Conditions';
        summary = `Weather may present some challenges for your ${getEventName(eventType).toLowerCase()}.`;
        details = `Concerns: ${issues.join(', ')}. Extra precautions recommended. Have backup plans ready.`;
    } else if (score < 40) {
        level = 'poor';
        icon = '❌';
        title = 'Challenging Conditions';
        summary = `Weather conditions are not ideal for your ${getEventName(eventType).toLowerCase()}.`;
        details = `Significant concerns: ${issues.join(', ')}. Strongly consider rescheduling or moving indoors if possible.`;
    }
    
    return { level, icon, title, summary, details, advice, score };
}

function getEventSpecificAdvice(eventType, weather) {
    const advice = [];
    const temp = weather.temperature_2m;
    const precip = (weather.precipitation || 0) + (weather.rain || 0) + (weather.showers || 0) + (weather.snowfall || 0);
    const precipProb = weather.precipitation_probability || 0;
    const wind = weather.wind_speed_10m;
    
    switch(eventType) {
        case 'parade':
            if (precip > 0.5 || precipProb > 40) {
                advice.push({
                    icon: '🎊',
                    title: 'Parade Specific',
                    text: `Rain may affect floats and costumes (${precipProb}% chance). Consider waterproof coverings for electronics and decorations.`
                });
            }
            if (wind > 20) {
                advice.push({
                    icon: '🎈',
                    title: 'Parade Specific',
                    text: 'High winds can make balloons and banners difficult to control. Have extra handlers ready.'
                });
            }
            break;
            
        case 'concert':
            if (temp > 25) {
                advice.push({
                    icon: '🎵',
                    title: 'Concert Specific',
                    text: 'Hot weather and crowds can be challenging. Ensure adequate water stations and medical staff presence.'
                });
            }
            if (precip > 0 || precipProb > 30) {
                advice.push({
                    icon: '🎸',
                    title: 'Concert Specific',
                    text: `Protect all electrical equipment (${precipProb}% rain chance). Have tarps and covers ready for instruments and sound systems.`
                });
            }
            break;
            
        case 'sports':
            if (temp > 28) {
                advice.push({
                    icon: '⚽',
                    title: 'Sports Specific',
                    text: 'High heat increases risk of heat exhaustion. Schedule water breaks and have cooling stations available.'
                });
            }
            if (precip > 2) {
                advice.push({
                    icon: '🏃',
                    title: 'Sports Specific',
                    text: 'Wet conditions create slippery surfaces. Consider field conditions and player safety carefully.'
                });
            }
            break;
            
        case 'picnic':
            if (wind > 15) {
                advice.push({
                    icon: '🧺',
                    title: 'Picnic Specific',
                    text: 'Wind can scatter lightweight items. Bring weights for tablecloths and secure loose items.'
                });
            }
            if (temp < 12) {
                advice.push({
                    icon: '🍽️',
                    title: 'Picnic Specific',
                    text: 'Cold weather affects food temperature. Consider bringing thermoses with hot drinks and warm meals.'
                });
            }
            break;
            
        case 'gardening':
            if (precip > 0.1 || precipProb > 30) {
                advice.push({
                    icon: '🌱',
                    title: 'Gardening Specific',
                    text: `Rain can make soil muddy and difficult to work with (${precipProb}% rain chance). Consider postponing or focus on covered tasks.`
                });
            }
            if (wind > 20) {
                advice.push({
                    icon: '🌿',
                    title: 'Gardening Specific',
                    text: 'Strong winds can damage plants and make it difficult to work. Secure loose items and consider indoor gardening tasks.'
                });
            }
            if (temp > 30) {
                advice.push({
                    icon: '☀️',
                    title: 'Gardening Specific',
                    text: 'Very hot weather - schedule gardening for early morning or evening. Stay hydrated and wear sun protection.'
                });
            }
            break;
            
        case 'festival':
            if (temp > 27) {
                advice.push({
                    icon: '🎪',
                    title: 'Festival Specific',
                    text: 'Hot weather and long duration require multiple water stations, first aid tents, and shaded rest areas.'
                });
            }
            if (wind > 25 || precip > 1 || precipProb > 50) {
                advice.push({
                    icon: '🎡',
                    title: 'Festival Specific',
                    text: `Weather may affect vendor tents and attractions (${precipProb}% rain chance). Ensure all structures are properly secured and certified.`
                });
            }
            break;
    }
    
    return advice;
}

function getEventName(eventType) {
    const names = {
        'parade': 'Parade',
        'concert': 'Concert',
        'sports': 'Sports Game',
        'picnic': 'Picnic',
        'gardening': 'Gardening',
        'festival': 'Festival'
    };
    return names[eventType] || 'Event';
}

function getWindDescription(speed) {
    if (speed < 5) return 'Calm';
    if (speed < 12) return 'Light breeze';
    if (speed < 20) return 'Moderate';
    if (speed < 30) return 'Strong';
    if (speed < 40) return 'Very strong';
    return 'Dangerous';
}

function getCloudDescription(cover) {
    if (cover < 20) return 'Clear skies';
    if (cover < 50) return 'Partly cloudy';
    if (cover < 80) return 'Mostly cloudy';
    return 'Overcast';
}

function getCloudDescription(cover) {
    if (cover < 20) return 'Clear skies';
    if (cover < 50) return 'Partly cloudy';
    if (cover < 80) return 'Mostly cloudy';
    return 'Overcast';
}

// Store the latest weather data for export
let latestWeatherData = null;
let latestRecommendation = null;
let latestTargetDateTime = null;



function exportToCSV() {
    if (!latestWeatherData || !latestRecommendation || !latestTargetDateTime) {
        alert('No weather data available to export. Please analyze a location first.');
        return;
    }
    
    const data = latestWeatherData;
    const rec = latestRecommendation;
    
    // Create CSV content
    const csvContent = [
        ['Weather Analysis Report'],
        ['Generated on', new Date().toLocaleString()],
        [''],
        ['Event Information'],
        ['Event Type', getEventName(selectedEvent)],
        ['Location', selectedLocation.name || `${selectedLocation.lat.toFixed(4)}°N, ${selectedLocation.lng.toFixed(4)}°E`],
        ['Date & Time', latestTargetDateTime.toLocaleString()],
        [''],
        ['Weather Conditions'],
        ['Temperature', `${Math.round(data.temperature_2m)}°C`],
        ['Feels Like', `${Math.round(data.apparent_temperature)}°C`],
        ['Precipitation Probability', `${Math.round(data.precipitation_probability || 0)}%`],
        ['Precipitation Amount', `${((data.precipitation || 0) + (data.rain || 0) + (data.showers || 0) + (data.snowfall || 0)).toFixed(2)} mm`],
        ['Wind Speed', `${Math.round(data.wind_speed_10m)} km/h`],
        ['Wind Gusts', `${Math.round(data.wind_gusts_10m)} km/h`],
        ['Cloud Cover', `${Math.round(data.cloud_cover)}%`],
        ['Weather Code', data.weather_code],
        [''],
        ['Overall Assessment'],
        ['Recommendation Level', rec.level.toUpperCase()],
        ['Score', `${rec.score}/100`],
        ['Title', rec.title],
        ['Summary', rec.summary],
        ['Details', rec.details],
        [''],
        ['Detailed Recommendations']
    ];
    
    // Add advice items
    rec.advice.forEach((item, index) => {
        csvContent.push([`${index + 1}. ${item.title}`, item.text]);
    });
    
    // Convert to CSV string
    const csvString = csvContent.map(row => 
        row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n');
    
    // Create and download file
    downloadFile(csvString, `weather-analysis-${Date.now()}.csv`, 'text/csv');
}

function exportToJSON() {
    if (!latestWeatherData || !latestRecommendation || !latestTargetDateTime) {
        alert('No weather data available to export. Please analyze a location first.');
        return;
    }
    
    const data = latestWeatherData;
    const rec = latestRecommendation;
    
    // Create JSON object
    const jsonData = {
        metadata: {
            generatedAt: new Date().toISOString(),
            exportedFrom: 'WeatherPals Dashboard'
        },
        event: {
            type: selectedEvent,
            typeName: getEventName(selectedEvent),
            dateTime: latestTargetDateTime.toISOString(),
            dateTimeReadable: latestTargetDateTime.toLocaleString()
        },
        location: {
            name: selectedLocation.name || 'Unknown',
            latitude: selectedLocation.lat,
            longitude: selectedLocation.lng,
            coordinates: `${selectedLocation.lat.toFixed(4)}°N, ${selectedLocation.lng.toFixed(4)}°E`
        },
        weatherConditions: {
            temperature: {
                actual: Math.round(data.temperature_2m),
                feelsLike: Math.round(data.apparent_temperature),
                unit: '°C'
            },
            precipitation: {
                probability: Math.round(data.precipitation_probability || 0),
                amount: parseFloat(((data.precipitation || 0) + (data.rain || 0) + (data.showers || 0) + (data.snowfall || 0)).toFixed(2)),
                unit: 'mm',
                breakdown: {
                    rain: data.rain || 0,
                    showers: data.showers || 0,
                    snowfall: data.snowfall || 0,
                    other: data.precipitation || 0
                }
            },
            wind: {
                speed: Math.round(data.wind_speed_10m),
                gusts: Math.round(data.wind_gusts_10m),
                unit: 'km/h',
                description: getWindDescription(data.wind_speed_10m)
            },
            cloudCover: {
                percentage: Math.round(data.cloud_cover),
                description: getCloudDescription(data.cloud_cover)
            },
            weatherCode: data.weather_code
        },
        assessment: {
            level: rec.level,
            score: rec.score,
            maxScore: 100,
            title: rec.title,
            summary: rec.summary,
            details: rec.details
        },
        recommendations: rec.advice.map(item => ({
            icon: item.icon,
            title: item.title,
            description: item.text
        }))
    };
    
    // Convert to JSON string with formatting
    const jsonString = JSON.stringify(jsonData, null, 2);
    
    // Create and download file
    downloadFile(jsonString, `weather-analysis-${Date.now()}.json`, 'application/json');
}

function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// Reset functionality
function resetEverything() {
    // Reset state variables
    selectedEvent = null;
    selectedLocation = { lat: null, lng: null, name: '' };
    latestWeatherData = null;
    latestRecommendation = null;
    latestTargetDateTime = null;
    
    // Clear marker
    if (currentMarker) {
        currentMarker.remove();
        currentMarker = null;
    }
    
    // Clear search input
    document.getElementById('location-search').value = '';
    
    // Reset event buttons
    document.querySelectorAll('.event-btn').forEach(b => b.classList.remove('active'));
    
    // Reset date/time to defaults
    setDefaultDateTime();
    
    // Reset map view
    map.flyTo({ center: [0, 0], zoom: 2, duration: 1500 });
    
    // Hide results
    document.getElementById('results').classList.add('hidden');
    document.getElementById('weather-results').classList.add('hidden');
    
    // Disable analyze button
    updateAnalyzeButton();
    
    // Scroll to top
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

// Export to CSV
document.addEventListener('DOMContentLoaded', () => {
    const csvBtn = document.getElementById('export-csv-btn');
    const jsonBtn = document.getElementById('export-json-btn');
    const resetBtn = document.getElementById('reset-btn');
    
    if (csvBtn) {
        csvBtn.addEventListener('click', exportToCSV);
    }
    
    if (jsonBtn) {
        jsonBtn.addEventListener('click', exportToJSON);
    }
    
    if (resetBtn) {
        resetBtn.addEventListener('click', resetEverything);
    }
});

 // Theme toggle logic
    const themeToggle = document.getElementById('theme-toggle');
    const themeIcon = document.getElementById('theme-icon');
    const themeLabel = document.getElementById('theme-label');
    const body = document.body;
    
    // Get theme from localStorage or default to light
    let theme = localStorage.getItem('theme') || 'light';
    
    function setTheme(newTheme) {
        theme = newTheme;
        localStorage.setItem('theme', theme);
        
        // Update body classes
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
            
            // Background colors
            document.querySelectorAll('.bg-white, .bg-gray-50, .bg-opacity-95').forEach(el => {
                // Don't remove bg-white from weather cards as they use dark mode classes
                if (!el.classList.contains('weather-card')) {
                    el.classList.remove('bg-white', 'bg-gray-50', 'bg-opacity-95');
                    el.classList.add('bg-gray-800', 'bg-opacity-95');
                }
            });
            
            // Text colors - excluding result sections
            document.querySelectorAll('.text-gray-800:not([id^="recommendation"])').forEach(el => {
                el.classList.remove('text-gray-800');
                el.classList.add('text-gray-100');
            });
            document.querySelectorAll('.text-gray-700:not([id^="recommendation"])').forEach(el => {
                el.classList.remove('text-gray-700');
                el.classList.add('text-gray-200');
            });
            document.querySelectorAll('.text-gray-600:not([id^="recommendation"])').forEach(el => {
                el.classList.remove('text-gray-600');
                el.classList.add('text-gray-300');
            });
            
            // Borders
            document.querySelectorAll('.border-gray-200, .border-gray-300, .border-gray-100').forEach(el => {
                el.classList.remove('border-gray-200', 'border-gray-300', 'border-gray-100');
                el.classList.add('border-gray-700');
            });
            
            // Gradients and sections
            document.querySelectorAll('.from-gray-50').forEach(el => {
                el.classList.remove('from-gray-50');
                el.classList.add('from-gray-900');
            });
            document.querySelectorAll('.to-white').forEach(el => {
                el.classList.remove('to-white');
                el.classList.add('to-gray-800');
            });

            // Event buttons text color
            document.querySelectorAll('.text-gray-700').forEach(el => {
                el.classList.remove('text-gray-700');
                el.classList.add('text-gray-200');
            });

            // Update theme button
            themeIcon.textContent = '🌙';
            themeLabel.textContent = 'Dark';
            themeToggle.classList.add('bg-blue-600');
            themeToggle.classList.remove('bg-gray-800');
        } else {
            document.documentElement.classList.remove('dark');
            
            // Background colors
            document.querySelectorAll('.bg-gray-800, .bg-opacity-95').forEach(el => {
                el.classList.remove('bg-gray-800');
                el.classList.add('bg-white', 'bg-opacity-95');
            });
            
            // Text colors - excluding result sections
            document.querySelectorAll('.text-gray-100:not([id^="recommendation"])').forEach(el => {
                el.classList.remove('text-gray-100');
                el.classList.add('text-gray-800');
            });
            document.querySelectorAll('.text-gray-200:not([id^="recommendation"])').forEach(el => {
                el.classList.remove('text-gray-200');
                el.classList.add('text-gray-700');
            });
            document.querySelectorAll('.text-gray-300:not([id^="recommendation"])').forEach(el => {
                el.classList.remove('text-gray-300');
                el.classList.add('text-gray-600');
            });
            
            // Borders
            document.querySelectorAll('.border-gray-700').forEach(el => {
                el.classList.remove('border-gray-700');
                el.classList.add('border-gray-100');
            });
            
            // Gradients and sections
            document.querySelectorAll('.from-gray-900').forEach(el => {
                el.classList.remove('from-gray-900');
                el.classList.add('from-gray-50');
            });
            document.querySelectorAll('.to-gray-800').forEach(el => {
                el.classList.remove('to-gray-800');
                el.classList.add('to-white');
            });

            // Event buttons text color
            document.querySelectorAll('.text-gray-200').forEach(el => {
                el.classList.remove('text-gray-200');
                el.classList.add('text-gray-700');
            });

            // Update theme button
            themeIcon.textContent = '☀️';
            themeLabel.textContent = 'Light';
            themeToggle.classList.remove('bg-blue-600');
            themeToggle.classList.add('bg-white');
        }
    }

    themeToggle.addEventListener('click', () => {
        setTheme(theme === 'light' ? 'dark' : 'light');
    });

    // Initialize theme on page load
    setTheme(theme);
