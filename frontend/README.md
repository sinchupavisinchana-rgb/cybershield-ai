# CYBERSHIELD AI 🛡️

**AI-Powered Cybersecurity Threat Detection & Investigation Platform**

CYBERSHIELD AI is a full-stack cybersecurity project designed to analyze security events, calculate risk scores, visualize threat activity, and support incident investigation through an interactive dashboard.

## ✨ Features

- Security event dashboard with risk metrics
- Threat severity classification and risk scores
- Searchable security event timeline
- Interactive event investigation panel
- FastAPI backend and React frontend
- CSV event export and JSON report generation
- Responsive dark interface with analytics charts

## 🛠️ Tech Stack

- **Frontend:** React, Vite, Recharts, Lucide React
- **Backend:** Python, FastAPI, Uvicorn
- **Data Processing:** pandas, NumPy
- **Machine Learning:** scikit-learn (planned for the next phase)

## 📁 Project Structure

```text
cybershield-ai/
├── frontend/
│   └── src/
├── backend/
│   ├── main.py
│   └── data/
├── .gitignore
└── README.md
```

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/YOUR-USERNAME/cybershield-ai.git
cd cybershield-ai
```

### 2. Set up the backend

```bash
cd backend
python -m venv .venv
```

Activate the environment on Windows PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
```

Install the dependencies:

```bash
python -m pip install fastapi uvicorn pandas numpy scikit-learn python-multipart
```

Start the API:

```bash
python -m uvicorn main:app --reload
```

API documentation: http://127.0.0.1:8000/docs

### 3. Set up the frontend

Open a second terminal:

```bash
cd frontend
npm install
npm install recharts lucide-react
npm run dev
```

Open the local URL printed by Vite, usually http://localhost:5173.

## ⚠️ Current Project Status

The current version uses sample security events and heuristic risk scoring. The threat activity chart is illustrative and does not represent live network traffic.

Trained machine-learning detection, real security-log ingestion, and validated model evaluation are planned enhancements.

## 🔒 Responsible Use

Use this project for authorized defensive security analysis, education, and testing with synthetic or properly authorized logs.

## 📜 License

Add a license before permitting reuse or redistribution.
