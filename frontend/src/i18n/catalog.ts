export const SUPPORTED_LOCALES = ["en", "es"] as const;

export type LocaleCode = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: LocaleCode = "en";

export const MESSAGES: Record<LocaleCode, Record<string, string>> = {
  en: {
    "auth.checkingSession": "Checking session...",
    "layout.language": "Language",
    "layout.searchPlaceholder": "Search chats, tickets, contacts (Cmd/Ctrl+K)",
    "layout.status.online": "online",
    "layout.status.busy": "busy",
    "layout.status.away": "away",
    "layout.status.offline": "offline",
    "layout.logout": "Logout",
    "layout.commandPalette": "Command Palette",
    "layout.command.noResults": "No results",
    "layout.notifications.title": "Notifications",
    "layout.notifications.subtitle": "New chats, visitor messages, assignments, and system alerts.",
    "layout.notifications.testSound": "Test sound",
    "layout.notifications.recent": "{count} recent",
    "layout.notifications.read": "Read",
    "layout.notifications.clear": "Clear",
    "layout.notifications.emptyTitle": "No notifications yet",
    "layout.notifications.emptySubtitle": "When a visitor messages the admin, it will appear here with the sound alert.",
  },
  es: {
    "auth.checkingSession": "Verificando sesión...",
    "layout.language": "Idioma",
    "layout.searchPlaceholder": "Buscar chats, tickets, contactos (Cmd/Ctrl+K)",
    "layout.status.online": "en línea",
    "layout.status.busy": "ocupado",
    "layout.status.away": "ausente",
    "layout.status.offline": "desconectado",
    "layout.logout": "Cerrar sesión",
    "layout.commandPalette": "Paleta de comandos",
    "layout.command.noResults": "Sin resultados",
    "layout.notifications.title": "Notificaciones",
    "layout.notifications.subtitle": "Nuevos chats, mensajes de visitantes, asignaciones y alertas del sistema.",
    "layout.notifications.testSound": "Probar sonido",
    "layout.notifications.recent": "{count} recientes",
    "layout.notifications.read": "Leído",
    "layout.notifications.clear": "Limpiar",
    "layout.notifications.emptyTitle": "Aún no hay notificaciones",
    "layout.notifications.emptySubtitle": "Cuando un visitante envíe un mensaje al administrador, aparecerá aquí con alerta de sonido.",
  },
};
