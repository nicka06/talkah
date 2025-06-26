/// SupabaseConfig - Centralized Supabase Configuration and Client Management
/// 
/// This file serves as the single source of truth for all Supabase-related configuration
/// and provides centralized access to Supabase clients throughout the application.
/// 
/// IMPORTANCE: This file is CRITICAL for the app's functionality as it:
/// - Initializes the Supabase client with proper configuration
/// - Provides centralized access to authentication and database clients
/// - Manages environment variable loading for secure credential management
/// - Ensures consistent Supabase usage across all app components
/// 
/// USAGE: This class is used extensively throughout the app in:
/// - main.dart: App initialization
/// - auth_bloc.dart: User authentication and profile management
/// - api_service.dart: Database operations and API calls
/// - oauth_service.dart: OAuth authentication flows
/// - account_info_screen.dart: User profile updates
/// 
/// The centralized approach prevents configuration duplication and ensures
/// consistent behavior across all Supabase interactions.
import 'package:supabase_flutter/supabase_flutter.dart' as supabase;
import 'package:flutter_dotenv/flutter_dotenv.dart';

/// Centralized configuration class for Supabase integration
/// 
/// This class provides static access to Supabase configuration and clients,
/// ensuring consistent usage across the entire application. It handles:
/// - Environment variable loading and validation
/// - Supabase client initialization
/// - Centralized access to auth and database clients
class SupabaseConfig {
  /// Gets the Supabase project URL from environment variables
  /// 
  /// This URL points to the specific Supabase project instance.
  /// Falls back to empty string if not configured, which will trigger
  /// an error during initialization.
  static String get supabaseUrl => dotenv.env['SUPABASE_URL'] ?? '';
  
  /// Gets the Supabase anonymous key from environment variables
  /// 
  /// This key is used for client-side authentication and database access.
  /// Falls back to empty string if not configured, which will trigger
  /// an error during initialization.
  static String get supabaseAnonKey => dotenv.env['SUPABASE_ANON_KEY'] ?? '';
  
  /// Initializes the Supabase client with proper configuration
  /// 
  /// This method must be called before any Supabase operations can be performed.
  /// It loads environment variables, validates configuration, and initializes
  /// the Supabase client with the provided credentials.
  /// 
  /// Called from main.dart during app startup to ensure Supabase is ready
  /// before any authentication or database operations begin.
  /// 
  /// Throws an exception if required environment variables are missing.
  static Future<void> initialize() async {
    // Load environment variables from .env file
    // This file contains sensitive configuration that should not be committed to version control
    await dotenv.load(fileName: ".env");
    
    // Validate that required environment variables are present
    // This prevents runtime errors from missing configuration
    if (supabaseUrl.isEmpty || supabaseAnonKey.isEmpty) {
      throw Exception('SUPABASE_URL and SUPABASE_ANON_KEY must be provided in .env file');
    }
    
    // Initialize the Supabase client with the loaded configuration
    // debug: true enables detailed logging for development (should be false in production)
    await supabase.Supabase.initialize(
      url: supabaseUrl,
      anonKey: supabaseAnonKey,
      debug: true, // Set to false in production
    );
  }
  
  /// Provides centralized access to the Supabase client instance
  /// 
  /// This getter ensures all parts of the app use the same Supabase client
  /// instance, maintaining consistency and preventing multiple client creation.
  /// Used throughout the app for database operations, real-time subscriptions,
  /// and other Supabase features.
  static supabase.SupabaseClient get client => supabase.Supabase.instance.client;
  
  /// Provides centralized access to the Supabase authentication client
  /// 
  /// This getter provides convenient access to authentication operations
  /// like sign in, sign up, password reset, and session management.
  /// Used extensively in auth_bloc.dart and oauth_service.dart for user authentication.
  static supabase.GoTrueClient get auth => client.auth;
} 