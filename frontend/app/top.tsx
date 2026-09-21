import React, { useState } from 'react';
import { View, Text, FlatList, ScrollView, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { makeStyles, useTheme } from '@/src/theme';
import { api } from '@/src/lib/api';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { Chip, Skeleton, EmptyState } from '@/src/components/ui';
import { CardPoster, CardData } from '@/src/components/CardTile';

const CATEGORIES = ['All', 'Pokemon', 'Yu-Gi-Oh', 'Sports', 'Magic', 'One Piece', 'Other'];
const GRADES = [
  { key: 'vca10', label: 'VCA 10' },
  { key: 'vca9', label: 'VCA 9' },
  { key: 'vca8', label: 'VCA 8' },
  { key: 'psa10', label: 'PSA 10' },
  { key: 'raw', label: 'Raw' },
];

export default function TopCards() {
  const { colors } = useTheme();
  const s = useStyles();
  const insets = useSafeAreaInsets();
  const [category, setCategory] = useState('All');
  const [grade, setGrade] = useState('vca10');

  const q = useQuery({
    queryKey: ['top', category, grade],
    queryFn: () => api.get<CardData[]>(`/cards/top?category=${category}&grade=${grade}&limit=100`),
  });

  return (
    <View style={s.root}>
      <ScreenHeader title="Top Valued Cards" />
      <View style={s.filters}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
          {CATEGORIES.map((c) => (
            <Chip key={c} label={c} active={category === c} onPress={() => setCategory(c)} testID={`cat-${c}`} />
          ))}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, marginTop: 10 }}>
          {GRADES.map((g) => (
            <Chip key={g.key} label={g.label} active={grade === g.key} onPress={() => setGrade(g.key)} testID={`grade-${g.key}`} />
          ))}
        </ScrollView>
      </View>

      {q.isLoading ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, padding: 16 }}>
          {[1, 2, 3, 4].map((i) => (
            <View key={i} style={{ width: '47%', flexGrow: 1 }}>
              <Skeleton height={210} radius={14} />
            </View>
          ))}
        </View>
      ) : q.data && q.data.length ? (
        <FlatList
          data={q.data}
          keyExtractor={(x) => x.id}
          numColumns={2}
          columnWrapperStyle={{ gap: 14, paddingHorizontal: 16 }}
          contentContainerStyle={{ gap: 18, paddingTop: 14, paddingBottom: insets.bottom + 24 }}
          renderItem={({ item, index }) => (
            <View style={{ width: '47%', flexGrow: 1 }}>
              <CardPoster card={item} rank={index + 1} gradeKey={grade} onPress={() => router.push(`/card/${item.id}`)} width={undefined as any} />
            </View>
          )}
        />
      ) : (
        <EmptyState icon="trophy-outline" title="No cards in this category" subtitle="Try a different filter." />
      )}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: { flex: 1, backgroundColor: t.colors.background },
  filters: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: t.colors.divider },
}));
