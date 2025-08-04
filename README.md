# OpenMusic API

API untuk mengelola data album dan lagu dengan Node.js, Hapi.js, dan PostgreSQL.

## Fitur

- ✅ Mengelola data album (CRUD)
- ✅ Mengelola data lagu (CRUD)
- ✅ Validasi data menggunakan Joi
- ✅ Database PostgreSQL dengan migrations
- ✅ Error handling yang komprehensif
- ✅ Pencarian lagu berdasarkan title dan performer
- ✅ Menampilkan daftar lagu dalam detail album

## Teknologi

- **Node.js** - Runtime JavaScript
- **Hapi.js** - Web framework
- **PostgreSQL** - Database
- **Joi** - Data validation
- **node-pg-migrate** - Database migrations
- **ESLint** - Code linting dengan Airbnb style guide

## Instalasi

1. Clone repository
```bash
git clone <repository-url>
cd openmusic-api
```

2. Install dependencies
```bash
npm install
```

3. Setup database PostgreSQL dan buat database `openmusic`

4. Copy file environment
```bash
cp .env.example .env
```

5. Sesuaikan konfigurasi database di file `.env`

6. Jalankan migrations
```bash
npm run migrate up
```

7. Jalankan server
```bash
npm start
```

Server akan berjalan di `http://localhost:5000` (atau sesuai konfigurasi PORT)

## API Endpoints

### Albums
- `POST /albums` - Tambah album baru
- `GET /albums/{id}` - Get album beserta lagu-lagunya
- `PUT /albums/{id}` - Update album
- `DELETE /albums/{id}` - Hapus album

### Songs
- `POST /songs` - Tambah lagu baru
- `GET /songs` - Get semua lagu (support query: title, performer)
- `GET /songs/{id}` - Get detail lagu
- `PUT /songs/{id}` - Update lagu
- `DELETE /songs/{id}` - Hapus lagu

## Response Format

### Success Response
```json
{
  "status": "success",
  "message": "...",
  "data": {
    // data object
  }
}
```

### Error Response
```json
{
  "status": "fail", // atau "error" untuk server error
  "message": "Error message"
}
```

## Development

Jalankan dalam mode development:
```bash
npm run start-dev
```

Lint code:
```bash
npm run lint
```

## Database Schema

### Albums Table
- `id` (VARCHAR 50, PRIMARY KEY)
- `name` (TEXT, NOT NULL)
- `year` (INTEGER, NOT NULL)
- `created_at` (TEXT, NOT NULL)
- `updated_at` (TEXT, NOT NULL)

### Songs Table
- `id` (VARCHAR 50, PRIMARY KEY)
- `title` (TEXT, NOT NULL)
- `year` (INTEGER, NOT NULL)
- `genre` (TEXT, NOT NULL)
- `performer` (TEXT, NOT NULL)
- `duration` (INTEGER)
- `album_id` (VARCHAR 50, FOREIGN KEY)
- `created_at` (TEXT, NOT NULL)
- `updated_at` (TEXT, NOT NULL)

## Environment Variables

| Variable | Description |
|----------|-------------|
| HOST | Server host (default: localhost) |
| PORT | Server port (default: 5000) |
| PGUSER | PostgreSQL username |
| PGPASSWORD | PostgreSQL password |
| PGDATABASE | PostgreSQL database name |
| PGHOST | PostgreSQL host |
| PGPORT | PostgreSQL port |