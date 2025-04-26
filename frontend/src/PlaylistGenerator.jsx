import React, { useState } from 'react';
import Playlist from './Playlist'

function PlaylistGenerator() {
    const [prompt, setPrompt] = useState ('');
    const [playlist, setPlaylist] = useState([]);
    const [loading, setLoading] = useState(false);

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
                body: JSON.stringify({ prompt: modifiedPrompt })
            });
            const data = await res.json();
            
            console.log('Backend data respone correct', data);

            if(!data.playlist){
                console.error('no playlist received');
            }

            console.log('gemini playlist text:', data.playlist);

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

    return (
        <div style = {{padding: '2rem'}}>
            <h1> Playlist Generator</h1>
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

            <div style = {{marginTop: '2rem'}}>
                {playlist.length > 0 && (
                    <Playlist playlist = {playlist}/>
                )}
                </div>
        </div>
    );
}

export default PlaylistGenerator;