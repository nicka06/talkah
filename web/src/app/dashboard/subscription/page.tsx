'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useSubscription } from '@/hooks/useSubscription'
import { UsageDisplay } from '@/components/subscription/UsageDisplay'
import { SubscriptionPlans } from '@/components/subscription/SubscriptionPlans'
import { StripeService } from '@/services/stripeService'
import { loadStripe } from '@stripe/stripe-js'

export default function SubscriptionPage() {
  const router = useRouter()
  const { user, signOut, loading: authLoading } = useAuth()
  const { 
    usage, 
    plans, 
    loading: subscriptionLoading,
    error,
    getCurrentPlanId,
    refresh
  } = useSubscription()
  const [isProcessing, setIsProcessing] = useState(false)
  const [isYearly, setIsYearly] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [currentPlanId, setCurrentPlanId] = useState<string>('free')

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    } else {
      document.removeEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [dropdownOpen])

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login')
    }
  }, [user, authLoading, router])

  // Get current plan ID when component mounts
  useEffect(() => {
    const fetchCurrentPlan = async () => {
      const planId = await getCurrentPlanId()
      setCurrentPlanId(planId || 'free')
    }
    fetchCurrentPlan()
  }, [getCurrentPlanId])

  const handleSignOut = async () => {
    await signOut?.()
    router.push('/')
  }

  const handleUpgrade = async (planId: string) => {
    if (isProcessing || !user) return

    try {
      setIsProcessing(true)

      // Validate plan type
      if (planId === 'free') {
        throw new Error('Cannot upgrade from the free plan')
      }

      // Create subscription (platform: 'web' is sent by default)
      const subscriptionData = await new StripeService().createSubscription({
        email: user.email!,
        userId: user.id,
        planType: planId,
        isYearly
      })

      // Get the Stripe Checkout URL from the subscription data
      const url = subscriptionData.url
      if (!url) throw new Error('No Stripe Checkout URL returned')
      window.location.href = url // Redirect to Stripe Checkout
    } catch (error) {
      console.error('Error upgrading subscription:', error)
      alert('Failed to upgrade subscription. Please try again.')
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

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#DC2626]">
        <div className="text-center">
          <p className="text-red-500">Error loading subscription data</p>
          <button 
            onClick={() => refresh()}
            className="mt-4 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  if (!usage || !plans.length) {
    return null
  }

  return (
    <div className="min-h-screen bg-[#DC2626]">
      {/* Navbar/Header */}
      <header className="text-black py-4 border-b-2 border-black">
        <div className="flex items-center justify-between px-6">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-lg">T</span>
            </div>
            <h1 className="font-graffiti text-2xl font-bold text-black">
              TALKAH
            </h1>
          </div>
          <div className="relative" ref={dropdownRef}>
            <button
              className="w-12 h-12 rounded-full border-2 border-black flex items-center justify-center bg-white hover:bg-black/10 transition-colors focus:outline-none"
              onClick={() => setDropdownOpen((open) => !open)}
              aria-label="Open profile menu"
            >
              {user?.user_metadata?.avatar_url ? (
                <img src={user.user_metadata.avatar_url} alt="Profile" className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <span className="text-black font-bold text-lg">{user?.email?.[0]?.toUpperCase() || 'U'}</span>
              )}
            </button>
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white border-2 border-black rounded-xl shadow-xl z-50">
                <div className="px-4 py-3 border-b border-black">
                  <div className="font-semibold text-black">{user?.email || 'User'}</div>
                </div>
                <ul className="py-2">
                  <li>
                    <a href="/dashboard/activity" className="block px-4 py-2 text-black hover:bg-black/10 rounded transition-colors">History</a>
                  </li>
                  <li>
                    <a href="/dashboard/subscription" className="block px-4 py-2 text-black hover:bg-black/10 rounded transition-colors">Subscription</a>
                  </li>
                  <li>
                    <button onClick={handleSignOut} className="w-full text-left px-4 py-2 text-black hover:bg-black/10 rounded transition-colors">Sign Out</button>
                  </li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-16">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="font-graffiti text-5xl md:text-6xl font-bold text-black mb-6">
            Subscription & Usage
          </h1>
          <p className="text-xl text-black/90 mb-12 max-w-2xl mx-auto">
            Manage your subscription and track your usage
          </p>

          {/* Usage Display */}
          <div className="mb-12">
            <UsageDisplay usage={usage} />
          </div>

          {/* Subscription Plans */}
          <div>
            <h2 className="text-2xl font-bold mb-6 font-graffiti text-black">Available Plans</h2>
            <SubscriptionPlans
              plans={plans}
              currentPlanId={currentPlanId}
              onUpgrade={handleUpgrade}
              isYearly={isYearly}
              onYearlyChange={setIsYearly}
              isProcessing={isProcessing}
            />
          </div>
        </div>
      </main>
    </div>
  )
} 