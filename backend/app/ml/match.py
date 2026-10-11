from pathlib import Path
import pickle

_MODEL = None
_PATH = Path(__file__).resolve().parent / "match_model.pkl"

def _load():
    global _MODEL
    if _MODEL is None:
        with open(_PATH, "rb") as f:
            _MODEL = pickle.load(f)
    return _MODEL

def score_match(dest_sim: float, date_overlap_days: int, tag_sim: float, seats_ratio: float) -> dict:
    """
    dest_sim, tag_sim, seats_ratio: 0..1
    date_overlap_days: 0..n
    """
    model = _load()
    raw = float(model.predict([[dest_sim, date_overlap_days, tag_sim, seats_ratio]])[0])
    score = max(0, min(100, round(raw)))

    reasons = []
    if dest_sim >= 0.8:
        reasons.append("same destination")
    elif dest_sim >= 0.4:
        reasons.append("nearby destination")
    if date_overlap_days >= 3:
        reasons.append(f"{date_overlap_days} days overlap")
    if tag_sim >= 0.5:
        reasons.append("shared interests")
    if seats_ratio > 0:
        reasons.append("seats available")

    return {
        "score": score,
        "reason": ", ".join(reasons) or "low overlap",
        "features": {
            "destination": round(dest_sim, 2),
            "dateOverlapDays": date_overlap_days,
            "tags": round(tag_sim, 2),
            "seats": round(seats_ratio, 2),
        },
    }