import { renderHook, act } from '@testing-library/react';
import { useLoginViewModel } from '../useLoginViewModel';
import { useAuthStore } from '../../../../zustand/auth';
import useAlertStore from '../../../../zustand/alert';

// Mock dependencies
jest.mock('react-router-dom', () => ({
    useNavigate: () => jest.fn(),
}));

jest.mock('../../../../zustand/auth', () => ({
    useAuthStore: jest.fn(),
}));

jest.mock('../../../../zustand/alert', () => ({
    __esModule: true,
    default: {
        getState: jest.fn(() => ({
            alert: jest.fn(),
        })),
    },
}));


describe('useLoginViewModel', () => {
    const mockLogin = jest.fn();
    const mockMe = jest.fn();
    const mockAlert = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        (useAuthStore as unknown as jest.Mock).mockReturnValue({
            login: mockLogin,
            auth: null,
            me: mockMe,
            isLoading: false,
        });
        (useAlertStore.getState as jest.Mock).mockReturnValue({
            alert: mockAlert
        });
    });

    it('should initialize with default values', () => {
        const { result } = renderHook(() => useLoginViewModel());
        expect(result.current.formValues).toEqual({ email: '', password: '' });
        expect(result.current.isLoading).toBe(false);
    });

    it('should update form values on change', () => {
        const { result } = renderHook(() => useLoginViewModel());

        act(() => {
            // Simulate event
            const event = {
                target: { name: 'email', value: 'test@example.com' },
            } as React.ChangeEvent<HTMLInputElement>;
            result.current.handleChange(event);
        });

        expect(result.current.formValues.email).toBe('test@example.com');
    });

    it('should call login with form values when valid', () => {
        const { result } = renderHook(() => useLoginViewModel());

        // Set values
        act(() => {
            const emailEvent = { target: { name: 'email', value: 'test@example.com' } } as any;
            const passwordEvent = { target: { name: 'password', value: 'secret' } } as any;
            result.current.handleChange(emailEvent);
            result.current.handleChange(passwordEvent);
        });

        // Submit
        act(() => {
            result.current.handleLogin();
        });

        expect(mockLogin).toHaveBeenCalledWith({
            email: 'test@example.com',
            password: 'secret',
        });
    });

    it('should show alert if fields are empty', () => {
        const { result } = renderHook(() => useLoginViewModel());

        act(() => {
            result.current.handleLogin();
        });

        expect(mockLogin).not.toHaveBeenCalled();
        expect(mockAlert).toHaveBeenCalledWith(
            "Por favor ingrese el correo y la contraseña",
            "error"
        );
    });
});
