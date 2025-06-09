class UsageModel {
  final int callsUsed;
  final int textsUsed;
  final int emailsUsed;
  final String tier;
  final UsageLimits limits;
  final UsageRemaining remaining;

  UsageModel({
    required this.callsUsed,
    required this.textsUsed,
    required this.emailsUsed,
    required this.tier,
    required this.limits,
    required this.remaining,
  });

  factory UsageModel.fromJson(Map<String, dynamic> json) {
    final usage = json['usage'];
    final limits = json['limits'];
    final remaining = json['remaining'];
    
    return UsageModel(
      callsUsed: usage['calls_used'] ?? 0,
      textsUsed: usage['texts_used'] ?? 0,
      emailsUsed: usage['emails_used'] ?? 0,
      tier: json['tier'] ?? 'free',
      limits: UsageLimits.fromJson(limits),
      remaining: UsageRemaining.fromJson(remaining),
    );
  }
}

class UsageLimits {
  final int calls;
  final int texts;
  final int emails; // -1 means unlimited

  UsageLimits({
    required this.calls,
    required this.texts,
    required this.emails,
  });

  factory UsageLimits.fromJson(Map<String, dynamic> json) {
    return UsageLimits(
      calls: json['calls'],
      texts: json['texts'],
      emails: json['emails'],
    );
  }

  bool get hasUnlimitedCalls => calls == -1;
  bool get hasUnlimitedTexts => texts == -1;
  bool get hasUnlimitedEmails => emails == -1;
}

class UsageRemaining {
  final int calls;
  final int texts;
  final int emails; // -1 means unlimited

  UsageRemaining({
    required this.calls,
    required this.texts,
    required this.emails,
  });

  factory UsageRemaining.fromJson(Map<String, dynamic> json) {
    return UsageRemaining(
      calls: json['calls'],
      texts: json['texts'],
      emails: json['emails'],
    );
  }

  bool get hasCallsRemaining => calls > 0 || calls == -1;
  bool get hasTextsRemaining => texts > 0 || texts == -1;
  bool get hasEmailsRemaining => emails > 0 || emails == -1;
} 