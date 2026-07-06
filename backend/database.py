import logging
import os

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

logger = logging.getLogger(__name__)
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
print(DATABASE_URL)  # Debugging: print the database URL to ensure it's loaded correctly

engine = create_engine(DATABASE_URL, echo=False)


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


# Dependency – inject DB session each request
def get_db():
    db = SessionLocal()
    try:
        yield db
        logger.info("Database session created and yielded successfully")
    finally:
        db.close()
