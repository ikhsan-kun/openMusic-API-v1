# OpenMusic API v2

API untuk mengelola data album, lagu, dan playlist dengan sistem autentikasi menggunakan Node.js, Hapi.js, dan PostgreSQL.

## Fitur

### ✅ **Fitur V1 (Dipertahankan)**
- Mengelola data album (CRUD)
- Mengelola data lagu (CRUD)
- Validasi data menggunakan Joi
- Database PostgreSQL dengan migrations
- Error handling yang komprehensif
- Pencarian lagu berdasarkan title dan performer
- Menampilkan daftar lagu dalam detail album

### ✅ **Fitur Baru V2**
- **Autentikasi & Registrasi User** dengan JWT
- **Manajemen Playlist** dengan hak akses
- **Kolaborasi Playlist** - berbagi playlist dengan user lain
- **Activity Tracking** - mencatat riwayat penambahan/penghapusan lagu
- **Authorization** - kontrol akses berdasarkan owner/kolaborator
- **Foreign Key Relations** - relasi database yang proper

## Teknologi

- **Node.js** - Runtime JavaScript
- **Hapi.js** - Web framework
- **PostgreSQL** - Database dengan Foreign Keys
- **JWT** - JSON Web Tokens untuk autentikasi
- **Joi** - Data validation
- **bcrypt** - Password hashing
- **node-pg-migrate** - Database migrations
- **auto-bind** - Auto binding untuk handler methods
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

5. Sesuaikan konfigurasi database dan JWT keys di file `.env`
```env
# Database config
PGUSER=your_username
PGPASSWORD=your_password
PGDATABASE=openmusic
PGHOST=localhost
PGPORT=5432

# JWT config
ACCESS_TOKEN_KEY=your_access_token_secret_key_here
REFRESH_TOKEN_KEY=your_refresh_token_secret_key_here
```

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

### 🔐 **Authentication**
- `POST /users` - Registrasi user baru
- `POST /authentications` - Login (mendapatkan access & refresh token)
- `PUT /authentications` - Refresh access token
- `DELETE /authentications` - Logout (hapus refresh token)

### 📁 **Albums (Public)**
- `POST /albums` - Tambah album baru
- `GET /albums/{id}` - Get album beserta lagu-lagunya
- `PUT /albums/{id}` - Update album
- `DELETE /albums/{id}` - Hapus album

### 🎵 **Songs (Public)**
- `POST /songs` - Tambah lagu baru
- `GET /songs` - Get semua lagu (support query: title, performer)
- `GET /songs/{id}` - Get detail lagu
- `PUT /songs/{id}` - Update lagu
- `DELETE /songs/{id}` - Hapus lagu

### 🎧 **Playlists (Protected - Requires JWT)**
- `POST /playlists` - Buat playlist baru
- `GET /playlists` - Get playlist milik user (termasuk kolaborasi)
- `DELETE /playlists/{id}` - Hapus playlist (hanya owner)
- `POST /playlists/{id}/songs` - Tambah lagu ke playlist
- `GET /playlists/{id}/songs` - Get lagu-lagu dalam playlist
- `DELETE /playlists/{id}/songs` - Hapus lagu dari playlist
- `GET /playlists/{id}/activities` - Get riwayat aktivitas playlist

### 🤝 **Collaborations (Protected - Requires JWT)**
- `POST /collaborations` - Tambah kolaborator ke playlist
- `DELETE /collaborations` - Hapus kolaborator dari playlist

## Authorization Rules

### **Playlist Access:**
- **Owner**: Dapat melakukan semua operasi (CRUD playlist, manage songs, manage collaborations)
- **Collaborator**: Dapat melihat, menambah, dan menghapus lagu dari playlist
- **Public**: Tidak dapat mengakses playlist

### **Required Headers untuk Protected Endpoints:**
```
Authorization: Bearer <access_token>
```

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

### Users Table
- `id` (VARCHAR 50, PRIMARY KEY)
- `username` (VARCHAR 50, UNIQUE, NOT NULL)
- `password` (TEXT, NOT NULL) - bcrypt hashed
- `fullname` (TEXT, NOT NULL)

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
- `album_id` (VARCHAR 50, FOREIGN KEY → albums.id)
- `created_at` (TEXT, NOT NULL)
- `updated_at` (TEXT, NOT NULL)

### Playlists Table
- `id` (VARCHAR 50, PRIMARY KEY)
- `name` (TEXT, NOT NULL)
- `owner` (VARCHAR 50, FOREIGN KEY → users.id, NOT NULL)

### Playlist_Songs Table (Junction Table)
- `id` (VARCHAR 50, PRIMARY KEY)
- `playlist_id` (VARCHAR 50, FOREIGN KEY → playlists.id, NOT NULL)
- `song_id` (VARCHAR 50, FOREIGN KEY → songs.id, NOT NULL)

### Collaborations Table
- `id` (VARCHAR 50, PRIMARY KEY)
- `playlist_id` (VARCHAR 50, FOREIGN KEY → playlists.id, NOT NULL)
- `user_id` (VARCHAR 50, FOREIGN KEY → users.id, NOT NULL)
- **UNIQUE(playlist_id, user_id)**

### Authentications Table
- `token` (TEXT, NOT NULL) - Refresh tokens

### Playlist_Song_Activities Table
- `id` (VARCHAR 50, PRIMARY KEY)
- `playlist_id` (VARCHAR 50, FOREIGN KEY → playlists.id, NOT NULL)
- `song_id` (VARCHAR 50, FOREIGN KEY → songs.id, NOT NULL)
- `user_id` (VARCHAR 50, FOREIGN KEY → users.id, NOT NULL)
- `action` (VARCHAR 50, NOT NULL) - 'add' or 'delete'
- `time` (TEXT, NOT NULL) - ISO timestamp

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
| ACCESS_TOKEN_KEY | Secret key untuk access token JWT |
| REFRESH_TOKEN_KEY | Secret key untuk refresh token JWT |

## Testing & Tips

### Database Cleanup
Jika testing gagal karena data kotor, bersihkan dengan:
```sql
TRUNCATE albums, songs, users, authentications, playlists, playlist_songs, playlist_song_activities, collaborations;
```

### Postman Testing
1. Jalankan request secara berurutan (Users → Authentications → Playlists)
2. Gunakan Collection Runner untuk testing otomatis
3. Pastikan menyimpan accessToken untuk request yang membutuhkan autentikasi

## Architecture Highlights

- **Clean Architecture** dengan separation of concerns
- **Auto Error Handling** menggunakan Hapi's onPreResponse extension
- **Auto Binding** untuk handler methods menggunakan auto-bind package
- **JWT Strategy** dengan Hapi JWT plugin
- **Foreign Key Constraints** untuk data integrity
- **Activity Logging** untuk audit trail
- **Collaborative Features** dengan proper authorization /albums/{id}` - Get album beserta lagu-lagunya
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