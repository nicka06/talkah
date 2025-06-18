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

class AuthBloc extends Bloc<AuthEvent, AuthState> {
  late StreamSubscription<AuthState> _authStateSubscription;
  final ErrorHandlerService _errorHandler = ErrorHandlerService();

  AuthBloc() : super(AuthInitial()) {
    if (kDebugMode) {
      debugPrint('🏗️ AuthBloc: Constructor - setting up auth stream...');
    }
    
    // Listen to auth state changes
    _authStateSubscription = _authStateChangeStream().listen(
      (authState) {
        if (kDebugMode) {
          debugPrint('🌊 AuthBloc: Auth stream triggered: ${authState.runtimeType}');
        }
        add(AuthUserUpdated(
          userId: authState is AuthAuthenticated ? authState.user.id : null,
        ));
      },
    );

    on<AuthCheckRequested>(_onAuthCheckRequested);
    on<AuthLoginRequested>(_onAuthLoginRequested);
    on<AuthSignupRequested>(_onAuthSignupRequested);
    on<AuthLogoutRequested>(_onAuthLogoutRequested);
    on<AuthUserUpdated>(_onAuthUserUpdated);
    on<AuthUpdateEmailRequested>(_onAuthUpdateEmailRequested);
    on<AuthUpdatePasswordRequested>(_onAuthUpdatePasswordRequested);
    on<AuthGoogleSignInRequested>(_onAuthGoogleSignInRequested);
    on<AuthAppleSignInRequested>(_onAuthAppleSignInRequested);
    on<AuthPasswordResetRequested>(_onAuthPasswordResetRequested);
  }

  Stream<AuthState> _authStateChangeStream() {
    return SupabaseConfig.auth.onAuthStateChange.map((data) {
      if (kDebugMode) {
        debugPrint('🔄 AuthBloc: Supabase auth change: ${data.event}');
        debugPrint('   Session exists: ${data.session != null}');
      }
      
      final session = data.session;
      
      if (data.event == supabase.AuthChangeEvent.passwordRecovery) {
        return AuthPasswordRecovery(session?.accessToken);
      }
      
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
        return AuthUnauthenticated();
      }
    });
  }

  Future<void> _onAuthCheckRequested(
    AuthCheckRequested event,
    Emitter<AuthState> emit,
  ) async {
    emit(AuthLoading());
    
    try {
      final session = SupabaseConfig.auth.currentSession;
      if (session != null) {
        // Fetch full user profile from database
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
      final error = _errorHandler.handleException(e, 'Checking authentication status');
      emit(AuthError(error: error));
    }
  }

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
        
        // Fetch full user profile from database
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

  Future<void> _onAuthSignupRequested(
    AuthSignupRequested event,
    Emitter<AuthState> emit,
  ) async {
    emit(AuthLoading());
    
    try {
      final response = await SupabaseConfig.auth.signUp(
        email: event.email,
        password: event.password,
      );

      if (response.user != null) {
        // User profile will be created by database trigger
        // Wait a moment for the trigger to complete
        await Future.delayed(const Duration(milliseconds: 500));
        
        // Fetch the created user profile
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

  @override
  Future<void> close() {
    _authStateSubscription.cancel();
    return super.close();
  }

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