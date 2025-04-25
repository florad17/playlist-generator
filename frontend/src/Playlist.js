import React, { useState } from 'react';
import axios from 'axios';

const Playlist = ({ playlist }) => {
    return (
      <div>
        <h2>Generated Playlist:</h2>
        <ul>
          {playlist.map((track, index) => (
            <li key={index}>
              <p>{track.name} by {track.artist}</p>
              <a href={track.url} target="_blank" rel="noopener noreferrer">
                Listen on Spotify
              </a>
            </li>
          ))}
        </ul>
      </div>
    );
  };
  
  export default Playlist;