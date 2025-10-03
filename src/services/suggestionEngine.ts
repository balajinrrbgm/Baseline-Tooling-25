import * as vscode from 'vscode';
import { 
    ModernizationSuggestion,
    SuggestionContext,
    CompatibilityInfo,
    DocumentationInfo,
    CodeExample,
    SuggestionType,
    SuggestionCategory,
    SuggestionImpact,
    BaselineFeatureMatch,
    CodeLocation
} from '../types/shared';
import { BaselineDataService } from '../services/baselineDataService';
import { BaselineFeature } from '../types/baseline';

export class SuggestionEngine {
    private suggestionMap: Map<string, ModernizationSuggestion> = new Map();

    constructor(private baselineData: BaselineDataService) {}

    public async getSuggestionById(id: string): Promise<ModernizationSuggestion | undefined> {
        return this.suggestionMap.get(id);
    }

    public async generateSuggestions(
        matches: BaselineFeatureMatch[],
        document: vscode.TextDocument
    ): Promise<ModernizationSuggestion[]> {
        const suggestions: ModernizationSuggestion[] = [];

        for (const match of matches) {
            // Calculate start and end positions for the match
            // Calculate start and end positions
            // Convert location info to proper VSCode Position objects
            const startPos = new vscode.Position(
                match.location.start?.line || match.location.line || 0,
                match.location.start?.character || match.location.column || 0
            );
            
            const endPos = new vscode.Position(
                match.location.end?.line || match.location.line || 0,
                (match.location.end?.character || match.location.column || 0) + 1
            );

            const context: SuggestionContext = {
                feature: match.feature,
                match: {
                    ...match,
                    location: {
                        // Store both offset and line/column formats
                        startOffset: match.location.startOffset || document.offsetAt(startPos),
                        endOffset: match.location.endOffset || document.offsetAt(endPos),
                        line: match.location.line || startPos.line,
                        column: match.location.column || startPos.character,
                        
                        // Store VSCode position format
                        start: startPos,
                        end: endPos
                    }
                },
                document,
                selection: new vscode.Selection(startPos, endPos),
                workspace: vscode.workspace.getWorkspaceFolder(document.uri)
            };

            const suggestion = await this.createSuggestion(context);
            if (suggestion) {
                // Store suggestion in memory for quick-fix lookup
                this.suggestionMap.set(suggestion.id, suggestion);
                suggestions.push(suggestion);
            }
        }

        // Sort suggestions by impact and confidence
        return this.rankSuggestions(suggestions);
    }

    private async createSuggestion(context: SuggestionContext): Promise<ModernizationSuggestion | null> {
        const { feature, match } = context;

        // Find the most relevant code example
        const bestExample = await this.findBestExample(feature, context);
        if (!bestExample) return null;

        // Get detailed compatibility information
        const compatibility = await this.getCompatibilityInfo(feature);

        // Generate documentation
        const documentation = await this.generateDocumentation(feature);

        return {
            id: `${feature.id}-${Date.now()}`,
            title: this.generateTitle(feature, bestExample),
            description: this.generateDescription(feature, bestExample),
            feature,
            matchedCode: bestExample.before,
            suggestedCode: bestExample.after,
            compatibility,
            confidence: match.confidence,
            type: this.determineSuggestionType(feature, bestExample),
            category: this.determineSuggestionCategory(feature),
            impact: this.calculateImpact(feature, compatibility),
            examples: [bestExample],
            documentation,
            location: {
                start: match.location.start,
                end: match.location.end,
                line: match.location.line,
                column: match.location.column
            }
        };
    }

    private async findBestExample(
        feature: BaselineFeature,
        context: SuggestionContext
    ): Promise<CodeExample | null> {
        // Calculate start and end positions
        // Convert location info to proper VSCode Position objects
        const startPos = new vscode.Position(
            context.match.location.start?.line || context.match.location.line || 0,
            context.match.location.start?.character || context.match.location.column || 0
        );
        
        const endPos = new vscode.Position(
            context.match.location.end?.line || context.match.location.line || 0,
            (context.match.location.end?.character || context.match.location.column || 0) + 1
        );
        
        const matchedCode = context.document.getText(new vscode.Range(startPos, endPos));

        // Start with the feature's code examples
        let bestExample: CodeExample | null = null;
        let bestScore = 0;

        for (const example of feature.codeExamples) {
            const score = this.calculateExampleMatch(matchedCode, example.legacy);
            if (score > bestScore) {
                bestScore = score;
                bestExample = {
                    title: example.title || 'Code Example',
                    description: example.description || 'Modern code replacement example',
                    before: example.legacy || '',
                    after: example.modern || '',
                    explanation: this.generateExampleExplanation({
                        title: example.title || '',
                        description: example.description || '',
                        before: example.legacy || '',
                        after: example.modern || '',
                        explanation: ''
                    })
                };
            }
        }

        return bestExample;
    }

    private calculateExampleMatch(code: string, example: string): number {
        // Remove whitespace and comments for comparison
        const normalizedCode = this.normalizeCode(code);
        const normalizedExample = this.normalizeCode(example);

        // Calculate similarity score
        let score = 0;
        if (normalizedCode.includes(normalizedExample)) {
            score = 1;
        } else {
            // Calculate Levenshtein distance for partial matches
            const distance = this.levenshteinDistance(normalizedCode, normalizedExample);
            const maxLength = Math.max(normalizedCode.length, normalizedExample.length);
            score = 1 - (distance / maxLength);
        }

        return score;
    }

    private normalizeCode(code: string): string {
        return code
            .replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '') // Remove comments
            .replace(/\s+/g, '')                      // Remove whitespace
            .toLowerCase();                           // Case-insensitive
    }

    private levenshteinDistance(a: string, b: string): number {
        const matrix = Array(b.length + 1).fill(null).map(() => 
            Array(a.length + 1).fill(null)
        );

        for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
        for (let j = 0; j <= b.length; j++) matrix[j][0] = j;

        for (let j = 1; j <= b.length; j++) {
            for (let i = 1; i <= a.length; i++) {
                const substitutionCost = a[i - 1] === b[j - 1] ? 0 : 1;
                matrix[j][i] = Math.min(
                    matrix[j][i - 1] + 1,
                    matrix[j - 1][i] + 1,
                    matrix[j - 1][i - 1] + substitutionCost
                );
            }
        }

        return matrix[b.length][a.length];
    }

    private async getCompatibilityInfo(feature: BaselineFeature): Promise<CompatibilityInfo> {
        const browsers = Object.entries(feature.browserSupport).map(([name, version]) => ({
            name,
            version,
            status: 'supported' as const
        }));

        return {
            status: String(feature.status.baseline),
            browsers,
            sinceBaseline: feature.status.baseline_low_date || 'N/A',
            notes: []
        };
    }

    private async generateDocumentation(feature: BaselineFeature): Promise<DocumentationInfo> {
        return {
            summary: feature.description,
            mdnUrl: feature.mdn_url,
            specUrl: feature.spec,
            bestPractices: [
                'Use feature detection instead of browser detection',
                'Consider providing fallbacks for older browsers',
                'Test across different browser versions'
            ],
            relatedFeatures: []
        };
    }

    private generateTitle(feature: BaselineFeature, example: CodeExample): string {
        return `Modernize: Replace ${feature.name} with modern alternative`;
    }

    private generateDescription(feature: BaselineFeature, example: CodeExample): string {
        return `${feature.description}\n\nModern alternative: ${example.description}`;
    }

    private generateExampleExplanation(example: CodeExample): string {
        return `This example shows how to replace the legacy pattern "${example.before}" with the modern equivalent "${example.after}".`;
    }

    private determineSuggestionType(feature: BaselineFeature, example: CodeExample): SuggestionType {
        // Determine if it's a simple replacement or requires refactoring
        const isSimpleReplacement = example.before.split('\n').length === 1 &&
                                  example.after.split('\n').length === 1;
        return isSimpleReplacement ? 'replacement' : 'refactoring';
    }

    private determineSuggestionCategory(feature: BaselineFeature): SuggestionCategory {
        if (feature.group?.includes('performance')) return 'performance';
        if (feature.group?.includes('security')) return 'security';
        if (feature.group?.includes('a11y')) return 'accessibility';
        return 'api';
    }

    private calculateImpact(feature: BaselineFeature, compatibility: CompatibilityInfo): SuggestionImpact {
        // Calculate impact based on various factors
        let score = 0;

        // Factor 1: Baseline status
        if (compatibility.status === 'widely') score += 3;
        else if (compatibility.status === 'newly') score += 2;
        else score += 1;

        // Factor 2: Browser support breadth
        const supportedBrowsers = compatibility.browsers.filter(b => b.status === 'supported').length;
        score += supportedBrowsers;

        // Factor 3: Feature category importance
        if (feature.group?.includes('security')) score += 3;
        if (feature.group?.includes('performance')) score += 2;

        // Determine impact level
        if (score >= 7) return 'high';
        if (score >= 4) return 'medium';
        return 'low';
    }

    private rankSuggestions(suggestions: ModernizationSuggestion[]): ModernizationSuggestion[] {
        return suggestions.sort((a, b) => {
            // Primary sort by impact
            const impactOrder = { high: 3, medium: 2, low: 1 };
            const impactDiff = impactOrder[b.impact] - impactOrder[a.impact];
            if (impactDiff !== 0) return impactDiff;

            // Secondary sort by confidence
            return b.confidence - a.confidence;
        });
    }
}