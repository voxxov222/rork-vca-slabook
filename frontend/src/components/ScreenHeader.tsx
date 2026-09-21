import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/src/theme';
import { Icon } from './Icon';

export function ScreenHeader({
  title,
  right,
  transparent,
  onBack,
}: {
  title?: string;
  right?: React.ReactNode;
  transparent?: boolean;
  onBack?: () => void;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        paddingTop: insets.top + 8,
        paddingBottom: 12,
        paddingHorizontal: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: transparent ? 'transparent' : colors.background,
        borderBottomWidth: transparent ? 0 : 1,
        borderBottomColor: colors.divider,
      }}
    >
      <Pressable
        onPress={() => (onBack ? onBack() : router.back())}
        hitSlop={8}
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: transparent ? 'rgba(0,0,0,0.35)' : colors.surface,
          borderWidth: transparent ? 0 : 1,
          borderColor: colors.border,
        }}
        testID="header-back"
      >
        <Icon name="arrow-left" size={22} color={transparent ? '#fff' : colors.text} />
      </Pressable>
      {title ? (
        <Text numberOfLines={1} style={{ flex: 1, textAlign: 'center', color: colors.text, fontSize: 17, fontWeight: '800', marginHorizontal: 8 }}>
          {title}
        </Text>
      ) : (
        <View style={{ flex: 1 }} />
      )}
      <View style={{ minWidth: 40, alignItems: 'flex-end' }}>{right}</View>
    </View>
  );
}
