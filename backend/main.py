
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from datetime import datetime, timezone
from typing import Literal
import uuid

app = FastAPI(
    title="CYBERSHIELD AI",
    description="AI-powered security log analysis API",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

events = [
    {
        "id": "EVT-001",
        "timestamp": "2026-10-29T08:00:00Z",
        "source_ip": "192.0.2.10",
        "event_type": "failed_login",
        "failed_attempts": 8,
        "severity": "High",
        "risk_score": 82,
        "status": "Investigate",
        "description": "Repeated failed login attempts",
    },
    {
        "id": "EVT-002",
        "timestamp": "2026-10-29T08:03:00Z",
        "source_ip": "192.0.2.20",
        "event_type": "successful_login",
        "failed_attempts": 0,
        "severity": "Low",
        "risk_score": 12,
        "status": "Normal",
        "description": "Successful login",
    },
    {
        "id": "EVT-003",
        "timestamp": "2026-10-29T08:07:00Z",
        "source_ip": "192.0.2.30",
        "event_type": "port_scan",
        "failed_attempts": 3,
        "severity": "Medium",
        "risk_score": 58,
        "status": "Investigate",
        "description": "Potential port scanning activity",
    },
]


class SecurityEvent(BaseModel):
    source_ip: str = Field(min_length=1, max_length=64)
    event_type: Literal[
        "failed_login",
        "successful_login",
        "port_scan",
        "suspicious_download",
        "privilege_change",
    ]
    failed_attempts: int = Field(default=0, ge=0, le=10000)


def calculate_risk(event_type: str, failed_attempts: int) -> int:
    """Rule-based demo scoring; not a trained ML prediction."""
    base_scores = {
        "failed_login": 35,
        "successful_login": 5,
        "port_scan": 45,
        "suspicious_download": 55,
        "privilege_change": 50,
    }

    score = base_scores[event_type]

    if event_type == "failed_login":
        score += min(failed_attempts * 6, 60)
    elif event_type == "port_scan":
        score += min(failed_attempts * 2, 30)

    return min(score, 100)


def get_severity(score: int) -> str:
    if score >= 75:
        return "Critical"
    if score >= 50:
        return "High"
    if score >= 25:
        return "Medium"
    return "Low"


@app.get("/")
def home():
    return {
        "name": "CYBERSHIELD AI",
        "status": "online",
        "message": "Security analysis API is running",
        "docs": "/docs",
    }


@app.get("/api/health")
def health():
    return {"status": "healthy"}


@app.get("/api/events")
def get_events():
    return {"total": len(events), "events": events}


@app.get("/api/stats")
def get_stats():
    return {
        "total_events": len(events),
        "high_risk_events": sum(
            event["risk_score"] >= 50 for event in events
        ),
        "critical_events": sum(
            event["risk_score"] >= 75 for event in events
        ),
        "normal_events": sum(
            event["risk_score"] < 25 for event in events
        ),
        "average_risk": round(
            sum(event["risk_score"] for event in events)
            / len(events), 1
        ) if events else 0,
    }


@app.post("/api/analyze")
def analyze_event(event: SecurityEvent):
    score = calculate_risk(event.event_type, event.failed_attempts)
    severity = get_severity(score)

    descriptions = {
        "failed_login": "Repeated authentication failures may indicate password guessing.",
        "successful_login": "A successful login was recorded. Review context if unexpected.",
        "port_scan": "Port scanning can indicate reconnaissance activity.",
        "suspicious_download": "Review the download source, file type, and user context.",
        "privilege_change": "Verify that the permission change was authorized.",
    }

    result = {
        "id": f"EVT-{uuid.uuid4().hex[:8].upper()}",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "source_ip": event.source_ip,
        "event_type": event.event_type,
        "failed_attempts": event.failed_attempts,
        "risk_score": score,
        "severity": severity,
        "status": "Investigate" if score >= 50 else "Review" if score >= 25 else "Normal",
        "description": descriptions[event.event_type],
        "scoring_method": "demo_rules_not_machine_learning",
    }

    events.insert(0, result)
    return result


@app.get("/api/events/{event_id}")
def get_event(event_id: str):
    for event in events:
        if event["id"] == event_id:
            return event

    raise HTTPException(status_code=404, detail="Event not found")
