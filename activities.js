class ActivityRecommender {
    constructor(weatherData) {
        this.temp = weatherData.temp_c;
        this.condition = weatherData.condition.text.toLowerCase();
        this.windSpeed = weatherData.wind_kph;
        this.humidity = weatherData.humidity;
        this.isDay = weatherData.is_day !== 0;
    }

    getRecommendations() {
        return {
            outdoor: this.getOutdoorActivities(),
            indoor: this.getIndoorActivities(),
            sports: this.getSportsActivities()
        };
    }

    getOutdoorActivities() {
        const activities = [];
        const isRaining = this.condition.includes('rain') || this.condition.includes('drizzle');
        const isSnowing = this.condition.includes('snow');
        const isClear = this.condition.includes('clear') || this.condition.includes('sunny');
        const isCloudy = this.condition.includes('cloud') || this.condition.includes('overcast');

        // Perfect weather activities
        if (this.temp >= 18 && this.temp <= 25 && this.windSpeed < 15 && !isRaining) {
            activities.push({
                name: 'Hiking',
                icon: '🏃‍♂️',
                description: 'Perfect temperature and wind conditions for hiking',
                intensity: 'Moderate',
                duration: '2-4 hours'
            });
        }

        // Beach activities
        if (this.temp > 25 && !isRaining && this.windSpeed < 20) {
            activities.push({
                name: 'Beach Visit',
                icon: '🏖️',
                description: 'Great weather for beach activities',
                intensity: 'Light to Moderate',
                duration: '3-6 hours'
            });
        }

        // Photography
        if (isCloudy && !isRaining) {
            activities.push({
                name: 'Photography',
                icon: '📸',
                description: 'Perfect diffused light for outdoor photography',
                intensity: 'Light',
                duration: '1-3 hours'
            });
        }

        return activities;
    }

    getIndoorActivities() {
        const activities = [];
        const isRaining = this.condition.includes('rain') || this.condition.includes('drizzle');

        // Rainy day activities
        if (isRaining || this.temp < 10 || this.temp > 35) {
            activities.push({
                name: 'Museum Visit',
                icon: '🏛️',
                description: 'Perfect day to explore local museums',
                intensity: 'Light',
                duration: '2-4 hours'
            });

            activities.push({
                name: 'Indoor Workshop',
                icon: '🎨',
                description: 'Try an art or craft workshop',
                intensity: 'Light',
                duration: '1-3 hours'
            });
        }

        return activities;
    }

    getSportsActivities() {
        const activities = [];
        const isRaining = this.condition.includes('rain') || this.condition.includes('drizzle');

        // Outdoor sports
        if (this.temp >= 15 && this.temp <= 28 && !isRaining && this.windSpeed < 20) {
            activities.push({
                name: 'Tennis',
                icon: '🎾',
                description: 'Great conditions for tennis',
                intensity: 'High',
                duration: '1-2 hours'
            });

            activities.push({
                name: 'Cycling',
                icon: '🚴‍♂️',
                description: 'Perfect weather for a bike ride',
                intensity: 'Moderate to High',
                duration: '1-3 hours'
            });
        }

        // Water sports
        if (this.temp > 25 && !isRaining && this.windSpeed < 25) {
            activities.push({
                name: 'Swimming',
                icon: '🏊‍♂️',
                description: 'Ideal temperature for swimming',
                intensity: 'Moderate',
                duration: '30-60 minutes'
            });
        }

        return activities;
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ActivityRecommender;
}