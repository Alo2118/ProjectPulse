import { Link } from "react-router-dom"
import { Home } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <p className="text-6xl font-bold text-muted-foreground/30">404</p>
      <h1 className="text-xl font-semibold text-foreground">
        Pagina non trovata
      </h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        La pagina che stai cercando non esiste o è stata spostata.
      </p>
      <Button asChild variant="outline" className="mt-2">
        <Link to="/">
          <Home className="mr-2 h-4 w-4" />
          Torna alla Home
        </Link>
      </Button>
    </div>
  )
}
