from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from models import UserType, RequestStatus, InterpreterAvailability, DeliveryMethod

# Auth Schemas
class LoginRequest(BaseModel):
    username: str
    password: str

class UserCreate(BaseModel):
    username: str
    password: str
    user_type: UserType

class UserResponse(BaseModel):
    id: str
    username: str
    user_type: UserType
    
    class Config:
        from_attributes = True

# Patient Schemas
class PatientBase(BaseModel):
    name: str
    language: str
    location: Optional[str] = None
    birthdate: Optional[str] = None
    gender: Optional[str] = None
    address: Optional[str] = None
    phone_number: Optional[str] = None
    email: Optional[str] = None

class PatientCreate(BaseModel):
    """Schema for creating a new patient (FHIR ID will be generated)"""
    name: str
    language: str
    birthdate: str
    gender: str
    location: Optional[str] = None
    address: Optional[str] = None
    phone_number: Optional[str] = None
    email: Optional[str] = None

class PatientResponse(PatientBase):
    id: str
    fhir_id: str
    created_at: datetime
    
    class Config:
        from_attributes = True

# Interpreter Schemas
class InterpreterBase(BaseModel):
    name: str
    language: str
    phone_number: Optional[str] = None
    email: Optional[str] = None
    gender: Optional[str] = None
    gender_preference: Optional[str] = None

class InterpreterCreate(InterpreterBase):
    username: str
    password: str

class InterpreterUpdate(BaseModel):
    availability_status: Optional[InterpreterAvailability] = None
    phone_number: Optional[str] = None
    email: Optional[str] = None

class InterpreterResponse(InterpreterBase):
    id: str
    availability_status: InterpreterAvailability
    created_at: datetime
    
    class Config:
        from_attributes = True

class InterpreterWithLogin(InterpreterResponse):
    login_id: str
    username: str

# Interpreter Request Schemas
class RequestCreate(BaseModel):
    patient_id: str
    location_method: str
    delivery_method: DeliveryMethod
    language: str
    patient_type: Optional[str] = None
    is_stat: bool = False
    duration_minutes: Optional[str] = None
    request_notes: Optional[str] = None

class RequestUpdate(BaseModel):
    status: Optional[RequestStatus] = None
    encounter_notes: Optional[str] = None

class RequestAccept(BaseModel):
    pass

class RequestResponse(BaseModel):
    id: str
    patient_id: str
    interpreter_id: Optional[str] = None
    location_method: str
    delivery_method: DeliveryMethod
    language: str
    status: RequestStatus
    patient_type: Optional[str] = None
    is_stat: bool
    duration_minutes: Optional[str] = None
    request_notes: Optional[str] = None
    encounter_notes: Optional[str] = None
    requested_at: datetime
    accepted_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class RequestWithDetails(RequestResponse):
    patient: PatientResponse
    interpreter: Optional[InterpreterResponse] = None

# Dashboard Statistics
class AvailabilityStats(BaseModel):
    language: str
    available_count: int

class DashboardStats(BaseModel):
    available_interpreters: int
    pending_requests: int
    total_languages: int
    availability_by_language: list[AvailabilityStats]