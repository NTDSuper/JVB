/**
 * TopBar helpers
 */

export function getInitials(name?: string | null, email?: string | null): string {
  if (name && name.trim()) {
    return name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  if (email && email.trim()) {
    return email[0].toUpperCase();
  }
  return "?";
}

export function getDisplayName(
  fullName?: string | null,
  email?: string | null
): string {
  if (fullName && fullName.trim()) return fullName.trim();
  if (email && email.trim()) return email.trim();
  return "User";
}