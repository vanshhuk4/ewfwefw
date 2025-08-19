'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  Shield, 
  User, 
  FileText, 
  AlertTriangle, 
  Brain, 
  LogOut, 
  Menu, 
  X,
  BarChart3
} from 'lucide-react';
import { getStoredUser, clearAuthData } from '@/lib/auth';
import Button from '@/components/ui/Button';
import toast from 'react-hot-toast';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const user = getStoredUser();

  const handleLogout = () => {
    clearAuthData();
    toast.success('Logged out successfully');
    router.push('/login');
  };

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: BarChart3 },
    { href: '/profile', label: 'Profile', icon: User },
    { href: '/report-grievance', label: 'Report Grievance', icon: FileText },
    { href: '/report-suspicious', label: 'Report Suspicious', icon: AlertTriangle },
    { href: '/ai-tools', label: 'AI Tools', icon: Brain },
  ];

  // Add officer-specific items
  if (user?.role === 'OFFICER') {
    navItems.push(
      { href: '/officer/data-requests', label: 'Data Requests', icon: FileText },
      { href: '/officer/analytics', label: 'Analytics', icon: BarChart3 }
    );
  }

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/dashboard" className="flex items-center space-x-2">
              <Shield className="h-8 w-8 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">CyberGuard</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center space-x-1 text-gray-600 hover:text-blue-600 transition-colors"
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
            
            <div className="flex items-center space-x-4 border-l border-gray-200 pl-4">
              <span className="text-sm text-gray-600">
                {user?.full_name} ({user?.role})
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="flex items-center space-x-1"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </Button>
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-gray-600 hover:text-gray-900 focus:outline-none"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="md:hidden bg-white border-t border-gray-200"
        >
          <div className="px-2 pt-2 pb-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-blue-600 hover:bg-gray-50 rounded-md transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
            
            <div className="border-t border-gray-200 pt-2 mt-2">
              <div className="px-3 py-2 text-sm text-gray-600">
                {user?.full_name} ({user?.role})
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-red-600 hover:bg-gray-50 rounded-md transition-colors w-full"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </nav>
  );
}