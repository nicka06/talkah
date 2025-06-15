'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useSubscription } from '@/hooks/useSubscription'
import { CallService } from '@/services/callService'
import { Navigation } from '@/components/shared/Navigation'
import { BackButton } from '@/components/shared/BackButton'

export default function CallsPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { usage, loading: subscriptionLoading } = useSubscription()
  const [phoneNumber, setPhoneNumber] = useState('')
  const [topic, setTopic] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login')
    }
  }, [user, authLoading, router])

  const formatPhoneNumber = (value: string) => {
    // Remove all non-digits
    const cleaned = value.replace(/\D/g, '')
    
    // Limit to 10 digits
    const limited = cleaned.slice(0, 10)
    
    // Format as (XXX) XXX-XXXX
    if (limited.length >= 6) {
      return `(${limited.slice(0, 3)}) ${limited.slice(3, 6)}-${limited.slice(6)}`
    } else if (limited.length >= 3) {
      return `(${limited.slice(0, 3)}) ${limited.slice(3)}`
    } else {
      return limited
    }
  }

  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value)
    setPhoneNumber(formatted)
  }

  const validateInputs = () => {
    const cleanPhone = phoneNumber.replace(/\D/g, '')
    if (cleanPhone.length !== 10) {
      alert('Please enter a valid 10-digit phone number')
      return false
    }
    if (!topic.trim()) {
      alert('Please enter a topic to discuss')
      return false
    }
    return true
  }

  const handleInitiateCall = async () => {
    if (!validateInputs() || isProcessing || !user) return

    try {
      setIsProcessing(true)

      // Check if user can make a call
      const phoneCallsRemaining = usage ? (usage.phoneCallsLimit === -1 ? Infinity : usage.phoneCallsLimit - usage.phoneCallsUsed) : 0
      if (phoneCallsRemaining <= 0) {
        alert('You have reached your phone call limit for this billing period. Please upgrade your plan to make more calls.')
        return
      }

      // Format phone number for API call
      const cleanPhone = phoneNumber.replace(/\D/g, '')
      const formattedPhone = `+1${cleanPhone}`

      const result = await CallService.initiateCall({
        phoneNumber: formattedPhone,
        topic: topic.trim(),
        userId: user.id,
        email: user.email!
      })

      if (result) {
        // Show success message
        alert('Call initiated successfully! You should receive a call shortly.')
        
        // Clear form
        setPhoneNumber('')
        setTopic('')
        
        // Navigate to call history or dashboard
        router.push('/dashboard/calls/history')
      } else {
        alert('Failed to initiate call. Please try again.')
      }
    } catch (error) {
      console.error('Error initiating call:', error)
      alert('Failed to initiate call. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  if (authLoading || subscriptionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#DC2626]">
        <div className="text-center">
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-primary-600 font-bold text-lg">T</span>
          </div>
          <p className="text-white">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#DC2626]">
      {/* Navigation */}
      <Navigation />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-16">
        <div className="text-center max-w-2xl mx-auto">
          {/* Back Button */}
          <div className="flex justify-start mb-8">
            <BackButton text="Dashboard" href="/dashboard" />
          </div>

          <h1 className="font-graffiti text-5xl md:text-6xl font-bold text-black mb-6">
            PHONE CALLS
          </h1>
          <p className="text-xl text-black/90 mb-8">
            AI-powered conversations with anyone, anywhere
          </p>

          {/* Usage Display */}
          {usage && (
            <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl border-2 border-black mb-8">
              <div className="flex justify-between items-center">
                <span className="text-black font-semibold">Calls Remaining:</span>
                <span className="text-black font-bold text-lg">
                  {usage.phoneCallsLimit === -1 ? '∞' : Math.max(0, usage.phoneCallsLimit - usage.phoneCallsUsed)} / {usage.phoneCallsLimit === -1 ? '∞' : usage.phoneCallsLimit}
                </span>
              </div>
            </div>
          )}

          {/* Call Form */}
          <div className="bg-white/10 backdrop-blur-sm p-8 rounded-xl shadow-lg border-2 border-black">
            <div className="space-y-6">
              {/* Phone Number Input */}
              <div>
                <label htmlFor="phoneNumber" className="block text-left text-black font-semibold mb-2">
                  Phone Number
                </label>
                <input
                  id="phoneNumber"
                  type="tel"
                  placeholder="(555) 123-4567"
                  value={phoneNumber}
                  onChange={handlePhoneNumberChange}
                  className="w-full px-4 py-3 bg-white/5 border-2 border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black placeholder-black/70"
                  disabled={isProcessing}
                />
              </div>

              {/* Topic Input */}
              <div>
                <label htmlFor="topic" className="block text-left text-black font-semibold mb-2">
                  Topic to Discuss
                </label>
                <textarea
                  id="topic"
                  placeholder="What would you like to talk about?"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 bg-white/5 border-2 border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black placeholder-black/70 resize-none"
                  disabled={isProcessing}
                />
              </div>

              {/* Call Button */}
              <button
                onClick={handleInitiateCall}
                disabled={isProcessing || (usage ? (usage.phoneCallsLimit !== -1 && usage.phoneCallsUsed >= usage.phoneCallsLimit) : true)}
                className={`
                  w-full py-4 rounded-lg font-graffiti text-xl transition-colors
                  ${isProcessing || (usage ? (usage.phoneCallsLimit !== -1 && usage.phoneCallsUsed >= usage.phoneCallsLimit) : true)
                    ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                    : 'bg-black text-white hover:bg-gray-800'
                  }
                `}
              >
                {isProcessing ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>INITIATING CALL...</span>
                  </div>
                ) : (usage && usage.phoneCallsLimit !== -1 && usage.phoneCallsUsed >= usage.phoneCallsLimit) ? (
                  'CALL LIMIT REACHED'
                ) : (
                  'START CALL'
                )}
              </button>

              {usage && usage.phoneCallsLimit !== -1 && usage.phoneCallsUsed >= usage.phoneCallsLimit && (
                <p className="text-black/80 text-sm">
                  <a href="/dashboard/subscription" className="underline hover:text-black">
                    Upgrade your plan
                  </a> to make more calls
                </p>
              )}
            </div>
          </div>

          {/* Navigation Links */}
          <div className="mt-8 flex justify-center space-x-4">
            <a
              href="/dashboard/calls/history"
              className="px-6 py-2 bg-white/10 border-2 border-black rounded-lg text-black hover:bg-black hover:text-white transition-colors"
            >
              View Call History
            </a>
          </div>
        </div>
      </main>
    </div>
  )
} 