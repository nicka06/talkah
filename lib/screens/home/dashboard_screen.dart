import 'package:app_for_talking/screens/activity/activity_history_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../blocs/auth/auth_bloc.dart';
import '../../blocs/auth/auth_event.dart';
import '../../blocs/auth/auth_state.dart';
import '../../services/api_service.dart';
import '../../widgets/usage_limit_modal.dart';
import '../account/account_info_screen.dart';
import '../subscription/subscription_screen.dart';
import '../phone/phone_number_screen.dart';
import '../email/email_screen.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> with TickerProviderStateMixin {
  bool _isDropdownOpen = false;
  late AnimationController _animationController;
  late Animation<double> _fadeAnimation;
  late Animation<Offset> _slideAnimation;

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      duration: const Duration(milliseconds: 200),
      vsync: this,
    );
    _fadeAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _animationController, curve: Curves.easeOut),
    );
    _slideAnimation = Tween<Offset>(begin: const Offset(0, -0.2), end: Offset.zero).animate(
      CurvedAnimation(parent: _animationController, curve: Curves.easeOut),
    );
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  void _toggleDropdown() {
    setState(() {
      _isDropdownOpen = !_isDropdownOpen;
    });
    
    if (_isDropdownOpen) {
      _animationController.forward();
    } else {
      _animationController.reverse();
    }
  }

  void _closeDropdown() {
    if (_isDropdownOpen) {
      setState(() {
        _isDropdownOpen = false;
      });
      _animationController.reverse();
    }
  }

  @override
  Widget build(BuildContext context) {
    final screenSize = MediaQuery.of(context).size;
    final screenWidth = screenSize.width;
    final screenHeight = screenSize.height;
    
    return Scaffold(
      backgroundColor: Colors.red, // Red background like auth screens
      body: GestureDetector(
        onTap: _closeDropdown,
        child: Stack(
          children: [
            SafeArea(
              child: Padding(
                padding: EdgeInsets.symmetric(
                  horizontal: screenWidth * 0.08,
                  vertical: screenHeight * 0.03,
                ),
                child: Column(
                  children: [
                    // Top bar with profile menu
                    _buildTopBar(context),
                    
                    // Main content area
                    Expanded(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          // Talkah title at the top
                          Text(
                            'TALKAH',
                            style: TextStyle(
                              fontSize: (screenWidth * 0.12).clamp(32.0, 60.0),
                              fontWeight: FontWeight.w900,
                              color: Colors.black,
                              letterSpacing: screenWidth * 0.01,
                              shadows: [
                                Shadow(
                                  offset: Offset(3, 3),
                                  blurRadius: 0,
                                  color: Colors.white.withOpacity(0.3),
                                ),
                                Shadow(
                                  offset: Offset(-1, -1),
                                  blurRadius: 0,
                                  color: Colors.black.withOpacity(0.5),
                                ),
                              ],
                              fontFamily: 'Arial Black',
                            ),
                          ),
                          
                          SizedBox(height: screenHeight * 0.06),
                          
                          // Talkah logo in the middle
                          Container(
                            width: 140, // Increased from 120
                            height: 140, // Increased from 120
                            decoration: BoxDecoration(
                              color: Colors.white,
                              shape: BoxShape.circle,
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withOpacity(0.2),
                                  blurRadius: 20,
                                  offset: const Offset(0, 8),
                                ),
                              ],
                            ),
                            child: ClipOval(
                              child: Padding(
                                padding: const EdgeInsets.all(20.0),
                                child: Image.asset(
                                  'assets/icons/talkah_logo.png',
                                  fit: BoxFit.contain,
                                ),
                              ),
                            ),
                          ),
                          
                          SizedBox(height: screenHeight * 0.08),
                          
                          // Phone button
                          _buildActionButton(
                            context: context,
                            icon: Icons.phone,
                            label: 'PHONE',
                            onTap: () => _handlePhoneCall(context),
                            screenSize: screenSize,
                          ),
                          
                          SizedBox(height: screenHeight * 0.04), // Increased from 0.02 for more spacing
                          
                          // Email button
                          _buildActionButton(
                            context: context,
                            icon: Icons.email,
                            label: 'EMAIL',
                            onTap: () => _handleEmail(context),
                            screenSize: screenSize,
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
            
            // Custom Dropdown Overlay
            if (_isDropdownOpen)
              Positioned.fill(
                child: Container(
                  color: Colors.black.withOpacity(0.3),
                  child: GestureDetector(
                    onTap: _closeDropdown,
                    child: Container(),
                  ),
                ),
              ),
            
            // Custom Dropdown Menu
            if (_isDropdownOpen)
              Positioned(
                top: 90,
                right: 30,
                child: FadeTransition(
                  opacity: _fadeAnimation,
                  child: SlideTransition(
                    position: _slideAnimation,
                    child: _buildCustomDropdown(context),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildTopBar(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        // Empty space for balance
        const SizedBox(width: 48),
        
        // Center space
        const Spacer(),
        
        // Profile dropdown
        BlocBuilder<AuthBloc, AuthState>(
          builder: (context, state) {
            if (state is AuthAuthenticated) {
              return _buildProfileButton(context, state.user);
            }
            return const SizedBox(width: 48);
          },
        ),
      ],
    );
  }

  Widget _buildProfileButton(BuildContext context, user) {
    return GestureDetector(
      onTap: _toggleDropdown,
      child: Container(
        width: 48,
        height: 48,
        decoration: BoxDecoration(
          color: _isDropdownOpen ? Colors.white : Colors.black,
          shape: BoxShape.circle,
          border: Border.all(
            color: Colors.white.withOpacity(0.3),
            width: 2,
          ),
          boxShadow: _isDropdownOpen ? [
            BoxShadow(
              color: Colors.black.withOpacity(0.3),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ] : null,
        ),
        child: Icon(
          Icons.person,
          color: _isDropdownOpen ? Colors.black : Colors.white,
          size: 24,
        ),
      ),
    );
  }

  Widget _buildCustomDropdown(BuildContext context) {
    return BlocBuilder<AuthBloc, AuthState>(
      builder: (context, state) {
        if (state is! AuthAuthenticated) return const SizedBox();
        
        final user = state.user;
        
        return Container(
          width: 280,
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.2),
                blurRadius: 20,
                offset: const Offset(0, 8),
              ),
            ],
          ),
          child: Padding(
            padding: const EdgeInsets.all(8),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                _buildCustomMenuItem(
                  icon: Icons.account_circle_outlined,
                  title: 'Account Info',
                  subtitle: 'Manage your account',
                  onTap: () {
                    _closeDropdown();
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (context) => const AccountInfoScreen(),
                      ),
                    );
                  },
                ),
                
                _buildCustomMenuItem(
                  icon: Icons.history,
                  title: 'History',
                  subtitle: 'View all activity',
                  onTap: () {
                    _closeDropdown();
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (context) => const ActivityHistoryScreen(),
                      ),
                    );
                  },
                ),
                
                _buildCustomMenuItem(
                  icon: Icons.card_membership_outlined,
                  title: 'Subscription',
                  subtitle: '${user.subscriptionTier.toUpperCase()} Plan',
                  onTap: () {
                    _closeDropdown();
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (context) => const SubscriptionScreen(),
                      ),
                    );
                  },
                ),
                
                const Divider(height: 1),
                
                _buildCustomMenuItem(
                  icon: Icons.logout,
                  title: 'Sign Out',
                  subtitle: 'Log out of your account',
                  isDestructive: true,
                  onTap: () {
                    _closeDropdown();
                    context.read<AuthBloc>().add(AuthLogoutRequested());
                  },
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildCustomMenuItem({
    required IconData icon,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
    bool isDestructive = false,
  }) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          width: double.infinity,
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
          ),
          child: Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: isDestructive ? Colors.red.withOpacity(0.1) : Colors.grey.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  icon,
                  color: isDestructive ? Colors.red[600] : Colors.grey[700],
                  size: 22,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: TextStyle(
                        fontWeight: FontWeight.w600,
                        color: isDestructive ? Colors.red[600] : Colors.black,
                        fontSize: 16,
                      ),
                    ),
                    Text(
                      subtitle,
                      style: TextStyle(
                        fontSize: 13,
                        color: Colors.grey[600],
                      ),
                    ),
                  ],
                ),
              ),
              Icon(
                Icons.arrow_forward_ios,
                size: 16,
                color: Colors.grey[400],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildActionButton({
    required BuildContext context,
    required IconData icon,
    required String label,
    required VoidCallback onTap,
    required Size screenSize,
  }) {
    final screenWidth = screenSize.width;
    final screenHeight = screenSize.height;
    
    return SizedBox(
      width: double.infinity,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(20),
          child: Container(
            padding: EdgeInsets.symmetric(
              horizontal: screenWidth * 0.06,
              vertical: screenHeight * 0.02,
            ),
            decoration: BoxDecoration(
              color: Colors.black,
              borderRadius: BorderRadius.circular(20),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.3),
                  blurRadius: 10,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  icon,
                  color: Colors.white,
                  size: screenWidth * 0.06,
                ),
                SizedBox(width: screenWidth * 0.03),
                Text(
                  label,
                  style: TextStyle(
                    fontSize: (screenWidth * 0.045).clamp(16.0, 22.0),
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                    letterSpacing: screenWidth * 0.002,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  // Handle phone call action
  void _handlePhoneCall(BuildContext context) async {
    try {
      // Check if user can make a call before proceeding
      final canMakeCall = await ApiService.canMakePhoneCall();
      if (!canMakeCall) {
        // Show upgrade modal directly if at limit
        UsageLimitModal.show(
          context: context,
          actionType: 'phone_call',
          message: 'You have reached your phone call limit for this billing period. Please upgrade your plan to make more calls.',
        );
        return;
      }
      
      // Navigate to phone number screen
      Navigator.of(context).push(
        MaterialPageRoute(
          builder: (context) => const PhoneNumberScreen(),
        ),
      );
    } catch (e) {
      if (e is UsageLimitException) {
        UsageLimitModal.show(
          context: context,
          actionType: e.actionType,
          message: e.message,
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    }
  }

  // Handle email action
  void _handleEmail(BuildContext context) async {
    try {
      // Check if user can send an email before proceeding
      final canSendEmail = await ApiService.canSendEmail();
      if (!canSendEmail) {
        // Show upgrade modal directly if at limit
        UsageLimitModal.show(
          context: context,
          actionType: 'email',
          message: 'You have reached your email limit for this billing period. Please upgrade your plan to send more emails.',
        );
        return;
      }
      
      // Navigate to email screen
      Navigator.of(context).push(
        MaterialPageRoute(
          builder: (context) => const EmailScreen(),
        ),
      );
    } catch (e) {
      if (e is UsageLimitException) {
        UsageLimitModal.show(
          context: context,
          actionType: e.actionType,
          message: e.message,
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    }
  }
} 