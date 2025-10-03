import * as vscode from 'vscode';
import { BaselineDataService } from './services/baselineDataService';
import { AnalysisResult } from './codeAnalyzer';
import { BaselineFeature, CodeExample } from './types/baseline';

export interface ModernizationSuggestion {
    title: string;
    description: string;
    feature: BaselineFeature;
    codeExample: CodeExample;
    location: {
        line: number;
        column: number;
    };
    confidence: number;
}

export class ModernizationSuggester {
    constructor(private baselineData: BaselineDataService) {}

    public async getSuggestions(analysis: AnalysisResult): Promise<ModernizationSuggestion[]> {
        const suggestions: ModernizationSuggestion[] = [];

        for (const match of analysis.legacyFeatures) {
            const { feature, location, confidence } = match;

            // Get the code example that best matches the context
            // For now, we'll just use the first example
            const codeExample = feature.codeExamples[0];

            if (codeExample) {
                suggestions.push({
                    title: `Replace with ${feature.name}`,
                    description: feature.description,
                    feature,
                    codeExample,
                    location,
                    confidence
                });
            }
        }

        // Sort suggestions by confidence
        return suggestions.sort((a, b) => b.confidence - a.confidence);
    }
}