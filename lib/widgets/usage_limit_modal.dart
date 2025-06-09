import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../screens/subscription/subscription_screen.dart';

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

class _UsageLimitDialog extends StatelessWidget {
  final String actionType;
  final String message;

  const _UsageLimitDialog({
    required this.actionType,
    required this.message,
  });

  @override
  Widget build(BuildContext context) {
    final actionInfo = _getActionInfo(actionType);
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
                message,
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
                      onTap: () => _handleUpgrade(context, 'pro'),
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
                      onTap: () => _handleUpgrade(context, 'premium'),
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

  void _handleUpgrade(BuildContext context, String planType) {
    Navigator.of(context).pop();
    // TODO: Implement actual upgrade flow
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('$planType upgrade coming soon!'),
        backgroundColor: Theme.of(context).colorScheme.primary,
      ),
    );
    
    // Navigate to subscription screen
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => const SubscriptionScreen(),
      ),
    );
  }
} 