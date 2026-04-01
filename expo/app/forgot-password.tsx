import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Mail, ArrowLeft, Send, CheckCircle } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import Colors from '@/constants/colors';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { resetPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [sent, setSent] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const handleReset = useCallback(async () => {
    setErrorMsg('');
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMsg('Please enter your email address.');
      return;
    }

    setIsSubmitting(true);
    try {
      await resetPassword(trimmedEmail);
      console.log('[ForgotPassword] Reset email sent to:', trimmedEmail);
      setSent(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      console.log('[ForgotPassword] Error:', message);
      if (message.toLowerCase().includes('network') || message.toLowerCase().includes('fetch')) {
        setErrorMsg('Network error. Please check your connection and try again.');
      } else {
        setErrorMsg(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [email, resetPassword]);

  const onPressIn = useCallback(() => {
    Animated.spring(buttonScale, { toValue: 0.96, useNativeDriver: true }).start();
  }, [buttonScale]);

  const onPressOut = useCallback(() => {
    Animated.spring(buttonScale, { toValue: 1, friction: 3, useNativeDriver: true }).start();
  }, [buttonScale]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]} testID="forgot-password-screen">
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Pressable style={styles.backRow} onPress={() => router.back()} testID="back-to-login">
            <ArrowLeft size={20} color={Colors.text} />
            <Text style={styles.backText}>Back to Sign In</Text>
          </Pressable>

          {sent ? (
            <Animated.View style={[styles.successSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
              <View style={styles.successCircle}>
                <CheckCircle size={48} color={Colors.success} />
              </View>
              <Text style={styles.successTitle}>Email Sent</Text>
              <Text style={styles.successSubtitle}>
                We've sent a password reset link to{'\n'}
                <Text style={styles.successEmail}>{email.trim()}</Text>
              </Text>
              <Text style={styles.successHint}>
                Check your inbox and follow the link to reset your password. It may take a minute to arrive.
              </Text>
              <Pressable
                style={styles.backToLoginButton}
                onPress={() => router.back()}
                testID="back-to-sign-in-button"
              >
                <Text style={styles.backToLoginText}>Back to Sign In</Text>
              </Pressable>
            </Animated.View>
          ) : (
            <>
              <Animated.View style={[styles.headerSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                <View style={styles.iconCircle}>
                  <Mail size={32} color={Colors.gold} />
                </View>
                <Text style={styles.formTitle}>Reset Password</Text>
                <Text style={styles.formSubtitle}>
                  Enter your email address and we'll send you a link to reset your password.
                </Text>
              </Animated.View>

              <Animated.View style={[styles.formSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                {errorMsg ? (
                  <View style={styles.errorBanner}>
                    <Text style={styles.errorText}>{errorMsg}</Text>
                  </View>
                ) : null}

                <View style={styles.inputGroup}>
                  <View style={styles.inputIcon}>
                    <Mail size={18} color={Colors.textMuted} />
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder="Email address"
                    placeholderTextColor={Colors.textMuted}
                    value={email}
                    onChangeText={(t) => { setEmail(t); setErrorMsg(''); }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoFocus
                    returnKeyType="go"
                    onSubmitEditing={handleReset}
                    testID="forgot-email-input"
                  />
                </View>

                <Animated.View style={{ transform: [{ scale: buttonScale }], marginTop: 8 }}>
                  <Pressable
                    style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                    onPress={handleReset}
                    onPressIn={onPressIn}
                    onPressOut={onPressOut}
                    disabled={isSubmitting}
                    testID="send-reset-button"
                  >
                    {isSubmitting ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Send size={20} color="#fff" />
                        <Text style={styles.submitText}>Send Reset Email</Text>
                      </>
                    )}
                  </Pressable>
                </Animated.View>
              </Animated.View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  backText: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '500' as const,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 20,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(200, 160, 42, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  formTitle: {
    fontSize: 26,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 10,
  },
  formSubtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 8,
  },
  formSection: {
    marginBottom: 32,
  },
  errorBanner: {
    backgroundColor: 'rgba(220, 53, 69, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(220, 53, 69, 0.25)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  errorText: {
    color: Colors.danger,
    fontSize: 14,
    lineHeight: 20,
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginBottom: 14,
    paddingHorizontal: 14,
    height: 54,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
    height: '100%',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.gold,
    paddingVertical: 16,
    borderRadius: 16,
    gap: 10,
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700' as const,
  },
  successSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  successCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(22, 163, 74, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 26,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 12,
  },
  successSubtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 8,
  },
  successEmail: {
    fontWeight: '600' as const,
    color: Colors.text,
  },
  successHint: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
    marginBottom: 32,
  },
  backToLoginButton: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.gold,
  },
  backToLoginText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.gold,
  },
});
