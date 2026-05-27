import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
  createBudget,
  getBudgets,
  getCachedBudgets,
  getOfflineBudgets,
  saveOfflineBudget,
  syncOfflineBudgets,
} from "../services/budgetService";
import { getCachedInvoices, getInvoices } from "../services/invoiceService";
import { getCachedProjects, getProjects } from "../services/projectService";
import theme from "../theme";
import {
  formatDecimalDisplay,
  parseDecimalInput,
  sanitizeDecimalInput,
  sanitizeIntegerInput,
} from "../utils/numberInputs";

const emptyItem = { concepto: "", cantidad: "1", precio_unitario: "" };

export default function FinanzasScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [projects, setProjects] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [syncingBudgets, setSyncingBudgets] = useState(false);
  const syncingBudgetsRef = useRef(false);
  const [expandedSection, setExpandedSection] = useState("create");
  const [form, setForm] = useState({
    proyecto: "",
    descripcion: "",
    partidas: [emptyItem],
  });

  const bootstrap = useCallback(async ({ showLoader = true } = {}) => {
    if (
      showLoader &&
      projects.length === 0 &&
      budgets.length === 0 &&
      invoices.length === 0
    ) {
      setLoading(true);
    }

    const [projectResult, budgetResult, invoiceResult, offlineBudgetResult] =
      await Promise.allSettled([
        getProjects(),
        getBudgets(),
        getInvoices(),
        getOfflineBudgets(),
      ]);

    const projectData =
      projectResult.status === "fulfilled"
        ? projectResult.value
        : await getCachedProjects();
    const budgetData =
      budgetResult.status === "fulfilled"
        ? budgetResult.value
        : await getCachedBudgets();
    const invoiceData =
      invoiceResult.status === "fulfilled"
        ? invoiceResult.value
        : await getCachedInvoices();
    const offlineBudgetData =
      offlineBudgetResult.status === "fulfilled" ? offlineBudgetResult.value : [];

    const normalizedProjects = Array.isArray(projectData) ? projectData : [];
    const normalizedBudgets = Array.isArray(budgetData) ? budgetData : [];
    const normalizedInvoices = Array.isArray(invoiceData) ? invoiceData : [];
    const pendingBudgets = Array.isArray(offlineBudgetData)
      ? offlineBudgetData
      : [];

    const offlineEntries = pendingBudgets.map((item) => ({
      _id: item.offlineId,
      proyecto:
        normalizedProjects.find((project) => project._id === item.proyecto) || {
          _id: item.proyecto,
          nombre: "Obra pendiente de sincronizar",
        },
      descripcion: item.descripcion,
      estado: "Pendiente de envio",
      total: item.partidas.reduce(
        (acc, partida) =>
          acc +
          Number(partida.cantidad) * parseDecimalInput(partida.precio_unitario),
        0
      ),
      offline: true,
    }));

    setProjects(normalizedProjects);
    setBudgets([...offlineEntries, ...normalizedBudgets]);
    setInvoices(normalizedInvoices);
    setForm((current) => ({
      ...current,
      proyecto:
        normalizedProjects.some((project) => project._id === current.proyecto)
          ? current.proyecto
          : normalizedProjects[0]?._id || "",
    }));
    if (
      showLoader &&
      projects.length === 0 &&
      budgets.length === 0 &&
      invoices.length === 0
    ) {
      setLoading(false);
    }
  }, [budgets.length, invoices.length, projects.length]);

  useFocusEffect(
    useCallback(() => {
      bootstrap();
      const refreshInterval = setInterval(() => {
        bootstrap({ showLoader: false });
      }, 10000);

      const unsubscribe = NetInfo.addEventListener((state) => {
        if (state.isConnected) {
          syncPendingBudgets();
        }
      });

      return () => {
        clearInterval(refreshInterval);
        unsubscribe();
      };
    }, [bootstrap])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await bootstrap({ showLoader: false });
    setRefreshing(false);
  };

  const updateItem = (index, field, value) => {
    setForm((current) => ({
      ...current,
      partidas: current.partidas.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  const addItem = () => {
    setForm((current) => ({
      ...current,
      partidas: [...current.partidas, emptyItem],
    }));
  };

  const removeItem = (index) => {
    setForm((current) => ({
      ...current,
      partidas:
        current.partidas.length === 1
          ? current.partidas
          : current.partidas.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const total = form.partidas.reduce((acc, item) => {
    const cantidad = Number(item.cantidad || 0);
    const precio = parseDecimalInput(item.precio_unitario);
    return acc + cantidad * precio;
  }, 0);

  const syncPendingBudgets = async () => {
    if (syncingBudgetsRef.current) {
      return;
    }

    const pending = await getOfflineBudgets();

    if (!pending.length) {
      return;
    }

    syncingBudgetsRef.current = true;
    setSyncingBudgets(true);

    try {
      const result = await syncOfflineBudgets();

      if (result.synced > 0) {
        await bootstrap();
        Alert.alert(
          "Sincronizacion completada",
          "Los presupuestos pendientes se han enviado correctamente."
        );
      }
    } finally {
      syncingBudgetsRef.current = false;
      setSyncingBudgets(false);
    }
  };

  const handleCreateBudget = async () => {
    const validItems = form.partidas.filter(
      (item) =>
        item.concepto.trim() &&
        item.precio_unitario.trim() !== "" &&
        Number(item.cantidad) > 0 &&
        parseDecimalInput(item.precio_unitario) >= 0
    );

    if (!form.proyecto || !validItems.length) {
      Alert.alert(
        "Faltan datos",
        "Selecciona una obra y anade al menos una partida valida."
      );
      return;
    }

    const payload = {
      proyecto: form.proyecto,
      descripcion: form.descripcion,
      partidas: validItems.map((item) => ({
        concepto: item.concepto.trim(),
        cantidad: Number(item.cantidad),
        precio_unitario: parseDecimalInput(item.precio_unitario),
      })),
    };

    try {
      setSaving(true);
      const networkState = await NetInfo.fetch();

      if (!networkState.isConnected) {
        await saveOfflineBudget(payload);
        await bootstrap();
        setExpandedSection("budgets");
        setForm((current) => ({
          proyecto: current.proyecto,
          descripcion: "",
          partidas: [emptyItem],
        }));
        Alert.alert(
          "Sin conexion",
          "Presupuesto guardado offline. Se enviara al reconectar."
        );
        return;
      }

      const response = await createBudget(payload);

      setBudgets((current) => [response.presupuesto, ...current]);
      setExpandedSection("budgets");
      setForm((current) => ({
        proyecto: current.proyecto,
        descripcion: "",
        partidas: [emptyItem],
      }));
      Alert.alert(
        "Presupuesto creado",
        "La obra ya aparece en la bandeja financiera."
      );
    } catch (error) {
      Alert.alert(
        "Error",
        error?.response?.data?.message || "No se pudo crear el presupuesto."
      );
    } finally {
      setSaving(false);
    }
  };

  const renderSectionHeader = (id, title, helper, count) => {
    const expanded = expandedSection === id;

    return (
      <TouchableOpacity
        style={styles.sectionHeader}
        onPress={() => setExpandedSection(expanded ? "" : id)}
      >
        <View style={styles.sectionHeaderText}>
          <Text style={styles.sectionHeaderTitle}>{title}</Text>
          <Text style={styles.sectionHeaderHelper}>
            {helper}
            {typeof count === "number" ? ` | ${count}` : ""}
          </Text>
        </View>
        <Text style={styles.sectionHeaderArrow}>{expanded ? "-" : "+"}</Text>
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
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      <Text style={styles.title}>Finanzas de Obra</Text>
      <Text style={styles.subtitle}>
        La pestana se refresca al volver aqui y separa creacion, presupuestos y facturas.
      </Text>
      {syncingBudgets ? (
        <Text style={styles.syncingText}>
          Sincronizando presupuestos pendientes...
        </Text>
      ) : null}

      <View style={styles.sectionCard}>
        {renderSectionHeader(
          "create",
          "Crear presupuesto",
          "Nueva propuesta economica para una obra",
          null
        )}
        {expandedSection === "create" ? (
          <View style={styles.sectionBody}>
            <Text style={styles.label}>Obra asociada</Text>
            <View style={styles.chipRow}>
              {projects.length ? (
                projects.map((project) => {
                  const selected = form.proyecto === project._id;

                  return (
                    <TouchableOpacity
                      key={project._id}
                      style={[styles.chip, selected && styles.chipSelected]}
                      onPress={() =>
                        setForm((current) => ({
                          ...current,
                          proyecto: project._id,
                        }))
                      }
                    >
                      <Text
                        style={[
                          styles.chipText,
                          selected && styles.chipTextSelected,
                        ]}
                      >
                        {project.nombre}
                      </Text>
                    </TouchableOpacity>
                  );
                })
              ) : (
                <Text style={styles.helperText}>
                  Crea antes una obra en la pestana de Obras.
                </Text>
              )}
            </View>

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Notas para el cliente"
              value={form.descripcion}
              onChangeText={(value) =>
                setForm((current) => ({ ...current, descripcion: value }))
              }
              multiline
            />

            {form.partidas.map((item, index) => (
              <View key={`partida-${index}`} style={styles.itemCard}>
                <TextInput
                  style={styles.input}
                  placeholder="Concepto"
                  value={item.concepto}
                  returnKeyType="done"
                  onChangeText={(value) => updateItem(index, "concepto", value)}
                />
                <View style={styles.itemRow}>
                  <TextInput
                    style={[styles.input, styles.itemInput]}
                    placeholder="Cantidad"
                    keyboardType="numeric"
                    value={item.cantidad}
                    returnKeyType="done"
                    onChangeText={(value) =>
                      updateItem(index, "cantidad", sanitizeIntegerInput(value))
                    }
                  />
                  <TextInput
                    style={[styles.input, styles.itemInput]}
                    placeholder="Precio unit."
                    keyboardType="decimal-pad"
                    value={item.precio_unitario}
                    returnKeyType="done"
                    onChangeText={(value) =>
                      updateItem(
                        index,
                        "precio_unitario",
                        sanitizeDecimalInput(value)
                      )
                    }
                  />
                </View>
                <TouchableOpacity
                  onPress={() => removeItem(index)}
                  style={styles.removeLink}
                >
                  <Text style={styles.removeLinkText}>Eliminar partida</Text>
                </TouchableOpacity>
              </View>
            ))}

            <TouchableOpacity style={styles.addButton} onPress={addItem}>
              <Text style={styles.addButtonText}>Anadir partida</Text>
            </TouchableOpacity>

            <Text style={styles.totalPreview}>
              Total estimado:{" "}
              {formatDecimalDisplay(total, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{" "}
              EUR
            </Text>

            <TouchableOpacity
              style={[styles.primaryButton, saving && styles.buttonDisabled]}
              onPress={handleCreateBudget}
              disabled={saving}
            >
              <Text style={styles.primaryButtonText}>
                {saving ? "Guardando..." : "Crear presupuesto"}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>

      <View style={styles.sectionCard}>
        {renderSectionHeader(
          "budgets",
          "Presupuestos emitidos",
          "Historial y estado",
          budgets.length
        )}
        {expandedSection === "budgets" ? (
          <View style={styles.sectionBody}>
            {budgets.length ? (
              budgets.map((budget) => (
                <View key={budget._id} style={styles.entryCard}>
                  <Text style={styles.entryTitle}>{budget.proyecto?.nombre}</Text>
                  <Text style={styles.entryMeta}>
                    Estado: {budget.estado} | Total:{" "}
                    {formatDecimalDisplay(budget.total, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    EUR
                  </Text>
                  {budget.descripcion ? (
                    <Text style={styles.entryDescription}>
                      {budget.descripcion}
                    </Text>
                  ) : null}
                </View>
              ))
            ) : (
              <Text style={styles.helperText}>
                Aun no hay presupuestos emitidos.
              </Text>
            )}
          </View>
        ) : null}
      </View>

      <View style={styles.sectionCard}>
        {renderSectionHeader(
          "invoices",
          "Facturas emitidas",
          "Se generan al aprobar presupuestos",
          invoices.length
        )}
        {expandedSection === "invoices" ? (
          <View style={styles.sectionBody}>
            {invoices.length ? (
              invoices.map((invoice) => (
                <View key={invoice._id} style={styles.entryCard}>
                  <Text style={styles.entryTitle}>{invoice.proyecto?.nombre}</Text>
                  <Text style={styles.entryMeta}>
                    {invoice.concepto || "Factura emitida"}
                  </Text>
                  <Text style={styles.invoiceTotal}>
                    {formatDecimalDisplay(invoice.total, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    EUR
                  </Text>
                </View>
              ))
            ) : (
              <Text style={styles.helperText}>
                Las facturas apareceran aqui cuando el cliente apruebe un presupuesto.
              </Text>
            )}
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F6F7FB",
  },
  content: {
    padding: 16,
    paddingBottom: 28,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F6F7FB",
  },
  title: {
    fontSize: 30,
    color: "#1E293B",
    fontFamily: theme.typography.bold,
    fontWeight: "700",
  },
  subtitle: {
    marginTop: 6,
    marginBottom: 18,
    color: "#64748B",
    fontFamily: theme.typography.regular,
    lineHeight: 22,
  },
  syncingText: {
    marginBottom: 12,
    color: "#B45309",
    fontFamily: theme.typography.medium,
  },
  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    marginBottom: 14,
    shadowColor: "#111827",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
    overflow: "hidden",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 18,
  },
  sectionHeaderText: {
    flex: 1,
    marginRight: 12,
  },
  sectionHeaderTitle: {
    color: "#111827",
    fontFamily: theme.typography.bold,
    fontWeight: "700",
    fontSize: 19,
  },
  sectionHeaderHelper: {
    marginTop: 4,
    color: "#64748B",
    fontFamily: theme.typography.regular,
    fontSize: 13,
  },
  sectionHeaderArrow: {
    color: "#1D4ED8",
    fontSize: 28,
    lineHeight: 28,
  },
  sectionBody: {
    paddingHorizontal: 18,
    paddingBottom: 18,
  },
  label: {
    color: "#334155",
    fontSize: 14,
    fontFamily: theme.typography.medium,
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#F8FAFC",
  },
  chipSelected: {
    backgroundColor: "#1D4ED8",
    borderColor: "#1D4ED8",
  },
  chipText: {
    color: "#334155",
    fontFamily: theme.typography.medium,
    fontSize: 13,
  },
  chipTextSelected: {
    color: "#FFFFFF",
  },
  input: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#D9E2EC",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#102A43",
    marginBottom: 12,
    fontFamily: theme.typography.regular,
  },
  textArea: {
    minHeight: 84,
    textAlignVertical: "top",
  },
  itemCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  itemRow: {
    flexDirection: "row",
    gap: 10,
  },
  itemInput: {
    flex: 1,
  },
  removeLink: {
    alignSelf: "flex-start",
  },
  removeLinkText: {
    color: "#DC2626",
    fontFamily: theme.typography.medium,
  },
  addButton: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  addButtonText: {
    color: "#1D4ED8",
    fontFamily: theme.typography.medium,
  },
  totalPreview: {
    color: "#0F766E",
    fontFamily: theme.typography.bold,
    fontWeight: "700",
    fontSize: 16,
    marginBottom: 12,
  },
  primaryButton: {
    minHeight: 50,
    borderRadius: 12,
    backgroundColor: "#0F766E",
    justifyContent: "center",
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontFamily: theme.typography.medium,
    fontWeight: "600",
    fontSize: 15,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  entryCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  entryTitle: {
    color: "#0F172A",
    fontFamily: theme.typography.bold,
    fontWeight: "700",
    fontSize: 16,
  },
  entryMeta: {
    color: "#64748B",
    marginTop: 5,
    fontFamily: theme.typography.regular,
  },
  entryDescription: {
    color: "#334155",
    marginTop: 8,
    fontFamily: theme.typography.regular,
    lineHeight: 20,
  },
  invoiceTotal: {
    color: "#1D4ED8",
    marginTop: 8,
    fontSize: 24,
    fontFamily: theme.typography.bold,
    fontWeight: "700",
  },
  helperText: {
    color: "#64748B",
    fontFamily: theme.typography.regular,
  },
});
