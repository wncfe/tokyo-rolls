import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAuth } from '../hooks/useAuth';
import type { User, Address } from '../types';

// Mock the entire api module
const mockRequestCode = vi.fn();
const mockVerifyCode = vi.fn();
const mockFetchProfile = vi.fn();
const mockFetchAddresses = vi.fn();
const mockRefreshToken = vi.fn();
const mockGetStoredToken = vi.fn();
const mockClearStoredToken = vi.fn();

vi.mock('../api', () => ({
  requestCode: (...args: any[]) => mockRequestCode(...args),
  verifyCode: (...args: any[]) => mockVerifyCode(...args),
  fetchProfile: (...args: any[]) => mockFetchProfile(...args),
  fetchAddresses: (...args: any[]) => mockFetchAddresses(...args),
  refreshToken: (...args: any[]) => mockRefreshToken(...args),
  getStoredToken: (...args: any[]) => mockGetStoredToken(...args),
  clearStoredToken: (...args: any[]) => mockClearStoredToken(...args),
}));

const mockUser: User = { id: 1, phone: '+79991111111' };
const mockAddresses: Address[] = [
  { id: 1, full_address: 'г Пермь, ул Ленина, д 1', flat: '5', entrance: '1', floor: '2', intercom: '', comment: '', is_default: true, created_at: '2024-01-01T00:00:00+05:00' },
];

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetStoredToken.mockReturnValue(null);
  });

  it('starts with null user and empty addresses', () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.user).toBeNull();
    expect(result.current.addresses).toEqual([]);
  });

  it('restores session when token exists', async () => {
    mockGetStoredToken.mockReturnValue({ access: 'valid-token', refresh: 'valid-refresh' });
    mockFetchProfile.mockResolvedValue(mockUser);
    mockFetchAddresses.mockResolvedValue(mockAddresses);

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.user).toEqual(mockUser);
    });
    expect(result.current.addresses).toEqual(mockAddresses);
    expect(mockFetchProfile).toHaveBeenCalledTimes(1);
  });

  it('tries refresh token when profile fetch fails', async () => {
    mockGetStoredToken.mockReturnValue({ access: 'expired-token', refresh: 'valid-refresh' });
    mockRefreshToken.mockResolvedValue({ access: 'new-token' });
    // First call fails → refresh succeeds → second call succeeds
    mockFetchProfile.mockRejectedValueOnce(new Error('unauthorized'))
                     .mockResolvedValueOnce(mockUser);
    mockFetchAddresses.mockResolvedValue(mockAddresses);

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.user).toEqual(mockUser);
    });
    expect(mockRefreshToken).toHaveBeenCalledTimes(1);
    expect(result.current.addresses).toEqual(mockAddresses);
  });

  it('clears token when refresh also fails', async () => {
    mockGetStoredToken.mockReturnValue({ access: 'expired-token', refresh: 'stale-refresh' });
    mockFetchProfile.mockRejectedValue(new Error('unauthorized'));
    mockRefreshToken.mockRejectedValue(new Error('refresh failed'));

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(mockClearStoredToken).toHaveBeenCalled();
    });
    expect(result.current.user).toBeNull();
  });

  it('loginWithPhone calls requestCode', async () => {
    mockRequestCode.mockResolvedValue({ success: true });
    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.loginWithPhone('+79991111111');
    });

    expect(mockRequestCode).toHaveBeenCalledWith('+79991111111');
  });

  it('verifyPhoneCode calls verifyCode and loads profile', async () => {
    mockVerifyCode.mockResolvedValue({ access: 'new-access', refresh: 'new-refresh', user: mockUser });
    mockFetchProfile.mockResolvedValue(mockUser);
    mockFetchAddresses.mockResolvedValue(mockAddresses);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.verifyPhoneCode('+79991111111', '1234');
    });

    expect(mockVerifyCode).toHaveBeenCalledWith({ phone: '+79991111111', code: '1234' });
    await waitFor(() => {
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.addresses).toEqual(mockAddresses);
    });
  });

  it('logout clears user, addresses, and token', () => {
    mockGetStoredToken.mockReturnValue({ access: 'valid', refresh: 'valid' });
    mockFetchProfile.mockResolvedValue(mockUser);
    mockFetchAddresses.mockResolvedValue(mockAddresses);

    const { result } = renderHook(() => useAuth());

    act(() => result.current.logout());
    expect(mockClearStoredToken).toHaveBeenCalled();
    expect(result.current.user).toBeNull();
    expect(result.current.addresses).toEqual([]);
  });

  it('refreshAddresses reloads addresses', async () => {
    mockFetchAddresses.mockResolvedValue(mockAddresses);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.refreshAddresses();
    });

    expect(mockFetchAddresses).toHaveBeenCalled();
    expect(result.current.addresses).toEqual(mockAddresses);
  });
});
