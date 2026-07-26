import { Pemilik } from '@/types/pemilik.types';

interface PemilikFieldsProps {
  value: Pemilik;
  onChange: (value: Pemilik) => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
}

/**
 * Subform data diri pemilik tanah — dipakai berulang di Master Tanah (pemilik saat ini)
 * dan Transaksi (pemilik sebelumnya/baru, termasuk tiap bagian hasil Pecah Lahan).
 * Selalu lengkap 3 field: NAMA, NIK, ALAMAT LENGKAP.
 */
export function PemilikFields({
  value,
  onChange,
  label = 'Data Pemilik',
  required = true,
  disabled = false
}: PemilikFieldsProps) {
  function update<K extends keyof Pemilik>(key: K, v: Pemilik[K]) {
    onChange({ ...value, [key]: v });
  }

  return (
    <div className="space-y-3 border rounded-lg p-3 bg-gray-50">
      <p className="text-sm font-semibold text-gray-700">{label}</p>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Nama {required && '*'}
        </label>
        <input
          value={value.nama}
          onChange={(e) => update('nama', e.target.value)}
          className="w-full border rounded-lg p-3 min-h-[44px] bg-white"
          required={required}
          disabled={disabled}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          NIK {required && '*'}
        </label>
        <input
          value={value.nik}
          onChange={(e) => update('nik', e.target.value.replace(/\D/g, '').slice(0, 16))}
          className="w-full border rounded-lg p-3 min-h-[44px] bg-white"
          inputMode="numeric"
          placeholder="16 digit NIK"
          maxLength={16}
          required={required}
          disabled={disabled}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Alamat Lengkap {required && '*'}
        </label>
        <textarea
          value={value.alamatLengkap}
          onChange={(e) => update('alamatLengkap', e.target.value)}
          className="w-full border rounded-lg p-3 bg-white"
          rows={2}
          required={required}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
