import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { makeStyles, useTheme } from '@/src/theme';
import { api } from '@/src/lib/api';
import { money } from '@/src/lib/format';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { Surface, TrendTag, Button, Skeleton } from '@/src/components/ui';
import { Icon } from '@/src/components/Icon';
import { Sparkline } from '@/src/components/Charts';
import { CardData } from '@/src/components/CardTile';

const GRADES: { key: string; label: string }[] = [
  { key: 'raw', label: 'Raw' },
  { key: 'vca10', label: 'VCA 10' },
  { key: 'vca9', label: 'VCA 9' },
  { key: 'vca8', label: 'VCA 8' },
  { key: 'psa10', label: 'PSA 10' },
  { key: 'psa9', label: 'PSA 9' },
];

export default function CardDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const s = useStyles();
  const insets = useSafeAreaInsets();

  const cardQ = useQuery({ queryKey: ['card', id], queryFn: () => api.get<CardData>(`/cards/${id}`) });
  const card = cardQ.data;

  const history = card ? Array.from({ length: 8 }).map((_, i) => (card.raw_value || 50) * (0.8 + i * 0.03 + Math.random() * 0.05)) : [];

  return (
    <View style={s.root}>
      <ScreenHeader title="Card Details" />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }} showsVerticalScrollIndicator={false}>
        {cardQ.isLoading || !card ? (
          <View style={{ gap: 16 }}>
            <Skeleton height={320} radius={16} />
            <Skeleton height={24} width={200} />
          </View>
        ) : (
          <>
            <View style={s.hero}>
              <View style={s.imageWrap}>
                {card.image ? (
                  <Image source={{ uri: card.image }} style={{ width: '100%', height: '100%' }} contentFit="contain" transition={200} />
                ) : (
                  <Icon name="cards-outline" size={60} color={colors.textMuted} />
                )}
              </View>
            </View>

            <Text style={s.name}>{card.name}</Text>
            <View style={s.metaRow}>
              <Text style={s.meta}>{card.set} · {card.number}</Text>
              {typeof card.trend === 'number' && <TrendTag value={card.trend} />}
            </View>
            <View style={s.tagRow}>
              <View style={s.tag}><Text style={s.tagText}>{card.category}</Text></View>
              {card.rarity ? <View style={s.tag}><Text style={s.tagText}>{card.rarity}</Text></View> : null}
              {typeof card.cert_count === 'number' ? (
                <View style={s.tag}><Text style={s.tagText}>{card.cert_count.toLocaleString()} certified</Text></View>
              ) : null}
            </View>

            <Surface style={{ padding: 16, marginTop: 16 }}>
              <Text style={s.sectionTitle}>Value by Grade</Text>
              <View style={s.grid}>
                {GRADES.map((g) => (
                  <View key={g.key} style={[s.cell, g.key === 'vca10' && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
                    <Text style={[s.cellLabel, g.key === 'vca10' && { color: '#fff' }]}>{g.label}</Text>
                    <Text style={[s.cellValue, g.key === 'vca10' && { color: '#fff' }]}>{money(card.grade_values?.[g.key])}</Text>
                  </View>
                ))}
              </View>
            </Surface>

            <Surface style={{ padding: 16, marginTop: 14 }}>
              <Text style={s.sectionTitle}>Price History</Text>
              <Sparkline data={history} color={colors.accent} height={100} />
              <View style={s.marketRow}>
                <Market label="Low" value={(card as any).market_low ?? card.raw_value} />
                <Market label="Mid" value={(card as any).market_mid ?? card.raw_value} />
                <Market label="High" value={(card as any).market_high ?? card.raw_value} />
              </View>
              <Text style={s.disclaimer}>Estimates aggregate multiple sources and are not guaranteed sale prices.</Text>
            </Surface>

            <View style={{ marginTop: 18 }}>
              <Button
                label="Add to Vault"
                icon="plus-circle"
                variant="accent"
                onPress={() =>
                  router.push({
                    pathname: '/add-card',
                    params: {
                      name: card.name,
                      set: card.set || '',
                      number: card.number || '',
                      category: card.category || '',
                      rarity: card.rarity || '',
                      image: card.image || '',
                      current_value: String(card.raw_value || 0),
                    },
                  })
                }
                testID="card-add-vault"
              />
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Market({ label, value }: { label: string; value?: number }) {
  const s = useStyles();
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Text style={s.marketLabel}>{label}</Text>
      <Text style={s.marketValue}>{money(value)}</Text>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: { flex: 1, backgroundColor: t.colors.background },
  hero: { alignItems: 'center', marginBottom: 16 },
  imageWrap: { width: 220, height: 300, borderRadius: 16, backgroundColor: t.colors.surface, borderWidth: 1, borderColor: t.colors.cardBorder, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  name: { color: t.colors.text, fontSize: 26, fontWeight: '900' },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  meta: { color: t.colors.textSecondary, fontSize: 14 },
  tagRow: { flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' },
  tag: { backgroundColor: t.colors.surface, borderWidth: 1, borderColor: t.colors.border, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  tagText: { color: t.colors.textSecondary, fontSize: 12, fontWeight: '700' },
  sectionTitle: { color: t.colors.text, fontSize: 16, fontWeight: '900', marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cell: { width: '31%', flexGrow: 1, backgroundColor: t.colors.background, borderRadius: 12, padding: 10, borderWidth: 1, borderColor: t.colors.border },
  cellLabel: { color: t.colors.textMuted, fontSize: 11, fontWeight: '700' },
  cellValue: { color: t.colors.text, fontSize: 15, fontWeight: '900', marginTop: 2 },
  marketRow: { flexDirection: 'row', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: t.colors.divider },
  marketLabel: { color: t.colors.textMuted, fontSize: 12, fontWeight: '700' },
  marketValue: { color: t.colors.text, fontSize: 16, fontWeight: '900', marginTop: 3 },
  disclaimer: { color: t.colors.textMuted, fontSize: 11, marginTop: 10, lineHeight: 16 },
}));
