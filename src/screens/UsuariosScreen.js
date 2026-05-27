import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import {
  getUsers,
  updateUser,
  deleteUser,
  registerEmployee,
} from "../services/userService";
import theme from "../theme";

const ROLES = [
  { value: "cliente", label: "Cliente" },
  { value: "empleado", label: "Empleado" },
  { value: "capataz", label: "Capataz" },
];

export default function UsuariosScreen() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [filter, setFilter] = useState("all");
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState("lista");

  const [newEmployee, setNewEmployee] = useState({
    nombre: "",
    email: "",
    contrasena: "",
    telefono: "",
    direccion: "",
    especialidad: "",
    anos_experiencia: "",
  });
  const [submittingEmployee, setSubmittingEmployee] = useState(false);
  const [employeeErrors, setEmployeeErrors] = useState({});

  const loadUsers = useCallback(async ({ showLoader = true } = {}) => {
    try {
      if (showLoader && users.length === 0) {
        setLoading(true);
      }
      const data = await getUsers();
      setUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      Alert.alert("Error", "No se pudieron cargar los usuarios.");
    } finally {
      if (showLoader && users.length === 0) {
        setLoading(false);
      }
    }
  }, [users.length]);

  useFocusEffect(
    useCallback(() => {
      loadUsers();
      const refreshInterval = setInterval(() => {
        loadUsers({ showLoader: false });
      }, 10000);

      return () => clearInterval(refreshInterval);
    }, [loadUsers])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadUsers({ showLoader: false });
    setRefreshing(false);
  };

  const filteredUsers =
    filter === "all" ? users : users.filter((u) => u.rol === filter);

  const startEditing = (user) => {
    setEditingId(user._id);
    setEditForm({
      nombre: user.nombre,
      email: user.email,
      rol: user.rol,
      especialidad: user.especialidad || "",
      telefono: user.telefono || "",
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleSave = async () => {
    if (!editForm.nombre?.trim() || !editForm.email?.trim()) {
      Alert.alert("Faltan datos", "Nombre y email son obligatorios.");
      return;
    }

    try {
      setSaving(true);
      await updateUser(editingId, editForm);
      setEditingId(null);
      await loadUsers();
      Alert.alert("Usuario actualizado", "Los datos se han guardado.");
    } catch (error) {
      Alert.alert(
        "Error",
        error?.response?.data?.message || "No se pudo actualizar."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (user) => {
    Alert.alert(
      "Eliminar usuario",
      `Se eliminara a ${user.nombre}. Esta accion no se puede deshacer.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteUser(user._id);
              setUsers((current) =>
                current.filter((u) => u._id !== user._id)
              );
            } catch (error) {
              Alert.alert(
                "Error",
                error?.response?.data?.message || "No se pudo eliminar."
              );
            }
          },
        },
      ]
    );
  };

  const validatePassword = (pwd) => {
    if (pwd.length < 8) return "Minimo 8 caracteres.";
    if (!/[A-Z]/.test(pwd)) return "Debe incluir al menos una mayuscula.";
    if (!/[a-z]/.test(pwd)) return "Debe incluir al menos una minuscula.";
    if (!/[0-9]/.test(pwd)) return "Debe incluir al menos un numero.";
    if (!/[^A-Za-z0-9]/.test(pwd)) return "Debe incluir al menos un caracter especial.";
    return null;
  };

  const handleRegisterEmployee = async () => {
    setEmployeeErrors({});
    const localErrors = {};
    if (!newEmployee.nombre.trim()) {
      localErrors.nombre = "El nombre es obligatorio.";
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!newEmployee.email.trim()) {
      localErrors.email = "El email es obligatorio.";
    } else if (!emailRegex.test(newEmployee.email.trim())) {
      localErrors.email = "El email no tiene un formato valido.";
    }
    if (!newEmployee.contrasena) {
      localErrors.contrasena = "La contraseña es obligatoria.";
    } else {
      const pwdError = validatePassword(newEmployee.contrasena);
      if (pwdError) localErrors.contrasena = pwdError;
    }
    if (!newEmployee.telefono.trim()) {
      localErrors.telefono = "El telefono es obligatorio.";
    }
    if (!newEmployee.direccion.trim()) {
      localErrors.direccion = "La direccion es obligatoria.";
    }
    if (!newEmployee.especialidad.trim()) {
      localErrors.especialidad = "La especialidad es obligatoria.";
    }
    if (!newEmployee.anos_experiencia.trim()) {
      localErrors.anos_experiencia = "Los anos de experiencia son obligatorios.";
    }

    if (Object.keys(localErrors).length > 0) {
      setEmployeeErrors(localErrors);
      return;
    }

    try {
      setSubmittingEmployee(true);
      await registerEmployee({
        ...newEmployee,
        anos_experiencia: Number(newEmployee.anos_experiencia),
      });
      const credEmail = newEmployee.email;
      const credPass = newEmployee.contrasena;
      setNewEmployee({
        nombre: "", email: "", contrasena: "",
        telefono: "", direccion: "", especialidad: "", anos_experiencia: "",
      });
      setActiveSection("lista");
      await loadUsers();
      Alert.alert(
        "Empleado registrado",
        `Datos de acceso del trabajador:\n\nEmail: ${credEmail}\nContraseña: ${credPass}\n\nEl empleado debera cambiar la contraseña en su primer inicio de sesion.`
      );
    } catch (error) {
      const serverErrors = error?.response?.data?.errors;
      if (serverErrors && typeof serverErrors === "object") {
        setEmployeeErrors(serverErrors);
      } else {
        Alert.alert(
          "Error",
          error?.response?.data?.message || "No se pudo registrar al empleado."
        );
      }
    } finally {
      setSubmittingEmployee(false);
    }
  };

  const updateEmployeeField = (field, value) => {
    setNewEmployee((c) => ({ ...c, [field]: value }));
    if (employeeErrors[field]) {
      setEmployeeErrors((c) => {
        const next = { ...c };
        delete next[field];
        return next;
      });
    }
  };

  const renderEmployeeError = (field) => {
    if (!employeeErrors[field]) return null;
    return <Text style={styles.fieldError}>{employeeErrors[field]}</Text>;
  };

  const renderUser = ({ item }) => {
    const isEditing = editingId === item._id;

    if (isEditing) {
      return (
        <View style={styles.card}>
          <TextInput
            style={styles.input}
            value={editForm.nombre}
            returnKeyType="done"
            onChangeText={(v) =>
              setEditForm((c) => ({ ...c, nombre: v }))
            }
            placeholder="Nombre"
          />
          <TextInput
            style={styles.input}
            value={editForm.email}
            returnKeyType="done"
            onChangeText={(v) =>
              setEditForm((c) => ({ ...c, email: v }))
            }
            placeholder="Email"
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <Text style={styles.fieldLabel}>Rol</Text>
          <View style={styles.chipRow}>
            {ROLES.map((r) => (
              <TouchableOpacity
                key={r.value}
                style={[
                  styles.chip,
                  editForm.rol === r.value && styles.chipSelected,
                ]}
                onPress={() =>
                  setEditForm((c) => ({ ...c, rol: r.value }))
                }
              >
                <Text
                  style={[
                    styles.chipText,
                    editForm.rol === r.value && styles.chipTextSelected,
                  ]}
                >
                  {r.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            style={styles.input}
            value={editForm.especialidad}
            returnKeyType="done"
            onChangeText={(v) =>
              setEditForm((c) => ({ ...c, especialidad: v }))
            }
            placeholder="Especialidad"
          />
          <TextInput
            style={styles.input}
            value={editForm.telefono}
            returnKeyType="done"
            onChangeText={(v) =>
              setEditForm((c) => ({ ...c, telefono: v }))
            }
            placeholder="Telefono"
            keyboardType="phone-pad"
          />
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={cancelEditing}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveButton, saving && styles.buttonDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              <Text style={styles.saveButtonText}>
                {saving ? "Guardando..." : "Guardar"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardInfo}>
            <Text style={styles.userName}>{item.nombre}</Text>
            <Text style={styles.userMeta}>{item.email}</Text>
            {item.especialidad ? (
              <Text style={styles.userMeta}>
                {item.especialidad}
                {item.anos_experiencia
                  ? ` · ${item.anos_experiencia} anos`
                  : ""}
              </Text>
            ) : null}
            {item.telefono ? (
              <Text style={styles.userMeta}>{item.telefono}</Text>
            ) : null}
          </View>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>{item.rol}</Text>
          </View>
        </View>
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => startEditing(item)}
          >
            <Text style={styles.editButtonText}>Editar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDelete(item)}
          >
            <Text style={styles.deleteButtonText}>Eliminar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Usuarios</Text>
        <Text style={styles.subtitle}>
          Gestiona los usuarios registrados en el sistema.
        </Text>
      </View>

      <View style={styles.sectionTabs}>
        <TouchableOpacity
          style={[
            styles.sectionPill,
            activeSection === "lista" && styles.sectionPillActive,
          ]}
          onPress={() => setActiveSection("lista")}
        >
          <Text
            style={[
              styles.sectionPillText,
              activeSection === "lista" && styles.sectionPillTextActive,
            ]}
          >
            Lista ({users.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.sectionPill,
            activeSection === "alta" && styles.sectionPillActive,
          ]}
          onPress={() => setActiveSection("alta")}
        >
          <Text
            style={[
              styles.sectionPillText,
              activeSection === "alta" && styles.sectionPillTextActive,
            ]}
          >
            Añadir Trabajador
          </Text>
        </TouchableOpacity>
      </View>

      {activeSection === "lista" ? (
        <>
          <View style={styles.filterRow}>
            {[{ value: "all", label: "Todos" }, ...ROLES].map((f) => (
              <TouchableOpacity
                key={f.value}
                style={[
                  styles.filterPill,
                  filter === f.value && styles.filterPillActive,
                ]}
                onPress={() => setFilter(f.value)}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    filter === f.value && styles.filterPillTextActive,
                  ]}
                >
                  {f.label} {f.value === "all" ? `(${users.length})` : ""}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <FlatList
            data={filteredUsers}
            keyExtractor={(item) => item._id}
            renderItem={renderUser}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            refreshing={refreshing}
            onRefresh={handleRefresh}
            ListEmptyComponent={
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>
                  No hay usuarios con este filtro.
                </Text>
              </View>
            }
          />
        </>
      ) : (
        <ScrollView
          contentContainerStyle={styles.formScrollContent}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Alta de empleado</Text>
            <Text style={styles.formSubtitle}>
              Da de alta a un nuevo empleado con acceso a la app.
            </Text>

            <TextInput
              placeholder="Nombre completo"
              value={newEmployee.nombre}
              returnKeyType="done"
              onChangeText={(v) => updateEmployeeField("nombre", v)}
              style={[
                styles.input,
                employeeErrors.nombre && styles.inputError,
              ]}
            />
            {renderEmployeeError("nombre")}

            <TextInput
              placeholder="Email del empleado"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={newEmployee.email}
              returnKeyType="done"
              onChangeText={(v) => updateEmployeeField("email", v)}
              style={[
                styles.input,
                employeeErrors.email && styles.inputError,
              ]}
            />
            {renderEmployeeError("email")}

            <TextInput
              placeholder="Contraseña temporal (min. 8 car.)"
              secureTextEntry
              value={newEmployee.contrasena}
              returnKeyType="done"
              onChangeText={(v) => updateEmployeeField("contrasena", v)}
              style={[
                styles.input,
                employeeErrors.contrasena && styles.inputError,
              ]}
            />
            {renderEmployeeError("contrasena")}

            <TextInput
              placeholder="Telefono"
              keyboardType="phone-pad"
              value={newEmployee.telefono}
              returnKeyType="done"
              onChangeText={(v) => updateEmployeeField("telefono", v)}
              style={[
                styles.input,
                employeeErrors.telefono && styles.inputError,
              ]}
            />
            {renderEmployeeError("telefono")}

            <TextInput
              placeholder="Direccion"
              value={newEmployee.direccion}
              returnKeyType="done"
              onChangeText={(v) => updateEmployeeField("direccion", v)}
              style={[
                styles.input,
                employeeErrors.direccion && styles.inputError,
              ]}
            />
            {renderEmployeeError("direccion")}

            <TextInput
              placeholder="Especialidad (ej: Electricista)"
              value={newEmployee.especialidad}
              returnKeyType="done"
              onChangeText={(v) => updateEmployeeField("especialidad", v)}
              style={[
                styles.input,
                employeeErrors.especialidad && styles.inputError,
              ]}
            />
            {renderEmployeeError("especialidad")}

            <TextInput
              placeholder="Anos de experiencia"
              keyboardType="numeric"
              value={newEmployee.anos_experiencia}
              returnKeyType="done"
              onChangeText={(v) => updateEmployeeField("anos_experiencia", v.replace(/[^0-9]/g, ""))}
              style={[
                styles.input,
                employeeErrors.anos_experiencia && styles.inputError,
              ]}
            />
            {renderEmployeeError("anos_experiencia")}

            <View style={styles.rolBadgeRow}>
              <View style={styles.rolBadge}>
                <Text style={styles.rolBadgeText}>Rol: Empleado</Text>
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.saveButton,
                { marginTop: 4 },
                submittingEmployee && styles.buttonDisabled,
              ]}
              onPress={handleRegisterEmployee}
              disabled={submittingEmployee}
            >
              {submittingEmployee ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.saveButtonText}>Registrar empleado</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 10,
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
  sectionTabs: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  sectionPill: {
    borderRadius: 999,
    backgroundColor: "#E2E8F0",
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  sectionPillActive: {
    backgroundColor: "#0F766E",
  },
  sectionPillText: {
    color: "#334155",
    fontFamily: theme.typography.medium,
    fontSize: 13,
  },
  sectionPillTextActive: {
    color: "#FFFFFF",
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  filterPill: {
    borderRadius: 999,
    backgroundColor: "#E2E8F0",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterPillActive: {
    backgroundColor: "#1E3A8A",
  },
  filterPillText: {
    color: "#334155",
    fontFamily: theme.typography.medium,
    fontSize: 13,
  },
  filterPillTextActive: {
    color: "#FFFFFF",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  cardInfo: {
    flex: 1,
    marginRight: 10,
  },
  userName: {
    fontSize: 17,
    color: "#111827",
    fontFamily: theme.typography.medium,
  },
  userMeta: {
    marginTop: 3,
    color: "#6B7280",
    fontSize: 13,
    fontFamily: theme.typography.regular,
  },
  roleBadge: {
    backgroundColor: "#DBEAFE",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  roleBadgeText: {
    color: "#1E3A8A",
    fontFamily: theme.typography.medium,
    fontSize: 12,
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  editButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: 10,
    backgroundColor: "#1E3A8A",
    justifyContent: "center",
    alignItems: "center",
  },
  editButtonText: {
    color: "#FFFFFF",
    fontFamily: theme.typography.medium,
    fontSize: 14,
  },
  deleteButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: 10,
    backgroundColor: "#DC2626",
    justifyContent: "center",
    alignItems: "center",
  },
  deleteButtonText: {
    color: "#FFFFFF",
    fontFamily: theme.typography.medium,
    fontSize: 14,
  },
  input: {
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 10,
    fontFamily: theme.typography.regular,
  },
  inputError: {
    borderColor: "#B91C1C",
    marginBottom: 4,
  },
  fieldError: {
    color: "#B91C1C",
    fontSize: 13,
    fontFamily: theme.typography.regular,
    marginBottom: 8,
    marginLeft: 4,
  },
  fieldLabel: {
    color: "#334155",
    fontSize: 13,
    fontFamily: theme.typography.medium,
    marginBottom: 6,
  },
  chipRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipSelected: {
    backgroundColor: "#1E3A8A",
    borderColor: "#1E3A8A",
  },
  chipText: {
    color: "#334155",
    fontFamily: theme.typography.medium,
    fontSize: 13,
  },
  chipTextSelected: {
    color: "#FFFFFF",
  },
  cancelButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    justifyContent: "center",
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#374151",
    fontFamily: theme.typography.medium,
    fontSize: 14,
  },
  saveButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: 10,
    backgroundColor: "#0F766E",
    justifyContent: "center",
    alignItems: "center",
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontFamily: theme.typography.medium,
    fontSize: 14,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
  },
  emptyText: {
    color: "#6B7280",
    fontFamily: theme.typography.regular,
  },
  formScrollContent: {
    paddingBottom: 40,
  },
  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 20,
    marginHorizontal: 16,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  formTitle: {
    fontSize: 18,
    color: "#111827",
    fontFamily: theme.typography.bold,
    fontWeight: "700",
    marginBottom: 4,
  },
  formSubtitle: {
    color: "#6B7280",
    fontSize: 13,
    fontFamily: theme.typography.regular,
    marginBottom: 16,
  },
  rolBadgeRow: {
    marginBottom: 12,
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
});
