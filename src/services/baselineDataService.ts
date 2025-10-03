import * as vscode from 'vscode';
import fetch from 'node-fetch';
import { features as webFeatures } from 'web-features';
import { getStatus } from 'compute-baseline';
import { 
    BaselineFeature, 
    BaselineStatus,
    WebPlatformResponse, 
    WebPlatformFeature 
} from '../types/baseline';

export class BaselineDataService {
    private static instance: BaselineDataService;
    private features: Map<string, BaselineFeature> = new Map();
    private lastUpdate: Date | null = null;
    private readonly updateInterval = 24 * 60 * 60 * 1000; // 24 hours
    private readonly apiEndpoint = 'https://api.webstatus.dev/v1/features';

    private constructor() {}

    public static getInstance(): BaselineDataService {
        if (!BaselineDataService.instance) {
            BaselineDataService.instance = new BaselineDataService();
        }
        return BaselineDataService.instance;
    }

    public async initialize(): Promise<void> {
        try {
            // Load data from web-features package
            await this.loadLocalFeatures();
            
            // Update with latest data from Web Platform Dashboard
            await this.updateFromWebPlatform();
        } catch (error) {
            console.error('Failed to initialize Baseline data:', error);
            throw error;
        }
    }

    private async loadLocalFeatures(): Promise<void> {
        try {
            // Convert web-features data to our format
            Object.entries(webFeatures).forEach(([id, feature]) => {
                const baselineFeature = this.convertWebFeature(id, feature);
                this.features.set(id, baselineFeature);
            });
        } catch (error) {
            console.error('Failed to load local features:', error);
            throw error;
        }
    }

    private async updateFromWebPlatform(): Promise<void> {
        try {
            let url = this.apiEndpoint;
            let hasMore = true;

            while (hasMore) {
                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data: WebPlatformResponse = await response.json();
                
                // Update features with Web Platform data
                data.data.forEach(feature => {
                    const existingFeature = this.features.get(feature.feature_id);
                    if (existingFeature) {
                        this.updateFeature(existingFeature, feature);
                    } else {
                        const newFeature = this.convertWebPlatformFeature(feature);
                        this.features.set(feature.feature_id, newFeature);
                    }
                });

                // Check if there are more pages
                if (data.metadata?.next_page_token) {
                    url = `${this.apiEndpoint}?page_token=${data.metadata.next_page_token}`;
                } else {
                    hasMore = false;
                }
            }

            this.lastUpdate = new Date();
            vscode.window.setStatusBarMessage('Baseline data updated', 3000);
        } catch (error) {
            console.error('Failed to update from Web Platform:', error);
            throw error;
        }
    }

    private convertWebFeature(id: string, feature: any): BaselineFeature {
        return {
            id,
            name: feature.name,
            description: feature.description,
            status: {
                baseline: this.convertBaselineStatus(feature.status.baseline),
                baseline_high_date: feature.status.baseline_high_date,
                baseline_low_date: feature.status.baseline_low_date,
                support: feature.status.support
            },
            spec: feature.spec,
            mdn_url: feature.mdn_url,
            compat_features: feature.compat_features,
            group: feature.group,
            browserSupport: {
                chrome: feature.status.support.chrome,
                firefox: feature.status.support.firefox,
                safari: feature.status.support.safari,
                edge: feature.status.support.edge
            },
            codeExamples: []  // To be populated from other sources
        };
    }

    private convertWebPlatformFeature(feature: WebPlatformFeature): BaselineFeature {
        return {
            id: feature.feature_id,
            name: feature.name,
            description: feature.description,
            status: {
                baseline: feature.baseline.status,
                baseline_high_date: feature.baseline.high_date,
                baseline_low_date: feature.baseline.low_date,
                support: {} as any // To be populated with actual browser support data
            },
            spec: feature.spec?.links[0],
            mdn_url: feature.mdn_url,
            compat_features: feature.compat_features,
            group: feature.group,
            browserSupport: {} as any, // To be populated with actual browser support data
            codeExamples: []  // To be populated from other sources
        };
    }

    private convertBaselineStatus(status: any): BaselineStatus['baseline'] {
        if (status === 'high') return 'widely';
        if (status === 'low') return 'newly';
        if (status === false) return 'limited';
        return 'limited';
    }

    private updateFeature(existing: BaselineFeature, webPlatform: WebPlatformFeature): void {
        // Update with latest data from Web Platform Dashboard
        existing.status.baseline = webPlatform.baseline.status;
        existing.status.baseline_high_date = webPlatform.baseline.high_date;
        existing.status.baseline_low_date = webPlatform.baseline.low_date;
        if (webPlatform.spec?.links.length) {
            existing.spec = webPlatform.spec.links[0];
        }
        if (webPlatform.mdn_url) {
            existing.mdn_url = webPlatform.mdn_url;
        }
    }

    public async getFeature(id: string): Promise<BaselineFeature | undefined> {
        await this.checkForUpdates();
        return this.features.get(id);
    }

    public async getFeaturesByGroup(group: string): Promise<BaselineFeature[]> {
        await this.checkForUpdates();
        return Array.from(this.features.values())
            .filter(feature => feature.group === group);
    }

    public async getFeaturesByStatus(status: BaselineStatus['baseline']): Promise<BaselineFeature[]> {
        await this.checkForUpdates();
        return Array.from(this.features.values())
            .filter(feature => feature.status.baseline === status);
    }

    public async getAllFeatures(): Promise<BaselineFeature[]> {
        await this.checkForUpdates();
        return Array.from(this.features.values());
    }

    public async getCompatibilityInfo(featureId: string, bcdKey: string): Promise<BaselineStatus | null> {
        try {
            const status = await getStatus(featureId, bcdKey);
            return {
                baseline: this.convertBaselineStatus(status.baseline),
                baseline_high_date: status.baseline_high_date,
                baseline_low_date: status.baseline_low_date,
                support: status.support
            };
        } catch (error) {
            console.error(`Failed to get compatibility info for ${featureId}.${bcdKey}:`, error);
            return null;
        }
    }

    private async checkForUpdates(): Promise<void> {
        if (!this.lastUpdate || Date.now() - this.lastUpdate.getTime() > this.updateInterval) {
            await this.updateFromWebPlatform();
        }
    }
}
}