'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useSubscription } from '@/hooks/useSubscription'
import { UsageDisplay } from '@/components/subscription/UsageDisplay'
import { SubscriptionPlans } from '@/components/subscription/SubscriptionPlans'
import { StripeService } from '@/services/stripeService'
import { Navigation } from '@/components/shared/Navigation'
import { BackButton } from '@/components/shared/BackButton'
import { useToastContext } from '@/contexts/ToastContext'

function SubscriptionContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading: authLoading } = useAuth()
  const { showSuccess, showError, showInfo } = useToastContext()
  const { 
    subscription, 
    plans, 
    loading: subscriptionLoading,
    error,
    getCurrentPlanId,
    pendingPlanChange,
    refresh
  } = useSubscription()
  const [isProcessing, setIsProcessing] = useState(false)
  const [isYearly, setIsYearly] = useState(false)
  const [currentPlanId, setCurrentPlanId] = useState<string>('free')

  // Handle URL parameters (success, canceled, etc.)
  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      showSuccess('Subscription Updated!', 'Your subscription has been successfully updated.')
      // Clean up the URL and refresh subscription data
      router.replace('/dashboard/subscription', { scroll: false })
      refresh()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Run only once on mount

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login')
    }
  }, [user, authLoading, router])

  // Get current plan ID when component mounts
  useEffect(() => {
    const fetchCurrentPlan = async () => {
      console.log('Subscription object:', subscription)
      console.log('Subscription plan ID from subscription object:', subscription?.subscriptionPlanId)
      
      const planId = await getCurrentPlanId()
      console.log('Plan ID from getCurrentPlanId():', planId)
      
      // Helper function to convert Stripe Price IDs to our plan IDs
      const convertPriceIdToPlanId = (id: string): string => {
        const priceToPlainMap: { [key: string]: string } = {
          'price_1RYAcH04AHhaKcz1zSaXyJHS': 'pro',     // Pro Monthly
          'price_1RYAcj04AHhaKcz1jZEqaw58': 'pro',     // Pro Annual  
          'price_1RYAd904AHhaKcz1sfdexopq': 'premium', // Premium Monthly
          'price_1RYAdU04AHhaKcz1ZXsoCLdh': 'premium'  // Premium Annual
        }
        return priceToPlainMap[id] || id // Return converted ID or original if not found
      }
      
      // Use subscription.subscriptionPlanId if available, otherwise use getCurrentPlanId()
      const rawPlanId = subscription?.subscriptionPlanId || planId || 'free'
      const finalPlanId = convertPriceIdToPlanId(rawPlanId)
      
      console.log('Raw plan ID:', rawPlanId)
      console.log('Final plan ID being set:', finalPlanId)
      
      setCurrentPlanId(finalPlanId)
    }
    
    // Only fetch if we have subscription data
    if (subscription) {
      fetchCurrentPlan()
    }
  }, [getCurrentPlanId, subscription])

  const handlePlanChange = async (planId: string) => {
    if (isProcessing || !user) return

    try {
      setIsProcessing(true)

      // Define plan hierarchy for comparison
      const planHierarchy = { 'free': 0, 'pro': 1, 'premium': 2 }
      const currentPlanLevel = planHierarchy[currentPlanId as keyof typeof planHierarchy] ?? 0
      const targetPlanLevel = planHierarchy[planId as keyof typeof planHierarchy] ?? 0

      // Handle downgrades to free plan only - use Customer Portal
      if (planId === 'free') {
        if (currentPlanId === 'free') {
          showError('Invalid Action', 'You are already on the free plan')
          return
        }

        // For downgrades to free, redirect to Stripe Customer Portal
        showInfo(
          'Redirecting to Billing Portal', 
          'You will be redirected to manage your subscription. You can cancel your subscription and it will remain active until the end of your billing period.'
        )
        
        const portalData = await new StripeService().createCustomerPortalSession()
        if (!portalData.url) {
          throw new Error('No Customer Portal URL returned')
        }
        
        window.location.href = portalData.url
        return
      }

      // All other plan changes (upgrades and paid plan switches) - use Stripe Checkout
      const isUpgrade = targetPlanLevel > currentPlanLevel
      const actionText = isUpgrade ? 'upgrade' : 'plan change'
      
      showInfo(
        `Redirecting to Checkout`, 
        `You will be redirected to Stripe to complete your ${actionText}. ${isUpgrade ? 'You\'ll be charged prorated for the remainder of this billing cycle.' : 'Your billing will be adjusted accordingly.'}`
      )

      // Create or update subscription using Stripe Checkout
      const subscriptionData = await new StripeService().createSubscription({
        email: user.email!,
        userId: user.id,
        planType: planId,
        isYearly
      })

      // Get the Stripe Checkout URL
      const url = subscriptionData.url
      if (!url) {
        throw new Error('No Stripe Checkout URL returned')
      }
      
      // Redirect to Stripe Checkout
      window.location.href = url
      
    } catch (error) {
      console.error('Error changing subscription:', error)
      showError('Plan Change Failed', 'Failed to change subscription. Please try again or contact support.')
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

  if (!subscription || !plans.length) {
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
            <UsageDisplay usage={subscription} />
          </div>

          {/* Pending Plan Changes */}
          {pendingPlanChange && (
            <div className="mb-12">
              <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-6 max-w-2xl mx-auto">
                <div className="text-center">
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-orange-800 mb-2">
                    {pendingPlanChange.changeType === 'downgrade' ? 'Subscription Ending' : 'Plan Change Scheduled'}
                  </h3>
                  <p className="text-orange-700 mb-4">
                    {pendingPlanChange.changeType === 'downgrade' && pendingPlanChange.targetPlanId === 'free'
                      ? `Your subscription will end on ${pendingPlanChange.effectiveDate.toLocaleDateString()}. You'll continue to have access to your current plan features until then.`
                      : `Your plan will change to ${pendingPlanChange.targetPlanId} on ${pendingPlanChange.effectiveDate.toLocaleDateString()}.`
                    }
                  </p>
                  <button
                    onClick={async () => {
                      const portalData = await new StripeService().createCustomerPortalSession()
                      if (portalData.url) window.location.href = portalData.url
                    }}
                    className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700 transition-colors"
                  >
                    Manage Subscription
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Subscription Plans */}
          <div>
            <h2 className="text-2xl font-bold mb-6 font-graffiti text-black">Available Plans</h2>
            <SubscriptionPlans
              plans={plans}
              currentPlanId={currentPlanId}
              onUpgrade={handlePlanChange}
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

export default function SubscriptionPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#DC2626]">
        <div className="text-center">
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-primary-600 font-bold text-lg">T</span>
          </div>
          <p className="text-white">Loading...</p>
        </div>
      </div>
    }>
      <SubscriptionContent />
    </Suspense>
  )
} 