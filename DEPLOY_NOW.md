# Deploy Tri-Netra

The former one-service Railway/Render instructions are archived because they
conflicted with the production architecture.

Use [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for the supported deployment:

```text
Vercel frontend -> Render FastAPI -> hosted PostgreSQL
```

Local development remains:

```text
Vite :5173 -> FastAPI :8000 -> SQLite
```
