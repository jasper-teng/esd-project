"""
Fare Service — Pure Computation Engine (Atomic Microservice)
============================================================
IS213 SimplyGo EZ-Link Transit Card Management System

This service has NO database. It loads fare rules from fare_config.json
and exposes REST endpoints for fare calculation.

Key design principle: Fare Service receives distance as INPUT — it does NOT
call external APIs (LTA Distance API). That responsibility belongs to the
composite orchestrator (Handle Transit).

Endpoints:
  POST /fare/calculate  — Calculate fare for a single trip or journey
  POST /fare/recalculate — Batch recalculate fares (used by Scenario 2 refund)
  GET  /fare/health      — Health check
"""

import json
import os
from flask import Flask, request, jsonify
from datetime import datetime

app = Flask(__name__)

# ─── Load config ────────────────────────────────────────────────────────────
CONFIG_PATH = os.environ.get("FARE_CONFIG_PATH", "fare_config.json")

with open(CONFIG_PATH, "r") as f:
    CONFIG = json.load(f)

FARE_TABLES = CONFIG["fare_tables"]
TRANSFER_RULES = CONFIG["transfer_rules"]
PRE_PEAK = CONFIG["pre_peak_discount"]
MAX_FARES = CONFIG["maximum_fares"]


# ─── Core calculation functions ─────────────────────────────────────────────

def lookup_fare(distance_km: float, concession_type: str, service_type: str = "basic") -> float:
    """
    Look up the fare from the distance-based fare table.
    
    Args:
        distance_km: Cumulative journey distance in km
        concession_type: One of 'adult', 'student', 'senior', 'workfare', 'child'
        service_type: 'basic' or 'express'
    
    Returns:
        Fare in SGD
    """
    concession_type = concession_type.lower()
    service_type = service_type.lower()

    if concession_type not in FARE_TABLES:
        raise ValueError(f"Unknown concession type: {concession_type}")

    table = FARE_TABLES[concession_type].get(service_type)
    if table is None:
        raise ValueError(f"Unknown service type: {service_type}")

    # Walk through the fare bands — return the first one where distance fits
    for band in table:
        if band["max_distance_km"] is None or distance_km <= band["max_distance_km"]:
            return band["fare"]

    # Fallback: return maximum fare (should not reach here if config is correct)
    return table[-1]["fare"]


def calculate_fare(
    distance_km: float,
    concession_type: str,
    service_type: str = "basic",
    is_continuation: bool = False,
    previous_cumulative_distance_km: float = 0.0,
    tap_in_time: str = None,
    transport_mode: str = "bus",
    is_weekday: bool = True,
    is_public_holiday: bool = False
) -> dict:
    """
    Calculate fare for a trip, accounting for journey continuity and pre-peak discount.
    
    The key insight: under Singapore's distance-based fare system, when a trip is
    a valid transfer (continuation), you pay the MARGINAL fare — i.e., the fare for
    the cumulative distance minus what you already paid for the previous legs.
    
    Args:
        distance_km: Distance of THIS trip leg (not cumulative)
        concession_type: 'adult', 'student', 'senior', 'workfare', 'child'
        service_type: 'basic' or 'express'
        is_continuation: Whether this trip is a valid transfer within an ongoing journey
        previous_cumulative_distance_km: Total distance of previous legs in this journey
        tap_in_time: HH:MM format, for pre-peak discount check
        transport_mode: 'bus' or 'train' (for pre-peak discount — only applies to rail)
        is_weekday: Whether today is a weekday
        is_public_holiday: Whether today is a public holiday
    
    Returns:
        dict with fare breakdown
    """
    result = {
        "concession_type": concession_type,
        "service_type": service_type,
        "trip_distance_km": distance_km,
        "is_continuation": is_continuation,
        "previous_cumulative_distance_km": previous_cumulative_distance_km,
        "cumulative_distance_km": 0.0,
        "base_fare": 0.0,
        "pre_peak_discount": 0.0,
        "final_fare": 0.0,
        "fare_already_paid": 0.0,
        "amount_to_deduct": 0.0
    }

    if is_continuation:
        # Journey continuation: fare is based on CUMULATIVE distance
        cumulative = previous_cumulative_distance_km + distance_km
        result["cumulative_distance_km"] = cumulative

        fare_for_cumulative = lookup_fare(cumulative, concession_type, service_type)
        fare_already_paid = lookup_fare(previous_cumulative_distance_km, concession_type, service_type)

        result["base_fare"] = fare_for_cumulative
        result["fare_already_paid"] = fare_already_paid
        # Marginal fare: only charge the difference
        marginal_fare = round(fare_for_cumulative - fare_already_paid, 2)
        # Marginal fare should never be negative (in theory distances only increase)
        marginal_fare = max(marginal_fare, 0.0)
        result["amount_to_deduct"] = marginal_fare
    else:
        # New journey: fare is simply based on this trip's distance
        result["cumulative_distance_km"] = distance_km
        fare = lookup_fare(distance_km, concession_type, service_type)
        result["base_fare"] = fare
        result["fare_already_paid"] = 0.0
        result["amount_to_deduct"] = fare

    # ─── Apply pre-peak discount ──────────────────────────────────
    # Only applies to rail legs, weekdays, non-public-holidays, tap-in before 07:45
    pre_peak_applied = False
    discount = 0.0

    if (
        PRE_PEAK["enabled"]
        and transport_mode == "train"
        and is_weekday
        and not is_public_holiday
        and tap_in_time is not None
    ):
        try:
            tap_time = datetime.strptime(tap_in_time, "%H:%M").time()
            cutoff = datetime.strptime(PRE_PEAK["tap_in_before"], "%H:%M").time()
            if tap_time < cutoff:
                # Discount is min($0.50, rail leg fare)
                rail_leg_fare = result["amount_to_deduct"]
                discount = min(PRE_PEAK["discount_amount"], rail_leg_fare)
                discount = round(discount, 2)
                pre_peak_applied = True
        except ValueError:
            pass  # Invalid time format — skip discount

    result["pre_peak_discount"] = discount
    result["pre_peak_applied"] = pre_peak_applied
    result["final_fare"] = round(result["amount_to_deduct"] - discount, 2)
    # Final fare should not go below zero
    result["final_fare"] = max(result["final_fare"], 0.0)
    # Amount to actually deduct from wallet
    result["amount_to_deduct"] = result["final_fare"]

    return result


def get_maximum_fare(concession_type: str, service_type: str = "basic") -> float:
    """Get the maximum fare for incomplete trips (missing tap-out penalty)."""
    concession_type = concession_type.lower()
    service_type = service_type.lower()
    if concession_type in MAX_FARES:
        return MAX_FARES[concession_type].get(service_type, MAX_FARES["adult"]["basic"])
    return MAX_FARES["adult"]["basic"]


# ─── REST Endpoints ─────────────────────────────────────────────────────────

@app.route("/fare/calculate", methods=["POST"])
def api_calculate_fare():
    """
    Calculate fare for a single trip.

    Request body (JSON):
        distance_km (float, required): Distance of this trip leg
        concession_type (str, required): adult|student|senior|workfare|child
        service_type (str, optional): basic|express (default: basic)
        is_continuation (bool, optional): true if valid transfer (default: false)
        previous_cumulative_distance_km (float, optional): previous journey distance (default: 0)
        tap_in_time (str, optional): HH:MM format
        transport_mode (str, optional): bus|train (default: bus)
        is_weekday (bool, optional): default true
        is_public_holiday (bool, optional): default false

    Returns:
        JSON fare breakdown
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({"code": 400, "message": "Request body is required"}), 400

        distance_km = data.get("distance_km")
        concession_type = data.get("concession_type", "adult")
        service_type = data.get("service_type", "basic")
        is_continuation = data.get("is_continuation", False)
        previous_cumulative_distance_km = data.get("previous_cumulative_distance_km", 0.0)
        tap_in_time = data.get("tap_in_time", None)
        transport_mode = data.get("transport_mode", "bus")
        is_weekday = data.get("is_weekday", True)
        is_public_holiday = data.get("is_public_holiday", False)

        if distance_km is None or distance_km < 0:
            return jsonify({
                "code": 400,
                "message": "distance_km is required and must be >= 0"
            }), 400

        result = calculate_fare(
            distance_km=distance_km,
            concession_type=concession_type,
            service_type=service_type,
            is_continuation=is_continuation,
            previous_cumulative_distance_km=previous_cumulative_distance_km,
            tap_in_time=tap_in_time,
            transport_mode=transport_mode,
            is_weekday=is_weekday,
            is_public_holiday=is_public_holiday
        )

        return jsonify({
            "code": 200,
            "data": result
        }), 200

    except ValueError as e:
        return jsonify({
            "code": 400,
            "message": str(e)
        }), 400
    except Exception as e:
        return jsonify({
            "code": 500,
            "message": f"Internal error: {str(e)}"
        }), 500


@app.route("/fare/recalculate", methods=["POST"])
def api_recalculate_fares():
    """
    Batch recalculate fares for multiple trips — used by Scenario 2 (concession refund).
    
    When a student's concession is approved, Process Concession needs to:
    1. Get all trips charged at adult fare since the application date
    2. Recalculate each trip's fare using the student concession rate
    3. Compute the refund difference
    
    Request body (JSON):
    {
        "trips": [
            {
                "trip_id": "uuid-123",
                "distance_km": 8.5,
                "original_concession_type": "adult",
                "new_concession_type": "student",
                "service_type": "basic",
                "tap_in_time": "08:30",
                "transport_mode": "train",
                "is_weekday": true,
                "is_public_holiday": false,
                "is_continuation": false,
                "previous_cumulative_distance_km": 0.0
            }
        ]
    }
    
    Returns:
    {
        "code": 200,
        "data": {
            "total_refund": 3.45,
            "recalculated_trips": [...]
        }
    }
    """
    try:
        data = request.get_json()
        if not data or "trips" not in data:
            return jsonify({
                "code": 400,
                "message": "Request body must contain 'trips' array"
            }), 400

        recalculated = []
        total_refund = 0.0

        for trip in data["trips"]:
            trip_id = trip.get("trip_id", "unknown")
            distance_km = trip.get("distance_km", 0)
            original_type = trip.get("original_concession_type", "adult")
            new_type = trip.get("new_concession_type", "student")
            service_type = trip.get("service_type", "basic")
            tap_in_time = trip.get("tap_in_time")
            transport_mode = trip.get("transport_mode", "bus")
            is_weekday = trip.get("is_weekday", True)
            is_public_holiday = trip.get("is_public_holiday", False)
            is_continuation = trip.get("is_continuation", False)
            prev_distance = trip.get("previous_cumulative_distance_km", 0.0)

            # Calculate original fare (what was charged)
            original = calculate_fare(
                distance_km=distance_km,
                concession_type=original_type,
                service_type=service_type,
                is_continuation=is_continuation,
                previous_cumulative_distance_km=prev_distance,
                tap_in_time=tap_in_time,
                transport_mode=transport_mode,
                is_weekday=is_weekday,
                is_public_holiday=is_public_holiday
            )

            # Calculate new fare (with concession)
            new = calculate_fare(
                distance_km=distance_km,
                concession_type=new_type,
                service_type=service_type,
                is_continuation=is_continuation,
                previous_cumulative_distance_km=prev_distance,
                tap_in_time=tap_in_time,
                transport_mode=transport_mode,
                is_weekday=is_weekday,
                is_public_holiday=is_public_holiday
            )

            refund = round(original["amount_to_deduct"] - new["amount_to_deduct"], 2)
            refund = max(refund, 0.0)  # No negative refunds
            total_refund += refund

            recalculated.append({
                "trip_id": trip_id,
                "original_fare": original["amount_to_deduct"],
                "new_fare": new["amount_to_deduct"],
                "refund_amount": refund,
                "original_concession_type": original_type,
                "new_concession_type": new_type,
                "distance_km": distance_km
            })

        total_refund = round(total_refund, 2)

        return jsonify({
            "code": 200,
            "data": {
                "total_refund": total_refund,
                "trip_count": len(recalculated),
                "recalculated_trips": recalculated
            }
        }), 200

    except Exception as e:
        return jsonify({
            "code": 500,
            "message": f"Internal error: {str(e)}"
        }), 500


@app.route("/fare/max", methods=["GET"])
def api_max_fare():
    """
    Get maximum fare for a concession type (used for incomplete trip settlement).
    
    Query params:
        concession_type (str): adult|student|senior|workfare|child
        service_type (str, optional): basic|express (default: basic)
    """
    concession_type = request.args.get("concession_type", "adult")
    service_type = request.args.get("service_type", "basic")

    try:
        max_fare = get_maximum_fare(concession_type, service_type)
        return jsonify({
            "code": 200,
            "data": {
                "concession_type": concession_type,
                "service_type": service_type,
                "maximum_fare": max_fare
            }
        }), 200
    except Exception as e:
        return jsonify({
            "code": 500,
            "message": str(e)
        }), 500


@app.route("/fare/transfer-rules", methods=["GET"])
def api_transfer_rules():
    """Return the transfer validation rules (for reference / UI display)."""
    return jsonify({
        "code": 200,
        "data": TRANSFER_RULES
    }), 200


@app.route("/fare/health", methods=["GET"])
def health_check():
    """Health check endpoint."""
    return jsonify({
        "code": 200,
        "service": "fare-service",
        "status": "healthy",
        "config_version": CONFIG.get("_metadata", {}).get("version", "unknown"),
        "effective_date": CONFIG.get("_metadata", {}).get("effective_date", "unknown")
    }), 200


# ─── Main ───────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print(f"Fare Service starting — config version {CONFIG['_metadata']['version']}")
    print(f"Fare tables loaded for: {list(FARE_TABLES.keys())}")
    app.run(host="0.0.0.0", port=5004, debug=True)
