import { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatArea } from './components/ChatArea';
import { ResumeGenerator } from './components/ResumeGenerator';
import { cn } from './lib/utils';

type TabType = 'chat' | 'resume';

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('chat');

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
      />
      <div className="flex-1 flex flex-col">
        {/* 顶部标签页 */}
        <div className="border-b border-gray-200 bg-white">
          <div className="flex items-center gap-1 p-2">
            <button
              onClick={() => setActiveTab('chat')}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                activeTab === 'chat'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              💬 对话
            </button>
            <button
              onClick={() => setActiveTab('resume')}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                activeTab === 'resume'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              📄 简历生成
            </button>
          </div>
        </div>

        {/* 内容区 */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'chat' ? (
            <ChatArea onMenuClick={() => setIsSidebarOpen(true)} />
          ) : (
            <ResumeGenerator />
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
