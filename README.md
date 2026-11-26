# Swynex Internship – Task Management REST API

A task-management REST API built with Node.js, Express 5 and SQLite. Reads are public; writes are protected by an API key. Includes request validation, consistent JSON errors, sample data, interactive Swagger docs, automated tests and a one-click Render blueprint.

## Submission

- **GitHub repository:** https://github.com/Cybergang007/swynex-intern-task1
- **Live service URL:** `https://<your-service>.onrender.com` &nbsp;← _replace after deploying_
- **API docs (Swagger UI):** `<live URL>/docs`

> Note: Render's free plan sleeps after ~15 minutes of inactivity, so the first request can take around 30–60 seconds.

## Features

- Full CRUD for tasks with SQLite persistence
- API-key authentication (`x-api-key`) on `POST`, `PUT`, `DELETE`
- Strict validation (types, lengths, unknown fields, positive-integer IDs, 10 KB body limit)
- Consistent error format and centralized error handling
- Interactive docs at `/docs` and a machine-readable spec at `/openapi.json`
- Sample data (`seed/tasks.json`) and a seed command
- Graceful shutdown on `SIGTERM`, health check for hosting platforms
- Automated tests (`npm test`, built-in Node test runner, no extra tooling)

## Quick start (local)

Requires Node.js 20+ (22 recommended) and npm.

```bash
npm install
cp .env.example .env      # then set API_KEY to a long random value
npm run seed              # optional: load sample tasks
npm start                 # or: npm run dev
```

The API runs at `http://localhost:3000`. Open `http://localhost:3000/docs` for the interactive docs.

Generate a strong key with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

### Environment variables

| Variable        | Required | Default           | Purpose                                                      |
| --------------- | -------- | ----------------- | ------------------------------------------------------------ |
| `API_KEY`       | **Yes**  | –                 | Secret expected in the `x-api-key` header for write requests |
| `PORT`          | No       | `3000`            | Port to listen on (Render sets this automatically)           |
| `DB_PATH`       | No       | `./data/tasks.db` | SQLite file location                                         |
| `SEED_ON_EMPTY` | No       | `false`           | If `true`, load sample tasks at startup when the table is empty |
| `NODE_ENV`      | No       | –                 | `development` / `production`                                 |

### Scripts

| Command                  | Description                                       |
| ------------------------ | ------------------------------------------------- |
| `npm start`              | Start the server                                  |
| `npm run dev`            | Start with auto-reload (nodemon)                  |
| `npm run seed`           | Insert sample data if the table is empty          |
| `npm run seed -- --reset`| Wipe all tasks and re-insert the sample data      |
| `npm test`               | Run the automated tests (uses a temporary database) |

## Deploy to Render

### Option A – Blueprint (recommended)

1. Push this repository to GitHub.
2. In the [Render dashboard](https://dashboard.render.com): **New → Blueprint**, pick the repo, and click **Apply**.
3. Render reads `render.yaml`, runs `npm ci`, starts `npm start`, and generates a random `API_KEY`.
4. When the deploy is live, open the service → **Environment** to copy the generated `API_KEY`.
5. Check `https://<your-service>.onrender.com/health`, then put the live URL in the **Submission** section above and commit.

### Option B – Manual web service

| Setting             | Value                                  |
| ------------------- | -------------------------------------- |
| Runtime             | Node                                   |
| Build command       | `npm ci`                               |
| Start command       | `npm start`                            |
| Health check path   | `/health`                              |
| Environment         | `API_KEY` (your secret), `NODE_VERSION=22`, `SEED_ON_EMPTY=true` |

### About data persistence on Render

SQLite stores data in a local file. Render's **free plan has an ephemeral filesystem**, so data resets on every deploy, restart or spin-down. That is why `SEED_ON_EMPTY=true` is set in `render.yaml`: the sample tasks are reloaded whenever the database starts empty, so the demo always has data.

To keep data permanently, use a paid plan with a persistent disk:

1. In `render.yaml`, set `plan: starter` and uncomment the `disk:` block.
2. Add the env var `DB_PATH=/var/data/tasks.db` (the disk's mount path).
3. Optionally remove `SEED_ON_EMPTY` once you have real data.

## Authentication

Write endpoints require the `x-api-key` header. Read endpoints, `/health`, `/docs` and `/` are public.

```http
x-api-key: <your API_KEY>
```

A missing or wrong key returns `401`:

```json
{ "success": false, "error": { "code": "UNAUTHORIZED", "message": "A valid x-api-key header is required." } }
```

If `API_KEY` is not configured on the server, write requests return `500 AUTH_NOT_CONFIGURED` (the server fails closed).

## API reference

| Method   | Path             | Auth | Description                |
| -------- | ---------------- | ---- | -------------------------- |
| `GET`    | `/`              | No   | Service info and links     |
| `GET`    | `/health`        | No   | Health check               |
| `GET`    | `/docs`          | No   | Swagger UI                 |
| `GET`    | `/api/tasks`     | No   | List tasks (newest first)  |
| `GET`    | `/api/tasks/:id` | No   | Get one task               |
| `POST`   | `/api/tasks`     | Yes  | Create a task              |
| `PUT`    | `/api/tasks/:id` | Yes  | Update a task (partial)    |
| `DELETE` | `/api/tasks/:id` | Yes  | Delete a task              |

### Task object

```json
{
  "id": 1,
  "title": "Write API docs",
  "description": "Document protected routes",
  "completed": false,
  "created_at": "2026-11-26 09:30:00",
  "updated_at": "2026-11-26 09:30:00"
}
```

### Validation rules

- `title`: required on create; string, 1–120 characters after trimming.
- `description`: optional string, max 1000 characters.
- `completed`: optional boolean, defaults to `false`.
- Unknown fields are rejected; updates must include at least one field.
- `:id` must be a positive integer.
- JSON bodies are limited to 10 KB.

### Error format

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed.",
    "details": [{ "field": "title", "message": "Title is required and must be a non-empty string." }]
  }
}
```

| Status | Codes                                             |
| ------ | ------------------------------------------------- |
| `400`  | `VALIDATION_ERROR`, `INVALID_JSON`                |
| `401`  | `UNAUTHORIZED`                                    |
| `404`  | `NOT_FOUND` (route), `TASK_NOT_FOUND`             |
| `500`  | `AUTH_NOT_CONFIGURED`, `INTERNAL_SERVER_ERROR`    |

## Try it with curl

Set these once (use your live URL and key; locally `http://localhost:3000`):

```bash
BASE=https://<your-service>.onrender.com
KEY=<your API_KEY>
```

```bash
# Health check
curl $BASE/health

# List tasks (public)
curl $BASE/api/tasks

# Create without a key -> 401
curl -X POST $BASE/api/tasks -H "Content-Type: application/json" -d '{"title":"Write API docs"}'

# Create with a key -> 201
curl -X POST $BASE/api/tasks \
  -H "Content-Type: application/json" -H "x-api-key: $KEY" \
  -d '{"title":"Write API docs","description":"Document protected routes","completed":false}'

# Get task 1
curl $BASE/api/tasks/1

# Update task 1 -> 200
curl -X PUT $BASE/api/tasks/1 \
  -H "Content-Type: application/json" -H "x-api-key: $KEY" \
  -d '{"completed":true}'

# Delete task 1 -> 200
curl -X DELETE $BASE/api/tasks/1 -H "x-api-key: $KEY"

# Validation error -> 400
curl -X POST $BASE/api/tasks -H "Content-Type: application/json" -H "x-api-key: $KEY" -d '{"title":""}'
```

On Windows `cmd`, use double quotes and escape inner quotes (`-d "{\"title\":\"Write API docs\"}"`), or use the Swagger UI at `/docs`.

## Sample data

`seed/tasks.json` contains five example tasks. Load them with `npm run seed`, or automatically on startup with `SEED_ON_EMPTY=true`.

## Project structure

```text
├── render.yaml                  # Render blueprint
├── .node-version                # Node version for Render
├── seed/tasks.json              # sample data
├── scripts/seed.js              # npm run seed
├── test/api.test.js             # automated tests
└── src/
    ├── app.js                   # Express app (routes, docs, error handling)
    ├── server.js                # entry point (listen, seed, graceful shutdown)
    ├── controllers/             # health + task handlers, validation
    ├── db/                      # SQLite setup and seeding
    ├── docs/openapi.json        # OpenAPI 3 spec served at /docs
    ├── middleware/              # apiKeyAuth, errorHandler
    └── routes/                  # health + task routes
```

## Deployment

- **GitHub Repository:** https://github.com/Cybergang007/swynex-intern-task1-render
- **Live Service URL:** https://swynex-task-api.onrender.com
- **API Documentation:** https://swynex-task-api.onrender.com/docs
- **Health Check:** https://swynex-task-api.onrender.com/health

### Hosting
Deployed using Render Web Services.
