'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApi } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useThemeProvider';
import { motion } from 'framer-motion';
import { ArrowLeft, AlertCircle, AlertTriangle, Info, Trash2 } from 'lucide-react';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };

export default function AlertsPage() {
  const router = useRouter();
  const api = useApi();
  const { theme } = useTheme();

  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAlerts();
  }, []);

  async function fetchAlerts() {
    try {
      const data = await api('/api/alerts');
      setAlerts(data.alerts || []);
    } catch (err) {
      console.error('Failed to fetch alerts:', err);
    } finally {
      setLoading(false);
    }
  }

  async function dismissAlert(alertId: string) {
    try {
      await api(`/api/alerts/${alertId}`, { method: 'DELETE' });
      setAlerts(alerts.filter(a => a.id !== alertId));
    } catch (err) {
      console.error('Failed to dismiss alert:', err);
    }
  }

  const isDark = theme === 'dark';
  const bgColor = isDark ? '#0f1419' : '#ffffff';
  const secondaryBg = isDark ? '#1a2332' : '#f8f9fa';
  const textColor = isDark ? '#ffffff' : '#1a1a1a';
  const secondaryColor = isDark ? '#b0b8c1' : '#666666';
  const borderColor = isDark ? '#2d3844' : '#e0e0e0';

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'from-rose-500 to-red-500';
      case 'warning':
        return 'from-amber-500 to-orange-500';
      default:
        return 'from-blue-500 to-cyan-500';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertCircle size={20} className="text-white" />;
      case 'warning':
        return <AlertTriangle size={20} className="text-white" />;
      default:
        return <Info size={20} className="text-white" />;
    }
  };

  return (
    <div className="min-h-screen transition-colors duration-300" style={{ backgroundColor: bgColor }}>
      {/* Header */}
      <div className="px-4 pt-6 pb-4 border-b" style={{ borderColor }}>
        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => router.back()}
            className="p-2.5 rounded-lg transition-colors"
            style={{ backgroundColor: secondaryBg }}
          >
            <ArrowLeft size={20} style={{ color: textColor }} />
          </motion.button>
          <h1 style={{ color: textColor }} className="text-2xl font-bold">Smart Alerts</h1>
          {alerts.length > 0 && (
            <span className="ml-auto px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-500 text-xs font-semibold">
              {alerts.length} Active
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity }}>
            <div className="w-8 h-8 border-3 border-purple-500 border-t-transparent rounded-full" />
          </motion.div>
        </div>
      ) : alerts.length === 0 ? (
        <motion.div variants={item} className="px-4 py-12 text-center">
          <div className="text-5xl mb-3">✓</div>
          <p style={{ color: textColor }} className="font-semibold mb-2">All Clear!</p>
          <p style={{ color: secondaryColor }} className="text-sm">No active alerts on your farms</p>
        </motion.div>
      ) : (
        <motion.div variants={container} initial="hidden" animate="show" className="px-4 py-6 pb-20 space-y-3">
          {alerts.map((alert) => (
            <motion.div
              key={alert.id}
              variants={item}
              whileHover={{ scale: 1.02 }}
              className="rounded-2xl overflow-hidden"
              style={{
                backgroundColor: secondaryBg,
                border: `1px solid ${borderColor}`,
              }}
            >
              <div className={`flex gap-4 p-4`}>
                <div className={`flex-shrink-0 p-3 rounded-lg bg-gradient-to-br ${getSeverityColor(alert.severity)} flex items-center justify-center`}>
                  {getSeverityIcon(alert.severity)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p style={{ color: textColor }} className="font-semibold text-sm">
                      {alert.title}
                    </p>
                    <span className={`text-xs px-2 py-1 rounded font-medium whitespace-nowrap ${
                      alert.severity === 'critical' ? 'bg-rose-500/20 text-rose-500' :
                      alert.severity === 'warning' ? 'bg-amber-500/20 text-amber-500' :
                      'bg-blue-500/20 text-blue-500'
                    }`}>
                      {alert.severity?.toUpperCase()}
                    </span>
                  </div>
                  <p style={{ color: secondaryColor }} className="text-xs leading-relaxed">
                    {alert.message}
                  </p>
                  {alert.created_at && (
                    <p style={{ color: secondaryColor }} className="text-xs mt-2">
                      {new Date(alert.created_at).toLocaleDateString('en-IN', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  )}
                </div>

                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => dismissAlert(alert.id)}
                  className="flex-shrink-0 p-2 rounded-lg hover:bg-opacity-20 transition-colors"
                  style={{ color: '#ef4444' }}
                >
                  <Trash2 size={18} />
                </motion.button>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
