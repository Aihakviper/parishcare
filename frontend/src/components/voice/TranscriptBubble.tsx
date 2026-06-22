export function TranscriptBubble({
  speaker,
  children,
}: {
  speaker: 'bayo' | 'user'
  children: React.ReactNode
}) {
  return (
    <p
      className={
        speaker === 'bayo'
          ? 'italic-serif text-gilt text-sm leading-relaxed'
          : 'text-ink text-sm leading-relaxed'
      }
    >
      {children}
    </p>
  )
}
