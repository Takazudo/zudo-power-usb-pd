import React from 'react';
import useBaseUrl from '@docusaurus/useBaseUrl';

export default function EnlargeButton() {
  const enlargeIconUrl = useBaseUrl('/img/enlarge.svg');

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
        src={enlargeIconUrl}
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
