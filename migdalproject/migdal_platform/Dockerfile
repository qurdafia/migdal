FROM python:3.12-slim
WORKDIR /app

# STEP 1: Install System Dependencies
# Added 'ansible' so the container can actually run playbooks!
RUN apt-get update && apt-get install -y \
    libpq-dev \
    gcc \
    libcairo2-dev \
    pkg-config \
    python3-dev \
    openssh-client \
    sshpass \
    ansible \
    && rm -rf /var/lib/apt/lists/*

# STEP 2: Install Python Dependencies
COPY requirements.txt .

# We use the trusted-host flags here to ensure the RHEL server doesn't 
# hit SSL certificate errors during the build
RUN pip install --no-cache-dir \
    --trusted-host pypi.org \
    --trusted-host pypi.python.org \
    --trusted-host files.pythonhosted.org \
    -r requirements.txt gunicorn

# STEP 3: Copy Code and Set Permissions
COPY . .
RUN chmod +x entrypoint.sh

# Expose the port for the Web container
EXPOSE 8000