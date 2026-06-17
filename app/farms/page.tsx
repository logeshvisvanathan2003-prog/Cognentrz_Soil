'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApi } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { motion } from 'framer-motion';
import { Plus, Search, Sprout, ChevronRight, Bookmark } from 'lucide-react';

const FIELD_IMGS = [
  'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=700&q=80',
  'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=700&q=80',
  'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=700&q=80',
  'https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&w=700&q=80',
];

const fade = {
  hidden: { opacity: 0, y: 18 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.5, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] } }),
};

export default function FarmsPage() {
  const router = useRouter();
  const api = useApi();
  const { t } = useLanguage();
  const [farms, setFarms] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);
  async function load() {
    try { const d = await api('/api/farms'); setFarms(d.farms || []); }
    catch (e) { console.error(e); } finally { setLoading(false); }
  }

  const healthColor = (s: number) => s >= 70 ? '#6d28d9' : s >= 50 ? '#c79a00' : '#d9534f';
  const healthLabel = (s: number) => s >= 70 ? 'Excellent' : s >= 50 ? 'Good' : s >= 30 ? 'Needs Care' : 'Critical';
  const filtered = farms.filter((f) =>
    f.name?.toLowerCase().includes(search.toLowerCase()) || f.crop_type?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="fs-app px-4 pt-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-3xl font-bold" style={{ color: 'var(--fs-text)' }}>{t('My Farms')}</h1>
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => router.push('/farms/new')}
          className="fs-pill w-12 h-12 rounded-2xl flex items-center justify-center">
          <Plus size={22} />
        </motion.button>
      </div>

      <div className="relative mb-5">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--fs-text-soft)' }} />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("Search farms...")}
          className="w-full pl-11 pr-4 py-3 rounded-2xl text-sm outline-none fs-light-card"
          style={{ color: 'var(--fs-text)' }} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.6, repeat: Infinity, ease: 'linear' }}>
            <Sprout size={32} color="#7c3aed" />
          </motion.div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="fs-light-card rounded-[24px] p-10 text-center">
          <Sprout size={36} className="mx-auto mb-3" style={{ color: 'var(--fs-leaf-dark)' }} />
          <p className="font-semibold" style={{ color: 'var(--fs-text)' }}>No farms found</p>
          <p className="text-sm mt-1 mb-5" style={{ color: 'var(--fs-text-soft)' }}>Create your first farm to start monitoring</p>
          <button onClick={() => router.push('/farms/new')} className="fs-pill px-6 py-3 text-sm">Create Farm</button>
        </div>
      ) : (
        <div className="space-y-4 pb-28">
          {filtered.map((f, i) => (
            <motion.button key={f.id} variants={fade} custom={i} initial="hidden" animate="show"
              whileTap={{ scale: 0.98 }} onClick={() => router.push(`/farms/${f.id}`)}
              className="block w-full text-left rounded-[26px] overflow-hidden relative" style={{ height: 150 }}>
              <div className="absolute inset-0" style={{ backgroundImage: `url(${FIELD_IMGS[i % FIELD_IMGS.length]})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(110deg, rgba(28,36,23,0.82) 25%, rgba(28,36,23,0.35) 100%)' }} />
              <div className="relative h-full p-4 flex flex-col justify-between">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold text-white text-lg leading-tight">{f.name}</p>
                    <p className="text-xs text-white/70 mt-0.5">{f.crop_type || 'Crop not set'} · {parseFloat(f.area_hectares || '0').toFixed(1)} ha</p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-white">{f.latest_health_score || '--'}</div>
                    <div className="text-[11px]" style={{ color: '#ddd6fe' }}>{t(healthLabel(Number(f.latest_health_score) || 0))}</div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="h-1.5 rounded-full flex-1 mr-3" style={{ background: 'rgba(255,255,255,0.25)' }}>
                    <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, Number(f.latest_health_score) || 0)}%` }}
                      transition={{ duration: 0.8 }} className="h-full rounded-full" style={{ background: '#8b5cf6' }} />
                  </div>
                  <span className="text-xs font-semibold text-white flex items-center gap-0.5">View <ChevronRight size={14} /></span>
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
}
