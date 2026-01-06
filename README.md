# Abattoir Tracker

Application monolithique (Express + React) pour suivre les abattages et saisies avec exports CSV/PDF. Base SQLite persistante (better-sqlite3), validations Zod, interface mobile-first.

## Structure
- `server/` : API Express + accès SQLite + tests
- `client/` : front React (Vite), build servi par Express
- `client-dist/` : build client copié par Docker/serveur
- `Dockerfile` : multi-stage, conteneur unique

## Prérequis
- Node 20+
- npm

## Lancement local
### API
```bash
cd server
npm install
npm test
npm run start
```
La base est créée automatiquement (`DB_PATH` défaut `/data/abattoir.db`, sinon `process.cwd()/data/abattoir.db`).

### Client
```bash
cd client
npm install
npm run dev
```
Le client appelle l'API via `/api/...` (prévoir proxy ou lancer le serveur au même domaine/port pour l'expérience finale).

## Docker (build & run)
```bash
docker build -t abattoir-tracker .
docker run -d -p 8080:8080 -v abattoir_data:/data --restart unless-stopped abattoir-tracker
```
Accès : http://localhost:8080

## API principale
- `POST /api/abattage` `{date, species, number, weight}` : upsert + addition
- `POST /api/seizures` `{date, species, organ, cause, number}` : upsert + addition
- `GET /api/month/:yyyy-MM` : données filtrées
- `GET /api/export/:yyyy-MM/abattage.csv`
- `GET /api/export/:yyyy-MM/saisies.csv`
- `GET /api/export/:yyyy-MM/report.pdf`

## Tests
Suite minimale côté serveur (`node --test`): additions cumulatives, exports CSV/PDF, validation Zod.

## Notes
- Port unique 8080 (configurable via `PORT`)
- Volume `/data` pour la persistance SQLite
- Aucune dépendance externe (polices, services)
