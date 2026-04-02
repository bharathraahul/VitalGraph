import os
import json
import pandas as pd
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

def build_health_prompt(p) -> str:
    lines = [
        'You are a clinical health assistant. Based on the following patient data, ',
        'provide a concise, actionable health recommendation. Focus on lifestyle suggestions.',
        '',
        '## Patient Profile',
        f'- Age: {p.get("age", "N/A")}  |  BMI: {p.get("bmi", "N/A")}',
        f'- Fasting Glucose: {p.get("glucose_fasting", "N/A")} mg/dL  |  HbA1c: {p.get("hba1c", "N/A")}%',
        f'- Systolic BP: {p.get("systolic_bp", "N/A")} mmHg  |  Heart Rate: {p.get("heart_rate", "N/A")} bpm',
        f'- Risk Score: {p.get("diabetes_risk_score", "N/A"):.1f}/100',
        '',
        '## Request',
        'You MUST analyze their specific metrics (e.g., if their glucose is high, or BMI is elevated) and return 3 hyper-personalized lifestyle recommendations.',
        'Make the tone encouraging, calm, and extremely simple (for older adults 60+).',
        'CRITICAL: Return EXACTLY a raw JSON array of 3 string items. Do NOT wrap it in markdown block quotes (```json) or conversational text.',
    ]
    return '\n'.join(lines)

@app.get("/api/health")
async def get_health_data():
    # Load dataset
    try:
        df = pd.read_csv('diabetes_dataset.csv')
        # Sample a random patient so health scores differ every time!
        p = df.sample(n=1).iloc[0].to_dict()
    except Exception as e:
        p = {"age": 45, "bmi": 22.5, "diabetes_risk_score": 10.5}

    prompt = build_health_prompt(p)
    
    # Ping RocketRide
    recommendations = [
        "Go for a 15 minute walk after meals.",
        "Drink 8 glasses of water today.",
        "Sleep for at least 7 hours."
    ]
    
    try:
        load_dotenv(override=True)
        client = RocketRideClient()
        await client.connect()
        res = await client.use(filepath='chat.pipe')
        q = Question(expectJson=True)
        q.addQuestion(prompt)
        chat_res = await client.chat(token=res['token'], question=q)
        if 'answers' in chat_res and len(chat_res['answers']) > 0:
            answer = chat_res['answers'][0]
            if isinstance(answer, list):
                recommendations = answer
    except Exception as e:
        print("RocketRide Error:", e)
        # Hackathon Fallback: Directly ping Anthropic!
        import anthropic
        key = os.getenv('ANTHROPIC_API_KEY')
        if key:
            try:
                import json
                anth_client = anthropic.Anthropic(api_key=key)
                resp = anth_client.messages.create(
                    model="claude-3-5-sonnet-20241022",
                    max_tokens=256,
                    messages=[{"role": "user", "content": prompt}]
                )
                text_ans = resp.content[0].text.strip()
                
                # Strip markdown blocks if Claude included them anyway
                if text_ans.startswith("```json"): text_ans = text_ans[7:-3].strip()
                elif text_ans.startswith("```"): text_ans = text_ans[3:-3].strip()
                
                import re
                match = re.search(r'\[.*\]', text_ans, re.DOTALL)
                if match:
                    text_ans = match.group(0)
                    
                recommendations = json.loads(text_ans)
            except Exception as e2:
                print("Anthropic Fallback Error:", e2)
                recommendations = ["Breathe deeply", "Drink more water", "Go for a walk"]
        else:
            recommendations = ["Keep active", "Sleep well", "Hydrate"]
            
    return {
        "healthData": {
            "leaves": 'healthy',
            "roots": 'healthy',
            "flower": 'open',
            "sun": 'calm',
            "clouds": 'clear'
        },
        "recommendations": recommendations,
        "patient": p
    }
