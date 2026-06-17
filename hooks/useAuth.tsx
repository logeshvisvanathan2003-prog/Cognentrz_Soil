'use client';
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

// In APK builds, API calls must go to the Vercel backend.
// Set NEXT_PUBLIC_API_URL to your Vercel URL during APK build.
const API_BASE = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');

interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  subscriptionTier?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
  phone?: string;
  location?: string;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('cognentrz_token');
    const storedUser = localStorage.getItem('cognentrz_user');
    if (stored && storedUser) {
      setToken(stored);
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    setUser(data.user);
    setToken(data.token);
    localStorage.setItem('cognentrz_token', data.token);
    localStorage.setItem('cognentrz_user', JSON.stringify(data.user));
  }, []);

  const register = useCallback(async (registerData: RegisterData) => {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(registerData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed');
    setUser(data.user);
    setToken(data.token);
    localStorage.setItem('cognentrz_token', data.token);
    localStorage.setItem('cognentrz_user', JSON.stringify(data.user));
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('cognentrz_token');
    localStorage.removeItem('cognentrz_user');
    window.location.href = '/login';
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

// API helper with auth
export function useApi() {
  const { token } = useAuth();
  
  return useCallback(async (url: string, options: RequestInit = {}) => {
    const fullUrl = url.startsWith('http') ? url : `${API_BASE}${url}`;
    const res = await fetch(fullUrl, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  }, [token]);
}
