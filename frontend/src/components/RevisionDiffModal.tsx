import { useQuery } from '@tanstack/react-query'
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  GitCompare,
  Layers,
  Loader2,
  ShieldAlert,
  Sparkles,
  Tag,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { api } from '../api'
import type { ClaimAttributeDiff, SemanticDiffResponse, SubmissionRevision } from '../types'

interface RevisionDiffModalProps {
  submissionId: string
  revisions: SubmissionRevision[]
  currentRevisionNumber: number
  onClose: () => void
}

export function RevisionDiffModal({
  submissionId,
  revisions,
  currentRevisionNumber,
  onClose,
}: RevisionDiffModalProps) {
  const sortedRevisions = [...revisions].sort((a, b) => a.revisionNumber - b.revisionNumber)

  // Default to comparing Revision 1 (or N-1) with the latest revision
  const defaultToRev = currentRevisionNumber
  const defaultFromRev = currentRevisionNumber > 1 ? currentRevisionNumber - 1 : 1

  const [fromRev, setFromRev] = useState<number>(defaultFromRev)
  const [toRev, setToRev] = useState<number>(defaultToRev)
  const [activeTab, setActiveTab] = useState<'CLAIMS' | 'TEXT' | 'NOTES'>('CLAIMS')

  const { data: diff, isLoading, error } = useQuery<SemanticDiffResponse>({
    queryKey: ['submission-diff', submissionId, fromRev, toRev],
    queryFn: () => api.getSubmissionDiff(submissionId, fromRev, toRev),
    enabled: fromRev !== toRev,
  })

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 sm:p-6"
    >
      <div className="relative flex flex-col w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-canvas">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-teal-50 border border-teal-200 text-[#0F766E]">
              <GitCompare size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                Semantic Revision Intelligence
                <span className="text-xs font-normal text-muted px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200">
                  Two-Layer Diff Engine
                </span>
              </h2>
              <p className="text-xs text-muted">
                Compares word tokens and factual claim attributes between revisions.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Revision Selector Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-3 bg-slate-50 border-b border-slate-200 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">Compare Base:</span>
            <select
              value={fromRev}
              onChange={(e) => setFromRev(Number(e.target.value))}
              className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white font-semibold text-slate-800 shadow-xs focus:ring-1 focus:ring-teal-500"
            >
              {sortedRevisions.map((r) => (
                <option key={r.revisionNumber} value={r.revisionNumber}>
                  Revision #{r.revisionNumber} {r.revisionComment ? `(${r.revisionComment.slice(0, 20)}...)` : ''}
                </option>
              ))}
            </select>

            <ArrowRight size={14} className="text-muted" />

            <span className="font-semibold text-slate-700">Target Revision:</span>
            <select
              value={toRev}
              onChange={(e) => setToRev(Number(e.target.value))}
              className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white font-semibold text-slate-800 shadow-xs focus:ring-1 focus:ring-teal-500"
            >
              {sortedRevisions.map((r) => (
                <option key={r.revisionNumber} value={r.revisionNumber}>
                  Revision #{r.revisionNumber} {r.revisionNumber === currentRevisionNumber ? '(Latest)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Layer View Switcher Tabs */}
          <div className="flex items-center rounded-xl bg-slate-200/70 p-1">
            <button
              onClick={() => setActiveTab('CLAIMS')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold transition-colors ${
                activeTab === 'CLAIMS' ? 'bg-white text-[#0A1F36] shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles size={13} className="text-[#0F766E]" />
              Layer 2: Claim Attributes ({diff?.claimDiffs.length ?? 0})
            </button>
            <button
              onClick={() => setActiveTab('TEXT')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold transition-colors ${
                activeTab === 'TEXT' ? 'bg-white text-[#0A1F36] shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers size={13} />
              Layer 1: Text Token Diff
            </button>
            <button
              onClick={() => setActiveTab('NOTES')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold transition-colors ${
                activeTab === 'NOTES' ? 'bg-white text-[#0A1F36] shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Creator Notes
            </button>
          </div>
        </div>

        {/* Modal Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {fromRev === toRev ? (
            <div className="p-8 text-center text-muted">
              <Clock size={32} className="mx-auto mb-2 opacity-50" />
              <p className="font-semibold text-slate-700">Select two distinct revisions to inspect differences.</p>
              <p className="text-xs mt-1">Please select a different Target Revision from the dropdowns above.</p>
            </div>
          ) : isLoading ? (
            <div className="p-12 text-center text-muted">
              <Loader2 size={32} className="mx-auto mb-3 animate-spin text-[#0F766E]" />
              <p className="font-semibold text-slate-700">Calculating semantic claim attribute diff...</p>
            </div>
          ) : error || !diff ? (
            <div className="p-6 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs">
              <p className="font-bold">Failed to load revision diff.</p>
              <p className="mt-1">{(error as Error)?.message || 'Unknown diff error occurred.'}</p>
            </div>
          ) : (
            <>
              {/* Executive Decision Alert Banner */}
              <div
                className={`rounded-xl border p-4 text-xs space-y-1.5 ${
                  diff.reverificationRequired
                    ? 'border-amber-300 bg-amber-50/80 text-amber-900'
                    : 'border-emerald-300 bg-emerald-50/80 text-emerald-900'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold flex items-center gap-2 text-sm">
                    {diff.reverificationRequired ? (
                      <>
                        <ShieldAlert size={18} className="text-amber-600" />
                        Re-Verification Required
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={18} className="text-emerald-600" />
                        Factual Integrity Maintained
                      </>
                    )}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider text-[10px] ${
                      diff.reverificationRequired
                        ? 'bg-amber-200 text-amber-900'
                        : 'bg-emerald-200 text-emerald-900'
                    }`}
                  >
                    {diff.totalClaimsChanged} Changed Claim(s)
                  </span>
                </div>
                <p className="text-xs leading-relaxed opacity-90">{diff.diffSummary}</p>
              </div>

              {/* TAB 1: CLAIM ATTRIBUTE DIFF (Layer 2) */}
              {activeTab === 'CLAIMS' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-muted font-medium">
                    <span>
                      Detected Claim Attribute Modifications ({diff.claimDiffs.length}):
                    </span>
                    <span>Re-verification determines organizational policy compliance</span>
                  </div>

                  {diff.claimDiffs.length === 0 ? (
                    <div className="p-6 rounded-xl border border-dashed border-slate-200 text-center text-xs text-muted">
                      No factual claim changes detected between Revision #{fromRev} and #{toRev}.
                    </div>
                  ) : (
                    diff.claimDiffs.map((cd: ClaimAttributeDiff, idx: number) => {
                      const isPrice = cd.attributeType === 'PRICE'
                      const isHigh = cd.severity === 'HIGH'

                      return (
                        <div
                          key={idx}
                          className={`rounded-2xl border p-4.5 space-y-3 transition-all ${
                            cd.reverificationRequired
                              ? 'border-amber-200 bg-white shadow-xs'
                              : 'border-slate-200 bg-slate-50/60'
                          }`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded-md font-bold text-xs bg-slate-100 text-[#0A1F36] border border-slate-200">
                                {cd.product || 'Corporate'}
                              </span>
                              <span className="px-2 py-0.5 rounded-md font-semibold text-xs bg-teal-50 text-[#0F766E] border border-teal-200 flex items-center gap-1">
                                <Tag size={12} />
                                {cd.attributeName}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                  cd.changeType === 'MODIFIED'
                                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                    : cd.changeType === 'ADDED'
                                    ? 'bg-sky-100 text-sky-800 border border-sky-300'
                                    : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {cd.changeType}
                              </span>

                              {cd.reverificationRequired && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-300">
                                  Re-verification Required
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Side-by-side Attribute Comparison Box */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-canvas/80 rounded-xl p-3 border border-line">
                            {/* Previous Value */}
                            <div className="space-y-1">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-muted block">
                                Revision #{fromRev} (Previous):
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-base font-bold text-slate-800 font-mono">
                                  {cd.previousValue ?? 'None / Unspecified'}
                                </span>
                                {cd.previousStatus && (
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                                    {cd.previousStatus}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* New Value */}
                            <div className="space-y-1 border-t sm:border-t-0 sm:border-l border-slate-200 sm:pl-3 pt-2 sm:pt-0">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-muted block">
                                Revision #{toRev} (New Target):
                              </span>
                              <div className="flex items-center gap-2">
                                <span className={`text-base font-bold font-mono ${isPrice ? 'text-[#0F766E]' : 'text-slate-900'}`}>
                                  {cd.newValue ?? 'Removed'}
                                </span>
                                {cd.newStatus && (
                                  <span
                                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                      cd.newStatus === 'VERIFIED'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : 'bg-rose-100 text-rose-800'
                                    }`}
                                  >
                                    {cd.newStatus}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Attribute Meta Details */}
                          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600">
                            {cd.unit && (
                              <span>
                                Unit: <strong className="text-slate-800">{cd.unit}</strong>
                              </span>
                            )}
                            {cd.billingPeriod && (
                              <span>
                                Billing: <strong className="text-slate-800">{cd.billingPeriod}</strong>
                              </span>
                            )}
                            <span>
                              Severity: <strong className={isHigh ? 'text-rose-700' : 'text-slate-800'}>{cd.severity}</strong>
                            </span>
                            <span className="ml-auto text-slate-500 italic">
                              {cd.summary}
                            </span>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              )}

              {/* TAB 2: TEXT TOKEN DIFF (Layer 1) */}
              {activeTab === 'TEXT' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-muted">
                    <span>Tokenized word-level diff between Revision #{fromRev} and #{toRev}:</span>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px] font-semibold border border-emerald-200">
                        + Added
                      </span>
                      <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 px-2 py-0.5 rounded text-[11px] font-semibold line-through border border-rose-200">
                        - Removed
                      </span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-4 font-mono text-xs leading-relaxed text-slate-800 overflow-x-auto whitespace-pre-wrap">
                    {diff.textDiff.map((chunk, idx) => {
                      if (chunk.type === 'ADDED') {
                        return (
                          <span
                            key={idx}
                            className="bg-emerald-100 text-emerald-950 px-1 py-0.5 rounded mx-0.5 font-bold border-b-2 border-emerald-500"
                          >
                            {chunk.text}
                          </span>
                        )
                      }
                      if (chunk.type === 'REMOVED') {
                        return (
                          <span
                            key={idx}
                            className="bg-rose-100 text-rose-950 px-1 py-0.5 rounded mx-0.5 line-through opacity-75 border-b-2 border-rose-400"
                          >
                            {chunk.text}
                          </span>
                        )
                      }
                      return <span key={idx}>{chunk.text}</span>
                    })}
                  </div>
                </div>
              )}

              {/* TAB 3: CREATOR NOTES */}
              {activeTab === 'NOTES' && (
                <div className="space-y-3 text-xs">
                  <p className="text-muted">
                    Compare creator context and intent rationale between revisions:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="rounded-xl border border-slate-200 bg-canvas p-4 space-y-1.5">
                      <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider block">
                        Revision #{fromRev} Notes:
                      </span>
                      <p className="text-slate-700 leading-relaxed italic bg-white p-3 rounded-lg border border-slate-200 min-h-[60px]">
                        {diff.fromCreatorNotes || 'No creator notes provided for this revision.'}
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-canvas p-4 space-y-1.5">
                      <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider block">
                        Revision #{toRev} Notes:
                      </span>
                      <p className="text-slate-700 leading-relaxed italic bg-white p-3 rounded-lg border border-slate-200 min-h-[60px]">
                        {diff.toCreatorNotes || 'No creator notes provided for this revision.'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-200 bg-canvas text-xs">
          <span className="text-muted">
            ClaimLedger Round 3 • Semantic Claim Intelligence & Governed Revision Auditing
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 font-bold text-slate-700 shadow-xs"
          >
            Close Diff Inspector
          </button>
        </div>
      </div>
    </div>
  )
}
