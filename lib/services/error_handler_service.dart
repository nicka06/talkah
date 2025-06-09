import 'package:flutter/foundation.dart';
import '../models/app_error.dart';

class ErrorHandlerService {
  static final ErrorHandlerService _instance = ErrorHandlerService._internal();
  factory ErrorHandlerService() => _instance;
  ErrorHandlerService._internal();

  // In-memory error log for debugging (could be persisted later)
  final List<AppError> _errorLog = [];
  
  // Maximum number of errors to keep in memory
  static const int _maxErrorLogSize = 100;

  /// Log an error and optionally report it
  void logError(AppError error) {
    // Add to in-memory log
    _errorLog.add(error);
    
    // Keep log size manageable
    if (_errorLog.length > _maxErrorLogSize) {
      _errorLog.removeAt(0);
    }
    
    // Log to console in debug mode
    if (kDebugMode) {
      debugPrint('🚨 ERROR [${error.type.name.toUpperCase()}]: ${error.title}');
      debugPrint('   Message: ${error.message}');
      if (error.technicalDetails != null) {
        debugPrint('   Technical: ${error.technicalDetails}');
      }
      if (error.suggestedAction != null) {
        debugPrint('   Action: ${error.suggestedAction}');
      }
      debugPrint('   Time: ${error.timestamp}');
      debugPrint('   Retryable: ${error.isRetryable}');
      debugPrint('---');
    }
    
    // TODO: In production, send critical errors to crash reporting service
    // if (error.type == ErrorType.serverError || error.type == ErrorType.configuration) {
    //   _reportToCrashlytics(error);
    // }
  }

  /// Get recent errors for debugging/support
  List<AppError> getRecentErrors([int? limit]) {
    final int actualLimit = limit ?? 10;
    if (_errorLog.length <= actualLimit) {
      return List.from(_errorLog);
    }
    return _errorLog.sublist(_errorLog.length - actualLimit);
  }

  /// Clear error log
  void clearErrorLog() {
    _errorLog.clear();
  }

  /// Convert an exception to an AppError and log it
  AppError handleException(dynamic exception, [String? context]) {
    final AppError error = AppError.fromException(exception);
    
    // Add context if provided
    if (context != null) {
      final contextualError = AppError.withTimestamp(
        type: error.type,
        code: error.code,
        title: error.title,
        message: error.message,
        technicalDetails: 'Context: $context\n${error.technicalDetails ?? ''}',
        suggestedAction: error.suggestedAction,
        isRetryable: error.isRetryable,
      );
      logError(contextualError);
      return contextualError;
    }
    
    logError(error);
    return error;
  }

  /// Get error statistics for analytics
  Map<String, int> getErrorStatistics() {
    final Map<String, int> stats = {};
    for (final error in _errorLog) {
      final key = error.type.name;
      stats[key] = (stats[key] ?? 0) + 1;
    }
    return stats;
  }

  /// Check if a specific error type has occurred recently
  bool hasRecentErrorOfType(ErrorType type, {Duration window = const Duration(minutes: 5)}) {
    final cutoff = DateTime.now().subtract(window);
    return _errorLog.any((error) => 
      error.type == type && error.timestamp.isAfter(cutoff)
    );
  }

  /// Generate a user-friendly error report for support
  String generateErrorReport() {
    final buffer = StringBuffer();
    buffer.writeln('Error Report Generated: ${DateTime.now()}');
    buffer.writeln('Total Errors: ${_errorLog.length}');
    buffer.writeln('');
    
    final stats = getErrorStatistics();
    buffer.writeln('Error Statistics:');
    stats.forEach((type, count) {
      buffer.writeln('  $type: $count');
    });
    buffer.writeln('');
    
    buffer.writeln('Recent Errors (Last 5):');
    final recentErrors = getRecentErrors(5);
    for (int i = 0; i < recentErrors.length; i++) {
      final error = recentErrors[i];
      buffer.writeln('${i + 1}. [${error.timestamp}] ${error.code}: ${error.title}');
      if (error.technicalDetails != null) {
        buffer.writeln('   Details: ${error.technicalDetails}');
      }
    }
    
    return buffer.toString();
  }

  // TODO: Future integration with crash reporting services
  // void _reportToCrashlytics(AppError error) {
  //   // Firebase Crashlytics integration
  //   FirebaseCrashlytics.instance.recordError(
  //     error.message,
  //     null,
  //     fatal: error.type == ErrorType.configuration,
  //   );
  // }
} 