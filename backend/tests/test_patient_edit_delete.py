import pytest


def test_doctor_can_edit_and_delete_patient(client):
    # 1. Login as Receptionist
    rec_login = client.post("/api/v1/auth/staff/login", json={"email": "reception@kumardentalclinic.com", "password": "Reception@2026"})
    assert rec_login.status_code == 200
    rec_headers = {"Authorization": f"Bearer {rec_login.json()['access_token']}"}

    # Register a new patient
    reg_res = client.post("/api/v1/admin/patients", json={
        "first_name": "Suresh",
        "last_name": "Sharma",
        "phone": "+919876500001",
        "city": "Vadodara"
    }, headers=rec_headers)
    assert reg_res.status_code == 201
    patient_id = reg_res.json()["id"]

    # Receptionist attempts to edit patient -> 403 Forbidden
    rec_edit_res = client.put(f"/api/v1/admin/patients/{patient_id}", json={
        "first_name": "Suresh Kumar"
    }, headers=rec_headers)
    assert rec_edit_res.status_code == 403

    # Receptionist attempts to delete patient -> 403 Forbidden
    rec_del_res = client.delete(f"/api/v1/admin/patients/{patient_id}", headers=rec_headers)
    assert rec_del_res.status_code == 403

    # 2. Login as Doctor (Dr. Kumar)
    doc_login = client.post("/api/v1/auth/staff/login", json={"email": "dr.kumar@kumardentalclinic.com", "password": "DrKumar@2026"})
    assert doc_login.status_code == 200
    doc_headers = {"Authorization": f"Bearer {doc_login.json()['access_token']}"}

    # Doctor edits patient details -> 200 OK
    doc_edit_res = client.put(f"/api/v1/admin/patients/{patient_id}", json={
        "first_name": "Suresh",
        "last_name": "Sharma-Mod",
        "blood_group": "B+",
        "allergies": "Penicillin",
        "medical_history_notes": "Hypertension reported"
    }, headers=doc_headers)
    assert doc_edit_res.status_code == 200
    updated_data = doc_edit_res.json()
    assert updated_data["last_name"] == "Sharma-Mod"
    assert updated_data["allergies"] == "Penicillin"

    # Doctor deletes patient -> 200 OK
    doc_del_res = client.delete(f"/api/v1/admin/patients/{patient_id}", headers=doc_headers)
    assert doc_del_res.status_code == 200
    assert "deleted successfully" in doc_del_res.json()["message"]

    # Verify patient no longer exists -> 404
    get_res = client.get(f"/api/v1/admin/patients/{patient_id}", headers=doc_headers)
    assert get_res.status_code == 404
