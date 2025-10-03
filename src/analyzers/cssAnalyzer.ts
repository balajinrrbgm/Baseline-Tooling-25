import * as vscode from 'vscode';
import * as postcss from 'postcss';
import { BaselineDataService } from '../services/baselineDataService';
import { CodeAnalyzer, AnalysisResult } from './analyzer';
import { BaselineFeature } from '../types/baseline';

export class CSSAnalyzer implements CodeAnalyzer {
    constructor(private baselineData: BaselineDataService) {}

    public getSupportedLanguages(): string[] {
        return ['css', 'scss', 'less'];
    }

    public async analyze(document: vscode.TextDocument): Promise<AnalysisResult> {
        const result: AnalysisResult = {
            matches: [],
            diagnostics: []
        };

        try {
            const root = postcss.parse(document.getText());
            const features = await this.baselineData.getAllFeatures();
            
            // Filter CSS-related features
            const cssFeatures = features.filter(f => 
                f.group === 'css' || f.group?.startsWith('css.'));

            // Create pattern maps
            const propertyPatterns = new Map<string, BaselineFeature>();
            const valuePatterns = new Map<string, BaselineFeature>();
            const atRulePatterns = new Map<string, BaselineFeature>();

            cssFeatures.forEach(feature => {
                feature.codeExamples.forEach(example => {
                    if (!example.legacy) return;

                    // Extract property name from legacy example
                    const propertyMatch = example.legacy.match(/^([a-zA-Z-]+):/);
                    if (propertyMatch) {
                        propertyPatterns.set(propertyMatch[1], feature);
                    }

                    // Extract values
                    const valueMatch = example.legacy.match(/:\s*([^;]+)/);
                    if (valueMatch) {
                        valuePatterns.set(valueMatch[1].trim(), feature);
                    }

                    // Extract at-rules
                    const atRuleMatch = example.legacy.match(/@([a-zA-Z-]+)/);
                    if (atRuleMatch) {
                        atRulePatterns.set(atRuleMatch[1], feature);
                    }
                });
            });

            // Walk through the CSS AST
            root.walkDecls(decl => {
                this.checkDeclaration(decl, result, propertyPatterns, valuePatterns, document);
            });

            root.walkAtRules(atRule => {
                this.checkAtRule(atRule, result, atRulePatterns, document);
            });

        } catch (error) {
            console.error('Error parsing CSS:', error);
        }

        return result;
    }

    private checkDeclaration(
        decl: postcss.Declaration,
        result: AnalysisResult,
        propertyPatterns: Map<string, BaselineFeature>,
        valuePatterns: Map<string, BaselineFeature>,
        document: vscode.TextDocument
    ): void {
        // Check property
        const propertyFeature = propertyPatterns.get(decl.prop);
        if (propertyFeature) {
            const start = this.getPosition(decl.source?.start);
            if (start) {
                const range = new vscode.Range(
                    start,
                    new vscode.Position(start.line, start.character + decl.prop.length)
                );

                const diagnostic = new vscode.Diagnostic(
                    range,
                    `Legacy CSS property: ${propertyFeature.name} has a modern alternative available`,
                    vscode.DiagnosticSeverity.Information
                );

                result.matches.push({
                    feature: propertyFeature,
                    confidence: 0.9,
                    location: {
                        line: start.line,
                        column: start.character
                    }
                });

                result.diagnostics.push(diagnostic);
            }
        }

        // Check value
        const valueFeature = valuePatterns.get(decl.value);
        if (valueFeature) {
            const start = this.getPosition(decl.source?.start);
            if (start) {
                const valueStart = document.positionAt(
                    document.offsetAt(start) + decl.prop.length + 1
                );
                const range = new vscode.Range(
                    valueStart,
                    new vscode.Position(valueStart.line, valueStart.character + decl.value.length)
                );

                const diagnostic = new vscode.Diagnostic(
                    range,
                    `Legacy CSS value: ${valueFeature.name} has a modern alternative available`,
                    vscode.DiagnosticSeverity.Information
                );

                result.matches.push({
                    feature: valueFeature,
                    confidence: 0.8,
                    location: {
                        line: valueStart.line,
                        column: valueStart.character
                    }
                });

                result.diagnostics.push(diagnostic);
            }
        }
    }

    private checkAtRule(
        atRule: postcss.AtRule,
        result: AnalysisResult,
        atRulePatterns: Map<string, BaselineFeature>,
        document: vscode.TextDocument
    ): void {
        const feature = atRulePatterns.get(atRule.name);
        if (feature) {
            const start = this.getPosition(atRule.source?.start);
            if (start) {
                const range = new vscode.Range(
                    start,
                    new vscode.Position(start.line, start.character + atRule.name.length + 1)
                );

                const diagnostic = new vscode.Diagnostic(
                    range,
                    `Legacy CSS at-rule: ${feature.name} has a modern alternative available`,
                    vscode.DiagnosticSeverity.Information
                );

                result.matches.push({
                    feature,
                    confidence: 0.9,
                    location: {
                        line: start.line,
                        column: start.character
                    }
                });

                result.diagnostics.push(diagnostic);
            }
        }
    }

    private getPosition(pos?: { line: number; column: number }): vscode.Position | undefined {
        if (!pos) return undefined;
        return new vscode.Position(pos.line - 1, pos.column - 1);
    }
}