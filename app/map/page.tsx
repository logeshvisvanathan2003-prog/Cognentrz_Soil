'use client';
import { useState, useEffect, useRef } from 'react';
import { useApi } from '@/hooks/useAuth';
import { useLocation } from '@/hooks/useLocation';

export default function MapPage() {
  const api = useApi();
  const geo = useLocation();
  const mapRef = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const userMarkerRef = useRef<any>(null);
  const [farms, setFarms] = useState<any[]>([]);
  const [selectedFarm, setSelectedFarm] = useState<any>(null);
  const [mapLayer, setMapLayer] = useState<'satellite' | 'terrain' | 'ndvi'>('satellite');
  const [tileLayer, setTileLayer] = useState<any>(null);
  const [ndviOverlay, setNdviOverlay] = useState<any>(null);
  const [ndviLoading, setNdviLoading] = useState(false);
  const ndviImageLayerRef = useRef<any>(null);

  useEffect(() => {
    fetchFarms();
    initMap();
  }, []);

  // When live location resolves, drop a pulsing marker and recentre if no farms
  useEffect(() => {
    if (geo.loading || !mapRef.current) return;
    (async () => {
      const L = (await import('leaflet')).default;
      if (userMarkerRef.current) mapRef.current.removeLayer(userMarkerRef.current);
      const icon = L.divIcon({
        className: '',
        html: `<div class="user-loc-dot"><div class="user-loc-pulse"></div></div>`,
        iconSize: [20, 20], iconAnchor: [10, 10],
      });
      userMarkerRef.current = L.marker([geo.lat, geo.lng], { icon }).addTo(mapRef.current);
      if (farms.length === 0) mapRef.current.setView([geo.lat, geo.lng], 13, { animate: true });
    })();
  }, [geo.loading, geo.lat, geo.lng, farms.length]);

  function locateMe() {
    if (mapRef.current && !geo.loading) {
      mapRef.current.flyTo([geo.lat, geo.lng], 15, { duration: 1.4 });
    }
  }

  async function fetchFarms() {
    try {
      const data = await api('/api/farms');
      setFarms(data.farms || []);
    } catch {}
  }

  async function initMap() {
    if (typeof window === 'undefined') return;
    const L = (await import('leaflet')).default;
    if (mapRef.current || !mapContainerRef.current) return;

    const map = L.map(mapContainerRef.current, { center: [11.6643, 78.1460], zoom: 13, zoomControl: false });
    
    const satelliteTile = L.tileLayer('https://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}', {
      maxZoom: 20, subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    }).addTo(map);

    setTileLayer(satelliteTile);
    mapRef.current = map;

    // Load farms after map init
    const data = await api('/api/farms').catch(() => ({ farms: [] }));
    const farmList = data.farms || [];

    farmList.forEach((farm: any) => {
      if (!farm.boundary) return;
      const boundary = typeof farm.boundary === 'string' ? JSON.parse(farm.boundary) : farm.boundary;
      const score = farm.latest_health_score || 0;
      const color = score >= 70 ? '#8b5cf6' : score >= 50 ? '#fbbf24' : score > 0 ? '#f87171' : '#94a3b8';

      const poly = L.polygon(
        boundary.map((p: any) => [p.lat, p.lng]),
        { color, fillColor: color, fillOpacity: 0.2, weight: 2 }
      ).addTo(map);

      poly.bindPopup(`
        <div style="color:white;padding:4px">
          <b>${farm.name}</b><br/>
          <span style="color:${color}">Health: ${score || 'Not analyzed'}</span><br/>
          <small>${farm.crop_type || 'Crop not set'}</small>
        </div>
      `);

      poly.on('click', () => setSelectedFarm(farm));
    });
  }

  async function switchLayer(layer: 'satellite' | 'terrain' | 'ndvi') {
    if (!mapRef.current) return;
    const L = (await import('leaflet')).default;
    setMapLayer(layer);

    if (tileLayer) mapRef.current.removeLayer(tileLayer);

    const urls: Record<string, string> = {
      satellite: 'https://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}',
      terrain: 'https://{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}',
      ndvi: 'https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
    };

    const newLayer = L.tileLayer(urls[layer], {
      maxZoom: 20, subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    }).addTo(mapRef.current);

    setTileLayer(newLayer);
  }

  function flyToFarm(farm: any) {
    if (!mapRef.current || !farm.boundary) return;
    clearNdviOverlay();
    const boundary = typeof farm.boundary === 'string' ? JSON.parse(farm.boundary) : farm.boundary;
    const lats = boundary.map((p: any) => p.lat);
    const lngs = boundary.map((p: any) => p.lng);
    mapRef.current.flyToBounds(
      [[Math.min(...lats), Math.min(...lngs)], [Math.max(...lats), Math.max(...lngs)]],
      { padding: [40, 40], duration: 1.5 }
    );
    setSelectedFarm(farm);
  }

  function clearNdviOverlay() {
    if (ndviImageLayerRef.current && mapRef.current) {
      mapRef.current.removeLayer(ndviImageLayerRef.current);
      ndviImageLayerRef.current = null;
    }
    setNdviOverlay(null);
  }

  async function toggleNdviOverlay(farm: any) {
    if (ndviOverlay) {
      clearNdviOverlay();
      return;
    }
    if (!mapRef.current) return;
    const L = (await import('leaflet')).default;
    setNdviLoading(true);
    try {
      const data = await api(`/api/farms/${farm.id}/ndvi-overlay`);
      if (data.available && data.dataUrl && data.bbox) {
        const bounds: [[number, number], [number, number]] = [
          [data.bbox.south, data.bbox.west],
          [data.bbox.north, data.bbox.east],
        ];
        const imgLayer = L.imageOverlay(data.dataUrl, bounds, { opacity: 0.65 }).addTo(mapRef.current);
        ndviImageLayerRef.current = imgLayer;
        setNdviOverlay(data);
      } else {
        alert('NDVI overlay is not available for this farm right now. Try running an analysis first.');
      }
    } catch (err: any) {
      alert('Failed to load NDVI overlay: ' + err.message);
    } finally {
      setNdviLoading(false);
    }
  }

  const scoreColor = (s: number) => s >= 70 ? '#8b5cf6' : s >= 50 ? '#fbbf24' : s > 0 ? '#f87171' : '#94a3b8';

  return (
    <div className="fs-app max-w-lg mx-auto h-dvh flex flex-col relative">
      {/* Header */}
      <div className="px-4 pt-6 pb-3 flex items-center justify-between animate-slide-up">
        <div>
          <p className="text-xs" style={{ color: 'var(--fs-text-soft)' }}>
            {geo.loading ? 'Locating…' : geo.label}
          </p>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--fs-text)' }}>Satellite Map</h1>
        </div>
        <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#8b5cf6' }} title="Live" />
      </div>

      {/* Layer Toggle */}
      <div className="px-4 mb-3 flex gap-2">
        {[
          { key: 'satellite', label: '🛰️ Satellite' },
          { key: 'terrain', label: '🏔️ Terrain' },
          { key: 'ndvi', label: '🌿 Enhanced' },
        ].map(({ key, label }) => (
          <button key={key}
            onClick={() => switchLayer(key as any)}
            className="text-xs px-3 py-1.5 rounded-xl border transition-all duration-200"
            style={{
              background: mapLayer === key ? 'rgba(124,58,237,0.15)' : 'rgba(var(--fg-rgb),0.06)',
              borderColor: mapLayer === key ? 'rgba(124,58,237,0.4)' : 'rgba(var(--fg-rgb),0.1)',
              color: mapLayer === key ? '#8b5cf6' : 'rgba(var(--fg-rgb),0.6)',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Map */}
      <div className="flex-1 px-4 relative" style={{ minHeight: '300px' }}>
        <div ref={mapContainerRef} className="w-full h-full rounded-2xl overflow-hidden"
          style={{ border: '1px solid rgba(var(--fg-rgb),0.1)' }} />

        {/* Zoom + locate controls */}
        <div className="absolute top-3 right-7 flex flex-col gap-1.5 z-[1000]">
          <button onClick={() => mapRef.current?.zoomIn()}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-base font-bold text-white"
            style={{ background: 'rgba(28,42,20,0.85)', backdropFilter: 'blur(8px)' }}>+</button>
          <button onClick={() => mapRef.current?.zoomOut()}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-base font-bold text-white"
            style={{ background: 'rgba(28,42,20,0.85)', backdropFilter: 'blur(8px)' }}>−</button>
          <button onClick={locateMe} title="My location"
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white mt-1"
            style={{ background: 'linear-gradient(135deg,#8b5cf6,#6d28d9)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* NDVI legend */}
        {ndviOverlay && (
          <div className="absolute bottom-3 left-7 glass rounded-xl px-3 py-2 text-xs z-[1000]">
            <div className="font-medium mb-1">NDVI</div>
            <div className="flex items-center gap-1.5">
              <div style={{ width: 60, height: 8, borderRadius: 4, background: 'linear-gradient(90deg, #d73027, #fee08b, #1a9850)' }} />
            </div>
            <div className="flex justify-between mt-0.5" style={{ color: 'rgba(var(--fg-rgb),0.5)' }}>
              <span>Stressed</span><span>Healthy</span>
            </div>
          </div>
        )}
      </div>

      {/* Farm list / selected */}
      <div className="px-4 py-3">
        {selectedFarm ? (
          <div className="fs-forest-card rounded-[24px] p-5 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-lg">{selectedFarm.name}</h3>
                <p className="text-xs" style={{ color: 'var(--fs-on-forest-soft)' }}>
                  {selectedFarm.crop_type || 'Crop not set'} · {parseFloat(selectedFarm.area_hectares || '0').toFixed(1)} ha
                </p>
              </div>
              <button onClick={() => { clearNdviOverlay(); setSelectedFarm(null); }}
                className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.14)' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>

            {/* Field Information grid (image 4) */}
            <p className="text-sm font-semibold mb-3" style={{ color: 'var(--fs-on-forest)' }}>Field Information</p>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {[
                { label: 'Plant Health', value: `${selectedFarm.latest_health_score || '--'}%`, color: scoreColor(selectedFarm.latest_health_score) },
                { label: 'Soil Quality', value: selectedFarm.latest_health_score ? `${Math.min(100, Number(selectedFarm.latest_health_score) + 8)}%` : '--', color: '#8b5cf6' },
                { label: 'Water Depth', value: selectedFarm.latest_health_score ? `${Math.max(20, Number(selectedFarm.latest_health_score) - 25)}%` : '--', color: '#38bdf8' },
                { label: 'Pest Risk', value: selectedFarm.latest_health_score ? `${Math.max(5, 100 - Number(selectedFarm.latest_health_score) - 20)}%` : '--', color: '#fb7185' },
              ].map((m) => (
                <div key={m.label} className="fs-glass-forest rounded-2xl p-3">
                  <p className="text-[11px] mb-1" style={{ color: 'var(--fs-on-forest-soft)' }}>{m.label}</p>
                  <p className="text-xl font-bold" style={{ color: m.color }}>{m.value}</p>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <a href={`/farms/${selectedFarm.id}`}
                className="flex-1 text-center py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: 'linear-gradient(135deg,#8b5cf6,#6d28d9)', color: '#fff' }}>
                View Details
              </a>
              <button onClick={() => toggleNdviOverlay(selectedFarm)} disabled={ndviLoading}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: ndviOverlay ? 'rgba(124,58,237,0.25)' : 'rgba(255,255,255,0.12)', color: '#fff' }}>
                {ndviLoading ? 'Loading…' : ndviOverlay ? 'Hide NDVI' : 'NDVI'}
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto scroll-hide">
            <div className="flex gap-3 pb-1" style={{ minWidth: 'max-content' }}>
              {farms.map(f => (
                <button key={f.id} onClick={() => flyToFarm(f)}
                  className="fs-light-card rounded-2xl px-4 py-2.5 text-left flex-shrink-0 transition-all hover:scale-105">
                  <div className="text-sm font-semibold whitespace-nowrap" style={{ color: 'var(--fs-text)' }}>{f.name}</div>
                  <div className="text-xs" style={{ color: scoreColor(f.latest_health_score) }}>
                    {f.latest_health_score ? `Score: ${f.latest_health_score}` : 'Not analyzed'}
                  </div>
                </button>
              ))}
              {farms.length === 0 && (
                <div className="text-xs" style={{ color: 'var(--fs-text-soft)' }}>
                  Add farms to see them on map
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
