import { Routes, Route } from 'react-router-dom'
import './App.css'
import Home from './pages/Home'
import Plan from './pages/Plan'
import Report from './pages/plan/Report'
import WishlistPage from './pages/birthday/WishlistPage'
import FamilyPage from './pages/family/FamilyPage'
import Admin from './pages/Admin'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/plan" element={<Plan />} />
      <Route path="/plan/report" element={<Report />} />
      <Route path="/wishlist/:wishlistId" element={<WishlistPage />} />
      <Route path="/birthday/:id" element={<WishlistPage />} />
      <Route path="/family/:childId" element={<FamilyPage />} />
      {/* Operator tooling — not linked from public nav */}
      <Route path="/admin" element={<Admin />} />
    </Routes>
  )
}
