import { useState } from 'react'
import { SubscriptionPlan } from '@/services/subscriptionService'

interface SubscriptionPlansProps {
  plans: SubscriptionPlan[]
  currentPlanId: string
  onUpgrade: (planId: string) => void
  className?: string
  isYearly: boolean
  onYearlyChange: (isYearly: boolean) => void
  isProcessing: boolean
}

export function SubscriptionPlans({ 
  plans, 
  currentPlanId, 
  onUpgrade,
  className = '',
  isYearly,
  onYearlyChange,
  isProcessing
}: SubscriptionPlansProps) {
  const formatPrice = (price: number) => {
    console.log('Formatting price:', price, 'Type:', typeof price)
    
    if (price === null || price === undefined || isNaN(price)) {
      console.warn('Invalid price detected:', price)
      return '$0'
    }
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(price)
  }

  const PlanCard = ({ plan }: { plan: SubscriptionPlan }) => {
    const isCurrentPlan = plan.id === currentPlanId
    const price = isYearly ? plan.priceYearly : plan.priceMonthly
    const savings = isYearly ? plan.priceMonthly * 12 - plan.priceYearly : 0

    console.log(`Plan ${plan.id}:`, {
      priceMonthly: plan.priceMonthly,
      priceYearly: plan.priceYearly,
      selectedPrice: price,
      isYearly,
      phoneCallsLimit: plan.phoneCallsLimit,
      textChainsLimit: plan.textChainsLimit,
      emailsLimit: plan.emailsLimit,
      fullPlan: plan
    })

    // Define the three core services with their limits
    const getCoreServices = () => {
      // Add fallback values in case limits are still undefined
      const phoneLimit = plan.phoneCallsLimit ?? (plan.id === 'free' ? 1 : plan.id === 'pro' ? 5 : -1)
      const textLimit = plan.textChainsLimit ?? (plan.id === 'free' ? 1 : plan.id === 'pro' ? 10 : -1)
      const emailLimit = plan.emailsLimit ?? (plan.id === 'free' ? 1 : -1)

      const phoneDisplay = phoneLimit === -1 ? 'Unlimited' : phoneLimit
      const textDisplay = textLimit === -1 ? 'Unlimited' : textLimit
      const emailDisplay = emailLimit === -1 ? 'Unlimited' : emailLimit

      return [
        `${phoneDisplay} Phone Calls`,
        `${textDisplay} Text Messages (soon)`,
        `${emailDisplay} Emails`
      ]
    }

    const coreServices = getCoreServices()

    return (
      <div className={`
        relative bg-white border-2 border-black rounded-xl p-6
        ${isCurrentPlan ? 'ring-2 ring-black' : ''}
      `}>
        {isCurrentPlan && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-black text-white px-4 py-1 rounded-full text-sm">
            Current Plan
          </div>
        )}

        <div className="space-y-4">
          <div>
            <h3 className="text-xl font-bold">{plan.name}</h3>
            <p className="text-gray-600">{plan.description}</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-baseline">
              <span className="text-3xl font-bold">{formatPrice(price)}</span>
              <span className="text-gray-600 ml-2">/{isYearly ? 'year' : 'month'}</span>
            </div>
            {isYearly && savings > 0 && !isNaN(savings) && (
              <p className="text-sm text-green-600">
                Save {formatPrice(savings)} per year
              </p>
            )}
          </div>

          <div className="space-y-2">
            {coreServices.map((service, index) => (
              <div key={index} className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm">{service}</span>
              </div>
            ))}
          </div>

          <button
            onClick={() => onUpgrade(plan.id)}
            disabled={isCurrentPlan || isProcessing || plan.id === 'free'}
            className={`
              w-full py-2 px-4 rounded-lg font-medium
              ${isCurrentPlan || isProcessing || plan.id === 'free'
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-black text-white hover:bg-gray-800'
              }
            `}
          >
            {isCurrentPlan ? 'Current Plan' : 
             plan.id === 'free' ? 'Free Plan' :
             isProcessing ? 'Processing...' : 'Upgrade'}
          </button>
        </div>
      </div>
    )
  }

  console.log('All plans received:', plans)

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center justify-center space-x-4">
        <span className={`text-sm ${!isYearly ? 'font-bold' : ''}`}>Monthly</span>
        <button
          onClick={() => onYearlyChange(!isYearly)}
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map(plan => (
          <PlanCard key={plan.id} plan={plan} />
        ))}
      </div>
    </div>
  )
} 