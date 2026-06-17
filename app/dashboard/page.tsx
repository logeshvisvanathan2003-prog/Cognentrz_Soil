'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useApi } from '@/hooks/useAuth';
import { useLocation } from '@/hooks/useLocation';
import { useLanguage } from '@/hooks/useLanguage';
import { motion } from 'framer-motion';
import {
  Cloud, Droplets, CloudRain, Wind, Bookmark, ChevronRight, Sprout, MapPin, Sun, Users, MessageCircle, Crown,
} from 'lucide-react';

const FIELD_IMGS = [
  'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&w=600&q=80',
];

const fade = {
  hidden: { opacity: 0, y: 20 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.55, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] } }),
};

export default function DashboardPage() {
  const router = useRouter();
  const api = useApi();
  const { user } = useAuth();
  const geo = useLocation();
  const { t } = useLanguage();

  const [farms, setFarms] = useState<any[]>([]);
  const [weather, setWeather] = useState<any>(null);
  const [filter, setFilter] = useState('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  // fetch weather for the user's live location once we have it
  useEffect(() => {
    if (!geo.loading) {
      api(`/api/weather?lat=${geo.lat}&lng=${geo.lng}`)
        .then((w: any) => setWeather(w?.current || null))
        .catch(() => {});
    }
  }, [geo.loading, geo.lat, geo.lng]);

  async function load() {
    try {
      const data = await api('/api/farms');
      setFarms(data.farms || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }

  const cropTypes = ['All', ...Array.from(new Set(farms.map((f) => f.crop_type).filter(Boolean)))];
  const shown = filter === 'All' ? farms : farms.filter((f) => f.crop_type === filter);
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  if (loading) {
    return (
      <div className="fs-app flex items-center justify-center min-h-dvh">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.6, repeat: Infinity, ease: 'linear' }}>
          <Sprout size={34} color="#7c3aed" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fs-app px-3 pt-4 pb-28">
      {/* ===== Dark-green Welcome / Weather header card ===== */}
      <motion.div variants={fade} custom={0} initial="hidden" animate="show"
        className="fs-forest-card rounded-[28px] p-5 relative overflow-hidden">
        {/* subtle leaf glow */}
        <div className="absolute -right-10 -top-10 w-44 h-44 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.3), transparent 70%)' }} />

        <div className="relative">
          {/* top row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center font-semibold"
                style={{ background: 'rgba(255,255,255,0.18)' }}>
                {(user?.name?.[0] || 'F').toUpperCase()}
              </div>
              <div>
                <p className="text-xs" style={{ color: 'var(--fs-on-forest-soft)' }}>{t('Welcome back,')}</p>
                <p className="font-semibold leading-tight">{user?.name?.split(' ')[0] || 'Farmer'}</p>
              </div>
            </div>
            <Sun size={20} style={{ color: 'rgba(255,255,255,0.7)' }} />
          </div>

          {/* location chip */}
          <div className="mt-4 flex items-center gap-2 text-sm" style={{ color: 'var(--fs-on-forest-soft)' }}>
            <MapPin size={14} /> {geo.loading ? t('Locating…') : geo.label} · {today}
          </div>

          {/* big temp + weather metrics */}
          <div className="mt-2 flex items-end justify-between">
            <div className="flex items-start">
              <span className="text-6xl font-bold leading-none">{weather ? Math.round(weather.temperature) : '--'}</span>
              <span className="text-2xl font-semibold mt-1">°C</span>
            </div>
            <Cloud size={56} style={{ color: 'rgba(255,255,255,0.5)' }} />
          </div>
          <p className="text-sm capitalize" style={{ color: 'var(--fs-on-forest-soft)' }}>
            {weather?.description || t('Clear sky')}
          </p>

          {/* metric row */}
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[
              { icon: Droplets, label: 'Humidity', v: weather ? `${Math.round(weather.humidity)}%` : '--' },
              { icon: CloudRain, label: 'Rain', v: weather ? `${(weather.rainfall || 0).toFixed(0)}mm` : '--' },
              { icon: Wind, label: 'Wind', v: weather ? `${Math.round(weather.windSpeed || 0)} m/s` : '--' },
            ].map(({ icon: Ic, label, v }) => (
              <div key={label} className="fs-glass-forest rounded-2xl py-2.5 text-center">
                <Ic size={16} className="mx-auto mb-1" style={{ color: 'rgba(255,255,255,0.7)' }} />
                <div className="text-sm font-semibold">{v}</div>
                <div className="text-[10px]" style={{ color: 'var(--fs-on-forest-soft)' }}>{t(label)}</div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ===== Today's Plan (image 4) ===== */}
      <motion.div variants={fade} custom={1} initial="hidden" animate="show" className="mt-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold" style={{ color: 'var(--fs-text)' }}>Today's Plan</h2>
          <button onClick={() => router.push('/farms')} className="text-xs font-semibold" style={{ color: 'var(--fs-leaf-dark)' }}>View all</button>
        </div>
        <div className="flex gap-3 overflow-x-auto scroll-hide pb-1">
          {(farms.length ? farms.slice(0, 3) : [null]).map((f: any, i: number) => {
            const tasks = [
              { time: '7:30 AM', label: f ? `Analyze ${f.name}` : 'Add your first farm', status: 'On-Progress', tint: '#2c5e2e' },
              { time: '10:30 AM', label: f ? `Irrigation · ${f.crop_type || 'field'}` : 'Draw boundary', status: 'Not-Started', tint: 'transparent' },
              { time: '2:00 PM', label: 'Review AI recommendations', status: 'Not-Started', tint: 'transparent' },
            ][i];
            const active = tasks.status === 'On-Progress';
            return (
              <button key={i} onClick={() => router.push(f ? `/farms/${f.id}` : '/farms/new')}
                className="flex-shrink-0 rounded-[22px] p-4 text-left" style={{ width: 200,
                  background: active ? 'linear-gradient(135deg,#2c5e2e,#1c3b1d)' : 'var(--fs-card)',
                  color: active ? '#fff' : 'var(--fs-text)',
                  border: active ? 'none' : '1px solid rgba(28,36,23,0.08)' }}>
                <div className="flex items-center gap-1.5 text-xs mb-3" style={{ color: active ? 'rgba(255,255,255,0.8)' : 'var(--fs-text-soft)' }}>
                  <Sun size={13} /> {tasks.time}
                </div>
                <p className="font-semibold text-sm leading-snug mb-3">{tasks.label}</p>
                <span className="inline-block px-2.5 py-1 rounded-lg text-[11px] font-medium"
                  style={{ background: active ? 'rgba(255,255,255,0.18)' : 'rgba(120,120,120,0.12)', color: active ? '#fff' : 'var(--fs-text-soft)' }}>
                  {tasks.status}
                </span>
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* ===== Regional Intelligence banner ===== */}
      <motion.button variants={fade} custom={2} initial="hidden" animate="show"
        onClick={() => router.push('/regional')}
        className="mt-4 w-full text-left fs-forest-card rounded-[22px] p-4 relative overflow-hidden flex items-center gap-3">
        <div className="absolute -right-6 -bottom-6 w-28 h-28 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.3), transparent 70%)' }} />
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(255,255,255,0.16)' }}>
          <Users size={20} />
        </div>
        <div className="relative flex-1 min-w-0">
          <p className="font-semibold text-sm">{t('Regional Intelligence')}</p>
          <p className="text-xs" style={{ color: 'var(--fs-on-forest-soft)' }}>{t('District-wide pest & disease early warning')}</p>
        </div>
        <ChevronRight size={18} style={{ color: 'var(--fs-on-forest-soft)' }} />
      </motion.button>

      {/* ===== Pro + WhatsApp auto-alert status row ===== */}
      <motion.div variants={fade} custom={1} initial="hidden" animate="show" className="mt-3 grid grid-cols-2 gap-3">
        <div className="fs-light-card rounded-[20px] p-4 text-left flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(37,211,102,0.15)' }}>
            <MessageCircle size={18} style={{ color: '#128C7E' }} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: 'var(--fs-text)' }}>WhatsApp</p>
            <p className="text-[11px]" style={{ color: '#25D366' }}>Auto-enabled ✓</p>
          </div>
        </div>
        <button onClick={() => router.push('/pro')}
          className="rounded-[20px] p-4 text-left flex items-center gap-2.5" style={{ background: 'linear-gradient(135deg,#8b5cf6,#6d28d9)', color: '#fff' }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.2)' }}>
            <Crown size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">Go Pro</p>
            <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.85)' }}>From ₹99</p>
          </div>
        </button>
      </motion.div>

      {/* ===== My Fields ===== */}
      <motion.div variants={fade} custom={2} initial="hidden" animate="show" className="mt-5 flex items-center justify-between">
        <h2 className="text-xl font-bold" style={{ color: 'var(--fs-text)' }}>{t('My Fields')}</h2>
        <button onClick={() => router.push('/farms')} className="text-xs font-semibold flex items-center gap-0.5" style={{ color: 'var(--fs-leaf-dark)' }}>
          {t('See all')} <ChevronRight size={14} />
        </button>
      </motion.div>

      {/* filter pills */}
      <motion.div variants={fade} custom={2} initial="hidden" animate="show" className="mt-3 flex gap-2 overflow-x-auto scroll-hide pb-1">
        {cropTypes.map((c) => (
          <button key={c} onClick={() => setFilter(c)}
            className={`fs-filter-pill px-4 py-1.5 text-sm whitespace-nowrap ${filter === c ? 'active' : ''}`}>
            {c === 'All' ? t('All') : c}
          </button>
        ))}
      </motion.div>

      {/* field photo cards */}
      <motion.div variants={fade} custom={3} initial="hidden" animate="show" className="mt-3 grid grid-cols-2 gap-3 pb-28">
        {shown.length === 0 ? (
          <div className="col-span-2 fs-light-card rounded-[24px] p-8 text-center">
            <Sprout size={32} className="mx-auto mb-2" style={{ color: 'var(--fs-leaf-dark)' }} />
            <p className="font-semibold text-sm">No fields yet</p>
            <p className="text-xs mt-1 mb-4" style={{ color: 'var(--fs-text-soft)' }}>Add your first farm to begin</p>
            <button onClick={() => router.push('/farms/new')} className="fs-pill px-5 py-2.5 text-sm">Add Farm</button>
          </div>
        ) : shown.map((f, i) => (
          <motion.button key={f.id} whileTap={{ scale: 0.97 }} onClick={() => router.push(`/farms/${f.id}`)}
            className="fs-light-card rounded-[24px] overflow-hidden text-left">
            <div className="relative h-28">
              <div className="absolute inset-0" style={{ backgroundImage: `url(${FIELD_IMGS[i % FIELD_IMGS.length]})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 40%, rgba(28,36,23,0.5))' }} />
              <button className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.85)' }}>
                <Bookmark size={13} style={{ color: 'var(--fs-leaf-dark)' }} />
              </button>
              <span className="absolute bottom-2 left-2 text-[11px] font-semibold text-white">
                Health {f.latest_health_score || '--'}
              </span>
            </div>
            <div className="p-3">
              <p className="font-semibold text-sm leading-tight" style={{ color: 'var(--fs-text)' }}>{f.name}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--fs-text-soft)' }}>
                {f.crop_type || 'Field'} · {parseFloat(f.area_hectares || '0').toFixed(1)} ha
              </p>
            </div>
          </motion.button>
        ))}
      </motion.div>
    </div>
  );
}
