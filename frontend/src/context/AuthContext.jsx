import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedUser = localStorage.getItem('user');
      const token = localStorage.getItem('access_token');

      if (storedUser && token) {
        setUser(JSON.parse(storedUser));

        // Refresh user data from server to get latest info
        try {
          const response = await authAPI.getProfile();
          const freshUser = response.data;
          localStorage.setItem('user', JSON.stringify(freshUser));
          setUser(freshUser);
        } catch (error) {
          console.error('Failed to refresh user data:', error);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (mobile, password) => {
    const response = await authAPI.login({ mobile, password });
    const { user, tokens } = response.data;

    localStorage.setItem('access_token', tokens.access);
    localStorage.setItem('refresh_token', tokens.refresh);
    localStorage.setItem('user', JSON.stringify(user));

    setUser(user);
    return user;
  };

  const loginWithOTP = async (mobile, otp) => {
    const response = await authAPI.verifyOTP({ mobile, otp });
    const { user, tokens } = response.data;

    localStorage.setItem('access_token', tokens.access);
    localStorage.setItem('refresh_token', tokens.refresh);
    localStorage.setItem('user', JSON.stringify(user));

    setUser(user);
    return user;
  };

  const adminSignup = async (data) => {
    const response = await authAPI.adminSignup(data);
    const { user, tokens } = response.data;

    localStorage.setItem('access_token', tokens.access);
    localStorage.setItem('refresh_token', tokens.refresh);
    localStorage.setItem('user', JSON.stringify(user));

    setUser(user);
    return user;
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const updateUser = (userData) => {
    const updatedUser = { ...user, ...userData };
    localStorage.setItem('user', JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  const refreshUser = async () => {
    try {
      const response = await authAPI.getProfile();
      const freshUser = response.data;
      localStorage.setItem('user', JSON.stringify(freshUser));
      setUser(freshUser);
      return freshUser;
    } catch (error) {
      console.error('Failed to refresh user data:', error);
      throw error;
    }
  };

  const value = {
    user,
    loading,
    login,
    loginWithOTP,
    adminSignup,
    logout,
    updateUser,
    refreshUser,
    isAdmin: user?.is_admin || false,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
