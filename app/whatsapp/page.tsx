'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sprout } from 'lucide-react';

// WhatsApp alerts are now fully automatic — no manual setup needed.
// Phone number is taken from your registration profile.
export default function WhatsAppPage() {
  const router = useRouter();
  useEffect(() => { router.replace('/dashboard'); }, [router]);
  return (
    <div className="min-h-dvh flex items-center justify-center" style={{ background: '#0a0f0a' }}>
      <Sprout size={28} color="#7c3aed" className="animate-pulse" />
    </div>
  );
}
