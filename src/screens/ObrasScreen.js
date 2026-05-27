import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import DateTimePicker from "@react-native-community/datetimepicker";
import { useFocusEffect } from "@react-navigation/native";
import {
  createProject,
  getCachedProjects,
  getOfflineProjects,
  getProjects,
  saveOfflineProject,
  syncOfflineProjects,
} from "../services/projectService";
import {
  createTask,
  getOfflineTaskCreations,
  remapOfflineTaskProjectIds,
  saveOfflineTaskCreation,
  syncOfflineTaskCreations,
} from "../services/taskService";
import { getCachedUsers, getUsers } from "../services/userService";
import theme from "../theme";

const ESTADOS = ["Planificada", "En ejecucion", "Pausada", "Finalizada"];

export default function ObrasScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submittingProject, setSubmittingProject] = useState(false);
  const [submittingTask, setSubmittingTask] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const syncingRef = useRef(false);
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [activeSection, setActiveSection] = useState("projects");
  const [showDatePicker, setShowDatePicker] = useState(null);
  const [projectForm, setProjectForm] = useState({
    nombre: "",
    descripcion: "",
    fecha_inicio: "",
    fecha_fin_estimada: "",
    estado: "En ejecucion",
    cliente: "",
  });
  const [taskForm, setTaskForm] = useState({
    proyecto: "",
    empleado: "",
    nombre: "",
    descripcion: "",
  });

  const buildOfflineProjectEntry = useCallback(
    (item) => ({
      _id: item.offlineId,
      nombre: item.nombre,
      descripcion: item.descripcion,
      fecha_inicio: item.fecha_inicio,
      fecha_fin_estimada: item.fecha_fin_estimada,
      estado: "Pendiente de envio",
      cliente:
        clients.find((client) => client._id === item.cliente) || {
          _id: item.cliente,
          nombre: "Cliente pendiente",
        },
      capataz: null,
      porcentaje_avance: 0,
      total_tareas: 0,
      tareas: [],
      offline: true,
    }),
    [clients]
  );

  const bootstrap = useCallback(async ({ showLoader = true } = {}) => {
    if (showLoader && projects.length === 0) {
      setLoading(true);
    }

    const [projectResult, clientResult, employeeResult, offlineProjectsResult, offlineTasksResult] =
      await Promise.allSettled([
        getProjects(),
        getUsers("cliente"),
        getUsers("empleado"),
        getOfflineProjects(),
        getOfflineTaskCreations(),
      ]);

    const projectData =
      projectResult.status === "fulfilled"
        ? projectResult.value
        : await getCachedProjects();
    const clientData =
      clientResult.status === "fulfilled"
        ? clientResult.value
        : await getCachedUsers("cliente");
    const employeeData =
      employeeResult.status === "fulfilled"
        ? employeeResult.value
        : await getCachedUsers("empleado");
    const offlineProjects =
      offlineProjectsResult.status === "fulfilled" ? offlineProjectsResult.value : [];
    const offlineTasks =
      offlineTasksResult.status === "fulfilled" ? offlineTasksResult.value : [];

    const normalizedProjects = Array.isArray(projectData) ? projectData : [];
    const normalizedClients = Array.isArray(clientData) ? clientData : [];
    const normalizedEmployees = Array.isArray(employeeData) ? employeeData : [];
    const pendingProjects = Array.isArray(offlineProjects) ? offlineProjects : [];
    const pendingTasks = Array.isArray(offlineTasks) ? offlineTasks : [];

    const offlineProjectEntries = pendingProjects.map((item) => ({
      _id: item.offlineId,
      nombre: item.nombre,
      descripcion: item.descripcion,
      fecha_inicio: item.fecha_inicio,
      fecha_fin_estimada: item.fecha_fin_estimada,
      estado: "Pendiente de envio",
      cliente:
        normalizedClients.find((client) => client._id === item.cliente) || {
          _id: item.cliente,
          nombre: "Cliente pendiente",
        },
      capataz: null,
      porcentaje_avance: 0,
      total_tareas: 0,
      tareas: [],
      offline: true,
    }));

    const offlineTaskEntries = pendingTasks.map((item) => ({
      _id: item.offlineId,
      nombre: item.nombre,
      descripcion: item.descripcion,
      estado: "Pendiente de envio",
      empleado:
        normalizedEmployees.find((employee) => employee._id === item.empleado) || {
          _id: item.empleado,
          nombre: "Empleado pendiente",
        },
      offline: true,
      proyectoId: item.proyecto,
    }));

    const mergedProjects = [...offlineProjectEntries, ...normalizedProjects].map(
      (project) => {
        const linkedOfflineTasks = offlineTaskEntries.filter(
          (task) => task.proyectoId === project._id
        );

        return {
          ...project,
          tareas: [...linkedOfflineTasks, ...(project.tareas || [])],
          total_tareas: (project.total_tareas || 0) + linkedOfflineTasks.length,
        };
      }
    );

    setProjects(mergedProjects);
    setClients(normalizedClients);
    setEmployees(normalizedEmployees);

    if (mergedProjects[0]?._id) {
      setTaskForm((current) => ({
        ...current,
        proyecto: mergedProjects.some((project) => project._id === current.proyecto)
          ? current.proyecto
          : mergedProjects[0]._id,
      }));
    }

    if (showLoader && projects.length === 0) {
      setLoading(false);
    }
  }, [projects.length]);

  useFocusEffect(
    useCallback(() => {
      bootstrap();
      const refreshInterval = setInterval(() => {
        bootstrap({ showLoader: false });
      }, 10000);

      const unsubscribe = NetInfo.addEventListener((state) => {
        if (state.isConnected) {
          syncPendingCreations();
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

  const stats = {
    totalProjects: projects.length,
    totalTasks: projects.reduce(
      (acc, project) => acc + (project.total_tareas || 0),
      0
    ),
    averageProgress:
      projects.length === 0
        ? 0
        : Math.round(
            projects.reduce(
              (acc, project) => acc + (project.porcentaje_avance || 0),
              0
            ) / projects.length
          ),
  };

  const updateProjectField = (field, value) => {
    setProjectForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const updateTaskField = (field, value) => {
    setTaskForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const syncPendingCreations = async () => {
    if (syncingRef.current) {
      return;
    }

    const [pendingProjects, pendingTasks] = await Promise.all([
      getOfflineProjects(),
      getOfflineTaskCreations(),
    ]);

    if (!pendingProjects.length && !pendingTasks.length) {
      return;
    }

    syncingRef.current = true;
    setSyncing(true);

    try {
      const projectResult = await syncOfflineProjects();
      if (projectResult.mappings?.length) {
        await remapOfflineTaskProjectIds(projectResult.mappings);
      }

      const taskResult = await syncOfflineTaskCreations();

      if (projectResult.synced > 0 || taskResult.synced > 0) {
        await bootstrap();
        Alert.alert(
          "Sincronizacion completada",
          "Las obras y tareas pendientes se han enviado correctamente."
        );
      }
    } finally {
      syncingRef.current = false;
      setSyncing(false);
    }
  };

  const handleCreateProject = async () => {
    if (
      !projectForm.nombre.trim() ||
      !projectForm.fecha_inicio.trim() ||
      !projectForm.fecha_fin_estimada.trim() ||
      !projectForm.cliente
    ) {
      Alert.alert(
        "Faltan datos",
        "Nombre, fechas y cliente son obligatorios para crear la obra."
      );
      return;
    }

    try {
      setSubmittingProject(true);
      const networkState = await NetInfo.fetch();

      if (!networkState.isConnected) {
        const offlineProject = await saveOfflineProject(projectForm);
        const offlineProjectEntry = buildOfflineProjectEntry(offlineProject);

        setProjects((current) => [offlineProjectEntry, ...current]);
        setTaskForm((current) => ({
          ...current,
          proyecto: offlineProject.offlineId,
        }));
        setProjectForm({
          nombre: "",
          descripcion: "",
          fecha_inicio: "",
          fecha_fin_estimada: "",
          estado: "En ejecucion",
          cliente: "",
        });
        setActiveSection("projects");
        Alert.alert(
          "Sin conexion",
          "Obra guardada offline. Se enviara al reconectar."
        );
        return;
      }

      const response = await createProject(projectForm);
      const createdProject = response.proyecto;

      setProjects((current) => [createdProject, ...current]);
      setTaskForm((current) => ({
        ...current,
        proyecto: createdProject._id,
      }));
      setProjectForm({
        nombre: "",
        descripcion: "",
        fecha_inicio: "",
        fecha_fin_estimada: "",
        estado: "En ejecucion",
        cliente: "",
      });
      setActiveSection("projects");
      Alert.alert("Obra creada", "La obra se ha registrado correctamente.");
    } catch (error) {
      Alert.alert(
        "Error",
        error?.response?.data?.message || "No se pudo crear la obra."
      );
    } finally {
      setSubmittingProject(false);
    }
  };

  const handleCreateTask = async () => {
    if (!taskForm.proyecto || !taskForm.empleado || !taskForm.nombre.trim()) {
      Alert.alert(
        "Faltan datos",
        "Selecciona obra, empleado y nombre para crear la tarea."
      );
      return;
    }

    try {
      setSubmittingTask(true);
      const networkState = await NetInfo.fetch();

      if (!networkState.isConnected) {
        const offlineTask = await saveOfflineTaskCreation(taskForm);
        const employee =
          employees.find((item) => item._id === offlineTask.empleado) || null;

        setProjects((current) =>
          current.map((project) =>
            project._id === offlineTask.proyecto
              ? {
                  ...project,
                  tareas: [
                    {
                      _id: offlineTask.offlineId,
                      nombre: offlineTask.nombre,
                      descripcion: offlineTask.descripcion,
                      estado: "Pendiente de envio",
                      empleado: employee,
                      offline: true,
                    },
                    ...(project.tareas || []),
                  ],
                  total_tareas: (project.total_tareas || 0) + 1,
                }
              : project
          )
        );

        setTaskForm((current) => ({
          ...current,
          nombre: "",
          descripcion: "",
        }));
        setActiveSection("projects");
        Alert.alert(
          "Sin conexion",
          "Tarea guardada offline. Se enviara al reconectar."
        );
        return;
      }

      const response = await createTask(taskForm);
      const createdTask = response.tarea;

      setProjects((current) =>
        current.map((project) =>
          project._id === createdTask.proyecto?._id
            ? {
                ...project,
                tareas: [createdTask, ...(project.tareas || [])],
                total_tareas: (project.total_tareas || 0) + 1,
              }
            : project
        )
      );

      setTaskForm((current) => ({
        ...current,
        nombre: "",
        descripcion: "",
      }));
      setActiveSection("projects");
      Alert.alert("Tarea creada", "La tarea se ha asignado correctamente.");
    } catch (error) {
      Alert.alert(
        "Error",
        error?.response?.data?.message || "No se pudo crear la tarea."
      );
    } finally {
      setSubmittingTask(false);
    }
  };

  const renderSelectableList = (items, selectedValue, onSelect, emptyLabel) => {
    if (!items.length) {
      return <Text style={styles.helperText}>{emptyLabel}</Text>;
    }

    return (
      <View style={styles.chipRow}>
        {items.map((item) => {
          const value = item._id || item.value;
          const label = item.nombre || item.label;
          const selected = selectedValue === value;

          return (
            <TouchableOpacity
              key={value}
              style={[styles.chip, selected && styles.chipSelected]}
              onPress={() => onSelect(value)}
            >
              <Text
                style={[styles.chipText, selected && styles.chipTextSelected]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const renderSectionTab = (id, label) => {
    const active = activeSection === id;

    return (
      <TouchableOpacity
        key={id}
        style={[styles.tabPill, active && styles.tabPillActive]}
        onPress={() => setActiveSection(id)}
      >
        <Text style={[styles.tabPillText, active && styles.tabPillTextActive]}>
          {label}
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
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      <View style={styles.hero}>
        <Text style={styles.title}>Centro de Obras</Text>
        <Text style={styles.subtitle}>
          Gestiona altas, reparto operativo y seguimiento sin saturar la pantalla.
        </Text>
        {syncing ? (
          <Text style={styles.syncingText}>
            Sincronizando obras y tareas pendientes...
          </Text>
        ) : null}

        <View style={styles.statRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.totalProjects}</Text>
            <Text style={styles.statLabel}>Obras</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.totalTasks}</Text>
            <Text style={styles.statLabel}>Tareas</Text>
          </View>
          <View style={styles.statCardAccent}>
            <Text style={styles.statValueAccent}>{stats.averageProgress}%</Text>
            <Text style={styles.statLabelAccent}>Avance medio</Text>
          </View>
        </View>
      </View>

      <View style={styles.tabRow}>
        {renderSectionTab("projects", "Obras")}
        {renderSectionTab("projectForm", "Nueva obra")}
        {renderSectionTab("taskForm", "Asignar tarea")}
      </View>

      {activeSection === "projectForm" ? (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Nueva obra</Text>
          <TextInput
            style={styles.input}
            placeholder="Nombre de la obra"
            value={projectForm.nombre}
            onChangeText={(value) => updateProjectField("nombre", value)}
          />
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Descripcion"
            value={projectForm.descripcion}
            onChangeText={(value) => updateProjectField("descripcion", value)}
            multiline
          />
          <View style={styles.doubleRow}>
            <TouchableOpacity
              style={[styles.input, styles.doubleInput]}
              onPress={() => setShowDatePicker("fecha_inicio")}
            >
              <Text
                style={
                  projectForm.fecha_inicio ? styles.dateText : styles.datePlaceholder
                }
              >
                {projectForm.fecha_inicio || "Fecha inicio"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.input, styles.doubleInput]}
              onPress={() => setShowDatePicker("fecha_fin_estimada")}
            >
              <Text
                style={
                  projectForm.fecha_fin_estimada
                    ? styles.dateText
                    : styles.datePlaceholder
                }
              >
                {projectForm.fecha_fin_estimada || "Fecha fin"}
              </Text>
            </TouchableOpacity>
          </View>

          {showDatePicker ? (
            Platform.OS === "ios" ? (
              <View style={styles.iosPickerWrapper}>
                <DateTimePicker
                  value={
                    projectForm[showDatePicker]
                      ? new Date(projectForm[showDatePicker])
                      : new Date()
                  }
                  mode="date"
                  display="spinner"
                  onChange={(event, selectedDate) => {
                    if (selectedDate) {
                      const formatted = selectedDate.toISOString().slice(0, 10);
                      updateProjectField(showDatePicker, formatted);
                    }
                  }}
                />
                <TouchableOpacity
                  style={styles.dateConfirmButton}
                  onPress={() => setShowDatePicker(null)}
                >
                  <Text style={styles.dateConfirmButtonText}>Confirmar fecha</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <DateTimePicker
                value={
                  projectForm[showDatePicker]
                    ? new Date(projectForm[showDatePicker])
                    : new Date()
                }
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowDatePicker(null);
                  if (event.type === "set" && selectedDate) {
                    const formatted = selectedDate.toISOString().slice(0, 10);
                    updateProjectField(showDatePicker, formatted);
                  }
                }}
              />
            )
          ) : null}

          <Text style={styles.fieldLabel}>Estado</Text>
          {renderSelectableList(
            ESTADOS.map((estado) => ({ value: estado, label: estado })),
            projectForm.estado,
            (value) => updateProjectField("estado", value),
            "No hay estados disponibles."
          )}

          <Text style={styles.fieldLabel}>Cliente</Text>
          {renderSelectableList(
            clients,
            projectForm.cliente,
            (value) => updateProjectField("cliente", value),
            "No hay clientes disponibles."
          )}

          <TouchableOpacity
            style={[styles.primaryButton, submittingProject && styles.buttonDisabled]}
            onPress={handleCreateProject}
            disabled={submittingProject}
          >
            <Text style={styles.primaryButtonText}>
              {submittingProject ? "Creando..." : "Crear obra"}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {activeSection === "taskForm" ? (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Nueva tarea</Text>
          <Text style={styles.fieldLabel}>Obra</Text>
          {renderSelectableList(
            projects,
            taskForm.proyecto,
            (value) => updateTaskField("proyecto", value),
            "Crea antes una obra."
          )}

          <Text style={styles.fieldLabel}>Empleado</Text>
          {renderSelectableList(
            employees,
            taskForm.empleado,
            (value) => updateTaskField("empleado", value),
            "No hay empleados disponibles."
          )}

          <TextInput
            style={styles.input}
            placeholder="Nombre de la tarea"
            value={taskForm.nombre}
            onChangeText={(value) => updateTaskField("nombre", value)}
          />
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Descripcion de la tarea"
            value={taskForm.descripcion}
            onChangeText={(value) => updateTaskField("descripcion", value)}
            multiline
          />

          <TouchableOpacity
            style={[styles.secondaryButton, submittingTask && styles.buttonDisabled]}
            onPress={handleCreateTask}
            disabled={submittingTask}
          >
            <Text style={styles.secondaryButtonText}>
              {submittingTask ? "Asignando..." : "Asignar tarea"}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {activeSection === "projects" ? (
        <>
          <Text style={styles.sectionTitle}>Obras activas</Text>
          {projects.length ? (
            projects.map((project) => (
              <View key={project._id} style={styles.projectCard}>
                <View style={styles.projectHeader}>
                  <View style={styles.projectTitleBlock}>
                    <Text style={styles.projectName}>{project.nombre}</Text>
                    <Text style={styles.projectMeta}>
                      Cliente: {project.cliente?.nombre || "Sin cliente"}
                    </Text>
                  </View>
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusBadgeText}>{project.estado}</Text>
                  </View>
                </View>

                <Text style={styles.projectDescription}>
                  {project.descripcion || "Sin descripcion operativa."}
                </Text>

                <View style={styles.metricStrip}>
                  <View style={styles.metricChip}>
                    <Text style={styles.metricChipLabel}>Avance</Text>
                    <Text style={styles.metricChipValue}>
                      {project.porcentaje_avance || 0}%
                    </Text>
                  </View>
                  <View style={styles.metricChip}>
                    <Text style={styles.metricChipLabel}>Tareas</Text>
                    <Text style={styles.metricChipValue}>
                      {project.total_tareas || 0}
                    </Text>
                  </View>
                </View>

                <Text style={styles.projectMeta}>
                  {project.fecha_inicio?.slice?.(0, 10)} a{" "}
                  {project.fecha_fin_estimada?.slice?.(0, 10)}
                </Text>

                {(project.tareas || []).slice(0, 3).map((task) => (
                  <View key={task._id} style={styles.taskRow}>
                    <View style={styles.taskIndicator} />
                    <View style={styles.taskTextBlock}>
                      <Text style={styles.taskName}>{task.nombre}</Text>
                      <Text style={styles.taskMeta}>
                        {task.empleado?.nombre || "Sin empleado"} | {task.estado}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            ))
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>
                Aun no hay obras registradas para este capataz.
              </Text>
            </View>
          )}
        </>
      ) : null}
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: "#EEF3F7",
  },
  content: {
    padding: 16,
    paddingBottom: 28,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#EEF3F7",
  },
  hero: {
    backgroundColor: "#0F172A",
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
  },
  title: {
    fontSize: 30,
    color: "#F8FAFC",
    fontFamily: theme.typography.bold,
    fontWeight: "700",
  },
  subtitle: {
    marginTop: 8,
    color: "#CBD5E1",
    fontSize: 15,
    fontFamily: theme.typography.regular,
    lineHeight: 22,
  },
  syncingText: {
    marginTop: 10,
    color: "#FBBF24",
    fontFamily: theme.typography.medium,
  },
  statRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#132238",
    borderRadius: 16,
    padding: 14,
  },
  statCardAccent: {
    flex: 1,
    backgroundColor: "#0F766E",
    borderRadius: 16,
    padding: 14,
  },
  statValue: {
    color: "#F8FAFC",
    fontSize: 24,
    fontFamily: theme.typography.bold,
    fontWeight: "700",
  },
  statValueAccent: {
    color: "#ECFDF5",
    fontSize: 24,
    fontFamily: theme.typography.bold,
    fontWeight: "700",
  },
  statLabel: {
    color: "#CBD5E1",
    marginTop: 4,
    fontFamily: theme.typography.regular,
    fontSize: 12,
  },
  statLabelAccent: {
    color: "#D1FAE5",
    marginTop: 4,
    fontFamily: theme.typography.regular,
    fontSize: 12,
  },
  tabRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  tabPill: {
    borderRadius: 999,
    backgroundColor: "#D9E2EC",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  tabPillActive: {
    backgroundColor: "#102A43",
  },
  tabPillText: {
    color: "#334E68",
    fontFamily: theme.typography.medium,
    fontSize: 13,
  },
  tabPillTextActive: {
    color: "#FFFFFF",
  },
  panel: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  panelTitle: {
    fontSize: 20,
    color: "#0F172A",
    fontFamily: theme.typography.bold,
    fontWeight: "700",
    marginBottom: 14,
  },
  dateText: {
    color: "#102A43",
    fontFamily: theme.typography.regular,
  },
  datePlaceholder: {
    color: "#9CA3AF",
    fontFamily: theme.typography.regular,
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
  iosPickerWrapper: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D9E2EC",
    marginBottom: 12,
    overflow: "hidden",
  },
  dateConfirmButton: {
    backgroundColor: "#0F766E",
    paddingVertical: 12,
    alignItems: "center",
  },
  dateConfirmButtonText: {
    color: "#FFFFFF",
    fontFamily: theme.typography.medium,
    fontWeight: "600",
    fontSize: 15,
  },
  doubleRow: {
    flexDirection: "row",
    gap: 10,
  },
  doubleInput: {
    flex: 1,
  },
  textArea: {
    minHeight: 84,
    textAlignVertical: "top",
  },
  fieldLabel: {
    marginTop: 2,
    marginBottom: 8,
    color: "#334E68",
    fontFamily: theme.typography.medium,
    fontSize: 14,
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
    borderColor: "#BCCCDC",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipSelected: {
    backgroundColor: "#102A43",
    borderColor: "#102A43",
  },
  chipText: {
    color: "#334E68",
    fontFamily: theme.typography.medium,
    fontSize: 13,
  },
  chipTextSelected: {
    color: "#FFFFFF",
  },
  helperText: {
    marginBottom: 12,
    color: "#7B8794",
    fontFamily: theme.typography.regular,
  },
  primaryButton: {
    minHeight: 50,
    borderRadius: 12,
    backgroundColor: "#0F766E",
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
    minHeight: 50,
    borderRadius: 12,
    backgroundColor: "#1D4ED8",
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
  sectionTitle: {
    fontSize: 22,
    color: "#102A43",
    fontFamily: theme.typography.bold,
    fontWeight: "700",
    marginBottom: 12,
  },
  projectCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  projectHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  projectTitleBlock: {
    flex: 1,
    marginRight: 10,
  },
  projectName: {
    color: "#0F172A",
    fontSize: 19,
    fontFamily: theme.typography.bold,
    fontWeight: "700",
  },
  projectMeta: {
    marginTop: 4,
    color: "#52606D",
    fontFamily: theme.typography.regular,
    fontSize: 13,
  },
  projectDescription: {
    color: "#334E68",
    fontFamily: theme.typography.regular,
    lineHeight: 20,
    marginBottom: 10,
  },
  metricStrip: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 8,
  },
  metricChip: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  metricChipLabel: {
    color: "#64748B",
    fontFamily: theme.typography.regular,
    fontSize: 11,
  },
  metricChipValue: {
    color: "#0F766E",
    fontFamily: theme.typography.bold,
    fontWeight: "700",
    marginTop: 2,
  },
  statusBadge: {
    backgroundColor: "#DBEAFE",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusBadgeText: {
    color: "#1D4ED8",
    fontFamily: theme.typography.medium,
    fontSize: 12,
  },
  taskRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  taskIndicator: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: "#0F766E",
    marginTop: 6,
    marginRight: 10,
  },
  taskTextBlock: {
    flex: 1,
  },
  taskName: {
    color: "#1F2933",
    fontFamily: theme.typography.medium,
    fontSize: 14,
  },
  taskMeta: {
    marginTop: 2,
    color: "#7B8794",
    fontFamily: theme.typography.regular,
    fontSize: 12,
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
