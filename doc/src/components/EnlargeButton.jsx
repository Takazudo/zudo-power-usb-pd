import React from 'react';

export default function EnlargeButton() {
  return (
    <div
      style={{
        position: 'absolute',
        top: '8px',
        right: '8px',
        padding: '4px',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        opacity: 1,
        zIndex: 20,
      }}
    >
      <img
        src="/img/enlarge.svg"
        alt="Enlarge"
        style={{
          width: '20px',
          height: '20px',
          filter: 'brightness(0) invert(1)',
          border: '0',
          margin: '0',
          borderRadius: '0',
          display: 'block',
        }}
      />
    </div>
  );
}
