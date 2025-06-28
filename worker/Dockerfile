FROM python:3.11-slim
WORKDIR /opt/app
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*
# install jwttool dependencies and tool
RUN git clone https://github.com/ticarpi/jwt_tool /opt/jwt_tool \
    && pip install --no-cache-dir -r /opt/jwt_tool/requirements.txt
# Pre-create jwt_tool config to avoid logo/setup output on first run
RUN python3 /opt/jwt_tool/jwt_tool.py --bare || true
# install python dependencies for the worker app
COPY worker/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
COPY worker/worker.py ./
COPY backend/jwt/common_secrets.txt ./common_secrets.txt
ENV BACKEND_URL=http://backend:8000
CMD ["uvicorn", "worker:app", "--host", "0.0.0.0", "--port", "8000"]
