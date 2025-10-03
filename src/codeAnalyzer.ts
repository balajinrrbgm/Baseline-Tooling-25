import * as vscode from 'vscode';
import { BaselineDataService } from './services/baselineDataService';
import { BaselineFeature, BaselineFeatureMatch } from './types/baseline';

export interface AnalysisResult {
    legacyFeatures: BaselineFeatureMatch[];
}

export class CodeAnalyzer {
    constructor(private baselineData: BaselineDataService) {}

    public async analyzeDocument(document: vscode.TextDocument): Promise<AnalysisResult> {
        const result: AnalysisResult = {
            legacyFeatures: []
        };

        const features = await this.baselineData.getAllFeatures();
        const text = document.getText();

        for (const feature of features) {
            if (feature.status === 'deprecated') {
                const matches = await this.findFeatureUsages(document, feature);
                result.legacyFeatures.push(...matches);
            }
        }

        return result;
    }

    private async findFeatureUsages(document: vscode.TextDocument, feature: BaselineFeature): Promise<BaselineFeatureMatch[]> {
        const matches: BaselineFeatureMatch[] = [];
        const text = document.getText();

        // Simple pattern matching for now - this will be enhanced with AST parsing
        if (feature.codeExamples) {
            for (const example of feature.codeExamples) {
                const legacyPattern = example.legacy;
                const regex = new RegExp(this.escapeRegExp(legacyPattern), 'g');
                let match;

                while ((match = regex.exec(text)) !== null) {
                    const position = document.positionAt(match.index);
                    matches.push({
                        feature,
                        confidence: 0.8, // Basic confidence score - will be improved
                        location: {
                            line: position.line,
                            column: position.character
                        }
                    });
                }
            }
        }

        return matches;
    }

    private escapeRegExp(string: string): string {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
}