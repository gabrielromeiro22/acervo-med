import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'sonner'
import App from './App'
import { loadAcervo } from './lib/store'
import './index.css'

loadAcervo()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
      <Toaster theme="dark" position="bottom-right" richColors />
    </BrowserRouter>
  </StrictMode>,
)
