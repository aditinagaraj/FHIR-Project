import { useState, useEffect } from 'react';
import { Globe, Clipboard, TrendingUp, Download, Calendar, Phone, MapPin, AlertTriangle, UserPlus, FileText } from 'lucide-react';
import { api } from '../services/api';
import CreateRequestModal from '../components/CreateRequestModal';
import CreatePatientModal from '../components/CreatePatientModal';
import PatientDetailsModal from '../components/PatientDetailsModal';

export default function StaffDashboard() {
  const [stats, setStats] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [showPatientDetailsModal, setShowPatientDetailsModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [statsData, requestsData] = await Promise.all([
        api.getDashboardStats(),
        api.getAllRequests()
      ]);
      console.log('Dashboard stats data:', statsData); // Debug log
      console.log('Requests data:', requestsData); // Debug log
      setStats(statsData);
      setRequests(requestsData);
    } catch (error) {
      console.error('Failed to load data:', error);
      alert('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }

  function handleViewPatientDetails(patient) {
    setSelectedPatient(patient);
    setShowPatientDetailsModal(true);
  }

  function getStatusBadgeClass(status) {
    const classes = {
      pending: 'bg-yellow-100 text-yellow-800',
      accepted: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return classes[status] || 'bg-gray-100 text-gray-800';
  }

  function formatDate(dateString) {
    if (!dateString) {
      return 'N/A';
    }
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    return date.toLocaleString('en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-xl text-gray-600">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-gray-800">Clinician/Admin Dashboard</h2>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card flex items-start">
          <div className="p-3 rounded-full bg-green-100">
            <Globe className="w-5 h-5 text-green-600" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-500">Available Interpreters</p>
            <p className="text-3xl font-extrabold text-gray-900">
              {stats?.available_interpreters || 0}
            </p>
          </div>
        </div>

        <div className="card flex items-start">
          <div className="p-3 rounded-full bg-yellow-100">
            <Clipboard className="w-5 h-5 text-yellow-600" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-500">Pending Requests</p>
            <p className="text-3xl font-extrabold text-gray-900">
              {stats?.pending_requests || 0}
            </p>
          </div>
        </div>

        <div className="card flex items-start">
          <div className="p-3 rounded-full bg-blue-100">
            <TrendingUp className="w-5 h-5 text-blue-600" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-500">Total Languages Supported</p>
            <p className="text-3xl font-extrabold text-gray-900">
              {stats?.total_languages || 0}
            </p>
          </div>
        </div>

        <div className="card flex flex-col justify-between">
          <h3 className="font-semibold text-gray-700">Service Monitoring</h3>
          <button 
            onClick={() => {
              // Create CSV data from requests
              const csvData = requests.map(req => ({
                patient: req.patient?.name || req.patient?.fhir_id || 'N/A',
                location: req.location,
                language: req.language,
                status: req.status,
                created: new Date(req.requested_at).toLocaleString(),
                interpreter: req.interpreter?.username || 'Unassigned'
              }));
              
              const csvContent = [
                ['Patient', 'Location', 'Language', 'Status', 'Created', 'Interpreter'],
                ...csvData.map(row => Object.values(row))
              ].map(row => row.join(',')).join('\n');
              
              const blob = new Blob([csvContent], { type: 'text/csv' });
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `interpreter_requests_${new Date().toISOString().split('T')[0]}.csv`;
              a.click();
              window.URL.revokeObjectURL(url);
            }}
            className="mt-3 w-full btn-secondary"
          >
            <Download className="w-4 h-4" />
            <span>Export Monitoring Data (CSV)</span>
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3">
        <button onClick={() => setShowPatientModal(true)} className="btn-secondary text-base">
          <UserPlus className="w-5 h-5" />
          <span>Create New Patient</span>
        </button>
        <button onClick={() => setShowModal(true)} className="btn-primary text-base">
          <Calendar className="w-5 h-5" />
          <span>Book Interpreter (Create FHIR Appointment)</span>
        </button>
      </div>

      {/* Availability Grid */}
      <div className="card">
        <h3 className="text-xl font-semibold mb-4 text-gray-800">
          Real-time Interpreter Availability
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {stats?.availability_by_language && Array.isArray(stats.availability_by_language) ? 
            stats.availability_by_language.map((item) => (
              <div
                key={item.language}
                className={`p-3 rounded-xl text-center border ${
                  item.available_count > 0
                    ? 'bg-green-50 border-green-200'
                    : 'bg-gray-100 border-gray-300'
                }`}
              >
                <p className={`font-bold text-lg ${item.available_count > 0 ? 'text-green-700' : 'text-gray-500'}`}>
                  {item.language}
                </p>
                <p className={`text-sm ${item.available_count > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                  {item.available_count} Available
                </p>
              </div>
            )) : 
            stats?.availability_by_language && typeof stats.availability_by_language === 'object' ?
              Object.entries(stats.availability_by_language).map(([language, count]) => (
                <div
                  key={language}
                  className={`p-3 rounded-xl text-center border ${
                    count > 0
                      ? 'bg-green-50 border-green-200'
                      : 'bg-gray-100 border-gray-300'
                  }`}
                >
                  <p className={`font-bold text-lg ${count > 0 ? 'text-green-700' : 'text-gray-500'}`}>
                    {language}
                  </p>
                  <p className={`text-sm ${count > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                    {count} Available
                  </p>
                </div>
              )) : null
          }
        </div>
      </div>

      {/* Requests Table */}
      <div className="card">
        <h3 className="text-xl font-semibold mb-4 text-gray-800">
          Recent Service Requests / FHIR Appointments
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Patient / Type
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location / Method
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Language
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                  Requested At
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Interpreter
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {requests.map((request) => (
                <tr
                  key={request.id}
                  className={request.status === 'accepted' ? 'bg-blue-50' : ''}
                >
                  <td className="px-3 py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900 flex items-center">
                          {request.patient?.name || 'N/A'}
                          {request.is_stat && (
                            <span className="ml-2 px-2 py-0.5 text-xs font-bold bg-red-100 text-red-700 rounded">
                              STAT
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-gray-500">{request.patient_type}</p>
                      </div>
                      {request.patient && (
                        <button
                          onClick={() => handleViewPatientDetails(request.patient)}
                          className="ml-2 text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50 transition-colors"
                          title="View FHIR Details"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap">
                    <p className="text-sm font-medium text-gray-900">
                      {request.location_method} ({request.duration_minutes} min)
                    </p>
                    <p className="text-xs text-gray-500 italic capitalize">
                      {request.delivery_method}
                    </p>
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                    {request.language}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(
                        request.status
                      )}`}
                    >
                      {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 hidden sm:table-cell">
                    {formatDate(request.requested_at)}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm font-medium">
                    {request.interpreter ? (
                      <div className="flex items-center space-x-2">
                        <p className="text-sm text-gray-700 font-semibold">
                          {request.interpreter.username}
                        </p>
                        {request.status === 'accepted' && (
                          <button 
                            onClick={() => {
                              // In a real app, this would open the session or dial the interpreter
                              alert(`Joining session for request ID: ${request.id}\nInterpreter: ${request.interpreter.username}\nLocation: ${request.location}`);
                            }}
                            title="Join Session"
                            className="btn-icon"
                          >
                            <Phone className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400">Unassigned</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <CreateRequestModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={() => {
          setShowModal(false);
          loadData();
        }}
      />

      <CreatePatientModal
        isOpen={showPatientModal}
        onClose={() => setShowPatientModal(false)}
        onSuccess={() => {
          setShowPatientModal(false);
          loadData();
        }}
      />

      <PatientDetailsModal
        isOpen={showPatientDetailsModal}
        onClose={() => {
          setShowPatientDetailsModal(false);
          setSelectedPatient(null);
        }}
        patient={selectedPatient}
      />
    </div>
  );
}