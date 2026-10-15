from tests.test_appointments import _get_staff_headers, _create_authenticated_patient


def test_admin_dashboard_kpis(client):
    admin_headers = _get_staff_headers(client, "admin@kumardentalclinic.com", "KumarAdmin@2026")
    res = client.get("/api/v1/admin/dashboard", headers=admin_headers)
    assert res.status_code == 200
    data = res.json()
    assert "pending_review" in data
    assert "confirmed" in data
    assert "completed" in data
    assert "cancellation_requests" in data
    assert "upcoming_follow_ups" in data
    assert "total_patients" in data


def test_receptionist_patient_search_and_registration(client):
    rec_headers = _get_staff_headers(client, "reception@kumardentalclinic.com", "Reception@2026")

    # Front desk patient creation
    new_patient_res = client.post("/api/v1/admin/patients", json={
        "first_name": "Suresh",
        "last_name": "Mehta",
        "phone": "+919825512345",
        "city": "Vadodara",
        "blood_group": "O+",
        "emergency_contact_name": "Geeta Mehta",
        "emergency_contact_phone": "+919825599999"
    }, headers=rec_headers)

    assert new_patient_res.status_code == 201
    patient = new_patient_res.json()
    assert patient["first_name"] == "Suresh"
    assert patient["last_name"] == "Mehta"
    patient_id = patient["id"]

    # Search for the newly created patient by name query
    search_res = client.get("/api/v1/admin/patients?query=Mehta", headers=rec_headers)
    assert search_res.status_code == 200
    results = search_res.json()
    assert results["total"] >= 1
    found_names = [p["full_name"] for p in results["items"]]
    assert "Suresh Mehta" in found_names

    # Get patient detail
    detail_res = client.get(f"/api/v1/admin/patients/{patient_id}", headers=rec_headers)
    assert detail_res.status_code == 200
    assert detail_res.json()["first_name"] == "Suresh"


def test_audit_logs_role_enforcement(client):
    admin_headers = _get_staff_headers(client, "admin@kumardentalclinic.com", "KumarAdmin@2026")
    rec_headers = _get_staff_headers(client, "reception@kumardentalclinic.com", "Reception@2026")
    patient_headers = _create_authenticated_patient(client, "+919999988888")

    # Admin access -> Allowed
    admin_res = client.get("/api/v1/admin/audit-logs", headers=admin_headers)
    assert admin_res.status_code == 200
    assert isinstance(admin_res.json(), list)

    # Receptionist access -> Denied 403
    rec_res = client.get("/api/v1/admin/audit-logs", headers=rec_headers)
    assert rec_res.status_code == 403

    # Patient access -> Denied 403
    patient_res = client.get("/api/v1/admin/audit-logs", headers=patient_headers)
    assert patient_res.status_code == 403
