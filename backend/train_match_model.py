"""
Train the trip-match forest on labeled join/skip decisions.

Labels come from a hidden utility with interactions the linear baseline
cannot represent (place dominates coincidental date overlap; same-city
style clash is a reject). Run from backend/:

    python train_match_model.py
"""
from __future__ import annotations

import pickle
import sys
from datetime import date, timedelta
from math import exp
from pathlib import Path

import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, log_loss, roc_auc_score
from sklearn.model_selection import train_test_split

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

from app.ml.features import (  # noqa: E402
    FEATURE_NAMES,
    REGIONS,
    feature_vector,
)

rng = np.random.default_rng(42)

CITIES = [city for group in REGIONS.values() for city in sorted(group)]
STYLES = ["culture", "leisure", "adventure"]
N_ESTIMATORS = 120
MAX_DEPTH = 8
N_SAMPLES = 8000


def _city_region(city: str) -> str:
    for name, group in REGIONS.items():
        if city in group:
            return name
    return ""


def _same_region_city(city: str) -> str:
    region = _city_region(city)
    options = [c for c in REGIONS.get(region, {city}) if c != city]
    if not options:
        return city
    return str(rng.choice(options))


def _random_date() -> date:
    return date(2026, 1, 1) + timedelta(days=int(rng.integers(0, 540)))


def _add_days(start: date, n: int) -> date:
    return start + timedelta(days=int(n))


def _sigmoid(z: float) -> float:
    if z >= 20:
        return 1.0
    if z <= -20:
        return 0.0
    return 1.0 / (1.0 + exp(-z))


def join_probability(vector: list[float]) -> float:
    dest, overlap, tag, seats, month, duration = vector
    mismatch = 1.0 if dest >= 0.95 and tag < 0.35 else 0.0
    full = 1.0 if seats < 0.34 else 0.0
    logit = (
        -2.8
        + 3.8 * dest
        + 3.2 * dest * overlap
        + 1.0 * tag * dest
        + 0.5 * seats
        + 0.15 * month
        + 0.1 * duration
        - 6.0 * mismatch
        - 2.0 * full
    )
    return _sigmoid(logit)


def make_pair() -> tuple[list[float], int]:
    want_city = str(rng.choice(CITIES))
    want_start = _random_date()
    want_len = int(rng.integers(3, 11))
    want_end = _add_days(want_start, want_len - 1)
    n_interests = int(rng.integers(1, 3))
    interests = [str(s) for s in rng.choice(STYLES, size=n_interests, replace=False)]
    seats_needed = int(rng.integers(1, 5))

    scenario = float(rng.random())
    if scenario < 0.22:
        trip_city = want_city
        trip_start = _add_days(want_start, int(rng.integers(-2, 3)))
        trip_len = int(rng.integers(3, 11))
        trip_type = interests[0]
        seats = int(rng.integers(max(seats_needed, 1), 6))
    elif scenario < 0.40:
        trip_city = want_city
        trip_start = _add_days(want_start, int(rng.integers(-2, 3)))
        trip_len = int(rng.integers(3, 11))
        others = [s for s in STYLES if s not in interests]
        trip_type = str(rng.choice(others)) if others else str(rng.choice(STYLES))
        seats = int(rng.integers(1, 6))
    elif scenario < 0.55:
        trip_city = want_city
        trip_start = _add_days(want_end, int(rng.integers(10, 40)))
        trip_len = int(rng.integers(3, 9))
        trip_type = interests[0]
        seats = int(rng.integers(1, 6))
    elif scenario < 0.68:
        trip_city = _same_region_city(want_city)
        trip_start = _add_days(want_start, int(rng.integers(-2, 3)))
        trip_len = int(rng.integers(3, 11))
        trip_type = interests[0] if float(rng.random()) < 0.6 else str(rng.choice(STYLES))
        seats = int(rng.integers(0, 6))
    elif scenario < 0.80:
        far = [c for c in CITIES if _city_region(c) != _city_region(want_city)]
        trip_city = str(rng.choice(far if far else CITIES))
        trip_start = _add_days(want_start, int(rng.integers(-1, 2)))
        trip_len = int(rng.integers(3, 11))
        trip_type = str(rng.choice(STYLES))
        seats = int(rng.integers(0, 6))
    elif scenario < 0.90:
        trip_city = _same_region_city(want_city)
        trip_start = _add_days(want_end, int(rng.integers(20, 70)))
        trip_len = int(rng.integers(3, 9))
        trip_type = str(rng.choice(STYLES))
        seats = int(rng.integers(1, 6))
    else:
        trip_city = str(rng.choice(CITIES))
        trip_start = _random_date()
        trip_len = int(rng.integers(3, 11))
        trip_type = str(rng.choice(STYLES))
        seats = int(rng.integers(0, 6))
    trip_end = _add_days(trip_start, trip_len - 1)

    vector = feature_vector(
        want_city,
        want_start,
        want_end,
        interests,
        seats_needed,
        [trip_city],
        trip_start,
        trip_end,
        trip_type,
        seats,
    )
    p = join_probability(vector)
    y = 1 if float(rng.random()) < p else 0
    return vector, y


def metrics(y_true, proba, pred) -> dict:
    return {
        "accuracy": round(float(accuracy_score(y_true, pred)), 3),
        "roc_auc": round(float(roc_auc_score(y_true, proba)), 3),
        "log_loss": round(float(log_loss(y_true, proba)), 3),
    }


def main() -> None:
    X, y = [], []
    for _ in range(N_SAMPLES):
        features, label = make_pair()
        X.append(features)
        y.append(label)
    X = np.asarray(X, dtype=float)
    y = np.asarray(y, dtype=int)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    forest = RandomForestClassifier(
        n_estimators=N_ESTIMATORS,
        max_depth=MAX_DEPTH,
        min_samples_leaf=8,
        random_state=42,
        n_jobs=-1,
    )
    forest.fit(X_train, y_train)

    linear = LogisticRegression(max_iter=500, random_state=42)
    linear.fit(X_train, y_train)

    forest_p = forest.predict_proba(X_test)[:, 1]
    linear_p = linear.predict_proba(X_test)[:, 1]
    forest_m = metrics(y_test, forest_p, forest.predict(X_test))
    linear_m = metrics(y_test, linear_p, linear.predict(X_test))

    importances = {name: float(v) for name, v in zip(FEATURE_NAMES, forest.feature_importances_)}
    bundle = {
        "model": forest,
        "baseline": linear,
        "feature_names": list(FEATURE_NAMES),
        "feature_means": [float(v) for v in X_train.mean(axis=0)],
        "importances": importances,
        "n_estimators": N_ESTIMATORS,
        "max_depth": MAX_DEPTH,
        "metrics": {
            "n_train": int(len(X_train)),
            "n_test": int(len(X_test)),
            "positive_rate": round(float(y.mean()), 3),
            "forest": forest_m,
            "linear": linear_m,
        },
        "story": (
            "Travelers join a public crew when the place is right. Dates only help in that city — "
            "a Kyoto trip that merely shares October should not beat Coorg from Bangalore. "
            "A culture clash in the same city is still a skip. The forest learns those interactions; "
            "a linear baseline overweighting overlap cannot."
        ),
    }

    out = ROOT / "app" / "ml" / "match_model.pkl"
    out.parent.mkdir(parents=True, exist_ok=True)
    with open(out, "wb") as f:
        pickle.dump(bundle, f)

    print("saved", out)
    print("n_train", len(X_train), "n_test", len(X_test), "join_rate", round(float(y.mean()), 3))
    print("forest ", forest_m)
    print("linear ", linear_m)
    print("importances", {k: round(v, 3) for k, v in importances.items()})

    from app.ml.match import explain  # noqa: E402
    import app.ml.match as match_mod  # noqa: E402

    match_mod._BUNDLE = bundle
    aligned = [1.0, 1.0, 1.0, 1.0, 1.0, 1.0]
    wrong_month = [1.0, 0.0, 1.0, 1.0, 0.3, 1.0]
    clash = [1.0, 1.0, 0.0, 1.0, 1.0, 1.0]
    far = [0.15, 0.0, 0.4, 0.5, 0.5, 0.5]
    nearby = [0.85, 0.0, 0.0, 1.0, 0.67, 0.8]
    far_dates = [0.15, 1.0, 1.0, 1.0, 1.0, 1.0]
    for label, vec in (
        ("aligned Kyoto", aligned),
        ("same city, no overlap", wrong_month),
        ("same city, style clash", clash),
        ("other continent", far),
        ("Bangalore→Coorg", nearby),
        ("Bangalore→Kyoto dates", far_dates),
    ):
        e = explain(vec, days=7 if vec[1] > 0.5 else 0)
        print(f"{label:24} forest={e['score']:3}  linear={e['baselineScore']:3}  heuristic={e['heuristicScore']:3}")


if __name__ == "__main__":
    main()
