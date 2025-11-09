from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey, Text, Enum
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
import enum

Base = declarative_base()

def generate_uuid():
    return str(uuid.uuid4())

class UserType(str, enum.Enum):
    STAFF = "staff"
    INTERPRETER = "interpreter"
    ADMIN = "admin"

class RequestStatus(str, enum.Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class InterpreterAvailability(str, enum.Enum):
    AVAILABLE = "available"
    UNAVAILABLE = "unavailable"
    BUSY = "busy"

class DeliveryMethod(str, enum.Enum):
    ONSITE = "onsite"
    TELEPHONE = "telephone"
    TELEHEALTH = "telehealth"

class LoginInformation(Base):
    __tablename__ = "login_information"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    username = Column(String, unique=True, nullable=False, index=True)
    password = Column(String, nullable=False)
    user_type = Column(Enum(UserType), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    interpreter_profile = relationship("InterpreterData", back_populates="login", uselist=False)

class PatientData(Base):
    __tablename__ = "patient_data"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    fhir_id = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=False)
    location = Column(String)
    birthdate = Column(String)
    gender = Column(String)
    address = Column(String)
    phone_number = Column(String)
    email = Column(String)
    language = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    interpreter_requests = relationship("InterpreterRequest", back_populates="patient")

class InterpreterData(Base):
    __tablename__ = "interpreter_data"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    login_id = Column(String, ForeignKey("login_information.id"), unique=True, nullable=False)
    name = Column(String, nullable=False)
    phone_number = Column(String)
    email = Column(String)
    language = Column(String, nullable=False, index=True)
    gender = Column(String)
    gender_preference = Column(String)
    availability_status = Column(Enum(InterpreterAvailability), default=InterpreterAvailability.AVAILABLE)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    login = relationship("LoginInformation", back_populates="interpreter_profile")
    interpreter_requests = relationship("InterpreterRequest", back_populates="interpreter")

class InterpreterRequest(Base):
    __tablename__ = "interpreter_requests"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    requested_by = Column(String, ForeignKey("login_information.id"), nullable=False)
    patient_id = Column(String, ForeignKey("patient_data.id"), nullable=False)
    interpreter_id = Column(String, ForeignKey("interpreter_data.id"), nullable=True)
    
    location_method = Column(String, nullable=False)
    delivery_method = Column(Enum(DeliveryMethod), nullable=False)
    language = Column(String, nullable=False, index=True)
    status = Column(Enum(RequestStatus), default=RequestStatus.PENDING, index=True)
    patient_type = Column(String)
    is_stat = Column(Boolean, default=False)
    duration_minutes = Column(String)
    
    request_notes = Column(Text)
    encounter_notes = Column(Text)
    
    requested_at = Column(DateTime, default=datetime.utcnow, index=True)
    accepted_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    patient = relationship("PatientData", back_populates="interpreter_requests")
    interpreter = relationship("InterpreterData", back_populates="interpreter_requests")
    requester = relationship("LoginInformation")