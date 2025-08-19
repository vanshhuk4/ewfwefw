'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { Shield, UserPlus } from 'lucide-react';
import { authAPI } from '@/lib/api';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import toast from 'react-hot-toast';

const registerSchema = z.object({
  full_name: z.string().min(2, 'Full name must be at least 2 characters'),
  aadhaar_number: z.string().length(12, 'Aadhaar number must be 12 digits'),
  phone_number: z.string().min(10, 'Phone number must be at least 10 digits'),
  email: z.string().email('Invalid email address'),
  address: z.string().min(10, 'Address must be at least 10 characters'),
  role: z.enum(['USER', 'OFFICER']),
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role: 'USER',
    },
  });

  const onSubmit = async (data: RegisterForm) => {
    setLoading(true);
    try {
      const response = await authAPI.register(data);
      toast.success('Registration successful! OTP sent for verification.');
      
      // Store user_id for OTP verification
      localStorage.setItem('pending_user_id', response.data.user_id);
      router.push('/verify-otp');
    } catch (error: any) {
      console.error('Registration failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full space-y-8"
      >
        <div className="text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="mx-auto h-12 w-12 bg-blue-600 rounded-full flex items-center justify-center"
          >
            <Shield className="h-6 w-6 text-white" />
          </motion.div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">Create Account</h2>
          <p className="mt-2 text-sm text-gray-600">
            Join CyberGuard to report and track cybercrime incidents
          </p>
        </div>

        <motion.form
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-8 space-y-6 bg-white p-8 rounded-xl shadow-lg"
          onSubmit={handleSubmit(onSubmit)}
        >
          <div className="space-y-4">
            <Input
              label="Full Name"
              {...register('full_name')}
              error={errors.full_name?.message}
              placeholder="Enter your full name"
            />

            <Input
              label="Aadhaar Number"
              {...register('aadhaar_number')}
              error={errors.aadhaar_number?.message}
              placeholder="12-digit Aadhaar number"
              maxLength={12}
            />

            <Input
              label="Phone Number"
              {...register('phone_number')}
              error={errors.phone_number?.message}
              placeholder="Enter your phone number"
            />

            <Input
              label="Email Address"
              type="email"
              {...register('email')}
              error={errors.email?.message}
              placeholder="Enter your email"
            />

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                Address
              </label>
              <textarea
                {...register('address')}
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                rows={3}
                placeholder="Enter your complete address"
              />
              {errors.address && (
                <p className="text-sm text-red-600">{errors.address.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                Role
              </label>
              <select
                {...register('role')}
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              >
                <option value="USER">User</option>
                <option value="OFFICER">Officer</option>
              </select>
            </div>
          </div>

          <Button
            type="submit"
            loading={loading}
            className="w-full flex items-center justify-center space-x-2"
          >
            <UserPlus className="h-4 w-4" />
            <span>Create Account</span>
          </Button>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500">
                Sign in
              </Link>
            </p>
          </div>
        </motion.form>
      </motion.div>
    </div>
  );
}