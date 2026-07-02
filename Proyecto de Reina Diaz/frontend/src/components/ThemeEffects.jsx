import React, { useEffect, useState } from 'react';
import { useSettings } from '../context/SettingsContext';

const NOTE_SYMBOLS = ['🎵', '🎶', '🎼', '♩', '♪', '♫', '♬'];

export default function ThemeEffects() {
  const { settings } = useSettings();
  const theme = settings?.theme || 'light';
  const isActive = theme === 'miku' || theme === 'teto' || theme === 'ror2';
  
  const [elements, setElements] = useState([]);

  useEffect(() => {
    if (!isActive) {
      setElements([]);
      return;
    }

    if (theme === 'ror2') {
      // Generate initial rain scattered across the screen
      const initialElements = Array.from({ length: 60 }).map((_, i) => createRor2Element(i, 'rain', true));
      setElements(initialElements);

      const interval = setInterval(() => {
        setElements(prev => {
          const now = Date.now();
          const active = prev.filter(el => el.expiry > now);
          
          const rainCount = active.filter(el => el.type === 'rain').length;

          // Maintain density
          if (rainCount < 80) {
            active.push(createRor2Element(now + Math.random(), 'rain', false));
          }
          return active;
        });
      }, 100);

      return () => clearInterval(interval);
    } else {
      // Vocaloid theme notes
      const initialNotes = Array.from({ length: 15 }).map((_, i) => createNote(i, true));
      setElements(initialNotes);

      const interval = setInterval(() => {
        setElements(prev => {
          const now = Date.now();
          const activeNotes = prev.filter(n => n.expiry > now);
          
          while (activeNotes.length < 18) {
            activeNotes.push(createNote(now + Math.random(), false));
          }
          return activeNotes;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [isActive, theme]);

  const createNote = (id, isInitial = false) => {
    const duration = 6 + Math.random() * 6;
    const delay = isInitial ? Math.random() * -duration : 0;
    const size = 46 + Math.random() * 12;
    const left = Math.random() * 90 + 5;
    const symbol = NOTE_SYMBOLS[Math.floor(Math.random() * NOTE_SYMBOLS.length)];
    const rotationDir = Math.random() > 0.5 ? 1 : -1;
    const rotationSpeed = 3 + Math.random() * 5;
    const colorSweepSpeed = 4 + Math.random() * 4;

    const now = Date.now();
    const expiry = now + (duration + (isInitial ? 0 : delay)) * 1000;

    return {
      id,
      symbol,
      expiry,
      type: 'note',
      style: {
        position: 'fixed',
        left: `${left}%`,
        fontSize: `${size}px`,
        animation: `fall-note ${duration}s linear infinite`,
        animationDelay: `${delay}s`,
        zIndex: 9999,
        pointerEvents: 'none',
        userSelect: 'none',
        display: 'inline-block',
        top: '-60px',
      },
      innerStyle: {
        display: 'inline-block',
        animation: `rotate-note ${rotationSpeed}s linear infinite ${rotationDir > 0 ? 'normal' : 'reverse'}, ${theme}-note-color-sweep ${colorSweepSpeed}s linear infinite`,
      }
    };
  };

  const createRor2Element = (id, type, isInitial = false) => {
    const duration = 0.6 + Math.random() * 0.8; // Faster falling rain for storm feel
    const delay = isInitial ? Math.random() * -duration : 0;
    const left = Math.random() * 100;

    const now = Date.now();
    const expiry = now + (duration + (isInitial ? 0 : delay)) * 1000;

    const height = 45 + Math.random() * 45; // Longer rain lines (45px to 90px)
    const opacity = 0.3 + Math.random() * 0.45; // High visibility opacity (30% to 75%)
    return {
      id,
      type: 'rain',
      expiry,
      style: {
        position: 'fixed',
        left: `${left}%`,
        width: '2px', // Thicker lines (2px)
        height: `${height}px`,
        background: 'linear-gradient(to bottom, transparent, rgba(0, 210, 255, 0.95))', // Brighter blue
        transform: 'rotate(12deg)',
        animation: `fall-rain ${duration}s linear infinite`,
        animationDelay: `${delay}s`,
        zIndex: 9999,
        pointerEvents: 'none',
        opacity,
        top: '-100px'
      }
    };
  };

  if (!isActive) return null;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', pointerEvents: 'none', zIndex: 9999, overflow: 'hidden' }}>
      {elements.map(el => (
        <div key={el.id} style={el.style}>
          {el.type === 'note' ? (
            <div style={el.innerStyle}>{el.symbol}</div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
