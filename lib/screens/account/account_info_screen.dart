import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../blocs/auth/auth_bloc.dart';
import '../../blocs/auth/auth_state.dart';
import '../../blocs/auth/auth_event.dart';
import '../../models/user_model.dart';
import '../../services/api_service.dart';

class AccountInfoScreen extends StatefulWidget {
  const AccountInfoScreen({super.key});

  @override
  State<AccountInfoScreen> createState() => _AccountInfoScreenState();
}

class _AccountInfoScreenState extends State<AccountInfoScreen> {
  UserModel? _currentUser;
  bool _emailPendingVerification = false;
  bool _passwordPendingVerification = false;
  String? _pendingEmail; // Store the pending email address
  int _passwordLength = 10; // Default password length for display

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).colorScheme.surface,
      appBar: AppBar(
        backgroundColor: Theme.of(context).colorScheme.surface,
        elevation: 0,
        leading: IconButton(
          icon: Icon(
            Icons.arrow_back_ios,
            color: Theme.of(context).colorScheme.onSurface,
          ),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Text(
          'Account Info',
          style: TextStyle(
            color: Theme.of(context).colorScheme.onSurface,
            fontWeight: FontWeight.w600,
          ),
        ),
        centerTitle: true,
      ),
      body: BlocListener<AuthBloc, AuthState>(
        listener: (context, state) {
          if (state is AuthError) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text('Error: ${state.error.message}')),
            );
          }
        },
        child: BlocBuilder<AuthBloc, AuthState>(
          builder: (context, state) {
            if (state is AuthAuthenticated || state is AuthUpdating) {
              final user = state is AuthAuthenticated ? state.user : (state as AuthUpdating).user;
              _currentUser = user;
              
              return Padding(
                padding: const EdgeInsets.all(24.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Account Information',
                      style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.bold,
                        color: Theme.of(context).colorScheme.onSurface,
                      ),
                    ),
                    
                    const SizedBox(height: 32),
                    
                    // Email Field
                    _buildInfoRow(
                      label: 'Email',
                      value: user.email,
                      isPassword: false,
                      isPending: _emailPendingVerification,
                      onEdit: () => _showEmailChangeDialog(),
                    ),
                    
                    const SizedBox(height: 16),
                    
                    // Password Field
                    _buildInfoRow(
                      label: 'Password',
                      value: _generatePasswordMask(_passwordLength),
                      isPassword: true,
                      isPending: _passwordPendingVerification,
                      onEdit: () => _showPasswordChangeDialog(),
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
    );
  }

  Widget _buildInfoRow({
    required String label,
    required String value,
    required bool isPassword,
    required bool isPending,
    required VoidCallback onEdit,
  }) {
    return Container(
      padding: const EdgeInsets.all(16.0),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceVariant.withOpacity(0.3),
        borderRadius: BorderRadius.circular(12),
        border: isPending ? Border.all(
          color: Colors.orange,
          width: 1,
        ) : null,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                label,
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                  color: Theme.of(context).colorScheme.onSurface,
                ),
              ),
              IconButton(
                onPressed: onEdit,
                icon: Icon(
                  Icons.edit,
                  color: Theme.of(context).colorScheme.primary,
                  size: 20,
                ),
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(),
              ),
            ],
          ),
          
          const SizedBox(height: 8),
          
          Text(
            value,
            style: Theme.of(context).textTheme.bodyLarge?.copyWith(
              color: Theme.of(context).colorScheme.onSurfaceVariant,
              fontFamily: isPassword ? 'monospace' : null,
            ),
          ),
          
          if (isPending) ...[
            const SizedBox(height: 8),
            GestureDetector(
              onTap: () => _showPendingVerificationDialog(label, isPassword),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.orange.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.orange, width: 1),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      Icons.pending,
                      color: Colors.orange,
                      size: 16,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      'Pending Verification',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: Colors.orange,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const SizedBox(width: 4),
                    Icon(
                      Icons.info_outline,
                      color: Colors.orange,
                      size: 14,
                    ),
                  ],
                ),
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
    if (_emailPendingVerification) {
      showDialog(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('Email Change Pending'),
          content: Text(
            'You already have a pending email change to ${_pendingEmail ?? 'a new address'}. Please check your email for the verification link or cancel the current change first.',
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
        title: const Text('Change Email'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Enter your new email address. A verification email will be sent to confirm the change.',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: emailController,
              keyboardType: TextInputType.emailAddress,
              decoration: const InputDecoration(
                labelText: 'New Email',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.email_outlined),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
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
        title: const Text('Change Password'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Enter your current password and new password. Your password will be updated immediately after verification.',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: currentPasswordController,
              obscureText: true,
              decoration: const InputDecoration(
                labelText: 'Current Password',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.lock_outline),
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: newPasswordController,
              obscureText: true,
              decoration: const InputDecoration(
                labelText: 'New Password',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.lock_outline),
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: confirmPasswordController,
              obscureText: true,
              decoration: const InputDecoration(
                labelText: 'Confirm New Password',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.lock_outline),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              if (_validatePasswordChange(
                currentPasswordController.text,
                newPasswordController.text,
                confirmPasswordController.text,
              )) {
                Navigator.of(context).pop();
                _initiatePasswordChange(
                  currentPasswordController.text,
                  newPasswordController.text,
                );
              }
            },
            child: const Text('Update Password'),
          ),
        ],
      ),
    );
  }

  bool _validatePasswordChange(String current, String newPassword, String confirm) {
    if (current.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter your current password')),
      );
      return false;
    }
    
    if (newPassword.isEmpty || newPassword.length < 6) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('New password must be at least 6 characters')),
      );
      return false;
    }
    
    if (newPassword == current) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('New password must be different from current password')),
      );
      return false;
    }
    
    if (newPassword != confirm) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Passwords do not match')),
      );
      return false;
    }
    
    return true;
  }

  void _showPendingVerificationDialog(String fieldType, bool isPassword) {
    final String message = isPassword 
        ? 'This password will change pending based on a verification process.'
        : 'This email will change pending based on a verification link sent to ${_pendingEmail ?? 'your new email address'}.';
        
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Pending ${fieldType} Verification'),
        content: Text(message),
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

  void _cancelEmailChange() {
    setState(() {
      _emailPendingVerification = false;
      _pendingEmail = null;
    });
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Email change cancelled'),
        backgroundColor: Colors.grey,
      ),
    );
  }

  void _initiateEmailChange(String newEmail) async {
    setState(() {
      _emailPendingVerification = true;
      _pendingEmail = newEmail;
    });
    
    try {
      final success = await ApiService.initiateEmailChange(newEmail: newEmail);
      
      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Verification email sent to $newEmail. Please check your email and click the verification link.'),
            backgroundColor: Colors.orange,
            duration: const Duration(seconds: 5),
          ),
        );
      } else {
        setState(() {
          _emailPendingVerification = false;
          _pendingEmail = null;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Failed to initiate email change. Please try again.'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } catch (e) {
      setState(() {
        _emailPendingVerification = false;
        _pendingEmail = null;
      });
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
            content: Text('Current password is incorrect or update failed. Please try again.'),
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
} 