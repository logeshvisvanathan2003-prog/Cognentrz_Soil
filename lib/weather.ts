const OPENWEATHER_KEY = process.env.OPENWEATHER_API_KEY;
const OPENWEATHER_URL = 'https://api.openweathermap.org/data/2.5';

export async function getCurrentWeather(lat: number, lng: number) {
  if (!OPENWEATHER_KEY || OPENWEATHER_KEY === 'your_openweather_api_key_here') {
    return getMockWeather(lat, lng);
  }

  try {
    const res = await fetch(
      `${OPENWEATHER_URL}/weather?lat=${lat}&lon=${lng}&appid=${OPENWEATHER_KEY}&units=metric`
    );
    if (!res.ok) throw new Error('Weather API failed');
    const data = await res.json();
    
    return {
      temperature: data.main.temp,
      feelsLike: data.main.feels_like,
      humidity: data.main.humidity,
      pressure: data.main.pressure,
      windSpeed: data.wind.speed,
      cloudCover: data.clouds.all,
      rainfall: data.rain?.['1h'] ?? 0,
      description: data.weather[0].description,
      icon: data.weather[0].icon,
      uvIndex: 6,
    };
  } catch {
    return getMockWeather(lat, lng);
  }
}

export async function getWeatherForecast(lat: number, lng: number) {
  if (!OPENWEATHER_KEY || OPENWEATHER_KEY === 'your_openweather_api_key_here') {
    return getMockForecast(lat, lng);
  }

  try {
    const res = await fetch(
      `${OPENWEATHER_URL}/forecast?lat=${lat}&lon=${lng}&appid=${OPENWEATHER_KEY}&units=metric&cnt=40`
    );
    if (!res.ok) throw new Error('Forecast API failed');
    const data = await res.json();
    
    const daily: any[] = [];
    const seen = new Set<string>();
    
    for (const item of data.list) {
      const date = new Date(item.dt * 1000).toLocaleDateString();
      if (!seen.has(date)) {
        seen.add(date);
        daily.push({
          date,
          day: new Date(item.dt * 1000).toLocaleDateString('en', { weekday: 'short' }),
          high: Math.round(item.main.temp_max),
          low: Math.round(item.main.temp_min),
          humidity: item.main.humidity,
          rainfall: item.rain?.['3h'] ?? 0,
          description: item.weather[0].description,
          icon: item.weather[0].icon,
        });
        if (daily.length >= 7) break;
      }
    }
    
    return daily;
  } catch {
    return getMockForecast(lat, lng);
  }
}

function getMockWeather(lat: number, lng: number) {
  const month = new Date().getMonth();
  const isMonsoon = month >= 5 && month <= 9;
  
  return {
    temperature: isMonsoon ? 28 + Math.random() * 4 : 32 + Math.random() * 6,
    feelsLike: 31 + Math.random() * 4,
    humidity: isMonsoon ? 75 + Math.random() * 15 : 55 + Math.random() * 15,
    pressure: 1010 + Math.random() * 10,
    windSpeed: 3 + Math.random() * 8,
    cloudCover: isMonsoon ? 70 + Math.random() * 20 : 20 + Math.random() * 30,
    rainfall: isMonsoon ? Math.random() * 15 : Math.random() * 2,
    description: isMonsoon ? 'moderate rain' : 'partly cloudy',
    icon: isMonsoon ? '10d' : '02d',
    uvIndex: isMonsoon ? 5 : 8,
  };
}

function getMockForecast(lat: number, lng: number) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return days.map((day, i) => ({
    date: new Date(Date.now() + i * 86400000).toLocaleDateString(),
    day,
    high: Math.round(28 + Math.random() * 8),
    low: Math.round(22 + Math.random() * 4),
    humidity: Math.round(60 + Math.random() * 25),
    rainfall: parseFloat((Math.random() * 8).toFixed(1)),
    description: ['clear sky', 'partly cloudy', 'light rain', 'moderate rain', 'cloudy'][Math.floor(Math.random() * 5)],
    icon: ['01d', '02d', '10d', '09d', '03d'][Math.floor(Math.random() * 5)],
  }));
}

export async function getRainfallHistory(lat: number, lng: number, days: number = 30) {
  const history = [];
  for (let i = days; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const month = d.getMonth();
    const isMonsoon = month >= 5 && month <= 9;
    history.push({
      date: d.toLocaleDateString('en', { month: 'short', day: 'numeric' }),
      rainfall: parseFloat((isMonsoon ? Math.random() * 20 : Math.random() * 3).toFixed(1)),
    });
  }
  return history;
}
