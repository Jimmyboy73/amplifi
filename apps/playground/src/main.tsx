import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import posthog from 'posthog-js'
import './index.css'
import App from './App.tsx'

posthog.init('phc_BNNKk2gQ2KAn4sD38eHtGb9kH7jj2LWn3aJf4wQeZxGj', {
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
