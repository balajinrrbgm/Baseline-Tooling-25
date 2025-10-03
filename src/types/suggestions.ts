import { BaselineFeature, BaselineFeatureMatch } from './baseline';

export interface ModernizationSuggestion {
    id: string;
    title: string;
    description: string;
    feature: BaselineFeature;
    matchedCode: string;
    suggestedCode: string;
    compatibility: CompatibilityInfo;
    confidence: number;
    type: SuggestionType;
    category: SuggestionCategory;
    impact: SuggestionImpact;
    examples: CodeExample[];
    documentation: DocumentationInfo;
    location: {
        start: number;  // Character offset in the document
        end: number;    // Character offset in the document
        line: number;   // 0-based line number
        column: number; // 0-based column number
    };
}

export interface CompatibilityInfo {
    status: string;
    browsers: BrowserCompatibility[];
    sinceBaseline: string;
    notes?: string[];
}

export interface BrowserCompatibility {
    name: string;
    version: string;
    status: 'supported' | 'partial' | 'unsupported';
}

export interface CodeExample {
    title: string;
    description: string;
    before: string;
    after: string;
    explanation: string;
}

export interface DocumentationInfo {
    summary: string;
    mdnUrl?: string;
    specUrl?: string;
    bestPractices: string[];
    caveats?: string[];
    relatedFeatures: string[];
}

export type SuggestionType = 
    | 'replacement'    // Direct replacement of code
    | 'refactoring'    // Requires broader code changes
    | 'enhancement'    // Adds new capabilities
    | 'optimization';  // Improves performance/efficiency

export type SuggestionCategory =
    | 'syntax'         // Language syntax improvements
    | 'api'           // API modernization
    | 'performance'   // Performance optimizations
    | 'security'      // Security improvements
    | 'accessibility' // A11y improvements
    | 'standards';    // Web standards compliance

export type SuggestionImpact = 
    | 'high'          // Major improvement
    | 'medium'        // Moderate improvement
    | 'low';          // Minor improvement

export interface SuggestionContext {
    feature: BaselineFeature;
    match: BaselineFeatureMatch;
    document: any;     // VS Code TextDocument
    selection: any;    // VS Code Selection
    workspace: any;    // VS Code WorkspaceFolder
}