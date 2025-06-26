import 'dart:async';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:supabase_flutter/supabase_flutter.dart' as supabase;
import '../../config/supabase_config.dart';
import '../../models/user_model.dart';
import '../../models/app_error.dart';
import '../../services/error_handler_service.dart';
import '../../services/api_service.dart';
import '../../services/oauth_service.dart';
import 'auth_event.dart';
import 'auth_state.dart';
import 'package:flutter/foundation.dart';

/**
 * AuthBloc - Central Authentication State Management
 * 
 * This class manages all authentication-related state and operations for the app.
 * It handles user login, signup, logout, OAuth providers (Google/Apple), password
 * management, and real-time authentication state changes.
 * 
 * Key Responsibilities:
 * - Listen to Supabase auth state changes
 * - Manage user authentication flow
 * - Handle OAuth sign-in (Google, Apple)
 * - Update user profile information
 * - Manage password reset functionality
 * - Provide real-time auth state to UI
 */
class AuthBloc extends Bloc<AuthEvent, AuthState> {
  // Stream subscription to listen for auth state changes from Supabase
  late StreamSubscription<AuthState> _authStateSubscription;
  
  // Service for handling and formatting errors consistently
  final ErrorHandlerService _errorHandler = ErrorHandlerService();

  /**
   * Constructor - Sets up the authentication system
   * 
   * 1. Initializes the bloc with AuthInitial state
   * 2. Sets up a listener for real-time auth state changes from Supabase
   * 3. Registers event handlers for all authentication operations
   */
  AuthBloc() : super(AuthInitial()) {
    if (kDebugMode) {
      debugPrint('🏗️ AuthBloc: Constructor - setting up auth stream...');
    }
    
    // Set up real-time listener for authentication state changes
    // This ensures the app stays in sync with Supabase auth state
    _authStateSubscription = _authStateChangeStream().listen(
      (authState) {
        if (kDebugMode) {
          debugPrint('🌊 AuthBloc: Auth stream triggered: ${authState.runtimeType}');
        }
        // Trigger user data update whenever auth state changes
        add(AuthUserUpdated(
          userId: authState is AuthAuthenticated ? authState.user.id : null,
        ));
      },
    );

    // Register event handlers for all authentication operations
    on<AuthCheckRequested>(_onAuthCheckRequested);           // Check if user is logged in
    on<AuthLoginRequested>(_onAuthLoginRequested);           // Email/password login
    on<AuthSignupRequested>(_onAuthSignupRequested);         // Create new account
    on<AuthLogoutRequested>(_onAuthLogoutRequested);         // Sign out user
    on<AuthUserUpdated>(_onAuthUserUpdated);                 // Update user data
    on<AuthUpdateEmailRequested>(_onAuthUpdateEmailRequested); // Change email
    on<AuthUpdatePasswordRequested>(_onAuthUpdatePasswordRequested); // Change password
    on<AuthGoogleSignInRequested>(_onAuthGoogleSignInRequested); // Google OAuth
    on<AuthAppleSignInRequested>(_onAuthAppleSignInRequested); // Apple OAuth
    on<AuthPasswordResetRequested>(_onAuthPasswordResetRequested); // Reset password
  }

  /**
   * Creates a stream that listens to Supabase authentication state changes
   * 
   * This stream converts Supabase auth events into our app's AuthState objects.
   * It handles different auth events like login, logout, password recovery, etc.
   * 
   * Returns: Stream<AuthState> - Stream of authentication states
   */
  Stream<AuthState> _authStateChangeStream() {
    return SupabaseConfig.auth.onAuthStateChange.map((data) {
      if (kDebugMode) {
        debugPrint('🔄 AuthBloc: Supabase auth change: ${data.event}');
        debugPrint('   Session exists: ${data.session != null}');
      }
      
      final session = data.session;
      
      // Handle password recovery flow specifically
      if (data.event == supabase.AuthChangeEvent.passwordRecovery) {
        return AuthPasswordRecovery(session?.accessToken);
      }
      
      // If session exists, user is authenticated
      if (session != null) {
        return AuthAuthenticated(
          user: UserModel(
            id: session.user.id,
            email: session.user.email ?? '',
            subscriptionTier: 'free', // Default, will be updated from database
            createdAt: DateTime.parse(session.user.createdAt),
            updatedAt: DateTime.now(),
          ),
        );
      } else {
        // No session means user is not authenticated
        return AuthUnauthenticated();
      }
    });
  }

  /**
   * Event Handler: Check if user is currently authenticated
   * 
   * This is typically called when the app starts to determine if the user
   * should see the login screen or the main app interface.
   * 
   * Process:
   * 1. Check if there's a current session in Supabase
   * 2. If session exists, fetch complete user profile from database
   * 3. Emit appropriate state (authenticated or unauthenticated)
   */
  Future<void> _onAuthCheckRequested(
    AuthCheckRequested event,
    Emitter<AuthState> emit,
  ) async {
    emit(AuthLoading());
    
    try {
      final session = SupabaseConfig.auth.currentSession;
      if (session != null) {
        // User has an active session, fetch their complete profile
        final userResponse = await SupabaseConfig.client
            .from('users')
            .select()
            .eq('id', session.user.id)
            .single();

        final user = UserModel.fromJson(userResponse);
        emit(AuthAuthenticated(user: user));
      } else {
        // No active session, user is not logged in
        emit(AuthUnauthenticated());
      }
    } catch (e) {
      final error = _errorHandler.handleException(e, 'Checking authentication status');
      emit(AuthError(error: error));
    }
  }

  /**
   * Event Handler: Email and password login
   * 
   * Authenticates user with email and password using Supabase.
   * After successful authentication, fetches the user's complete profile
   * from the database to get subscription status and other user data.
   * 
   * Process:
   * 1. Call Supabase signInWithPassword
   * 2. If successful, fetch user profile from database
   * 3. Emit authenticated state with complete user data
   */
  Future<void> _onAuthLoginRequested(
    AuthLoginRequested event,
    Emitter<AuthState> emit,
  ) async {
    if (kDebugMode) {
      debugPrint('🔐 AuthBloc: Login requested for ${event.email}');
    }
    
    emit(AuthLoading());
    
    try {
      if (kDebugMode) {
        debugPrint('🔐 AuthBloc: Calling signInWithPassword...');
      }
      
      // Authenticate with Supabase using email and password
      final response = await SupabaseConfig.auth.signInWithPassword(
        email: event.email,
        password: event.password,
      );

      if (kDebugMode) {
        debugPrint('🔐 AuthBloc: signInWithPassword completed');
        debugPrint('   User: ${response.user?.id}');
        debugPrint('   Session: ${response.session?.accessToken != null}');
      }

      if (response.user != null) {
        if (kDebugMode) {
          debugPrint('🔐 AuthBloc: User exists, fetching profile...');
        }
        
        // Fetch complete user profile from database (includes subscription info)
        final userResponse = await SupabaseConfig.client
            .from('users')
            .select()
            .eq('id', response.user!.id)
            .single();

        final user = UserModel.fromJson(userResponse);
        
        if (kDebugMode) {
          debugPrint('🔐 AuthBloc: Emitting AuthAuthenticated');
        }
        
        emit(AuthAuthenticated(user: user));
      } else {
        if (kDebugMode) {
          debugPrint('🔐 AuthBloc: User is null, emitting error');
        }
        
        final error = AppError.authentication(details: 'Login response was null');
        _errorHandler.logError(error);
        emit(AuthError(error: error));
      }
    } catch (e) {
      if (kDebugMode) {
        debugPrint('🔐 AuthBloc: Exception caught in login: $e');
        debugPrint('   Exception type: ${e.runtimeType}');
      }
      
      final error = _errorHandler.handleException(e, 'Signing in user');
      
      if (kDebugMode) {
        debugPrint('🔐 AuthBloc: Emitting AuthError: ${error.title}');
      }
      
      emit(AuthError(error: error));
      
      if (kDebugMode) {
        debugPrint('🔐 AuthBloc: AuthError emitted successfully');
      }
    }
  }

  /**
   * Event Handler: Create new user account
   * 
   * Creates a new user account with email and password.
   * The user profile is automatically created by a database trigger
   * when the user signs up through Supabase.
   * 
   * Process:
   * 1. Call Supabase signUp
   * 2. Wait for database trigger to create user profile
   * 3. Fetch the created profile and emit authenticated state
   */
  Future<void> _onAuthSignupRequested(
    AuthSignupRequested event,
    Emitter<AuthState> emit,
  ) async {
    emit(AuthLoading());
    
    try {
      // Create new user account in Supabase
      final response = await SupabaseConfig.auth.signUp(
        email: event.email,
        password: event.password,
      );

      if (response.user != null) {
        // User profile will be created by database trigger
        // Wait a moment for the trigger to complete
        await Future.delayed(const Duration(milliseconds: 500));
        
        // Fetch the created user profile from database
        final userResponse = await SupabaseConfig.client
            .from('users')
            .select()
            .eq('id', response.user!.id)
            .single();

        final user = UserModel.fromJson(userResponse);
        emit(AuthAuthenticated(user: user));
      } else {
        final error = AppError.authentication(details: 'Signup response was null');
        _errorHandler.logError(error);
        emit(AuthError(error: error));
      }
    } catch (e) {
      final error = _errorHandler.handleException(e, 'Signing up user');
      emit(AuthError(error: error));
    }
  }

  /**
   * Event Handler: Sign out user
   * 
   * Signs out the user from all authentication providers (Google, Apple, Supabase)
   * and clears the authentication state.
   * 
   * Process:
   * 1. Sign out from OAuth providers (Google, Apple)
   * 2. Sign out from Supabase
   * 3. Emit unauthenticated state
   */
  Future<void> _onAuthLogoutRequested(
    AuthLogoutRequested event,
    Emitter<AuthState> emit,
  ) async {
    try {
      // Sign out from OAuth providers first
      await OAuthService.signOutGoogle();
      
      // Then sign out from Supabase
      await SupabaseConfig.auth.signOut();
      emit(AuthUnauthenticated());
    } catch (e) {
      final error = _errorHandler.handleException(e, 'Signing out user');
      emit(AuthError(error: error));
    }
  }

  /**
   * Event Handler: Update user data when auth state changes
   * 
   * This is triggered by the auth state stream whenever Supabase reports
   * a change in authentication status. It ensures the app has the most
   * up-to-date user information from the database.
   * 
   * Process:
   * 1. If user ID exists, fetch latest user profile from database
   * 2. If no user ID, emit unauthenticated state
   * 3. Handle any errors during the fetch process
   */
  Future<void> _onAuthUserUpdated(
    AuthUserUpdated event,
    Emitter<AuthState> emit,
  ) async {
    if (kDebugMode) {
      debugPrint('👤 AuthBloc: AuthUserUpdated triggered');
      debugPrint('   User ID: ${event.userId}');
    }
    
    if (event.userId != null) {
      try {
        if (kDebugMode) {
          debugPrint('👤 AuthBloc: Fetching user data for ${event.userId}');
        }
        
        // Fetch latest user profile from database
        final userResponse = await SupabaseConfig.client
            .from('users')
            .select()
            .eq('id', event.userId!)
            .single();

        final user = UserModel.fromJson(userResponse);
        
        if (kDebugMode) {
          debugPrint('👤 AuthBloc: Emitting AuthAuthenticated from user update');
        }
        
        emit(AuthAuthenticated(user: user));
      } catch (e) {
        if (kDebugMode) {
          debugPrint('👤 AuthBloc: Error in AuthUserUpdated: $e');
        }
        
        final error = _errorHandler.handleException(e, 'Fetching updated user data');
        emit(AuthError(error: error));
      }
    } else {
      if (kDebugMode) {
        debugPrint('👤 AuthBloc: No user ID, emitting AuthUnauthenticated');
      }
      
      emit(AuthUnauthenticated());
    }
  }

  /**
   * Cleanup method - Called when the bloc is disposed
   * 
   * Cancels the auth state subscription to prevent memory leaks
   */
  @override
  Future<void> close() {
    _authStateSubscription.cancel();
    return super.close();
  }

  /**
   * Event Handler: Update user's email address
   * 
   * Allows authenticated users to change their email address.
   * This requires the user to be currently authenticated.
   * 
   * Process:
   * 1. Verify user is authenticated
   * 2. Call API service to update email
   * 3. Refresh user data from database
   * 4. Emit updated authenticated state
   */
  Future<void> _onAuthUpdateEmailRequested(
    AuthUpdateEmailRequested event,
    Emitter<AuthState> emit,
  ) async {
    final currentState = state;
    if (currentState is! AuthAuthenticated) return;
    
    emit(AuthUpdating(user: currentState.user));
    
    try {
      final success = await ApiService.updateUserEmail(newEmail: event.newEmail);
      
      if (success) {
        // Refresh user data from the database
        final userResponse = await SupabaseConfig.client
            .from('users')
            .select()
            .eq('id', currentState.user.id)
            .single();

        final updatedUser = UserModel.fromJson(userResponse);
        emit(AuthAuthenticated(user: updatedUser));
      } else {
        final error = AppError.authentication(details: 'Failed to update email');
        emit(AuthError(error: error));
      }
    } catch (e) {
      final error = _errorHandler.handleException(e, 'Updating user email');
      emit(AuthError(error: error));
    }
  }

  /**
   * Event Handler: Update user's password
   * 
   * Allows users to change their password. This can be used both for
   * authenticated users changing their password and for password recovery.
   * 
   * Process:
   * 1. Call Supabase to update password
   * 2. If successful, fetch updated user profile
   * 3. Emit authenticated state with updated user data
   */
  Future<void> _onAuthUpdatePasswordRequested(
    AuthUpdatePasswordRequested event,
    Emitter<AuthState> emit,
  ) async {
    // No longer require user to be authenticated, as this is used for password recovery
    emit(AuthLoading());
    
    try {
      await SupabaseConfig.auth.updateUser(
        supabase.UserAttributes(password: event.newPassword),
      );
      
      // After a successful password update, the user is considered logged in.
      // We should fetch their full profile.
      final user = SupabaseConfig.auth.currentUser;
      if (user != null) {
        final userResponse = await SupabaseConfig.client
            .from('users')
            .select()
            .eq('id', user.id)
            .single();
        final userModel = UserModel.fromJson(userResponse);
        emit(AuthAuthenticated(user: userModel));
      } else {
        // This case should ideally not be reached after a successful update
        emit(AuthUnauthenticated());
      }
    } catch (e) {
      final error = _errorHandler.handleException(e, 'Updating user password');
      emit(AuthError(error: error));
    }
  }

  /**
   * Event Handler: Google OAuth Sign-In
   * 
   * Handles authentication using Google OAuth. This creates a more seamless
   * login experience for users who prefer to use their Google account.
   * 
   * Process:
   * 1. Call OAuth service to authenticate with Google
   * 2. Wait for Supabase triggers to complete user profile creation
   * 3. Fetch or create user profile in database
   * 4. Emit authenticated state with user data
   */
  Future<void> _onAuthGoogleSignInRequested(
    AuthGoogleSignInRequested event,
    Emitter<AuthState> emit,
  ) async {
    if (kDebugMode) {
      debugPrint('🔐 AuthBloc: Google sign-in requested');
    }
    
    emit(AuthLoading());
    
    try {
      final response = await OAuthService.signInWithGoogle();
      
      if (response?.user != null) {
        final authUser = response!.user!;
        
        if (kDebugMode) {
          debugPrint('🔐 AuthBloc: Google sign-in successful, user: ${authUser.id}');
        }
        
        // Wait a moment for Supabase triggers to complete
        await Future.delayed(const Duration(milliseconds: 1000));
        
        // Try to fetch user profile from database
        try {
          final userResponse = await SupabaseConfig.client
              .from('users')
              .select()
              .eq('id', authUser.id)
              .maybeSingle(); // Use maybeSingle to handle case where user doesn't exist

          if (userResponse != null) {
            // User exists in database
            final user = UserModel.fromJson(userResponse);
            emit(AuthAuthenticated(user: user));
          } else {
            // User doesn't exist in database yet, create one
            if (kDebugMode) {
              debugPrint('🔐 AuthBloc: User profile not found, creating new profile');
            }
            
            final user = UserModel(
              id: authUser.id,
              email: authUser.email ?? '',
              subscriptionTier: 'free',
              createdAt: DateTime.parse(authUser.createdAt),
              updatedAt: DateTime.now(),
            );
            
            // Insert user into database
            await SupabaseConfig.client.from('users').insert(user.toJson());
            
            emit(AuthAuthenticated(user: user));
          }
        } catch (e) {
          if (kDebugMode) {
            debugPrint('🔐 AuthBloc: Error fetching/creating user profile: $e');
          }
          
          // Fallback: create minimal user model from auth data
          final user = UserModel(
            id: authUser.id,
            email: authUser.email ?? '',
            subscriptionTier: 'free',
            createdAt: DateTime.parse(authUser.createdAt),
            updatedAt: DateTime.now(),
          );
          
          emit(AuthAuthenticated(user: user));
        }
      } else {
        if (kDebugMode) {
          debugPrint('🔐 AuthBloc: Google sign-in cancelled by user');
        }
        // User cancelled sign-in, return to unauthenticated state
        emit(AuthUnauthenticated());
      }
    } catch (e) {
      if (kDebugMode) {
        debugPrint('🔐 AuthBloc: Google sign-in error: $e');
      }
      
      final error = _errorHandler.handleException(e, 'Google sign-in');
      emit(AuthError(error: error));
    }
  }

  /**
   * Event Handler: Apple OAuth Sign-In
   * 
   * Handles authentication using Apple Sign-In. This is required for iOS apps
   * that offer other OAuth providers, and provides a privacy-focused login option.
   * 
   * Process:
   * 1. Call OAuth service to authenticate with Apple
   * 2. Wait for Supabase triggers to complete user profile creation
   * 3. Fetch or create user profile in database
   * 4. Emit authenticated state with user data
   */
  Future<void> _onAuthAppleSignInRequested(
    AuthAppleSignInRequested event,
    Emitter<AuthState> emit,
  ) async {
    if (kDebugMode) {
      debugPrint('🔐 AuthBloc: Apple sign-in requested');
    }
    
    emit(AuthLoading());
    
    try {
      final response = await OAuthService.signInWithApple();
      
      if (response?.user != null) {
        final authUser = response!.user!;
        
        if (kDebugMode) {
          debugPrint('🔐 AuthBloc: Apple sign-in successful, user: ${authUser.id}');
        }
        
        // Wait a moment for Supabase triggers to complete
        await Future.delayed(const Duration(milliseconds: 1000));
        
        // Try to fetch user profile from database
        try {
          final userResponse = await SupabaseConfig.client
              .from('users')
              .select()
              .eq('id', authUser.id)
              .maybeSingle(); // Use maybeSingle to handle case where user doesn't exist

          if (userResponse != null) {
            // User exists in database
            final user = UserModel.fromJson(userResponse);
            emit(AuthAuthenticated(user: user));
          } else {
            // User doesn't exist in database yet, create one
            if (kDebugMode) {
              debugPrint('🔐 AuthBloc: User profile not found, creating new profile');
            }
            
            final user = UserModel(
              id: authUser.id,
              email: authUser.email ?? '',
              subscriptionTier: 'free',
              createdAt: DateTime.parse(authUser.createdAt),
              updatedAt: DateTime.now(),
            );
            
            // Insert user into database
            await SupabaseConfig.client.from('users').insert(user.toJson());
            
            emit(AuthAuthenticated(user: user));
          }
        } catch (e) {
          if (kDebugMode) {
            debugPrint('🔐 AuthBloc: Error fetching/creating user profile: $e');
          }
          
          // Fallback: create minimal user model from auth data
          final user = UserModel(
            id: authUser.id,
            email: authUser.email ?? '',
            subscriptionTier: 'free',
            createdAt: DateTime.parse(authUser.createdAt),
            updatedAt: DateTime.now(),
          );
          
          emit(AuthAuthenticated(user: user));
        }
      } else {
        if (kDebugMode) {
          debugPrint('🔐 AuthBloc: Apple sign-in cancelled by user');
        }
        // User cancelled sign-in, return to unauthenticated state
        emit(AuthUnauthenticated());
      }
    } catch (e) {
      if (kDebugMode) {
        debugPrint('🔐 AuthBloc: Apple sign-in error: $e');
      }
      
      final error = _errorHandler.handleException(e, 'Apple sign-in');
      emit(AuthError(error: error));
    }
  }

  /**
   * Event Handler: Send password reset email
   * 
   * Initiates the password reset process by sending an email to the user
   * with a link to reset their password.
   * 
   * Process:
   * 1. Call Supabase to send password reset email
   * 2. Emit success state
   * 3. Return to current authentication state
   */
  Future<void> _onAuthPasswordResetRequested(
    AuthPasswordResetRequested event,
    Emitter<AuthState> emit,
  ) async {
    emit(AuthLoading());
    try {
      await SupabaseConfig.auth.resetPasswordForEmail(
        event.email,
        // TODO: Configure the redirect URL in Supabase dashboard
        // redirectTo: 'io.supabase.flutterquickstart://login-callback/',
      );
      emit(AuthPasswordResetEmailSent());
      // Revert to a stable state after, so UI can react again if needed
      final session = SupabaseConfig.auth.currentSession;
      if (session != null) {
        final userResponse = await SupabaseConfig.client
            .from('users')
            .select()
            .eq('id', session.user.id)
            .single();
        final user = UserModel.fromJson(userResponse);
        emit(AuthAuthenticated(user: user));
      } else {
        emit(AuthUnauthenticated());
      }
    } catch (e) {
      final error = _errorHandler.handleException(e, 'Sending password reset email');
      emit(AuthError(error: error));
    }
  }
} 