import React, { useState } from 'react';
import axios from 'axios';
import Playlist from './Playlist'; 

const App = () => {
  const [prompt, setPrompt] = useState('');
  const [playlist, setPlaylist] = useState([]);

  const handlePromptChange = (event) => {
    setPrompt(event.target.value);
  };

  const generatePlaylist = async () => {
    try {
      const response = await axios.post('http://localhost:3001/generate-playlist', {
        prompt: prompt,
      });
      setPlaylist(response.data);
    } catch (error) {
      console.error('Error generating playlist:', error);
    }
  };

  return (
    <div>
      <h1>Generate a Playlist</h1>
      <input
        type="text"
        placeholder="Enter a prompt"
        value={prompt}
        onChange={handlePromptChange}
      />
      <button onClick={generatePlaylist}>Generate Playlist</button>
      {playlist.length > 0 && <Playlist playlist={playlist} />}
    </div>
  );
};

export default App;