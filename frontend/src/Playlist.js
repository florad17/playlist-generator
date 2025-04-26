import React from 'react';

const Playlist = ({ playlist }) => {
  return (
    <div>
      <h2>Generated Playlist</h2>
      <ul style={{ listStyleType: 'none', padding: 0 }}>
        {playlist.map((track, index) => (
          <li key={index} style={{ marginBottom: '1rem' }}>
            <strong>{track.name}</strong> by <em>{track.artist}</em>
            {track.url && track.url !== "#" && (
              <>
                <br />
                <a href={track.url} target="_blank" rel="noopener noreferrer">
                  Listen on Spotify
                </a>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Playlist;
