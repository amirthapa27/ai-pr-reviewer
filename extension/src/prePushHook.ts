import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

/**
 * Installs a pre-push hook that runs PR review on the diff being pushed.
 * Blocks push if critical issues are found (when prReview.blockPushOnCritical is true).
 */
export async function installPrePushHook(
  workspaceRoot: string,
  extensionPath: string
): Promise<boolean> {
  const gitDir = path.join(workspaceRoot, '.git');
  if (!fs.existsSync(gitDir) || !fs.statSync(gitDir).isDirectory()) {
    return false;
  }

  const hooksDir = path.join(gitDir, 'hooks');
  if (!fs.existsSync(hooksDir)) {
    fs.mkdirSync(hooksDir, { recursive: true });
  }

  const config = vscode.workspace.getConfiguration('prReview');
  const apiUrl = (config.get<string>('apiUrl') || 'http://localhost:3333').replace(/\/$/, '');
  const agentId = config.get<string>('agentId') || '69b0772e683a2db13f977b9c';
  const blockOnCritical = config.get<boolean>('blockPushOnCritical') !== false;

  const hookContent = getInlineHookScript(apiUrl, agentId, blockOnCritical);
  const hookPath = path.join(hooksDir, 'pre-push');
  fs.writeFileSync(hookPath, hookContent, { mode: 0o755 });

  const configPath = path.join(workspaceRoot, '.vscode', 'pr-review.json');
  const configDir = path.dirname(configPath);
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
  fs.writeFileSync(
    configPath,
    JSON.stringify(
      { apiUrl, agentId, blockPushOnCritical: blockOnCritical },
      null,
      2
    )
  );

  return true;
}

function getInlineHookScript(
  apiUrl: string,
  agentId: string,
  blockOnCritical: boolean
): string {
  return `#!/usr/bin/env node
// PR Review pre-push hook
const { execSync } = require('child_process');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

async function readStdin() {
  let data = '';
  process.stdin.setEncoding('utf8');
  for await (const chunk of process.stdin) data += chunk;
  return data;
}

function loadConfig(workspaceRoot) {
  const p = path.join(workspaceRoot, '.vscode', 'pr-review.json');
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) {
    return {};
  }
}

const BLOCK = ${blockOnCritical ? 'true' : 'false'};

async function run() {
  const refs = await readStdin();
  const lines = refs.trim().split(/\\n/).filter(Boolean);
  if (lines.length === 0) process.exit(0);

  const parts = lines[0].split(/\\s+/);
  const localSha = parts[1];
  const remoteSha = parts[3];
  if (!localSha || !remoteSha || localSha === remoteSha) process.exit(0);

  let diff = '';
  try {
    diff = execSync('git diff ' + remoteSha + ' ' + localSha + ' --no-color', {
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024,
    });
  } catch (e) {
    process.exit(0);
  }

  if (!diff || diff.trim().length === 0) process.exit(0);

  const cwd = process.cwd();
  const config = loadConfig(cwd);
  const API_URL = (config.apiUrl || '${apiUrl}').replace(/\\/$/, '');
  const AGENT_ID = config.agentId || '${agentId}';

  const message = 'Review your code changes. Focus: Full Review.\\n\\nCode Changes:\\n' + diff;
  const url = new URL(API_URL + '/api/agent');
  const isHttps = url.protocol === 'https:';
  const lib = isHttps ? https : http;

  const body = JSON.stringify({ message, agent_id: AGENT_ID });
  const reqOpts = {
    hostname: url.hostname,
    port: url.port || (isHttps ? 443 : 80),
    path: url.pathname + url.search,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
  };

  const res = await new Promise((resolve, reject) => {
    const req = lib.request(reqOpts, (r) => {
      let data = '';
      r.on('data', (c) => (data += c));
      r.on('end', () => resolve({ status: r.statusCode, data }));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });

  const { status, data } = res;
  if (status !== 200) {
    console.error('PR Review API error:', status);
    process.exit(0);
  }

  let json;
  try {
    json = JSON.parse(data);
  } catch (e) {
    process.exit(0);
  }

  function checkAndBlock(result) {
    if (!result) return;
    const rec = (result.recommendation || '').toLowerCase();
    const hasCritical = (cat) => (cat && cat.findings || []).some((f) => (f.severity || '').toLowerCase() === 'critical');
    const critical = hasCritical(result.security) || hasCritical(result.code_quality) || hasCritical(result.performance);
    if (BLOCK && (rec.includes('request') || critical)) {
      console.error('\\nPush blocked by PR Review: critical issues found. Fix them or use: git push --no-verify\\n');
      process.exit(1);
    }
  }

  if (json.status === 'completed' && json.response) {
    checkAndBlock(json.response.result);
    process.exit(0);
  }

  if (json.task_id) {
    for (let i = 0; i < 60; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const pr = await new Promise((resolve, reject) => {
        const req = lib.request({ ...reqOpts, method: 'POST' }, (r) => {
          let d = '';
          r.on('data', (c) => (d += c));
          r.on('end', () => { try { resolve(JSON.parse(d)); } catch (e) { resolve({}); } });
        });
        req.on('error', reject);
        req.write(JSON.stringify({ task_id: json.task_id }));
        req.end();
      });
      if (pr.status === 'completed' && pr.response) {
        checkAndBlock(pr.response.result);
        break;
      }
    }
  }

  process.exit(0);
}

run().catch(() => process.exit(0));
`;
}
