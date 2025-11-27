FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code to /app/backend
COPY . ./backend

# Set python path to /app so 'backend' package is found
ENV PYTHONPATH=/app

# Expose port
EXPOSE 8080

# Cloud Run expects port 8080 by default
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8080"]
