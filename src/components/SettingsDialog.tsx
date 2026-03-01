import { useState } from 'react';
import { X, CheckCircle2, Eye, EyeOff, Plus, Trash2, Edit, Save } from 'lucide-react';
import { useSettingsStore } from '@/store/useSettingsStore';
import { cn } from '@/lib/utils';
import type { ModelConfig } from '@/store/types';

interface SettingsDialogProps {
  onClose: () => void;
}

export function SettingsDialog({ onClose }: SettingsDialogProps) {
  const { settings, addModel, updateModel, deleteModel, setCurrentModel } = useSettingsStore();
  const models = settings.models || [];
  const currentModelId = settings.currentModelId || 'default';
  
  const [isAddingModel, setIsAddingModel] = useState(false);
  const [editingModelId, setEditingModelId] = useState<string | null>(null);
  const [newModel, setNewModel] = useState({ 
    name: '', 
    platform: '', 
    baseUrl: '', 
    apiKey: '',
    isMultimodal: false,
    supportsImageInput: false,
  });
  const [showApiKey, setShowApiKey] = useState(false);

  const handleAddOrUpdateModel = () => {
    if (!newModel.name || !newModel.platform || !newModel.baseUrl || !newModel.apiKey) {
      alert('请填写所有必填字段');
      return;
    }
    
    if (!newModel.baseUrl.startsWith('http://') && !newModel.baseUrl.startsWith('https://')) {
      alert('Base URL 必须以 http:// 或 https:// 开头');
      return;
    }
    
    // 构建模型配置，包含模态配置
    const modelConfig: Partial<ModelConfig> = {
      name: newModel.name,
      platform: newModel.platform,
      baseUrl: newModel.baseUrl,
      apiKey: newModel.apiKey,
      isMultimodal: newModel.isMultimodal,
      ...(newModel.isMultimodal && newModel.supportsImageInput && {
        modalities: {
          input: ['text' as const, 'image' as const],
          output: ['text' as const]
        }
      })
    };
    
    if (editingModelId) {
      updateModel(editingModelId, modelConfig);
    } else {
      addModel(modelConfig as Omit<ModelConfig, 'id'>);
    }
    
    setIsAddingModel(false);
    setEditingModelId(null);
    setNewModel({ 
      name: '', 
      platform: '', 
      baseUrl: '', 
      apiKey: '', 
      isMultimodal: false,
      supportsImageInput: false,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl w-[700px] max-w-full max-h-[90vh] flex flex-col shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">模型管理</h2>
            <p className="text-sm text-gray-500 mt-1">配置不同平台的 AI 模型，支持多平台混合使用</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Model List Header */}
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">已配置模型</span>
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{models.length}</span>
            </div>
            <button
              onClick={() => {
                setIsAddingModel(true);
                setNewModel({ name: '', platform: '', baseUrl: '', apiKey: '', isMultimodal: false, supportsImageInput: false });
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              添加模型
            </button>
          </div>
          
          {/* Model List */}
          <div className="space-y-3 max-h-[50vh] overflow-y-auto">
            {models.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <div className="flex justify-center mb-3">
                  <svg className="w-12 h-12 opacity-20" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                  </svg>
                </div>
                <p>暂无模型配置</p>
                <p className="text-sm mt-1">点击上方"添加模型"开始配置</p>
              </div>
            ) : (
              models.map((model) => (
                <div
                  key={model.id}
                  className={cn(
                    "p-4 border rounded-lg transition-all hover:shadow-sm",
                    currentModelId === model.id
                      ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200"
                      : "border-gray-200 hover:border-gray-300"
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-gray-900 truncate">{model.name}</h3>
                        {currentModelId === model.id && (
                          <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            使用中
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                        <span className="flex items-center gap-1">
                          <span className="font-medium">平台:</span> {model.platform}
                        </span>
                        <span className="hidden md:inline">•</span>
                        <span className="hidden md:flex items-center gap-1 truncate max-w-[200px]">
                          <span className="font-medium">API:</span> 
                          <span className="font-mono">{model.apiKey ? `${model.apiKey.slice(0, 8)}...` : '未配置'}</span>
                        </span>
                        {model.isMultimodal && (
                          <>
                            <span className="hidden md:inline">•</span>
                            <span className="text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">支持多模态</span>
                          </>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-1 truncate font-mono">{model.baseUrl}</p>
                    </div>
                    
                    <div className="flex items-center gap-1 ml-4">
                      <button
                        onClick={() => setCurrentModel(model.id)}
                        disabled={currentModelId === model.id}
                        className={cn(
                          "p-2 rounded-lg transition-colors",
                          currentModelId === model.id
                            ? "text-blue-600 bg-blue-100 cursor-default"
                            : "text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                        )}
                        title={currentModelId === model.id ? "当前使用" : "设为当前"}
                      >
                        {currentModelId === model.id ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setEditingModelId(model.id);
                          setNewModel({ 
                            name: model.name, 
                            platform: model.platform, 
                            baseUrl: model.baseUrl, 
                            apiKey: model.apiKey,
                            isMultimodal: model.isMultimodal,
                            supportsImageInput: !!(model.modalities?.input?.includes('image')),
                          });
                        }}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="编辑"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      {!model.isDefault && (
                        <button
                          onClick={() => deleteModel(model.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="删除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        
        {/* Add/Edit Model Modal */}
        {(isAddingModel || editingModelId) && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 p-4 rounded-xl">
            <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
              <button
                onClick={() => {
                  setIsAddingModel(false);
                  setEditingModelId(null);
                }}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                {editingModelId ? '编辑模型' : '添加模型'}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    模型名称 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newModel.name}
                    onChange={(e) => setNewModel({ ...newModel, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                    placeholder="例如：ark-code-latest, kimi-k2.5"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    平台/厂商 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newModel.platform}
                    onChange={(e) => setNewModel({ ...newModel, platform: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                    placeholder="例如：火山引擎、OpenAI、Anthropic"
                  />
                  <p className="text-xs text-gray-500 mt-1">标注模型所属平台，方便区分管理</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Base URL <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newModel.baseUrl}
                    onChange={(e) => setNewModel({ ...newModel, baseUrl: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-mono"
                    placeholder="https://ark.cn-beijing.volces.com/api/coding/v3"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    API Key <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showApiKey ? "text" : "password"}
                      value={newModel.apiKey}
                      onChange={(e) => setNewModel({ ...newModel, apiKey: e.target.value })}
                      className="w-full px-3.5 py-2.5 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-mono"
                      placeholder="请输入该模型的 API Key"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      title={showApiKey ? "隐藏" : "显示"}
                    >
                      {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    <span className="text-green-600">✓</span> API Key 将使用 AES-256 加密存储
                  </p>
                </div>
                
                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={newModel.isMultimodal}
                      onChange={(e) => setNewModel({ ...newModel, isMultimodal: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">支持多模态（图片、文件等）</span>
                  </label>
                </div>
                
                {newModel.isMultimodal && (
                  <div className="ml-6">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={newModel.supportsImageInput}
                        onChange={(e) => setNewModel({ ...newModel, supportsImageInput: e.target.checked })}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">支持图片理解能力</span>
                    </label>
                    <p className="text-xs text-gray-500 mt-1 ml-6">
                      启用后可在 API 请求中添加图片输入能力
                    </p>
                  </div>
                )}
              </div>
              
              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setIsAddingModel(false);
                    setEditingModelId(null);
                  }}
                  className="px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleAddOrUpdateModel}
                  className="px-4 py-2.5 text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {editingModelId ? '保存修改' : '添加模型'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
