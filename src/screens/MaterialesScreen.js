import { useCallback, useMemo, useRef, useState } from "react";
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
import NetInfo from "@react-native-community/netinfo";
import { useFocusEffect } from "@react-navigation/native";
import {
  assignMaterialToTask,
  createMaterial,
  getMaterials,
  getOfflineConsumptions,
  postMaterialConsumption,
  replenishMaterialStock,
  saveOfflineConsumption,
  syncOfflineConsumptions,
} from "../services/materialService";
import { getTasks } from "../services/taskService";
import { useAuth } from "../context/AuthContext";
import theme from "../theme";
import {
  formatDecimalDisplay,
  parseDecimalInput,
  sanitizeDecimalInput,
  sanitizeIntegerInput,
} from "../utils/numberInputs";

export default function MaterialesScreen() {
  const { session } = useAuth();
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [quantities, setQuantities] = useState({});
  const [assignmentValues, setAssignmentValues] = useState({});
  const [restockValues, setRestockValues] = useState({});
  const [syncing, setSyncing] = useState(false);
  const [savingMaterial, setSavingMaterial] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [selectedTasks, setSelectedTasks] = useState({});
  const [activeSection, setActiveSection] = useState("stock");
  const syncingRef = useRef(false);
  const [newMaterial, setNewMaterial] = useState({
    concepto: "",
    cantidad: "",
    precio_unitario: "",
  });

  const criticalMaterials = useMemo(
    () => materials.filter((material) => material.stock_critico),
    [materials]
  );

  const assignableTasks = useMemo(
    () => tasks.filter((task) => task.estado !== "Completada"),
    [tasks]
  );

  const employeeAssignments = useMemo(
    () =>
      tasks.flatMap((task) =>
        (task.materialesAsignados || [])
          .filter((assignment) => {
            const material = assignment.material;
            const remaining =
              Number(assignment.cantidadAsignada || 0) -
              Number(assignment.cantidadConsumida || 0);
            return material && remaining > 0 && task.estado !== "Completada";
          })
          .map((assignment) => ({
            key: `${task._id}-${assignment.material._id}`,
            taskId: task._id,
            taskName: task.nombre,
            projectName: task.proyecto?.nombre,
            material: assignment.material,
            cantidadAsignada: Number(assignment.cantidadAsignada || 0),
            cantidadConsumida: Number(assignment.cantidadConsumida || 0),
            restante:
              Number(assignment.cantidadAsignada || 0) -
              Number(assignment.cantidadConsumida || 0),
          }))
      ),
    [tasks]
  );

  const loadMaterials = useCallback(async ({ showLoader = true } = {}) => {
    if (showLoader && materials.length === 0) {
      setLoading(true);
    }
    try {
      const data = await getMaterials();
      const normalized = Array.isArray(data) ? data : [];

      setMaterials(normalized);
      setQuantities((current) =>
        normalized.reduce((acc, material) => {
          acc[material._id] = current[material._id] || "";
          return acc;
        }, {})
      );
      setRestockValues((current) =>
        normalized.reduce((acc, material) => {
          acc[material._id] = current[material._id] || "";
          return acc;
        }, {})
      );
      setAssignmentValues((current) =>
        normalized.reduce((acc, material) => {
          acc[material._id] = current[material._id] || "";
          return acc;
        }, {})
      );

      const taskData = await getTasks();
      const normalizedTasks = Array.isArray(taskData) ? taskData : [];
      setTasks(normalizedTasks);
      setQuantities((current) =>
        normalizedTasks.reduce((acc, task) => {
          (task.materialesAsignados || []).forEach((assignment) => {
            if (assignment.material?._id) {
              const key = `${task._id}-${assignment.material._id}`;
              acc[key] = current[key] || "";
            }
          });
          return acc;
        }, {})
      );
    } catch {
      if (showLoader && materials.length === 0) {
        Alert.alert("Error", "No se pudieron cargar los materiales.");
      }
    } finally {
      if (showLoader && materials.length === 0) {
        setLoading(false);
      }
    }
  }, [materials.length]);

  useFocusEffect(
    useCallback(() => {
      loadMaterials();

      const unsubscribe = NetInfo.addEventListener((state) => {
        if (state.isConnected) {
          syncPendingConsumptions();
        }
      });

      return () => {
        unsubscribe();
      };
    }, [loadMaterials])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadMaterials({ showLoader: false });
    setRefreshing(false);
  };

  const updateQuantity = (materialId, value, setter) => {
    const normalized = sanitizeIntegerInput(value);
    setter((current) => ({
      ...current,
      [materialId]: normalized,
    }));
  };

  const updateLocalMaterial = (materialId, nextMaterial) => {
    setMaterials((current) =>
      current.map((material) =>
        material._id === materialId ? nextMaterial : material
      )
    );
  };

  const syncPendingConsumptions = async () => {
    if (syncingRef.current) {
      return;
    }

    const pending = await getOfflineConsumptions();

    if (!pending.length) {
      return;
    }

    syncingRef.current = true;
    setSyncing(true);

    try {
      const result = await syncOfflineConsumptions();

      if (result.synced > 0) {
        await loadMaterials();
        Alert.alert(
          "Sincronizacion completada",
          "Los consumos guardados offline se han enviado correctamente."
        );
      }
    } finally {
      syncingRef.current = false;
      setSyncing(false);
    }
  };

  const handleConfirmConsumption = async (assignment) => {
    const cantidad = Number(quantities[assignment.key] || 0);

    if (!cantidad || cantidad <= 0) {
      Alert.alert("Cantidad invalida", "Selecciona una cantidad mayor que cero.");
      return;
    }

    if (cantidad > assignment.restante) {
      Alert.alert(
        "Cantidad invalida",
        `No puedes consumir mas de lo asignado. Disponible: ${assignment.restante}.`
      );
      return;
    }

    const payload = {
      materialId: assignment.material._id,
      cantidad,
      tarea: assignment.taskId,
    };

    const networkState = await NetInfo.fetch();

    if (networkState.isConnected) {
      try {
        const response = await postMaterialConsumption(payload);
        updateLocalMaterial(assignment.material._id, response.material);
        setQuantities((current) => ({
          ...current,
          [assignment.key]: "",
        }));
        await loadMaterials({ showLoader: false });
        Alert.alert("Consumo registrado", "El consumo se envio correctamente.");
      } catch (error) {
        Alert.alert(
          "Error",
          error?.response?.data?.message ||
            "No se pudo registrar el consumo del material."
        );
      }

      return;
    }

    await saveOfflineConsumption(payload);
    setQuantities((current) => ({
      ...current,
      [assignment.key]: "",
    }));
    Alert.alert("Sin conexion", "Guardado offline. Pendiente de sincronizar.");
  };

  const handleAssignToTask = async (material) => {
    const cantidad = Number(assignmentValues[material._id] || 0);
    const tarea = selectedTasks[material._id];

    if (!tarea) {
      Alert.alert("Tarea obligatoria", "Selecciona la tarea que recibira el material.");
      return;
    }

    if (!cantidad || cantidad <= 0) {
      Alert.alert("Cantidad invalida", "Indica una asignacion mayor que cero.");
      return;
    }

    if (cantidad > material.cantidad) {
      Alert.alert(
        "Stock insuficiente",
        `Solo hay ${material.cantidad} unidades disponibles.`
      );
      return;
    }

    try {
      const response = await assignMaterialToTask({
        materialId: material._id,
        cantidad,
        tarea,
      });
      updateLocalMaterial(material._id, response.material);
      setAssignmentValues((current) => ({
        ...current,
        [material._id]: "",
      }));
      setSelectedTasks((current) => ({ ...current, [material._id]: null }));
      await loadMaterials({ showLoader: false });
      Alert.alert("Material asignado", "El stock se desconto y quedo vinculado a la tarea.");
    } catch (error) {
      Alert.alert(
        "Error",
        error?.response?.data?.message || "No se pudo asignar el material."
      );
    }
  };

  const handleRestock = async (material) => {
    const cantidad = Number(restockValues[material._id] || 0);

    if (!cantidad || cantidad <= 0) {
      Alert.alert("Cantidad invalida", "Indica una reposicion mayor que cero.");
      return;
    }

    try {
      const response = await replenishMaterialStock({
        materialId: material._id,
        cantidad,
      });
      updateLocalMaterial(material._id, response.material);
      setRestockValues((current) => ({
        ...current,
        [material._id]: "",
      }));
    } catch (error) {
      Alert.alert(
        "Error",
        error?.response?.data?.message || "No se pudo reponer el stock."
      );
    }
  };

  const handleCreateMaterial = async () => {
    if (
      !newMaterial.concepto.trim() ||
      newMaterial.cantidad === "" ||
      newMaterial.precio_unitario === ""
    ) {
      Alert.alert(
        "Faltan datos",
        "Concepto, cantidad y precio unitario son obligatorios."
      );
      return;
    }

    try {
      setSavingMaterial(true);
      const response = await createMaterial({
        concepto: newMaterial.concepto,
        cantidad: Number(newMaterial.cantidad),
        precio_unitario: parseDecimalInput(newMaterial.precio_unitario),
      });

      setMaterials((current) =>
        [...current, response.material].sort((a, b) =>
          a.concepto.localeCompare(b.concepto)
        )
      );
      setNewMaterial({
        concepto: "",
        cantidad: "",
        precio_unitario: "",
      });
      setActiveSection("stock");
    } catch (error) {
      Alert.alert(
        "Error",
        error?.response?.data?.message || "No se pudo crear el material."
      );
    } finally {
      setSavingMaterial(false);
    }
  };

  const renderMaterial = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.materialName}>{item.concepto}</Text>
          <Text style={styles.stockText}>
            Stock disponible: {item.cantidad} · Precio:{" "}
            {formatDecimalDisplay(item.precio_unitario, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{" "}
            EUR
          </Text>
        </View>
        {item.stock_critico ? (
          <View style={styles.alertBadge}>
            <Text style={styles.alertBadgeText}>Critico</Text>
          </View>
        ) : null}
      </View>

      {session.role === "capataz" ? (
      <View style={styles.actionBlock}>
        <Text style={styles.actionLabel}>Asignar a tarea</Text>
        {assignableTasks.length > 0 ? (
          <View style={styles.taskPickerRow}>
            <Text style={styles.taskPickerLabel}>Tarea:</Text>
            <FlatList
              horizontal
              data={assignableTasks}
              keyExtractor={(t) => t._id || "none"}
              showsHorizontalScrollIndicator={false}
              renderItem={({ item: t }) => (
                <TouchableOpacity
                  style={[
                    styles.taskChip,
                    (selectedTasks[item._id] || null) === t._id && styles.taskChipSelected,
                  ]}
                  onPress={() =>
                    setSelectedTasks((c) => ({ ...c, [item._id]: t._id }))
                  }
                >
                  <Text
                    style={[
                      styles.taskChipText,
                      (selectedTasks[item._id] || null) === t._id && styles.taskChipTextSelected,
                    ]}
                    numberOfLines={1}
                  >
                    {t.nombre}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        ) : (
          <Text style={styles.helperText}>No hay tareas activas para asignar.</Text>
        )}
        <View style={styles.quantityRow}>
          <TextInput
            style={styles.quantityInput}
            keyboardType="numeric"
            placeholder="0"
            value={assignmentValues[item._id] || ""}
            returnKeyType="done"
            onChangeText={(value) =>
              updateQuantity(item._id, value, setAssignmentValues)
            }
          />
          <TouchableOpacity
            style={styles.confirmButton}
            onPress={() => handleAssignToTask(item)}
          >
            <Text style={styles.confirmButtonText}>Asignar</Text>
          </TouchableOpacity>
        </View>
      </View>
      ) : null}

      {session.role === "capataz" ? (
        <View style={styles.actionBlock}>
          <Text style={styles.actionLabel}>Reponer stock</Text>
          <View style={styles.quantityRow}>
            <TextInput
              style={styles.quantityInput}
              keyboardType="numeric"
              placeholder="0"
              value={restockValues[item._id] || ""}
              returnKeyType="done"
              onChangeText={(value) =>
                updateQuantity(item._id, value, setRestockValues)
              }
            />
            <TouchableOpacity
              style={styles.restockButton}
              onPress={() => handleRestock(item)}
            >
              <Text style={styles.confirmButtonText}>Reponer</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
    </View>
  );

  const renderAssignedMaterial = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.materialName}>{item.material.concepto}</Text>
          <Text style={styles.stockText}>
            Tarea: {item.taskName}
            {item.projectName ? ` | Proyecto: ${item.projectName}` : ""}
          </Text>
          <Text style={styles.stockText}>
            Asignado: {item.cantidadAsignada} | Consumido:{" "}
            {item.cantidadConsumida} | Disponible: {item.restante}
          </Text>
        </View>
      </View>

      <View style={styles.actionBlock}>
        <Text style={styles.actionLabel}>Consumo real</Text>
        <View style={styles.quantityRow}>
          <TextInput
            style={styles.quantityInput}
            keyboardType="numeric"
            placeholder="0"
            value={quantities[item.key] || ""}
            returnKeyType="done"
            onChangeText={(value) => updateQuantity(item.key, value, setQuantities)}
          />
          <TouchableOpacity
            style={styles.confirmButton}
            onPress={() => handleConfirmConsumption(item)}
          >
            <Text style={styles.confirmButtonText}>Registrar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderSectionButton = (id, label, count) => {
    const active = activeSection === id;

    return (
      <TouchableOpacity
        key={id}
        style={[styles.sectionPill, active && styles.sectionPillActive]}
        onPress={() => setActiveSection(id)}
      >
        <Text style={[styles.sectionPillText, active && styles.sectionPillTextActive]}>
          {label}
          {typeof count === "number" ? ` (${count})` : ""}
        </Text>
      </TouchableOpacity>
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
        <Text style={styles.headerTitle}>Materiales</Text>
        <Text style={styles.headerSubtitle}>
          {session.role === "capataz"
            ? "Controla stock, reposicion y asignacion de materiales a tareas."
            : "Registra el consumo real de los materiales asignados a tus tareas."}
        </Text>
        {syncing ? <Text style={styles.syncingText}>Sincronizando pendientes...</Text> : null}
      </View>

      <View style={styles.sectionTabs}>
        {session.role === "capataz"
          ? renderSectionButton("stock", "Stock", materials.length)
          : renderSectionButton("stock", "Asignados", employeeAssignments.length)}
        {session.role === "capataz"
          ? renderSectionButton("critical", "Alertas", criticalMaterials.length)
          : null}
        {session.role === "capataz" ? renderSectionButton("new", "Nuevo material") : null}
      </View>

      {activeSection === "new" && session.role === "capataz" ? (
        <ScrollView
          contentContainerStyle={styles.formScrollContent}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Alta de material</Text>
            <TextInput
              style={styles.input}
              placeholder="Concepto"
              value={newMaterial.concepto}
              returnKeyType="done"
              onChangeText={(value) =>
                setNewMaterial((current) => ({ ...current, concepto: value }))
              }
            />
            <TextInput
              style={styles.input}
              placeholder="Cantidad inicial"
              keyboardType="numeric"
              value={newMaterial.cantidad}
              returnKeyType="done"
              onChangeText={(value) =>
                setNewMaterial((current) => ({
                  ...current,
                  cantidad: sanitizeIntegerInput(value),
                }))
              }
            />
            <TextInput
              style={styles.input}
              placeholder="Precio unitario"
              keyboardType="decimal-pad"
              value={newMaterial.precio_unitario}
              returnKeyType="done"
              onChangeText={(value) =>
                setNewMaterial((current) => ({
                  ...current,
                  precio_unitario: sanitizeDecimalInput(value),
                }))
              }
            />
            <TouchableOpacity
              style={[styles.primaryButton, savingMaterial && styles.buttonDisabled]}
              onPress={handleCreateMaterial}
              disabled={savingMaterial}
            >
              <Text style={styles.primaryButtonText}>
                {savingMaterial ? "Guardando..." : "Crear material"}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : null}

      {activeSection === "critical" ? (
        <FlatList
          data={criticalMaterials}
          keyExtractor={(item) => item._id}
          renderItem={renderMaterial}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          refreshing={refreshing}
          onRefresh={handleRefresh}
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>
                No hay materiales en stock critico ahora mismo.
              </Text>
            </View>
          }
        />
      ) : activeSection === "stock" ? (
        <FlatList
          data={session.role === "capataz" ? materials : employeeAssignments}
          keyExtractor={(item) =>
            session.role === "capataz" ? item._id : item.key
          }
          renderItem={
            session.role === "capataz" ? renderMaterial : renderAssignedMaterial
          }
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          refreshing={refreshing}
          onRefresh={handleRefresh}
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>
                {session.role === "capataz"
                  ? "No hay materiales registrados."
                  : "No hay materiales asignados a tus tareas activas."}
              </Text>
            </View>
          }
        />
      ) : null}
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
  headerTitle: {
    fontSize: 28,
    color: "#102A43",
    fontFamily: theme.typography.bold,
    fontWeight: "700",
  },
  headerSubtitle: {
    marginTop: 6,
    color: "#6B7280",
    fontSize: 14,
    fontFamily: theme.typography.regular,
  },
  syncingText: {
    marginTop: 8,
    color: "#F97316",
    fontSize: 13,
    fontFamily: theme.typography.medium,
  },
  sectionTabs: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  sectionPill: {
    borderRadius: 999,
    backgroundColor: "#E2E8F0",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sectionPillActive: {
    backgroundColor: "#0F766E",
  },
  sectionPillText: {
    color: "#334155",
    fontFamily: theme.typography.medium,
  },
  sectionPillTextActive: {
    color: "#FFFFFF",
  },
  formScrollContent: {
    paddingBottom: 40,
  },
  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
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
    marginBottom: 12,
  },
  input: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
    fontFamily: theme.typography.regular,
  },
  primaryButton: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: "#1D4ED8",
    justifyContent: "center",
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontFamily: theme.typography.medium,
    fontWeight: "600",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  materialName: {
    fontSize: 18,
    color: "#111827",
    fontFamily: theme.typography.medium,
    marginBottom: 6,
  },
  stockText: {
    fontSize: 14,
    color: "#6B7280",
    fontFamily: theme.typography.regular,
  },
  alertBadge: {
    backgroundColor: "#FEE2E2",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  alertBadgeText: {
    color: "#B91C1C",
    fontFamily: theme.typography.medium,
    fontSize: 12,
  },
  taskPickerRow: {
    marginBottom: 8,
  },
  taskPickerLabel: {
    fontSize: 12,
    color: "#6B7280",
    fontFamily: theme.typography.regular,
    marginBottom: 6,
  },
  helperText: {
    color: "#64748B",
    fontFamily: theme.typography.regular,
    fontSize: 13,
    marginBottom: 8,
  },
  taskChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 6,
  },
  taskChipSelected: {
    backgroundColor: "#1E3A8A",
    borderColor: "#1E3A8A",
  },
  taskChipText: {
    color: "#334155",
    fontFamily: theme.typography.medium,
    fontSize: 12,
  },
  taskChipTextSelected: {
    color: "#FFFFFF",
  },
  actionBlock: {
    marginTop: 10,
  },
  actionLabel: {
    fontSize: 13,
    color: "#475569",
    fontFamily: theme.typography.medium,
    marginBottom: 8,
  },
  quantityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  quantityInput: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
    textAlign: "center",
    fontSize: 16,
    color: "#111827",
    fontFamily: theme.typography.medium,
  },
  confirmButton: {
    minHeight: 44,
    minWidth: 108,
    borderRadius: 10,
    backgroundColor: "#0F766E",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 14,
  },
  restockButton: {
    minHeight: 44,
    minWidth: 108,
    borderRadius: 10,
    backgroundColor: "#1D4ED8",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 14,
  },
  confirmButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontFamily: theme.typography.medium,
    fontWeight: "600",
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
  },
  emptyText: {
    color: "#64748B",
    fontFamily: theme.typography.regular,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});
