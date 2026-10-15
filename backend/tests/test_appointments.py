import pytest


def _create_authenticated_patient(client, phone="+919800011122"):
    rec_headers = _get_staff_headers(client, "reception@kumardentalclinic.com", "Reception@2026")
    client.post("/api/v1/admin/patients", json={
        "first_name": "Test",
        "last_name": "Patient",
        "phone": phone,
        "city": "Vadodara"
    }, headers=rec_headers)

    otp_res = client.post("/api/v1/auth/otp/request", json={"phone": phone, "purpose": "LOGIN"})
    otp_code = otp_res.json()["dev_otp"]
    auth_res = client.post("/api/v1/auth/otp/verify", json={"phone": phone, "code": otp_code})
    token = auth_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    client.post("/api/v1/auth/patient/register", json={
        "first_name": "Kavita",
        "last_name": "Shah",
        "city": "Vadodara"
    }, headers=headers)

    return headers


def _get_staff_headers(client, email="admin@kumardentalclinic.com", password="KumarAdmin@2026"):
    login_res = client.post("/api/v1/auth/staff/login", json={"email": email, "password": password})
    token = login_res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_appointment_booking_and_status_flow(client):
    patient_headers = _create_authenticated_patient(client, "+919876543210")
    admin_headers = _get_staff_headers(client)

    doctors_res = client.get("/api/v1/services/doctors")
    doctor_id = doctors_res.json()[0]["id"]

    services_res = client.get("/api/v1/services")
    service_id = services_res.json()[0]["id"]

    # 1. Book appointment (2026-10-20 at 10:30)
    book_res = client.post("/api/v1/appointments", json={
        "doctor_id": doctor_id,
        "service_id": service_id,
        "appointment_date": "2026-10-20",
        "start_time": "10:30",
        "chief_complaint": "Routine dental checkup and tooth sensitivity."
    }, headers=patient_headers)

    assert book_res.status_code == 201
    app_data = book_res.json()
    assert app_data["status"] == "PENDING_REVIEW"
    appointment_id = app_data["id"]

    # 2. Concurrency / Double Booking check on the same slot
    double_book_res = client.post("/api/v1/appointments", json={
        "doctor_id": doctor_id,
        "service_id": service_id,
        "appointment_date": "2026-10-20",
        "start_time": "10:30"
    }, headers=patient_headers)

    assert double_book_res.status_code == 409
    assert "already been reserved" in double_book_res.json()["error"]["message"]

    # 3. Staff reviews and confirms appointment
    confirm_res = client.patch(f"/api/v1/appointments/{appointment_id}/status", json={
        "status": "CONFIRMED",
        "notes": "Reviewed and confirmed by clinic reception desk."
    }, headers=admin_headers)

    assert confirm_res.status_code == 200
    assert confirm_res.json()["status"] == "CONFIRMED"

    # 4. Patient requests cancellation
    cancel_req = client.post(f"/api/v1/appointments/{appointment_id}/cancel-request", json={
        "reason": "Family emergency, unable to attend on Tuesday morning."
    }, headers=patient_headers)

    assert cancel_req.status_code == 200
    assert cancel_req.json()["status"] == "CANCELLATION_REQUESTED"

    # 5. Invalid transition: cannot transition directly from CANCELLATION_REQUESTED to COMPLETED
    invalid_res = client.patch(f"/api/v1/appointments/{appointment_id}/status", json={
        "status": "COMPLETED"
    }, headers=admin_headers)

    assert invalid_res.status_code == 400
    assert "Invalid status transition" in invalid_res.json()["error"]["message"]

    # 6. Staff confirms cancellation
    cancelled_res = client.patch(f"/api/v1/appointments/{appointment_id}/status", json={
        "status": "CANCELLED",
        "notes": "Cancellation approved per patient request."
    }, headers=admin_headers)

    assert cancelled_res.status_code == 200
    assert cancelled_res.json()["status"] == "CANCELLED"
