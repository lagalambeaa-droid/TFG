import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import Svg, { Circle } from "react-native-svg";
import { resolveAssetUrl } from "../services/api";
import { getCachedProjects, getProjects } from "../services/projectService";
import theme from "../theme";

const CIRCLE_SIZE = 180;
const STROKE_WIDTH = 14;
const HERO_CARD_PADDING = 18;
const RADIUS = (CIRCLE_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function AvanceObraScreen() {
  const { width } = useWindowDimensions();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [activeProjectIndex, setActiveProjectIndex] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [hasProject, setHasProject] = useState(true);
  const [hiddenImages, setHiddenImages] = useState({});

  const loadProjectData = useCallback(async ({ showLoader = true } = {}) => {
    try {
      if (showLoader && projects.length === 0) {
        setLoading(true);
      }
      const projectItems = await getProjects();

      if (!projectItems.length) {
        setHasProject(false);
        setProjects([]);
        setActiveProjectIndex(0);
        return;
      }

      setHasProject(true);
      setProjects(projectItems);
      setActiveProjectIndex((current) =>
        Math.min(current, Math.max(projectItems.length - 1, 0))
      );
    } catch (error) {
      const cachedProjectItems = await getCachedProjects();

      if (!cachedProjectItems.length) {
        setHasProject(false);
        setProjects([]);
        setActiveProjectIndex(0);
        return;
      }

      setHasProject(true);
      setProjects(cachedProjectItems);
      setActiveProjectIndex((current) =>
        Math.min(current, Math.max(cachedProjectItems.length - 1, 0))
      );
    } finally {
      if (showLoader && projects.length === 0) {
        setLoading(false);
      }
    }
  }, [projects.length]);

  useFocusEffect(
    useCallback(() => {
      loadProjectData();
      const refreshInterval = setInterval(() => {
        loadProjectData({ showLoader: false });
      }, 10000);

      return () => clearInterval(refreshInterval);
    }, [loadProjectData])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadProjectData({ showLoader: false });
    setRefreshing(false);
  };

  const activeProject = projects[activeProjectIndex] || null;
  const completedTasks = (activeProject?.tareas || [])
    .filter((task) => task.estado === "Completada")
    .slice(0, 5);
  const contentWidth = Math.max(
    width - theme.spacing.md * 2 - HERO_CARD_PADDING * 2,
    260
  );

  const handleProjectScroll = (event) => {
    const nextIndex = Math.round(
      event.nativeEvent.contentOffset.x / contentWidth
    );
    setActiveProjectIndex(
      Math.min(Math.max(nextIndex, 0), Math.max(projects.length - 1, 0))
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
      <Text style={styles.title}>Seguimiento de la obra</Text>
      <Text style={styles.subtitle}>
        {hasProject
          ? `${activeProject?.nombre || "Proyecto actual"}${
              projects.length > 1
                ? ` (${activeProjectIndex + 1} de ${projects.length})`
                : ""
            }`
          : "Sin proyecto asignado"}
      </Text>

      {hasProject ? (
        <View style={styles.heroCard}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            scrollEnabled={projects.length > 1}
            onMomentumScrollEnd={handleProjectScroll}
          >
            {projects.map((projectItem) => {
              const itemProgress = projectItem.porcentaje_avance || 0;
              const itemProgressOffset =
                CIRCUMFERENCE - (CIRCUMFERENCE * itemProgress) / 100;

              return (
                <View
                  key={projectItem._id}
                  style={[styles.projectSlide, { width: contentWidth }]}
                >
                  <View style={styles.projectSummary}>
                    <Text style={styles.summaryLabel}>Estado</Text>
                    <Text style={styles.summaryValue}>
                      {projectItem.estado || "Sin estado"}
                    </Text>
                    <Text style={styles.summaryMeta}>
                      Capataz: {projectItem.capataz?.nombre || "Sin asignar"}
                    </Text>
                    <Text style={styles.summaryMeta}>
                      Inicio:{" "}
                      {projectItem.fecha_inicio?.slice?.(0, 10) || "Sin fecha"}
                    </Text>
                    <Text style={styles.summaryMeta}>
                      Fin estimado:{" "}
                      {projectItem.fecha_fin_estimada?.slice?.(0, 10) ||
                        "Sin fecha"}
                    </Text>
                  </View>

                  <View style={styles.chartCard}>
                    <Svg width={CIRCLE_SIZE} height={CIRCLE_SIZE}>
                      <Circle
                        stroke="#DBEAFE"
                        fill="none"
                        cx={CIRCLE_SIZE / 2}
                        cy={CIRCLE_SIZE / 2}
                        r={RADIUS}
                        strokeWidth={STROKE_WIDTH}
                      />
                      <Circle
                        stroke={theme.colors.primary}
                        fill="none"
                        cx={CIRCLE_SIZE / 2}
                        cy={CIRCLE_SIZE / 2}
                        r={RADIUS}
                        strokeWidth={STROKE_WIDTH}
                        strokeLinecap="round"
                        strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
                        strokeDashoffset={itemProgressOffset}
                        transform={`rotate(-90 ${CIRCLE_SIZE / 2} ${
                          CIRCLE_SIZE / 2
                        })`}
                      />
                    </Svg>

                    <View style={styles.chartCenter}>
                      <Text style={styles.progressValue}>{itemProgress}%</Text>
                      <Text style={styles.progressLabel}>Avance</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </ScrollView>

          {projects.length > 1 ? (
            <View style={styles.paginationDots}>
              {projects.map((projectItem, index) => (
                <View
                  key={projectItem._id}
                  style={[
                    styles.paginationDot,
                    index === activeProjectIndex && styles.paginationDotActive,
                  ]}
                />
              ))}
            </View>
          ) : null}
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ultimas tareas completadas</Text>

        {hasProject && completedTasks.length ? (
          completedTasks.map((task) => {
            const imageUri = resolveAssetUrl(task.foto_avance);
            const shouldShowImage = imageUri && !hiddenImages[task._id];

            return (
              <View key={task._id} style={styles.taskCard}>
                <Text style={styles.taskName}>{task.nombre}</Text>
                <Text style={styles.taskMeta}>
                  Operario: {task.empleado?.nombre || "No indicado"}
                </Text>
                {shouldShowImage ? (
                  <Image
                    source={{ uri: imageUri }}
                    style={styles.taskImage}
                    onError={() =>
                      setHiddenImages((current) => ({
                        ...current,
                        [task._id]: true,
                      }))
                    }
                  />
                ) : null}
              </View>
            );
          })
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              {hasProject
                ? "Todavia no hay tareas completadas para mostrar."
                : "Tu usuario cliente aun no tiene un proyecto asociado en el backend."}
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  content: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
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
  heroCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: HERO_CARD_PADDING,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  projectSlide: {
    paddingRight: 1,
  },
  projectSummary: {
    marginBottom: 18,
  },
  summaryLabel: {
    color: "#64748B",
    fontSize: 12,
    fontFamily: theme.typography.regular,
    textTransform: "uppercase",
  },
  summaryValue: {
    marginTop: 4,
    color: "#0F172A",
    fontSize: 24,
    fontFamily: theme.typography.bold,
    fontWeight: "700",
  },
  summaryMeta: {
    marginTop: 6,
    color: "#475569",
    fontFamily: theme.typography.regular,
  },
  chartCard: {
    alignItems: "center",
    justifyContent: "center",
  },
  chartCenter: {
    position: "absolute",
    alignItems: "center",
  },
  progressValue: {
    fontSize: 34,
    color: theme.colors.primary,
    fontFamily: theme.typography.bold,
    fontWeight: "700",
  },
  progressLabel: {
    marginTop: 4,
    color: theme.colors.muted,
    fontFamily: theme.typography.regular,
  },
  paginationDots: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: theme.spacing.sm,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#CBD5E1",
    marginHorizontal: 4,
  },
  paginationDotActive: {
    width: 18,
    backgroundColor: theme.colors.primary,
  },
  section: {
    marginTop: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: 20,
    color: theme.colors.text,
    fontFamily: theme.typography.bold,
    fontWeight: "700",
    marginBottom: theme.spacing.sm,
  },
  taskCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  taskName: {
    color: "#0F172A",
    fontFamily: theme.typography.medium,
    fontSize: 16,
  },
  taskMeta: {
    marginTop: 4,
    color: "#64748B",
    fontFamily: theme.typography.regular,
    fontSize: 13,
  },
  taskImage: {
    width: "100%",
    height: 180,
    borderRadius: 14,
    marginTop: 12,
    backgroundColor: "#E2E8F0",
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: theme.radii.sm,
    padding: 16,
  },
  emptyText: {
    color: theme.colors.muted,
    fontFamily: theme.typography.regular,
  },
});
