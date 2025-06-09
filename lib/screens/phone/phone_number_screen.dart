import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../models/call_record.dart';
import '../../services/api_service.dart';
import '../../widgets/usage_limit_modal.dart';
import 'call_history_screen.dart';

class PhoneNumberScreen extends StatefulWidget {
  const PhoneNumberScreen({super.key});

  @override
  State<PhoneNumberScreen> createState() => _PhoneNumberScreenState();
}

class _PhoneNumberScreenState extends State<PhoneNumberScreen> {
  final _phoneController = TextEditingController();
  final _topicController = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  
  bool _isLoading = false;
  List<CallRecord> _recentCalls = [];
  List<String> _recentTopics = [];

  // Predefined topic suggestions
  final List<String> _topicSuggestions = [
    'Career Development',
    'Business Strategy',
    'Technology Trends',
    'Personal Growth',
    'Health & Wellness',
    'Financial Planning',
    'Creative Projects',
    'Travel Planning',
    'Educational Goals',
    'Relationship Advice',
  ];

  @override
  void initState() {
    super.initState();
    _loadRecentCalls();
  }

  @override
  void dispose() {
    _phoneController.dispose();
    _topicController.dispose();
    super.dispose();
  }

  Future<void> _loadRecentCalls() async {
    try {
      final calls = await ApiService.getCallHistory(limit: 10);
      setState(() {
        _recentCalls = calls;
        // Extract unique topics from recent calls
        _recentTopics = calls.map((call) => call.topic).toSet().toList();
      });
    } catch (e) {
      // Ignore errors loading recent calls
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).colorScheme.surface,
      appBar: AppBar(
        title: const Text('Make a Call'),
        backgroundColor: Theme.of(context).colorScheme.surface,
        elevation: 0,
      ),
      body: Form(
        key: _formKey,
        child: Column(
          children: [
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(24.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Header
                    _buildHeader(),
                    const SizedBox(height: 32),
                    
                    // Phone Number Input
                    _buildPhoneNumberSection(),
                    const SizedBox(height: 24),
                    
                    // Topic Input
                    _buildTopicSection(),
                    const SizedBox(height: 32),
                    
                    // Recent Calls Section
                    if (_recentCalls.isNotEmpty) ...[
                      _buildRecentCallsSection(),
                      const SizedBox(height: 24),
                    ],
                  ],
                ),
              ),
            ),
            
            // Call Button
            _buildCallButton(),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.primary,
                borderRadius: BorderRadius.circular(16),
              ),
              child: Icon(
                Icons.phone,
                color: Theme.of(context).colorScheme.onPrimary,
                size: 28,
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'AI Phone Call',
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  Text(
                    'Have a conversation with AI about any topic',
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildPhoneNumberSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Phone Number',
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 8),
        TextFormField(
          controller: _phoneController,
          keyboardType: TextInputType.phone,
          inputFormatters: [
            FilteringTextInputFormatter.digitsOnly,
            LengthLimitingTextInputFormatter(10),
            _PhoneNumberFormatter(),
          ],
          decoration: InputDecoration(
            hintText: '(555) 123-4567',
            prefixIcon: const Icon(Icons.phone),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
            ),
            suffixIcon: _phoneController.text.isNotEmpty
                ? IconButton(
                    icon: const Icon(Icons.clear),
                    onPressed: () {
                      _phoneController.clear();
                      setState(() {});
                    },
                  )
                : null,
          ),
          validator: (value) {
            if (value == null || value.isEmpty) {
              return 'Please enter a phone number';
            }
            final cleaned = value.replaceAll(RegExp(r'[^\d]'), '');
            if (cleaned.length != 10) {
              return 'Please enter a valid 10-digit phone number';
            }
            return null;
          },
          onChanged: (value) {
            setState(() {}); // Update UI for suffix icon
          },
        ),
        const SizedBox(height: 8),
        Text(
          'Enter a US phone number (10 digits)',
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
            color: Theme.of(context).colorScheme.onSurfaceVariant,
          ),
        ),
      ],
    );
  }

  Widget _buildTopicSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Conversation Topic',
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 8),
        TextFormField(
          controller: _topicController,
          maxLines: 3,
          decoration: InputDecoration(
            hintText: 'What would you like to discuss?',
            prefixIcon: const Padding(
              padding: EdgeInsets.only(bottom: 48),
              child: Icon(Icons.chat_bubble_outline),
            ),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
            ),
            suffixIcon: _topicController.text.isNotEmpty
                ? Padding(
                    padding: const EdgeInsets.only(bottom: 48),
                    child: IconButton(
                      icon: const Icon(Icons.clear),
                      onPressed: () {
                        _topicController.clear();
                        setState(() {});
                      },
                    ),
                  )
                : null,
          ),
          validator: (value) {
            if (value == null || value.trim().isEmpty) {
              return 'Please enter a conversation topic';
            }
            if (value.trim().length < 3) {
              return 'Topic must be at least 3 characters';
            }
            return null;
          },
          onChanged: (value) {
            setState(() {}); // Update UI for suffix icon
          },
        ),
        const SizedBox(height: 16),
        
        // Topic Suggestions
        _buildTopicSuggestions(),
      ],
    );
  }

  Widget _buildTopicSuggestions() {
    final suggestionsToShow = _recentTopics.isNotEmpty 
        ? [..._recentTopics.take(3), ..._topicSuggestions.take(7)]
        : _topicSuggestions.take(10).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          _recentTopics.isNotEmpty ? 'Recent & Suggested Topics' : 'Suggested Topics',
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
            fontWeight: FontWeight.w500,
            color: Theme.of(context).colorScheme.onSurfaceVariant,
          ),
        ),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: suggestionsToShow.map((topic) {
            final isRecent = _recentTopics.contains(topic);
            return ActionChip(
              label: Text(topic),
              onPressed: () {
                _topicController.text = topic;
                setState(() {});
              },
              backgroundColor: isRecent 
                  ? Theme.of(context).colorScheme.primaryContainer
                  : null,
              side: isRecent 
                  ? BorderSide(color: Theme.of(context).colorScheme.primary)
                  : null,
            );
          }).toList(),
        ),
      ],
    );
  }

  Widget _buildRecentCallsSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Text(
              'Recent Calls',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
            const Spacer(),
            TextButton(
              onPressed: () {
                Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (context) => const CallHistoryScreen(),
                  ),
                );
              },
              child: const Text('View All'),
            ),
          ],
        ),
        const SizedBox(height: 12),
        ...(_recentCalls.take(3).map((call) => _buildRecentCallItem(call))),
      ],
    );
  }

  Widget _buildRecentCallItem(CallRecord call) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: _getCallStatusColor(call.status).withOpacity(0.1),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(
            _getCallStatusIcon(call.status),
            color: _getCallStatusColor(call.status),
            size: 20,
          ),
        ),
        title: Text(
          call.formattedPhoneNumber,
          style: const TextStyle(fontWeight: FontWeight.w500),
        ),
        subtitle: Text(
          call.topic,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              call.formattedDate,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(width: 8),
            IconButton(
              icon: const Icon(Icons.call, size: 20),
              onPressed: () => _fillFromRecentCall(call),
              tooltip: 'Use this call',
            ),
          ],
        ),
        onTap: () => _fillFromRecentCall(call),
      ),
    );
  }

  void _fillFromRecentCall(CallRecord call) {
    _phoneController.text = _formatPhoneNumber(call.userPhoneNumber);
    _topicController.text = call.topic;
    setState(() {});
  }

  String _formatPhoneNumber(String phone) {
    final cleaned = phone.replaceAll(RegExp(r'[^\d]'), '');
    if (cleaned.length == 10) {
      return '(${cleaned.substring(0, 3)}) ${cleaned.substring(3, 6)}-${cleaned.substring(6)}';
    } else if (cleaned.length == 11 && cleaned.startsWith('1')) {
      final withoutCountry = cleaned.substring(1);
      return '(${withoutCountry.substring(0, 3)}) ${withoutCountry.substring(3, 6)}-${withoutCountry.substring(6)}';
    }
    return phone;
  }

  Widget _buildCallButton() {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        border: Border(
          top: BorderSide(
            color: Theme.of(context).colorScheme.outline.withOpacity(0.2),
          ),
        ),
      ),
      child: SafeArea(
        child: SizedBox(
          width: double.infinity,
          height: 56,
          child: ElevatedButton.icon(
            onPressed: _isLoading ? null : _initiateCall,
            icon: _isLoading 
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.call),
            label: Text(_isLoading ? 'Initiating Call...' : 'Start Call'),
            style: ElevatedButton.styleFrom(
              backgroundColor: Theme.of(context).colorScheme.primary,
              foregroundColor: Theme.of(context).colorScheme.onPrimary,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _initiateCall() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);

    try {
      // Check if user can make a call
      final canMakeCall = await ApiService.canMakePhoneCall();
      if (!canMakeCall) {
        UsageLimitModal.show(
          context: context,
          actionType: 'phone_call',
          message: 'You have reached your phone call limit for this billing period. Please upgrade your plan to make more calls.',
        );
        setState(() => _isLoading = false);
        return;
      }

      // Format phone number for API call
      final cleanPhone = _phoneController.text.replaceAll(RegExp(r'[^\d]'), '');
      final formattedPhone = '+1$cleanPhone'; // Add US country code
      
      final result = await ApiService.initiateCall(
        phoneNumber: formattedPhone,
        topic: _topicController.text.trim(),
      );

      if (result != null && mounted) {
        // Show success message and navigate back to dashboard
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Call initiated successfully!'),
            backgroundColor: Colors.green,
          ),
        );
        
        // Navigate back to dashboard
        Navigator.of(context).popUntil((route) => route.isFirst);
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Failed to initiate call. Please try again.'),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
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
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  IconData _getCallStatusIcon(String status) {
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
      default:
        return Icons.phone;
    }
  }

  Color _getCallStatusColor(String status) {
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
      default:
        return Colors.grey;
    }
  }
}

// Custom formatter for phone numbers
class _PhoneNumberFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(
    TextEditingValue oldValue,
    TextEditingValue newValue,
  ) {
    final text = newValue.text.replaceAll(RegExp(r'[^\d]'), '');
    
    if (text.length <= 3) {
      return newValue.copyWith(
        text: text.isEmpty ? '' : '($text',
        selection: TextSelection.collapsed(offset: text.isEmpty ? 0 : text.length + 1),
      );
    } else if (text.length <= 6) {
      final formatted = '(${text.substring(0, 3)}) ${text.substring(3)}';
      return newValue.copyWith(
        text: formatted,
        selection: TextSelection.collapsed(offset: formatted.length),
      );
    } else {
      final formatted = '(${text.substring(0, 3)}) ${text.substring(3, 6)}-${text.substring(6)}';
      return newValue.copyWith(
        text: formatted,
        selection: TextSelection.collapsed(offset: formatted.length),
      );
    }
  }
} 