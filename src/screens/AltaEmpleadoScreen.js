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
import { registerEmployee } from "../services/userService";
import theme from "../theme";

export default function AltaEmpleadoScreen() {
  const [form, setForm] = useState({
    nombre: "",
    email: "",
    contrasena: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((current) => {
        const next = { ...current };
        delete next[field];
        return next;
      });
    }
  };

  const handleSubmit = async () => {
    setFieldErrors({});

    const localErrors = {};
    if (!form.nombre.trim()) {
      localErrors.nombre = "El nombre es obligatorio.";
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!form.email.trim()) {
      localErrors.email = "El email es obligatorio.";
    } else if (!emailRegex.test(form.email.trim())) {
      localErrors.email = "El email no tiene un formato valido.";
    }
    if (!form.contrasena) {
      localErrors.contrasena = "La contraseña es obligatoria.";
    } else if (form.contrasena.length < 6) {
      localErrors.contrasena = "Minimo 6 caracteres.";
    }

    if (Object.keys(localErrors).length > 0) {
      setFieldErrors(localErrors);
      return;
    }

    try {
      setSubmitting(true);
      await registerEmployee(form);
      Alert.alert(
        "Empleado registrado",
        `${form.nombre} ha sido dado de alta como empleado.`
      );
      setForm({ nombre: "", email: "", contrasena: "" });
    } catch (error) {
      const serverErrors = error?.response?.data?.errors;
      if (serverErrors && typeof serverErrors === "object") {
        setFieldErrors(serverErrors);
      } else {
        Alert.alert(
          "Error",
          error?.response?.data?.message || "No se pudo registrar al empleado."
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const renderFieldError = (field) => {
    if (!fieldErrors[field]) return null;
    return <Text style={styles.fieldError}>{fieldErrors[field]}</Text>;
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>Anadir Trabajador</Text>
          <Text style={styles.subtitle}>
            Da de alta a un nuevo empleado con acceso a la app.
          </Text>
        </View>

        <View style={styles.formCard}>
          <TextInput
            placeholder="Nombre completo"
            value={form.nombre}
            returnKeyType="done"
            onChangeText={(v) => updateField("nombre", v)}
            style={[styles.input, fieldErrors.nombre && styles.inputError]}
          />
          {renderFieldError("nombre")}

          <TextInput
            placeholder="Email del empleado"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            value={form.email}
            returnKeyType="done"
            onChangeText={(v) => updateField("email", v)}
            style={[styles.input, fieldErrors.email && styles.inputError]}
          />
          {renderFieldError("email")}

          <TextInput
            placeholder="Contraseña temporal (min. 6 car.)"
            secureTextEntry
            value={form.contrasena}
            returnKeyType="done"
            onChangeText={(v) => updateField("contrasena", v)}
            style={[styles.input, fieldErrors.contrasena && styles.inputError]}
          />
          {renderFieldError("contrasena")}

          <View style={styles.rolBadgeRow}>
            <View style={styles.rolBadge}>
              <Text style={styles.rolBadgeText}>Rol: Empleado</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.button, submitting && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Registrar empleado</Text>
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
    backgroundColor: "#F3F4F6",
  },
  content: {
    flexGrow: 1,
    padding: 16,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    color: "#102A43",
    fontFamily: theme.typography.bold,
    fontWeight: "700",
  },
  subtitle: {
    marginTop: 6,
    color: "#6B7280",
    fontSize: 14,
    fontFamily: theme.typography.regular,
  },
  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 20,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  input: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 12,
    fontFamily: theme.typography.regular,
    fontSize: 15,
  },
  inputError: {
    borderColor: theme.colors.danger,
    marginBottom: 4,
  },
  fieldError: {
    color: theme.colors.danger,
    fontSize: 13,
    fontFamily: theme.typography.regular,
    marginBottom: 10,
    marginLeft: 4,
  },
  rolBadgeRow: {
    marginBottom: 16,
    alignItems: "flex-start",
  },
  rolBadge: {
    backgroundColor: "#E0E7FF",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  rolBadgeText: {
    color: "#1E3A8A",
    fontFamily: theme.typography.medium,
    fontSize: 13,
    fontWeight: "600",
  },
  button: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: "#0F766E",
    justifyContent: "center",
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#FFFFFF",
    fontFamily: theme.typography.medium,
    fontWeight: "600",
    fontSize: 15,
  },
});
