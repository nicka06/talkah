import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../blocs/auth/auth_bloc.dart';
import '../../blocs/auth/auth_event.dart';
import '../../blocs/auth/auth_state.dart';

class DashboardScreen extends StatelessWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('AI Communication'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () {
              context.read<AuthBloc>().add(AuthLogoutRequested());
            },
          ),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            BlocBuilder<AuthBloc, AuthState>(
              builder: (context, state) {
                if (state is AuthAuthenticated) {
                  return Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Welcome back!',
                            style: Theme.of(context).textTheme.headlineSmall,
                          ),
                          const SizedBox(height: 8),
                          Text(
                            state.user.email,
                            style: Theme.of(context).textTheme.bodyLarge,
                          ),
                          const SizedBox(height: 8),
                          Chip(
                            label: Text(
                              '${state.user.subscriptionTier.toUpperCase()} Plan',
                            ),
                            backgroundColor: Theme.of(context).colorScheme.primaryContainer,
                          ),
                        ],
                      ),
                    ),
                  );
                }
                return const SizedBox.shrink();
              },
            ),
            const SizedBox(height: 32),
            Text(
              'Services',
              style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            Expanded(
              child: GridView.count(
                crossAxisCount: 2,
                crossAxisSpacing: 16,
                mainAxisSpacing: 16,
                children: [
                  _ServiceCard(
                    icon: Icons.phone,
                    title: 'Voice Calls',
                    subtitle: 'AI-powered phone conversations',
                    onTap: () {
                      // TODO: Navigate to voice call screen
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Voice calls coming soon!')),
                      );
                    },
                  ),
                  _ServiceCard(
                    icon: Icons.chat,
                    title: 'Text Chat',
                    subtitle: 'Chat with AI on any topic',
                    onTap: () {
                      // TODO: Navigate to text chat screen
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Text chat coming soon!')),
                      );
                    },
                  ),
                  _ServiceCard(
                    icon: Icons.email,
                    title: 'Email',
                    subtitle: 'AI-generated and custom emails',
                    onTap: () {
                      // TODO: Navigate to email screen
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Email service coming soon!')),
                      );
                    },
                  ),
                  _ServiceCard(
                    icon: Icons.analytics,
                    title: 'Usage',
                    subtitle: 'View your monthly usage',
                    onTap: () {
                      // TODO: Navigate to usage screen
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Usage screen coming soon!')),
                      );
                    },
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ServiceCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  const _ServiceCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 2,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                icon,
                size: 48,
                color: Theme.of(context).colorScheme.primary,
              ),
              const SizedBox(height: 12),
              Text(
                title,
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 4),
              Text(
                subtitle,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ),
    );
  }
} 