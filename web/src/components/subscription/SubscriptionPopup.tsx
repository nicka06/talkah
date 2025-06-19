import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { SubscriptionPlan } from '@/services/subscriptionService'
import { StripeService } from '@/services/stripeService'

interface SubscriptionPopupProps {
  isOpen: boolean
  onClose: () => void
  plans: SubscriptionPlan[]
  currentPlanId: string
}

export function SubscriptionPopup({ 
  isOpen, 
  onClose, 
  plans, 
  currentPlanId
}: SubscriptionPopupProps) {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingPlanId, setProcessingPlanId] = useState<string | null>(null)
  const [isYearly, setIsYearly] = useState(false)

  if (!isOpen) return null

  const formatPrice = (price: number) => {
    if (price === null || price === undefined || isNaN(price)) {
      return '$0'
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(price)
  }

  const handleUpgrade = async (planId: string) => {
    if (isProcessing || planId === 'free' || planId === currentPlanId || !user) return

    try {
      setIsProcessing(true)
      setProcessingPlanId(planId)

      // Create subscription with selected billing period
      const subscriptionData = await new StripeService().createSubscription({
        email: user.email!,
        userId: user.id,
        planType: planId,
        isYearly: isYearly
      })

      // Get the Stripe Checkout URL
      const url = subscriptionData.url
      if (!url) {
        throw new Error('No Stripe Checkout URL returned')
      }
      
      // Redirect to Stripe Checkout
      window.location.href = url
    } catch (error) {
      console.error('Error upgrading subscription:', error)
      alert('Failed to upgrade subscription. Please try again.')
    } finally {
      setIsProcessing(false)
      setProcessingPlanId(null)
    }
  }

  const handleSignIn = () => {
    router.push('/auth/login')
  }

  // Filter out free plan and current plan
  const availablePlans = plans.filter(plan => 
    plan.id !== 'free' && plan.id !== currentPlanId
  )

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-black mb-2">You've Hit Your Limit!</h2>
          <p className="text-gray-600">Upgrade your plan to continue making calls</p>
        </div>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center space-x-4 mb-6">
          <span className={`text-sm ${!isYearly ? 'font-bold' : ''}`}>Monthly</span>
          <button
            onClick={() => setIsYearly(!isYearly)}
            disabled={isProcessing}
            className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200"
          >
            <span
              className={`
                inline-block h-4 w-4 transform rounded-full bg-white transition
                ${isYearly ? 'translate-x-6' : 'translate-x-1'}
              `}
            />
          </button>
          <span className={`text-sm ${isYearly ? 'font-bold' : ''}`}>Yearly</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {availablePlans.map((plan) => {
            const phoneLimit = plan.phoneCallsLimit === -1 ? 'Unlimited' : plan.phoneCallsLimit
            const textLimit = plan.textChainsLimit === -1 ? 'Unlimited' : plan.textChainsLimit
            const emailLimit = plan.emailsLimit === -1 ? 'Unlimited' : plan.emailsLimit
            
            const price = isYearly ? plan.priceYearly : plan.priceMonthly
            const savings = isYearly ? plan.priceMonthly * 12 - plan.priceYearly : 0

            return (
              <div key={plan.id} className="border-2 border-black rounded-xl p-6">
                <div className="text-center mb-4">
                  <h3 className="text-xl font-bold">{plan.name}</h3>
                  <p className="text-gray-600 text-sm">{plan.description}</p>
                </div>

                <div className="text-center mb-4">
                  <span className="text-3xl font-bold">{formatPrice(price)}</span>
                  <span className="text-gray-600 ml-1">/{isYearly ? 'year' : 'month'}</span>
                  {isYearly && savings > 0 && !isNaN(savings) && (
                    <p className="text-sm text-green-600 mt-1">
                      Save {formatPrice(savings)} per year
                    </p>
                  )}
                </div>

                <div className="space-y-2 mb-6">
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm">{phoneLimit} Phone Calls</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm">{textLimit} Text Messages (soon)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm">{emailLimit} Emails</span>
                  </div>
                </div>

                <button
                  onClick={() => user ? handleUpgrade(plan.id) : handleSignIn()}
                  disabled={isProcessing || authLoading}
                  className={`
                    w-full py-2 px-4 rounded-lg font-medium transition-colors
                    ${isProcessing && processingPlanId === plan.id
                      ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                      : user ? 'bg-black text-white hover:bg-gray-800' : 'bg-blue-600 text-white hover:bg-blue-700'
                    }
                  `}
                >
                  {authLoading 
                    ? 'Loading...' 
                    : user 
                      ? (isProcessing && processingPlanId === plan.id ? 'Processing...' : 'Upgrade Now')
                      : 'Sign In to Upgrade'
                  }
                </button>
              </div>
            )
          })}
        </div>

        <div className="text-center">
          <button
            onClick={onClose}
            className="px-6 py-2 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  )
} 