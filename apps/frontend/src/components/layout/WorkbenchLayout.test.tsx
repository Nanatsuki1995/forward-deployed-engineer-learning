import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { User } from '../../api/client';
import { AuthContext } from '../../auth/auth-context';
import type { AuthContextValue } from '../../auth/auth-context';
import { WorkbenchLayout } from './WorkbenchLayout';

const user: User = {
  id: 'user-agent',
  name: '现场工程师',
  email: 'agent@example.com',
  role: 'agent',
};

const authValue: AuthContextValue = {
  error: null,
  login: vi.fn(),
  logout: vi.fn(),
  status: 'authenticated',
  user,
};

describe('WorkbenchLayout', () => {
  it('keeps the shell fixed while content and sidebar menu own their scrolling', () => {
    render(
      <MemoryRouter initialEntries={['/ai-costs']}>
        <AuthContext.Provider value={authValue}>
          <WorkbenchLayout>
            <div style={{ height: 2000 }}>Long page content</div>
          </WorkbenchLayout>
        </AuthContext.Provider>
      </MemoryRouter>,
    );

    const appShell = screen.getByText('AI 工单助手').closest('.ant-layout');
    const contentScroller = screen.getByTestId('workbench-content-scroll');
    const menuScroller = screen.getByTestId('workbench-sider-menu-scroll');
    const sider = screen.getByRole('complementary');

    expect(appShell).toHaveStyle({
      height: '100vh',
      overflow: 'hidden',
    });
    expect(sider).toHaveStyle({
      height: '100vh',
      overflow: 'hidden',
    });
    expect(contentScroller).toHaveStyle({
      height: 'calc(100vh - 64px)',
      overflow: 'auto',
    });
    expect(menuScroller).toHaveStyle({
      overflowY: 'auto',
    });
  });
});
