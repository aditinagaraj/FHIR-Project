import { useState, useEffect } from 'react';
import { X, User, Calendar, MapPin, Phone, Mail, Globe, Loader } from 'lucide-react';
import { api } from '../services/api';

export default function PatientDetailsModal({ isOpen, onClose, patient }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fhirDetails, setFhirDetails] = useState(null);

  useEffect(() => {
    if (isOpen && patient) {
      loadPatientDetails();
    }
  }, [isOpen, patient]);

  const loadPatientDetails = async () => {
    if (!patient?.fhir_id) {
      setError('No FHIR ID available for this patient');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const details = await api.getPatientFHIRDetails(patient.fhir_id);
      setFhirDetails(details);
    } catch (err) {
      setError(err.message || 'Failed to load patient details from FHIR server');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getTelecom = (telecomArray, system) => {
    if (!telecomArray || !Array.isArray(telecomArray)) return 'N/A';
    const item = telecomArray.find(t => t.system === system);
    return item?.value || 'N/A';
  };

  const getAddress = (addressArray) => {
    if (!addressArray || !Array.isArray(addressArray) || addressArray.length === 0) {
      return 'N/A';
    }
    const addr = addressArray[0];
    
    // If there's a text field, use it directly
    if (addr.text) {
      return addr.text;
    }
    
    // Otherwise, build from components
    const parts = [];
    if (addr.line) parts.push(addr.line.join(', '));
    if (addr.city) parts.push(addr.city);
    if (addr.state) parts.push(addr.state);
    if (addr.postalCode) parts.push(addr.postalCode);
    if (addr.country) parts.push(addr.country);
    return parts.join(', ') || 'N/A';
  };

  const getLanguage = (communicationArray) => {
    if (!communicationArray || !Array.isArray(communicationArray)) return 'N/A';
    const preferred = communicationArray.find(c => c.preferred);
    if (preferred?.language?.coding?.[0]?.display) {
      return preferred.language.coding[0].display;
    }
    if (preferred?.language?.text) {
      return preferred.language.text;
    }
    if (communicationArray[0]?.language?.coding?.[0]?.display) {
      return communicationArray[0].language.coding[0].display;
    }
    return 'N/A';
  };

  const getIdentifiers = (identifierArray) => {
    if (!identifierArray || !Array.isArray(identifierArray)) return [];
    return identifierArray.map((id, index) => ({
      key: index,
      system: id.system || 'Unknown System',
      value: id.value || 'N/A',
      use: id.use || 'unknown'
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-blue-50">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Patient FHIR Details</h2>
            <p className="text-sm text-gray-600 mt-1">
              {patient?.name} (FHIR ID: {patient?.fhir_id})
            </p>
          </div>
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

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center p-12">
            <div className="text-center">
              <Loader className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Loading patient details from FHIR server...</p>
            </div>
          </div>
        )}

        {/* Content */}
        {!loading && fhirDetails && (
          <div className="p-6 space-y-6">
            {/* Basic Information */}
            <div className="card bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <User className="w-5 h-5 mr-2 text-blue-600" />
                Basic Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Full Name</p>
                  <p className="text-base font-semibold text-gray-900">
                    {fhirDetails.name?.[0]?.text ||
                     `${fhirDetails.name?.[0]?.given?.join(' ') || ''} ${fhirDetails.name?.[0]?.family || ''}`.trim() ||
                     'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Gender</p>
                  <p className="text-base text-gray-900 capitalize">
                    {fhirDetails.gender || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Date of Birth</p>
                  <p className="text-base text-gray-900 flex items-center">
                    <Calendar className="w-4 h-4 mr-2 text-gray-500" />
                    {formatDate(fhirDetails.birthDate)}
                  </p>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="card bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <Phone className="w-5 h-5 mr-2 text-blue-600" />
                Contact Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Phone Number</p>
                  <p className="text-base text-gray-900 flex items-center">
                    <Phone className="w-4 h-4 mr-2 text-gray-500" />
                    {getTelecom(fhirDetails.telecom, 'phone')}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Email</p>
                  <p className="text-base text-gray-900 flex items-center">
                    <Mail className="w-4 h-4 mr-2 text-gray-500" />
                    {getTelecom(fhirDetails.telecom, 'email')}
                  </p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm font-medium text-gray-500">Address</p>
                  <p className="text-base text-gray-900 flex items-center">
                    <MapPin className="w-4 h-4 mr-2 text-gray-500" />
                    {getAddress(fhirDetails.address)}
                  </p>
                </div>
              </div>
            </div>

            {/* Language & Communication */}
            <div className="card bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <Globe className="w-5 h-5 mr-2 text-blue-600" />
                Language & Communication
              </h3>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Preferred Language</p>
                  <p className="text-base font-semibold text-blue-700">
                    {getLanguage(fhirDetails.communication)}
                  </p>
                </div>
              </div>
            </div>

            {/* Identifiers */}
            {fhirDetails.identifier && fhirDetails.identifier.length > 0 && (
              <div className="card bg-gray-50">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Patient Identifiers
                </h3>
                <div className="space-y-2">
                  {getIdentifiers(fhirDetails.identifier).map((id) => (
                    <div key={id.key} className="flex justify-between items-center p-2 bg-white rounded border border-gray-200">
                      <div>
                        <p className="text-sm font-medium text-gray-600">{id.system}</p>
                        <p className="text-xs text-gray-500 capitalize">Use: {id.use}</p>
                      </div>
                      <p className="text-sm font-semibold text-gray-900">{id.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* FHIR Resource ID */}
            <div className="card bg-blue-50 border border-blue-200">
              <p className="text-sm font-medium text-blue-800">
                <strong>FHIR Resource ID:</strong> {fhirDetails.id}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                Resource Type: {fhirDetails.resourceType || 'Patient'}
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-200 bg-gray-50">
          <button onClick={onClose} className="btn-primary">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
