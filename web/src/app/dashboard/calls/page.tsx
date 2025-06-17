'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useSubscription } from '@/hooks/useSubscription'
import { CallService } from '../../../services/callService'
import { Navigation } from '@/components/shared/Navigation'
import { BackButton } from '@/components/shared/BackButton'
import { SubscriptionPopup } from '@/components/subscription/SubscriptionPopup'
import { useToastContext } from '@/contexts/ToastContext'

export default function CallsPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { usage, plans, loading: subscriptionLoading, getCurrentPlanId } = useSubscription()
  const { showSuccess, showError } = useToastContext()
  const [phoneNumber, setPhoneNumber] = useState('')
  const [topic, setTopic] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [showSubscriptionPopup, setShowSubscriptionPopup] = useState(false)
  const [currentPlanId, setCurrentPlanId] = useState<string>('free')

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login')
    }
  }, [user, authLoading, router])

  // Check for pending call data from homepage signup flow
  useEffect(() => {
    if (user && !authLoading) {
      const pendingCallData = localStorage.getItem('talkah_pending_call')
      
      if (pendingCallData) {
        try {
          const callData = JSON.parse(pendingCallData)
          
          // Check if data is recent (within 30 minutes)
          const thirtyMinutesAgo = Date.now() - (30 * 60 * 1000)
          if (callData.timestamp && callData.timestamp > thirtyMinutesAgo) {
            setPhoneNumber(callData.phoneNumber || '')
            setTopic(callData.topic || '')
            
            // Show a welcome message
            showSuccess(
              'Welcome to TALKAH!', 
              'We\'ve pre-filled your call details. Review and click "INITIATE CALL" when ready.',
              { duration: 6000 }
            )
          }
          
          // Clear the stored data regardless of age
          localStorage.removeItem('talkah_pending_call')
        } catch (error) {
          console.error('Error parsing pending call data:', error)
          localStorage.removeItem('talkah_pending_call')
        }
      }
    }
  }, [user, authLoading, showSuccess])

  // Get current plan ID
  useEffect(() => {
    const fetchCurrentPlan = async () => {
      const planId = await getCurrentPlanId()
      setCurrentPlanId(planId || 'free')
    }
    fetchCurrentPlan()
  }, [getCurrentPlanId])

  const formatPhoneNumber = (value: string) => {
    // Remove all non-digits
    const cleaned = value.replace(/\D/g, '')
    
    // Limit to 11 digits (handle country code)
    const limited = cleaned.slice(0, 11)
    
    // Format based on length
    if (limited.length <= 3) {
      return limited
    } else if (limited.length <= 6) {
      return `(${limited.slice(0, 3)}) ${limited.slice(3)}`
    } else if (limited.length <= 10) {
      return `(${limited.slice(0, 3)}) ${limited.slice(3, 6)}-${limited.slice(6)}`
    } else {
      // Handle 11 digits (with country code)
      return `+${limited.slice(0, 1)} (${limited.slice(1, 4)}) ${limited.slice(4, 7)}-${limited.slice(7)}`
    }
  }

  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value)
    setPhoneNumber(formatted)
  }

  const validateInputs = () => {
    const cleanPhone = phoneNumber.replace(/\D/g, '')
    if (cleanPhone.length < 10) {
      showError('Invalid Phone Number', 'Please enter a valid phone number with at least 10 digits')
      return false
    }
    if (!topic.trim()) {
      showError('Missing Topic', 'Please enter a topic to discuss')
      return false
    }
    if (topic.trim().length < 5) {
      showError('Topic Too Short', 'Please provide more details about what you want to discuss')
      return false
    }
    return true
  }

  const handleInitiateCall = async () => {
    if (!validateInputs() || isProcessing || !user) return

    try {
      setIsProcessing(true)

      // Check if user can make a call BEFORE making the API call
      const phoneCallsRemaining = usage ? (usage.phoneCallsLimit === -1 ? Infinity : usage.phoneCallsLimit - usage.phoneCallsUsed) : 0
      if (phoneCallsRemaining <= 0) {
        // Show subscription popup instead of toast
        setShowSubscriptionPopup(true)
        return
      }

      // Format phone number for API call
      const cleanPhone = phoneNumber.replace(/\D/g, '')
      const formattedPhone = cleanPhone.length === 11 ? `+${cleanPhone}` : `+1${cleanPhone}`

      const result = await CallService.initiateCall({
        phoneNumber: formattedPhone,
        topic: topic.trim(),
        userId: user.id,
        email: user.email!
      })

      if (result) {
        // Show success message
        showSuccess(
          'Call Initiated!', 
          'You should receive a call shortly. We\'ll connect you once the call is answered.',
          { duration: 8000 }
        )
        
        // Clear form
        setPhoneNumber('')
        setTopic('')
      } else {
        showError('Call Failed', 'Failed to initiate call. Please check your inputs and try again.')
      }
    } catch (error) {
      console.error('Error initiating call:', error)
      showError('Call Error', 'Failed to initiate call. Please try again or contact support if the problem persists.')
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
      <main className="container mx-auto px-4 py-8 sm:py-16">
        <div className="text-center max-w-2xl mx-auto">
          {/* Back Button */}
          <div className="flex justify-start mb-6 sm:mb-8">
            <BackButton text="Dashboard" href="/dashboard" />
          </div>

          <h1 className="font-graffiti text-3xl sm:text-5xl md:text-6xl font-bold text-black mb-4 sm:mb-6">
            PHONE CALLS
          </h1>
          <p className="text-lg sm:text-xl text-black/90 mb-6 sm:mb-8 px-2">
            AI-powered conversations with anyone, anywhere
          </p>

          {/* Call Form */}
          <div className="bg-white/10 backdrop-blur-sm p-6 sm:p-8 rounded-xl shadow-lg border-2 border-black">
            <div className="space-y-6">
              {/* Phone Number Input */}
              <div>
                <label htmlFor="phoneNumber" className="block text-left text-black font-semibold mb-2 text-sm sm:text-base">
                  Phone Number
                </label>
                <input
                  id="phoneNumber"
                  type="tel"
                  placeholder="(555) 123-4567"
                  value={phoneNumber}
                  onChange={handlePhoneNumberChange}
                  className="w-full px-4 py-4 bg-white/5 border-2 border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black placeholder-black/70 text-base"
                  disabled={isProcessing}
                  inputMode="tel"
                  autoComplete="tel"
                />
              </div>

              {/* Topic Input */}
              <div>
                <label htmlFor="topic" className="block text-left text-black font-semibold mb-2 text-sm sm:text-base">
                  Topic to Discuss
                </label>
                <textarea
                  id="topic"
                  placeholder="What would you like to discuss? Be specific..."
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full px-4 py-4 bg-white/5 border-2 border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black placeholder-black/70 min-h-[100px] text-base"
                  disabled={isProcessing}
                  rows={4}
                />
              </div>

              {/* Call Button */}
              <button
                onClick={handleInitiateCall}
                disabled={isProcessing || !phoneNumber.trim() || !topic.trim()}
                className="w-full bg-black text-white py-4 rounded-lg font-graffiti text-lg sm:text-xl hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
              >
                {isProcessing ? 'INITIATING CALL...' : 'INITIATE CALL'}
              </button>

              <p className="text-black/70 text-xs sm:text-sm text-center">
                You will receive a call shortly after clicking "Initiate Call"
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Subscription Popup */}
      <SubscriptionPopup
        isOpen={showSubscriptionPopup}
        onClose={() => setShowSubscriptionPopup(false)}
        plans={plans}
        currentPlanId={currentPlanId}
        userEmail={user?.email || ''}
        userId={user?.id || ''}
      />
    </div>
  )
} 