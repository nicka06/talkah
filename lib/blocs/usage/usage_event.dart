import 'package:equatable/equatable.dart';

abstract class UsageEvent extends Equatable {
  const UsageEvent();

  @override
  List<Object?> get props => [];
}

class UsageLoadRequested extends UsageEvent {}

class UsageRefreshRequested extends UsageEvent {} 