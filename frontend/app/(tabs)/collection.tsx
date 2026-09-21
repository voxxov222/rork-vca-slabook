import React, { useState, useMemo } from 'react';
import { View, Text, FlatList, Pressable, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Animated, { FadeIn } from 'react-native-reanimated';
import { makeStyles, useTheme, VCA_RED } from '@/src/theme';
import { usesNativeTabs } from '@/src/navigation';
import { api } from '@/src/lib/api';
import { money } from '@/src/lib/format';
import { Icon } from '@/src/components/Icon';
import { GradeBadge, Chip, EmptyState, Skeleton, Surface } from '@/src/components/ui';
import { useToast } from '@/src/components/Toast';

type Item = {
  id: string;
  name: string;
  set?: string;
  image?: string | null;
  grade?: string;
  current_value?: number;
  purchase_price?: number;
  cert_number?: string | null;
  category?: string;
};

const FILTERS = ['All', 'Certified', 'Raw', 'Pokemon', 'Yu-Gi-Oh', 'Sports', 'Magic'];

export default function Collection() {
  const { colors } = useTheme();
  const s = useStyles();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const qc = useQueryClient();
  const bottomChrome = usesNativeTabs ? insets.bottom : 0;
  const [filter, setFilter] = useState('All');

  const q = useQuery({ queryKey: ['collection'], queryFn: () => api.get<Item[]>('/collection') });

  const certify = useMutation({
    mutationFn: (id: string) => api.post<any>(`/collection/${id}/certify`),
    onSuccess: (cert) => {
      qc.invalidateQueries({ queryKey: ['collection'] });
      qc.invalidateQueries({ queryKey: ['certs'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
      toast.show('Certified! ' + cert.cert_number, 'success');
      router.push(`/slab/${cert.cert_number}`);
    },
    onError: () => toast.show('Could not certify card', 'error'),
  });

  const items = q.data || [];
  const filtered = useMemo(() => {
    if (filter === 'All') return items;
    if (filter === 'Certified') return items.filter((i) => i.cert_number);
    if (filter === 'Raw') return items.filter((i) => !i.cert_number);
    return items.filter((i) => (i.category || '').toLowerCase() === filter.toLowerCase());
  }, [items, filter]);

  const totalValue = items.reduce((a, b) => a + (b.current_value || 0), 0);

  return (
    <View style={s.root}>
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={s.headerTitle}>My Vault</Text>
          <View style={s.valuePill}>
            <Icon name="wallet" size={15} color={colors.primary} />
            <Text style={s.valuePillText}>{money(totalValue)}</Text>
          </View>
        </View>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={FILTERS}
          keyExtractor={(x) => x}
          contentContainerStyle={{ gap: 8, paddingVertical: 12 }}
          renderItem={({ item }) => (
            <Chip label={item} active={filter === item} onPress={() => setFilter(item)} testID={`filter-${item}`} />
          )}
        />
      </View>

      {q.isLoading ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, padding: 16 }}>
          {[1, 2, 3, 4].map((i) => (
            <View key={i} style={{ width: '47%', flexGrow: 1 }}>
              <Skeleton height={200} radius={14} />
            </View>
          ))}
        </View>
      ) : filtered.length === 0 ? (
        <EmptyState
          testID="collection-empty"
          icon="cards-outline"
          title="Your vault is empty"
          subtitle="Scan a card or add one manually to start building your certified collection."
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(x) => x.id}
          numColumns={2}
          columnWrapperStyle={{ gap: 12, paddingHorizontal: 16 }}
          contentContainerStyle={{ gap: 12, paddingTop: 12, paddingBottom: bottomChrome + 90 }}
          refreshControl={<RefreshControl refreshing={q.isFetching} onRefresh={() => q.refetch()} tintColor={colors.accent} />}
          renderItem={({ item }) => (
            <Animated.View entering={FadeIn} style={{ width: '47%', flexGrow: 1 }}>
              <Pressable
                onPress={() => (item.cert_number ? router.push(`/slab/${item.cert_number}`) : undefined)}
                testID={`vault-item-${item.id}`}
              >
                <Surface style={s.card}>
                  <View style={s.cardImage}>
                    {item.image ? (
                      <Image source={{ uri: item.image }} style={{ width: '100%', height: '100%' }} contentFit="contain" transition={150} />
                    ) : (
                      <Icon name="cards-outline" size={34} color={colors.textMuted} />
                    )}
                    {item.cert_number ? (
                      <View style={s.badgeOverlay}>
                        <GradeBadge grade={item.grade || 'VCA 10'} size="sm" />
                      </View>
                    ) : null}
                  </View>
                  <Text numberOfLines={1} style={s.cardName}>{item.name}</Text>
                  <Text numberOfLines={1} style={s.cardSet}>{item.set || item.category}</Text>
                  <View style={s.cardFooter}>
                    <Text style={s.cardValue}>{money(item.current_value)}</Text>
                    {item.cert_number ? (
                      <View style={s.certTag}>
                        <Icon name="nfc" size={12} color={colors.holo} />
                      </View>
                    ) : (
                      <Pressable
                        onPress={() => certify.mutate(item.id)}
                        style={s.certifyBtn}
                        disabled={certify.isPending}
                        testID={`certify-${item.id}`}
                      >
                        <Text style={s.certifyText}>{certify.isPending ? '…' : 'Certify'}</Text>
                      </Pressable>
                    )}
                  </View>
                </Surface>
              </Pressable>
            </Animated.View>
          )}
        />
      )}

      <Pressable
        style={[s.fab, { bottom: bottomChrome + 16 }]}
        onPress={() => router.push('/add-card')}
        testID="add-card-fab"
      >
        <Icon name="plus" size={28} color="#fff" />
      </Pressable>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: { flex: 1, backgroundColor: t.colors.background },
  header: { paddingHorizontal: 16, backgroundColor: t.colors.background, borderBottomWidth: 1, borderBottomColor: t.colors.divider },
  headerTitle: { color: t.colors.text, fontSize: 24, fontWeight: '900' },
  valuePill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: t.colors.primarySoft, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 },
  valuePillText: { color: t.colors.primary, fontWeight: '900', fontSize: 14 },
  card: { padding: 10 },
  cardImage: { height: 150, borderRadius: 10, backgroundColor: t.colors.background, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: 8 },
  badgeOverlay: { position: 'absolute', top: 6, right: 6 },
  cardName: { color: t.colors.text, fontWeight: '800', fontSize: 14 },
  cardSet: { color: t.colors.textMuted, fontSize: 11, marginTop: 1 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  cardValue: { color: t.colors.text, fontWeight: '900', fontSize: 14 },
  certTag: { width: 26, height: 26, borderRadius: 8, backgroundColor: t.colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  certifyBtn: { backgroundColor: VCA_RED, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  certifyText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  fab: {
    position: 'absolute',
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: VCA_RED,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: VCA_RED,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
}));
