import 'package:equatable/equatable.dart';
import '../../models/user_model.dart';
import '../../models/app_error.dart';

abstract class AuthState extends Equatable {
  const AuthState();

  @override
  List<Object?> get props => [];
}

class AuthInitial extends AuthState {}

class AuthLoading extends AuthState {}

class AuthAuthenticated extends AuthState {
  final UserModel user;

  const AuthAuthenticated({required this.user});

  @override
  List<Object> get props => [user];
}

class AuthUnauthenticated extends AuthState {}

class AuthError extends AuthState {
  final AppError error;

  const AuthError({required this.error});

  @override
  List<Object> get props => [error];
}

class AuthUpdating extends AuthState {
  final UserModel user;

  const AuthUpdating({required this.user});

  @override
  List<Object> get props => [user];
}

class AuthPasswordResetEmailSent extends AuthState {}

class AuthPasswordRecovery extends AuthState {
  final String? accessToken;
  const AuthPasswordRecovery(this.accessToken);

  @override
  List<Object?> get props => [accessToken];
} 