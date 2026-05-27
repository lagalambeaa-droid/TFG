import { Alert, Pressable, StyleSheet, Text } from "react-native";
import { useAuth } from "../context/AuthContext";
import theme from "../theme";

export default function LogoutButton() {
  const { signOut } = useAuth();

  const handlePress = () => {
    Alert.alert("Cerrar sesion", "Se cerrara la sesion actual.", [
      {
        text: "Cancelar",
        style: "cancel",
      },
      {
        text: "Salir",
        style: "destructive",
        onPress: () => {
          signOut();
        },
      },
    ]);
  };

  return (
    <Pressable onPress={handlePress} style={styles.button}>
      <Text style={styles.text}>Salir</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  text: {
    color: theme.colors.surface,
    fontFamily: theme.typography.medium,
    fontWeight: "600",
  },
});
