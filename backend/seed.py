import models
from database import SessionLocal, engine

# Create tables
models.Base.metadata.drop_all(bind=engine) # Clear old data
models.Base.metadata.create_all(bind=engine)

def seed():
    db = SessionLocal()
    
    # Family
    family = models.Family(name="Aggarwal Family", budget_limit=50000.0) # Monthly budget in Rupees
    db.add(family)
    db.commit()
    db.refresh(family)
    
    # Users
    yash = models.User(name="Yash", email="yash@spendwise.com", family_id=family.id)
    father = models.User(name="Father", email="father@spendwise.com", family_id=family.id)
    brother = models.User(name="Brother", email="brother@spendwise.com", family_id=family.id)
    db.add_all([yash, father, brother])
    db.commit()
    
    # Transactions (Realistic Indian spending)
    transactions = [
        models.Transaction(amount=12500.0, description="BigBasket Monthly Grocery", category="Groceries", user_id=yash.id, family_id=family.id),
        models.Transaction(amount=4500.0, description="Electricity Bill - Tata Power", category="Utilities", user_id=father.id, family_id=family.id),
        models.Transaction(amount=2800.0, description="Swiggy - Weekend Dinner", category="Dining", user_id=brother.id, family_id=family.id),
        models.Transaction(amount=1200.0, description="Petrol - HP Pump", category="Transport", user_id=yash.id, family_id=family.id),
        models.Transaction(amount=3500.0, description="Netflix & Hotstar Annual", category="Entertainment", user_id=brother.id, family_id=family.id),
        models.Transaction(amount=500.0, description="Local Veggie Market", category="Groceries", user_id=father.id, family_id=family.id),
    ]
    db.add_all(transactions)
    db.commit()
    
    print("Database seeded with fresh Indian household data!")
    db.close()

if __name__ == "__main__":
    seed()
