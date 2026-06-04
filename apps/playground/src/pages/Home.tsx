import Nav from '../components/Nav'
import Hero from '../components/Hero'
import Products from '../components/Products'
import HowItWorks from '../components/HowItWorks'
import Waitlist from '../components/Waitlist'
import Footer from '../components/Footer'

export default function Home() {
  return (
    <div className="min-h-screen bg-white font-jakarta antialiased">
      <Nav />
      <Hero />
      <Products />
      <HowItWorks />
      <Waitlist />
      <Footer />
    </div>
  )
}
