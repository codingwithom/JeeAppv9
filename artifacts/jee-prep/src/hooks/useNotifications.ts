import { useCallback, useEffect, useState } from "react";

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>("default");

  useEffect(() => {
    if ("Notification" in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!("Notification" in window)) {
      console.warn("This browser does not support desktop notification");
      return false;
    }

    if (Notification.permission !== "granted") {
      const newPermission = await Notification.requestPermission();
      setPermission(newPermission);
      return newPermission === "granted";
    }
    return true;
  }, []);

  const sendNotification = useCallback(
    (title: string, options?: NotificationOptions) => {
      if (!("Notification" in window)) return;

      if (Notification.permission === "granted") {
        new Notification(title, options);
      } else if (Notification.permission !== "denied") {
        requestPermission().then((granted) => {
          if (granted) new Notification(title, options);
        });
      }
    },
    [requestPermission]
  );

  return { permission, requestPermission, sendNotification };
}
