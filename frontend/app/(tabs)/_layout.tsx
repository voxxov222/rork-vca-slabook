import React from 'react';
import { Platform } from 'react-native';
import { Tabs, Redirect } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useTheme } from '@/src/theme';
import { usesNativeTabs } from '@/src/navigation';
import { useAuth } from '@/src/context/AuthContext';
import { Icon } from '@/src/components/Icon';

export default function TabsLayout() {
  const { colors } = useTheme();
  const { user, loading } = useAuth();

  if (!loading && !user) return <Redirect href="/(auth)/login" />;

  if (usesNativeTabs) {
    return (
      <NativeTabs>
        <NativeTabs.Trigger name="index">
          <NativeTabs.Trigger.Icon sf="house.fill" />
          <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="scan">
          <NativeTabs.Trigger.Icon sf="viewfinder" />
          <NativeTabs.Trigger.Label>Scan</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="collection">
          <NativeTabs.Trigger.Icon sf="square.stack.3d.up.fill" />
          <NativeTabs.Trigger.Label>Vault</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="slabook">
          <NativeTabs.Trigger.Icon sf="bubble.left.and.bubble.right.fill" />
          <NativeTabs.Trigger.Label>Slabook</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
      </NativeTabs>
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.tabBarActive,
        tabBarInactiveTintColor: colors.tabBarInactive,
        tabBarStyle: {
          backgroundColor: colors.tabBarBg,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          ...(Platform.OS === 'web' ? { height: 64 } : {}),
        },
        tabBarItemStyle: { alignSelf: 'center' },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Home', tabBarIcon: ({ color, size }) => <Icon name="home-variant" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="scan"
        options={{ title: 'Scan', tabBarIcon: ({ color, size }) => <Icon name="line-scan" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="collection"
        options={{ title: 'Vault', tabBarIcon: ({ color, size }) => <Icon name="cards" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="slabook"
        options={{ title: 'Slabook', tabBarIcon: ({ color, size }) => <Icon name="account-group" size={size} color={color} /> }}
      />
    </Tabs>
  );
}
