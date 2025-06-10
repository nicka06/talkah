import 'dart:developer' as dev;
import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/subscription_plan.dart';
import '../models/usage_tracking.dart';

class SubscriptionService {
  final SupabaseClient _supabase = Supabase.instance.client;

  // Get all available subscription plans
  Future<List<SubscriptionPlan>> getSubscriptionPlans() async {
    try {
      dev.log('🔄 SubscriptionService: Fetching subscription plans...');
      
      final response = await _supabase
          .from('subscription_plans')
          .select()
          .eq('is_active', true)
          .order('sort_order', ascending: true);

      final plans = (response as List<dynamic>)
          .map((json) => SubscriptionPlan.fromJson(json))
          .toList();

      dev.log('✅ SubscriptionService: Retrieved ${plans.length} plans');
      return plans;
    } catch (e) {
      dev.log('❌ SubscriptionService: Error fetching plans: $e');
      rethrow;
    }
  }

  // Get current user's usage and limits
  Future<UsageTracking?> getCurrentUsage() async {
    try {
      final userId = _supabase.auth.currentUser?.id;
      if (userId == null) {
        dev.log('❌ SubscriptionService: No authenticated user');
        return null;
      }

      dev.log('🔄 SubscriptionService: Fetching usage for user $userId...');
      
      final response = await _supabase
          .rpc('get_current_month_usage', params: {'user_uuid': userId});

      if (response == null || (response as List).isEmpty) {
        dev.log('⚠️ SubscriptionService: No usage data found');
        return null;
      }

      final usageData = (response as List).first;
      
      final callsUsed = usageData['calls_used'] ?? 0;
      final textsUsed = usageData['texts_used'] ?? 0;
      final emailsUsed = usageData['emails_used'] ?? 0;
      final tier = usageData['tier'] ?? 'free';
      
      final limits = {
        'free': {'calls': 1, 'texts': 1, 'emails': 1},
        'pro': {'calls': 5, 'texts': 10, 'emails': -1},
        'premium': {'calls': -1, 'texts': -1, 'emails': -1}
      };
      
      final tierLimits = limits[tier] ?? limits['free']!;
      
      final now = DateTime.now();
      final billingStart = DateTime(now.year, now.month, 1);
      final billingEnd = DateTime(now.year, now.month + 1, 0);
      
      final usage = UsageTracking(
        userId: userId,
        phoneCallsUsed: callsUsed,
        textChainsUsed: textsUsed,
        emailsUsed: emailsUsed,
        phoneCallsLimit: tierLimits['calls']!,
        textChainsLimit: tierLimits['texts']!,
        emailsLimit: tierLimits['emails']!,
        billingPeriodStart: billingStart,
        billingPeriodEnd: billingEnd,
      );
      
      dev.log('✅ SubscriptionService: Usage retrieved - Phone: ${usage.phoneCallsDisplay}, Text: ${usage.textChainsDisplay}, Email: ${usage.emailsDisplay}');
      return usage;
    } catch (e) {
      dev.log('❌ SubscriptionService: Error fetching usage: $e');
      rethrow;
    }
  }

  // Check if user can perform an action (returns true if allowed, false if at limit)
  Future<bool> canPerformAction(String actionType) async {
    try {
      final usage = await getCurrentUsage();
      if (usage == null) return false;

      switch (actionType.toLowerCase()) {
        case 'phone_call':
          return usage.hasPhoneCallsRemaining;
        case 'text_chain':
          return usage.hasTextChainsRemaining;
        case 'email':
          return usage.hasEmailsRemaining;
        default:
          dev.log('⚠️ SubscriptionService: Unknown action type: $actionType');
          return false;
      }
    } catch (e) {
      dev.log('❌ SubscriptionService: Error checking action permission: $e');
      return false;
    }
  }

  // Increment usage for a specific action
  Future<bool> incrementUsage(String actionType, {int amount = 1}) async {
    try {
      final userId = _supabase.auth.currentUser?.id;
      if (userId == null) {
        dev.log('❌ SubscriptionService: No authenticated user');
        return false;
      }

      dev.log('🔄 SubscriptionService: Incrementing $actionType usage by $amount for user $userId...');
      
      // TODO: The old system didn't have working increment functions
      // For now, just return true so the app doesn't crash
      // The increment was happening directly in the Edge Functions
      dev.log('⚠️ SubscriptionService: Increment function disabled - using Edge Function increments');
      return true;
      
      /*
      final response = await _supabase.rpc('increment_usage', params: {
        'p_user_id': userId,
        'p_usage_type': actionType,
        'p_amount': amount,
      });

      final success = response as bool;
      if (success) {
        dev.log('✅ SubscriptionService: Usage incremented successfully');
      } else {
        dev.log('❌ SubscriptionService: Usage increment failed (likely at limit)');
      }
      
      return success;
      */
    } catch (e) {
      dev.log('❌ SubscriptionService: Error incrementing usage: $e');
      return false;
    }
  }

  // Get current user's subscription plan ID
  Future<String?> getCurrentPlanId() async {
    try {
      final userId = _supabase.auth.currentUser?.id;
      if (userId == null) return null;

      final response = await _supabase
          .from('users')
          .select('subscription_plan_id')
          .eq('id', userId)
          .single();

      return response['subscription_plan_id'] as String?;
    } catch (e) {
      dev.log('❌ SubscriptionService: Error fetching current plan: $e');
      return null;
    }
  }

  // Update user's subscription plan
  Future<bool> updateSubscriptionPlan(String planId) async {
    try {
      final userId = _supabase.auth.currentUser?.id;
      if (userId == null) return false;

      dev.log('🔄 SubscriptionService: Updating subscription to $planId for user $userId...');

      await _supabase
          .from('users')
          .update({
            'subscription_plan_id': planId,
            'updated_at': DateTime.now().toIso8601String(),
          })
          .eq('id', userId);

      dev.log('✅ SubscriptionService: Subscription updated successfully');
      return true;
    } catch (e) {
      dev.log('❌ SubscriptionService: Error updating subscription: $e');
      return false;
    }
  }

  // Get user's subscription status and billing info
  Future<Map<String, dynamic>?> getSubscriptionStatus() async {
    try {
      final userId = _supabase.auth.currentUser?.id;
      if (userId == null) return null;

      final response = await _supabase
          .from('users')
          .select('subscription_plan_id, subscription_status, billing_cycle_start, billing_cycle_end, stripe_customer_id')
          .eq('id', userId)
          .single();

      return response;
    } catch (e) {
      dev.log('❌ SubscriptionService: Error fetching subscription status: $e');
      return null;
    }
  }

  // Record a subscription event for audit trail
  Future<void> recordSubscriptionEvent({
    required String eventType,
    required String planId,
    String? previousPlanId,
    Map<String, dynamic>? metadata,
  }) async {
    try {
      final userId = _supabase.auth.currentUser?.id;
      if (userId == null) return;

      await _supabase.from('subscription_events').insert({
        'user_id': userId,
        'event_type': eventType,
        'subscription_plan_id': planId,
        'previous_plan_id': previousPlanId,
        'metadata': metadata,
        'created_at': DateTime.now().toIso8601String(),
      });

      dev.log('✅ SubscriptionService: Event recorded: $eventType');
    } catch (e) {
      dev.log('❌ SubscriptionService: Error recording event: $e');
    }
  }
} 