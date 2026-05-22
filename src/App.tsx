import { Routes, Route } from 'react-router-dom'
import './App.css'
import Home from './pages/Home'
import Plan from './pages/Plan'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/plan" element={<Plan />} />
    </Routes>
  )
}
