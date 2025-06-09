import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../services/api_service.dart';
import '../../widgets/usage_limit_modal.dart';

class SmsScreen extends StatefulWidget {
  const SmsScreen({super.key});

  @override
  State<SmsScreen> createState() => _SmsScreenState();
}

class _SmsScreenState extends State<SmsScreen> {
  final _phoneController = TextEditingController();
  final _topicController = TextEditingController();
  final _messageController = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  
  bool _isLoading = false;
  bool _isAiMode = true; // Toggle between AI and Standard mode
  int _messageCount = 5; // Number of exchanges for AI mode

  // Predefined topic suggestions for AI mode
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
    'Cooking & Recipes',
    'Fitness & Exercise',
    'Mental Health',
    'Learning Languages',
    'Book Recommendations',
  ];

  @override
  void dispose() {
    _phoneController.dispose();
    _topicController.dispose();
    _messageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).colorScheme.surface,
      appBar: AppBar(
        title: const Text('Send SMS'),
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
                    
                    // Mode Toggle
                    _buildModeToggle(),
                    const SizedBox(height: 24),
                    
                    // Phone Number Input
                    _buildPhoneNumberSection(),
                    const SizedBox(height: 24),
                    
                    // Conditional Content based on mode
                    if (_isAiMode) ...[
                      _buildAiModeContent(),
                    ] else ...[
                      _buildStandardModeContent(),
                    ],
                  ],
                ),
              ),
            ),
            
            // Send Button
            _buildSendButton(),
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
                color: Theme.of(context).colorScheme.secondary,
                borderRadius: BorderRadius.circular(16),
              ),
              child: Icon(
                Icons.sms,
                color: Theme.of(context).colorScheme.onSecondary,
                size: 28,
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'SMS Messages',
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  Text(
                    'Send AI conversations or custom messages via SMS',
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

  Widget _buildModeToggle() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Message Type',
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 12),
        Container(
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.surfaceContainerHighest,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Row(
            children: [
              Expanded(
                child: GestureDetector(
                  onTap: () => setState(() => _isAiMode = true),
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    decoration: BoxDecoration(
                      color: _isAiMode 
                          ? Theme.of(context).colorScheme.secondary
                          : Colors.transparent,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      'AI Conversation',
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: _isAiMode 
                            ? Theme.of(context).colorScheme.onSecondary
                            : Theme.of(context).colorScheme.onSurfaceVariant,
                        fontWeight: _isAiMode ? FontWeight.w600 : FontWeight.normal,
                      ),
                    ),
                  ),
                ),
              ),
              Expanded(
                child: GestureDetector(
                  onTap: () => setState(() => _isAiMode = false),
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    decoration: BoxDecoration(
                      color: !_isAiMode 
                          ? Theme.of(context).colorScheme.secondary
                          : Colors.transparent,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      'Standard Message',
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: !_isAiMode 
                            ? Theme.of(context).colorScheme.onSecondary
                            : Theme.of(context).colorScheme.onSurfaceVariant,
                        fontWeight: !_isAiMode ? FontWeight.w600 : FontWeight.normal,
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
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

  Widget _buildAiModeContent() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Topic Input
        _buildTopicSection(),
        const SizedBox(height: 24),
        
        // Message Count Selector
        _buildMessageCountSection(),
        const SizedBox(height: 24),
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
          validator: _isAiMode ? (value) {
            if (value == null || value.trim().isEmpty) {
              return 'Please enter a conversation topic';
            }
            if (value.trim().length < 3) {
              return 'Topic must be at least 3 characters';
            }
            return null;
          } : null,
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
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Suggested Topics',
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
            fontWeight: FontWeight.w500,
            color: Theme.of(context).colorScheme.onSurfaceVariant,
          ),
        ),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: _topicSuggestions.take(10).map((topic) {
            return ActionChip(
              label: Text(topic),
              onPressed: () {
                _topicController.text = topic;
                setState(() {});
              },
            );
          }).toList(),
        ),
      ],
    );
  }

  Widget _buildMessageCountSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Number of Message Exchanges',
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          'How many back-and-forth exchanges do you want? (You send → AI responds)',
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
            color: Theme.of(context).colorScheme.onSurfaceVariant,
          ),
        ),
        const SizedBox(height: 12),
        
        Row(
          children: [
            Expanded(
              child: Slider(
                value: _messageCount.toDouble(),
                min: 1,
                max: 20,
                divisions: 19,
                label: '$_messageCount exchanges',
                onChanged: (value) {
                  setState(() {
                    _messageCount = value.round();
                  });
                },
              ),
            ),
            Container(
              width: 60,
              height: 40,
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.secondaryContainer,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Center(
                child: Text(
                  '$_messageCount',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: Theme.of(context).colorScheme.onSecondaryContainer,
                  ),
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildStandardModeContent() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Message',
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 8),
        TextFormField(
          controller: _messageController,
          maxLines: 5,
          maxLength: 160, // SMS character limit
          decoration: InputDecoration(
            hintText: 'Type your message here...',
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
            ),
            suffixIcon: _messageController.text.isNotEmpty
                ? Padding(
                    padding: const EdgeInsets.only(bottom: 100),
                    child: IconButton(
                      icon: const Icon(Icons.clear),
                      onPressed: () {
                        _messageController.clear();
                        setState(() {});
                      },
                    ),
                  )
                : null,
          ),
          validator: !_isAiMode ? (value) {
            if (value == null || value.trim().isEmpty) {
              return 'Please enter a message';
            }
            if (value.trim().length < 1) {
              return 'Message cannot be empty';
            }
            return null;
          } : null,
          onChanged: (value) {
            setState(() {}); // Update UI for suffix icon and character count
          },
        ),
        const SizedBox(height: 24),
      ],
    );
  }

  Widget _buildSendButton() {
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
            onPressed: _isLoading ? null : _sendSms,
            icon: _isLoading 
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : Icon(_isAiMode ? Icons.smart_toy : Icons.send),
            label: Text(_isLoading 
                ? 'Sending...' 
                : _isAiMode 
                    ? 'Start AI Conversation' 
                    : 'Send Message'),
            style: ElevatedButton.styleFrom(
              backgroundColor: Theme.of(context).colorScheme.secondary,
              foregroundColor: Theme.of(context).colorScheme.onSecondary,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _sendSms() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);

    try {
      // Check if user can send SMS
      final canSendSms = await ApiService.canStartTextChat(); // We'll update this method name
      if (!canSendSms) {
        UsageLimitModal.show(
          context: context,
          actionType: 'text_chain',
          message: 'You have reached your SMS limit for this billing period. Please upgrade your plan to send more messages.',
        );
        setState(() => _isLoading = false);
        return;
      }

      // Format phone number for API call
      final cleanPhone = _phoneController.text.replaceAll(RegExp(r'[^\d]'), '');
      final formattedPhone = '+1$cleanPhone'; // Add US country code

      Map<String, dynamic>? result;

      if (_isAiMode) {
        // TODO: Call AI SMS conversation API
        result = await ApiService.initiateSmsConversation(
          phoneNumber: formattedPhone,
          topic: _topicController.text.trim(),
          messageCount: _messageCount,
        );
      } else {
        // TODO: Call standard SMS API
        result = await ApiService.sendSingleSms(
          phoneNumber: formattedPhone,
          message: _messageController.text.trim(),
        );
      }

      if (result != null && mounted) {
        // Show success message and navigate back to dashboard
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(_isAiMode 
                ? 'AI conversation started! They will receive the first message shortly.'
                : 'Message sent successfully!'),
            backgroundColor: Colors.green,
          ),
        );
        
        // Navigate back to dashboard
        Navigator.of(context).popUntil((route) => route.isFirst);
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Failed to send SMS. Please try again.'),
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
}

// Custom formatter for phone numbers (reused from phone_number_screen)
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