import * as vscode from 'vscode';
import * as parse5 from 'parse5';
import { BaselineDataService } from '../services/baselineDataService';
import { CodeAnalyzer, AnalysisResult } from './analyzer';
import { BaselineFeature } from '../types/baseline';

export class HTMLAnalyzer implements CodeAnalyzer {
    constructor(private baselineData: BaselineDataService) {}

    public getSupportedLanguages(): string[] {
        return ['html'];
    }

    public async analyze(document: vscode.TextDocument): Promise<AnalysisResult> {
        const result: AnalysisResult = {
            matches: [],
            diagnostics: []
        };

        try {
            const documentText = document.getText();
            const ast = parse5.parse(documentText);
            const features = await this.baselineData.getAllFeatures();

            // Filter HTML-related features
            const htmlFeatures = features.filter(f => 
                f.group === 'html' || 
                f.group === 'dom' || 
                f.group?.startsWith('html.'));

            // Create pattern maps
            const elementPatterns = new Map<string, BaselineFeature>();
            const attributePatterns = new Map<string, BaselineFeature>();

            htmlFeatures.forEach(feature => {
                feature.codeExamples.forEach(example => {
                    if (!example.legacy) return;

                    // Extract element names
                    const elementMatch = example.legacy.match(/<([a-zA-Z0-9-]+)/);
                    if (elementMatch) {
                        elementPatterns.set(elementMatch[1].toLowerCase(), feature);
                    }

                    // Extract attributes
                    const attrMatches = example.legacy.matchAll(/\s([a-zA-Z0-9-]+)=/g);
                    for (const match of attrMatches) {
                        attributePatterns.set(match[1].toLowerCase(), feature);
                    }
                });
            });

            this.walkNode(ast, result, elementPatterns, attributePatterns, document, documentText);
        } catch (error) {
            console.error('Error parsing HTML:', error);
        }

        return result;
    }

    private walkNode(
        node: any,
        result: AnalysisResult,
        elementPatterns: Map<string, BaselineFeature>,
        attributePatterns: Map<string, BaselineFeature>,
        document: vscode.TextDocument,
        documentText: string,
        parentOffset: number = 0
    ): void {
        if (node.tagName) {
            // Check element
            const feature = elementPatterns.get(node.tagName.toLowerCase());
            if (feature) {
                const start = this.findNodeStart(node, documentText, parentOffset);
                if (start !== -1) {
                    const pos = document.positionAt(start);
                    const range = new vscode.Range(
                        pos,
                        document.positionAt(start + node.tagName.length + 1)
                    );

                    const diagnostic = new vscode.Diagnostic(
                        range,
                        `Legacy HTML element: ${feature.name} has a modern alternative available`,
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

            // Check attributes
            if (node.attrs) {
                for (const attr of node.attrs) {
                    const attrFeature = attributePatterns.get(attr.name.toLowerCase());
                    if (attrFeature) {
                        const start = this.findAttributeStart(node, attr.name, documentText, parentOffset);
                        if (start !== -1) {
                            const pos = document.positionAt(start);
                            const range = new vscode.Range(
                                pos,
                                document.positionAt(start + attr.name.length)
                            );

                            const diagnostic = new vscode.Diagnostic(
                                range,
                                `Legacy HTML attribute: ${attrFeature.name} has a modern alternative available`,
                                vscode.DiagnosticSeverity.Information
                            );

                            result.matches.push({
                                feature: attrFeature,
                                confidence: 0.8,
                                location: {
                                    line: pos.line,
                                    column: pos.character
                                }
                            });

                            result.diagnostics.push(diagnostic);
                        }
                    }
                }
            }
        }

        // Recursively walk child nodes
        if (node.childNodes) {
            for (const child of node.childNodes) {
                this.walkNode(
                    child,
                    result,
                    elementPatterns,
                    attributePatterns,
                    document,
                    documentText,
                    node.sourceCodeLocation?.startOffset || parentOffset
                );
            }
        }
    }

    private findNodeStart(node: any, text: string, parentOffset: number): number {
        if (node.sourceCodeLocation) {
            return node.sourceCodeLocation.startOffset;
        }

        // Fallback: search in text
        const tagPattern = new RegExp(`<${node.tagName}[\\s>]`, 'i');
        const match = tagPattern.exec(text.slice(parentOffset));
        return match ? parentOffset + match.index + 1 : -1;
    }

    private findAttributeStart(node: any, attrName: string, text: string, parentOffset: number): number {
        if (node.sourceCodeLocation?.attrs?.[attrName]) {
            return node.sourceCodeLocation.attrs[attrName].startOffset;
        }

        // Fallback: search in text
        const attrPattern = new RegExp(`\\s${attrName}=`, 'i');
        const nodeStart = this.findNodeStart(node, text, parentOffset);
        if (nodeStart === -1) return -1;

        const match = attrPattern.exec(text.slice(nodeStart));
        return match ? nodeStart + match.index + 1 : -1;
    }
}