const { Pool } = require('pg');
const config = require('./config');

class PlaylistsService {
  constructor() {
    this._pool = new Pool({
      ...config.database,
      // Add connection configuration
      max: 10, // Maximum number of connections
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Handle pool errors
    this._pool.on('error', (error) => {
      console.error('Database pool error:', error.message);
    });
  }

  async testConnection() {
    try {
      const client = await this._pool.connect();
      const result = await client.query('SELECT NOW()');
      client.release();
      console.log('Database test successful:', result.rows[0].now);
      return true;
    } catch (error) {
      console.error('Database connection test failed:', error.message);
      throw error;
    }
  }

  async getPlaylistById(id) {
    const client = await this._pool.connect();
    
    try {
      // Get playlist info
      const playlistQuery = {
        text: `SELECT playlists.id, playlists.name 
               FROM playlists 
               WHERE playlists.id = $1`,
        values: [id],
      };

      // Get songs in playlist
      const songsQuery = {
        text: `SELECT songs.id, songs.title, songs.performer 
               FROM playlist_songs
               INNER JOIN songs ON playlist_songs.song_id = songs.id 
               WHERE playlist_songs.playlist_id = $1
               ORDER BY songs.title`,
        values: [id],
      };

      const playlistResult = await client.query(playlistQuery);
      
      if (!playlistResult.rowCount) {
        throw new Error(`Playlist dengan id ${id} tidak ditemukan`);
      }

      const songsResult = await client.query(songsQuery);

      const playlist = playlistResult.rows[0];
      playlist.songs = songsResult.rows;

      return playlist;
    } finally {
      client.release();
    }
  }

  async close() {
    await this._pool.end();
    console.log('Database connection pool closed');
  }
}

module.exports = PlaylistsService;