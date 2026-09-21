import React, { useEffect } from 'react';
import { View, Text, Platform } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSpring,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useTheme, VCA_RED } from '@/src/theme';
import { Icon } from './Icon';
import { GradeBadge } from './ui';

/**
 * Interactive VCA slab: drag to rotate (3D tilt), animated holographic sheen,
 * NFC indicator and grade badge. Pure Reanimated + Gesture Handler.
 */
export function Slab({
  image,
  name,
  set,
  grade,
  certNumber,
  interactive = true,
  width = 220,
}: {
  image?: string | null;
  name: string;
  set?: string;
  grade: string;
  certNumber?: string;
  interactive?: boolean;
  width?: number;
}) {
  const { colors, isDark } = useTheme();
  const rotY = useSharedValue(0);
  const rotX = useSharedValue(0);
  const sheen = useSharedValue(0);

  useEffect(() => {
    sheen.value = withRepeat(withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, [sheen]);

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      rotY.value = Math.max(-25, Math.min(25, e.translationX / 6));
      rotX.value = Math.max(-18, Math.min(18, -e.translationY / 8));
    })
    .onEnd(() => {
      rotY.value = withSpring(0, { damping: 12 });
      rotX.value = withSpring(0, { damping: 12 });
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 900 },
      { rotateY: `${rotY.value}deg` },
      { rotateX: `${rotX.value}deg` },
    ],
  }));

  const sheenStyle = useAnimatedStyle(() => ({
    opacity: interpolate(sheen.value, [0, 0.5, 1], [0.15, 0.5, 0.15]),
    transform: [{ translateX: interpolate(sheen.value, [0, 1], [-width, width]) }],
  }));

  const height = width * 1.46;

  const inner = (
    <Animated.View style={interactive ? cardStyle : undefined}>
      <LinearGradient
        colors={isDark ? ['#16233B', '#0B1526'] : ['#F4F7FC', '#DDE6F3']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          width,
          height,
          borderRadius: 18,
          padding: 12,
          borderWidth: 1,
          borderColor: colors.cardBorder,
          shadowColor: VCA_RED,
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.28,
          shadowRadius: 22,
          elevation: 12,
          overflow: 'hidden',
        }}
      >
        {/* Header strip */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View
              style={{
                width: 20,
                height: 20,
                borderRadius: 6,
                backgroundColor: VCA_RED,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '900', fontSize: 12 }}>V</Text>
            </View>
            <Text style={{ color: colors.text, fontWeight: '900', fontSize: 13, letterSpacing: 2 }}>VCA</Text>
          </View>
          <GradeBadge grade={grade} size="sm" />
        </View>

        {/* Card window */}
        <View
          style={{
            flex: 1,
            borderRadius: 12,
            backgroundColor: colors.background,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          {image ? (
            <Image source={{ uri: image }} style={{ width: '100%', height: '100%' }} contentFit="contain" transition={200} />
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="cards-outline" size={48} color={colors.textMuted} />
            </View>
          )}
          {/* Holographic sheen */}
          <Animated.View
            style={[
              { position: 'absolute', top: 0, bottom: 0, width: width * 0.5 },
              sheenStyle,
            ]}
            pointerEvents="none"
          >
            <LinearGradient
              colors={['transparent', colors.holo, 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ flex: 1 }}
            />
          </Animated.View>
        </View>

        {/* Footer */}
        <View style={{ marginTop: 8 }}>
          <Text numberOfLines={1} style={{ color: colors.text, fontWeight: '800', fontSize: 13 }}>
            {name}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
            <Text numberOfLines={1} style={{ color: colors.textSecondary, fontSize: 10, flex: 1 }}>
              {set || '—'}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Icon name="nfc" size={12} color={colors.holo} />
              <Text style={{ color: colors.textMuted, fontSize: 9, fontWeight: '700' }}>
                {certNumber || 'NFC'}
              </Text>
            </View>
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );

  if (!interactive || Platform.OS === 'web') {
    return inner;
  }
  return <GestureDetector gesture={pan}>{inner}</GestureDetector>;
}
