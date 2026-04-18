import React from 'react';
import { useAuth } from "@/provider/auth-context";
import { Outlet, useLocation } from "react-router";
import ClientRedirect from '@/components/client-redirect';

const AuthLayout = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <ClientRedirect to="/sign-in" replace state={{ from: location }} />;
  }

  return <Outlet />;
};

export default AuthLayout;
