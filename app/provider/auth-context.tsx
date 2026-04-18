import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { clearStoredToken, fetchCurrentUser, getStoredToken, postData, setStoredToken } from "@/lib/fetch-util";

interface User {
  id: string;
  name: string;
  email: string;
    phone?: string | null;
  profilePicture?: string;
    lastLogin?: string | null;
}

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login:(email: string, password: string) => Promise<User>;
    register: (name: string, email: string, password: string, phone?: string) => Promise<User>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AuthProvider = ({children}:{ children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [hasSession, setHasSession] = useState(() => Boolean(getStoredToken()));
    const [isLoading, setIsLoading] = useState(true);   

    useEffect(() => {
        const bootstrapAuth = async () => {
            const token = getStoredToken();

            if (!token) {
                setIsLoading(false);
                return;
            }

            try {
                const response = await fetchCurrentUser<User>();
                setUser(response.user);
                setHasSession(true);
            } catch (_error) {
                clearStoredToken();
                setUser(null);
                setHasSession(false);
            } finally {
                setIsLoading(false);
            }
        };

        const handleLogout = () => {
            setUser(null);
            setHasSession(false);
        };

        bootstrapAuth();
        window.addEventListener("logout", handleLogout);

        return () => {
            window.removeEventListener("logout", handleLogout);
        };
    }, []);

  const login = async (email: string, password: string) => {
        const response = await postData<{ token: string; user: User }, { email: string; password: string }>("/auth/login", {
            email,
            password,
        });

        setStoredToken(response.token);
        setHasSession(true);
        setUser(response.user);

        return response.user;
  };

    const register = async (name: string, email: string, password: string, phone?: string) => {
            const response = await postData<{ token: string; user: User }, { name: string; email: string; password: string; phone?: string }>('/auth/register', {
        name,
        email,
        password,
                phone,
      });

      setStoredToken(response.token);
      setHasSession(true);
      setUser(response.user);

      return response.user;
  };

    const logout = async () => {
        clearStoredToken();
        setUser(null);
        setHasSession(false);
    };

    const isAuthenticated = hasSession;

    const values = useMemo(() => ({
        user,
        isAuthenticated,
        isLoading,
        login,
        register,
        logout
    }), [isAuthenticated, isLoading, user]);

    return <AuthContext.Provider value={values}>{children}</AuthContext.Provider>
};

export default AuthProvider;

export const useAuth = () => {
    const context = useContext(AuthContext);    
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
