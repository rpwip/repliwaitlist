import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PatientVerificationForm from '../patient-verification-form';
import { renderWithProviders } from '../../tests/setup';
import { usePatient } from '@/hooks/use-patient';
import { useToast } from '@/hooks/use-toast';

// Mock the hooks
jest.mock('@/hooks/use-patient');
jest.mock('@/hooks/use-toast');
jest.mock('wouter', () => ({
  useLocation: () => ['/current-path', jest.fn()],
}));

const mockUsePatient = usePatient as jest.MockedFunction<typeof usePatient>;
const mockUseToast = useToast as jest.MockedFunction<typeof useToast>;

describe('PatientVerificationForm', () => {
  beforeEach(() => {
    mockUseToast.mockReturnValue({
      toast: jest.fn(),
    } as any);

    mockUsePatient.mockReturnValue({
      verifyPatient: jest.fn(),
      isVerifying: false,
    } as any);
  });

  it('renders the form correctly', () => {
    renderWithProviders(<PatientVerificationForm />);
    expect(screen.getByLabelText(/mobile number/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /verify/i })).toBeInTheDocument();
  });

  it('shows loading state while verifying', async () => {
    mockUsePatient.mockReturnValue({
      verifyPatient: jest.fn(),
      isVerifying: true,
    } as any);

    renderWithProviders(<PatientVerificationForm />);
    expect(screen.getByText(/verifying/i)).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('handles successful verification with existing patient', async () => {
    const mockVerifyPatient = jest.fn().mockResolvedValue({
      id: 1,
      fullName: 'Test Patient',
      mobile: '1234567890',
    });

    mockUsePatient.mockReturnValue({
      verifyPatient: mockVerifyPatient,
      isVerifying: false,
    } as any);

    renderWithProviders(<PatientVerificationForm />);

    const input = screen.getByLabelText(/mobile number/i);
    await userEvent.type(input, '1234567890');
    await userEvent.click(screen.getByRole('button', { name: /verify/i }));

    await waitFor(() => {
      expect(mockVerifyPatient).toHaveBeenCalledWith({
        mobile: '1234567890',
      });
    });
  });

  it('handles verification for new patient', async () => {
    const mockVerifyPatient = jest.fn().mockResolvedValue(null);
    const mockSetLocation = jest.fn();

    mockUsePatient.mockReturnValue({
      verifyPatient: mockVerifyPatient,
      isVerifying: false,
    } as any);

    jest.mock('wouter', () => ({
      useLocation: () => ['/', mockSetLocation],
    }));

    renderWithProviders(<PatientVerificationForm />);

    const input = screen.getByLabelText(/mobile number/i);
    await userEvent.type(input, '9876543210');
    await userEvent.click(screen.getByRole('button', { name: /verify/i }));

    await waitFor(() => {
      expect(mockVerifyPatient).toHaveBeenCalledWith({
        mobile: '9876543210',
      });
    });
  });

  it('handles verification error', async () => {
    const mockToast = jest.fn();
    mockUseToast.mockReturnValue({ toast: mockToast } as any);

    const mockVerifyPatient = jest.fn().mockRejectedValue(new Error('Verification failed'));
    mockUsePatient.mockReturnValue({
      verifyPatient: mockVerifyPatient,
      isVerifying: false,
    } as any);

    renderWithProviders(<PatientVerificationForm />);

    const input = screen.getByLabelText(/mobile number/i);
    await userEvent.type(input, '1234567890');
    await userEvent.click(screen.getByRole('button', { name: /verify/i }));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Verification failed',
        variant: 'destructive',
      }));
    });
  });
});