'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useSubscription } from '@/hooks/useSubscription'
import { UsageDisplay } from '@/components/subscription/UsageDisplay'
import { SubscriptionPlans } from '@/components/subscription/SubscriptionPlans'
import { StripeService } from '@/services/stripeService'
import { Navigation } from '@/components/shared/Navigation'
import { BackButton } from '@/components/shared/BackButton'
import { useToastContext } from '@/contexts/ToastContext'

export default function SubscriptionPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading: authLoading } = useAuth()
  const { showSuccess, showError, showInfo } = useToastContext()
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
  const [currentPlanId, setCurrentPlanId] = useState<string>('free')

  // Handle URL parameters (success, canceled, etc.)
  useEffect(() => {
    const success = searchParams.get('success')
    
    if (success === 'true') {
      showSuccess('Subscription Updated!', 'Your subscription has been successfully updated.')
      // Clean up the URL and refresh subscription data
      router.replace('/dashboard/subscription')
      refresh()
    }
  }, [searchParams, router, showSuccess, refresh])

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

  const handleUpgrade = async (planId: string) => {
    if (isProcessing || !user) return

    try {
      setIsProcessing(true)

      // Validate plan type
      if (planId === 'free') {
        showError('Invalid Plan', 'Cannot upgrade from the free plan')
        return
      }

      showInfo('Redirecting to Checkout', 'You will be redirected to Stripe to complete your payment.')

      // Create subscription (platform: 'web' is sent by default)
      const subscriptionData = await new StripeService().createSubscription({
        email: user.email!,
        userId: user.id,
        planType: planId,
        isYearly
      })

      // Get the Stripe Checkout URL from the subscription data
      const url = subscriptionData.url
      if (!url) {
        throw new Error('No Stripe Checkout URL returned')
      }
      
      // Redirect to Stripe Checkout
      window.location.href = url
    } catch (error) {
      console.error('Error upgrading subscription:', error)
      showError('Upgrade Failed', 'Failed to upgrade subscription. Please try again or contact support.')
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
      {/* Navigation */}
      <Navigation />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-16">
        <div className="text-center max-w-4xl mx-auto">
          {/* Back Button */}
          <div className="flex justify-start mb-8">
            <BackButton text="Dashboard" href="/dashboard" />
          </div>

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