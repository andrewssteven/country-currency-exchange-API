# Countries Cache API

A small REST API that fetches country data and exchange rates, computes an estimated GDP per country, caches results in MongoDB, and exposes endpoints to query and manage the cached data.

This repository is the codebase used in the project under `src/`

Table of contents

- Features
- Prerequisites
- Quick start (local)
- Environment variables
- Scripts
- API endpoints (examples)
- Development & debugging tips
- Tests
- Notes

## Features

- Fetch countries from https://restcountries.com and exchange rates from https://open.er-api.com
- Compute `estimated_gdp = population × random(1000–2000) ÷ exchange_rate`
- Cache countries and metadata in MongoDB
- Endpoints for refresh, listing, single country, delete, status and serving a summary image

## Prerequisites

- Node.js (v16+ recommended) and npm
- MongoDB accessible locally or remotely (the project uses Mongoose)

If you prefer a SQL database (MySQL) instead of MongoDB, the current code uses MongoDB; a migration is required to switch to MySQL.

## Quick start (local)

1. Install dependencies

```bash
npm install
```

2. Create an environment file

create a `.env` and update values as needed. See the Environment variables section below.

3. Start the server in development mode (restarts on file changes)

```bash
npm run dev
```

4. Run the test suite

```bash
npm test
```

The API will be available at `http://localhost:3000` (or the port set in your `.env`).

## Environment variables

Create a `.env` file in the project root. The project reads the following environment variables:

- `MONGO_URI` — MongoDB connection string. Default: `mongodb://localhost:27017/countries_db`
- `PORT` — Port the server listens on. Default: `3000`

Example `.env` (use `.env.example` as a starting point):

```
MONGO_URI=mongodb://localhost:27017/countries_db
PORT=3000
```

## Scripts

- `npm start` — start the server (`node src/index.js`)
- `npm run dev` — start with `nodemon` for development
- `npm test` — run tests with Jest

## API Endpoints

Base URL: `http://localhost:<PORT>`

1. POST /countries/refresh

- Fetch countries and exchange rates, upsert cached records, update `last_refreshed_at`.
- Response sample:

```json
{
  "updated": 250,
  "fetched": 250,
  "skipped": 0,
  "last_refreshed_at": "2025-10-22T18:00:00.000Z"
}
```

2. GET /countries

- List cached countries. Supports query parameters:
  - `region` (e.g. `?region=Africa`)
  - `currency` (e.g. `?currency=NGN`)
  - `sort=gdp_desc` (sort by `estimated_gdp` descending)

Example:

```bash
curl -s http://localhost:3000/countries | jq .
```

3. GET /countries/:name

- Get a single country by name (case-insensitive)
- 404 if not found

4. DELETE /countries/:name

- Delete a country by name (case-insensitive)

5. GET /status

- Returns total countries and the last refresh timestamp

```json
{
  "total_countries": 250,
  "last_refreshed_at": "2025-10-22T18:00:00Z"
}
```

6. GET /countries/image

- Serves the generated summary image if present at `cache/summary.png` (or `src/cache/summary.png`).
- Returns 404 JSON when the image is missing:

```json
{ "error": "Summary image not found" }
```

7. POST /countries/seed (development helper)

- Inserts a small sample dataset (useful for offline local testing).

## Validation and error responses

- Missing country on `GET /countries/:name` and `DELETE` returns:
  ```json
  { "error": "Country not found" }
  ```
- If external APIs fail during refresh, the service returns 503 and does not modify the database:
  ```json
  {
    "error": "External data source unavailable",
    "details": "Could not fetch data from [API name]"
  }
  ```
- Internal server errors return 500 with `{ "error": "Internal server error" }`.

## Development & debugging tips

- If `/countries` returns an empty array, run:

```bash
# Populate from external APIs (requires network)
curl -X POST http://localhost:3000/countries/refresh

# Or use the local seed to insert sample data
curl -X POST http://localhost:3000/countries/seed

# Inspect database content quickly (debug route)
curl http://localhost:3000/countries/debug | jq .
```

- If the server fails to start with `EADDRINUSE`, free the port (Windows):

```bash
netstat -ano | findstr 3000
taskkill /F /PID <pid>
```

## Tests

- Run the test suite with:

```bash
npm test
```

The tests use an in-memory MongoDB server (mongodb-memory-server) so they won't require a running local MongoDB instance.

## Notes & next steps

- The implementation currently uses MongoDB (Mongoose). Your original spec mentioned MySQL — switching to MySQL requires migrating models and queries to an SQL library (e.g., `sequelize` or `knex`). If you want that, I can prepare a migration plan.
- Image generation code exists at `src/utils/image.js`. If you want images regenerated on each refresh, I can re-enable the generation in the refresh flow.

If you want me to make any of the above changes (MySQL migration, auto image generation, stricter validation), tell me which and I'll implement it and run tests.

---
# country-currency-exchange-API
