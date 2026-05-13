/** Libellés centralisés pour les toasts (éviter les chaînes dupliquées). */

export const toastMessages = {
  loginWelcome: (username: string): string => `Bienvenue, ${username} !`,
  logoutFarewell: "À bientôt !",
  avatarUpdated: "Photo de profil mise à jour.",
  profileUpdated: "Profil mis à jour.",
  passwordUpdated: "Mot de passe mis à jour.",
  inviteLinkCopied: "Lien copié dans le presse-papier.",
  socketOffline: "Connexion perdue. Reconnexion…",
} as const;

export const TOAST_IDS = {
  socketOffline: "socket-offline",
} as const;
