# System Architecture Report
## Healthcare Interpreter Booking System with FHIR Integration

**Document Version:** 1.0
**Date:** 2025-11-09
**Project:** FHIR-Project (Interpreter Hub)

---

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [High-Level Architecture](#high-level-architecture)
3. [Backend Architecture](#backend-architecture)
4. [Frontend Architecture](#frontend-architecture)
5. [Data Architecture](#data-architecture)
6. [FHIR Integration](#fhir-integration)
7. [Security Architecture](#security-architecture)
8. [API Design](#api-design)
9. [Deployment Architecture](#deployment-architecture)

---

## 1. Executive Summary

The Healthcare Interpreter Booking System is a full-stack web application designed to facilitate medical interpreter services within healthcare facilities. The system integrates with HL7 FHIR (Fast Healthcare Interoperability Resources) servers to manage patient data while maintaining a local database for interpreter scheduling and request management.

### Key Architectural Decisions
- **Architecture Pattern:** Three-tier architecture (Presentation, Business Logic, Data)
- **FHIR Standard:** FHIR R4 specification
- **Backend Framework:** FastAPI (Python) for high-performance async operations
- **Frontend Framework:** React with Vite for modern SPA experience
- **Database:** SQLite (development), scalable to PostgreSQL/MySQL
- **Authentication:** JWT-based stateless authentication
- **FHIR Server:** HAPI FHIR public test server (configurable)

---

## 2. High-Level Architecture

### 2.1 System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Layer                             │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │   React SPA (Port 3000)                                  │   │
│  │   - Staff Dashboard                                      │   │
│  │   - Interpreter Dashboard                                │   │
│  │   - Patient Management UI                                │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              ↓ HTTP/REST API
┌─────────────────────────────────────────────────────────────────┐
│                      Application Layer                          │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │   FastAPI Backend (Port 8000)                            │   │
│  │   - RESTful API Endpoints                                │   │
│  │   - Business Logic                                       │   │
│  │   - Authentication & Authorization                       │   │
│  │   - FHIR Client Integration                              │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
            ↓                                    ↓
┌─────────────────────────┐         ┌──────────────────────────────┐
│   Data Layer            │         │   External FHIR Server       │
│  ┌──────────────────┐   │         │  ┌───────────────────────┐   │
│  │ SQLite Database  │   │         │  │ HAPI FHIR (R4)        │   │
│  │ - Login Info     │   │         │  │ - Patient Resources   │   │
│  │ - Interpreters   │   │         │  │ - Appointments        │   │
│  │ - Patients       │   │         │  │ - Encounters          │   │
│  │ - Requests       │   │         │  └───────────────────────┘   │
│  └──────────────────┘   │         │  (hapi.fhir.org/baseR4)      │
└─────────────────────────┘         └──────────────────────────────┘
```

### 2.2 Component Responsibilities

| Component | Responsibility | Technology |
|-----------|---------------|------------|
| **Frontend SPA** | User interface, client-side routing, state management | React 18, Vite, TailwindCSS |
| **API Gateway** | RESTful endpoints, request validation, CORS handling | FastAPI, Pydantic |
| **Business Logic** | Interpreter matching, request management, availability tracking | Python, SQLAlchemy |
| **Auth Service** | JWT generation/validation, password hashing, role-based access | python-jose, passlib |
| **FHIR Client** | FHIR resource operations (CRUD), data transformation | httpx (async HTTP) |
| **Local Database** | Operational data persistence, interpreter schedules | SQLite/SQLAlchemy |
| **FHIR Server** | Patient demographic data, appointments, encounters | HAPI FHIR R4 |

---

## 3. Backend Architecture

### 3.1 Application Structure

```
FHIR-Project-Backend-main/
├── main.py              # FastAPI app, route definitions
├── models.py            # SQLAlchemy ORM models
├── schemas.py           # Pydantic request/response schemas
├── database.py          # Database session management
├── auth.py              # Authentication & authorization
├── fhir_client.py       # FHIR server integration
├── seed_data.py         # Database seeding script
└── requirements.txt     # Python dependencies
```

### 3.2 Core Backend Components

#### 3.2.1 FastAPI Application Layer
- **Location:** `main.py`
- **Lines of Code:** 659
- **Key Features:**
  - Async request handling for improved performance
  - CORS middleware for cross-origin requests
  - Dependency injection for database sessions and authentication
  - Comprehensive error handling with HTTP exception mapping

#### 3.2.2 Data Models (SQLAlchemy ORM)
**Location:** `models.py` (109 lines)

**Entity Relationship:**
```
LoginInformation (1) ──────< InterpreterData
       │                          │
       │                          │
       │                          ↓
       └──────────────────> InterpreterRequest (*)
                                   │
                                   ↓
                            PatientData (1)
```

**Key Models:**
1. **LoginInformation** - User authentication
   - Fields: id, username, password (hashed), user_type, timestamps
   - User Types: STAFF, INTERPRETER, ADMIN

2. **PatientData** - Local patient cache
   - Fields: id, fhir_id (unique), name, language, demographics
   - Synced from FHIR server

3. **InterpreterData** - Interpreter profiles
   - Fields: id, login_id (FK), name, language, availability_status, contact info
   - Availability States: AVAILABLE, UNAVAILABLE, BUSY

4. **InterpreterRequest** - Service requests
   - Fields: id, patient_id (FK), interpreter_id (FK), location, delivery_method, status, timestamps
   - Status Flow: PENDING → ACCEPTED → COMPLETED / CANCELLED
   - Delivery Methods: ONSITE, TELEPHONE, TELEHEALTH

#### 3.2.3 FHIR Integration Layer
**Location:** `fhir_client.py` (223 lines)

**Responsibilities:**
- Async HTTP client for FHIR server communication
- FHIR Resource parsing (Patient, Appointment)
- Data transformation between FHIR and local schema
- Error handling for FHIR API failures

**Key Methods:**
```python
async get_patient(patient_id: str) → Dict
async search_patients(name, language) → List[Dict]
async create_patient(patient_data: Dict) → Dict
parse_patient_resource(fhir_patient: Dict) → Dict
```

#### 3.2.4 Authentication & Authorization
**Location:** `auth.py` (106 lines)

**Security Mechanisms:**
- JWT (JSON Web Tokens) for stateless authentication
- BCrypt password hashing with salt
- Token expiry: 1440 minutes (24 hours)
- Role-based access control decorators:
  - `require_staff()` - Staff/Admin access
  - `require_interpreter()` - Interpreter-only access
  - `require_admin()` - Admin-only access

**Token Payload:**
```json
{
  "sub": "user_id",
  "exp": 1699564800
}
```

### 3.3 API Endpoint Categories

| Category | Endpoint Pattern | Auth Required | Methods |
|----------|-----------------|---------------|---------|
| Authentication | `/api/auth/*` | Varies | POST, GET |
| FHIR Patients | `/api/fhir/patients/*` | Yes (Staff) | GET |
| Local Patients | `/api/patients/*` | Yes | GET, POST |
| Interpreters | `/api/interpreters/*` | Yes | GET, POST, PATCH |
| Requests (Staff) | `/api/requests/*` | Yes (Staff) | GET, POST |
| Requests (Interpreter) | `/api/interpreter/requests/*` | Yes (Interpreter) | GET, POST |
| Dashboard | `/api/dashboard/*` | Yes (Staff) | GET |

---

## 4. Frontend Architecture

### 4.1 Application Structure

```
FHIR-Project-Frontend-main/src/
├── main.jsx                    # App entry point
├── App.jsx                     # Root component, routing
├── index.css                   # Global styles, Tailwind
├── pages/
│   ├── LoginPage.jsx          # Authentication UI
│   ├── StaffDashboard.jsx     # Staff/Admin dashboard
│   └── InterpreterDashboard.jsx # Interpreter dashboard
├── components/
│   ├── Layout.jsx             # App shell, header
│   ├── CreateRequestModal.jsx # Request creation wizard
│   ├── CreatePatientModal.jsx # Patient creation form
│   └── PatientDetailsModal.jsx # FHIR patient viewer
├── context/
│   └── AuthContext.jsx        # Authentication state
└── services/
    └── api.js                 # API client
```

### 4.2 Component Architecture

#### 4.2.1 Routing Strategy
**Pattern:** React Router v6 with protected routes

```jsx
/ → /dashboard (redirect)
/login → LoginPage (public)
/dashboard → Layout → DashboardRouter (protected)
    ├─ StaffDashboard (if user_type: staff/admin)
    └─ InterpreterDashboard (if user_type: interpreter)
```

**Route Protection:**
- `PrivateRoute` wrapper checks authentication token
- Auto-redirect to `/login` if unauthenticated
- Loading state during auth verification

#### 4.2.2 State Management

**Global State (Context API):**
- `AuthContext` - User authentication state
  - Methods: `login()`, `logout()`, `checkAuth()`
  - Persisted via localStorage token

**Component State (useState):**
- Dashboard statistics
- Request lists
- Modal visibility
- Form data

**API State:**
- Loading indicators
- Error messages
- Data caching per component

#### 4.2.3 Key Pages

**StaffDashboard.jsx (356 lines)**
- Dashboard statistics cards (available interpreters, pending requests, languages)
- Real-time interpreter availability grid by language
- Service requests table with filtering
- CSV export functionality for monitoring
- Patient FHIR details viewer
- Create patient / Create request modals

**InterpreterDashboard.jsx (323 lines)**
- Availability status toggle (Available/Unavailable/Busy)
- Current assignment display with session join
- Pending requests filtered by interpreter language
- STAT request highlighting
- Encounter notes submission

#### 4.2.4 Modal Components

**CreateRequestModal (397 lines) - Two-Step Wizard:**
1. **Step 1:** Patient selection
   - Search local patients
   - Search FHIR server
   - Auto-sync from FHIR
2. **Step 2:** Request details
   - Location, delivery method, duration
   - Language, patient type
   - STAT flag, notes

**CreatePatientModal (238 lines):**
- Creates patient in FHIR server
- Auto-syncs to local database
- Full demographic form

**PatientDetailsModal (256 lines):**
- Fetches complete FHIR Patient resource
- Displays all FHIR fields
- Shows identifiers, telecom, address, communication preferences

### 4.3 API Client Architecture

**Location:** `services/api.js` (153 lines)

**Design Pattern:** Singleton class with token management

```javascript
class APIClient {
  constructor() { /* Initialize with stored token */ }
  setToken(token) { /* Store in localStorage */ }
  request(endpoint, options) { /* Generic HTTP method */ }

  // Domain-specific methods
  async login(username, password)
  async getPatients()
  async createRequest(requestData)
  async acceptRequest(requestId)
  // ... 20+ methods
}
```

**Features:**
- Automatic Authorization header injection
- Centralized error handling
- Token persistence
- FastAPI error format parsing

### 4.4 UI/UX Design System

**Framework:** TailwindCSS with custom components

**Custom Component Classes:**
- `.card` - White rounded cards with shadows
- `.btn-primary` - Blue gradient buttons
- `.btn-success` - Green gradient buttons
- `.btn-danger` - Red solid buttons
- `.btn-secondary` - White bordered buttons
- `.btn-icon` - Circular icon buttons

**Design Tokens:**
- Primary: Blue-600/700 gradient
- Success: Green-500/600 gradient
- Danger: Red-500/600
- Border Radius: 12px (xl)
- Shadows: Large elevation (shadow-xl)

---

## 5. Data Architecture

### 5.1 Database Schema

```sql
-- Authentication
CREATE TABLE login_information (
    id VARCHAR PRIMARY KEY,
    username VARCHAR UNIQUE NOT NULL,
    password VARCHAR NOT NULL,  -- bcrypt hashed
    user_type ENUM('staff', 'interpreter', 'admin'),
    created_at DATETIME,
    updated_at DATETIME
);

-- Patient Cache (synced from FHIR)
CREATE TABLE patient_data (
    id VARCHAR PRIMARY KEY,
    fhir_id VARCHAR UNIQUE NOT NULL,  -- Links to FHIR Patient.id
    name VARCHAR NOT NULL,
    location VARCHAR,
    birthdate VARCHAR,
    gender VARCHAR,
    address VARCHAR,
    phone_number VARCHAR,
    email VARCHAR,
    language VARCHAR NOT NULL,  -- Preferred language
    created_at DATETIME,
    updated_at DATETIME
);

-- Interpreter Profiles
CREATE TABLE interpreter_data (
    id VARCHAR PRIMARY KEY,
    login_id VARCHAR UNIQUE NOT NULL,  -- FK to login_information
    name VARCHAR NOT NULL,
    phone_number VARCHAR,
    email VARCHAR,
    language VARCHAR NOT NULL,  -- Language proficiency
    gender VARCHAR,
    gender_preference VARCHAR,
    availability_status ENUM('available', 'unavailable', 'busy'),
    created_at DATETIME,
    updated_at DATETIME,
    FOREIGN KEY (login_id) REFERENCES login_information(id)
);

-- Interpreter Requests (Appointments)
CREATE TABLE interpreter_requests (
    id VARCHAR PRIMARY KEY,
    requested_by VARCHAR NOT NULL,  -- FK to login_information (staff)
    patient_id VARCHAR NOT NULL,    -- FK to patient_data
    interpreter_id VARCHAR,         -- FK to interpreter_data (nullable)
    location_method VARCHAR NOT NULL,
    delivery_method ENUM('onsite', 'telephone', 'telehealth'),
    language VARCHAR NOT NULL,
    status ENUM('pending', 'accepted', 'completed', 'cancelled'),
    patient_type VARCHAR,
    is_stat BOOLEAN DEFAULT FALSE,
    duration_minutes VARCHAR,
    request_notes TEXT,
    encounter_notes TEXT,
    requested_at DATETIME NOT NULL,
    accepted_at DATETIME,
    completed_at DATETIME,
    created_at DATETIME,
    updated_at DATETIME,
    FOREIGN KEY (requested_by) REFERENCES login_information(id),
    FOREIGN KEY (patient_id) REFERENCES patient_data(id),
    FOREIGN KEY (interpreter_id) REFERENCES interpreter_data(id)
);
```

### 5.2 Data Flow Patterns

#### Pattern 1: Patient Sync from FHIR
```
1. Staff searches FHIR server (by name/language)
2. FHIR server returns Patient resources
3. Staff selects patient
4. System POSTs to /api/patients/sync/{fhir_id}
5. Backend fetches Patient from FHIR
6. Backend parses FHIR resource
7. Backend inserts into patient_data table
8. Returns local patient record
```

#### Pattern 2: Create Patient in FHIR
```
1. Staff fills patient creation form
2. POST to /api/patients/create
3. Backend builds FHIR Patient resource
4. Backend POSTs to FHIR server
5. FHIR server returns created resource with ID
6. Backend parses FHIR resource
7. Backend inserts into patient_data table
8. Returns local patient record
```

#### Pattern 3: Request Lifecycle
```
PENDING:
  Staff creates request → assigned_to: null, status: pending

ACCEPTED:
  Interpreter accepts → assigned_to: interpreter_id, status: accepted
  Interpreter availability → busy

COMPLETED:
  Interpreter submits notes → status: completed
  Interpreter availability → available

CANCELLED:
  Staff/System cancels → status: cancelled
```

### 5.3 FHIR Resource Mapping

**Patient Resource → patient_data Table:**

| FHIR Path | Local Field | Transformation |
|-----------|-------------|----------------|
| `Patient.id` | `fhir_id` | Direct |
| `Patient.name[0].text` or `given + family` | `name` | Concatenation |
| `Patient.birthDate` | `birthdate` | Direct |
| `Patient.gender` | `gender` | Direct |
| `Patient.telecom[system=phone].value` | `phone_number` | Filter + Extract |
| `Patient.telecom[system=email].value` | `email` | Filter + Extract |
| `Patient.address[0].*` | `address` | Formatted string |
| `Patient.communication[preferred].language.coding[0].display` | `language` | Extract display name |

---

## 6. FHIR Integration

### 6.1 FHIR Server Configuration

**Default Server:** HAPI FHIR Public Test Server
- Base URL: `http://hapi.fhir.org/baseR4`
- FHIR Version: R4 (4.0.1)
- Authentication: None (public test server)
- Configurable via `FHIRClient.__init__(base_url)`

### 6.2 FHIR Operations

#### 6.2.1 Search Patients
**HTTP Request:**
```http
GET http://hapi.fhir.org/baseR4/Patient?name={name}&language={language}&_count=20
Accept: application/fhir+json
```

**Response:**
```json
{
  "resourceType": "Bundle",
  "type": "searchset",
  "entry": [
    {
      "resource": {
        "resourceType": "Patient",
        "id": "example-id",
        "name": [...],
        "birthDate": "1965-03-15",
        "gender": "male",
        ...
      }
    }
  ]
}
```

#### 6.2.2 Read Patient
**HTTP Request:**
```http
GET http://hapi.fhir.org/baseR4/Patient/{id}
Accept: application/fhir+json
```

#### 6.2.3 Create Patient
**HTTP Request:**
```http
POST http://hapi.fhir.org/baseR4/Patient
Content-Type: application/fhir+json

{
  "resourceType": "Patient",
  "name": [{
    "use": "official",
    "family": "Smith",
    "given": ["John"]
  }],
  "gender": "male",
  "birthDate": "1990-01-01",
  "telecom": [...],
  "address": [...],
  "communication": [{
    "language": {
      "coding": [{
        "system": "urn:ietf:bcp:47",
        "display": "Mandarin"
      }]
    },
    "preferred": true
  }]
}
```

### 6.3 FHIR Resource Structure

**Patient Resource (Relevant Fields):**
```json
{
  "resourceType": "Patient",
  "id": "unique-patient-id",
  "identifier": [
    {
      "use": "official",
      "system": "http://hospital.org/mrn",
      "value": "MRN123456"
    }
  ],
  "name": [
    {
      "use": "official",
      "text": "John Smith",
      "family": "Smith",
      "given": ["John"]
    }
  ],
  "telecom": [
    {
      "system": "phone",
      "value": "+1-555-1234",
      "use": "mobile"
    },
    {
      "system": "email",
      "value": "john@example.com"
    }
  ],
  "gender": "male",
  "birthDate": "1990-01-01",
  "address": [
    {
      "use": "home",
      "type": "physical",
      "text": "123 Main St, City, State, ZIP"
    }
  ],
  "communication": [
    {
      "language": {
        "coding": [
          {
            "system": "urn:ietf:bcp:47",
            "code": "zh",
            "display": "Mandarin"
          }
        ],
        "text": "Mandarin"
      },
      "preferred": true
    }
  ]
}
```

### 6.4 Error Handling Strategy

**FHIR Server Errors:**
- Connection timeout (30s)
- HTTP 4xx/5xx errors
- Invalid FHIR resources
- Network failures

**Handling Approach:**
```python
try:
    fhir_patient = await fhir_client.get_patient(fhir_id)
    if not fhir_patient:
        raise HTTPException(404, "Patient not found in FHIR server")
except httpx.HTTPError as e:
    raise HTTPException(500, f"FHIR server error: {e}")
```

---

## 7. Security Architecture

### 7.1 Authentication Flow

```
┌──────────┐                ┌──────────────┐              ┌──────────┐
│  Client  │                │   Backend    │              │ Database │
└────┬─────┘                └──────┬───────┘              └────┬─────┘
     │                             │                           │
     │ POST /api/auth/login        │                           │
     │ {username, password}        │                           │
     ├────────────────────────────>│                           │
     │                             │  Query user by username   │
     │                             ├──────────────────────────>│
     │                             │<──────────────────────────┤
     │                             │  User record              │
     │                             │                           │
     │                             │ Verify password (bcrypt)  │
     │                             ├──────┐                    │
     │                             │      │                    │
     │                             │<─────┘                    │
     │                             │                           │
     │                             │ Generate JWT token        │
     │                             ├──────┐                    │
     │                             │      │                    │
     │                             │<─────┘                    │
     │                             │                           │
     │ {access_token, user_type}   │                           │
     │<────────────────────────────┤                           │
     │                             │                           │
     │ Store token in localStorage │                           │
     ├──────┐                      │                           │
     │      │                      │                           │
     │<─────┘                      │                           │
     │                             │                           │
     │ GET /api/dashboard/stats    │                           │
     │ Authorization: Bearer TOKEN │                           │
     ├────────────────────────────>│                           │
     │                             │ Decode JWT                │
     │                             ├──────┐                    │
     │                             │      │                    │
     │                             │<─────┘                    │
     │                             │                           │
     │                             │  Verify user exists       │
     │                             ├──────────────────────────>│
     │                             │<──────────────────────────┤
     │                             │                           │
     │                             │ Check role (require_staff)│
     │                             ├──────┐                    │
     │                             │      │                    │
     │                             │<─────┘                    │
     │                             │                           │
     │ Dashboard stats data        │                           │
     │<────────────────────────────┤                           │
```

### 7.2 Authorization Model

**Role Hierarchy:**
```
ADMIN
  ├─ All STAFF permissions
  └─ User management (future)

STAFF
  ├─ View dashboard statistics
  ├─ Create/view all requests
  ├─ Search FHIR patients
  ├─ Create patients
  ├─ View all interpreters
  └─ Export monitoring data

INTERPRETER
  ├─ View own profile
  ├─ Update own availability
  ├─ View pending requests (filtered by language)
  ├─ Accept requests
  ├─ Complete requests
  └─ Submit encounter notes
```

**Implementation:**
```python
# Decorator-based authorization
@app.get("/api/requests", response_model=List[RequestWithDetails])
def get_all_requests(
    current_user: LoginInformation = Depends(require_staff)
):
    # Only staff/admin can access
    ...

@app.post("/api/interpreter/requests/{request_id}/accept")
def accept_request(
    request_id: str,
    current_user: LoginInformation = Depends(require_interpreter)
):
    # Only interpreters can access
    ...
```

### 7.3 Security Best Practices Implemented

1. **Password Security:**
   - BCrypt hashing with automatic salt
   - No plaintext password storage
   - Password validation on input

2. **Token Security:**
   - JWT with expiration (24 hours)
   - Stateless authentication (no session storage)
   - Token stored in localStorage (client-side)

3. **API Security:**
   - CORS enabled for specified origins
   - Input validation with Pydantic schemas
   - SQL injection prevention (ORM parameterized queries)
   - HTTPOnly would be recommended for production (cookie-based tokens)

4. **Data Access:**
   - Role-based endpoint access
   - Resource ownership validation (interpreters can only modify own data)
   - Database-level foreign key constraints

### 7.4 Security Considerations for Production

**Current Limitations:**
- `SECRET_KEY` is hardcoded (should use environment variable)
- CORS allows all origins (`"*"`)
- SQLite in production (should use PostgreSQL with SSL)
- No rate limiting
- No HTTPS enforcement
- Token in localStorage (vulnerable to XSS)

**Recommended Improvements:**
- Use environment variables for secrets
- Implement HTTPS/TLS
- Add rate limiting (e.g., slowapi)
- Use HTTP-only cookies for tokens
- Add CSRF protection
- Implement audit logging
- Add input sanitization for XSS prevention

---

## 8. API Design

### 8.1 RESTful API Endpoints

#### Authentication Endpoints
```
POST   /api/auth/register        Create new user account
POST   /api/auth/login           Authenticate and get JWT token
GET    /api/auth/me              Get current user profile
```

#### FHIR Patient Endpoints
```
GET    /api/fhir/patients/search?name={name}&language={lang}
       Search patients in FHIR server

GET    /api/fhir/patients/{fhir_id}
       Get complete FHIR Patient resource

POST   /api/patients/sync/{fhir_id}
       Sync FHIR patient to local database

POST   /api/patients/create
       Create patient in FHIR and sync locally
```

#### Local Patient Endpoints
```
GET    /api/patients?skip={skip}&limit={limit}
       List local patients (paginated)

GET    /api/patients/{patient_id}
       Get single patient details
```

#### Interpreter Endpoints
```
POST   /api/interpreters
       Create interpreter profile (Staff only)

GET    /api/interpreters?language={lang}&available_only={bool}
       List interpreters with filters

GET    /api/interpreters/me
       Get current interpreter profile

PATCH  /api/interpreters/me
       Update own availability status
```

#### Request Endpoints (Staff)
```
GET    /api/requests?status={status}&skip={skip}&limit={limit}
       List all requests with filters

POST   /api/requests
       Create new interpreter request

GET    /api/requests/{request_id}
       Get request details with patient/interpreter info
```

#### Request Endpoints (Interpreter)
```
GET    /api/interpreter/requests/pending
       Get pending requests for interpreter's language

GET    /api/interpreter/requests/my
       Get interpreter's accepted requests

POST   /api/interpreter/requests/{request_id}/accept
       Accept a pending request

POST   /api/interpreter/requests/{request_id}/complete
       Complete request with encounter notes
```

#### Dashboard Endpoints
```
GET    /api/dashboard/stats
       Get dashboard statistics:
       - Available interpreters count
       - Pending requests count
       - Total languages
       - Availability by language
```

#### Health Check
```
GET    /api/health
       System health check
```

### 8.2 Request/Response Examples

#### Create Interpreter Request
**Request:**
```http
POST /api/requests
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "patient_id": "abc-123-def",
  "location_method": "Ward 4A",
  "delivery_method": "onsite",
  "language": "Mandarin",
  "patient_type": "Inpatient",
  "is_stat": false,
  "duration_minutes": "60",
  "request_notes": "Patient needs informed consent for surgery"
}
```

**Response (201 Created):**
```json
{
  "id": "req-789-xyz",
  "patient_id": "abc-123-def",
  "interpreter_id": null,
  "location_method": "Ward 4A",
  "delivery_method": "onsite",
  "language": "Mandarin",
  "status": "pending",
  "patient_type": "Inpatient",
  "is_stat": false,
  "duration_minutes": "60",
  "request_notes": "Patient needs informed consent for surgery",
  "encounter_notes": null,
  "requested_at": "2025-11-09T10:30:00Z",
  "accepted_at": null,
  "completed_at": null
}
```

#### Dashboard Statistics
**Request:**
```http
GET /api/dashboard/stats
Authorization: Bearer {jwt_token}
```

**Response (200 OK):**
```json
{
  "available_interpreters": 5,
  "pending_requests": 3,
  "total_languages": 6,
  "availability_by_language": [
    {
      "language": "Mandarin",
      "available_count": 2
    },
    {
      "language": "Arabic",
      "available_count": 2
    },
    {
      "language": "Vietnamese",
      "available_count": 1
    },
    {
      "language": "Tagalog",
      "available_count": 0
    },
    {
      "language": "Spanish",
      "available_count": 0
    }
  ]
}
```

### 8.3 Error Response Format

**FastAPI Standard Error Response:**
```json
{
  "detail": "Error message describing what went wrong"
}
```

**HTTP Status Codes Used:**
- `200 OK` - Successful GET/PATCH
- `201 Created` - Successful POST (resource created)
- `400 Bad Request` - Invalid input, validation errors
- `401 Unauthorized` - Missing/invalid authentication token
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource doesn't exist
- `500 Internal Server Error` - Server-side errors

---

## 9. Deployment Architecture

### 9.1 Development Environment

**Backend:**
```bash
cd FHIR-Project-Backend-main/
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python seed_data.py  # Optional: seed test data
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Frontend:**
```bash
cd FHIR-Project-Frontend-main/
npm install
npm run dev  # Starts Vite dev server on port 3000
```

**Database:**
- SQLite file: `interpreter_booking.db`
- Created automatically on first run
- Location: Backend project root

### 9.2 Production Deployment (Recommended)

```
┌─────────────────────────────────────────────────────────────┐
│                      Load Balancer / CDN                     │
│                    (HTTPS Termination)                       │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┴──────────────┐
        ↓                             ↓
┌───────────────────┐        ┌──────────────────┐
│  Static Frontend  │        │  Backend API     │
│  (Nginx/S3)       │        │  (Gunicorn +     │
│                   │        │   Uvicorn)       │
│  React Build      │        │  FastAPI App     │
│  Port: 80/443     │        │  Port: 8000      │
└───────────────────┘        └────────┬─────────┘
                                      │
                        ┌─────────────┴────────────┐
                        ↓                          ↓
                 ┌──────────────┐        ┌──────────────────┐
                 │  PostgreSQL  │        │   FHIR Server    │
                 │  Database    │        │  (HAPI FHIR)     │
                 │              │        │  hapi.fhir.org   │
                 └──────────────┘        └──────────────────┘
```

**Components:**
1. **Frontend:**
   - Build with `npm run build`
   - Serve static files from `dist/` folder
   - Nginx or cloud storage (S3, Azure Blob)

2. **Backend:**
   - ASGI server: Gunicorn + Uvicorn workers
   - Environment variables for configuration
   - Process manager: systemd or Docker

3. **Database:**
   - PostgreSQL 12+ (replace SQLite)
   - Connection pooling
   - Regular backups

4. **FHIR Server:**
   - Production: Self-hosted HAPI FHIR
   - Or integrate with EHR FHIR endpoint

### 9.3 Environment Configuration

**Backend Environment Variables:**
```bash
# .env file
DATABASE_URL=postgresql://user:pass@localhost:5432/interpreter_db
SECRET_KEY=your-secure-random-key-here
FHIR_BASE_URL=http://hapi.fhir.org/baseR4
CORS_ORIGINS=https://yourdomain.com
TOKEN_EXPIRE_MINUTES=1440
```

**Frontend Environment Variables:**
```bash
# .env
VITE_API_BASE_URL=https://api.yourdomain.com/api
```

### 9.4 Scaling Considerations

**Horizontal Scaling:**
- Backend: Multiple FastAPI instances behind load balancer
- Database: Read replicas for queries
- FHIR: Caching layer (Redis) for frequent patient lookups

**Vertical Scaling:**
- Database: Increase PostgreSQL resources
- Backend: More CPU/RAM for async operations

**Performance Optimization:**
- Database indexing on frequent queries (language, status, fhir_id)
- CDN for frontend static assets
- API response caching (Redis)
- Database connection pooling
- Async FHIR operations (already implemented)

---

## Appendix A: Technology Stack Summary

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Backend** |
| Language | Python | 3.11+ | Application logic |
| Framework | FastAPI | 0.104.1 | REST API framework |
| ORM | SQLAlchemy | 2.0.23 | Database modeling |
| Validation | Pydantic | 2.5.0 | Request/response schemas |
| Auth | python-jose | 3.3.0 | JWT handling |
| Hashing | passlib[bcrypt] | 1.7.4 | Password hashing |
| HTTP Client | httpx | 0.25.1 | Async FHIR requests |
| ASGI Server | Uvicorn | 0.24.0 | Development server |
| **Frontend** |
| Language | JavaScript | ES6+ | UI logic |
| Framework | React | 18.2.0 | Component library |
| Build Tool | Vite | 5.0.8 | Dev server & bundler |
| Routing | React Router | 6.20.0 | Client-side routing |
| Styling | TailwindCSS | 3.3.6 | Utility-first CSS |
| Icons | Lucide React | 0.263.1 | Icon library |
| **Database** |
| Development | SQLite | 3.x | Embedded database |
| Production (Recommended) | PostgreSQL | 12+ | Relational database |
| **FHIR** |
| Standard | FHIR R4 | 4.0.1 | Healthcare interoperability |
| Server | HAPI FHIR | Latest | Open-source FHIR server |

---

## Appendix B: Key Design Patterns

1. **Repository Pattern:** SQLAlchemy models abstract database operations
2. **Dependency Injection:** FastAPI's `Depends()` for database sessions and auth
3. **Data Transfer Objects:** Pydantic schemas separate API contracts from models
4. **Singleton Pattern:** API client instance management
5. **Context Provider Pattern:** React Context for global auth state
6. **Compound Components:** Modal components with internal state management
7. **Adapter Pattern:** FHIR client adapts external API to internal data structures

---

## Appendix C: Future Enhancements

**Planned Features:**
- [ ] Real-time notifications (WebSockets)
- [ ] Video interpreter integration
- [ ] Appointment resource creation in FHIR
- [ ] Multi-language UI support
- [ ] Advanced reporting and analytics
- [ ] Mobile application (React Native)
- [ ] Interpreter scheduling calendar
- [ ] Integration with EHR systems
- [ ] Encounter resource creation after completion

**Technical Improvements:**
- [ ] GraphQL API option
- [ ] Service worker for offline support
- [ ] Automated testing (pytest, Jest)
- [ ] CI/CD pipeline
- [ ] Container orchestration (Kubernetes)
- [ ] Monitoring and logging (Prometheus, ELK)

---

**Document End**
