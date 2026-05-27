import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { changePassword } from "../services/userService";
import theme from "../theme";

const validatePassword = (pwd) => {
  if (pwd.length < 8) return "Minimo 8 caracteres.";
  if (!/[A-Z]/.test(pwd)) return "Debe incluir al menos una mayuscula.";
  if (!/[a-z]/.test(pwd)) return "Debe incluir al menos una minuscula.";
  if (!/[0-9]/.test(pwd)) return "Debe incluir al menos un numero.";
  if (!/[^A-Za-z0-9]/.test(pwd)) return "Debe incluir al menos un caracter especial.";
  return null;
};

export default function CambiarContrasenaObligatoriaScreen() {
  const { session, signIn } = useAuth();
  const [contrasena, setContrasena] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!contrasena) {
      Alert.alert("Error", "Introduce tu nueva contraseña.");
      return;
    }
    const pwdError = validatePassword(contrasena);
    if (pwdError) {
      Alert.alert("Contraseña no válida", pwdError);
      return;
    }
    if (contrasena !== confirmar) {
      Alert.alert("Error", "Las contraseñas no coinciden.");
      return;
    }

    try {
      setSaving(true);
      await changePassword({
        contrasena_actual: "",
        contrasena_nueva: contrasena,
      });
      await signIn({
        token: session.token,
        user: { ...session.user, debe_cambiar_contrasena: false },
      });
    } catch (error) {
      Alert.alert(
        "Error",
        error?.response?.data?.message || "No se pudo cambiar la contraseña."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.title}>Cambiar contraseña</Text>
          <Text style={styles.subtitle}>
            Por seguridad, debes establecer una contraseña personal antes de continuar.
          </Text>

          <Text style={styles.fieldLabel}>Nueva contraseña</Text>
          <TextInput
            style={styles.input}
            secureTextEntry
            placeholder="Min. 8 car., mayús., minús., núm. y especial"
            value={contrasena}
            onChangeText={setContrasena}
          />

          <Text style={styles.fieldLabel}>Confirmar contraseña</Text>
          <TextInput
            style={styles.input}
            secureTextEntry
            placeholder="Repite la nueva contraseña"
            value={confirmar}
            onChangeText={setConfirmar}
          />

          <TouchableOpacity
            style={[styles.button, saving && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Guardar contraseña</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 18,
    padding: 24,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontFamily: theme.typography.bold,
    fontWeight: "700",
    color: theme.colors.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: theme.typography.regular,
    color: theme.colors.muted,
    marginBottom: 24,
  },
  fieldLabel: {
    color: "#374151",
    fontSize: 13,
    fontFamily: theme.typography.medium,
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
    fontFamily: theme.typography.regular,
    fontSize: 15,
  },
  button: {
    minHeight: 48,
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: theme.typography.medium,
    fontWeight: "600",
  },
});
