import { StyleSheet, Text, View } from "react-native";
import theme from "../theme";

export default function ScreenContainer({ title, subtitle }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    backgroundColor: theme.colors.background,
  },
  title: {
    fontSize: 28,
    fontFamily: theme.typography.bold,
    fontWeight: "700",
    color: theme.colors.primary,
    marginBottom: 12,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    fontFamily: theme.typography.regular,
    color: theme.colors.muted,
    textAlign: "center",
    lineHeight: 24,
  },
});
