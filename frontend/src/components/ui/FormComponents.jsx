import { designTokens } from '../../config/designTokens';

// Card Component - Elegant with shadows and transitions
export function Card({ children, className = '', interactive = false, hover = true }) {
  return (
    <div
      className={`card-lg animate-fade-in transition-shadow hover:shadow-md ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '' }) {
  return <div className={`border-b border-slate-100 px-6 py-4 ${className}`}>{children}</div>;
}

export function CardBody({ children, className = '' }) {
  return <div className={`px-6 py-4 ${className}`}>{children}</div>;
}

export function CardFooter({ children, className = '' }) {
  return (
    <div
      className={`flex justify-end gap-3 rounded-b-lg border-t-2 ${designTokens.colors.cyan.borderLight} bg-slate-100/50 dark:bg-slate-800/50 px-6 py-3 ${className}`}
    >
      {children}
    </div>
  );
}

// KPI Card - For dashboard metrics
export function KPICard({ title, value, change, icon: Icon, color = 'primary' }) {
  const colors = {
    primary: `${designTokens.colors.cyan.bg} ${designTokens.colors.cyan.text} border ${designTokens.colors.cyan.borderLight}`,
    success: `${designTokens.colors.success.bg} ${designTokens.colors.success.text} border ${designTokens.colors.success.borderLight}`,
    warning: `${designTokens.colors.warning.bg} ${designTokens.colors.warning.text} border ${designTokens.colors.warning.borderLight}`,
    danger: `${designTokens.colors.error.bg} ${designTokens.colors.error.text} border ${designTokens.colors.error.borderLight}`,
  };

  const isPositive = change >= 0;
  const arrow = isPositive ? '↑' : '↓';
  const changeColor = isPositive ? 'text-success-600' : 'text-danger-600';

  return (
    <Card className={`${colors[color]} border`}>
      <CardBody className="space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium opacity-75">{title}</p>
            <p className="mt-1 text-2xl font-bold">{value}</p>
          </div>
          {Icon && <Icon className="h-8 w-8 opacity-30" />}
        </div>
        {change !== undefined && (
          <p className={`text-xs font-semibold ${changeColor}`}>
            {arrow} {Math.abs(change)}% vs mese scorso
          </p>
        )}
      </CardBody>
    </Card>
  );
}

// Button Styles
const buttonBase =
  'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';

const buttonVariants = {
  primary: `${buttonBase} bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800 focus:ring-primary-500 disabled:bg-slate-400 disabled:cursor-not-allowed`,
  secondary: `${buttonBase} bg-slate-700 text-slate-100 hover:bg-slate-600 active:bg-slate-500 focus:ring-slate-600 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed`,
  outline: `${buttonBase} border-2 border-primary-600 text-primary-600 hover:bg-primary-50 active:bg-primary-100 focus:ring-primary-500 disabled:border-slate-300 disabled:text-slate-400 disabled:cursor-not-allowed`,
  danger: `${buttonBase} bg-danger-600 text-white hover:bg-danger-700 active:bg-danger-800 focus:ring-danger-500 disabled:bg-slate-400 disabled:cursor-not-allowed`,
  ghost: `${buttonBase} text-slate-600 hover:bg-slate-100 active:bg-slate-200 focus:ring-slate-400 disabled:text-slate-400 disabled:cursor-not-allowed`,
};

const buttonSizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg',
};

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  isLoading = false,
  disabled = false,
  className = '',
  ...props
}) {
  return (
    <button
      className={`${buttonVariants[variant]} ${buttonSizes[size]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
      )}
      {Icon && !isLoading && <Icon className="h-4 w-4" />}
      {children}
    </button>
  );
}

// Badge Component
const badgeVariants = {
  primary: 'bg-primary-100 text-primary-800 border border-primary-200',
  success: 'bg-success-100 text-success-800 border border-success-200',
  warning: 'bg-warning-100 text-warning-800 border border-warning-200',
  danger: 'bg-danger-100 text-danger-800 border border-danger-200',
  slate: 'bg-slate-100 text-slate-800 border border-slate-200',
};

export function Badge({ children, variant = 'primary', className = '' }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${badgeVariants[variant]} ${className}`}
    >
      {children}
    </span>
  );
}

// Input Component
export function Input({ label, error, className = '', ...props }) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-slate-700">
          {label}
          {props.required && <span className="ml-1 text-danger-600">*</span>}
        </label>
      )}
      <input
        className={`w-full rounded-lg border-2 border-slate-200 px-4 py-2.5 transition-colors duration-200 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 ${error ? 'border-danger-500 focus:border-danger-500 focus:ring-danger-100' : ''} ${className} `}
        {...props}
      />
      {error && <p className="text-sm text-danger-600">{error}</p>}
    </div>
  );
}

// Select Component
export function Select({ label, error, options, className = '', ...props }) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-slate-700">
          {label}
          {props.required && <span className="ml-1 text-danger-600">*</span>}
        </label>
      )}
      <select
        className={`w-full rounded-lg border-2 border-slate-200 px-4 py-2.5 transition-colors duration-200 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 ${error ? 'border-danger-500 focus:border-danger-500 focus:ring-danger-100' : ''} ${className} `}
        {...props}
      >
        <option value="">Seleziona un'opzione</option>
        {options?.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-sm text-danger-600">{error}</p>}
    </div>
  );
}
