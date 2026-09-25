import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { registerSW } from 'virtual:pwa-register'
import { Capacitor } from '@capacitor/core'

if (!Capacitor.isNativePlatform()) {
  const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm('Nueva versión disponible. ¿Recargar?')) {
      updateSW(true)
    }
  },
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
