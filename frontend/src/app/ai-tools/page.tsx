'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Brain, 
  FileSearch, 
  Database, 
  AlertCircle, 
  MessageCircle,
  Upload,
  Mic,
  Video,
  Image as ImageIcon,
  FileText
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { aiAPI } from '@/lib/api';
import toast from 'react-hot-toast';

type TabType = 'analysis' | 'similarity' | 'contradiction' | 'chatbot' | 'files';

export default function AIToolsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('analysis');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);

  const tabs = [
    { id: 'analysis', label: 'Complaint Analysis', icon: FileSearch },
    { id: 'similarity', label: 'Database Similarity', icon: Database },
    { id: 'contradiction', label: 'Contradiction Detection', icon: AlertCircle },
    { id: 'chatbot', label: 'AI Assistant', icon: MessageCircle },
    { id: 'files', label: 'File Analysis', icon: Upload },
  ];

  const handleComplaintAnalysis = async (complaint: string) => {
    setLoading(true);
    try {
      const response = await aiAPI.analyzeComplaint({ complaint });
      setResults(response.data);
      toast.success('Analysis completed!');
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSimilarityCheck = async (entityData: any) => {
    setLoading(true);
    try {
      const response = await aiAPI.checkSimilarity(entityData);
      setResults(response.data);
      toast.success('Similarity check completed!');
    } catch (error) {
      console.error('Similarity check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleContradictionCheck = async (data: any) => {
    setLoading(true);
    try {
      const response = await aiAPI.detectContradiction(data);
      setResults(response.data);
      toast.success('Contradiction analysis completed!');
    } catch (error) {
      console.error('Contradiction check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChatQuery = async (query: string) => {
    setLoading(true);
    try {
      const response = await aiAPI.chat({ query });
      setResults(response.data);
    } catch (error) {
      console.error('Chat query failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileAnalysis = async (file: File, type: string) => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      let response;
      switch (type) {
        case 'audio':
          response = await aiAPI.analyzeAudio(formData);
          break;
        case 'video':
          response = await aiAPI.analyzeVideo(formData);
          break;
        case 'image':
          response = await aiAPI.analyzeImage(formData);
          break;
        case 'pdf':
          response = await aiAPI.analyzePdf(formData);
          break;
        default:
          throw new Error('Unsupported file type');
      }
      
      setResults(response.data);
      toast.success('File analysis completed!');
    } catch (error) {
      console.error('File analysis failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="mx-auto h-16 w-16 bg-purple-600 rounded-full flex items-center justify-center mb-4">
          <Brain className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900">AI Analysis Tools</h1>
        <p className="text-gray-600 mt-2">
          Leverage AI to analyze complaints, detect patterns, and enhance investigations
        </p>
      </motion.div>

      {/* Tab Navigation */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="border-b border-gray-200"
      >
        <nav className="flex space-x-8 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as TabType);
                  setResults(null);
                }}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </motion.div>

      {/* Tab Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-8"
      >
        {/* Input Section */}
        <Card>
          <CardHeader>
            <CardTitle>
              {tabs.find(tab => tab.id === activeTab)?.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeTab === 'analysis' && <ComplaintAnalysisForm onSubmit={handleComplaintAnalysis} loading={loading} />}
            {activeTab === 'similarity' && <SimilarityCheckForm onSubmit={handleSimilarityCheck} loading={loading} />}
            {activeTab === 'contradiction' && <ContradictionForm onSubmit={handleContradictionCheck} loading={loading} />}
            {activeTab === 'chatbot' && <ChatbotForm onSubmit={handleChatQuery} loading={loading} />}
            {activeTab === 'files' && <FileAnalysisForm onSubmit={handleFileAnalysis} loading={loading} />}
          </CardContent>
        </Card>

        {/* Results Section */}
        <Card>
          <CardHeader>
            <CardTitle>Analysis Results</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner size="lg" />
              </div>
            ) : results ? (
              <ResultsDisplay results={results} type={activeTab} />
            ) : (
              <div className="text-center py-12 text-gray-500">
                <Brain className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                <p>Results will appear here after analysis</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

// Individual form components
function ComplaintAnalysisForm({ onSubmit, loading }: { onSubmit: (data: string) => void; loading: boolean }) {
  const [complaint, setComplaint] = useState('');

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700">
          Complaint Text
        </label>
        <textarea
          value={complaint}
          onChange={(e) => setComplaint(e.target.value)}
          className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
          rows={6}
          placeholder="Enter the complaint text to analyze..."
        />
      </div>
      <Button
        onClick={() => onSubmit(complaint)}
        disabled={!complaint.trim() || loading}
        loading={loading}
        className="w-full"
      >
        Analyze Complaint
      </Button>
    </div>
  );
}

function SimilarityCheckForm({ onSubmit, loading }: { onSubmit: (data: any) => void; loading: boolean }) {
  const [entityData, setEntityData] = useState('');

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700">
          Entity Data (JSON)
        </label>
        <textarea
          value={entityData}
          onChange={(e) => setEntityData(e.target.value)}
          className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors font-mono text-sm"
          rows={8}
          placeholder='{"phone": "9876543210", "email": "test@example.com"}'
        />
      </div>
      <Button
        onClick={() => {
          try {
            const parsed = JSON.parse(entityData);
            onSubmit(parsed);
          } catch {
            toast.error('Invalid JSON format');
          }
        }}
        disabled={!entityData.trim() || loading}
        loading={loading}
        className="w-full"
      >
        Check Similarity
      </Button>
    </div>
  );
}

function ContradictionForm({ onSubmit, loading }: { onSubmit: (data: any) => void; loading: boolean }) {
  const [complaint, setComplaint] = useState('');
  const [evidence, setEvidence] = useState('');

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700">
          Complaint
        </label>
        <textarea
          value={complaint}
          onChange={(e) => setComplaint(e.target.value)}
          className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
          rows={4}
          placeholder="Enter the complaint text..."
        />
      </div>
      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700">
          Evidence Text
        </label>
        <textarea
          value={evidence}
          onChange={(e) => setEvidence(e.target.value)}
          className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
          rows={4}
          placeholder="Enter evidence text..."
        />
      </div>
      <Button
        onClick={() => onSubmit({ complaint, evidence })}
        disabled={!complaint.trim() || !evidence.trim() || loading}
        loading={loading}
        className="w-full"
      >
        Check for Contradictions
      </Button>
    </div>
  );
}

function ChatbotForm({ onSubmit, loading }: { onSubmit: (query: string) => void; loading: boolean }) {
  const [query, setQuery] = useState('');

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700">
          Ask AI Assistant
        </label>
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
          rows={4}
          placeholder="Ask questions about cybercrime laws, procedures, or get guidance..."
        />
      </div>
      <Button
        onClick={() => onSubmit(query)}
        disabled={!query.trim() || loading}
        loading={loading}
        className="w-full"
      >
        Ask AI
      </Button>
    </div>
  );
}

function FileAnalysisForm({ onSubmit, loading }: { onSubmit: (file: File, type: string) => void; loading: boolean }) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const getFileType = (file: File): string => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (['mp3', 'wav', 'm4a'].includes(extension || '')) return 'audio';
    if (['mp4', 'avi', 'mov'].includes(extension || '')) return 'video';
    if (['jpg', 'jpeg', 'png', 'gif'].includes(extension || '')) return 'image';
    if (extension === 'pdf') return 'pdf';
    return 'unknown';
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'audio': return Mic;
      case 'video': return Video;
      case 'image': return ImageIcon;
      case 'pdf': return FileText;
      default: return Upload;
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Upload File for Analysis
        </label>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-purple-400 transition-colors">
          <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
          <input
            type="file"
            accept=".jpg,.jpeg,.png,.pdf,.mp3,.mp4,.wav,.m4a,.avi,.mov"
            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
            className="hidden"
            id="file-upload"
          />
          <label
            htmlFor="file-upload"
            className="cursor-pointer text-sm text-gray-600 hover:text-purple-600"
          >
            Click to upload file
          </label>
          <p className="text-xs text-gray-500 mt-1">
            Supported: Audio, Video, Images, PDF files
          </p>
        </div>
        
        {selectedFile && (
          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-2">
              {(() => {
                const Icon = getFileIcon(getFileType(selectedFile));
                return <Icon className="h-4 w-4 text-gray-600" />;
              })()}
              <span className="text-sm text-gray-700">{selectedFile.name}</span>
              <span className="text-xs text-gray-500">
                ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
              </span>
            </div>
          </div>
        )}
      </div>
      
      <Button
        onClick={() => selectedFile && onSubmit(selectedFile, getFileType(selectedFile))}
        disabled={!selectedFile || loading}
        loading={loading}
        className="w-full"
      >
        Analyze File
      </Button>
    </div>
  );
}

function ResultsDisplay({ results, type }: { results: any; type: TabType }) {
  if (!results) return null;

  return (
    <div className="space-y-4">
      {type === 'analysis' && (
        <div className="space-y-3">
          {results.details && (
            <div className="p-4 bg-blue-50 rounded-lg">
              <h3 className="font-medium text-blue-900 mb-2">Incident Details</h3>
              <pre className="text-sm text-blue-800 whitespace-pre-wrap">
                {JSON.stringify(results.details, null, 2)}
              </pre>
            </div>
          )}
          {results.summary && (
            <div className="p-4 bg-green-50 rounded-lg">
              <h3 className="font-medium text-green-900 mb-2">Summary</h3>
              <p className="text-sm text-green-800">{results.summary}</p>
            </div>
          )}
        </div>
      )}

      {type === 'similarity' && (
        <div className="space-y-3">
          {results.cross_db_matches && results.cross_db_matches.length > 0 && (
            <div className="p-4 bg-red-50 rounded-lg">
              <h3 className="font-medium text-red-900 mb-2">Cross-Database Matches</h3>
              <div className="space-y-2">
                {results.cross_db_matches.map((match: any, index: number) => (
                  <div key={index} className="text-sm text-red-800">
                    {match[0]} ↔ {match[1]} (Score: {match[2]?.toFixed(2)})
                  </div>
                ))}
              </div>
            </div>
          )}
          {results.within_db_matches && results.within_db_matches.length > 0 && (
            <div className="p-4 bg-yellow-50 rounded-lg">
              <h3 className="font-medium text-yellow-900 mb-2">Within-Database Matches</h3>
              <div className="space-y-2">
                {results.within_db_matches.map((match: any, index: number) => (
                  <div key={index} className="text-sm text-yellow-800">
                    {match[0]} ↔ {match[1]} (Score: {match[2]?.toFixed(2)})
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {type === 'contradiction' && (
        <div className="space-y-3">
          {results.has_contradiction && (
            <div className="p-4 bg-red-50 rounded-lg">
              <h3 className="font-medium text-red-900 mb-2">⚠️ Contradictions Found</h3>
            </div>
          )}
          {results.analysis && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">Analysis Details</h3>
              <pre className="text-sm text-gray-800 whitespace-pre-wrap">
                {JSON.stringify(results.analysis, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {type === 'chatbot' && (
        <div className="p-4 bg-blue-50 rounded-lg">
          <h3 className="font-medium text-blue-900 mb-2">AI Response</h3>
          <div className="text-sm text-blue-800 whitespace-pre-wrap">
            {results.answer || results.response || 'No response received'}
          </div>
          {results.sources && (
            <div className="mt-3 pt-3 border-t border-blue-200">
              <p className="text-xs text-blue-600">
                Sources: {results.sources.join(', ')}
              </p>
            </div>
          )}
        </div>
      )}

      {type === 'files' && (
        <div className="space-y-3">
          {results.extracted_text && (
            <div className="p-4 bg-green-50 rounded-lg">
              <h3 className="font-medium text-green-900 mb-2">Extracted Text</h3>
              <p className="text-sm text-green-800 whitespace-pre-wrap">
                {results.extracted_text}
              </p>
            </div>
          )}
          {results.transcribed_text && (
            <div className="p-4 bg-blue-50 rounded-lg">
              <h3 className="font-medium text-blue-900 mb-2">Transcribed Audio</h3>
              <p className="text-sm text-blue-800 whitespace-pre-wrap">
                {results.transcribed_text}
              </p>
            </div>
          )}
          {results.classification && (
            <div className="p-4 bg-purple-50 rounded-lg">
              <h3 className="font-medium text-purple-900 mb-2">Classification</h3>
              <p className="text-sm text-purple-800">{results.classification}</p>
              {results.reason && (
                <p className="text-xs text-purple-600 mt-1">{results.reason}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}