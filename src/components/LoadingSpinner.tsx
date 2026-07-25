export function LoadingSpinner({ label = 'Memuat...' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 gap-3 text-gray-500">
      <div className="w-8 h-8 border-4 border-primary-100 border-t-primary-700 rounded-full animate-spin" />
      <span className="text-sm">{label}</span>
    </div>
  );
}
