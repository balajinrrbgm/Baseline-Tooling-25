export interface BaselineFeature {
    id: string;
    name: string;
    description: string;
    status: string;
    browserSupport: Record<string, string>;
    modernAlternative?: string;
    examples: string[];
}

export class BaselineDataProvider {
    private features: Map<string, BaselineFeature> = new Map();

    constructor() {
        this.initializeData();
    }

    private async initializeData() {
        // TODO: Fetch real Baseline data from the API or local cache
        // For now, using placeholder data
        this.features.set('example', {
            id: 'example',
            name: 'Example Feature',
            description: 'This is a placeholder feature',
            status: 'stable',
            browserSupport: {
                chrome: '80',
                firefox: '75',
                safari: '13.1'
            },
            examples: []
        });
    }

    public getFeature(id: string): BaselineFeature | undefined {
        return this.features.get(id);
    }

    public getAllFeatures(): BaselineFeature[] {
        return Array.from(this.features.values());
    }
}