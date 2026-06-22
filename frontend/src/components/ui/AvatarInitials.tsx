export function AvatarInitials({
  name,
  className,
}: {
  name: string
  className?: string
}) {
  const parts = name.trim().split(/\s+/)
  const initials =
    parts.length >= 2
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      : name.slice(0, 2).toUpperCase()

  return (
    <div
      className={`flex items-center justify-center rounded-frame bg-oxblood text-bone display-tight font-semibold ${className ?? 'w-12 h-12 text-lg'}`}
      aria-hidden
    >
      {initials}
    </div>
  )
}
