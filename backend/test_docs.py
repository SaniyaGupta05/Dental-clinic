import urllib.request, json

req = urllib.request.Request('http://localhost:8000/api/v1/auth/staff/login', data=json.dumps({'email': 'dr.kumar@kumardentalclinic.com', 'password': 'DrKumar@2026'}).encode(), headers={'Content-Type': 'application/json'})
res = urllib.request.urlopen(req)
token = json.loads(res.read().decode())['access_token']

req2 = urllib.request.Request('http://localhost:8000/api/v1/admin/patients?size=10', headers={'Authorization': f'Bearer {token}'})
patients = json.loads(urllib.request.urlopen(req2).read().decode())['items']
print('Found patients:', len(patients))

for p in patients:
    patient_id = p['id']
    req3 = urllib.request.Request(f'http://localhost:8000/api/v1/documents/patients/{patient_id}/documents', headers={'Authorization': f'Bearer {token}'})
    docs = json.loads(urllib.request.urlopen(req3).read().decode())
    print('Patient', p['full_name'], 'has', len(docs), 'docs')
    for d in docs:
        print('  Doc:', d['id'], d['file_name'])
        print('  Download URL:', d['download_url'])
        url = d['download_url']
        try:
            req_file = urllib.request.Request(url)
            res_file = urllib.request.urlopen(req_file)
            data = res_file.read()
            print('  -> Downloaded OK! Status:', res_file.status, 'Bytes:', len(data), 'ContentType:', res_file.headers.get('Content-Type'))
        except Exception as e:
            print('  -> Failed to download:', e)
