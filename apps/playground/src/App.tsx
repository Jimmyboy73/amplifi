import { Routes, Route } from 'react-router-dom'
import './App.css'
import Home from './pages/Home'
import Plan from './pages/Plan'
import Report from './pages/plan/Report'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/plan" element={<Plan />} />
      <Route path="/plan/report" element={<Report />} />
    </Routes>
  )
}
