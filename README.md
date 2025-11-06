# Concert Companion

A full-stack web application that connects to users' Spotify accounts to provide personalized concert recommendations based on their listening history, with integrated travel planning features.

## Features

- **Spotify Integration**: Connect your Spotify account to analyze music taste
- **Concert Recommendations**: Get personalized suggestions based on listening history  
- **Location-Based Search**: Find concerts within your preferred travel distance
- **Travel Planning**: Hotel, restaurant, and attraction recommendations near venues
- **Event Management**: Save and track your favorite concerts

## Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL
- **Authentication**: JWT with Spotify OAuth
- **APIs**: Spotify Web API, Ticketmaster Discovery API, Google Places API

## Environment Variables

Configure these in `server/.env` (or your deployment environment) before starting the backend:

- `TICKETMASTER_API_KEY` &mdash; Ticketmaster Discovery API key used to look up concerts for the user's top artists.
