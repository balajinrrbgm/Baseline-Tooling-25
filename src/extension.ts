import * as vscode from 'vscode';
import { BaselineDataService } from './services/baselineDataService';
import { BaselineCacheManager } from './services/baselineCacheManager';
import { AnalyzerManager } from './analyzers/analyzerManager';
import { SuggestionEngine } from './services/suggestionEngine';
import { SuggestionView } from './views/suggestionView';
import { DocumentationGenerator } from './services/documentationGenerator';
import { ModernizationActionProvider } from './services/modernizationActionProvider';
import { ModernizationSuggestion } from './types/shared';
import { BaselineFeatureMatch } from './types/shared';

export async function activate(context: vscode.ExtensionContext) {
    try {
        // Initialize services
        BaselineCacheManager.initialize(context);
        const baselineData = BaselineDataService.getInstance();
        await baselineData.initialize();

        const analyzerManager = new AnalyzerManager(baselineData);
        const suggestionEngine = new SuggestionEngine(baselineData);
        const suggestionView = new SuggestionView(context);
        const documentationGenerator = new DocumentationGenerator(baselineData);

        // Register analyze workspace command
        const analyzeCommand = vscode.commands.registerCommand('baseline-modernizer.analyzeWorkspace', async () => {
            try {
                const workspaceFolders = vscode.workspace.workspaceFolders;
                if (!workspaceFolders) {
                    vscode.window.showErrorMessage('Please open a workspace first.');
                    return;
                }

                // Show progress indicator
                await vscode.window.withProgress({
                    location: vscode.ProgressLocation.Notification,
                    title: "Analyzing workspace for modernization opportunities...",
                    cancellable: true
                }, async (progress, token) => {
                    // Initialize baseline data
                    progress.report({ message: 'Loading Baseline data...' });
                    await baselineData.initialize();

                    // Analyze workspace files
                    progress.report({ message: 'Analyzing workspace files...' });
                    const files = await vscode.workspace.findFiles(
                        '{**/*.js,**/*.ts,**/*.jsx,**/*.tsx,**/*.html,**/*.css}',
                        '**/node_modules/**'
                    );

                    let analysisResults: { document: vscode.TextDocument; matches: BaselineFeatureMatch[] }[] = [];
                    for (const file of files) {
                        if (token.isCancellationRequested) {
                            return;
                        }

                        const document = await vscode.workspace.openTextDocument(file);
                        if (analyzerManager.canAnalyze(document.languageId)) {
                            const result = await analyzerManager.analyzeDocument(document);
                            if (result && result.matches.length > 0) {
                                analysisResults.push({
                                    document,
                                    matches: result.matches
                                });
                            }
                        }
                    }

                    // Generate suggestions for each document
                    progress.report({ message: 'Generating modernization suggestions...' });
                    let allSuggestions: ModernizationSuggestion[] = [];
                    for (const result of analysisResults) {
                        const suggestions = await suggestionEngine.generateSuggestions(result.matches, result.document);
                        allSuggestions.push(...suggestions);
                    }

                    // Generate documentation and show suggestions
                    if (allSuggestions.length > 0) {
                        // Generate documentation for each suggestion
                        for (const suggestion of allSuggestions) {
                            const markdown = await documentationGenerator.generateMarkdownDocumentation(suggestion);
                            
                            // Create markdown preview
                            const doc = await vscode.workspace.openTextDocument({
                                content: markdown,
                                language: 'markdown'
                            });
                            await vscode.window.showTextDocument(doc, vscode.ViewColumn.Three);
                        }

                        suggestionView.show(allSuggestions);
                        vscode.window.showInformationMessage(`Found ${allSuggestions.length} modernization opportunities! Check the Suggestions view for details.`);
                    } else {
                        vscode.window.showInformationMessage('No modernization suggestions found. Your code is already using modern web features! 🎉');
                    }
                });
            } catch (error) {
                vscode.window.showErrorMessage(`Error analyzing workspace: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        });

        // Register code actions provider for quick fixes
        const actionProvider = new ModernizationActionProvider(suggestionEngine, context);
        const quickFixProvider = vscode.languages.registerCodeActionsProvider(
            ['javascript', 'typescript', 'html', 'css'],
            actionProvider
        );

        // Register command to show documentation
        const showDocsCommand = vscode.commands.registerCommand(
            'baseline-modernizer.showDocumentation',
            async (suggestion: ModernizationSuggestion) => {
                const markdown = await documentationGenerator.generateMarkdownDocumentation(suggestion);
                const doc = await vscode.workspace.openTextDocument({
                    content: markdown,
                    language: 'markdown'
                });
                await vscode.window.showTextDocument(doc, vscode.ViewColumn.Three);
            }
        );

        // Register command to ignore suggestions
        const ignoreCommand = vscode.commands.registerCommand(
            'baseline-modernizer.ignoreSuggestion',
            (uri: vscode.Uri, diagnostic: vscode.Diagnostic) => {
                actionProvider.clearDiagnostics();
            }
        );

        // Register commands and providers
        context.subscriptions.push(
            analyzeCommand,
            quickFixProvider,
            showDocsCommand,
            ignoreCommand
        );

        // Register workspace change handlers
        vscode.workspace.onDidChangeTextDocument(event => {
            const document = event.document;
            if (analyzerManager.canAnalyze(document.languageId)) {
                analyzerManager.analyzeDocument(document).then(async result => {
                    if (result && result.matches.length > 0) {
                        // Convert matches to the expected BaselineFeatureMatch format
                        const baselineMatches = result.matches.map(match => {
                            // Convert the analyzer's location format to our unified format
                            const line = match.location.line;
                            const column = match.location.column;
                            const startPos = new vscode.Position(line, column);
                            const endPos = new vscode.Position(line, column + 1);
                            const startOffset = document.offsetAt(startPos);
                            const endOffset = document.offsetAt(endPos);

                            return {
                                ...match,
                                matchedText: document.getText(new vscode.Range(startPos, endPos)),
                                location: {
                                    // Line/column format
                                    line,
                                    column,
                                    
                                    // VS Code Position format
                                    start: startPos,
                                    end: endPos,
                                    
                                    // Offset format
                                    startOffset,
                                    endOffset
                                }
                            };
                        });

                        // Generate suggestions for the updated document
                        const suggestions = await suggestionEngine.generateSuggestions(baselineMatches, document);
                        
                        // Update diagnostics with the new suggestions
                        actionProvider.updateDiagnostics(document, suggestions);
                    } else {
                        actionProvider.clearDiagnostics();
                    }
                });
            }
        }, null, context.subscriptions);

        // Show success message
        vscode.window.showInformationMessage('Baseline Modernizer is now active!');
    } catch (error) {
        vscode.window.showErrorMessage('Failed to initialize Baseline Modernizer: ' + error);
    }
}

export function deactivate() {
    // Clean up if needed
}