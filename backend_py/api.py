from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
import models, schemas
from passlib.context import CryptContext
from datetime import datetime, timedelta
from jose import JWTError, jwt
from typing import List

SECRET_KEY = "supersecretkey_transitops_app" # Should be in env var ideally
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 # 1 day

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")
router = APIRouter()

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_current_user(token: str, db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = db.query(models.User).filter(models.User.email == email).first()
    if user is None:
        raise credentials_exception
    return user

# --- Auth ---
from pydantic import BaseModel
class LoginRequest(BaseModel):
    email: str
    password: str

@router.post("/auth/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == req.email).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email, "role": user.role}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer", "user": {"name": user.name, "role": user.role, "email": user.email}}

@router.get("/auth/me", response_model=schemas.User)
def read_users_me(token: str, db: Session = Depends(get_db)):
    return get_current_user(token, db)

# --- RBAC Helper ---
def require_role(roles: List[str]):
    def role_checker(token: str, db: Session = Depends(get_db)):
        user = get_current_user(token, db)
        if user.role not in roles and "Fleet Manager" not in user.role: # Fleet manager has all access
            raise HTTPException(status_code=403, detail="Not enough permissions")
        return user
    return role_checker

# --- Dashboard ---
@router.get("/dashboard")
def get_dashboard(token: str, db: Session = Depends(get_db)):
    user = get_current_user(token, db)
    
    total_vehicles = db.query(models.Vehicle).count()
    available_vehicles = db.query(models.Vehicle).filter(models.Vehicle.status == "Available").count()
    in_shop_vehicles = db.query(models.Vehicle).filter(models.Vehicle.status == "In Shop").count()
    on_trip_vehicles = db.query(models.Vehicle).filter(models.Vehicle.status == "On Trip").count()
    retired_vehicles = db.query(models.Vehicle).filter(models.Vehicle.status == "Retired").count()
    
    active_trips = db.query(models.Trip).filter(models.Trip.status == "Dispatched").count()
    pending_trips = db.query(models.Trip).filter(models.Trip.status == "Draft").count()
    
    drivers_on_duty = db.query(models.Driver).filter(models.Driver.status == "On Trip").count()
    
    utilization = 0
    if total_vehicles > 0:
        utilization = round((on_trip_vehicles / total_vehicles) * 100, 1)

    recent_trips = db.query(models.Trip).order_by(models.Trip.created_at.desc()).limit(5).all()
    recent_trips_data = []
    for t in recent_trips:
        recent_trips_data.append({
            "id": t.id,
            "trip_code": t.trip_code,
            "vehicle": t.vehicle.reg_no if t.vehicle else "Unassigned",
            "driver": t.driver.name if t.driver else "Unassigned",
            "status": t.status,
            "eta": "2 hrs" if t.status == "Dispatched" else "-"
        })

    return {
        "kpis": {
            "active_vehicles": total_vehicles - retired_vehicles,
            "available_vehicles": available_vehicles,
            "in_maintenance": in_shop_vehicles,
            "active_trips": active_trips,
            "pending_trips": pending_trips,
            "drivers_on_duty": drivers_on_duty,
            "utilization": utilization
        },
        "vehicle_status": {
            "Available": available_vehicles,
            "On Trip": on_trip_vehicles,
            "In Shop": in_shop_vehicles,
            "Retired": retired_vehicles
        },
        "recent_trips": recent_trips_data
    }

# --- Vehicles ---
@router.get("/vehicles", response_model=List[schemas.Vehicle])
def read_vehicles(token: str, db: Session = Depends(get_db)):
    user = get_current_user(token, db)
    return db.query(models.Vehicle).all()

@router.post("/vehicles", response_model=schemas.Vehicle)
def create_vehicle(vehicle: schemas.VehicleCreate, token: str, db: Session = Depends(get_db)):
    user = require_role(["Fleet Manager"])(token, db)
    db_vehicle = models.Vehicle(**vehicle.model_dump())
    db.add(db_vehicle)
    db.commit()
    db.refresh(db_vehicle)
    return db_vehicle

# --- Drivers ---
@router.get("/drivers", response_model=List[schemas.Driver])
def read_drivers(token: str, db: Session = Depends(get_db)):
    user = get_current_user(token, db)
    return db.query(models.Driver).all()

@router.post("/drivers", response_model=schemas.Driver)
def create_driver(driver: schemas.DriverCreate, token: str, db: Session = Depends(get_db)):
    user = require_role(["Fleet Manager", "Safety Officer"])(token, db)
    db_driver = models.Driver(**driver.model_dump())
    db.add(db_driver)
    db.commit()
    db.refresh(db_driver)
    return db_driver

# --- Trips ---
@router.get("/trips", response_model=List[schemas.Trip])
def read_trips(token: str, db: Session = Depends(get_db)):
    user = get_current_user(token, db)
    return db.query(models.Trip).all()

@router.post("/trips")
def create_trip(trip: schemas.TripCreate, token: str, db: Session = Depends(get_db)):
    user = require_role(["Dispatcher", "Fleet Manager"])(token, db)
    
    vehicle = db.query(models.Vehicle).filter(models.Vehicle.id == trip.vehicle_id).first()
    driver = db.query(models.Driver).filter(models.Driver.id == trip.driver_id).first()
    
    if not vehicle or vehicle.status != "Available":
        raise HTTPException(status_code=400, detail="Vehicle is not available")
    if not driver or driver.status != "Available" or driver.license_expiry < datetime.now().date():
        raise HTTPException(status_code=400, detail="Driver is not available or license expired")
    
    if trip.cargo_weight_kg > vehicle.max_load_capacity_kg:
        raise HTTPException(status_code=400, detail=f"Cargo exceeds capacity by {trip.cargo_weight_kg - vehicle.max_load_capacity_kg} kg")
    
    trip_count = db.query(models.Trip).count() + 1
    new_trip = models.Trip(**trip.model_dump(), trip_code=f"TRP-{trip_count:04d}", status="Dispatched")
    
    # Auto status transition
    vehicle.status = "On Trip"
    driver.status = "On Trip"
    
    db.add(new_trip)
    db.commit()
    db.refresh(new_trip)
    return new_trip

@router.post("/trips/{trip_id}/complete")
def complete_trip(trip_id: int, completion: schemas.TripComplete, token: str, db: Session = Depends(get_db)):
    user = require_role(["Dispatcher", "Fleet Manager"])(token, db)
    trip = db.query(models.Trip).filter(models.Trip.id == trip_id).first()
    
    if not trip or trip.status != "Dispatched":
        raise HTTPException(status_code=400, detail="Trip not active")
        
    vehicle = trip.vehicle
    driver = trip.driver
    
    trip.status = "Completed"
    trip.final_odometer = completion.final_odometer
    trip.fuel_consumed = completion.fuel_consumed
    trip.completed_at = datetime.utcnow()
    
    vehicle.status = "Available"
    vehicle.odometer = completion.final_odometer
    
    driver.status = "Available"
    
    # Create fuel log and expense
    fuel_cost = completion.fuel_consumed * 1.5 # Dummy price
    new_fuel = models.FuelLog(vehicle_id=vehicle.id, date=datetime.now().date(), liters=completion.fuel_consumed, cost=fuel_cost)
    db.add(new_fuel)
    
    new_expense = models.Expense(trip_id=trip.id, vehicle_id=vehicle.id, total=fuel_cost, status="Active")
    db.add(new_expense)
    
    db.commit()
    return {"message": "Trip completed"}

@router.post("/trips/{trip_id}/cancel")
def cancel_trip(trip_id: int, token: str, db: Session = Depends(get_db)):
    user = require_role(["Dispatcher", "Fleet Manager"])(token, db)
    trip = db.query(models.Trip).filter(models.Trip.id == trip_id).first()
    
    if not trip or trip.status != "Dispatched":
        raise HTTPException(status_code=400, detail="Trip not active")
        
    trip.status = "Cancelled"
    trip.vehicle.status = "Available"
    trip.driver.status = "Available"
    
    db.commit()
    return {"message": "Trip cancelled"}

# --- Maintenance ---
@router.get("/maintenance", response_model=List[schemas.MaintenanceLog])
def read_maintenance(token: str, db: Session = Depends(get_db)):
    user = get_current_user(token, db)
    return db.query(models.MaintenanceLog).all()

@router.post("/maintenance")
def create_maintenance(maint: schemas.MaintenanceLogCreate, token: str, db: Session = Depends(get_db)):
    user = require_role(["Fleet Manager"])(token, db)
    vehicle = db.query(models.Vehicle).filter(models.Vehicle.id == maint.vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
        
    new_maint = models.MaintenanceLog(**maint.model_dump())
    
    if maint.status == "Active":
        vehicle.status = "In Shop"
        
    db.add(new_maint)
    db.commit()
    db.refresh(new_maint)
    return new_maint

@router.post("/maintenance/{maint_id}/close")
def close_maintenance(maint_id: int, token: str, db: Session = Depends(get_db)):
    user = require_role(["Fleet Manager"])(token, db)
    maint = db.query(models.MaintenanceLog).filter(models.MaintenanceLog.id == maint_id).first()
    if not maint:
        raise HTTPException(status_code=404, detail="Maintenance log not found")
        
    maint.status = "Closed"
    vehicle = maint.vehicle
    if vehicle.status != "Retired":
        vehicle.status = "Available"
        
    db.commit()
    return {"message": "Maintenance closed"}

# --- Expenses & Fuel ---
@router.get("/fuel", response_model=List[schemas.FuelLog])
def read_fuel(token: str, db: Session = Depends(get_db)):
    user = get_current_user(token, db)
    return db.query(models.FuelLog).all()

@router.post("/fuel")
def create_fuel(fuel: schemas.FuelLogBase, token: str, db: Session = Depends(get_db)):
    user = require_role(["Financial Analyst", "Fleet Manager"])(token, db)
    new_fuel = models.FuelLog(**fuel.model_dump())
    db.add(new_fuel)
    db.commit()
    return new_fuel

@router.get("/expenses", response_model=List[schemas.Expense])
def read_expenses(token: str, db: Session = Depends(get_db)):
    user = get_current_user(token, db)
    return db.query(models.Expense).all()

@router.post("/expenses")
def create_expense(expense: schemas.ExpenseBase, token: str, db: Session = Depends(get_db)):
    user = require_role(["Financial Analyst", "Fleet Manager"])(token, db)
    expense.total = expense.toll + expense.other + expense.maintenance_linked_cost
    new_expense = models.Expense(**expense.model_dump())
    db.add(new_expense)
    db.commit()
    return new_expense

# --- Reports ---
@router.get("/reports")
def get_reports(token: str, db: Session = Depends(get_db)):
    user = require_role(["Financial Analyst", "Fleet Manager"])(token, db)
    
    total_fuel_cost = sum([f.cost for f in db.query(models.FuelLog).all()])
    total_maint_cost = sum([m.cost for m in db.query(models.MaintenanceLog).all()])
    op_cost = total_fuel_cost + total_maint_cost
    
    trips = db.query(models.Trip).filter(models.Trip.status == "Completed").all()
    total_dist = sum([t.final_odometer for t in trips if t.final_odometer]) # simplified
    total_fuel = sum([t.fuel_consumed for t in trips if t.fuel_consumed])
    fuel_efficiency = round(total_dist / total_fuel, 2) if total_fuel > 0 else 0
    
    return {
        "kpis": {
            "fuel_efficiency": fuel_efficiency,
            "fleet_utilization": 75.0, # dummy calculated above
            "operational_cost": op_cost,
            "vehicle_roi": 12.5 # dummy
        },
        "revenue_data": [
            {"month": "Jan", "rev": 4000},
            {"month": "Feb", "rev": 3000},
            {"month": "Mar", "rev": 5000}
        ],
        "costliest_vehicles": [
            {"reg_no": "TRK-01", "cost": 1500},
            {"reg_no": "VAN-05", "cost": 800}
        ]
    }
    
# --- Settings ---
@router.get("/settings", response_model=schemas.Settings)
def get_settings(token: str, db: Session = Depends(get_db)):
    user = get_current_user(token, db)
    return db.query(models.Settings).first()

@router.post("/settings", response_model=schemas.Settings)
def update_settings(settings: schemas.SettingsBase, token: str, db: Session = Depends(get_db)):
    user = require_role(["Fleet Manager"])(token, db)
    db_settings = db.query(models.Settings).first()
    db_settings.depot_name = settings.depot_name
    db_settings.currency = settings.currency
    db_settings.distance_unit = settings.distance_unit
    db.commit()
    db.refresh(db_settings)
    return db_settings
