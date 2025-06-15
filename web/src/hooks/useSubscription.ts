import { useState, useEffect } from 'react'
import { SubscriptionService, UsageTracking, SubscriptionPlan } from '@/services/subscriptionService'

export function useSubscription() {
  const [usage, setUsage] = useState<UsageTracking | null>(null)
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const subscriptionService = new SubscriptionService()

  useEffect(() => {
    loadSubscriptionData()
  }, [])

  const loadSubscriptionData = async () => {
    try {
      setLoading(true)
      const [usageData, plansData] = await Promise.all([
        subscriptionService.getCurrentUsage(),
        subscriptionService.getSubscriptionPlans()
      ])
      setUsage(usageData)
      setPlans(plansData)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load subscription data'))
    } finally {
      setLoading(false)
    }
  }

  const canPerformAction = async (actionType: 'phone_call' | 'text_chain' | 'email'): Promise<boolean> => {
    try {
      return await subscriptionService.canPerformAction(actionType)
    } catch (err) {
      console.error('Error checking action permission:', err)
      return false
    }
  }

  const getCurrentPlanId = async (): Promise<string | null> => {
    try {
      return await subscriptionService.getCurrentPlanId()
    } catch (err) {
      console.error('Error getting current plan:', err)
      return null
    }
  }

  const getSubscriptionStatus = async () => {
    try {
      return await subscriptionService.getSubscriptionStatus()
    } catch (err) {
      console.error('Error getting subscription status:', err)
      return null
    }
  }

  return {
    usage,
    plans,
    loading,
    error,
    canPerformAction,
    getCurrentPlanId,
    getSubscriptionStatus,
    refresh: loadSubscriptionData
  }
} 