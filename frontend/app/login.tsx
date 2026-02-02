import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../src/supabase';

const BACKGROUND_IMAGE =
  'https://customer-assets.emergentagent.com/job_76160147-8fae-4df0-a459-029928f0f939/artifacts/v0z6ca62_Birds%20of%20iPhithi%20log%20in%20page%20background.png';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const sendMagicLink = async () => {
    if (!email) return;

    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });
    setLoading(false);

    if (!error) {
      setSent(true);
    }
  };

  return (
    <ImageBackground
      source={{ uri: BACKGROUND_IMAGE }}
      style={styles.container}
      resizeMode="cover"
    >
      <View style={[styles.content, { paddingTop: insets.top + 40 }]}>
        {/* Title Section */}
        <View style={styles.titleSection}>
          <Text style={styles.conservancyText}>Gillitts Conservancy</Text>
          <Text style={styles.title}>Birds of iPhithi</Text>
          <Text style={styles.subtitle}>
            Track and record the birds you've spotted at iPhithi Nature Reserve
          </Text>
        </View>

        {/* Features */}
        <View style={styles.features}>
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
            <Text style={styles.featureText}>Track your bird sightings</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="calendar" size={20} color="#fff" />
            <Text style={styles.featureText}>Record dates & notes</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="phone-portrait" size={20} color="#fff" />
            <Text style={styles.featureText}>Works offline</Text>
          </View>
        </View>

        {/* Login */}
        <View style={styles.buttonContainer}>
          {sent ? (
            <Text style={styles.footer}>
              Check your email for the login link
            </Text>
          ) : (
            <>
              <TextInput
                style={styles.input}
                placeholder="Email address"
                placeholderTextColor="#555"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />

              <TouchableOpacity
                style={styles.emailButton}
                onPress={sendMagicLink}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="#333" />
                ) : (
                  <Text style={styles.emailButtonText}>
                    Send login link
                  </Text>
                )}
              </TouchableOpacity>

              <Text style={styles.footer}>
                We’ll email you a secure sign-in link
              </Text>
            </>
          )}
        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    justifyContent: 'space-between',
    paddingBottom: 50,
  },
  titleSection: {
    alignItems: 'center',
    marginTop: 60,
  },
  conservancyText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#fff',
    marginBottom: 8,
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#fff',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  features: {},
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  featureText: {
    fontSize: 16,
    color: '#fff',
    marginLeft: 12,
  },
  buttonContainer: {
    alignItems: 'center',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    width: '100%',
    marginBottom: 12,
  },
  emailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 16,
    width: '100%',
  },
  emailButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  footer: {
    fontSize: 13,
    color: '#fff',
    marginTop: 20,
    textAlign: 'center',
  },
});
