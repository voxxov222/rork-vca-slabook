import React from 'react';
import { View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme, VCA_RED } from '@/src/theme';

/** VCA wordmark lockup — red shield "V" tile + VERIFIED CARD AUTHORITY. */
export function VcaLogo({ size = 'md', mono = false }: { size?: 'sm' | 'md' | 'lg'; mono?: boolean }) {
  const { colors } = useTheme();
  const tile = size === 'lg' ? 54 : size === 'sm' ? 30 : 40;
  const vFont = size === 'lg' ? 30 : size === 'sm' ? 17 : 23;
  const wordFont = size === 'lg' ? 30 : size === 'sm' ? 16 : 22;
  const subFont = size === 'lg' ? 10.5 : size === 'sm' ? 6.5 : 8;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: size === 'sm' ? 8 : 11 }}>
      <LinearGradient
        colors={[VCA_RED, '#B4152A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          width: tile,
          height: tile,
          borderRadius: tile * 0.26,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ color: '#fff', fontWeight: '900', fontSize: vFont, letterSpacing: -1 }}>V</Text>
      </LinearGradient>
      <View>
        <Text style={{ color: mono ? '#fff' : colors.text, fontWeight: '900', fontSize: wordFont, letterSpacing: 3 }}>
          VCA
        </Text>
        <Text
          style={{
            color: mono ? 'rgba(255,255,255,0.7)' : colors.textSecondary,
            fontWeight: '700',
            fontSize: subFont,
            letterSpacing: size === 'sm' ? 1.2 : 2,
            marginTop: 1,
          }}
        >
          VERIFIED CARD AUTHORITY
        </Text>
      </View>
    </View>
  );
}
