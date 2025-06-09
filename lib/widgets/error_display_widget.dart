import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import '../models/app_error.dart';

class ErrorDisplayWidget {
  /// Show error as a SnackBar (for quick, non-blocking notifications)
  static void showSnackBar(BuildContext context, AppError error) {
    if (kDebugMode) {
      debugPrint('🎯 ErrorDisplayWidget.showSnackBar called');
      debugPrint('   Error Type: ${error.type}');
      debugPrint('   Error Title: ${error.title}');
      debugPrint('   Error Message: ${error.message}');
      debugPrint('   Context mounted: ${context.mounted}');
    }
    
    // Check if context is still valid
    if (!context.mounted) {
      if (kDebugMode) {
        debugPrint('❌ Context not mounted, cannot show SnackBar');
      }
      return;
    }
    
    try {
      // Use a post-frame callback to ensure the UI is ready
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (context.mounted) {
          ScaffoldMessenger.of(context).clearSnackBars();
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    error.title,
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(error.message),
                  if (error.suggestedAction != null) ...[
                    const SizedBox(height: 4),
                    Text(
                      error.suggestedAction!,
                      style: TextStyle(
                        color: Colors.white.withOpacity(0.8),
                        fontSize: 12,
                      ),
                    ),
                  ],
                ],
              ),
              backgroundColor: _getErrorColor(error.type),
              duration: _getSnackBarDuration(error.type),
              action: error.isRetryable
                  ? SnackBarAction(
                      label: 'Retry',
                      textColor: Colors.white,
                      onPressed: () {
                        // The calling code should handle retry logic
                      },
                    )
                  : null,
            ),
          );
          
          if (kDebugMode) {
            debugPrint('✅ SnackBar displayed successfully');
          }
        } else {
          if (kDebugMode) {
            debugPrint('❌ Context unmounted during post-frame callback');
          }
        }
      });
    } catch (e) {
      if (kDebugMode) {
        debugPrint('❌ Error showing SnackBar: $e');
      }
      
      // Fallback: try to show a basic dialog if SnackBar fails
      _showFallbackError(context, error);
    }
  }
  
  /// Fallback error display when SnackBar fails
  static void _showFallbackError(BuildContext context, AppError error) {
    if (!context.mounted) return;
    
    try {
      showDialog(
        context: context,
        builder: (context) => AlertDialog(
          title: Text(error.title),
          content: Text(error.message),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('OK'),
            ),
          ],
        ),
      );
      
      if (kDebugMode) {
        debugPrint('✅ Fallback dialog displayed');
      }
    } catch (e) {
      if (kDebugMode) {
        debugPrint('❌ Even fallback dialog failed: $e');
      }
    }
  }

  /// Show error as a Dialog (for critical errors that need user attention)
  static Future<void> showErrorDialog(BuildContext context, AppError error) {
    return showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (BuildContext context) {
        return AlertDialog(
          icon: Icon(
            _getErrorIcon(error.type),
            color: _getErrorColor(error.type),
            size: 48,
          ),
          title: Text(error.title),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(error.message),
              if (error.suggestedAction != null) ...[
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.surfaceVariant,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        Icons.lightbulb_outline,
                        size: 20,
                        color: Theme.of(context).colorScheme.primary,
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          error.suggestedAction!,
                          style: TextStyle(
                            color: Theme.of(context).colorScheme.onSurfaceVariant,
                            fontSize: 14,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ),
          actions: [
            if (error.isRetryable)
              TextButton(
                onPressed: () {
                  Navigator.of(context).pop();
                  // The calling code should handle retry logic
                },
                child: const Text('Retry'),
              ),
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('OK'),
            ),
          ],
        );
      },
    );
  }

  /// Show error as a Card (for displaying in error states of screens)
  static Widget buildErrorCard(
    BuildContext context,
    AppError error, {
    VoidCallback? onRetry,
    VoidCallback? onDismiss,
  }) {
    return Card(
      margin: const EdgeInsets.all(16),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              _getErrorIcon(error.type),
              color: _getErrorColor(error.type),
              size: 48,
            ),
            const SizedBox(height: 16),
            Text(
              error.title,
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                color: _getErrorColor(error.type),
                fontWeight: FontWeight.bold,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              error.message,
              style: Theme.of(context).textTheme.bodyLarge,
              textAlign: TextAlign.center,
            ),
            if (error.suggestedAction != null) ...[
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.surfaceVariant,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  children: [
                    Icon(
                      Icons.lightbulb_outline,
                      size: 20,
                      color: Theme.of(context).colorScheme.primary,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        error.suggestedAction!,
                        style: TextStyle(
                          color: Theme.of(context).colorScheme.onSurfaceVariant,
                          fontSize: 14,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                if (error.isRetryable && onRetry != null) ...[
                  ElevatedButton.icon(
                    onPressed: onRetry,
                    icon: const Icon(Icons.refresh),
                    label: const Text('Try Again'),
                  ),
                  const SizedBox(width: 8),
                ],
                if (onDismiss != null)
                  TextButton(
                    onPressed: onDismiss,
                    child: const Text('Dismiss'),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  /// Show error as a clean notification that appears briefly and disappears
  static void showNotification(BuildContext context, AppError error) {
    if (kDebugMode) {
      debugPrint('🎯 showNotification called');
      debugPrint('   Error: ${error.title}');
      debugPrint('   Context mounted: ${context.mounted}');
    }
    
    if (!context.mounted) {
      if (kDebugMode) {
        debugPrint('❌ Context not mounted, cannot show notification');
      }
      return;
    }
    
    try {
      // Remove any existing notifications
      ScaffoldMessenger.of(context).clearSnackBars();
      
      if (kDebugMode) {
        debugPrint('🔄 Getting overlay...');
      }
      
      // Show custom notification overlay
      final overlay = Overlay.of(context);
      if (overlay == null) {
        if (kDebugMode) {
          debugPrint('❌ Overlay is null');
        }
        return;
      }
      
      if (kDebugMode) {
        debugPrint('✅ Overlay obtained, creating overlay entry...');
      }
      
      late OverlayEntry overlayEntry;
      
      overlayEntry = OverlayEntry(
        builder: (context) {
          if (kDebugMode) {
            debugPrint('🎨 Building notification widget...');
          }
          return _NotificationWidget(
            error: error,
            onDismiss: () {
              if (kDebugMode) {
                debugPrint('🗑️ Dismissing notification...');
              }
              if (overlayEntry.mounted) {
                overlayEntry.remove();
              }
            },
          );
        },
      );
      
      if (kDebugMode) {
        debugPrint('📌 Inserting overlay entry...');
      }
      
      overlay.insert(overlayEntry);
      
      if (kDebugMode) {
        debugPrint('✅ Overlay inserted successfully');
      }
      
      // Auto-dismiss after duration based on error type
      final duration = _getSnackBarDuration(error.type);
      Future.delayed(duration, () {
        if (kDebugMode) {
          debugPrint('⏰ Auto-dismiss timer triggered');
        }
        if (overlayEntry.mounted) {
          overlayEntry.remove();
          if (kDebugMode) {
            debugPrint('✅ Auto-dismissed notification');
          }
        }
      });
      
    } catch (e, stackTrace) {
      if (kDebugMode) {
        debugPrint('❌ Error in showNotification: $e');
        debugPrint('Stack trace: $stackTrace');
      }
    }
  }

  /// Get appropriate color for error type
  static Color _getErrorColor(ErrorType type) {
    switch (type) {
      case ErrorType.network:
        return Colors.orange;
      case ErrorType.authentication:
      case ErrorType.authorization:
        return Colors.red;
      case ErrorType.validation:
        return Colors.amber;
      case ErrorType.serverError:
        return Colors.red;
      case ErrorType.configuration:
        return Colors.purple;
      case ErrorType.rateLimitExceeded:
        return Colors.blue;
      case ErrorType.subscription:
        return Colors.indigo;
      case ErrorType.emailConfirmation:
        return Colors.teal;
      case ErrorType.unknown:
        return Colors.grey;
    }
  }

  /// Get appropriate icon for error type
  static IconData _getErrorIcon(ErrorType type) {
    switch (type) {
      case ErrorType.network:
        return Icons.wifi_off;
      case ErrorType.authentication:
        return Icons.lock_outline;
      case ErrorType.authorization:
        return Icons.block;
      case ErrorType.validation:
        return Icons.warning_amber;
      case ErrorType.serverError:
        return Icons.error_outline;
      case ErrorType.configuration:
        return Icons.settings_outlined;
      case ErrorType.rateLimitExceeded:
        return Icons.hourglass_empty;
      case ErrorType.subscription:
        return Icons.payment;
      case ErrorType.emailConfirmation:
        return Icons.email_outlined;
      case ErrorType.unknown:
        return Icons.help_outline;
    }
  }

  /// Get appropriate duration for SnackBar based on error type
  static Duration _getSnackBarDuration(ErrorType type) {
    switch (type) {
      case ErrorType.validation:
        return const Duration(seconds: 4);
      case ErrorType.network:
      case ErrorType.serverError:
        return const Duration(seconds: 6);
      case ErrorType.authentication:
      case ErrorType.authorization:
      case ErrorType.rateLimitExceeded:
      case ErrorType.subscription:
        return const Duration(seconds: 8);
      default:
        return const Duration(seconds: 5);
    }
  }
}

/// Custom notification widget that appears as an overlay
class _NotificationWidget extends StatefulWidget {
  final AppError error;
  final VoidCallback onDismiss;

  const _NotificationWidget({
    required this.error,
    required this.onDismiss,
  });

  @override
  State<_NotificationWidget> createState() => _NotificationWidgetState();
}

class _NotificationWidgetState extends State<_NotificationWidget>
    with SingleTickerProviderStateMixin {
  late AnimationController _animationController;
  late Animation<Offset> _slideAnimation;
  late Animation<double> _fadeAnimation;

  @override
  void initState() {
    super.initState();
    
    if (kDebugMode) {
      debugPrint('🎭 _NotificationWidget initState: ${widget.error.title}');
    }
    
    _animationController = AnimationController(
      duration: const Duration(milliseconds: 300),
      vsync: this,
    );

    _slideAnimation = Tween<Offset>(
      begin: const Offset(0.0, -1.0),
      end: Offset.zero,
    ).animate(CurvedAnimation(
      parent: _animationController,
      curve: Curves.easeOutBack,
    ));

    _fadeAnimation = Tween<double>(
      begin: 0.0,
      end: 1.0,
    ).animate(CurvedAnimation(
      parent: _animationController,
      curve: Curves.easeOut,
    ));

    // Start the animation
    _animationController.forward().then((_) {
      if (kDebugMode) {
        debugPrint('✅ Notification animation completed');
      }
    });
    
    if (kDebugMode) {
      debugPrint('🚀 Starting notification animation...');
    }
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  void _dismiss() async {
    await _animationController.reverse();
    widget.onDismiss();
  }

  @override
  Widget build(BuildContext context) {
    return Positioned(
      top: 0,
      left: 0,
      right: 0,
      child: SlideTransition(
        position: _slideAnimation,
        child: FadeTransition(
          opacity: _fadeAnimation,
          child: Material(
            color: Colors.transparent,
            child: Container(
              margin: EdgeInsets.only(
                top: MediaQuery.of(context).padding.top + 16,
                left: 16,
                right: 16,
              ),
              child: GestureDetector(
                onTap: _dismiss,
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: ErrorDisplayWidget._getErrorColor(widget.error.type),
                    borderRadius: BorderRadius.circular(12),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.1),
                        blurRadius: 10,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Row(
                    children: [
                      Icon(
                        ErrorDisplayWidget._getErrorIcon(widget.error.type),
                        color: Colors.white,
                        size: 24,
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              widget.error.title,
                              style: const TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.bold,
                                fontSize: 16,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              widget.error.message,
                              style: TextStyle(
                                color: Colors.white.withOpacity(0.9),
                                fontSize: 14,
                              ),
                            ),
                            if (widget.error.suggestedAction != null) ...[
                              const SizedBox(height: 6),
                              Text(
                                widget.error.suggestedAction!,
                                style: TextStyle(
                                  color: Colors.white.withOpacity(0.8),
                                  fontSize: 12,
                                  fontStyle: FontStyle.italic,
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),
                      IconButton(
                        onPressed: _dismiss,
                        icon: const Icon(
                          Icons.close,
                          color: Colors.white,
                          size: 20,
                        ),
                        padding: EdgeInsets.zero,
                        constraints: const BoxConstraints(
                          minWidth: 24,
                          minHeight: 24,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
} 