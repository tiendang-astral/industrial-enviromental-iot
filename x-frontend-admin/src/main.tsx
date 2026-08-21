import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import '@/stores/useThemeStore' // side-effect: apply theme lên <html> trước khi render lần đầu, tránh flash sai theme
import App from './app/App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
