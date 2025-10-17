const axios = require('axios');
const { query } = require('../config/database');
const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';


async function getUserProfile(accessToken) {
  try {
    const response = await axios.get(`${SPOTIFY_API_BASE}/me`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching user profile:', error.response?.data || error.message);
    throw new Error('Failed to fetch user profile from Spotify');
  }
}


async function getUserTopArtists(accessToken, limit = 20) {
  try {
    const response = await axios.get(`${SPOTIFY_API_BASE}/me/top/artists`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      },
      params: {
        limit: limit,
        time_range: 'medium_term' // medium_term = last 6 months
      }
    });
    return response.data.items;
  } catch (error) {
    console.error('Error fetching top artists:', error.response?.data || error.message);
    throw new Error('Failed to fetch top artists from Spotify');
  }
}


async function saveUser(spotifyProfile, accessToken, refreshToken, expiresIn) {
  try {
    const expiresAt = new Date(Date.now() + expiresIn * 1000);
    
    const result = await query(
      `INSERT INTO users (
        spotify_id, 
        email, 
        display_name, 
        profile_image_url, 
        country,
        spotify_access_token,
        spotify_refresh_token,
        token_expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (spotify_id) 
      DO UPDATE SET
        email = EXCLUDED.email,
        display_name = EXCLUDED.display_name,
        profile_image_url = EXCLUDED.profile_image_url,
        country = EXCLUDED.country,
        spotify_access_token = EXCLUDED.spotify_access_token,
        spotify_refresh_token = EXCLUDED.spotify_refresh_token,
        token_expires_at = EXCLUDED.token_expires_at,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *`,
      [
        spotifyProfile.id,
        spotifyProfile.email,
        spotifyProfile.display_name,
        spotifyProfile.images?.[0]?.url || null,
        spotifyProfile.country,
        accessToken,
        refreshToken,
        expiresAt
      ]
    );
    
    return result.rows[0];
  } catch (error) {
    console.error('Error saving user:', error);
    throw new Error('Failed to save user to database');
  }
}


async function saveUserArtists(userId, artists) {
  try {
    // Delete old artists for this user
    await query('DELETE FROM user_artists WHERE user_id = $1', [userId]);
    
    // Insert new artists
    for (let i = 0; i < artists.length; i++) {
      const artist = artists[i];
      await query(
        `INSERT INTO user_artists (
          user_id,
          artist_name,
          artist_spotify_id,
          artist_image_url,
          genres,
          popularity,
          rank
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          userId,
          artist.name,
          artist.id,
          artist.images?.[0]?.url || null,
          artist.genres || [],
          artist.popularity,
          i + 1 // rank based on position
        ]
      );
    }
    
    console.log(`Saved ${artists.length} artists for user ${userId}`);
  } catch (error) {
    console.error('Error saving user artists:', error);
    throw new Error('Failed to save user artists to database');
  }
}


async function getUserBySpotifyId(spotifyId) {
  try {
    const result = await query(
      'SELECT * FROM users WHERE spotify_id = $1',
      [spotifyId]
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error fetching user:', error);
    throw new Error('Failed to fetch user from database');
  }
}


async function getUserArtistsFromDB(userId) {
  try {
    const result = await query(
      `SELECT * FROM user_artists 
       WHERE user_id = $1 
       ORDER BY rank ASC`,
      [userId]
    );
    return result.rows;
  } catch (error) {
    console.error('Error fetching user artists:', error);
    throw new Error('Failed to fetch user artists from database');
  }
}


async function completeSpotifyAuth(accessToken, refreshToken, expiresIn) {
  try {
    console.log('Starting Spotify authentication flow...');
    
    // 1. Get user profile from Spotify
    console.log('📱 Fetching user profile...');
    const profile = await getUserProfile(accessToken);
    
    // 2. Save user to database
    console.log('💾 Saving user to database...');
    const user = await saveUser(profile, accessToken, refreshToken, expiresIn);
    
    // 3. Get top artists from Spotify
    console.log('Fetching top artists...');
    const topArtists = await getUserTopArtists(accessToken);
    
    // 4. Save artists to database
    console.log('Saving artists to database...');
    await saveUserArtists(user.id, topArtists);
    
    console.log('Spotify authentication completed successfully!');
    
    return {
      user,
      topArtists
    };
  } catch (error) {
    console.error('Error in Spotify auth flow:', error);
    throw error;
  }
}

module.exports = {
  getUserProfile,
  getUserTopArtists,
  saveUser,
  saveUserArtists,
  getUserBySpotifyId,
  getUserArtistsFromDB,
  completeSpotifyAuth
};