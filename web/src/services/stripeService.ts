import { createClient } from '@/lib/supabase'

export class StripeService {
  private supabase = createClient()

  // Get pricing for display
  static getPricing() {
    return {
      'pro_monthly': 8.99,
      'pro_yearly': 79.99,
      'premium_monthly': 14.99,
      'premium_yearly': 119.99,
    }
  }

  // Calculate yearly savings
  static getYearlySavings(planType: string): number {
    const pricing = this.getPricing()
    if (planType === 'pro') {
      const monthly = pricing['pro_monthly']! * 12
      const yearly = pricing['pro_yearly']!
      return monthly - yearly
    } else if (planType === 'premium') {
      const monthly = pricing['premium_monthly']! * 12
      const yearly = pricing['premium_yearly']!
      return monthly - yearly
    }
    return 0
  }

  // Create subscription via Supabase Edge Function
  async createSubscription({
    email,
    userId,
    planType,
    isYearly,
    platform = 'web',
  }: {
    email: string
    userId: string
    planType: string
    isYearly: boolean
    platform?: string
  }) {
    try {
      // Debug: log user and session
      const { data: authUser, error: authError } = await this.supabase.auth.getUser()
      const { data: sessionData, error: sessionError } = await this.supabase.auth.getSession()
      console.log('[StripeService] Supabase auth.getUser:', authUser, 'error:', authError)
      console.log('[StripeService] Supabase auth.getSession:', sessionData, 'error:', sessionError)

      const { data, error } = await this.supabase.functions.invoke(
        'create-stripe-subscription',
        {
          body: {
            email,
            userId,
            planType,
            isYearly,
            platform,
          },
        }
      )

      if (error) {
        console.error('[StripeService] Supabase function error:', error)
        console.error('[StripeService] Supabase function data:', data)
        throw error
      }
      return data
    } catch (error) {
      console.error('Error creating subscription:', error)
      throw error
    }
  }

  // Cancel subscription via Supabase Edge Function
  async cancelSubscription() {
    try {
      const { data, error } = await this.supabase.functions.invoke(
        'cancel-stripe-subscription'
      )

      if (error) throw error
      return data?.success === true
    } catch (error) {
      console.error('Error canceling subscription:', error)
      return false
    }
  }

  // Update subscription via Supabase Edge Function
  async updateSubscription({
    planType,
    isYearly,
  }: {
    planType: string
    isYearly: boolean
  }) {
    try {
      const { data, error } = await this.supabase.functions.invoke(
        'update-stripe-subscription',
        {
          body: {
            planType,
            isYearly,
          },
        }
      )

      if (error) throw error
      return data?.success === true
    } catch (error) {
      console.error('Error updating subscription:', error)
      return false
    }
  }

  // Create Stripe Customer Portal session for subscription management
  async createCustomerPortalSession() {
    try {
      const { data, error } = await this.supabase.functions.invoke(
        'create-customer-portal-session'
      )

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error creating customer portal session:', error)
      throw error
    }
  }
} 