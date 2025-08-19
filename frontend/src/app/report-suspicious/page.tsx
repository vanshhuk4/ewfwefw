'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertTriangle, Upload, Send } from 'lucide-react';
import { getStoredUser } from '@/lib/auth';
import { userAPI, metaAPI } from '@/lib/api';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import toast from 'react-hot-toast';

const suspiciousSchema = z.object({
  entity_type: z.string().min(1, 'Entity type is required'),
  entity_value: z.string().min(1, 'Entity value is required'),
  description: z.string().min(20, 'Description must be at least 20 characters'),
});

type SuspiciousForm = z.infer<typeof suspiciousSchema>;

interface EntityType {
  id: string;
  name: string;
  placeholder: string;
}

export default function ReportSuspiciousPage() {
  const [loading, setLoading] = useState(false);
  const [entityTypes, setEntityTypes] = useState<EntityType[]>([]);
  const [evidenceFiles, setEvidenceFiles] = useState<FileList | null>(null);
  const user = getStoredUser();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SuspiciousForm>({
    resolver: zodResolver(suspiciousSchema),
  });

  const watchEntityType = watch('entity_type');

  useEffect(() => {
    const fetchEntityTypes = async () => {
      try {
        const response = await metaAPI.getSuspiciousEntityTypes();
        // Mock data for demonstration
        const mockEntityTypes: EntityType[] = [
          { id: 'phone', name: 'Phone Number', placeholder: 'e.g., +91 9876543210' },
          { id: 'email', name: 'Email Address', placeholder: 'e.g., scammer@example.com' },
          { id: 'website', name: 'Website/URL', placeholder: 'e.g., https://suspicious-site.com' },
          { id: 'upi', name: 'UPI ID', placeholder: 'e.g., scammer@paytm' },
          { id: 'bank_account', name: 'Bank Account', placeholder: 'e.g., 1234567890' },
          { id: 'social_media', name: 'Social Media Profile', placeholder: 'e.g., @suspicious_user' },
          { id: 'crypto_wallet', name: 'Crypto Wallet', placeholder: 'e.g., 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa' },
        ];
        setEntityTypes(mockEntityTypes);
      } catch (error) {
        console.error('Failed to fetch entity types:', error);
      }
    };

    fetchEntityTypes();
  }, []);

  const onSubmit = async (data: SuspiciousForm) => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        formData.append(key, value.toString());
      });

      if (evidenceFiles) {
        Array.from(evidenceFiles).forEach((file) => {
          formData.append('evidence', file);
        });
      }

      await userAPI.reportSuspicious(user.id, formData);
      toast.success('Suspicious entity reported successfully!');
      
      // Reset form
      window.location.reload();
    } catch (error) {
      console.error('Failed to submit report:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedEntityType = entityTypes.find(type => type.id === watchEntityType);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="mx-auto h-16 w-16 bg-orange-600 rounded-full flex items-center justify-center mb-4">
          <AlertTriangle className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Report Suspicious Entity</h1>
        <p className="text-gray-600 mt-2">
          Help protect others by reporting suspicious phone numbers, emails, websites, and more
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Entity Information</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Entity Type
                  </label>
                  <select
                    {...register('entity_type')}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  >
                    <option value="">Select entity type</option>
                    {entityTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                  {errors.entity_type && (
                    <p className="text-sm text-red-600">{errors.entity_type.message}</p>
                  )}
                </div>

                <Input
                  label="Entity Value"
                  {...register('entity_value')}
                  error={errors.entity_value?.message}
                  placeholder={selectedEntityType?.placeholder || 'Enter the suspicious entity'}
                />
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">
                  Encounter Description
                </label>
                <textarea
                  {...register('description')}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  rows={6}
                  placeholder="Describe how you encountered this suspicious entity, what happened, and why you believe it's suspicious..."
                />
                {errors.description && (
                  <p className="text-sm text-red-600">{errors.description.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Evidence Files (Optional)
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-orange-400 transition-colors">
                  <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                  <input
                    type="file"
                    multiple
                    accept=".jpg,.jpeg,.png,.pdf,.mp3,.mp4,.wav"
                    onChange={(e) => setEvidenceFiles(e.target.files)}
                    className="hidden"
                    id="evidence-upload"
                  />
                  <label
                    htmlFor="evidence-upload"
                    className="cursor-pointer text-sm text-gray-600 hover:text-orange-600"
                  >
                    Click to upload evidence files
                  </label>
                  <p className="text-xs text-gray-500 mt-1">
                    Screenshots, recordings, documents, etc.
                  </p>
                  {evidenceFiles && evidenceFiles.length > 0 && (
                    <div className="mt-2 text-sm text-green-600">
                      {evidenceFiles.length} file(s) selected
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium text-yellow-800">Important Notice</h3>
                    <p className="text-sm text-yellow-700 mt-1">
                      Only report entities that you genuinely believe are suspicious or involved in cybercrime. 
                      False reports may have legal consequences.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => window.history.back()}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  loading={loading}
                  className="flex items-center space-x-2"
                >
                  <Send className="h-4 w-4" />
                  <span>Submit Report</span>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}