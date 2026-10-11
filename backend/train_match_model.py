"""
Train a small trip-match model and save match_model.pkl.
Run once:  python train_match_model.py
"""
from pathlib import Path
import pickle
import random

import numpy as np
from sklearn.ensemble import RandomForestRegressor

random.seed(42)
np.random.seed(42)

def make_example():
    dest = random.random()          # 1 = same city
    overlap = random.randint(0, 10) # days overlap
    tags = random.random()          # shared interests
    seats = random.random()         # seats available

    # Label we want the model to learn (0-100)
    score = (
        40 * dest
        + 30 * min(overlap, 7) / 7
        + 20 * tags
        + 10 * seats
        + random.uniform(-5, 5)
    )
    score = max(0, min(100, score))
    return [dest, overlap, tags, seats], score

X, y = [], []
for _ in range(800):
    features, score = make_example()
    X.append(features)
    y.append(score)

model = RandomForestRegressor(n_estimators=80, max_depth=6, random_state=42)
model.fit(X, y)

out = Path(__file__).resolve().parent / "app" / "ml" / "match_model.pkl"
out.parent.mkdir(parents=True, exist_ok=True)
with open(out, "wb") as f:
    pickle.dump(model, f)

print("saved", out)
print("sample score", round(model.predict([[1.0, 5, 0.8, 0.5]])[0], 1))