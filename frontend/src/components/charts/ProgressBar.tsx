/** Simple progress bar placeholder */
export function ProgressBar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={`h-2 bg-hairline rounded-full overflow-hidden ${className ?? ''}`} role="progressbar" aria-valuenow={value}>
      <div className="h-full bg-verdigris" style={{ width: `${value}%` }} />
    </div>
  )
}
