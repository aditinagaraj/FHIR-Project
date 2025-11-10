# Healthcare Interpreter Booking System

A full-stack web application that streamlines medical interpreter services in healthcare facilities by connecting staff members with qualified interpreters in real-time, while integrating seamlessly with FHIR-compliant electronic health record systems.

## Overview

This system addresses the critical need for language interpretation services in healthcare settings where patients have limited English proficiency. By bridging communication gaps between healthcare providers and patients, the application ensures accurate medical information exchange, informed consent processes, and quality patient care across language barriers.

## What It Does

The Healthcare Interpreter Booking System serves as a centralized platform that:

**For Healthcare Staff:**
- Search and manage patient records from FHIR-compliant electronic health record systems
- Create interpreter service requests specifying language, location, and delivery method (onsite, telephone, or telehealth)
- View real-time interpreter availability across multiple languages
- Track request status from creation through completion
- Flag urgent requests as STAT for immediate attention
- Monitor service usage and export data for compliance reporting

**For Medical Interpreters:**
- Manage availability status to control when requests are visible
- View pending requests filtered by language proficiency
- Accept assignments that match their skills and availability
- Join active interpretation sessions (onsite, phone, or video)
- Document encounter details and submit completion notes
- Track assignment history and workload

**For Healthcare Organizations:**
- Ensure compliance with language access requirements
- Reduce communication errors in patient care
- Optimize interpreter resource allocation
- Maintain integration with existing FHIR-based EHR systems
- Track service metrics across languages and departments

## Key Features

### FHIR Integration
The system connects to HL7 FHIR R4 servers (such as HAPI FHIR) to synchronize patient demographic data, including preferred languages, without duplicating sensitive medical records. This ensures that interpreter services are requested for the correct patients with up-to-date information while maintaining compliance with healthcare interoperability standards.

### Real-Time Availability Tracking
Staff can instantly see which interpreters are available for each language, enabling faster response times for patient needs. The system automatically manages interpreter availability, marking them as busy when actively interpreting and available when ready for new assignments.

### Multi-Modal Service Delivery
Supports three delivery methods to match different clinical scenarios:
- **Onsite:** Face-to-face interpretation for complex procedures and sensitive discussions
- **Telephone:** Quick access for time-sensitive situations
- **Telehealth:** Video interpretation for remote consultations

### Priority Request Management
STAT flagging ensures urgent interpretation needs (emergency departments, critical procedures) receive immediate visibility and faster response times from available interpreters.

### Complete Request Lifecycle
Tracks each request from creation through acceptance, active interpretation, and completion with documentation, providing full visibility into service delivery and enabling quality assurance.

## How It Works

1. **Patient Registration:** Healthcare staff search for existing patients in the FHIR system or create new patient records with language preferences
2. **Request Creation:** Staff create interpreter requests specifying patient, language, location, delivery method, and urgency level
3. **Interpreter Matching:** Qualified interpreters with matching language proficiency see pending requests and can accept assignments
4. **Service Delivery:** Interpreters join the session (in-person, by phone, or video) and provide interpretation services
5. **Documentation:** Upon completion, interpreters submit encounter notes documenting session details and any relevant observations
6. **Status Updates:** The system automatically updates interpreter availability and request status throughout the workflow

## Technology Stack

### Frontend
- **React 18** - Modern component-based user interface
- **Vite** - Fast development server and optimized production builds
- **TailwindCSS** - Responsive, accessible design system
- **React Router** - Client-side routing with protected routes

### Backend
- **FastAPI** - High-performance Python API framework with automatic documentation
- **SQLAlchemy** - Database ORM for data persistence
- **JWT Authentication** - Secure, stateless user authentication
- **httpx** - Async HTTP client for FHIR server communication

### Integration
- **FHIR R4** - HL7 Fast Healthcare Interoperability Resources standard
- **HAPI FHIR** - Open-source FHIR server implementation

### Database
- **SQLite** (Development) - Lightweight embedded database
- **PostgreSQL** (Production) - Scalable relational database

## Quick Start

### Prerequisites
- Python 3.11 or higher
- Node.js 18 or higher
- npm or yarn package manager

### Backend Setup

```bash
# Navigate to backend directory
cd FHIR-Project-Backend-main

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# (Optional) Seed database with test data
python seed_data.py

# Start the API server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`
API documentation: `http://localhost:8000/docs`

### Frontend Setup

```bash
# Navigate to frontend directory
cd FHIR-Project-Frontend-main

# Install dependencies
npm install

# Start development server
npm run dev
```

The application will be available at `http://localhost:3000`

### Test Credentials

After running the seed script, you can log in with:

**Staff Account:**
- Username: `staff1`
- Password: `password123`

**Interpreter Account:**
- Username: `interpreter_mandarin1`
- Password: `password123`

## Project Structure

```
FHIR-Project/
├── FHIR-Project-Backend-main/       # Backend API
│   ├── main.py                      # FastAPI application
│   ├── models.py                    # Database models
│   ├── schemas.py                   # Request/response schemas
│   ├── auth.py                      # Authentication logic
│   ├── fhir_client.py               # FHIR integration
│   ├── database.py                  # Database configuration
│   └── requirements.txt             # Python dependencies
│
└── FHIR-Project-Frontend-main/      # Frontend application
    ├── src/
    │   ├── pages/                   # Page components
    │   ├── components/              # Reusable UI components
    │   ├── context/                 # React Context (auth)
    │   └── services/                # API client
    ├── package.json                 # Node dependencies
    └── vite.config.js              # Build configuration
```

## Use Cases

### Emergency Department Scenario
A patient arrives with chest pain but speaks only Mandarin. The ED nurse creates a STAT interpreter request for Mandarin. An available interpreter immediately sees the urgent request, accepts it, and joins via phone within minutes, enabling critical medical history collection and treatment consent.

### Surgical Consent
A surgeon needs to obtain informed consent for a complex procedure from a Spanish-speaking patient. Staff schedule an onsite interpreter request with 60-minute duration. The interpreter arrives, facilitates detailed discussion of risks and benefits, and documents the encounter upon completion.

### Telehealth Appointment
A patient has a scheduled video visit with their primary care physician but speaks Arabic. The clinic pre-books a telehealth interpreter who joins the video call at the appointment time, providing seamless three-way communication.

## Benefits

- **Improved Patient Safety:** Reduces medical errors from miscommunication
- **Regulatory Compliance:** Helps meet Title VI and ACA Section 1557 language access requirements
- **Efficient Resource Use:** Optimizes interpreter scheduling and availability
- **Quality Documentation:** Maintains complete records of interpretation services
- **Interoperability:** Integrates with existing FHIR-based EHR systems
- **User-Friendly:** Intuitive interfaces for both staff and interpreters
- **Flexible Deployment:** Supports onsite, remote, and hybrid interpretation models

## Future Enhancements

- Real-time notifications via WebSockets for instant request alerts
- Video interpretation integration with telehealth platforms
- Automated interpreter scheduling based on appointment calendars
- Mobile applications for iOS and Android
- Advanced analytics and reporting dashboards
- Multi-language user interface support
- Integration with hospital paging systems

## Documentation

- [System Architecture](SYSTEM_ARCHITECTURE.md) - Detailed technical architecture
- [Architecture Diagrams](ARCHITECTURE_DIAGRAMS.md) - Visual system diagrams
- API Documentation - Available at `/docs` endpoint when running backend

## License

This project is for educational and demonstration purposes.

## Support

For questions or issues, please refer to the documentation or open an issue in the repository.

---

**Built with modern web technologies to improve healthcare communication and patient outcomes.**
