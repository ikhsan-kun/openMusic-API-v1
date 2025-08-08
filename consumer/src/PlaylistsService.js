const { Pool } = require('pg');
const config = require('./config');

class PlaylistsService {
  constructor() {
    this._pool = new Pool(config.database);
  }

  async getPlaylistById(id) {
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
             JOIN songs ON playlist_songs.song_id = songs.id 
             WHERE playlist_songs.playlist_id = $1
             ORDER BY songs.title`,
      values: [id],
    };

    const playlistResult = await this._pool.query(playlistQuery);
    const songsResult = await this._pool.query(songsQuery);

    if (!playlistResult.rowCount) {
      throw new Error('Playlist tidak ditemukan');
    }

    const playlist = playlistResult.rows[0];
    playlist.songs = songsResult.rows;

    return playlist;
  }
}

module.exports = PlaylistsService;