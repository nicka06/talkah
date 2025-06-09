import 'package:flutter/material.dart';
import '../../models/call_record.dart';
import '../../services/api_service.dart';
import '../../widgets/usage_limit_modal.dart';

class CallHistoryScreen extends StatefulWidget {
  const CallHistoryScreen({super.key});

  @override
  State<CallHistoryScreen> createState() => _CallHistoryScreenState();
}

class _CallHistoryScreenState extends State<CallHistoryScreen> {
  List<CallRecord> _calls = [];
  bool _isLoading = true;
  String _filterStatus = 'All';
  final List<String> _statusFilters = ['All', 'Completed', 'Failed', 'No Answer', 'Busy'];

  @override
  void initState() {
    super.initState();
    _loadCallHistory();
  }

  Future<void> _loadCallHistory() async {
    setState(() => _isLoading = true);
    try {
      final calls = await ApiService.getCallHistory(limit: 100);
      setState(() {
        _calls = calls;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error loading call history: $e')),
        );
      }
    }
  }

  List<CallRecord> get _filteredCalls {
    if (_filterStatus == 'All') return _calls;
    
    return _calls.where((call) {
      switch (_filterStatus) {
        case 'Completed':
          return call.status == 'completed';
        case 'Failed':
          return call.status == 'failed';
        case 'No Answer':
          return call.status == 'no-answer';
        case 'Busy':
          return call.status == 'busy';
        default:
          return true;
      }
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).colorScheme.surface,
      appBar: AppBar(
        title: const Text('Call History'),
        backgroundColor: Theme.of(context).colorScheme.surface,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadCallHistory,
            tooltip: 'Refresh',
          ),
        ],
      ),
      body: Column(
        children: [
          // Filter section
          _buildFilterSection(),
          
          // Call list
          Expanded(
            child: _isLoading 
                ? _buildLoadingState()
                : _filteredCalls.isEmpty 
                    ? _buildEmptyState()
                    : _buildCallList(),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterSection() {
    return Container(
      padding: const EdgeInsets.all(16.0),
      child: Row(
        children: [
          Text(
            'Filter by status:',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: _statusFilters.map((status) => Padding(
                  padding: const EdgeInsets.only(right: 8.0),
                  child: FilterChip(
                    label: Text(status),
                    selected: _filterStatus == status,
                    onSelected: (selected) {
                      if (selected) {
                        setState(() => _filterStatus = status);
                      }
                    },
                  ),
                )).toList(),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLoadingState() {
    return const Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          CircularProgressIndicator(),
          SizedBox(height: 16),
          Text('Loading call history...'),
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
              Icons.phone_missed,
              size: 80,
              color: Theme.of(context).colorScheme.outline,
            ),
            const SizedBox(height: 16),
            Text(
              _filterStatus == 'All' ? 'No calls yet' : 'No ${_filterStatus.toLowerCase()} calls',
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                color: Theme.of(context).colorScheme.onSurface,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              _filterStatus == 'All' 
                  ? 'Your call history will appear here once you make your first call.'
                  : 'Try changing the filter to see other calls.',
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCallList() {
    return RefreshIndicator(
      onRefresh: _loadCallHistory,
      child: ListView.builder(
        padding: const EdgeInsets.all(16.0),
        itemCount: _filteredCalls.length,
        itemBuilder: (context, index) {
          final call = _filteredCalls[index];
          return _buildCallItem(call);
        },
      ),
    );
  }

  Widget _buildCallItem(CallRecord call) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12.0),
      child: InkWell(
        onTap: () => _showCallDetails(call),
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Row(
            children: [
              // Status icon
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: _getStatusColor(call.status).withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  _getStatusIcon(call.status),
                  color: _getStatusColor(call.status),
                  size: 24,
                ),
              ),
              
              const SizedBox(width: 16),
              
              // Call details
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      call.formattedPhoneNumber,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      call.topic,
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Text(
                          call.displayStatus,
                          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: _getStatusColor(call.status),
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        Text(
                          ' • ${call.formattedDuration}',
                          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: Theme.of(context).colorScheme.onSurfaceVariant,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              
              // Date and actions
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    call.formattedDate,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
                  ),
                  const SizedBox(height: 8),
                  if (call.status == 'completed' || call.status == 'answered')
                    _buildRedialButton(call),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildRedialButton(CallRecord call) {
    return SizedBox(
      height: 32,
      child: OutlinedButton.icon(
        onPressed: () => _redialCall(call),
        icon: const Icon(Icons.call, size: 16),
        label: const Text('Call', style: TextStyle(fontSize: 12)),
        style: OutlinedButton.styleFrom(
          padding: const EdgeInsets.symmetric(horizontal: 12),
          minimumSize: const Size(0, 32),
        ),
      ),
    );
  }

  IconData _getStatusIcon(String status) {
    switch (status) {
      case 'completed':
        return Icons.check_circle;
      case 'answered':
        return Icons.phone;
      case 'failed':
        return Icons.error;
      case 'no-answer':
        return Icons.phone_missed;
      case 'busy':
        return Icons.phone_locked;
      case 'canceled':
        return Icons.cancel;
      case 'initiated':
      case 'ringing':
        return Icons.phone_forwarded;
      default:
        return Icons.phone;
    }
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'completed':
        return Colors.green;
      case 'answered':
        return Colors.blue;
      case 'failed':
        return Colors.red;
      case 'no-answer':
        return Colors.orange;
      case 'busy':
        return Colors.amber;
      case 'canceled':
        return Colors.grey;
      case 'initiated':
      case 'ringing':
        return Colors.blue;
      default:
        return Colors.grey;
    }
  }

  void _showCallDetails(CallRecord call) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => _buildCallDetailsModal(call),
    );
  }

  Widget _buildCallDetailsModal(CallRecord call) {
    return Container(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Row(
            children: [
              Icon(
                _getStatusIcon(call.status),
                color: _getStatusColor(call.status),
                size: 32,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Call Details',
                      style: Theme.of(context).textTheme.headlineSmall,
                    ),
                    Text(
                      call.displayStatus,
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: _getStatusColor(call.status),
                      ),
                    ),
                  ],
                ),
              ),
              IconButton(
                onPressed: () => Navigator.pop(context),
                icon: const Icon(Icons.close),
              ),
            ],
          ),
          
          const SizedBox(height: 24),
          
          // Details
          _buildDetailRow('Phone Number', call.formattedPhoneNumber),
          _buildDetailRow('Topic', call.topic),
          _buildDetailRow('Duration', call.formattedDuration),
          _buildDetailRow('Started', _formatDetailedDate(call.createdAt)),
          if (call.answeredTime != null)
            _buildDetailRow('Answered', _formatDetailedDate(call.answeredTime!)),
          if (call.completedTime != null)
            _buildDetailRow('Completed', _formatDetailedDate(call.completedTime!)),
          
          const SizedBox(height: 24),
          
          // Actions
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () {
                    Navigator.pop(context);
                    _redialCall(call);
                  },
                  icon: const Icon(Icons.call),
                  label: const Text('Call Again'),
                ),
              ),
            ],
          ),
          
          // Safe area padding
          SizedBox(height: MediaQuery.of(context).padding.bottom),
        ],
      ),
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
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: Theme.of(context).textTheme.bodyMedium,
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

  Future<void> _redialCall(CallRecord call) async {
    try {
      // Check if user can make a call before proceeding
      final canMakeCall = await ApiService.canMakePhoneCall();
      if (!canMakeCall) {
        UsageLimitModal.show(
          context: context,
          actionType: 'phone_call',
          message: 'You have reached your phone call limit for this billing period. Please upgrade your plan to make more calls.',
        );
        return;
      }

      // Show loading dialog
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (context) => const AlertDialog(
          content: Row(
            children: [
              CircularProgressIndicator(),
              SizedBox(width: 16),
              Text('Initiating call...'),
            ],
          ),
        ),
      );

      final result = await ApiService.redialCall(
        phoneNumber: call.userPhoneNumber,
        topic: call.topic,
      );

      Navigator.pop(context); // Close loading dialog

      if (result != null) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Call initiated successfully!'),
            backgroundColor: Colors.green,
          ),
        );
        // Refresh call history to show the new call
        _loadCallHistory();
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Failed to initiate call. Please try again.'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } catch (e) {
      Navigator.pop(context); // Close loading dialog if open
      
      if (e is UsageLimitException) {
        UsageLimitModal.show(
          context: context,
          actionType: e.actionType,
          message: e.message,
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    }
  }
} 