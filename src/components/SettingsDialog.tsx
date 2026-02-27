import { useState } from 'react';
import { X } from 'lucide-react';
import { useSettingsStore } from '@/store/useSettingsStore';

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsDialog({ isOpen, onClose }: SettingsDialogProps) {
  const { settings, updateSettings } = useSettingsStore();
  const [formData, setFormData] = useState(settings);

  if (!isOpen) return null;

  const handleSave = () => {
    updateSettings(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl w-[500px] max-w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors">
          <X className="w-5 h-5" />
        </button>
        
        <h2 className="text-xl font-bold text-gray-900 mb-6">模型设置</h2>
        
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">API Base URL</label>
            <input 
              type="text" 
              value={formData.baseUrl}
              onChange={(e) => setFormData({...formData, baseUrl: e.target.value})}
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
              placeholder="https://api.openai.com/v1"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">API Key</label>
            <input 
              type="password" 
              value={formData.apiKey}
              onChange={(e) => setFormData({...formData, apiKey: e.target.value})}
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-mono"
              placeholder="sk-..."
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">模型名称 (Model Name)</label>
            <input 
              type="text" 
              value={formData.model}
              onChange={(e) => setFormData({...formData, model: e.target.value})}
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
              placeholder="gpt-4o"
            />
          </div>

           <div className="flex items-center gap-3 pt-2">
            <input 
              type="checkbox" 
              id="reasoning"
              checked={formData.enableReasoning}
              onChange={(e) => setFormData({...formData, enableReasoning: e.target.checked})}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="reasoning" className="text-sm font-medium text-gray-700 select-none cursor-pointer">开启深度思考 (Reasoning)</label>
          </div>
          
           {formData.enableReasoning && (
             <div className="pl-7">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">思考强度 (Reasoning Effort)</label>
                <select
                  value={formData.reasoningEffort || 'medium'}
                  onChange={(e) => setFormData({...formData, reasoningEffort: e.target.value as any})}
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm bg-white"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
             </div>
           )}
        </div>
        
        <div className="mt-8 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            取消
          </button>
          <button 
            onClick={handleSave}
            className="px-4 py-2.5 text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors shadow-sm"
          >
            保存设置
          </button>
        </div>
      </div>
    </div>
  );
}
