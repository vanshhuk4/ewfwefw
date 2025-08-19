'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Shield, CheckCircle } from 'lucide-react';
import { authAPI } from '@/lib/api';
import { setAuthData } from '@/lib/auth';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import toast from 'react-hot-toast';

const verifySchema = z.object({
  otp: z.string().length(6, 'OTP must be 6 digits'),
});

type VerifyForm = z.infer<typeof verifySchema>;

export default function LoginVerifyPage() {
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<VerifyForm>({
    resolver: zodResolver(verifySchema),
  });

  useEffect(() => {
    const loginUserId = localStorage.getItem('login_user_id');
    if (!loginUserId) {
      toast.error('No pending login found');
      router.push('/login');
      return;
    }
    setUserId(loginUserId);
  }, [router]);

  const onSubmit = async (data: VerifyForm) => {
    if (!userId) return;

    setLoading(true);
    try {
      const response = await authAPI.loginVerify({
        user_id: userId,
        otp: data.otp,
      });
      
      // Store auth data
      setAuthData(response.data.token, response.data.user);
      
      toast.success('Login successful!');
      localStorage.removeItem('login_user_id');
      router.push('/dashboard');
    } catch (error: any) {
      console.error('Login verification failed:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

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
            <CheckCircle className="h-6 w-6 text-white" />
          </motion.div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">Verify Login</h2>
          <p className="mt-2 text-sm text-gray-600">
            Enter the OTP sent to your registered phone number
          </p>
        </div>

        <motion.form
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-8 space-y-6 bg-white p-8 rounded-xl shadow-lg"
          onSubmit={handleSubmit(onSubmit)}
        >
          <Input
            label="OTP Code"
            {...register('otp')}
            error={errors.otp?.message}
            placeholder="Enter 6-digit OTP"
            maxLength={6}
            className="text-center text-lg tracking-widest"
          />

          <Button
            type="submit"
            loading={loading}
            className="w-full flex items-center justify-center space-x-2"
          >
            <CheckCircle className="h-4 w-4" />
            <span>Verify & Login</span>
          </Button>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Didn't receive OTP?{' '}
              <button className="font-medium text-blue-600 hover:text-blue-500">
                Resend OTP
              </button>
            </p>
          </div>
        </motion.form>
      </motion.div>
    </div>
  );
}