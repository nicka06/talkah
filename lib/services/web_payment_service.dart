import 'dart:io';
import 'package:url_launcher/url_launcher.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'dart:developer' as dev;

/// Web Payment Service
/// 
/// This service handles redirecting users to Stripe's web pages for payments.
/// Instead of using native Stripe SDK, we redirect to:
/// - Stripe Checkout for new subscriptions/upgrades
/// - Stripe Customer Portal for downgrades/cancellations
/// 
/// This approach:
/// - Bypasses Apple IAP requirements
/// - Uses Stripe's secure hosted pages
/// - Maintains consistent payment experience
/// - Reduces app complexity
class WebPaymentService {
  static const String _webAppUrl = 'https://talkah.com';
  
  /// Open Stripe Checkout for new subscription or upgrade
  /// 
  /// This creates a Stripe Checkout session and redirects the user directly to it.
  /// The user will see Stripe's secure payment form with the selected plan.
  /// 
  /// Parameters:
  /// - planType: 'pro' or 'premium'
  /// - isYearly: true for yearly, false for monthly
  /// 
  /// Returns: true if URL opened successfully, false otherwise
  static Future<bool> openStripeCheckout({
    required String planType,
    required bool isYearly,
  }) async {
    try {
      dev.log('🚀 WebPayment: Starting openStripeCheckout with planType=$planType, isYearly=$isYearly');
      
      final user = Supabase.instance.client.auth.currentUser;
      if (user == null) {
        dev.log('❌ WebPayment: User not authenticated');
        return false;
      }

      dev.log('✅ WebPayment: User authenticated - ID: ${user.id}, Email: ${user.email}');
      dev.log('🔄 WebPayment: Creating Stripe Checkout session for $planType ${isYearly ? 'yearly' : 'monthly'}');

      // Prepare request body
      final requestBody = {
        'email': user.email,
        'userId': user.id,
        'planType': planType,
        'isYearly': isYearly,
        'platform': 'mobile_web', // Indicates this is from mobile app
      };
      
      dev.log('📤 WebPayment: Sending request to create-stripe-subscription with body: $requestBody');

      // Create Stripe Checkout session via Supabase function
      final response = await Supabase.instance.client.functions.invoke(
        'create-stripe-subscription',
        body: requestBody,
      );

      dev.log('📥 WebPayment: Received response from Supabase function');
      dev.log('📥 WebPayment: Response status: ${response.status}');
      dev.log('📥 WebPayment: Response data: ${response.data}');

      if (response.status != null && response.status != 200) {
        dev.log('❌ WebPayment: HTTP error ${response.status}');
        return false;
      }

      if (response.data == null) {
        dev.log('❌ WebPayment: Response data is null');
        return false;
      }

      if (response.data is! Map<String, dynamic>) {
        dev.log('❌ WebPayment: Response data is not a Map, got: ${response.data.runtimeType}');
        return false;
      }

      final responseData = response.data as Map<String, dynamic>;
      
      if (responseData.containsKey('error')) {
        dev.log('❌ WebPayment: Function returned error: ${responseData['error']}');
        return false;
      }

      if (!responseData.containsKey('url') || responseData['url'] == null) {
        dev.log('❌ WebPayment: No URL in response. Available keys: ${responseData.keys.toList()}');
        return false;
      }

      final checkoutUrl = responseData['url'] as String;
      dev.log('✅ WebPayment: Stripe Checkout URL created: $checkoutUrl');

      // Validate URL format
      if (!checkoutUrl.startsWith('https://')) {
        dev.log('❌ WebPayment: Invalid URL format: $checkoutUrl');
        return false;
      }

      // Open Stripe Checkout in browser (this will be https://checkout.stripe.com/...)
      final uri = Uri.parse(checkoutUrl);
      dev.log('🔗 WebPayment: Attempting to open URL: $uri');
      
      final canLaunch = await canLaunchUrl(uri);
      dev.log('🔗 WebPayment: canLaunchUrl result: $canLaunch');
      
      if (canLaunch) {
        dev.log('🚀 WebPayment: Launching URL with mode: externalApplication');
        await launchUrl(
          uri,
          mode: LaunchMode.externalApplication,
        );
        dev.log('✅ WebPayment: Stripe Checkout opened successfully');
        return true;
      } else {
        dev.log('❌ WebPayment: Could not launch Stripe Checkout URL: $checkoutUrl');
        return false;
      }
    } catch (e, stackTrace) {
      dev.log('❌ WebPayment: Exception in openStripeCheckout: $e');
      dev.log('❌ WebPayment: Stack trace: $stackTrace');
      return false;
    }
  }

  /// Open Stripe Customer Portal for subscription management
  /// 
  /// This creates a Stripe Customer Portal session and redirects the user to it.
  /// Users can manage their subscription, update payment methods, view invoices,
  /// and cancel their subscription from this portal.
  /// 
  /// Returns: true if URL opened successfully, false otherwise
  static Future<bool> openStripeCustomerPortal() async {
    try {
      final user = Supabase.instance.client.auth.currentUser;
      if (user == null) {
        dev.log('❌ WebPayment: User not authenticated');
        return false;
      }

      dev.log('🔄 WebPayment: Creating Stripe Customer Portal session');

      // Create Customer Portal session via Supabase function
      final response = await Supabase.instance.client.functions.invoke(
        'create-customer-portal-session',
        body: {
          'userId': user.id,
          'returnUrl': 'https://talkah.com/dashboard/subscription?source=mobile',
        },
      );

      if (response.data == null || response.data['url'] == null) {
        dev.log('❌ WebPayment: Failed to create Customer Portal session');
        return false;
      }

      final portalUrl = response.data['url'];
      dev.log('✅ WebPayment: Customer Portal URL created: $portalUrl');

      // Open Customer Portal in browser
      final uri = Uri.parse(portalUrl);
      if (await canLaunchUrl(uri)) {
        await launchUrl(
          uri,
          mode: LaunchMode.externalApplication,
        );
        dev.log('✅ WebPayment: Customer Portal opened successfully');
        return true;
      } else {
        dev.log('❌ WebPayment: Could not open Customer Portal URL');
        return false;
      }
    } catch (e) {
      dev.log('❌ WebPayment: Error opening Customer Portal: $e');
      return false;
    }
  }

  /// Check if user has an active subscription
  /// 
  /// This method checks the user's subscription status in the database.
  /// Useful for determining if user can access Customer Portal.
  /// 
  /// Returns: true if user has active subscription, false otherwise
  static Future<bool> hasActiveSubscription() async {
    try {
      final user = Supabase.instance.client.auth.currentUser;
      if (user == null) return false;

      final response = await Supabase.instance.client
          .from('users')
          .select('subscription_plan_id, subscription_status')
          .eq('id', user.id)
          .single();

      final planId = response['subscription_plan_id'];
      final status = response['subscription_status'];

      return planId != 'free' && status == 'active';
    } catch (e) {
      dev.log('❌ WebPayment: Error checking subscription status: $e');
      return false;
    }
  }

  /// Get pricing information for display in the app
  /// 
  /// This provides consistent pricing across the app.
  /// Used for displaying plan costs before redirecting to Stripe.
  static Map<String, double> getPricing() {
    return {
      'pro_monthly': 8.99,
      'pro_yearly': 79.99,
      'premium_monthly': 14.99,
      'premium_yearly': 119.99,
    };
  }

  /// Calculate yearly savings for a plan
  /// 
  /// Shows users how much they save by choosing yearly over monthly.
  /// Used for displaying savings in the UI.
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

  /// Get plan display name
  /// 
  /// Converts plan type to user-friendly display name.
  static String getPlanDisplayName(String planType, bool isYearly) {
    final planName = planType == 'pro' ? 'Pro' : 'Premium';
    final interval = isYearly ? 'Yearly' : 'Monthly';
    return '$planName $interval';
  }

  /// Get plan price for display
  /// 
  /// Returns the price for a specific plan and interval.
  static double getPlanPrice(String planType, bool isYearly) {
    final pricing = getPricing();
    final planKey = '${planType}_${isYearly ? 'yearly' : 'monthly'}';
    return pricing[planKey] ?? 0.0;
  }
} 