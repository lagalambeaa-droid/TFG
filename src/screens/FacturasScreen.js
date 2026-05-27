import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { getCachedInvoices, getInvoices } from "../services/invoiceService";
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

const generateInvoiceNumber = (item, index) => {
  const year = item.fecha_emision
    ? new Date(item.fecha_emision).getFullYear()
    : new Date().getFullYear();
  return `FAC-${year}-${String(index + 1).padStart(3, "0")}`;
};

export default function FacturasScreen() {
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [invoices, setInvoices] = useState([]);

  const loadInvoices = useCallback(async ({ showLoader = true } = {}) => {
    try {
      if (showLoader && invoices.length === 0) {
        setLoading(true);
      }
      const data = await getInvoices();
      setInvoices(Array.isArray(data) ? data : []);
    } catch (error) {
      const cached = await getCachedInvoices();
      setInvoices(Array.isArray(cached) ? cached : []);
    } finally {
      if (showLoader && invoices.length === 0) {
        setLoading(false);
      }
    }
  }, [invoices.length]);

  useFocusEffect(
    useCallback(() => {
      loadInvoices();
      const refreshInterval = setInterval(() => {
        loadInvoices({ showLoader: false });
      }, 10000);

      return () => clearInterval(refreshInterval);
    }, [loadInvoices])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadInvoices({ showLoader: false });
    setRefreshing(false);
  };

  const renderInvoice = ({ item, index }) => {
    const subtotal = item.presupuesto_origen?.total || item.total || 0;
    const iva = subtotal * 0.21;
    const total = subtotal + iva;
    const invoiceNumber = generateInvoiceNumber(item, index);

    return (
      <View style={styles.card}>
        <View style={styles.cardTopBar} />

        <View style={styles.cardBody}>
          <View style={styles.header}>
            <View style={styles.headerTextBlock}>
              <Text style={styles.invoiceNumber}>{invoiceNumber}</Text>
              <Text style={styles.projectName}>
                {item.proyecto?.nombre || "Proyecto sin nombre"}
              </Text>
              <Text style={styles.meta}>
                Cliente: {item.proyecto?.cliente?.nombre || "Sin cliente"}
              </Text>
            </View>
            <View style={styles.headerRight}>
              <View style={styles.badgePaid}>
                <Text style={styles.badgePaidText}>Emitida</Text>
              </View>
              <Text style={styles.dateText}>
                {formatDate(item.fecha_emision)}
              </Text>
            </View>
          </View>

          <View style={styles.separator} />

          <Text style={styles.sectionTitle}>Concepto</Text>
          <Text style={styles.conceptText}>
            {item.concepto || "Factura emitida"}
          </Text>

          {(item.presupuesto_origen?.partidas || []).length > 0 && (
            <View style={styles.detailBlock}>
              <Text style={styles.sectionTitle}>Desglose de partidas</Text>
              {item.presupuesto_origen.partidas.map((partida, i) => (
                <View
                  key={`${item._id}-partida-${i}`}
                  style={styles.partidaRow}
                >
                  <Text style={styles.partidaConcept}>{partida.concepto}</Text>
                  <Text style={styles.partidaValue}>
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
      <Text style={styles.title}>Facturas</Text>
      <Text style={styles.subtitle}>
        Facturas de {session.user?.nombre || "cliente"}
      </Text>

      <FlatList
        data={invoices}
        keyExtractor={(item) => item._id}
        renderItem={renderInvoice}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              Aun no hay facturas disponibles para este usuario.
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
    backgroundColor: "#F8FAFC",
    padding: theme.spacing.md,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
  },
  title: {
    fontSize: 28,
    color: "#102A43",
    fontFamily: theme.typography.bold,
    fontWeight: "700",
  },
  subtitle: {
    marginTop: 6,
    marginBottom: theme.spacing.md,
    color: "#52606D",
    fontSize: 15,
    fontFamily: theme.typography.regular,
  },
  listContent: {
    paddingBottom: theme.spacing.lg,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
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
    backgroundColor: "#1E3A8A",
  },
  cardBody: {
    padding: 18,
  },
  header: {
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
  invoiceNumber: {
    color: "#1E3A8A",
    fontSize: 13,
    fontFamily: theme.typography.medium,
    fontWeight: "600",
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  projectName: {
    color: "#102A43",
    fontSize: 18,
    fontFamily: theme.typography.bold,
    fontWeight: "700",
  },
  meta: {
    color: "#64748B",
    marginTop: 4,
    fontFamily: theme.typography.regular,
    fontSize: 13,
  },
  badgePaid: {
    backgroundColor: "#DCFCE7",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 6,
  },
  badgePaidText: {
    color: "#166534",
    fontFamily: theme.typography.medium,
    fontSize: 12,
    fontWeight: "600",
  },
  dateText: {
    color: "#64748B",
    fontFamily: theme.typography.regular,
    fontSize: 12,
  },
  separator: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginVertical: 14,
  },
  sectionTitle: {
    color: "#64748B",
    fontFamily: theme.typography.medium,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  conceptText: {
    color: "#1F2937",
    fontFamily: theme.typography.regular,
    fontSize: 15,
  },
  detailBlock: {
    marginTop: 14,
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 12,
  },
  partidaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  partidaConcept: {
    flex: 1,
    color: "#334155",
    fontFamily: theme.typography.regular,
  },
  partidaValue: {
    color: "#1D4ED8",
    fontFamily: theme.typography.medium,
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
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
  },
  emptyText: {
    color: "#52606D",
    fontFamily: theme.typography.regular,
  },
});
