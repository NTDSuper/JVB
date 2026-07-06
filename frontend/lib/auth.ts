/**
 * Auth utilities (re-export wrapper)
 *
 * Re-export từ @/auth/services/authService để backward compatibility.
 */



export {
  login,
  register,
  logout,
  getToken,
  setToken,
  removeToken,
  fetchCurrentUser,
  decodeToken,
  isTokenExpired,
} from "@/auth/services/authService";
