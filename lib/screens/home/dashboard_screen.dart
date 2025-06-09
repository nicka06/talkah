import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../blocs/auth/auth_bloc.dart';
import '../../blocs/auth/auth_event.dart';
import '../../blocs/auth/auth_state.dart';
import '../../services/api_service.dart';
import '../../widgets/usage_limit_modal.dart';
import '../account/account_info_screen.dart';
import '../subscription/subscription_screen.dart';
import '../phone/call_history_screen.dart';
import '../phone/phone_number_screen.dart';
import '../email/email_screen.dart';

class DashboardScreen extends StatelessWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).colorScheme.surface,
      body: SafeArea(
        child: Column(
          children: [
            // Top bar with logo and profile
            _buildTopBar(context),
            
            // Main content area
            Expanded(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 32.0),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    // App logo (telephone icon)
                    Container(
                      width: 120,
                      height: 120,
                      decoration: BoxDecoration(
                        color: Theme.of(context).colorScheme.primary,
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(
                            color: Theme.of(context).colorScheme.primary.withOpacity(0.3),
                            blurRadius: 20,
                            offset: const Offset(0, 8),
                          ),
                        ],
                      ),
                      child: Icon(
                        Icons.phone,
                        size: 60,
                        color: Theme.of(context).colorScheme.onPrimary,
                      ),
                    ),
                    
                    const SizedBox(height: 48),
                    
                    // App title
                    Text(
                      'AI Communication',
                      style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                        color: Theme.of(context).colorScheme.onSurface,
                      ),
                    ),
                    
                    const SizedBox(height: 8),
                    
                    Text(
                      'Choose your communication method',
                      style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                    ),
                    
                    const SizedBox(height: 64),
                    
                    // Three main action buttons
                    _buildActionButton(
                      context: context,
                      icon: Icons.phone_outlined,
                      label: 'Phone',
                      color: Theme.of(context).colorScheme.primary,
                      onTap: () => _handlePhoneCall(context),
                    ),
                    
                    const SizedBox(height: 12),
                    
                    _buildActionButton(
                      context: context,
                      icon: Icons.email_outlined,
                      label: 'Email',
                      color: Theme.of(context).colorScheme.tertiary,
                      onTap: () => _handleEmail(context),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTopBar(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          // Empty space for balance
          const SizedBox(width: 48),
          
          // Center space (could add notifications or other icons here)
          const Spacer(),
          
          // Profile dropdown
          BlocBuilder<AuthBloc, AuthState>(
            builder: (context, state) {
              if (state is AuthAuthenticated) {
                return _buildProfileMenu(context, state.user);
              }
              return const SizedBox(width: 48);
            },
          ),
        ],
      ),
    );
  }

  Widget _buildProfileMenu(BuildContext context, user) {
    return PopupMenuButton<String>(
      offset: const Offset(0, 50),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
      ),
      child: Container(
        width: 48,
        height: 48,
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.primaryContainer,
          shape: BoxShape.circle,
          border: Border.all(
            color: Theme.of(context).colorScheme.outline.withOpacity(0.2),
            width: 1,
          ),
        ),
        child: Icon(
          Icons.person,
          color: Theme.of(context).colorScheme.onPrimaryContainer,
          size: 24,
        ),
      ),
      itemBuilder: (BuildContext context) => [
        PopupMenuItem<String>(
          value: 'account',
          child: Row(
            children: [
              Icon(
                Icons.account_circle_outlined,
                color: Theme.of(context).colorScheme.onSurface,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Account Info',
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    Text(
                      user.email,
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        PopupMenuItem<String>(
          value: 'call_history',
          child: Row(
            children: [
              Icon(
                Icons.history,
                color: Theme.of(context).colorScheme.onSurface,
              ),
              const SizedBox(width: 12),
              Text(
                'Call History',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
        PopupMenuItem<String>(
          value: 'subscription',
          child: Row(
            children: [
              Icon(
                Icons.card_membership_outlined,
                color: Theme.of(context).colorScheme.onSurface,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Subscription',
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    Text(
                      '${user.subscriptionTier.toUpperCase()} Plan',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        const PopupMenuDivider(),
        PopupMenuItem<String>(
          value: 'signout',
          child: Row(
            children: [
              Icon(
                Icons.logout,
                color: Theme.of(context).colorScheme.error,
              ),
              const SizedBox(width: 12),
              Text(
                'Sign Out',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Theme.of(context).colorScheme.error,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
      ],
      onSelected: (String value) {
        switch (value) {
          case 'account':
            Navigator.of(context).push(
              MaterialPageRoute(
                builder: (context) => const AccountInfoScreen(),
              ),
            );
            break;
          case 'call_history':
            Navigator.of(context).push(
              MaterialPageRoute(
                builder: (context) => const CallHistoryScreen(),
              ),
            );
            break;
          case 'subscription':
            Navigator.of(context).push(
              MaterialPageRoute(
                builder: (context) => const SubscriptionScreen(),
              ),
            );
            break;
          case 'signout':
            context.read<AuthBloc>().add(AuthLogoutRequested());
            break;
        }
      },
    );
  }

  Widget _buildActionButton({
    required BuildContext context,
    required IconData icon,
    required String label,
    required Color color,
    required VoidCallback onTap,
  }) {
    return SizedBox(
      width: double.infinity,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(12),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: color.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: color.withOpacity(0.2),
                width: 1,
              ),
            ),
            child: Row(
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: color,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(
                    icon,
                    color: Colors.white,
                    size: 20,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        label,
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                          color: color,
                        ),
                      ),
                    ],
                  ),
                ),
                Icon(
                  Icons.arrow_forward_ios,
                  color: color.withOpacity(0.7),
                  size: 14,
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