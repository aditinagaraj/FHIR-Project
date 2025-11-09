import { useState, useEffect } from 'react';
import { CheckCircle, Clock, Calendar, Phone, Send, MapPin, AlertTriangle } from 'lucide-react';
import { api } from '../services/api';

export default function InterpreterDashboard() {
  const [profile, setProfile] = useState(null);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notes, setNotes] = useState('');
  const [submittingNotes, setSubmittingNotes] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const [profileData, pendingData, myRequestsData] = await Promise.all([
        api.getMyInterpreterProfile(),
        api.getPendingRequests(),
        api.getMyRequests()
      ]);
      setProfile(profileData);
      setPendingRequests(pendingData);
      setMyRequests(myRequestsData);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAvailability = async () => {
    if (!profile) return;
    
    // Don't allow toggling if busy
    if (profile.availability_status === 'busy') {
      alert('Cannot change availability while you have active assignments');
      return;
    }

    try {
      const newStatus = profile.availability_status === 'available' ? 'unavailable' : 'available';
      await api.updateMyAvailability(newStatus);
      await loadData(); // Refresh data
    } catch (err) {
      alert('Failed to update availability: ' + err.message);
    }
  };

  const handleAcceptRequest = async (requestId) => {
    try {
      await api.acceptRequest(requestId);
      await loadData(); // Refresh data
    } catch (err) {
      alert('Failed to accept request: ' + err.message);
    }
  };

  const handleCompleteRequest = async (requestId) => {
    if (!notes.trim()) {
      alert('Please provide patient encounter notes before completing the request');
      return;
    }

    try {
      setSubmittingNotes(true);
      await api.completeRequest(requestId, notes);
      setNotes('');
      await loadData(); // Refresh data
    } catch (err) {
      alert('Failed to complete request: ' + err.message);
    } finally {
      setSubmittingNotes(false);
    }
  };

  const getAvailabilityStatus = () => {
    if (!profile) return { text: 'Loading...', color: 'gray', icon: Clock };

    switch (profile.availability_status) {
      case 'available':
        return { 
          text: 'AVAILABLE for New FHIR Appointments', 
          color: 'green', 
          icon: CheckCircle 
        };
      case 'busy':
        return { 
          text: 'BUSY with Active Assignment', 
          color: 'blue', 
          icon: Calendar 
        };
      case 'unavailable':
        return { 
          text: 'UNAVAILABLE', 
          color: 'red', 
          icon: Clock 
        };
      default:
        return { 
          text: 'Status Unknown', 
          color: 'gray', 
          icon: Clock 
        };
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const currentAssignment = myRequests.find(req => req.status === 'accepted' || req.status === 'in_progress');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const statusInfo = getAvailabilityStatus();
  const StatusIcon = statusInfo.icon;

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-gray-800">
        Interpreter Dashboard 
      </h2>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      {/* Availability Status Card */}
      <div className={`card flex justify-between items-center border-l-4 shadow-inner ${
        statusInfo.color === 'green' ? 'border-green-400 bg-green-50' :
        statusInfo.color === 'blue' ? 'border-blue-400 bg-blue-50' :
        statusInfo.color === 'red' ? 'border-red-400 bg-red-50' :
        'border-gray-400 bg-gray-50'
      }`}>
        <div>
          <h3 className="text-xl font-semibold mb-1 text-gray-800">My Status (Set Availability)</h3>
          <p className={`font-bold flex items-center ${
            statusInfo.color === 'green' ? 'text-green-700' :
            statusInfo.color === 'blue' ? 'text-blue-700' :
            statusInfo.color === 'red' ? 'text-red-700' :
            'text-gray-700'
          }`}>
            <StatusIcon className="w-5 h-5 inline mr-1" />
            {statusInfo.text}
          </p>
        </div>
        <button 
          onClick={handleToggleAvailability}
          disabled={profile?.availability_status === 'busy'}
          className={`${
            profile?.availability_status === 'available' ? 'btn-danger' : 'btn-success'
          } ${profile?.availability_status === 'busy' ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <Clock className="w-5 h-5 mr-2" />
          {profile?.availability_status === 'available' ? 'Set to Unavailable' : 'Set to Available'}
        </button>
      </div>

      {/* Current Assignment Card */}
      {currentAssignment && (
        <div className="card bg-blue-50 border-blue-600 border-l-4 shadow-inner">
          <h3 className="text-xl font-bold text-blue-800 mb-3 flex items-center">
            <Calendar className="w-5 h-5 mr-2" />
            Current Appointment (Session Pending)
          </h3>
          
          <div className="grid grid-cols-2 gap-y-1 mb-4 text-sm">
            <p className="font-semibold text-gray-600">Patient URN:</p> 
            <p className="font-bold text-gray-800">{currentAssignment.patient?.fhir_id || 'N/A'}</p>
            <p className="font-semibold text-gray-600">Patient Type:</p> 
            <p>{currentAssignment.patient_type}</p>
            <p className="font-semibold text-gray-600">Location:</p> 
            <p>{currentAssignment.location} ({currentAssignment.duration_minutes} min)</p>
            <p className="font-semibold text-gray-600">Delivery:</p> 
            <p className="capitalize">{currentAssignment.delivery_method}</p>
          </div>
          
          {currentAssignment.request_notes && (
            <div className="mb-4 p-3 bg-white rounded-xl border text-sm shadow-sm">
              <strong>Notes:</strong> {currentAssignment.request_notes}
            </div>
          )}

          <div className="flex space-x-3">
            <button 
              onClick={() => {
                // In a real app, this would open the video call or connect to the session
                alert(`Joining session for:\nPatient: ${currentAssignment.patient?.fhir_id || 'N/A'}\nLocation: ${currentAssignment.location}\nDelivery: ${currentAssignment.delivery_method}`);
              }}
              className="btn-primary"
            >
              <Phone className="w-4 h-4 mr-2" />
              Join Session
            </button>
            <button 
              onClick={() => handleCompleteRequest(currentAssignment.id)}
              className="btn-success"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Complete Appointment
            </button>
          </div>
        </div>
      )}

      {/* Pending Requests */}
      <div className="card">
        <h3 className="text-xl font-semibold mb-4 text-gray-800">
          Pending Appointments for {profile?.languages?.join(', ') || 'Your Language'} ({pendingRequests.length})
        </h3>
        
        {pendingRequests.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No pending appointments available</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingRequests.map((request) => (
              <div 
                key={request.id}
                className={`p-4 border rounded-xl flex justify-between items-start hover:bg-gray-50 transition ${
                  request.is_stat 
                    ? 'border-red-300 bg-red-50 hover:bg-red-100 shadow-md' 
                    : 'border-gray-200'
                }`}
              >
                <div className="space-y-1">
                  <p className={`font-bold text-lg flex items-center ${
                    request.is_stat ? 'text-red-800' : 'text-gray-800'
                  }`}>
                    {request.is_stat ? (
                      <AlertTriangle className="w-4 h-4 mr-2 text-red-500" />
                    ) : (
                      <MapPin className="w-4 h-4 mr-2 text-blue-500" />
                    )}
                    {request.location}
                    <span className="text-sm font-normal text-gray-500 ml-2">
                      ({request.duration_minutes} min)
                    </span>
                    {request.is_stat && (
                      <span className="text-sm font-bold text-red-600 ml-2">(STAT/Immediate)</span>
                    )}
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-semibold capitalize">{request.delivery_method}</span> / {request.patient_type}. 
                    URN: {request.patient?.fhir_id || 'N/A'}
                  </p>
                  <p className="text-xs text-gray-400">
                    Requested: {formatDate(request.created_at)}
                  </p>
                  {request.request_notes && (
                    <p className="text-xs text-gray-600 italic">
                      Notes: {request.request_notes}
                    </p>
                  )}
                </div>
                <button 
                  onClick={() => handleAcceptRequest(request.id)}
                  className="btn-success ml-4 flex-shrink-0"
                >
                  Accept Appointment
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Encounter Notes Section */}
      <div className="card">
        <h3 className="text-xl font-semibold mb-4 text-gray-800">Post-Session Notes & Feedback</h3>
        <p className="text-sm text-gray-600 mb-4">
          Submit your session notes (e.g., duration, nature of consult) to close the <strong>current appointment</strong>.
        </p>
        <textarea
          rows="4"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-xl focus:ring-blue-500 focus:border-blue-500 shadow-inner"
          placeholder="Type notes here, including confirmed start/end times and any critical language barriers noted."
        />
        <button 
          onClick={() => {
            if (currentAssignment) {
              handleCompleteRequest(currentAssignment.id);
            } else {
              alert('No active assignment to complete');
            }
          }}
          disabled={submittingNotes || !notes.trim() || !currentAssignment}
          className="btn-secondary mt-3"
        >
          <Send className="w-4 h-4 mr-2" />
          {submittingNotes ? 'Submitting...' : 'Submit Notes / Close Session'}
        </button>
      </div>
    </div>
  );
}