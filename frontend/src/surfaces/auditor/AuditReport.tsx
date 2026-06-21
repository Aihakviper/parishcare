import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { FileDown, Printer } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { mockApi } from '../../lib/mock-api'
import {
  buildAuditReport,
  downloadReportStub,
  openPrintableReport,
  renderReportHtml,
  reportFindingsText,
  type AuditReportData,
} from '../../lib/auditor/report'
import { PROVINCIAL_PARISH_IDS } from '../../lib/provincial/aggregates'
import { formatNaira } from '../../lib/formatters'

const DEFAULT_TRUSTEE = 'Provincial Board Trustee'

export function AuditReport() {
  const [dateFrom, setDateFrom] = useState('2026-05-01')
  const [dateTo, setDateTo] = useState('2026-05-31')
  const [trusteeName, setTrusteeName] = useState(DEFAULT_TRUSTEE)
  const [selectedParishes, setSelectedParishes] = useState<string[]>([])
  const [parishOptions, setParishOptions] = useState<{ id: string; name: string }[]>([])
  const [report, setReport] = useState<AuditReportData | null>(null)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    mockApi.listParishes().then((parishes) => {
      const scoped = parishes.filter((p) =>
        (PROVINCIAL_PARISH_IDS as readonly string[]).includes(p.id),
      )
      setParishOptions(scoped.map((p) => ({ id: p.id, name: p.name })))
      setSelectedParishes(scoped.map((p) => p.id))
    })
  }, [])

  const periodPreview = useMemo(() => {
    try {
      return `${format(new Date(dateFrom), 'dd MMM')} – ${format(new Date(dateTo), 'dd MMM yyyy')}`
    } catch {
      return '—'
    }
  }, [dateFrom, dateTo])

  const handleGenerate = async () => {
    setGenerating(true)
    await new Promise((r) => setTimeout(r, 600))
    try {
      const [chain, parishes, integrity] = await Promise.all([
        mockApi.getAuditChain(),
        mockApi.listParishes(),
        mockApi.verifyChainIntegrity(),
      ])
      const data = buildAuditReport(chain, parishes, {
        dateFrom,
        dateTo,
        parishIds: selectedParishes,
        trusteeName: trusteeName.trim() || DEFAULT_TRUSTEE,
      }, integrity.valid)
      setReport(data)
    } finally {
      setGenerating(false)
    }
  }

  const toggleParish = (id: string) => {
    setSelectedParishes((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    )
  }

  return (
    <div>
      <header className="mb-8">
        <h1 className="display-tight text-2xl font-semibold text-ink">Generate audit report</h1>
        <p className="text-slate text-sm mt-1">
          Formal stewardship attestation for trustees and tithers
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="frame p-5 space-y-4">
          <div>
            <label className="mono-tag block mb-1.5">Date range</label>
            <div className="flex gap-2">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="flex-1 text-sm bg-bone border border-hairline rounded-frame px-3 py-2"
              />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="flex-1 text-sm bg-bone border border-hairline rounded-frame px-3 py-2"
              />
            </div>
          </div>

          <div>
            <label className="mono-tag block mb-1.5">Prepared for</label>
            <input
              type="text"
              value={trusteeName}
              onChange={(e) => setTrusteeName(e.target.value)}
              className="w-full text-sm bg-bone border border-hairline rounded-frame px-3 py-2"
              placeholder="Trustee name"
            />
          </div>

          <div>
            <label className="mono-tag block mb-1.5">Parishes in scope</label>
            <div className="max-h-40 overflow-y-auto border border-hairline rounded-frame p-2 space-y-1 bg-bone">
              {parishOptions.map((p) => (
                <label
                  key={p.id}
                  className="flex items-center gap-2 text-sm text-ink cursor-pointer hover:bg-parchment-soft px-2 py-1 rounded"
                >
                  <input
                    type="checkbox"
                    checked={selectedParishes.includes(p.id)}
                    onChange={() => toggleParish(p.id)}
                    className="accent-oxblood"
                  />
                  <span className="truncate">{p.name}</span>
                </label>
              ))}
            </div>
          </div>

          <Button
            type="button"
            onClick={() => void handleGenerate()}
            disabled={generating || selectedParishes.length === 0}
            className="w-full"
          >
            {generating ? 'Generating report…' : 'Generate audit report'}
          </Button>
        </div>

        <div className="frame p-6 sm:p-8 bg-bone">
          {report ? (
            <article className="display">
              <p className="text-oxblood text-xs font-semibold tracking-widest uppercase mb-2">
                Preview
              </p>
              <h2 className="text-2xl font-semibold text-oxblood tracking-wide">
                {report.title}
              </h2>
              <p className="text-slate mt-2 text-base">
                {report.province} · {report.periodLabel}
              </p>
              <p className="text-ink mt-1 italic-serif text-lg">
                Prepared for: {report.preparedFor}
              </p>
              <div className="gilt-rule my-6" />
              <h3 className="text-sm font-semibold uppercase tracking-wider text-oxblood mb-3">
                Findings
              </h3>
              <ul className="space-y-2 text-ink text-base leading-relaxed">
                {reportFindingsText(report).map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
              <p className="text-slate text-sm mt-8 italic">
                Generated {report.generatedAt}
              </p>

              <div className="flex flex-wrap gap-2 mt-6">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => openPrintableReport(renderReportHtml(report))}
                >
                  <Printer className="w-4 h-4" aria-hidden />
                  Print / save as PDF
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="border border-hairline"
                  onClick={() => downloadReportStub(report)}
                >
                  <FileDown className="w-4 h-4" aria-hidden />
                  Download report
                </Button>
              </div>
            </article>
          ) : (
            <div className="h-full flex flex-col justify-center text-center py-12">
              <p className="display text-xl text-slate italic-serif">
                {periodPreview}
              </p>
              <p className="text-slate text-sm mt-3 max-w-xs mx-auto">
                Select a period and parishes, then generate a formal attestation for{' '}
                {trusteeName || DEFAULT_TRUSTEE}.
              </p>
              <p className="mono-tag mt-6">
                Sample: {formatNaira(18_432_500_00)} disbursements · May 2026
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
