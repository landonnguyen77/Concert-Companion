import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const Callback = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [status, setStatus] = useState('Processing authentication...');
  const [error, setError] = useState(null);
  const hasAttemptedExchange = useRef(false);

  useEffect(() => {
    const exchangeCodeForToken = async () => {
      if (hasAttemptedExchange.current) return; // Prevent multiple requests
      hasAttemptedExchange.current = true;
      
      // Check if we already have a token
      const existingToken = localStorage.getItem('spotify_access_token');
      if (existingToken) {
        console.log('Token already exists, redirecting...');
        setStatus('Already authenticated! Redirecting...');
        setTimeout(() => navigate('/'), 1000);
        return;
      }
      
      try {
        // Debug: Log the full URL and search params
        console.log('Full URL:', window.location.href);
        console.log('Search params:', location.search);
        
        // Parse the authorization code from the URL
        const params = new URLSearchParams(location.search);
        const code = params.get('code');
        const error = params.get('error');
        
        console.log('Authorization code:', code);
        console.log('Error parameter:', error);
        
        if (error) {
          setError(`Spotify authorization error: ${error}`);
          return;
        }
        
        if (!code) {
          setError('No authorization code found in callback URL');
          return;
        }

        console.log('Authorization code:', code);
        setStatus('Exchanging code for access token...');

        // Send code to backend to exchange for access token
        console.log('Sending request to backend...');
        const response = await fetch('http://localhost:5001/api/spotify/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ code }),
        });
        
        console.log('Response received:', response);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to exchange code for token');
        }

        const tokenData = await response.json();
        console.log('✅ Access token received:', tokenData);

        // Store the access token (you might want to use a state management solution)
        localStorage.setItem('spotify_access_token', tokenData.access_token);
        localStorage.setItem('spotify_refresh_token', tokenData.refresh_token);

        setStatus('Authentication successful! Redirecting...');
        
        // Redirect back to home page after successful authentication
        setTimeout(() => {
          navigate('/');
        }, 2000);

      } catch (error) {
        console.error('❌ Token exchange failed:', error);
        setError(error.message);
        setStatus('Authentication failed');
      }
    };

    exchangeCodeForToken();
  }, [location, navigate]);

  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h2>Spotify Authentication</h2>
      <p>{status}</p>
      {error && (
        <div style={{ color: 'red', marginTop: '1rem' }}>
          <p>Error: {error}</p>
          <button onClick={() => navigate('/')} style={{ marginTop: '1rem' }}>
            Return to Home
          </button>
        </div>
      )}
    </div>
  );
};

export default Callback;
