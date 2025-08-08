const autoBind = require('auto-bind');

class UserAlbumLikesHandler {
  constructor(userAlbumLikesService, albumsService, cacheService) {
    this._userAlbumLikesService = userAlbumLikesService;
    this._albumsService = albumsService;
    this._cacheService = cacheService;

    autoBind(this);
  }

  async postUserAlbumLikeHandler(request, h) {
    const { id } = request.params;
    const { id: credentialId } = request.auth.credentials;

    // Verify album exists
    await this._albumsService.getAlbumById(id);
    
    await this._userAlbumLikesService.addLike(credentialId, id);
    
    // Delete cache
    await this._cacheService.delete(`likes:${id}`);

    const response = h.response({
      status: 'success',
      message: 'Album berhasil disukai',
    });
    response.code(201);
    return response;
  }

  async deleteUserAlbumLikeHandler(request, h) {
    const { id } = request.params;
    const { id: credentialId } = request.auth.credentials;

    await this._userAlbumLikesService.deleteLike(credentialId, id);
    
    // Delete cache
    await this._cacheService.delete(`likes:${id}`);

    return {
      status: 'success',
      message: 'Album batal disukai',
    };
  }

  async getUserAlbumLikesHandler(request, h) {
    try {
      const { id } = request.params;
      const cacheKey = `likes:${id}`;
      
      // Try to get from cache
      const likes = await this._cacheService.get(cacheKey);
      
      const response = h.response({
        status: 'success',
        data: {
          likes: parseInt(likes, 10),
        },
      });
      response.header('X-Data-Source', 'cache');
      return response;
    } catch (error) {
      // Get from database if cache miss
      const { id } = request.params;
      const likes = await this._userAlbumLikesService.getLikesCount(id);
      const cacheKey = `likes:${id}`;
      
      // Save to cache (30 minutes = 1800 seconds)
      await this._cacheService.set(cacheKey, likes, 1800);
      
      const response = h.response({
        status: 'success',
        data: {
          likes,
        },
      });
      return response;
    }
  }
}

module.exports = UserAlbumLikesHandler;