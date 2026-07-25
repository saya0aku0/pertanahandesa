import { ReactNode } from 'react';

export interface TableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
}

interface TableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
}

/**
 * Tabel data yang berubah jadi CARD LIST di layar <768px (§13 Mobile UX)
 * — bukan tabel horizontal-scroll yang susah dibaca di HP.
 */
export function Table<T>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  emptyMessage = 'Belum ada data.'
}: TableProps<T>) {
  if (data.length === 0) {
    return <p className="text-center text-gray-500 py-8">{emptyMessage}</p>;
  }

  return (
    <>
      {/* Tampilan tabel — desktop (>=768px) */}
      <table className="hidden md:table w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-50 text-left">
            {columns.map((col) => (
              <th key={col.key} className="p-3 font-semibold text-gray-700 border-b">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr
              key={keyExtractor(row)}
              onClick={() => onRowClick?.(row)}
              className={`border-b hover:bg-primary-50 ${onRowClick ? 'cursor-pointer' : ''}`}
            >
              {columns.map((col) => (
                <td key={col.key} className="p-3">
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Tampilan kartu — mobile (<768px) */}
      <div className="md:hidden space-y-3">
        {data.map((row) => (
          <div
            key={keyExtractor(row)}
            onClick={() => onRowClick?.(row)}
            className={`bg-white rounded-xl border p-4 shadow-sm space-y-1 ${
              onRowClick ? 'active:bg-primary-50 cursor-pointer' : ''
            }`}
          >
            {columns.map((col) => (
              <div key={col.key} className="flex justify-between gap-3 text-sm">
                <span className="text-gray-500">{col.header}</span>
                <span className="text-right font-medium">{col.render(row)}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}
