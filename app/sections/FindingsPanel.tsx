'use client'

import React, { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible'
import { VscShield, VscDashboard, VscSymbolRuler, VscWarning, VscLightbulb, VscError, VscInfo, VscCheck, VscChevronDown, VscChevronRight, VscFile } from 'react-icons/vsc'

interface Finding {
  severity: string
  file: string
  line: string
  issue: string
  suggestion: string
}

interface CategoryResult {
  score: number
  findings: Finding[]
}

interface PRReviewData {
  overall_score: number
  recommendation: string
  summary: string
  code_quality: CategoryResult
  security: CategoryResult
  performance: CategoryResult
  breaking_changes: CategoryResult
  best_practices: CategoryResult
}

interface FindingsPanelProps {
  data: PRReviewData
}

function getSeverityStyle(severity: string): { bg: string; text: string; icon: React.ReactNode } {
  const s = (severity ?? '').toLowerCase()
  if (s === 'critical' || s === 'error' || s === 'high') {
    return { bg: 'bg-red-500/15 border-red-500/30', text: 'text-red-400', icon: <VscError className="w-3.5 h-3.5" /> }
  }
  if (s === 'warning' || s === 'medium') {
    return { bg: 'bg-amber-500/15 border-amber-500/30', text: 'text-amber-400', icon: <VscWarning className="w-3.5 h-3.5" /> }
  }
  return { bg: 'bg-blue-500/15 border-blue-500/30', text: 'text-blue-400', icon: <VscInfo className="w-3.5 h-3.5" /> }
}

const TABS: Array<{ key: keyof Pick<PRReviewData, 'code_quality' | 'security' | 'performance' | 'breaking_changes' | 'best_practices'>; label: string; icon: React.ReactNode }> = [
  { key: 'code_quality', label: 'Code Quality', icon: <VscSymbolRuler className="w-3.5 h-3.5" /> },
  { key: 'security', label: 'Security', icon: <VscShield className="w-3.5 h-3.5" /> },
  { key: 'performance', label: 'Performance', icon: <VscDashboard className="w-3.5 h-3.5" /> },
  { key: 'breaking_changes', label: 'Breaking Changes', icon: <VscWarning className="w-3.5 h-3.5" /> },
  { key: 'best_practices', label: 'Best Practices', icon: <VscLightbulb className="w-3.5 h-3.5" /> },
]

function FindingCard({ finding }: { finding: Finding }) {
  const [open, setOpen] = useState(false)
  const sevStyle = getSeverityStyle(finding?.severity ?? '')

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className={`rounded-lg border ${sevStyle.bg} overflow-hidden`}>
        <CollapsibleTrigger className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-white/5 transition-colors cursor-pointer">
          <span className={`mt-0.5 ${sevStyle.text}`}>{sevStyle.icon}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className={`text-xs border ${sevStyle.text} ${sevStyle.bg} capitalize`}>
                {finding?.severity ?? 'info'}
              </Badge>
              <span className="text-xs text-gray-500 font-mono flex items-center gap-1">
                <VscFile className="w-3 h-3" />
                {finding?.file ?? 'unknown'}:{finding?.line ?? '?'}
              </span>
            </div>
            <p className="text-sm text-gray-200 mt-1.5 leading-relaxed">{finding?.issue ?? 'No description'}</p>
          </div>
          <span className="text-gray-500 mt-1 flex-shrink-0">
            {open ? <VscChevronDown className="w-4 h-4" /> : <VscChevronRight className="w-4 h-4" />}
          </span>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 pb-3 pt-0 ml-7">
            <div className="bg-gray-800/60 rounded-md p-3 border border-gray-700/50">
              <p className="text-xs font-medium text-indigo-400 mb-1">Suggestion</p>
              <p className="text-sm text-gray-300 leading-relaxed">{finding?.suggestion ?? 'No suggestion provided.'}</p>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}

export default function FindingsPanel({ data }: FindingsPanelProps) {
  return (
    <Card className="bg-gray-900/80 border-gray-800 shadow-xl">
      <CardContent className="pt-5 pb-4">
        <Tabs defaultValue="code_quality" className="w-full">
          <TabsList className="w-full flex flex-wrap bg-gray-800/80 border border-gray-700/50 h-auto p-1 gap-0.5">
            {TABS.map((tab) => {
              const catData = data?.[tab.key]
              const count = Array.isArray(catData?.findings) ? catData.findings.length : 0
              return (
                <TabsTrigger
                  key={tab.key}
                  value={tab.key}
                  className="flex-1 min-w-0 flex items-center justify-center gap-1.5 text-xs py-2 px-2 data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-md text-gray-400"
                >
                  {tab.icon}
                  <span className="hidden sm:inline truncate">{tab.label}</span>
                  {count > 0 && (
                    <span className="ml-0.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-gray-700 data-[state=active]:bg-indigo-500 text-[10px] font-medium">
                      {count}
                    </span>
                  )}
                </TabsTrigger>
              )
            })}
          </TabsList>

          {TABS.map((tab) => {
            const catData = data?.[tab.key]
            const findings = Array.isArray(catData?.findings) ? catData.findings : []
            return (
              <TabsContent key={tab.key} value={tab.key} className="mt-4">
                {findings.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-3">
                      <VscCheck className="w-5 h-5 text-emerald-400" />
                    </div>
                    <p className="text-sm text-emerald-400 font-medium">No issues found</p>
                    <p className="text-xs text-gray-500 mt-1">This category passed the review without findings.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                    {findings.map((finding, idx) => (
                      <FindingCard key={idx} finding={finding} />
                    ))}
                  </div>
                )}
              </TabsContent>
            )
          })}
        </Tabs>
      </CardContent>
    </Card>
  )
}
