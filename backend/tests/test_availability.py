def test_availability_sunday_closed(client):
    doctors_res = client.get("/api/v1/services/doctors")
    assert doctors_res.status_code == 200
    doctor_id = doctors_res.json()[0]["id"]

    # 2026-10-18 is a Sunday
    res = client.get(f"/api/v1/availability?doctor_id={doctor_id}&date=2026-10-18")
    assert res.status_code == 200
    data = res.json()
    assert data["is_holiday"] is True
    assert "Sunday" in data["holiday_reason"]
    assert len(data["slots"]) == 0


def test_availability_weekday_slots(client):
    doctors_res = client.get("/api/v1/services/doctors")
    assert doctors_res.status_code == 200
    doctor_id = doctors_res.json()[0]["id"]

    # 2026-10-19 is a Monday
    res = client.get(f"/api/v1/availability?doctor_id={doctor_id}&date=2026-10-19")
    assert res.status_code == 200
    data = res.json()
    assert data["is_holiday"] is False
    assert len(data["slots"]) > 0

    # Verify morning and evening slots generated
    slot_times = [s["start_time"] for s in data["slots"]]
    assert "10:00" in slot_times
    assert "17:00" in slot_times
