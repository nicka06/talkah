import 'package:flutter/material.dart';
import '../../models/activity_record.dart';
import '../../models/call_record.dart';
import '../../models/email_record.dart';
import '../../models/sms_record.dart';
import '../../services/api_service.dart';

class ActivityHistoryScreen extends StatefulWidget {
  const ActivityHistoryScreen({super.key});

  @override
  State<ActivityHistoryScreen> createState() => _ActivityHistoryScreenState();
}

class _ActivityHistoryScreenState extends State<ActivityHistoryScreen> {
  List<ActivityRecord> _activities = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadActivityHistory();
  }

  Future<void> _loadActivityHistory() async {
    setState(() => _isLoading = true);
    try {
      final activities = await ApiService.getActivityHistory(limit: 100);
      setState(() {
        _activities = activities;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error loading history: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
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
          'ACTIVITY HISTORY',
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
        actions: [
          IconButton(
            icon: Icon(Icons.refresh, color: Colors.black),
            onPressed: _loadActivityHistory,
            tooltip: 'Refresh',
          ),
        ],
      ),
      body: Container(
        decoration: const BoxDecoration(
          color: Colors.red,
        ),
        child: Column(
          children: [
            // Activity list
            Expanded(
              child: _isLoading 
                  ? _buildLoadingState()
                  : _activities.isEmpty 
                      ? _buildEmptyState()
                      : _buildActivityList(),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLoadingState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          CircularProgressIndicator(color: Colors.black),
          const SizedBox(height: 16),
          Text(
            'Loading activity history...',
            style: TextStyle(color: Colors.black, fontSize: 16),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.history,
              size: 80,
              color: Colors.black.withOpacity(0.7),
            ),
            const SizedBox(height: 16),
            Text(
              'No activity yet',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: Colors.black,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Your communication history will appear here once you make calls, send emails, or text messages.',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 16,
                color: Colors.black.withOpacity(0.8),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildActivityList() {
    return RefreshIndicator(
      onRefresh: _loadActivityHistory,
      child: ListView.builder(
        padding: const EdgeInsets.all(16.0),
        itemCount: _activities.length,
        itemBuilder: (context, index) {
          final activity = _activities[index];
          return _buildActivityItem(activity);
        },
      ),
    );
  }

  Widget _buildActivityItem(ActivityRecord activity) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12.0),
      padding: const EdgeInsets.all(16.0),
      decoration: BoxDecoration(
        color: Colors.black,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.3),
            blurRadius: 8,
            offset: Offset(0, 4),
          ),
        ],
      ),
      child: InkWell(
        onTap: () => _showActivityDetails(activity),
        borderRadius: BorderRadius.circular(16),
        child: Row(
          children: [
            // Activity type icon
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: _getActivityColor(activity.type).withOpacity(0.2),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(
                _getActivityIcon(activity.type),
                color: _getActivityColor(activity.type),
                size: 24,
              ),
            ),
            
            const SizedBox(width: 16),
            
            // Activity details
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    activity.mainText,
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    activity.secondaryText,
                    style: TextStyle(
                      fontSize: 14,
                      color: Colors.white.withOpacity(0.8),
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Text(
                        activity.displayStatus,
                        style: TextStyle(
                          fontSize: 12,
                          color: _getStatusColor(activity),
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      if (activity.detailText.isNotEmpty) ...[
                        Text(
                          ' • ${activity.detailText}',
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.white.withOpacity(0.6),
                          ),
                        ),
                      ],
                    ],
                  ),
                ],
              ),
            ),
            
            // Date and status
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  activity.formattedDate,
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.white.withOpacity(0.7),
                  ),
                ),
                const SizedBox(height: 8),
                Icon(
                  activity.wasSuccessful ? Icons.check_circle : Icons.error,
                  color: activity.wasSuccessful ? Colors.green : Colors.red,
                  size: 20,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  IconData _getActivityIcon(ActivityType type) {
    switch (type) {
      case ActivityType.call:
        return Icons.phone;
      case ActivityType.email:
        return Icons.email;
      case ActivityType.sms:
        return Icons.sms;
    }
  }

  Color _getActivityColor(ActivityType type) {
    switch (type) {
      case ActivityType.call:
        return Colors.blue;
      case ActivityType.email:
        return Colors.orange;
      case ActivityType.sms:
        return Colors.green;
    }
  }

  Color _getStatusColor(ActivityRecord activity) {
    if (activity.wasSuccessful) {
      return Colors.green;
    } else {
      switch (activity.status) {
        case 'failed':
          return Colors.red;
        case 'pending':
          return Colors.orange;
        default:
          return Colors.grey;
      }
    }
  }

  void _showActivityDetails(ActivityRecord activity) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => _buildActivityDetailsModal(activity),
    );
  }

  Widget _buildActivityDetailsModal(ActivityRecord activity) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.black,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Row(
            children: [
              Icon(
                _getActivityIcon(activity.type),
                color: _getActivityColor(activity.type),
                size: 32,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '${activity.type.name.toUpperCase()} Details',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                    Text(
                      activity.displayStatus,
                      style: TextStyle(
                        fontSize: 14,
                        color: _getStatusColor(activity),
                      ),
                    ),
                  ],
                ),
              ),
              IconButton(
                onPressed: () => Navigator.pop(context),
                icon: Icon(Icons.close, color: Colors.white),
              ),
            ],
          ),
          
          const SizedBox(height: 24),
          
          // Details based on activity type
          if (activity.type == ActivityType.call && activity.callRecord != null)
            _buildCallDetails(activity.callRecord!),
          if (activity.type == ActivityType.email && activity.emailRecord != null)
            _buildEmailDetails(activity.emailRecord!),
          if (activity.type == ActivityType.sms && activity.smsRecord != null)
            _buildSmsDetails(activity.smsRecord!),
          
          const SizedBox(height: 24),
          
          // Safe area padding
          SizedBox(height: MediaQuery.of(context).padding.bottom),
        ],
      ),
    );
  }

  Widget _buildCallDetails(CallRecord call) {
    return Column(
      children: [
        _buildDetailRow('Phone Number', call.formattedPhoneNumber),
        _buildDetailRow('Topic', call.topic),
        _buildDetailRow('Duration', call.formattedDuration),
        _buildDetailRow('Status', call.displayStatus),
        _buildDetailRow('Started', _formatDetailedDate(call.createdAt)),
        if (call.answeredTime != null)
          _buildDetailRow('Answered', _formatDetailedDate(call.answeredTime!)),
        if (call.completedTime != null)
          _buildDetailRow('Completed', _formatDetailedDate(call.completedTime!)),
      ],
    );
  }

  Widget _buildEmailDetails(EmailRecord email) {
    return Column(
      children: [
        _buildDetailRow('To', email.recipientEmail),
        _buildDetailRow('From', email.displayFromEmail),
        _buildDetailRow('Subject', email.subject),
        _buildDetailRow('Type', email.isAiGenerated ? 'AI Generated' : 'Custom'),
        if (email.topic != null)
          _buildDetailRow('Topic', email.topic!),
        _buildDetailRow('Status', email.displayStatus),
        _buildDetailRow('Sent', _formatDetailedDate(email.createdAt)),
      ],
    );
  }

  Widget _buildSmsDetails(SmsRecord sms) {
    return Column(
      children: [
        _buildDetailRow('Phone Number', sms.formattedPhoneNumber),
        _buildDetailRow('Direction', sms.isOutbound ? 'Outbound' : 'Inbound'),
        _buildDetailRow('Type', sms.isAiConversation ? 'AI Conversation' : 'Single Message'),
        _buildDetailRow('Status', sms.displayStatus),
        _buildDetailRow('Message', sms.messageText),
        _buildDetailRow('Sent', _formatDetailedDate(sms.createdAt)),
      ],
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 100,
            child: Text(
              label,
              style: TextStyle(
                color: Colors.white.withOpacity(0.7),
                fontWeight: FontWeight.w500,
                fontSize: 14,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: TextStyle(
                color: Colors.white,
                fontSize: 14,
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _formatDetailedDate(DateTime date) {
    final now = DateTime.now();
    final difference = now.difference(date);
    
    if (difference.inDays == 0) {
      final hour = date.hour;
      final minute = date.minute.toString().padLeft(2, '0');
      final period = hour >= 12 ? 'PM' : 'AM';
      final displayHour = hour == 0 ? 12 : (hour > 12 ? hour - 12 : hour);
      return 'Today at $displayHour:$minute $period';
    } else if (difference.inDays == 1) {
      final hour = date.hour;
      final minute = date.minute.toString().padLeft(2, '0');
      final period = hour >= 12 ? 'PM' : 'AM';
      final displayHour = hour == 0 ? 12 : (hour > 12 ? hour - 12 : hour);
      return 'Yesterday at $displayHour:$minute $period';
    } else {
      return '${date.month}/${date.day}/${date.year} at ${date.hour}:${date.minute.toString().padLeft(2, '0')}';
    }
  }
} 