import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './features/auth/AuthContext.jsx'
import { CelebrationProvider } from './features/celebrate/CelebrationProvider.jsx'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <CelebrationProvider>
          <App />
        </CelebrationProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
)
