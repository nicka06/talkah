import 'package:equatable/equatable.dart';

/// Represents a scheduled plan change (upgrade, downgrade, or billing switch)
/// This is used when a user has requested a plan change that will take effect
/// at the end of their current billing period
class PendingPlanChange extends Equatable {
  final String targetPlanId;
  final DateTime effectiveDate;
  final String changeType; // 'upgrade', 'downgrade', 'switch'

  const PendingPlanChange({
    required this.targetPlanId,
    required this.effectiveDate,
    required this.changeType,
  });

  /// Create PendingPlanChange from JSON data
  /// Expects data from the users table fields
  factory PendingPlanChange.fromJson(Map<String, dynamic> json) {
    return PendingPlanChange(
      targetPlanId: json['pending_plan_id'] as String,
      effectiveDate: DateTime.parse(json['plan_change_effective_date'] as String),
      changeType: json['plan_change_type'] as String,
    );
  }

  /// Convert to JSON for storage
  Map<String, dynamic> toJson() {
    return {
      'pending_plan_id': targetPlanId,
      'plan_change_effective_date': effectiveDate.toIso8601String(),
      'plan_change_type': changeType,
    };
  }

  /// Helper getters for change type
  bool get isUpgrade => changeType == 'upgrade';
  bool get isDowngrade => changeType == 'downgrade';
  bool get isBillingSwitch => changeType == 'switch';

  /// Helper getter for formatted effective date
  String get formattedEffectiveDate {
    return '${effectiveDate.month}/${effectiveDate.day}/${effectiveDate.year}';
  }

  /// Helper getter for days until effective
  int get daysUntilEffective {
    final now = DateTime.now();
    return effectiveDate.difference(now).inDays;
  }

  /// Helper getter for human-readable change description
  String get changeDescription {
    switch (changeType) {
      case 'upgrade':
        return 'Upgrade to ${targetPlanId.toUpperCase()}';
      case 'downgrade':
        return 'Downgrade to ${targetPlanId.toUpperCase()}';
      case 'switch':
        return 'Switch billing interval';
      default:
        return 'Plan change to ${targetPlanId.toUpperCase()}';
    }
  }

  /// Create a copy with updated fields
  PendingPlanChange copyWith({
    String? targetPlanId,
    DateTime? effectiveDate,
    String? changeType,
  }) {
    return PendingPlanChange(
      targetPlanId: targetPlanId ?? this.targetPlanId,
      effectiveDate: effectiveDate ?? this.effectiveDate,
      changeType: changeType ?? this.changeType,
    );
  }

  @override
  List<Object?> get props => [targetPlanId, effectiveDate, changeType];

  @override
  String toString() {
    return 'PendingPlanChange(targetPlanId: $targetPlanId, effectiveDate: $effectiveDate, changeType: $changeType)';
  }
} 