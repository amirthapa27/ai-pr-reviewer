# PR Review Extension

AI-powered code review for your changes before you push. Reviews diffs, shows findings in a panel, and can block push on critical issues.

## Features

1. **Review Changes button** — In the Source Control view, click the shield icon to review your uncommitted changes (staged + unstaged)
2. **Review panel** — Results open in a side panel with scores, summary, and categorized findings
3. **Pre-push hook** — Optional: block push if the review finds critical issues

## Setup

1. **Run the PR Review API** — Start your Next.js app (`npm run dev` in the project root) so it runs at `http://localhost:3333`

2. **Install the extension** — Open the `extension` folder in VS Code and press F5 to launch the Extension Development Host, or package it:
   ```bash
   cd extension
   npm run package
   # Install the generated .vsix file
   ```

3. **Configure** — Open Settings and set:
   - `PR Review: Api Url` — e.g. `http://localhost:3333` or your deployed app URL
   - `PR Review: Agent Id` — Your Lyzr agent ID (default is set)
   - `PR Review: Block Push On Critical` — Whether to block push when critical issues are found (default: true)

## Usage

1. Make changes to your code
2. Go to Source Control view (Ctrl+Shift+G)
3. Click the **shield icon** (Review Changes) in the Source Control toolbar
4. Wait for the review — results open in a side panel

### Pre-push hook (optional)

1. Run command: **PR Review: Install Pre-Push Hook**
2. The extension installs a git hook that reviews the diff being pushed
3. If critical issues are found and blocking is enabled, push is blocked
4. To bypass: `git push --no-verify`

## Requirements

- Git repository
- PR Review API running (your Next.js app at the configured URL)
- LYZR_API_KEY or other AI provider configured in the API
