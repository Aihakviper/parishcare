import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { RomanSection } from '../../components/ui/RomanSection'

const THREAD = [
  {
    from: 'bot' as const,
    text: 'Good afternoon Mama Iyabo. Tunde Akinwale listed you as someone who can speak for his work. Do you know this man and trust him with generator repair at Camp homes? Reply YES or NO.',
  },
  {
    from: 'mama' as const,
    text: 'YES. I know Tunde from Phase 2 church. He fixed my neighbour generator last year. He is honest.',
  },
  {
    from: 'bot' as const,
    text: 'Thank you. Your vouch is recorded under the Vouch pillar. Tunde\'s standing score has been updated. — Steward, RCCG Camp Smart City.',
  },
]

export function WhatsAppVouch() {
  const [visible, setVisible] = useState(0)
  const [playing, setPlaying] = useState(true)

  useEffect(() => {
    if (!playing || visible >= THREAD.length) return
    const t = setTimeout(() => setVisible((v) => v + 1), 1400)
    return () => clearTimeout(t)
  }, [playing, visible])

  return (
    <div className="min-h-screen bg-parchment py-8 px-4">
      <RomanSection index={0} title="WHATSAPP · VOUCH" />
      <h1 className="display-tight text-2xl font-semibold text-ink mt-3">Mama Iyabo says yes</h1>
      <p className="text-slate text-sm mt-2 max-w-md">
        No app required. Elders vouch through the thread they already use.
      </p>

      <div className="mx-auto mt-8 max-w-[340px] rounded-[2rem] border-4 border-ink/10 bg-bone shadow-lift overflow-hidden">
        <div className="bg-[#075E54] px-4 py-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-bone/20" />
          <div>
            <p className="text-bone font-semibold text-sm">Steward</p>
            <p className="text-bone/70 text-xs">online</p>
          </div>
        </div>
        <div className="p-3 space-y-2 min-h-[320px] bg-[#ECE5DD]">
          {THREAD.slice(0, visible).map((msg, i) => (
            <div
              key={i}
              className={`max-w-[85%] px-3 py-2 rounded-lg text-sm ${
                msg.from === 'mama'
                  ? 'ml-auto bg-[#DCF8C6] text-ink'
                  : 'bg-bone text-ink shadow-sm'
              }`}
            >
              {msg.text}
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3 justify-center mt-6">
        <button
          type="button"
          onClick={() => {
            setVisible(0)
            setPlaying(true)
          }}
          className="btn-pill btn-pill-secondary px-5"
        >
          Replay
        </button>
        <Link to="/member" className="btn-pill btn-pill-primary px-5">
          Back to Member app
        </Link>
      </div>
    </div>
  )
}
