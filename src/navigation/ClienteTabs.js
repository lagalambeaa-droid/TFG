import { Image, StyleSheet } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import Ionicons from "@expo/vector-icons/Ionicons";
import AvanceObraScreen from "../screens/AvanceObraScreen";
import PresupuestosScreen from "../screens/PresupuestosScreen";
import FacturasScreen from "../screens/FacturasScreen";
import SettingsScreen from "../screens/SettingsScreen";
import LogoutButton from "../components/LogoutButton";
import theme from "../theme";

const logo = require("../../assets/Logo.png");

const Tab = createBottomTabNavigator();

const HeaderLogo = () => (
  <Image source={logo} style={styles.headerLogo} resizeMode="contain" />
);

export default function ClienteTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.primary },
        headerTintColor: theme.colors.surface,
        headerTitleStyle: { fontFamily: theme.typography.medium },
        headerLeft: () => <HeaderLogo />,
        headerRight: () => <LogoutButton />,
        tabBarActiveTintColor: theme.colors.secondary,
        tabBarInactiveTintColor: theme.colors.muted,
        tabBarStyle: { backgroundColor: theme.colors.surface },
      }}
    >
      <Tab.Screen
        name="Mi Proyecto"
        component={AvanceObraScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Presupuestos"
        component={PresupuestosScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="document-text" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Facturas"
        component={FacturasScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="receipt" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Ajustes"
        component={SettingsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  headerLogo: {
    width: 36,
    height: 36,
    borderRadius: 8,
    marginLeft: 12,
    backgroundColor: "transparent",
  },
});
