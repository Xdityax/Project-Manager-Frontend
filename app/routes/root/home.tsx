import React from 'react';
import type { Route } from './+types/home';
import ClientRedirect from '@/components/client-redirect';

export function meta({}: Route.MetaArgs) {
  return [
    { title: "TaskHub" },
    { name: "description", content: "Redirecting to sign in." },
  ];
}

const Homepage = () => {
  return <ClientRedirect to="/sign-in" replace />;
};

export default Homepage;
