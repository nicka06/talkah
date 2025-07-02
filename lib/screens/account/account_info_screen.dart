/// AccountInfoScreen - User account information and settings management
/// 
/// This screen provides comprehensive account management functionality:
/// - Displays current user information (email, password status)
/// - Allows email address changes with verification
/// - Supports password updates with security validation
/// - Shows pending verification states for account changes
/// - Integrates with authentication BLoC for state management
/// 
/// ARCHITECTURE:
/// - Uses BLoC pattern for authentication state management
/// - Integrates with ApiService for account updates
/// - Handles pending verification states for security
/// - Provides secure password masking and validation
/// 
/// USER FLOW:
/// 1. Display current account information
/// 2. Allow user to edit email or password
/// 3. Show pending verification states
/// 4. Handle verification completion
/// 5. Update account information securely
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../blocs/auth/auth_bloc.dart';
import '../../blocs/auth/auth_state.dart';
import '../../blocs/auth/auth_event.dart';
import '../../models/user_model.dart';
import '../../services/api_service.dart';
import '../../config/supabase_config.dart';
import 'package:url_launcher/url_launcher.dart';

/// Account information and settings management screen
class AccountInfoScreen extends StatefulWidget {
  const AccountInfoScreen({super.key});

  @override
  State<AccountInfoScreen> createState() => _AccountInfoScreenState();
}

class _AccountInfoScreenState extends State<AccountInfoScreen> {
  /// Current user data from authentication state
  UserModel? _currentUser;
  
  /// Whether password change is pending verification
  bool _passwordPendingVerification = false;
  
  /// Length of password for display masking (default 10 characters)
  int _passwordLength = 10;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFDC2626), // Talkah red
      body: SafeArea(
        child: Column(
          children: [
            // Header with back button
            Padding(
              padding: const EdgeInsets.all(16.0),
              child: Row(
                children: [
                  IconButton(
                    onPressed: () => Navigator.of(context).pop(),
                    icon: const Icon(Icons.arrow_back, color: Colors.white),
                  ),
                  const Expanded(
                    child: Text(
                      'Account Info',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ),
                  const SizedBox(width: 48), // Balance the back button
                ],
              ),
            ),
            
            // Main content
            Expanded(
              child: Container(
                margin: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: Colors.black, width: 2),
                ),
                child: BlocBuilder<AuthBloc, AuthState>(
                  builder: (context, state) {
                    if (state is AuthAuthenticated) {
                      _currentUser = state.user;
                      final user = state.user;
                      final emailPendingVerification = user.hasEmailVerificationPending;
                      
                      return Padding(
                        padding: const EdgeInsets.all(24.0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.center,
                          children: [
                            const SizedBox(height: 32),
                            
                            // Email Field
                            _buildInfoRow(
                              label: 'Email',
                              value: user.email,
                              isPassword: false,
                              isPending: emailPendingVerification,
                              pendingValue: user.pendingEmail,
                              onEdit: () => _showEmailChangeDialog(),
                            ),
                            
                            const SizedBox(height: 16),
                            
                            // Password Field
                            _buildInfoRow(
                              label: 'Password',
                              value: _generatePasswordMask(_passwordLength),
                              isPassword: true,
                              isPending: _passwordPendingVerification,
                              pendingValue: null,
                              onEdit: () => _showPasswordChangeDialog(),
                            ),
                            
                            const SizedBox(height: 24),
                            
                            // Delete Account Link
                            GestureDetector(
                              onTap: () => _openDeleteAccountPage(),
                              child: Container(
                                padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
                                decoration: BoxDecoration(
                                  color: Colors.red[50],
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(color: Colors.red[300]!, width: 1),
                                ),
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Icon(
                                      Icons.delete_forever,
                                      color: Colors.red[600],
                                      size: 16,
                                    ),
                                    const SizedBox(width: 8),
                                    Text(
                                      'Delete Account',
                                      style: TextStyle(
                                        color: Colors.red[600],
                                        fontSize: 14,
                                        fontWeight: FontWeight.w500,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ],
                        ),
                      );
                    }
                    
                    return const Center(
                      child: CircularProgressIndicator(),
                    );
                  },
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoRow({
    required String label,
    required String value,
    required bool isPassword,
    required bool isPending,
    String? pendingValue,
    required VoidCallback onEdit,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.black,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.black, width: 2),
      ),
      child: Column(
        children: [
          // Label
          Text(
            label,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 18,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 12),
          
          // Value and Edit Button Row
          Row(
            children: [
              Expanded(
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.grey[800],
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    value,
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 16,
                      fontFamily: isPassword ? 'monospace' : null,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              GestureDetector(
                onTap: isPending ? () => _showPendingVerificationDialog(label, isPassword, pendingValue) : onEdit,
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFDC2626),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(
                    isPending ? Icons.schedule : Icons.edit,
                    color: Colors.white,
                    size: 20,
                  ),
                ),
              ),
            ],
          ),
          
          // Pending verification notice
          if (isPending && pendingValue != null) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.orange[100],
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.orange[300]!, width: 1),
              ),
              child: Row(
                children: [
                  Icon(Icons.schedule, color: Colors.orange[600], size: 16),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Pending verification to $pendingValue',
                      style: TextStyle(
                        color: Colors.orange[800],
                        fontSize: 14,
                      ),
                    ),
                  ),
                  GestureDetector(
                    onTap: () => _cancelEmailChange(),
                    child: Text(
                      'Cancel',
                      style: TextStyle(
                        color: Colors.red[600],
                        fontSize: 14,
                        decoration: TextDecoration.underline,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  String _generatePasswordMask(int length) {
    return '*' * length;
  }

  void _showEmailChangeDialog() {
    // Check if there's already a pending email change
    if (_currentUser?.hasEmailVerificationPending == true) {
      showDialog(
        context: context,
        builder: (context) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: const Text('Email Change Pending'),
          content: Text(
            'You already have a pending email change to ${_currentUser?.pendingEmail ?? 'a new address'}. Please check your email for the verification link or cancel the current change first.',
            textAlign: TextAlign.center,
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('OK'),
            ),
            TextButton(
              onPressed: () {
                Navigator.of(context).pop();
                _cancelEmailChange();
              },
              child: Text(
                'Cancel Current Change',
                style: TextStyle(color: Colors.red),
              ),
            ),
          ],
        ),
      );
      return;
    }

    final emailController = TextEditingController();
    
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Change Email'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text(
                'Enter your new email address. A verification email will be sent to confirm the change.',
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 16),
              TextField(
                controller: emailController,
                keyboardType: TextInputType.emailAddress,
                decoration: const InputDecoration(
                  labelText: 'New Email',
                  border: OutlineInputBorder(),
                ),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
            ),
            onPressed: () {
              final newEmail = emailController.text.trim();
              if (newEmail.isEmpty) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Please enter an email address')),
                );
                return;
              }
              if (!RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$').hasMatch(newEmail)) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Please enter a valid email address')),
                );
                return;
              }
              if (newEmail == _currentUser?.email) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('This is already your current email address')),
                );
                return;
              }
              Navigator.of(context).pop();
              _initiateEmailChange(newEmail);
            },
            child: const Text('Send Verification'),
          ),
        ],
      ),
    );
  }

  void _showPasswordChangeDialog() {
    // Note: Unlike email, we allow password changes even if email is pending
    // but we check if password change is already pending
    if (_passwordPendingVerification) {
      showDialog(
        context: context,
        builder: (context) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: const Text('Password Change Pending'),
          content: const Text(
            'You already have a pending password change. Please wait for it to complete before initiating another change.',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('OK'),
            ),
          ],
        ),
      );
      return;
    }

    final currentPasswordController = TextEditingController();
    final newPasswordController = TextEditingController();
    final confirmPasswordController = TextEditingController();
    
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Change Password'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text(
                'Enter your current password and new password. Your password will be updated immediately after verification.',
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 16),
              TextField(
                controller: currentPasswordController,
                obscureText: true,
                decoration: const InputDecoration(
                  labelText: 'Current Password',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: newPasswordController,
                obscureText: true,
                decoration: const InputDecoration(
                  labelText: 'New Password',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: confirmPasswordController,
                obscureText: true,
                decoration: const InputDecoration(
                  labelText: 'Confirm New Password',
                  border: OutlineInputBorder(),
                ),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
            ),
            onPressed: () {
              final currentPassword = currentPasswordController.text;
              final newPassword = newPasswordController.text;
              final confirmPassword = confirmPasswordController.text;
              
              if (currentPassword.isEmpty) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Please enter your current password')),
                );
                return;
              }
              
              if (newPassword.length < 6) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('New password must be at least 6 characters')),
                );
                return;
              }
              
              if (newPassword != confirmPassword) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Passwords do not match')),
                );
                return;
              }
              
              if (newPassword == currentPassword) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('New password must be different from current password')),
                );
                return;
              }
              
              Navigator.of(context).pop();
              _initiatePasswordChange(currentPassword, newPassword);
            },
            child: const Text('Update Password'),
          ),
        ],
      ),
    );
  }

  void _showPendingVerificationDialog(String fieldType, bool isPassword, String? pendingValue) {
    final String message = isPassword 
        ? 'This password will change pending based on a verification process.'
        : 'This email will change pending based on a verification link sent to ${pendingValue ?? 'your new email address'}.';
        
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text('Pending ${fieldType} Verification'),
        content: Text(
          message,
          textAlign: TextAlign.center,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('OK'),
          ),
          if (!isPassword) ...[
            TextButton(
              onPressed: () {
                Navigator.of(context).pop();
                _cancelEmailChange();
              },
              child: Text(
                'Cancel Change',
                style: TextStyle(color: Colors.red),
              ),
            ),
          ],
        ],
      ),
    );
  }

  void _cancelEmailChange() async {
    try {
      // Clear the pending_email from the database
      final userId = _currentUser?.id;
      if (userId == null) return;

      await SupabaseConfig.client
          .from('users')
          .update({'pending_email': null})
          .eq('id', userId);

      // Refresh user data
      context.read<AuthBloc>().add(AuthCheckRequested());
      
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Email change cancelled'),
          backgroundColor: Colors.grey,
        ),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Failed to cancel email change: $e'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  void _initiateEmailChange(String newEmail) async {
    try {
      // Only trigger the Supabase auth email change (this sends ONE verification email)
      final success = await ApiService.initiateEmailChange(newEmail: newEmail);
      
      if (success) {
        // Refresh user data to show any changes
        context.read<AuthBloc>().add(AuthCheckRequested());
        
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Verification email sent to $newEmail. Please check your email and click the verification link.'),
            backgroundColor: Colors.orange,
            duration: const Duration(seconds: 5),
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Failed to initiate email change. Please try again.'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error: $e'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  void _initiatePasswordChange(String currentPassword, String newPassword) async {
    setState(() {
      _passwordPendingVerification = true;
    });
    
    try {
      final success = await ApiService.initiatePasswordChange(
        currentPassword: currentPassword,
        newPassword: newPassword,
      );
      
      if (success) {
        setState(() {
          _passwordPendingVerification = false;
        });
        
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Password updated successfully!'),
            backgroundColor: Colors.green,
          ),
        );
      } else {
        setState(() {
          _passwordPendingVerification = false;
        });
        
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Failed to update password. Please check your current password and try again.'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } catch (e) {
      setState(() {
        _passwordPendingVerification = false;
      });
      
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error: $e'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  void _openDeleteAccountPage() async {
    final url = 'https://talkah.com/delete-accountac';
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Delete Account'),
        content: const Text(
          'This will open the account deletion page in your browser. Are you sure you want to proceed?',
          textAlign: TextAlign.center,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
            ),
            onPressed: () async {
              Navigator.of(context).pop();
              final uri = Uri.parse(url);
              if (await canLaunchUrl(uri)) {
                await launchUrl(uri, mode: LaunchMode.externalApplication);
              } else {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text('Could not open browser. Please visit: $url'),
                    backgroundColor: Colors.orange,
                    duration: const Duration(seconds: 5),
                  ),
                );
              }
            },
            child: const Text('Open Page'),
          ),
        ],
      ),
    );
  }
} 