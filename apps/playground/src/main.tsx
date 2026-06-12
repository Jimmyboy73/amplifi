import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import posthog from 'posthog-js'
import './index.css'
import App from './App.tsx'

posthog.init(import.meta.env.VITE_POSTHOG_KEY as string, {
  api_host: 'https://eu.i.posthog.com',
  defaults: '2026-05-30',
  person_profiles: 'identified_only',
  autocapture: true,
  disable_session_recording: false,
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
