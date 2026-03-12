import * as vscode from 'vscode';
import type { PRReviewData } from './reviewApi';

export class ReviewPanel {
  public static readonly viewType = 'prReview.panel';
  private _panel: vscode.WebviewPanel | undefined;
  private _extensionUri: vscode.Uri;

  constructor(extensionUri: vscode.Uri) {
    this._extensionUri = extensionUri;
  }

  public show() {
    if (this._panel) {
      this._panel.reveal();
      return;
    }

    this._panel = vscode.window.createWebviewPanel(
      ReviewPanel.viewType,
      'PR Review',
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    );

    this._panel.onDidDispose(() => {
      this._panel = undefined;
    });
  }

  public setLoading(loading: boolean) {
    if (this._panel) {
      this._panel.webview.html = this.getHtml({ loading });
    }
  }

  public setReviewData(data: PRReviewData) {
    if (this._panel) {
      this._panel.webview.html = this.getHtml({ data });
    }
  }

  public setError(message: string) {
    if (this._panel) {
      this._panel.webview.html = this.getHtml({ error: message });
    }
  }

  public dispose() {
    this._panel?.dispose();
    this._panel = undefined;
  }

  private getHtml(state: {
    loading?: boolean;
    data?: PRReviewData;
    error?: string;
  }): string {
    if (state.loading) {
      return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { box-sizing: border-box; }
    body { font-family: var(--vscode-font-family); padding: 24px; background: var(--vscode-editor-background); color: var(--vscode-editor-foreground); }
    .spinner { width: 40px; height: 40px; border: 3px solid var(--vscode-button-background); border-top-color: transparent; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 40px auto; }
    @keyframes spin { to { transform: rotate(360deg); } }
    p { text-align: center; color: var(--vscode-descriptionForeground); }
  </style>
</head>
<body>
  <div class="spinner"></div>
  <p>Analyzing your changes...</p>
</body>
</html>`;
    }

    if (state.error) {
      return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: var(--vscode-font-family); padding: 24px; background: var(--vscode-editor-background); color: var(--vscode-editor-foreground); }
    .error { background: rgba(255,100,100,0.1); border: 1px solid rgba(255,100,100,0.3); border-radius: 8px; padding: 16px; color: var(--vscode-errorForeground); }
  </style>
</head>
<body>
  <div class="error">${escapeHtml(state.error)}</div>
</body>
</html>`;
    }

    if (!state.data) return '';

    const d = state.data;
    const recClass =
      (d.recommendation || '').toLowerCase().includes('approve')
        ? 'good'
        : (d.recommendation || '').toLowerCase().includes('request')
        ? 'bad'
        : 'warn';

    let findingsHtml = '';
    const categories = [
      { key: 'security', label: 'Security', icon: '🛡️' },
      { key: 'code_quality', label: 'Code Quality', icon: '📋' },
      { key: 'performance', label: 'Performance', icon: '⚡' },
      { key: 'best_practices', label: 'Best Practices', icon: '✨' },
      { key: 'breaking_changes', label: 'Breaking Changes', icon: '⚠️' },
    ];

    for (const cat of categories) {
      const catData = (d as unknown as Record<string, unknown>)[cat.key] as
        | { score?: number; findings?: Array<{ severity: string; file: string; line: string; issue: string; suggestion: string }> }
        | undefined;
      if (!catData?.findings?.length) continue;

      findingsHtml += `
        <div class="category">
          <h3>${cat.icon} ${cat.label} (${catData.score ?? '-'}/10)</h3>
          <ul>
            ${catData.findings
              .map(
                (f) =>
                  `<li class="finding severity-${(f.severity || '').toLowerCase()}">
                    <strong>${escapeHtml(f.file)}:${f.line}</strong> ${escapeHtml(f.issue)}
                    ${f.suggestion ? `<br><span class="suggestion">→ ${escapeHtml(f.suggestion)}</span>` : ''}
                  </li>`
              )
              .join('')}
          </ul>
        </div>`;
    }

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { box-sizing: border-box; }
    body { font-family: var(--vscode-font-family); padding: 24px; background: var(--vscode-editor-background); color: var(--vscode-editor-foreground); font-size: 13px; line-height: 1.5; }
    h1 { font-size: 1.5rem; margin: 0 0 16px; }
    h2 { font-size: 1.1rem; margin: 20px 0 8px; }
    h3 { font-size: 1rem; margin: 16px 0 6px; color: var(--vscode-descriptionForeground); }
    .header { display: flex; gap: 24px; align-items: center; margin-bottom: 20px; flex-wrap: wrap; }
    .score { font-size: 2.5rem; font-weight: 700; }
    .score.good { color: #22c55e; }
    .score.bad { color: #ef4444; }
    .score.warn { color: #f59e0b; }
    .rec { padding: 6px 12px; border-radius: 6px; font-weight: 600; }
    .rec.good { background: rgba(34,197,94,0.2); color: #22c55e; }
    .rec.bad { background: rgba(239,68,68,0.2); color: #ef4444; }
    .rec.warn { background: rgba(245,158,11,0.2); color: #f59e0b; }
    .summary { background: var(--vscode-textBlockQuote-background); border-left: 4px solid var(--vscode-button-background); padding: 12px 16px; margin: 16px 0; border-radius: 0 6px 6px 0; }
    .category { margin: 16px 0; }
    .category ul { list-style: none; padding: 0; margin: 0; }
    .finding { margin: 10px 0; padding: 10px 12px; border-radius: 6px; background: var(--vscode-input-background); border-left: 3px solid; }
    .severity-critical { border-color: #ef4444; }
    .severity-warning { border-color: #f59e0b; }
    .severity-info { border-color: #3b82f6; }
    .suggestion { font-size: 0.9em; color: var(--vscode-descriptionForeground); margin-top: 4px; display: inline-block; }
  </style>
</head>
<body>
  <h1>PR Review Results</h1>
  <div class="header">
    <span class="score ${recClass}">${d.overall_score ?? '-'}/10</span>
    <span class="rec ${recClass}">${escapeHtml(d.recommendation || '')}</span>
  </div>
  <div class="summary">${escapeHtml(d.summary || '')}</div>
  <h2>Findings</h2>
  ${findingsHtml || '<p>No findings.</p>'}
</body>
</html>`;
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
