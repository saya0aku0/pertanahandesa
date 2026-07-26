import { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  children: ReactNode;
}

const variantClasses: Record<string, string> = {
  primary: 'bg-primary-700 text-white hover:bg-primary-800 active:bg-primary-800',
  secondary: 'bg-gray-100 text-gray-800 hover:bg-gray-200 active:bg-gray-300',
  danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800',
  ghost: 'bg-transparent text-primary-700 hover:bg-primary-50 active:bg-primary-100'
};

// Touch target minimal 44x44px sesuai §13 Mobile UX; active: untuk feedback visual
// saat disentuh di layar HP/tablet (hover saja tidak muncul di perangkat sentuh)
export function Button({ variant = 'primary', className = '', children, ...props }: ButtonProps) {
  return (
    <button
      className={`min-h-[44px] px-4 py-2 rounded-lg font-medium transition-colors break-words disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
