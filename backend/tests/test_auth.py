def test_patient_otp_flow(client):
    # 0. Unregistered phone cannot request OTP
    phone = "+919824037497"
    unreg_res = client.post("/api/v1/auth/otp/request", json={"phone": phone, "purpose": "LOGIN"})
    assert unreg_res.status_code == 404

    # Pre-register patient via clinic receptionist
    login_res = client.post("/api/v1/auth/staff/login", json={"email": "reception@kumardentalclinic.com", "password": "Reception@2026"})
    rec_headers = {"Authorization": f"Bearer {login_res.json()['access_token']}"}
    client.post("/api/v1/admin/patients", json={
        "first_name": "Ramesh",
        "last_name": "Patel",
        "phone": phone,
        "city": "Vadodara"
    }, headers=rec_headers)

    # 1. Request OTP for registered patient
    req_res = client.post("/api/v1/auth/otp/request", json={"phone": phone, "purpose": "LOGIN"})
    assert req_res.status_code == 200
    data = req_res.json()
    assert "Verification code sent" in data["message"]
    otp_code = data.get("dev_otp")
    assert otp_code is not None
    assert len(otp_code) == 6

    # 2. Verify with wrong code
    wrong_res = client.post("/api/v1/auth/otp/verify", json={"phone": phone, "code": "000000"})
    assert wrong_res.status_code == 400
    assert "Incorrect verification code" in wrong_res.json()["error"]["message"]

    # 3. Verify with correct code
    verify_res = client.post("/api/v1/auth/otp/verify", json={"phone": phone, "code": otp_code})
    assert verify_res.status_code == 200
    auth_data = verify_res.json()
    assert "access_token" in auth_data
    assert "refresh_token" in auth_data
    assert auth_data["role"] == "PATIENT"

    token = auth_data["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 4. Fetch /me
    me_res = client.get("/api/v1/auth/me", headers=headers)
    assert me_res.status_code == 200
    assert me_res.json()["phone"] == phone
    assert me_res.json()["role"] == "PATIENT"

    # 5. Complete patient profile
    reg_res = client.post("/api/v1/auth/patient/register", json={
        "first_name": "Ramesh",
        "last_name": "Patel",
        "city": "Vadodara",
        "blood_group": "B+",
        "allergies": "Penicillin"
    }, headers=headers)
    assert reg_res.status_code == 201
    assert reg_res.json()["first_name"] == "Ramesh"

    # 6. Verify profile updated on /me
    me_updated = client.get("/api/v1/auth/me", headers=headers)
    assert me_updated.status_code == 200
    profile = me_updated.json()["profile"]
    assert profile["first_name"] == "Ramesh"
    assert profile["allergies"] == "Penicillin"


def test_staff_login_admin(client):
    res = client.post("/api/v1/auth/staff/login", json={
        "email": "admin@kumardentalclinic.com",
        "password": "KumarAdmin@2026"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["role"] == "ADMIN"
    assert "access_token" in data

    headers = {"Authorization": f"Bearer {data['access_token']}"}
    me_res = client.get("/api/v1/auth/me", headers=headers)
    assert me_res.status_code == 200
    assert me_res.json()["role"] == "ADMIN"


def test_staff_login_doctor(client):
    res = client.post("/api/v1/auth/staff/login", json={
        "email": "dr.kumar@kumardentalclinic.com",
        "password": "DrKumar@2026"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["role"] == "DOCTOR"
    assert "Dr. Kumar M. Tipnis" in data["profile"]["full_name"]


def test_staff_login_receptionist(client):
    res = client.post("/api/v1/auth/staff/login", json={
        "email": "reception@kumardentalclinic.com",
        "password": "Reception@2026"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["role"] == "RECEPTIONIST"


def test_staff_login_invalid_password(client):
    res = client.post("/api/v1/auth/staff/login", json={
        "email": "admin@kumardentalclinic.com",
        "password": "WrongPassword123"
    })
    assert res.status_code == 401
    assert "Invalid email or password" in res.json()["error"]["message"]


def test_refresh_token_and_logout(client):
    login_res = client.post("/api/v1/auth/staff/login", json={
        "email": "admin@kumardentalclinic.com",
        "password": "KumarAdmin@2026"
    })
    auth_data = login_res.json()
    refresh_token = auth_data["refresh_token"]
    access_token = auth_data["access_token"]
    headers = {"Authorization": f"Bearer {access_token}"}

    # Refresh
    refresh_res = client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
    assert refresh_res.status_code == 200
    new_access_token = refresh_res.json()["access_token"]
    assert new_access_token != access_token

    # Logout (revokes active session)
    logout_res = client.post("/api/v1/auth/logout", headers=headers)
    assert logout_res.status_code == 200

    # Attempt to refresh with revoked token
    revoked_res = client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
    assert revoked_res.status_code == 401


def test_unauthenticated_request_rejected(client):
    res = client.get("/api/v1/auth/me")
    assert res.status_code == 401
    assert "token required" in res.json()["error"]["message"].lower()


def test_tampered_token_rejected(client):
    res = client.get("/api/v1/auth/me", headers={"Authorization": "Bearer invalid_tampered_jwt_token"})
    assert res.status_code == 401
    assert "Invalid authentication token" in res.json()["error"]["message"]

