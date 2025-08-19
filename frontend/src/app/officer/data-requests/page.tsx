'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FileText, Plus, Search, Filter, Calendar } from 'lucide-react';
import { getStoredUser } from '@/lib/auth';
import { officerAPI } from '@/lib/api';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

const dataRequestSchema = z.object({
  request_type: z.string().min(1, 'Request type is required'),
  target_entity: z.string().min(1, 'Target entity is required'),
  justification: z.string().min(20, 'Justification must be at least 20 characters'),
  urgency: z.enum(['low', 'medium', 'high']),
});

type DataRequestForm = z.infer<typeof dataRequestSchema>;

interface DataRequest {
  id: string;
  request_type: string;
  target_entity: string;
  status: string;
  created_at: string;
  urgency: string;
  justification: string;
}

export default function DataRequestsPage() {
  const [requests, setRequests] = useState<DataRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const user = getStoredUser();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DataRequestForm>({
    resolver: zodResolver(dataRequestSchema),
    defaultValues: {
      urgency: 'medium',
    },
  });

  useEffect(() => {
    const fetchDataRequests = async () => {
      try {
        const response = await officerAPI.getDataRequests();
        // Mock data for demonstration
        const mockRequests: DataRequest[] = [
          {
            id: 'DR001',
            request_type: 'Phone Records',
            target_entity: '+91 9876543210',
            status: 'pending',
            created_at: '2025-01-15T10:30:00Z',
            urgency: 'high',
            justification: 'Suspected involvement in financial fraud case #FR2025001',
          },
          {
            id: 'DR002',
            request_type: 'Bank Transaction History',
            target_entity: 'Account: 1234567890',
            status: 'approved',
            created_at: '2025-01-14T14:20:00Z',
            urgency: 'medium',
            justification: 'Required for ongoing investigation into UPI fraud',
          },
          {
            id: 'DR003',
            request_type: 'Social Media Data',
            target_entity: '@suspicious_user',
            status: 'rejected',
            created_at: '2025-01-13T09:15:00Z',
            urgency: 'low',
            justification: 'Insufficient evidence provided for data request',
          },
        ];
        setRequests(mockRequests);
      } catch (error) {
        console.error('Failed to fetch data requests:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDataRequests();
  }, []);

  const onSubmit = async (data: DataRequestForm) => {
    setSubmitting(true);
    try {
      await officerAPI.createDataRequest(data);
      toast.success('Data request submitted successfully!');
      setShowForm(false);
      reset();
      
      // Refresh the list
      window.location.reload();
    } catch (error) {
      console.error('Failed to create data request:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredRequests = requests.filter(request => {
    const matchesSearch = request.target_entity.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.request_type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (user?.role !== 'OFFICER') {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Access denied. Officer privileges required.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Data Requests</h1>
          <p className="text-gray-600 mt-2">Manage and track data requests for investigations</p>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>New Request</span>
        </Button>
      </motion.div>

      {/* Create Request Form */}
      {showForm && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Create Data Request</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Request Type
                    </label>
                    <select
                      {...register('request_type')}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    >
                      <option value="">Select request type</option>
                      <option value="Phone Records">Phone Records</option>
                      <option value="Bank Transaction History">Bank Transaction History</option>
                      <option value="Social Media Data">Social Media Data</option>
                      <option value="Email Records">Email Records</option>
                      <option value="IP Address Logs">IP Address Logs</option>
                    </select>
                    {errors.request_type && (
                      <p className="text-sm text-red-600">{errors.request_type.message}</p>
                    )}
                  </div>

                  <Input
                    label="Target Entity"
                    {...register('target_entity')}
                    error={errors.target_entity?.message}
                    placeholder="Phone number, email, account number, etc."
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Urgency Level
                  </label>
                  <select
                    {...register('urgency')}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Justification
                  </label>
                  <textarea
                    {...register('justification')}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    rows={4}
                    placeholder="Provide detailed justification for this data request..."
                  />
                  {errors.justification && (
                    <p className="text-sm text-red-600">{errors.justification.message}</p>
                  )}
                </div>

                <div className="flex justify-end space-x-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowForm(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    loading={submitting}
                  >
                    Submit Request
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search requests..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Requests List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="space-y-4"
      >
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : filteredRequests.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-gray-300 mb-4" />
              <p className="text-gray-500">No data requests found</p>
            </CardContent>
          </Card>
        ) : (
          filteredRequests.map((request, index) => (
            <motion.div
              key={request.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {request.request_type}
                        </h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                          {request.status.toUpperCase()}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getUrgencyColor(request.urgency)}`}>
                          {request.urgency.toUpperCase()}
                        </span>
                      </div>
                      
                      <p className="text-gray-600 mb-2">
                        <strong>Target:</strong> {request.target_entity}
                      </p>
                      
                      <p className="text-gray-600 mb-3">
                        {request.justification}
                      </p>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-4 w-4" />
                          <span>{formatDate(request.created_at)}</span>
                        </div>
                        <span>ID: {request.id}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </motion.div>
    </div>
  );
}