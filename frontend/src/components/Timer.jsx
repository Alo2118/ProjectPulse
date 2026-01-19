import { useState, useEffect } from 'react';
import { Play, Square } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { timeApi } from '../services/api';

export default function Timer({ onTimerChange }) {
  const { colors, spacing } = useTheme();
  const [activeTimer, setActiveTimer] = useState(null);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    loadActiveTimer();
  }, []);

  useEffect(() => {
    if (activeTimer) {
      const interval = setInterval(() => {
        const start = new Date(activeTimer.started_at);
        const now = new Date();
        const diff = Math.floor((now - start) / 1000);
        setElapsed(diff);
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [activeTimer]);

  const loadActiveTimer = async () => {
    try {
      const response = await timeApi.getActive();
      if (response.data) {
        setActiveTimer(response.data);
      }
    } catch (error) {
      console.error('Error loading active timer:', error);
    }
  };

  const handleStop = async () => {
    try {
      await timeApi.stop(activeTimer.id);
      setActiveTimer(null);
      setElapsed(0);
      if (onTimerChange) onTimerChange();
    } catch (error) {
      alert(error.response?.data?.error || 'Errore durante lo stop del timer');
    }
  };

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!activeTimer) return null;

  return (
    <div className={`${colors.bg.primary} ${colors.text.primary} rounded-lg border-2 ${colors.border} ${spacing.cardP} flex items-center justify-between shadow-md`}>
      <div>
        <div className={`${colors.text.secondary} text-sm font-semibold`}>Timer attivo</div>
        <div className="text-subtitle mt-1 text-cyan-300">{activeTimer.task_title}</div>
      </div>

      <div className="flex items-center gap-4">
        <div className="font-mono text-3xl font-bold text-cyan-400">{formatTime(elapsed)}</div>
        <button onClick={handleStop} className="btn-danger flex items-center gap-2">
          <Square className="h-4 w-4" />
          Stop
        </button>
      </div>
    </div>
  );
}
