FROM python:3.11-slim

WORKDIR /app

# Tối ưu Python
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Copy dependency trước để tận dụng Docker cache
COPY requirements.txt .

# Cài dependencies
RUN pip install --upgrade pip && \
    pip install -r requirements.txt

# Copy source
COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]