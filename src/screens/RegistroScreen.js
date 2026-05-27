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
import { loginRequest, registerRequest } from "../services/authService";
import { useAuth } from "../context/AuthContext";
import theme from "../theme";

export default function RegistroScreen({ navigation }) {
  const { signIn } = useAuth();
  const [form, setForm] = useState({
    nombre: "",
    email: "",
    contrasena: "",
    telefono: "",
    direccion: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const updateField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
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
      localErrors.email = "El email es obligatorio. Ejemplo: usuario@correo.com";
    } else if (!emailRegex.test(form.email.trim())) {
      localErrors.email = "El email no tiene un formato valido. Ejemplo: usuario@correo.com";
    }
    if (!form.contrasena) {
      localErrors.contrasena = "La contraseña es obligatoria.";
    } else if (form.contrasena.length < 8) {
      localErrors.contrasena = "Minimo 8 caracteres.";
    } else if (!/[A-Z]/.test(form.contrasena)) {
      localErrors.contrasena = "Debe incluir al menos una mayuscula.";
    } else if (!/[a-z]/.test(form.contrasena)) {
      localErrors.contrasena = "Debe incluir al menos una minuscula.";
    } else if (!/[0-9]/.test(form.contrasena)) {
      localErrors.contrasena = "Debe incluir al menos un numero.";
    } else if (!/[^A-Za-z0-9]/.test(form.contrasena)) {
      localErrors.contrasena = "Debe incluir al menos un caracter especial.";
    }

    if (Object.keys(localErrors).length > 0) {
      setFieldErrors(localErrors);
      return;
    }

    try {
      setSubmitting(true);
      await registerRequest({ ...form, rol: "cliente" });
      const loginResponse = await loginRequest({
        email: form.email,
        contrasena: form.contrasena,
      });

      await signIn({
        token: loginResponse.token,
        user: loginResponse.usuario,
      });
    } catch (error) {
      const serverErrors = error?.response?.data?.errors;
      if (serverErrors && typeof serverErrors === "object") {
        setFieldErrors(serverErrors);
      } else {
        Alert.alert(
          "No se pudo registrar la cuenta",
          error?.response?.data?.message ||
            "Comprueba los datos e intentalo de nuevo."
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
        <View style={styles.card}>
          <Text style={styles.title}>Crear cuenta</Text>
          <Text style={styles.subtitle}>
            Registra un usuario y entra directamente en la app.
          </Text>

          <TextInput
            placeholder="Nombre completo"
            value={form.nombre}
            onChangeText={(value) => updateField("nombre", value)}
            style={[styles.input, fieldErrors.nombre && styles.inputError]}
          />
          {renderFieldError("nombre")}

          <TextInput
            placeholder="Email (ej: usuario@correo.com)"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            value={form.email}
            onChangeText={(value) => updateField("email", value)}
            style={[styles.input, fieldErrors.email && styles.inputError]}
          />
          {renderFieldError("email")}

          <TextInput
            placeholder="Contraseña (min. 8 car., mayús., núm., especial)"
            secureTextEntry
            value={form.contrasena}
            onChangeText={(value) => updateField("contrasena", value)}
            style={[styles.input, fieldErrors.contrasena && styles.inputError]}
          />
          {renderFieldError("contrasena")}

          <TextInput
            placeholder="Telefono"
            keyboardType="phone-pad"
            value={form.telefono}
            onChangeText={(value) => updateField("telefono", value)}
            style={styles.input}
          />
          <TextInput
            placeholder="Direccion"
            value={form.direccion}
            onChangeText={(value) => updateField("direccion", value)}
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
              <Text style={styles.buttonText}>Registrarse</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.linkButton}
          >
            <Text style={styles.link}>Volver al login</Text>
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
    borderRadius: theme.radii.md,
    padding: 24,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  title: {
    fontSize: 32,
    fontFamily: theme.typography.bold,
    fontWeight: "700",
    color: theme.colors.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: theme.typography.regular,
    color: theme.colors.muted,
    marginBottom: 24,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.sm,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    fontFamily: theme.typography.regular,
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
  linkButton: {
    marginTop: 18,
  },
  link: {
    textAlign: "center",
    color: theme.colors.secondary,
    fontFamily: theme.typography.medium,
    fontWeight: "600",
  },
});
