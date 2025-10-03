import * as vscode from 'vscode';
import { ModernizationSuggestion } from '../types/suggestions';

export class SuggestionView {
    private static readonly viewType = 'baselineModernizer.suggestions';
    private panel: vscode.WebviewPanel | undefined;

    constructor(private context: vscode.ExtensionContext) {}

    public show(suggestions: ModernizationSuggestion[]): void {
        if (this.panel) {
            this.panel.reveal();
        } else {
            this.panel = vscode.window.createWebviewPanel(
                SuggestionView.viewType,
                'Baseline Modernization Suggestions',
                vscode.ViewColumn.Two,
                {
                    enableScripts: true,
                    retainContextWhenHidden: true
                }
            );

            this.panel.onDidDispose(() => {
                this.panel = undefined;
            });
        }

        this.panel.webview.html = this.getWebviewContent(suggestions);

        // Handle messages from the webview
        this.panel.webview.onDidReceiveMessage(
            async message => {
                switch (message.command) {
                    case 'applyFix':
                        await this.applyFix(message.suggestion);
                        break;
                    case 'showDocs':
                        await this.openDocumentation(message.url);
                        break;
                }
            },
            undefined,
            this.context.subscriptions
        );
    }

    private getWebviewContent(suggestions: ModernizationSuggestion[]): string {
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Baseline Modernization Suggestions</title>
            <style>
                body {
                    padding: 20px;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
                }
                .suggestion {
                    margin-bottom: 30px;
                    padding: 15px;
                    border: 1px solid var(--vscode-widget-border);
                    border-radius: 4px;
                }
                .suggestion-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 10px;
                }
                .suggestion-title {
                    font-size: 16px;
                    font-weight: bold;
                    color: var(--vscode-editor-foreground);
                }
                .suggestion-impact {
                    padding: 4px 8px;
                    border-radius: 3px;
                    font-size: 12px;
                }
                .impact-high {
                    background-color: var(--vscode-testing-iconPassed);
                    color: var(--vscode-editor-background);
                }
                .impact-medium {
                    background-color: var(--vscode-testing-iconSkipped);
                    color: var(--vscode-editor-background);
                }
                .impact-low {
                    background-color: var(--vscode-testing-iconQueued);
                    color: var(--vscode-editor-background);
                }
                .code-block {
                    background-color: var(--vscode-editor-background);
                    padding: 10px;
                    margin: 10px 0;
                    border-radius: 3px;
                    font-family: 'Fira Code', monospace;
                }
                .code-block pre {
                    margin: 0;
                    white-space: pre-wrap;
                }
                .compatibility {
                    margin: 10px 0;
                    font-size: 14px;
                }
                .browser-support {
                    display: flex;
                    gap: 10px;
                    margin-top: 5px;
                }
                .browser {
                    padding: 4px 8px;
                    background-color: var(--vscode-badge-background);
                    border-radius: 3px;
                    font-size: 12px;
                }
                .actions {
                    margin-top: 15px;
                    display: flex;
                    gap: 10px;
                }
                button {
                    padding: 6px 12px;
                    border: none;
                    border-radius: 3px;
                    cursor: pointer;
                    font-size: 12px;
                    background-color: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                }
                button:hover {
                    background-color: var(--vscode-button-hoverBackground);
                }
                .docs-link {
                    color: var(--vscode-textLink-foreground);
                    text-decoration: none;
                }
                .docs-link:hover {
                    text-decoration: underline;
                }
            </style>
        </head>
        <body>
            <h1>Modernization Suggestions</h1>
            ${suggestions.map(suggestion => this.renderSuggestion(suggestion)).join('')}
            <script>
                const vscode = acquireVsCodeApi();
                
                function applyFix(suggestionId) {
                    vscode.postMessage({
                        command: 'applyFix',
                        suggestion: suggestionId
                    });
                }
                
                function showDocs(url) {
                    vscode.postMessage({
                        command: 'showDocs',
                        url: url
                    });
                }
            </script>
        </body>
        </html>`;
    }

    private renderSuggestion(suggestion: ModernizationSuggestion): string {
        return `
        <div class="suggestion">
            <div class="suggestion-header">
                <span class="suggestion-title">${this.escapeHtml(suggestion.title)}</span>
                <span class="suggestion-impact impact-${suggestion.impact}">${suggestion.impact.toUpperCase()}</span>
            </div>
            <p>${this.escapeHtml(suggestion.description)}</p>
            
            <div class="code-block">
                <h4>Current Code:</h4>
                <pre>${this.escapeHtml(suggestion.matchedCode)}</pre>
            </div>
            
            <div class="code-block">
                <h4>Modern Alternative:</h4>
                <pre>${this.escapeHtml(suggestion.suggestedCode)}</pre>
            </div>
            
            <div class="compatibility">
                <h4>Browser Compatibility:</h4>
                <div class="browser-support">
                    ${suggestion.compatibility.browsers.map(browser => `
                        <span class="browser">${browser.name} ${browser.version}+</span>
                    `).join('')}
                </div>
            </div>
            
            <div class="actions">
                <button onclick="applyFix('${suggestion.id}')">Apply Fix</button>
                ${suggestion.documentation.mdnUrl ? 
                    `<button onclick="showDocs('${suggestion.documentation.mdnUrl}')">View Documentation</button>` : 
                    ''}
            </div>
        </div>`;
    }

    private escapeHtml(text: string): string {
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    private async applyFix(suggestionId: string): Promise<void> {
        // TODO: Implement fix application logic
        await vscode.window.showInformationMessage(`Applying fix for suggestion ${suggestionId}`);
    }

    private async openDocumentation(url: string): Promise<void> {
        await vscode.env.openExternal(vscode.Uri.parse(url));
    }
}