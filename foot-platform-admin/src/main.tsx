import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#1a5632',
          colorSuccess: '#2d8a4e',
          colorWarning: '#ffd700',
          colorBgContainer: '#1e293b',
          colorBgElevated: '#1e293b',
          colorText: '#e2e8f0',
          colorTextSecondary: '#94a3b8',
          colorBorder: '#334155',
          borderRadius: 8,
        },
      }}
    >
      <App />
    </ConfigProvider>
  </React.StrictMode>
);
