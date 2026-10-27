import { useAuthStore } from '../store/authStore';

export function useAuth() {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const login = useAuthStore((s) => s.login);
  const logout = useAuthStore((s) => s.logout);
  const initAuth = useAuthStore((s) => s.initAuth);
  const setUser = useAuthStore((s) => s.setUser);

  const role = user?.role;
  const isInstitution = role === 'institution';
  const isOfficer = role === 'officer';
  const isAdmin = role === 'admin';
  const isStaff = isOfficer || isAdmin;

  return {
    user,
    token,
    isAuthenticated,
    isLoading,
    login,
    logout,
    initAuth,
    setUser,
    role,
    isInstitution,
    isOfficer,
    isAdmin,
    isStaff,
  };
}
