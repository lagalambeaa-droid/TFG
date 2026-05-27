import { Platform } from "react-native";

const theme = {
  colors: {
    primary: "#1E3A8A",
    secondary: "#F97316",
    background: "#F3F4F6",
    surface: "#FFFFFF",
    text: "#111827",
    muted: "#6B7280",
    border: "#D1D5DB",
    success: "#15803D",
    danger: "#B91C1C",
  },
  spacing: {
    xs: 8,
    sm: 12,
    md: 16,
    lg: 24,
  },
  radii: {
    sm: 8,
    md: 12,
    lg: 16,
  },
  typography: {
    regular: Platform.select({
      android: "Roboto",
      ios: "System",
      default: "sans-serif",
    }),
    medium: Platform.select({
      android: "Roboto",
      ios: "System",
      default: "sans-serif-medium",
    }),
    bold: Platform.select({
      android: "Roboto",
      ios: "System",
      default: "sans-serif",
    }),
  },
};

export default theme;
