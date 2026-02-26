import { Link } from 'react-router-dom'
import { Home } from 'lucide-react'

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 px-4">
      <div className="text-center">
        <h1 className="text-9xl font-bold text-slate-200 dark:text-slate-700">404</h1>
        <h2 className="mt-4 page-title">
          Pagina non trovata
        </h2>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          La pagina che stai cercando non esiste o e stata spostata.
        </p>
        <Link to="/dashboard" className="mt-6 btn-primary inline-flex items-center">
          <Home className="w-4 h-4 mr-2" />
          Torna alla Dashboard
        </Link>
      </div>
    </div>
  )
}
