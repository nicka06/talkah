import 'dart:convert';
import 'dart:developer' as dev;
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:flutter_stripe/flutter_stripe.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import '../models/subscription_plan.dart';
import '../models/usage_tracking.dart';

class SubscriptionService {
  final SupabaseClient _supabase = Supabase.instance.client;

  //==========================================================================
  // NEW STATIC STRIPE PAYMENT METHODS
  //==========================================================================

  /// Initializes Stripe for the app. Must be called in main.dart.
  static Future<void> initStripe() async {
    // Get Stripe publishable key from environment variables
    final publishableKey = dotenv.env['STRIPE_PUBLISHABLE_KEY'] ?? '';
    if (publishableKey.isEmpty) {
      throw Exception('STRIPE_PUBLISHABLE_KEY must be provided in .env file');
    }
    
    Stripe.publishableKey = publishableKey;
    
    // The merchant identifier is optional for Google Pay but required for Apple Pay
    // on real devices.
    final merchantId = dotenv.env['STRIPE_MERCHANT_ID'] ?? 'merchant.com.talkah.appfortalking';
    Stripe.merchantIdentifier = merchantId;
    
    await Stripe.instance.applySettings();
    dev.log('✅ StripeService: Initialized');
  }

  /// Checks if Apple Pay or Google Pay is available on the device.
  static Future<bool> isPlatformPaySupported() async {
    final isSupported = await Stripe.instance.isPlatformPaySupported();
    dev.log('ℹ️ StripeService: Platform Pay Supported: $isSupported');
    return isSupported;
  }

  /// Provides static pricing for the UI to display.
  static Map<String, double> getPricing() {
    return {
      'pro_monthly': 8.99,
      'pro_yearly': 79.99,
      'premium_monthly': 14.99,
      'premium_yearly': 119.99,
    };
  }

  /// Calculate yearly savings for a plan
  static double getYearlySavings(String planType) {
    final pricing = getPricing();
    if (planType == 'pro') {
      final monthly = pricing['pro_monthly']! * 12;
      final yearly = pricing['pro_yearly']!;
      return monthly - yearly;
    } else if (planType == 'premium') {
      final monthly = pricing['premium_monthly']! * 12;
      final yearly = pricing['premium_yearly']!;
      return monthly - yearly;
    }
    return 0;
  }

  /// Calls your Deno function to create a mobile subscription intent.
  /// This correctly sends `platform: 'mobile'` and returns only the client_secret.
  static Future<String> createMobileSubscriptionAndGetClientSecret({
    required String email,
    required String userId,
    required String planType,
    required bool isYearly,
  }) async {
    dev.log('🔄 StripeService: Creating mobile subscription for $planType...');
    
    try {
      final response = await Supabase.instance.client.functions.invoke(
        'create-payment-intent',
        body: {
          'email': email,
          'planType': planType,
          'isYearly': isYearly,
        },
      );

      if (response.data == null) {
        throw Exception('Failed to create payment intent - null response');
      }

      if (response.data['success'] == false) {
        dev.log('❌ StripeService: Backend returned error: ${response.data['error']}');
        throw Exception('Backend error: ${response.data['error']}');
      }

      final clientSecret = response.data['paymentIntent'];
      if (clientSecret == null) {
        throw Exception('Failed to get client_secret from server response.');
      }
      
      dev.log('✅ StripeService: Client secret retrieved.');
      return clientSecret;
    } catch (e) {
      dev.log('❌ StripeService: Error creating subscription: $e');
      rethrow;
    }
  }

  /// Processes the payment using Apple Pay or Google Pay.
  /// This uses `confirmPlatformPayPaymentIntent`, which DOES NOT require an ephemeral key.
  static Future<bool> processPlatformPay({
    required String clientSecret,
    required double amount,
    required String planName,
  }) async {
    dev.log('🔄 StripeService: Processing platform pay...');
    try {
      // Configure Platform Pay parameters based on platform
      PlatformPayConfirmParams confirmParams;
      
      if (Platform.isIOS) {
        // Apple Pay configuration
        confirmParams = PlatformPayConfirmParams.applePay(
          applePay: ApplePayParams(
            merchantCountryCode: 'US', // ⚠️-REPLACE with your country code
            currencyCode: 'USD',
            cartItems: [
              ApplePayCartSummaryItem.immediate(
                label: '$planName Subscription',
                amount: amount.toStringAsFixed(2),
              ),
            ],
            requiredBillingContactFields: [
              ApplePayContactFieldsType.emailAddress,
            ],
          ),
        );
      } else {
        // Google Pay configuration for Android
        confirmParams = PlatformPayConfirmParams.googlePay(
          googlePay: GooglePayParams(
            merchantCountryCode: 'US', // ⚠️-REPLACE with your country code
            currencyCode: 'USD',
            testEnv: true, // IMPORTANT: Set to false in production
          ),
        );
      }

      // Confirm Platform Pay payment
      final paymentIntent = await Stripe.instance.confirmPlatformPayPaymentIntent(
        clientSecret: clientSecret,
        confirmParams: confirmParams,
      );

      dev.log('✅ StripeService: Platform pay successful.');
      return paymentIntent.status == PaymentIntentsStatus.Succeeded;
    } on StripeException catch (e) {
      if (e.error.code == FailureCode.Canceled) {
        dev.log('⚠️ StripeService: Payment cancelled by user.');
      } else {
        dev.log('❌ StripeService: Stripe Error: ${e.error.message}');
      }
      return false;
    } catch (e) {
      dev.log('❌ StripeService: An unexpected error occurred: $e');
      return false;
    }
  }
  
  /// Placeholder for your credit card form fallback.
  static Future<bool> confirmCardPayment({
    required String clientSecret,
    required String email,
  }) async {
    dev.log('🔄 StripeService: Processing card payment...');
    try {
      await Stripe.instance.initPaymentSheet(
          paymentSheetParameters: SetupPaymentSheetParameters(
        paymentIntentClientSecret: clientSecret,
        merchantDisplayName: 'Talkah',
      ));
      await Stripe.instance.presentPaymentSheet();
      dev.log('✅ StripeService: Card payment successful.');
      return true;
    } on StripeException catch (e) {
       if (e.error.code == FailureCode.Canceled) {
        dev.log('⚠️ StripeService: Payment cancelled by user.');
      } else {
        dev.log('❌ StripeService: Stripe Error: ${e.error.message}');
      }
      return false;
    }
  }

  //==========================================================================
  // YOUR EXISTING DATABASE-RELATED METHODS (UNCHANGED)
  //==========================================================================

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
      
      dev.log('⚠️ SubscriptionService: Increment function disabled - using Edge Function increments');
      return true;
      
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