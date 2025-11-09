# fhir_client.py - Copy this entire file

import httpx
from typing import Optional, List, Dict, Any

class FHIRClient:
    def __init__(self, base_url: str = "http://hapi.fhir.org/baseR4"):
        """
        Initialize FHIR client
        Default uses public HAPI FHIR test server
        """
        self.base_url = base_url.rstrip('/')
        self.timeout = 30.0
    
    async def get_patient(self, patient_id: str) -> Optional[Dict[str, Any]]:
        """Fetch a single patient by FHIR ID"""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(f"{self.base_url}/Patient/{patient_id}")
                response.raise_for_status()
                return response.json()
        except httpx.HTTPError as e:
            print(f"Error fetching patient {patient_id}: {e}")
            return None
    
    async def search_patients(
        self, 
        name: Optional[str] = None,
        language: Optional[str] = None,
        count: int = 20
    ) -> List[Dict[str, Any]]:
        """
        Search for patients with optional filters
        Returns list of patient resources
        """
        try:
            params = {"_count": count}
            if name:
                params["name"] = name
            if language:
                params["language"] = language
            
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(
                    f"{self.base_url}/Patient",
                    params=params
                )
                response.raise_for_status()
                bundle = response.json()
                
                # Extract entries from bundle
                if bundle.get("entry"):
                    return [entry["resource"] for entry in bundle["entry"]]
                return []
        except httpx.HTTPError as e:
            print(f"Error searching patients: {e}")
            return []
    
    async def create_appointment(self, appointment_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Create an appointment in FHIR server
        Note: Based on requirements, we're not using this, but included for completeness
        """
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.base_url}/Appointment",
                    json=appointment_data,
                    headers={"Content-Type": "application/fhir+json"}
                )
                response.raise_for_status()
                return response.json()
        except httpx.HTTPError as e:
            print(f"Error creating appointment: {e}")
            return None
    
    def parse_patient_resource(self, fhir_patient: Dict[str, Any]) -> Dict[str, Any]:
        """
        Parse FHIR Patient resource into simplified format for our database
        """
        patient_data = {
            "fhir_id": fhir_patient.get("id"),
            "name": self._get_patient_name(fhir_patient),
            "gender": fhir_patient.get("gender"),
            "birthdate": fhir_patient.get("birthDate"),
            "phone_number": self._get_telecom(fhir_patient, "phone"),
            "email": self._get_telecom(fhir_patient, "email"),
            "address": self._get_address(fhir_patient),
            "language": self._get_language(fhir_patient),
        }
        return patient_data
    
    def _get_patient_name(self, patient: Dict[str, Any]) -> str:
        """Extract patient name from FHIR name array"""
        names = patient.get("name", [])
        if names:
            name = names[0]
            given = " ".join(name.get("given", []))
            family = name.get("family", "")
            return f"{given} {family}".strip()
        return "Unknown"
    
    def _get_telecom(self, patient: Dict[str, Any], system: str) -> Optional[str]:
        """Extract telecom value (phone/email) from FHIR telecom array"""
        telecoms = patient.get("telecom", [])
        for telecom in telecoms:
            if telecom.get("system") == system:
                return telecom.get("value")
        return None
    
    def _get_address(self, patient: Dict[str, Any]) -> Optional[str]:
        """Extract address from FHIR address array"""
        addresses = patient.get("address", [])
        if addresses:
            addr = addresses[0]
            lines = addr.get("line", [])
            city = addr.get("city", "")
            state = addr.get("state", "")
            postal = addr.get("postalCode", "")
            return f"{', '.join(lines)}, {city}, {state} {postal}".strip(", ")
        return None
    
    def _get_language(self, patient: Dict[str, Any]) -> str:
        """Extract primary language from FHIR communication array"""
        communications = patient.get("communication", [])
        if communications:
            for comm in communications:
                if comm.get("preferred"):
                    language = comm.get("language", {})
                    codings = language.get("coding", [])
                    if codings:
                        return codings[0].get("display", "English")
        return "English"  # Default fallback

    async def create_patient(self, patient_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Create a new patient in FHIR server

        Args:
            patient_data: Dictionary containing patient information
                - name: Full name (string)
                - birthdate: Birth date in YYYY-MM-DD format
                - gender: Gender (male/female/other/unknown)
                - language: Preferred language
                - phone_number: Phone number (optional)
                - email: Email address (optional)
                - address: Physical address (optional)

        Returns:
            Created patient resource from FHIR server
        """
        try:
            # Build FHIR Patient resource
            fhir_patient = {
                "resourceType": "Patient",
                "name": [
                    {
                        "use": "official",
                        "text": patient_data.get("name"),
                        "family": patient_data.get("name", "").split()[-1] if patient_data.get("name") else "",
                        "given": patient_data.get("name", "").split()[:-1] if patient_data.get("name") else []
                    }
                ],
                "gender": patient_data.get("gender", "unknown"),
                "birthDate": patient_data.get("birthdate"),
            }

            # Add telecom (phone and email)
            telecom = []
            if patient_data.get("phone_number"):
                telecom.append({
                    "system": "phone",
                    "value": patient_data.get("phone_number"),
                    "use": "mobile"
                })
            if patient_data.get("email"):
                telecom.append({
                    "system": "email",
                    "value": patient_data.get("email")
                })
            if telecom:
                fhir_patient["telecom"] = telecom

            # Add address
            if patient_data.get("address"):
                fhir_patient["address"] = [
                    {
                        "use": "home",
                        "type": "physical",
                        "text": patient_data.get("address")
                    }
                ]

            # Add preferred language
            if patient_data.get("language"):
                fhir_patient["communication"] = [
                    {
                        "language": {
                            "coding": [
                                {
                                    "system": "urn:ietf:bcp:47",
                                    "display": patient_data.get("language")
                                }
                            ],
                            "text": patient_data.get("language")
                        },
                        "preferred": True
                    }
                ]

            # POST to FHIR server
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.base_url}/Patient",
                    json=fhir_patient,
                    headers={"Content-Type": "application/fhir+json"}
                )
                response.raise_for_status()
                return response.json()

        except httpx.HTTPError as e:
            print(f"Error creating patient in FHIR: {e}")
            return None