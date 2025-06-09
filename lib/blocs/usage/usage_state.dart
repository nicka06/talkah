import 'package:equatable/equatable.dart';
import '../../models/usage_model.dart';

abstract class UsageState extends Equatable {
  const UsageState();

  @override
  List<Object?> get props => [];
}

class UsageInitial extends UsageState {}

class UsageLoading extends UsageState {}

class UsageLoaded extends UsageState {
  final UsageModel usage;

  const UsageLoaded({required this.usage});

  @override
  List<Object> get props => [usage];
}

class UsageError extends UsageState {
  final String message;

  const UsageError({required this.message});

  @override
  List<Object> get props => [message];
} 