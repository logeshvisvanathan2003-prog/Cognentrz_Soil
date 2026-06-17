'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApi } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useThemeProvider';
import { useLocation } from '@/hooks/useLocation';
import { useLanguage, LANGUAGES } from '@/hooks/useLanguage';
import { motion } from 'framer-motion';
import {
  User, Lock, Bell, Moon, Sun, LogOut, Save, Eye, EyeOff, MapPin,
  ChevronRight, Leaf, Shield, Globe, Sprout, Crown,
} from 'lucide-react';

const fade = {
  hidden: { opacity: 0, y: 16 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.5, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] } }),
};

export default function SettingsPage() {
  const router = useRouter();
  const api = useApi();
  const { theme, toggleTheme } = useTheme();
  const geo = useLocation();
  const { lang, setLang } = useLanguage();
  const isDark = theme === 'dark';

  const [profile, setProfile] = useState({ name: '', email: '', phone: '' });
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [showPw, setShowPw] = useState(false);
  const [notif, setNotif] = useState({ alerts: true, weekly: true, ai: true });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [tab, setTab] = useState<'profile' | 'security' | 'prefs'>('profile');

  useEffect(() => {
    api('/api/auth/me').then((u: any) => {
      if (u) setProfile({ name: u.name || '', email: u.email || '', phone: u.phone || '' });
    }).catch(() => {});
  }, []);

  async function saveProfile() {
    setLoading(true); setMsg('');
    try { await api('/api/auth/profile', { method: 'PUT', body: JSON.stringify(profile) }); flash('Profile updated'); }
    catch (e: any) { flash('Failed: ' + e.message); } finally { setLoading(false); }
  }
  async function changePw() {
    if (pw.next !== pw.confirm) return flash('Passwords do not match');
    setLoading(true); setMsg('');
    try {
      await api('/api/auth/change-password', { method: 'POST', body: JSON.stringify({ currentPassword: pw.current, newPassword: pw.next }) });
      setPw({ current: '', next: '', confirm: '' }); flash('Password changed');
    } catch (e: any) { flash('Failed: ' + e.message); } finally { setLoading(false); }
  }
  async function logout() {
    try { await api('/api/auth/logout', { method: 'POST' }); } catch {}
    localStorage.removeItem('cognentrz_token'); localStorage.removeItem('cognentrz_user');
    router.push('/login');
  }
  function flash(m: string) { setMsg(m); setTimeout(() => setMsg(''), 2600); }

  const Field = ({ label, type = 'text', value, onChange, placeholder }: any) => (
    <div>
      <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--fs-text-soft)' }}>{label}</label>
      <input type={type} value={value} onChange={onChange} placeholder={placeholder}
        className="w-full px-4 py-3 rounded-xl text-sm outline-none fs-light-card" style={{ color: 'var(--fs-text)' }} />
    </div>
  );
  const Toggle = ({ on, set }: { on: boolean; set: (v: boolean) => void }) => (
    <button onClick={() => set(!on)} className="w-11 h-6 rounded-full transition-colors relative"
      style={{ background: on ? 'linear-gradient(135deg,#8b5cf6,#6d28d9)' : 'rgba(120,120,120,0.4)' }}>
      <motion.div animate={{ x: on ? 22 : 3 }} className="w-5 h-5 bg-white rounded-full absolute top-0.5" />
    </button>
  );

  return (
    <div className="fs-app px-4 pt-6 pb-28">
      {/* ===== Profile hero ===== */}
      <motion.div variants={fade} custom={0} initial="hidden" animate="show"
        className="fs-forest-card rounded-[26px] p-5 relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.3), transparent 70%)' }} />
        <div className="relative flex items-center gap-4">
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold"
            style={{ background: 'rgba(255,255,255,0.18)', border: '2px solid rgba(255,255,255,0.3)' }}>
            {(profile.name?.[0] || 'F').toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-lg font-bold truncate">{profile.name || 'Farmer'}</p>
            <p className="text-xs truncate" style={{ color: 'var(--fs-on-forest-soft)' }}>{profile.email || 'No email set'}</p>
            <div className="flex items-center gap-1 mt-1 text-xs" style={{ color: 'var(--fs-on-forest-soft)' }}>
              <MapPin size={12} /> {geo.loading ? 'Locating…' : geo.label}
            </div>
          </div>
        </div>
        <div className="relative mt-4 grid grid-cols-3 gap-2">
          {[
            { icon: Leaf, label: 'Plan', value: 'Pro' },
            { icon: Shield, label: 'Status', value: 'Active' },
            { icon: Globe, label: 'Region', value: 'IN' },
          ].map(({ icon: Ic, label, value }) => (
            <div key={label} className="fs-glass-forest rounded-2xl py-2.5 text-center">
              <Ic size={15} className="mx-auto mb-1" style={{ color: 'rgba(255,255,255,0.8)' }} />
              <div className="text-sm font-semibold">{value}</div>
              <div className="text-[10px]" style={{ color: 'var(--fs-on-forest-soft)' }}>{label}</div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ===== Upgrade to Pro banner ===== */}
      <motion.button variants={fade} custom={1} initial="hidden" animate="show"
        onClick={() => router.push('/pro')}
        className="mt-3 w-full text-left rounded-[22px] p-4 flex items-center gap-3 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg,#8b5cf6,#6d28d9)', color: '#fff' }}>
        <div className="absolute -right-6 -bottom-8 w-28 h-28 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }} />
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.2)' }}>
          <Crown size={20} />
        </div>
        <div className="relative flex-1">
          <p className="font-semibold text-sm">Upgrade to Pro</p>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.8)' }}>Unlimited farms, Tamil alerts, regional intelligence</p>
        </div>
        <ChevronRight size={18} />
      </motion.button>

      {/* message */}
      {msg && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="mt-3 px-4 py-2.5 rounded-xl text-sm font-medium"
          style={{ background: msg.includes('Failed') || msg.includes('not match') ? 'rgba(239,68,68,0.15)' : 'rgba(124,58,237,0.18)',
                   color: msg.includes('Failed') || msg.includes('not match') ? '#ef4444' : '#6d28d9' }}>
          {msg}
        </motion.div>
      )}

      {/* ===== Tab switch ===== */}
      <motion.div variants={fade} custom={1} initial="hidden" animate="show" className="mt-4 flex gap-2">
        {[
          { key: 'profile', label: 'Profile', icon: User },
          { key: 'security', label: 'Security', icon: Lock },
          { key: 'prefs', label: 'Preferences', icon: Bell },
        ].map(({ key, label, icon: Ic }) => (
          <button key={key} onClick={() => setTab(key as any)}
            className="flex-1 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
            style={tab === key
              ? { background: 'linear-gradient(135deg,#8b5cf6,#6d28d9)', color: '#fff' }
              : { background: 'var(--fs-card)', color: 'var(--fs-text-soft)', border: '1px solid rgba(28,36,23,0.06)' }}>
            <Ic size={14} /> {label}
          </button>
        ))}
      </motion.div>

      {/* ===== Tab content ===== */}
      <motion.div key={tab} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }} className="mt-4 space-y-3">
        {tab === 'profile' && (
          <div className="fs-light-card rounded-[22px] p-5 space-y-3">
            <Field label="Full Name" value={profile.name} onChange={(e: any) => setProfile({ ...profile, name: e.target.value })} placeholder="Your name" />
            <Field label="Email" type="email" value={profile.email} onChange={(e: any) => setProfile({ ...profile, email: e.target.value })} placeholder="you@email.com" />
            <Field label="Phone" type="tel" value={profile.phone} onChange={(e: any) => setProfile({ ...profile, phone: e.target.value })} placeholder="+91 …" />
            <button onClick={saveProfile} disabled={loading} className="fs-pill w-full py-3 text-sm flex items-center justify-center gap-2">
              <Save size={16} /> {loading ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        )}

        {tab === 'security' && (
          <div className="fs-light-card rounded-[22px] p-5 space-y-3">
            <Field label="Current Password" type={showPw ? 'text' : 'password'} value={pw.current} onChange={(e: any) => setPw({ ...pw, current: e.target.value })} placeholder="Current password" />
            <Field label="New Password" type={showPw ? 'text' : 'password'} value={pw.next} onChange={(e: any) => setPw({ ...pw, next: e.target.value })} placeholder="New password" />
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Field label="Confirm Password" type={showPw ? 'text' : 'password'} value={pw.confirm} onChange={(e: any) => setPw({ ...pw, confirm: e.target.value })} placeholder="Confirm" />
              </div>
              <button onClick={() => setShowPw(!showPw)} className="mb-0.5 p-3 rounded-xl fs-light-card">
                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <button onClick={changePw} disabled={loading} className="fs-pill w-full py-3 text-sm">
              {loading ? 'Updating…' : 'Update Password'}
            </button>
          </div>
        )}

        {tab === 'prefs' && (
          <>
            <div className="fs-light-card rounded-[22px] p-5 space-y-4">
              <p className="text-sm font-semibold" style={{ color: 'var(--fs-text)' }}>Notifications</p>
              {[
                { k: 'alerts', label: 'Critical Alerts' },
                { k: 'weekly', label: 'Weekly Report' },
                { k: 'ai', label: 'AI Recommendations' },
              ].map(({ k, label }) => (
                <div key={k} className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: 'var(--fs-text)' }}>{label}</span>
                  <Toggle on={(notif as any)[k]} set={(v) => setNotif({ ...notif, [k]: v })} />
                </div>
              ))}
            </div>

            <div className="fs-light-card rounded-[22px] p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isDark ? <Moon size={18} style={{ color: 'var(--fs-leaf-dark)' }} /> : <Sun size={18} style={{ color: 'var(--fs-leaf-dark)' }} />}
                  <span className="text-sm font-medium" style={{ color: 'var(--fs-text)' }}>Dark Mode</span>
                </div>
                <Toggle on={isDark} set={() => toggleTheme()} />
              </div>
              <p className="text-xs mt-2" style={{ color: 'var(--fs-text-soft)' }}>
                Currently in <span style={{ color: 'var(--fs-leaf-dark)' }} className="font-semibold">{isDark ? 'Dark' : 'Light'}</span> mode
              </p>
            </div>
            <div className="fs-light-card rounded-[22px] p-5">
              <div className="flex items-center gap-2 mb-3">
                <Globe size={18} style={{ color: 'var(--fs-leaf-dark)' }} />
                <span className="text-sm font-medium" style={{ color: 'var(--fs-text)' }}>Language</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {LANGUAGES.map((l) => (
                  <button key={l.code} onClick={() => setLang(l.code)}
                    className="py-2.5 rounded-xl text-center transition-all"
                    style={lang === l.code
                      ? { background: 'linear-gradient(135deg,#8b5cf6,#6d28d9)', color: '#fff' }
                      : { background: 'rgba(120,120,120,0.1)', color: 'var(--fs-text)' }}>
                    <div className="text-sm font-semibold">{l.native}</div>
                    <div className="text-[10px]" style={{ opacity: 0.7 }}>{l.label}</div>
                  </button>
                ))}
              </div>
              <p className="text-xs mt-2" style={{ color: 'var(--fs-text-soft)' }}>
                Powered by Google Translate · alerts & tips delivered in your language
              </p>
            </div>
          </>
        )}

        {/* Sign out */}
        <button onClick={logout} className="w-full py-3.5 rounded-[20px] text-sm font-semibold flex items-center justify-center gap-2"
          style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>
          <LogOut size={16} /> Sign Out
        </button>

        <p className="text-center text-xs pt-1" style={{ color: 'var(--fs-text-soft)' }}>
          Cognentrz · Soil Intelligence Platform
        </p>
      </motion.div>
    </div>
  );
}
