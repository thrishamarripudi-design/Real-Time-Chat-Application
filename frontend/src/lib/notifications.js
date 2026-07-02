// Thin wrapper around the browser Notification API.
// Falls back silently (no crash) if the user hasn't granted permission
// or if Notification isn't supported (e.g. some mobile browsers).

export const requestNotificationPermission = async () => {
  if (!("Notification" in window)) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  try {
    const result = await Notification.requestPermission();
    return result;
  } catch {
    return "denied";
  }
};

export const showNotification = (title, options = {}) => {
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  // Don't notify about activity in the tab the user is currently viewing.
  if (document.visibilityState === "visible" && options.suppressIfVisible) return;

  try {
    const notification = new Notification(title, {
      icon: "/vite.svg",
      badge: "/vite.svg",
      ...options,
    });
    notification.onclick = () => {
      window.focus();
      notification.close();
      if (options.onClick) options.onClick();
    };
    return notification;
  } catch {
    // Notification constructor can throw in some contexts (e.g. service worker required) -- ignore.
  }
};