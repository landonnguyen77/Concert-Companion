import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const Callback = () => {
  const location = useLocation();

  useEffect(() => {
    // Parse the authorization code from the URL
    const params = new URLSearchParams(location.search);
    const code = params.get('code');
    if (code) {
      // You would send this code to your backend to exchange for an access token
      console.log('Authorization code:', code);
      // TODO: Implement backend call to exchange code for token
    } else {
      console.error('No authorization code found in callback URL');
    }
  }, [location]);

  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h2>Spotify Authentication</h2>
      <p>Processing authentication...</p>
    </div>
  );
};

export default Callback;
