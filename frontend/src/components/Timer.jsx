import { useState, useEffect } from 'react';
import { Play, Square } from 'lucide-react';
import { timeApi } from '../services/api';

export default function Timer({ onTimerChange }) {
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
    <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 flex items-center justify-between">
      <div>
        <div className="text-sm text-primary-600 font-medium">Timer attivo</div>
        <div className="text-lg font-bold text-primary-900">{activeTimer.task_title}</div>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-3xl font-mono font-bold text-primary-600">
          {formatTime(elapsed)}
        </div>
        <button
          onClick={handleStop}
          className="btn-danger flex items-center gap-2"
        >
          <Square className="w-4 h-4" />
          Stop
        </button>
      </div>
    </div>
  );
}
