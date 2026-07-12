import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import engine, SessionLocal, Base
import models
from passlib.context import CryptContext
from datetime import date, timedelta

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

def get_password_hash(password):
    return pwd_context.hash(password)

def init_db():
    print("Creating tables...")
    Base.metadata.create_all(bind=engine)
    print("Tables created.")

    db = SessionLocal()
    
    # Check if we already have data
    if db.query(models.User).first():
        print("Database already seeded.")
        db.close()
        return

    print("Seeding initial data...")
    # 1. Users
    roles = ["Fleet Manager", "Dispatcher", "Safety Officer", "Financial Analyst"]
    for role in roles:
        user = models.User(
            name=f"{role.split()[0]} User",
            email=f"{role.lower().replace(' ', '')}@transitops.com",
            password_hash=get_password_hash("password123"),
            role=role
        )
        db.add(user)
    
    # Add a global admin just in case
    admin = models.User(
        name="Admin",
        email="admin@transitops.com",
        password_hash=get_password_hash("admin"),
        role="Fleet Manager"
    )
    db.add(admin)

    # 2. Vehicles
    vehicles = [
        models.Vehicle(reg_no="VAN-05", name="Ford Transit", type="Van", max_load_capacity_kg=500.0, odometer=12000.0, acquisition_cost=25000.0, status="Available"),
        models.Vehicle(reg_no="TRK-01", name="Volvo FH16", type="Truck", max_load_capacity_kg=15000.0, odometer=45000.0, acquisition_cost=120000.0, status="Available"),
        models.Vehicle(reg_no="TRK-02", name="Scania R450", type="Truck", max_load_capacity_kg=12000.0, odometer=85000.0, acquisition_cost=90000.0, status="In Shop"),
        models.Vehicle(reg_no="VAN-01", name="Sprinter", type="Van", max_load_capacity_kg=800.0, odometer=25000.0, acquisition_cost=30000.0, status="On Trip"),
        models.Vehicle(reg_no="VAN-02", name="Sprinter OLD", type="Van", max_load_capacity_kg=800.0, odometer=250000.0, acquisition_cost=15000.0, status="Retired")
    ]
    db.add_all(vehicles)

    # 3. Drivers
    drivers = [
        models.Driver(name="Alex Smith", license_no="DL-12345", license_category="C1", license_expiry=date.today() + timedelta(days=365), contact="9876543210", safety_score=95.0, status="Available"),
        models.Driver(name="John Doe", license_no="DL-67890", license_category="CE", license_expiry=date.today() + timedelta(days=500), contact="9876543211", safety_score=88.5, status="Available"),
        models.Driver(name="Mike Johnson", license_no="DL-11223", license_category="B", license_expiry=date.today() - timedelta(days=10), contact="9876543212", safety_score=75.0, status="Off Duty"), # Expired
        models.Driver(name="Sarah Williams", license_no="DL-44556", license_category="C1", license_expiry=date.today() + timedelta(days=100), contact="9876543213", safety_score=98.0, status="On Trip")
    ]
    db.add_all(drivers)

    # 4. Settings
    settings = models.Settings(
        depot_name="Central HQ",
        currency="USD",
        distance_unit="km"
    )
    db.add(settings)
    
    db.commit()
    print("Seeding complete.")
    db.close()

if __name__ == "__main__":
    init_db()
