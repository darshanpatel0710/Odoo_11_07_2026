from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Date, Boolean
from sqlalchemy.orm import relationship
import datetime
from database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100))
    email = Column(String(100), unique=True, index=True)
    password_hash = Column(String(255))
    role = Column(String(50)) # Fleet Manager, Dispatcher, Safety Officer, Financial Analyst

class Vehicle(Base):
    __tablename__ = "vehicles"
    id = Column(Integer, primary_key=True, index=True)
    reg_no = Column(String(50), unique=True, index=True)
    name = Column(String(100))
    type = Column(String(50))
    max_load_capacity_kg = Column(Float)
    odometer = Column(Float)
    acquisition_cost = Column(Float)
    status = Column(String(50), default="Available") # Available, On Trip, In Shop, Retired
    
    trips = relationship("Trip", back_populates="vehicle")
    maintenance_logs = relationship("MaintenanceLog", back_populates="vehicle")
    fuel_logs = relationship("FuelLog", back_populates="vehicle")

class Driver(Base):
    __tablename__ = "drivers"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100))
    license_no = Column(String(100), unique=True)
    license_category = Column(String(50))
    license_expiry = Column(Date)
    contact = Column(String(50))
    safety_score = Column(Float, default=100.0)
    status = Column(String(50), default="Available") # Available, On Trip, Off Duty, Suspended
    
    trips = relationship("Trip", back_populates="driver")

class Trip(Base):
    __tablename__ = "trips"
    id = Column(Integer, primary_key=True, index=True)
    trip_code = Column(String(50), unique=True, index=True)
    source = Column(String(255))
    destination = Column(String(255))
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"))
    driver_id = Column(Integer, ForeignKey("drivers.id"))
    cargo_weight_kg = Column(Float)
    planned_distance_km = Column(Float)
    status = Column(String(50), default="Draft") # Draft, Dispatched, Completed, Cancelled
    final_odometer = Column(Float, nullable=True)
    fuel_consumed = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    
    vehicle = relationship("Vehicle", back_populates="trips")
    driver = relationship("Driver", back_populates="trips")
    expense = relationship("Expense", back_populates="trip", uselist=False)

class MaintenanceLog(Base):
    __tablename__ = "maintenance_logs"
    id = Column(Integer, primary_key=True, index=True)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"))
    service_type = Column(String(100))
    cost = Column(Float)
    date = Column(Date)
    status = Column(String(50), default="Active") # Active, Closed
    
    vehicle = relationship("Vehicle", back_populates="maintenance_logs")

class FuelLog(Base):
    __tablename__ = "fuel_logs"
    id = Column(Integer, primary_key=True, index=True)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"))
    date = Column(Date)
    liters = Column(Float)
    cost = Column(Float)
    
    vehicle = relationship("Vehicle", back_populates="fuel_logs")

class Expense(Base):
    __tablename__ = "expenses"
    id = Column(Integer, primary_key=True, index=True)
    trip_id = Column(Integer, ForeignKey("trips.id"), nullable=True)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"))
    toll = Column(Float, default=0.0)
    other = Column(Float, default=0.0)
    maintenance_linked_cost = Column(Float, default=0.0)
    total = Column(Float, default=0.0)
    status = Column(String(50), default="Active")
    
    trip = relationship("Trip", back_populates="expense")
    vehicle = relationship("Vehicle")

class Settings(Base):
    __tablename__ = "settings"
    id = Column(Integer, primary_key=True, index=True)
    depot_name = Column(String(255))
    currency = Column(String(10))
    distance_unit = Column(String(10))
