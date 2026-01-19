import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Card, CardBody, Button, Input } from '../components/ui/FormComponents';
import { Mail, Lock, ArrowRight, Zap } from 'lucide-react';
import theme, { cn } from '../styles/theme';

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
    <div className={cn(
      theme.layout.page,
      theme.layout.flex.center,
      'relative overflow-hidden p-4'
    )}>
      {/* Animated background elements */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className={cn(
          'absolute left-1/4 top-1/4 h-96 w-96 animate-pulse rounded-full blur-3xl',
          'bg-cyan-500/10'
        )}></div>
        <div
          className={cn(
            'absolute bottom-1/4 right-1/4 h-96 w-96 animate-pulse rounded-full blur-3xl',
            'bg-purple-500/10'
          )}
          style={{ animationDelay: '1s' }}
        ></div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo/Header */}
        <div className={cn(
          theme.spacing.mb.lg,
          'animate-in slide-in-from-top text-center duration-500'
        )}>
          <div className={cn(
            theme.spacing.mb.md,
            theme.layout.flex.center,
            theme.spacing.gap.md
          )}>
            <Zap className={cn(
              'h-12 w-12 animate-pulse',
              theme.colors.text.accentBright
            )} />
            <h1 className={cn(
              'text-5xl font-bold',
              theme.colors.text.primary
            )}>ProjectPulse</h1>
          </div>
          <p className={cn(
            'text-lg',
            theme.colors.text.accent,
            'opacity-80'
          )}>
            {isLogin ? 'Accedi al tuo account' : 'Crea un nuovo account'}
          </p>
        </div>

        {/* Login Card */}
        <div className={cn(
          theme.colors.bg.primaryAlpha,
          theme.colors.border.defaultAlpha,
          theme.effects.shadow['2xl'],
          theme.spacing.p.xl,
          'animate-in slide-in-from-bottom rounded-2xl border backdrop-blur-xl duration-500'
        )}>
          {error && (
            <div className={cn(
              theme.colors.status.error.bgHover,
              theme.colors.status.error.text,
              theme.spacing.mb.md,
              theme.spacing.px.md,
              theme.spacing.py.sm,
              'rounded-lg border border-red-500/50 backdrop-blur-sm'
            )}>
              {error}
            </div>
          )}

          {successMessage && (
            <div className={cn(
              theme.colors.status.success.bgHover,
              theme.colors.status.success.text,
              theme.spacing.mb.md,
              theme.spacing.px.md,
              theme.spacing.py.sm,
              'rounded-lg border border-emerald-500/50 backdrop-blur-sm'
            )}>
              {successMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <div>
                  <label className={cn(
                    theme.spacing.mb.sm,
                    theme.typography.label,
                    'block'
                  )}>Nome</label>
                  <input
                    type="text"
                    className={cn(
                      theme.input.base,
                      theme.input.size.lg,
                      'w-full'
                    )}
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    placeholder="Es: Mario"
                    required
                  />
                </div>
                <div>
                  <label className={cn(
                    theme.spacing.mb.sm,
                    theme.typography.label,
                    'block'
                  )}>Cognome</label>
                  <input
                    type="text"
                    className={cn(
                      theme.input.base,
                      theme.input.size.lg,
                      'w-full'
                    )}
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    placeholder="Es: Rossi"
                    required
                  />
                </div>
              </>
            )}

            <div>
              <label className={cn(
                theme.spacing.mb.sm,
                theme.typography.label,
                theme.layout.flex.start,
                theme.spacing.gap.sm
              )}>
                <Mail className="h-4 w-4" />
                Email
              </label>
              <input
                type="email"
                className={cn(
                  theme.input.base,
                  theme.input.size.lg,
                  'w-full'
                )}
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="mario.rossi@esempio.it"
                required
              />
            </div>

            <div>
              <label className={cn(
                theme.spacing.mb.sm,
                theme.typography.label,
                theme.layout.flex.start,
                theme.spacing.gap.sm
              )}>
                <Lock className="h-4 w-4" />
                Password
              </label>
              <input
                type="password"
                className={cn(
                  theme.input.base,
                  theme.input.size.lg,
                  'w-full'
                )}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={cn(
                theme.effects.gradient.primary,
                theme.effects.shadow.lg,
                theme.spacing.px.lg,
                theme.spacing.py.sm,
                theme.layout.flex.center,
                theme.spacing.gap.sm,
                'w-full rounded-lg font-semibold',
                theme.colors.text.primary,
                'transition-all duration-300 hover:scale-105',
                'disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100'
              )}
            >
              {loading ? (
                <>
                  <div className={cn(
                    'h-5 w-5 animate-spin rounded-full border-b-2 border-t-2',
                    'border-white'
                  )}></div>
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

          <div className={cn(
            theme.spacing.mt.lg,
            'text-center'
          )}>
            <button
              onClick={() => setIsLogin(!isLogin)}
              className={cn(
                theme.typography.bodySmall,
                'font-medium',
                theme.colors.text.accentBright,
                'transition-colors hover:text-cyan-300'
              )}
            >
              {isLogin ? 'Non hai un account? Registrati' : 'Hai già un account? Accedi'}
            </button>
          </div>
        </div>

        <p className={cn(
          theme.spacing.mt.xl,
          theme.typography.bodySmall,
          theme.colors.text.disabled,
          'text-center'
        )}>
          ProjectPulse © 2026 - Gestione progetti R&D
        </p>
      </div>
    </div>
  );
}
