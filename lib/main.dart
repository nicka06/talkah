import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:google_fonts/google_fonts.dart';
import 'config/supabase_config.dart';
import 'blocs/auth/auth_bloc.dart';
import 'blocs/auth/auth_event.dart';
import 'blocs/auth/auth_state.dart';
import 'blocs/usage/usage_bloc.dart';
import 'screens/auth/splash_screen.dart';
import 'screens/auth/login_screen.dart';
import 'screens/home/dashboard_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Initialize Supabase
  await SupabaseConfig.initialize();
  
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
      child: MaterialApp(
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
            if (state is AuthInitial || state is AuthLoading) {
              return const SplashScreen();
            } else if (state is AuthAuthenticated) {
              return const DashboardScreen();
            } else {
              return const LoginScreen();
            }
          },
        ),
      ),
    );
  }
}
