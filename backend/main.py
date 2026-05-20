from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import models, schemas, database
from database import engine, get_db
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import json
from dotenv import load_dotenv

load_dotenv()

# Create tables
models.Base.metadata.create_all(bind=engine)

# Auto-seed database if empty
from database import SessionLocal
db = SessionLocal()
try:
    if not db.query(models.Family).first():
        family = models.Family(name="Aggarwal Family", budget_limit=50000.0)
        db.add(family)
        db.commit()
        yash = models.User(name="Yash", email="yash@spendwise.com", family_id=family.id)
        db.add(yash)
        db.commit()
finally:
    db.close()

app = FastAPI(title="SpendWise API")

# CORS middleware for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Welcome to SpendWise API"}

@app.post("/reset")
def reset_database():
    import models
    from database import engine, SessionLocal
    
    # Drop and recreate tables
    models.Base.metadata.drop_all(bind=engine)
    models.Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        # Create the initial family
        family = models.Family(name="Aggarwal Family", budget_limit=50000.0)
        db.add(family)
        db.commit()
        
        # Create the initial user
        yash = models.User(name="Yash", email="yash@spendwise.com", family_id=family.id)
        db.add(yash)
        db.commit()
        
        return {"message": "Database reset successfully"}
    finally:
        db.close()

# Family Endpoints
@app.post("/families/", response_model=schemas.Family)
def create_family(family: schemas.FamilyCreate, db: Session = Depends(get_db)):
    db_family = models.Family(name=family.name, budget_limit=family.budget_limit)
    db.add(db_family)
    db.commit()
    db.refresh(db_family)
    return db_family

@app.get("/families/first", response_model=schemas.Family)
def get_first_family(db: Session = Depends(get_db)):
    family = db.query(models.Family).first()
    if not family:
        raise HTTPException(status_code=404, detail="Family not found")
    return family

@app.get("/families/{family_id}", response_model=schemas.Family)
def get_family(family_id: int, db: Session = Depends(get_db)):
    family = db.query(models.Family).filter(models.Family.id == family_id).first()
    if not family:
        raise HTTPException(status_code=404, detail="Family not found")
    return family

@app.patch("/families/{family_id}", response_model=schemas.Family)
def update_family(family_id: int, data: dict, db: Session = Depends(get_db)):
    db_family = db.query(models.Family).filter(models.Family.id == family_id).first()
    if not db_family:
        raise HTTPException(status_code=404, detail="Family not found")
    
    if "budget_limit" in data:
        db_family.budget_limit = data["budget_limit"]
    if "name" in data:
        db_family.name = data["name"]
        
    db.commit()
    db.refresh(db_family)
    return db_family

# User Endpoints
@app.post("/users/", response_model=schemas.User)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = models.User(**user.dict())
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

# Transaction Endpoints
@app.post("/transactions/", response_model=schemas.Transaction)
def create_transaction(transaction: schemas.TransactionCreate, db: Session = Depends(get_db)):
    db_transaction = models.Transaction(**transaction.dict())
    db.add(db_transaction)
    db.commit()
    db.refresh(db_transaction)
    return db_transaction

@app.get("/families/{family_id}/transactions", response_model=List[schemas.Transaction])
def get_family_transactions(family_id: int, db: Session = Depends(get_db)):
    return db.query(models.Transaction).filter(
        models.Transaction.family_id == family_id,
        models.Transaction.is_private == False
    ).order_by(models.Transaction.timestamp.desc()).all()

# Dashboard Stats
@app.get("/families/{family_id}/dashboard", response_model=schemas.DashboardStats)
def get_dashboard_stats(family_id: int, db: Session = Depends(get_db)):
    family = db.query(models.Family).filter(models.Family.id == family_id).first()
    if not family:
        raise HTTPException(status_code=404, detail="Family not found")
    
    transactions = db.query(models.Transaction).filter(
        models.Transaction.family_id == family_id,
        models.Transaction.is_private == False
    ).all()
    
    total_spend = sum(t.amount for t in transactions)
    
    category_breakdown = {}
    for t in transactions:
        category_breakdown[t.category] = category_breakdown.get(t.category, 0) + t.amount
        
    recent_activity = sorted(transactions, key=lambda x: x.timestamp, reverse=True)[:10]
    
    return {
        "total_spend": total_spend,
        "budget_limit": family.budget_limit,
        "category_breakdown": category_breakdown,
        "recent_activity": recent_activity
    }

class AIQuery(BaseModel):
    query: str

@app.post("/families/{family_id}/ask-ai")
def ask_ai(family_id: int, query_data: AIQuery, db: Session = Depends(get_db)):
    family = db.query(models.Family).filter(models.Family.id == family_id).first()
    if not family:
        raise HTTPException(status_code=404, detail="Family not found")
        
    transactions = db.query(models.Transaction).filter(models.Transaction.family_id == family_id).all()
    tx_list = []
    for t in transactions:
        tx_list.append({
            "amount": t.amount,
            "category": t.category,
            "description": t.description,
            "date": t.timestamp.strftime("%Y-%m-%d")
        })
        
    context = json.dumps(tx_list)
    api_key = os.environ.get("GROQ_API_KEY")
    
    if not api_key:
        return {"answer": f"(MOCK AI MODE - Set GROQ_API_KEY in backend/.env to use real AI) You have {len(transactions)} total transactions. To answer '{query_data.query}', I can see your budget is ₹{family.budget_limit}."}
        
    try:
        from groq import Groq
        client = Groq(api_key=api_key)
        prompt = f"You are the SpendWise AI Family Advisor. Keep your answers concise, friendly, and helpful. Answer the user's question based strictly on this JSON transaction history for their family (Budget: {family.budget_limit}): {context}\n\nUser Question: {query_data.query}"
        
        chat_completion = client.chat.completions.create(
            messages=[
                {
                    "role": "user",
                    "content": prompt,
                }
            ],
            model="llama-3.1-8b-instant",
        )
        return {"answer": chat_completion.choices[0].message.content}
    except Exception as e:
        return {"answer": f"Error calling AI: {str(e)}"}
