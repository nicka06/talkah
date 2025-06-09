import 'package:equatable/equatable.dart';

enum ErrorType {
  network,
  authentication,
  authorization,
  validation,
  serverError,
  configuration,
  rateLimitExceeded,
  subscription,
  emailConfirmation,
  unknown,
}

class AppError extends Equatable {
  final ErrorType type;
  final String code;
  final String title;
  final String message;
  final String? technicalDetails;
  final String? suggestedAction;
  final bool isRetryable;
  final DateTime timestamp;

  AppError.withTimestamp({
    required this.type,
    required this.code,
    required this.title,
    required this.message,
    this.technicalDetails,
    this.suggestedAction,
    this.isRetryable = false,
  }) : timestamp = DateTime.now();

  // Factory constructors for common error types
  factory AppError.network({
    String? details,
  }) {
    return AppError.withTimestamp(
      type: ErrorType.network,
      code: 'NETWORK_ERROR',
      title: 'Connection Problem',
      message: 'Unable to connect to our servers. Please check your internet connection.',
      technicalDetails: details,
      suggestedAction: 'Check your internet connection and try again.',
      isRetryable: true,
    );
  }

  factory AppError.authentication({
    String? details,
  }) {
    return AppError.withTimestamp(
      type: ErrorType.authentication,
      code: 'AUTH_ERROR',
      title: 'Authentication Failed',
      message: 'We couldn\'t verify your identity. Please sign in again.',
      technicalDetails: details,
      suggestedAction: 'Please sign out and sign in again.',
      isRetryable: false,
    );
  }

  factory AppError.authorization({
    String? details,
  }) {
    return AppError.withTimestamp(
      type: ErrorType.authorization,
      code: 'AUTH_FORBIDDEN',
      title: 'Access Denied',
      message: 'You don\'t have permission to perform this action.',
      technicalDetails: details,
      suggestedAction: 'Contact support if you believe this is an error.',
      isRetryable: false,
    );
  }

  factory AppError.validation({
    required String field,
    String? details,
  }) {
    return AppError.withTimestamp(
      type: ErrorType.validation,
      code: 'VALIDATION_ERROR',
      title: 'Invalid Input',
      message: 'Please check the information you entered for $field.',
      technicalDetails: details,
      suggestedAction: 'Correct the highlighted fields and try again.',
      isRetryable: false,
    );
  }

  factory AppError.serverError({
    String? details,
  }) {
    return AppError.withTimestamp(
      type: ErrorType.serverError,
      code: 'SERVER_ERROR',
      title: 'Server Problem',
      message: 'Something went wrong on our end. We\'re working to fix it.',
      technicalDetails: details,
      suggestedAction: 'Please try again in a few minutes.',
      isRetryable: true,
    );
  }

  factory AppError.configuration({
    String? details,
  }) {
    return AppError.withTimestamp(
      type: ErrorType.configuration,
      code: 'CONFIG_ERROR',
      title: 'Configuration Error',
      message: 'The app is not properly configured. Please contact support.',
      technicalDetails: details,
      suggestedAction: 'Contact support with error details.',
      isRetryable: false,
    );
  }

  factory AppError.rateLimitExceeded({
    String? resetTime,
  }) {
    return AppError.withTimestamp(
      type: ErrorType.rateLimitExceeded,
      code: 'RATE_LIMIT',
      title: 'Usage Limit Reached',
      message: 'You\'ve reached your monthly usage limit for this feature.',
      technicalDetails: resetTime != null ? 'Resets: $resetTime' : null,
      suggestedAction: 'Upgrade your plan or wait until next month.',
      isRetryable: false,
    );
  }

  factory AppError.subscription({
    String? details,
  }) {
    return AppError.withTimestamp(
      type: ErrorType.subscription,
      code: 'SUBSCRIPTION_ERROR',
      title: 'Subscription Issue',
      message: 'There\'s a problem with your subscription.',
      technicalDetails: details,
      suggestedAction: 'Check your subscription status or contact support.',
      isRetryable: false,
    );
  }

  factory AppError.emailConfirmation({
    String? details,
  }) {
    return AppError.withTimestamp(
      type: ErrorType.emailConfirmation,
      code: 'EMAIL_NOT_CONFIRMED',
      title: 'Check Your Email',
      message: 'Please check your email and click the confirmation link to activate your account.',
      technicalDetails: details,
      suggestedAction: 'Check your email inbox (and spam folder) for a confirmation link.',
      isRetryable: false,
    );
  }

  factory AppError.unknown({
    String? details,
  }) {
    return AppError.withTimestamp(
      type: ErrorType.unknown,
      code: 'UNKNOWN_ERROR',
      title: 'Unexpected Error',
      message: 'Something unexpected happened. Please try again.',
      technicalDetails: details,
      suggestedAction: 'Try again or contact support if the problem persists.',
      isRetryable: true,
    );
  }

  // Factory to create AppError from common exceptions
  factory AppError.fromException(dynamic exception) {
    final String exceptionString = exception.toString();
    
    if (exceptionString.contains('SocketException') || 
        exceptionString.contains('TimeoutException') ||
        exceptionString.contains('HandshakeException')) {
      return AppError.network(details: exceptionString);
    }
    
    if (exceptionString.contains('email_not_confirmed') ||
        exceptionString.contains('Email not confirmed')) {
      return AppError.emailConfirmation(details: exceptionString);
    }
    
    if (exceptionString.contains('AuthException') ||
        exceptionString.contains('Invalid login credentials')) {
      return AppError.authentication(details: exceptionString);
    }
    
    if (exceptionString.contains('403') || 
        exceptionString.contains('Forbidden')) {
      return AppError.authorization(details: exceptionString);
    }
    
    if (exceptionString.contains('400') || 
        exceptionString.contains('ValidationException')) {
      return AppError.validation(field: 'input', details: exceptionString);
    }
    
    if (exceptionString.contains('500') || 
        exceptionString.contains('502') ||
        exceptionString.contains('503')) {
      return AppError.serverError(details: exceptionString);
    }
    
    if (exceptionString.contains('429') || 
        exceptionString.contains('rate limit')) {
      return AppError.rateLimitExceeded();
    }
    
    return AppError.unknown(details: exceptionString);
  }

  @override
  List<Object?> get props => [
    type,
    code,
    title,
    message,
    technicalDetails,
    suggestedAction,
    isRetryable,
    timestamp,
  ];
} 