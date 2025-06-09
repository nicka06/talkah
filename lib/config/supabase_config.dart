import 'package:supabase_flutter/supabase_flutter.dart' as supabase;
import 'package:flutter_dotenv/flutter_dotenv.dart';

class SupabaseConfig {
  static String get supabaseUrl => dotenv.env['SUPABASE_URL'] ?? '';
  static String get supabaseAnonKey => dotenv.env['SUPABASE_ANON_KEY'] ?? '';
  
  static Future<void> initialize() async {
    // Load environment variables from .env file
    await dotenv.load(fileName: ".env");
    
    if (supabaseUrl.isEmpty || supabaseAnonKey.isEmpty) {
      throw Exception('SUPABASE_URL and SUPABASE_ANON_KEY must be provided in .env file');
    }
    
    await supabase.Supabase.initialize(
      url: supabaseUrl,
      anonKey: supabaseAnonKey,
      debug: true, // Set to false in production
    );
  }
  
  static supabase.SupabaseClient get client => supabase.Supabase.instance.client;
  static supabase.GoTrueClient get auth => client.auth;
} 