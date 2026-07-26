import { useRef, useState } from 'react';
import { useAuthUser } from '@/modules/auth/useAuthUser';
import { verifyPin, pinSudahDiset, setPinAwal } from '@/modules/kelola-user/pin.service';

/**
 * Gerbang PIN — bungkus aksi Edit/Hapus pada data yang sudah tersimpan.
 * Kalau user belum pernah punya PIN (mis. user lama dari sebelum fitur ini ada),
 * otomatis diarahkan ke dialog "buat PIN baru" dulu, bukan langsung gagal verifikasi.
 *
 * Pemakaian: const { requestPin, pinDialogProps } = usePinGuard();
 *            <button onClick={() => requestPin(() => doHapus())}>Hapus</button>
 *            <PinDialog {...pinDialogProps} />
 */
export function usePinGuard() {
  const { user } = useAuthUser();
  const [open, setOpen] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);
  const pendingAction = useRef<(() => void) | null>(null);

  async function requestPin(action: () => void) {
    pendingAction.current = action;
    const sudahAda = await pinSudahDiset(user?.email);
    setNeedsSetup(!sudahAda);
    setOpen(true);
  }

  async function handleVerify(pin: string) {
    return verifyPin(user?.email, pin);
  }

  async function handleSetup(pin: string) {
    await setPinAwal(user?.email, pin);
  }

  function handleSuccess() {
    setOpen(false);
    const action = pendingAction.current;
    pendingAction.current = null;
    action?.();
  }

  function handleCancel() {
    pendingAction.current = null;
    setOpen(false);
  }

  return {
    requestPin,
    pinDialogProps: {
      open,
      needsSetup,
      onCancel: handleCancel,
      onVerify: handleVerify,
      onSetup: handleSetup,
      onSuccess: handleSuccess
    }
  };
}
