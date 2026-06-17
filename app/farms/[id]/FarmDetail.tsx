'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useApi } from '@/hooks/useAuth';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, BarChart, Bar } from 'recharts';
import { Sprout } from 'lucide-react';

function ScoreRing({ score, size = 100, strokeWidth = 8 }: { score: number; size?: number; strokeWidth?: number }) {
  const color = score >= 70 ? '#8b5cf6' : score >= 50 ? '#fbbf24' : '#f87171';
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const dash = c - (c * score) / 100;
  const label = score >= 70 ? 'Good' : score >= 50 ? 'Moderate' : 'Poor';

  return (
    <div className="relative inline-flex flex-col items-center justify-center">
      <svg width={size} height={size} className="-rotate-90" viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(var(--fg-rgb),0.06)" strokeWidth={strokeWidth} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={dash}
          style={{ transition: 'stroke-dashoffset 1.8s cubic-bezier(0.16,1,0.3,1)' }} />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-2xl font-bold" style={{ color }}>{score}</span>
        <span className="text-xs" style={{ color: 'rgba(var(--fg-rgb),0.5)' }}>{label}</span>
      </div>
    </div>
  );
}

function MetricBar({ label, value, color, max = 100 }: { label: string; value: number; color: string; max?: number }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs mb-1.5">
        <span style={{ color: 'rgba(var(--fg-rgb),0.6)' }}>{label}</span>
        <span style={{ color }}>{value}%</span>
      </div>
      <div className="h-2 rounded-full" style={{ background: 'rgba(var(--fg-rgb),0.08)' }}>
        <div className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}, ${color}99)` }} />
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass rounded-xl px-3 py-2 text-xs">
      <p className="font-medium mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: {p.value}</p>
      ))}
    </div>
  );
};

export default function FarmDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const api = useApi();

  const [farm, setFarm] = useState<any>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [weather, setWeather] = useState<any>(null);
  const [recs, setRecs] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [waToast, setWaToast] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => { fetchFarm(); }, [id]);

  async function fetchFarm() {
    try {
      const farms = await api('/api/farms');
      const f = farms.farms?.find((x: any) => x.id === id);
      setFarm(f);

      if (f) {
        const [analyses, weatherData, recsData] = await Promise.allSettled([
          api(`/api/soil-analysis?farmId=${id}`),
          api(`/api/weather?lat=${f.centroid_lat}&lng=${f.centroid_lng}`),
          api(`/api/recommendation?farmId=${id}`),
        ]);
        if (analyses.status === 'fulfilled' && analyses.value.analyses?.length) {
          setHistory(analyses.value.analyses);
          const latest = analyses.value.analyses[0];
          const rawData = typeof latest.raw_data === 'string' ? JSON.parse(latest.raw_data) : latest.raw_data;
          // rawData.satellite is the raw getComprehensiveSatelliteData() result:
          // { vegetation: {ndvi, evi, savi, gndvi, ...}, moisture: {...}, thermal: {lst, ...} }
          // Normalize so analysis.satellite/.moisture/.thermal match the flat shape
          // used right after a POST (analysis.thermal.lst etc), so LST renders
          // correctly after a page reload too.
          const rawSat = rawData?.satellite || {};
          setAnalysis({
            ...latest,
            ...rawData,
            satellite: rawSat.vegetation || rawSat,
            moisture: rawSat.moisture || rawData?.moisture,
            thermal: rawSat.thermal || rawData?.thermal,
          });
        }
        if (weatherData.status === 'fulfilled') setWeather(weatherData.value);
        if (recsData.status === 'fulfilled') setRecs(recsData.value.recommendations || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function runAnalysis() {
    setAnalyzing(true);
    try {
      const data = await api('/api/soil-analysis', {
        method: 'POST',
        body: JSON.stringify({ farmId: id }),
      });
      setAnalysis({ ...data.analysis });
      setRecs((data.analysis?.recommendations || []).map((r: any) => ({
        category: r.category, priority: r.priority, title: r.title,
        description: r.description, action_items: r.actionItems,
        estimated_impact: r.estimatedImpact, timeline: r.timeline,
      })));
      await fetchFarm();
      if (data.whatsappSent) {
        setWaToast(true);
        setTimeout(() => setWaToast(false), 4000);
      } else if (data.whatsappError) {
        alert('Analysis done. WhatsApp not sent: ' + data.whatsappError + '\n\nFix: open WhatsApp Alerts page, enter your number, tap Save.');
      }
    } catch (err: any) {
      alert('Analysis failed: ' + err.message);
    } finally {
      setAnalyzing(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!farm) return (
    <div className="p-8 text-center">
      <p>Farm not found</p>
      <button onClick={() => router.push('/farms')} className="btn-primary mt-4">Back to Farms</button>
    </div>
  );

  // Handle both: fresh POST response (nested under .scores/.satellite)
  // and DB-loaded data (flat columns + raw_data merged in)
  const scores = analysis?.scores ?? (analysis?.soil_health_score != null ? {
    soilHealthScore: analysis.soil_health_score,
    moistureLevel: analysis.moisture_level,
    nutrientRisk: analysis.nutrient_risk,
    erosionRisk: analysis.erosion_risk,
    waterStress: analysis.water_stress,
    fertilityScore: analysis.fertility_score,
    overallStatus: analysis.soil_health_score >= 70 ? 'Good' : analysis.soil_health_score >= 50 ? 'Moderate' : 'Poor',
    trend: analysis.satellite?.trend || analysis.scores?.trend || 'Stable',
  } : null);

  const predictions = analysis?.predictions || [];
  const recommendations = recs;
  const nutrients = analysis?.soilNutrients || analysis?.soilGrids || {
    ph: analysis?.ph_value,
    organicCarbon: analysis?.organic_carbon,
    nitrogen: analysis?.nitrogen,
    phosphorus: analysis?.phosphorus,
    potassium: analysis?.potassium,
    clay: analysis?.clay_content,
    sand: analysis?.sand_content,
    silt: analysis?.silt_content,
    bulkDensity: analysis?.bulk_density,
  };
  // raw_data satellite is { vegetation: {ndvi,evi,savi,gndvi}, moisture, thermal }
  // fresh POST response satellite is already flat { ndvi, evi, savi, gndvi }
  const satRaw = analysis?.satellite;
  const sat = satRaw?.ndvi != null ? satRaw
    : satRaw?.vegetation ?? {
        ndvi: analysis?.ndvi,
        evi: analysis?.evi,
        savi: analysis?.savi,
        gndvi: analysis?.gndvi,
      };

  const tabs = ['overview', 'nutrients', 'predictions', 'recs', 'weather'];

  const FIELD_HERO = 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=900&q=80';
  const healthC = (s: number) => s >= 70 ? '#8b5cf6' : s >= 50 ? '#fbbf24' : '#fb7185';

  return (
    <div className="fs-app max-w-lg mx-auto pb-28">
      {waToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-4 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center gap-2 shadow-lg"
          style={{ background: 'linear-gradient(135deg,#25D366,#128C7E)' }}>
          📲 WhatsApp alert sent!
        </div>
      )}
      {/* ===== Full-bleed aerial hero (reference image 4) ===== */}
      <div className="relative" style={{ minHeight: 340 }}>
        <div className="absolute inset-0" style={{ backgroundImage: `url(${FIELD_HERO})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(28,36,23,0.55) 0%, rgba(28,36,23,0.15) 30%, rgba(28,36,23,0.75) 100%)' }} />

        <div className="relative px-4 pt-6">
          {/* top bar */}
          <div className="flex items-center justify-between">
            <button onClick={() => router.push('/farms')}
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(10px)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>
            </button>
            <h1 className="text-lg font-bold text-white truncate px-3">{farm.name}</h1>
            <button onClick={runAnalysis} disabled={analyzing}
              className="px-3 py-2 rounded-full text-xs font-semibold flex items-center gap-1.5"
              style={{ background: analyzing ? 'rgba(255,255,255,0.2)' : 'linear-gradient(135deg,#8b5cf6,#6d28d9)', color: '#fff' }}>
              {analyzing ? 'Scanning…' : 'Analyze'}
            </button>
          </div>

          {/* Info glass card */}
          <div className="fs-glass-forest rounded-[22px] p-4 mt-5">
            {[
              { label: 'Total Area', value: `${parseFloat(farm.area_hectares || '0').toFixed(1)} hectares` },
              { label: 'Crop Type', value: farm.crop_type || 'Not set' },
              { label: 'Soil Health', value: scores ? `${scores.soilHealthScore}/100` : 'Run analysis' },
            ].map((r, i) => (
              <div key={r.label} className="flex items-center justify-between py-2"
                style={{ borderTop: i ? '1px solid rgba(255,255,255,0.12)' : 'none' }}>
                <span className="text-sm" style={{ color: 'var(--fs-on-forest-soft)' }}>{r.label}</span>
                <span className="text-sm font-semibold">{r.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ===== Bottom stats panel (reference image 4) ===== */}
      {scores ? (
        <div className="px-4 -mt-6 relative z-10">
          <div className="fs-forest-card rounded-[24px] p-5">
            <div className="grid grid-cols-2 gap-y-5 gap-x-4">
              {[
                { label: 'Plant Health', value: `${scores.soilHealthScore}%`, color: healthC(scores.soilHealthScore) },
                { label: 'Moisture', value: `${scores.moistureLevel}%`, color: '#38bdf8' },
                { label: 'Fertility', value: `${scores.fertilityScore}%`, color: '#8b5cf6' },
                { label: 'Erosion Risk', value: `${scores.erosionRisk}%`, color: '#fb7185' },
              ].map((s) => (
                <div key={s.label}>
                  <p className="text-xs mb-1" style={{ color: 'var(--fs-on-forest-soft)' }}>{s.label}</p>
                  <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 flex items-center justify-between text-sm" style={{ borderTop: '1px solid rgba(255,255,255,0.12)' }}>
              <span style={{ color: 'var(--fs-on-forest-soft)' }}>Trend</span>
              <span className="font-semibold" style={{ color: scores.trend === 'Improving' ? '#8b5cf6' : scores.trend === 'Declining' ? '#fb7185' : '#fbbf24' }}>
                {scores.trend === 'Improving' ? '↑' : scores.trend === 'Declining' ? '↓' : '→'} {scores.trend}
              </span>
            </div>
          </div>
        </div>
      ) : null}

      {!analysis && (
        <div className="px-4 mt-4">
          <div className="fs-light-card rounded-[24px] p-8 text-center">
            <Sprout size={36} className="mx-auto mb-3" style={{ color: 'var(--fs-leaf-dark)' }} />
            <h2 className="text-base font-semibold mb-2" style={{ color: 'var(--fs-text)' }}>No Analysis Yet</h2>
            <p className="text-xs mb-5" style={{ color: 'var(--fs-text-soft)' }}>
              Run satellite analysis to get soil health, NDVI, moisture and AI recommendations
            </p>
            <button onClick={runAnalysis} disabled={analyzing} className="fs-pill px-6 py-3 text-sm">
              {analyzing ? 'Analyzing…' : 'Run Satellite Analysis'}
            </button>
          </div>
        </div>
      )}

      <div className="px-4 mt-4">
      {/* Tabs */}
      {analysis && (
        <>
          <div className="flex gap-2 mb-4 overflow-x-auto scroll-hide animate-slide-up" style={{ animationDelay: '0.15s' }}>
            {[
              { key: 'overview', label: '📊 Overview' },
              { key: 'trends', label: '📉 Trends' },
              { key: 'nutrients', label: '🧪 Nutrients' },
              { key: 'predictions', label: '📈 Forecast' },
              { key: 'recs', label: '💡 AI Tips' },
              { key: 'weather', label: '🌤️ Weather' },
            ].map(({ key, label }) => (
              <button key={key}
                onClick={() => setActiveTab(key)}
                className="flex-shrink-0 text-xs px-3 py-2 rounded-xl border transition-all duration-200"
                style={{
                  background: activeTab === key ? 'rgba(124,58,237,0.15)' : 'rgba(var(--fg-rgb),0.06)',
                  borderColor: activeTab === key ? 'rgba(124,58,237,0.4)' : 'rgba(var(--fg-rgb),0.1)',
                  color: activeTab === key ? '#8b5cf6' : 'rgba(var(--fg-rgb),0.6)',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-4 animate-fade-in">
              <div className="glass rounded-2xl p-4">
                <h3 className="text-sm font-semibold mb-3">Health Breakdown</h3>
                {scores && (<>
                  <MetricBar label="Moisture Level" value={scores.moistureLevel} color="#38bdf8" />
                  <MetricBar label="Fertility Score" value={scores.fertilityScore} color="#8b5cf6" />
                  <MetricBar label="Water Stress" value={scores.waterStress} color="#fbbf24" />
                  <MetricBar label="Nutrient Risk" value={scores.nutrientRisk} color="#f87171" />
                  <MetricBar label="Erosion Risk" value={scores.erosionRisk} color="#fb923c" />
                </>)}
              </div>

              <div className="glass rounded-2xl p-4">
                <h3 className="text-sm font-semibold mb-3">Vegetation Indices</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: 'ndvi', label: 'NDVI', desc: 'Vegetation density' },
                    { key: 'evi', label: 'EVI', desc: 'Enhanced vegetation' },
                    { key: 'savi', label: 'SAVI', desc: 'Soil-adjusted veg.' },
                    { key: 'gndvi', label: 'GNDVI', desc: 'Green NDVI' },
                  ].map(({ key, label, desc }) => (
                    <div key={key} className="glass rounded-xl p-3">
                      <div className="text-xs mb-0.5" style={{ color: 'rgba(var(--fg-rgb),0.4)' }}>{desc}</div>
                      <div className="text-lg font-bold gradient-text-purple">{sat[key]?.toFixed(3) || '--'}</div>
                      <div className="text-xs font-medium" style={{ color: 'rgba(var(--fg-rgb),0.6)' }}>{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Trends Tab */}
          {activeTab === 'trends' && (
            <div className="space-y-4 animate-fade-in">
              {history.length < 2 ? (
                <div className="glass rounded-2xl p-6 text-center">
                  <p className="text-4xl mb-2">📉</p>
                  <p className="text-sm font-semibold mb-1">Not enough history yet</p>
                  <p className="text-xs" style={{ color: 'rgba(var(--fg-rgb),0.45)' }}>
                    Run satellite analysis over time to build a trend chart for this field. Each analysis adds one data point.
                  </p>
                </div>
              ) : (() => {
                const chartData = [...history].reverse().map((a: any) => ({
                  date: new Date(a.analysis_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
                  ndvi: a.ndvi != null ? parseFloat(a.ndvi) : null,
                  moistureIndex: a.moisture_index != null ? parseFloat(a.moisture_index) : null,
                  lst: a.land_surface_temp != null ? parseFloat(a.land_surface_temp) : null,
                  soilHealthScore: a.soil_health_score,
                }));
                const first = chartData[0];
                const last = chartData[chartData.length - 1];
                const ndviDelta = last.ndvi != null && first.ndvi != null ? last.ndvi - first.ndvi : null;
                const healthDelta = last.soilHealthScore != null && first.soilHealthScore != null ? last.soilHealthScore - first.soilHealthScore : null;
                return (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="glass rounded-2xl p-3">
                        <div className="text-xs mb-1" style={{ color: 'rgba(var(--fg-rgb),0.4)' }}>NDVI change ({chartData.length} scans)</div>
                        <div className="text-lg font-bold" style={{ color: ndviDelta == null ? '#94a3b8' : ndviDelta > 0 ? '#8b5cf6' : ndviDelta < 0 ? '#f87171' : '#fbbf24' }}>
                          {ndviDelta == null ? '--' : `${ndviDelta > 0 ? '+' : ''}${ndviDelta.toFixed(3)}`}
                        </div>
                      </div>
                      <div className="glass rounded-2xl p-3">
                        <div className="text-xs mb-1" style={{ color: 'rgba(var(--fg-rgb),0.4)' }}>Soil Health change</div>
                        <div className="text-lg font-bold" style={{ color: healthDelta == null ? '#94a3b8' : healthDelta > 0 ? '#8b5cf6' : healthDelta < 0 ? '#f87171' : '#fbbf24' }}>
                          {healthDelta == null ? '--' : `${healthDelta > 0 ? '+' : ''}${healthDelta} pts`}
                        </div>
                      </div>
                    </div>

                    <div className="glass rounded-2xl p-4">
                      <h3 className="text-sm font-semibold mb-1">Vegetation & Moisture Trend</h3>
                      <p className="text-xs mb-4" style={{ color: 'rgba(var(--fg-rgb),0.4)' }}>NDVI and moisture index across all analyses</p>
                      <div style={{ height: 180 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={chartData}>
                            <XAxis dataKey="date" tick={{ fill: 'rgba(var(--fg-rgb),0.4)', fontSize: 10 }} axisLine={false} tickLine={false} />
                            <YAxis domain={[-1, 1]} tick={{ fill: 'rgba(var(--fg-rgb),0.4)', fontSize: 10 }} axisLine={false} tickLine={false} />
                            <Tooltip content={<CustomTooltip />} />
                            <Line type="monotone" dataKey="ndvi" name="NDVI" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                            <Line type="monotone" dataKey="moistureIndex" name="Moisture Index" stroke="#38bdf8" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="4 2" connectNulls />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="glass rounded-2xl p-4">
                      <h3 className="text-sm font-semibold mb-1">Land Surface Temperature</h3>
                      <p className="text-xs mb-4" style={{ color: 'rgba(var(--fg-rgb),0.4)' }}>°C over time</p>
                      <div style={{ height: 140 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={chartData}>
                            <XAxis dataKey="date" tick={{ fill: 'rgba(var(--fg-rgb),0.4)', fontSize: 10 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: 'rgba(var(--fg-rgb),0.4)', fontSize: 10 }} axisLine={false} tickLine={false} />
                            <Tooltip content={<CustomTooltip />} />
                            <Line type="monotone" dataKey="lst" name="LST °C" stroke="#fbbf24" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="glass rounded-2xl p-4">
                      <h3 className="text-sm font-semibold mb-1">Soil Health Score History</h3>
                      <p className="text-xs mb-4" style={{ color: 'rgba(var(--fg-rgb),0.4)' }}>0-100 scale across analyses</p>
                      <div style={{ height: 140 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartData}>
                            <XAxis dataKey="date" tick={{ fill: 'rgba(var(--fg-rgb),0.4)', fontSize: 10 }} axisLine={false} tickLine={false} />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="soilHealthScore" name="Health" fill="#8b5cf680" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          {/* Nutrients Tab */}
          {activeTab === 'nutrients' && (
            <div className="space-y-4 animate-fade-in">
              <div className="glass rounded-2xl p-4">
                <h3 className="text-sm font-semibold mb-3">Soil Chemistry</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'pH', value: nutrients.ph?.toFixed(1), status: nutrients.ph >= 6 && nutrients.ph <= 7.5 ? 'Optimal' : 'Adjust', color: nutrients.ph >= 6 && nutrients.ph <= 7.5 ? '#8b5cf6' : '#fbbf24' },
                    { label: 'Organic Carbon', value: `${nutrients.organicCarbon?.toFixed(2)}%`, status: nutrients.organicCarbon > 1.5 ? 'Good' : 'Low', color: nutrients.organicCarbon > 1.5 ? '#8b5cf6' : '#f87171' },
                    { label: 'Nitrogen (N)', value: `${nutrients.nitrogen?.toFixed(3)}%`, status: nutrients.nitrogen > 0.15 ? 'Adequate' : 'Low', color: nutrients.nitrogen > 0.15 ? '#8b5cf6' : '#fbbf24' },
                    { label: 'Phosphorus (P)', value: `${nutrients.phosphorus?.toFixed(0)} mg/kg`, status: nutrients.phosphorus > 20 ? 'Adequate' : 'Low', color: nutrients.phosphorus > 20 ? '#8b5cf6' : '#fbbf24' },
                    { label: 'Potassium (K)', value: `${nutrients.potassium?.toFixed(0)} mg/kg`, status: nutrients.potassium > 100 ? 'Adequate' : 'Low', color: nutrients.potassium > 100 ? '#8b5cf6' : '#fbbf24' },
                    { label: 'Bulk Density', value: `${nutrients.bulkDensity?.toFixed(2)} g/cm³`, status: 'Normal', color: '#a78bfa' },
                  ].map(({ label, value, status, color }) => (
                    <div key={label} className="glass rounded-xl p-3">
                      <div className="text-xs mb-1" style={{ color: 'rgba(var(--fg-rgb),0.4)' }}>{label}</div>
                      <div className="text-base font-bold">{value || '--'}</div>
                      <div className="text-xs mt-0.5" style={{ color }}>{status}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass rounded-2xl p-4">
                <h3 className="text-sm font-semibold mb-3">Soil Texture</h3>
                <div className="space-y-2">
                  {[
                    { label: 'Clay', value: nutrients.clay || 0, color: '#a78bfa' },
                    { label: 'Sand', value: nutrients.sand || 0, color: '#fbbf24' },
                    { label: 'Silt', value: nutrients.silt || 0, color: '#38bdf8' },
                  ].map(({ label, value, color }) => (
                    <div key={label}>
                      <div className="flex justify-between text-xs mb-1">
                        <span style={{ color: 'rgba(var(--fg-rgb),0.6)' }}>{label}</span>
                        <span style={{ color }}>{parseFloat(value).toFixed(1)}%</span>
                      </div>
                      <div className="h-2 rounded-full" style={{ background: 'rgba(var(--fg-rgb),0.08)' }}>
                        <div className="h-full rounded-full" style={{ width: `${Math.min(100, value)}%`, background: color }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Predictions Tab */}
          {activeTab === 'predictions' && predictions.length > 0 && (
            <div className="space-y-4 animate-fade-in">
              <div className="glass rounded-2xl p-4">
                <h3 className="text-sm font-semibold mb-1">12-Month Forecast</h3>
                <p className="text-xs mb-4" style={{ color: 'rgba(var(--fg-rgb),0.4)' }}>ML-predicted soil health trajectory</p>
                <div style={{ height: 180 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={predictions}>
                      <XAxis dataKey="month" tick={{ fill: 'rgba(var(--fg-rgb),0.4)', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 100]} tick={{ fill: 'rgba(var(--fg-rgb),0.4)', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Line type="monotone" dataKey="soilHealth" name="Soil Health" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="moisture" name="Moisture" stroke="#38bdf8" strokeWidth={2} dot={false} strokeDasharray="4 2" />
                      <Line type="monotone" dataKey="fertility" name="Fertility" stroke="#a78bfa" strokeWidth={2} dot={false} strokeDasharray="2 4" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="glass rounded-2xl p-4">
                <h3 className="text-sm font-semibold mb-3">Monthly Risk Assessment</h3>
                <div style={{ height: 140 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={predictions.slice(0, 6)}>
                      <XAxis dataKey="month" tick={{ fill: 'rgba(var(--fg-rgb),0.4)', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="soilHealth" name="Health" fill="#8b5cf680" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* Recommendations Tab */}
          {activeTab === 'recs' && (
            <div className="space-y-3 animate-fade-in">
              {recommendations.length === 0 ? (
                <div className="glass rounded-2xl p-6 text-center">
                  <p className="text-4xl mb-2">💡</p>
                  <p className="text-sm">No recommendations yet. Run analysis first.</p>
                </div>
              ) : recommendations.map((rec: any, i: number) => {
                const actionItems = typeof rec.action_items === 'string'
                  ? JSON.parse(rec.action_items)
                  : (rec.actionItems || rec.action_items || []);
                const estimatedImpact = rec.estimatedImpact || rec.estimated_impact;
                return (
                <div key={i} className="glass rounded-2xl p-4" style={{ borderLeft: `3px solid ${rec.priority === 'high' ? '#f87171' : rec.priority === 'medium' ? '#fbbf24' : '#8b5cf6'}` }}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className="text-xs px-2 py-0.5 rounded-lg mr-2" style={{
                        background: rec.priority === 'high' ? 'rgba(239,68,68,0.2)' : rec.priority === 'medium' ? 'rgba(251,191,36,0.2)' : 'rgba(124,58,237,0.2)',
                        color: rec.priority === 'high' ? '#f87171' : rec.priority === 'medium' ? '#fbbf24' : '#8b5cf6',
                      }}>{rec.priority?.toUpperCase()}</span>
                      <span className="text-xs" style={{ color: 'rgba(var(--fg-rgb),0.4)' }}>{rec.category}</span>
                    </div>
                    <span className="text-xs" style={{ color: 'rgba(var(--fg-rgb),0.3)' }}>{rec.timeline}</span>
                  </div>
                  <h4 className="text-sm font-semibold mb-1">{rec.title}</h4>
                  <p className="text-xs mb-3" style={{ color: 'rgba(var(--fg-rgb),0.55)' }}>{rec.description}</p>
                  {actionItems?.length > 0 && (
                    <div className="space-y-1">
                      {actionItems.map((item: string, j: number) => (
                        <div key={j} className="flex gap-2 text-xs" style={{ color: 'rgba(var(--fg-rgb),0.6)' }}>
                          <span style={{ color: '#8b5cf6' }}>→</span>
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {estimatedImpact && (
                    <div className="mt-2 text-xs px-2 py-1 rounded-lg" style={{ background: 'rgba(124,58,237,0.08)', color: '#8b5cf6' }}>
                      📈 {estimatedImpact}
                    </div>
                  )}
                </div>
              );})}
            </div>
          )}

          {/* Weather Tab */}
          {activeTab === 'weather' && weather && (
            <div className="space-y-3 animate-fade-in">
              <div className="glass-heavy rounded-2xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-3xl font-bold gradient-text-blue">{Math.round(weather.current?.temperature || 0)}°C</div>
                    <div className="text-xs capitalize mt-0.5" style={{ color: 'rgba(var(--fg-rgb),0.5)' }}>{weather.current?.description}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm" style={{ color: 'rgba(var(--fg-rgb),0.6)' }}>Humidity</div>
                    <div className="text-lg font-semibold text-blue-300">{Math.round(weather.current?.humidity || 0)}%</div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { icon: '💧', label: 'Rain', value: `${weather.current?.rainfall?.toFixed(1) || 0}mm` },
                    { icon: '💨', label: 'Wind', value: `${Math.round(weather.current?.windSpeed || 0)} m/s` },
                    { icon: '☁️', label: 'Cloud', value: `${Math.round(weather.current?.cloudCover || 0)}%` },
                  ].map(({ icon, label, value }) => (
                    <div key={label} className="glass rounded-xl p-2 text-center">
                      <div>{icon}</div>
                      <div className="text-xs mt-1" style={{ color: 'rgba(var(--fg-rgb),0.4)' }}>{label}</div>
                      <div className="text-xs font-semibold">{value}</div>
                    </div>
                  ))}
                </div>
              </div>

              {weather.forecast?.length > 0 && (
                <div className="glass rounded-2xl p-4">
                  <h3 className="text-sm font-semibold mb-3">7-Day Forecast</h3>
                  <div className="flex gap-3 overflow-x-auto scroll-hide pb-1">
                    {weather.forecast.slice(0, 7).map((d: any, i: number) => (
                      <div key={i} className="glass rounded-xl p-3 text-center flex-shrink-0 min-w-[64px]">
                        <div className="text-xs font-medium" style={{ color: 'rgba(var(--fg-rgb),0.6)' }}>{d.day}</div>
                        <div className="text-lg my-1">{d.rainfall > 5 ? '🌧️' : d.rainfall > 1 ? '🌦️' : '☀️'}</div>
                        <div className="text-sm font-bold">{d.high}°</div>
                        <div className="text-xs" style={{ color: 'rgba(var(--fg-rgb),0.4)' }}>{d.low}°</div>
                        {d.rainfall > 0 && (
                          <div className="text-xs mt-1" style={{ color: '#38bdf8' }}>{d.rainfall}mm</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
      </div>
    </div>
  );
}