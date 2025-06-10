import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../services/api_service.dart';
import '../../widgets/usage_limit_modal.dart';

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

  @override
  void dispose() {
    _phoneController.dispose();
    _topicController.dispose();
    super.dispose();
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
          'PHONE CALL',
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
                    const SizedBox(height: 40),
                    
                    // Phone Number Input
                    _buildPhoneNumberSection(),
                    const SizedBox(height: 32),
                    
                    // Topic Input
                    _buildTopicSection(),
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

  Widget _buildPhoneNumberSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'PHONE NUMBER',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w900,
            color: Colors.black,
            letterSpacing: 1.0,
          ),
        ),
        const SizedBox(height: 16),
        Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: Colors.black,
              width: 2,
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.3),
                blurRadius: 8,
                offset: Offset(0, 4),
              ),
            ],
          ),
          child: TextFormField(
            controller: _phoneController,
            keyboardType: TextInputType.phone,
            inputFormatters: [
              FilteringTextInputFormatter.digitsOnly,
              LengthLimitingTextInputFormatter(10),
              _PhoneNumberFormatter(),
            ],
            style: TextStyle(
              color: Colors.black,
              fontSize: 16,
              fontWeight: FontWeight.w600,
            ),
            decoration: InputDecoration(
              hintText: '(555) 123-4567',
              hintStyle: TextStyle(
                color: Colors.black.withOpacity(0.6),
              ),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(16),
                borderSide: BorderSide.none,
              ),
              filled: true,
              fillColor: Colors.white,
              contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 20),
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
          ),
        ),
        const SizedBox(height: 8),
        Text(
          'Enter a US phone number (10 digits)',
          style: TextStyle(
            fontSize: 14,
            color: Colors.black.withOpacity(0.7),
            fontWeight: FontWeight.w500,
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
          'CONVERSATION TOPIC',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w900,
            color: Colors.black,
            letterSpacing: 1.0,
          ),
        ),
        const SizedBox(height: 16),
        Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: Colors.black,
              width: 2,
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.3),
                blurRadius: 8,
                offset: Offset(0, 4),
              ),
            ],
          ),
          child: TextFormField(
            controller: _topicController,
            maxLines: 4,
            style: TextStyle(
              color: Colors.black,
              fontSize: 16,
              fontWeight: FontWeight.w600,
            ),
            decoration: InputDecoration(
              hintText: 'What would you like to discuss?',
              hintStyle: TextStyle(
                color: Colors.black.withOpacity(0.6),
              ),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(16),
                borderSide: BorderSide.none,
              ),
              filled: true,
              fillColor: Colors.white,
              contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 20),
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
          ),
        ),
      ],
    );
  }

  Widget _buildCallButton() {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.red,
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
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Colors.white,
                    ),
                  )
                : const Icon(Icons.call, color: Colors.white),
            label: Text(
              _isLoading ? 'INITIATING CALL...' : 'START CALL',
              style: TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.w900,
                fontSize: 16,
                letterSpacing: 1.0,
              ),
            ),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.black,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(20),
              ),
              elevation: 8,
              shadowColor: Colors.black.withOpacity(0.3),
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