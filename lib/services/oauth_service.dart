import 'package:google_sign_in/google_sign_in.dart';
import 'package:sign_in_with_apple/sign_in_with_apple.dart';
import 'package:supabase_flutter/supabase_flutter.dart' as supabase;
import '../config/supabase_config.dart';
import 'dart:io' show Platform;
import 'package:flutter/foundation.dart';

class OAuthService {
  static final GoogleSignIn _googleSignIn = GoogleSignIn(
    scopes: ['email', 'profile'],
  );

  /// Sign in with Google
  static Future<supabase.AuthResponse?> signInWithGoogle() async {
    try {
      if (kDebugMode) {
        debugPrint('🔐 OAuthService: Starting Google Sign-In');
      }

      // Trigger Google Sign-In flow
      final GoogleSignInAccount? googleUser = await _googleSignIn.signIn();
      if (googleUser == null) {
        if (kDebugMode) {
          debugPrint('🔐 OAuthService: User cancelled Google Sign-In');
        }
        // User cancelled the sign-in
        return null;
      }

      if (kDebugMode) {
        debugPrint('🔐 OAuthService: Google user signed in: ${googleUser.email}');
      }

      // Get authentication details
      final GoogleSignInAuthentication googleAuth = await googleUser.authentication;
      
      if (googleAuth.accessToken == null || googleAuth.idToken == null) {
        throw Exception('Failed to get Google authentication tokens');
      }

      if (kDebugMode) {
        debugPrint('🔐 OAuthService: Got Google auth tokens, signing in with Supabase');
      }

      // Sign in with Supabase using Google credentials
      final response = await SupabaseConfig.auth.signInWithIdToken(
        provider: supabase.OAuthProvider.google,
        idToken: googleAuth.idToken!,
        accessToken: googleAuth.accessToken!,
      );

      if (kDebugMode) {
        debugPrint('🔐 OAuthService: Supabase sign-in complete');
      }

      return response;
    } catch (e) {
      if (kDebugMode) {
        debugPrint('🔐 OAuthService: Google Sign-In Error: $e');
      }
      
      // Provide helpful error messages for common issues
      if (e.toString().contains('GoogleService-Info.plist')) {
        throw Exception('Google Sign-In not configured. Please add GoogleService-Info.plist to ios/Runner/ directory');
      } else if (e.toString().contains('REVERSED_CLIENT_ID')) {
        throw Exception('Google URL scheme not configured. Please update CFBundleURLSchemes in ios/Runner/Info.plist');
      }
      
      rethrow;
    }
  }

  /// Sign in with Apple (iOS only)
  static Future<supabase.AuthResponse?> signInWithApple() async {
    try {
      if (kDebugMode) {
        debugPrint('🔐 OAuthService: Starting Apple Sign-In');
      }

      // Check if Apple Sign In is available (iOS 13+ only)
      if (!Platform.isIOS) {
        throw Exception('Apple Sign In is only available on iOS');
      }

      if (!await SignInWithApple.isAvailable()) {
        throw Exception('Apple Sign In is not available on this device (requires iOS 13+)');
      }

      if (kDebugMode) {
        debugPrint('🔐 OAuthService: Apple Sign-In available, requesting credentials');
      }

      // Trigger Apple Sign-In flow
      final credential = await SignInWithApple.getAppleIDCredential(
        scopes: [
          AppleIDAuthorizationScopes.email,
          AppleIDAuthorizationScopes.fullName,
        ],
      );

      if (credential.identityToken == null) {
        throw Exception('Failed to get Apple identity token');
      }

      if (kDebugMode) {
        debugPrint('🔐 OAuthService: Got Apple credentials, signing in with Supabase');
      }

      // Sign in with Supabase using Apple credentials
      final response = await SupabaseConfig.auth.signInWithIdToken(
        provider: supabase.OAuthProvider.apple,
        idToken: credential.identityToken!,
      );

      if (kDebugMode) {
        debugPrint('🔐 OAuthService: Apple Supabase sign-in complete');
      }

      return response;
    } catch (e) {
      if (kDebugMode) {
        debugPrint('🔐 OAuthService: Apple Sign-In Error: $e');
      }
      
      // Provide helpful error messages
      if (e.toString().contains('not available')) {
        throw Exception('Apple Sign-In not available: ${e.toString()}');
      } else if (e.toString().contains('capability')) {
        throw Exception('Apple Sign-In capability not enabled in app configuration');
      }
      
      rethrow;
    }
  }

  /// Sign out from Google
  static Future<void> signOutGoogle() async {
    try {
      if (kDebugMode) {
        debugPrint('🔐 OAuthService: Signing out from Google');
      }
      await _googleSignIn.signOut();
    } catch (e) {
      if (kDebugMode) {
        debugPrint('🔐 OAuthService: Google Sign-Out Error: $e');
      }
    }
  }

  /// Check if user is signed in with Google
  static Future<bool> isSignedInWithGoogle() async {
    try {
      return await _googleSignIn.isSignedIn();
    } catch (e) {
      if (kDebugMode) {
        debugPrint('🔐 OAuthService: Google Sign-In Check Error: $e');
      }
      return false;
    }
  }
} 