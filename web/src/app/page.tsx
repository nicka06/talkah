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
      <main className="container mx-auto px-4 py-8 sm:py-16">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="font-graffiti text-4xl sm:text-6xl md:text-8xl font-bold text-black mb-4 sm:mb-6 leading-tight">
            Have a Chat with AI at Any Time!
          </h1>
          <h2 className="text-lg sm:text-xl text-black/90 mb-6 sm:mb-8 max-w-2xl mx-auto px-2">
            Make AI-powered phone calls, send intelligent emails, and connect like never before with TALKAH.
          </h2>

          {/* Call to Action - Mobile Optimized */}
          <div className="bg-white/10 backdrop-blur-sm p-6 sm:p-8 rounded-xl shadow-lg max-w-md mx-auto border-2 border-black mb-8 sm:mb-12">
            <h3 className="font-graffiti text-xl sm:text-2xl text-black mb-4 sm:mb-6">START TALKING TO AI NOW</h3>
            <div className="space-y-4">
              {/* Phone Number Input */}
              <div>
                <input
                  type="tel"
                  placeholder="(555) 123-4567"
                  value={phoneNumber}
                  onChange={handlePhoneChange}
                  className={`w-full px-4 py-4 bg-white/5 border-2 rounded-lg focus:outline-none focus:ring-2 text-black placeholder-black/70 text-base ${
                    phoneError 
                      ? 'border-red-500 focus:ring-red-500' 
                      : 'border-black focus:ring-black'
                  }`}
                  inputMode="tel"
                  autoComplete="tel"
                />
                {phoneError && (
                  <p className="text-red-600 text-sm mt-2 text-left">{phoneError}</p>
                )}
              </div>
              
              {/* Topic Input */}
              <div>
                <input
                  type="text"
                  placeholder="What would you like to discuss?"
                  value={topic}
                  onChange={handleTopicChange}
                  className={`w-full px-4 py-4 bg-white/5 border-2 rounded-lg focus:outline-none focus:ring-2 text-black placeholder-black/70 text-base ${
                    topicError 
                      ? 'border-red-500 focus:ring-red-500' 
                      : 'border-black focus:ring-black'
                  }`}
                  autoComplete="off"
                />
                {topicError && (
                  <p className="text-red-600 text-sm mt-2 text-left">{topicError}</p>
                )}
              </div>
              
              <button
                onClick={handleCallNow}
                className="w-full bg-black text-white py-4 rounded-lg font-graffiti text-lg sm:text-xl hover:bg-gray-800 transition-colors touch-manipulation"
              >
                CALL NOW
              </button>
              <p className="text-black/70 text-sm text-center">
                Sign up required • Free trial available
              </p>
            </div>
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 mb-8 sm:mb-12">
            {/* Phone Card - Priority on mobile */}
            <div className="bg-white/10 backdrop-blur-sm p-6 sm:p-8 rounded-xl shadow-lg border-2 border-black order-1 lg:order-2">
              <div className="text-4xl mb-4">📞</div>
              <h3 className="font-bold text-xl mb-2 text-black">Phone Calls</h3>
              <p className="text-black/90">AI-powered conversations with anyone, anywhere</p>
            </div>
            {/* Email Card */}
            <div className="bg-white/10 backdrop-blur-sm p-6 sm:p-8 rounded-xl shadow-lg border-2 border-black order-2 lg:order-1">
              <div className="text-4xl mb-4">📧</div>
              <h3 className="font-bold text-xl mb-2 text-black">Emails</h3>
              <p className="text-black/90">Smart email composition and responses</p>
            </div>
            {/* Messages Card */}
            <div className="bg-white/10 backdrop-blur-sm p-6 sm:p-8 rounded-xl shadow-lg border-2 border-black opacity-50 order-3 sm:col-span-2 lg:col-span-1">
              <div className="text-4xl mb-4">💬</div>
              <h3 className="font-bold text-xl mb-2 text-black">Texts</h3>
              <p className="text-black/90">Coming Soon</p>
            </div>
          </div>

          {/* Mobile App Links */}
          <div className="mt-8 sm:mt-12">
            <p className="text-black/90 mb-4 text-sm sm:text-base">Also available on mobile:</p>
            <div className="flex flex-col sm:flex-row justify-center space-y-3 sm:space-y-0 sm:space-x-4 max-w-sm sm:max-w-none mx-auto">
              <button className="bg-black text-white px-6 py-3 rounded-lg font-graffiti text-sm sm:text-base hover:bg-gray-800 transition-colors touch-manipulation">
                Download for iOS
              </button>
              <button className="bg-black text-white px-6 py-3 rounded-lg font-graffiti text-sm sm:text-base hover:bg-gray-800 transition-colors touch-manipulation">
                Download for Android
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-black py-6 sm:py-8 mt-12 sm:mt-16 border-t-2 border-black">
        <div className="container mx-auto px-4 text-center">
          <div className="flex flex-col sm:flex-row justify-center space-y-2 sm:space-y-0 sm:space-x-8 mb-4">
            <a href="/privacy" className="hover:text-black/70 transition-colors font-semibold underline underline-offset-4 text-sm sm:text-base">Privacy Policy</a>
            <a href="/terms" className="hover:text-black/70 transition-colors font-semibold underline underline-offset-4 text-sm sm:text-base">Terms of Service</a>
          </div>
          <p className="text-black/70 text-xs sm:text-sm">© 2025 TALKAH. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
