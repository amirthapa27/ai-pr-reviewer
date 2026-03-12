import * as vscode from 'vscode';

export interface ReviewApiConfig {
  apiUrl: string;
  agentId: string;
}

export interface PRReviewData {
  overall_score: number;
  recommendation: string;
  summary: string;
  code_quality: CategoryResult;
  security: CategoryResult;
  performance: CategoryResult;
  breaking_changes: CategoryResult;
  best_practices: CategoryResult;
}

interface CategoryResult {
  score: number;
  findings: Finding[];
}

interface Finding {
  severity: string;
  file: string;
  line: string;
  issue: string;
  suggestion: string;
}

export interface ReviewResult {
  success: boolean;
  data?: PRReviewData;
  error?: string;
  hasCriticalIssues?: boolean;
}

export function getReviewApiConfig(): ReviewApiConfig {
  const config = vscode.workspace.getConfiguration('prReview');
  const apiUrl = (config.get<string>('apiUrl') || '').replace(/\/$/, '');
  const agentId = config.get<string>('agentId') || '69b0772e683a2db13f977b9c';
  return { apiUrl, agentId };
}

export async function runReview(
  diff: string,
  config: ReviewApiConfig
): Promise<ReviewResult> {
  const message = `Review this pull request:\n\nFocus: Full Review\n\nCode Changes:\n${diff}`;

  const submitRes = await fetch(`${config.apiUrl}/api/agent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      agent_id: config.agentId,
    }),
  });

  if (!submitRes.ok) {
    const text = await submitRes.text();
    return {
      success: false,
      error: `API error ${submitRes.status}: ${text.slice(0, 200)}`,
    };
  }

  const submitData = (await submitRes.json()) as Record<string, unknown>;

  // Sync response (OpenAI, Anthropic, Google)
  if (submitData.status === 'completed' && submitData.response) {
    const response = submitData.response as Record<string, unknown>;
    const result = response.result as Record<string, unknown>;
    const data = extractReviewData(result);
    const hasCritical = hasCriticalIssues(data);
    return {
      success: true,
      data: data || undefined,
      hasCriticalIssues: hasCritical,
    };
  }

  // Async (Lyzr) - poll for result
  const taskId = submitData.task_id as string | undefined;
  if (!taskId) {
    return {
      success: false,
      error: 'No task_id in API response',
    };
  }

  const data = await pollForResult(config.apiUrl, taskId);
  if (!data) {
    return {
      success: false,
      error: 'Review timed out or failed',
    };
  }

  return {
    success: true,
    data,
    hasCriticalIssues: hasCriticalIssues(data),
  };
}

async function pollForResult(
  apiUrl: string,
  taskId: string
): Promise<PRReviewData | null> {
  const maxAttempts = 60;
  const delayMs = 2000;

  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, delayMs));

    const pollRes = await fetch(`${apiUrl}/api/agent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task_id: taskId }),
    });

    if (!pollRes.ok) return null;
    const pollData = (await pollRes.json()) as Record<string, unknown>;

    if (pollData.status === 'processing') continue;

    if (pollData.status === 'completed' && pollData.response) {
      const response = pollData.response as Record<string, unknown>;
      const result = response.result as Record<string, unknown>;
      return extractReviewData(result);
    }

    return null;
  }
  return null;
}

function extractReviewData(result: Record<string, unknown>): PRReviewData | null {
  if (!result || typeof result !== 'object') return null;

  const hasSchema =
    'overall_score' in result ||
    'code_quality' in result ||
    (typeof result.overall_score === 'number' && result.code_quality);

  if (hasSchema) {
    return result as unknown as PRReviewData;
  }

  if (typeof result.text === 'string') {
    try {
      const parsed = JSON.parse(result.text) as PRReviewData;
      if (parsed.overall_score !== undefined) return parsed;
    } catch {}
  }
  return null;
}

export function hasCriticalIssues(data: PRReviewData | null): boolean {
  if (!data) return false;
  const rec = (data.recommendation || '').toLowerCase();
  if (rec.includes('approve')) return false;

  const categories = [
    data.security,
    data.code_quality,
    data.performance,
    data.best_practices,
    data.breaking_changes,
  ];

  for (const cat of categories) {
    if (!cat?.findings) continue;
    for (const f of cat.findings) {
      if ((f.severity || '').toLowerCase() === 'critical') return true;
    }
  }
  return false;
}
