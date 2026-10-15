import io
from tests.test_appointments import _create_authenticated_patient, _get_staff_headers


def test_clinical_treatment_and_records(client):
    patient_headers = _create_authenticated_patient(client, "+919512037497")
    doctor_headers = _get_staff_headers(client, "dr.kumar@kumardentalclinic.com", "DrKumar@2026")
    reception_headers = _get_staff_headers(client, "reception@kumardentalclinic.com", "Reception@2026")

    # Get doctor and service
    doctor_id = client.get("/api/v1/services/doctors").json()[0]["id"]
    service_id = client.get("/api/v1/services").json()[0]["id"]

    # Book appointment
    book_res = client.post("/api/v1/appointments", json={
        "doctor_id": doctor_id,
        "service_id": service_id,
        "appointment_date": "2026-10-21",
        "start_time": "11:00",
        "chief_complaint": "Severe toothache in upper molar."
    }, headers=patient_headers)
    assert book_res.status_code == 201
    appointment_id = book_res.json()["id"]
    patient_id = book_res.json()["patient_id"]

    # Transition to CHECKED_IN
    client.patch(f"/api/v1/appointments/{appointment_id}/status", json={"status": "CONFIRMED"}, headers=doctor_headers)
    client.patch(f"/api/v1/appointments/{appointment_id}/status", json={"status": "CHECKED_IN"}, headers=doctor_headers)

    # 1. Author treatment record by doctor
    record_res = client.post(f"/api/v1/clinical/appointments/{appointment_id}/treatment-records", json={
        "tooth_number": "16 (Maxillary Right First Molar)",
        "diagnosis": "Irreversible pulpitis secondary to deep occlusal caries.",
        "clinical_notes": "Access cavity prepared under 2% lignocaine with adrenaline. Pulp extirpated, working length verified with apex locator.",
        "treatment_performed": "Root canal instrumentation, shaping, and biomechanical preparation with rotary NiTi files.",
        "follow_up_recommendation": "Return for obturation and permanent coronal restoration in 5 days."
    }, headers=doctor_headers)

    assert record_res.status_code == 201
    record_data = record_res.json()
    assert record_data["tooth_number"] == "16 (Maxillary Right First Molar)"

    # 2. Receptionist attempts to access private clinical treatment record -> MUST BE DENIED 403!
    rec_access = client.get(f"/api/v1/clinical/appointments/{appointment_id}/treatment-records", headers=reception_headers)
    assert rec_access.status_code == 403
    assert "Receptionists do not have permission" in rec_access.json()["error"]["message"]

    # 3. Patient accesses their own finalized treatment record -> Allowed
    patient_access = client.get(f"/api/v1/clinical/appointments/{appointment_id}/treatment-records", headers=patient_headers)
    assert patient_access.status_code == 200

    # 4. Author prescription with structured medicine items
    rx_res = client.post("/api/v1/clinical/prescriptions", json={
        "patient_id": patient_id,
        "appointment_id": appointment_id,
        "notes": "Take complete course of antibiotics as directed. Rinse with warm saline.",
        "follow_up_date": "2026-10-26",
        "items": [
            {
                "medicine_name": "Amoxicillin + Clavulanic Acid (625mg)",
                "dosage": "1 tablet",
                "timing": "Twice daily after meals",
                "duration": "5 days",
                "instructions": "Do not skip doses"
            },
            {
                "medicine_name": "Ibuprofen + Paracetamol (400mg/325mg)",
                "dosage": "1 tablet",
                "timing": "SOS for moderate to severe pain after meals",
                "duration": "3 days"
            }
        ]
    }, headers=doctor_headers)

    assert rx_res.status_code == 201
    rx_data = rx_res.json()
    assert len(rx_data["items"]) == 2
    assert "Amoxicillin" in rx_data["items"][0]["medicine_name"]

    # 5. Patient fetches their prescriptions
    my_rx = client.get("/api/v1/clinical/patients/me/prescriptions", headers=patient_headers)
    assert my_rx.status_code == 200
    assert len(my_rx.json()) >= 1


def test_document_upload_and_presigned_download(client):
    patient_headers = _create_authenticated_patient(client, "+919824099887")
    doctor_headers = _get_staff_headers(client, "dr.kumar@kumardentalclinic.com", "DrKumar@2026")

    # Get patient profile id
    me_res = client.get("/api/v1/auth/me", headers=patient_headers)
    patient_id = me_res.json()["profile"]["patient_id"]

    # Create dummy X-ray image bytes (mock PNG header)
    png_content = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
    file_obj = io.BytesIO(png_content)

    # Upload document
    upload_res = client.post(
        f"/api/v1/documents/patients/{patient_id}/documents",
        data={
            "document_type": "X_RAY",
            "description": "Periapical digital radiograph (IOPA) for tooth 16",
            "is_patient_visible": "true"
        },
        files={"file": ("iopa_tooth_16.png", file_obj, "image/png")},
        headers=doctor_headers
    )

    assert upload_res.status_code == 201
    doc_data = upload_res.json()
    assert doc_data["file_name"] == "iopa_tooth_16.png"
    document_id = doc_data["id"]

    # Patient accesses list of documents
    my_docs = client.get("/api/v1/documents/patients/me/documents", headers=patient_headers)
    assert my_docs.status_code == 200
    assert len(my_docs.json()) >= 1

    # Request short-lived presigned download URL
    url_res = client.get(f"/api/v1/documents/{document_id}/download-url", headers=patient_headers)
    assert url_res.status_code == 200
    assert "download_url" in url_res.json()
    assert url_res.json()["expires_in_seconds"] == 900

    # 4. Role-based deletion test:
    # A. Patient attempts to delete -> 403 Forbidden
    patient_del_res = client.delete(f"/api/v1/documents/{document_id}", headers=patient_headers)
    assert patient_del_res.status_code == 403

    # B. Receptionist attempts to delete -> 403 Forbidden
    rec_headers = _get_staff_headers(client, "reception@kumardentalclinic.com", "Reception@2026")
    rec_del_res = client.delete(f"/api/v1/documents/{document_id}", headers=rec_headers)
    assert rec_del_res.status_code == 403

    # C. Doctor deletes document -> 200 OK
    doc_del_res = client.delete(f"/api/v1/documents/{document_id}", headers=doctor_headers)
    assert doc_del_res.status_code == 200
    assert "deleted successfully" in doc_del_res.json()["message"].lower()

    # D. Subsequent download returns 404
    not_found_res = client.get(f"/api/v1/documents/{document_id}/download-url", headers=doctor_headers)
    assert not_found_res.status_code == 404
