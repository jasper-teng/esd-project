"""
Notification Bridge
===================
Consumes notification events from RabbitMQ and forwards them to
the OutSystems Notification Service via HTTP POST.

Expected message format from composites:
{
    "notification_type": "tap_out_complete | auto_topup_success | ...",
    "card_id": "EZ-0001",
    "recipient_email": "user@email.com",   # optional — defaults to noreply@simplygo.sg
    "subject": "Trip Completed",
    "body": "Jurong East to Raffles Place. Fare: SGD 1.45."
}

The bridge also normalises legacy fields so minor payload mismatches
are tolerated: type -> notification_type, message -> body.
"""

import json
import os
import time
import pika
import requests

RABBITMQ_URL      = os.environ.get("RABBITMQ_URL", "amqp://guest:guest@rabbitmq:5672/")
QUEUE_NAME        = os.environ.get("QUEUE_NAME", "notifications")
OUTSYSTEMS_URL    = os.environ.get("OUTSYSTEMS_NOTIFICATION_URL", "")

DEFAULT_SUBJECTS = {
    "tap_out_complete":       "Trip Completed",
    "auto_topup_success":     "Auto Top-Up Successful",
    "auto_topup_failed":      "Auto Top-Up Failed",
    "incomplete_journey":     "Incomplete Journey Charged",
    "concession_approved":    "Concession Card Approved",
    "interim_refund_credited":"Interim Fare Refund",
    "lost_card_blocked":      "Card Blocked and Balance Transferred",
}


def normalise(payload: dict) -> dict:
    """
    Ensure the payload matches the OutSystems field contract:
      notification_type, card_id, recipient_email, subject, body
    Fills defaults for any missing fields so OutSystems never gets a 500.
    """
    # Legacy field aliases
    if "notification_type" not in payload and "type" in payload:
        payload["notification_type"] = payload.pop("type")
    if "body" not in payload and "message" in payload:
        payload["body"] = payload.pop("message")

    notification_type = payload.get("notification_type", "notification")

    # Required fields with safe defaults
    payload.setdefault("notification_type", notification_type)
    payload.setdefault("card_id",           payload.get("card_id", "unknown"))
    payload.setdefault("recipient_email",   "noreply@simplygo.sg")
    payload.setdefault("subject",           DEFAULT_SUBJECTS.get(notification_type, "SimplyGo Notification"))
    payload.setdefault("body",              "")

    # Keep only the four fields OutSystems expects
    return {
        "notification_type": payload["notification_type"],
        "card_id":           str(payload["card_id"]),
        "recipient_email":   payload["recipient_email"],
        "subject":           payload["subject"],
        "body":              payload["body"],
    }


def forward_to_outsystems(payload: dict):
    """Normalise then forward notification payload to OutSystems REST API."""
    if not OUTSYSTEMS_URL:
        print(f"[WARN] OUTSYSTEMS_NOTIFICATION_URL not set. Payload: {payload}")
        return

    clean = normalise(payload)

    try:
        res = requests.post(
            OUTSYSTEMS_URL,
            json=clean,
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
