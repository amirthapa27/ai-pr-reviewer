import * as path from 'path';
import * as vscode from 'vscode';
import { runReview, getReviewApiConfig } from './reviewApi';
import { ReviewPanel } from './reviewPanel';
import { installPrePushHook } from './prePushHook';

let reviewPanel: ReviewPanel | undefined;

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand('pr-review.reviewChanges', async () => {
      const config = getReviewApiConfig();
      if (!config.apiUrl) {
        vscode.window.showErrorMessage(
          'PR Review: Set prReview.apiUrl in settings (e.g. http://localhost:3333)'
        );
        return;
      }

      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders?.length) {
        vscode.window.showErrorMessage('PR Review: Open a workspace first');
        return;
      }

      // Discover all git repos in the workspace (each folder may be or contain a repo)
      const repoRoots = await discoverGitRepos(workspaceFolders);
      if (repoRoots.length === 0) {
        vscode.window.showErrorMessage(
          'PR Review: No git repository found. Add your project folder to the workspace (File → Add Folder to Workspace), then try again.'
        );
        return;
      }

      // Always show picker so user explicitly selects the repo (avoids wrong-repo mistakes)
      interface RepoItem extends vscode.QuickPickItem {
        root: string;
      }
      const items: RepoItem[] = repoRoots.map((root) => ({
        label: root.split(/[/\\]/).pop() || root,
        description: root,
        root,
      }));
      const chosen = await vscode.window.showQuickPick<RepoItem>(items, {
        title: 'PR Review: Which repository do you want to review?',
        placeHolder: 'Select the repo containing your changes',
        matchOnDescription: true,
      });
      if (!chosen) return; // user cancelled
      const gitRoot = chosen.root;

      vscode.window.showInformationMessage(
        `PR Review: Reviewing ${chosen.label} — ${gitRoot}`
      );

      try {
        const diff = await getGitDiff(gitRoot);
        if (!diff || diff.trim().length === 0) {
          vscode.window.showInformationMessage(
            'PR Review: No changes to review. Stage or modify some files first.'
          );
          return;
        }

        if (!reviewPanel) {
          reviewPanel = new ReviewPanel(context.extensionUri);
        }
        reviewPanel.show();
        reviewPanel.setLoading(true);

        const result = await runReview(diff, config);
        reviewPanel.setLoading(false);

        if (result.success && result.data) {
          reviewPanel.setReviewData(result.data);
        } else {
          reviewPanel.setError(result.error || 'Review failed');
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        vscode.window.showErrorMessage(`PR Review failed: ${msg}`);
        if (reviewPanel) {
          reviewPanel.setLoading(false);
          reviewPanel.setError(msg);
        }
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('pr-review.installPrePushHook', async () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders?.length) {
        vscode.window.showErrorMessage('PR Review: Open a workspace first');
        return;
      }
      const repoRoots = await discoverGitRepos(workspaceFolders);
      if (repoRoots.length === 0) {
        vscode.window.showErrorMessage(
          'PR Review: No git repository found. Open a folder with a git repo.'
        );
        return;
      }
      let root: string;
      if (repoRoots.length === 1) {
        root = repoRoots[0];
      } else {
        interface RepoItem extends vscode.QuickPickItem {
          root: string;
        }
        const items: RepoItem[] = repoRoots.map((r) => ({
          label: r.split(/[/\\]/).pop() || r,
          description: r,
          root: r,
        }));
        const chosen = await vscode.window.showQuickPick<RepoItem>(items, {
          title: 'PR Review: Which repository to install the pre-push hook in?',
          placeHolder: 'Select the repo',
          matchOnDescription: true,
        });
        if (!chosen) return;
        root = chosen.root;
      }
      const installed = await installPrePushHook(root, context.extensionPath);
      if (installed) {
        vscode.window.showInformationMessage(
          'PR Review: Pre-push hook installed. Push will be blocked if critical issues are found.'
        );
      } else {
        vscode.window.showErrorMessage('PR Review: Failed to install pre-push hook');
      }
    })
  );
}

export function deactivate() {
  reviewPanel?.dispose();
}

async function discoverGitRepos(
  workspaceFolders: readonly vscode.WorkspaceFolder[]
): Promise<string[]> {
  const roots = new Set<string>();

  for (const folder of workspaceFolders) {
    const root = await getGitRoot(folder.uri.fsPath);
    if (root) roots.add(root);
  }

  // Also check active editor's file - it may be in a repo not at workspace root
  const activeEditor = vscode.window.activeTextEditor;
  if (activeEditor?.document?.uri) {
    const filePath = activeEditor.document.uri.fsPath;
    const dir = path.dirname(filePath);
    const root = await getGitRoot(dir);
    if (root) roots.add(root);
  }

  return Array.from(roots);
}

async function getGitRoot(pathFrom: string): Promise<string | null> {
  const { exec } = await import('child_process');
  return new Promise((resolve) => {
    exec(
      'git rev-parse --show-toplevel',
      { cwd: pathFrom },
      (err: Error | null, stdout: string) => {
        if (err) {
          resolve(null);
          return;
        }
        resolve(stdout.trim() || null);
      }
    );
  });
}

async function getGitDiff(gitRoot: string): Promise<string> {
  const { exec } = await import('child_process');
  return new Promise((resolve, reject) => {
    exec(
      'git diff HEAD --no-color',
      { cwd: gitRoot, maxBuffer: 10 * 1024 * 1024 },
      (err: Error | null, stdout: string, stderr: string) => {
        if (err) {
          reject(new Error(stderr || err.message));
          return;
        }
        resolve(stdout);
      }
    );
  });
}
