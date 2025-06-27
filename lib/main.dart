import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter/foundation.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'config/supabase_config.dart';
import 'services/subscription_service.dart';
import 'blocs/auth/auth_bloc.dart';
import 'blocs/auth/auth_event.dart';
import 'blocs/auth/auth_state.dart';
import 'blocs/usage/usage_bloc.dart';
import 'blocs/subscription/subscription_bloc.dart';
import 'screens/auth/splash_screen.dart';
import 'screens/auth/login_screen.dart';
import 'screens/home/dashboard_screen.dart';
import 'screens/auth/reset_password_screen.dart';
import 'screens/auth/forgot_password_screen.dart';
import 'screens/subscription/subscription_screen.dart';
import 'screens/subscription/payment_screen.dart';
import 'screens/account/account_info_screen.dart';
import 'screens/activity/activity_history_screen.dart';
import 'screens/phone/phone_number_screen.dart';
import 'screens/sms/sms_screen.dart';
import 'screens/email/email_screen.dart';

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
  
  // Load environment variables
  await dotenv.load(fileName: ".env");
  
  // Lock orientation to portrait mode only
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
  ]);
  
  // Set up bloc observer for debugging
  if (kDebugMode) {
    Bloc.observer = DebugBlocObserver();
  }
  
  // Initialize Supabase
  await SupabaseConfig.initialize();
  
  // Initialize Stripe using the new service
  await SubscriptionService.initStripe();
  
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
        BlocProvider<SubscriptionBloc>(
          create: (context) => SubscriptionBloc(),
        ),
      ],
      child: BlocListener<AuthBloc, AuthState>(
        listener: (context, state) {
          if (state is AuthPasswordRecovery) {
            navigatorKey.currentState?.push(
              MaterialPageRoute(builder: (_) => const ResetPasswordScreen()),
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
          
          // Add route definitions to fix navigation
          routes: {
            '/': (context) => BlocBuilder<AuthBloc, AuthState>(
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
            '/login': (context) => const LoginScreen(),
            '/dashboard': (context) => const DashboardScreen(),
            '/splash': (context) => const SplashScreen(),
            '/reset-password': (context) => const ResetPasswordScreen(),
            '/forgot-password': (context) => const ForgotPasswordScreen(),
            '/subscription': (context) => const SubscriptionScreen(),
            '/payment': (context) => const PaymentScreen(planType: 'free', isYearly: false),
            '/account': (context) => const AccountInfoScreen(),
            '/activity': (context) => const ActivityHistoryScreen(),
            '/phone': (context) => const PhoneNumberScreen(),
            '/sms': (context) => const SmsScreen(),
            '/email': (context) => const EmailScreen(),
          },
          
          // Add error handling for unknown routes
          onUnknownRoute: (settings) {
            debugPrint('🚨 Unknown route: ${settings.name}');
            return MaterialPageRoute(
              builder: (context) => const LoginScreen(),
            );
          },
        ),
      ),
    );
  }
}