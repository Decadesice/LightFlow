import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Settings, ModelConfig } from './types';
import { encryptApiKey, decryptApiKey, isApiKeyEncrypted } from '@/lib/crypto';
import { v4 as uuidv4 } from 'uuid';

interface SettingsStore {
  settings: Settings;
  updateSettings: (settings: Partial<Settings>) => void;
  getDecryptedApiKey: () => Promise<string>;
  addModel: (model: Omit<ModelConfig, 'id'>) => void;
  updateModel: (id: string, model: Partial<ModelConfig>) => void;
  deleteModel: (id: string) => void;
  setCurrentModel: (id: string) => void;
  getCurrentModel: () => ModelConfig | null;
}

const defaultSettings: Settings = {
  apiKey: '', // 为了向后兼容，保留但不再使用
  baseUrl: 'https://ark.cn-beijing.volces.com/api/coding/v3',
  model: 'ark-code-latest',
  isMultimodal: false,
  models: [
    {
      id: 'default',
      name: 'ark-code-latest',
      platform: '火山引擎',
      baseUrl: 'https://ark.cn-beijing.volces.com/api/coding/v3',
      apiKey: '', // 每个模型有自己的 API Key
      isMultimodal: false,
      isDefault: true,
    },
  ],
  currentModelId: 'default',
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      settings: defaultSettings,
      updateSettings: async (newSettings) => {
        // 如果更新了 apiKey，自动加密
        if (newSettings.apiKey !== undefined && newSettings.apiKey) {
          const encrypted = await encryptApiKey(newSettings.apiKey);
          newSettings.apiKey = encrypted;
        }
        
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        }));
      },
      
      // 获取解密后的 API Key
      getDecryptedApiKey: async () => {
        const apiKey = get().settings.apiKey;
        if (!apiKey) return '';
        
        if (isApiKeyEncrypted(apiKey)) {
          return await decryptApiKey(apiKey);
        }
        
        // 如果是明文（旧数据），返回原值
        return apiKey;
      },
      
      // 添加模型
      addModel: async (modelConfig) => {
        // 加密 API Key
        const encryptedApiKey = await encryptApiKey(modelConfig.apiKey);
        
        const newModel: ModelConfig = {
          ...modelConfig,
          apiKey: encryptedApiKey,
          id: uuidv4(),
        };
        
        set((state) => {
          const models = state.settings.models || [];
          return {
            settings: {
              ...state.settings,
              models: [...models, newModel],
              currentModelId: newModel.id,
            },
          };
        });
      },
      
      // 更新模型
      updateModel: async (id, modelConfig) => {
        set((state) => {
          const models = state.settings.models || [];
          const modelIndex = models.findIndex((m) => m.id === id);
          if (modelIndex === -1) return state;
          
          const existingModel = models[modelIndex];
          const updatedModel = { ...existingModel, ...modelConfig };
          
          // 如果 API Key 有变化且不为空，则加密
          if (modelConfig.apiKey && modelConfig.apiKey !== existingModel.apiKey) {
            encryptApiKey(modelConfig.apiKey).then(encrypted => {
              updatedModel.apiKey = encrypted;
            });
          }
          
          const updatedModels = [...models];
          updatedModels[modelIndex] = updatedModel;
          
          return {
            settings: {
              ...state.settings,
              models: updatedModels,
            },
          };
        });
      },
      
      // 删除模型
      deleteModel: (id) => {
        set((state) => {
          const models = state.settings.models || [];
          const filteredModels = models.filter((m) => m.id !== id);
          
          // 如果删除的是当前模型，切换到第一个可用模型
          let newCurrentId = state.settings.currentModelId;
          if (newCurrentId === id && filteredModels.length > 0) {
            newCurrentId = filteredModels[0].id;
          }
          
          return {
            settings: {
              ...state.settings,
              models: filteredModels,
              currentModelId: newCurrentId,
            },
          };
        });
      },
      
      // 设置当前模型
      setCurrentModel: (id) => {
        set((state) => {
          const models = state.settings.models || [];
          const model = models.find((m) => m.id === id);
          if (!model) return state;
          
          return {
            settings: {
              ...state.settings,
              currentModelId: id,
              model: model.name,
              baseUrl: model.baseUrl,
              isMultimodal: model.isMultimodal,
              apiKey: model.apiKey, // 使用当前模型的 API Key
            },
          };
        });
      },
      
      // 获取当前模型
      getCurrentModel: () => {
        const state = get();
        const models = state.settings.models || [];
        const currentId = state.settings.currentModelId || 'default';
        return models.find((m) => m.id === currentId) || null;
      },
    }),
    {
      name: 'lightflow-settings',
      // 迁移函数，处理旧版本数据
      migrate: async (persistedState: any) => {
        // 如果存在明文 API Key，自动加密
        if (persistedState?.settings?.apiKey && !isApiKeyEncrypted(persistedState.settings.apiKey)) {
          console.log('检测到明文 API Key，正在加密...');
          persistedState.settings.apiKey = await encryptApiKey(persistedState.settings.apiKey);
        }
        
        // 迁移旧的多模型配置
        if (!persistedState.settings.models) {
          persistedState.settings.models = [
            {
              id: 'default',
              name: persistedState.settings.model || 'ark-code-latest',
              platform: '火山引擎', // 默认平台
              baseUrl: persistedState.settings.baseUrl || 'https://ark.cn-beijing.volces.com/api/coding/v3',
              apiKey: persistedState.settings.apiKey || '', // 使用全局 API Key
              isMultimodal: persistedState.settings.isMultimodal || false,
              isDefault: true,
            },
          ];
          persistedState.settings.currentModelId = 'default';
        }
        
        // 为旧模型添加 platform 字段
        if (persistedState.settings.models) {
          persistedState.settings.models = persistedState.settings.models.map((m: ModelConfig) => ({
            ...m,
            platform: m.platform || '火山引擎', // 默认为火山引擎
          }));
        }
        
        return persistedState as any;
      },
    }
  )
);
