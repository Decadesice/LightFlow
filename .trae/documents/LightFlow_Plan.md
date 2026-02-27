# LightFlow 开发计划

## 1. 项目概述
LightFlow 是一款基于 Windows 的超轻量级、高性能本地 LLM 客户端。
- **核心目标**：秒启动、低内存占用、节省 Token、极速响应。
- **技术栈**：
  - **核心框架**：Tauri v2 (Rust) - 保证原生性能和极小体积。
  - **前端**：React + TypeScript + Vite - 现代化的开发体验。
  - **样式**：Tailwind CSS - 快速构建符合设计规范的 UI。
  - **数据存储**：本地 JSON/SQLite (通过 Rust 管理) - 保证数据隐私和快速读写。
  - **安装包**：WiX Toolset (生成 .msi)。

## 2. 阶段一：环境搭建与基础设施 (Setup)
- [ ] **初始化 Tauri 项目**
  - 配置 Rust 环境与 Frontend 环境 (Vite + React + TS)。
  - 配置 Tailwind CSS。
  - 建立基础的项目结构 (src-tauri, src)。
- [ ] **配置开发规范**
  - 引入 `eslint`, `prettier` 保证代码质量。
  - 配置路径别名 (@/components, @/lib 等)。

## 3. 阶段二：前端 UI 开发 (Frontend Implementation)
*严格遵循 `frontend-requirement.md` 的设计规范*

- [ ] **整体布局框架**
  - 实现左右分栏布局 (Sidebar + Main Content)。
  - 实现响应式适配 (移动端抽屉模式)。
- [ ] **侧边栏 (Session List)**
  - 会话列表 UI (标题 + 时间)。
  - 新建/删除/重命名/收藏会话功能的 UI 实现。
- [ ] **核心对话区 (Chat Area)**
  - 消息气泡组件 (用户/AI 区分样式)。
  - Markdown 渲染器 (支持代码高亮、公式)。
  - 流式输出打字机效果与光标动效。
  - 消息操作栏 (复制、重试、删除)。
- [ ] **输入交互区 (Input Area)**
  - 自适应高度输入框。
  - 底部功能栏 (上传、设置、发送按钮)。
  - 快捷键支持 (Ctrl+Enter 发送)。

## 4. 阶段三：核心业务逻辑 (Core Logic)
- [ ] **状态管理 (State Management)**
  - 使用 Zustand 管理全局状态 (当前会话、模型配置、UI 状态)。
  - 实现数据持久化 (将设置和历史记录保存到本地)。
- [ ] **模型配置模块**
  - 设置界面开发：支持添加自定义模型。
  - 字段：模型名称 (Name)、API Key、Base URL、是否多模态 (Multimodal)、是否开启深度思考 (Reasoning)。
- [ ] **文件处理模块 (File Handling)**
  - 前端拖拽上传交互。
  - **Rust 后端**：实现文件读取与文本提取。
    - `.txt`, `.md`: 直接读取。
    - `.pdf`: 使用 `pdf-extract` 或类似 Rust crate 提取文本。
    - `.docx`: 解析 XML 提取文本。
- [ ] **LLM 通信模块 (Rust Backend)**
  - 实现 OpenAI 兼容的 API 客户端 (Reqwest)。
  - 实现流式响应 (Server-Sent Events) 的前端转发。
  - 处理 "深度思考" 参数 (如 `reasoning_effort` 或特定 prompt)。
  - 处理多模态图片数据 (Base64 转换)。

## 5. 阶段四：性能优化与细节 (Optimization)
- [ ] **启动速度优化**
  - 确保主进程与渲染进程的极速加载。
- [ ] **内存优化**
  - 优化长列表渲染 (Virtual Scroll)。
- [ ] **交互细节完善**
  - 增加 Loading 骨架屏和过渡动画。
  - 实现 Toast 错误提示系统。

## 6. 阶段五：构建与发布 (Build & Ship)
- [ ] **图标与元数据**
  - 配置应用图标 (ICO/PNG)。
- [ ] **安装包构建**
  - 配置 `tauri.conf.json` 中的 bundle 设置。
  - 生成 Windows MSI 安装包。
  - 最终真机测试。
