# Migdal - Enterprise On-Premise Monitoring Platform

**Migdal** is a commercial-grade, on-premise monitoring solution designed for secure environments. It features a universal ingestion engine (Ansible-driven), an AI analysis layer, and a strict licensing enforcement system.

## 🏗 Architecture

* **Backend:** Django 5.0+ (Python)
* **Database:** PostgreSQL 15 (Dockerized) with Persistent Volumes
* **Caching:** Redis (Future Phase)
* **Frontend:** React (Future Phase)
* **Deployment:** Docker Compose (Single-Container Delivery)
* **Licensing:** Asymmetric Cryptography (RSA 2048-bit + JWT)

---

## 🚀 Development Setup

### 1. Prerequisites
* **Python 3.10+** installed.
* **Docker Desktop** installed and **running** (Check for the whale icon).
* **OpenSSL** (or use the included Python key generator).

### 2. Environment Initialization
```bash
# Clone repository
git clone <repo_url>
cd migdal_platform

# Create Virtual Environment
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install Dependencies
pip install -r requirements.txt