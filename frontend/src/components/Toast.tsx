import React, { createContext, useCallback, useContext, useState } from 'react';
import { Text, StyleSheet } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/src/theme';
import { Icon } from './Icon';

type ToastType = 'success' | 'error' | 'info';
type ToastState = { message: string; type: ToastType } | null;

const ToastContext = createContext<{ show: (m: string, t?: ToastType) => void } | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState>(null);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const show = useCallback((message: string, type: ToastType = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2600);
  }, []);

  const bg = toast?.type === 'success' ? colors.success : toast?.type === 'error' ? colors.danger : colors.primary;
  const icon = toast?.type === 'success' ? 'check-circle' : toast?.type === 'error' ? 'alert-circle' : 'information';

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {toast && (
        <Animated.View
          entering={FadeInUp}
          exiting={FadeOutUp}
          pointerEvents="none"
          style={[
            styles.toast,
            { top: insets.top + 10, backgroundColor: bg },
          ]}
        >
          <Icon name={icon} size={18} color="#fff" />
          <Text style={styles.text}>{toast.message}</Text>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 1000,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
  },
  text: { color: '#fff', fontWeight: '700', fontSize: 14, flex: 1 },
});
