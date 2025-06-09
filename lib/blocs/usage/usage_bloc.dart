import 'package:flutter_bloc/flutter_bloc.dart';
import '../../services/api_service.dart';
import 'usage_event.dart';
import 'usage_state.dart';

class UsageBloc extends Bloc<UsageEvent, UsageState> {
  UsageBloc() : super(UsageInitial()) {
    on<UsageLoadRequested>(_onUsageLoadRequested);
    on<UsageRefreshRequested>(_onUsageRefreshRequested);
  }

  Future<void> _onUsageLoadRequested(
    UsageLoadRequested event,
    Emitter<UsageState> emit,
  ) async {
    emit(UsageLoading());
    await _loadUsage(emit);
  }

  Future<void> _onUsageRefreshRequested(
    UsageRefreshRequested event,
    Emitter<UsageState> emit,
  ) async {
    await _loadUsage(emit);
  }

  Future<void> _loadUsage(Emitter<UsageState> emit) async {
    try {
      final usage = await ApiService.getUserUsage();
      if (usage != null) {
        emit(UsageLoaded(usage: usage));
      } else {
        emit(const UsageError(message: 'Failed to load usage data'));
      }
    } catch (e) {
      emit(UsageError(message: e.toString()));
    }
  }
} 