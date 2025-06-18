import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter/foundation.dart';
import 'package:google_fonts/google_fonts.dart';
import 'config/supabase_config.dart';
import 'services/stripe_payment_service.dart';
import 'blocs/auth/auth_bloc.dart';
import 'blocs/auth/auth_event.dart';
import 'blocs/auth/auth_state.dart';
import 'blocs/usage/usage_bloc.dart';
import 'screens/auth/splash_screen.dart';
import 'screens/auth/login_screen.dart';
import 'screens/home/dashboard_screen.dart';
import 'screens/auth/reset_password_screen.dart';

final navigatorKey = GlobalKey<NavigatorState>();

// Debug observer to track all bloc state changes
class DebugBlocObserver extends BlocObserver {
  @override
  void onChange(BlocBase bloc, Change change) {
    super.onChange(bloc, change);
    if (kDebugMode) {
      debugPrint('🔀 BLOC CHANGE: ${change.currentState.runtimeType} -> ${change.nextState.runtimeType}');
      if (change.nextState.runtimeType.toString().contains('AuthError')) {
        debugPrint('   ⚠️ AuthError state detected!');
      }
    }
  }
}

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Set up bloc observer for debugging
  if (kDebugMode) {
    Bloc.observer = DebugBlocObserver();
  }
  
  // Initialize Supabase
  await SupabaseConfig.initialize();
  
  // Initialize Stripe
  await StripePaymentService.init();
  
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiBlocProvider(
      providers: [
        BlocProvider<AuthBloc>(
          create: (context) => AuthBloc()..add(AuthCheckRequested()),
        ),
        BlocProvider<UsageBloc>(
          create: (context) => UsageBloc(),
        ),
      ],
      child: BlocListener<AuthBloc, AuthState>(
        listener: (context, state) {
          if (state is AuthPasswordRecovery) {
            navigatorKey.currentState?.push(
              MaterialPageRoute(builder: (_) => ResetPasswordScreen(accessToken: state.accessToken)),
            );
          }
        },
        child: MaterialApp(
          navigatorKey: navigatorKey,
          title: 'AI Communication App',
          theme: ThemeData(
            colorScheme: ColorScheme.fromSeed(
              seedColor: const Color(0xFF6366F1), // Indigo
              brightness: Brightness.light,
            ),
            textTheme: GoogleFonts.interTextTheme(),
            useMaterial3: true,
            appBarTheme: const AppBarTheme(
              centerTitle: true,
              elevation: 0,
            ),
          ),
          debugShowCheckedModeBanner: false,
          home: BlocBuilder<AuthBloc, AuthState>(
            builder: (context, state) {
              if (kDebugMode) {
                debugPrint('🏠 MAIN BlocBuilder: Building for state ${state.runtimeType}');
              }
              
              if (state is AuthInitial) {
                // Only show splash on app startup
                return const SplashScreen();
              } else if (state is AuthAuthenticated) {
                // Only navigate to dashboard when actually authenticated
                return const DashboardScreen();
              } else {
                // Stay on LoginScreen for AuthLoading, AuthError, AuthUnauthenticated
                // This allows the LoginScreen to handle its own loading states and errors
                return const LoginScreen();
              }
            },
          ),
        ),
      ),
    );
  }
}
