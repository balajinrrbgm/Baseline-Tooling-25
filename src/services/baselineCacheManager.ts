import * as vscode from 'vscode';
import { BaselineFeature } from '../types/baseline';

export class BaselineCacheManager {
    private static instance: BaselineCacheManager;
    private context: vscode.ExtensionContext;

    private constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    public static initialize(context: vscode.ExtensionContext): BaselineCacheManager {
        if (!BaselineCacheManager.instance) {
            BaselineCacheManager.instance = new BaselineCacheManager(context);
        }
        return BaselineCacheManager.instance;
    }

    public static getInstance(): BaselineCacheManager {
        if (!BaselineCacheManager.instance) {
            throw new Error('BaselineCacheManager not initialized');
        }
        return BaselineCacheManager.instance;
    }

    public async saveFeatures(features: BaselineFeature[]): Promise<void> {
        await this.context.globalState.update('baseline.features', features);
        await this.context.globalState.update('baseline.lastUpdate', new Date().toISOString());
    }

    public async getFeatures(): Promise<BaselineFeature[]> {
        return this.context.globalState.get<BaselineFeature[]>('baseline.features') || [];
    }

    public async getLastUpdate(): Promise<Date | null> {
        const lastUpdate = this.context.globalState.get<string>('baseline.lastUpdate');
        return lastUpdate ? new Date(lastUpdate) : null;
    }

    public async clearCache(): Promise<void> {
        await this.context.globalState.update('baseline.features', undefined);
        await this.context.globalState.update('baseline.lastUpdate', undefined);
    }
}