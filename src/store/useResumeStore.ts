import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ResumeTemplate, ResumeDraft, ResumeModuleState } from './types';

interface ResumeStore extends ResumeModuleState {
  // Actions
  setTemplates: (templates: ResumeTemplate[]) => void;
  selectTemplate: (templateId: string) => void;
  updateDraft: (draft: Partial<ResumeDraft>) => void;
  setGenerating: (isGenerating: boolean) => void;
  setViewMode: (mode: 'edit' | 'preview') => void;
  loadBuiltInTemplates: () => void;
}

// 内置简历模板（一页纸优化版）
const builtInTemplates: ResumeTemplate[] = [
  {
    id: 'technical-1',
    name: '技术岗简历',
    description: '适用于软件工程师、前端开发等技术岗位（一页纸）',
    category: 'technical',
    content: `# {{姓名}}
{{电话}} | {{邮箱}} | GitHub: {{GitHub}} | {{工作年限}}

## 专业技能
{{专业技能}}

## 工作经历
{{工作经历}}

## 项目经验
{{项目经验}}

## 教育背景
{{教育背景}}`,
    isBuiltIn: true,
    placeholders: ['姓名', '电话', '邮箱', 'GitHub', '工作年限', '专业技能', '工作经历', '项目经验', '教育背景'],
  },
  {
    id: 'general-1',
    name: '通用岗简历',
    description: '适用于产品、运营、市场等通用岗位（一页纸）',
    category: 'general',
    content: `# {{姓名}}
{{电话}} | {{邮箱}} | {{现居地}}

## 工作经历
{{工作经历}}

## 项目经验
{{项目经验}}

## 教育背景
{{教育背景}}

## 技能证书
{{技能证书}}`,
    isBuiltIn: true,
    placeholders: ['姓名', '电话', '邮箱', '现居地', '工作经历', '项目经验', '教育背景', '技能证书'],
  },
  {
    id: 'fresh-graduate-1',
    name: '应届生简历',
    description: '适用于应届毕业生实习和校招（一页纸）',
    category: 'fresh-graduate',
    content: `# {{姓名}}
{{学校}} {{专业}} | {{学历}} | 毕业时间：{{毕业时间}}
{{电话}} | {{邮箱}}

## 实习经历
{{实习经历}}

## 校园经历
{{校园经历}}

## 技能特长
{{技能特长}}

## 获奖情况
{{获奖情况}}`,
    isBuiltIn: true,
    placeholders: ['姓名', '学校', '专业', '学历', '毕业时间', '电话', '邮箱', '实习经历', '校园经历', '技能特长', '获奖情况'],
  },
];

export const useResumeStore = create<ResumeStore>()(
  persist(
    (set, get) => ({
      // Initial state
      templates: [],
      selectedTemplateId: null,
      draft: null,
      isGenerating: false,
      viewMode: 'edit',

      // Actions
      setTemplates: (templates) => set({ templates }),

      selectTemplate: (templateId) => {
        const templates = get().templates;
        const template = templates.find((t) => t.id === templateId);
        if (!template) return;

        // 创建或更新草稿
        const newDraft: ResumeDraft = {
          templateId,
          content: template.content,
          lastUpdated: Date.now(),
          instruction: '',
        };

        set({
          selectedTemplateId: templateId,
          draft: newDraft,
        });
      },

      updateDraft: (draftUpdate) => {
        const currentDraft = get().draft;
        if (!currentDraft) return;

        set({
          draft: {
            ...currentDraft,
            ...draftUpdate,
            lastUpdated: Date.now(),
          },
        });
      },

      setGenerating: (isGenerating) => set({ isGenerating }),

      setViewMode: (mode) => set({ viewMode: mode }),

      loadBuiltInTemplates: () => {
        set({ templates: builtInTemplates });
      },
    }),
    {
      name: 'resume-storage',
      partialize: (state) => ({
        templates: state.templates.filter((t) => !t.isBuiltIn), // 只持久化用户自定义模板
        draft: state.draft,
      }),
      onRehydrateStorage: () => (state) => {
        // 重新水合时加载内置模板
        if (state) {
          state.loadBuiltInTemplates();
        }
      },
    }
  )
);
