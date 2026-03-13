import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import { authService, type User as APIUser } from '../api/services';
import { apiClient } from '../api/client';

export type User = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  roles: string[];
  permissions: string[];
  organizationId: string;
};

type AuthState = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
};

type AuthContextType = AuthState & {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, firstName: string, lastName: string) => Promise<void>;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
};

const AuthContext = createContext<AuthContextType | null>(null);

type AuthProviderProps = {
  children: ReactNode;
};

// Convert API user to app user format
const mapAPIUserToUser = (apiUser: APIUser): User => ({
  id: apiUser.id,
  email: apiUser.email,
  firstName: apiUser.firstName,
  lastName: apiUser.lastName,
  avatarUrl: undefined,
  roles: apiUser.role ? [apiUser.role.name] : ['user'],
  permissions: apiUser.role?.permissions || [],
  organizationId: 'artifact-virtual',
});

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  // Check for existing session on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = apiClient.getToken();
      
      if (!token) {
        setState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
        return;
      }

      try {
        const apiUser = await authService.me();
        setState({
          user: mapAPIUserToUser(apiUser),
          isAuthenticated: true,
          isLoading: false,
        });
      } catch (error) {
        // Try to refresh token
        try {
          await authService.refresh();
          const apiUser = await authService.me();
          setState({
            user: mapAPIUserToUser(apiUser),
            isAuthenticated: true,
            isLoading: false,
          });
        } catch {
          // Refresh failed, clear auth
          authService.logout();
          setState({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      }
    };

    checkAuth();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      const response = await authService.login(email, password);
      setState({
        user: mapAPIUserToUser(response.user),
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
      throw error;
    }
  }, []);

  const register = useCallback(async (
    email: string, 
    password: string, 
    firstName: string, 
    lastName: string
  ) => {
    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      const response = await authService.register({
        email,
        password,
        firstName,
        lastName,
      });
      setState({
        user: mapAPIUserToUser(response.user),
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
      throw error;
    }
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
  }, []);

  const hasPermission = useCallback(
    (permission: string): boolean => {
      if (!state.user) return false;
      if (state.user.permissions.includes('*')) return true;
      return state.user.permissions.includes(permission);
    },
    [state.user]
  );

  const hasRole = useCallback(
    (role: string): boolean => {
      if (!state.user) return false;
      return state.user.roles.includes(role);
    },
    [state.user]
  );

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        register,
        logout,
        hasPermission,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}

export function useUser(): User | null {
  const { user } = useAuth();
  return user;
}

export function usePermission(permission: string): boolean {
  const { hasPermission } = useAuth();
  return hasPermission(permission);
}
