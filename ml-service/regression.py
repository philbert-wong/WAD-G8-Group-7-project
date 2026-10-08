"""Multiple linear regression models for HDB resale prices (scikit-learn).

Input to every function is a pandas DataFrame with one row per resale transaction:
    town, flatType      categorical
    t                   years since Jan 2017 (e.g. 2023-07 -> 6.5)
    remainingLease      remaining lease in years at the time of sale
    floorArea           square metres
    storeyMid           midpoint of the storey range (e.g. "10 TO 12" -> 11)
    price               resale price in SGD
"""

import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression

REQUIRED_COLUMNS = ["town", "flatType", "t", "remainingLease", "floorArea", "storeyMid", "price"]
TREND_FEATURES = ["t", "remainingLease", "floorArea", "storeyMid"]
MIN_TREND_SAMPLES = 30
MIN_LEASE_YEAR_SAMPLES = 50


def to_frame(columns: dict) -> pd.DataFrame:
    """Build and validate a DataFrame from a {column: [values]} payload."""
    missing = [c for c in REQUIRED_COLUMNS if c not in columns]
    if missing:
        raise ValueError(f"missing columns: {', '.join(missing)}")
    lengths = {len(columns[c]) for c in REQUIRED_COLUMNS}
    if len(lengths) != 1:
        raise ValueError("all columns must have the same length")
    df = pd.DataFrame({c: columns[c] for c in REQUIRED_COLUMNS})
    for c in REQUIRED_COLUMNS[2:]:
        df[c] = pd.to_numeric(df[c], errors="raise")
    if df.empty:
        raise ValueError("no rows supplied")
    return df


def fit_price_trends(df: pd.DataFrame) -> list[dict]:
    """One model per (town, flat type): price ~ t + remainingLease + floorArea + storeyMid.

    The coefficient on t is the estimated market change in $/year for that town and
    flat type, holding lease, size and storey constant.
    """
    models = []
    for (town, flat_type), group in df.groupby(["town", "flatType"]):
        if len(group) < MIN_TREND_SAMPLES:
            continue
        X = group[TREND_FEATURES]
        y = group["price"]
        lr = LinearRegression().fit(X, y)
        coefs = {f: float(c) for f, c in zip(TREND_FEATURES, lr.coef_)}
        mean_price = float(y.mean())
        models.append({
            "town": town,
            "flatType": flat_type,
            "n": int(len(group)),
            "r2": float(lr.score(X, y)),
            "intercept": float(lr.intercept_),
            "coefficients": coefs,
            "featureMeans": {f: float(X[f].mean()) for f in TREND_FEATURES},
            "meanPrice": mean_price,
            "pricePerYear": coefs["t"],
            "pricePerYearPct": coefs["t"] / mean_price * 100,
            "tRange": [float(group["t"].min()), float(group["t"].max())],
        })
    return models


def _controls(df: pd.DataFrame) -> pd.DataFrame:
    """Control variables shared by both lease-decay models: town, flat type, size, storey, sale date."""
    dummies = pd.get_dummies(df[["town", "flatType"]], drop_first=True, dtype=float)
    return pd.concat([df[["t", "floorArea", "storeyMid"]], dummies], axis=1)


def fit_lease_decay(df: pd.DataFrame) -> dict:
    """Effect of remaining lease on price per sqm, controlling for town, flat type, size,
    storey and sale date.

    Two fits on the same data:
      * linear:  one $/sqm value per extra year of lease
      * curve:   one dummy per whole remaining-lease year, relative to the longest-lease
                 year, so the chart can show how the decay accelerates as leases run down
    """
    psm = df["price"] / df["floorArea"]
    controls = _controls(df)

    linear_X = pd.concat([df[["remainingLease"]], controls], axis=1)
    linear = LinearRegression().fit(linear_X, psm)
    linear_coefs = dict(zip(linear_X.columns, linear.coef_))

    lease_year = np.floor(df["remainingLease"]).astype(int)
    reference_year = int(lease_year.max())
    year_dummies = pd.get_dummies(lease_year, prefix="lease", dtype=float)
    year_dummies = year_dummies.drop(columns=f"lease_{reference_year}")
    curve_X = pd.concat([year_dummies, controls], axis=1)
    curve = LinearRegression().fit(curve_X, psm)
    curve_coefs = dict(zip(curve_X.columns, curve.coef_))

    counts = lease_year.value_counts()
    points = []
    for year in sorted(counts.index):
        if counts[year] < MIN_LEASE_YEAR_SAMPLES:
            continue
        effect = 0.0 if year == reference_year else float(curve_coefs[f"lease_{year}"])
        points.append({"remainingLease": int(year), "effectPsm": effect, "n": int(counts[year])})

    town_effects = {k.removeprefix("town_"): float(v) for k, v in linear_coefs.items() if k.startswith("town_")}
    flat_type_effects = {k.removeprefix("flatType_"): float(v) for k, v in linear_coefs.items() if k.startswith("flatType_")}

    return {
        "n": int(len(df)),
        "r2": float(linear.score(linear_X, psm)),
        "curveR2": float(curve.score(curve_X, psm)),
        "meanPricePsm": float(psm.mean()),
        "leaseCoefPsm": float(linear_coefs["remainingLease"]),
        "coefficients": {
            "t": float(linear_coefs["t"]),
            "floorArea": float(linear_coefs["floorArea"]),
            "storeyMid": float(linear_coefs["storeyMid"]),
        },
        "townEffects": town_effects,
        "flatTypeEffects": flat_type_effects,
        "referenceLeaseYear": reference_year,
        "curve": points,
    }
