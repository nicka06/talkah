import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../blocs/auth/auth_bloc.dart';
import '../../blocs/auth/auth_event.dart';
import '../../blocs/auth/auth_state.dart';

/**
 * SplashScreen - App Initialization and Authentication Check
 * 
 * This screen is displayed when the app first launches and serves as
 * the entry point for the authentication flow. It performs several
 * important initialization tasks:
 * 
 * Primary Functions:
 * - Display app branding and loading animation
 * - Check if user is already authenticated
 * - Route to appropriate screen based on auth status
 * - Handle app initialization tasks
 * 
 * Authentication Flow:
 * - Dispatches AuthCheckRequested to verify current auth state
 * - Routes to LoginScreen if user is not authenticated
 * - Routes to main app (Dashboard) if user is authenticated
 * - Handles loading states during auth check
 * 
 * UI Features:
 * - App logo and branding display
 * - Loading animation/indicator
 * - Responsive design for different screen sizes
 * - Consistent branding with red background
 */
class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

/**
 * _SplashScreenState - State management for SplashScreen
 * 
 * Manages the initialization process and authentication state checking.
 * Handles navigation to appropriate screens based on authentication status.
 */
class _SplashScreenState extends State<SplashScreen> {
  /**
   * Called when the widget is first created
   * 
   * Initiates the authentication check process by dispatching
   * the AuthCheckRequested event to the AuthBloc.
   */
  @override
  void initState() {
    super.initState();
    // Trigger authentication check when screen loads
    context.read<AuthBloc>().add(AuthCheckRequested());
  }

  /**
   * Main build method - Creates the splash screen UI
   * 
   * The UI includes:
   * - App branding and logo
   * - Loading indicator
   * - Authentication state handling
   * - Navigation logic based on auth status
   */
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.red, // Consistent with app branding
      body: BlocListener<AuthBloc, AuthState>(
        // Listen to authentication state changes for debugging/logging only
        // Navigation is handled by the main app router in main.dart
        listener: (context, state) {
          // Optional: Add logging to track state changes during splash
          if (kDebugMode) {
            debugPrint('🌊 SplashScreen: Auth state changed to ${state.runtimeType}');
          }
          // No navigation logic here - main router handles it automatically
        },
        child: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
              // App logo/branding
              const Text(
                'TALKAH',
                style: TextStyle(
                  fontSize: 48,
                fontWeight: FontWeight.bold,
                  color: Colors.black,
                  letterSpacing: 2.0,
              ),
            ),
              const SizedBox(height: 32),
              
              // Loading indicator
              const CircularProgressIndicator(
                valueColor: AlwaysStoppedAnimation<Color>(Colors.black),
            ),
          ],
          ),
        ),
      ),
    );
  }
} 