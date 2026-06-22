import { useState, useEffect } from 'react';

/**
 * ImageZoom — wraps a thumbnail <img> and shows a full-screen lightbox on click.
 *
 * Props:
 *   src       {string}  Image URL
 *   alt       {string}  Alt text
 *   style     {object}  Styles for the thumbnail
 *   className {string}  Class for the thumbnail
 *   fallback  {node}    JSX shown when src is falsy (optional)
 */
export default function ImageZoom({ src, alt = '', style = {}, className = '', fallback = null }) {
  const [open, setOpen] = useState(false);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!src) return fallback;

  return (
    <>
      {/* Thumbnail — clickable */}
      <img
        src={src}
        alt={alt}
        className={className}
        style={{
          ...style,
          cursor: 'zoom-in',
        }}
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        title="Click para ampliar"
      />

      {/* Lightbox overlay */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'fadeInLightbox 0.18s ease',
          }}
        >
          {/* Close button */}
          <button
            onClick={() => setOpen(false)}
            style={{
              position: 'absolute',
              top: '1.2rem',
              right: '1.4rem',
              background: 'rgba(255,255,255,0.12)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: '#fff',
              borderRadius: '50%',
              width: '38px',
              height: '38px',
              fontSize: '1.2rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 100000,
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
            title="Cerrar (Esc)"
          >
            ✕
          </button>

          {/* Full-size image */}
          <img
            src={src}
            alt={alt}
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '90vw',
              maxHeight: '88vh',
              objectFit: 'contain',
              borderRadius: '12px',
              boxShadow: '0 25px 80px rgba(0,0,0,0.7)',
              animation: 'scaleInLightbox 0.2s ease',
              cursor: 'default',
            }}
          />
        </div>
      )}

      {/* Keyframe animations injected once */}
      <style>{`
        @keyframes fadeInLightbox {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes scaleInLightbox {
          from { transform: scale(0.88); opacity: 0; }
          to   { transform: scale(1);    opacity: 1; }
        }
      `}</style>
    </>
  );
}
