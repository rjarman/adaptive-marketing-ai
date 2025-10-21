# Adaptive Marketing AI Backend

## How to Run

### 1. Install Dependencies

```bash
cd backend
uv sync
```

### 2. Environment Configuration

Create a `.env` file in the backend directory:

```bash
OPENAI_API_KEY=
OPENAI_BASE_URL=
OPENAI_MODEL=
DATABASE_URL=
```

### 3. Start the Server

```bash
uv run uvicorn main:app --reload --port 8001
```

The API will be available at `http://localhost:8001`

### 4. View API Documentation

- **Swagger UI**: http://localhost:8001/docs
- **ReDoc**: http://localhost:8001/redoc
