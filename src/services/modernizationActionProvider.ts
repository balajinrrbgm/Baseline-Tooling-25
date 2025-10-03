import * as vscode from 'vscode';
import { ModernizationSuggestion } from '../types/shared';
import { SuggestionEngine } from './suggestionEngine';

export class ModernizationActionProvider implements vscode.CodeActionProvider {
    private diagnosticCollection: vscode.DiagnosticCollection;

    constructor(
        private suggestionEngine: SuggestionEngine,
        context: vscode.ExtensionContext
    ) {
        this.diagnosticCollection = vscode.languages.createDiagnosticCollection('baseline-modernizer');
        context.subscriptions.push(this.diagnosticCollection);
    }

    public async updateDiagnostics(document: vscode.TextDocument, suggestions: ModernizationSuggestion[]): Promise<void> {
        const diagnostics: vscode.Diagnostic[] = [];

        for (const suggestion of suggestions) {
            // Get the range using VSCode Position objects from the suggestion's location
            const range = new vscode.Range(
                suggestion.location.start as vscode.Position,
                suggestion.location.end as vscode.Position
            );

            const diagnostic = new vscode.Diagnostic(
                range,
                `Modernization opportunity: ${suggestion.title}`,
                vscode.DiagnosticSeverity.Information
            );

            // Add custom properties to identify the suggestion
            diagnostic.code = suggestion.id;
            diagnostic.source = 'Baseline Modernizer';
            diagnostic.tags = this.getDiagnosticTags(suggestion.category);
            diagnostics.push(diagnostic);
        }

        this.diagnosticCollection.set(document.uri, diagnostics);
    }

    public async provideCodeActions(
        document: vscode.TextDocument,
        range: vscode.Range | vscode.Selection,
        context: vscode.CodeActionContext
    ): Promise<(vscode.CodeAction | vscode.Command)[]> {
        const actions: vscode.CodeAction[] = [];

        // Process each diagnostic that overlaps with the current range
        for (const diagnostic of context.diagnostics) {
            if (diagnostic.source === 'Baseline Modernizer') {
                const suggestionId = diagnostic.code as string;
                const suggestion = await this.suggestionEngine.getSuggestionById(suggestionId);

                if (suggestion) {
                    actions.push(
                        this.createModernizeAction(document, diagnostic.range, suggestion),
                        this.createShowDocumentationAction(suggestion),
                        this.createIgnoreAction(document, diagnostic)
                    );
                }
            }
        }

        return actions;
    }

    private createModernizeAction(
        document: vscode.TextDocument,
        range: vscode.Range,
        suggestion: ModernizationSuggestion
    ): vscode.CodeAction {
        const action = new vscode.CodeAction(
            `Modernize: ${suggestion.title}`,
            vscode.CodeActionKind.QuickFix
        );

        // Create the edit to replace the old code with modern code
        const edit = new vscode.WorkspaceEdit();
        edit.replace(document.uri, range, suggestion.suggestedCode);
        action.edit = edit;

        // Add metadata for tracking
        action.diagnostics = [this.createDiagnosticForSuggestion(range, suggestion)];
        action.isPreferred = true;

        return action;
    }

    private createShowDocumentationAction(
        suggestion: ModernizationSuggestion
    ): vscode.CodeAction {
        const action = new vscode.CodeAction(
            `Show documentation for ${suggestion.feature.name}`,
            vscode.CodeActionKind.QuickFix
        );

        action.command = {
            command: 'baseline-modernizer.showDocumentation',
            title: 'Show Documentation',
            arguments: [suggestion]
        };

        return action;
    }

    private createIgnoreAction(
        document: vscode.TextDocument,
        diagnostic: vscode.Diagnostic
    ): vscode.CodeAction {
        const action = new vscode.CodeAction(
            'Ignore this suggestion',
            vscode.CodeActionKind.QuickFix
        );

        action.command = {
            command: 'baseline-modernizer.ignoreSuggestion',
            title: 'Ignore Suggestion',
            arguments: [document.uri, diagnostic]
        };

        return action;
    }

    private createDiagnosticForSuggestion(
        range: vscode.Range,
        suggestion: ModernizationSuggestion
    ): vscode.Diagnostic {
        const diagnostic = new vscode.Diagnostic(
            range,
            suggestion.description,
            vscode.DiagnosticSeverity.Information
        );

        diagnostic.source = 'Baseline Modernizer';
        diagnostic.code = suggestion.id;
        diagnostic.tags = this.getDiagnosticTags(suggestion.category);

        return diagnostic;
    }

    private getDiagnosticTags(category: string): vscode.DiagnosticTag[] {
        const tags: vscode.DiagnosticTag[] = [];

        switch (category) {
            case 'performance':
                tags.push(vscode.DiagnosticTag.Unnecessary);
                break;
            case 'security':
                tags.push(vscode.DiagnosticTag.Unnecessary);
                break;
            case 'accessibility':
                tags.push(vscode.DiagnosticTag.Unnecessary);
                break;
        }

        return tags;
    }

    public clearDiagnostics(): void {
        this.diagnosticCollection.clear();
    }

    public disposeDiagnostics(): void {
        this.diagnosticCollection.dispose();
    }
}