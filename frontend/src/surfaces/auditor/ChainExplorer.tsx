import { useMemo, useState } from 'react'
import { ChevronDown, Search, ShieldCheck } from 'lucide-react'
import { isWithinInterval, parseISO } from 'date-fns'
import { useAuditData } from './hooks/useAuditData'
import { VERIFY_SNIPPET, type AuditDisplayEntry, type AuditEntryType } from '../../lib/auditor/present'
import { formatAuditDateTime } from '../../lib/auditor/present'
import { EmptyState } from '../../components/ui/EmptyState'
import { Button } from '../../components/ui/Button'
import { cn } from '../../lib/cn'

const ENTRY_TYPES: { value: AuditEntryType | 'all'; label: string }[] = [
  { value: 'all', label: 'All types' },
  { value: 'disbursement', label: 'Disbursement' },
  { value: 'approval', label: 'Approval' },
  { value: 'voucher', label: 'Voucher' },
  { value: 'verification', label: 'Verification' },
  { value: 'intake', label: 'Intake' },
  { value: 'escalation', label: 'Escalation' },
  { value: 'rejection', label: 'Rejection' },
]

function HashLink({
  hash,
  onSelect,
}: {
  hash: string
  onSelect: (hash: string) => void
}) {
  const short = hash.length > 12 ? `0x${hash.slice(0, 6)}…${hash.slice(-4)}` : hash
  return (
    <button
      type="button"
      onClick={() => onSelect(hash)}
      className="font-mono text-xs text-verdigris hover:underline text-left break-all"
    >
      {short}
    </button>
  )
}

function ExplorerRow({
  entry,
  expanded,
  onToggle,
  onHashSelect,
}: {
  entry: AuditDisplayEntry
  expanded: boolean
  onToggle: () => void
  onHashSelect: (hash: string) => void
}) {
  const [showVerify, setShowVerify] = useState(false)

  return (
    <div className="border-b border-hairline last:border-0">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-parchment-soft/60 transition-colors"
      >
        <ChevronDown
          className={cn(
            'w-4 h-4 text-slate shrink-0 transition-transform',
            expanded && 'rotate-180',
          )}
          aria-hidden
        />
        <span className="font-mono text-xs text-slate w-28 shrink-0">{entry.hashShort}</span>
        <span className="text-sm text-ink capitalize w-24 shrink-0">{entry.entryType}</span>
        <span className="text-sm text-slate flex-1 truncate hidden sm:block">
          {entry.parishName ?? entry.detail}
        </span>
        <span className="text-xs text-slate shrink-0">{entry.timeAgo}</span>
        {entry.verified && (
          <ShieldCheck className="w-4 h-4 text-verdigris shrink-0" aria-label="Verified" />
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-5 pl-11 bg-parchment-soft/40">
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="mono-tag mb-1">Entry hash</dt>
              <dd className="font-mono text-xs break-all text-ink">{entry.entryHash}</dd>
            </div>
            <div>
              <dt className="mono-tag mb-1">Timestamp</dt>
              <dd className="text-ink">{formatAuditDateTime(entry.timestamp)}</dd>
            </div>
            <div>
              <dt className="mono-tag mb-1">Previous hash</dt>
              <dd>
                <HashLink hash={entry.prevHash} onSelect={onHashSelect} />
              </dd>
            </div>
            <div>
              <dt className="mono-tag mb-1">Next hash</dt>
              <dd>
                {entry.nextHash ? (
                  <HashLink hash={entry.nextHash} onSelect={onHashSelect} />
                ) : (
                  <span className="text-slate text-xs">— (chain tip)</span>
                )}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="mono-tag mb-1">Payload (redacted)</dt>
              <dd>
                <pre
                  className="font-mono text-[0.7rem] bg-bone border border-hairline rounded-frame p-3 overflow-x-auto text-ink"
                  style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace" }}
                >
                  {JSON.stringify(entry.redactedPayload, null, 2)}
                </pre>
              </dd>
            </div>
            <div>
              <dt className="mono-tag mb-1">Signing officer</dt>
              <dd className="text-ink">{entry.signerRole}</dd>
            </div>
          </dl>

          <Button
            type="button"
            variant="secondary"
            className="mt-4 text-xs"
            onClick={() => setShowVerify((v) => !v)}
          >
            Verify this entry independently
          </Button>

          {showVerify && (
            <pre
              className="mt-3 font-mono text-[0.68rem] bg-ink text-bone rounded-frame p-4 overflow-x-auto leading-relaxed"
              style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace" }}
            >
              {VERIFY_SNIPPET.replace(
                'entryHash must match ledger record',
                `// Expected: ${entry.entryHash.slice(0, 16)}…`,
              )}
            </pre>
          )}
        </div>
      )}
    </div>
  )
}

export function ChainExplorer() {
  const { displayed, loading } = useAuditData()
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<AuditEntryType | 'all'>('all')
  const [parishFilter, setParishFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [hashJump, setHashJump] = useState('')

  const parishes = useMemo(() => {
    const names = new Set<string>()
    for (const e of displayed) {
      if (e.parishName) names.add(e.parishName)
    }
    return [...names].sort()
  }, [displayed])

  const filtered = useMemo(() => {
    return displayed.filter((entry) => {
      if (typeFilter !== 'all' && entry.entryType !== typeFilter) return false
      if (parishFilter !== 'all' && entry.parishName !== parishFilter) return false
      if (dateFrom || dateTo) {
        const d = parseISO(entry.timestamp)
        const start = dateFrom ? parseISO(dateFrom) : new Date(0)
        const end = dateTo ? parseISO(`${dateTo}T23:59:59`) : new Date(8640000000000000)
        if (!isWithinInterval(d, { start, end })) return false
      }
      if (query.trim()) {
        const q = query.toLowerCase()
        const hay = [
          entry.hashShort,
          entry.entryHash,
          entry.action,
          entry.entryType,
          entry.parishName,
          entry.signerRole,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [displayed, typeFilter, parishFilter, dateFrom, dateTo, query])

  const visible = useMemo(() => {
    if (!hashJump) return filtered
    const match = displayed.find((e) => e.entryHash === hashJump)
    if (match) return [match]
    return filtered
  }, [filtered, hashJump, displayed])

  const handleHashSelect = (hash: string) => {
    setHashJump(hash)
    const target = displayed.find((e) => e.entryHash === hash)
    if (target) setExpandedId(target.id)
  }

  if (loading) {
    return <p className="text-slate text-sm py-12">Loading chain explorer…</p>
  }

  return (
    <div>
      <header className="mb-6">
        <h1 className="display-tight text-2xl font-semibold text-ink">Chain explorer</h1>
        <p className="text-slate text-sm mt-1">
          Search and verify individual ledger entries · PII redacted
        </p>
      </header>

      <div className="frame p-4 mb-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate" aria-hidden />
          <input
            type="search"
            placeholder="Search hash, type, parish, role…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setHashJump('')
            }}
            className="w-full pl-10 pr-3 py-2.5 text-sm bg-bone border border-hairline rounded-frame focus:outline-none focus:border-verdigris/50"
          />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as AuditEntryType | 'all')}
            className="text-sm bg-bone border border-hairline rounded-frame px-2 py-2"
          >
            {ENTRY_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <select
            value={parishFilter}
            onChange={(e) => setParishFilter(e.target.value)}
            className="text-sm bg-bone border border-hairline rounded-frame px-2 py-2"
          >
            <option value="all">All parishes</option>
            {parishes.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="text-sm bg-bone border border-hairline rounded-frame px-2 py-2"
            aria-label="From date"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="text-sm bg-bone border border-hairline rounded-frame px-2 py-2"
            aria-label="To date"
          />
        </div>
        {hashJump && (
          <p className="text-xs text-slate">
            Showing entry linked to hash{' '}
            <span className="font-mono text-verdigris">{hashJump.slice(0, 12)}…</span>
            <button
              type="button"
              className="ml-2 text-oxblood underline"
              onClick={() => setHashJump('')}
            >
              Clear
            </button>
          </p>
        )}
      </div>

      <div className="frame">
        <div className="frame-bar justify-between">
          <span className="text-xs text-slate">
            {visible.length.toLocaleString()} entries
          </span>
          <span className="font-mono text-[0.65rem] text-slate">SHA-256 linked chain</span>
        </div>
        <div className="max-h-[32rem] overflow-y-auto">
          {visible.length === 0 ? (
            <EmptyState className="py-12 text-base">
              No entries match your filters. The chain behind them is still whole.
            </EmptyState>
          ) : (
            visible
              .slice()
              .reverse()
              .map((entry) => (
                <ExplorerRow
                  key={entry.id}
                  entry={entry}
                  expanded={expandedId === entry.id}
                  onToggle={() =>
                    setExpandedId((id) => (id === entry.id ? null : entry.id))
                  }
                  onHashSelect={handleHashSelect}
                />
              ))
          )}
        </div>
      </div>
    </div>
  )
}
