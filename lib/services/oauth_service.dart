import 'package:google_sign_in/google_sign_in.dart';
import 'package:sign_in_with_apple/sign_in_with_apple.dart';
import 'package:supabase_flutter/supabase_flutter.dart' as supabase;
import '../config/supabase_config.dart';
import 'dart:io' show Platform;
import 'package:flutter/foundation.dart';
import 'dart:convert';
import 'dart:math';
import 'package:crypto/crypto.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

class OAuthService {
  static final GoogleSignIn _googleSignIn = GoogleSignIn(
    scopes: ['email', 'profile', 'openid'],
    serverClientId: dotenv.env['GOOGLE_WEB_CLIENT_ID'],
    clientId: dotenv.env['GOOGLE_IOS_CLIENT_ID'],
  );

  /// Generate a cryptographically secure nonce for Google Sign-In
  static String _generateNonce() {
    final random = Random.secure();
    final bytes = List<int>.generate(32, (i) => random.nextInt(256));
    return base64UrlEncode(bytes).replaceAll('=', '');
  }

  /// Hash a nonce with SHA256
  static String _hashNonce(String nonce) {
    final bytes = utf8.encode(nonce);
    final digest = sha256.convert(bytes);
    return digest.toString();
  }

  /// Sign in with Google
  static Future<supabase.AuthResponse?> signInWithGoogle() async {
    try {
      if (kDebugMode) {
        debugPrint('🔐 OAuthService: Starting Google Sign-In');
      }

      // Generate nonce for security
      final nonce = _generateNonce();
      final hashedNonce = _hashNonce(nonce);

      if (kDebugMode) {
        debugPrint('🔐 OAuthService: Generated nonce for secure authentication');
      }

      if (kDebugMode) {
        debugPrint('🔐 OAuthService: About to call _googleSignIn.signIn()');
      }

      // Trigger Google Sign-In flow
      final GoogleSignInAccount? googleUser = await _googleSignIn.signIn();
      
      if (kDebugMode) {
        debugPrint('🔐 OAuthService: _googleSignIn.signIn() completed');
      }
      
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

      if (kDebugMode) {
        debugPrint('🔐 OAuthService: About to call googleUser.authentication');
      }

      // Get authentication details
      final GoogleSignInAuthentication googleAuth = await googleUser.authentication;
      
      if (kDebugMode) {
        debugPrint('🔐 OAuthService: googleUser.authentication completed');
        debugPrint('🔐 OAuthService: idToken is null: ${googleAuth.idToken == null}');
        debugPrint('🔐 OAuthService: accessToken is null: ${googleAuth.accessToken == null}');
      }
      
      if (googleAuth.idToken == null) {
        throw Exception('Failed to get Google ID token');
      }

      if (kDebugMode) {
        debugPrint('🔐 OAuthService: Got Google auth tokens, signing in with Supabase');
      }

      // Sign in with Supabase using Google credentials and nonce
      final response = await SupabaseConfig.auth.signInWithIdToken(
        provider: supabase.OAuthProvider.google,
        idToken: googleAuth.idToken!,
        nonce: nonce, // Pass the original nonce to Supabase
      );

      if (kDebugMode) {
        debugPrint('🔐 OAuthService: Supabase sign-in complete');
      }

      return response;
    } catch (e) {
      if (kDebugMode) {
        debugPrint('🔐 OAuthService: Google Sign-In Error: $e');
        debugPrint('🔐 OAuthService: Error type: ${e.runtimeType}');
        debugPrint('🔐 OAuthService: Error stack trace: ${StackTrace.current}');
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

      final webAuthenticationOptions = WebAuthenticationOptions(
        clientId: dotenv.env['SUPABASE_AUTH_EXTERNAL_APPLE_CLIENT_ID']!,
        redirectUri: Uri.parse(dotenv.env['APPLE_REDIRECT_URI']!),
      );

      if (kDebugMode) {
        debugPrint('🔐 OAuthService: Apple Sign-In available, requesting credentials');
        debugPrint('🔐 Sending to Apple -> clientId: ${webAuthenticationOptions.clientId}');
        debugPrint('🔐 Sending to Apple -> redirectUri: ${webAuthenticationOptions.redirectUri}');
      }

      // Trigger Apple Sign-In flow
      final credential = await SignInWithApple.getAppleIDCredential(
        scopes: [
          AppleIDAuthorizationScopes.email,
          AppleIDAuthorizationScopes.fullName,
        ],
        webAuthenticationOptions: Platform.isAndroid ? webAuthenticationOptions : null,
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