const API_BASE = 'http://localhost:8000/api';

class APIClient {
  constructor() {
    this.token = localStorage.getItem('token');
  }

  setToken(token) {
    this.token = token;
    localStorage.setItem('token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('token');
  }

  async request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Request failed' }));
      // Handle FastAPI error format
      throw new Error(error.detail || error.message || 'Request failed');
    }

    return response.json();
  }

  // Auth APIs
  async login(username, password) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    this.setToken(data.access_token);
    return data;
  }

  async getMe() {
    return this.request('/auth/me');
  }

  logout() {
    this.clearToken();
  }

  // Dashboard Stats API
  async getDashboardStats() {
    return this.request('/dashboard/stats');
  }

  // Patient APIs
  async searchFHIRPatients(name = '', language = '') {
    const params = new URLSearchParams();
    if (name) params.append('name', name);
    if (language) params.append('language', language);
    return this.request(`/fhir/patients/search?${params}`); 
  }

  async syncPatient(fhirId) {
    return this.request(`/patients/sync/${fhirId}`, { method: 'POST' });
  }

  async getPatients() {
    return this.request('/patients');
  }

  async createPatient(patientData) {
    return this.request('/patients/create', {
      method: 'POST',
      body: JSON.stringify(patientData),
    });
  }

  async getPatientFHIRDetails(fhirId) {
    return this.request(`/fhir/patients/${fhirId}`);
  }

  // Interpreter APIs
  async getInterpreters(language = '', availableOnly = false) {
    const params = new URLSearchParams();
    if (language) params.append('language', language);
    if (availableOnly) params.append('available_only', 'true');
    return this.request(`/interpreters?${params}`);
  }

  async getMyInterpreterProfile() {
    return this.request('/interpreters/me');
  }

  async updateMyAvailability(status) {
    return this.request('/interpreters/me', {
      method: 'PATCH',
      body: JSON.stringify({ availability_status: status }),
    });
  }

  // Request APIs (Staff)
  async createRequest(requestData) {
    return this.request('/requests', {
      method: 'POST',
      body: JSON.stringify(requestData),
    });
  }

  async getAllRequests(status = '', language = '') {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (language) params.append('language', language);
    return this.request(`/requests?${params}`);
  }

  async getRequest(requestId) {
    return this.request(`/requests/${requestId}`);
  }

  // Request APIs (Interpreter)
  async getPendingRequests() {
    return this.request('/interpreter/requests/pending');
  }

  async getMyRequests() {
    return this.request('/interpreter/requests/my');
  }

  async acceptRequest(requestId) {
    return this.request(`/interpreter/requests/${requestId}/accept`, {
      method: 'POST',
    });
  }

  async completeRequest(requestId, notes) {
    return this.request(`/interpreter/requests/${requestId}/complete`, {
      method: 'POST',
      body: JSON.stringify({ encounter_notes: notes }),
    });
  }
}

export const api = new APIClient();