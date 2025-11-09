import { useState, useEffect } from 'react';
import { X, Search, ArrowLeft, FileText } from 'lucide-react';
import { api } from '../services/api';
import PatientDetailsModal from './PatientDetailsModal';

export default function CreateRequestModal({ isOpen, onClose, onSuccess }) {
  const [step, setStep] = useState(1); // 1: Patient Selection, 2: Request Details
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patients, setPatients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPatientDetailsModal, setShowPatientDetailsModal] = useState(false);
  const [patientForDetails, setPatientForDetails] = useState(null);

  // Form data for step 2
  const [formData, setFormData] = useState({
    location_method: '',
    delivery_method: 'onsite',
    patient_type: '',
    duration_minutes: '30',
    is_stat: false,
    request_notes: '',
    language: ''
  });

  useEffect(() => {
    if (isOpen) {
      loadPatients();
      setStep(1);
      setSelectedPatient(null);
      setError('');
      resetForm();
    }
  }, [isOpen]);

  const resetForm = () => {
    setFormData({
      location_method: '',
      delivery_method: 'onsite',
      patient_type: '',
      duration_minutes: '30',
      is_stat: false,
      request_notes: '',
      language: ''
    });
  };

  const loadPatients = async () => {
    try {
      setLoading(true);
      const data = await api.getPatients();
      setPatients(data);
    } catch (err) {
      setError('Failed to load patients');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchFHIR = async () => {
    if (!searchTerm.trim()) return;
    
    try {
      setLoading(true);
      setError('');
      const result = await api.searchFHIRPatients(searchTerm);
      
      if (result.patients && result.patients.length > 0) {
        const fhirPatient = result.patients[0];
        const patient = await api.syncPatient(fhirPatient.id);
        setSelectedPatient(patient);
        setStep(2);
      } else {
        setError('No patients found in FHIR system');
      }
    } catch (err) {
      setError(err.message || 'Failed to search FHIR');
    } finally {
      setLoading(false);
    }
  };

  const handlePatientSelect = (patient) => {
    setSelectedPatient(patient);
    setStep(2);
  };

  const handleViewPatientDetails = (e, patient) => {
    e.stopPropagation(); // Prevent triggering patient selection
    setPatientForDetails(patient);
    setShowPatientDetailsModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedPatient) {
      setError('Please select a patient');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const requestData = {
        patient_id: selectedPatient.id,
        ...formData
      };
      
      await api.createRequest(requestData);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create request');
    } finally {
      setLoading(false);
    }
  };

  const filteredPatients = patients.filter(patient =>
    patient.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.fhir_id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800">
            {step === 1 ? 'Select Patient' : 'Request Details'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Step 1: Patient Selection */}
        {step === 1 && (
          <div className="p-6">
            {/* Search Bar */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Patients
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name or FHIR ID"
                  className="flex-1 p-3 border border-gray-300 rounded-xl focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  onClick={handleSearchFHIR}
                  disabled={loading || !searchTerm.trim()}
                  className="btn-secondary"
                >
                  <Search className="w-4 h-4" />
                  Search FHIR
                </button>
              </div>
            </div>

            {/* Existing Patients List */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">
                Existing Patients ({filteredPatients.length})
              </h3>
              
              {loading ? (
                <div className="text-center py-8 text-gray-500">
                  Loading patients...
                </div>
              ) : filteredPatients.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No patients found. Try searching FHIR system.
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {filteredPatients.map((patient) => (
                    <div
                      key={patient.id}
                      onClick={() => handlePatientSelect(patient)}
                      className="p-3 border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{patient.name}</p>
                          <p className="text-sm text-gray-500">FHIR ID: {patient.fhir_id}</p>
                          {patient.language && (
                            <p className="text-sm text-blue-600">
                              Language: {patient.language}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={(e) => handleViewPatientDetails(e, patient)}
                            className="text-blue-600 hover:text-blue-800 p-2 rounded hover:bg-blue-50 transition-colors"
                            title="View FHIR Details"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                          <button className="btn-primary text-xs">
                            Select
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Request Details */}
        {step === 2 && (
          <form onSubmit={handleSubmit} className="p-6">
            {/* Selected Patient Info */}
            <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-blue-800">Selected Patient</h3>
                <button
                  type="button"
                  onClick={(e) => handleViewPatientDetails(e, selectedPatient)}
                  className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-100 transition-colors flex items-center space-x-1 text-sm"
                  title="View FHIR Details"
                >
                  <FileText className="w-4 h-4" />
                  <span>Get Details</span>
                </button>
              </div>
              <p className="text-blue-700">
                <strong>{selectedPatient?.name}</strong> (FHIR ID: {selectedPatient?.fhir_id})
              </p>
              {selectedPatient?.language && (
                <p className="text-sm text-blue-600">
                  Preferred Language: {selectedPatient.language}
                </p>
              )}
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location/Method *
                </label>
                <input
                  type="text"
                  required
                  value={formData.location_method}
                  onChange={(e) => setFormData({...formData, location_method: e.target.value})}
                  placeholder="e.g., Ward 4A, Emergency Department"
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Delivery Method *
                </label>
                <select
                  required
                  value={formData.delivery_method}
                  onChange={(e) => setFormData({...formData, delivery_method: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="onsite">Onsite</option>
                  <option value="telephone">Telephone</option>
                  <option value="telehealth">Telehealth</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Patient Type *
                </label>
                <input
                  type="text"
                  required
                  value={formData.patient_type}
                  onChange={(e) => setFormData({...formData, patient_type: e.target.value})}
                  placeholder="e.g., Inpatient, Outpatient, Emergency"
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Duration (minutes) *
                </label>
                <input
                  type="number"
                  required
                  min="15"
                  max="240"
                  value={formData.duration_minutes}
                  onChange={(e) => setFormData({...formData, duration_minutes: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Language Required *
                </label>
                <input
                  type="text"
                  required
                  value={formData.language}
                  onChange={(e) => setFormData({...formData, language: e.target.value})}
                  placeholder="e.g., Mandarin, Arabic, Spanish"
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* STAT Checkbox */}
            <div className="mb-6">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.is_stat}
                  onChange={(e) => setFormData({...formData, is_stat: e.target.checked})}
                  className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                />
                <span className="text-sm font-medium text-red-700">
                  STAT (Urgent/Immediate Request)
                </span>
              </label>
            </div>

            {/* Notes */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Request Notes
              </label>
              <textarea
                rows="3"
                value={formData.request_notes}
                onChange={(e) => setFormData({...formData, request_notes: e.target.value})}
                placeholder="Additional details about the interpretation request..."
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Buttons */}
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="btn-secondary"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary flex-1"
              >
                {loading ? 'Creating...' : 'Create Request'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Patient Details Modal */}
      <PatientDetailsModal
        isOpen={showPatientDetailsModal}
        onClose={() => {
          setShowPatientDetailsModal(false);
          setPatientForDetails(null);
        }}
        patient={patientForDetails}
      />
    </div>
  );
}