import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput } from 'react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation } from '@tanstack/react-query';
import Animated, { FadeIn } from 'react-native-reanimated';
import { makeStyles, useTheme } from '@/src/theme';
import { api } from '@/src/lib/api';
import { money } from '@/src/lib/format';
import { useAuth } from '@/src/context/AuthContext';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { Button, Surface } from '@/src/components/ui';
import { Icon } from '@/src/components/Icon';
import { useToast } from '@/src/components/Toast';

type Tier = { name: string; price: number; turnaround: string; max_value: string; features: string[] };
type Item = { id: string; name: string; set?: string; image?: string | null; current_value?: number };
type Shipping = { submission_address: string; instructions: string; contact: string };

export default function Submit() {
  const { colors } = useTheme();
  const s = useStyles();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { user } = useAuth();

  const tiersQ = useQuery({ queryKey: ['tiers'], queryFn: () => api.get<Tier[]>('/pricing/tiers') });
  const shipQ = useQuery({ queryKey: ['shipping'], queryFn: () => api.get<Shipping>('/settings/shipping') });
  const colQ = useQuery({ queryKey: ['collection'], queryFn: () => api.get<Item[]>('/collection') });

  const [tier, setTier] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [address, setAddress] = useState('');
  const [done, setDone] = useState<string | null>(null);

  const chosenTier = tiersQ.data?.find((t) => t.name === tier);
  const selectedCards = (colQ.data || []).filter((c) => selected[c.id]);
  const total = (chosenTier?.price || 0) * Math.max(1, selectedCards.length);

  const submit = useMutation({
    mutationFn: () =>
      api.post<any>('/submissions', {
        tier: tier,
        cards: selectedCards.map((c) => ({ id: c.id, name: c.name, image: c.image })),
        contact_name: name,
        contact_email: email,
        address,
      }),
    onSuccess: (sub) => {
      setDone(sub.id);
      toast.show('Submission created', 'success');
    },
    onError: () => toast.show('Could not create submission', 'error'),
  });

  if (done) {
    return (
      <View style={s.root}>
        <ScreenHeader title="Submission Created" />
        <Animated.View entering={FadeIn} style={s.successWrap}>
          <View style={s.successIcon}>
            <Icon name="check-decagram" size={56} color={colors.success} />
          </View>
          <Text style={s.successTitle}>You're all set!</Text>
          <Text style={s.successSub}>Your submission number is</Text>
          <Text style={s.successCode}>{done}</Text>
          <Surface style={s.shipCard}>
            <Text style={s.shipLabel}>SHIP YOUR CARDS TO</Text>
            <Text style={s.shipAddress}>{shipQ.data?.submission_address}</Text>
            <Text style={s.shipInstructions}>{shipQ.data?.instructions}</Text>
          </Surface>
          <View style={{ width: '100%', marginTop: 20 }}>
            <Button label="Done" variant="primary" onPress={() => router.back()} testID="submit-done" />
          </View>
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <ScreenHeader title="Submit for Grading" />
      <KeyboardAwareScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }} bottomOffset={20} showsVerticalScrollIndicator={false}>
        <Text style={s.step}>1 · Choose a service tier</Text>
        <View style={{ gap: 12 }}>
          {tiersQ.data?.map((t) => (
            <Pressable key={t.name} onPress={() => setTier(t.name)} testID={`tier-${t.name}`}>
              <Surface style={[s.tier, tier === t.name && { borderColor: colors.accent, borderWidth: 2 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={s.tierName}>{t.name}</Text>
                  <Text style={s.tierMeta}>{t.turnaround} · up to {t.max_value}</Text>
                  <Text style={s.tierFeatures}>{t.features.join(' · ')}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={s.tierPrice}>{money(t.price)}</Text>
                  <Text style={s.tierPer}>/ card</Text>
                </View>
              </Surface>
            </Pressable>
          ))}
        </View>

        <Text style={s.step}>2 · Select cards from your vault</Text>
        {colQ.data && colQ.data.length ? (
          <View style={{ gap: 10 }}>
            {colQ.data.map((c) => (
              <Pressable key={c.id} onPress={() => setSelected((p) => ({ ...p, [c.id]: !p[c.id] }))} testID={`select-${c.id}`}>
                <Surface style={[s.cardRow, selected[c.id] && { borderColor: colors.accent }]}>
                  <View style={s.cardThumb}>
                    {c.image ? <Image source={{ uri: c.image }} style={{ width: '100%', height: '100%' }} contentFit="contain" /> : <Icon name="cards-outline" size={22} color={colors.textMuted} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.cardName}>{c.name}</Text>
                    <Text style={s.cardSet}>{c.set} · {money(c.current_value)}</Text>
                  </View>
                  <Icon name={selected[c.id] ? 'checkbox-marked-circle' : 'checkbox-blank-circle-outline'} size={24} color={selected[c.id] ? colors.accent : colors.textMuted} />
                </Surface>
              </Pressable>
            ))}
          </View>
        ) : (
          <Surface style={{ padding: 16 }}>
            <Text style={s.cardSet}>No cards in your vault yet. Add cards first.</Text>
          </Surface>
        )}

        <Text style={s.step}>3 · Contact details</Text>
        <TextInput style={s.input} placeholder="Full name" placeholderTextColor={colors.textMuted} value={name} onChangeText={setName} testID="submit-name" />
        <TextInput style={s.input} placeholder="Email" placeholderTextColor={colors.textMuted} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" testID="submit-email" />
        <TextInput style={[s.input, { height: 80, textAlignVertical: 'top' }]} placeholder="Return shipping address" placeholderTextColor={colors.textMuted} value={address} onChangeText={setAddress} multiline testID="submit-address" />

        {shipQ.data ? (
          <Surface style={s.shipCard}>
            <Text style={s.shipLabel}>WHERE TO SEND YOUR CARDS</Text>
            <Text style={s.shipAddress}>{shipQ.data.submission_address}</Text>
          </Surface>
        ) : null}

        <Surface style={s.totalRow}>
          <Text style={s.totalLabel}>Total ({selectedCards.length} {selectedCards.length === 1 ? 'card' : 'cards'})</Text>
          <Text style={s.totalValue}>{money(total)}</Text>
        </Surface>

        <View style={{ marginTop: 16 }}>
          <Button
            label="Create Submission"
            icon="send"
            variant="accent"
            loading={submit.isPending}
            disabled={!tier || selectedCards.length === 0 || !name.trim() || !email.trim()}
            onPress={() => submit.mutate()}
            testID="submit-create"
          />
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: { flex: 1, backgroundColor: t.colors.background },
  step: { color: t.colors.text, fontSize: 16, fontWeight: '900', marginTop: 22, marginBottom: 12 },
  tier: { padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  tierName: { color: t.colors.text, fontSize: 16, fontWeight: '900' },
  tierMeta: { color: t.colors.textSecondary, fontSize: 12, marginTop: 3 },
  tierFeatures: { color: t.colors.textMuted, fontSize: 11, marginTop: 4 },
  tierPrice: { color: t.colors.accent, fontSize: 20, fontWeight: '900' },
  tierPer: { color: t.colors.textMuted, fontSize: 11 },
  cardRow: { padding: 10, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1.5, borderColor: 'transparent' },
  cardThumb: { width: 40, height: 56, borderRadius: 8, backgroundColor: t.colors.background, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  cardName: { color: t.colors.text, fontSize: 14, fontWeight: '800' },
  cardSet: { color: t.colors.textMuted, fontSize: 12, marginTop: 2 },
  input: { backgroundColor: t.colors.surface, borderRadius: 12, borderWidth: 1, borderColor: t.colors.border, paddingHorizontal: 14, paddingVertical: 12, color: t.colors.text, fontSize: 15, marginBottom: 10 },
  shipCard: { padding: 16, marginTop: 14 },
  shipLabel: { color: t.colors.textMuted, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  shipAddress: { color: t.colors.text, fontSize: 15, fontWeight: '700', marginTop: 8, lineHeight: 22 },
  shipInstructions: { color: t.colors.textSecondary, fontSize: 12, marginTop: 8, lineHeight: 18 },
  totalRow: { padding: 16, marginTop: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  totalLabel: { color: t.colors.textSecondary, fontSize: 14, fontWeight: '700' },
  totalValue: { color: t.colors.text, fontSize: 22, fontWeight: '900' },
  successWrap: { flex: 1, alignItems: 'center', padding: 24, paddingTop: 40 },
  successIcon: { width: 100, height: 100, borderRadius: 50, backgroundColor: t.colors.successSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  successTitle: { color: t.colors.text, fontSize: 24, fontWeight: '900' },
  successSub: { color: t.colors.textSecondary, fontSize: 14, marginTop: 8 },
  successCode: { color: t.colors.accent, fontSize: 28, fontWeight: '900', marginTop: 4, letterSpacing: 1 },
}));
