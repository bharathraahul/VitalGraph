"""
VitalGraph — Streamlit Dashboard
Run: streamlit run app.py
"""
import os, pickle, warnings
import numpy as np
import pandas as pd
import streamlit as st
import plotly.express as px
import plotly.graph_objects as go
from pathlib import Path

warnings.filterwarnings('ignore')

# ── Config ───────────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="VitalGraph",
    page_icon="🫀",
    layout="wide",
    initial_sidebar_state="expanded",
)

BASE = Path(__file__).parent
DIABETES_PATH  = BASE / "diabetes_dataset.csv"
ACTIVITY_PATH  = BASE / "activity_summary.xlsx"
MODELS_PATH    = BASE / "models.pkl"

# ── Load assets ───────────────────────────────────────────────────────────────
@st.cache_data(show_spinner=False)
def load_diabetes():
    return pd.read_csv(DIABETES_PATH)

@st.cache_data(show_spinner=False)
def load_activity():
    return pd.read_excel(ACTIVITY_PATH)

@st.cache_resource(show_spinner=False)
def load_models():
    if MODELS_PATH.exists():
        with open(MODELS_PATH, "rb") as f:
            return pickle.load(f)
    return None

df       = load_diabetes()
act      = load_activity()
models   = load_models()

# ── Sidebar ───────────────────────────────────────────────────────────────────
st.sidebar.image("https://img.icons8.com/color/96/heart-with-pulse.png", width=60)
st.sidebar.title("VitalGraph")
st.sidebar.caption("Health Intelligence via Graph + ML")

page = st.sidebar.radio(
    "Navigate",
    ["Overview", "Risk Analyzer", "Patient Explorer", "Device Benchmarks", "Graph Insights"],
    index=0,
)

# ── Page: Overview ────────────────────────────────────────────────────────────
if page == "Overview":
    st.title("🫀 VitalGraph — Health Intelligence Dashboard")
    st.markdown(
        "Connecting **wearable physiology**, **patient health records**, and "
        "**device benchmarks** via a Neo4j knowledge graph with XGBoost ML."
    )

    col1, col2, col3, col4 = st.columns(4)
    col1.metric("Total Patients", f"{len(df):,}")
    col2.metric("Diagnosed Diabetes", f"{df['diagnosed_diabetes'].sum():,}",
                f"{df['diagnosed_diabetes'].mean()*100:.1f}%")
    col3.metric("Pre-Diabetes", f"{(df['diabetes_stage']=='Pre-Diabetes').sum():,}")
    col4.metric("Device Records", f"{len(act):,}")

    st.divider()
    col_a, col_b = st.columns(2)

    with col_a:
        stage_counts = df["diabetes_stage"].value_counts().reset_index()
        stage_counts.columns = ["Stage", "Count"]
        fig = px.pie(stage_counts, names="Stage", values="Count",
                     title="Diabetes Stage Distribution",
                     color_discrete_sequence=px.colors.qualitative.Set2)
        st.plotly_chart(fig, use_container_width=True)

    with col_b:
        fig2 = px.histogram(df, x="diabetes_risk_score", nbins=60,
                            color="diabetes_stage",
                            title="Risk Score Distribution by Stage",
                            barmode="overlay", opacity=0.6,
                            color_discrete_sequence=px.colors.qualitative.Set2)
        st.plotly_chart(fig2, use_container_width=True)

    # Correlation heatmap (numeric, top 10 vs risk score)
    num = df.select_dtypes(include=np.number)
    corr_with_risk = num.corr()["diabetes_risk_score"].drop("diabetes_risk_score").abs().nlargest(12)
    corr_sub = num[corr_with_risk.index.tolist() + ["diabetes_risk_score"]].corr()

    fig3 = px.imshow(corr_sub, color_continuous_scale="RdBu_r", zmin=-1, zmax=1,
                     title="Feature Correlation (top 12 vs Risk Score)")
    st.plotly_chart(fig3, use_container_width=True)


# ── Page: Risk Analyzer ───────────────────────────────────────────────────────
elif page == "Risk Analyzer":
    st.title("🔬 Diabetes Risk Analyzer")
    st.markdown("Enter patient vitals to get an **ML-predicted risk score** and **diabetes likelihood**.")

    if models is None:
        st.warning("Run `vitalgraph_main.ipynb` first to train and save models (models.pkl).")
        st.stop()

    clf   = models["diabetes_classifier"]
    reg   = models["risk_regressor"]
    FEATS = models["features"]
    le_map = models["label_encoders"]

    with st.form("patient_form"):
        c1, c2, c3 = st.columns(3)
        with c1:
            st.subheader("Demographics")
            age    = st.slider("Age", 18, 90, 45)
            gender = st.selectbox("Gender", ["Male", "Female"])
            bmi    = st.slider("BMI", 15.0, 55.0, 27.0, 0.1)
            waist_hip = st.slider("Waist-to-Hip Ratio", 0.6, 1.2, 0.85, 0.01)

        with c2:
            st.subheader("Vitals & Labs")
            sys_bp   = st.slider("Systolic BP (mmHg)", 90, 200, 120)
            dia_bp   = st.slider("Diastolic BP (mmHg)", 60, 130, 80)
            hr       = st.slider("Heart Rate (bpm)", 40, 120, 72)
            glucose  = st.slider("Fasting Glucose (mg/dL)", 60, 300, 95)
            hba1c    = st.slider("HbA1c (%)", 4.0, 14.0, 5.5, 0.1)
            insulin  = st.slider("Insulin Level (µU/mL)", 1.0, 50.0, 10.0, 0.5)

        with c3:
            st.subheader("Lifestyle & History")
            activity = st.slider("Physical Activity (min/week)", 0, 500, 150)
            diet     = st.slider("Diet Score (0-10)", 0.0, 10.0, 5.0, 0.1)
            sleep    = st.slider("Sleep (hrs/day)", 3.0, 12.0, 7.0, 0.5)
            alcohol  = st.slider("Alcohol (drinks/week)", 0, 20, 2)
            fam_hist = st.checkbox("Family History of Diabetes")
            hypert   = st.checkbox("Hypertension History")
            cardio   = st.checkbox("Cardiovascular History")
            smoking  = st.selectbox("Smoking Status", ["Never", "Former", "Current"])
            screen   = st.slider("Screen Time (hrs/day)", 0.0, 16.0, 6.0, 0.5)

        submitted = st.form_submit_button("Analyze Risk", use_container_width=True, type="primary")

    if submitted:
        # Build feature vector
        gender_enc  = list(le_map["gender"].classes_).index(gender) if gender in le_map["gender"].classes_ else 0
        smoking_enc = list(le_map["smoking_status"].classes_).index(smoking) if smoking in le_map["smoking_status"].classes_ else 0

        row = {
            "age": age, "bmi": bmi, "waist_to_hip_ratio": waist_hip,
            "systolic_bp": sys_bp, "diastolic_bp": dia_bp, "heart_rate": hr,
            "cholesterol_total": 200, "hdl_cholesterol": 50, "ldl_cholesterol": 120,
            "triglycerides": 150, "glucose_fasting": glucose,
            "glucose_postprandial": glucose * 1.4,
            "insulin_level": insulin, "hba1c": hba1c,
            "physical_activity_minutes_per_week": activity,
            "diet_score": diet, "sleep_hours_per_day": sleep,
            "alcohol_consumption_per_week": alcohol,
            "screen_time_hours_per_day": screen,
            "family_history_diabetes": int(fam_hist),
            "hypertension_history": int(hypert),
            "cardiovascular_history": int(cardio),
            "gender_enc": gender_enc,
            "smoking_status_enc": smoking_enc,
        }
        X_input = pd.DataFrame([row])[FEATS]

        risk_score   = float(reg.predict(X_input)[0])
        diab_prob    = float(clf.predict_proba(X_input)[0][1])
        diab_pred    = int(clf.predict(X_input)[0])

        st.divider()
        r1, r2, r3 = st.columns(3)
        r1.metric("Predicted Risk Score", f"{risk_score:.1f} / 100",
                  delta="HIGH" if risk_score > 60 else ("MODERATE" if risk_score > 30 else "LOW"))
        r2.metric("Diabetes Probability", f"{diab_prob*100:.1f}%")
        r3.metric("Prediction", "Diabetic" if diab_pred else "Not Diabetic",
                  delta="⚠️ Review" if diab_pred else "✓ Clear")

        # Gauge chart
        fig_g = go.Figure(go.Indicator(
            mode="gauge+number",
            value=risk_score,
            title={"text": "Diabetes Risk Score"},
            gauge={
                "axis": {"range": [0, 100]},
                "steps": [
                    {"range": [0, 30],  "color": "lightgreen"},
                    {"range": [30, 60], "color": "yellow"},
                    {"range": [60, 100],"color": "tomato"},
                ],
                "threshold": {"line": {"color": "red", "width": 4}, "thickness": 0.75, "value": risk_score},
                "bar": {"color": "darkblue"},
            }
        ))
        fig_g.update_layout(height=300)
        st.plotly_chart(fig_g, use_container_width=True)


# ── Page: Patient Explorer ─────────────────────────────────────────────────────
elif page == "Patient Explorer":
    st.title("👥 Patient Cohort Explorer")

    stage_filter   = st.multiselect("Filter by Diabetes Stage",
                                    df["diabetes_stage"].unique(),
                                    default=list(df["diabetes_stage"].unique()))
    sample_n       = st.slider("Sample size", 100, 5000, 1000)
    df_filtered    = df[df["diabetes_stage"].isin(stage_filter)].sample(
                        min(sample_n, len(df[df["diabetes_stage"].isin(stage_filter)])),
                        random_state=42)

    col_x = st.selectbox("X axis", ["bmi", "glucose_fasting", "hba1c", "age", "systolic_bp"], index=0)
    col_y = st.selectbox("Y axis", ["hba1c", "diabetes_risk_score", "glucose_fasting", "bmi"], index=1)

    fig = px.scatter(
        df_filtered, x=col_x, y=col_y,
        color="diabetes_stage", opacity=0.5, size_max=6,
        hover_data=["age", "bmi", "glucose_fasting", "hba1c", "diabetes_risk_score"],
        title=f"{col_y} vs {col_x} — {len(df_filtered):,} patients",
        color_discrete_sequence=px.colors.qualitative.Set2,
    )
    st.plotly_chart(fig, use_container_width=True)

    st.subheader("Cohort Statistics")
    stats_cols = ["age", "bmi", "glucose_fasting", "hba1c",
                  "systolic_bp", "heart_rate", "diabetes_risk_score"]
    st.dataframe(df_filtered[stats_cols].describe().round(2), use_container_width=True)


# ── Page: Device Benchmarks ───────────────────────────────────────────────────
elif page == "Device Benchmarks":
    st.title("📱 Wearable Device Benchmarks")

    device_summary = act.groupby("device")[[
        "heart_rate_mean", "signal_quality_score", "measurement_reliability",
        "anomaly_rate_pct", "firmware_smoothing_factor", "sensor_noise_floor"
    ]].mean().round(3).reset_index().sort_values("signal_quality_score", ascending=False)

    st.subheader("Device Rankings")
    st.dataframe(device_summary, use_container_width=True)

    metric_choice = st.selectbox(
        "Compare devices by",
        ["signal_quality_score", "measurement_reliability", "anomaly_rate_pct",
         "heart_rate_mean", "firmware_smoothing_factor"]
    )
    fig = px.bar(device_summary, x="device", y=metric_choice,
                 color="device", title=f"Devices: {metric_choice}",
                 color_discrete_sequence=px.colors.qualitative.Pastel)
    st.plotly_chart(fig, use_container_width=True)

    # HR by activity
    st.subheader("Heart Rate by Activity & Device")
    act_dev = act[act["breakdown_type"] == "activity_device"].copy()
    pivot = act_dev.pivot_table(
        index="activity", columns="device", values="heart_rate_mean", aggfunc="mean"
    ).reset_index()
    fig2 = px.bar(
        act_dev, x="activity", y="heart_rate_mean", color="device",
        barmode="group", title="Mean HR by Activity & Device",
        color_discrete_sequence=px.colors.qualitative.Set1,
    )
    fig2.update_layout(xaxis_tickangle=-30)
    st.plotly_chart(fig2, use_container_width=True)

    # Signal quality tier breakdown
    if "data_quality_tier" in act.columns:
        tier_counts = act.groupby(["device", "data_quality_tier"]).size().reset_index(name="count")
        fig3 = px.bar(tier_counts, x="device", y="count", color="data_quality_tier",
                      barmode="stack", title="Data Quality Tier by Device",
                      color_discrete_sequence=px.colors.qualitative.Pastel2)
        st.plotly_chart(fig3, use_container_width=True)


# ── Page: Graph Insights ──────────────────────────────────────────────────────
elif page == "Graph Insights":
    st.title("🕸️ Graph Insights — Neo4j")

    st.info(
        "Neo4j must be running. Set `NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD` "
        "as environment variables, then run **Section 3** and **Section 4** of "
        "`vitalgraph_main.ipynb` to populate the graph."
    )

    try:
        from neo4j import GraphDatabase
        uri  = os.getenv("NEO4J_URI",      "bolt://localhost:7687")
        user = os.getenv("NEO4J_USER",     "neo4j")
        pwd  = os.getenv("NEO4J_PASSWORD", "password")
        driver = GraphDatabase.driver(uri, auth=(user, pwd))
        driver.verify_connectivity()
        connected = True
        st.success("Connected to Neo4j.")
    except Exception as e:
        connected = False
        st.error(f"Neo4j not reachable: {e}")

    if connected:
        def run_q(cypher, params=None):
            with driver.session() as s:
                return [dict(r) for r in s.run(cypher, params or {})]

        col1, col2, col3 = st.columns(3)
        counts = run_q("MATCH (n) RETURN labels(n)[0] AS label, count(n) AS cnt")
        cnt_map = {r["label"]: r["cnt"] for r in counts if r["label"]}
        col1.metric("Patient Nodes",    cnt_map.get("Patient", 0))
        col2.metric("Subject Nodes",    cnt_map.get("Subject", 0))
        col3.metric("TimeWindow Nodes", cnt_map.get("TimeWindow", 0))

        st.subheader("Cluster × Diabetes Stage")
        res = run_q("""
            MATCH (p:Patient)
            RETURN p.cluster AS cluster, p.diabetes_stage AS stage, count(*) AS cnt
            ORDER BY cluster, cnt DESC
        """)
        if res:
            pivot = pd.DataFrame(res).pivot_table(
                index="cluster", columns="stage", values="cnt", fill_value=0
            )
            fig = px.imshow(pivot, title="Patients per Cluster × Stage",
                            color_continuous_scale="Blues", text_auto=True)
            st.plotly_chart(fig, use_container_width=True)

        st.subheader("High-Risk Anomalous Patients")
        res2 = run_q("""
            MATCH (p:Patient)
            WHERE p.risk_score > 60 AND p.is_anomaly = true
            RETURN p.patient_id, p.age, p.bmi, p.hba1c,
                   p.glucose_fasting, p.diabetes_stage, p.risk_score
            ORDER BY p.risk_score DESC LIMIT 20
        """)
        if res2:
            st.dataframe(pd.DataFrame(res2), use_container_width=True)

        st.subheader("Top Stress-Flagged Subjects")
        res3 = run_q("""
            MATCH (sub:Subject)-[:PARTICIPATED_IN]->(ses:Session)-[:HAS_WINDOW]->(tw:TimeWindow)
            WHERE ses.state = 'STRESS'
            RETURN sub.subject_id AS subject,
                   round(avg(tw.stress_prob)*100)/100 AS avg_stress_prob,
                   round(max(tw.hr_mean)*10)/10 AS peak_hr,
                   round(max(tw.eda_mean)*10)/10 AS peak_eda
            ORDER BY avg_stress_prob DESC LIMIT 20
        """)
        if res3:
            st.dataframe(pd.DataFrame(res3), use_container_width=True)

        driver.close()
