import { Image, StyleSheet } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import Ionicons from "@expo/vector-icons/Ionicons";
import ObrasScreen from "../screens/ObrasScreen";
import MaterialesScreen from "../screens/MaterialesScreen";
import FinanzasScreen from "../screens/FinanzasScreen";
import UsuariosScreen from "../screens/UsuariosScreen";
import SettingsScreen from "../screens/SettingsScreen";
import LogoutButton from "../components/LogoutButton";
import theme from "../theme";

const logo = require("../../assets/Logo.png");

const Tab = createBottomTabNavigator();

const HeaderLogo = () => (
  <Image source={logo} style={styles.headerLogo} resizeMode="contain" />
);

export default function CapatazTabs() {
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
        name="Obras"
        component={ObrasScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="construct" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Materiales"
        component={MaterialesScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cube" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Finanzas"
        component={FinanzasScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="wallet" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Usuarios"
        component={UsuariosScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={size} color={color} />
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
    marginLeft: 15,
    marginBottom: 5,
    backgroundColor: "transparent",
  },
});
