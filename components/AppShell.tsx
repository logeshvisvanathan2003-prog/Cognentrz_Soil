'use client';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { LayoutGrid, Warehouse, Map as MapIcon, FileText, Settings, Sprout } from 'lucide-react';

const navItems = [
  { path: '/dashboard', label: 'Home', icon: LayoutGrid },
  { path: '/farms', label: 'Farms', icon: Warehouse },
  { path: '/map', label: 'Map', icon: MapIcon },
  { path: '/reports', label: 'Reports', icon: FileText },
  { path: '/settings', label: 'Settings', icon: Settings },
];

// AppShell wraps all authenticated pages.
// AuthProvider lives in the root layout so all pages share the same auth state.
export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="fs-app flex items-center justify-center min-h-dvh">
        <div className="text-center">
          <div
            className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center"
            style={{ background: 'rgba(124,58,237,0.15)' }}
          >
            <Sprout size={28} color="#7c3aed" className="animate-pulse" />
          </div>
          <p className="text-sm" style={{ color: 'var(--fs-text-soft)' }}>Loading Cognentrz…</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  // Hide bottom nav on full-screen map flows (drawing a farm boundary)
  const hideNav = pathname === '/farms/new' || pathname.endsWith('/edit');

  return (
    <div className="fs-app min-h-dvh flex flex-col">
      <main className="flex-1 overflow-y-auto max-w-[440px] w-full mx-auto">{children}</main>

      {/* Floating pill bottom nav */}
      {!hideNav && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-4 pt-2">
          <div className="fs-nav rounded-[26px] px-2 py-2 flex items-center justify-around max-w-[440px] mx-auto">
            {navItems.map(({ path, label, icon: Icon }) => {
              const active = pathname === path || pathname.startsWith(path + '/');
              return (
                <Link
                  key={path}
                  href={path}
                  className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-2xl transition-all duration-300"
                  style={{
                    color: active ? '#fff' : 'var(--fs-text-soft)',
                    background: active ? 'linear-gradient(135deg,#8b5cf6,#6d28d9)' : 'transparent',
                    minWidth: 54,
                    boxShadow: active ? '0 8px 20px rgba(124,58,237,0.4)' : 'none',
                  }}
                >
                  <Icon size={20} />
                  <span className="text-[10px] font-semibold leading-none">{label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
