/// UsageEvent - Events for usage data operations
/// 
/// This file defines the events that can be dispatched to the UsageBloc
/// to trigger usage data loading and refresh operations. Events are used
/// to communicate user actions or system requirements to the bloc.
import 'package:equatable/equatable.dart';

/// Abstract base class for all usage-related events
/// 
/// Extends Equatable to enable proper state comparison and testing.
/// All usage events must extend this class and implement the props getter
/// for proper equality comparison.
abstract class UsageEvent extends Equatable {
  const UsageEvent();

  /// Returns a list of properties used for equality comparison
  /// 
  /// This is required by Equatable to determine if two events are equal.
  /// Since most usage events don't carry data, this returns an empty list.
  @override
  List<Object?> get props => [];
}

/// Event triggered when usage data needs to be loaded for the first time
/// 
/// This event is typically dispatched when:
/// - User opens a screen that displays usage information
/// - App starts and needs to initialize usage data
/// - User navigates to usage-related screens
/// 
/// The UsageBloc will respond by showing a loading state and then
/// attempting to fetch usage data from the API.
class UsageLoadRequested extends UsageEvent {}

/// Event triggered when usage data needs to be refreshed
/// 
/// This event is typically dispatched when:
/// - User pulls to refresh on usage screens
/// - User completes an action that affects usage (call, SMS, email)
/// - App needs to update usage data without showing loading state
/// 
/// The UsageBloc will respond by fetching fresh usage data without
/// emitting a loading state to avoid disrupting the current UI.
class UsageRefreshRequested extends UsageEvent {} 