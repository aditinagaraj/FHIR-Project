from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from database import get_db, init_db
from models import (
    LoginInformation, PatientData, InterpreterData, InterpreterRequest,
    UserType, RequestStatus, InterpreterAvailability
)
from schemas import (
    LoginRequest, UserCreate, UserResponse,
    PatientCreate, PatientResponse,
    InterpreterCreate, InterpreterUpdate, InterpreterResponse, InterpreterWithLogin,
    RequestCreate, RequestUpdate, RequestResponse, RequestWithDetails,
    DashboardStats, AvailabilityStats, RequestAccept
)
from auth import (
    get_password_hash, verify_password, create_access_token,
    get_current_user, require_staff, require_interpreter
)
from fhir_client import FHIRClient

app = FastAPI(title="Interpreter Booking System API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

fhir_client = FHIRClient()

@app.on_event("startup")
async def startup_event():
    init_db()

@app.post("/api/auth/register", response_model=UserResponse)
def register(user: UserCreate, db: Session = Depends(get_db)):
    existing_user = db.query(LoginInformation).filter(
        LoginInformation.username == user.username
    ).first()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already exists"
        )
    
    hashed_password = get_password_hash(user.password)
    new_user = LoginInformation(
        username=user.username,
        password=hashed_password,
        user_type=user.user_type
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return new_user

@app.post("/api/auth/login")
def login(credentials: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(LoginInformation).filter(
        LoginInformation.username == credentials.username
    ).first()
    
    if not user or not verify_password(credentials.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )
    
    access_token = create_access_token(data={"sub": user.id})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_type": user.user_type,
        "user_id": user.id
    }

@app.get("/api/auth/me", response_model=UserResponse)
async def get_me(current_user: LoginInformation = Depends(get_current_user)):
    return current_user

@app.get("/api/fhir/patients/search")
async def search_fhir_patients(
    name: str = None,
    language: str = None,
    current_user: LoginInformation = Depends(require_staff)
):
    patients = await fhir_client.search_patients(name=name, language=language)
    return {"count": len(patients), "patients": patients}

@app.get("/api/fhir/patients/{fhir_id}")
async def get_fhir_patient_details(
    fhir_id: str,
    current_user: LoginInformation = Depends(get_current_user)
):
    """
    Fetch complete FHIR Patient resource from HAPI FHIR server

    Args:
        fhir_id: FHIR Patient ID

    Returns:
        Complete FHIR Patient resource as JSON

    Raises:
        404: Patient not found in FHIR server
        500: Error communicating with FHIR server
    """
    try:
        fhir_patient = await fhir_client.get_patient(fhir_id)

        if not fhir_patient:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Patient with FHIR ID '{fhir_id}' not found in FHIR server"
            )

        return fhir_patient

    except HTTPException:
        # Re-raise HTTP exceptions (like 404)
        raise
    except Exception as e:
        # Handle any other errors
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching patient from FHIR server: {str(e)}"
        )

@app.post("/api/patients/sync/{fhir_id}", response_model=PatientResponse)
async def sync_patient_from_fhir(
    fhir_id: str,
    db: Session = Depends(get_db),
    current_user: LoginInformation = Depends(require_staff)
):
    existing = db.query(PatientData).filter(PatientData.fhir_id == fhir_id).first()
    if existing:
        return existing
    
    fhir_patient = await fhir_client.get_patient(fhir_id)
    if not fhir_patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found in FHIR server"
        )
    
    patient_data = fhir_client.parse_patient_resource(fhir_patient)
    new_patient = PatientData(**patient_data)
    
    db.add(new_patient)
    db.commit()
    db.refresh(new_patient)
    
    return new_patient

@app.get("/api/patients", response_model=List[PatientResponse])
def get_patients(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: LoginInformation = Depends(require_staff)
):
    patients = db.query(PatientData).offset(skip).limit(limit).all()
    return patients

@app.get("/api/patients/{patient_id}", response_model=PatientResponse)
def get_patient(
    patient_id: str,
    db: Session = Depends(get_db),
    current_user: LoginInformation = Depends(get_current_user)
):
    patient = db.query(PatientData).filter(PatientData.id == patient_id).first()
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found"
        )
    return patient

@app.post("/api/patients/create", response_model=PatientResponse)
async def create_patient(
    patient_data: PatientCreate,
    db: Session = Depends(get_db),
    current_user: LoginInformation = Depends(require_staff)
):
    """
    Create a new patient in FHIR server and sync to local database
    """
    try:
        # Create patient in FHIR server
        fhir_patient_data = {
            "name": patient_data.name,
            "birthdate": patient_data.birthdate,
            "gender": patient_data.gender,
            "language": patient_data.language,
            "phone_number": patient_data.phone_number,
            "email": patient_data.email,
            "address": patient_data.address,
        }

        fhir_patient = await fhir_client.create_patient(fhir_patient_data)

        if not fhir_patient:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create patient in FHIR server"
            )

        # Parse FHIR patient and add to local database
        parsed_data = fhir_client.parse_patient_resource(fhir_patient)

        # Add location if provided
        if patient_data.location:
            parsed_data['location'] = patient_data.location

        new_patient = PatientData(**parsed_data)
        db.add(new_patient)
        db.commit()
        db.refresh(new_patient)

        return new_patient

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create patient: {str(e)}"
        )

@app.post("/api/interpreters", response_model=InterpreterWithLogin)
def create_interpreter(
    interpreter: InterpreterCreate,
    db: Session = Depends(get_db),
    current_user: LoginInformation = Depends(require_staff)
):
    existing_user = db.query(LoginInformation).filter(
        LoginInformation.username == interpreter.username
    ).first()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already exists"
        )
    
    hashed_password = get_password_hash(interpreter.password)
    new_login = LoginInformation(
        username=interpreter.username,
        password=hashed_password,
        user_type=UserType.INTERPRETER
    )
    db.add(new_login)
    db.flush()
    
    new_interpreter = InterpreterData(
        login_id=new_login.id,
        name=interpreter.name,
        language=interpreter.language,
        phone_number=interpreter.phone_number,
        email=interpreter.email,
        gender=interpreter.gender,
        gender_preference=interpreter.gender_preference
    )
    
    db.add(new_interpreter)
    db.commit()
    db.refresh(new_interpreter)
    db.refresh(new_login)
    
    response_data = InterpreterWithLogin(
        **{**interpreter.dict(exclude={'username', 'password'}), 
           'id': new_interpreter.id,
           'availability_status': new_interpreter.availability_status,
           'created_at': new_interpreter.created_at,
           'login_id': new_login.id,
           'username': new_login.username}
    )
    
    return response_data

@app.get("/api/interpreters", response_model=List[InterpreterResponse])
def get_interpreters(
    language: str = None,
    available_only: bool = False,
    db: Session = Depends(get_db),
    current_user: LoginInformation = Depends(get_current_user)
):
    query = db.query(InterpreterData)
    
    if language:
        query = query.filter(InterpreterData.language == language)
    
    if available_only:
        query = query.filter(
            InterpreterData.availability_status == InterpreterAvailability.AVAILABLE
        )
    
    interpreters = query.all()
    return interpreters

@app.get("/api/interpreters/me", response_model=InterpreterResponse)
def get_my_interpreter_profile(
    db: Session = Depends(get_db),
    current_user: LoginInformation = Depends(require_interpreter)
):
    """Get current interpreter's profile"""
    interpreter = db.query(InterpreterData).filter(
        InterpreterData.login_id == current_user.id
    ).first()

    if not interpreter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interpreter profile not found"
        )

    return interpreter

@app.patch("/api/interpreters/me", response_model=InterpreterResponse)
def update_my_interpreter_profile(
    updates: InterpreterUpdate,
    db: Session = Depends(get_db),
    current_user: LoginInformation = Depends(require_interpreter)
):
    """Update current interpreter's availability status"""
    interpreter = db.query(InterpreterData).filter(
        InterpreterData.login_id == current_user.id
    ).first()

    if not interpreter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interpreter profile not found"
        )

    # Update availability status
    if updates.availability_status:
        interpreter.availability_status = updates.availability_status

    # Update other fields if provided
    if updates.phone_number is not None:
        interpreter.phone_number = updates.phone_number
    if updates.email is not None:
        interpreter.email = updates.email

    db.commit()
    db.refresh(interpreter)
    return interpreter

# CONTINUE FROM PART 2 - Add these functions to main.py

@app.get("/api/requests", response_model=List[RequestWithDetails])
def get_all_requests(
    skip: int = 0,
    limit: int = 100,
    status_filter: Optional[RequestStatus] = None,
    db: Session = Depends(get_db),
    current_user: LoginInformation = Depends(require_staff)
):
    """Get all interpreter requests with optional status filter"""
    query = db.query(InterpreterRequest)

    if status_filter:
        query = query.filter(InterpreterRequest.status == status_filter)

    requests = query.order_by(
        InterpreterRequest.is_stat.desc(),
        InterpreterRequest.requested_at.desc()
    ).offset(skip).limit(limit).all()

    result = []
    for req in requests:
        patient = db.query(PatientData).filter(PatientData.id == req.patient_id).first()
        interpreter = None
        if req.interpreter_id:
            interpreter = db.query(InterpreterData).filter(
                InterpreterData.id == req.interpreter_id
            ).first()

        result.append(RequestWithDetails(
            **req.__dict__,
            patient=patient,
            interpreter=interpreter
        ))

    return result

@app.post("/api/requests", response_model=RequestResponse)
def create_request(
    request: RequestCreate,
    db: Session = Depends(get_db),
    current_user: LoginInformation = Depends(require_staff)
):
    """Create new interpreter request"""
    # Verify patient exists
    patient = db.query(PatientData).filter(
        PatientData.id == request.patient_id
    ).first()

    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found"
        )

    # Create new request
    new_request = InterpreterRequest(
        requested_by=current_user.id,
        **request.dict()
    )

    db.add(new_request)
    db.commit()
    db.refresh(new_request)

    return new_request

@app.get("/api/requests/{request_id}", response_model=RequestWithDetails)
def get_request(
    request_id: str,
    db: Session = Depends(get_db),
    current_user: LoginInformation = Depends(get_current_user)
):
    request = db.query(InterpreterRequest).filter(
        InterpreterRequest.id == request_id
    ).first()
    
    if not request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Request not found"
        )
    
    patient = db.query(PatientData).filter(PatientData.id == request.patient_id).first()
    interpreter = None
    if request.interpreter_id:
        interpreter = db.query(InterpreterData).filter(
            InterpreterData.id == request.interpreter_id
        ).first()
    
    return RequestWithDetails(
        **request.__dict__,
        patient=patient,
        interpreter=interpreter
    )

@app.get("/api/interpreter/requests/pending", response_model=List[RequestWithDetails])
def get_pending_requests_for_interpreter(
    db: Session = Depends(get_db),
    current_user: LoginInformation = Depends(require_interpreter)
):
    interpreter = db.query(InterpreterData).filter(
        InterpreterData.login_id == current_user.id
    ).first()
    
    if not interpreter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interpreter profile not found"
        )
    
    requests = db.query(InterpreterRequest).filter(
        InterpreterRequest.language == interpreter.language,
        InterpreterRequest.status == RequestStatus.PENDING
    ).order_by(InterpreterRequest.is_stat.desc(), InterpreterRequest.requested_at).all()
    
    result = []
    for req in requests:
        patient = db.query(PatientData).filter(PatientData.id == req.patient_id).first()
        result.append(RequestWithDetails(
            **req.__dict__,
            patient=patient,
            interpreter=None
        ))
    
    return result

@app.get("/api/interpreter/requests/my", response_model=List[RequestWithDetails])
def get_my_requests(
    db: Session = Depends(get_db),
    current_user: LoginInformation = Depends(require_interpreter)
):
    interpreter = db.query(InterpreterData).filter(
        InterpreterData.login_id == current_user.id
    ).first()
    
    if not interpreter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interpreter profile not found"
        )
    
    requests = db.query(InterpreterRequest).filter(
        InterpreterRequest.interpreter_id == interpreter.id,
        InterpreterRequest.status.in_([RequestStatus.ACCEPTED])
    ).order_by(InterpreterRequest.accepted_at.desc()).all()
    
    result = []
    for req in requests:
        patient = db.query(PatientData).filter(PatientData.id == req.patient_id).first()
        result.append(RequestWithDetails(
            **req.__dict__,
            patient=patient,
            interpreter=interpreter
        ))
    
    return result

@app.post("/api/interpreter/requests/{request_id}/accept", response_model=RequestResponse)
def accept_request(
    request_id: str,
    db: Session = Depends(get_db),
    current_user: LoginInformation = Depends(require_interpreter)
):
    interpreter = db.query(InterpreterData).filter(
        InterpreterData.login_id == current_user.id
    ).first()
    
    if not interpreter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interpreter profile not found"
        )
    
    if interpreter.availability_status != InterpreterAvailability.AVAILABLE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You must be available to accept requests"
        )
    
    request = db.query(InterpreterRequest).filter(
        InterpreterRequest.id == request_id
    ).first()
    
    if not request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Request not found"
        )
    
    if request.status != RequestStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Request is not pending"
        )
    
    if request.language != interpreter.language:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Request language does not match your language"
        )
    
    request.interpreter_id = interpreter.id
    request.status = RequestStatus.ACCEPTED
    request.accepted_at = datetime.utcnow()
    
    interpreter.availability_status = InterpreterAvailability.BUSY
    
    db.commit()
    db.refresh(request)
    
    return request

@app.post("/api/interpreter/requests/{request_id}/complete", response_model=RequestResponse)
def complete_request(
    request_id: str,
    updates: RequestUpdate,
    db: Session = Depends(get_db),
    current_user: LoginInformation = Depends(require_interpreter)
):
    interpreter = db.query(InterpreterData).filter(
        InterpreterData.login_id == current_user.id
    ).first()
    
    if not interpreter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interpreter profile not found"
        )
    
    request = db.query(InterpreterRequest).filter(
        InterpreterRequest.id == request_id,
        InterpreterRequest.interpreter_id == interpreter.id
    ).first()
    
    if not request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Request not found or not assigned to you"
        )
    
    if request.status != RequestStatus.ACCEPTED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Request is not in accepted status"
        )
    
    request.status = RequestStatus.COMPLETED
    request.completed_at = datetime.utcnow()
    if updates.encounter_notes:
        request.encounter_notes = updates.encounter_notes
    
    interpreter.availability_status = InterpreterAvailability.AVAILABLE
    
    db.commit()
    db.refresh(request)
    
    return request

@app.get("/api/dashboard/stats", response_model=DashboardStats)
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: LoginInformation = Depends(require_staff)
):
    available_count = db.query(InterpreterData).filter(
        InterpreterData.availability_status == InterpreterAvailability.AVAILABLE
    ).count()
    
    pending_count = db.query(InterpreterRequest).filter(
        InterpreterRequest.status == RequestStatus.PENDING
    ).count()
    
    languages = db.query(InterpreterData.language).distinct().all()
    total_languages = len(languages)
    
    availability_by_language = []
    for (lang,) in languages:
        count = db.query(InterpreterData).filter(
            InterpreterData.language == lang,
            InterpreterData.availability_status == InterpreterAvailability.AVAILABLE
        ).count()
        
        availability_by_language.append(
            AvailabilityStats(language=lang, available_count=count)
        )
    
    return DashboardStats(
        available_interpreters=available_count,
        pending_requests=pending_count,
        total_languages=total_languages,
        availability_by_language=availability_by_language
    )

@app.get("/api/health")
def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow()}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)