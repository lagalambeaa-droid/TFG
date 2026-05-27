import { Image, StyleSheet } from "react-native";
import { createStackNavigator } from "@react-navigation/stack";
import LoginScreen from "../screens/LoginScreen";
import RegistroScreen from "../screens/RegistroScreen";
import theme from "../theme";

const logo = require("../../assets/Logo.png");

const Stack = createStackNavigator();

const HeaderLogo = () => (
  <Image source={logo} style={styles.headerLogo} resizeMode="contain" />
);

export default function AuthStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.primary },
        headerTintColor: theme.colors.surface,
        headerTitleStyle: {
          fontFamily: theme.typography.medium,
        },
        headerLeft: () => <HeaderLogo />,
      }}
    >
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen name="Registro" component={RegistroScreen} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  headerLogo: {
    width: 36,
    height: 36,
    borderRadius: 8,
    marginLeft: 12,
    backgroundColor: "transparent",
  },
});
