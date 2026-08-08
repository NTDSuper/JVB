/**
 * TopBar types
 */

export interface UserMenuItem {
  href: string;
  label: string;
  icon: string;
  group: "user" | "admin_manager";
}

export interface AccountDropdownProps {
  displayName: string;
  email: string | null;
  initials: string;
  menuItems: UserMenuItem[];
  onLogout: () => void;
  loggingOut: boolean;
}