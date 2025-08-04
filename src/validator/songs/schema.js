const Joi = require('@hapi/joi');

const SongPayloadSchema = Joi.object({
  title: Joi.string().required(),
  year: Joi.number().integer().min(1900).max(2023).required(),
  genre: Joi.string().required(),
  performer: Joi.string().required(),
  duration: Joi.number().integer().positive(),
  albumId: Joi.string(),
});

module.exports = { SongPayloadSchema };