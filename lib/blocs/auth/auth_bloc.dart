import 'dart:async';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:supabase_flutter/supabase_flutter.dart' as supabase;
import '../../config/supabase_config.dart';
import '../../models/user_model.dart';
import '../../models/app_error.dart';
import '../../services/error_handler_service.dart';
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
  }

  Stream<AuthState> _authStateChangeStream() {
    return SupabaseConfig.auth.onAuthStateChange.map((data) {
      if (kDebugMode) {
        debugPrint('🔄 AuthBloc: Supabase auth change: ${data.event}');
        debugPrint('   Session exists: ${data.session != null}');
      }
      
      final session = data.session;
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
} 