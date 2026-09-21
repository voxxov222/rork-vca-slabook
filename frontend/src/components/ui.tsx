import React from 'react';
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  ViewStyle,
  StyleProp,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { makeStyles, useTheme, elevation, VCA_RED } from '@/src/theme';
import { Icon } from './Icon';

/* ------------------------- Pressable with scale ------------------------- */
export function Pressed({
  children,
  onPress,
  style,
  disabled,
  testID,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  testID?: string;
}) {
  const scale = useSharedValue(1);
  const aStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={[aStyle, style]}>
      <Pressable
        testID={testID}
        disabled={disabled}
        onPressIn={() => (scale.value = withSpring(0.96, { damping: 15 }))}
        onPressOut={() => (scale.value = withSpring(1, { damping: 15 }))}
        onPress={onPress}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

/* --------------------------------- Button ------------------------------- */
export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  loading,
  disabled,
  testID,
  full = true,
}: {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'accent' | 'outline' | 'ghost';
  icon?: string;
  loading?: boolean;
  disabled?: boolean;
  testID?: string;
  full?: boolean;
}) {
  const { colors } = useTheme();
  const s = useButtonStyles();
  const isGrad = variant === 'primary' || variant === 'accent';
  const gradColors: [string, string] =
    variant === 'accent' ? [VCA_RED, '#B4152A'] : [colors.primary, colors.primaryDark];
  const textColor =
    variant === 'outline' ? colors.text : variant === 'ghost' ? colors.primary : '#fff';

  const content = (
    <View style={s.row}>
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <>
          {icon ? <Icon name={icon} size={18} color={textColor} /> : null}
          <Text style={[s.label, { color: textColor }]}>{label}</Text>
        </>
      )}
    </View>
  );

  return (
    <Pressed
      testID={testID}
      onPress={onPress}
      disabled={disabled || loading}
      style={[full && { alignSelf: 'stretch' }, (disabled || loading) && { opacity: 0.6 }]}
    >
      {isGrad ? (
        <LinearGradient colors={gradColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.base}>
          {content}
        </LinearGradient>
      ) : (
        <View
          style={[
            s.base,
            variant === 'outline'
              ? { borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface }
              : { backgroundColor: 'transparent' },
          ]}
        >
          {content}
        </View>
      )}
    </Pressed>
  );
}

const useButtonStyles = makeStyles((t) => ({
  base: {
    height: 52,
    borderRadius: t.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: t.spacing.lg,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { fontSize: t.fontSize.md, fontWeight: '800', letterSpacing: 0.3 },
}));

/* ---------------------------------- Card -------------------------------- */
export function Surface({
  children,
  style,
  elevated,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  elevated?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: elevated ? colors.surfaceElevated : colors.card,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: colors.cardBorder,
        },
        elevated && elevation.md,
        style,
      ]}
    >
      {children}
    </View>
  );
}

/* ------------------------------- GradeBadge ----------------------------- */
export function GradeBadge({ grade, size = 'md' }: { grade: string; size?: 'sm' | 'md' | 'lg' }) {
  const { colors } = useTheme();
  const num = parseInt(grade.replace(/[^0-9]/g, ''), 10);
  const isRaw = /raw/i.test(grade) || Number.isNaN(num);
  const isPsa = /psa/i.test(grade);
  const tileColors: [string, string] = isRaw
    ? [colors.textMuted, colors.silver]
    : isPsa
    ? ['#C0102A', '#7A0A1C']
    : num >= 10
    ? [colors.gold, '#B8860B']
    : num >= 9
    ? [colors.primary, colors.primaryDark]
    : [VCA_RED, '#B4152A'];
  const dim = size === 'lg' ? 64 : size === 'sm' ? 40 : 52;
  const label = isRaw ? 'RAW' : isPsa ? 'PSA' : 'VCA';
  return (
    <LinearGradient
      colors={tileColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        width: dim,
        height: dim,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: '#fff', fontSize: size === 'lg' ? 9 : 8, fontWeight: '800', letterSpacing: 1 }}>
        {label}
      </Text>
      {!isRaw && (
        <Text style={{ color: '#fff', fontSize: size === 'lg' ? 26 : size === 'sm' ? 16 : 22, fontWeight: '900', marginTop: -1 }}>
          {num}
        </Text>
      )}
    </LinearGradient>
  );
}

/* ------------------------------- StatusPill ----------------------------- */
export function StatusPill({ status }: { status: string }) {
  const { colors } = useTheme();
  const up = status.toUpperCase();
  const good = /PASSED|VERIFIED|COMPLETED|MINT/.test(up);
  const bad = /FLAGGED|COUNTERFEIT|NOT FOUND|REJECT/.test(up);
  const warn = /MANUAL|INSUFFICIENT|PENDING|WAITING|REVIEW/.test(up) && !good;
  const bg = good ? colors.successSoft : bad ? colors.dangerSoft : warn ? colors.warningSoft : colors.primarySoft;
  const fg = good ? colors.success : bad ? colors.danger : warn ? colors.warning : colors.info;
  const icon = good ? 'shield-check' : bad ? 'alert-octagon' : warn ? 'alert-circle-outline' : 'information-outline';
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        alignSelf: 'flex-start',
        backgroundColor: bg,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
      }}
    >
      <Icon name={icon} size={14} color={fg} />
      <Text style={{ color: fg, fontSize: 11, fontWeight: '800', letterSpacing: 0.3 }}>{status}</Text>
    </View>
  );
}

/* ----------------------------- SectionHeader ---------------------------- */
export function SectionHeader({
  title,
  action,
  onAction,
  icon,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
  icon?: string;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {icon ? <Icon name={icon} size={18} color={colors.accent} /> : null}
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '900', letterSpacing: 0.2 }}>{title}</Text>
      </View>
      {action ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '700' }}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/* --------------------------------- Chip --------------------------------- */
export function Chip({
  label,
  active,
  onPress,
  testID,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  testID?: string;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={{
        height: 36,
        flexShrink: 0,
        paddingHorizontal: 16,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: active ? colors.primary : colors.surface,
        borderWidth: 1,
        borderColor: active ? colors.primary : colors.border,
      }}
    >
      <Text style={{ color: active ? '#fff' : colors.textSecondary, fontWeight: '700', fontSize: 13 }}>
        {label}
      </Text>
    </Pressable>
  );
}

/* -------------------------------- Avatar -------------------------------- */
export function Avatar({ uri, name, size = 40 }: { uri?: string | null; name?: string; size?: number }) {
  const { colors } = useTheme();
  if (uri) {
    return (
      <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} contentFit="cover" />
    );
  }
  const initial = (name || '?').trim().charAt(0).toUpperCase();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: '#fff', fontWeight: '800', fontSize: size * 0.42 }}>{initial}</Text>
    </View>
  );
}

/* ------------------------------- Skeleton ------------------------------- */
export function Skeleton({ height = 16, width = '100%', radius = 8, style }: { height?: number; width?: any; radius?: number; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  return <View style={[{ height, width, borderRadius: radius, backgroundColor: colors.skeleton }, style]} />;
}

/* ------------------------------ EmptyState ------------------------------ */
export function EmptyState({ icon, title, subtitle, testID }: { icon: string; title: string; subtitle?: string; testID?: string }) {
  const { colors } = useTheme();
  return (
    <View testID={testID} style={{ alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24 }}>
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: 36,
          backgroundColor: colors.primarySoft,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 16,
        }}
      >
        <Icon name={icon} size={34} color={colors.primary} />
      </View>
      <Text style={{ color: colors.text, fontSize: 17, fontWeight: '800', textAlign: 'center' }}>{title}</Text>
      {subtitle ? (
        <Text style={{ color: colors.textSecondary, fontSize: 14, textAlign: 'center', marginTop: 6, lineHeight: 20 }}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

/* ------------------------------- TrendTag ------------------------------- */
export function TrendTag({ value }: { value: number }) {
  const { colors } = useTheme();
  const up = value >= 0;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
      <Icon name={up ? 'trending-up' : 'trending-down'} size={14} color={up ? colors.success : colors.danger} />
      <Text style={{ color: up ? colors.success : colors.danger, fontWeight: '800', fontSize: 12 }}>
        {(up ? '+' : '') + value.toFixed(1)}%
      </Text>
    </View>
  );
}
