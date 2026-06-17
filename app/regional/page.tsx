'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApi } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, AlertTriangle, Activity, Sprout, Users, MapPin, TrendingDown, ShieldCheck, MessageCircle, Send } from 'lucide-react';

const fade = {
  hidden: { opacity: 0, y: 18 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.5, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] } }),
};

export default function RegionalPage() {
  const router = useRouter();
  const api = useApi();
  const { lang, translate, t } = useLanguage();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState('');
  const [sending, setSending] = useState('');
  const [sentMsg, setSentMsg] = useState('');

  useEffect(() => {
    api('/api/regional?radius=25')
      .then((d: any) => setData(d))
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  async function sendWhatsApp(outbreak: any) {
    if (!phone.trim()) { setSentMsg('Enter a WhatsApp number first (with country code, e.g. +91…)'); return; }
    setSending(outbreak.crop); setSentMsg('');
    try {
      // translate the alert into the chosen language before sending
      const [translated] = await translate([outbreak.message]);
      const res = await api('/api/whatsapp/send', {
        method: 'POST',
        body: JSON.stringify({ to: phone.trim(), message: `🌾 Cognentrz Alert: ${translated}` }),
      });
      setSentMsg(res.demo ? `Alert prepared in ${lang.toUpperCase()} (demo — connect Twilio to send live).` : 'WhatsApp alert sent!');
    } catch (e: any) {
      setSentMsg('Failed: ' + e.message);
    } finally {
      setSending('');
    }
  }

  const statusMeta = (s: string) =>
    s === 'outbreak' ? { color: '#fb7185', label: 'Outbreak Risk', bg: 'rgba(251,113,133,0.15)' }
    : s === 'watch' ? { color: '#fbbf24', label: 'Watch', bg: 'rgba(251,191,36,0.15)' }
    : { color: '#8b5cf6', label: 'Healthy', bg: 'rgba(124,58,237,0.15)' };

  return (
    <div className="fs-app px-4 pt-6 pb-28">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => router.push('/dashboard')}
          className="fs-light-card w-10 h-10 rounded-xl flex items-center justify-center">
          <ArrowLeft size={18} style={{ color: 'var(--fs-text)' }} />
        </motion.button>
        <div>
          <h1 className="text-2xl font-bold leading-tight" style={{ color: 'var(--fs-text)' }}>{t('Regional Intelligence')}</h1>
          <p className="text-xs" style={{ color: 'var(--fs-text-soft)' }}>{t('District-wide pest & disease early warning')}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.6, repeat: Infinity, ease: 'linear' }}>
            <Activity size={32} color="#7c3aed" />
          </motion.div>
        </div>
      ) : (
        <>
          {/* Hero explainer card */}
          <motion.div variants={fade} custom={0} initial="hidden" animate="show"
            className="fs-forest-card rounded-[26px] p-5 relative overflow-hidden">
            <div className="absolute -right-10 -top-10 w-44 h-44 rounded-full"
              style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.3), transparent 70%)' }} />
            <div className="relative">
              <div className="flex items-center gap-2 mb-2">
                <Users size={18} />
                <span className="text-sm font-semibold">District-wide signal</span>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--fs-on-forest-soft)' }}>
                When many nearby fields growing the same crop decline together in the same week, it signals a spreading
                pest or disease — something no single-farm view can detect. This is powered by anonymized data from all
                farms within 25&nbsp;km.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="fs-glass-forest rounded-2xl py-3 text-center">
                  <div className="text-2xl font-bold">{data?.summary?.regionsTracked ?? 0}</div>
                  <div className="text-[11px]" style={{ color: 'var(--fs-on-forest-soft)' }}>{t('Regions tracked')}</div>
                </div>
                <div className="fs-glass-forest rounded-2xl py-3 text-center">
                  <div className="text-2xl font-bold" style={{ color: data?.summary?.outbreakAlerts ? '#ffb4b4' : '#ddd6fe' }}>
                    {data?.summary?.outbreakAlerts ?? 0}
                  </div>
                  <div className="text-[11px]" style={{ color: 'var(--fs-on-forest-soft)' }}>{t('Outbreak alerts')}</div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Outbreak alerts */}
          <AnimatePresence>
            {data?.outbreaks?.length > 0 && (
              <motion.div variants={fade} custom={1} initial="hidden" animate="show" className="mt-4 space-y-3">
                {data.outbreaks.map((o: any, i: number) => (
                  <motion.div key={i}
                    initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
                    className="rounded-[22px] p-4 relative overflow-hidden"
                    style={{ background: 'linear-gradient(135deg, rgba(251,113,133,0.18), rgba(239,68,68,0.1))', border: '1px solid rgba(251,113,133,0.4)' }}>
                    <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 2, repeat: Infinity }}
                      className="absolute top-4 right-4">
                      <AlertTriangle size={22} style={{ color: '#fb7185' }} />
                    </motion.div>
                    <p className="font-bold text-sm mb-1" style={{ color: 'var(--fs-text)' }}>
                      {o.crop} · Outbreak Risk Detected
                    </p>
                    <p className="text-xs leading-relaxed pr-7" style={{ color: 'var(--fs-text-soft)' }}>{o.message}</p>
                    <button onClick={() => sendWhatsApp(o)} disabled={sending === o.crop}
                      className="mt-3 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold"
                      style={{ background: '#25D366', color: '#fff' }}>
                      <MessageCircle size={14} /> {sending === o.crop ? 'Sending…' : t('Send WhatsApp Alert')}
                    </button>
                  </motion.div>
                ))}
                {/* phone input for whatsapp */}
                <div className="fs-light-card rounded-[18px] p-3 flex items-center gap-2">
                  <Send size={15} style={{ color: 'var(--fs-leaf-dark)' }} />
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="WhatsApp number (+91…)"
                    className="flex-1 bg-transparent outline-none text-sm" style={{ color: 'var(--fs-text)' }} />
                </div>
                {sentMsg && <p className="text-xs px-1" style={{ color: 'var(--fs-leaf-dark)' }}>{sentMsg}</p>}
              </motion.div>
            )}
          </AnimatePresence>

          {/* No-outbreak helpful note */}
          {data?.outbreaks?.length === 0 && data?.regions?.length > 0 && (
            <motion.div variants={fade} custom={1} initial="hidden" animate="show"
              className="mt-4 fs-light-card rounded-[20px] p-4">
              <p className="text-sm font-semibold mb-1" style={{ color: 'var(--fs-leaf-dark)' }}>✓ No outbreaks detected</p>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--fs-text-soft)' }}>
                All monitored regions are stable. An outbreak alert appears when 3+ nearby fields of the same crop show
                a synchronized NDVI drop across two recent scans. To populate regional data for a demo, run
                <code className="mx-1 px-1 rounded" style={{ background: 'rgba(124,58,237,0.15)' }}>npm run seed:regional</code>
                then refresh.
              </p>
            </motion.div>
          )}

          {/* Region list */}
          <motion.div variants={fade} custom={2} initial="hidden" animate="show" className="mt-5">
            <h2 className="text-base font-bold mb-3" style={{ color: 'var(--fs-text)' }}>{t('Your Crop Regions')}</h2>
            {(!data?.regions || data.regions.length === 0) ? (
              <div className="fs-light-card rounded-[22px] p-8 text-center">
                <Sprout size={32} className="mx-auto mb-2" style={{ color: 'var(--fs-leaf-dark)' }} />
                <p className="font-semibold text-sm" style={{ color: 'var(--fs-text)' }}>No regional data yet</p>
                <p className="text-xs mt-1" style={{ color: 'var(--fs-text-soft)' }}>
                  Add farms and run analyses — regional signals appear as more nearby fields are monitored.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.regions.map((r: any, i: number) => {
                  const m = statusMeta(r.status);
                  return (
                    <motion.div key={r.crop} variants={fade} custom={3 + i} initial="hidden" animate="show"
                      className="fs-light-card rounded-[22px] p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: m.bg }}>
                            {r.status === 'outbreak' ? <TrendingDown size={17} style={{ color: m.color }} />
                              : r.status === 'watch' ? <Activity size={17} style={{ color: m.color }} />
                              : <ShieldCheck size={17} style={{ color: m.color }} />}
                          </div>
                          <div>
                            <p className="font-semibold text-sm" style={{ color: 'var(--fs-text)' }}>{r.crop}</p>
                            <p className="text-[11px]" style={{ color: 'var(--fs-text-soft)' }}>
                              {r.farmCount} {t(r.farmCount === 1 ? 'nearby field' : 'nearby fields')}
                            </p>
                          </div>
                        </div>
                        <span className="px-2.5 py-1 rounded-lg text-[11px] font-semibold" style={{ background: m.bg, color: m.color }}>
                          {t(m.label)}
                        </span>
                      </div>

                      {/* decline bar */}
                      <div className="mt-3">
                        <div className="flex justify-between text-[11px] mb-1" style={{ color: 'var(--fs-text-soft)' }}>
                          <span>{t('Fields declining')}</span>
                          <span style={{ color: m.color }}>{r.declineRatio}%</span>
                        </div>
                        <div className="h-2 rounded-full" style={{ background: 'rgba(120,120,120,0.18)' }}>
                          <motion.div initial={{ width: 0 }} animate={{ width: `${r.declineRatio}%` }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                            className="h-full rounded-full" style={{ background: m.color }} />
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between text-[11px]" style={{ color: 'var(--fs-text-soft)' }}>
                        <span className="flex items-center gap-1"><MapPin size={11} /> Avg NDVI {r.avgNdvi}</span>
                        <span>{r.decliningCount} {t('declining now')}</span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>

          <p className="text-center text-[11px] mt-5" style={{ color: 'var(--fs-text-soft)' }}>
            Privacy-safe · aggregated from anonymized nearby farms
          </p>
        </>
      )}
    </div>
  );
}
