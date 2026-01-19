import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Card, CardBody, Button, Input } from '../components/ui/FormComponents';
import { Mail, Lock, ArrowRight, Zap } from 'lucide-react';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      if (isLogin) {
        await login({ email: formData.email, password: formData.password });
        navigate('/');
      } else {
        const response = await register(formData);
        setSuccessMessage(
          response.message || 'Registrazione completata! In attesa di approvazione.'
        );
        setFormData({ email: '', password: '', first_name: '', last_name: '' });
        setTimeout(() => {
          setIsLogin(true);
          setSuccessMessage('');
        }, 5000);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Si è verificato un errore');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 p-4">
      {/* Animated background elements */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/4 top-1/4 h-96 w-96 animate-pulse rounded-full bg-cyan-500/10 blur-3xl"></div>
        <div
          className="absolute bottom-1/4 right-1/4 h-96 w-96 animate-pulse rounded-full bg-purple-500/10 blur-3xl"
          style={{ animationDelay: '1s' }}
        ></div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo/Header */}
        <div className="animate-in slide-in-from-top mb-8 text-center duration-500">
          <div className="mb-4 flex items-center justify-center gap-3">
            <Zap className="h-12 w-12 animate-pulse text-cyan-400" />
            <h1 className="text-5xl font-bold text-white">ProjectPulse</h1>
          </div>
          <p className="text-lg text-cyan-300/80">
            {isLogin ? 'Accedi al tuo account' : 'Crea un nuovo account'}
          </p>
        </div>

        {/* Login Card */}
        <div className="animate-in slide-in-from-bottom rounded-2xl border border-slate-700/50 bg-slate-900/70 p-8 shadow-2xl shadow-cyan-500/20 backdrop-blur-xl duration-500">
          {error && (
            <div className="mb-4 rounded-lg border border-red-500/50 bg-red-500/20 px-4 py-3 text-red-200 backdrop-blur-sm">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="mb-4 rounded-lg border border-emerald-500/50 bg-emerald-500/20 px-4 py-3 text-emerald-200 backdrop-blur-sm">
              {successMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <div>
                  <label className="mb-2 block text-sm font-medium text-cyan-300">Nome</label>
                  <input
                    type="text"
                    className="w-full rounded-lg border border-slate-600 bg-slate-800/50 px-4 py-3 text-white placeholder-slate-400 transition-all focus:border-transparent focus:ring-2 focus:ring-cyan-500"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    placeholder="Es: Mario"
                    required
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-cyan-300">Cognome</label>
                  <input
                    type="text"
                    className="w-full rounded-lg border border-slate-600 bg-slate-800/50 px-4 py-3 text-white placeholder-slate-400 transition-all focus:border-transparent focus:ring-2 focus:ring-cyan-500"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    placeholder="Es: Rossi"
                    required
                  />
                </div>
              </>
            )}

            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-medium text-cyan-300">
                <Mail className="h-4 w-4" />
                Email
              </label>
              <input
                type="email"
                className="w-full rounded-lg border border-slate-600 bg-slate-800/50 px-4 py-3 text-white placeholder-slate-400 transition-all focus:border-transparent focus:ring-2 focus:ring-cyan-500"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="mario.rossi@esempio.it"
                required
              />
            </div>

            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-medium text-cyan-300">
                <Lock className="h-4 w-4" />
                Password
              </label>
              <input
                type="password"
                className="w-full rounded-lg border border-slate-600 bg-slate-800/50 px-4 py-3 text-white placeholder-slate-400 transition-all focus:border-transparent focus:ring-2 focus:ring-cyan-500"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 px-6 py-3 font-semibold text-white shadow-lg shadow-cyan-500/50 transition-all duration-300 hover:scale-105 hover:from-cyan-700 hover:to-blue-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
            >
              {loading ? (
                <>
                  <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-t-2 border-white"></div>
                  Caricamento...
                </>
              ) : (
                <>
                  {isLogin ? 'Accedi' : 'Registrati'}
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm font-medium text-cyan-400 transition-colors hover:text-cyan-300"
            >
              {isLogin ? 'Non hai un account? Registrati' : 'Hai già un account? Accedi'}
            </button>
          </div>
        </div>

        <p className="mt-8 text-center text-sm text-slate-500">
          ProjectPulse © 2026 - Gestione progetti R&D
        </p>
      </div>
    </div>
  );
}
