'use strict';
const vscode = require('vscode');
const { exec, spawn } = require('child_process');
const path = require('path');

let langClient;

function activate(context) {
    console.log('Script# extension activated');

    // ── Try to start the LSP client ────────────────────────────────────────
    startLspClient(context);

    // ── Run File command ───────────────────────────────────────────────────
    const runCmd = vscode.commands.registerCommand('scriptsharp.runFile', () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) { return; }
        const file = editor.document.fileName;
        const ssc = getSsc();
        const terminal = vscode.window.createTerminal('Script#');
        terminal.show();
        terminal.sendText(`${ssc} "${file}"`);
    });

    // ── Check Syntax command ───────────────────────────────────────────────
    const checkCmd = vscode.commands.registerCommand('scriptsharp.checkSyntax', () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) { return; }
        const file = editor.document.fileName;
        exec(`${getSsc()} --check "${file}"`, (err, stdout, stderr) => {
            if (err) {
                vscode.window.showErrorMessage(`Script# Syntax Error: ${stderr || err.message}`);
            } else {
                vscode.window.showInformationMessage(`Script# ✓ No syntax errors: ${path.basename(file)}`);
            }
        });
    });

    // ── Open REPL command ──────────────────────────────────────────────────
    const replCmd = vscode.commands.registerCommand('scriptsharp.openRepl', () => {
        const terminal = vscode.window.createTerminal('Script# REPL');
        terminal.show();
        terminal.sendText(`${getSsc()} --repl`);
    });

    // ── Status bar ─────────────────────────────────────────────────────────
    const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    statusBar.text = '$(play) Run Script#';
    statusBar.command = 'scriptsharp.runFile';
    statusBar.tooltip = 'Run the current Script# file';

    const updateStatusBar = () => {
        const editor = vscode.window.activeTextEditor;
        if (editor && editor.document.languageId === 'script-sharp') {
            statusBar.show();
        } else {
            statusBar.hide();
        }
    };

    vscode.window.onDidChangeActiveTextEditor(updateStatusBar, null, context.subscriptions);
    updateStatusBar();

    context.subscriptions.push(runCmd, checkCmd, replCmd, statusBar);
}

function getSsc() {
    const config = vscode.workspace.getConfiguration('scriptsharp');
    return config.get('interpreterPath', 'ssc');
}

function startLspClient(context) {
    // Require vscode-languageclient — bundled in node_modules next to extension
    let LanguageClient;
    try {
        LanguageClient = require('vscode-languageclient/node').LanguageClient;
    } catch (e) {
        console.warn('Script#: vscode-languageclient not found, LSP features disabled.', e.message);
        return;
    }

    const ssc = getSsc();

    // Server: launch ssc --lsp
    const serverOptions = {
        run:   { command: ssc, args: ['--lsp'] },
        debug: { command: ssc, args: ['--lsp'] },
    };

    const clientOptions = {
        documentSelector: [
            { scheme: 'file', language: 'script-sharp' },
        ],
        synchronize: {
            fileEvents: vscode.workspace.createFileSystemWatcher('**/*.{script#,scriptsharp}'),
        },
    };

    langClient = new LanguageClient(
        'script-sharp-lsp',
        'Script# Language Server',
        serverOptions,
        clientOptions,
    );

    langClient.start();
    console.log('Script#: LSP client started');
}

function deactivate() {
    if (langClient) {
        return langClient.stop();
    }
}

module.exports = { activate, deactivate };
