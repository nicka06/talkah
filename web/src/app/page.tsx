'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Navigation } from '@/components/shared/Navigation'

export default function HomePage() {
  const [phoneNumber, setPhoneNumber] = useState('')
  const [topic, setTopic] = useState('')
  const [phoneError, setPhoneError] = useState('')
  const [topicError, setTopicError] = useState('')
  const { user, loading } = useAuth()
  const router = useRouter()

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard')
    }
  }, [user, loading, router])

  // Format phone number as user types
  const formatPhoneNumber = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '')
    
    // Limit to 11 digits (1 + 10 for US numbers)
    const limitedDigits = digits.slice(0, 11)
    
    // Format based on length
    if (limitedDigits.length <= 3) {
      return limitedDigits
    } else if (limitedDigits.length <= 6) {
      return `(${limitedDigits.slice(0, 3)}) ${limitedDigits.slice(3)}`
    } else if (limitedDigits.length <= 10) {
      return `(${limitedDigits.slice(0, 3)}) ${limitedDigits.slice(3, 6)}-${limitedDigits.slice(6)}`
    } else {
      // Handle 11 digits (with country code)
      return `+${limitedDigits.slice(0, 1)} (${limitedDigits.slice(1, 4)}) ${limitedDigits.slice(4, 7)}-${limitedDigits.slice(7)}`
    }
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value)
    setPhoneNumber(formatted)
    
    // Clear error when user starts typing
    if (phoneError) setPhoneError('')
  }

  const handleTopicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTopic(e.target.value)
    
    // Clear error when user starts typing
    if (topicError) setTopicError('')
  }

  const validateInputs = () => {
    let isValid = true
    
    // Validate phone number (must have at least 10 digits)
    const digits = phoneNumber.replace(/\D/g, '')
    if (digits.length < 10) {
      setPhoneError('Phone number must be at least 10 digits')
      isValid = false
    } else {
      setPhoneError('')
    }
    
    // Validate topic (must be at least 5 characters)
    if (topic.trim().length < 5) {
      setTopicError('Topic must be at least 5 characters')
      isValid = false
    } else {
      setTopicError('')
    }
    
    return isValid
  }

  const handleCallNow = () => {
    if (!validateInputs()) {
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-primary-600 font-bold text-lg">T</span>
          </div>
          <p className="text-white">Loading...</p>
        </div>
      </div>
    )
  }

  if (user) {
    return null // Will redirect to dashboard
  }

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <Navigation />

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-16">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="font-graffiti text-6xl md:text-8xl font-bold text-black mb-6">
            AI POWERED COMMUNICATION
          </h1>
          <p className="text-xl text-black/90 mb-8 max-w-2xl mx-auto">
            Make AI-powered phone calls, send intelligent emails, and connect like never before with TALKAH.
          </p>

          {/* Call to Action - Moved up */}
          <div className="bg-white/10 backdrop-blur-sm p-8 rounded-xl shadow-lg max-w-md mx-auto border-2 border-black mb-12">
            <h3 className="font-graffiti text-2xl text-black mb-6">START TALKING NOW</h3>
            <div className="space-y-4">
              {/* Phone Number Input */}
              <div>
                <input
                  type="tel"
                  placeholder="(555) 123-4567"
                  value={phoneNumber}
                  onChange={handlePhoneChange}
                  className={`w-full px-4 py-3 bg-white/5 border-2 rounded-lg focus:outline-none focus:ring-2 text-black placeholder-black/70 ${
                    phoneError 
                      ? 'border-red-500 focus:ring-red-500' 
                      : 'border-black focus:ring-black'
                  }`}
                />
                {phoneError && (
                  <p className="text-red-600 text-sm mt-1 text-left">{phoneError}</p>
                )}
              </div>
              
              {/* Topic Input */}
              <div>
                <input
                  type="text"
                  placeholder="Topic to discuss (e.g., business inquiry, appointment)"
                  value={topic}
                  onChange={handleTopicChange}
                  className={`w-full px-4 py-3 bg-white/5 border-2 rounded-lg focus:outline-none focus:ring-2 text-black placeholder-black/70 ${
                    topicError 
                      ? 'border-red-500 focus:ring-red-500' 
                      : 'border-black focus:ring-black'
                  }`}
                />
                {topicError && (
                  <p className="text-red-600 text-sm mt-1 text-left">{topicError}</p>
                )}
              </div>
              
              <button
                onClick={handleCallNow}
                className="w-full bg-black text-white py-3 rounded-lg font-graffiti text-xl hover:bg-gray-800 transition-colors"
              >
                CALL NOW
              </button>
              <p className="text-black/70 text-sm">
                Sign up required • Free trial available
              </p>
            </div>
          </div>

          {/* Feature Cards */}
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            {/* Email Card - Left */}
            <div className="bg-white/10 backdrop-blur-sm p-8 rounded-xl shadow-lg border-2 border-black order-1 md:order-1">
              <div className="text-4xl mb-4">📧</div>
              <h3 className="font-bold text-xl mb-2 text-black">Emails</h3>
              <p className="text-black/90">Smart email composition and responses</p>
            </div>
            {/* Phone Card - Center */}
            <div className="bg-white/10 backdrop-blur-sm p-8 rounded-xl shadow-lg border-2 border-black order-2 md:order-2">
              <div className="text-4xl mb-4">📞</div>
              <h3 className="font-bold text-xl mb-2 text-black">Phone Calls</h3>
              <p className="text-black/90">AI-powered conversations with anyone, anywhere</p>
            </div>
            {/* Messages Card - Right */}
            <div className="bg-white/10 backdrop-blur-sm p-8 rounded-xl shadow-lg border-2 border-black opacity-50 order-3 md:order-3">
              <div className="text-4xl mb-4">💬</div>
              <h3 className="font-bold text-xl mb-2 text-black">Texts</h3>
              <p className="text-black/90">Coming Soon</p>
            </div>
          </div>

          {/* Mobile App Links */}
          <div className="mt-12">
            <p className="text-black/90 mb-4">Also available on mobile:</p>
            <div className="flex justify-center space-x-4">
              <button className="bg-black text-white px-6 py-3 rounded-lg font-graffiti hover:bg-gray-800 transition-colors">
                Download for iOS
              </button>
              <button className="bg-black text-white px-6 py-3 rounded-lg font-graffiti hover:bg-gray-800 transition-colors">
                Download for Android
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-black py-8 mt-16 border-t-2 border-black">
        <div className="container mx-auto px-2 text-center">
          <div className="flex justify-center space-x-8 mb-4">
            <a href="/privacy" className="hover:text-black/70 transition-colors font-semibold underline underline-offset-4">Privacy Policy</a>
            <a href="/terms" className="hover:text-black/70 transition-colors font-semibold underline underline-offset-4">Terms of Service</a>
          </div>
          <p className="text-black/70">© 2025 TALKAH. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
