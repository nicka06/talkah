import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../blocs/auth/auth_bloc.dart';
import '../../blocs/auth/auth_event.dart';
import '../../blocs/auth/auth_state.dart';
import '../../widgets/error_display_widget.dart';

/**
 * ForgotPasswordScreen - Password Reset Interface
 * 
 * This screen allows users to request a password reset email when they
 * have forgotten their password. It provides a simple form interface
 * for entering their email address and initiating the reset process.
 * 
 * Features:
 * - Email input with validation
 * - Password reset request functionality
 * - Error handling and user feedback
 * - Navigation back to login screen
 * - Loading states during reset process
 * 
 * State Management:
 * - Uses BLoC pattern for authentication state management
 * - Listens to AuthBloc for password reset state changes
 * - Dispatches AuthPasswordResetRequested event to AuthBloc
 */
class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

/**
 * _ForgotPasswordScreenState - State management for ForgotPasswordScreen
 * 
 * Manages the UI state and user interactions for the password reset screen.
 * Handles form validation, password reset requests, and navigation.
 */
class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  // Form validation key for email input
  final _formKey = GlobalKey<FormState>();
  
  // Text controller for email input field
  final _emailController = TextEditingController();

  /**
   * Cleanup method - Disposes of text controller to prevent memory leaks
   */
  @override
  void dispose() {
    _emailController.dispose();
    super.dispose();
  }

  /**
   * Main build method - Creates the password reset UI
   * 
   * The UI includes:
   * - Screen title and instructions
   * - Email input form with validation
   * - Submit button for password reset request
   * - Back button to return to login screen
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
          if (state is AuthPasswordResetEmailSent) {
            // Show success message when reset email is sent
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('Password reset email sent! Check your inbox.'),
                backgroundColor: Colors.green,
              ),
            );
            Navigator.of(context).pop(); // Return to login screen
          } else if (state is AuthError) {
            // Display error notifications when password reset fails
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
                    'Forgot Password?',
                    style: TextStyle(
                      fontSize: 28,
                      fontWeight: FontWeight.bold,
                      color: Colors.black,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    'Enter your email address and we\'ll send you a link to reset your password.',
                    style: TextStyle(
                      fontSize: 16,
                      color: Colors.black87,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 32),
                  
                  // Email input field with validation
                  TextFormField(
                    controller: _emailController,
                    keyboardType: TextInputType.emailAddress,
                    decoration: const InputDecoration(
                      labelText: 'Email',
                      border: OutlineInputBorder(),
                      filled: true,
                      fillColor: Colors.white,
                    ),
                    validator: (value) {
                      if (value == null || value.isEmpty) {
                        return 'Please enter your email';
                      }
                      if (!RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$').hasMatch(value)) {
                        return 'Please enter a valid email';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 24),
                  
                  // Submit button for password reset request
                  BlocBuilder<AuthBloc, AuthState>(
                    builder: (context, state) {
                      return ElevatedButton(
                        onPressed: state is AuthLoading ? null : _submitResetRequest,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.black,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 16),
                        ),
                        child: state is AuthLoading
                            ? const CircularProgressIndicator(color: Colors.white)
                            : const Text(
                                'Send Reset Link',
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
   * Submits the password reset request
   * 
   * Validates the form and dispatches the AuthPasswordResetRequested
   * event to the AuthBloc to initiate the password reset process.
   */
  void _submitResetRequest() {
    if (_formKey.currentState!.validate()) {
      context.read<AuthBloc>().add(
        AuthPasswordResetRequested(email: _emailController.text.trim()),
      );
    }
  }
} 