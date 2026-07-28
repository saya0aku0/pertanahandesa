import { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

interface QrCodeProps {
  value: string;
  size?: number;
}

/**
 * QR Code sederhana untuk pemakaian INTERNAL (bukan portal publik) — mis. dicetak &
 * ditempel di map/berkas fisik bidang tanah, supaya petugas sendiri bisa langsung
 * scan pakai kamera HP yang sudah login, tanpa ketik ulang Nomor Sertifikat.
 * Dibuat 100% di sisi klien (library `qrcode`), tidak butuh layanan server apa pun —
 * tetap aman dipakai di Firebase Spark Plan.
 */
export function QrCode({ value, size = 160 }: QrCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, value, {
      width: size,
      margin: 1,
      color: { dark: '#1f2937', light: '#ffffff' }
    }).catch(() => {
      // Kalau gagal (mis. value kosong), biarkan canvas kosong — bukan error fatal
    });
  }, [value, size]);

  return <canvas ref={canvasRef} width={size} height={size} className="rounded-lg border" />;
}
