import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from './Button'
import { campApi } from '../../lib/mock-api/camp'

export function VouchModal({
  artisanId,
  artisanName,
  onClose,
}: {
  artisanId: string
  artisanName: string
  onClose: () => void
}) {
  const [requestId, setRequestId] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const send = async () => {
    const req = await campApi.requestVouch(artisanId)
    setRequestId(req.id)
  }

  const confirm = async () => {
    if (!requestId) return
    await campApi.confirmVouch(requestId)
    setDone(true)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink/40 p-4">
      <div className="frame p-6 w-full max-w-md bg-bone">
        <h2 className="display-tight text-lg font-semibold text-ink">Vouch for {artisanName.split(' ')[0]}</h2>
        <p className="text-sm text-slate mt-2">
          Steward will send a WhatsApp to someone who knows them — or preview the thread Mama Iyabo
          receives.
        </p>
        {done ? (
          <p className="italic-serif text-verdigris mt-4">Vouch recorded. Standing updated.</p>
        ) : requestId ? (
          <p className="text-sm text-ink mt-4">WhatsApp sent. Awaiting YES from Mama Iyabo…</p>
        ) : null}
        <div className="flex flex-col gap-2 mt-6">
          {!requestId && (
            <Button onClick={send} className="w-full">
              Send vouch request
            </Button>
          )}
          {requestId && !done && (
            <Button onClick={confirm} className="w-full">
              Simulate Mama Iyabo YES
            </Button>
          )}
          <Link to="/whatsapp" className="text-center text-sm font-semibold text-oxblood">
            Preview on WhatsApp
          </Link>
          <Button variant="ghost" onClick={onClose} className="w-full">
            Close
          </Button>
        </div>
      </div>
    </div>
  )
}
