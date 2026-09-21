import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { makeStyles, useTheme } from '@/src/theme';
import { useAuth } from '@/src/context/AuthContext';
import { VcaLogo } from '@/src/components/VcaLogo';
import { Slab } from '@/src/components/Slab';
import { Button } from '@/src/components/ui';
import { Icon } from '@/src/components/Icon';

const FEATURES = [
  { icon: 'shield-check', title: 'Authentication', sub: 'Forensic-grade review' },
  { icon: 'star-four-points', title: 'Grading', sub: 'VCA 1–10 scale' },
  { icon: 'chart-line', title: 'Live Value', sub: 'Multi-source market data' },
  { icon: 'nfc', title: 'NFC Slabs', sub: 'Tap-to-verify ownership' },
];

export default function Login() {
  const { colors } = useTheme();
  const s = useStyles();
  const insets = useSafeAreaInsets();
  const { login, signingIn, user } = useAuth();

  if (user) return <Redirect href="/(tabs)" />;

  return (
    <View style={s.root}>
      <LinearGradient colors={[colors.heroStart, colors.heroMid, colors.heroEnd]} style={s.bg}>
        <ScrollView
          contentContainerStyle={{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32, paddingHorizontal: 24 }}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeInDown.duration(500)} style={{ alignItems: 'flex-start' }}>
            <VcaLogo size="md" mono />
          </Animated.View>

          <Animated.View entering={FadeIn.delay(200).duration(600)} style={s.hero}>
            <Text style={s.title}>Verified{'\n'}Card Authority</Text>
            <Text style={s.tagline}>Authentication. Grading. Value. Ownership.</Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(350).duration(600)} style={{ alignItems: 'center', marginVertical: 12 }}>
            <Slab
              image="https://images.pokemontcg.io/base1/4_hires.png"
              name="Charizard"
              set="Base Set · 4/102"
              grade="VCA 10"
              certNumber="VCA10482911"
              interactive={false}
              width={210}
            />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(500).duration(600)} style={s.grid}>
            {FEATURES.map((f) => (
              <View key={f.title} style={s.featureCard}>
                <View style={s.featureIcon}>
                  <Icon name={f.icon} size={20} color="#fff" />
                </View>
                <Text style={s.featureTitle}>{f.title}</Text>
                <Text style={s.featureSub}>{f.sub}</Text>
              </View>
            ))}
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(650).duration(600)} style={{ marginTop: 20, gap: 12 }}>
            <Button
              label={signingIn ? 'Signing in…' : 'Continue with Google'}
              icon="google"
              variant="accent"
              loading={signingIn}
              onPress={login}
              testID="google-login-button"
            />
            <Text style={s.legal}>
              By continuing you agree to VCA's Terms of Service and acknowledge our authentication estimates are not guaranteed sale prices.
            </Text>
          </Animated.View>
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: { flex: 1, backgroundColor: t.colors.heroEnd },
  bg: { flex: 1 },
  hero: { marginTop: 28 },
  title: { color: '#fff', fontSize: 40, fontWeight: '900', lineHeight: 44, letterSpacing: -0.5 },
  tagline: { color: 'rgba(255,255,255,0.75)', fontSize: 15, fontWeight: '600', marginTop: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 16 },
  featureCard: {
    width: '47%',
    flexGrow: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  featureIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(224,30,55,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  featureTitle: { color: '#fff', fontSize: 15, fontWeight: '800' },
  featureSub: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 2 },
  legal: { color: 'rgba(255,255,255,0.45)', fontSize: 11, lineHeight: 16, textAlign: 'center', paddingHorizontal: 8 },
}));
