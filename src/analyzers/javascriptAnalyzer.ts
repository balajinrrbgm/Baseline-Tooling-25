import * as vscode from 'vscode';
import * as ts from 'typescript';
import { BaselineDataService } from '../services/baselineDataService';
import { CodeAnalyzer, AnalysisResult } from './analyzer';
import { BaselineFeature, BaselineFeatureMatch } from '../types/baseline';

export class JavaScriptAnalyzer implements CodeAnalyzer {
    constructor(private baselineData: BaselineDataService) {}

    public getSupportedLanguages(): string[] {
        return ['javascript', 'typescript'];
    }

    public async analyze(document: vscode.TextDocument): Promise<AnalysisResult> {
        const result: AnalysisResult = {
            matches: [],
            diagnostics: []
        };

        const sourceFile = ts.createSourceFile(
            document.fileName,
            document.getText(),
            ts.ScriptTarget.Latest,
            true
        );

        // Get all baseline features for comparison
        const features = await this.baselineData.getAllFeatures();
        
        // Create a map for quick lookup of features by pattern
        const featurePatterns = new Map<string, BaselineFeature>();
        features.forEach(feature => {
            if (feature.group === 'javascript' || feature.group === 'api') {
                feature.codeExamples.forEach(example => {
                    if (example.legacy) {
                        featurePatterns.set(example.legacy, feature);
                    }
                });
            }
        });

        // Visit each node in the source file
        this.visitNode(sourceFile, result, featurePatterns, document);

        return result;
    }

    private visitNode(
        node: ts.Node,
        result: AnalysisResult,
        featurePatterns: Map<string, BaselineFeature>,
        document: vscode.TextDocument
    ): void {
        // Check method calls
        if (ts.isCallExpression(node)) {
            this.checkMethodCall(node, result, featurePatterns, document);
        }
        
        // Check property access
        if (ts.isPropertyAccessExpression(node)) {
            this.checkPropertyAccess(node, result, featurePatterns, document);
        }

        // Check operators and syntax patterns
        if (ts.isBinaryExpression(node)) {
            this.checkBinaryExpression(node, result, featurePatterns, document);
        }

        // Recursively visit child nodes
        node.forEachChild(child => this.visitNode(child, result, featurePatterns, document));
    }

    private checkMethodCall(
        node: ts.CallExpression,
        result: AnalysisResult,
        featurePatterns: Map<string, BaselineFeature>,
        document: vscode.TextDocument
    ): void {
        const methodName = this.getMethodName(node);
        if (!methodName) return;

        featurePatterns.forEach((feature, pattern) => {
            if (pattern.includes(methodName)) {
                const nodeText = node.getText();
                const patternRegex = this.createPatternRegex(pattern);
                
                if (patternRegex.test(nodeText)) {
                    const pos = document.positionAt(node.getStart());
                    const range = new vscode.Range(
                        pos,
                        document.positionAt(node.getEnd())
                    );

                    const diagnostic = new vscode.Diagnostic(
                        range,
                        `Legacy API usage: ${feature.name} has a modern alternative available`,
                        vscode.DiagnosticSeverity.Information
                    );

                    result.matches.push({
                        feature,
                        confidence: 0.9,
                        location: {
                            line: pos.line,
                            column: pos.character
                        }
                    });

                    result.diagnostics.push(diagnostic);
                }
            }
        });
    }

    private checkPropertyAccess(
        node: ts.PropertyAccessExpression,
        result: AnalysisResult,
        featurePatterns: Map<string, BaselineFeature>,
        document: vscode.TextDocument
    ): void {
        const propertyName = node.name.getText();

        featurePatterns.forEach((feature, pattern) => {
            if (pattern.includes(propertyName)) {
                const nodeText = node.getText();
                const patternRegex = this.createPatternRegex(pattern);

                if (patternRegex.test(nodeText)) {
                    const pos = document.positionAt(node.getStart());
                    const range = new vscode.Range(
                        pos,
                        document.positionAt(node.getEnd())
                    );

                    const diagnostic = new vscode.Diagnostic(
                        range,
                        `Legacy property usage: ${feature.name} has a modern alternative available`,
                        vscode.DiagnosticSeverity.Information
                    );

                    result.matches.push({
                        feature,
                        confidence: 0.8,
                        location: {
                            line: pos.line,
                            column: pos.character
                        }
                    });

                    result.diagnostics.push(diagnostic);
                }
            }
        });
    }

    private checkBinaryExpression(
        node: ts.BinaryExpression,
        result: AnalysisResult,
        featurePatterns: Map<string, BaselineFeature>,
        document: vscode.TextDocument
    ): void {
        const expressionText = node.getText();

        featurePatterns.forEach((feature, pattern) => {
            const patternRegex = this.createPatternRegex(pattern);
            
            if (patternRegex.test(expressionText)) {
                const pos = document.positionAt(node.getStart());
                const range = new vscode.Range(
                    pos,
                    document.positionAt(node.getEnd())
                );

                const diagnostic = new vscode.Diagnostic(
                    range,
                    `Legacy pattern usage: ${feature.name} has a modern alternative available`,
                    vscode.DiagnosticSeverity.Information
                );

                result.matches.push({
                    feature,
                    confidence: 0.7,
                    location: {
                        line: pos.line,
                        column: pos.character
                    }
                });

                result.diagnostics.push(diagnostic);
            }
        });
    }

    private getMethodName(node: ts.CallExpression): string | undefined {
        if (ts.isPropertyAccessExpression(node.expression)) {
            return node.expression.name.getText();
        } else if (ts.isIdentifier(node.expression)) {
            return node.expression.getText();
        }
        return undefined;
    }

    private createPatternRegex(pattern: string): RegExp {
        // Escape special characters and create a flexible pattern
        const escapedPattern = pattern
            .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
            .replace(/\s+/g, '\\s*');
        return new RegExp(escapedPattern);
    }
}