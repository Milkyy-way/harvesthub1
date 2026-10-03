import { Tabs } from 'expo-router';
import { HapticTab } from '../../../components/haptic-tab';
import { IconSymbol } from '../../../components/ui/icon-symbol';
import { useAuth } from '../../../contexts/AuthContext';
import { colors } from '../../../constants/theme';

// Same tab structure/styling as the customer app. Products and Orders stay
// visible before approval but show a lock icon (and a locked screen) until
// profiles.status is 'active' — Home and Account are always open.
export default function FarmerTabsLayout() {
  const { profile } = useAuth();
  const approved = profile?.status === 'active';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <IconSymbol name="house.fill" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: 'Products',
          tabBarIcon: ({ color, size }) => <IconSymbol name={approved ? 'leaf.fill' : 'lock.fill'} color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Orders',
          tabBarIcon: ({ color, size }) => (
            <IconSymbol name={approved ? 'list.bullet.rectangle.fill' : 'lock.fill'} color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Account',
          tabBarIcon: ({ color, size }) => <IconSymbol name="person.fill" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
