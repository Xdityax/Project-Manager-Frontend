import { useEffect } from 'react';
import { useNavigate } from 'react-router';

interface ClientRedirectProps {
  to: string;
  replace?: boolean;
  state?: unknown;
}

const ClientRedirect = ({ to, replace = false, state }: ClientRedirectProps) => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate(to, { replace, state });
  }, [navigate, replace, state, to]);

  return null;
};

export default ClientRedirect;