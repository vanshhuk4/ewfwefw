'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Shield, 
  AlertTriangle,
  CheckCircle,
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
  Line,
  AreaChart,
  Area
} from 'recharts';
import { getStoredUser } from '@/lib/auth';
import { officerAPI } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface AnalyticsData {
  totalReports: number;
  activeInvestigations: number;
  resolvedCases: number;
  threatsNeutralized: number;
  crimeTypeDistribution: Array<{ name: string; value: number; color: string }>;
  monthlyTrends: Array<{ month: string; reports: number; resolved: number }>;
  regionWiseData: Array<{ region: string; reports: number; severity: number }>;
  priorityDistribution: Array<{ priority: string; count: number }>;
  responseTimeData: Array<{ week: string; avgResponseTime: number }>;
}

const COLORS = ['#3B82F6', '#EF4444', '#F59E0B', '#10B981', '#8B5CF6', '#EC4899'];

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const user = getStoredUser();

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await officerAPI.getDashboard();
        
        // Mock data for demonstration
        const mockData: AnalyticsData = {
          totalReports: 1247,
          activeInvestigations: 89,
          resolvedCases: 1158,
          threatsNeutralized: 234,
          crimeTypeDistribution: [
            { name: 'Financial Fraud', value: 35, color: COLORS[0] },
            { name: 'Phishing', value: 25, color: COLORS[1] },
            { name: 'Identity Theft', value: 20, color: COLORS[2] },
            { name: 'Cyber Bullying', value: 12, color: COLORS[3] },
            { name: 'Ransomware', value: 5, color: COLORS[4] },
            { name: 'Others', value: 3, color: COLORS[5] },
          ],
          monthlyTrends: [
            { month: 'Aug', reports: 98, resolved: 92 },
            { month: 'Sep', reports: 112, resolved: 108 },
            { month: 'Oct', reports: 134, resolved: 125 },
            { month: 'Nov', reports: 156, resolved: 148 },
            { month: 'Dec', reports: 189, resolved: 175 },
            { month: 'Jan', reports: 167, resolved: 152 },
          ],
          regionWiseData: [
            { region: 'Indore', reports: 345, severity: 7.2 },
            { region: 'Bhopal', reports: 289, severity: 6.8 },
            { region: 'Gwalior', reports: 198, severity: 5.9 },
            { region: 'Jabalpur', reports: 167, severity: 6.1 },
            { region: 'Ujjain', reports: 134, severity: 5.4 },
            { region: 'Sagar', reports: 114, severity: 5.8 },
          ],
          priorityDistribution: [
            { priority: 'Very High', count: 45 },
            { priority: 'High', count: 123 },
            { priority: 'Medium', count: 456 },
            { priority: 'Low', count: 389 },
            { priority: 'Very Low', count: 234 },
          ],
          responseTimeData: [
            { week: 'Week 1', avgResponseTime: 4.2 },
            { week: 'Week 2', avgResponseTime: 3.8 },
            { week: 'Week 3', avgResponseTime: 4.1 },
            { week: 'Week 4', avgResponseTime: 3.5 },
            { week: 'Week 5', avgResponseTime: 3.9 },
            { week: 'Week 6', avgResponseTime: 3.2 },
          ],
        };
        
        setData(mockData);
      } catch (error) {
        console.error('Failed to fetch analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (user?.role !== 'OFFICER') {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Access denied. Officer privileges required.</p>
      </div>
    );
  }

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
        <p className="text-gray-500">Failed to load analytics data</p>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Reports',
      value: data.totalReports.toLocaleString(),
      icon: BarChart3,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Active Investigations',
      value: data.activeInvestigations,
      icon: Clock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
    {
      title: 'Resolved Cases',
      value: data.resolvedCases.toLocaleString(),
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Threats Neutralized',
      value: data.threatsNeutralized,
      icon: Shield,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
  ];

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Comprehensive insights into cybercrime trends and investigation performance
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

      {/* Charts Grid */}
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

        {/* Monthly Trends */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Monthly Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={data.monthlyTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Area 
                    type="monotone" 
                    dataKey="reports" 
                    stackId="1"
                    stroke="#3B82F6" 
                    fill="#3B82F6"
                    fillOpacity={0.6}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="resolved" 
                    stackId="2"
                    stroke="#10B981" 
                    fill="#10B981"
                    fillOpacity={0.6}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Region-wise Reports */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Region-wise Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.regionWiseData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="region" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="reports" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Response Time Trends */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.7 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Average Response Time (Hours)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data.responseTimeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="avgResponseTime" 
                    stroke="#10B981" 
                    strokeWidth={3}
                    dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Priority Distribution */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Case Priority Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.priorityDistribution} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="priority" type="category" width={80} />
                <Tooltip />
                <Bar dataKey="count" fill="#8B5CF6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}