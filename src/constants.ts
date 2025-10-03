export const BASELINE_CONFIG = {
    // API endpoints
    API_BASE_URL: 'https://baseline.dev/api',
    FEATURES_ENDPOINT: '/features',
    
    // Cache settings
    CACHE_UPDATE_INTERVAL: 24 * 60 * 60 * 1000, // 24 hours
    
    // Analysis settings
    CONFIDENCE_THRESHOLDS: {
        HIGH: 0.8,
        MEDIUM: 0.6,
        LOW: 0.4
    },
    
    // Feature statuses
    FEATURE_STATUS: {
        STABLE: 'stable',
        EXPERIMENTAL: 'experimental',
        DEPRECATED: 'deprecated'
    }
};