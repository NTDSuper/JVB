from sqlalchemy import text
from database import engine
from datetime import datetime, timedelta

future = datetime.now() + timedelta(minutes=10)
with engine.connect() as conn:
    conn.execute(text("UPDATE payments SET paid_at = :f WHERE status = 'pending'"), {"f": future})
    conn.commit()
print("OK - payment deadlines updated")