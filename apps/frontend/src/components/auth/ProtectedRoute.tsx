import { Spin } from 'antd';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';

export function ProtectedRoute() {
  const location = useLocation();
  const { status } = useAuth();

  if (status === 'checking') {
    return (
      <main className="route-loading">
        <Spin description="正在恢复登录状态" size="large" />
      </main>
    );
  }

  if (status === 'anonymous') {
    return <Navigate replace state={{ from: location }} to="/login" />;
  }

  return <Outlet />;
}
