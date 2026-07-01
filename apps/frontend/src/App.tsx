import { App as AntdApp, ConfigProvider } from 'antd';
import { Navigate, Route, Routes } from 'react-router-dom';
import './App.less';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { NotificationProvider } from './notifications/NotificationContext';
import { WorkbenchLayout } from './components/layout/WorkbenchLayout';
import { AiCostDashboardPage } from './pages/AiCostDashboardPage';
import { AuditLogPage } from './pages/AuditLogPage';
import { DashboardPage } from './pages/DashboardPage';
import { KnowledgePage } from './pages/KnowledgePage';
import { LoginPage } from './pages/LoginPage';
import { RoadmapPage } from './pages/RoadmapPage';
import { SubmitPage } from './pages/SubmitPage';
import { TicketsPage } from './pages/TicketsPage';

function App() {
  return (
    <ConfigProvider
      theme={{
        token: {
          // Seed tokens
          colorPrimary: '#3b82f0',
          colorSuccess: '#10b981',
          colorWarning: '#f59e0b',
          colorError: '#ef4444',
          colorInfo: '#3b82f0',
          borderRadius: 8,
          fontFamily:
            '"Geist", "Geist Fallback", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          // Map tokens
          colorText: '#1e293b',
          colorTextSecondary: '#64748b',
          colorTextTertiary: '#94a3b8',
          colorBorder: '#e2e8f0',
          colorBorderSecondary: '#f1f5f9',
          colorBgContainer: '#ffffff',
          colorBgLayout: '#f8fafc',
          colorBgElevated: '#ffffff',
          colorFillAlter: '#f8fafc',
          colorFillContent: '#eff6ff',
          controlHeight: 36,
          lineHeight: 1.5714,
          fontSize: 14,
          fontSizeHeading1: 28,
          fontSizeHeading2: 22,
          fontSizeHeading3: 18,
          fontSizeHeading4: 16,
          fontSizeHeading5: 14,
          paddingContentHorizontal: 16,
          paddingContentVertical: 12,
          motionDurationMid: '0.2s',
          motionEaseInOut: 'cubic-bezier(0.645, 0.045, 0.355, 1)',
        },
        components: {
          Layout: {
            bodyBg: '#f8fafc',
            siderBg: '#ffffff',
            headerBg: '#ffffff',
            triggerBg: '#f1f5f9',
          },
          Card: {
            paddingLG: 24,
            headerFontSize: 16,
          },
          Menu: {
            itemBg: 'transparent',
            subMenuItemBg: 'transparent',
            itemActiveBg: '#eff6ff',
            itemSelectedBg: '#dbeafe',
            itemSelectedColor: '#3b82f0',
            itemColor: '#475569',
            itemHoverColor: '#3b82f0',
            iconSize: 18,
            collapsedIconSize: 18,
            itemMarginBlock: 2,
            itemBorderRadius: 8,
          },
          Button: {
            contentFontSize: 14,
            controlHeight: 36,
            controlHeightLG: 44,
            controlHeightSM: 30,
            borderRadius: 8,
            primaryShadow: '0 2px 8px rgba(59, 130, 246, 0.25)',
          },
          Input: {
            controlHeight: 36,
            controlHeightLG: 44,
            borderRadius: 8,
          },
          Segmented: {
            itemSelectedBg: '#3b82f0',
            itemSelectedColor: '#ffffff',
          },
          Table: {
            headerBg: '#f8fafc',
            rowHoverBg: '#f0f9ff',
            borderColor: '#f1f5f9',
          },
          Tag: {
            borderRadiusSM: 4,
          },
          Breadcrumb: {
            itemColor: '#94a3b8',
            lastItemColor: '#1e293b',
            linkColor: '#64748b',
            linkHoverColor: '#3b82f0',
          },
          Statistic: {
            contentFontSize: 28,
          },
        },
      }}
    >
      <AntdApp>
        <Routes>
          <Route element={<LoginPage />} path="/login" />
          <Route element={<SubmitPage />} path="/submit" />
          <Route element={<ProtectedRoute />}>
            <Route
              element={
                <NotificationProvider>
                  <WorkbenchLayout>
                    <Routes>
                      <Route element={<DashboardPage />} path="/" />
                      <Route element={<TicketsPage />} path="/tickets" />
                      <Route element={<AiCostDashboardPage />} path="/ai-costs" />
                      <Route element={<KnowledgePage />} path="/knowledge" />
                      <Route element={<RoadmapPage />} path="/roadmap" />
                      <Route element={<AuditLogPage />} path="/audit" />
                    </Routes>
                  </WorkbenchLayout>
                </NotificationProvider>
              }
              path="*"
            />
          </Route>
          <Route element={<Navigate replace to="/" />} path="*" />
        </Routes>
      </AntdApp>
    </ConfigProvider>
  );
}

export default App;
