import { create } from "zustand";
import {
  authLogin,
  authRegister,
  authMe,
  authLogout,
  authUpdateProfile,
  getAccessToken,
  onSessionExpired,
  type UserResponse,
  type AuthResponse,
} from "../lib/api";

interface AuthState {
  user: UserResponse | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (
    name: string,
    email: string,
    password: string,
    role?: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (name: string) => Promise<void>;
  setUser: (user: UserResponse) => void;
}

export const useAuthStore = create<AuthState>((set) => {
  // Register the session-expired callback so that when the API client
  // fails to refresh a token, the auth state is cleared automatically.
  onSessionExpired(() => {
    set({ user: null, isAuthenticated: false, isLoading: false });
  });

  function applyAuthResponse(res: AuthResponse) {
    set({ user: res.user, isAuthenticated: true, isLoading: false });
  }

  return {
    user: null,
    isAuthenticated: false,
    isLoading: true,

    async initialize() {
      const token = getAccessToken();
      if (!token) {
        set({ isLoading: false });
        return;
      }
      try {
        const user = await authMe();
        set({ user, isAuthenticated: true, isLoading: false });
      } catch {
        // authMe already attempted a refresh via the api client.
        // If we're here, refresh also failed and tokens were cleared.
        set({ user: null, isAuthenticated: false, isLoading: false });
      }
    },

    async login(email, password) {
      set({ isLoading: true });
      const res = await authLogin(email, password);
      applyAuthResponse(res);
    },

    async register(name, email, password, role = "STUDENT") {
      set({ isLoading: true });
      const res = await authRegister(name, email, password, role);
      applyAuthResponse(res);
    },

    async logout() {
      await authLogout();
      set({ user: null, isAuthenticated: false, isLoading: false });
    },

    async updateProfile(name) {
      const updated = await authUpdateProfile(name);
      set({ user: updated });
    },

    setUser(user) {
      set({ user, isAuthenticated: true, isLoading: false });
    },
  };
});
