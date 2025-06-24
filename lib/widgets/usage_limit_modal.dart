import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../screens/subscription/subscription_screen.dart';
import 'dart:io' show Platform;
import 'package:supabase_flutter/supabase_flutter.dart';
import '../services/subscription_service.dart';

class UsageLimitModal {
  static void show({
    required BuildContext context,
    required String actionType,
    required String message,
  }) {
    showDialog(
      context: context,
      barrierDismissible: false, // Force user to make a choice
      builder: (BuildContext context) => _UsageLimitDialog(
        actionType: actionType,
        message: message,
      ),
    );
  }
}

class _UsageLimitDialog extends StatefulWidget {
  final String actionType;
  final String message;

  const _UsageLimitDialog({
    required this.actionType,
    required this.message,
  });

  @override
  State<_UsageLimitDialog> createState() => _UsageLimitDialogState();
}

class _UsageLimitDialogState extends State<_UsageLimitDialog> {
  bool _isLoading = false;
  bool _isPlatformPaySupported = false;

  @override
  void initState() {
    super.initState();
    _checkPlatformPaySupport();
  }

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

  Future<void> _initiatePayment(String planType) async {
    if (_isLoading) return;

    setState(() => _isLoading = true);
    // Show loading dialog
    _showProcessingDialog('Initiating payment...');

    try {
      final user = Supabase.instance.client.auth.currentUser;
      if (user == null) {
        Navigator.pop(context); // Close loading dialog
        _showErrorDialog('User not authenticated');
        return;
      }

      final clientSecret = await SubscriptionService.createMobileSubscriptionAndGetClientSecret(
        email: user.email!,
        userId: user.id,
        planType: planType,
        isYearly: false, // Hardcoded to monthly for the modal
      );

      Navigator.pop(context); // Close loading dialog

      await _processPayment(planType, clientSecret, user.email!);

    } catch (e) {
      Navigator.pop(context); // Close loading dialog
      _showErrorDialog('Payment initiation failed: ${e.toString()}');
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _processPayment(String planType, String clientSecret, String email) async {
    try {
      _showProcessingDialog(_isPlatformPaySupported 
          ? (Platform.isIOS ? 'Processing Apple Pay...' : 'Processing Google Pay...')
          : 'Processing payment...');

      final pricing = SubscriptionService.getPricing();
      final key = '${planType}_monthly'; // Always use monthly price
      final amount = pricing[key] ?? 0.0;
      final planName = '${planType.toUpperCase()} Plan';

      bool success = false;

      if (_isPlatformPaySupported) {
        success = await SubscriptionService.processPlatformPay(
          clientSecret: clientSecret,
          amount: amount,
          planName: planName,
        );
      } else {
        success = await SubscriptionService.confirmCardPayment(
          clientSecret: clientSecret,
          email: email,
        );
      }

      Navigator.pop(context); // Close processing dialog

      if (success) {
        final subscriptionService = SubscriptionService();
        await subscriptionService.getSubscriptionStatus();
        _showSuccessDialog();
      } else {
        // No error dialog here, as the service handles logging the cancellation
        // This prevents showing an error when a user intentionally closes the pay sheet.
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
            Text(message, style: TextStyle(color: Colors.white)),
          ],
        ),
      ),
    );
  }

  void _showSuccessDialog() {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        backgroundColor: Colors.black,
        title: Row(
          children: [
            Icon(Icons.check_circle, color: Colors.green, size: 32),
            const SizedBox(width: 12),
            Text('Payment Successful!', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          ],
        ),
        content: Text('Your plan has been upgraded!', style: TextStyle(color: Colors.white)),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.of(context).pop(); // Close success dialog
              Navigator.of(context).pop(); // Close usage limit modal
            },
            child: Text('Continue', style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold)),
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
            Text('Payment Failed', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          ],
        ),
        content: Text(message, style: TextStyle(color: Colors.white)),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('OK', style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final actionInfo = _getActionInfo(widget.actionType);
    final screenHeight = MediaQuery.of(context).size.height;
    
    return Dialog(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
      ),
      child: Container(
        constraints: BoxConstraints(
          maxHeight: screenHeight * 0.85, // Max 85% of screen height
          maxWidth: 400,
        ),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(20),
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              Theme.of(context).colorScheme.errorContainer,
              Theme.of(context).colorScheme.surface,
            ],
          ),
        ),
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Icon and title
              Container(
                width: 60,
                height: 60,
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.error,
                  shape: BoxShape.circle,
                  boxShadow: [
                    BoxShadow(
                      color: Theme.of(context).colorScheme.error.withOpacity(0.3),
                      blurRadius: 15,
                      offset: const Offset(0, 5),
                    ),
                  ],
                ),
                child: Icon(
                  actionInfo['icon'] as IconData,
                  size: 30,
                  color: Colors.white,
                ),
              ),
              
              const SizedBox(height: 16),
              
              Text(
                'Limit Reached!',
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: Theme.of(context).colorScheme.error,
                ),
              ),
              
              const SizedBox(height: 8),
              
              Text(
                widget.message,
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Theme.of(context).colorScheme.onSurface,
                ),
              ),
              
              const SizedBox(height: 16),
              
              // Current plan info
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.surfaceVariant,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: Theme.of(context).colorScheme.outline.withOpacity(0.2),
                  ),
                ),
                child: Column(
                  children: [
                    Row(
                      children: [
                        Icon(
                          Icons.info_outline,
                          color: Theme.of(context).colorScheme.primary,
                          size: 18,
                        ),
                        const SizedBox(width: 6),
                        Text(
                          'Current Plan: Free',
                          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'Upgrade to get more ${actionInfo['displayName']} and unlock unlimited potential!',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ),
              
              const SizedBox(height: 20),
              
              // Upgrade options
              Row(
                children: [
                  Expanded(
                    child: _buildUpgradeOption(
                      context: context,
                      planName: 'Pro',
                      price: '\$8.99/mo',
                      feature: actionInfo['proFeature'] as String,
                      color: Theme.of(context).colorScheme.secondary,
                      onTap: () => _initiatePayment('pro'),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _buildUpgradeOption(
                      context: context,
                      planName: 'Premium',
                      price: '\$14.99/mo',
                      feature: 'Unlimited Everything',
                      color: Theme.of(context).colorScheme.tertiary,
                      onTap: () => _initiatePayment('premium'),
                      isRecommended: true,
                    ),
                  ),
                ],
              ),
              
              const SizedBox(height: 16),
              
              // Action buttons
              Row(
                children: [
                  Expanded(
                    child: TextButton(
                      onPressed: () => Navigator.of(context).pop(),
                      style: TextButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 10),
                      ),
                      child: Text(
                        'Maybe Later',
                        style: TextStyle(
                          color: Theme.of(context).colorScheme.onSurfaceVariant,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    flex: 2,
                    child: ElevatedButton(
                      onPressed: () {
                        Navigator.of(context).pop();
                        Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (context) => const SubscriptionScreen(),
                          ),
                        );
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Theme.of(context).colorScheme.primary,
                        foregroundColor: Theme.of(context).colorScheme.onPrimary,
                        padding: const EdgeInsets.symmetric(vertical: 10),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ),
                      child: const Text(
                        'View Plans',
                        style: TextStyle(fontWeight: FontWeight.w600),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildUpgradeOption({
    required BuildContext context,
    required String planName,
    required String price,
    required String feature,
    required Color color,
    required VoidCallback onTap,
    bool isRecommended = false,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: color.withOpacity(0.1),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isRecommended ? color : color.withOpacity(0.3),
            width: isRecommended ? 2 : 1,
          ),
        ),
        child: Column(
          children: [
            if (isRecommended) ...[
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: color,
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  'BEST',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                    fontSize: 9,
                  ),
                ),
              ),
              const SizedBox(height: 6),
            ],
            Text(
              planName,
              style: Theme.of(context).textTheme.titleSmall?.copyWith(
                fontWeight: FontWeight.bold,
                color: color,
                fontSize: 14,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              price,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                fontWeight: FontWeight.w600,
                fontSize: 12,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              feature,
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
                fontSize: 10,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Map<String, dynamic> _getActionInfo(String actionType) {
    switch (actionType.toLowerCase()) {
      case 'phone_call':
        return {
          'icon': Icons.phone,
          'displayName': 'phone calls',
          'proFeature': '15 Calls/Month',
        };
      case 'text_chain':
        return {
          'icon': Icons.chat,
          'displayName': 'text conversations',
          'proFeature': '20 Texts/Month',
        };
      case 'email':
        return {
          'icon': Icons.email,
          'displayName': 'emails',
          'proFeature': 'Unlimited Emails',
        };
      default:
        return {
          'icon': Icons.block,
          'displayName': 'actions',
          'proFeature': 'More Actions',
        };
    }
  }
} 