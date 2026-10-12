from __future__ import annotations

import pickle
from datetime import date
from pathlib import Path

from app.ml.features import (
    FEATURE_LABELS,
    FEATURE_NAMES,
    dest_sim,
    feature_vector,
    heuristic_score,
    overlap_days,
)

_BUNDLE = None
_PATH = Path(__file__).resolve().parent / "match_model.pkl"


def _load() -> dict:
    global _BUNDLE
    if _BUNDLE is None:
        with open(_PATH, "rb") as f:
            raw = pickle.load(f)
        if not isinstance(raw, dict) or "model" not in raw:
            raise RuntimeError("match_model.pkl is stale — run backend/train_match_model.py")
        _BUNDLE = raw
    return _BUNDLE


def _proba(model, vector: list[float]) -> float:
    return float(model.predict_proba([vector])[0, 1])


def _reason(vector: list[float], days: int) -> str:
    dest, overlap, tag, seats = vector[0], vector[1], vector[2], vector[3]
    bits: list[str] = []
    if dest >= 0.99:
        bits.append("same city")
    elif dest >= 0.75:
        bits.append("nearby city")
    elif dest >= 0.5:
        bits.append("same region")
    if days:
        bits.append(f"{days} overlapping day" + ("" if days == 1 else "s"))
    if tag >= 0.7:
        bits.append("matching style")
    elif tag < 0.35 and dest >= 0.95:
        bits.append("style clash")
    if seats < 0.34:
        bits.append("short on seats")
    elif seats >= 1:
        bits.append("seats open")
    return ", ".join(bits) or "weak overlap"


def explain(vector: list[float], days: int = 0) -> dict:
    bundle = _load()
    forest = bundle["model"]
    linear = bundle["baseline"]
    means = bundle["feature_means"]
    forest_p = _proba(forest, vector)
    linear_p = _proba(linear, vector)
    signals = []
    for i, name in enumerate(FEATURE_NAMES):
        dropped = list(vector)
        dropped[i] = means[i]
        contribution = forest_p - _proba(forest, dropped)
        signals.append(
            {
                "id": name,
                "label": FEATURE_LABELS[name],
                "value": round(vector[i] * 100),
                "contribution": round(contribution * 100, 1),
            }
        )
    return {
        "score": max(0, min(100, round(forest_p * 100))),
        "baselineScore": max(0, min(100, round(linear_p * 100))),
        "heuristicScore": max(0, min(100, round(heuristic_score(vector)))),
        "reason": _reason(vector, days),
        "signals": signals,
        "overlapDays": days,
        "features": {name: round(vector[i], 2) for i, name in enumerate(FEATURE_NAMES)},
    }


def score_trip(
    wanted_city: str,
    start: date,
    end: date,
    interests: list[str],
    seats_needed: int,
    cities: list[str],
    trip_start: date,
    trip_end: date,
    trip_type: str | None,
    seats: int,
    wanted_ll: tuple[float, float] | None = None,
    trip_points: list[tuple[float, float]] | None = None,
) -> dict:
    vector = feature_vector(
        wanted_city,
        start,
        end,
        interests,
        seats_needed,
        cities,
        trip_start,
        trip_end,
        trip_type,
        seats,
        wanted_ll,
        trip_points,
    )
    days = overlap_days(start, end, trip_start, trip_end)
    dest = dest_sim(wanted_city, cities, wanted_ll, trip_points)
    scored = explain(vector, days)
    nearby = days == 0 and dest >= 0.6
    scored["bucket"] = "overlap" if days else ("nearby" if nearby else "other")
    scored["destSim"] = round(dest, 3)
    return scored


def model_card() -> dict:
    bundle = _load()
    return {
        "algorithm": "RandomForestClassifier",
        "nEstimators": bundle.get("n_estimators"),
        "maxDepth": bundle.get("max_depth"),
        "features": [
            {"id": name, "label": FEATURE_LABELS[name], "importance": round(bundle["importances"][name], 3)}
            for name in FEATURE_NAMES
        ],
        "metrics": bundle["metrics"],
        "story": bundle.get("story", ""),
        "nTrain": bundle["metrics"]["n_train"],
        "nTest": bundle["metrics"]["n_test"],
    }
