import { createClient } from '@/lib/supabase'

export interface UsageTracking {
  userId: string
  phoneCallsUsed: number
  textChainsUsed: number
  emailsUsed: number
  phoneCallsLimit: number
  textChainsLimit: number
  emailsLimit: number
  billingPeriodStart: Date
  billingPeriodEnd: Date
}

export interface PendingPlanChange {
  targetPlanId: string
  effectiveDate: Date
  changeType: 'upgrade' | 'downgrade' | 'cancel'
  requestedAt: Date
}

export interface SubscriptionPlan {
  id: string
  name: string
  description: string
  stripePriceIdMonthly?: string
  stripePriceIdYearly?: string
  phoneCallsLimit: number
  textChainsLimit: number
  emailsLimit: number
  priceMonthly: number
  priceYearly: number
  features: string[]
  isActive: boolean
  sortOrder: number
  createdAt: Date
  updatedAt: Date
}

export class SubscriptionService {
  private supabase = createClient()

  // Fallback pricing in case database values are missing
  private static getFallbackPricing(): { [key: string]: { monthly: number; yearly: number } } {
    return {
      'free': { monthly: 0, yearly: 0 },
      'pro': { monthly: 8.99, yearly: 79.99 },
      'premium': { monthly: 14.99, yearly: 119.99 }
    }
  }

  // Get all available subscription plans
  async getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    try {
      const { data, error } = await this.supabase
        .from('subscription_plans')
        .select()
        .order('sort_order', { ascending: true })

      if (error) throw error

      const fallbackPricing = SubscriptionService.getFallbackPricing()

      return data.map(plan => {
        // Use fallback pricing if database values are null/undefined
        const fallback = fallbackPricing[plan.id] || { monthly: 0, yearly: 0 }
        
        return {
          ...plan,
          priceMonthly: plan.price_monthly ?? fallback.monthly,
          priceYearly: plan.price_yearly ?? fallback.yearly,
          phoneCallsLimit: plan.phone_calls_limit ?? 0,
          textChainsLimit: plan.text_chains_limit ?? 0,
          emailsLimit: plan.emails_limit ?? 0,
          createdAt: new Date(plan.created_at),
          updatedAt: new Date(plan.updated_at)
        }
      })
    } catch (error) {
      console.error('Error fetching subscription plans:', error)
      throw error
    }
  }

  // Get current user's usage and limits for the current billing period
  async getCurrentUsage(): Promise<UsageTracking | null> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser()
      if (!user) return null

      // Fetch the most recent usage record for the user
      const { data, error } = await this.supabase
        .from('usage_tracking')
        .select('*')
        .eq('user_id', user.id)
        .order('billing_period_start', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        // If no record is found, it's not a critical error.
        // It could just mean the user is new.
        if (error.code === 'PGRST116') {
          console.warn('No usage tracking record found for user:', user.id);
          return null;
        }
        throw error;
      }

      if (!data) return null;

      return {
        userId: user.id,
        phoneCallsUsed: data.calls_used ?? 0,
        textChainsUsed: data.texts_used ?? 0,
        emailsUsed: data.emails_used ?? 0,
        phoneCallsLimit: data.phone_calls_limit ?? 0,
        textChainsLimit: data.text_chains_limit ?? 0,
        emailsLimit: data.emails_limit ?? 0,
        billingPeriodStart: new Date(data.billing_period_start),
        billingPeriodEnd: new Date(data.billing_period_end)
      };
    } catch (error) {
      console.error('Error fetching usage:', error);
      return null;
    }
  }

  // Check if user can perform an action
  async canPerformAction(actionType: 'phone_call' | 'text_chain' | 'email'): Promise<boolean> {
    try {
      const usage = await this.getCurrentUsage()
      if (!usage) return false

      switch (actionType) {
        case 'phone_call':
          return usage.phoneCallsLimit === -1 || usage.phoneCallsUsed < usage.phoneCallsLimit
        case 'text_chain':
          return usage.textChainsLimit === -1 || usage.textChainsUsed < usage.textChainsLimit
        case 'email':
          return usage.emailsLimit === -1 || usage.emailsUsed < usage.emailsLimit
        default:
          return false
      }
    } catch (error) {
      console.error('Error checking action permission:', error)
      return false
    }
  }

  // Get current user's subscription plan ID
  async getCurrentPlanId(): Promise<string | null> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser()
      if (!user) return null

      const { data, error } = await this.supabase
        .from('users')
        .select('subscription_plan_id')
        .eq('id', user.id)
        .single()

      if (error) throw error
      return data.subscription_plan_id
    } catch (error) {
      console.error('Error fetching current plan:', error)
      return null
    }
  }

  // Get current user's billing interval
  async getCurrentBillingInterval(): Promise<string> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser()
      if (!user) return 'monthly'

      const { data, error } = await this.supabase
        .from('users')
        .select('billing_interval')
        .eq('id', user.id)
        .single()

      if (error) {
        console.error('Error fetching billing interval:', error)
        return 'monthly'
      }

      // Return the billing interval, defaulting to 'monthly' if null
      return data.billing_interval || 'monthly'
    } catch (error) {
      console.error('Error in getCurrentBillingInterval:', error)
      return 'monthly'
    }
  }

  // Get user's subscription status and billing info
  async getSubscriptionStatus(): Promise<{
    subscriptionPlanId: string
    subscriptionStatus: string
    billingCycleStart: Date | null
    billingCycleEnd: Date | null
    stripeCustomerId: string | null
  } | null> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser()
      if (!user) return null

      const { data, error } = await this.supabase
        .from('users')
        .select('subscription_plan_id, subscription_status, billing_cycle_start, billing_cycle_end, stripe_customer_id')
        .eq('id', user.id)
        .single()

      if (error) throw error

      return {
        subscriptionPlanId: data.subscription_plan_id,
        subscriptionStatus: data.subscription_status,
        billingCycleStart: data.billing_cycle_start ? new Date(data.billing_cycle_start) : null,
        billingCycleEnd: data.billing_cycle_end ? new Date(data.billing_cycle_end) : null,
        stripeCustomerId: data.stripe_customer_id
      }
    } catch (error) {
      console.error('Error fetching subscription status:', error)
      return null
    }
  }

  // Get pending plan change for current user
  async getPendingPlanChange(): Promise<PendingPlanChange | null> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser()
      if (!user) return null

      const { data, error } = await this.supabase
        .from('users')
        .select('pending_plan_id, plan_change_effective_date, plan_change_type, plan_change_requested_at')
        .eq('id', user.id)
        .single()

      if (error) throw error

      // Return null if no pending change
      if (!data.pending_plan_id || !data.plan_change_effective_date) {
        return null
      }

      return {
        targetPlanId: data.pending_plan_id,
        effectiveDate: new Date(data.plan_change_effective_date),
        changeType: data.plan_change_type as 'upgrade' | 'downgrade' | 'cancel',
        requestedAt: new Date(data.plan_change_requested_at)
      }
    } catch (error) {
      console.error('Error fetching pending plan change:', error)
      return null
    }
  }
} 