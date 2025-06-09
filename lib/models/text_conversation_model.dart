class TextConversationModel {
  final String id;
  final String userId;
  final String topic;
  final List<ChatMessage> conversationHistory;
  final String status;
  final DateTime createdAt;
  final DateTime updatedAt;

  TextConversationModel({
    required this.id,
    required this.userId,
    required this.topic,
    required this.conversationHistory,
    required this.status,
    required this.createdAt,
    required this.updatedAt,
  });

  factory TextConversationModel.fromJson(Map<String, dynamic> json) {
    final historyJson = json['conversation_history'] as List<dynamic>? ?? [];
    final history = historyJson
        .map((messageJson) => ChatMessage.fromJson(messageJson))
        .toList();

    return TextConversationModel(
      id: json['id'],
      userId: json['user_id'],
      topic: json['topic'],
      conversationHistory: history,
      status: json['status'] ?? 'active',
      createdAt: DateTime.parse(json['created_at']),
      updatedAt: DateTime.parse(json['updated_at']),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'user_id': userId,
      'topic': topic,
      'conversation_history': conversationHistory.map((msg) => msg.toJson()).toList(),
      'status': status,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
    };
  }
}

class ChatMessage {
  final String role; // 'user' or 'assistant'
  final String content;
  final DateTime timestamp;

  ChatMessage({
    required this.role,
    required this.content,
    required this.timestamp,
  });

  factory ChatMessage.fromJson(Map<String, dynamic> json) {
    return ChatMessage(
      role: json['role'],
      content: json['content'],
      timestamp: DateTime.parse(json['timestamp']),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'role': role,
      'content': content,
      'timestamp': timestamp.toIso8601String(),
    };
  }

  bool get isUser => role == 'user';
  bool get isAssistant => role == 'assistant';
} 