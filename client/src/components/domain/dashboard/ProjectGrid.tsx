import { FolderKanban } from 'lucide-react'
import { ProjectCard, type ProjectCardData } from './ProjectCard'

interface ProjectGridProps {
  projects: ProjectCardData[]
}

export function ProjectGrid({ projects }: ProjectGridProps) {
  if (projects.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          padding: '40px 0',
          color: 'var(--text-muted)',
          fontSize: '12px',
        }}
      >
        <FolderKanban size={24} style={{ opacity: 0.3 }} />
        <span>Nessun progetto attivo</span>
      </div>
    )
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '12px',
      }}
    >
      {projects.map((p) => (
        <ProjectCard key={p.id} project={p} />
      ))}
    </div>
  )
}
