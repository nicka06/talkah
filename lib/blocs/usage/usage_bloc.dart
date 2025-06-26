/// UsageBloc - Manages user usage data state and operations
/// 
/// This BLoC handles loading and refreshing user usage statistics including:
/// - Call minutes used
/// - SMS messages sent
/// - Email messages sent
/// - Usage limits and remaining quotas
/// 
/// The bloc communicates with the API service to fetch real-time usage data
/// and provides state management for the UI to display usage information.
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../services/api_service.dart';
import 'usage_event.dart';
import 'usage_state.dart';

/// Main BLoC class for managing user usage data
/// 
/// Extends Bloc<UsageEvent, UsageState> to handle usage-related events
/// and emit appropriate states for UI updates.
class UsageBloc extends Bloc<UsageEvent, UsageState> {
  /// Constructor initializes the bloc with UsageInitial state
  /// and registers event handlers for usage operations
  UsageBloc() : super(UsageInitial()) {
    // Register event handler for initial usage data loading
    on<UsageLoadRequested>(_onUsageLoadRequested);
    // Register event handler for refreshing usage data
    on<UsageRefreshRequested>(_onUsageRefreshRequested);
  }

  /// Handles UsageLoadRequested events - initial data loading
  /// 
  /// This method is triggered when the UI needs to load usage data for the first time.
  /// It emits a loading state immediately and then attempts to fetch usage data.
  /// 
  /// Parameters:
  /// - event: The UsageLoadRequested event that triggered this handler
  /// - emit: Function to emit new states to the UI
  Future<void> _onUsageLoadRequested(
    UsageLoadRequested event,
    Emitter<UsageState> emit,
  ) async {
    // Emit loading state to show loading indicator in UI
    emit(UsageLoading());
    // Attempt to load usage data from API
    await _loadUsage(emit);
  }

  /// Handles UsageRefreshRequested events - data refresh
  /// 
  /// This method is triggered when the UI needs to refresh existing usage data.
  /// Unlike initial loading, it doesn't emit a loading state to avoid
  /// disrupting the current UI display.
  /// 
  /// Parameters:
  /// - event: The UsageRefreshRequested event that triggered this handler
  /// - emit: Function to emit new states to the UI
  Future<void> _onUsageRefreshRequested(
    UsageRefreshRequested event,
    Emitter<UsageState> emit,
  ) async {
    // Load usage data without showing loading state
    await _loadUsage(emit);
  }

  /// Private method to load usage data from the API service
  /// 
  /// This is the core method that handles the actual API call to fetch
  /// user usage data. It handles both successful responses and errors,
  /// emitting appropriate states based on the result.
  /// 
  /// Parameters:
  /// - emit: Function to emit new states to the UI
  Future<void> _loadUsage(Emitter<UsageState> emit) async {
    try {
      // Call API service to fetch current user usage data
      final usage = await ApiService.getUserUsage();
      
      // Check if usage data was successfully retrieved
      if (usage != null) {
        // Emit success state with the loaded usage data
        emit(UsageLoaded(usage: usage));
      } else {
        // Emit error state if API returned null
        emit(const UsageError(message: 'Failed to load usage data'));
      }
    } catch (e) {
      // Emit error state with the exception message
      emit(UsageError(message: e.toString()));
    }
  }
} 