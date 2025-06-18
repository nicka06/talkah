import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../blocs/auth/auth_bloc.dart';
import '../../blocs/auth/auth_event.dart';
import '../../blocs/auth/auth_state.dart';
import '../../widgets/error_display_widget.dart';
import '../../models/app_error.dart';

class ResetPasswordScreen extends StatefulWidget {
  final String? accessToken;
  const ResetPasswordScreen({super.key, required this.accessToken});

  @override
  State<ResetPasswordScreen> createState() => _ResetPasswordScreenState();
}

class _ResetPasswordScreenState extends State<ResetPasswordScreen> {
  final _formKey = GlobalKey<FormState>();
  final _passwordController = TextEditingController();

  void _updatePassword() {
    if (_formKey.currentState!.validate()) {
      if (widget.accessToken == null) {
        ErrorDisplayWidget.showNotification(context, AppError.authentication(details: 'No recovery session found. Please try again.'));
        return;
      }
      context.read<AuthBloc>().add(AuthUpdatePasswordRequested(
            newPassword: _passwordController.text.trim(),
          ));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Reset Password'),
      ),
      body: BlocListener<AuthBloc, AuthState>(
        listener: (context, state) {
          if (state is AuthAuthenticated) {
            ScaffoldMessenger.of(context)
              ..hideCurrentSnackBar()
              ..showSnackBar(
                const SnackBar(
                  content: Text('Password updated successfully.'),
                  backgroundColor: Colors.green,
                ),
              );
            Navigator.of(context).pop();
          } else if (state is AuthError) {
            ErrorDisplayWidget.showNotification(context, state.error);
          }
        },
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Form(
            key: _formKey,
            child: Column(
              children: [
                TextFormField(
                  controller: _passwordController,
                  decoration: const InputDecoration(labelText: 'New Password'),
                  obscureText: true,
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return 'Please enter a new password';
                    }
                    if (value.length < 6) {
                      return 'Password must be at least 6 characters';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 16),
                ElevatedButton(
                  onPressed: _updatePassword,
                  child: const Text('Save New Password'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
} 