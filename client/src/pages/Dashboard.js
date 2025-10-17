// client/src/pages/Dashboard.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [topArtists, setTopArtists] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      // Get stored user data from localStorage
      const spotifyId = localStorage.getItem('spotify_user_id');
      
      if (!spotifyId) {
        // Not logged in, redirect to home
        navigate('/');
        return;
      }

      console.log('Fetching user profile for:', spotifyId);

      // Fetch user profile and top artists from backend
      const response = await fetch(`http://localhost:5001/api/user/profile/${spotifyId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch user data');
      }

      const data = await response.json();
      console.log('User data received:', data);

      setUser(data.user);
      setTopArtists(data.top_artists);
      setLoading(false);

    } catch (error) {
      console.error('Error fetching user data:', error);
      setError(error.message);
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('spotify_access_token');
    localStorage.removeItem('spotify_refresh_token');
    localStorage.removeItem('spotify_user_id');
    navigate('/');
  };

  const handleRefreshArtists = async () => {
    try {
      setLoading(true);
      const spotifyId = localStorage.getItem('spotify_user_id');

      const response = await fetch('http://localhost:5001/api/user/refresh-artists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ spotifyId })
      });

      if (!response.ok) {
        throw new Error('Failed to refresh artists');
      }

      // Reload the data
      await fetchUserData();
    } catch (error) {
      console.error('Error refreshing artists:', error);
      alert('Failed to refresh artists. Please try again.');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading your music taste...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard">
        <div className="error-container">
          <h2>Oops! Something went wrong</h2>
          <p>{error}</p>
          <button onClick={() => navigate('/')} className="btn btn-primary">
            Go Back Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="container">
          <h1>Concert Companion</h1>
          <button onClick={handleLogout} className="btn btn-logout">
            Logout
          </button>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="container">
          {/* User Profile Section */}
          <section className="profile-section">
            <div className="profile-card">
              {user.profile_image_url && (
                <img 
                  src={user.profile_image_url} 
                  alt={user.display_name}
                  className="profile-image"
                />
              )}
              <div className="profile-info">
                <h2>Welcome back, {user.display_name}!</h2>
                <p className="profile-email">{user.email}</p>
                {user.country && (
                  <p className="profile-country">📍 {user.country}</p>
                )}
              </div>
            </div>
          </section>

          {/* Top Artists Section */}
          <section className="artists-section">
            <div className="section-header">
              <h2>Your Top Artists</h2>
              <button 
                onClick={handleRefreshArtists} 
                className="btn btn-secondary"
                disabled={loading}
              >
                🔄 Refresh
              </button>
            </div>

            {topArtists.length === 0 ? (
              <p className="no-artists">No artists found. Listen to more music on Spotify!</p>
            ) : (
              <div className="artists-grid">
                {topArtists.map((artist, index) => (
                  <div key={artist.id} className="artist-card">
                    <div className="artist-rank">#{artist.rank}</div>
                    {artist.artist_image_url && (
                      <img 
                        src={artist.artist_image_url} 
                        alt={artist.artist_name}
                        className="artist-image"
                      />
                    )}
                    <div className="artist-info">
                      <h3 className="artist-name">{artist.artist_name}</h3>
                      {artist.genres && artist.genres.length > 0 && (
                        <div className="artist-genres">
                          {artist.genres.slice(0, 2).map((genre, i) => (
                            <span key={i} className="genre-tag">{genre}</span>
                          ))}
                        </div>
                      )}
                      <div className="artist-popularity">
                        <span className="popularity-label">Popularity:</span>
                        <div className="popularity-bar">
                          <div 
                            className="popularity-fill" 
                            style={{ width: `${artist.popularity}%` }}
                          ></div>
                        </div>
                        <span className="popularity-value">{artist.popularity}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Next Steps Section */}
          <section className="next-steps">
            <div className="next-steps-card">
              <h2>What's Next?</h2>
              <p>Soon you'll be able to:</p>
              <ul>
                <li>🎫 Find concerts for your favorite artists</li>
                <li>📍 Search by location and distance</li>
                <li>🗺️ Get hotel and restaurant recommendations</li>
                <li>💾 Save and track your concert plans</li>
              </ul>
              <p className="coming-soon">Coming soon...</p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;