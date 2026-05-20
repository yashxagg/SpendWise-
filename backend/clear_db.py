import models
from database import SessionLocal, engine

def clear():
    print("Clearing all data from SpendWise...")
    models.Base.metadata.drop_all(bind=engine)
    models.Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    # Create the initial family again so the app works
    family = models.Family(name="Aggarwal Family", budget_limit=50000.0)
    db.add(family)
    db.commit()
    
    # Create the initial user (You)
    yash = models.User(name="Yash", email="yash@spendwise.com", family_id=family.id)
    db.add(yash)
    db.commit()
    
    print("Database cleared! Aggarwal Family re-initialized with 1 member (Yash).")
    db.close()

if __name__ == "__main__":
    clear()
