interface DepartmentBadgeProps {
  department: { name: string; color: string } | null | undefined
  size?: 'sm' | 'md'
}

export function DepartmentBadge({ department, size = 'sm' }: DepartmentBadgeProps) {
  if (!department) return null

  const textSize = size === 'sm' ? 'text-xs' : 'text-sm'

  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full font-medium ${textSize} whitespace-nowrap flex-shrink-0 dark:brightness-125`}
      style={{
        backgroundColor: department.color + '22',
        color: department.color,
        border: `1px solid ${department.color}44`,
      }}
      title={`Reparto: ${department.name}`}
    >
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: department.color }}
      />
      {department.name}
    </span>
  )
}
