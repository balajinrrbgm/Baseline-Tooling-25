import { ModernizationSuggestion, CodeExample, CompatibilityInfo } from '../types/suggestions';
import { BaselineFeature } from '../types/baseline';
import { BaselineDataService } from './baselineDataService';

interface StatusBadges {
    widely: string;
    newly: string;
    partial: string;
    limited: string;
    [key: string]: string;
}

interface StatusEmojis {
    supported: string;
    partial: string;
    unsupported: string;
    [key: string]: string;
}

export class DocumentationGenerator {
    constructor(private baselineData: BaselineDataService) {}

    /**
     * Generates comprehensive documentation for a modernization suggestion
     */
    public async generateMarkdownDocumentation(suggestion: ModernizationSuggestion): Promise<string> {
        const { feature, examples, compatibility } = suggestion;
        
        return this.generateMarkdown({
            title: feature.name,
            description: feature.description,
            examples: examples,
            compatibility: compatibility,
            bestPractices: this.generateBestPractices(feature),
            codePatterns: await this.generateCodePatterns(feature),
            resources: await this.collectResources(feature),
            feature: feature
        });
    }

    private async generateMarkdown(params: {
        title: string;
        description: string;
        examples: CodeExample[];
        compatibility: CompatibilityInfo;
        bestPractices: string[];
        codePatterns: { legacy: string; modern: string }[];
        resources: { title: string; url: string }[];
        feature: BaselineFeature;
    }): Promise<string> {
        const {
            title,
            description,
            examples,
            compatibility,
            bestPractices,
            codePatterns,
            resources,
            feature
        } = params;

        return `# ${title}

## Overview

${description}

${this.generateStatusBadge(String(feature.status.baseline))}

## Browser Compatibility

${this.generateCompatibilityTable(compatibility)}

## Usage Examples

${examples.map(example => this.generateExample(example)).join('\n\n')}

## Migration Guide

### Common Code Patterns

${codePatterns.map(pattern => this.generateCodePattern(pattern)).join('\n\n')}

### Best Practices

${bestPractices.map(practice => `- ${practice}`).join('\n')}

## Performance Impact

${this.generatePerformanceSection(feature)}

## Security Considerations

${this.generateSecuritySection(feature)}

## Accessibility Impact

${this.generateA11ySection(feature)}

## Additional Resources

${resources.map(resource => `- [${resource.title}](${resource.url})`).join('\n')}

## Related Features

${await this.generateRelatedFeatures(feature)}
`;
    }

    private generateStatusBadge(status: string): string {
        const badges = {
            'widely': '![Status: Widely Supported](https://img.shields.io/badge/status-widely_supported-success)',
            'newly': '![Status: Newly Supported](https://img.shields.io/badge/status-newly_supported-yellow)',
            'partial': '![Status: Partially Supported](https://img.shields.io/badge/status-partial_support-orange)'
        };
        return badges[status] || badges['partial'];
    }

    private generateCompatibilityTable(compatibility: any): string {
        const rows = compatibility.browsers.map(browser => 
            `| ${browser.name} | ${browser.version}+ | ${this.getStatusEmoji(browser.status)} |`
        );

        return `| Browser | Version | Status |
|----------|---------|--------|
${rows.join('\n')}`;
    }

    private getStatusEmoji(status: string): string {
        const emojis = {
            'supported': '✅',
            'partial': '⚠️',
            'unsupported': '❌'
        };
        return emojis[status] || '❓';
    }

    private generateExample(example: CodeExample): string {
        return `### ${example.title}

${example.description}

#### Legacy Code:
\`\`\`javascript
${example.before}
\`\`\`

#### Modern Code:
\`\`\`javascript
${example.after}
\`\`\`

${example.explanation}`;
    }

    private generateCodePattern(pattern: { legacy: string; modern: string }): string {
        return `#### Pattern
\`\`\`javascript
// Legacy approach
${pattern.legacy}

// Modern approach
${pattern.modern}
\`\`\``;
    }

    private generateBestPractices(feature: BaselineFeature): string[] {
        const practices = [
            'Use feature detection instead of browser detection',
            'Implement graceful fallbacks for older browsers',
            'Test across different browser versions and devices'
        ];

        // Add feature-specific best practices
        if (feature.group?.includes('performance')) {
            practices.push(
                'Monitor performance metrics before and after implementation',
                'Consider lazy loading for resource-intensive features'
            );
        }

        if (feature.group?.includes('security')) {
            practices.push(
                'Always validate and sanitize user input',
                'Follow the principle of least privilege'
            );
        }

        return practices;
    }

    private generatePerformanceSection(feature: BaselineFeature): string {
        if (!feature.group?.includes('performance')) {
            return 'No significant performance impact noted.';
        }

        return `### Performance Benefits
- Improved execution time through native implementation
- Reduced memory usage
- Better browser optimization opportunities

### Metrics to Monitor
- Time to First Byte (TTFB)
- First Contentful Paint (FCP)
- Time to Interactive (TTI)
- Memory usage`;
    }

    private generateSecuritySection(feature: BaselineFeature): string {
        if (!feature.group?.includes('security')) {
            return 'No significant security impact noted. Follow general web security best practices.';
        }

        return `### Security Benefits
- Enhanced protection against common vulnerabilities
- Improved data handling security
- Modern security features support

### Security Considerations
- Always validate user input
- Use Content Security Policy (CSP) headers
- Keep dependencies updated`;
    }

    private generateA11ySection(feature: BaselineFeature): string {
        if (!feature.group?.includes('a11y')) {
            return 'Follow WCAG guidelines and test with screen readers when implementing this feature.';
        }

        return `### Accessibility Benefits
- Improved screen reader support
- Better keyboard navigation
- Enhanced semantic structure

### Accessibility Testing
- Test with popular screen readers
- Verify keyboard navigation
- Check color contrast ratios`;
    }

    private async collectResources(feature: BaselineFeature): Promise<{ title: string; url: string }[]> {
        const resources = [];

        if (feature.mdn_url) {
            resources.push({
                title: 'MDN Documentation',
                url: feature.mdn_url
            });
        }

        if (feature.spec) {
            resources.push({
                title: 'W3C Specification',
                url: feature.spec
            });
        }

        // Add baseline resources
        resources.push({
            title: 'Baseline Documentation',
            url: `https://web.dev/baseline/${feature.id}`
        });

        // Add additional resources based on feature category
        if (feature.group?.includes('performance')) {
            resources.push({
                title: 'Web Vitals',
                url: 'https://web.dev/vitals'
            });
        }

        return resources;
    }

    private async generateCodePatterns(feature: BaselineFeature): Promise<{ legacy: string; modern: string }[]> {
        const patterns: { legacy: string; modern: string }[] = [];

        // Add common patterns based on feature group
        if (feature.group?.includes('performance')) {
            patterns.push({
                legacy: `// Using setTimeout for debouncing
function debounce(fn, delay) {
    let timeoutId;
    return function (...args) {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn.apply(this, args), delay);
    };
}`,
                modern: `// Using requestAnimationFrame for performance
function debounceRAF(fn) {
    let frameId;
    return function (...args) {
        if (frameId) cancelAnimationFrame(frameId);
        frameId = requestAnimationFrame(() => fn.apply(this, args));
    };
}`
            });
        }

        // Add feature-specific patterns from baseline data
        if (feature.codeExamples && feature.codeExamples.length > 0) {
            patterns.push(...feature.codeExamples.map(example => ({
                legacy: example.legacy,
                modern: example.modern
            })));
        }

        return patterns;
    }

    private async generateRelatedFeatures(feature: BaselineFeature): Promise<string> {
        // Find features in the same group
        const allFeatures = await this.baselineData.getAllFeatures();
        const relatedFeatures = allFeatures
            .filter(f => 
                f.id !== feature.id && 
                f.group === feature.group)
            .slice(0, 5); // Get top 5 related features

        if (relatedFeatures.length === 0) {
            return 'No directly related features found.';
        }

        return relatedFeatures
            .map(f => `- [${f.name}](${f.mdn_url || `https://web.dev/baseline/${f.id}`})`)
            .join('\n');
    }
}