import * as vscode from 'vscode';
import { BaselineFeatureMatch } from '../types/baseline';

export interface AnalysisResult {
    matches: BaselineFeatureMatch[];
    diagnostics: vscode.Diagnostic[];
}

export interface CodeAnalyzer {
    analyze(document: vscode.TextDocument): Promise<AnalysisResult>;
    getSupportedLanguages(): string[];
}