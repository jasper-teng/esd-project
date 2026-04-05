FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY notification_bridge.py .

CMD ["python", "notification_bridge.py"]
