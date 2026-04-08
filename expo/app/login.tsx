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
import { Mail, Lock, Eye, EyeOff, LogIn } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import Colors from '@/constants/colors';

export default function LoginScreen() {
  console.log('[Login] Screen rendered');
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  const passwordRef = useRef<TextInput>(null);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 700, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const handleSignIn = useCallback(async () => {
    setErrorMsg('');
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMsg('Please enter your email address.');
      return;
    }
    if (!password) {
      setErrorMsg('Please enter your password.');
      return;
    }

    setIsSubmitting(true);
    try {
      await signIn(trimmedEmail, password);
      console.log('[Login] Success, navigating to home...');
      router.replace('/');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      console.log('[Login] Error:', message);
      if (message.includes('Invalid login credentials')) {
        setErrorMsg('Incorrect email or password. Please try again.');
      } else if (message.includes('Email not confirmed')) {
        setErrorMsg('Please check your email and confirm your account before signing in.');
      } else if (message.toLowerCase().includes('network') || message.toLowerCase().includes('fetch')) {
        setErrorMsg('Network error. Please check your connection and try again.');
      } else {
        setErrorMsg(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [email, password, signIn, router]);

  const onPressIn = useCallback(() => {
    Animated.spring(buttonScale, { toValue: 0.96, useNativeDriver: true }).start();
  }, [buttonScale]);

  const onPressOut = useCallback(() => {
    Animated.spring(buttonScale, { toValue: 1, friction: 3, useNativeDriver: true }).start();
  }, [buttonScale]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]} testID="login-screen">
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={[styles.headerSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <View style={styles.logoContainer}>
              <View style={styles.logoMark}>
                <Text style={styles.logoIcon}>▶</Text>
              </View>
            </View>
            <Text style={styles.appName}>PlayDay</Text>
            <Text style={styles.tagline}>Sports Group Manager</Text>
          </Animated.View>

          <Animated.View style={[styles.formSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <Text style={styles.formTitle}>Welcome back</Text>
            <Text style={styles.formSubtitle}>Sign in to your account</Text>

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
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
                testID="login-email-input"
              />
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.inputIcon}>
                <Lock size={18} color={Colors.textMuted} />
              </View>
              <TextInput
                ref={passwordRef}
                style={[styles.input, styles.passwordInput]}
                placeholder="Password"
                placeholderTextColor={Colors.textMuted}
                value={password}
                onChangeText={(t) => { setPassword(t); setErrorMsg(''); }}
                secureTextEntry={!showPassword}
                returnKeyType="go"
                onSubmitEditing={handleSignIn}
                testID="login-password-input"
              />
              <Pressable
                style={styles.eyeButton}
                onPress={() => setShowPassword(prev => !prev)}
                hitSlop={12}
              >
                {showPassword
                  ? <EyeOff size={18} color={Colors.textMuted} />
                  : <Eye size={18} color={Colors.textMuted} />
                }
              </Pressable>
            </View>

            <Pressable
              style={styles.forgotLink}
              onPress={() => router.push('/forgot-password')}
              testID="forgot-password-link"
            >
              <Text style={styles.forgotText}>Forgot password?</Text>
            </Pressable>

            <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
              <Pressable
                style={[styles.signInButton, isSubmitting && styles.signInButtonDisabled]}
                onPress={handleSignIn}
                onPressIn={onPressIn}
                onPressOut={onPressOut}
                disabled={isSubmitting}
                testID="sign-in-button"
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <LogIn size={20} color="#fff" />
                    <Text style={styles.signInText}>Sign In</Text>
                  </>
                )}
              </Pressable>
            </Animated.View>
          </Animated.View>

          <Animated.View style={[styles.footerSection, { opacity: fadeAnim }]}>
            <Text style={styles.footerText}>Don't have an account?</Text>
            <Pressable onPress={() => router.push('/register')} testID="register-link">
              <Text style={styles.footerLink}>Create Account</Text>
            </Pressable>
          </Animated.View>
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
  headerSection: {
    alignItems: 'center',
    marginTop: 48,
    marginBottom: 40,
  },
  logoContainer: {
    marginBottom: 16,
  },
  logoMark: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: Colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  logoIcon: {
    fontSize: 32,
    color: '#fff',
    fontWeight: '900' as const,
  },
  appName: {
    fontSize: 34,
    fontWeight: '800' as const,
    color: Colors.text,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  formSection: {
    marginBottom: 32,
  },
  formTitle: {
    fontSize: 26,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 6,
  },
  formSubtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginBottom: 24,
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
  passwordInput: {
    paddingRight: 40,
  },
  eyeButton: {
    position: 'absolute' as const,
    right: 14,
    height: 54,
    justifyContent: 'center',
  },
  forgotLink: {
    alignSelf: 'flex-end',
    marginBottom: 24,
    marginTop: -4,
  },
  forgotText: {
    fontSize: 14,
    color: Colors.gold,
    fontWeight: '600' as const,
  },
  signInButton: {
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
  signInButtonDisabled: {
    opacity: 0.7,
  },
  signInText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700' as const,
  },
  footerSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 'auto' as const,
    paddingTop: 20,
  },
  footerText: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
  footerLink: {
    fontSize: 15,
    color: Colors.gold,
    fontWeight: '700' as const,
  },
});
