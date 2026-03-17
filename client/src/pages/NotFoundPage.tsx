import { Link } from "react-router-dom"
import { Home, SearchX } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <div
        className="flex h-16 w-16 items-center justify-center rounded-2xl"
        style={{ background: "var(--accent-dim)", border: "1px solid var(--border-default)" }}
      >
        <SearchX className="h-8 w-8" style={{ color: "var(--accent-hex)" }} />
      </div>
      <div className="space-y-1">
        <p className="text-5xl font-bold tabular-nums" style={{ color: "var(--text-muted)" }}>
          404
        </p>
        <h1 className="text-xl font-semibold text-foreground">
          Pagina non trovata
        </h1>
      </div>
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
