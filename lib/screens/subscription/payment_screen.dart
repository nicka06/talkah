/// PaymentScreen - Dedicated payment processing interface
/// 
/// This screen handles the complete payment flow for subscription upgrades:
/// - Displays plan summary and pricing information
/// - Processes payments through Platform Pay (Apple Pay / Google Pay)
/// - Shows payment progress and success/failure states
/// - Integrates with Stripe for secure payment processing
/// 
/// ARCHITECTURE:
/// - Standalone payment processing screen (separate from subscription management)
/// - Uses SubscriptionService for payment operations
/// - Supports Platform Pay for enhanced user experience
/// - Handles payment state management and error recovery
/// 
/// USER FLOW:
/// 1. Display plan summary and pricing
/// 2. User initiates payment
/// 3. Create subscription on backend
/// 4. Process payment through Platform Pay
/// 5. Show success/failure feedback
/// 6. Return to previous screen
import 'dart:io';
import 'package:flutter/material.dart';
// import 'package:flutter_stripe/flutter_stripe.dart'; // COMMENTED OUT: Replaced with web payments
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../services/subscription_service.dart';
import '../../services/web_payment_service.dart'; // ADDED: Web payment service

/// Payment processing screen for subscription upgrades
class PaymentScreen extends StatefulWidget {
  /// The plan type being purchased ('pro' or 'premium')
  final String planType;
  
  /// Whether this is a yearly subscription (true) or monthly (false)
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
  /// Whether a payment is currently being processed
  bool _isProcessing = false;
  
  /// Whether the device supports Platform Pay (Apple Pay / Google Pay)
  bool _isPlatformPaySupported = false;
  
  /// Human-readable plan name for display
  String? _planDisplayName;
  
  /// Payment amount in dollars
  double? _amount;

  @override
  void initState() {
    super.initState();
    _initializeData();
    _checkPlatformPaySupport();
  }

  /// Initialize plan data including pricing and display name
  /// 
  /// This method:
  /// - Retrieves pricing from SubscriptionService
  /// - Sets the payment amount based on plan and billing interval
  /// - Creates a human-readable plan name for UI display
  void _initializeData() {
    final pricing = SubscriptionService.getPricing();
    final key = '${widget.planType}_${widget.isYearly ? 'yearly' : 'monthly'}';
    _amount = pricing[key];
    
    _planDisplayName = widget.planType == 'pro' ? 'Pro' : 'Premium';
    if (widget.isYearly) {
      _planDisplayName = '$_planDisplayName Annual';
    } else {
      _planDisplayName = '$_planDisplayName Monthly';
    }
  }

  /// Check if the current device supports Platform Pay
  /// 
  /// This determines whether to show Apple Pay / Google Pay options
  /// and affects the payment flow used
  Future<void> _checkPlatformPaySupport() async {
    final isSupported = await SubscriptionService.isPlatformPaySupported();
    if (mounted) {
      setState(() {
        _isPlatformPaySupported = isSupported;
      });
    }
  }

  /// Handle payment button press with processing state management
  /// 
  /// Prevents multiple simultaneous payment attempts
  void _handlePaymentPress() {
    if (!_isProcessing) {
      _processPayment();
    }
  }

  /// Process the complete payment flow
  /// 
  /// This method handles the entire payment process:
  /// 1. Validate user authentication
  /// 2. Open Stripe Checkout in browser for payment
  /// 3. Handle success/failure responses
  /// 4. Update subscription status
  Future<void> _processPayment() async {
    if (_isProcessing || _amount == null) return;

    setState(() {
      _isProcessing = true;
    });

    try {
      // Verify user is authenticated
      final user = Supabase.instance.client.auth.currentUser;
      if (user == null) {
        throw Exception('User not authenticated');
      }

      // Open Stripe Checkout in browser for payment
      final success = await WebPaymentService.openStripeCheckout(
        planType: widget.planType,
        isYearly: widget.isYearly,
      );

      if (mounted) {
        if (success) {
          _showPaymentInstructionsDialog();
        } else {
          _showErrorDialog('Failed to open payment page. Please try again.');
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

  /// Show payment instructions dialog after opening payment page
  /// 
  /// Informs user that payment page has opened and they should return to app after payment
  void _showPaymentInstructionsDialog() {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        backgroundColor: Colors.black,
        title: Row(
          children: [
            Icon(Icons.payment, color: Colors.green, size: 32),
            SizedBox(width: 12),
            Text(
              'Payment Page Opened',
              style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'Please complete your payment in the browser window that just opened.',
              style: TextStyle(color: Colors.white),
            ),
            SizedBox(height: 16),
            Text(
              'After payment, return to this app and pull down to refresh your subscription status.',
              style: TextStyle(color: Colors.white, fontSize: 12),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: Text('OK', style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  /// Show success dialog after successful payment
  /// 
  /// Displays confirmation message and provides navigation back to main app
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
        content: SingleChildScrollView(
          child: ListBody(
            children: <Widget>[
              Text(
          'Welcome to $_planDisplayName! Your subscription is now active.',
              ),
            ],
          ),
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

  /// Show error dialog for payment failures
  /// 
  /// Displays error message and allows user to retry or cancel
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
        ? SubscriptionService.getYearlySavings(widget.planType)
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
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.red,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    onPressed: _handlePaymentPress,
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.payment, size: 20),
                        SizedBox(width: 8),
                        Text(
                          'Subscribe Now',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
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