from datetime import time, date
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models.user import User, UserRole
from app.models.profile import DoctorProfile, StaffProfile, PatientProfile
from app.models.service import Service, DoctorAvailability, ClinicSetting

def seed_database(db: Session = None):
    close_db = False
    if db is None:
        db = SessionLocal()
        close_db = True

    try:
        # 1. Clinic Settings
        existing_setting = db.query(ClinicSetting).first()
        if not existing_setting:
            setting = ClinicSetting(
                clinic_name="Kumar Dental Clinic",
                tagline="Three generations of Vadodara families trust Kumar Dental Clinic for honest advice, gentle treatment & lasting results.",
                phone_primary="+91 98240 37497",
                phone_secondary="+91 95120 37497",
                phone_landline="+91 265 2314153",
                email="contact@kumardentalclinic.com",
                address="A-6, Yogeshwar Jyot Society, Near Mother's School, Gotri, Vadodara - 390021, Gujarat, India",
                google_maps_url="https://maps.google.com/maps?q=Kumar%20Dental%20Clinic,%20A-6,%20Yogeshwar%20Jyot%20Society,%20Near%20Mother%27s%20School,%20Gotri,%20Vadodara%20-%20390021,%20Gujarat&t=m&z=13&ie=UTF8&output=embed",
                booking_buffer_minutes=15,
                max_advance_booking_days=30
            )
            db.add(setting)
            db.commit()

        # 2. Verified Clinical Services
        services_data = [
            {
                "name": "General Dentistry",
                "slug": "general-dentistry",
                "category": "General",
                "description": "Comprehensive oral exams, regular checkups, professional teeth cleaning, and maintenance for lasting oral health.",
                "duration_minutes": 30,
                "display_order": 1
            },
            {
                "name": "Preventive Care",
                "slug": "preventive-care",
                "category": "Preventive",
                "description": "Proactive dental sealants, topical fluoride treatments, and cleanings to stop dental issues before their development starts.",
                "duration_minutes": 30,
                "display_order": 2
            },
            {
                "name": "Root Canal Treatment (RCT)",
                "slug": "root-canal-treatment",
                "category": "Endodontics",
                "description": "Painless endodontic therapy utilizing advanced rotary instruments to save severely decayed or infected natural teeth.",
                "duration_minutes": 60,
                "display_order": 3
            },
            {
                "name": "Cosmetic Dentistry",
                "slug": "cosmetic-dentistry",
                "category": "Cosmetic",
                "description": "Enhance your smile aesthetics with modern porcelain veneers, composite bonding, and conservative whitening procedures.",
                "duration_minutes": 45,
                "display_order": 4
            },
            {
                "name": "Dental Fillings",
                "slug": "dental-fillings",
                "category": "Restorative",
                "description": "Tooth-colored composite restorations that blend seamlessly with enamel to repair cavities and minor fractures.",
                "duration_minutes": 30,
                "display_order": 5
            },
            {
                "name": "Tooth Extraction & Wisdom Surgery",
                "slug": "tooth-extraction",
                "category": "Surgery",
                "description": "Safe, gentle removal of unsalvageable teeth and surgical extraction of impacted wisdom molars with minimal discomfort.",
                "duration_minutes": 45,
                "display_order": 6
            },
            {
                "name": "Dentures & Prosthetics",
                "slug": "dentures-and-prosthetics",
                "category": "Prosthodontics",
                "description": "Custom complete dentures, removable partial dentures, crowns, bridges, and fixed prosthetic replacements.",
                "duration_minutes": 45,
                "display_order": 7
            },
            {
                "name": "Orthodontic Treatment",
                "slug": "orthodontic-treatment",
                "category": "Orthodontics",
                "description": "Straighten misaligned teeth and correct bite malocclusions with personalized metal/ceramic braces and aligner consultations.",
                "duration_minutes": 45,
                "display_order": 8
            },
            {
                "name": "Gum Care (Periodontics)",
                "slug": "gum-care",
                "category": "Periodontics",
                "description": "Periodontal scaling, deep root planing, and therapies to manage gingival inflammation and secure bone support.",
                "duration_minutes": 45,
                "display_order": 9
            },
            {
                "name": "Pediatric Dentistry",
                "slug": "pediatric-dentistry",
                "category": "Pediatric",
                "description": "Compassionate, gentle dental care for children focused on fear-free visits, caries prevention, and early habit guidance.",
                "duration_minutes": 30,
                "display_order": 10
            },
            {
                "name": "Smile Improvement & Design",
                "slug": "smile-improvement",
                "category": "Cosmetic",
                "description": "Comprehensive digital smile makeovers combining restorative, whitening, and periodontal aesthetics tailored to your face.",
                "duration_minutes": 60,
                "display_order": 11
            },
            {
                "name": "All Types of Dental Surgery",
                "slug": "dental-surgery",
                "category": "Surgery",
                "description": "Advanced oral surgical procedures including modern dental implants, pre-implant bone grafting, and soft tissue grafting.",
                "duration_minutes": 60,
                "display_order": 12
            }
        ]

        for s_data in services_data:
            existing = db.query(Service).filter(Service.slug == s_data["slug"]).first()
            if not existing:
                service = Service(**s_data)
                db.add(service)
        db.commit()

        # 3. Staff Users & Profiles
        # Administrator
        admin_user = db.query(User).filter(User.email == "admin@kumardentalclinic.com").first()
        if not admin_user:
            admin_user = User(
                email="admin@kumardentalclinic.com",
                password_hash=hash_password("KumarAdmin@2026"),
                role=UserRole.ADMIN.value,
                is_active=True,
                is_verified=True
            )
            db.add(admin_user)
            db.flush()
            admin_profile = StaffProfile(
                user_id=admin_user.id,
                first_name="Clinic",
                last_name="Administrator",
                department="Management"
            )
            db.add(admin_profile)

        # Receptionist
        rec_user = db.query(User).filter(User.email == "reception@kumardentalclinic.com").first()
        if not rec_user:
            rec_user = User(
                email="reception@kumardentalclinic.com",
                password_hash=hash_password("Reception@2026"),
                role=UserRole.RECEPTIONIST.value,
                is_active=True,
                is_verified=True
            )
            db.add(rec_user)
            db.flush()
            rec_profile = StaffProfile(
                user_id=rec_user.id,
                first_name="Pooja",
                last_name="Patel",
                department="Front Desk"
            )
            db.add(rec_profile)

        # Chief Dentist: Dr. Kumar M. Tipnis
        dr_kumar_user = db.query(User).filter(User.email == "dr.kumar@kumardentalclinic.com").first()
        if not dr_kumar_user:
            dr_kumar_user = User(
                email="dr.kumar@kumardentalclinic.com",
                password_hash=hash_password("DrKumar@2026"),
                role=UserRole.DOCTOR.value,
                is_active=True,
                is_verified=True
            )
            db.add(dr_kumar_user)
            db.flush()
            dr_kumar_profile = DoctorProfile(
                user_id=dr_kumar_user.id,
                full_name="Dr. Kumar M. Tipnis",
                qualification="BDS (Manipal University)",
                registration_number="GDC-VAD-1988-1024",
                specialization="Chief Dental Surgeon & Conservative Dentistry",
                experience_years=37,
                bio="Alumnus of Manipal College of Dental Sciences with over 37 years dedicated to ethical, conservative dentistry and patient-centered oral health."
            )
            db.add(dr_kumar_profile)
            db.flush()

            # Add Doctor Availability (Mon-Sat 10:00-13:00 and 17:00-20:00)
            for day in range(1, 7):  # 1=Monday to 6=Saturday
                # Morning slot
                db.add(DoctorAvailability(
                    doctor_id=dr_kumar_profile.id,
                    day_of_week=day,
                    start_time=time(10, 0),
                    end_time=time(13, 0),
                    slot_duration_minutes=30
                ))
                # Evening slot
                db.add(DoctorAvailability(
                    doctor_id=dr_kumar_profile.id,
                    day_of_week=day,
                    start_time=time(17, 0),
                    end_time=time(20, 0),
                    slot_duration_minutes=30
                ))

        # Associate Dentist: Dr. Neha Parlekar
        dr_neha_user = db.query(User).filter(User.email == "dr.neha@kumardentalclinic.com").first()
        if not dr_neha_user:
            dr_neha_user = User(
                email="dr.neha@kumardentalclinic.com",
                password_hash=hash_password("DrNeha@2026"),
                role=UserRole.DOCTOR.value,
                is_active=True,
                is_verified=True
            )
            db.add(dr_neha_user)
            db.flush()
            dr_neha_profile = DoctorProfile(
                user_id=dr_neha_user.id,
                full_name="Dr. Neha Parlekar",
                qualification="BDS",
                registration_number="GDC-VAD-2015-4589",
                specialization="Associate Dental Surgeon & Aesthetic Consultant",
                experience_years=9,
                bio="Brings a contemporary approach to aesthetic, restorative, and pediatric dentistry with a warm, reassuring patient experience."
            )
            db.add(dr_neha_profile)
            db.flush()

            for day in range(1, 7):
                db.add(DoctorAvailability(
                    doctor_id=dr_neha_profile.id,
                    day_of_week=day,
                    start_time=time(10, 0),
                    end_time=time(13, 0),
                    slot_duration_minutes=30
                ))
                db.add(DoctorAvailability(
                    doctor_id=dr_neha_profile.id,
                    day_of_week=day,
                    start_time=time(17, 0),
                    end_time=time(20, 0),
                    slot_duration_minutes=30
                ))

        # Pre-registered patient for testing (registered by doctor)
        patient_user = db.query(User).filter(User.phone == "+919876543210").first()
        if not patient_user:
            patient_user = User(
                phone="+919876543210",
                role=UserRole.PATIENT.value,
                is_active=True,
                is_verified=True
            )
            db.add(patient_user)
            db.flush()
            patient_profile = PatientProfile(
                user_id=patient_user.id,
                first_name="Ramesh",
                last_name="Patel",
                date_of_birth=date(1990, 5, 15),
                gender="Male",
                blood_group="B+",
                city="Vadodara",
                address="Near Gotri Road, Vadodara",
                allergies="None"
            )
            db.add(patient_profile)
            db.flush()

        db.commit()
        print("Database seed completed successfully with verified clinic information and registered patient.")
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise e
    finally:
        if close_db:
            db.close()


if __name__ == "__main__":
    seed_database()
