/// SubscriptionScreen - Comprehensive subscription management interface
/// 
/// This screen provides a complete subscription management experience including:
/// - Current plan display and billing information
/// - Usage tracking with visual progress bars
/// - Plan selection with monthly/yearly pricing options
/// - Payment processing with Platform Pay integration
/// - Customer portal access for subscription management
/// 
/// ARCHITECTURE:
/// - Uses BLoC pattern for state management (SubscriptionBloc)
/// - Integrates with SubscriptionService for payment processing
/// - Supports both Platform Pay (Apple/Google Pay) and card payments
/// - Handles pending plan changes and billing cycle information
/// 
/// USER FLOW:
/// 1. Load current subscription data via BLoC
/// 2. Display current plan, usage, and billing information
/// 3. Allow plan selection with pricing toggle
/// 4. Process payments through Stripe integration
/// 5. Provide customer portal access for paid users
import 'package:flutter/material.dart';
import 'dart:io' show Platform;
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:url_launcher/url_launcher.dart';
import 'dart:developer' as dev;
import '../../services/subscription_service.dart';
import '../../blocs/subscription/subscription_bloc.dart';
import '../../blocs/subscription/subscription_event.dart';
import '../../blocs/subscription/subscription_state.dart';

/// Main subscription management screen
class SubscriptionScreen extends StatefulWidget {
  const SubscriptionScreen({super.key});

  @override
  State<SubscriptionScreen> createState() => _SubscriptionScreenState();
}

class _SubscriptionScreenState extends State<SubscriptionScreen> {
  /// Service instance for subscription operations
  final SubscriptionService _subscriptionService = SubscriptionService();
  
  /// Toggle state for monthly vs yearly pricing display
  bool _isYearly = false;
  
  /// Whether the device supports Platform Pay (Apple Pay / Google Pay)
  bool _isPlatformPaySupported = false;

  @override
  void initState() {
    super.initState();
    _checkPlatformPaySupport();
    // Load subscription data using BLoC pattern
    context.read<SubscriptionBloc>().add(const LoadSubscriptionData());
  }

  /// Check if the current device supports Platform Pay
  /// This determines whether to show Apple Pay / Google Pay options
  Future<void> _checkPlatformPaySupport() async {
    try {
      final isSupported = await SubscriptionService.isPlatformPaySupported();
      if (mounted) {
        setState(() {
          _isPlatformPaySupported = isSupported;
        });
      }
    } catch (e) {
      print('Error checking platform pay support: $e');
    }
  }

  /// Initiate payment process for a selected plan
  /// 
  /// This method handles the complete payment flow:
  /// 1. Show loading dialog
  /// 2. Create subscription on backend
  /// 3. Get payment client secret
  /// 4. Process payment based on platform support
  /// 5. Handle success/failure responses
  Future<void> _initiatePayment(String planType, bool isYearly) async {
    try {
      // Show loading dialog to indicate payment initiation
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

      // Get current authenticated user
      final user = Supabase.instance.client.auth.currentUser;
      if (user == null) {
        Navigator.pop(context);
        _showErrorDialog('User not authenticated');
        return;
      }

      // Create subscription and get client secret using SubscriptionService
      // This handles the backend subscription creation and Stripe integration
      final clientSecret = await SubscriptionService.createMobileSubscriptionAndGetClientSecret(
        email: user.email ?? '',
        userId: user.id,
        planType: planType,
        isYearly: isYearly,
      );

      Navigator.pop(context); // Close loading dialog

      // Process payment based on platform support
      await _processPayment(planType, isYearly, clientSecret, user.email ?? '');

    } catch (e) {
      Navigator.pop(context); // Close loading dialog
      _showErrorDialog('Payment initiation failed: ${e.toString()}');
    }
  }

  /// Handle plan selection logic
  /// 
  /// For free plan: Trigger downgrade through BLoC
  /// For paid plans: Initiate payment process
  void _handlePlanSelection(String planType, bool isYearly) {
    if (planType == 'free') {
      context.read<SubscriptionBloc>().add(const DowngradeToFreeRequested());
    } else {
      _initiatePayment(planType, isYearly);
    }
  }

  /// Process payment with the provided client secret
  /// 
  /// This method handles the actual payment processing:
  /// - Platform Pay (Apple Pay / Google Pay) if supported
  /// - Fallback to card payment if Platform Pay not available
  /// - Shows appropriate processing dialogs
  /// - Handles success/failure responses
  Future<void> _processPayment(String planType, bool isYearly, String clientSecret, String email) async {
    try {
      // Show processing dialog with platform-specific messaging
      _showProcessingDialog(_isPlatformPaySupported 
          ? (Platform.isIOS ? 'Processing Apple Pay...' : 'Processing Google Pay...')
          : 'Processing payment...');

      // Get pricing information for display
      final pricing = SubscriptionService.getPricing();
      final key = '${planType}_${isYearly ? 'yearly' : 'monthly'}';
      final amount = pricing[key] ?? 0.0;
      final planName = '${planType.toUpperCase()} Plan';

      bool success = false;

      if (_isPlatformPaySupported) {
        // Use Platform Pay (Apple Pay / Google Pay) for secure, fast payments
        success = await SubscriptionService.processPlatformPay(
          clientSecret: clientSecret,
          amount: amount,
          planName: planName,
        );
      } else {
        // Fallback to traditional card payment flow
        success = await SubscriptionService.confirmCardPayment(
          clientSecret: clientSecret,
          email: email,
        );
      }

      Navigator.pop(context); // Close processing dialog

      if (success) {
        // Refresh subscription data using BLoC to show updated status
        context.read<SubscriptionBloc>().add(const RefreshSubscriptionData());
        _showSuccessDialog(planType, isYearly);
      } else {
        // No error dialog here, as the service handles logging the cancellation
        // This prevents showing an error when a user intentionally closes the pay sheet.
      }

    } catch (e) {
      Navigator.pop(context); // Close processing dialog
      _showErrorDialog('Payment failed: ${e.toString()}');
    }
  }

  /// Show processing dialog during payment operations
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

  /// Show success dialog after successful payment
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
              context.read<SubscriptionBloc>().add(const RefreshSubscriptionData());
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

  /// Show error dialog for payment failures
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

  /// Open Stripe customer portal for subscription management
  /// 
  /// This allows users to:
  /// - Update payment methods
  /// - View billing history
  /// - Cancel subscriptions
  /// - Download invoices
  Future<void> _openCustomerPortal() async {
    try {
      // Show loading indicator while creating portal session
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
                'Opening customer portal...',
                style: TextStyle(color: Colors.white),
              ),
            ],
          ),
        ),
      );

      // Create customer portal session through Stripe
      final portalUrl = await _subscriptionService.createCustomerPortalSession();
      
      Navigator.pop(context); // Close loading dialog
      
      if (portalUrl != null) {
        // Open the portal URL in external browser
        final uri = Uri.parse(portalUrl);
        if (await canLaunchUrl(uri)) {
          await launchUrl(uri, mode: LaunchMode.externalApplication);
          
          // Show success message
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Customer portal opened in browser'),
              backgroundColor: Colors.green,
              duration: Duration(seconds: 2),
            ),
          );
          
          // Refresh subscription data after a delay to catch any changes
          Future.delayed(Duration(seconds: 2), () {
            context.read<SubscriptionBloc>().add(const RefreshSubscriptionData());
          });
        } else {
          _showErrorDialog('Could not open customer portal');
        }
      } else {
        _showErrorDialog('Failed to create customer portal session');
      }
    } catch (e) {
      Navigator.pop(context); // Close loading dialog if still open
      _showErrorDialog('Failed to open customer portal: ${e.toString()}');
    }
  }

  /// Get human-readable plan display name
  String _getPlanDisplayName(String planId) {
    switch (planId) {
      case 'free':
        return 'Free';
      case 'pro':
        return 'Pro';
      case 'premium':
        return 'Premium';
      default:
        // Check if it's a UUID and return a friendlier message
        if (planId.contains('-')) {
          return 'a new plan';
        }
        return planId.toUpperCase();
    }
  }

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<SubscriptionBloc, SubscriptionState>(
      builder: (context, state) {
        dev.log('UI Rebuilding with State: ${state.toString()}');

        if (state is SubscriptionLoaded) {
          dev.log('State is SubscriptionLoaded. Checking for pending changes...');
          dev.log('  - hasPendingChange: ${state.subscriptionStatus.hasPendingChange}');
          if (state.subscriptionStatus.pendingChange != null) {
            dev.log('  - Pending Change Details: ${state.subscriptionStatus.pendingChange.toString()}');
          }
        }
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
                  // Pending Changes Banner - Shows scheduled plan changes
                  if (state is SubscriptionLoaded && state.subscriptionStatus.hasPendingChange) ...[
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.orange.shade100,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: Colors.orange.shade300),
                      ),
                      child: Row(
                        children: [
                          Icon(Icons.schedule, color: Colors.orange.shade700, size: 16),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              'Plan change to ${_getPlanDisplayName(state.subscriptionStatus.pendingChange!.targetPlanId)} on ${state.subscriptionStatus.pendingChange!.formattedEffectiveDate}',
                              style: TextStyle(
                                color: Colors.orange.shade700,
                                fontSize: 14,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],

                  // Current Plan Name - Prominently displays current subscription
                  Center(
                    child: Text(
                      state is SubscriptionLoaded 
                          ? '${state.subscriptionStatus.planDisplayName} PLAN'
                          : 'LOADING...',
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
                  
                  // Billing Dates - Shows current billing cycle information
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
                            state is SubscriptionLoaded 
                                ? (state.subscriptionStatus.isFree 
                                    ? 'Free Plan - No billing cycle'
                                    : (state.subscriptionStatus.billingCycleStart != null
                                        ? state.subscriptionStatus.formattedBillingPeriod
                                        : 'Billing info unavailable'))
                                : 'Loading billing info...',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                              color: Colors.white,
                            ),
                          ),
                          if (state is SubscriptionLoaded && state.subscriptionStatus.daysRemainingInCycle != null) ...[
                            const SizedBox(height: 4),
                            Text(
                              'Renews in ${state.subscriptionStatus.daysRemainingInCycle} days',
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
                  
                  // Usage Bars - Visual representation of current usage vs limits
                  if (state is SubscriptionLoading)
                    Center(
                      child: CircularProgressIndicator(color: Colors.black),
                    )
                  else if (state is SubscriptionLoaded && state.usage != null) ...[
                    _buildUsageBar(
                      icon: Icons.phone,
                      label: 'Phone Calls',
                      used: state.usage!.phoneCallsUsed,
                      limit: state.usage!.phoneCallsLimit,
                      progress: state.usage!.phoneCallsProgress,
                      color: Colors.blue,
                    ),
                    const SizedBox(height: 20),
                    _buildUsageBar(
                      icon: Icons.chat,
                      label: 'Text Conversations',
                      used: state.usage!.textChainsUsed,
                      limit: state.usage!.textChainsLimit,
                      progress: state.usage!.textChainsProgress,
                      color: Colors.green,
                    ),
                    const SizedBox(height: 20),
                    _buildUsageBar(
                      icon: Icons.email,
                      label: 'Emails',
                      used: state.usage!.emailsUsed,
                      limit: state.usage!.emailsLimit,
                      progress: state.usage!.emailsProgress,
                      color: Colors.orange,
                    ),
                  ],
                  
                  const SizedBox(height: 40),
                  
                  // Plan Selection Section
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
                  
                  // Monthly/Annual Toggle - Allows users to switch between billing intervals
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
                  
                  // Show savings message for yearly plans
                  if (_isYearly)
                    Padding(
                      padding: const EdgeInsets.only(top: 8.0),
                      child: Center(
                        child: Text(
                          'Save up to 33% with annual billing',
                          style: TextStyle(
                            fontSize: 14,
                            color: Colors.black,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ),
                  
                  const SizedBox(height: 24),
                  
                  // Plan Cards - Horizontal scrollable list of available plans
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
                          ],
                          planType: 'free',
                          subscriptionState: state,
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
                          ],
                          isRecommended: true,
                          planType: 'pro',
                          subscriptionState: state,
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
                          ],
                          planType: 'premium',
                          subscriptionState: state,
                        ),
                      ],
                    ),
                  ),

                  // Manage Subscription Button - Only show for paid users
                  if (state is SubscriptionLoaded && !state.subscriptionStatus.isFree) ...[
                    const SizedBox(height: 40),
                    Center(
                      child: TextButton(
                        onPressed: _openCustomerPortal,
                        child: Text(
                          'Manage Subscription',
                          style: TextStyle(
                            color: Colors.black,
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            decoration: TextDecoration.underline,
                          ),
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  /// Build toggle button for monthly/yearly billing selection
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

  /// Build usage progress bar for a specific feature
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

  /// Build plan card for subscription plan selection
  Widget _buildPlanCard({
    required String planName,
    required String monthlyPrice,
    required String yearlyPrice,
    required List<String> features,
    required String planType,
    required SubscriptionState subscriptionState,
    bool isRecommended = false,
  }) {
    // Get real pricing from Stripe service for accurate display
    final pricing = SubscriptionService.getPricing();
    final monthlyKey = '${planType}_monthly';
    final yearlyKey = '${planType}_yearly';
    
    final realMonthlyPrice = pricing[monthlyKey] ?? 0.0;
    final realYearlyPrice = pricing[yearlyKey] ?? 0.0;
    
    final displayPrice = _isYearly ? '\$${realYearlyPrice.toStringAsFixed(2)}' : '\$${realMonthlyPrice.toStringAsFixed(2)}';
    final displayPeriod = _isYearly ? ' / year' : ' / month';
    
    // Determine if this is the current plan and set appropriate button text
    bool isCurrentPlan = false;
    String buttonText = 'UPGRADE';
    bool isButtonDisabled = false;
    
    if (subscriptionState is SubscriptionLoaded) {
      final currentPlanId = subscriptionState.subscriptionStatus.planId;
      final currentBillingInterval = subscriptionState.subscriptionStatus.billingInterval;
      final targetBillingInterval = _isYearly ? 'yearly' : 'monthly';
      
      // Check if this is the current plan
      // For free plans, both monthly and yearly should show "CURRENT" since they're the same plan
      if (planType == 'free' && currentPlanId == 'free') {
        isCurrentPlan = true;
        buttonText = 'CURRENT';
        isButtonDisabled = true; // Disable button but keep it visible
      } else {
        // For paid plans, check both plan and billing interval
        isCurrentPlan = planType == currentPlanId && currentBillingInterval == targetBillingInterval;
        
        if (isCurrentPlan) {
          buttonText = 'CURRENT';
          isButtonDisabled = true; // Disable button but keep it visible
        } else {
          // Determine if this is an upgrade or downgrade
          final planHierarchy = ['free', 'pro', 'premium'];
          final currentIndex = planHierarchy.indexOf(currentPlanId);
          final targetIndex = planHierarchy.indexOf(planType);
          
          if (targetIndex > currentIndex) {
            buttonText = 'UPGRADE';
          } else if (targetIndex < currentIndex) {
            buttonText = 'DOWNGRADE';
          } else {
            // Same plan, different billing interval
            if (targetBillingInterval == 'yearly' && currentBillingInterval == 'monthly') {
              buttonText = 'UPGRADE'; // Upgrading to yearly
            } else {
              buttonText = 'DOWNGRADE'; // Downgrading to monthly
            }
          }
        }
      }
    }
    
    return Container(
      width: 200,
      decoration: BoxDecoration(
        color: Colors.black,
        borderRadius: BorderRadius.circular(16),
        border: isCurrentPlan 
            ? Border.all(color: Colors.white, width: 3) // White border for current plan only
            : null,
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
            
            // Price display with period
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
            
            // Feature list
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
            
            // Action button
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: isButtonDisabled ? () {} : () => _handlePlanSelection(planType, _isYearly),
                style: ElevatedButton.styleFrom(
                  backgroundColor: isButtonDisabled ? Colors.grey : Colors.white,
                  foregroundColor: Colors.black,
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
                child: Text(
                  buttonText,
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

  /// Calculate and format savings text for yearly plans
  String _getSavingsText(double monthlyPrice, double yearlyPrice) {
    if (monthlyPrice <= 0) return '';
    
    final monthlyTotal = monthlyPrice * 12;
    final savings = monthlyTotal - yearlyPrice;
    final percentage = ((savings / monthlyTotal) * 100).round();
    
    return 'Save $percentage% vs monthly';
  }
} 