const UNSPLASH_SEARCH = 'https://api.unsplash.com/search/photos'
const GOOGLE_TEXT_SEARCH = 'https://maps.googleapis.com/maps/api/place/textsearch/json'
const GOOGLE_PHOTO = 'https://maps.googleapis.com/maps/api/place/photo'
const GOOGLE_PLACES_SEARCH = 'https://places.googleapis.com/v1/places:searchText'

async function followRedirectUrl(url) {
  const response = await fetch(url, { redirect: 'follow' })
  if (!response.ok) return null
  return response.url
}

async function fetchGooglePlacesNewImage(query, apiKey) {
  const response = await fetch(GOOGLE_PLACES_SEARCH, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.photos',
    },
    body: JSON.stringify({ textQuery: query, languageCode: 'en' }),
  })

  if (!response.ok) return null

  const data = await response.json()
  const place = data?.places?.[0]
  const photoName = place?.photos?.[0]?.name
  if (!photoName) return null

  const mediaUrl = `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=1200&key=${encodeURIComponent(apiKey)}`
  const resolvedUrl = await followRedirectUrl(mediaUrl)
  if (!resolvedUrl) return null

  const label = place.displayName?.text || place.formattedAddress || query

  return {
    url: resolvedUrl,
    thumbUrl: resolvedUrl,
    source: 'google_places',
    attribution: label ? `Google Places: ${label}` : 'Google Places',
    placeName: label,
  }
}

async function fetchGooglePlacesClassicImage(query, apiKey) {
  const url = new URL(GOOGLE_TEXT_SEARCH)
  url.searchParams.set('query', query)
  url.searchParams.set('key', apiKey)

  const response = await fetch(url.toString())
  if (!response.ok) return null

  const data = await response.json()
  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    console.warn('[destinationImage] Google Text Search:', data.status, data.error_message || '')
    return null
  }

  const place = data.results?.find((item) => item.photos?.length) || data.results?.[0]
  const photoReference = place?.photos?.[0]?.photo_reference
  if (!photoReference) return null

  const photoUrl = new URL(GOOGLE_PHOTO)
  photoUrl.searchParams.set('maxwidth', '1200')
  photoUrl.searchParams.set('photo_reference', photoReference)
  photoUrl.searchParams.set('key', apiKey)

  const resolvedUrl = await followRedirectUrl(photoUrl.toString())
  if (!resolvedUrl) return null

  const label = place.name || place.formatted_address || query

  return {
    url: resolvedUrl,
    thumbUrl: resolvedUrl,
    source: 'google_places',
    attribution: label ? `Google Places: ${label}` : 'Google Places',
    placeName: label,
  }
}

async function fetchGooglePlacesImage(query, apiKey) {
  const trimmed = query.trim()
  if (!trimmed || !apiKey) return null

  const fromNewApi = await fetchGooglePlacesNewImage(trimmed, apiKey)
  if (fromNewApi) return fromNewApi

  return fetchGooglePlacesClassicImage(trimmed, apiKey)
}

async function fetchUnsplashImage(query, accessKey) {
  const url = new URL(UNSPLASH_SEARCH)
  url.searchParams.set('query', query)
  url.searchParams.set('orientation', 'landscape')
  url.searchParams.set('per_page', '1')

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Client-ID ${accessKey}` },
  })

  if (!response.ok) return null

  const data = await response.json()
  const photo = data?.results?.[0]
  if (!photo?.urls?.regular) return null

  return {
    url: photo.urls.regular,
    thumbUrl: photo.urls.small || photo.urls.thumb,
    source: 'unsplash',
    attribution: photo.user?.name ? `Photo by ${photo.user.name} on Unsplash` : 'Unsplash',
  }
}

async function fetchWikipediaImage(query) {
  const title = encodeURIComponent(query.trim().replace(/\s+/g, '_'))
  const response = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${title}`, {
    headers: { Accept: 'application/json' },
  })

  if (!response.ok) return null

  const data = await response.json()
  const thumb = data?.thumbnail?.source
  if (!thumb) return null

  return {
    url: thumb.replace(/\/(\d+)px-/, '/1200px-'),
    thumbUrl: thumb,
    source: 'wikipedia',
    attribution: data.title ? `Wikipedia: ${data.title}` : 'Wikipedia',
  }
}

async function fetchImageBuffer(url) {
  const response = await fetch(url, { redirect: 'follow' })
  if (!response.ok) return null
  const arrayBuffer = await response.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

async function resolveDestinationImage(
  query,
  { googlePlacesApiKey, unsplashAccessKey } = {},
) {
  const trimmed = String(query || '').trim()
  if (!trimmed) {
    return { url: null, thumbUrl: null, source: null, attribution: null }
  }

  if (googlePlacesApiKey) {
    const google = await fetchGooglePlacesImage(trimmed, googlePlacesApiKey)
    if (google) return google
  }

  if (unsplashAccessKey) {
    const unsplash = await fetchUnsplashImage(trimmed, unsplashAccessKey)
    if (unsplash) return unsplash
  }

  const wiki = await fetchWikipediaImage(trimmed)
  if (wiki) return wiki

  return {
    url: null,
    thumbUrl: null,
    source: null,
    attribution: null,
    message: 'No image found for this destination. Upload your own cover image.',
  }
}

module.exports = { fetchImageBuffer, resolveDestinationImage }
