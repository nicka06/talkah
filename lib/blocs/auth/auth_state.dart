import 'package:equatable/equatable.dart';
import '../../models/user_model.dart';
import '../../models/app_error.dart';

/**
 * AuthState - Base class for all authentication-related states
 * 
 * This abstract class defines the contract for all authentication states
 * in the BLoC pattern. It extends Equatable to enable proper state comparison
 * and change detection for efficient UI updates.
 * 
 * All authentication states must extend this class and implement the props
 * getter for proper equality comparison.
 */
abstract class AuthState extends Equatable {
  const AuthState();

  @override
  List<Object?> get props => [];
}

/**
 * AuthInitial - Initial authentication state
 * 
 * This is the default state when the AuthBloc is first created.
 * It represents a neutral state before any authentication operations
 * have been performed.
 * 
 * UI typically shows: Loading indicator or splash screen
 */
class AuthInitial extends AuthState {}

/**
 * AuthLoading - Authentication operation in progress
 * 
 * This state is emitted when an authentication operation is currently
 * being processed (login, signup, password reset, etc.).
 * 
 * UI typically shows: Loading spinner, disabled buttons, progress indicators
 */
class AuthLoading extends AuthState {}

/**
 * AuthAuthenticated - User is successfully authenticated
 * 
 * This state is emitted when the user is successfully logged in and
 * their profile data has been loaded from the database.
 * 
 * Contains the complete user profile including subscription status,
 * email, creation date, and other user-specific data.
 * 
 * UI typically shows: Main app interface, user dashboard, authenticated features
 * 
 * @param user - Complete user profile data from database
 */
class AuthAuthenticated extends AuthState {
  final UserModel user;

  const AuthAuthenticated({required this.user});

  @override
  List<Object> get props => [user];
}

/**
 * AuthUnauthenticated - User is not authenticated
 * 
 * This state is emitted when the user is not logged in or has been
 * signed out. This is the state that should trigger the login/signup
 * flow in the UI.
 * 
 * UI typically shows: Login screen, signup screen, or authentication flow
 */
class AuthUnauthenticated extends AuthState {}

/**
 * AuthError - Authentication operation failed
 * 
 * This state is emitted when an authentication operation fails due
 * to an error (invalid credentials, network issues, server errors, etc.).
 * 
 * Contains detailed error information that can be displayed to the user
 * or logged for debugging purposes.
 * 
 * UI typically shows: Error message, retry options, error-specific guidance
 * 
 * @param error - Detailed error information including title, message, and type
 */
class AuthError extends AuthState {
  final AppError error;

  const AuthError({required this.error});

  @override
  List<Object> get props => [error];
}

/**
 * AuthUpdating - User profile update in progress
 * 
 * This state is emitted when the user's profile information is being
 * updated (email change, password change, etc.). It maintains the
 * current user data while showing that an update is in progress.
 * 
 * UI typically shows: Loading indicator, disabled form fields, "updating" message
 * 
 * @param user - Current user data (before update)
 */
class AuthUpdating extends AuthState {
  final UserModel user;

  const AuthUpdating({required this.user});

  @override
  List<Object> get props => [user];
}

/**
 * AuthPasswordResetEmailSent - Password reset email sent successfully
 * 
 * This state is emitted when a password reset email has been successfully
 * sent to the user's email address. It's a temporary success state
 * that confirms the reset process has been initiated.
 * 
 * UI typically shows: Success message, instructions to check email, return to login
 */
class AuthPasswordResetEmailSent extends AuthState {}

/**
 * AuthPasswordRecovery - User is in password recovery flow
 * 
 * This state is emitted when the user has clicked a password reset link
 * and is in the process of setting a new password. It contains the
 * access token needed to complete the password reset process.
 * 
 * UI typically shows: Password reset form, new password input fields
 * 
 * @param accessToken - Token required to complete password reset (can be null)
 */
class AuthPasswordRecovery extends AuthState {
  final String? accessToken;
  const AuthPasswordRecovery(this.accessToken);

  @override
  List<Object?> get props => [accessToken];
} 