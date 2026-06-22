/** Simple progress bar placeholder */
export function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2 bg-hairline rounded-full overflow-hidden" role="progressbar" aria-valuenow={value}>
      <div className="h-full bg-verdigris" style={{ width: `${value}%` }} />
    </div>
  )
}
