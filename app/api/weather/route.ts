import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { getCurrentWeather, getWeatherForecast, getRainfallHistory } from '@/lib/weather';

export async function GET(req: NextRequest) {
  const user = authenticateRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const lat = parseFloat(req.nextUrl.searchParams.get('lat') || '11.6643');
  const lng = parseFloat(req.nextUrl.searchParams.get('lng') || '78.1460');
  const type = req.nextUrl.searchParams.get('type') || 'current';

  try {
    if (type === 'forecast') {
      const forecast = await getWeatherForecast(lat, lng);
      return NextResponse.json({ forecast });
    }
    
    if (type === 'rainfall') {
      const history = await getRainfallHistory(lat, lng, 30);
      return NextResponse.json({ history });
    }

    const [current, forecast] = await Promise.all([
      getCurrentWeather(lat, lng),
      getWeatherForecast(lat, lng),
    ]);

    return NextResponse.json({ current, forecast });
  } catch (err) {
    console.error('Weather API error:', err);
    return NextResponse.json({ error: 'Weather data unavailable' }, { status: 500 });
  }
}
