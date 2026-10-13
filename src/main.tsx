import React, { useSyncExternalStore } from 'react';
import ReactDOM from 'react-dom/client';
import HiringDecisionPage from './pages/hiring/HiringDecisionPage';
import AiChatPage from './pages/chat/AiChatPage';

/** 極簡 hash 路由：預設任用決策空間；#/ai-chat 為 AI 小助手 */
const subscribe = (cb: () => void) => {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
};
const getHash = () => window.location.hash;

const App: React.FC = () => {
  const hash = useSyncExternalStore(subscribe, getHash);
  return hash.startsWith('#/ai-chat') ? <AiChatPage /> : <HiringDecisionPage />;
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
