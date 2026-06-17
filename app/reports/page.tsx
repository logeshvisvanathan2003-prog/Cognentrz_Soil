'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApi } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { motion } from 'framer-motion';
import { ArrowLeft, Leaf, TrendingUp, Droplets, Sprout, Thermometer, Mountain, Activity, AlertCircle } from 'lucide-react';
import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer, AreaChart, Area, XAxis, Tooltip } from 'recharts';

const fade = {
  hidden: { opacity: 0, y: 18 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.5, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] } }),
};

export default function ReportsPage() {
  const router = useRouter();
  const api = useApi();
  const { t } = useLanguage();
  const [farms, setFarms] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { init(); }, []);

  async function init() {
    try {
      const data = await api('/api/farms');
      if (data.farms?.length) {
        setFarms(data.farms);
        setSelected(data.farms[0]);
        await load(data.farms[0].id);
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }

  async function load(farmId: string) {
    try {
      const data = await api(`/api/soil-analysis?farmId=${farmId}`);
      const num = (v: any) => (v == null || v === '' ? 0 : Number(v));
      if (data.analyses?.length) {
        const a = data.analyses[0];
        setAnalysis({
          ...a, ndvi: num(a.ndvi), moisture_level: num(a.moisture_level), fertility_score: num(a.fertility_score),
          soil_health_score: num(a.soil_health_score), land_surface_temp: num(a.land_surface_temp),
          erosion_risk: num(a.erosion_risk), nutrient_risk: num(a.nutrient_risk), water_stress: num(a.water_stress),
        });
        setHistory([...data.analyses].reverse().map((x: any) => ({
          date: new Date(x.analysis_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
          ndvi: num(x.ndvi), health: num(x.soil_health_score),
        })));
      } else { setAnalysis(null); setHistory([]); }
    } catch (e) { console.error(e); }
  }

  const score = analysis?.soil_health_score || 0;
  const scoreColor = score >= 70 ? '#8b5cf6' : score >= 50 ? '#fbbf24' : '#fb7185';
  const gauge = [{ name: 'health', value: score, fill: scoreColor }];

  return (
    <div className="fs-app px-4 pt-6 pb-28">
      <div className="flex items-center gap-3 mb-4">
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => router.back()}
          className="fs-light-card w-10 h-10 rounded-xl flex items-center justify-center">
          <ArrowLeft size={18} style={{ color: 'var(--fs-text)' }} />
        </motion.button>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--fs-text)' }}>{t('AI Reports')}</h1>
      </div>

      {/* promptOS-style hero */}
      <div className="fs-light-card rounded-[22px] p-6 mb-4 text-center">
        <h2 className="text-4xl font-extrabold tracking-tight mb-2" style={{ color: 'var(--fs-text)' }}>REPORT</h2>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--fs-text-soft)' }}>
          Track soil health metrics, NDVI efficiency, and field analytics in real-time to optimize your farm decisions.
        </p>
      </div>
      <p className="text-center text-sm font-bold tracking-widest mb-4" style={{ color: 'var(--fs-text-soft)' }}>ANALYTICS SUITE</p>

      {/* Farm selector */}
      <div className="flex gap-2 overflow-x-auto scroll-hide pb-1 mb-4">
        {farms.map((f) => (
          <button key={f.id} onClick={() => { setSelected(f); load(f.id); }}
            className="px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all"
            style={selected?.id === f.id
              ? { background: 'linear-gradient(135deg,#8b5cf6,#6d28d9)', color: '#fff' }
              : { background: 'var(--fs-card)', color: 'var(--fs-text-soft)', border: '1px solid rgba(28,36,23,0.08)' }}>
            {f.name}
          </button>
        ))}
      </div>

      {loading || !analysis ? (
        <div className="flex items-center justify-center h-64">
          {loading
            ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.6, repeat: Infinity, ease: 'linear' }}><Sprout size={32} color="#7c3aed" /></motion.div>
            : <p className="text-sm text-center px-8" style={{ color: 'var(--fs-text-soft)' }}>No analysis yet. Open this farm and run satellite analysis first.</p>}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Forest-glass gauge hero */}
          <motion.div variants={fade} custom={0} initial="hidden" animate="show"
            className="fs-forest-card rounded-[26px] p-5 relative overflow-hidden">
            <div className="absolute -right-10 -top-10 w-44 h-44 rounded-full" style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.3), transparent 70%)' }} />
            <div className="relative flex items-center gap-4">
              <div style={{ width: 120, height: 120 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart innerRadius="70%" outerRadius="100%" data={gauge} startAngle={90} endAngle={-270}>
                    <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                    <RadialBar background={{ fill: 'rgba(255,255,255,0.12)' }} dataKey="value" cornerRadius={20} />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="relative -mt-[78px] text-center" style={{ height: 0 }}>
                  <span className="text-3xl font-bold" style={{ color: scoreColor }}>{score}</span>
                  <p className="text-[10px]" style={{ color: 'var(--fs-on-forest-soft)' }}>/ 100</p>
                </div>
              </div>
              <div className="flex-1">
                <p className="text-sm" style={{ color: 'var(--fs-on-forest-soft)' }}>{t('Soil Health')}</p>
                <p className="text-xl font-bold">{selected?.name}</p>
                <div className="mt-2 flex gap-2">
                  <span className="px-2.5 py-1 rounded-lg text-[11px] font-semibold" style={{ background: 'rgba(255,255,255,0.14)' }}>
                    NDVI {analysis.ndvi.toFixed(3)}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-[11px] font-semibold" style={{ background: 'rgba(255,255,255,0.14)' }}>
                    {analysis.land_surface_temp.toFixed(0)}°C
                  </span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Metric tiles */}
          <motion.div variants={fade} custom={1} initial="hidden" animate="show" className="grid grid-cols-2 gap-3">
            {[
              { icon: Droplets, label: t('Moisture'), value: `${analysis.moisture_level}%`, tint: '#38bdf8' },
              { icon: TrendingUp, label: t('Fertility'), value: `${analysis.fertility_score}%`, tint: '#8b5cf6' },
              { icon: Mountain, label: t('Erosion Risk'), value: `${analysis.erosion_risk}%`, tint: '#fb7185' },
              { icon: Thermometer, label: 'LST', value: `${analysis.land_surface_temp.toFixed(1)}°C`, tint: '#fbbf24' },
            ].map((m, i) => {
              const Ic = m.icon;
              return (
                <div key={i} className="fs-light-card rounded-[20px] p-4">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-2" style={{ background: `${m.tint}22` }}>
                    <Ic size={16} style={{ color: m.tint }} />
                  </div>
                  <p className="text-xs" style={{ color: 'var(--fs-text-soft)' }}>{m.label}</p>
                  <p className="text-2xl font-bold" style={{ color: 'var(--fs-text)' }}>{m.value}</p>
                </div>
              );
            })}
          </motion.div>

          {/* NDVI history area chart */}
          {history.length >= 2 && (
            <motion.div variants={fade} custom={2} initial="hidden" animate="show" className="fs-light-card rounded-[22px] p-5">
              <div className="flex items-center gap-2 mb-3">
                <Activity size={16} style={{ color: 'var(--fs-leaf-dark)' }} />
                <p className="text-sm font-semibold" style={{ color: 'var(--fs-text)' }}>NDVI Trend</p>
              </div>
              <div style={{ height: 160 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={history}>
                    <defs>
                      <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" tick={{ fill: 'var(--fs-text-soft)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: 'var(--fs-forest)', border: 'none', borderRadius: 12, color: '#fff' }} />
                    <Area type="monotone" dataKey="ndvi" stroke="#8b5cf6" strokeWidth={2.5} fill="url(#g)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          )}

          {/* AI Recommendations */}
          <motion.div variants={fade} custom={3} initial="hidden" animate="show" className="fs-light-card rounded-[22px] p-5">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle size={16} style={{ color: '#fbbf24' }} />
              <p className="text-sm font-semibold" style={{ color: 'var(--fs-text)' }}>{t('AI Recommendations')}</p>
            </div>
            <div className="space-y-2 text-sm" style={{ color: 'var(--fs-text-soft)' }}>
              {[
                `Soil health is ${score}/100 — ${score >= 70 ? 'maintain current practices' : 'increase organic inputs and monitor weekly'}.`,
                `NDVI ${analysis.ndvi.toFixed(2)} indicates ${analysis.ndvi > 0.4 ? 'healthy canopy' : 'sparse cover — check for stress'}.`,
                `Moisture ${analysis.moisture_level}% — ${analysis.moisture_level < 35 ? 'irrigate within 2-3 days' : 'adequate for now'}.`,
                `Erosion risk ${analysis.erosion_risk}% — ${analysis.erosion_risk > 40 ? 'add cover crop / contour bunding' : 'within safe range'}.`,
              ].map((tx, i) => (
                <div key={i} className="flex gap-2"><Leaf size={14} style={{ color: '#8b5cf6', flexShrink: 0, marginTop: 2 }} /><span>{tx}</span></div>
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
