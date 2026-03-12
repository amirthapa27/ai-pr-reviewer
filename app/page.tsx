'use client'

import React, { useState } from 'react'
import { callAIAgent } from '@/lib/aiAgent'
import parseLLMJson from '@/lib/jsonParser'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { VscError, VscGitPullRequest } from 'react-icons/vsc'
import { AiOutlineLoading3Quarters } from 'react-icons/ai'

import Header from './sections/Header'
import PRInputForm from './sections/PRInputForm'
import ReviewDashboard from './sections/ReviewDashboard'
import FindingsPanel from './sections/FindingsPanel'

// ---- Types ----

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

// ---- Sample Data ----

const SAMPLE_DATA: PRReviewData = {
  overall_score: 6,
  recommendation: 'request_changes',
  summary: 'The pull request introduces a user authentication module with login and registration endpoints. While the core logic is functional, there are **critical security vulnerabilities** including plaintext password storage and SQL injection risks. Performance can be improved by adding database connection pooling. Several best practice violations were found around error handling and input validation.',
  code_quality: {
    score: 7,
    findings: [
      { severity: 'warning', file: 'src/auth/login.ts', line: '45', issue: 'Function exceeds 80 lines - consider breaking into smaller functions', suggestion: 'Extract the token generation and validation logic into separate helper functions for better readability and testability.' },
      { severity: 'info', file: 'src/auth/register.ts', line: '12', issue: 'Missing JSDoc comments on public API function', suggestion: 'Add JSDoc documentation describing parameters, return type, and any thrown exceptions.' },
    ],
  },
  security: {
    score: 3,
    findings: [
      { severity: 'critical', file: 'src/auth/register.ts', line: '28', issue: 'Passwords stored in plaintext without hashing', suggestion: 'Use bcrypt or argon2 to hash passwords before storing them. Never store plaintext passwords.' },
      { severity: 'critical', file: 'src/db/queries.ts', line: '15', issue: 'SQL query built with string concatenation - SQL injection risk', suggestion: 'Use parameterized queries or an ORM to prevent SQL injection attacks.' },
      { severity: 'warning', file: 'src/auth/login.ts', line: '62', issue: 'JWT secret hardcoded in source code', suggestion: 'Move the JWT secret to environment variables and never commit secrets to version control.' },
    ],
  },
  performance: {
    score: 6,
    findings: [
      { severity: 'warning', file: 'src/db/connection.ts', line: '8', issue: 'New database connection created on every request', suggestion: 'Implement connection pooling using a pool manager to reduce connection overhead and improve response times.' },
    ],
  },
  breaking_changes: {
    score: 9,
    findings: [],
  },
  best_practices: {
    score: 5,
    findings: [
      { severity: 'warning', file: 'src/auth/login.ts', line: '70', issue: 'Generic error caught and swallowed without logging', suggestion: 'Log errors with appropriate severity levels and return meaningful error responses to the client.' },
      { severity: 'info', file: 'src/auth/register.ts', line: '5', issue: 'No input validation on email and username fields', suggestion: 'Add input validation using a library like zod or joi to validate request body fields before processing.' },
    ],
  },
}

const SAMPLE_FORM = {
  title: 'Add user authentication module',
  description: 'Implements login and registration endpoints with JWT token management',
  code: `// src/auth/register.ts
export async function registerUser(req, res) {
  const { email, username, password } = req.body;

  // Store user in database
  const query = "INSERT INTO users (email, username, password) VALUES ('"
    + email + "', '" + username + "', '" + password + "')";
  await db.execute(query);

  return res.json({ success: true });
}

// src/auth/login.ts
export async function loginUser(req, res) {
  const { email, password } = req.body;
  const user = await db.query("SELECT * FROM users WHERE email = '" + email + "'");

  if (user && user.password === password) {
    const token = jwt.sign({ userId: user.id }, "my-secret-key-123");
    return res.json({ token });
  }

  try {
    // ... additional auth logic
  } catch(e) {
    // handle error
  }

  return res.status(401).json({ error: "Invalid credentials" });
}`,
  focus: 'full',
}

// ---- Constants ----

const AGENT_ID = '69b0772e683a2db13f977b9c'

// ---- ErrorBoundary ----

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: '' }
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white">
          <div className="text-center p-8 max-w-md">
            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-gray-400 mb-4 text-sm">{this.state.error}</p>
            <button
              onClick={() => this.setState({ hasError: false, error: '' })}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700"
            >
              Try again
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// ---- Page ----

export default function Page() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reviewData, setReviewData] = useState<PRReviewData | null>(null)
  const [showSample, setShowSample] = useState(false)
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    code: '',
    focus: 'full',
  })

  const handleToggleSample = (val: boolean) => {
    setShowSample(val)
    if (val) {
      setFormData(SAMPLE_FORM)
      setReviewData(SAMPLE_DATA)
      setError(null)
    } else {
      setFormData({ title: '', description: '', code: '', focus: 'full' })
      setReviewData(null)
      setError(null)
    }
  }

  const handleFormChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async () => {
    if (!formData.code.trim()) return

    setLoading(true)
    setError(null)
    setReviewData(null)
    setActiveAgentId(AGENT_ID)

    try {
      const focusLabels: Record<string, string> = {
        full: 'Full Review',
        security: 'Security Focus',
        performance: 'Performance Focus',
        code_quality: 'Code Quality Focus',
      }

      let message = 'Review this pull request:\n'
      if (formData.title) message += `Title: ${formData.title}\n`
      if (formData.description) message += `Description: ${formData.description}\n`
      message += `Focus: ${focusLabels[formData.focus] ?? 'Full Review'}\n\nCode Changes:\n${formData.code}`

      const result = await callAIAgent(message, AGENT_ID)

      if (result.success) {
        const rawResult = result?.response?.result
        const parsed = typeof rawResult === 'string' ? parseLLMJson(rawResult) : rawResult
        if (parsed && typeof parsed === 'object' && 'overall_score' in parsed) {
          setReviewData(parsed as PRReviewData)
        } else {
          setError('Unexpected response format from the agent. Please try again.')
        }
      } else {
        setError(result?.error ?? result?.response?.message ?? 'Agent call failed. Please try again.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.')
    } finally {
      setLoading(false)
      setActiveAgentId(null)
    }
  }

  const displayData = reviewData

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-950 text-white">
        <Header showSample={showSample} onToggleSample={handleToggleSample} />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          {/* Input Form */}
          <PRInputForm
            formData={formData}
            onFormChange={handleFormChange}
            onSubmit={handleSubmit}
            loading={loading}
          />

          {/* Error Display */}
          {error && (
            <Card className="bg-red-500/10 border-red-500/30">
              <CardContent className="py-4 flex items-start gap-3">
                <VscError className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-red-300 font-medium">Review Failed</p>
                  <p className="text-sm text-red-400/80 mt-1">{error}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSubmit}
                  className="border-red-500/30 text-red-300 hover:bg-red-500/10 flex-shrink-0"
                >
                  Retry
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Loading State */}
          {loading && (
            <div className="space-y-4">
              <Card className="bg-gray-900/80 border-gray-800 shadow-xl">
                <CardContent className="py-8 flex flex-col items-center justify-center">
                  <AiOutlineLoading3Quarters className="w-8 h-8 text-indigo-400 animate-spin mb-4" />
                  <p className="text-sm text-gray-300 font-medium">Analyzing your code...</p>
                  <p className="text-xs text-gray-500 mt-1">This may take a moment while the AI reviews your changes.</p>
                </CardContent>
              </Card>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <Skeleton className="h-48 bg-gray-800/60 rounded-lg" />
                <Skeleton className="h-48 bg-gray-800/60 rounded-lg lg:col-span-2" />
              </div>
              <div className="grid grid-cols-5 gap-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 bg-gray-800/60 rounded-lg" />
                ))}
              </div>
            </div>
          )}

          {/* Results */}
          {!loading && displayData && (
            <>
              <ReviewDashboard data={displayData} />
              <FindingsPanel data={displayData} />
            </>
          )}

          {/* Empty State */}
          {!loading && !displayData && !error && (
            <Card className="bg-gray-900/60 border-gray-800 border-dashed">
              <CardContent className="py-12 flex flex-col items-center justify-center text-center">
                <div className="w-14 h-14 rounded-full bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center mb-4">
                  <VscGitPullRequest className="w-7 h-7 text-indigo-400" />
                </div>
                <h3 className="text-lg font-medium text-white mb-1">No Review Yet</h3>
                <p className="text-sm text-gray-400 max-w-md">
                  Paste your code changes or diff above and click "Run PR Review" to get an AI-powered analysis covering code quality, security, performance, and best practices.
                </p>
                <p className="text-xs text-gray-600 mt-3">
                  Tip: Toggle "Sample Data" in the header to see an example review.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Agent Status */}
          <Card className="bg-gray-900/40 border-gray-800/60">
            <CardContent className="py-3 px-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${activeAgentId ? 'bg-indigo-400 animate-pulse' : 'bg-gray-600'}`} />
                  <span className="text-xs text-gray-500 font-medium">PR Review Agent</span>
                </div>
                <span className="text-xs text-gray-600 font-mono">{AGENT_ID}</span>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </ErrorBoundary>
  )
}
