import { useState } from 'react'
import { SubscriptionPlan } from '@/services/subscriptionService'

interface SubscriptionPlansProps {
  plans: SubscriptionPlan[]
  currentPlanId: string
  currentBillingInterval: string
  onUpgrade: (planId: string) => void
  className?: string
  isYearly: boolean
  onYearlyChange: (isYearly: boolean) => void
  isProcessing: boolean
}

export function SubscriptionPlans({ 
  plans, 
  currentPlanId, 
  currentBillingInterval,
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

    // Define plan hierarchy for comparison
    const planHierarchy = { 'free': 0, 'pro': 1, 'premium': 2 }
    const currentPlanLevel = planHierarchy[currentPlanId as keyof typeof planHierarchy] ?? 0
    const thisPlanLevel = planHierarchy[plan.id as keyof typeof planHierarchy] ?? 0

    // Determine button state and text
    const getButtonConfig = () => {
      const toggleInterval = isYearly ? 'yearly' : 'monthly'
      
      // For free plans, billing interval doesn't matter - always show as current if user is on free
      if (plan.id === 'free') {
        if (currentPlanId === 'free') {
          return {
            text: 'Current Plan',
            disabled: true,
            className: 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }
        } else {
          return {
            text: 'Downgrade',
            disabled: false,
            className: 'bg-orange-500 text-white hover:bg-orange-600'
          }
        }
      }
      
      // For paid plans, check if this is the current plan considering both tier and billing interval
      const isCurrentPlanAndInterval = plan.id === currentPlanId && currentBillingInterval === toggleInterval
      
      console.log(`DEBUG - ${plan.id}: Button logic`, {
        planId: plan.id,
        currentPlanId,
        currentBillingInterval,
        toggleInterval,
        isCurrentPlanAndInterval,
        isSamePlanDifferentInterval: plan.id === currentPlanId && currentBillingInterval !== toggleInterval
      })

      if (isCurrentPlanAndInterval) {
        return {
          text: 'Current Plan',
          disabled: true,
          className: 'bg-gray-100 text-gray-400 cursor-not-allowed'
        }
      }

      // If same plan tier but different billing interval, show "Switch to X"
      if (plan.id === currentPlanId && currentBillingInterval !== toggleInterval) {
        const intervalText = isYearly ? 'Yearly' : 'Monthly'
        return {
          text: `Switch to ${intervalText}`,
          disabled: isProcessing,
          className: isProcessing 
            ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
            : 'bg-blue-500 text-white hover:bg-blue-600'
        }
      }

      if (thisPlanLevel > currentPlanLevel) {
        return {
          text: 'Upgrade',
          disabled: isProcessing,
          className: isProcessing 
            ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
            : 'bg-black text-white hover:bg-gray-800'
        }
      } else {
        return {
          text: 'Downgrade',
          disabled: isProcessing,
          className: isProcessing 
            ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
            : 'bg-orange-500 text-white hover:bg-orange-600'
        }
      }
    }

    const buttonConfig = getButtonConfig()

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
        ${isCurrentPlan ? 'ring-2 ring-black bg-gray-50' : ''}
      `}>
        {isCurrentPlan && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-black text-white px-4 py-1 rounded-full text-sm">
            Current Plan
          </div>
        )}

        <div className="space-y-4">
          <div>
            <h3 className={`text-xl font-bold ${isCurrentPlan ? 'text-gray-700' : ''}`}>
              {plan.name}
            </h3>
            <p className={`${isCurrentPlan ? 'text-gray-500' : 'text-gray-600'}`}>
              {plan.description}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-baseline">
              <span className={`text-3xl font-bold ${isCurrentPlan ? 'text-gray-700' : ''}`}>
                {formatPrice(price)}
              </span>
              <span className={`ml-2 ${isCurrentPlan ? 'text-gray-500' : 'text-gray-600'}`}>
                /{isYearly ? 'year' : 'month'}
              </span>
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
                <span className={`text-sm ${isCurrentPlan ? 'text-gray-600' : ''}`}>
                  {service}
                </span>
              </div>
            ))}
          </div>

          <button
            onClick={() => !buttonConfig.disabled && onUpgrade(plan.id)}
            disabled={buttonConfig.disabled}
            className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${buttonConfig.className}`}
          >
            {isProcessing && !buttonConfig.disabled ? 'Processing...' : buttonConfig.text}
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