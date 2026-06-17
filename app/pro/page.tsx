'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApi } from '@/hooks/useAuth';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Crown, Check, Infinity as InfIcon, Bell, LineChart,
  Languages, MapPinned, FileDown, Users, Sparkles,
} from 'lucide-react';

const PRO_FEATURES = [
  { icon: InfIcon, title: 'Unlimited farms', desc: 'Monitor as many fields as you manage' },
  { icon: Bell, title: 'Automated weekly scans', desc: 'Proactive alerts before stress is visible' },
  { icon: LineChart, title: 'Full historical trends', desc: 'NDVI / moisture / LST time-series' },
  { icon: Languages, title: 'Tamil voice & WhatsApp alerts', desc: 'Get advice in your language, off-app' },
  { icon: MapPinned, title: 'NDVI map overlays', desc: 'See exactly where stress is on your field' },
  { icon: Users, title: 'Regional intelligence', desc: 'District-wide pest & disease early warning' },
  { icon: FileDown, title: 'PDF reports', desc: 'Share with FPOs, dealers, and buyers' },
];

const fade = {
  hidden: { opacity: 0, y: 16 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.5, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] } }),
};

export default function ProPage() {
  const router = useRouter();
  const api = useApi();
  const [plan, setPlan] = useState<'starter' | 'grower' | 'pro_monthly' | 'pro_yearly'>('grower');
  const [busy, setBusy] = useState(false);
  const [tier, setTier] = useState('free');
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api('/api/auth/me').then((u: any) => { setTier(u?.subscriptionTier || 'free'); setEmail(u?.email || ''); }).catch(() => {});
    if (!document.getElementById('rzp-sdk')) {
      const s = document.createElement('script');
      s.id = 'rzp-sdk';
      s.src = 'https://checkout.razorpay.com/v1/checkout.js';
      document.body.appendChild(s);
    }
  }, []);

  const PLAN_INFO: Record<string, { price: string; per: string; amount: number }> = {
    starter:     { price: '₹99',    per: '/mo · 1 farm',      amount: 9900 },
    grower:      { price: '₹499',   per: '/mo · up to 5',     amount: 49900 },
    pro_monthly: { price: '₹999',   per: '/mo · unlimited',   amount: 99900 },
    pro_yearly:  { price: '₹1,999', per: '/yr · unlimited',   amount: 199900 },
  };

  async function upgrade() {
    setBusy(true); setMsg('');
    try {
      const order = await api('/api/payment/create-order', { method: 'POST', body: JSON.stringify({ plan }) });

      if (order.adminFree) {
        setTier('pro'); setMsg('Admin account — upgraded free, no payment required.'); setBusy(false); return;
      }
      if (order.demo) {
        await api('/api/payment/verify', { method: 'POST', body: JSON.stringify({ demo: true, plan }) });
        setTier(order.tier || 'pro'); setMsg('Upgraded! (demo mode — no real charge)'); setBusy(false); return;
      }

      const Rzp = (window as any).Razorpay;
      if (!Rzp) { setMsg('Payment library still loading, try again.'); setBusy(false); return; }

      const rzp = new Rzp({
        key: order.keyId, amount: order.amount, currency: order.currency,
        name: 'Cognentrz', description: order.label, order_id: order.orderId,
        image: '/icon-192.png',
        prefill: { email, contact: '' },
        theme: { color: '#6d28d9' },
        method: { upi: true, card: true, netbanking: true, wallet: true },
        config: {
          display: {
            blocks: {
              upi: {
                name: 'Pay via UPI (GPay, PhonePe, Paytm)',
                instruments: [{ method: 'upi' }],
              },
            },
            sequence: ['block.upi', 'method.card', 'method.netbanking', 'method.wallet'],
            preferences: { show_default_blocks: true },
          },
        },
        handler: async (resp: any) => {
          const v = await api('/api/payment/verify', { method: 'POST', body: JSON.stringify({ ...resp, plan }) });
          if (v.success) { setTier(v.tier); setMsg('Payment successful — plan activated!'); }
          else setMsg('Verification failed. Contact support.');
        },
        modal: { ondismiss: () => setBusy(false) },
      });
      rzp.open();
      setBusy(false);
    } catch (e: any) { setMsg('Upgrade failed: ' + e.message); setBusy(false); }
  }

  const isPro = tier === 'pro' || tier === 'grower' || tier === 'starter';
  const isAdmin = email.toLowerCase() === 'logesh.visvanathan2003@gmail.com';
  const cur = PLAN_INFO[plan];

  return (
    <div className="fs-app px-4 pt-6 pb-28">
      <div className="flex items-center gap-3 mb-4">
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => router.back()}
          className="fs-light-card w-10 h-10 rounded-xl flex items-center justify-center">
          <ArrowLeft size={18} style={{ color: 'var(--fs-text)' }} />
        </motion.button>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--fs-text)' }}>Cognentrz Pro</h1>
      </div>

      {/* Hero */}
      <motion.div variants={fade} custom={0} initial="hidden" animate="show"
        className="fs-forest-card rounded-[28px] p-6 relative overflow-hidden text-center">
        <div className="absolute -right-12 -top-12 w-48 h-48 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.35), transparent 70%)' }} />
        <div className="relative">
          <motion.div animate={{ rotate: [0, -8, 8, 0] }} transition={{ duration: 3, repeat: Infinity }}
            className="w-16 h-16 rounded-2xl mx-auto mb-3 flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#8b5cf6,#6d28d9)' }}>
            <Crown size={30} color="#fff" />
          </motion.div>
          <h2 className="text-xl font-bold">{isPro ? 'You are Pro ✓' : 'Unlock the full platform'}</h2>
          <p className="text-sm mt-1" style={{ color: 'var(--fs-on-forest-soft)' }}>
            {isPro ? 'Thank you for supporting Cognentrz.' : 'Everything you need to protect your harvest.'}
          </p>
        </div>
      </motion.div>

      {msg && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="mt-3 px-4 py-2.5 rounded-xl text-sm font-medium text-center"
          style={{ background: 'rgba(124,58,237,0.18)', color: '#6d28d9' }}>
          {msg}
        </motion.div>
      )}

      {/* Plan grid */}
      {!isPro && (
        <motion.div variants={fade} custom={1} initial="hidden" animate="show" className="mt-4 grid grid-cols-2 gap-3">
          {[
            { key: 'starter', title: 'Starter', price: '₹99', sub: '1 farm · monthly' },
            { key: 'grower', title: 'Grower', price: '₹499', sub: 'up to 5 farms' },
            { key: 'pro_monthly', title: 'Pro Monthly', price: '₹999', sub: 'unlimited farms' },
            { key: 'pro_yearly', title: 'Pro Yearly', price: '₹1,999', sub: 'save 16% · best value' },
          ].map((p) => (
            <button key={p.key} onClick={() => setPlan(p.key as any)}
              className="rounded-[20px] p-4 text-left transition-all relative overflow-hidden"
              style={plan === p.key
                ? { background: 'linear-gradient(135deg,#8b5cf6,#6d28d9)', color: '#fff' }
                : { background: 'var(--fs-card)', color: 'var(--fs-text)', border: '1px solid rgba(28,36,23,0.08)' }}>
              <p className="text-sm font-semibold">{p.title}</p>
              <p className="text-2xl font-bold mt-1">{p.price}</p>
              <p className="text-[11px] mt-0.5" style={{ opacity: 0.8 }}>{p.sub}</p>
              {p.key === 'pro_yearly' && (
                <span className="absolute top-2 right-2 text-[9px] px-2 py-0.5 rounded-full font-semibold"
                  style={{ background: plan === p.key ? 'rgba(255,255,255,0.25)' : 'rgba(124,58,237,0.2)', color: plan === p.key ? '#fff' : '#6d28d9' }}>
                  BEST
                </span>
              )}
            </button>
          ))}
        </motion.div>
      )}

      {isAdmin && !isPro && (
        <motion.div variants={fade} custom={1} initial="hidden" animate="show"
          className="mt-3 px-4 py-2.5 rounded-xl text-sm text-center font-medium"
          style={{ background: 'rgba(124,58,237,0.15)', color: '#6d28d9' }}>
          Admin account — your upgrade is free, no payment needed.
        </motion.div>
      )}

      {/* Features */}
      <motion.div variants={fade} custom={2} initial="hidden" animate="show" className="mt-4 fs-light-card rounded-[22px] p-5 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles size={16} style={{ color: 'var(--fs-leaf-dark)' }} />
          <p className="text-sm font-semibold" style={{ color: 'var(--fs-text)' }}>What's included</p>
        </div>
        {PRO_FEATURES.map((f, i) => {
          const Ic = f.icon;
          return (
            <div key={i} className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(124,58,237,0.15)' }}>
                <Ic size={15} style={{ color: 'var(--fs-leaf-dark)' }} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium" style={{ color: 'var(--fs-text)' }}>{f.title}</p>
                <p className="text-xs" style={{ color: 'var(--fs-text-soft)' }}>{f.desc}</p>
              </div>
              <Check size={16} style={{ color: 'var(--fs-leaf-dark)' }} />
            </div>
          );
        })}
      </motion.div>

      {/* Note about not paywalling safety */}
      <p className="text-[11px] text-center mt-3 px-4" style={{ color: 'var(--fs-text-soft)' }}>
        Critical pest & crop-loss warnings stay free for everyone — Pro unlocks depth and convenience, never safety.
      </p>

      {/* CTA */}
      {!isPro && (
        <motion.button variants={fade} custom={3} initial="hidden" animate="show"
          whileTap={{ scale: 0.98 }} onClick={upgrade} disabled={busy}
          className="fs-pill w-full py-4 mt-4 text-sm font-semibold flex items-center justify-center gap-2">
          <Crown size={18} /> {busy ? 'Processing…' : isAdmin ? 'Activate Pro (Free)' : `Pay ${cur.price} ${cur.per}`}
        </motion.button>
      )}

      {isPro && (
        <motion.button variants={fade} custom={3} initial="hidden" animate="show"
          onClick={() => router.push('/dashboard')}
          className="fs-pill w-full py-4 mt-4 text-sm font-semibold">
          Back to Dashboard
        </motion.button>
      )}
    </div>
  );
}
