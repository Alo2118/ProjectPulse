// Card Component - Elegant with shadows and transitions
export function Card({ children, className = '', interactive = false, hover = true }) {
  return (
    <div
      className={`
        bg-white rounded-lg border border-slate-200
        ${hover ? 'hover:shadow-lg hover:border-slate-300 transition-all duration-200' : 'shadow-sm'}
        ${interactive ? 'cursor-pointer' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '' }) {
  return (
    <div className={`px-6 py-4 border-b border-slate-100 ${className}`}>
      {children}
    </div>
  );
}

export function CardBody({ children, className = '' }) {
  return (
    <div className={`px-6 py-4 ${className}`}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className = '' }) {
  return (
    <div className={`px-6 py-3 bg-slate-50 rounded-b-lg border-t border-slate-100 flex gap-3 justify-end ${className}`}>
      {children}
    </div>
  );
}

// KPI Card - For dashboard metrics
export function KPICard({ title, value, change, icon: Icon, color = 'primary' }) {
  const colors = {
    primary: 'bg-primary-50 text-primary-700 border-primary-200',
    success: 'bg-success-50 text-success-700 border-success-200',
    warning: 'bg-warning-50 text-warning-700 border-warning-200',
    danger: 'bg-danger-50 text-danger-700 border-danger-200',
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
            <p className="text-2xl font-bold mt-1">{value}</p>
          </div>
          {Icon && <Icon className="w-8 h-8 opacity-30" />}
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
const buttonBase = 'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';

const buttonVariants = {
  primary: `${buttonBase} bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800 focus:ring-primary-500 disabled:bg-slate-400 disabled:cursor-not-allowed`,
  secondary: `${buttonBase} bg-slate-200 text-slate-900 hover:bg-slate-300 active:bg-slate-400 focus:ring-slate-400 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed`,
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
        <span className="animate-spin inline-block w-4 h-4 border-2 border-current border-r-transparent rounded-full" />
      )}
      {Icon && !isLoading && <Icon className="w-4 h-4" />}
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
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${badgeVariants[variant]} ${className}`}>
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
          {props.required && <span className="text-danger-600 ml-1">*</span>}
        </label>
      )}
      <input
        className={`
          w-full px-4 py-2.5 rounded-lg border-2 border-slate-200
          focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100
          transition-colors duration-200
          disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed
          ${error ? 'border-danger-500 focus:border-danger-500 focus:ring-danger-100' : ''}
          ${className}
        `}
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
          {props.required && <span className="text-danger-600 ml-1">*</span>}
        </label>
      )}
      <select
        className={`
          w-full px-4 py-2.5 rounded-lg border-2 border-slate-200
          focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100
          transition-colors duration-200
          disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed
          ${error ? 'border-danger-500 focus:border-danger-500 focus:ring-danger-100' : ''}
          ${className}
        `}
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
