"""Flask microservice that fits the price models with scikit-learn.

It is stateless: the Node ingestion script (server/scripts/fit-models.js) reads the
transactions from MongoDB, POSTs them here as columns, and stores the returned
coefficients back in MongoDB. Express then serves those stored results, so this
service only has to be running while models are being (re)fitted.
"""

import os

from flask import Flask, jsonify, request

from regression import fit_lease_decay, fit_price_trends, to_frame

app = Flask(__name__)


def _frame_from_request():
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict) or not isinstance(payload.get("columns"), dict):
        raise ValueError('expected JSON body {"columns": {...}}')
    return to_frame(payload["columns"])


@app.errorhandler(ValueError)
def bad_request(err):
    return jsonify(error=str(err)), 400


@app.get("/health")
def health():
    return jsonify(status="ok")


@app.post("/fit/price-trend")
def price_trend():
    models = fit_price_trends(_frame_from_request())
    return jsonify(models=models)


@app.post("/fit/lease-decay")
def lease_decay():
    return jsonify(model=fit_lease_decay(_frame_from_request()))


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=int(os.environ.get("PORT", 5001)), debug=os.environ.get("FLASK_DEBUG") == "1")
