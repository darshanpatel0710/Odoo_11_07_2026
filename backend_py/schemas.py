from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import date, datetime

class UserBase(BaseModel):
    name: str
    email: EmailStr
    role: str

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    class Config:
        from_attributes = True

class VehicleBase(BaseModel):
    reg_no: str
    name: str
    type: str
    max_load_capacity_kg: float
    odometer: float
    acquisition_cost: float
    status: str = "Available"

class VehicleCreate(VehicleBase):
    pass

class Vehicle(VehicleBase):
    id: int
    class Config:
        from_attributes = True

class DriverBase(BaseModel):
    name: str
    license_no: str
    license_category: str
    license_expiry: date
    contact: str
    safety_score: float = 100.0
    status: str = "Available"

class DriverCreate(DriverBase):
    pass

class Driver(DriverBase):
    id: int
    class Config:
        from_attributes = True

class TripBase(BaseModel):
    source: str
    destination: str
    vehicle_id: int
    driver_id: int
    cargo_weight_kg: float
    planned_distance_km: float

class TripCreate(TripBase):
    pass

class Trip(TripBase):
    id: int
    trip_code: str
    status: str
    final_odometer: Optional[float] = None
    fuel_consumed: Optional[float] = None
    created_at: datetime
    completed_at: Optional[datetime] = None
    class Config:
        from_attributes = True

class TripComplete(BaseModel):
    final_odometer: float
    fuel_consumed: float

class MaintenanceLogBase(BaseModel):
    vehicle_id: int
    service_type: str
    cost: float
    date: date
    status: str = "Active"

class MaintenanceLogCreate(MaintenanceLogBase):
    pass

class MaintenanceLog(MaintenanceLogBase):
    id: int
    class Config:
        from_attributes = True

class FuelLogBase(BaseModel):
    vehicle_id: int
    date: date
    liters: float
    cost: float

class FuelLog(FuelLogBase):
    id: int
    class Config:
        from_attributes = True

class ExpenseBase(BaseModel):
    trip_id: Optional[int]
    vehicle_id: int
    toll: float = 0.0
    other: float = 0.0
    maintenance_linked_cost: float = 0.0
    total: float = 0.0
    status: str = "Active"

class Expense(ExpenseBase):
    id: int
    class Config:
        from_attributes = True

class SettingsBase(BaseModel):
    depot_name: str
    currency: str
    distance_unit: str

class Settings(SettingsBase):
    id: int
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None
