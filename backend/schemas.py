from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional

class TransactionBase(BaseModel):
    amount: float
    description: str
    category: str
    is_private: bool = False

class TransactionCreate(TransactionBase):
    user_id: int
    family_id: int

class Transaction(TransactionBase):
    id: int
    timestamp: datetime
    user_id: int
    family_id: int
    
    class Config:
        orm_mode = True

class UserBase(BaseModel):
    name: str
    email: str

class UserCreate(UserBase):
    family_id: int

class User(UserBase):
    id: int
    family_id: int
    
    class Config:
        orm_mode = True

class FamilyBase(BaseModel):
    name: str
    budget_limit: float

class FamilyCreate(FamilyBase):
    pass

class Family(FamilyBase):
    id: int
    users: List[User] = []
    
    class Config:
        orm_mode = True

class DashboardStats(BaseModel):
    total_spend: float
    budget_limit: float
    category_breakdown: dict
    recent_activity: List[Transaction]
