# AI PR Reviewer

AI-powered code review for pull requests. Review diffs before you push using multiple AI providers, with a web app and VS Code extension.

## Features

- **Web app** — Paste a PR diff or GitHub PR URL and get an AI review with scores and findings
- **VS Code extension** — Review staged + unstaged changes directly in the editor
- **Multiple AI providers** — Lyzr, OpenAI, Anthropic, Google Gemini
- **Findings by category** — Code quality, security, performance, breaking changes, best practices
- **Pre-push hook** — Optionally block pushes when critical issues are found

## Tech Stack

- Next.js 14 (App Router), React 18, Tailwind CSS, Radix UI
- AI: Lyzr (default), OpenAI, Anthropic, Google Gemini
- VS Code extension for in-editor reviews
- Deploy: Netlify, Docker

## Getting Started

### Prerequisites

- Node.js 20+
- npm

### 1. Clone and install

```bash
cd ai-pr-reviewer
npm install
```

### 2. Environment variables

```bash
cp .env.example .env
```

Edit `.env` and set:

- `AI_PROVIDER` — `lyzr` | `openai` | `anthropic` | `google`
- The API key for your chosen provider (see `.env.example`)

### 3. Run the web app

```bash
npm run dev
```

Open [http://localhost:3333](http://localhost:3333).

### VS Code Extension

1. Start the web app first (`npm run dev`).
2. In VS Code: **File → Preferences → Settings**, set `prReview.apiUrl` to `http://localhost:3333`.
3. In the `extension` folder:

   ```bash
   cd extension
   npm install
   npm run compile
   ```

4. Press **F5** or run **Extension: Run Extension** to launch a dev host with the extension.

## Docker

```bash
docker build -t ai-pr-reviewer .
docker run -e AI_PROVIDER=lyzr -e LYZR_API_KEY=xxx -e AGENT_ID=xxx -p 3333:3333 ai-pr-reviewer
```

Or use `--env-file .env` to load variables from a file.

## Deployment (Netlify)

The project includes `netlify.toml`. Deploy by connecting the repo to Netlify. Set the same environment variables in the Netlify dashboard.

## Scripts

| Command      | Description          |
| ------------ | -------------------- |
| `npm run dev` | Start dev server (port 3333) |
| `npm run build` | Production build    |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint           |