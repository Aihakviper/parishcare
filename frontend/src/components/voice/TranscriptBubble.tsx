export function TranscriptBubble({
  role,
  text,
}: {
  role: 'bayo' | 'user'
  text: string
}) {
  return (
    <p
      className={
        role === 'bayo'
          ? 'italic-serif text-gilt text-sm leading-relaxed'
          : 'text-ink text-sm leading-relaxed pl-2 border-l-2 border-hairline'
      }
    >
      {text}
    </p>
  )
}
