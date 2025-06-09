import 'package:equatable/equatable.dart';

abstract class AuthEvent extends Equatable {
  const AuthEvent();

  @override
  List<Object?> get props => [];
}

class AuthCheckRequested extends AuthEvent {}

class AuthLoginRequested extends AuthEvent {
  final String email;
  final String password;

  const AuthLoginRequested({
    required this.email,
    required this.password,
  });

  @override
  List<Object> get props => [email, password];
}

class AuthSignupRequested extends AuthEvent {
  final String email;
  final String password;

  const AuthSignupRequested({
    required this.email,
    required this.password,
  });

  @override
  List<Object> get props => [email, password];
}

class AuthLogoutRequested extends AuthEvent {}

class AuthUserUpdated extends AuthEvent {
  final String? userId;

  const AuthUserUpdated({this.userId});

  @override
  List<Object?> get props => [userId];
}

class AuthUpdateEmailRequested extends AuthEvent {
  final String newEmail;

  const AuthUpdateEmailRequested({required this.newEmail});

  @override
  List<Object> get props => [newEmail];
}

class AuthUpdatePasswordRequested extends AuthEvent {
  final String newPassword;

  const AuthUpdatePasswordRequested({required this.newPassword});

  @override
  List<Object> get props => [newPassword];
} 