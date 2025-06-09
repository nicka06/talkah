import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter_stripe/flutter_stripe.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class StripePaymentService {
  // Only publishable key is safe to use in client-side code
  static const String _publishableKey = 'pk_test_51RY9qA04AHhaKcz1q2v3nQQVXzM3UqSDZNZKUy0u4SfbpBSJO6Kct5AQeNnZZKEKsaEWTjAWC0MG3BwvCK9m3dFN00lAJwkgN9'; // Your actual publishable key
  static const String _merchantId = 'merchant.com.yourcompany.appfortalking'; // Replace with your actual merchant ID

  static Future<void> init() async {
    Stripe.publishableKey = _publishableKey;
    
    // Configure Apple Pay if on iOS
    if (Platform.isIOS) {
      Stripe.merchantIdentifier = _merchantId;
    }
    
    await Stripe.instance.applySettings();
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