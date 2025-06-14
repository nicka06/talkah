'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

export default function HomePage() {
  const [phoneNumber, setPhoneNumber] = useState('')
  const [topic, setTopic] = useState('')
  const { user, loading } = useAuth()
  const router = useRouter()

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard')
    }
  }, [user, loading, router])

  const handleCallNow = () => {
    // Validate inputs
    if (!phoneNumber.trim() || !topic.trim()) {
      alert('Please enter both phone number and topic')
      return
    }

    // Save to localStorage for post-auth retrieval
    const callData = {
      phoneNumber: phoneNumber.trim(),
      topic: topic.trim(),
      timestamp: Date.now()
    }
    localStorage.setItem('talkah_pending_call', JSON.stringify(callData))

    // Redirect to sign up page
    router.push('/auth/signup')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background-light flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-lg">T</span>
          </div>
          <p className="text-text-secondary">Loading...</p>
        </div>
      </div>
    )
  }

  if (user) {
    return null // Will redirect to dashboard
  }

  return (
    <div className="min-h-screen bg-background-light">
      {/* Header */}
      <header className="bg-background-dark text-white py-4">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {/* TALKAH Logo placeholder */}
              <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-lg">T</span>
              </div>
              <h1 className="font-graffiti text-2xl font-bold text-primary">
                TALKAH
              </h1>
            </div>
            <nav className="hidden md:flex space-x-6">
              <a href="/about" className="hover:text-primary transition-colors">About</a>
              <a href="/contact" className="hover:text-primary transition-colors">Contact</a>
              <a
                href="/auth/login"
                className="bg-primary px-4 py-2 rounded-lg font-semibold hover:bg-primary-700 transition-colors"
              >
                Sign In
              </a>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-16">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="font-graffiti text-6xl md:text-8xl font-bold text-background-dark mb-6">
            AI POWERED COMMUNICATION
          </h1>
          <p className="text-xl text-text-secondary mb-12 max-w-2xl mx-auto">
            Make AI-powered phone calls, send intelligent emails, and connect like never before with TALKAH.
          </p>

          {/* Feature Cards */}
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <div className="bg-white p-8 rounded-xl shadow-lg border-l-4 border-primary">
              <div className="text-4xl mb-4">📞</div>
              <h3 className="font-bold text-xl mb-2">Phone Calls</h3>
              <p className="text-text-secondary">AI-powered conversations with anyone, anywhere</p>
            </div>
            <div className="bg-white p-8 rounded-xl shadow-lg border-l-4 border-primary">
              <div className="text-4xl mb-4">📧</div>
              <h3 className="font-bold text-xl mb-2">Emails</h3>
              <p className="text-text-secondary">Smart email composition and responses</p>
            </div>
            <div className="bg-white p-8 rounded-xl shadow-lg border-l-4 border-primary opacity-50">
              <div className="text-4xl mb-4">💬</div>
              <h3 className="font-bold text-xl mb-2">Texts</h3>
              <p className="text-text-secondary">Coming Soon</p>
            </div>
          </div>

          {/* Call to Action */}
          <div className="bg-white p-8 rounded-xl shadow-lg max-w-md mx-auto">
            <h3 className="font-bold text-xl mb-4">Try it now!</h3>
            <div className="space-y-4">
              <input
                type="tel"
                placeholder="Phone number"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <input
                type="text"
                placeholder="Topic to discuss"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                onClick={handleCallNow}
                className="w-full bg-background-dark text-white py-3 rounded-lg font-semibold hover:bg-gray-800 transition-colors"
              >
                Call Now
              </button>
            </div>
          </div>

          {/* Mobile App Links */}
          <div className="mt-12">
            <p className="text-text-secondary mb-4">Also available on mobile:</p>
            <div className="flex justify-center space-x-4">
              <button className="bg-black text-white px-6 py-3 rounded-lg font-semibold">
                Download for iOS
              </button>
              <button className="bg-black text-white px-6 py-3 rounded-lg font-semibold">
                Download for Android
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-background-dark text-white py-8 mt-16">
        <div className="container mx-auto px-4 text-center">
          <div className="flex justify-center space-x-6 mb-4">
            <a href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</a>
            <a href="/terms" className="hover:text-primary transition-colors">Terms of Service</a>
            <a href="/about" className="hover:text-primary transition-colors">About Us</a>
            <a href="/contact" className="hover:text-primary transition-colors">Contact</a>
          </div>
          <p className="text-text-secondary">© 2025 TALKAH. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
