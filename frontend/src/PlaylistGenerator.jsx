import React, { useState, useEffect } from 'react';
import Playlist from './Playlist'

function PlaylistGenerator() {
    const [prompt, setPrompt] = useState ('');
    const [playlist, setPlaylist] = useState([]);
    const [loading, setLoading] = useState(false);

    const [accessToken, setAccessToken] = useState('');
    const [playlistUrl, setPlaylistUrl] = useState('');

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
            localStorage.setItem('spotify_access_token', token);

            window.history.replaceState(null, '', window.location.pathname);
        } else {
            const savedToken = localStorage.getItem('spotify_access_token');
            if(savedToken) {
                console.log('Loaded token from Local Storage', savedToken);
                setAccessToken(savedToken);
            } else {
                console.log('No access token found.')
            }
        }
      }, []);

    const parsePlaylist = (text) => {
        const lines = text.split('\n').filter(line => line.trim() !== '');

        return lines.map(line => {
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
        Only return the list, nothing else
        `;

        try {
            const res = await fetch('http://localhost:3001/generate-playlist', {
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

            console.log('Backend data respone correct', data);

            if(!data.playlist){
                console.error('no playlist received');
            }

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
        console.log('Exporting playlist with token:', accessToken);
        if(!accessToken) {
            alert('Please login with Spotify.');
            return;
        }
        try {
            console.log('Exporting with payload: ', {
                playlistName: `Generated Playlist - ${prompt}`,
                tracks: playlist,
                accessToken: accessToken
            });
            const res = await fetch('http://localhost:3001/export-playlist', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    playlistName: `Generated Playlist - ${prompt}`,
                    tracks: playlist,
                    accessToken: accessToken
                })
            });

            if(!res.ok) {
                const errorText = await res.text();
                throw new Error(errorText);
            }

            const data = await res.json();
            console.log('Export success:', data);
            alert('Playlist successfully exported to Spotify!');
            setPlaylistUrl(data.playlistUrl)
        } catch (error) {
            console.error('Error exporting to Spotfy: ', error);
            alert('Failed to export playlist.');
        }
    };

    return (
        <div style = {{padding: '2rem'}}>
            <h1> Playlist Generator</h1>
            <button
                onClick={() => window.location.href = 'http://localhost:3001/auth/spotify'}
                style = {{marginBottom: '2rem', padding: '0.5rem 1rem', backgroundColor: '#1db964', color: 'white', border: 'none', borderRadius: '8px'}}>
                    Login with Spotify
            </button>
            <input
                type="text"
                value = {prompt}
                onChange ={(e) => setPrompt(e.target.value)}
                placeholder="Type your playlist idea.."
                style = {{width: '400px', padding: '0.5rem'}}
            />

            <button
                onClick = {handleGenerate}
                style = {{marginLeft: '1rem', padding: '0.5rem 1rem'}}
            >
                {loading ? 'Generating...' : 'Generate Playlist'}
            </button>

            {playlist.length > 0 && (
            <>
            <Playlist playlist= {playlist}/>
            <div style = {{ marginTop: '2rem '}}>
            <h3>Spotify Export</h3>
                <button onClick={handleExport} style={{ padding: '0.5rem 1rem '}}>
                    Export to Spotify
                </button>
            </div>
            {playlistUrl && (
                <div style = {{ marginTop : '1rem' }}>
                <a href = {playlistUrl} target="_blank" rel = "noopoener noreferrer">
                    Open your new spotify plalist
                </a>
                </div>
            )}
            </>
        )}
        </div>

    );
}

export default PlaylistGenerator;