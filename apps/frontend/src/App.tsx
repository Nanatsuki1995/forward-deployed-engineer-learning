import { ConfigProvider } from 'antd';
import { Navigate, Route, Routes } from 'react-router-dom';
import './App.less';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { WorkbenchLayout } from './components/layout/WorkbenchLayout';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';

function App() {
  return (
    <ConfigProvider
      theme={{
        token: {
          borderRadius: 8,
          colorPrimary: '#163c35',
          colorText: '#18211d',
          fontFamily:
            'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        },
        components: {
          Layout: {
            bodyBg: '#f3f6f4',
            siderBg: '#ffffff',
          },
        },
      }}
    >
      <Routes>
        <Route element={<LoginPage />} path="/login" />
        <Route element={<ProtectedRoute />}>
          <Route
            element={
              <WorkbenchLayout>
                <HomePage />
              </WorkbenchLayout>
            }
            path="/"
          />
        </Route>
        <Route element={<Navigate replace to="/" />} path="*" />
      </Routes>
    </ConfigProvider>
  );
}

export default App;
