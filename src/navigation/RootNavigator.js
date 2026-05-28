import { useEffect } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import AuthStack from "./AuthStack";
import CapatazTabs from "./CapatazTabs";
import EmpleadoTabs from "./EmpleadoTabs";
import ClienteTabs from "./ClienteTabs";
import CambiarContrasenaObligatoriaScreen from "../screens/CambiarContrasenaObligatoriaScreen";
import { useAuth } from "../context/AuthContext";
import {
  registerForPushNotifications,
  sendTokenToBackend,
} from "../services/notificationService";
import theme from "../theme";

const logo = require("../../assets/splash-logo.png");

export default function RootNavigator() {
  const { session } = useAuth();

  useEffect(() => {
    if (!session.token) return;

    registerForPushNotifications().then((pushToken) => {
      if (pushToken) {
        sendTokenToBackend(pushToken);
      }
    });
  }, [session.token]);

  if (session.isLoading) {
    return (
      <View style={styles.splashContainer}>
        <Image source={logo} style={styles.splashLogo} resizeMode="contain" />
        <Text style={styles.splashTitle}>Construct+</Text>
        <Text style={styles.splashSubtitle}>Gestion Inteligente de Obras</Text>
      </View>
    );
  }

  if (!session.token || !session.role) {
    return <AuthStack />;
  }

  if (session.user?.debe_cambiar_contrasena) {
    return <CambiarContrasenaObligatoriaScreen />;
  }

  if (session.role === "capataz") {
    return <CapatazTabs />;
  }

  if (session.role === "empleado") {
    return <EmpleadoTabs />;
  }

  if (session.role === "cliente") {
    return <ClienteTabs />;
  }

  return <AuthStack />;
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.colors.primary,
  },
  splashLogo: {
    width: 120,
    height: 120,
    borderRadius: 24,
    marginBottom: 20,
  },
  splashTitle: {
    fontSize: 32,
    fontFamily: theme.typography.bold,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  splashSubtitle: {
    fontSize: 16,
    fontFamily: theme.typography.regular,
    color: "rgba(255,255,255,0.8)",
  },
});
