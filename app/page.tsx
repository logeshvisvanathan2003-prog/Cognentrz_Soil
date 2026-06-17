'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Sprout } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.replace('/dashboard');
      } else {
        router.replace('/login');
      }
    }
  }, [user, loading, router]);

  // Show spinner while auth state resolves
  return (
    <div className="min-h-dvh flex items-center justify-center" style={{ background: '#0a0f0a' }}>
      <div className="text-center">
        <div className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center"
          style={{ background: 'rgba(124,58,237,0.15)' }}>
          <Sprout size={28} color="#7c3aed" className="animate-pulse" />
        </div>
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>Loading Cognentrz…</p>
      </div>
    </div>
  );
}
