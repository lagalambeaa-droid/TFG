import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { loginRequest } from "../services/authService";
import theme from "../theme";

const logo = require("../../assets/Logo.png");

export default function LoginScreen({ navigation }) {
  const { signIn } = useAuth();
  const [form, setForm] = useState({
    email: "",
    contrasena: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const updateField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSubmit = async () => {
    if (!form.email.trim() || !form.contrasena.trim()) {
      Alert.alert("Campos incompletos", "Introduce email y contraseña.");
      return;
    }

    try {
      setSubmitting(true);
      const response = await loginRequest(form);
      await signIn({
        token: response.token,
        user: response.usuario,
      });
    } catch (error) {
      Alert.alert(
        "No se pudo iniciar sesión",
        error?.response?.data?.message ||
          "Revisa las credenciales o la conexión con el servidor."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />
      <View style={styles.topSection}>
        <Image source={logo} style={styles.logo} resizeMode="contain" />
        <Text style={styles.appName}>Construct+</Text>
        <Text style={styles.tagline}>Gestión Inteligente de Obras</Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.bottomSection}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            <Text style={styles.label}>Correo electrónico</Text>
            <TextInput
              placeholder="correo@empresa.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={form.email}
              onChangeText={(value) => updateField("email", value)}
              style={styles.input}
            />

            <Text style={styles.label}>Contraseña</Text>
            <TextInput
              placeholder="••••••••"
              secureTextEntry
              value={form.contrasena}
              onChangeText={(value) => updateField("contrasena", value)}
              style={styles.input}
            />

            <TouchableOpacity
              style={[styles.button, submitting && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color={theme.colors.surface} />
              ) : (
                <Text style={styles.buttonText}>Iniciar Sesión</Text>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={() => navigation.navigate("Registro")}
            style={styles.createAccountButton}
          >
            <Text style={styles.createAccountText}>Crear Cuenta Nueva</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.primary,
  },
  topSection: {
    alignItems: "center",
    paddingTop: 80,
    paddingBottom: 40,
    backgroundColor: theme.colors.primary,
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 20,
    marginBottom: 12,
  },
  appName: {
    fontSize: 28,
    fontFamily: theme.typography.bold,
    fontWeight: "700",
    color: theme.colors.surface,
    marginBottom: 4,
  },
  tagline: {
    fontSize: 14,
    fontFamily: theme.typography.regular,
    color: "#BFDBFE",
  },
  bottomSection: {
    flex: 1,
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  scrollContent: {
    padding: 24,
    paddingTop: 28,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.md,
    padding: 24,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  label: {
    fontSize: 14,
    fontFamily: theme.typography.medium,
    color: theme.colors.text,
    marginBottom: 6,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.sm,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    fontFamily: theme.typography.regular,
  },
  button: {
    minHeight: 48,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radii.sm,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: theme.colors.surface,
    fontSize: 16,
    fontFamily: theme.typography.medium,
    fontWeight: "600",
  },
  createAccountButton: {
    marginTop: 20,
    minHeight: 48,
    borderRadius: theme.radii.sm,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surface,
  },
  createAccountText: {
    color: theme.colors.primary,
    fontSize: 16,
    fontFamily: theme.typography.medium,
    fontWeight: "600",
  },
});
