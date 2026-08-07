import { ChangeEvent } from 'react';

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterConfig {
  key: string;
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
}

export interface SortOption {
  value: string;
  label: string;
}

interface ListControlsProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  filters?: FilterConfig[];
  sortOptions?: SortOption[];
  sortValue?: string;
  onSortChange?: (value: string) => void;
  sortDir?: 'asc' | 'desc';
  onSortDirChange?: (dir: 'asc' | 'desc') => void;
}

/**
 * Bar kontrol daftar generik — dipakai di Master Tanah & Transaksi supaya konsisten:
 * SearchBar (cari kata kunci), Filter (dropdown per kolom), dan Sort By (kolom + arah).
 * Bekerja di sisi klien terhadap data yang sudah ter-load (lihat TanahTable & Pages.tsx).
 */
export function ListControls({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Cari...',
  filters = [],
  sortOptions = [],
  sortValue,
  onSortChange,
  sortDir = 'asc',
  onSortDirChange
}: ListControlsProps) {
  function handleSearch(e: ChangeEvent<HTMLInputElement>) {
    onSearchChange(e.target.value);
  }

  return (
    <div className="bg-white border rounded-xl p-3 flex flex-col md:flex-row gap-3 md:items-center flex-wrap">
      {/* SearchBar */}
      <div className="flex-1 min-w-0 md:min-w-[180px]">
        <input
          value={searchValue}
          onChange={handleSearch}
          placeholder={searchPlaceholder}
          className="w-full border rounded-lg p-3 min-h-[44px] text-base"
        />
      </div>

      {/* Filter */}
      {filters.map((f) => (
        <div key={f.key} className="w-full sm:w-auto sm:min-w-[150px]">
          <select
            value={f.value}
            onChange={(e) => f.onChange(e.target.value)}
            className="w-full border rounded-lg p-3 min-h-[44px] text-base bg-white"
            aria-label={f.label}
          >
            <option value="">{f.label}: Semua</option>
            {f.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      ))}

      {/* Sort By */}
      {sortOptions.length > 0 && onSortChange && (
        <div className="flex gap-2 w-full sm:w-auto sm:min-w-[180px]">
          <select
            value={sortValue}
            onChange={(e) => onSortChange(e.target.value)}
            className="flex-1 min-w-0 border rounded-lg p-3 min-h-[44px] text-base bg-white"
            aria-label="Sort By"
          >
            {sortOptions.map((o) => (
              <option key={o.value} value={o.value}>
                Urutkan: {o.label}
              </option>
            ))}
          </select>
          {onSortDirChange && (
            <button
              type="button"
              onClick={() => onSortDirChange(sortDir === 'asc' ? 'desc' : 'asc')}
              className="shrink-0 border rounded-lg px-3 min-h-[44px] text-sm hover:bg-gray-50"
              title={sortDir === 'asc' ? 'Naik (A-Z / kecil-besar)' : 'Turun (Z-A / besar-kecil)'}
            >
              {sortDir === 'asc' ? '↑ Naik' : '↓ Turun'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
