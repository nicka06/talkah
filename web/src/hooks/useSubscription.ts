import { useState, useEffect, useCallback } from 'react'
import { SubscriptionService, UsageTracking, SubscriptionPlan } from '@/services/subscriptionService'

export interface SubscriptionData extends UsageTracking {
  subscriptionPlanId: string | null;
  subscriptionStatus: string | null;
  stripeCustomerId: string | null;
}

export function useSubscription() {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const subscriptionService = new SubscriptionService()

  const loadSubscriptionData = useCallback(async () => {
    try {
      setLoading(true);
      const [usageData, plansData, statusData] = await Promise.all([
        subscriptionService.getCurrentUsage(),
        subscriptionService.getSubscriptionPlans(),
        subscriptionService.getSubscriptionStatus(),
      ]);
      
      if (usageData && statusData) {
        setSubscription({
          ...usageData,
          subscriptionPlanId: statusData.subscriptionPlanId,
          subscriptionStatus: statusData.subscriptionStatus,
          stripeCustomerId: statusData.stripeCustomerId,
        });
      } else if (statusData) {
        // Handle case where usage might not exist for a new user
        // but status does.
        setSubscription({
          userId: statusData.stripeCustomerId || '',
          phoneCallsUsed: 0,
          textChainsUsed: 0,
          emailsUsed: 0,
          phoneCallsLimit: 0,
          textChainsLimit: 0,
          emailsLimit: 0,
          billingPeriodStart: statusData.billingCycleStart || new Date(),
          billingPeriodEnd: statusData.billingCycleEnd || new Date(),
          subscriptionPlanId: statusData.subscriptionPlanId,
          subscriptionStatus: statusData.subscriptionStatus,
          stripeCustomerId: statusData.stripeCustomerId,
        });
      }

      setPlans(plansData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load subscription data'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSubscriptionData();
  }, [loadSubscriptionData]);

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
    subscription,
    plans,
    loading,
    error,
    canPerformAction,
    getCurrentPlanId,
    getSubscriptionStatus,
    refresh: loadSubscriptionData
  }
} 