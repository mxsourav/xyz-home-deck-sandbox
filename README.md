# XYZ Home Deck — Interactive Virtual Tour & Sandbox

Stationary Autonomous Elderly Care, Vitals & Emergency Guardian built on the **Raspberry Pi 4 (4GB) + ESP32-S3-DevKitC-1 N16R8** flagship dual-brain architecture.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for system diagrams, API contracts, deployment blueprints, and the 5-phase build roadmap.

---

## Local Development

### 1. Backend (FastAPI + NVIDIA NIM Wrapper)
```bash
cd backend
python -m venv .venv
# Windows PowerShell: .venv\Scripts\Activate.ps1
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
copy .env.example .env   # Linux/macOS: cp .env.example .env
uvicorn app.main:app --reload --port 8000
```
- `GET http://localhost:8000/api/health` reports service readiness even when `NVIDIA_API_KEY` is still a placeholder or unset.
- `POST http://localhost:8000/api/ai/analyze` returns a structured stub response until a valid `NVIDIA_API_KEY` is configured.

### 2. Frontend (React + TypeScript + Vite)
```bash
cd frontend
npm install
copy .env.example .env   # Linux/macOS: cp .env.example .env
npm run dev
```
Open `http://localhost:5173`.

---

## Hardware & Render Image Slots

Drop your 8 high-resolution product renders and exhibition photographs into:
```text
frontend/public/images/
├── hero.jpg       # Main tabletop render
├── frontside.jpg  # Isolated front / 3-4 shot for sensor hotspots
├── night.jpg      # Bedside night sleep-monitoring scene
├── kiosk1.jpg     # UI state 1: Standby clock & room telemetry
├── kiosk2.jpg     # UI state 2: Daily vitals check-in HUD
├── kiosk3.jpg     # UI state 3: Emergency 10s countdown HUD
├── ups.jpg        # 3S2P 18650 + BMS + XL4015 UPS internals
└── expo.jpg       # Exhibition table + laptop live feed setup
```

Until a file is placed in `frontend/public/images/`, the `SafeImage` component renders a clean clinical specification placeholder card instead of a broken image icon.

Verified individual hardware component photographs (`12` modules) are pre-bundled under `frontend/public/images/components/`, and the presentation PDF is served from `frontend/public/docs/XYZ_HomeDeck_Presentation.pdf`.

---

## Deployment Targets

- **Frontend (Vercel):** Set Root Directory to `frontend`, Build Command `npm run build`, Output Directory `dist`, and environment variable `VITE_API_BASE_URL` to your Render backend URL. SPA rewrites are configured in `frontend/vercel.json`.
- **Backend (Render):** Set Root Directory to `backend` (or deploy via `backend/render.yaml`), Start Command `uvicorn app.main:app --host 0.0.0.0 --port $PORT`, Health Check `/api/health`, and configure `NVIDIA_API_KEY` and `FRONTEND_ORIGIN`.
