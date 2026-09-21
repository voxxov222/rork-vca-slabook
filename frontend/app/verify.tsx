import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { makeStyles, useTheme } from '@/src/theme';
import { api } from '@/src/lib/api';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { Button, Surface } from '@/src/components/ui';
import { Icon } from '@/src/components/Icon';

export default function Verify() {
  const { colors } = useTheme();
  const s = useStyles();
  const insets = useSafeAreaInsets();
  const [cert, setCert] = useState('');

  const recentQ = useQuery({ queryKey: ['certs'], queryFn: () => api.get<any[]>('/certifications') });
  const sample = recentQ.data?.[0]?.cert_number;

  return (
    <View style={s.root}>
      <ScreenHeader title="Verify Certification" />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={[colors.heroStart, colors.heroEnd]} style={s.hero}>
          <View style={s.shield}>
            <Icon name="shield-search" size={40} color="#fff" />
          </View>
          <Text style={s.heroTitle}>Authenticate a VCA Slab</Text>
          <Text style={s.heroSub}>Enter a certification number, scan the QR code, or tap the NFC chip on a genuine VCA slab.</Text>
        </LinearGradient>

        <Text style={s.label}>Certification Number</Text>
        <TextInput
          style={s.input}
          placeholder="VCA00000000"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="characters"
          value={cert}
          onChangeText={setCert}
          testID="verify-input"
        />

        <View style={{ marginTop: 16 }}>
          <Button
            label="Verify Now"
            icon="shield-check"
            variant="accent"
            disabled={!cert.trim()}
            onPress={() => router.push(`/slab/${cert.trim().toUpperCase()}`)}
            testID="verify-submit"
          />
        </View>

        {sample ? (
          <Surface style={s.sample}>
            <Icon name="lightbulb-on-outline" size={18} color={colors.warning} />
            <Text style={s.sampleText}>Try a live certificate: </Text>
            <Text style={s.sampleCode} onPress={() => router.push(`/slab/${sample}`)}>{sample}</Text>
          </Surface>
        ) : null}

        <View style={s.methods}>
          {[
            { icon: 'qrcode-scan', title: 'QR Code', sub: 'Scan the code printed on the slab' },
            { icon: 'nfc-tap', title: 'NFC Tap', sub: 'Tap the chip with your phone (native app)' },
            { icon: 'pound', title: 'Cert Number', sub: 'Type the number engraved on the slab' },
          ].map((m) => (
            <Surface key={m.title} style={s.method}>
              <View style={s.methodIcon}>
                <Icon name={m.icon} size={22} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.methodTitle}>{m.title}</Text>
                <Text style={s.methodSub}>{m.sub}</Text>
              </View>
            </Surface>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: { flex: 1, backgroundColor: t.colors.background },
  hero: { borderRadius: 20, padding: 24, alignItems: 'center' },
  shield: { width: 80, height: 80, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center', marginBottom: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  heroTitle: { color: '#fff', fontSize: 20, fontWeight: '900' },
  heroSub: { color: 'rgba(255,255,255,0.72)', fontSize: 13, textAlign: 'center', marginTop: 8, lineHeight: 19 },
  label: { color: t.colors.textSecondary, fontSize: 13, fontWeight: '700', marginTop: 20, marginBottom: 8 },
  input: { backgroundColor: t.colors.surface, borderRadius: 12, borderWidth: 1, borderColor: t.colors.border, paddingHorizontal: 16, paddingVertical: 14, color: t.colors.text, fontSize: 18, fontWeight: '800', letterSpacing: 2 },
  sample: { marginTop: 16, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 6 },
  sampleText: { color: t.colors.textSecondary, fontSize: 13 },
  sampleCode: { color: t.colors.primary, fontSize: 13, fontWeight: '900' },
  methods: { marginTop: 22, gap: 12 },
  method: { padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  methodIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: t.colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  methodTitle: { color: t.colors.text, fontSize: 15, fontWeight: '800' },
  methodSub: { color: t.colors.textMuted, fontSize: 12, marginTop: 2 },
}));
