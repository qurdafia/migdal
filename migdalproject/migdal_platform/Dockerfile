FROM python:3.12-slim
WORKDIR /app

# ADDED openssh-client and sshpass for the Ansible Automation Engine
# MAINTAINED libcairo2-dev, pkg-config, and python3-dev for PyCairo/PDF generation
RUN apt-get update && apt-get install -y \
    libpq-dev \
    gcc \
    libcairo2-dev \
    pkg-config \
    python3-dev \
    openssh-client \
    sshpass \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt gunicorn
# RUN pip install --no-cache-dir --trusted-host pypi.org --trusted-host pypi.python.org --trusted-host files.pythonhosted.org -r requirements.txt

COPY . .
RUN chmod +x entrypoint.sh

EXPOSE 8000