import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../blocs/auth/auth_bloc.dart';
import '../../blocs/auth/auth_event.dart';
import '../../blocs/auth/auth_state.dart';
import '../../widgets/error_display_widget.dart';

/**
 * ResetPasswordScreen - New Password Setup Interface
 * 
 * This screen allows users to set a new password after clicking a password
 * reset link from their email. It's typically accessed via a deep link
 * or URL that contains a password reset token.
 * 
 * Features:
 * - New password input with validation
 * - Confirm password input with matching validation
 * - Password strength requirements
 * - Submit functionality to update password
 * - Error handling and user feedback
 * - Loading states during password update
 * 
 * State Management:
 * - Uses BLoC pattern for authentication state management
 * - Listens to AuthBloc for password update state changes
 * - Dispatches AuthUpdatePasswordRequested event to AuthBloc
 */
class ResetPasswordScreen extends StatefulWidget {
  const ResetPasswordScreen({super.key});

  @override
  State<ResetPasswordScreen> createState() => _ResetPasswordScreenState();
}

/**
 * _ResetPasswordScreenState - State management for ResetPasswordScreen
 * 
 * Manages the UI state and user interactions for the password reset screen.
 * Handles form validation, password strength checking, and password update requests.
 */
class _ResetPasswordScreenState extends State<ResetPasswordScreen> {
  // Form validation key for password inputs
  final _formKey = GlobalKey<FormState>();
  
  // Text controllers for password input fields
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  
  // Flag to control password visibility
  bool _obscurePassword = true;
  bool _obscureConfirmPassword = true;

  /**
   * Cleanup method - Disposes of text controllers to prevent memory leaks
   */
  @override
  void dispose() {
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  /**
   * Main build method - Creates the password reset UI
   * 
   * The UI includes:
   * - Screen title and instructions
   * - New password input field with visibility toggle
   * - Confirm password input field with visibility toggle
   * - Submit button for password update
   * - Loading and success state handling
   */
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.red, // Consistent with app branding
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.black),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: BlocListener<AuthBloc, AuthState>(
        // Listen to authentication state changes
        listener: (context, state) {
          if (state is AuthAuthenticated) {
            // Show success message when password is updated
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('Password updated successfully!'),
                backgroundColor: Colors.green,
              ),
            );
            Navigator.of(context).pop(); // Return to previous screen
          } else if (state is AuthError) {
            // Display error notifications when password update fails
            ErrorDisplayWidget.showNotification(context, state.error);
          }
        },
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Form(
              key: _formKey,
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Title and instructions
                  const Text(
                    'Set New Password',
                    style: TextStyle(
                      fontSize: 28,
                      fontWeight: FontWeight.bold,
                      color: Colors.black,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    'Enter your new password below.',
                    style: TextStyle(
                      fontSize: 16,
                      color: Colors.black87,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 32),
                  
                  // New password input field with visibility toggle
                  TextFormField(
                    controller: _passwordController,
                    obscureText: _obscurePassword,
                    decoration: InputDecoration(
                      labelText: 'New Password',
                      border: const OutlineInputBorder(),
                      filled: true,
                      fillColor: Colors.white,
                      suffixIcon: IconButton(
                        icon: Icon(
                          _obscurePassword ? Icons.visibility : Icons.visibility_off,
                        ),
                        onPressed: () {
                          setState(() {
                            _obscurePassword = !_obscurePassword;
                          });
                        },
                      ),
                    ),
                    validator: _validatePassword,
                  ),
                  const SizedBox(height: 16),
                  
                  // Confirm password input field with visibility toggle
                  TextFormField(
                    controller: _confirmPasswordController,
                    obscureText: _obscureConfirmPassword,
                    decoration: InputDecoration(
                      labelText: 'Confirm Password',
                      border: const OutlineInputBorder(),
                      filled: true,
                      fillColor: Colors.white,
                      suffixIcon: IconButton(
                        icon: Icon(
                          _obscureConfirmPassword ? Icons.visibility : Icons.visibility_off,
                        ),
                        onPressed: () {
                          setState(() {
                            _obscureConfirmPassword = !_obscureConfirmPassword;
                          });
                        },
                      ),
                    ),
                    validator: _validateConfirmPassword,
                  ),
                  const SizedBox(height: 24),
                  
                  // Submit button for password update
                  BlocBuilder<AuthBloc, AuthState>(
                    builder: (context, state) {
                      return ElevatedButton(
                        onPressed: state is AuthLoading ? null : _submitPasswordUpdate,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.black,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 16),
                        ),
                        child: state is AuthLoading
                            ? const CircularProgressIndicator(color: Colors.white)
                            : const Text(
                                'Update Password',
                                style: TextStyle(fontSize: 16),
                              ),
                      );
                    },
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  /**
   * Validates the new password input
   * 
   * Checks for:
   * - Non-empty value
   * - Minimum length of 6 characters
   * 
   * @param value - The password value to validate
   * @return String? - Error message if validation fails, null if valid
   */
  String? _validatePassword(String? value) {
    if (value == null || value.isEmpty) {
      return 'Please enter a password';
    }
    if (value.length < 6) {
      return 'Password must be at least 6 characters';
    }
    return null;
  }

  /**
   * Validates the confirm password input
   * 
   * Checks for:
   * - Non-empty value
   * - Matching the new password
   * 
   * @param value - The confirm password value to validate
   * @return String? - Error message if validation fails, null if valid
   */
  String? _validateConfirmPassword(String? value) {
    if (value == null || value.isEmpty) {
      return 'Please confirm your password';
    }
    if (value != _passwordController.text) {
      return 'Passwords do not match';
    }
    return null;
  }

  /**
   * Submits the password update request
   * 
   * Validates the form and dispatches the AuthUpdatePasswordRequested
   * event to the AuthBloc to update the user's password.
   */
  void _submitPasswordUpdate() {
    if (_formKey.currentState!.validate()) {
      context.read<AuthBloc>().add(
        AuthUpdatePasswordRequested(newPassword: _passwordController.text),
      );
    }
  }
} 