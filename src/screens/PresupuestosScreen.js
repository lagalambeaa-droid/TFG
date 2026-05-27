import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import {
  approveBudget,
  getCachedBudgets,
  getBudgets,
  rejectBudget,
} from "../services/budgetService";
import { useAuth } from "../context/AuthContext";
import theme from "../theme";
import { formatDecimalDisplay } from "../utils/numberInputs";

const formatDate = (iso) => {
  if (!iso) return "Sin fecha";
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

const generateBudgetNumber = (item, index) => {
  const year = item.fecha_creacion
    ? new Date(item.fecha_creacion).getFullYear()
    : new Date().getFullYear();
  return `PRES-${year}-${String(index + 1).padStart(3, "0")}`;
};

const STATUS_CONFIG = {
  Aprobado: {
    bg: "#DCFCE7",
    text: "#166534",
  },
  Pendiente: {
    bg: "#FEF3C7",
    text: "#92400E",
  },
  Rechazado: {
    bg: "#FEE2E2",
    text: "#B91C1C",
  },
};

export default function PresupuestosScreen() {
  const { session } = useAuth();
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const [filter, setFilter] = useState("all");

  const loadBudgets = useCallback(async ({ showLoader = true } = {}) => {
    try {
      if (showLoader && budgets.length === 0) {
        setLoading(true);
      }
      const data = await getBudgets();
      setBudgets(Array.isArray(data) ? data : []);
    } catch (error) {
      const cached = await getCachedBudgets();
      setBudgets(Array.isArray(cached) ? cached : []);
    } finally {
      if (showLoader && budgets.length === 0) {
        setLoading(false);
      }
    }
  }, [budgets.length]);

  useFocusEffect(
    useCallback(() => {
      loadBudgets();
      const refreshInterval = setInterval(() => {
        loadBudgets({ showLoader: false });
      }, 10000);

      return () => clearInterval(refreshInterval);
    }, [loadBudgets])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadBudgets({ showLoader: false });
    setRefreshing(false);
  };

  const filteredBudgets = useMemo(() => {
    if (filter === "all") {
      return budgets;
    }

    return budgets.filter((budget) => budget.estado === filter);
  }, [budgets, filter]);

  const summary = useMemo(
    () => ({
      total: budgets.length,
      pendientes: budgets.filter((budget) => budget.estado === "Pendiente").length,
      aprobados: budgets.filter((budget) => budget.estado === "Aprobado").length,
    }),
    [budgets]
  );

  const handleApprove = async (budgetId) => {
    try {
      setProcessingId(budgetId);
      await approveBudget(budgetId);
      await loadBudgets();
      Alert.alert(
        "Presupuesto aprobado",
        "La factura se ha generado automaticamente."
      );
    } catch (error) {
      Alert.alert(
        "Error",
        error?.response?.data?.message || "No se pudo aprobar el presupuesto."
      );
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (budgetId) => {
    try {
      setProcessingId(budgetId);
      await rejectBudget(budgetId);
      await loadBudgets();
    } catch (error) {
      Alert.alert(
        "Error",
        error?.response?.data?.message || "No se pudo rechazar el presupuesto."
      );
    } finally {
      setProcessingId(null);
    }
  };

  const renderStatusTag = (estado) => {
    const config = STATUS_CONFIG[estado] || STATUS_CONFIG.Pendiente;

    return (
      <View style={[styles.statusTag, { backgroundColor: config.bg }]}>
        <Text style={[styles.statusTagText, { color: config.text }]}>
          {estado}
        </Text>
      </View>
    );
  };

  const renderFilterPill = (value, label) => {
    const active = filter === value;

    return (
      <TouchableOpacity
        key={value}
        style={[styles.filterPill, active && styles.filterPillActive]}
        onPress={() => setFilter(value)}
      >
        <Text
          style={[styles.filterPillText, active && styles.filterPillTextActive]}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderBudget = ({ item, index }) => {
    const isPending = item.estado === "Pendiente";
    const isProcessing = processingId === item._id;
    const canReview = session.role === "cliente" && isPending;
    const budgetNumber = generateBudgetNumber(item, index);
    const subtotal = item.total || 0;
    const iva = subtotal * 0.21;
    const total = subtotal + iva;

    return (
      <View style={styles.card}>
        <View style={styles.cardTopBar} />

        <View style={styles.cardBody}>
          <View style={styles.cardHeader}>
            <View style={styles.headerTextBlock}>
              <Text style={styles.budgetNumber}>{budgetNumber}</Text>
              <Text style={styles.projectName}>
                {item.proyecto?.nombre || "Proyecto sin nombre"}
              </Text>
              <Text style={styles.headerMeta}>
                Cliente: {item.proyecto?.cliente?.nombre || "Sin cliente"}
              </Text>
            </View>
            <View style={styles.headerRight}>
              {renderStatusTag(item.estado)}
              <Text style={styles.dateText}>
                {formatDate(item.fecha_creacion)}
              </Text>
            </View>
          </View>

          {item.descripcion ? (
            <Text style={styles.description}>{item.descripcion}</Text>
          ) : null}

          {(item.partidas || []).length > 0 && (
            <View style={styles.detailBlock}>
              <Text style={styles.detailTitle}>Partidas</Text>
              {item.partidas.map((partida, i) => (
                <View
                  key={`${item._id}-partida-${i}`}
                  style={styles.partidaRow}
                >
                  <View style={styles.partidaTextBlock}>
                    <Text style={styles.partidaConcept}>
                      {partida.concepto}
                    </Text>
                    <Text style={styles.partidaMeta}>
                      {partida.cantidad} x{" "}
                      {formatDecimalDisplay(partida.precio_unitario, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{" "}
                      EUR
                    </Text>
                  </View>
                  <Text style={styles.partidaTotal}>
                    {formatDecimalDisplay(partida.subtotal, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    EUR
                  </Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.separator} />

          <View style={styles.totalsBlock}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.totalValue}>
                {formatDecimalDisplay(subtotal, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                EUR
              </Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>IVA (21%)</Text>
              <Text style={styles.totalValue}>
                {formatDecimalDisplay(iva, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                EUR
              </Text>
            </View>
            <View style={styles.totalDivider} />
            <View style={styles.totalRow}>
              <Text style={styles.grandTotalLabel}>Total</Text>
              <Text style={styles.grandTotalValue}>
                {formatDecimalDisplay(total, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                EUR
              </Text>
            </View>
          </View>

          {canReview ? (
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={[styles.actionButton, styles.rejectButton]}
                onPress={() => handleReject(item._id)}
                disabled={isProcessing}
              >
                <Text style={styles.actionButtonText}>Rechazar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.approveButton]}
                onPress={() => handleApprove(item._id)}
                disabled={isProcessing}
              >
                <Text style={styles.actionButtonText}>
                  {isProcessing ? "Procesando..." : "Aprobar"}
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}
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
    <View style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.title}>Presupuestos</Text>
        <Text style={styles.subtitle}>
          {session.role === "cliente"
            ? `Presupuestos de ${session.user?.nombre || "cliente"}`
            : "Consulta lo enviado al cliente con una vista mas limpia y filtrable."}
        </Text>

        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{summary.total}</Text>
            <Text style={styles.summaryLabel}>Total</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{summary.pendientes}</Text>
            <Text style={styles.summaryLabel}>Pendientes</Text>
          </View>
          <View style={styles.summaryCardAccent}>
            <Text style={styles.summaryValueAccent}>{summary.aprobados}</Text>
            <Text style={styles.summaryLabelAccent}>Aprobados</Text>
          </View>
        </View>
      </View>

      <View style={styles.filterRow}>
        {renderFilterPill("all", "Todos")}
        {renderFilterPill("Pendiente", "Pendientes")}
        {renderFilterPill("Aprobado", "Aprobados")}
        {renderFilterPill("Rechazado", "Rechazados")}
      </View>

      <FlatList
        data={filteredBudgets}
        keyExtractor={(item) => item._id}
        renderItem={renderBudget}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              No hay presupuestos para el filtro seleccionado.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
    padding: theme.spacing.md,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F7FA",
  },
  hero: {
    backgroundColor: "#102A43",
    borderRadius: 24,
    padding: 20,
    marginBottom: 14,
  },
  title: {
    fontSize: 28,
    color: "#F8FAFC",
    fontFamily: theme.typography.bold,
    fontWeight: "700",
  },
  subtitle: {
    marginTop: 8,
    color: "#D9E2EC",
    fontSize: 15,
    fontFamily: theme.typography.regular,
    lineHeight: 22,
  },
  summaryRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: "#16324F",
    borderRadius: 16,
    padding: 14,
  },
  summaryCardAccent: {
    flex: 1,
    backgroundColor: "#0F766E",
    borderRadius: 16,
    padding: 14,
  },
  summaryValue: {
    color: "#F8FAFC",
    fontSize: 24,
    fontFamily: theme.typography.bold,
    fontWeight: "700",
  },
  summaryValueAccent: {
    color: "#ECFDF5",
    fontSize: 24,
    fontFamily: theme.typography.bold,
    fontWeight: "700",
  },
  summaryLabel: {
    color: "#CBD5E1",
    marginTop: 4,
    fontFamily: theme.typography.regular,
    fontSize: 12,
  },
  summaryLabelAccent: {
    color: "#D1FAE5",
    marginTop: 4,
    fontFamily: theme.typography.regular,
    fontSize: 12,
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  filterPill: {
    borderRadius: 999,
    backgroundColor: "#E2E8F0",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterPillActive: {
    backgroundColor: "#1D4ED8",
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
    paddingBottom: theme.spacing.lg,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    marginBottom: theme.spacing.md,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
    overflow: "hidden",
  },
  cardTopBar: {
    height: 6,
    backgroundColor: "#102A43",
  },
  cardBody: {
    padding: 18,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  headerTextBlock: {
    flex: 1,
    marginRight: 12,
  },
  headerRight: {
    alignItems: "flex-end",
  },
  budgetNumber: {
    color: "#1E3A8A",
    fontSize: 13,
    fontFamily: theme.typography.medium,
    fontWeight: "600",
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  projectName: {
    fontSize: 18,
    color: "#102A43",
    fontFamily: theme.typography.bold,
    fontWeight: "700",
  },
  headerMeta: {
    marginTop: 4,
    color: "#7B8794",
    fontSize: 13,
    fontFamily: theme.typography.regular,
  },
  dateText: {
    color: "#64748B",
    fontFamily: theme.typography.regular,
    fontSize: 12,
    marginTop: 6,
  },
  description: {
    color: "#334E68",
    lineHeight: 20,
    marginBottom: 12,
    fontFamily: theme.typography.regular,
  },
  detailBlock: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },
  detailTitle: {
    color: "#64748B",
    fontFamily: theme.typography.medium,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  partidaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  partidaTextBlock: {
    flex: 1,
    marginRight: 10,
  },
  partidaConcept: {
    color: "#1F2937",
    fontFamily: theme.typography.medium,
  },
  partidaMeta: {
    marginTop: 2,
    color: "#64748B",
    fontFamily: theme.typography.regular,
    fontSize: 12,
  },
  partidaTotal: {
    color: "#1D4ED8",
    fontFamily: theme.typography.medium,
  },
  separator: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginVertical: 14,
  },
  totalsBlock: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 14,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  totalLabel: {
    color: "#64748B",
    fontFamily: theme.typography.regular,
    fontSize: 14,
  },
  totalValue: {
    color: "#334155",
    fontFamily: theme.typography.medium,
    fontSize: 14,
  },
  totalDivider: {
    height: 1,
    backgroundColor: "#CBD5E1",
    marginVertical: 8,
  },
  grandTotalLabel: {
    color: "#0F766E",
    fontFamily: theme.typography.bold,
    fontWeight: "700",
    fontSize: 16,
  },
  grandTotalValue: {
    color: "#0F766E",
    fontFamily: theme.typography.bold,
    fontWeight: "700",
    fontSize: 22,
  },
  statusTag: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusTagText: {
    fontSize: 12,
    fontFamily: theme.typography.medium,
    fontWeight: "600",
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: theme.spacing.md,
  },
  actionButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  rejectButton: {
    backgroundColor: "#DC2626",
  },
  approveButton: {
    backgroundColor: "#0F766E",
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontFamily: theme.typography.medium,
    fontWeight: "600",
    fontSize: 14,
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
  },
  emptyText: {
    color: "#52606D",
    fontFamily: theme.typography.regular,
  },
});
