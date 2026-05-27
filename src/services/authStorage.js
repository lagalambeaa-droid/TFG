import AsyncStorage from "@react-native-async-storage/async-storage";

const SESSION_KEY = "construct_plus_session";

const decodeBase64 = (value) => {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let output = "";
  let buffer = 0;
  let bits = 0;

  for (const char of value.replace(/=+$/, "")) {
    const index = chars.indexOf(char);

    if (index === -1) {
      continue;
    }

    buffer = (buffer << 6) | index;
    bits += 6;

    if (bits >= 8) {
      bits -= 8;
      output += String.fromCharCode((buffer >> bits) & 0xff);
    }
  }

  return output;
};

export const decodeJwt = (token) => {
  try {
    const [, payload] = token.split(".");

    if (!payload) {
      return null;
    }

    const normalizedPayload = payload.replace(/-/g, "+").replace(/_/g, "/");
    const paddedPayload =
      normalizedPayload + "=".repeat((4 - (normalizedPayload.length % 4)) % 4);

    return JSON.parse(decodeBase64(paddedPayload));
  } catch (error) {
    return null;
  }
};

export const getStoredSession = async () => {
  try {
    const rawSession = await AsyncStorage.getItem(SESSION_KEY);

    if (!rawSession) {
      return null;
    }

    const parsedSession = JSON.parse(rawSession);
    const payload = decodeJwt(parsedSession.token);
    const role = parsedSession.user?.rol || payload?.rol;

    if (!parsedSession.token || !role) {
      await AsyncStorage.removeItem(SESSION_KEY);
      return null;
    }

    return {
      token: parsedSession.token,
      role,
      user: parsedSession.user || null,
      payload,
    };
  } catch (error) {
    await AsyncStorage.removeItem(SESSION_KEY);
    return null;
  }
};

export const saveSession = async ({ token, user }) => {
  await AsyncStorage.setItem(
    SESSION_KEY,
    JSON.stringify({
      token,
      user,
    })
  );
};

export const clearSession = async () => {
  await AsyncStorage.removeItem(SESSION_KEY);
};
