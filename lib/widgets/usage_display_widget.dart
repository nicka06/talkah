import 'package:flutter/material.dart';
import '../models/usage_tracking.dart';
import '../services/subscription_service.dart';

class UsageDisplayWidget extends StatefulWidget {
  const UsageDisplayWidget({super.key});

  @override
  State<UsageDisplayWidget> createState() => _UsageDisplayWidgetState();
}

class _UsageDisplayWidgetState extends State<UsageDisplayWidget> {
  final SubscriptionService _subscriptionService = SubscriptionService();
  UsageTracking? _usage;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadUsage();
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

  Future<void> _refreshUsage() async {
    setState(() {
      _isLoading = true;
    });
    await _loadUsage();
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Card(
        child: Padding(
          padding: EdgeInsets.all(16.0),
          child: Center(
            child: CircularProgressIndicator(),
          ),
        ),
      );
    }

    if (_usage == null) {
      return Card(
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Usage Information',
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 8),
              const Text('Unable to load usage data'),
              TextButton(
                onPressed: _refreshUsage,
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
      );
    }

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Current Usage',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                IconButton(
                  icon: const Icon(Icons.refresh),
                  onPressed: _refreshUsage,
                  tooltip: 'Refresh usage',
                ),
              ],
            ),
            const SizedBox(height: 16),
            
            // Phone Calls
            _buildUsageItem(
              context,
              icon: Icons.phone,
              label: 'Phone Calls',
              used: _usage!.phoneCallsUsed,
              limit: _usage!.phoneCallsLimit,
              progress: _usage!.phoneCallsProgress,
              color: Colors.blue,
            ),
            const SizedBox(height: 12),
            
            // Text Conversations
            _buildUsageItem(
              context,
              icon: Icons.chat,
              label: 'Text Conversations',
              used: _usage!.textChainsUsed,
              limit: _usage!.textChainsLimit,
              progress: _usage!.textChainsProgress,
              color: Colors.green,
            ),
            const SizedBox(height: 12),
            
            // Emails
            _buildUsageItem(
              context,
              icon: Icons.email,
              label: 'Emails',
              used: _usage!.emailsUsed,
              limit: _usage!.emailsLimit,
              progress: _usage!.emailsProgress,
              color: Colors.orange,
            ),
            const SizedBox(height: 16),
            
            // Billing Period
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.surfaceVariant,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Billing Period',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    _usage!.billingPeriodDisplay,
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  if (_usage!.timeRemainingInBillingPeriod.inDays > 0) ...[
                    const SizedBox(height: 4),
                    Text(
                      '${_usage!.timeRemainingInBillingPeriod.inDays} days remaining',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildUsageItem(
    BuildContext context, {
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
            Icon(icon, size: 20, color: color),
            const SizedBox(width: 8),
            Text(
              label,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                fontWeight: FontWeight.w500,
              ),
            ),
            const Spacer(),
            Text(
              displayText,
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ],
        ),
        if (!isUnlimited) ...[
          const SizedBox(height: 6),
          LinearProgressIndicator(
            value: progress,
            backgroundColor: color.withOpacity(0.2),
            valueColor: AlwaysStoppedAnimation<Color>(
              progress >= 1.0 ? Colors.red : color,
            ),
          ),
        ],
      ],
    );
  }
} 