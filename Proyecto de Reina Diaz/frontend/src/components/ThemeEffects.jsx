import React, { useEffect, useState } from 'react';
import { useSettings } from '../context/SettingsContext';

const NOTE_SYMBOLS = ['🎵', '🎶', '🎼', '♩', '♪', '♫', '♬'];

export default function ThemeEffects() {
  const { settings } = useSettings();
  const theme = settings?.theme || 'light';
  const isActive = theme === 'miku' || theme === 'teto';
  
  const [notes, setNotes] = useState([]);

  useEffect(() => {
    if (!isActive) {
      setNotes([]);
      return;
    }

    // Generate initial notes with negative delay so they start scattered across the screen
    const initialNotes = Array.from({ length: 15 }).map((_, i) => createNote(i, true));
    setNotes(initialNotes);

    const interval = setInterval(() => {
      setNotes(prev => {
        const now = Date.now();
        const activeNotes = prev.filter(n => n.expiry > now);
        
        // Maintain a steady count of floating notes
        while (activeNotes.length < 18) {
          activeNotes.push(createNote(now + Math.random(), false));
        }
        return activeNotes;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, theme]);

  const createNote = (id, isInitial = false) => {
    const duration = 6 + Math.random() * 6; // 6s to 12s falling speed
    const delay = isInitial ? Math.random() * -duration : 0;
    
    // PVZ sun size reference is ~45px. 15% larger is ~52px. We range from 46px to 58px.
    const size = 46 + Math.random() * 12;
    const left = Math.random() * 90 + 5; // Horizontal spread (5% to 95%)
    const symbol = NOTE_SYMBOLS[Math.floor(Math.random() * NOTE_SYMBOLS.length)];
    const rotationDir = Math.random() > 0.5 ? 1 : -1;
    const rotationSpeed = 3 + Math.random() * 5; // 3s to 8s rotation speed
    const colorSweepSpeed = 4 + Math.random() * 4; // 4s to 8s color sweep cycle

    const now = Date.now();
    const expiry = now + (duration + (isInitial ? 0 : delay)) * 1000;

    return {
      id,
      symbol,
      expiry,
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

  if (!isActive) return null;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', pointerEvents: 'none', zIndex: 9999, overflow: 'hidden' }}>
      {notes.map(note => (
        <div key={note.id} style={note.style}>
          <div style={note.innerStyle}>{note.symbol}</div>
        </div>
      ))}
    </div>
  );
}
