import { features as WebFeatures } from 'web-features';
import { getStatus } from 'compute-baseline';

export interface BaselineFeature {
    id: string;
    name: string;
    description: string;
    status: BaselineStatus;
    spec?: string;
    mdn_url?: string;
    compat_features?: string[];
    group?: string;
    browserSupport: BrowserSupport;
    codeExamples: CodeExample[];
}

export interface BaselineStatus {
    baseline: BaselineAvailability;
    baseline_high_date?: string;
    baseline_low_date?: string;
    support: BrowserVersions;
}

export type BaselineAvailability = 'limited' | 'newly' | 'widely' | false;

export interface BrowserSupport {
    chrome: string;
    firefox: string;
    safari: string;
    edge: string;
}

export interface BrowserVersions extends BrowserSupport {
    chrome_android?: string;
    firefox_android?: string;
    safari_ios?: string;
}

export interface CodeExample {
    title: string;
    legacy: string;
    modern: string;
    description: string;
}

export interface BaselineFeatureMatch {
    feature: BaselineFeature;
    confidence: number;
    location: {
        line: number;
        column: number;
    };
}

export interface WebPlatformResponse {
    data: WebPlatformFeature[];
    metadata?: {
        next_page_token?: string;
        total?: number;
    };
}

export interface WebPlatformFeature {
    feature_id: string;
    name: string;
    description: string;
    baseline: {
        status: BaselineAvailability;
        low_date?: string;
        high_date?: string;
    };
    spec?: {
        links: string[];
    };
    compat_features?: string[];
    group?: string;
    mdn_url?: string;
}