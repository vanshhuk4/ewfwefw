'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FileText, Upload, Send, MapPin, Eye, EyeOff } from 'lucide-react';
import { getStoredUser } from '@/lib/auth';
import { userAPI, metaAPI } from '@/lib/api';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import toast from 'react-hot-toast';

const grievanceSchema = z.object({
  category: z.string().min(1, 'Category is required'),
  subcategory: z.string().min(1, 'Subcategory is required'),
  description: z.string().min(20, 'Description must be at least 20 characters'),
  location: z.string().min(5, 'Location is required'),
  anonymous: z.boolean(),
});

type GrievanceForm = z.infer<typeof grievanceSchema>;

interface Category {
  id: string;
  name: string;
  subcategories: Array<{ id: string; name: string }>;
}

export default function ReportGrievancePage() {
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [evidenceFiles, setEvidenceFiles] = useState<FileList | null>(null);
  const user = getStoredUser();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<GrievanceForm>({
    resolver: zodResolver(grievanceSchema),
    defaultValues: {
      anonymous: false,
    },
  });

  const watchCategory = watch('category');
  const watchAnonymous = watch('anonymous');

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await metaAPI.getComplaintCategories();
        // Mock data for demonstration
        const mockCategories: Category[] = [
          {
            id: 'financial',
            name: 'Financial Fraud',
            subcategories: [
              { id: 'upi_fraud', name: 'UPI Fraud' },
              { id: 'credit_card', name: 'Credit Card Fraud' },
              { id: 'investment_scam', name: 'Investment Scam' },
            ],
          },
          {
            id: 'identity',
            name: 'Identity Theft',
            subcategories: [
              { id: 'aadhaar_misuse', name: 'Aadhaar Misuse' },
              { id: 'social_media', name: 'Social Media Impersonation' },
            ],
          },
          {
            id: 'cyber_bullying',
            name: 'Cyber Bullying',
            subcategories: [
              { id: 'harassment', name: 'Online Harassment' },
              { id: 'stalking', name: 'Cyber Stalking' },
            ],
          },
        ];
        setCategories(mockCategories);
      } catch (error) {
        console.error('Failed to fetch categories:', error);
      }
    };

    fetchCategories();
  }, []);

  useEffect(() => {
    setSelectedCategory(watchCategory);
  }, [watchCategory]);

  const onSubmit = async (data: GrievanceForm) => {
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

      await userAPI.reportGrievance(user.id, formData);
      toast.success('Grievance reported successfully!');
      
      // Reset form
      window.location.reload();
    } catch (error) {
      console.error('Failed to submit grievance:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedCategoryData = categories.find(cat => cat.id === selectedCategory);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="mx-auto h-16 w-16 bg-red-600 rounded-full flex items-center justify-center mb-4">
          <FileText className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Report Grievance</h1>
        <p className="text-gray-600 mt-2">
          Report cybercrime incidents and help make the digital world safer
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Incident Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Category
                  </label>
                  <select
                    {...register('category')}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  >
                    <option value="">Select a category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  {errors.category && (
                    <p className="text-sm text-red-600">{errors.category.message}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Subcategory
                  </label>
                  <select
                    {...register('subcategory')}
                    disabled={!selectedCategoryData}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors disabled:bg-gray-50"
                  >
                    <option value="">Select a subcategory</option>
                    {selectedCategoryData?.subcategories.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name}
                      </option>
                    ))}
                  </select>
                  {errors.subcategory && (
                    <p className="text-sm text-red-600">{errors.subcategory.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">
                  Incident Description
                </label>
                <textarea
                  {...register('description')}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  rows={6}
                  placeholder="Provide a detailed description of the incident, including timeline, parties involved, and any relevant information..."
                />
                {errors.description && (
                  <p className="text-sm text-red-600">{errors.description.message}</p>
                )}
              </div>

              <Input
                label="Location"
                {...register('location')}
                error={errors.location?.message}
                placeholder="City, State where the incident occurred"
                className="flex items-center"
              />

              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    {...register('anonymous')}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <div className="flex items-center space-x-2">
                    {watchAnonymous ? <EyeOff className="h-4 w-4 text-gray-500" /> : <Eye className="h-4 w-4 text-gray-500" />}
                    <label className="text-sm font-medium text-gray-700">
                      Report anonymously
                    </label>
                  </div>
                </div>
                <p className="text-xs text-gray-500 ml-7">
                  Your identity will be kept confidential during the investigation
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Evidence Files (Optional)
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
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
                    className="cursor-pointer text-sm text-gray-600 hover:text-blue-600"
                  >
                    Click to upload evidence files
                  </label>
                  <p className="text-xs text-gray-500 mt-1">
                    Supported: Images, PDFs, Audio, Video files
                  </p>
                  {evidenceFiles && evidenceFiles.length > 0 && (
                    <div className="mt-2 text-sm text-green-600">
                      {evidenceFiles.length} file(s) selected
                    </div>
                  )}
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