const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

const LINES_INTERVAL = 10;
const SHOW_SECONDS = 5;

let counter = 0;
let panel = null;
let closeTimer = null;

const MIME = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml'
};

function findMedia(context, name, exts) {
  for (const ext of exts) {
    const file = path.join(context.extensionPath, 'media', name + ext);
    if (fs.existsSync(file)) return file;
  }
  return null;
}

function showReward(context) {
  const image = findMedia(context, 'image', ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg']);
  const sound = findMedia(context, 'sound', ['.mp3', '.wav', '.m4a', '.aiff']);

  if (image) {
    const uri = `data:${MIME[path.extname(image).toLowerCase()]};base64,${fs.readFileSync(image).toString('base64')}`;
    if (!panel) {
      panel = vscode.window.createWebviewPanel(
        'meow', '🎉 красава ',
        { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true },
        {}
      );
      panel.onDidDispose(() => { panel = null; clearTimeout(closeTimer); });
    }
    panel.webview.html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline';">
<style>html,body{height:100%;margin:0;display:flex;align-items:center;justify-content:center}
img{max-width:95%;max-height:95vh;border-radius:12px}</style></head>
<body><img src="${uri}"></body></html>`;

    clearTimeout(closeTimer);
    closeTimer = setTimeout(() => panel && panel.dispose(), SHOW_SECONDS * 1000);
  }

  if (sound) execFile('afplay', [sound], () => {});
}

function countAddedLines(event) {
  let added = 0;
  for (const change of event.contentChanges) {
    const newlines = (change.text.match(/\n/g) || []).length;
    const removed = change.range.end.line - change.range.start.line;
    if (newlines > removed) added += newlines - removed;
  }
  return added;
}

function activate(context) {
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((event) => {
      const scheme = event.document.uri.scheme;
      if (scheme !== 'file' && scheme !== 'untitled') return; 
      if (event.reason !== undefined) return;                   

      counter += countAddedLines(event);
      if (counter >= LINES_INTERVAL) {
        counter %= LINES_INTERVAL;
        showReward(context);
      }
    }),
    vscode.commands.registerCommand('lineImage.test', () => showReward(context))
  );
}

function deactivate() { clearTimeout(closeTimer); }

module.exports = { activate, deactivate };
