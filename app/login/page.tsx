'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Mail, Lock, User, Phone, Eye, EyeOff, Sprout } from 'lucide-react';

const HERO_IMG = 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=1000&q=80';

export default function LoginPage() {
  const router = useRouter();
  // Use the OUTER AuthProvider from root layout — so login/register updates
  // the shared auth state that AppShell and all other pages read from.
  const { login, register } = useAuth();

  const [stage, setStage] = useState<'hero' | 'form'>('hero');
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', location: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (isRegister) {
        await register({ name: form.name, email: form.email, password: form.password, phone: form.phone });
      } else {
        await login(form.email, form.password);
      }
      // Auth state is now updated in the shared root AuthProvider.
      // Navigate to dashboard — AppShell will see the logged-in user correctly.
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh relative overflow-hidden" style={{ background: '#0e150d' }}>
      {/* Full-bleed hero photo */}
      <div className="absolute inset-0">
        <div className="absolute inset-0" style={{ backgroundImage: `url(${HERO_IMG})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(14,21,13,0.25) 0%, rgba(14,21,13,0.55) 45%, rgba(14,21,13,0.97) 100%)' }} />
      </div>

      {/* floating leaves */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <motion.div key={i} className="absolute"
            style={{ left: `${10 + i * 15}%`, top: `${8 + (i % 3) * 7}%`, color: 'rgba(255,255,255,0.25)' }}
            animate={{ y: [0, -14, 0], x: [0, 8, 0] }}
            transition={{ duration: 5 + i, repeat: Infinity, delay: i * 0.4 }}>
            <Sprout size={20 + (i % 3) * 6} />
          </motion.div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {stage === 'hero' ? (
          /* ── HERO SPLASH ── */
          <motion.div key="hero" exit={{ opacity: 0, y: -30 }}
            className="relative z-10 min-h-dvh flex flex-col justify-end px-7 pb-16">
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6"
                style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.2)' }}>
                <Sprout size={14} className="text-white" />
                <span className="text-xs font-medium text-white">Cognentrz · Soil Intelligence</span>
              </div>
              <h1 className="text-5xl font-extrabold text-white leading-[1.05] tracking-tight">
                DIGITAL<br />AGRICULTURE
              </h1>
              <p className="text-base mt-4 max-w-xs" style={{ color: 'rgba(255,255,255,0.7)' }}>
                Real-time satellite soil intelligence for Tamil Nadu farms — in your language.
              </p>
              <motion.button whileTap={{ scale: 0.92 }} onClick={() => setStage('form')}
                className="mt-10 w-20 h-20 rounded-full flex items-center justify-center relative"
                style={{ background: '#fff' }}>
                <svg className="absolute inset-0" width="80" height="80" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="37" fill="none" stroke="#8b5cf6" strokeWidth="3"
                    strokeDasharray="232" strokeDashoffset="60" strokeLinecap="round" transform="rotate(-90 40 40)" />
                </svg>
                <ArrowRight size={26} style={{ color: '#1c2417' }} />
              </motion.button>
            </motion.div>
          </motion.div>
        ) : (
          /* ── AUTH FORM ── */
          <motion.div key="form" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
            className="relative z-10 min-h-dvh flex flex-col justify-end">
            <div className="px-6 pt-10 pb-8 rounded-t-[34px]"
              style={{ background: 'rgba(20,28,16,0.7)', backdropFilter: 'blur(28px) saturate(1.4)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div className="w-10 h-1 rounded-full mx-auto mb-6" style={{ background: 'rgba(255,255,255,0.25)' }} />
              <h2 className="text-2xl font-bold text-white">{isRegister ? 'Create account' : 'Welcome back'}</h2>
              <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.6)' }}>
                {isRegister ? 'Start monitoring your fields today' : 'Sign in to your farms'}
              </p>

              {error && (
                <div className="mb-4 px-4 py-2.5 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.15)', color: '#fca5a5' }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3">
                {isRegister && (
                  <GlassInput icon={User} placeholder="Full name" value={form.name}
                    onChange={(v) => setForm({ ...form, name: v })} />
                )}
                <GlassInput icon={Mail} type="email" placeholder="Email" value={form.email}
                  onChange={(v) => setForm({ ...form, email: v })} />
                {isRegister && (
                  <GlassInput icon={Phone} type="tel" placeholder="Phone (+91…)" value={form.phone}
                    onChange={(v) => setForm({ ...form, phone: v })} />
                )}
                <div className="relative">
                  <GlassInput icon={Lock} type={showPw ? 'text' : 'password'} placeholder="Password"
                    value={form.password} onChange={(v) => setForm({ ...form, password: v })} />
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    className="absolute right-4 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                <motion.button whileTap={{ scale: 0.98 }} type="submit" disabled={loading}
                  className="w-full py-4 rounded-2xl text-sm font-semibold text-white flex items-center justify-center gap-2 mt-2"
                  style={{ background: 'linear-gradient(135deg,#8b5cf6,#6d28d9)', boxShadow: '0 10px 30px rgba(124,58,237,0.4)' }}>
                  {loading ? 'Please wait…' : isRegister ? 'Create Account' : 'Sign In'}
                  {!loading && <ArrowRight size={18} />}
                </motion.button>
              </form>

              <button onClick={() => { setIsRegister(!isRegister); setError(''); }}
                className="w-full text-center text-sm mt-5" style={{ color: 'rgba(255,255,255,0.65)' }}>
                {isRegister ? 'Already have an account? ' : "Don't have an account? "}
                <span style={{ color: '#a78bfa', fontWeight: 600 }}>{isRegister ? 'Sign in' : 'Register'}</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function GlassInput({ icon: Icon, type = 'text', placeholder, value, onChange }: {
  icon: any; type?: string; placeholder: string; value: string; onChange: (v: string) => void;
}) {
  return (
    <div className="relative">
      <Icon size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 z-10" style={{ color: 'rgba(255,255,255,0.7)' }} />
      <input type={type} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)}
        required
        className="w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none login-glass-input"
        style={{ color: '#fff', background: 'rgba(255,255,255,0.16)', border: '1px solid rgba(255,255,255,0.28)' }} />
    </div>
  );
}
