import { useRef } from 'react';

interface PinBoxInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
  disabled?: boolean;
  id?: string;
}

/**
 * Input PIN per-digit — tiap angka punya kotak sendiri, otomatis pindah ke kotak
 * berikutnya begitu kotak terisi (dan pindah mundur begitu Backspace di kotak kosong).
 * Mendukung paste PIN lengkap sekaligus (mis. dari password manager).
 * `value` tetap direpresentasikan sebagai string digit biasa ke parent, jadi tetap
 * kompatibel dengan validasi PIN 4-6 digit yang sudah ada di aplikasi ini.
 */
export function PinBoxInput({
  length = 6,
  value,
  onChange,
  autoFocus,
  disabled,
  id
}: PinBoxInputProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length }, (_, i) => value[i] ?? '');

  function ubahDigit(index: number, raw: string) {
    const hanyaAngka = raw.replace(/\D/g, '');
    if (!hanyaAngka) {
      // Backspace/hapus isi kotak ini
      const next = digits.slice();
      next[index] = '';
      onChange(next.join(''));
      return;
    }

    // Kalau yang masuk lebih dari 1 karakter (mis. paste), sebar ke kotak-kotak berikutnya
    const karakter = hanyaAngka.split('');
    const next = digits.slice();
    let cursor = index;
    for (const k of karakter) {
      if (cursor >= length) break;
      next[cursor] = k;
      cursor++;
    }
    onChange(next.join(''));

    const fokusKe = Math.min(cursor, length - 1);
    refs.current[fokusKe]?.focus();
    refs.current[fokusKe]?.select();
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      e.preventDefault();
      const next = digits.slice();
      next[index - 1] = '';
      onChange(next.join(''));
      refs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      refs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      e.preventDefault();
      refs.current[index + 1]?.focus();
    }
  }

  return (
    <div className="flex gap-1.5 sm:gap-2 justify-center sm:justify-start">
      {digits.map((d, i) => (
        <input
          key={i}
          id={i === 0 ? id : undefined}
          ref={(el) => (refs.current[i] = el)}
          type="password"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={length} // dibuka lebar supaya event paste tetap kebaca utuh, lalu disebar manual
          value={d}
          disabled={disabled}
          autoFocus={autoFocus && i === 0}
          onChange={(e) => ubahDigit(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onFocus={(e) => e.target.select()}
          className="w-10 h-12 sm:w-12 sm:h-14 text-center text-lg font-semibold border rounded-lg focus:border-primary-500 focus:ring-1 focus:ring-primary-500 disabled:bg-gray-100"
        />
      ))}
    </div>
  );
}
