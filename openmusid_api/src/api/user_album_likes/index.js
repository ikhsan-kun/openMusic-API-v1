const UserAlbumLikesHandler = require('./handler');
const routes = require('./routes');

module.exports = {
  name: 'user_album_likes',
  version: '1.0.0',
  register: async (server, { userAlbumLikesService, albumsService, cacheService }) => {
    const userAlbumLikesHandler = new UserAlbumLikesHandler(
      userAlbumLikesService, 
      albumsService, 
      cacheService
    );
    server.route(routes(userAlbumLikesHandler));
  },
};