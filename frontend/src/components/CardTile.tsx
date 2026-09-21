import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme, makeStyles } from '@/src/theme';
import { money } from '@/src/lib/format';
import { Icon } from './Icon';
import { TrendTag } from './ui';

export type CardData = {
  id: string;
  name: string;
  set?: string;
  number?: string;
  rarity?: string;
  category?: string;
  image?: string | null;
  raw_value?: number;
  grade_values?: Record<string, number>;
  trend?: number;
  cert_count?: number;
};

/** Vertical poster tile used in horizontal rails + top lists. */
export function CardPoster({
  card,
  onPress,
  width,
  gradeKey = 'vca10',
  rank,
}: {
  card: CardData;
  onPress?: () => void;
  width?: number;
  gradeKey?: string;
  rank?: number;
}) {
  const { colors } = useTheme();
  const s = useStyles();
  const value = card.grade_values?.[gradeKey] ?? card.raw_value ?? 0;
  return (
    <Pressable onPress={onPress} style={[s.poster, width ? { width } : { width: '100%' }]} testID={`card-poster-${card.id}`}>
      <View style={s.imageWrap}>
        {card.image ? (
          <Image source={{ uri: card.image }} style={{ width: '100%', height: '100%' }} contentFit="contain" transition={200} />
        ) : (
          <View style={s.placeholder}>
            <Icon name="cards-outline" size={36} color={colors.textMuted} />
          </View>
        )}
        {typeof rank === 'number' && (
          <LinearGradient colors={[colors.accent, '#B4152A']} style={s.rank}>
            <Text style={s.rankText}>{rank}</Text>
          </LinearGradient>
        )}
      </View>
      <Text numberOfLines={1} style={s.name}>
        {card.name}
      </Text>
      <Text numberOfLines={1} style={s.set}>
        {card.set || card.category}
      </Text>
      <View style={s.footer}>
        <Text style={s.value}>{money(value)}</Text>
        {typeof card.trend === 'number' && <TrendTag value={card.trend} />}
      </View>
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  poster: {},
  imageWrap: {
    aspectRatio: 0.73,
    borderRadius: 14,
    backgroundColor: t.colors.surface,
    borderWidth: 1,
    borderColor: t.colors.cardBorder,
    overflow: 'hidden',
    marginBottom: 8,
  },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  rank: {
    position: 'absolute',
    top: 8,
    left: 8,
    minWidth: 26,
    height: 26,
    paddingHorizontal: 6,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: { color: '#fff', fontWeight: '900', fontSize: 13 },
  name: { color: t.colors.text, fontWeight: '800', fontSize: 14 },
  set: { color: t.colors.textMuted, fontSize: 11, marginTop: 1 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  value: { color: t.colors.text, fontWeight: '900', fontSize: 14 },
}));
