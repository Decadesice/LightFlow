import { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatArea } from './components/ChatArea';

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
      />
      <ChatArea 
        onMenuClick={() => setIsSidebarOpen(true)} 
      />
    </div>
  );
}

export default App;
