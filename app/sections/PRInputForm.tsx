'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { VscCode, VscSearch } from 'react-icons/vsc'
import { AiOutlineLoading3Quarters } from 'react-icons/ai'

interface PRInputFormProps {
  formData: {
    title: string
    description: string
    code: string
    focus: string
  }
  onFormChange: (field: string, value: string) => void
  onSubmit: () => void
  loading: boolean
}

export default function PRInputForm({ formData, onFormChange, onSubmit, loading }: PRInputFormProps) {
  const canSubmit = formData.code.trim().length > 0 && !loading

  return (
    <Card className="bg-gray-900/80 border-gray-800 shadow-xl">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-white text-lg">
          <VscCode className="w-5 h-5 text-indigo-400" />
          Submit Code for Review
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="pr-title" className="text-gray-300 text-sm">PR Title (optional)</Label>
            <Input
              id="pr-title"
              placeholder="e.g., Add user authentication flow"
              value={formData.title}
              onChange={(e) => onFormChange('title', e.target.value)}
              className="bg-gray-800/60 border-gray-700 text-white placeholder:text-gray-500 focus:border-indigo-500 focus:ring-indigo-500/20"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="review-focus" className="text-gray-300 text-sm">Review Focus</Label>
            <Select value={formData.focus} onValueChange={(val) => onFormChange('focus', val)}>
              <SelectTrigger className="bg-gray-800/60 border-gray-700 text-white focus:border-indigo-500 focus:ring-indigo-500/20">
                <SelectValue placeholder="Select focus area" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                <SelectItem value="full">Full Review</SelectItem>
                <SelectItem value="security">Security Focus</SelectItem>
                <SelectItem value="performance">Performance Focus</SelectItem>
                <SelectItem value="code_quality">Code Quality Focus</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="pr-description" className="text-gray-300 text-sm">PR Description / Context (optional)</Label>
          <Input
            id="pr-description"
            placeholder="Brief description of what this PR does..."
            value={formData.description}
            onChange={(e) => onFormChange('description', e.target.value)}
            className="bg-gray-800/60 border-gray-700 text-white placeholder:text-gray-500 focus:border-indigo-500 focus:ring-indigo-500/20"
          />
        </div>

        <Separator className="bg-gray-800" />

        <div className="space-y-2">
          <Label htmlFor="code-diff" className="text-gray-300 text-sm">
            Code Changes / Diff <span className="text-red-400">*</span>
          </Label>
          <Textarea
            id="code-diff"
            placeholder={"Paste your code diff or code changes here...\n\nExample:\n+ function validateInput(data) {\n+   if (!data.email) throw new Error('Email required');\n+   return sanitize(data);\n+ }"}
            value={formData.code}
            onChange={(e) => onFormChange('code', e.target.value)}
            rows={12}
            className="bg-gray-800/60 border-gray-700 text-white placeholder:text-gray-500 font-mono text-sm focus:border-indigo-500 focus:ring-indigo-500/20 resize-y"
          />
          <p className="text-xs text-gray-500">Paste your code diff, pull request changes, or code snippet to review.</p>
        </div>

        <Button
          onClick={onSubmit}
          disabled={!canSubmit}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 transition-all duration-200 disabled:opacity-40"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <AiOutlineLoading3Quarters className="w-4 h-4 animate-spin" />
              Analyzing Code...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <VscSearch className="w-4 h-4" />
              Run PR Review
            </span>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
