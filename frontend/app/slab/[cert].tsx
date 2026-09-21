import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import QRCode from 'react-native-qrcode-svg';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { makeStyles, useTheme, VCA_RED } from '@/src/theme';
import { api } from '@/src/lib/api';
import { money } from '@/src/lib/format';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { Slab } from '@/src/components/Slab';
import { Surface, GradeBadge, StatusPill, EmptyState, Skeleton } from '@/src/components/ui';
import { Icon } from '@/src/components/Icon';

type Cert = {
  cert_number: string;
  slab_id: string;
  nfc_id: string;
  owner_name?: string;
  card: { name: string; set?: string; number?: string; category?: string; image?: string | null; rarity?: string };
  grade: string;
  subgrades: Record<string, number>;
  authentication_status: string;
  verification_status: string;
  value: number;
  date_certified: string;
  history: { event: string; at: string }[];
};

export default function SlabView() {
  const { cert } = useLocalSearchParams<{ cert: string }>();
  const { colors } = useTheme();
  const s = useStyles();
  const insets = useSafeAreaInsets();

  const q = useQuery({
    queryKey: ['verify', cert],
    queryFn: () => api.get<{ found: boolean; certification?: Cert }>(`/verify/${cert}`),
  });

  const data = q.data;
  const c = data?.certification;

  return (
    <View style={s.root}>
      <LinearGradient colors={[colors.heroStart, colors.heroEnd]} style={s.bgTop} />
      <ScreenHeader title="VCA Certificate" transparent />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 24 }} showsVerticalScrollIndicator={false}>
        {q.isLoading ? (
          <View style={{ padding: 24, alignItems: 'center', gap: 16 }}>
            <Skeleton height={320} width={220} radius={18} />
          </View>
        ) : !data?.found || !c ? (
          <EmptyState icon="shield-alert" title="Certification not found" subtitle={`No VCA record for ${cert}.`} />
        ) : (
          <>
            <Animated.View entering={ZoomIn.duration(500)} style={{ alignItems: 'center', marginTop: 8 }}>
              <Slab image={c.card.image} name={c.card.name} set={`${c.card.set || ''} ${c.card.number || ''}`.trim()} grade={c.grade} certNumber={c.cert_number} width={230} />
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(250)} style={s.verifiedBanner}>
              <Icon name="shield-check" size={22} color="#fff" />
              <Text style={s.verifiedText}>{c.verification_status}</Text>
            </Animated.View>

            <View style={{ paddingHorizontal: 16, marginTop: 18, gap: 14 }}>
              <Surface style={{ padding: 16 }}>
                <View style={s.gradeRow}>
                  <GradeBadge grade={c.grade} size="lg" />
                  <View style={{ flex: 1 }}>
                    <Text style={s.cardName}>{c.card.name}</Text>
                    <Text style={s.cardMeta}>{c.card.set} · {c.card.number}</Text>
                    <StatusPill status={c.authentication_status} />
                  </View>
                </View>
                <View style={s.subgrades}>
                  {Object.entries(c.subgrades).map(([k, v]) => (
                    <View key={k} style={s.subCell}>
                      <Text style={s.subValue}>{v}</Text>
                      <Text style={s.subLabel}>{k}</Text>
                    </View>
                  ))}
                </View>
              </Surface>

              <Surface style={{ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                <View style={s.qrBox}>
                  <QRCode value={`https://vca.verify/${c.cert_number}`} size={92} backgroundColor="#fff" color="#0A1B2E" />
                </View>
                <View style={{ flex: 1, gap: 8 }}>
                  <Detail icon="barcode" label="Certification" value={c.cert_number} />
                  <Detail icon="cube-outline" label="Slab ID" value={c.slab_id} />
                  <Detail icon="nfc" label="NFC ID" value={c.nfc_id} />
                </View>
              </Surface>

              <Surface style={s.valueBanner}>
                <View>
                  <Text style={s.valueLabel}>Certified Value</Text>
                  <Text style={s.valueAmount}>{money(c.value)}</Text>
                </View>
                <Icon name="chart-line" size={30} color={colors.success} />
              </Surface>

              <Surface style={{ padding: 16 }}>
                <Text style={s.sectionTitle}>Certification History</Text>
                {c.history.map((h, i) => (
                  <View key={i} style={s.timelineRow}>
                    <View style={s.timelineDotWrap}>
                      <View style={[s.timelineDot, { backgroundColor: i === c.history.length - 1 ? colors.success : colors.primary }]} />
                      {i < c.history.length - 1 && <View style={s.timelineLine} />}
                    </View>
                    <View style={{ flex: 1, paddingBottom: 14 }}>
                      <Text style={s.timelineEvent}>{h.event}</Text>
                      <Text style={s.timelineDate}>{new Date(h.at).toLocaleDateString()}</Text>
                    </View>
                  </View>
                ))}
              </Surface>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Detail({ icon, label, value }: { icon: string; label: string; value: string }) {
  const { colors } = useTheme();
  const s = useStyles();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Icon name={icon} size={16} color={colors.textMuted} />
      <View style={{ flex: 1 }}>
        <Text style={s.detailLabel}>{label}</Text>
        <Text style={s.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: { flex: 1, backgroundColor: t.colors.background },
  bgTop: { position: 'absolute', top: 0, left: 0, right: 0, height: 380 },
  verifiedBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    alignSelf: 'center', marginTop: 16, backgroundColor: t.colors.success,
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 999,
    shadowColor: t.colors.success, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  verifiedText: { color: '#fff', fontWeight: '900', fontSize: 15, letterSpacing: 1 },
  gradeRow: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  cardName: { color: t.colors.text, fontSize: 20, fontWeight: '900' },
  cardMeta: { color: t.colors.textSecondary, fontSize: 13, marginBottom: 8, marginTop: 2 },
  subgrades: { flexDirection: 'row', gap: 8, marginTop: 16 },
  subCell: { flex: 1, backgroundColor: t.colors.background, borderRadius: 12, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: t.colors.border },
  subValue: { color: t.colors.text, fontSize: 20, fontWeight: '900' },
  subLabel: { color: t.colors.textMuted, fontSize: 10, fontWeight: '700', textTransform: 'capitalize', marginTop: 2 },
  qrBox: { padding: 8, backgroundColor: '#fff', borderRadius: 12 },
  detailLabel: { color: t.colors.textMuted, fontSize: 10, fontWeight: '700' },
  detailValue: { color: t.colors.text, fontSize: 13, fontWeight: '800' },
  valueBanner: { padding: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  valueLabel: { color: t.colors.textMuted, fontSize: 12, fontWeight: '700' },
  valueAmount: { color: t.colors.text, fontSize: 28, fontWeight: '900', marginTop: 2 },
  sectionTitle: { color: t.colors.text, fontSize: 16, fontWeight: '900', marginBottom: 14 },
  timelineRow: { flexDirection: 'row', gap: 12 },
  timelineDotWrap: { alignItems: 'center', width: 16 },
  timelineDot: { width: 12, height: 12, borderRadius: 6, marginTop: 2 },
  timelineLine: { width: 2, flex: 1, backgroundColor: t.colors.border, marginTop: 2 },
  timelineEvent: { color: t.colors.text, fontSize: 14, fontWeight: '700' },
  timelineDate: { color: t.colors.textMuted, fontSize: 12, marginTop: 2 },
}));
