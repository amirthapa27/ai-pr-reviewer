'use client'

import React from 'react'
import { VscGitPullRequest } from 'react-icons/vsc'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'

interface HeaderProps {
  showSample: boolean
  onToggleSample: (val: boolean) => void
}

export default function Header({ showSample, onToggleSample }: HeaderProps) {
  return (
    <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-indigo-600/20 border border-indigo-500/30">
            <VscGitPullRequest className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">PR Review System</h1>
            <p className="text-sm text-gray-400">AI-powered code review for quality, security & performance</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="sample-toggle" className="text-sm text-gray-400 cursor-pointer">
            Sample Data
          </Label>
          <Switch
            id="sample-toggle"
            checked={showSample}
            onCheckedChange={onToggleSample}
          />
        </div>
      </div>
    </header>
  )
}
