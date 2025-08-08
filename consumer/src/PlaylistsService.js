const { Pool } = require('pg');
const config = require('./config');

class PlaylistsService {
  constructor() {
    this._pool = new Pool({
      ...config.database,
      // Connection pool configuration untuk stability
      max: 5, // Reduced max connections
      min: 1, // Minimum connections
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      acquireTimeoutMillis: 60000,
      // Add keepalive untuk prevent connection drops
      keepAlive: true,
      keepAliveInitialDelayMillis: 0,
    });

    // Handle pool errors dengan reconnection
    this._pool.on('error', (error) => {
      console.error('Database pool error:', error.message);
      
      // For connection errors, attempt to recreate pool
      if (error.code === 'ECONNRESET' || error.code === 'ECONNREFUSED') {
        console.log('Attempting to recreate database pool...');
        this._recreatePool();
      }
    });

    this._pool.on('connect', () => {
      console.log('New database client connected');
    });

    this._pool.on('remove', () => {
      console.log('Database client removed from pool');
    });
  }

  _recreatePool() {
    // Recreate pool with exponential backoff
    setTimeout(() => {
      try {
        this._pool = new Pool({
          ...config.database,
          max: 5,
          min: 1,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 10000,
          acquireTimeoutMillis: 60000,
          keepAlive: true,
          keepAliveInitialDelayMillis: 0,
        });
        console.log('Database pool recreated successfully');
      } catch (error) {
        console.error('Failed to recreate database pool:', error.message);
        // Retry after longer delay
        setTimeout(() => this._recreatePool(), 10000);
      }
    }, 5000);
  }

  async testConnection() {
    let client;
    try {
      console.log('Testing database connection...');
      client = await this._pool.connect();
      
      const result = await client.query('SELECT NOW() as current_time, version() as pg_version');
      console.log('Database connection test successful:');
      console.log('- Current time:', result.rows[0].current_time);
      console.log('- PostgreSQL version:', result.rows[0].pg_version.split(',')[0]);
      
      return true;
    } catch (error) {
      console.error('Database connection test failed:', error.message);
      
      // Provide specific error handling
      if (error.code === 'ECONNREFUSED') {
        throw new Error('Database server is not running or refusing connections');
      } else if (error.code === 'ENOTFOUND') {
        throw new Error('Database host not found. Check PGHOST configuration.');
      } else if (error.code === '28P01') {
        throw new Error('Database authentication failed. Check credentials.');
      } else if (error.code === '3D000') {
        throw new Error('Database does not exist. Check PGDATABASE configuration.');
      }
      
      throw error;
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  async getPlaylistById(id) {
    let client;
    
    try {
      console.log(`Fetching playlist with ID: ${id}`);
      client = await this._pool.connect();
      
      // Begin transaction untuk consistency
      await client.query('BEGIN');
      
      // Get playlist info dengan better error handling
      const playlistQuery = {
        text: `SELECT p.id, p.name, u.username as owner
               FROM playlists p
               INNER JOIN users u ON p.owner = u.id
               WHERE p.id = $1`,
        values: [id],
      };

      const playlistResult = await client.query(playlistQuery);
      
      if (!playlistResult.rowCount) {
        throw new Error(`Playlist dengan id ${id} tidak ditemukan`);
      }

      const playlist = playlistResult.rows[0];
      console.log(`Found playlist: ${playlist.name} (owner: ${playlist.owner})`);

      // Get songs in playlist dengan proper JOIN
      const songsQuery = {
        text: `SELECT s.id, s.title, s.performer, s.year, s.genre, s.duration
               FROM playlist_songs ps
               INNER JOIN songs s ON ps.song_id = s.id 
               WHERE ps.playlist_id = $1
               ORDER BY s.title ASC`,
        values: [id],
      };

      const songsResult = await client.query(songsQuery);
      playlist.songs = songsResult.rows;
      
      console.log(`Found ${songsResult.rowCount} songs in playlist`);

      // Commit transaction
      await client.query('COMMIT');

      return {
        id: playlist.id,
        name: playlist.name,
        songs: playlist.songs
      };
      
    } catch (error) {
      console.error('Error in getPlaylistById:', error.message);
      
      // Rollback transaction on error
      if (client) {
        try {
          await client.query('ROLLBACK');
        } catch (rollbackError) {
          console.error('Rollback error:', rollbackError.message);
        }
      }
      
      // Re-throw with more context
      if (error.message.includes('tidak ditemukan')) {
        throw error; // Re-throw as-is for not found errors
      } else if (error.code === 'ECONNRESET') {
        throw new Error(`Database connection lost while fetching playlist ${id}`);
      } else {
        throw new Error(`Database error while fetching playlist ${id}: ${error.message}`);
      }
      
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  async close() {
    try {
      console.log('Closing database connection pool...');
      await this._pool.end();
      console.log('Database connection pool closed successfully');
    } catch (error) {
      console.error('Error closing database pool:', error.message);
      throw error;
    }
  }

  // Health check method
  async healthCheck() {
    try {
      const client = await this._pool.connect();
      await client.query('SELECT 1');
      client.release();
      return { status: 'healthy', timestamp: new Date().toISOString() };
    } catch (error) {
      return { 
        status: 'unhealthy', 
        error: error.message,
        timestamp: new Date().toISOString() 
      };
    }
  }

  // Get pool status
  getPoolStatus() {
    return {
      totalCount: this._pool.totalCount,
      idleCount: this._pool.idleCount,
      waitingCount: this._pool.waitingCount,
    };
  }
}

module.exports = PlaylistsService;