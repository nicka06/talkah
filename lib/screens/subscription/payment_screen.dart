import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_stripe/flutter_stripe.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../services/stripe_payment_service.dart';
import '../../services/subscription_service.dart';

class PaymentScreen extends StatefulWidget {
  final String planType; // 'pro' or 'premium'
  final bool isYearly;

  const PaymentScreen({
    super.key,
    required this.planType,
    required this.isYearly,
  });

  @override
  State<PaymentScreen> createState() => _PaymentScreenState();
}

class _PaymentScreenState extends State<PaymentScreen> {
  bool _isProcessing = false;
  bool _isPlatformPaySupported = false;
  String? _planDisplayName;
  double? _amount;

  @override
  void initState() {
    super.initState();
    _initializeData();
    _checkPlatformPaySupport();
  }

  void _initializeData() {
    final pricing = StripePaymentService.getPricing();
    final key = '${widget.planType}_${widget.isYearly ? 'yearly' : 'monthly'}';
    _amount = pricing[key];
    
    _planDisplayName = widget.planType == 'pro' ? 'Pro' : 'Premium';
    if (widget.isYearly) {
      _planDisplayName = '$_planDisplayName Annual';
    } else {
      _planDisplayName = '$_planDisplayName Monthly';
    }
  }

  Future<void> _checkPlatformPaySupport() async {
    final isSupported = await StripePaymentService.isPlatformPaySupported();
    if (mounted) {
      setState(() {
        _isPlatformPaySupported = isSupported;
      });
    }
  }

  void _handlePaymentPress() {
    if (!_isProcessing) {
      _processPayment();
    }
  }

  Future<void> _processPayment() async {
    if (_isProcessing || _amount == null) return;

    setState(() {
      _isProcessing = true;
    });

    try {
      final user = Supabase.instance.client.auth.currentUser;
      if (user == null) {
        throw Exception('User not authenticated');
      }

      // Create subscription and get client secret
      final subscriptionData = await StripePaymentService.createSubscription(
        email: user.email ?? '',
        userId: user.id,
        planType: widget.planType,
        isYearly: widget.isYearly,
      );

      final clientSecret = subscriptionData['client_secret'];
      if (clientSecret == null) {
        throw Exception('Failed to get payment intent');
      }

      // Process payment with Platform Pay (Apple Pay / Google Pay)
      final success = await StripePaymentService.processPlatformPayPayment(
        clientSecret: clientSecret,
        email: user.email ?? '',
        amount: _amount!,
        planName: _planDisplayName!,
      );

      if (mounted) {
        if (success) {
          // Refresh subscription status
          await SubscriptionService().getSubscriptionStatus();
          
          _showSuccessDialog();
        } else {
          _showErrorDialog('Payment was not completed. Please try again.');
        }
      }
    } catch (e) {
      if (mounted) {
        _showErrorDialog('Payment failed: ${e.toString()}');
      }
    } finally {
      if (mounted) {
        setState(() {
          _isProcessing = false;
        });
      }
    }
  }

  void _showSuccessDialog() {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        icon: const Icon(
          Icons.check_circle,
          color: Colors.green,
          size: 64,
        ),
        title: const Text('Payment Successful!'),
        content: Text(
          'Welcome to $_planDisplayName! Your subscription is now active.',
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.of(context).pop(); // Close dialog
              Navigator.of(context).pop(); // Close payment screen
              Navigator.of(context).pop(); // Close subscription screen
            },
            child: const Text('Continue'),
          ),
        ],
      ),
    );
  }

  void _showErrorDialog(String message) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        icon: const Icon(
          Icons.error,
          color: Colors.red,
          size: 64,
        ),
        title: const Text('Payment Failed'),
        content: Text(message),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final savings = widget.isYearly 
        ? StripePaymentService.getYearlySavings(widget.planType)
        : 0.0;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Complete Payment'),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Plan Summary Card
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: widget.planType == 'pro'
                        ? [Colors.blue.shade400, Colors.blue.shade600]
                        : [Colors.purple.shade400, Colors.purple.shade600],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(
                      color: (widget.planType == 'pro' ? Colors.blue : Colors.purple)
                          .withOpacity(0.3),
                      blurRadius: 10,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(
                          widget.planType == 'pro' ? Icons.star : Icons.diamond,
                          color: Colors.white,
                          size: 28,
                        ),
                        const SizedBox(width: 12),
                        Text(
                          _planDisplayName ?? '',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 24,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          '\$${_amount?.toStringAsFixed(2) ?? '0.00'}',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 36,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          widget.isYearly ? '/year' : '/month',
                          style: const TextStyle(
                            color: Colors.white70,
                            fontSize: 16,
                          ),
                        ),
                      ],
                    ),
                    if (widget.isYearly && savings > 0) ...[
                      const SizedBox(height: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.2),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          'Save \$${savings.toStringAsFixed(2)} per year',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ),

              const SizedBox(height: 32),

              // Payment Method Section
              const Text(
                'Payment Method',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 16),

              // Platform Pay Button (Apple Pay / Google Pay)
              if (_isPlatformPaySupported) ...[
                Container(
                  width: double.infinity,
                  height: 56,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(12),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.1),
                        blurRadius: 8,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: PlatformPayButton(
                    type: Platform.isIOS 
                        ? PlatformButtonType.buy 
                        : PlatformButtonType.pay,
                    onPressed: _handlePaymentPress,
                  ),
                ),
                const SizedBox(height: 24),

                // Security Features
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.green.shade50,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: Colors.green.shade200,
                      width: 1,
                    ),
                  ),
                  child: Column(
                    children: [
                      Row(
                        children: [
                          Icon(
                            Icons.security,
                            color: Colors.green.shade700,
                            size: 20,
                          ),
                          const SizedBox(width: 8),
                          Text(
                            Platform.isIOS ? 'Secured with Apple Pay' : 'Secured with Google Pay',
                            style: TextStyle(
                              color: Colors.green.shade700,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Your payment information is encrypted and never stored on our servers. ${Platform.isIOS ? 'Touch ID, Face ID, or' : 'Fingerprint or'} device PIN required.',
                        style: TextStyle(
                          color: Colors.green.shade600,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ),
              ] else ...[
                // Fallback for unsupported devices
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: Colors.orange.shade50,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: Colors.orange.shade200,
                      width: 1,
                    ),
                  ),
                  child: Column(
                    children: [
                      Icon(
                        Icons.info,
                        color: Colors.orange.shade700,
                        size: 32,
                      ),
                      const SizedBox(height: 12),
                      Text(
                        Platform.isIOS ? 'Apple Pay Not Available' : 'Google Pay Not Available',
                        style: TextStyle(
                          color: Colors.orange.shade700,
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        Platform.isIOS 
                            ? 'Please set up Apple Pay in your device settings to use this secure payment method.'
                            : 'Please set up Google Pay in your device settings to use this secure payment method.',
                        style: TextStyle(
                          color: Colors.orange.shade600,
                          fontSize: 14,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ],
                  ),
                ),
              ],

              const Spacer(),

              // Processing Indicator
              if (_isProcessing) ...[
                const Center(
                  child: Column(
                    children: [
                      CircularProgressIndicator(),
                      SizedBox(height: 16),
                      Text(
                        'Processing payment...',
                        style: TextStyle(
                          fontSize: 16,
                          color: Colors.grey,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
} 