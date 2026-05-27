import { useEffect, useState } from "react";
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
import { changePassword, updateProfile } from "../services/userService";
import theme from "../theme";

const validatePassword = (pwd) => {
  if (pwd.length < 8) return "Minimo 8 caracteres.";
  if (!/[A-Z]/.test(pwd)) return "Debe incluir al menos una mayuscula.";
  if (!/[a-z]/.test(pwd)) return "Debe incluir al menos una minuscula.";
  if (!/[0-9]/.test(pwd)) return "Debe incluir al menos un numero.";
  if (!/[^A-Za-z0-9]/.test(pwd)) return "Debe incluir al menos un caracter especial.";
  return null;
};

export default function SettingsScreen() {
  const { session, signIn, signOut } = useAuth();

  const [profile, setProfile] = useState({
    nombre: "",
    telefono: "",
    direccion: "",
    especialidad: "",
  });
  const [savingProfile, setSavingProfile] = useState(false);

  const [passwords, setPasswords] = useState({
    contrasena_actual: "",
    contrasena_nueva: "",
    confirmar: "",
  });
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (session.user) {
      setProfile({
        nombre: session.user.nombre || "",
        telefono: session.user.telefono || "",
        direccion: session.user.direccion || "",
        especialidad: session.user.especialidad || "",
      });
    }
  }, [session.user]);

  const handleUpdateProfile = async () => {
    if (!profile.nombre.trim()) {
      Alert.alert("Error", "El nombre no puede estar vacio.");
      return;
    }

    try {
      setSavingProfile(true);
      const response = await updateProfile(profile);

      await signIn({
        token: session.token,
        user: { ...session.user, ...response.usuario },
      });

      Alert.alert("Perfil actualizado", "Tus datos se han guardado correctamente.");
    } catch (error) {
      Alert.alert(
        "Error",
        error?.response?.data?.message || "No se pudo actualizar el perfil."
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwords.contrasena_actual || !passwords.contrasena_nueva) {
      Alert.alert("Error", "Rellena ambos campos de contraseña.");
      return;
    }
    const pwdError = validatePassword(passwords.contrasena_nueva);
    if (pwdError) {
      Alert.alert("Contraseña no válida", pwdError);
      return;
    }
    if (passwords.contrasena_nueva !== passwords.confirmar) {
      Alert.alert("Error", "La nueva contraseña y la confirmación no coinciden.");
      return;
    }

    try {
      setSavingPassword(true);
      await changePassword({
        contrasena_actual: passwords.contrasena_actual,
        contrasena_nueva: passwords.contrasena_nueva,
      });
      setPasswords({ contrasena_actual: "", contrasena_nueva: "", confirmar: "" });
      Alert.alert("Contraseña actualizada", "Tu contraseña se ha cambiado correctamente.");
    } catch (error) {
      Alert.alert(
        "Error",
        error?.response?.data?.message || "No se pudo cambiar la contraseña."
      );
    } finally {
      setSavingPassword(false);
    }
  };

  const handleLogout = () => {
    Alert.alert("Cerrar sesion", "Se cerrara la sesion actual.", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Salir",
        style: "destructive",
        onPress: () => signOut(),
      },
    ]);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>Ajustes</Text>
          <Text style={styles.subtitle}>
            Gestiona tus datos personales y la seguridad de tu cuenta.
          </Text>
        </View>

        <View style={styles.userBadge}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>
              {(session.user?.nombre || "U")[0].toUpperCase()}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{session.user?.nombre}</Text>
            <Text style={styles.userEmail}>{session.user?.email}</Text>
            <View style={styles.rolePill}>
              <Text style={styles.rolePillText}>
                {session.role?.charAt(0).toUpperCase() + session.role?.slice(1)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Datos personales</Text>

          <Text style={styles.fieldLabel}>Nombre</Text>
          {session.role === "empleado" ? (
            <Text style={styles.readOnlyField}>{profile.nombre || "—"}</Text>
          ) : (
            <TextInput
              style={styles.input}
              value={profile.nombre}
              onChangeText={(v) =>
                setProfile((c) => ({ ...c, nombre: v }))
              }
            />
          )}

          <Text style={styles.fieldLabel}>Telefono</Text>
          {session.role === "empleado" ? (
            <Text style={styles.readOnlyField}>{profile.telefono || "—"}</Text>
          ) : (
            <TextInput
              style={styles.input}
              keyboardType="phone-pad"
              placeholder="Ej: 612345678"
              value={profile.telefono}
              onChangeText={(v) =>
                setProfile((c) => ({ ...c, telefono: v }))
              }
            />
          )}

          <Text style={styles.fieldLabel}>Direccion</Text>
          {session.role === "empleado" ? (
            <Text style={styles.readOnlyField}>{profile.direccion || "—"}</Text>
          ) : (
            <TextInput
              style={styles.input}
              placeholder="Ej: Calle Mayor 1, Madrid"
              value={profile.direccion}
              onChangeText={(v) =>
                setProfile((c) => ({ ...c, direccion: v }))
              }
            />
          )}

          {(session.role === "empleado" || session.role === "capataz") && (
            <>
              <Text style={styles.fieldLabel}>Especialidad</Text>
              {session.role === "empleado" ? (
                <Text style={styles.readOnlyField}>{profile.especialidad || "—"}</Text>
              ) : (
                <TextInput
                  style={styles.input}
                  placeholder="Ej: Electricista"
                  value={profile.especialidad}
                  onChangeText={(v) =>
                    setProfile((c) => ({ ...c, especialidad: v }))
                  }
                />
              )}
            </>
          )}

          {session.role !== "empleado" && (
            <TouchableOpacity
              style={[styles.primaryButton, savingProfile && styles.buttonDisabled]}
              onPress={handleUpdateProfile}
              disabled={savingProfile}
            >
              {savingProfile ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>Guardar cambios</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Cambiar contraseña</Text>

          <Text style={styles.fieldLabel}>Contraseña actual</Text>
          <TextInput
            style={styles.input}
            secureTextEntry
            placeholder="Introduce tu contraseña actual"
            value={passwords.contrasena_actual}
            onChangeText={(v) =>
              setPasswords((c) => ({ ...c, contrasena_actual: v }))
            }
          />

          <Text style={styles.fieldLabel}>Nueva contraseña</Text>
          <TextInput
            style={styles.input}
            secureTextEntry
            placeholder="Min. 8 car., mayus., minus., num. y especial"
            value={passwords.contrasena_nueva}
            onChangeText={(v) =>
              setPasswords((c) => ({ ...c, contrasena_nueva: v }))
            }
          />

          <Text style={styles.fieldLabel}>Confirmar nueva contraseña</Text>
          <TextInput
            style={styles.input}
            secureTextEntry
            placeholder="Repite la nueva contraseña"
            value={passwords.confirmar}
            onChangeText={(v) =>
              setPasswords((c) => ({ ...c, confirmar: v }))
            }
          />

          <TouchableOpacity
            style={[styles.secondaryButton, savingPassword && styles.buttonDisabled]}
            onPress={handleChangePassword}
            disabled={savingPassword}
          >
            {savingPassword ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.secondaryButtonText}>Cambiar contraseña</Text>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Cerrar sesion</Text>
        </TouchableOpacity>
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
    padding: 16,
    paddingBottom: 40,
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
  userBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#1E3A8A",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 22,
    fontFamily: theme.typography.bold,
    fontWeight: "700",
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    color: "#111827",
    fontSize: 17,
    fontFamily: theme.typography.medium,
    fontWeight: "600",
  },
  userEmail: {
    color: "#6B7280",
    fontSize: 13,
    fontFamily: theme.typography.regular,
    marginTop: 2,
  },
  rolePill: {
    alignSelf: "flex-start",
    marginTop: 6,
    backgroundColor: "#E0E7FF",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  rolePillText: {
    color: "#1E3A8A",
    fontSize: 12,
    fontFamily: theme.typography.medium,
    fontWeight: "600",
  },
  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    color: "#111827",
    fontFamily: theme.typography.bold,
    fontWeight: "700",
    marginBottom: 16,
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
    borderColor: "#D1D5DB",
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
    fontFamily: theme.typography.regular,
    fontSize: 15,
  },
  readOnlyField: {
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
    fontFamily: theme.typography.regular,
    fontSize: 15,
    color: "#64748B",
  },
  primaryButton: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: "#1E3A8A",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 4,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontFamily: theme.typography.medium,
    fontWeight: "600",
    fontSize: 15,
  },
  secondaryButton: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: "#0F766E",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 4,
  },
  secondaryButtonText: {
    color: "#FFFFFF",
    fontFamily: theme.typography.medium,
    fontWeight: "600",
    fontSize: 15,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  logoutButton: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: "#DC2626",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  logoutButtonText: {
    color: "#FFFFFF",
    fontFamily: theme.typography.medium,
    fontWeight: "600",
    fontSize: 15,
  },
});
