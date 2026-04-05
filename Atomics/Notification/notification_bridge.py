"""
Notification Bridge
===================
Consumes notification events from RabbitMQ and forwards them to
the OutSystems Notification Service via HTTP POST.

Message format expected from RabbitMQ:
{
    "user_id": "...",
    "email": "...",
    "type": "tap_out | auto_topup | concession | lost_card",
    "message": "..."
}
"""

import json
import os
import time
import pika
import requests

RABBITMQ_URL      = os.environ.get("RABBITMQ_URL", "amqp://guest:guest@rabbitmq:5672/")
QUEUE_NAME        = os.environ.get("QUEUE_NAME", "notifications")
OUTSYSTEMS_URL    = os.environ.get("OUTSYSTEMS_NOTIFICATION_URL", "")


def forward_to_outsystems(payload: dict):
    """Forward notification payload to OutSystems REST API."""
    if not OUTSYSTEMS_URL:
        print(f"[WARN] OUTSYSTEMS_NOTIFICATION_URL not set. Payload: {payload}")
        return

    try:
        res = requests.post(
            OUTSYSTEMS_URL,
            json=payload,
            timeout=10,
            headers={"Content-Type": "application/json"}
        )
        print(f"[INFO] OutSystems response: {res.status_code} — {res.text}")
    except requests.exceptions.RequestException as e:
        print(f"[ERROR] Failed to reach OutSystems: {e}")


def on_message(channel, method, properties, body):
    """Callback when a message is received from RabbitMQ."""
    try:
        payload = json.loads(body)
        print(f"[INFO] Received notification: {payload}")
        forward_to_outsystems(payload)
        channel.basic_ack(delivery_tag=method.delivery_tag)
    except json.JSONDecodeError:
        print(f"[ERROR] Invalid JSON received: {body}")
        channel.basic_nack(delivery_tag=method.delivery_tag, requeue=False)


def connect_with_retry():
    """Connect to RabbitMQ with retry logic."""
    while True:
        try:
            params = pika.URLParameters(RABBITMQ_URL)
            connection = pika.BlockingConnection(params)
            print("[INFO] Connected to RabbitMQ")
            return connection
        except Exception as e:
            print(f"[WARN] RabbitMQ not ready, retrying in 5s... ({e})")
            time.sleep(5)


def main():
    connection = connect_with_retry()
    channel = connection.channel()

    channel.queue_declare(queue=QUEUE_NAME, durable=True)
    channel.basic_qos(prefetch_count=1)
    channel.basic_consume(queue=QUEUE_NAME, on_message_callback=on_message)

    print(f"[INFO] Waiting for messages on queue '{QUEUE_NAME}'...")
    channel.start_consuming()


if __name__ == "__main__":
    main()
