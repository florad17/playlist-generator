require('dotenv').config();
const {fetch, Headers } = require('undici');
const express = require('express');
const axios = require('axios');
const SpotifyWebApi = require('spotify-web-api-node');
const { GoogleGenAI } = require('@google/genai');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');

global.fetch = fetch;
global.Headers = Headers;

const app = express();
const port = process.env.PORT || 3001;
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const clientId = process.env.SPOTIFY_CLIENT_ID;
const redirectUri = process.env.SPOTIFY_REDIRECT_URI;
const pkceStore = new Map();

function generateCodeVerifier() {
    return crypto.randomBytes(64).toString('hex');
}

function generateCodeChallenge(verifier) {
    const hash = crypto.createHash('sha256').update(verifier).digest();
    return hash.toString('base64url');
}

app.get('/auth/spotify', (req, res) => {
    const state = crypto.randomBytes(16).toString('hex');
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);

    pkceStore.set(state, codeVerifier);

    const scope = [
        'user-library-read', 
        'playlist-modify-public',
        'playlist-modify-private',
    ].join(' ');
    const authUrl = `https://accounts.spotify.com/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&code_challenge_method=S256&code_challenge=${codeChallenge}&state=${state}&scope=${encodeURIComponent(scope)}&show_dialog=true`; 

  res.redirect(authUrl);
})

app.get('/callback', async (req, res) => {
    const { code, state } = req.query;

    const codeVerifier = pkceStore.get(state);
    if(!codeVerifier) {
        return res.status(400).send('Missing or invalid PKCE state');
    }

    try {
        const tokenRes = await axios.post('https://accounts.spotify.com/api/token', new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: redirectUri,
            client_id: clientId,
            code_verifier: codeVerifier,
        }), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        });

        const accessToken = tokenRes.data.access_token;
        pkceStore.delete(state);
        return res.redirect(`${process.env.FRONTEND_URL}/#access_token=${accessToken}`);
    } catch (err) {
        console.error('Spotify PKCE auth failed:', err.response?.data || err.message);
        return res.status(500).send('Spotify authentication failed.');
    }
});

async function getPlaylistPrompt(prompt) {
    try {
        const result = await ai.models.generateContent ({
            model: "gemini-2.0-flash",
            contents : prompt
        });
        const text = result?.text;
        if(!text) throw new Error('No text generated by Gemini.');
        return text;
    } catch(err) {
        console.error('Gemini error:', err.message);
        throw err;
    }
}

app.post('/generate-playlist', async (req, res) => {
    const{prompt} = req.body;

    if (!prompt) return res.status(400).send('Missing prompt.');

    try {
        const playlist = await getPlaylistPrompt(prompt);
        res.json({ playlist });
    } catch (err) {
        res.status(500).send('Failed to generate playlist');
    }
});

app.post('/export-playlist', async (req, res) => {
    const { playlistName, tracks, accessToken } = req.body;
  
    if (!playlistName || !tracks || !accessToken) {
      return res.status(400).json({ error: 'Missing required fields.' });
    }
  
    try {
      const meRes = await axios.get('https://api.spotify.com/v1/me', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const userId = meRes.data.id;
      console.log('Authenticated Spotify user:', userId);
  
      const createRes = await axios.post(
        `https://api.spotify.com/v1/users/${userId}/playlists`,
        {
          name: playlistName,
          description: 'Playlist generated by AI 🎵',
          public: true,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
  
      const playlistId = createRes.data.id;
      const trackUris = [];
  
      for (const track of tracks) {
        const query = `${track.name} ${track.artist}`;
        console.log('Searching for track:', query);
        const searchRes = await axios.get(
          `https://api.spotify.com/v1/search`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
            params: {
              q: query,
              type: 'track',
              limit: 1,
            },
          }
        );
  
        const found = searchRes?.data?.tracks?.items?.[0];
        if (found?.uri) {
          trackUris.push(found.uri);
        } else {
          console.warn(`Track not found: ${query}`);
        }
      }
  
      if (trackUris.length === 0) {
        return res.status(400).json({ error: 'No valid tracks found to add.' });
      }
  
      await axios.post(
        `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
        { uris: trackUris },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
  
      return res.json({
        playlistUrl: `https://open.spotify.com/playlist/${playlistId}`,
      });
  
    } catch (err) {
      console.error('Export error:', err.response?.data || err.message || err);
      res.status(500).json({
        error: 'Error exporting playlist.',
        message: err.response?.data?.error?.message || err.message,
        raw: err.response?.data || null,
      });
    }
  });

app.listen(port, () => {
    console.log(`Backend running on port ${port}`);
});
