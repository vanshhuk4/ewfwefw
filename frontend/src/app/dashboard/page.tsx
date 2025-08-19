'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Shield, 
  FileText, 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp,
  Users,
  Clock,
  MapPin
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import { getStoredUser } from '@/lib/auth';
import { userAPI } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface DashboardData {
  totalReports: number;
  threatsBlocked: number;
  safetyScore: number;
  pendingCases: number;
  resolvedCases: number;
  crimeTypeDistribution: Array<{ name: string; value: number; color: string }>;
  timeWiseData: Array<{ month: string; reports: number }>;
  areaWiseData: Array<{ area: string; reports: number }>;
  recentAlerts: Array<{ id: string; title: string; severity: string; time: string }>;
}

const COLORS = ['#3B82F6', '#EF4444', '#F59E0B', '#10B981', '#8B5CF6'];

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const user = getStoredUser();

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user?.id) return;
      
      try {
        const response = await userAPI.getProfile(user.id);
        
        // Mock data for demonstration - replace with actual API response
        const mockData: DashboardData = {
          totalReports: 12,
          threatsBlocked: 45,
          safetyScore: 87,
          pendingCases: 3,
          resolvedCases: 9,
          crimeTypeDistribution: [
            { name: 'Phishing', value: 35, color: COLORS[0] },
            { name: 'Financial Fraud', value: 25, color: COLORS[1] },
            { name: 'Identity Theft', value: 20, color: COLORS[2] },
            { name: 'Ransomware', value: 15, color: COLORS[3] },
            { name: 'Others', value: 5, color: COLORS[4] },
          ],
          timeWiseData: [
            { month: 'Aug', reports: 4 },
            { month: 'Sep', reports: 7 },
            { month: 'Oct', reports: 12 },
            { month: 'Nov', reports: 8 },
            { month: 'Dec', reports: 15 },
            { month: 'Jan', reports: 12 },
          ],
          areaWiseData: [
            { area: 'Indore', reports: 25 },
            { area: 'Bhopal', reports: 18 },
            { area: 'Gwalior', reports: 12 },
            { area: 'Jabalpur', reports: 8 },
            { area: 'Ujjain', reports: 5 },
          ],
          recentAlerts: [
            { id: '1', title: 'New phishing campaign detected', severity: 'high', time: '2 hours ago' },
            { id: '2', title: 'Suspicious UPI transactions reported', severity: 'medium', time: '5 hours ago' },
            { id: '3', title: 'Fake job portal identified', severity: 'low', time: '1 day ago' },
          ],
        };
        
        setData(mockData);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user?.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Failed to load dashboard data</p>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Reports',
      value: data.totalReports,
      icon: FileText,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Threats Blocked',
      value: data.threatsBlocked,
      icon: Shield,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Safety Score',
      value: `${data.safetyScore}%`,
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      title: 'Pending Cases',
      value: data.pendingCases,
      icon: Clock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-8 text-white"
      >
        <h1 className="text-3xl font-bold mb-2">
          Welcome back, {user?.full_name}!
        </h1>
        <p className="text-blue-100">
          Stay protected with real-time cybercrime monitoring and reporting.
        </p>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                      <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                    </div>
                    <div className={`p-3 rounded-full ${stat.bgColor}`}>
                      <Icon className={`h-6 w-6 ${stat.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Crime Type Distribution */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Crime Type Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={data.crimeTypeDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {data.crimeTypeDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Time-wise Reports */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Reports Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data.timeWiseData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="reports" 
                    stroke="#3B82F6" 
                    strokeWidth={2}
                    dot={{ fill: '#3B82F6' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Area-wise Reports and Recent Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Area-wise Reports */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Top Areas by Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.areaWiseData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="area" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="reports" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Security Alerts */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Recent Security Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.recentAlerts.map((alert, index) => (
                  <motion.div
                    key={alert.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.8 + index * 0.1 }}
                    className="flex items-start space-x-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div className={`p-1 rounded-full ${
                      alert.severity === 'high' ? 'bg-red-100' :
                      alert.severity === 'medium' ? 'bg-yellow-100' : 'bg-green-100'
                    }`}>
                      <AlertTriangle className={`h-4 w-4 ${
                        alert.severity === 'high' ? 'text-red-600' :
                        alert.severity === 'medium' ? 'text-yellow-600' : 'text-green-600'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{alert.title}</p>
                      <p className="text-xs text-gray-500">{alert.time}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}