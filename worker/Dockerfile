FROM python:3.11-slim
WORKDIR /opt/app
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*
# install jwttool dependencies and tool
RUN git clone https://github.com/ticarpi/jwt_tool /opt/jwt_tool \
    && pip install --no-cache-dir -r /opt/jwt_tool/requirements.txt
# install python dependencies for the worker app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY worker.py ./
ENV BACKEND_URL=http://backend:8000
CMD ["uvicorn", "worker:app", "--host", "0.0.0.0", "--port", "8000"]
