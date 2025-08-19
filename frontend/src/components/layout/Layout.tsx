'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Toaster } from 'react-hot-toast';
import { isAuthenticated } from '@/lib/auth';
import Navbar from './Navbar';

interface LayoutProps {
  children: React.ReactNode;
}

const publicRoutes = ['/login', '/register', '/verify-otp'];

export default function Layout({ children }: LayoutProps) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const isPublicRoute = publicRoutes.includes(pathname);
    const userAuthenticated = isAuthenticated();

    if (!isPublicRoute && !userAuthenticated) {
      router.push('/login');
    } else if (isPublicRoute && userAuthenticated) {
      router.push('/dashboard');
    }
  }, [pathname, router]);

  const isPublicRoute = publicRoutes.includes(pathname);

  return (
    <div className="min-h-screen bg-gray-50">
      {!isPublicRoute && <Navbar />}
      <main className={isPublicRoute ? '' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'}>
        {children}
      </main>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
        }}
      />
    </div>
  );
}