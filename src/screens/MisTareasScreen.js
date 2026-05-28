import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { useFocusEffect } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import { SafeAreaView } from "react-native-safe-area-context";
import { resolveAssetUrl } from "../services/api";
import {
  getCachedEmployeeTasks,
  getEmployeeTasks,
  getOfflineTaskUpdates,
  saveOfflineTaskUpdate,
  syncOfflineTaskUpdates,
  updateTaskStatus,
} from "../services/taskService";
import theme from "../theme";

const ESTADOS = ["Pendiente", "En Progreso", "Bloqueada", "Completada"];

export default function MisTareasScreen() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [editedTasks, setEditedTasks] = useState({});
  const [queuedTaskIds, setQueuedTaskIds] = useState({});
  const [hiddenPreviewImages, setHiddenPreviewImages] = useState({});
  const [showCompleted, setShowCompleted] = useState(false);
  const syncingRef = useRef(false);
  const editedTasksRef = useRef({});

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected) {
        syncPendingTaskUpdates();
      }
    });

    return () => unsubscribe();
  }, []);

  const loadTasks = useCallback(async ({ showLoader = true } = {}) => {
    if (showLoader && tasks.length === 0) {
      setLoading(true);
    }

    let normalizedTasks = [];

    try {
      const data = await getEmployeeTasks();
      normalizedTasks = Array.isArray(data) ? data : [];
    } catch {
      const cachedTasks = await getCachedEmployeeTasks();
      normalizedTasks = Array.isArray(cachedTasks) ? cachedTasks : [];
    }

    const pendingUpdates = await getOfflineTaskUpdates();
    const pendingByTaskId = pendingUpdates.reduce((acc, item) => {
      acc[item.taskId] = item;
      return acc;
    }, {});
    setQueuedTaskIds(
      pendingUpdates.reduce((acc, item) => {
        acc[item.taskId] = true;
        return acc;
      }, {})
    );

    setTasks(normalizedTasks);
    const nextEditedTasks = normalizedTasks.reduce((acc, task) => {
      const pending = pendingByTaskId[task._id];
      acc[task._id] = {
        estado: pending?.estado || task.estado,
        photo: pending?.photo || null,
      };
      return acc;
    }, {});
    editedTasksRef.current = nextEditedTasks;
    setEditedTasks(nextEditedTasks);
    if (showLoader && tasks.length === 0) {
      setLoading(false);
    }
  }, [tasks.length]);

  useFocusEffect(
    useCallback(() => {
      loadTasks();

      return undefined;
    }, [loadTasks])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadTasks({ showLoader: false });
    setRefreshing(false);
  };

  const updateTaskDraft = (taskId, changes) => {
    const nextEditedTasks = {
      ...editedTasksRef.current,
      [taskId]: {
        ...editedTasksRef.current[taskId],
        ...changes,
      },
    };
    editedTasksRef.current = nextEditedTasks;
    setEditedTasks(nextEditedTasks);
  };

  const handleSelectStatus = (taskId, estado) => {
    updateTaskDraft(taskId, { estado });

    if (estado !== "Completada") {
      updateTaskDraft(taskId, { photo: null });
    }
  };

  const handlePickPhoto = async (taskId) => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      Alert.alert("Permiso requerido", "Debes permitir acceso a la camara.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.7,
    });

    if (result.canceled || !result.assets?.length) {
      return;
    }

    updateTaskDraft(taskId, { photo: result.assets[0] });
  };

  const syncPendingTaskUpdates = async () => {
    if (syncingRef.current) {
      return;
    }

    const pending = await getOfflineTaskUpdates();

    if (!pending.length) {
      return;
    }

    syncingRef.current = true;
    setSyncing(true);

    try {
      const result = await syncOfflineTaskUpdates();

      if (result.synced > 0) {
        await loadTasks();
        Alert.alert(
          "Sincronizacion completada",
          "Las tareas pendientes se han enviado correctamente."
        );
      } else if (result.failed === 0) {
        setQueuedTaskIds({});
      }
    } finally {
      syncingRef.current = false;
      setSyncing(false);
    }
  };

  const handleSaveChanges = async () => {
    const currentDrafts = editedTasksRef.current;
    const changedTasks = activeTasks.filter((task) => {
      const draft = currentDrafts[task._id];
      return draft && (draft.estado !== task.estado || !!draft.photo);
    });

    if (!changedTasks.length) {
      Alert.alert("Sin cambios", "No hay cambios pendientes para guardar.");
      return;
    }

    const missingPhoto = changedTasks.find((task) => {
      const draft = currentDrafts[task._id];
      return draft.estado === "Completada" && !draft.photo && !task.foto_avance;
    });

    if (missingPhoto) {
      Alert.alert(
        "Foto obligatoria",
        "Debes adjuntar una foto en las tareas marcadas como completadas."
      );
      return;
    }

    try {
      setSaving(true);
      const networkState = await NetInfo.fetch();

      if (!networkState.isConnected) {
        const nextQueuedTaskIds = {};

        for (const task of changedTasks) {
          const draft = currentDrafts[task._id];
          await saveOfflineTaskUpdate({
            taskId: task._id,
            estado: draft.estado,
            photo: draft.photo,
          });
          nextQueuedTaskIds[task._id] = true;
        }

        setQueuedTaskIds((current) => ({ ...current, ...nextQueuedTaskIds }));

        Alert.alert(
          "Sin conexion",
          "Cambios guardados offline. Se enviaran al reconectar."
        );
        return;
      }

      for (const task of changedTasks) {
        const draft = currentDrafts[task._id];
        const response = await updateTaskStatus({
          taskId: task._id,
          estado: draft.estado,
          photo: draft.photo,
        });

        setTasks((current) =>
          current.map((item) =>
            item._id === task._id ? response.tarea : item
          )
        );
        const nextEditedTasks = {
          ...editedTasksRef.current,
          [task._id]: {
            estado: response.tarea.estado,
            photo: null,
          },
        };
        editedTasksRef.current = nextEditedTasks;
        setEditedTasks(nextEditedTasks);
        setQueuedTaskIds((current) => {
          const next = { ...current };
          delete next[task._id];
          return next;
        });
      }

      await loadTasks();
      Alert.alert("Cambios guardados", "Las tareas se actualizaron correctamente.");
    } catch (error) {
      Alert.alert(
        "Error",
        error?.response?.data?.message || "No se pudieron guardar los cambios."
      );
    } finally {
      setSaving(false);
    }
  };

  const renderStatusOption = (taskId, option) => {
    const isSelected = editedTasks[taskId]?.estado === option;

    return (
      <Pressable
        key={option}
        style={[styles.statusChip, isSelected && styles.statusChipSelected]}
        onPress={() => handleSelectStatus(taskId, option)}
      >
        <Text
          style={[
            styles.statusChipText,
            isSelected && styles.statusChipTextSelected,
          ]}
        >
          {option}
        </Text>
      </Pressable>
    );
  };

  const renderTask = ({ item }) => {
    const draft = editedTasks[item._id] || {};
    const showPhotoArea = draft.estado === "Completada";
    const resolvedStoredPhoto = resolveAssetUrl(item.foto_avance);
    const previewUri =
      draft.photo?.uri ||
      (hiddenPreviewImages[item._id] ? null : resolvedStoredPhoto);
    const isQueuedOffline = !!queuedTaskIds[item._id];
    const hasUnsavedChanges = draft.estado !== item.estado || !!draft.photo;

    return (
      <View style={styles.card}>
        <Text style={styles.taskName}>{item.nombre}</Text>
        <Text style={styles.taskMeta}>
          {item.proyecto?.nombre || "Proyecto"} | Estado actual: {item.estado}
        </Text>
        {item.descripcion ? (
          <Text style={styles.taskDescription}>{item.descripcion}</Text>
        ) : null}

        {isQueuedOffline ? (
          <Text style={styles.pendingText}>Cambios pendientes de envio</Text>
        ) : hasUnsavedChanges ? (
          <Text style={styles.draftText}>Cambios sin guardar</Text>
        ) : null}

        <Text style={styles.sectionLabel}>ACTUALIZAR ESTADO</Text>
        <View style={styles.statusGrid}>
          {ESTADOS.map((option) => renderStatusOption(item._id, option))}
        </View>

        {previewUri ? (
          <View style={styles.previewBlock}>
            <Image
              source={{ uri: previewUri }}
              style={styles.previewImage}
              onError={() => {
                if (!draft.photo) {
                  setHiddenPreviewImages((current) => ({
                    ...current,
                    [item._id]: true,
                  }));
                }
              }}
            />
            <Text style={styles.previewLabel}>
              {isQueuedOffline
                ? "Nueva foto pendiente de envio"
                : draft.photo
                  ? "Nueva foto seleccionada"
                  : "Ultima foto subida"}
            </Text>
          </View>
        ) : null}

        {showPhotoArea ? (
          <TouchableOpacity
            style={styles.photoArea}
            onPress={() => handlePickPhoto(item._id)}
          >
            <Text style={styles.photoText}>
              {previewUri ? "Cambiar foto de avance" : "Tocar para adjuntar foto"}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  };

  const renderCompletedTask = (item) => {
    const resolvedPhoto = resolveAssetUrl(item.foto_avance);
    const photoUri = hiddenPreviewImages[item._id] ? null : resolvedPhoto;

    return (
      <View key={item._id} style={styles.completedCard}>
        <View style={styles.completedHeader}>
          <Text style={styles.completedTaskName}>{item.nombre}</Text>
          <View style={styles.completedBadge}>
            <Text style={styles.completedBadgeText}>Completada</Text>
          </View>
        </View>
        <Text style={styles.taskMeta}>
          {item.proyecto?.nombre || "Proyecto"}
        </Text>
        {item.descripcion ? (
          <Text style={styles.taskDescription}>{item.descripcion}</Text>
        ) : null}
        {photoUri ? (
          <Image
            source={{ uri: photoUri }}
            style={styles.completedPhoto}
            onError={() => {
              setHiddenPreviewImages((current) => ({
                ...current,
                [item._id]: true,
              }));
            }}
          />
        ) : null}
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

  const activeTasks = tasks.filter((t) => t.estado !== "Completada");
  const completedTasks = tasks.filter((t) => t.estado === "Completada");

  const hasChanges = activeTasks.some((task) => {
    const draft = editedTasks[task._id];
    return draft && (draft.estado !== task.estado || !!draft.photo);
  });

  const headerComponent = (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>Mis Tareas</Text>
      <Text style={styles.headerSubtitle}>
        Reporta avance con evidencia fotografica visible en la app.
      </Text>
      {syncing ? (
        <Text style={styles.syncingText}>Sincronizando tareas pendientes...</Text>
      ) : null}
    </View>
  );

  const footerComponent = completedTasks.length > 0 ? (
    <View style={styles.completedSection}>
      <TouchableOpacity
        style={styles.completedToggle}
        onPress={() => setShowCompleted((v) => !v)}
        activeOpacity={0.7}
      >
        <Text style={styles.completedToggleText}>
          Tareas completadas ({completedTasks.length})
        </Text>
        <Text style={styles.completedChevron}>
          {showCompleted ? "▲" : "▼"}
        </Text>
      </TouchableOpacity>
      {showCompleted && completedTasks.map(renderCompletedTask)}
    </View>
  ) : null;

  return (
    <SafeAreaView edges={["left", "right", "bottom"]} style={styles.container}>
      <FlatList
        data={activeTasks}
        keyExtractor={(item) => item._id}
        renderItem={renderTask}
        style={styles.list}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={headerComponent}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No hay tareas activas asignadas.</Text>
          </View>
        }
        ListFooterComponent={footerComponent}
      />

      {activeTasks.length > 0 && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.saveButton,
              !hasChanges && styles.saveButtonInactive,
              saving && styles.saveButtonDisabled,
            ]}
            onPress={handleSaveChanges}
            disabled={!hasChanges || saving}
          >
            <Text style={styles.saveButtonText}>
              {saving ? "Guardando..." : "Guardar cambios"}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  list: {
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
    fontFamily: theme.typography.medium,
    fontSize: 13,
  },
  content: {
    flexGrow: 1,
    paddingTop: 0,
    paddingHorizontal: 16,
    paddingBottom: 120,
    gap: 14,
    backgroundColor: "#F3F4F6",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  taskName: {
    fontSize: 18,
    color: "#111827",
    fontFamily: theme.typography.medium,
    marginBottom: 4,
  },
  taskMeta: {
    color: "#4B5563",
    fontFamily: theme.typography.regular,
    fontSize: 13,
  },
  taskDescription: {
    marginTop: 8,
    color: "#334155",
    lineHeight: 20,
    fontFamily: theme.typography.regular,
  },
  pendingText: {
    marginTop: 10,
    color: "#B45309",
    fontFamily: theme.typography.medium,
    fontSize: 12,
  },
  draftText: {
    marginTop: 10,
    color: "#1D4ED8",
    fontFamily: theme.typography.medium,
    fontSize: 12,
  },
  sectionLabel: {
    fontSize: 12,
    color: "#6B7280",
    fontFamily: theme.typography.medium,
    marginTop: 16,
    marginBottom: 10,
    letterSpacing: 0.6,
  },
  statusGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  statusChip: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 999,
    paddingHorizontal: 12,
    minHeight: 38,
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  statusChipSelected: {
    backgroundColor: "#1E3A8A",
    borderColor: "#1E3A8A",
  },
  statusChipText: {
    color: "#374151",
    fontSize: 13,
    fontFamily: theme.typography.medium,
  },
  statusChipTextSelected: {
    color: "#FFFFFF",
  },
  previewBlock: {
    marginTop: 14,
  },
  previewImage: {
    width: "100%",
    height: 180,
    borderRadius: 14,
    backgroundColor: "#E5E7EB",
  },
  previewLabel: {
    marginTop: 8,
    color: "#64748B",
    fontFamily: theme.typography.regular,
    fontSize: 12,
  },
  photoArea: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: "#93C5FD",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: "center",
    backgroundColor: "#EFF6FF",
  },
  photoText: {
    color: "#1E3A8A",
    fontSize: 14,
    fontFamily: theme.typography.medium,
  },
  completedSection: {
    marginTop: 6,
  },
  completedToggle: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  completedToggleText: {
    fontSize: 16,
    color: "#15803D",
    fontFamily: theme.typography.medium,
    fontWeight: "600",
  },
  completedChevron: {
    fontSize: 14,
    color: "#15803D",
  },
  completedCard: {
    backgroundColor: "#F0FDF4",
    borderRadius: 16,
    padding: 16,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  completedHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  completedTaskName: {
    fontSize: 16,
    color: "#111827",
    fontFamily: theme.typography.medium,
    flex: 1,
    marginRight: 8,
  },
  completedBadge: {
    backgroundColor: "#15803D",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  completedBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontFamily: theme.typography.medium,
    fontWeight: "600",
  },
  completedPhoto: {
    width: "100%",
    height: 160,
    borderRadius: 12,
    backgroundColor: "#E5E7EB",
    marginTop: 12,
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
    backgroundColor: "#F3F4F6",
  },
  saveButton: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: "#1E3A8A",
    justifyContent: "center",
    alignItems: "center",
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonInactive: {
    backgroundColor: "#9CA3AF",
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: theme.typography.medium,
    fontWeight: "600",
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
  },
  emptyText: {
    color: "#6B7280",
    fontSize: 15,
    fontFamily: theme.typography.regular,
  },
});
