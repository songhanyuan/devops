import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#0ea5e9',
          borderRadius: 8,
          colorBgContainer: '#ffffff',
          fontFamily: "'Manrope', 'Sora', sans-serif",
        },
        components: {
          Layout: {
            siderBg: '#0b1120',
            headerBg: '#ffffff',
          },
          Menu: {
            darkItemBg: '#0b1120',
            darkSubMenuItemBg: '#0f172a',
            darkItemSelectedBg: '#0ea5e9',
            itemBorderRadius: 8,
            itemMarginInline: 8,
          },
          Table: {
            headerBg: '#fafafa',
            borderRadius: 8,
          },
          Card: {
            borderRadiusLG: 12,
          },
          Button: {
            borderRadius: 8,
          },
          Input: {
            borderRadius: 8,
          },
          Select: {
            borderRadius: 8,
          },
          Modal: {
            borderRadiusLG: 12,
          },
        },
      }}
    >
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ConfigProvider>
  </React.StrictMode>,
)
