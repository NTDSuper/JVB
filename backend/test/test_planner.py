
import json
import sys
import os
from langchain_nvidia_ai_endpoints import ChatNVIDIA
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from dashboard.query import analyze_dashboard_query
# Add backend root to path so imports work

from dotenv import load_dotenv




print(result)