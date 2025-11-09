from sqlalchemy.orm import Session
from database import SessionLocal, init_db
from models import LoginInformation, InterpreterData, PatientData, InterpreterRequest
from models import UserType, RequestStatus, InterpreterAvailability, DeliveryMethod
from auth import get_password_hash
from datetime import datetime, timedelta

def seed_database():
    init_db()
    db = SessionLocal()
    
    try:
        if db.query(LoginInformation).count() > 0:
            print("Database already contains data. Skipping seed.")
            return
        
        print("Seeding database...")
        
        staff1 = LoginInformation(
            username="staff1",
            password=get_password_hash("password123"),
            user_type=UserType.STAFF
        )
        
        staff2 = LoginInformation(
            username="admin1",
            password=get_password_hash("password123"),
            user_type=UserType.ADMIN
        )
        
        db.add_all([staff1, staff2])
        db.flush()
        
        interpreter_logins = []
        interpreter_data = [
            {"username": "interpreter_mandarin1", "name": "Li Wei", "language": "Mandarin"},
            {"username": "interpreter_mandarin2", "name": "Chen Ming", "language": "Mandarin"},
            {"username": "interpreter_mandarin3", "name": "Wang Fang", "language": "Mandarin"},
            {"username": "interpreter_arabic1", "name": "Ahmed Hassan", "language": "Arabic"},
            {"username": "interpreter_arabic2", "name": "Fatima Al-Sayed", "language": "Arabic"},
            {"username": "interpreter_vietnamese1", "name": "Nguyen Van", "language": "Vietnamese"},
            {"username": "interpreter_tagalog1", "name": "Maria Santos", "language": "Tagalog"},
            {"username": "interpreter_spanish1", "name": "Carlos Rodriguez", "language": "Spanish"},
        ]
        
        for data in interpreter_data:
            login = LoginInformation(
                username=data["username"],
                password=get_password_hash("password123"),
                user_type=UserType.INTERPRETER
            )
            db.add(login)
            db.flush()
            
            interpreter = InterpreterData(
                login_id=login.id,
                name=data["name"],
                language=data["language"],
                phone_number=f"+1-555-{len(interpreter_logins):04d}",
                email=f"{data['username']}@hospital.com",
                gender="Other",
                availability_status=InterpreterAvailability.AVAILABLE if data["language"] != "Spanish" else InterpreterAvailability.UNAVAILABLE
            )
            db.add(interpreter)
            interpreter_logins.append((login, interpreter))
        
        db.flush()
        
        patients = [
            PatientData(
                fhir_id="patient-001",
                name="Zhang Xiaoming",
                language="Mandarin",
                location="Ward 4A",
                birthdate="1965-03-15",
                gender="male",
                phone_number="+1-555-0001",
                email="zhang.x@email.com"
            ),
            PatientData(
                fhir_id="patient-002",
                name="Mohammed Ali",
                language="Arabic",
                location="Emergency Department",
                birthdate="1978-07-22",
                gender="male",
                phone_number="+1-555-0002"
            ),
            PatientData(
                fhir_id="patient-003",
                name="Tran Thi Lan",
                language="Vietnamese",
                location="Outpatient Clinic",
                birthdate="1990-11-08",
                gender="female",
                phone_number="+1-555-0003",
                email="tran.lan@email.com"
            ),
            PatientData(
                fhir_id="patient-004",
                name="Liu Yong",
                language="Mandarin",
                location="Outpatient Clinic 3",
                birthdate="1982-05-30",
                gender="male",
                phone_number="+1-555-0004"
            ),
            PatientData(
                fhir_id="patient-005",
                name="Hassan Ahmed",
                language="Arabic",
                location="Emergency Department",
                birthdate="1995-09-12",
                gender="male",
                phone_number="+1-555-0005"
            ),
        ]
        
        db.add_all(patients)
        db.flush()
        
        mandarin_interpreter = next(i for l, i in interpreter_logins if i.language == "Mandarin")
        mandarin_interpreter.availability_status = InterpreterAvailability.BUSY
        
        request1 = InterpreterRequest(
            requested_by=staff1.id,
            patient_id=patients[0].id,
            interpreter_id=mandarin_interpreter.id,
            location_method="Ward 4A (30 min)",
            delivery_method=DeliveryMethod.ONSITE,
            language="Mandarin",
            status=RequestStatus.ACCEPTED,
            patient_type="Inpatient",
            is_stat=False,
            duration_minutes="30",
            request_notes="Dr. Smith requires interpreter for informed consent discussion.",
            requested_at=datetime.utcnow() - timedelta(hours=2),
            accepted_at=datetime.utcnow() - timedelta(hours=1, minutes=30)
        )
        
        request2 = InterpreterRequest(
            requested_by=staff1.id,
            patient_id=patients[1].id,
            location_method="Phone Call (STAT)",
            delivery_method=DeliveryMethod.TELEPHONE,
            language="Arabic",
            status=RequestStatus.PENDING,
            patient_type="Emergency Department",
            is_stat=True,
            request_notes="Urgent - chest pain evaluation",
            requested_at=datetime.utcnow() - timedelta(minutes=45)
        )
        
        vietnamese_interpreter = next(i for l, i in interpreter_logins if i.language == "Vietnamese")
        request3 = InterpreterRequest(
            requested_by=staff1.id,
            patient_id=patients[2].id,
            interpreter_id=vietnamese_interpreter.id,
            location_method="Telehealth Link (60 min)",
            delivery_method=DeliveryMethod.TELEHEALTH,
            language="Vietnamese",
            status=RequestStatus.COMPLETED,
            patient_type="Outpatient",
            is_stat=False,
            duration_minutes="60",
            request_notes="Follow-up consultation",
            encounter_notes="Successfully completed telehealth session.",
            requested_at=datetime.utcnow() - timedelta(days=1, hours=4),
            accepted_at=datetime.utcnow() - timedelta(days=1, hours=3),
            completed_at=datetime.utcnow() - timedelta(days=1, hours=2)
        )
        
        request4 = InterpreterRequest(
            requested_by=staff2.id,
            patient_id=patients[3].id,
            location_method="Outpatient Clinic 3 (60 min)",
            delivery_method=DeliveryMethod.ONSITE,
            language="Mandarin",
            status=RequestStatus.PENDING,
            patient_type="Outpatient",
            is_stat=False,
            duration_minutes="60",
            requested_at=datetime.utcnow() - timedelta(minutes=30)
        )
        
        request5 = InterpreterRequest(
            requested_by=staff1.id,
            patient_id=patients[4].id,
            location_method="Emergency Department",
            delivery_method=DeliveryMethod.ONSITE,
            language="Mandarin",
            status=RequestStatus.PENDING,
            patient_type="ED",
            is_stat=True,
            request_notes="Motor vehicle accident - consent needed for surgery",
            requested_at=datetime.utcnow() - timedelta(minutes=5)
        )
        
        db.add_all([request1, request2, request3, request4, request5])
        
        db.commit()
        
        print("✓ Database seeded successfully!")
        print("\nSample Credentials:")
        print("\nStaff Login:")
        print("  Username: staff1")
        print("  Password: password123")
        print("\nAdmin Login:")
        print("  Username: admin1")
        print("  Password: password123")
        print("\nInterpreter Logins:")
        print("  Username: interpreter_mandarin1")
        print("  Password: password123")
        
    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()