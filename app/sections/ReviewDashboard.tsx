'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { VscShield, VscDashboard, VscSymbolRuler, VscWarning, VscLightbulb } from 'react-icons/vsc'

interface CategoryResult {
  score: number
  findings: Array<{
    severity: string
    file: string
    line: string
    issue: string
    suggestion: string
  }>
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

interface ReviewDashboardProps {
  data: PRReviewData
}

function getScoreColor(score: number): string {
  if (score >= 8) return 'text-emerald-400'
  if (score >= 5) return 'text-amber-400'
  return 'text-red-400'
}

function getScoreRingColor(score: number): string {
  if (score >= 8) return 'stroke-emerald-400'
  if (score >= 5) return 'stroke-amber-400'
  return 'stroke-red-400'
}

function getScoreBgColor(score: number): string {
  if (score >= 8) return 'bg-emerald-400/10 border-emerald-400/20'
  if (score >= 5) return 'bg-amber-400/10 border-amber-400/20'
  return 'bg-red-400/10 border-red-400/20'
}

function getRecommendationStyle(rec: string): { bg: string; text: string; label: string } {
  const lower = (rec ?? '').toLowerCase()
  if (lower.includes('approve')) return { bg: 'bg-emerald-500/20 border-emerald-500/30', text: 'text-emerald-300', label: 'Approve' }
  if (lower.includes('request') || lower.includes('change')) return { bg: 'bg-red-500/20 border-red-500/30', text: 'text-red-300', label: 'Request Changes' }
  return { bg: 'bg-amber-500/20 border-amber-500/30', text: 'text-amber-300', label: 'Needs Discussion' }
}

function renderMarkdown(text: string) {
  if (!text) return null
  return (
    <div className="space-y-1.5">
      {text.split('\n').map((line, i) => {
        if (line.startsWith('### ')) return <h4 key={i} className="font-semibold text-sm mt-3 mb-1 text-white">{line.slice(4)}</h4>
        if (line.startsWith('## ')) return <h3 key={i} className="font-semibold text-base mt-3 mb-1 text-white">{line.slice(3)}</h3>
        if (line.startsWith('# ')) return <h2 key={i} className="font-bold text-lg mt-4 mb-2 text-white">{line.slice(2)}</h2>
        if (line.startsWith('- ') || line.startsWith('* ')) return <li key={i} className="ml-4 list-disc text-sm text-gray-300">{formatInline(line.slice(2))}</li>
        if (/^\d+\.\s/.test(line)) return <li key={i} className="ml-4 list-decimal text-sm text-gray-300">{formatInline(line.replace(/^\d+\.\s/, ''))}</li>
        if (!line.trim()) return <div key={i} className="h-1" />
        return <p key={i} className="text-sm text-gray-300">{formatInline(line)}</p>
      })}
    </div>
  )
}

function formatInline(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  if (parts.length === 1) return text
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i} className="font-semibold text-white">{part}</strong> : part
  )
}

const CATEGORIES: Array<{ key: keyof Pick<PRReviewData, 'code_quality' | 'security' | 'performance' | 'breaking_changes' | 'best_practices'>; label: string; icon: React.ReactNode }> = [
  { key: 'code_quality', label: 'Code Quality', icon: <VscSymbolRuler className="w-4 h-4" /> },
  { key: 'security', label: 'Security', icon: <VscShield className="w-4 h-4" /> },
  { key: 'performance', label: 'Performance', icon: <VscDashboard className="w-4 h-4" /> },
  { key: 'breaking_changes', label: 'Breaking Changes', icon: <VscWarning className="w-4 h-4" /> },
  { key: 'best_practices', label: 'Best Practices', icon: <VscLightbulb className="w-4 h-4" /> },
]

export default function ReviewDashboard({ data }: ReviewDashboardProps) {
  const score = data?.overall_score ?? 0
  const recStyle = getRecommendationStyle(data?.recommendation ?? '')
  const circumference = 2 * Math.PI * 52
  const offset = circumference - (score / 10) * circumference

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Overall Score */}
        <Card className="bg-gray-900/80 border-gray-800 shadow-xl">
          <CardContent className="pt-6 flex flex-col items-center justify-center">
            <div className="relative w-32 h-32">
              <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="52" fill="none" className="stroke-gray-800" strokeWidth="8" />
                <circle cx="60" cy="60" r="52" fill="none" className={getScoreRingColor(score)} strokeWidth="8" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-3xl font-bold ${getScoreColor(score)}`}>{score}</span>
                <span className="text-xs text-gray-500">/ 10</span>
              </div>
            </div>
            <p className="text-sm text-gray-400 mt-3">Overall Score</p>
          </CardContent>
        </Card>

        {/* Recommendation + Summary */}
        <Card className="bg-gray-900/80 border-gray-800 shadow-xl lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-white text-lg">Review Summary</CardTitle>
              <div className={`px-3 py-1.5 rounded-full border text-sm font-medium ${recStyle.bg} ${recStyle.text}`}>
                {recStyle.label}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Separator className="bg-gray-800 mb-3" />
            <div className="max-h-40 overflow-y-auto pr-2">
              {renderMarkdown(data?.summary ?? 'No summary available.')}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Score Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {CATEGORIES.map((cat) => {
          const catData = data?.[cat.key]
          const catScore = catData?.score ?? 0
          const findingsCount = Array.isArray(catData?.findings) ? catData.findings.length : 0
          return (
            <Card key={cat.key} className={`border ${getScoreBgColor(catScore)} shadow-md`}>
              <CardContent className="pt-4 pb-3 px-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className={getScoreColor(catScore)}>{cat.icon}</span>
                  <span className="text-xs text-gray-400 font-medium truncate">{cat.label}</span>
                </div>
                <div className="flex items-end justify-between">
                  <span className={`text-2xl font-bold ${getScoreColor(catScore)}`}>{catScore}</span>
                  <span className="text-xs text-gray-500">{findingsCount} {findingsCount === 1 ? 'finding' : 'findings'}</span>
                </div>
                <div className="mt-2 w-full bg-gray-800 rounded-full h-1.5">
                  <div className={`h-1.5 rounded-full transition-all duration-500 ${catScore >= 8 ? 'bg-emerald-400' : catScore >= 5 ? 'bg-amber-400' : 'bg-red-400'}`} style={{ width: `${(catScore / 10) * 100}%` }} />
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
