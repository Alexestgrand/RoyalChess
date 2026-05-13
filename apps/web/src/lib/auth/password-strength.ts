export type PasswordStrengthTier = "weak" | "medium" | "strong";

/** Moins de 8 caractères : faible ; 8+ sans exigences complètes : moyen ; fort = maj + min + chiffre + symbole. */
export function getPasswordStrengthTier(password: string): PasswordStrengthTier {
  if (password.length < 8) {
    return "weak";
  }
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);
  if (hasUpper && hasLower && hasDigit && hasSymbol) {
    return "strong";
  }
  return "medium";
}

export function passwordStrengthBarClass(tier: PasswordStrengthTier): string {
  if (tier === "weak") {
    return "bg-red-500";
  }
  if (tier === "medium") {
    return "bg-orange-500";
  }
  return "bg-emerald-500";
}

export function passwordStrengthBarWidth(tier: PasswordStrengthTier): string {
  if (tier === "weak") {
    return "33%";
  }
  if (tier === "medium") {
    return "66%";
  }
  return "100%";
}
