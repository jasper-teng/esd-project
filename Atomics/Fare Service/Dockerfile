FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY fare_service.py .
COPY fare_config.json .

EXPOSE 5004

CMD ["python", "fare_service.py"]
