FROM python:3.12-slim
WORKDIR /app

# ADDED libcairo2-dev, pkg-config, and python3-dev for PyCairo and PDF generation
RUN apt-get update && apt-get install -y \
    libpq-dev \
    gcc \
    libcairo2-dev \
    pkg-config \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt gunicorn

COPY . .
RUN chmod +x entrypoint.sh

EXPOSE 8000
