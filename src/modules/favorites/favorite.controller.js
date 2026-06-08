const { z } = require('zod')
const mongoose = require('mongoose')
const { asyncHandler } = require('../../utils/asyncHandler')
const { HttpError } = require('../../utils/httpError')
const { Favorite } = require('./favorite.model')

const objectId = z
  .string()
  .refine((value) => mongoose.Types.ObjectId.isValid(value), { message: 'Invalid id' })

const providerIdParamsSchema = z.object({ providerId: objectId })

const listFavorites = asyncHandler(async (req, res) => {
  const favorites = await Favorite.find({ organizer: req.user._id })
    .populate('provider', 'name email providerType avatar rating reviewCount companyName')
    .sort({ createdAt: -1 })

  res.json({
    success: true,
    count: favorites.length,
    favorites,
    providers: favorites.map((f) => f.provider).filter(Boolean),
  })
})

const addFavorite = asyncHandler(async (req, res) => {
  const { User } = require('../auth/user.model')
  const provider = await User.findById(req.params.providerId)
  if (!provider || provider.role !== 'provider' || provider.status !== 'active') {
    throw new HttpError('Provider not found', 404)
  }

  try {
    const favorite = await Favorite.create({
      organizer: req.user._id,
      provider: provider._id,
    })
    await favorite.populate('provider', 'name email providerType avatar rating reviewCount companyName')

    res.status(201).json({
      success: true,
      favorite,
    })
  } catch (error) {
    if (error.code === 11000) {
      throw new HttpError('Provider is already in your favorites', 409)
    }
    throw error
  }
})

const removeFavorite = asyncHandler(async (req, res) => {
  const result = await Favorite.deleteOne({
    organizer: req.user._id,
    provider: req.params.providerId,
  })

  if (!result.deletedCount) {
    throw new HttpError('Favorite not found', 404)
  }

  res.json({
    success: true,
    message: 'Removed from favorites',
  })
})

module.exports = {
  addFavorite,
  listFavorites,
  providerIdParamsSchema,
  removeFavorite,
}
