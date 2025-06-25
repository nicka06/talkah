import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../blocs/auth/auth_bloc.dart';
import '../../blocs/auth/auth_event.dart';
import '../../blocs/auth/auth_state.dart';
import '../../widgets/error_display_widget.dart';
import 'forgot_password_screen.dart'; // Import the new screen

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _showLogin = false; // Start with sign up view
  bool _showEmailLoginForm = false; // Track if showing email login form
  bool _showEmailSignUpForm = false; // Track if showing email signup form

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final screenSize = MediaQuery.of(context).size;
    final screenWidth = screenSize.width;
    final screenHeight = screenSize.height;
    
    // Responsive scaling based on screen width
    final double fontScale = screenWidth / 375; // Base width of iPhone 12
    final double sizeScale = (screenWidth + screenHeight) / 1200; // Combined scaling
    
    return Scaffold(
      backgroundColor: Colors.red, // Full red background
      body: SingleChildScrollView(
        child: BlocListener<AuthBloc, AuthState>(
          listenWhen: (previous, current) {
            if (kDebugMode) {
              debugPrint('🎭 LOGIN BlocListener.listenWhen: ${previous.runtimeType} -> ${current.runtimeType}');
            }
            return true;
          },
          listener: (context, state) {
            if (kDebugMode) {
              debugPrint('🎪 LOGIN BlocListener triggered: ${state.runtimeType}');
            }
            
            if (state is AuthError) {
              ErrorDisplayWidget.showNotification(context, state.error);
            }
          },
          child: Container(
            height: screenHeight,
            child: SafeArea(
              child: Padding(
                padding: EdgeInsets.symmetric(
                  horizontal: screenWidth * 0.08, // 8% of screen width
                  vertical: screenHeight * 0.03,  // 3% of screen height
                ),
                child: Column(
                  children: [
                    // Top Section - Talkah Branding
                    Expanded(
                      flex: 2,
                      child: Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            // Graffiti-style Talkah Text - Responsive
                            Text(
                              'TALKAH',
                              style: TextStyle(
                                fontSize: (screenWidth * 0.17).clamp(32.0, 90.0), // Reduced from 18% to 12%, max 60
                                fontWeight: FontWeight.w900,
                                color: Colors.black,
                                letterSpacing: screenWidth * 0.01, // 1% of width
                                shadows: [
                                  Shadow(
                                    offset: Offset(sizeScale * 3, sizeScale * 3),
                                    blurRadius: 0,
                                    color: Colors.white.withOpacity(0.3),
                                  ),
                                  Shadow(
                                    offset: Offset(-sizeScale, -sizeScale),
                                    blurRadius: 0,
                                    color: Colors.black.withOpacity(0.5),
                                  ),
                                ],
                                // Using built-in fonts for now, can replace with graffiti font later
                                fontFamily: 'Arial Black',
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    
                    // Middle Section - Auth Buttons
                    Expanded(
                      flex: 3,
                      child: !_showLogin ? _buildSignUpSection(screenSize, fontScale) : _buildLoginSection(screenSize, fontScale),
                    ),
                    
                    // Bottom Section - Switch between sign up and login
                    _buildBottomToggle(screenSize, fontScale),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSignUpSection(Size screenSize, double fontScale) {
    final screenWidth = screenSize.width;
    final screenHeight = screenSize.height;
    
    if (!_showEmailSignUpForm) {
      // Show signup button options
      return Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            'SIGN UP WITH',
            style: TextStyle(
              fontSize: (screenWidth * 0.045).clamp(14.0, 20.0), // 4.5% of width
              fontWeight: FontWeight.bold,
              color: Colors.black,
              letterSpacing: screenWidth * 0.004, // 0.4% of width
            ),
          ),
          SizedBox(height: screenHeight * 0.04), // 4% of height
          
          // Email Sign Up Button
          _buildAuthButton(
            icon: Icons.email,
            text: 'EMAIL',
            onPressed: () => setState(() => _showEmailSignUpForm = true),
            backgroundColor: Colors.white,
            textColor: Colors.black,
            screenSize: screenSize,
            fontScale: fontScale,
          ),
          
          SizedBox(height: screenHeight * 0.02), // 2% of height
          
          // Google Sign Up Button
          _buildAuthButton(
            icon: Icons.g_mobiledata,
            text: 'GOOGLE',
            onPressed: () => _signUpWithGoogle(),
            backgroundColor: Colors.black,
            textColor: Colors.white,
            screenSize: screenSize,
            fontScale: fontScale,
          ),
          
          SizedBox(height: screenHeight * 0.02), // 2% of height
          
          // Apple Sign Up Button
          _buildAuthButton(
            icon: Icons.apple,
            text: 'APPLE',
            onPressed: () => _signUpWithApple(),
            backgroundColor: Colors.black,
            textColor: Colors.white,
            screenSize: screenSize,
            fontScale: fontScale,
          ),
        ],
      );
    } else {
      // Show email signup form
      return SingleChildScrollView(
        child: Form(
          key: _formKey,
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                'SIGN UP',
                style: TextStyle(
                  fontSize: (screenWidth * 0.06).clamp(18.0, 26.0), // 6% of width
                  fontWeight: FontWeight.bold,
                  color: Colors.black,
                  letterSpacing: screenWidth * 0.005, // 0.5% of width
                ),
              ),
              SizedBox(height: screenHeight * 0.04), // 4% of height
              
              // Email Field
              TextFormField(
                controller: _emailController,
                keyboardType: TextInputType.emailAddress,
                style: TextStyle(
                  color: Colors.black,
                  fontSize: (screenWidth * 0.04).clamp(14.0, 18.0),
                ),
                decoration: InputDecoration(
                  labelText: 'Email',
                  labelStyle: TextStyle(
                    color: Colors.black87,
                    fontSize: (screenWidth * 0.035).clamp(12.0, 16.0),
                  ),
                  prefixIcon: Icon(
                    Icons.email, 
                    color: Colors.black87,
                    size: (screenWidth * 0.055).clamp(20.0, 24.0),
                  ),
                  filled: true,
                  fillColor: Colors.white.withOpacity(0.9),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(screenWidth * 0.03),
                    borderSide: BorderSide(color: Colors.black, width: fontScale * 2),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(screenWidth * 0.03),
                    borderSide: BorderSide(color: Colors.black, width: fontScale * 2),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(screenWidth * 0.03),
                    borderSide: BorderSide(color: Colors.black, width: fontScale * 3),
                  ),
                ),
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Please enter your email';
                  }
                  if (!value.contains('@')) {
                    return 'Please enter a valid email';
                  }
                  return null;
                },
              ),
              
              SizedBox(height: screenHeight * 0.02), // 2% of height
              
              // Password Field
              TextFormField(
                controller: _passwordController,
                obscureText: true,
                style: TextStyle(
                  color: Colors.black,
                  fontSize: (screenWidth * 0.04).clamp(14.0, 18.0),
                ),
                decoration: InputDecoration(
                  labelText: 'Password',
                  labelStyle: TextStyle(
                    color: Colors.black87,
                    fontSize: (screenWidth * 0.035).clamp(12.0, 16.0),
                  ),
                  prefixIcon: Icon(
                    Icons.lock, 
                    color: Colors.black87,
                    size: (screenWidth * 0.055).clamp(20.0, 24.0),
                  ),
                  filled: true,
                  fillColor: Colors.white.withOpacity(0.9),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(screenWidth * 0.03),
                    borderSide: BorderSide(color: Colors.black, width: fontScale * 2),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(screenWidth * 0.03),
                    borderSide: BorderSide(color: Colors.black, width: fontScale * 2),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(screenWidth * 0.03),
                    borderSide: BorderSide(color: Colors.black, width: fontScale * 3),
                  ),
                ),
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Please enter your password';
                  }
                  if (value.length < 6) {
                    return 'Password must be at least 6 characters';
                  }
                  return null;
                },
              ),
              
              // Forgot Password Button
              Align(
                alignment: Alignment.centerRight,
                child: TextButton(
                  onPressed: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(builder: (_) => const ForgotPasswordScreen()),
                    );
                  },
                  child: Text(
                    'Forgot Password?',
                    style: TextStyle(
                      color: Colors.black,
                      fontWeight: FontWeight.bold,
                      fontSize: (screenWidth * 0.035).clamp(12.0, 15.0),
                    ),
                  ),
                ),
              ),
              
              SizedBox(height: screenHeight * 0.03), // 3% of height
              
              // Sign Up Button
              BlocBuilder<AuthBloc, AuthState>(
                builder: (context, state) {
                  final isLoading = state is AuthLoading;
                  return _buildAuthButton(
                    icon: Icons.person_add,
                    text: isLoading ? 'SIGNING UP...' : 'SIGN UP',
                    onPressed: isLoading ? null : _onSignUp,
                    backgroundColor: Colors.black,
                    textColor: Colors.white,
                    screenSize: screenSize,
                    fontScale: fontScale,
                  );
                },
              ),
            ],
          ),
        ),
      );
    }
  }

  Widget _buildLoginSection(Size screenSize, double fontScale) {
    final screenWidth = screenSize.width;
    final screenHeight = screenSize.height;
    
    if (!_showEmailLoginForm) {
      // Show login button options
      return Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            'LOG IN WITH',
            style: TextStyle(
              fontSize: (screenWidth * 0.045).clamp(14.0, 20.0), // 4.5% of width
              fontWeight: FontWeight.bold,
              color: Colors.black,
              letterSpacing: screenWidth * 0.004, // 0.4% of width
            ),
          ),
          SizedBox(height: screenHeight * 0.04), // 4% of height
          
          // Email Login Button
          _buildAuthButton(
            icon: Icons.email,
            text: 'EMAIL',
            onPressed: () => setState(() => _showEmailLoginForm = true),
            backgroundColor: Colors.white,
            textColor: Colors.black,
            screenSize: screenSize,
            fontScale: fontScale,
          ),
          
          SizedBox(height: screenHeight * 0.02), // 2% of height
          
          // Google Login Button
          _buildAuthButton(
            icon: Icons.g_mobiledata,
            text: 'GOOGLE',
            onPressed: () => _loginWithGoogle(),
            backgroundColor: Colors.black,
            textColor: Colors.white,
            screenSize: screenSize,
            fontScale: fontScale,
          ),
          
          SizedBox(height: screenHeight * 0.02), // 2% of height
          
          // Apple Login Button
          _buildAuthButton(
            icon: Icons.apple,
            text: 'APPLE',
            onPressed: () => _loginWithApple(),
            backgroundColor: Colors.black,
            textColor: Colors.white,
            screenSize: screenSize,
            fontScale: fontScale,
          ),
        ],
      );
    } else {
      // Show email login form
      return SingleChildScrollView(
        child: Form(
          key: _formKey,
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                'LOG IN',
                style: TextStyle(
                  fontSize: (screenWidth * 0.06).clamp(18.0, 26.0), // 6% of width
                  fontWeight: FontWeight.bold,
                  color: Colors.black,
                  letterSpacing: screenWidth * 0.005, // 0.5% of width
                ),
              ),
              SizedBox(height: screenHeight * 0.04), // 4% of height
              
              // Email Field
              TextFormField(
                controller: _emailController,
                keyboardType: TextInputType.emailAddress,
                style: TextStyle(
                  color: Colors.black,
                  fontSize: (screenWidth * 0.04).clamp(14.0, 18.0),
                ),
                decoration: InputDecoration(
                  labelText: 'Email',
                  labelStyle: TextStyle(
                    color: Colors.black87,
                    fontSize: (screenWidth * 0.035).clamp(12.0, 16.0),
                  ),
                  prefixIcon: Icon(
                    Icons.email, 
                    color: Colors.black87,
                    size: (screenWidth * 0.055).clamp(20.0, 24.0),
                  ),
                  filled: true,
                  fillColor: Colors.white.withOpacity(0.9),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(screenWidth * 0.03),
                    borderSide: BorderSide(color: Colors.black, width: fontScale * 2),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(screenWidth * 0.03),
                    borderSide: BorderSide(color: Colors.black, width: fontScale * 2),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(screenWidth * 0.03),
                    borderSide: BorderSide(color: Colors.black, width: fontScale * 3),
                  ),
                ),
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Please enter your email';
                  }
                  if (!value.contains('@')) {
                    return 'Please enter a valid email';
                  }
                  return null;
                },
              ),
              
              SizedBox(height: screenHeight * 0.02), // 2% of height
              
              // Password Field
              TextFormField(
                controller: _passwordController,
                obscureText: true,
                style: TextStyle(
                  color: Colors.black,
                  fontSize: (screenWidth * 0.04).clamp(14.0, 18.0),
                ),
                decoration: InputDecoration(
                  labelText: 'Password',
                  labelStyle: TextStyle(
                    color: Colors.black87,
                    fontSize: (screenWidth * 0.035).clamp(12.0, 16.0),
                  ),
                  prefixIcon: Icon(
                    Icons.lock, 
                    color: Colors.black87,
                    size: (screenWidth * 0.055).clamp(20.0, 24.0),
                  ),
                  filled: true,
                  fillColor: Colors.white.withOpacity(0.9),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(screenWidth * 0.03),
                    borderSide: BorderSide(color: Colors.black, width: fontScale * 2),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(screenWidth * 0.03),
                    borderSide: BorderSide(color: Colors.black, width: fontScale * 2),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(screenWidth * 0.03),
                    borderSide: BorderSide(color: Colors.black, width: fontScale * 3),
                  ),
                ),
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Please enter your password';
                  }
                  if (value.length < 6) {
                    return 'Password must be at least 6 characters';
                  }
                  return null;
                },
              ),
              
              // Forgot Password Button
              Align(
                alignment: Alignment.centerRight,
                child: TextButton(
                  onPressed: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(builder: (_) => const ForgotPasswordScreen()),
                    );
                  },
                  child: Text(
                    'Forgot Password?',
                    style: TextStyle(
                      color: Colors.black,
                      fontWeight: FontWeight.bold,
                      fontSize: (screenWidth * 0.035).clamp(12.0, 15.0),
                    ),
                  ),
                ),
              ),
              
              SizedBox(height: screenHeight * 0.03), // 3% of height
              
              // Login Button
              BlocBuilder<AuthBloc, AuthState>(
                builder: (context, state) {
                  final isLoading = state is AuthLoading;
                  return _buildAuthButton(
                    icon: Icons.login,
                    text: isLoading ? 'LOGGING IN...' : 'LOG IN',
                    onPressed: isLoading ? null : _onLogin,
                    backgroundColor: Colors.black,
                    textColor: Colors.white,
                    screenSize: screenSize,
                    fontScale: fontScale,
                  );
                },
              ),
            ],
          ),
        ),
      );
    }
  }

  Widget _buildAuthButton({
    required IconData icon,
    required String text,
    required VoidCallback? onPressed,
    required Color backgroundColor,
    required Color textColor,
    required Size screenSize,
    required double fontScale,
  }) {
    final screenWidth = screenSize.width;
    final screenHeight = screenSize.height;
    
    return SizedBox(
      width: double.infinity,
      height: (screenHeight * 0.07).clamp(48.0, 60.0), // 7% of height, min 48, max 60
      child: ElevatedButton(
        onPressed: onPressed,
        style: ElevatedButton.styleFrom(
          backgroundColor: backgroundColor,
          foregroundColor: textColor,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(screenWidth * 0.03),
            side: BorderSide(color: Colors.black, width: fontScale * 2),
          ),
          elevation: 4,
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: (screenWidth * 0.06).clamp(20.0, 26.0)),
            SizedBox(width: screenWidth * 0.03),
            Text(
              text,
              style: TextStyle(
                fontSize: (screenWidth * 0.04).clamp(14.0, 18.0),
                fontWeight: FontWeight.bold,
                letterSpacing: screenWidth * 0.002,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBottomToggle(Size screenSize, double fontScale) {
    final screenWidth = screenSize.width;
    final screenHeight = screenSize.height;
    
    // Check if we're in any email form view
    if (_showEmailSignUpForm || _showEmailLoginForm) {
      // In any email form - show back to options
      return Padding(
        padding: EdgeInsets.only(bottom: screenHeight * 0.02),
        child: GestureDetector(
          onTap: () => setState(() {
            _showEmailSignUpForm = false;
            _showEmailLoginForm = false;
          }),
          child: Container(
            padding: EdgeInsets.symmetric(
              vertical: screenHeight * 0.015,
              horizontal: screenWidth * 0.06,
            ),
            decoration: BoxDecoration(
              color: Colors.black.withOpacity(0.1),
              borderRadius: BorderRadius.circular(screenWidth * 0.06),
              border: Border.all(color: Colors.black, width: fontScale),
            ),
            child: Text(
              '← BACK TO OPTIONS',
              style: TextStyle(
                fontSize: (screenWidth * 0.032).clamp(10.0, 14.0),
                fontWeight: FontWeight.bold,
                color: Colors.black,
                letterSpacing: screenWidth * 0.001,
              ),
            ),
          ),
        ),
      );
    }
    
    // Default view - show signup/login toggle
    return Padding(
      padding: EdgeInsets.only(bottom: screenHeight * 0.02), // 2% of height
      child: GestureDetector(
        onTap: () {
          setState(() {
            _showLogin = !_showLogin;
            _showEmailLoginForm = false; // Reset email login form state
            _showEmailSignUpForm = false; // Reset email signup form state
            // Clear form when switching
            _emailController.clear();
            _passwordController.clear();
          });
        },
        child: Container(
          padding: EdgeInsets.symmetric(
            vertical: screenHeight * 0.015, // 1.5% of height
            horizontal: screenWidth * 0.06,  // 6% of width
          ),
          decoration: BoxDecoration(
            color: Colors.black.withOpacity(0.1),
            borderRadius: BorderRadius.circular(screenWidth * 0.06),
            border: Border.all(color: Colors.black, width: fontScale),
          ),
          child: Text(
            _showLogin 
              ? '← BACK TO SIGN UP' 
              : 'ALREADY HAVE AN ACCOUNT? LOG IN →',
            style: TextStyle(
              fontSize: (screenWidth * 0.032).clamp(10.0, 14.0), // Much smaller - 3.2% of width
              fontWeight: FontWeight.bold,
              color: Colors.black,
              letterSpacing: screenWidth * 0.001,
            ),
          ),
        ),
      ),
    );
  }

  void _signUpWithGoogle() {
    context.read<AuthBloc>().add(AuthGoogleSignInRequested());
  }

  void _signUpWithApple() {
    context.read<AuthBloc>().add(AuthAppleSignInRequested());
  }

  void _onSignUp() {
    if (_formKey.currentState!.validate()) {
      final email = _emailController.text.trim();
      final password = _passwordController.text.trim();

      context.read<AuthBloc>().add(
        AuthSignupRequested(email: email, password: password),
      );
    }
  }

  void _loginWithGoogle() {
    context.read<AuthBloc>().add(AuthGoogleSignInRequested());
  }

  void _loginWithApple() {
    context.read<AuthBloc>().add(AuthAppleSignInRequested());
  }

  void _onLogin() {
    if (_formKey.currentState!.validate()) {
      final email = _emailController.text.trim();
      final password = _passwordController.text.trim();

      context.read<AuthBloc>().add(
        AuthLoginRequested(email: email, password: password),
      );
    }
  }
} 