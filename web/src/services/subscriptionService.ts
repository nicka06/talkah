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
        .eq('is_active', true)
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
          createdAt: new Date(plan.created_at),
          updatedAt: new Date(plan.updated_at)
        }
      })
    } catch (error) {
      console.error('Error fetching subscription plans:', error)
      throw error
    }
  }

  // Get current user's usage and limits
  async getCurrentUsage(): Promise<UsageTracking | null> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser()
      if (!user) return null

      const { data, error } = await this.supabase
        .rpc('get_current_month_usage', { user_uuid: user.id })

      if (error) throw error
      if (!data || data.length === 0) return null

      const usageData = data[0]
      const tier = usageData.tier || 'free'

      const limits = {
        free: { calls: 1, texts: 1, emails: 1 },
        pro: { calls: 5, texts: 10, emails: -1 },
        premium: { calls: -1, texts: -1, emails: -1 }
      }

      const tierLimits = limits[tier as keyof typeof limits] || limits.free

      const now = new Date()
      const billingStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const billingEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)

      return {
        userId: user.id,
        phoneCallsUsed: usageData.calls_used || 0,
        textChainsUsed: usageData.texts_used || 0,
        emailsUsed: usageData.emails_used || 0,
        phoneCallsLimit: tierLimits.calls,
        textChainsLimit: tierLimits.texts,
        emailsLimit: tierLimits.emails,
        billingPeriodStart: billingStart,
        billingPeriodEnd: billingEnd
      }
    } catch (error) {
      console.error('Error fetching usage:', error)
      return null
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
} 