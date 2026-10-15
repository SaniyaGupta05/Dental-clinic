def test_list_services(client):
    res = client.get("/api/v1/services")
    assert res.status_code == 200
    services = res.json()
    assert len(services) >= 12
    service_names = [s["name"] for s in services]
    assert "Root Canal Treatment (RCT)" in service_names
    assert "General Dentistry" in service_names
    assert "Cosmetic Dentistry" in service_names
    assert "Pediatric Dentistry" in service_names
    assert "Dental Fillings" in service_names
    assert "Tooth Extraction & Wisdom Surgery" in service_names


def test_list_doctors(client):
    res = client.get("/api/v1/services/doctors")
    assert res.status_code == 200
    doctors = res.json()
    assert len(doctors) >= 2
    doc_names = [d["full_name"] for d in doctors]
    assert "Dr. Kumar M. Tipnis" in doc_names
    assert "Dr. Neha Parlekar" in doc_names
