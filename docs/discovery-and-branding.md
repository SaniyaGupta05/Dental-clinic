# Discovery & Verified Clinic Branding
**Kumar Dental Clinic Platform**
Source of Truth: [https://kumardentalclinic.com/](https://kumardentalclinic.com/)

---

## 1. Verified Clinic Profile

| Attribute | Verified Value from kumardentalclinic.com |
| :--- | :--- |
| **Clinic Name** | Kumar Dental Clinic |
| **Established** | 1988 (Over 37+ years of clinical excellence) |
| **Tagline / Philosophy** | "Ethical practice, transparent communication, and conservative treatments that preserve natural tooth structure. Three generations of Vadodara families have trusted Kumar Dental Clinic." |
| **Full Address** | A-6, Yogeshwar Jyot Society, Near Mother's School, Gotri, Vadodara - 390021, Gujarat, India |
| **Google Maps Embed / Coordinates** | Centered at Yogeshwar Jyot Society, Gotri, Vadodara (`https://maps.google.com/maps?q=Kumar%20Dental%20Clinic,%20A-6,%20Yogeshwar%20Jyot%20Society,%20Near%20Mother%27s%20School,%20Gotri,%20Vadodara%20-%20390021,%20Gujarat&t=m&z=13&ie=UTF8&output=embed`) |
| **Primary Phone / WhatsApp** | `+91 98240 37497` (`https://wa.me/9824037497`) |
| **Secondary Phone** | `+91 95120 37497` |
| **Landline Phone** | `+91 265 2314153` |
| **Website URL** | `https://kumardentalclinic.com` |

---

## 2. Operating Hours & Workflow

- **Monday to Saturday**:
  - **Morning Slot**: 10:00 AM – 1:00 PM
  - **Evening Slot**: 5:00 PM – 8:00 PM
- **Sunday**: Closed
- **Existing Website Booking Workflow**:
  - The website states: *"Our team will review your appointment request and contact you shortly to confirm the details."*
  - It links out to an intake form (`forms.gle/x8zTvrmg58jR7rnP8`).
  - **Critical Architectural Requirement**: All patient-initiated appointment bookings MUST start in status `PENDING_REVIEW` rather than automatically confirming, matching the clinic's real operational practice.

---

## 3. Verified Clinicians

1. **Dr. Kumar M. Tipnis (BDS)**
   - *Role*: Chief Dental Surgeon & Founder
   - *Education*: Alumnus of Manipal College of Dental Sciences (Manipal University)
   - *Experience*: 37+ years of clinical practice
   - *Specialization*: Ethical practice, conservative dentistry, painless root canal therapy, smile restorations, and general oral healthcare.
2. **Dr. Neha Parlekar (BDS)**
   - *Role*: Associate Dental Surgeon & Senior Consultant
   - *Specialization*: Modern aesthetic & restorative treatments, gentle pediatric care, preventive care.

---

## 4. Verified Clinical Services

1. **General Dentistry**: Comprehensive oral examinations, regular maintenance, scaling, and prophylaxis.
2. **Preventive Care**: Proactive preventive procedures, pit & fissure sealants, topical fluoride treatments.
3. **Root Canal Treatment (RCT)**: Painless endodontic therapy using modern techniques to preserve severely infected natural teeth.
4. **Cosmetic Dentistry**: Veneers, bonding, and smile aesthetic enhancements using conservative methods.
5. **Dental Fillings**: Tooth-colored composite restorations blending seamlessly with natural tooth enamel.
6. **Tooth Extraction**: Safe, painless surgical and non-surgical extractions including impacted wisdom teeth.
7. **Dentures & Prosthetics**: Complete dentures, removable partial dentures, crowns, bridges, and fixed prosthetics.
8. **Orthodontic Treatment**: Tooth alignment and bite correction for adolescents and adults.
9. **Gum Care (Periodontics)**: Treatment for gingivitis, periodontitis, deep scaling, and root planing.
10. **Pediatric Dentistry**: Child-friendly dental examinations, habit breaking, and caries management.
11. **Smile Improvement / Smile Design**: Comprehensive aesthetic rehabilitation combining multiple restorative therapies.
12. **All Types of Dental Surgery**: Oral surgical procedures including dental implants and bone grafting.

---

## 5. Visual Brand Assets & Design System

### A. Color Palette
- **Primary Teal / Medical Cyan**: `#08a2ba` (`rgb(8, 162, 186)`) — Used on buttons, active badges, primary accents.
- **Vibrant Mint / Light Teal**: `#1bc4ab` (`rgb(27, 196, 171)`) — Booking CTA buttons, highlight cards.
- **Deep Ocean / Dark Teal**: `#006878` (`rgb(0, 104, 120)`) & `#0e7490` (cyan-700) — Section headers, dark accents, dividers.
- **Dark Slate / Charcoal**: `#1f2937` (`rgb(31, 41, 55)`) & `#1d1e20` — Typography, dark cards, footer backgrounds.
- **Neutral Light**: `#f8fafc` (page background), `#f1f1f1` (card background), `#dadce0` (borders).
- **Star Accent**: `#eb6a00` / `#ffcd35` (ratings & warnings).
- **Emergency / Danger**: `#d63163` / `#e11d48`.

### B. Typography
- **Headings**: `Poppins`, `Playfair Display`, system serif/sans fallback.
- **Body & Controls**: `Inter`, `Poppins`, `Mukta`.

### C. Imagery & Logo Assets
- **Logo SVG**: `https://assets.zyrosite.com/vtF3h6oQS5Sywmg7/ai-logo-NusS0BmfhEJjEM6C.svg`
- **Logo PNG**: `https://assets.zyrosite.com/cdn-cgi/image/format=auto,w=768,fit=crop/vtF3h6oQS5Sywmg7/logo1-Xs4vKUSrlS4y3rBC.png`
- **Operatory / Chair**: `https://assets.zyrosite.com/cdn-cgi/image/format=auto,w=1920,fit=crop/vtF3h6oQS5Sywmg7/img_0485-jQQqzrcR4zr941OS.jpg`
- **Consultation Room**: `https://assets.zyrosite.com/cdn-cgi/image/format=auto,w=1440,fit=crop/vtF3h6oQS5Sywmg7/img_0487-ZDPaL1u2a9uj3nzg.jpg`
- **Clinic Interior**: `https://assets.zyrosite.com/cdn-cgi/image/format=auto,w=1440,fit=crop/vtF3h6oQS5Sywmg7/20260629_122043-bI1vUd7fVWoOJK77.jpg`

---

## 6. Information Marked as Needing Clinic Confirmation (Made Fully Configurable)

1. **Treatment Pricing**: Indian dental clinics determine costs during in-person clinical assessment based on material grade and tooth complexity. Prices are kept configurable in the database and displayed as "Consultation-based" unless explicitly assigned a fee.
2. **Service Duration Defaults**: Default standard duration is set to 30 minutes for consultations, 45-60 minutes for root canal/surgery, fully configurable by clinic admin in `services` table.
3. **Staff Official Institutional Emails**: Default seed accounts provided for administration (`admin@kumardentalclinic.com`), doctors (`dr.kumar@kumardentalclinic.com`, `dr.neha@kumardentalclinic.com`), and reception (`reception@kumardentalclinic.com`). Passwords must be hashed via Argon2id.
4. **Third-Party SMS/WhatsApp Provider Credentials**: Placed behind pluggable provider interface (`SmsProvider`, `WhatsAppProvider`) with local development mock/sandbox and configuration via environment variables.
