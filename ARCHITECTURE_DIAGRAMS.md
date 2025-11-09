# System Architecture Diagrams
## Healthcare Interpreter Booking System with FHIR Integration

---

## 1. High-Level System Architecture

```mermaid
graph TB
    subgraph "Client Layer - Browser"
        UI[React SPA - Port 3000]
        UI --> SD[Staff Dashboard]
        UI --> ID[Interpreter Dashboard]
        UI --> PM[Patient Management]
    end

    subgraph "Application Layer - Backend Server"
        API[FastAPI - Port 8000]
        AUTH[Authentication Service]
        BL[Business Logic Layer]
        FHIR[FHIR Client]

        API --> AUTH
        API --> BL
        BL --> FHIR
    end

    subgraph "Data Layer"
        DB[(SQLite Database)]
        FHIRDB[(HAPI FHIR Server)]
    end

    UI -->|HTTP/REST API| API
    BL --> DB
    FHIR -->|FHIR R4 API| FHIRDB

    style UI fill:#e1f5ff
    style API fill:#fff4e1
    style DB fill:#e8f5e9
    style FHIRDB fill:#f3e5f5
```

---

## 2. Detailed Component Architecture

```mermaid
graph LR
    subgraph "Frontend Components"
        A[App.jsx] --> B[AuthContext]
        A --> C[React Router]
        C --> D[LoginPage]
        C --> E[Layout]
        E --> F[StaffDashboard]
        E --> G[InterpreterDashboard]
        F --> H[CreateRequestModal]
        F --> I[CreatePatientModal]
        F --> J[PatientDetailsModal]
        B --> K[API Client]
    end

    subgraph "Backend Components"
        L[main.py] --> M[Auth Module]
        L --> N[Database Module]
        L --> O[FHIR Client]
        L --> P[Models]
        L --> Q[Schemas]
        N --> R[SQLAlchemy ORM]
    end

    K -->|HTTP Requests| L
    O -->|FHIR API| S[HAPI FHIR Server]
    R --> T[(Database)]

    style A fill:#61dafb
    style L fill:#009688
    style S fill:#9c27b0
    style T fill:#4caf50
```

---

## 3. Data Flow Architecture

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant API
    participant Auth
    participant Database
    participant FHIR

    User->>Frontend: Login Request
    Frontend->>API: POST /api/auth/login
    API->>Auth: Verify Password
    Auth->>Database: Query User
    Database-->>Auth: User Record
    Auth-->>API: JWT Token
    API-->>Frontend: Token + User Info
    Frontend->>Frontend: Store Token

    User->>Frontend: Search Patient
    Frontend->>API: GET /api/fhir/patients/search
    API->>FHIR: Search Patients
    FHIR-->>API: Patient Bundle
    API-->>Frontend: Patient List

    User->>Frontend: Create Request
    Frontend->>API: POST /api/requests
    API->>Database: Insert Request
    Database-->>API: Request Created
    API-->>Frontend: Request Details
```

---

## 4. Database Schema (Entity Relationship Diagram)

```mermaid
erDiagram
    LOGIN_INFORMATION ||--o| INTERPRETER_DATA : "has profile"
    LOGIN_INFORMATION ||--o{ INTERPRETER_REQUEST : "creates"
    PATIENT_DATA ||--o{ INTERPRETER_REQUEST : "receives service"
    INTERPRETER_DATA ||--o{ INTERPRETER_REQUEST : "fulfills"

    LOGIN_INFORMATION {
        string id PK
        string username UK
        string password
        enum user_type
        datetime created_at
        datetime updated_at
    }

    PATIENT_DATA {
        string id PK
        string fhir_id UK
        string name
        string location
        string birthdate
        string gender
        string language
        string phone_number
        string email
        string address
        datetime created_at
    }

    INTERPRETER_DATA {
        string id PK
        string login_id FK
        string name
        string language
        string phone_number
        string email
        string gender
        string gender_preference
        enum availability_status
        datetime created_at
    }

    INTERPRETER_REQUEST {
        string id PK
        string requested_by FK
        string patient_id FK
        string interpreter_id FK
        string location_method
        enum delivery_method
        string language
        enum status
        boolean is_stat
        string duration_minutes
        text request_notes
        text encounter_notes
        datetime requested_at
        datetime accepted_at
        datetime completed_at
    }
```

---

## 5. Authentication Flow Diagram

```mermaid
sequenceDiagram
    participant C as Client
    participant F as Frontend
    participant A as API Gateway
    participant Auth as Auth Service
    participant DB as Database

    C->>F: Enter Credentials
    F->>A: POST /api/auth/login<br/>{username, password}
    A->>DB: SELECT * FROM login_information<br/>WHERE username = ?
    DB-->>A: User Record
    A->>Auth: verify_password(plain, hashed)
    Auth->>Auth: bcrypt.verify()
    Auth-->>A: Password Valid
    A->>Auth: create_access_token({sub: user_id})
    Auth->>Auth: jwt.encode(payload, SECRET_KEY)
    Auth-->>A: JWT Token
    A-->>F: {access_token, token_type,<br/>user_type, user_id}
    F->>F: localStorage.setItem('token', token)
    F->>A: GET /api/dashboard/stats<br/>Authorization: Bearer TOKEN
    A->>Auth: decode_token(token)
    Auth->>Auth: jwt.decode(token, SECRET_KEY)
    Auth-->>A: {sub: user_id, exp: timestamp}
    A->>DB: SELECT * FROM login_information<br/>WHERE id = user_id
    DB-->>A: User Record
    A->>A: Check user_type permissions
    A->>DB: Query Dashboard Data
    DB-->>A: Statistics
    A-->>F: Dashboard Data
    F-->>C: Display Dashboard
```

---

## 6. Request Lifecycle State Machine

```mermaid
stateDiagram-v2
    [*] --> PENDING: Staff creates request

    PENDING --> ACCEPTED: Interpreter accepts
    PENDING --> CANCELLED: Staff cancels

    ACCEPTED --> COMPLETED: Interpreter completes<br/>with notes
    ACCEPTED --> CANCELLED: System cancels

    COMPLETED --> [*]
    CANCELLED --> [*]

    note right of PENDING
        interpreter_id: null
        Interpreter availability: any
    end note

    note right of ACCEPTED
        interpreter_id: set
        Interpreter availability: BUSY
    end note

    note right of COMPLETED
        encounter_notes: required
        Interpreter availability: AVAILABLE
    end note
```

---

## 7. FHIR Integration Architecture

```mermaid
graph TB
    subgraph "Application Layer"
        A[Staff Dashboard] --> B[Create Patient Modal]
        A --> C[Search FHIR Modal]
        A --> D[Patient Details Modal]
    end

    subgraph "API Layer"
        B --> E[POST /api/patients/create]
        C --> F[GET /api/fhir/patients/search]
        D --> G[GET /api/fhir/patients/:id]

        E --> H[FHIR Client]
        F --> H
        G --> H
    end

    subgraph "FHIR Operations"
        H --> I[create_patient]
        H --> J[search_patients]
        H --> K[get_patient]
        H --> L[parse_patient_resource]
    end

    subgraph "External FHIR Server"
        I -->|POST /Patient| M[HAPI FHIR R4]
        J -->|GET /Patient?params| M
        K -->|GET /Patient/:id| M
        M --> N[Patient Resources]
    end

    subgraph "Local Database"
        L --> O[(patient_data table)]
    end

    M -.->|FHIR Patient JSON| L

    style A fill:#e3f2fd
    style H fill:#fff3e0
    style M fill:#f3e5f5
    style O fill:#e8f5e9
```

---

## 8. Backend API Architecture

```mermaid
graph LR
    subgraph "API Endpoints"
        A[/api/auth/*]
        B[/api/fhir/patients/*]
        C[/api/patients/*]
        D[/api/interpreters/*]
        E[/api/requests/*]
        F[/api/interpreter/requests/*]
        G[/api/dashboard/*]
    end

    subgraph "Middleware Layer"
        H[CORS Middleware]
        I[Authentication<br/>HTTPBearer]
    end

    subgraph "Authorization Layer"
        J[get_current_user]
        K[require_staff]
        L[require_interpreter]
        M[require_admin]
    end

    subgraph "Business Logic"
        N[Request Management]
        O[Interpreter Matching]
        P[Availability Tracking]
        Q[FHIR Sync Logic]
    end

    subgraph "Data Access"
        R[SQLAlchemy ORM]
        S[FHIR Client]
    end

    A --> H
    B --> H
    C --> H
    H --> I
    I --> J
    J --> K
    J --> L
    J --> M
    K --> N
    L --> O
    N --> R
    O --> R
    Q --> S

    style A fill:#ffebee
    style H fill:#e8f5e9
    style N fill:#e3f2fd
    style R fill:#fff9c4
```

---

## 9. Frontend State Management Architecture

```mermaid
graph TB
    subgraph "Global State - Context API"
        A[AuthContext Provider]
        A --> B[user: LoginInformation]
        A --> C[loading: boolean]
        A --> D[login function]
        A --> E[logout function]
    end

    subgraph "Page-Level State - useState"
        F[StaffDashboard]
        F --> G[stats: DashboardStats]
        F --> H[requests: Array]
        F --> I[loading: boolean]
        F --> J[showModal: boolean]

        K[InterpreterDashboard]
        K --> L[profile: InterpreterData]
        K --> M[pendingRequests: Array]
        K --> N[myRequests: Array]
        K --> O[notes: string]
    end

    subgraph "Component State - useState"
        P[CreateRequestModal]
        P --> Q[step: 1 | 2]
        P --> R[selectedPatient: Patient]
        P --> S[formData: RequestCreate]

        T[PatientDetailsModal]
        T --> U[fhirDetails: FHIRPatient]
        T --> V[loading: boolean]
    end

    subgraph "API Communication Layer"
        W[API Client Singleton]
        W --> X[token: string]
        W --> Y[request method]
    end

    A --> F
    A --> K
    F --> P
    F --> T
    W --> A
    W --> F
    W --> K

    style A fill:#4caf50
    style F fill:#2196f3
    style P fill:#ff9800
    style W fill:#9c27b0
```

---

## 10. Deployment Architecture (Production)

```mermaid
graph TB
    subgraph "Edge Layer"
        A[Load Balancer / CDN]
        A --> B[HTTPS Termination]
        A --> C[SSL Certificate]
    end

    subgraph "Web Tier"
        B --> D[Nginx Server 1]
        B --> E[Nginx Server 2]
        D --> F[React Static Files<br/>dist/]
        E --> F
    end

    subgraph "Application Tier"
        B --> G[API Server 1<br/>Gunicorn + Uvicorn]
        B --> H[API Server 2<br/>Gunicorn + Uvicorn]
        G --> I[FastAPI App]
        H --> I
    end

    subgraph "Data Tier"
        I --> J[PostgreSQL Primary]
        J --> K[PostgreSQL Replica 1]
        J --> L[PostgreSQL Replica 2]
        I --> M[Redis Cache]
    end

    subgraph "External Services"
        I --> N[HAPI FHIR Server]
        I --> O[SMTP Server]
    end

    subgraph "Monitoring & Logging"
        P[Prometheus]
        Q[Grafana]
        R[ELK Stack]
        I --> P
        P --> Q
        I --> R
    end

    style A fill:#f44336
    style D fill:#4caf50
    style G fill:#2196f3
    style J fill:#ff9800
    style N fill:#9c27b0
```

---

## 11. Security Architecture Layers

```mermaid
graph TB
    subgraph "Layer 1: Network Security"
        A[HTTPS/TLS]
        B[CORS Policy]
        C[Rate Limiting]
    end

    subgraph "Layer 2: Authentication"
        D[JWT Tokens]
        E[BCrypt Password Hashing]
        F[Token Expiration]
    end

    subgraph "Layer 3: Authorization"
        G[Role-Based Access Control]
        H[require_staff decorator]
        I[require_interpreter decorator]
        J[require_admin decorator]
    end

    subgraph "Layer 4: Data Security"
        K[SQL Injection Prevention<br/>ORM Parameterized Queries]
        L[Input Validation<br/>Pydantic Schemas]
        M[Foreign Key Constraints]
    end

    subgraph "Layer 5: Application Security"
        N[Error Handling]
        O[Audit Logging]
        P[Session Management]
    end

    A --> D
    D --> G
    G --> K
    K --> N

    B --> E
    E --> H
    H --> L
    L --> O

    C --> F
    F --> I
    I --> M
    M --> P

    style A fill:#ffebee
    style D fill:#e8f5e9
    style G fill:#e3f2fd
    style K fill:#fff9c4
    style N fill:#f3e5f5
```

---

## 12. FHIR Patient Sync Flow

```mermaid
sequenceDiagram
    participant Staff
    participant UI as Frontend
    participant API as Backend API
    participant FHIR as FHIR Client
    participant Server as HAPI FHIR Server
    participant DB as Local Database

    Staff->>UI: Search for "Zhang"
    UI->>API: GET /api/fhir/patients/search?name=Zhang
    API->>FHIR: search_patients(name="Zhang")
    FHIR->>Server: GET /Patient?name=Zhang&_count=20
    Server-->>FHIR: Bundle with Patient entries
    FHIR-->>API: List[Patient Resources]
    API-->>UI: {count: 5, patients: [...]}
    UI->>Staff: Display search results

    Staff->>UI: Select patient ID: patient-001
    UI->>API: POST /api/patients/sync/patient-001
    API->>DB: Check if exists:<br/>SELECT * FROM patient_data<br/>WHERE fhir_id = 'patient-001'
    DB-->>API: No record found

    API->>FHIR: get_patient('patient-001')
    FHIR->>Server: GET /Patient/patient-001
    Server-->>FHIR: Patient Resource JSON

    FHIR->>FHIR: parse_patient_resource()
    Note over FHIR: Extract name, language,<br/>telecom, address, etc.

    FHIR-->>API: {fhir_id, name, language,...}

    API->>DB: INSERT INTO patient_data<br/>VALUES (...)
    DB-->>API: Patient record created

    API-->>UI: PatientResponse
    UI->>Staff: Patient synced successfully
```

---

## 13. Interpreter Request Workflow

```mermaid
sequenceDiagram
    participant Staff
    participant Interpreter
    participant System
    participant DB as Database

    rect rgb(240, 248, 255)
        Note over Staff,DB: Request Creation Phase
        Staff->>System: Create Request<br/>(patient, language, location)
        System->>DB: INSERT INTO interpreter_requests<br/>status='PENDING', interpreter_id=NULL
        DB-->>System: Request created
        System-->>Staff: Request confirmation
    end

    rect rgb(255, 248, 240)
        Note over Interpreter,DB: Request Discovery Phase
        Interpreter->>System: View pending requests
        System->>DB: SELECT * FROM interpreter_requests<br/>WHERE language = 'Mandarin'<br/>AND status = 'PENDING'
        DB-->>System: Matching requests
        System-->>Interpreter: Display pending requests
    end

    rect rgb(240, 255, 240)
        Note over Interpreter,DB: Request Acceptance Phase
        Interpreter->>System: Accept request
        System->>DB: BEGIN TRANSACTION
        System->>DB: UPDATE interpreter_requests<br/>SET status='ACCEPTED',<br/>interpreter_id='interp-123',<br/>accepted_at=NOW()
        System->>DB: UPDATE interpreter_data<br/>SET availability_status='BUSY'<br/>WHERE id='interp-123'
        System->>DB: COMMIT TRANSACTION
        DB-->>System: Updates successful
        System-->>Interpreter: Assignment confirmed
    end

    rect rgb(255, 240, 240)
        Note over Interpreter,DB: Request Completion Phase
        Interpreter->>System: Complete with notes
        System->>DB: BEGIN TRANSACTION
        System->>DB: UPDATE interpreter_requests<br/>SET status='COMPLETED',<br/>encounter_notes='...',<br/>completed_at=NOW()
        System->>DB: UPDATE interpreter_data<br/>SET availability_status='AVAILABLE'<br/>WHERE id='interp-123'
        System->>DB: COMMIT TRANSACTION
        DB-->>System: Updates successful
        System-->>Interpreter: Completion confirmed
    end
```

---

## 14. Technology Stack Layers

```mermaid
graph TB
    subgraph "Presentation Layer"
        A[React 18.2.0]
        B[TailwindCSS 3.3.6]
        C[Lucide Icons 0.263.1]
        D[React Router 6.20.0]
    end

    subgraph "Build & Dev Tools"
        E[Vite 5.0.8]
        F[PostCSS 8.4.32]
        G[Autoprefixer 10.4.16]
    end

    subgraph "Application Layer"
        H[FastAPI 0.104.1]
        I[Uvicorn 0.24.0]
        J[Python 3.11+]
    end

    subgraph "Data Access Layer"
        K[SQLAlchemy 2.0.23]
        L[Pydantic 2.5.0]
    end

    subgraph "Integration Layer"
        M[httpx 0.25.1]
        N[FHIR R4 Client]
    end

    subgraph "Security Layer"
        O[python-jose 3.3.0]
        P[passlib 1.7.4]
    end

    subgraph "Data Storage"
        Q[SQLite 3.x]
        R[PostgreSQL 12+<br/>Production]
        S[HAPI FHIR Server]
    end

    A --> E
    E --> H
    H --> K
    H --> M
    H --> O
    K --> Q
    K --> R
    M --> S

    style A fill:#61dafb
    style H fill:#009688
    style K fill:#ff6f00
    style Q fill:#4caf50
    style S fill:#9c27b0
```

---

## ASCII Diagrams for Documentation

### System Overview (ASCII)

```
┌─────────────────────────────────────────────────────────────────┐
│                    HEALTHCARE INTERPRETER SYSTEM                 │
└─────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                              │
│  ┌──────────────────────────────────────────────────────────┐     │
│  │  React SPA (Vite Dev Server - Port 3000)                 │     │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │     │
│  │  │    Staff     │  │ Interpreter  │  │   Patient    │   │     │
│  │  │  Dashboard   │  │  Dashboard   │  │ Management   │   │     │
│  │  └──────────────┘  └──────────────┘  └──────────────┘   │     │
│  └──────────────────────────────────────────────────────────┘     │
└───────────────────────────┬───────────────────────────────────────┘
                            │ HTTP REST API (JSON)
                            │ Authorization: Bearer JWT
                            ↓
┌───────────────────────────────────────────────────────────────────┐
│                      APPLICATION LAYER                            │
│  ┌──────────────────────────────────────────────────────────┐     │
│  │  FastAPI Backend (Uvicorn - Port 8000)                   │     │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐  │     │
│  │  │   Auth   │  │ Business │  │   FHIR   │  │  CORS   │  │     │
│  │  │  Service │  │  Logic   │  │  Client  │  │Middleware│ │     │
│  │  └──────────┘  └──────────┘  └──────────┘  └─────────┘  │     │
│  └──────────────────────────────────────────────────────────┘     │
└──────────────────┬──────────────────────────────┬─────────────────┘
                   │                              │
                   ↓                              ↓
┌────────────────────────────────┐   ┌───────────────────────────┐
│       DATA LAYER               │   │   EXTERNAL FHIR LAYER     │
│  ┌──────────────────────────┐  │   │  ┌────────────────────┐   │
│  │   SQLite Database        │  │   │  │  HAPI FHIR Server  │   │
│  │                          │  │   │  │  (R4 Specification)│   │
│  │  • login_information     │  │   │  │                    │   │
│  │  • patient_data          │  │   │  │  • Patient         │   │
│  │  • interpreter_data      │  │   │  │  • Appointment     │   │
│  │  • interpreter_requests  │  │   │  │  • Encounter       │   │
│  └──────────────────────────┘  │   │  └────────────────────┘   │
└────────────────────────────────┘   └───────────────────────────┘
```

### Database Schema (ASCII ERD)

```
┌─────────────────────────┐
│  LOGIN_INFORMATION      │
├─────────────────────────┤
│ PK id: VARCHAR          │
│ UK username: VARCHAR    │
│    password: VARCHAR    │◄─────┐
│    user_type: ENUM      │      │
│    created_at: DATETIME │      │ 1:1
│    updated_at: DATETIME │      │
└─────────────────────────┘      │
         │                       │
         │ 1:N                   │
         │                       │
         ↓                       │
┌─────────────────────────┐      │
│ INTERPRETER_REQUEST     │      │
├─────────────────────────┤      │
│ PK id: VARCHAR          │      │
│ FK requested_by: VARCHAR│      │
│ FK patient_id: VARCHAR  ├──┐   │
│ FK interpreter_id: VAR* │  │   │
│    location_method: VAR │  │   │
│    delivery_method: ENUM│  │   │
│    language: VARCHAR    │  │   │
│    status: ENUM         │  │   │
│    is_stat: BOOLEAN     │  │   │
│    requested_at: DTTIME │  │   │
│    accepted_at: DTTIME  │  │   │
│    completed_at: DTTIME │  │   │
└─────────────────────────┘  │   │
         ↑                   │   │
         │ N:1               │   │
         │                   │   │
┌─────────────────────────┐  │   │
│  INTERPRETER_DATA       │  │   │
├─────────────────────────┤  │   │
│ PK id: VARCHAR          │  │   │
│ FK login_id: VARCHAR    ├──┘   │
│    name: VARCHAR        │      │
│    language: VARCHAR    │      │
│    availability: ENUM   │      │
│    phone_number: VARCHAR│      │
│    email: VARCHAR       │      │
│    gender: VARCHAR      │      │
└─────────────────────────┘      │
                                 │
         ┌───────────────────────┘
         │ N:1
         ↓
┌─────────────────────────┐
│     PATIENT_DATA        │
├─────────────────────────┤
│ PK id: VARCHAR          │
│ UK fhir_id: VARCHAR     │
│    name: VARCHAR        │
│    language: VARCHAR    │
│    location: VARCHAR    │
│    birthdate: VARCHAR   │
│    gender: VARCHAR      │
│    address: VARCHAR     │
│    phone_number: VARCHAR│
│    email: VARCHAR       │
│    created_at: DATETIME │
└─────────────────────────┘
```

---

## How to Use These Diagrams

1. **Mermaid Diagrams**: Can be rendered in:
   - GitHub markdown files
   - GitLab
   - VS Code with Mermaid extension
   - Online viewers: https://mermaid.live/

2. **ASCII Diagrams**: Display correctly in:
   - Plain text files
   - Code editors
   - Terminal/console
   - Documentation wikis

3. **Export Options**:
   - Mermaid diagrams can be exported to PNG/SVG
   - Use mermaid-cli: `mmdc -i diagram.mmd -o diagram.png`

---

**Generated:** 2025-11-09
**Version:** 1.0
