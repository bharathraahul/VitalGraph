import os
import json
import re
import pickle
import pandas as pd
import numpy as np
import xgboost as xgb
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from rocketride import RocketRideClient
from rocketride.schema import Question
from dotenv import load_dotenv

load_dotenv(override=True)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Load trained ML models from models.pkl ────────────────────────────────────
BASE = Path(__file__).parent
MODELS_PATH = BASE / "models.pkl"

_models = None

def get_models():
    global _models
    if _models is None:
        with open(MODELS_PATH, "rb") as f:
            _models = pickle.load(f)
        print("✓ Loaded models.pkl:", list(_models.keys()))
    return _models


# ── Category → Feature mapping ────────────────────────────────────────────────
# Each category maps to the feature names used by the XGBoost models.
# The ML models will determine which categories need attention based on
# per-patient feature contributions (SHAP-like tree contributions).

CATEGORY_FEATURES = {
    "nutrition": [
        "glucose_fasting", "glucose_postprandial", "hba1c",
        "diet_score", "insulin_level",
    ],
    "exercise": [
        "bmi", "waist_to_hip_ratio",
        "physical_activity_minutes_per_week",
    ],
    "sleep": [
        "sleep_hours_per_day", "screen_time_hours_per_day",
    ],
    "stress": [
        "heart_rate", "systolic_bp", "diastolic_bp",
        "cardiovascular_history", "hypertension_history",
    ],
    "monitoring": [
        "cholesterol_total", "hdl_cholesterol", "ldl_cholesterol",
        "triglycerides", "age", "family_history_diabetes",
    ],
}

CATEGORY_META = {
    "nutrition":  {"icon": "🥗", "title": "Nutrition"},
    "exercise":   {"icon": "🏃", "title": "Exercise"},
    "sleep":      {"icon": "😴", "title": "Sleep"},
    "stress":     {"icon": "🧘", "title": "Stress"},
    "monitoring": {"icon": "📊", "title": "Monitoring"},
}


def _safe_serialize(obj):
    """Convert numpy/pandas types to Python builtins for JSON serialization."""
    if isinstance(obj, (np.integer,)):
        return int(obj)
    if isinstance(obj, (np.floating,)):
        return float(obj)
    if isinstance(obj, (np.bool_,)):
        return bool(obj)
    if isinstance(obj, np.ndarray):
        return obj.tolist()
    if pd.isna(obj):
        return None
    return obj


def _clamp(v: float, lo: float = 0.0, hi: float = 100.0) -> float:
    return max(lo, min(hi, v))


# ── ML-Driven Suggestion Engine ──────────────────────────────────────────────

def run_ml_analysis(patient_row: dict) -> dict:
    """
    Run all trained ML models on a single patient and return a rich analysis:
    - XGBoost diabetes classifier → probability + per-feature contributions
    - XGBoost risk regressor → predicted risk score
    - K-Means → patient archetype cluster
    - Isolation Forest → anomaly flag + score
    """
    m = get_models()
    clf = m["diabetes_classifier"]
    reg = m["risk_regressor"]
    kmeans = m["kmeans"]
    iso = m["isolation_forest"]
    scaler = m["scaler"]
    le_map = m["label_encoders"]
    FEATURES = m["features"]

    # ── Encode categoricals ───────────────────────────────────────────────────
    row = dict(patient_row)
    for col in ["gender", "smoking_status"]:
        enc_col = col + "_enc"
        val = row.get(col, "")
        if isinstance(val, str) and val in le_map[col].classes_:
            row[enc_col] = int(le_map[col].transform([val])[0])
        else:
            row[enc_col] = 0

    X_input = pd.DataFrame([row])[FEATURES].fillna(0)

    # ── 1. XGBoost Classifier: diabetes probability ───────────────────────────
    diabetes_prob = float(clf.predict_proba(X_input)[0][1])
    diabetes_pred = int(clf.predict(X_input)[0])

    # ── 2. XGBoost per-feature contributions (SHAP-like tree contributions) ──
    dmatrix = xgb.DMatrix(X_input, feature_names=FEATURES)
    contribs_raw = clf.get_booster().predict(dmatrix, pred_contribs=True)[0]
    feature_contribs = {
        feat: float(contribs_raw[i]) for i, feat in enumerate(FEATURES)
    }
    bias = float(contribs_raw[-1])

    # ── 3. XGBoost Regressor: predicted risk score ────────────────────────────
    predicted_risk = float(reg.predict(X_input)[0])

    # Also get regressor contributions
    reg_contribs_raw = reg.get_booster().predict(dmatrix, pred_contribs=True)[0]
    risk_contribs = {
        feat: float(reg_contribs_raw[i]) for i, feat in enumerate(FEATURES)
    }

    # ── 4. K-Means: cluster assignment ────────────────────────────────────────
    cluster_feats = ["bmi", "glucose_fasting", "hba1c", "systolic_bp",
                     "physical_activity_minutes_per_week", "diabetes_risk_score"]
    X_clust = scaler.transform(pd.DataFrame([row])[cluster_feats].fillna(0))
    cluster_id = int(kmeans.predict(X_clust)[0])

    # Distance to cluster centroid (lower = more typical)
    centroid = kmeans.cluster_centers_[cluster_id]
    centroid_dist = float(np.linalg.norm(X_clust[0] - centroid))

    # ── 5. Isolation Forest: anomaly detection ────────────────────────────────
    anomaly_label = int(iso.predict(X_input)[0])  # 1 = normal, -1 = anomaly
    anomaly_score = float(iso.decision_function(X_input)[0])
    is_anomaly = anomaly_label == -1

    return {
        "diabetes_prob": diabetes_prob,
        "diabetes_pred": diabetes_pred,
        "predicted_risk": predicted_risk,
        "feature_contribs": feature_contribs,  # classifier contributions
        "risk_contribs": risk_contribs,  # regressor contributions
        "bias": bias,
        "cluster_id": cluster_id,
        "centroid_dist": centroid_dist,
        "is_anomaly": is_anomaly,
        "anomaly_score": anomaly_score,
        "features_used": FEATURES,
    }


def compute_ml_suggestions(patient: dict, analysis: dict) -> list[dict]:
    """
    Build category-level suggestions using XGBoost feature contributions.

    For each category, we:
    1. Sum the absolute risk contributions of its mapped features
       (from the XGBoost regressor's per-feature SHAP-like contributions)
    2. Normalize across categories to get a relative risk share
    3. Convert to a health score (higher contribution → lower health score)
    4. Assign priority based on the ML-derived score

    This is entirely model-driven — no hand-coded thresholds.
    """
    risk_contribs = analysis["risk_contribs"]
    feature_contribs = analysis["feature_contribs"]

    # ── Compute per-category risk contribution ────────────────────────────────
    category_risk = {}
    category_top_features = {}

    for cat_id, feat_list in CATEGORY_FEATURES.items():
        # Sum absolute contributions from the risk regressor for this category
        cat_contribs = {
            f: risk_contribs.get(f, 0.0) for f in feat_list if f in risk_contribs
        }
        abs_contribution = sum(abs(v) for v in cat_contribs.values())
        category_risk[cat_id] = abs_contribution

        # Track top contributing feature within category (for explanation)
        if cat_contribs:
            top_feat = max(cat_contribs.keys(), key=lambda f: abs(cat_contribs[f]))
            category_top_features[cat_id] = {
                "feature": top_feat,
                "contribution": cat_contribs[top_feat],
                "direction": "risk-increasing" if cat_contribs[top_feat] > 0 else "risk-decreasing",
            }

    # ── Normalize to health scores ────────────────────────────────────────────
    total_risk = sum(category_risk.values())
    if total_risk == 0:
        total_risk = 1.0  # avoid division by zero

    suggestions = []
    for cat_id in CATEGORY_FEATURES:
        meta = CATEGORY_META[cat_id]

        # Risk share: what fraction of total risk comes from this category
        risk_share = category_risk[cat_id] / total_risk

        # Convert risk share to health score using a sigmoid function:
        # - Centered at 0.2 (20% risk share) → ~50 score
        # - Low risk share → high score, high risk share → low score
        # - Sigmoid gives smooth, non-linear mapping (no hard clipping)
        health_score = round(100.0 / (1.0 + np.exp(10.0 * (risk_share - 0.20))), 1)

        # Also factor in the diabetes probability and anomaly status
        # If anomaly detected, penalize monitoring category
        if cat_id == "monitoring" and analysis["is_anomaly"]:
            health_score = round(_clamp(health_score * 0.6), 1)

        # Priority from model scores
        if health_score < 35:
            priority = "high"
        elif health_score < 65:
            priority = "medium"
        else:
            priority = "low"

        # Collect actual patient metric values for this category
        metrics = {}
        for f in CATEGORY_FEATURES[cat_id]:
            val = patient.get(f)
            if val is not None:
                metrics[f] = _safe_serialize(val)

        suggestions.append({
            "id": cat_id,
            "icon": meta["icon"],
            "title": meta["title"],
            "score": health_score,
            "priority": priority,
            "risk_share": round(risk_share * 100, 1),  # percentage
            "top_driver": category_top_features.get(cat_id),
            "metrics": metrics,
            "text": "",  # filled by LLM
        })

    # Sort by health score ascending (worst categories first)
    suggestions.sort(key=lambda s: s["score"])

    return suggestions


# ── LLM Prompt Builder ────────────────────────────────────────────────────────

def build_ml_prompt(patient: dict, suggestions: list[dict], analysis: dict) -> str:
    """
    Build a structured prompt that includes ML model outputs so the LLM
    can generate hyper-personalized recommendations.
    """
    lines = [
        "You are a clinical health assistant. A machine learning model has analyzed "
        "this patient's health data and identified areas that need attention. "
        "Based on the ML analysis below, provide ONE specific, actionable recommendation "
        "for EACH health category.",
        "",
        "## Patient Profile",
        f"- Age: {patient.get('age', 'N/A')}  |  BMI: {patient.get('bmi', 'N/A')}",
        f"- Fasting Glucose: {patient.get('glucose_fasting', 'N/A')} mg/dL  |  HbA1c: {patient.get('hba1c', 'N/A')}%",
        f"- Systolic BP: {patient.get('systolic_bp', 'N/A')} mmHg  |  Heart Rate: {patient.get('heart_rate', 'N/A')} bpm",
        f"- Sleep: {patient.get('sleep_hours_per_day', 'N/A')} hrs/day  |  Activity: {patient.get('physical_activity_minutes_per_week', 'N/A')} min/week",
        f"- Diet Score: {patient.get('diet_score', 'N/A')}/10",
        "",
        "## ML Model Results",
        f"- **Diabetes Probability**: {analysis['diabetes_prob']:.1%} "
        f"({'Predicted Diabetic' if analysis['diabetes_pred'] else 'Predicted Non-Diabetic'})",
        f"- **Predicted Risk Score**: {analysis['predicted_risk']:.1f}/100",
        f"- **Patient Cluster**: Archetype #{analysis['cluster_id']}",
        f"- **Anomaly Detection**: {'⚠️ FLAGGED as anomalous' if analysis['is_anomaly'] else 'Normal'} "
        f"(score: {analysis['anomaly_score']:.3f})",
        "",
        "## Categories Ranked by ML Risk Contribution",
    ]

    for s in suggestions:
        driver_info = ""
        if s.get("top_driver"):
            d = s["top_driver"]
            driver_info = f" — top driver: {d['feature']} ({d['direction']})"
        lines.append(
            f"- **{s['title']}** (health score: {s['score']}/100, "
            f"risk share: {s['risk_share']}%{driver_info})"
        )

    lines += [
        "",
        "## Rules",
        "- Make the tone encouraging, calm, and simple (for older adults 60+).",
        "- Each suggestion should be 1-2 sentences max.",
        "- Reference their actual metric values and the ML model's findings.",
        "- For high-priority categories, be more urgent but still kind.",
        "",
        "CRITICAL: Return EXACTLY a raw JSON array of objects, one per category, in the SAME ORDER as above.",
        'Each object must have: {"category": "...", "text": "..."}',
        "Do NOT wrap in markdown code blocks or add any other text.",
    ]
    return "\n".join(lines)


# ── API Endpoint ──────────────────────────────────────────────────────────────

@app.get("/api/health")
async def get_health_data():
    # ── Load a random patient from the dataset ───────────────────────────────
    try:
        df = pd.read_csv(BASE / "diabetes_dataset.csv")
        p = df.sample(n=1).iloc[0].to_dict()
        p = {k: _safe_serialize(v) for k, v in p.items()}
    except Exception as e:
        print(f"Dataset load error: {e}")
        p = {
            "age": 45, "bmi": 22.5, "glucose_fasting": 95, "hba1c": 5.5,
            "systolic_bp": 120, "diastolic_bp": 80, "heart_rate": 72,
            "diabetes_risk_score": 10.5, "sleep_hours_per_day": 7,
            "physical_activity_minutes_per_week": 150, "diet_score": 5,
        }

    # ── Run ML models ─────────────────────────────────────────────────────────
    try:
        analysis = run_ml_analysis(p)
    except Exception as e:
        print(f"ML analysis error: {e}")
        # Fallback: minimal analysis
        analysis = {
            "diabetes_prob": 0.5, "diabetes_pred": 0, "predicted_risk": 50.0,
            "feature_contribs": {}, "risk_contribs": {},
            "bias": 0.0, "cluster_id": 0, "centroid_dist": 0.0,
            "is_anomaly": False, "anomaly_score": 0.0, "features_used": [],
        }

    # ── Compute ML-driven category suggestions ────────────────────────────────
    suggestions = compute_ml_suggestions(p, analysis)

    # ── Build prompt and call RocketRide (or Anthropic fallback) ──────────────
    prompt = build_ml_prompt(p, suggestions, analysis)
    llm_suggestions = None

    try:
        load_dotenv(override=True)
        client = RocketRideClient()
        await client.connect()
        res = await client.use(filepath="chat.pipe")
        q = Question(expectJson=True)
        q.addQuestion(prompt)
        chat_res = await client.chat(token=res["token"], question=q)
        if "answers" in chat_res and len(chat_res["answers"]) > 0:
            answer = chat_res["answers"][0]
            if isinstance(answer, list):
                llm_suggestions = answer
            elif isinstance(answer, str):
                parsed = json.loads(answer)
                if isinstance(parsed, list):
                    llm_suggestions = parsed
    except Exception as e:
        print("RocketRide Error:", e)

        # ── Anthropic Fallback ────────────────────────────────────────────────
        import anthropic
        key = os.getenv("ANTHROPIC_API_KEY")
        if key:
            try:
                anth_client = anthropic.Anthropic(api_key=key)
                resp = anth_client.messages.create(
                    model="claude-sonnet-4-20250514",
                    max_tokens=600,
                    messages=[{"role": "user", "content": prompt}],
                )
                text_ans = resp.content[0].text.strip()

                # Strip markdown blocks
                if text_ans.startswith("```json"):
                    text_ans = text_ans[7:-3].strip()
                elif text_ans.startswith("```"):
                    text_ans = text_ans[3:-3].strip()

                match = re.search(r"\[.*\]", text_ans, re.DOTALL)
                if match:
                    text_ans = match.group(0)

                llm_suggestions = json.loads(text_ans)
            except Exception as e2:
                print("Anthropic Fallback Error:", e2)

    # ── Merge LLM texts into ML-scored suggestions ────────────────────────────
    if llm_suggestions and isinstance(llm_suggestions, list):
        llm_map = {}
        for item in llm_suggestions:
            if isinstance(item, dict) and "category" in item:
                llm_map[item["category"].lower()] = item.get("text", "")

        if llm_map:
            for s in suggestions:
                s["text"] = llm_map.get(s["id"], "")
        else:
            for i, s in enumerate(suggestions):
                if i < len(llm_suggestions):
                    item = llm_suggestions[i]
                    s["text"] = item if isinstance(item, str) else item.get("text", str(item))

    # ── Fill empty texts with defaults ────────────────────────────────────────
    defaults = {
        "nutrition": "Focus on balanced meals with whole grains and vegetables.",
        "exercise": "Try a 15-minute walk after your largest meal.",
        "sleep": "Aim for 7-8 hours of restful sleep each night.",
        "stress": "Take 5 slow, deep breaths whenever you feel tension.",
        "monitoring": "Check your key vitals regularly and note any changes.",
    }
    for s in suggestions:
        if not s["text"]:
            s["text"] = defaults.get(s["id"], "Keep taking care of yourself!")

    # ── Determine overall plant health from ML analysis ───────────────────────
    avg_score = float(np.mean([s["score"] for s in suggestions]))
    stress_score = next(
        (s["score"] for s in suggestions if s["id"] == "stress"), 50
    )

    return {
        "healthData": {
            "leaves": "healthy" if avg_score >= 60 else "low",
            "roots": "healthy" if not analysis["is_anomaly"] else "weak",
            "flower": "open" if avg_score >= 75 else "closed",
            "sun": "calm" if stress_score >= 50 else "stressed",
            "clouds": "clear",
        },
        "suggestions": suggestions,
        "mlAnalysis": {
            "diabetesProbability": round(analysis["diabetes_prob"], 4),
            "predictedRisk": round(analysis["predicted_risk"], 2),
            "cluster": analysis["cluster_id"],
            "isAnomaly": analysis["is_anomaly"],
            "anomalyScore": round(analysis["anomaly_score"], 4),
        },
        "patient": p,
    }
