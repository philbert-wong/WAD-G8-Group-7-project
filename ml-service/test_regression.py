import numpy as np
import pytest

from app import app
from regression import fit_lease_decay, fit_price_trends, to_frame

TOWNS = ["ANG MO KIO", "BEDOK"]
FLAT_TYPES = ["3 ROOM", "4 ROOM"]


def synthetic_columns(n=4000, seed=0):
    """Prices generated from known coefficients so the fits can be checked."""
    rng = np.random.default_rng(seed)
    town = rng.choice(TOWNS, n)
    flat_type = rng.choice(FLAT_TYPES, n)
    t = rng.uniform(0, 9, n)
    lease = rng.uniform(45, 95, n)
    area = np.where(flat_type == "3 ROOM", 68, 92) + rng.normal(0, 4, n)
    storey = rng.choice([2, 5, 8, 11, 14], n)
    psm = 3000 + 40 * lease + 150 * t + 10 * storey + np.where(town == "BEDOK", -200, 0)
    price = psm * area + rng.normal(0, 2000, n)
    return {
        "town": town.tolist(), "flatType": flat_type.tolist(), "t": t.tolist(),
        "remainingLease": lease.tolist(), "floorArea": area.tolist(),
        "storeyMid": storey.tolist(), "price": price.tolist(),
    }


def test_price_trend_one_model_per_town_and_flat_type():
    models = fit_price_trends(to_frame(synthetic_columns()))
    assert {(m["town"], m["flatType"]) for m in models} == {(t, f) for t in TOWNS for f in FLAT_TYPES}
    for m in models:
        assert m["pricePerYear"] > 0
        assert m["r2"] > 0.9


def test_lease_decay_recovers_lease_coefficient():
    model = fit_lease_decay(to_frame(synthetic_columns()))
    assert model["leaseCoefPsm"] == pytest.approx(40, abs=2)
    assert model["townEffects"]["BEDOK"] == pytest.approx(-200, abs=10)
    effects = [p["effectPsm"] for p in model["curve"]]
    assert effects == sorted(effects), "shorter leases should be worth less per sqm"
    assert model["curve"][-1]["remainingLease"] == model["referenceLeaseYear"]


def test_rejects_missing_columns():
    cols = synthetic_columns(100)
    del cols["price"]
    with pytest.raises(ValueError, match="price"):
        to_frame(cols)


def test_api_returns_400_on_bad_payload():
    client = app.test_client()
    assert client.post("/fit/price-trend", json={"rows": []}).status_code == 400


def test_api_fits_price_trend():
    client = app.test_client()
    res = client.post("/fit/price-trend", json={"columns": synthetic_columns(400)})
    assert res.status_code == 200
    assert len(res.get_json()["models"]) == 4
