import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_stripe/flutter_stripe.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

class StripePaymentService {
  // Get publishable key from environment variables
  static String get _publishableKey => dotenv.env['STRIPE_PUBLISHABLE_KEY'] ?? '';
  static String get _merchantId => dotenv.env['STRIPE_MERCHANT_ID'] ?? 'merchant.com.talkah.appfortalking';

  static Future<void> init() async {
    debugPrint('🚀 STRIPE INIT: Initializing Stripe...');
    
    if (_publishableKey.isEmpty) {
      throw Exception('STRIPE_PUBLISHABLE_KEY must be provided in .env file');
    }
    
    debugPrint('🔑 STRIPE INIT: Publishable Key: ${_publishableKey.substring(0, 20)}...');
    debugPrint('🏪 STRIPE INIT: Merchant ID: $_merchantId');
    
    Stripe.publishableKey = _publishableKey;
    
    // Configure Apple Pay if on iOS
    if (Platform.isIOS) {
      debugPrint('🍎 STRIPE INIT: Configuring Apple Pay for iOS');
      Stripe.merchantIdentifier = _merchantId;
    } else {
      debugPrint('🤖 STRIPE INIT: Not iOS, skipping Apple Pay configuration');
    }
    
    try {
      await Stripe.instance.applySettings();
      debugPrint('✅ STRIPE INIT: Stripe initialized successfully');
    } catch (e) {
      debugPrint('❌ STRIPE INIT: Failed to initialize Stripe: $e');
      rethrow;
    }
  }

  /// Check if Apple Pay/Google Pay is available (Platform Pay)
  static Future<bool> isPlatformPaySupported() async {
    try {
      return await Stripe.instance.isPlatformPaySupported();
    } catch (e) {
      debugPrint('Error checking platform pay support: $e');
      return false;
    }
  }

  /// Create subscription via Supabase Edge Function (secure)
  static Future<Map<String, dynamic>> createSubscription({
    required String email,
    required String userId,
    required String planType,
    required bool isYearly,
  }) async {
    try {
      final response = await Supabase.instance.client.functions.invoke(
        'create-stripe-subscription',
        body: {
          'email': email,
          'userId': userId,
          'planType': planType,
          'isYearly': isYearly,
        },
      );

      if (response.data == null) {
        throw Exception('Failed to create subscription');
      }

      return response.data;
    } catch (e) {
      debugPrint('Error creating subscription: $e');
      rethrow;
    }
  }

  /// Process payment with Platform Pay (Apple Pay / Google Pay)
  static Future<bool> processPlatformPayPayment({
    required String clientSecret,
    required String email,
    required double amount,
    required String planName,
  }) async {
    try {
      // Configure Platform Pay parameters based on platform
      PlatformPayConfirmParams confirmParams;
      
      if (Platform.isIOS) {
        // Apple Pay configuration
        confirmParams = PlatformPayConfirmParams.applePay(
          applePay: ApplePayParams(
            merchantCountryCode: 'US',
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
            merchantCountryCode: 'US',
            currencyCode: 'USD',
            testEnv: kDebugMode, // Use test environment in debug mode
          ),
        );
      }

      // Confirm Platform Pay payment
      final paymentIntent = await Stripe.instance.confirmPlatformPayPaymentIntent(
        clientSecret: clientSecret,
        confirmParams: confirmParams,
      );

      return paymentIntent.status == PaymentIntentsStatus.Succeeded;
    } on StripeException catch (e) {
      debugPrint('Platform Pay error: ${e.error.localizedMessage}');
      if (e.error.code == FailureCode.Canceled) {
        // User canceled payment
        return false;
      }
      rethrow;
    } catch (e) {
      debugPrint('Platform Pay payment error: $e');
      rethrow;
    }
  }

  /// Process payment for subscription (fallback for card payments)
  static Future<bool> confirmPayment({
    required String clientSecret,
    required String email,
  }) async {
    try {
      await Stripe.instance.confirmPayment(
        paymentIntentClientSecret: clientSecret,
        data: PaymentMethodParams.card(
          paymentMethodData: PaymentMethodData(
            billingDetails: BillingDetails(
              email: email,
            ),
          ),
        ),
      );
      return true;
    } on StripeException catch (e) {
      debugPrint('Stripe payment error: ${e.error.localizedMessage}');
      return false;
    } catch (e) {
      debugPrint('Payment confirmation error: $e');
      return false;
    }
  }

  /// Get pricing for display
  static Map<String, double> getPricing() {
    return {
      'pro_monthly': 8.99,
      'pro_yearly': 79.99,
      'premium_monthly': 14.99,
      'premium_yearly': 119.99,
    };
  }

  /// Calculate yearly savings
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

  /// Cancel subscription via Supabase Edge Function
  static Future<bool> cancelSubscription() async {
    try {
      final user = Supabase.instance.client.auth.currentUser;
      if (user == null) return false;

      final response = await Supabase.instance.client.functions.invoke(
        'cancel-stripe-subscription',
        body: {'userId': user.id},
      );

      return response.data?['success'] == true;
    } catch (e) {
      debugPrint('Error canceling subscription: $e');
      return false;
    }
  }

  /// Update subscription via Supabase Edge Function
  static Future<bool> updateSubscription({
    required String planType,
    required bool isYearly,
  }) async {
    try {
      final user = Supabase.instance.client.auth.currentUser;
      if (user == null) return false;

      final response = await Supabase.instance.client.functions.invoke(
        'update-stripe-subscription',
        body: {
          'userId': user.id,
          'planType': planType,
          'isYearly': isYearly,
        },
      );

      return response.data?['success'] == true;
    } catch (e) {
      debugPrint('Error updating subscription: $e');
      return false;
    }
  }
} 