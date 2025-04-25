require('dotenv').config();
const express = require('express');
const axios = require('axios');
const SpotifyWebApi = require('spotify-web-api-node');

const app = express();
const port = 3001;
const cors = require('cors');

app.use(cors());

app.use(express.json());

const spotifyApi = new SpotifyWebApi({
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    redirectUri: process.env.SPOTIFY_REDIRECT_URI,
});


app.get('/auth/spotify', (req, res) => {
    const authorizeURL = spotifyApi.createAuthorizeURL(['user-library-read', 'playlist-modify-public'], 'state');
    res.redirect(authorizeURL)
})

app.get('/callback', async (req, res) => {
    const { code } = req.query;

    if(!code) {
        return res.status(400).send('Error: No code received');
    }

    try {
        const data = await spotifyApi.authorizationCodeGrant(code);
        const accessToken = data.body['access_token'];
        const refreshToken = data.body['refresh_token'];
        
        spotifyApi.setAccessToken(accessToken);
        spotifyApi.refreshAccessToken(refreshToken);

        res.json({
            accessToken: accessToken,
            refreshToken: refreshToken,
            message: "Successfully authenticated with Spotify!",
        });
    } catch (err) {
        console.error('Error dring callback', err);
        res.status(500).send('Error during authentication');
    }
});

async function getPlaylistPrompt(prompt) {
    try {
        const response = await axios.post('https://api.google.com/gemini', {
            prompt: prompt,
            apiKey: process.env.GEMINI_API_KEY,
    });
    return response.data
    } catch (error) {
        console.error('Error fetching data from Gemini API: ', error);
        throw error;
    }
};

async function searchSpotifyTracks(keywords) {
    await authenticateSpotify();
    const tracks = await spotifyApi.searchTracks(keywords, { limit: 10 });
    return tracks.body.tracks.items.map(track => ({ 
        name: track.name,
        artist: track.artists[0].name,
        url: track.external_urls.spotify,
    }))
};

app.post('/generate-playlist', async (req, res) => {
    console.log('Received request body:', req.body);

    const {prompt} = req.body;

    if (!prompt) {
        return res.status(400).send('Error: Prompt is missing');
    }
    try {
        const geminiResponse = await getPlaylistPrompt(prompt);
        const playlist = await searchSpotifyTracks(geminiResponse);
        res.json(playlist);
    } catch (error) {
        console.error('Error generating playlist:', error)
        res.status(500).send('Error generating playlist');
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`)
})









console.log('Spotify Client ID:', process.env.SPOTIFY_CLIENT_ID);  // Debug log
