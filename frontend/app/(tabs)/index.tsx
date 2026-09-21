import React from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { makeStyles, useTheme, VCA_RED } from '@/src/theme';
import { usesNativeTabs } from '@/src/navigation';
import { api } from '@/src/lib/api';
import { money, compact } from '@/src/lib/format';
import { useAuth } from '@/src/context/AuthContext';
import { VcaLogo } from '@/src/components/VcaLogo';
import { Icon } from '@/src/components/Icon';
import { Avatar, Surface, SectionHeader, GradeBadge, TrendTag, Skeleton, EmptyState } from '@/src/components/ui';
import { CardPoster, CardData } from '@/src/components/CardTile';
import { Sparkline, DonutBreakdown } from '@/src/components/Charts';

type Stats = {
  total_value: number;
  total_cost: number;
  profit_loss: number;
  total_cards: number;
  certified_count: number;
  pending_submissions: number;
  grade_breakdown: Record<string, number>;
  top_card: any;
  recent: any[];
  value_history: { label: string; value: number }[];
};

const QUICK = [
  { icon: 'line-scan', label: 'Scan', color: VCA_RED, route: '/(tabs)/scan' },
  { icon: 'send', label: 'Submit', color: '#0B3D91', route: '/submit' },
  { icon: 'shield-search', label: 'Verify', color: '#0E9F6E', route: '/verify' },
  { icon: 'trophy', label: 'Top 100', color: '#C99A24', route: '/top' },
];

export default function Home() {
  const { colors } = useTheme();
  const s = useStyles();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const bottomChrome = usesNativeTabs ? insets.bottom : 0;

  const statsQ = useQuery({ queryKey: ['stats'], queryFn: () => api.get<Stats>('/dashboard/stats') });
  const topQ = useQuery({ queryKey: ['top', 'home'], queryFn: () => api.get<CardData[]>('/cards/top?limit=10') });
  const certsQ = useQuery({ queryKey: ['certs'], queryFn: () => api.get<any[]>('/certifications') });

  const stats = statsQ.data;
  const donutColors = [colors.gold, colors.primary, colors.accent, colors.info, colors.silver];
  const donutSegments = stats
    ? Object.entries(stats.grade_breakdown).slice(0, 5).map(([label, value], i) => ({
        label,
        value: value as number,
        color: donutColors[i % donutColors.length],
      }))
    : [];

  return (
    <View style={s.root}>
      {/* Sticky header */}
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <VcaLogo size="sm" />
        <View style={s.headerActions}>
          <Pressable onPress={() => router.push('/verify')} hitSlop={8} style={s.iconBtn} testID="header-verify">
            <Icon name="shield-search" size={22} color={colors.text} />
          </Pressable>
          <Pressable onPress={() => router.push('/profile')} hitSlop={8} testID="header-profile">
            <Avatar uri={user?.picture} name={user?.name} size={34} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomChrome + 28 }}
        refreshControl={
          <RefreshControl
            refreshing={statsQ.isFetching}
            onRefresh={() => {
              statsQ.refetch();
              topQ.refetch();
              certsQ.refetch();
            }}
            tintColor={colors.accent}
          />
        }
      >
        {/* Portfolio value */}
        <Animated.View entering={FadeInDown.duration(400)} style={{ paddingHorizontal: 16, marginTop: 8 }}>
          <LinearGradient colors={[colors.heroStart, colors.heroEnd]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.portfolio}>
            <Text style={s.portfolioLabel}>TOTAL COLLECTION VALUE</Text>
            {statsQ.isLoading ? (
              <Skeleton height={38} width={200} style={{ marginTop: 8 }} />
            ) : (
              <Text style={s.portfolioValue}>{money(stats?.total_value)}</Text>
            )}
            <View style={s.portfolioMetaRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Icon
                  name={(stats?.profit_loss ?? 0) >= 0 ? 'trending-up' : 'trending-down'}
                  size={16}
                  color={(stats?.profit_loss ?? 0) >= 0 ? '#5EE6A8' : '#FF8A94'}
                />
                <Text style={[s.portfolioPl, { color: (stats?.profit_loss ?? 0) >= 0 ? '#5EE6A8' : '#FF8A94' }]}>
                  {money(stats?.profit_loss)} all-time
                </Text>
              </View>
              <Text style={s.portfolioCards}>{stats?.total_cards ?? 0} cards</Text>
            </View>
            <View style={{ marginTop: 8, marginHorizontal: -8 }}>
              <Sparkline data={(stats?.value_history || []).map((h) => h.value)} color="#8FB4FF" height={70} />
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Quick actions */}
        <View style={s.quickRow}>
          {QUICK.map((q) => (
            <Pressable key={q.label} style={s.quick} onPress={() => router.push(q.route as any)} testID={`quick-${q.label}`}>
              <View style={[s.quickIcon, { backgroundColor: q.color }]}>
                <Icon name={q.icon} size={22} color="#fff" />
              </View>
              <Text style={s.quickLabel}>{q.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* Stat cards */}
        <View style={s.statGrid}>
          <StatCard icon="check-decagram" label="VCA Certified" value={String(stats?.certified_count ?? 0)} tint={colors.success} />
          <StatCard icon="clock-outline" label="Pending" value={String(stats?.pending_submissions ?? 0)} tint={colors.warning} />
        </View>

        {/* Portfolio breakdown */}
        <View style={{ paddingHorizontal: 16, marginTop: 20 }}>
          <SectionHeader title="Grade Breakdown" icon="chart-donut" />
          <Surface style={{ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 18 }}>
            {donutSegments.length ? (
              <>
                <DonutBreakdown segments={donutSegments} size={110} />
                <View style={{ flex: 1, gap: 8 }}>
                  {donutSegments.map((seg) => (
                    <View key={seg.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: seg.color }} />
                      <Text style={s.legendLabel}>{seg.label}</Text>
                      <Text style={s.legendValue}>{seg.value}</Text>
                    </View>
                  ))}
                </View>
              </>
            ) : (
              <View style={{ flex: 1 }}>
                <Text style={s.legendLabel}>No cards yet — scan or add a card to start your portfolio.</Text>
              </View>
            )}
          </Surface>
        </View>

        {/* Top valued */}
        <View style={{ marginTop: 22 }}>
          <View style={{ paddingHorizontal: 16 }}>
            <SectionHeader title="Top Valued Cards" icon="trophy" action="See all" onAction={() => router.push('/top')} />
          </View>
          {topQ.isLoading ? (
            <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 16 }}>
              {[1, 2, 3].map((i) => (
                <View key={i} style={{ width: 150 }}>
                  <Skeleton height={204} radius={14} />
                  <Skeleton height={14} width={110} style={{ marginTop: 8 }} />
                </View>
              ))}
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 14 }}>
              {topQ.data?.map((c, i) => (
                <CardPoster key={c.id} card={c} rank={i + 1} width={150} onPress={() => router.push(`/card/${c.id}`)} />
              ))}
            </ScrollView>
          )}
        </View>

        {/* Recently graded */}
        <View style={{ paddingHorizontal: 16, marginTop: 24 }}>
          <SectionHeader title="Recently Graded" icon="star-four-points" />
          {certsQ.isLoading ? (
            <Skeleton height={80} radius={16} />
          ) : certsQ.data && certsQ.data.length ? (
            <View style={{ gap: 10 }}>
              {certsQ.data.slice(0, 4).map((c) => (
                <Pressable key={c.cert_number} onPress={() => router.push(`/slab/${c.cert_number}`)}>
                  <Surface style={s.certRow}>
                    <GradeBadge grade={c.grade} size="sm" />
                    <View style={{ flex: 1 }}>
                      <Text numberOfLines={1} style={s.certName}>{c.card?.name}</Text>
                      <Text style={s.certMeta}>{c.cert_number}</Text>
                    </View>
                    <Text style={s.certValue}>{money(c.value)}</Text>
                    <Icon name="chevron-right" size={20} color={colors.textMuted} />
                  </Surface>
                </Pressable>
              ))}
            </View>
          ) : (
            <Surface style={{ paddingVertical: 8 }}>
              <EmptyState icon="star-four-points" title="No graded slabs yet" subtitle="Certify a card from your vault to see it here." />
            </Surface>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function StatCard({ icon, label, value, tint }: { icon: string; label: string; value: string; tint: string }) {
  const s = useStyles();
  return (
    <Surface style={s.statCard}>
      <View style={[s.statIcon, { backgroundColor: tint + '22' }]}>
        <Icon name={icon} size={20} color={tint} />
      </View>
      <View>
        <Text style={s.statValue}>{value}</Text>
        <Text style={s.statLabel}>{label}</Text>
      </View>
    </Surface>
  );
}

const useStyles = makeStyles((t) => ({
  root: { flex: 1, backgroundColor: t.colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: t.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.divider,
  },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  iconBtn: { padding: 2 },
  portfolio: { borderRadius: 20, padding: 20, overflow: 'hidden' },
  portfolioLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
  portfolioValue: { color: '#fff', fontSize: 38, fontWeight: '900', marginTop: 4, letterSpacing: -1 },
  portfolioMetaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  portfolioPl: { fontSize: 13, fontWeight: '700' },
  portfolioCards: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '700' },
  quickRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, marginTop: 18 },
  quick: { alignItems: 'center', gap: 8, flex: 1 },
  quickIcon: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { color: t.colors.textSecondary, fontSize: 12, fontWeight: '700' },
  statGrid: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, marginTop: 18 },
  statCard: { flex: 1, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  statIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  statValue: { color: t.colors.text, fontSize: 20, fontWeight: '900' },
  statLabel: { color: t.colors.textMuted, fontSize: 12, fontWeight: '600' },
  legendLabel: { color: t.colors.textSecondary, fontSize: 13, fontWeight: '600', flex: 1 },
  legendValue: { color: t.colors.text, fontSize: 13, fontWeight: '800' },
  certRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  certName: { color: t.colors.text, fontSize: 15, fontWeight: '800' },
  certMeta: { color: t.colors.textMuted, fontSize: 12, marginTop: 2 },
  certValue: { color: t.colors.text, fontSize: 15, fontWeight: '900' },
}));
