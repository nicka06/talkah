/// UsageState - States for usage data management
/// 
/// This file defines the different states that the UsageBloc can emit
/// to communicate the current status of usage data operations to the UI.
/// States are used to determine what to display and how to handle user interactions.
import 'package:equatable/equatable.dart';
import '../../models/usage_model.dart';

/// Abstract base class for all usage-related states
/// 
/// Extends Equatable to enable proper state comparison and testing.
/// All usage states must extend this class and implement the props getter
/// for proper equality comparison and state management.
abstract class UsageState extends Equatable {
  const UsageState();

  /// Returns a list of properties used for equality comparison
  /// 
  /// This is required by Equatable to determine if two states are equal.
  /// Subclasses should override this to include their specific properties.
  @override
  List<Object?> get props => [];
}

/// Initial state when the UsageBloc is first created
/// 
/// This state represents the starting point before any usage data
/// has been loaded. The UI should typically show a placeholder or
/// trigger an initial load when this state is active.
class UsageInitial extends UsageState {}

/// State emitted when usage data is being loaded
/// 
/// This state is emitted when the UsageBloc is actively fetching
/// usage data from the API. The UI should display a loading indicator
/// (spinner, skeleton, etc.) to inform the user that data is being retrieved.
/// 
/// This state is typically shown during initial data loading but not
/// during refresh operations to avoid disrupting the current display.
class UsageLoading extends UsageState {}

/// State emitted when usage data has been successfully loaded
/// 
/// This state contains the actual usage data and is emitted when
/// the API call completes successfully. The UI should display the
/// usage information using the provided UsageModel data.
/// 
/// Parameters:
/// - usage: The UsageModel containing current usage statistics
class UsageLoaded extends UsageState {
  /// The usage data containing call minutes, SMS count, email count, etc.
  final UsageModel usage;

  /// Constructor requires usage data to be provided
  const UsageLoaded({required this.usage});

  /// Returns usage data for equality comparison
  /// 
  /// This ensures that state changes are properly detected when
  /// usage data is updated.
  @override
  List<Object> get props => [usage];
}

/// State emitted when an error occurs during usage data operations
/// 
/// This state is emitted when the API call fails or returns invalid data.
/// The UI should display an error message to inform the user about the issue
/// and potentially provide retry options.
/// 
/// Parameters:
/// - message: Human-readable error message describing what went wrong
class UsageError extends UsageState {
  /// Error message to display to the user
  final String message;

  /// Constructor requires an error message to be provided
  const UsageError({required this.message});

  /// Returns error message for equality comparison
  /// 
  /// This ensures that state changes are properly detected when
  /// error messages change.
  @override
  List<Object> get props => [message];
} 