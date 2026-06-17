'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useApi } from '@/hooks/useAuth';

interface LatLng { lat: number; lng: number; }

export default function NewFarmPage() {
  const api = useApi();
  const router = useRouter();
  const mapRef = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const polygonRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  
  const [points, setPoints] = useState<LatLng[]>([]);
  const [step, setStep] = useState<'draw' | 'details'>('draw');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mapReady, setMapReady] = useState(false);
  const [form, setForm] = useState({
    name: '', description: '', locationName: '', cropType: '', soilType: '', irrigationType: '',
  });

  useEffect(() => {
    let mounted = true;
    const initMap = async () => {
      if (typeof window === 'undefined' || mapRef.current) return;
      const L = (await import('leaflet')).default;
      
      // Fix leaflet default icons
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });

      if (!mounted || !mapContainerRef.current) return;

      const map = L.map(mapContainerRef.current, {
        center: [11.6643, 78.1460], // Salem, Tamil Nadu
        zoom: 14,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        attribution: '© Google Maps',
      }).addTo(map);

      mapRef.current = map;
      setMapReady(true);

      // Auto-detect and center on the user's current location
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const { latitude, longitude } = pos.coords;
            map.setView([latitude, longitude], 17, { animate: true });
            const icon = L.divIcon({
              className: '',
              html: `<div class="user-loc-dot"><div class="user-loc-pulse"></div></div>`,
              iconSize: [20, 20], iconAnchor: [10, 10],
            });
            L.marker([latitude, longitude], { icon }).addTo(map).bindPopup('You are here');
          },
          () => { /* keep default center if denied */ },
          { enableHighAccuracy: true, timeout: 8000 }
        );
      }
    };
    initMap();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const L = require('leaflet');
    const map = mapRef.current;

    const handleClick = (e: any) => {
      const newPoint = { lat: e.latlng.lat, lng: e.latlng.lng };
      setPoints(prev => {
        const next = [...prev, newPoint];

        // Add marker
        const marker = L.circleMarker([newPoint.lat, newPoint.lng], {
          radius: 6, color: '#8b5cf6', fillColor: '#8b5cf6', fillOpacity: 1, weight: 2,
        }).addTo(map);
        markersRef.current.push(marker);

        // Update polygon
        if (polygonRef.current) map.removeLayer(polygonRef.current);
        if (next.length >= 3) {
          polygonRef.current = L.polygon(
            next.map(p => [p.lat, p.lng]),
            { color: '#8b5cf6', fillColor: '#8b5cf6', fillOpacity: 0.15, weight: 2, dashArray: '6,4' }
          ).addTo(map);
        } else if (next.length >= 2) {
          polygonRef.current = L.polyline(
            next.map(p => [p.lat, p.lng]),
            { color: '#8b5cf6', weight: 2, dashArray: '6,4' }
          ).addTo(map);
        }

        return next;
      });
    };

    map.on('click', handleClick);
    return () => map.off('click', handleClick);
  }, [mapReady]);

  const undoLastPoint = () => {
    if (!mapRef.current || points.length === 0) return;
    const L = require('leaflet');
    const map = mapRef.current;

    // Remove last marker
    const lastMarker = markersRef.current.pop();
    if (lastMarker) map.removeLayer(lastMarker);

    // Remove polygon
    if (polygonRef.current) { map.removeLayer(polygonRef.current); polygonRef.current = null; }

    const newPoints = points.slice(0, -1);
    setPoints(newPoints);

    // Re-draw
    if (newPoints.length >= 2) {
      polygonRef.current = (newPoints.length >= 3 ? L.polygon : L.polyline)(
        newPoints.map(p => [p.lat, p.lng]),
        { color: '#8b5cf6', fillColor: '#8b5cf6', fillOpacity: 0.15, weight: 2 }
      ).addTo(map);
    }
  };

  const clearAll = () => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];
    if (polygonRef.current) { map.removeLayer(polygonRef.current); polygonRef.current = null; }
    setPoints([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) { setError('Farm name is required'); return; }
    if (points.length < 3) { setError('Please draw at least 3 points on the map'); return; }

    setLoading(true);
    setError('');
    try {
      const data = await api('/api/farms', {
        method: 'POST',
        body: JSON.stringify({ ...form, boundary: points }),
      });
      router.push(`/farms/${data.farm.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const area = points.length >= 3 ? (() => {
    let a = 0;
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      a += points[i].lat * points[j].lng - points[j].lat * points[i].lng;
    }
    return (Math.abs(a) * 0.5 * 111320 * 111320 / 10000).toFixed(2);
  })() : null;

  return (
    <div className="max-w-lg mx-auto h-dvh flex flex-col">
      {/* Header */}
      <div className="px-4 pt-6 pb-3 flex items-center gap-3 animate-slide-up">
        <button onClick={() => router.back()} className="w-9 h-9 glass rounded-xl flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div>
          <h1 className="text-xl font-bold">Add New Farm</h1>
          <p className="text-xs" style={{ color: 'rgba(var(--fg-rgb),0.45)' }}>
            {step === 'draw' ? 'Tap on map to draw boundary' : 'Enter farm details'}
          </p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="px-4 mb-3">
        <div className="flex gap-2">
          {['Draw Boundary', 'Farm Details'].map((s, i) => (
            <div key={s} className="flex-1 flex items-center gap-2">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                style={{
                  background: i === (step === 'draw' ? 0 : 1) ? '#8b5cf6' : i < (step === 'draw' ? 0 : 1) ? 'rgba(124,58,237,0.3)' : 'rgba(var(--fg-rgb),0.1)',
                  color: i === (step === 'draw' ? 0 : 1) ? 'black' : 'rgba(var(--fg-rgb),0.5)',
                }}>
                {i + 1}
              </div>
              <span className="text-xs" style={{ color: i === (step === 'draw' ? 0 : 1) ? '#8b5cf6' : 'rgba(var(--fg-rgb),0.4)' }}>{s}</span>
              {i < 1 && <div className="flex-1 h-px" style={{ background: 'rgba(var(--fg-rgb),0.1)' }} />}
            </div>
          ))}
        </div>
      </div>

      {step === 'draw' ? (
        <>
          {/* Map */}
          <div className="flex-1 px-4 relative" style={{ minHeight: '360px' }}>
            <div ref={mapContainerRef} className="w-full h-full rounded-2xl overflow-hidden"
              style={{ border: '1px solid rgba(var(--fg-rgb),0.12)' }} />

            {!mapReady && (
              <div className="absolute inset-4 rounded-2xl flex items-center justify-center"
                style={{ background: 'rgba(10,20,10,0.8)' }}>
                <div className="text-center">
                  <div className="w-10 h-10 border-2 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-sm" style={{ color: 'rgba(var(--fg-rgb),0.6)' }}>Loading satellite map...</p>
                </div>
              </div>
            )}

            {/* Map controls overlay */}
            {points.length > 0 && (
              <div className="absolute top-3 right-7 flex flex-col gap-2 z-[1000]">
                <button onClick={undoLastPoint}
                  className="w-9 h-9 glass rounded-xl flex items-center justify-center text-xs"
                  title="Undo">
                  ↩
                </button>
                <button onClick={clearAll}
                  className="w-9 h-9 glass rounded-xl flex items-center justify-center text-xs text-red-400"
                  title="Clear">
                  ✕
                </button>
              </div>
            )}
          </div>

          {/* Info bar */}
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex gap-4 text-xs" style={{ color: 'rgba(var(--fg-rgb),0.5)' }}>
              <span>📍 {points.length} points</span>
              {area && <span>📐 ~{area} ha</span>}
            </div>
            <div className="text-xs" style={{ color: 'rgba(var(--fg-rgb),0.35)' }}>
              {points.length < 3 ? `${3 - points.length} more to close` : '✓ Ready'}
            </div>
          </div>

          {/* Next button */}
          <div className="px-4 pb-4">
            <button
              disabled={points.length < 3}
              onClick={() => setStep('details')}
              className="w-full py-3.5 rounded-xl font-semibold text-sm transition-all duration-300"
              style={{
                background: points.length >= 3 ? 'linear-gradient(135deg, #7c3aed, #6d28d9)' : 'rgba(var(--fg-rgb),0.08)',
                color: points.length >= 3 ? 'white' : 'rgba(var(--fg-rgb),0.3)',
                boxShadow: points.length >= 3 ? '0 4px 20px rgba(124,58,237,0.4)' : 'none',
              }}
            >
              {points.length >= 3 ? `Continue with ${points.length} points →` : `Need ${3 - points.length} more points`}
            </button>
          </div>
        </>
      ) : (
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <form onSubmit={handleSubmit} className="space-y-4 animate-slide-up">
            {error && (
              <div className="px-4 py-3 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}>
                {error}
              </div>
            )}

            {/* Summary */}
            <div className="glass rounded-2xl p-4 flex items-center gap-3">
              <div className="text-2xl">🗺️</div>
              <div>
                <p className="text-sm font-medium">{points.length} boundary points</p>
                <p className="text-xs" style={{ color: 'rgba(var(--fg-rgb),0.4)' }}>~{area} hectares estimated area</p>
              </div>
              <button type="button" onClick={() => setStep('draw')} className="ml-auto text-xs" style={{ color: '#8b5cf6' }}>Edit</button>
            </div>

            {[
              { key: 'name', label: 'Farm Name *', placeholder: 'e.g., North Paddy Field', type: 'text' },
              { key: 'locationName', label: 'Location / Village', placeholder: 'e.g., Salem, Tamil Nadu', type: 'text' },
              { key: 'description', label: 'Description (optional)', placeholder: 'Any details about this farm...', type: 'text' },
            ].map(({ key, label, placeholder, type }) => (
              <div key={key}>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(var(--fg-rgb),0.6)' }}>{label}</label>
                <input
                  type={type} placeholder={placeholder}
                  value={(form as any)[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  className="w-full rounded-xl px-4 py-3 text-sm"
                />
              </div>
            ))}

            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'cropType', label: 'Crop Type', options: ['Rice/Paddy', 'Wheat', 'Cotton', 'Sugarcane', 'Groundnut', 'Maize', 'Vegetables', 'Fruits', 'Other'] },
                { key: 'soilType', label: 'Soil Type', options: ['Red Laterite', 'Black Cotton', 'Sandy Loam', 'Clay Loam', 'Alluvial', 'Other'] },
              ].map(({ key, label, options }) => (
                <div key={key}>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(var(--fg-rgb),0.6)' }}>{label}</label>
                  <select
                    value={(form as any)[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    className="w-full rounded-xl px-3 py-3 text-sm appearance-none"
                  >
                    <option value="">Select...</option>
                    {options.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              ))}
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(var(--fg-rgb),0.6)' }}>Irrigation Type</label>
              <select
                value={form.irrigationType}
                onChange={e => setForm(f => ({ ...f, irrigationType: e.target.value }))}
                className="w-full rounded-xl px-3 py-3 text-sm appearance-none"
              >
                <option value="">Select irrigation...</option>
                {['Drip Irrigation', 'Sprinkler', 'Flood/Surface', 'Canal', 'Rainfed', 'Borewell/Pump'].map(o => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setStep('draw')} className="flex-1 glass-btn">
                ← Back
              </button>
              <button type="submit" disabled={loading} className="flex-1 btn-primary">
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.3" />
                      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                    Saving...
                  </span>
                ) : 'Create Farm ✓'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
