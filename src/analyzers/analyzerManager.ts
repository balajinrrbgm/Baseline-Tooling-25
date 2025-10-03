import * as vscode from 'vscode';
import { BaselineDataService } from '../services/baselineDataService';
import { CodeAnalyzer, AnalysisResult } from './analyzer';
import { JavaScriptAnalyzer } from './javascriptAnalyzer';
import { CSSAnalyzer } from './cssAnalyzer';
import { HTMLAnalyzer } from './htmlAnalyzer';

export class AnalyzerManager {
    private analyzers: Map<string, CodeAnalyzer> = new Map();

    constructor(baselineData: BaselineDataService) {
        const jsAnalyzer = new JavaScriptAnalyzer(baselineData);
        const cssAnalyzer = new CSSAnalyzer(baselineData);
        const htmlAnalyzer = new HTMLAnalyzer(baselineData);

        // Register analyzers for their supported languages
        jsAnalyzer.getSupportedLanguages().forEach(lang => 
            this.analyzers.set(lang, jsAnalyzer));
        cssAnalyzer.getSupportedLanguages().forEach(lang => 
            this.analyzers.set(lang, cssAnalyzer));
        htmlAnalyzer.getSupportedLanguages().forEach(lang => 
            this.analyzers.set(lang, htmlAnalyzer));
    }

    public async analyzeDocument(document: vscode.TextDocument): Promise<AnalysisResult> {
        const analyzer = this.analyzers.get(document.languageId);
        if (!analyzer) {
            return {
                matches: [],
                diagnostics: []
            };
        }

        return analyzer.analyze(document);
    }

    public canAnalyze(languageId: string): boolean {
        return this.analyzers.has(languageId);
    }

    public getSupportedLanguages(): string[] {
        return Array.from(this.analyzers.keys());
    }
}