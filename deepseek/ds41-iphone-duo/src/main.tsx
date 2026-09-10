import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/global.css';
import './components/common/common.css';
import './components/global-nav.css';
import './components/local-nav.css';

/**
 * 图片兜底：任何一张图加载失败都隐藏它本身，避免出现破图图标或永久加载状态。
 * 容器本身有浅灰背景，所以版面仍然完整。
 */
document.addEventListener(
  'error',
  (event) => {
    const target = event.target as HTMLElement | null;
    if (target && target.tagName === 'IMG') target.classList.add('is-broken');
  },
  true,
);

const container = document.getElementById('root');
if (!container) throw new Error('未找到 #root 挂载点');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
