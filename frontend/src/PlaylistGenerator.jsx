import React, { useState, useEffect } from 'react';
import './App.css';
import Playlist from './Playlist'
const backendUrl = process.env.REACT_APP_BACKEND_URL || 'https://playlist-generator-d0lw.onrender.com';

function PlaylistGenerator() {
    const [prompt, setPrompt] = useState ('');
    const [playlist, setPlaylist] = useState([]);
    const [loading, setLoading] = useState(false);
    const [accessToken, setAccessToken] = useState('');
    const [playlistUrl, setPlaylistUrl] = useState('');
    const [exportLoading, setExportLoading] = useState(false);
    const [tokenExpiration, setTokenExpiration] = useState(null);
    

    useEffect(() => {
        let token = null;

        if(window.location.hash) {
            const hashParams = new URLSearchParams(window.location.hash.substring(1));
            token = hashParams.get('access_token');
            console.log('Access token found in hash: ', token);

            if (token) {
                const expiration = Date.now() + 3600 * 1000;
                setAccessToken(token);
                setTokenExpiration(expiration);
                localStorage.setItem('spotify_access_token', token);
                localStorage.setItem('spotify_token_expiration', expiration.toString());
                
                sessionStorage.removeItem('redirectedOnce')
                window.history.replaceState(null, '', window.location.pathname);
                return;
            }
        } 

        const savedToken = localStorage.getItem('spotify_access_token');
        const savedExpiration = localStorage.getItem('spotify_token_expiration');

        if(savedToken && savedExpiration) {
            const expiration = parseInt(savedExpiration);
            if (Date.now() < expiration) {
                console.log('Using saved token from localStorage');
                setAccessToken(savedToken);
                setTokenExpiration(expiration);
        } else {
            localStorage.removeItem('spotify_access_token');
            localStorage.removeItem('spotify_token_expiration');
        }
    } 

    if(!sessionStorage.getItem('redirectedOnce')){
        console.log('No token found. Redirecting...');
        sessionStorage.setItem('redirectedOnce', 'true');
        window.location.href = `${backendUrl}/auth/spotify`;
    }
      }, []);

      const isTokenExpired = () => {
        if (!tokenExpiration) return true;
        return Date.now() > tokenExpiration;
    }

    const parsePlaylist = (text) => {
        const lines = text.split('\n').filter(line => line.trim() !== '');

        return lines.slice(0, 20).map(line => {
            const regex = /^\d+\.\s*(.+?)\s*--+\s*(.+)$/;
            const match = line.match(regex);
            if (match && match[1] && match[2]) {
                return { name: match[1].trim(), artist: match[2].trim(), url: '#' };
              }
            return null;
        }).filter(Boolean);
    };


    const handleGenerate = async () => {
        if (!prompt) {
            alert('Please enter a prompt!');
            return;
        }
        setLoading(true);

        const modifiedPrompt = `

        ${prompt}

        ---

        Important:
        Format the playlist strictly as a numbered list like "1. Song Name -- Artist name" with NO extra commentary, desciptions, or explanations.
        Only return the list, nothing else.
        At least 20 songs if possible.
        `;

        try {
            const res = await fetch(`${backendUrl}/generate-playlist`, {
                method: 'POST',
                headers: {
                    'Content-Type' : 'application/json'
                },
                body: JSON.stringify({ 
                    prompt: modifiedPrompt 
                })
            });

            if(!res.ok) {
                const errorText = await res.text();
                throw new Error(errorText);
            }
            const data = await res.json();
            const parsed = parsePlaylist(data.playlist);
            console.log('parsed playlist array: ', parsed);
            setPlaylist(parsed)
        } catch (error) {
            console.error('Error generating playlist:', error);
            alert('Failed to generate playlist.');
        } finally {
            setLoading(false)
        }
    };

    const handleExport = async () => {
        if(!accessToken) {
            alert('Please login with Spotify.');
            return;
        }
        if(isTokenExpired()) {
            alert('Session expired. Please log in again');
            localStorage.clear();
            sessionStorage.clear();
            window.location.href = `${backendUrl}/auth/spotify`;
            return;
        }
        setExportLoading(true);
        try {
            const res = await fetch(`${backendUrl}/export-playlist`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    playlistName: `Generated Playlist - Fordham 2025`,
                    tracks: playlist,
                    accessToken: accessToken
                })
            });

            if(!res.ok) {
                const errorJson = await res.json().catch(() => ({}));
                throw new Error(errorJson.message || 'Unknown export error');
            }

            const data = await res.json();
            alert('Playlist successfully exported to Spotify!');
            setPlaylistUrl(data.playlistUrl)
        } catch (error) {
            console.error('Error exporting to Spotfy: ', error);
            if (
                error.message?.includes('403') ||
                error.message?.toLowerCase().includes('invalid token') ||
                error.message?.toLowerCase().includes('access token')
            ) {
                alert('Your Spotify sesion expired or has missing permissions. Re-authenicating...');
                localStorage.removeItem('spotify_access_token');
                window.location.href = `${backendUrl}/auth/spotify`;
                return;
            }
            alert('Failed to export playlist.');
        } finally {
            setExportLoading(false);
        }
    };

    const handleReset = () => {
        setPlaylist([]);
        setPrompt('');
        setPlaylistUrl('');
        setLoading(false);
        setExportLoading(false);
    }

    return (
        <div className="container fade-in">
            <h1 className="title"> Playlist Generator</h1>
            {(!accessToken || isTokenExpired()) && (
                <button
                    onClick={() => window.location.href = `${backendUrl}/auth/spotify`}
                    className="spotify-btn"
                    >
                        Login with Spotify
                    </button>
            )}
            <div className="input-group">
            {playlist.length === 0 ? (
                <>
                <input 
                    type="text"
                    value = {prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Type your playlist idea..."
                    className="input"
                />
                <button onClick={handleGenerate} className="generate-btn">
                    {loading ? (
                        <div className="dot-bounce">
                            <div></div><div></div><div></div>
                        </div>
                    ) : (
                        'Generate Playlist'
                    )}
                </button>
                </>
            ) : (
                <button onClick={handleReset} className="generate-btn">
                    Generate New Playlist
                </button>
                )}
            </div>
    <div className="playlist-section">
        {playlist.map((track, index) => (
            <div className="track fade-in-up" key={index}>
                {track.name} - {track.artist}
            </div>
        ))}
    </div>

            {playlist.length > 0 && (
                <div className="export-section">
                    <button onClick={handleExport} className="spotify-btn">
                        {exportLoading ? (
                            <div className="dot-bounce">
                                <div></div><div></div><div></div>
                            </div>
                        ) : (
                            "Export to Spotify"
                        )}
                    </button>
                    {playlistUrl && (
                        <div className="link-section">
                            <a href = {playlistUrl} target="_blank" rel = "noopener noreferrer">
                                Open your new Spotify Playlist!
                            </a>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default PlaylistGenerator;