const Usuario = require("../models/Usuario");

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

async function sendPushNotification(expoPushToken, title, body, data = {}) {
  const validExpoToken =
    typeof expoPushToken === "string" &&
    (expoPushToken.startsWith("ExpoPushToken[") ||
      expoPushToken.startsWith("ExponentPushToken["));

  if (!validExpoToken) {
    return null;
  }

  const message = {
    to: expoPushToken,
    sound: "default",
    title,
    body,
    data,
  };

  try {
    const response = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    });
    return await response.json();
  } catch (error) {
    console.error("Error enviando notificacion push:", error.message);
    return null;
  }
}

async function notifyUser(userId, title, body, data = {}) {
  try {
    const user = await Usuario.findById(userId).select("expoPushToken");
    if (user?.expoPushToken) {
      return sendPushNotification(user.expoPushToken, title, body, data);
    }
  } catch (error) {
    console.error("Error en notifyUser:", error.message);
  }
  return null;
}

async function notifyUsersByRole(role, title, body, data = {}) {
  try {
    const users = await Usuario.find({
      rol: role,
      expoPushToken: { $ne: null },
    }).select("expoPushToken");

    const promises = users.map((u) =>
      sendPushNotification(u.expoPushToken, title, body, data)
    );
    return Promise.allSettled(promises);
  } catch (error) {
    console.error("Error en notifyUsersByRole:", error.message);
  }
  return [];
}

module.exports = { sendPushNotification, notifyUser, notifyUsersByRole };
