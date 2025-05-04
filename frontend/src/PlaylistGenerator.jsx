import React, { useState, useEffect } from 'react';
import './App.css';
import Playlist from './Playlist'

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
        } else if (window.location.search) {
            const searchParams = new URLSearchParams(window.location.search);
            token = searchParams.get('access_token');
        }

        if(token) {
            console.log('Captured Spotify Token:', token);
            setAccessToken(token);
            setTokenExpiration(Date.now() + (3600*1000));
            localStorage.setItem('spotify_access_token', token);
            localStorage.setItem('spotify_token_expiration', (Date.now() + (3600 * 1000)).toString())
            window.history.replaceState(null, '', window.location.pathname);
        } else {
            const savedToken = localStorage.getItem('spotify_access_token');
            const savedExpiration = localStorage.getItem('spotify_token_expiration');
            if(savedToken && savedExpiration && Date.now() < parseInt(savedExpiration)) {
                console.log('Loaded token from Local Storage', savedToken);
                setAccessToken(savedToken);
                setTokenExpiration(parseInt(savedExpiration));
            } else {
                console.log('No access token found.')
            }
        }
      }, []);

      const isTokenExpired = () => {
        if (!tokenExpiration) return true;
        return Date.now() > tokenExpiration;
    }

    const parsePlaylist = (text) => {
        const lines = text.split('\n').filter(line => line.trim() !== '');

        return lines.slice(0, 20).map(line => {
            const regex = /^\d+\.\s*(.+?)\s*-+\s*(.+)$/;
            const match = line.match(regex);

            if(match){
                return{name: match[1].trim(), artist: match[2].trim(), url: "#"};
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
            const res = await fetch('https://playlist-generator-d0lw.onrender.com/generate-playlist', {
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
        setExportLoading(true);
        try {
            const res = await fetch('https://playlist-generator-d0lw.onrender.com/export-playlist', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    playlistName: `Generated Playlist - Fordham NOW`,
                    tracks: playlist,
                    accessToken: accessToken
                })
            });

            if(!res.ok) {
                const errorText = await res.text();
                throw new Error(errorText);
            }

            const data = await res.json();
            alert('Playlist successfully exported to Spotify!');
            setPlaylistUrl(data.playlistUrl)
        } catch (error) {
            console.error('Error exporting to Spotfy: ', error);
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
                    onClick={() => window.location.href = 'https://playlist-generator-d0lw.onrender.com/auth/spotify'}
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