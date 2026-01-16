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
    last_name: ''
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
        setSuccessMessage(response.message || 'Registrazione completata! In attesa di approvazione.');
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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8 animate-in slide-in-from-top duration-500">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Zap className="w-12 h-12 text-cyan-400 animate-pulse" />
            <h1 className="text-5xl font-bold text-white">
              ProjectPulse
            </h1>
          </div>
          <p className="text-cyan-300/80 text-lg">
            {isLogin ? 'Accedi al tuo account' : 'Crea un nuovo account'}
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-900/70 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 shadow-2xl shadow-cyan-500/20 animate-in slide-in-from-bottom duration-500">
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg mb-4 backdrop-blur-sm">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="bg-emerald-500/20 border border-emerald-500/50 text-emerald-200 px-4 py-3 rounded-lg mb-4 backdrop-blur-sm">
              {successMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <div>
                  <label className="block text-sm font-medium text-cyan-300 mb-2">
                    Nome
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    placeholder="Es: Mario"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-cyan-300 mb-2">
                    Cognome
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    placeholder="Es: Rossi"
                    required
                  />
                </div>
              </>
            )}

            <div>
              <label className="text-sm font-medium text-cyan-300 mb-2 flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email
              </label>
              <input
                type="email"
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="mario.rossi@esempio.it"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium text-cyan-300 mb-2 flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Password
              </label>
              <input
                type="password"
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-semibold py-3 px-6 rounded-lg shadow-lg shadow-cyan-500/50 transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                  Caricamento...
                </>
              ) : (
                <>
                  {isLogin ? 'Accedi' : 'Registrati'}
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-cyan-400 hover:text-cyan-300 text-sm font-medium transition-colors"
            >
              {isLogin ? 'Non hai un account? Registrati' : 'Hai già un account? Accedi'}
            </button>
          </div>
        </div>

        <p className="text-center text-slate-500 text-sm mt-8">
          ProjectPulse © 2026 - Gestione progetti R&D
        </p>
      </div>
    </div>
  );
}
