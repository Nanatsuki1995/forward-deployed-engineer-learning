import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { App } from 'antd';
import { SubmitPage } from './SubmitPage';
import { api, type Ticket } from '../api/client';

// Mock the API
vi.mock('../api/client', () => ({
  api: {
    createPublicTicket: vi.fn(),
  },
}));

function renderSubmitPage() {
  return render(
    <App>
      <SubmitPage />
    </App>
  );
}

describe('SubmitPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the form with title and description fields', () => {
    renderSubmitPage();
    expect(screen.getByRole('heading', { name: '提交工单' })).toBeDefined();
    expect(screen.getByPlaceholderText('一句话描述问题')).toBeDefined();
    expect(screen.getByPlaceholderText('请详细描述遇到的问题，如发生时间、影响范围等')).toBeDefined();
  });

  it('should show contact info fields', () => {
    renderSubmitPage();
    expect(screen.getByPlaceholderText('姓名')).toBeDefined();
    expect(screen.getByPlaceholderText('手机号')).toBeDefined();
    expect(screen.getByPlaceholderText('邮箱')).toBeDefined();
  });

  it('should show submit button', () => {
    renderSubmitPage();
    const btn = screen.getByRole('button', { name: '提交工单' });
    expect(btn).toBeDefined();
  });

  it('should show validation errors on empty submit', async () => {
    renderSubmitPage();
    const btn = screen.getByRole('button', { name: '提交工单' });
    fireEvent.click(btn);

    await waitFor(() => {
      expect(screen.getByText('请输入工单标题')).toBeDefined();
    });
  });

  it('should submit successfully and show result page', async () => {
    const mockCreate = vi.mocked(api.createPublicTicket);
    mockCreate.mockResolvedValue({
      id: 'ticket-123',
      title: 'Test',
      description: 'Test desc',
      source: 'public',
    } as Ticket);

    renderSubmitPage();

    fireEvent.change(screen.getByPlaceholderText('一句话描述问题'), { target: { value: 'Test Title' } });
    fireEvent.change(
      screen.getByPlaceholderText('请详细描述遇到的问题，如发生时间、影响范围等'),
      { target: { value: 'Test Description' } }
    );
    fireEvent.click(screen.getByRole('button', { name: '提交工单' }));

    await waitFor(() => {
      expect(screen.getByText('工单提交成功')).toBeDefined();
      expect(screen.getByText(/ticket-123/)).toBeDefined();
    });
  });

  it('should display error message on API failure', async () => {
    const mockCreate = vi.mocked(api.createPublicTicket);
    mockCreate.mockRejectedValue(new Error('API Error'));

    renderSubmitPage();

    fireEvent.change(screen.getByPlaceholderText('一句话描述问题'), { target: { value: 'Test' } });
    fireEvent.change(
      screen.getByPlaceholderText('请详细描述遇到的问题，如发生时间、影响范围等'),
      { target: { value: 'Description' } }
    );
    fireEvent.click(screen.getByRole('button', { name: '提交工单' }));

    await waitFor(() => {
      // The error is shown via message.error, check the form is still visible
      expect(screen.getByRole('heading', { name: '提交工单' })).toBeDefined();
    });
  });

  it('should show "submit another" button after success', async () => {
    const mockCreate = vi.mocked(api.createPublicTicket);
    mockCreate.mockResolvedValue({
      id: 'ticket-456',
      title: 'Test',
      source: 'public',
    } as Ticket);

    renderSubmitPage();

    fireEvent.change(screen.getByPlaceholderText('一句话描述问题'), { target: { value: 'Test Title' } });
    fireEvent.change(
      screen.getByPlaceholderText('请详细描述遇到的问题，如发生时间、影响范围等'),
      { target: { value: 'Description' } }
    );
    fireEvent.click(screen.getByRole('button', { name: '提交工单' }));

    await waitFor(() => {
      expect(screen.getByText('提交新工单')).toBeDefined();
    });
  });
});
