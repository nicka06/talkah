import 'dart:async';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:supabase_flutter/supabase_flutter.dart' as supabase;
import '../../config/supabase_config.dart';
import '../../models/user_model.dart';
import 'auth_event.dart';
import 'auth_state.dart';

class AuthBloc extends Bloc<AuthEvent, AuthState> {
  late StreamSubscription<AuthState> _authStateSubscription;

  AuthBloc() : super(AuthInitial()) {
    // Listen to auth state changes
    _authStateSubscription = _authStateChangeStream().listen(
      (authState) => add(AuthUserUpdated(
        userId: authState is AuthAuthenticated ? authState.user.id : null,
      )),
    );

    on<AuthCheckRequested>(_onAuthCheckRequested);
    on<AuthLoginRequested>(_onAuthLoginRequested);
    on<AuthSignupRequested>(_onAuthSignupRequested);
    on<AuthLogoutRequested>(_onAuthLogoutRequested);
    on<AuthUserUpdated>(_onAuthUserUpdated);
  }

  Stream<AuthState> _authStateChangeStream() {
    return SupabaseConfig.auth.onAuthStateChange.map((data) {
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
      emit(AuthError(message: 'Failed to check authentication status'));
    }
  }

  Future<void> _onAuthLoginRequested(
    AuthLoginRequested event,
    Emitter<AuthState> emit,
  ) async {
    emit(AuthLoading());
    
    try {
      final response = await SupabaseConfig.auth.signInWithPassword(
        email: event.email,
        password: event.password,
      );

      if (response.user != null) {
        // Fetch full user profile from database
        final userResponse = await SupabaseConfig.client
            .from('users')
            .select()
            .eq('id', response.user!.id)
            .single();

        final user = UserModel.fromJson(userResponse);
        emit(AuthAuthenticated(user: user));
      } else {
        emit(AuthError(message: 'Login failed'));
      }
    } catch (e) {
      emit(AuthError(message: e.toString()));
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
        emit(AuthError(message: 'Signup failed'));
      }
    } catch (e) {
      emit(AuthError(message: e.toString()));
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
      emit(AuthError(message: 'Logout failed'));
    }
  }

  Future<void> _onAuthUserUpdated(
    AuthUserUpdated event,
    Emitter<AuthState> emit,
  ) async {
    if (event.userId != null) {
      try {
        final userResponse = await SupabaseConfig.client
            .from('users')
            .select()
            .eq('id', event.userId!)
            .single();

        final user = UserModel.fromJson(userResponse);
        emit(AuthAuthenticated(user: user));
      } catch (e) {
        emit(AuthError(message: 'Failed to fetch user data'));
      }
    } else {
      emit(AuthUnauthenticated());
    }
  }

  @override
  Future<void> close() {
    _authStateSubscription.cancel();
    return super.close();
  }
} 