FROM python:3.11-slim
WORKDIR /opt/app
# install python dependencies for the worker app
COPY worker/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
COPY worker/worker.py ./
COPY worker/security_engine.py ./
COPY backend/jwt/common_secrets.txt ./common_secrets.txt
ENV BACKEND_URL=http://backend:8000
CMD ["uvicorn", "worker:app", "--host", "0.0.0.0", "--port", "8000"]
