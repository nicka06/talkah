import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'dart:io' show Platform;
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../services/subscription_service.dart';
import '../../services/stripe_payment_service.dart';
import '../../models/subscription_plan.dart';
import '../../models/usage_tracking.dart';

class SubscriptionScreen extends StatefulWidget {
  const SubscriptionScreen({super.key});

  @override
  State<SubscriptionScreen> createState() => _SubscriptionScreenState();
}

class _SubscriptionScreenState extends State<SubscriptionScreen> {
  final SubscriptionService _subscriptionService = SubscriptionService();
  UsageTracking? _usage;
  bool _isLoading = true;
  bool _isYearly = false; // Toggle state for pricing
  bool _isPlatformPaySupported = false;

  @override
  void initState() {
    super.initState();
    _loadUsage();
    _checkPlatformPaySupport();
  }

  Future<void> _loadUsage() async {
    try {
      final usage = await _subscriptionService.getCurrentUsage();
      if (mounted) {
        setState(() {
          _usage = usage;
          _isLoading = false;
        });
      }
    } catch (e) {
      print('Error loading usage: $e');
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _checkPlatformPaySupport() async {
    try {
      final isSupported = await StripePaymentService.isPlatformPaySupported();
      if (mounted) {
        setState(() {
          _isPlatformPaySupported = isSupported;
        });
      }
    } catch (e) {
      print('Error checking platform pay support: $e');
    }
  }

  Future<void> _initiatePayment(String planType, bool isYearly) async {
    if (_isLoading) return;

    try {
      // Show loading dialog
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (context) => AlertDialog(
          backgroundColor: Colors.black,
          content: Row(
            children: [
              CircularProgressIndicator(color: Colors.white),
              const SizedBox(width: 16),
              Text(
                'Initiating payment...',
                style: TextStyle(color: Colors.white),
              ),
            ],
          ),
        ),
      );

      final user = Supabase.instance.client.auth.currentUser;
      if (user == null) {
        Navigator.pop(context);
        _showErrorDialog('User not authenticated');
        return;
      }

      // Create subscription and get client secret using real Stripe service
      final subscriptionData = await StripePaymentService.createSubscription(
        email: user.email ?? '',
        userId: user.id,
        planType: planType,
        isYearly: isYearly,
      );

      final clientSecret = subscriptionData['latest_invoice']['payment_intent']['client_secret'];
      if (clientSecret == null) {
        Navigator.pop(context);
        _showErrorDialog('Failed to create payment intent');
        return;
      }

      Navigator.pop(context); // Close loading dialog

      // Process payment based on platform support
      await _processPayment(planType, isYearly, clientSecret, user.email ?? '');

    } catch (e) {
      Navigator.pop(context); // Close loading dialog
      _showErrorDialog('Payment initiation failed: ${e.toString()}');
    }
  }

  Future<void> _processPayment(String planType, bool isYearly, String clientSecret, String email) async {
    try {
      // Show processing dialog
      _showProcessingDialog(_isPlatformPaySupported 
          ? (Platform.isIOS ? 'Processing Apple Pay...' : 'Processing Google Pay...')
          : 'Processing payment...');

      final pricing = StripePaymentService.getPricing();
      final key = '${planType}_${isYearly ? 'yearly' : 'monthly'}';
      final amount = pricing[key] ?? 0.0;
      final planName = '${planType.toUpperCase()} Plan';

      bool success = false;

      if (_isPlatformPaySupported) {
        // Use Platform Pay (Apple Pay / Google Pay)
        success = await StripePaymentService.processPlatformPayPayment(
          clientSecret: clientSecret,
          email: email,
          amount: amount,
          planName: planName,
        );
      } else {
        // Fallback to card payment
        success = await StripePaymentService.confirmPayment(
          clientSecret: clientSecret,
          email: email,
        );
      }

      Navigator.pop(context); // Close processing dialog

      if (success) {
        // Refresh subscription status
        await _subscriptionService.getSubscriptionStatus();
        await _loadUsage(); // Reload usage data
        _showSuccessDialog(planType, isYearly);
      } else {
        _showErrorDialog('Payment was not completed. Please try again.');
      }

    } catch (e) {
      Navigator.pop(context); // Close processing dialog
      _showErrorDialog('Payment failed: ${e.toString()}');
    }
  }

  void _showProcessingDialog(String message) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        backgroundColor: Colors.black,
        content: Row(
          children: [
            CircularProgressIndicator(color: Colors.white),
            const SizedBox(width: 16),
            Text(
              message,
              style: TextStyle(color: Colors.white),
            ),
          ],
        ),
      ),
    );
  }

  void _showSuccessDialog(String planType, bool isYearly) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        backgroundColor: Colors.black,
        title: Row(
          children: [
            Icon(Icons.check_circle, color: Colors.green, size: 32),
            const SizedBox(width: 12),
            Text(
              'Payment Successful!',
              style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
            ),
          ],
        ),
        content: Text(
          'Your ${planType.toUpperCase()} plan has been activated. Welcome to premium features!',
          style: TextStyle(color: Colors.white),
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.pop(context); // Close dialog
              // Refresh the page to show updated plan
              _loadUsage();
            },
            child: Text(
              'Continue',
              style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold),
            ),
          ),
        ],
      ),
    );
  }

  void _showErrorDialog(String message) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: Colors.black,
        title: Row(
          children: [
            Icon(Icons.error, color: Colors.red, size: 32),
            const SizedBox(width: 12),
            Text(
              'Payment Failed',
              style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
            ),
          ],
        ),
        content: Text(
          message,
          style: TextStyle(color: Colors.white),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text(
              'OK',
              style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold),
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.red,
      appBar: AppBar(
        backgroundColor: Colors.red,
        elevation: 0,
        leading: IconButton(
          icon: Icon(
            Icons.arrow_back_ios,
            color: Colors.black,
          ),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Text(
          'SUBSCRIPTION',
          style: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.w900,
            color: Colors.black,
            letterSpacing: 1.5,
            shadows: [
              Shadow(
                offset: Offset(2, 2),
                blurRadius: 0,
                color: Colors.white.withOpacity(0.3),
              ),
              Shadow(
                offset: Offset(-1, -1),
                blurRadius: 0,
                color: Colors.black.withOpacity(0.5),
              ),
            ],
            fontFamily: 'Arial Black',
          ),
        ),
        centerTitle: true,
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Current Plan Name
              Center(
                child: Text(
                  'FREE PLAN',
                  style: TextStyle(
                    fontSize: 28,
                    fontWeight: FontWeight.w900,
                    color: Colors.black,
                    letterSpacing: 2.0,
                    shadows: [
                      Shadow(
                        offset: Offset(2, 2),
                        blurRadius: 0,
                        color: Colors.white.withOpacity(0.3),
                      ),
                    ],
                  ),
                ),
              ),
              
              const SizedBox(height: 16),
              
              // Billing Dates
              Center(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                  decoration: BoxDecoration(
                    color: Colors.black,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Column(
                    children: [
                      Text(
                        _isLoading || _usage == null 
                            ? 'Loading billing info...'
                            : _usage!.billingPeriodDisplay,
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                          color: Colors.white,
                        ),
                      ),
                      if (!_isLoading && _usage != null && _usage!.timeRemainingInBillingPeriod.inDays > 0) ...[
                        const SizedBox(height: 4),
                        Text(
                          'Renews in ${_usage!.timeRemainingInBillingPeriod.inDays} days',
                          style: TextStyle(
                            fontSize: 14,
                            color: Colors.white.withOpacity(0.8),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
              
              const SizedBox(height: 32),
              
              // Usage Bars (without cards)
              if (_isLoading)
                Center(
                  child: CircularProgressIndicator(color: Colors.black),
                )
              else if (_usage != null) ...[
                _buildUsageBar(
                  icon: Icons.phone,
                  label: 'Phone Calls',
                  used: _usage!.phoneCallsUsed,
                  limit: _usage!.phoneCallsLimit,
                  progress: _usage!.phoneCallsProgress,
                  color: Colors.blue,
                ),
                const SizedBox(height: 20),
                _buildUsageBar(
                  icon: Icons.chat,
                  label: 'Text Conversations',
                  used: _usage!.textChainsUsed,
                  limit: _usage!.textChainsLimit,
                  progress: _usage!.textChainsProgress,
                  color: Colors.green,
                ),
                const SizedBox(height: 20),
                _buildUsageBar(
                  icon: Icons.email,
                  label: 'Emails',
                  used: _usage!.emailsUsed,
                  limit: _usage!.emailsLimit,
                  progress: _usage!.emailsProgress,
                  color: Colors.orange,
                ),
              ],
              
              const SizedBox(height: 40),
              
              // Three Plans Horizontally
              Text(
                'UPGRADE PLANS',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w900,
                  color: Colors.black,
                  letterSpacing: 1.5,
                ),
              ),
              const SizedBox(height: 16),
              
              // Monthly/Annual Toggle
              Center(
                child: Container(
                  decoration: BoxDecoration(
                    color: Colors.black,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      _buildToggleButton('Monthly', !_isYearly),
                      _buildToggleButton('Annual', _isYearly),
                    ],
                  ),
                ),
              ),
              
              if (_isYearly)
                Padding(
                  padding: const EdgeInsets.only(top: 8.0),
                  child: Center(
                    child: Text(
                      'Save up to 25% with annual billing',
                      style: TextStyle(
                        fontSize: 14,
                        color: Colors.black,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ),
              
              const SizedBox(height: 24),
              
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: [
                    _buildPlanCard(
                      planName: 'FREE',
                      monthlyPrice: '\$0',
                      yearlyPrice: '\$0',
                      features: [
                        '1 phone call',
                        '1 text conversation', 
                        '1 email',
                        'Basic support',
                      ],
                      isCurrentPlan: true,
                      planType: 'free',
                    ),
                    const SizedBox(width: 16),
                    _buildPlanCard(
                      planName: 'PRO',
                      monthlyPrice: '\$8.99',
                      yearlyPrice: '\$79.99',
                      features: [
                        '15 phone calls',
                        '20 text conversations',
                        'Unlimited emails',
                        'Priority support',
                      ],
                      isRecommended: true,
                      planType: 'pro',
                    ),
                    const SizedBox(width: 16),
                    _buildPlanCard(
                      planName: 'PREMIUM',
                      monthlyPrice: '\$14.99',
                      yearlyPrice: '\$119.99',
                      features: [
                        'Unlimited calls',
                        'Unlimited texts',
                        'Unlimited emails',
                        'Premium support',
                        'Advanced AI features',
                      ],
                      planType: 'premium',
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildToggleButton(String text, bool isSelected) {
    return GestureDetector(
      onTap: () {
        setState(() {
          _isYearly = text == 'Annual';
        });
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
        decoration: BoxDecoration(
          color: isSelected ? Colors.white : Colors.transparent,
          borderRadius: BorderRadius.circular(8),
        ),
        child: Text(
          text,
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            color: isSelected ? Colors.black : Colors.white,
          ),
        ),
      ),
    );
  }

  Widget _buildUsageBar({
    required IconData icon,
    required String label,
    required int used,
    required int limit,
    required double progress,
    required Color color,
  }) {
    final isUnlimited = limit == -1;
    final displayText = isUnlimited ? '$used used' : '$used / $limit';
    
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                color: Colors.black,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(icon, size: 18, color: color),
            ),
            const SizedBox(width: 12),
            Text(
              label,
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: Colors.black,
              ),
            ),
            const Spacer(),
            Text(
              displayText,
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w500,
                color: Colors.black,
              ),
            ),
          ],
        ),
        if (!isUnlimited) ...[
          const SizedBox(height: 8),
          Container(
            height: 8,
            width: double.infinity,
            decoration: BoxDecoration(
              color: Colors.black.withOpacity(0.2),
              borderRadius: BorderRadius.circular(4),
            ),
            child: FractionallySizedBox(
              alignment: Alignment.centerLeft,
              widthFactor: progress.clamp(0.0, 1.0),
              child: Container(
                decoration: BoxDecoration(
                  color: progress >= 1.0 ? Colors.red[800] : color,
                  borderRadius: BorderRadius.circular(4),
                ),
              ),
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildPlanCard({
    required String planName,
    required String monthlyPrice,
    required String yearlyPrice,
    required List<String> features,
    required String planType,
    bool isCurrentPlan = false,
    bool isRecommended = false,
  }) {
    // Get real pricing from Stripe service
    final pricing = StripePaymentService.getPricing();
    final monthlyKey = '${planType}_monthly';
    final yearlyKey = '${planType}_yearly';
    
    final realMonthlyPrice = pricing[monthlyKey] ?? 0.0;
    final realYearlyPrice = pricing[yearlyKey] ?? 0.0;
    
    final displayPrice = _isYearly ? '\$${realYearlyPrice.toStringAsFixed(2)}' : '\$${realMonthlyPrice.toStringAsFixed(2)}';
    final displayPeriod = _isYearly ? ' / year' : ' / month';
    
    return Container(
      width: 200,
      decoration: BoxDecoration(
        color: Colors.black,
        borderRadius: BorderRadius.circular(16),
        border: isRecommended ? Border.all(color: Colors.white, width: 2) : null,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.3),
            blurRadius: 8,
            offset: Offset(0, 4),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Recommended badge
            if (isRecommended)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  'RECOMMENDED',
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w900,
                    color: Colors.black,
                    letterSpacing: 0.5,
                  ),
                ),
              ),
            
            if (isRecommended) const SizedBox(height: 12),
            
            // Plan name
            Text(
              planName,
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w900,
                color: Colors.white,
                letterSpacing: 1.0,
              ),
            ),
            
            const SizedBox(height: 8),
            
            // Price
            Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  displayPrice,
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.w900,
                    color: Colors.white,
                  ),
                ),
                Text(
                  displayPeriod,
                  style: TextStyle(
                    fontSize: 14,
                    color: Colors.white.withOpacity(0.7),
                  ),
                ),
              ],
            ),
            
            // Show savings for yearly plans
            if (_isYearly && planType != 'free') ...[
              const SizedBox(height: 4),
              Text(
                _getSavingsText(realMonthlyPrice, realYearlyPrice),
                style: TextStyle(
                  fontSize: 12,
                  color: Colors.green,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
            
            const SizedBox(height: 16),
            
            // Features
            ...features.map((feature) => Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Row(
                children: [
                  Icon(
                    Icons.check_circle,
                    color: Colors.white,
                    size: 16,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      feature,
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.white.withOpacity(0.9),
                      ),
                    ),
                  ),
                ],
              ),
            )),
            
            const SizedBox(height: 16),
            
            // Button
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: isCurrentPlan ? null : () => _initiatePayment(planType, _isYearly),
                style: ElevatedButton.styleFrom(
                  backgroundColor: isCurrentPlan ? Colors.grey : Colors.white,
                  foregroundColor: Colors.black,
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
                child: Text(
                  isCurrentPlan ? 'CURRENT' : 'UPGRADE',
                  style: TextStyle(
                    fontWeight: FontWeight.w900,
                    letterSpacing: 0.5,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _getSavingsText(double monthlyPrice, double yearlyPrice) {
    if (monthlyPrice <= 0) return '';
    
    final monthlyTotal = monthlyPrice * 12;
    final savings = monthlyTotal - yearlyPrice;
    final percentage = ((savings / monthlyTotal) * 100).round();
    
    return 'Save $percentage% vs monthly';
  }
} 