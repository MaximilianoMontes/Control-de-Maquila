import React, { useEffect, useState } from 'react';
import { useSettings } from '../context/SettingsContext';

const NOTE_SYMBOLS = ['🎵', '🎶', '🎼', '♩', '♪', '♫', '♬'];

export default function ThemeEffects() {
  const { 
    settings,
    fnafActive,
    fnafNight,
    fnafTime,
    fnafPower,
    fnafCamActive,
    fnafGameState,
    jumpscareAnimatronic,
    currentRoom,
    animatronics,
    stunnedUntil,
    resetFnafNight,
    stunAnimatronic
  } = useSettings();
  const theme = settings?.theme || 'light';
  const isActive = theme === 'miku' || theme === 'teto' || theme === 'ror2' || theme === 'subnautica' || theme === 'fnaf';
  
  const [elements, setElements] = useState([]);
  const [victoryTick, setVictoryTick] = useState(false);

  useEffect(() => {
    if (fnafGameState === 'win') {
      setVictoryTick(false);
      const timer = setTimeout(() => {
        setVictoryTick(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [fnafGameState]);

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
    } else if (theme === 'subnautica') {
      // Generate initial bubbles scattered across the screen
      const initialElements = Array.from({ length: 45 }).map((_, i) => createBubble(i, true));
      setElements(initialElements);

      const interval = setInterval(() => {
        setElements(prev => {
          const now = Date.now();
          const active = prev.filter(el => el.expiry > now);
          
          const bubbleCount = active.filter(el => el.type === 'bubble').length;

          // Maintain density of bubbles
          if (bubbleCount < 60) {
            active.push(createBubble(now + Math.random(), false));
          }
          return active;
        });
      }, 200);

      return () => clearInterval(interval);
    } else if (theme === 'miku' || theme === 'teto') {
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
    } else {
      setElements([]);
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

  const createBubble = (id, isInitial = false) => {
    const duration = 6 + Math.random() * 6; // slow rising bubbles: 6 to 12s
    const delay = isInitial ? Math.random() * -duration : 0;
    const left = Math.random() * 100;
    const size = 12 + Math.random() * 16;   // bubble size: 12px to 28px (larger and more noticeable)
    const animationName = Math.random() > 0.5 ? 'subnautica-float-left' : 'subnautica-float-right';

    const now = Date.now();
    const expiry = now + (duration + (isInitial ? 0 : delay)) * 1000;

    return {
      id,
      type: 'bubble',
      expiry,
      style: {
        position: 'fixed',
        left: `${left}%`,
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        border: '1.5px solid rgba(255, 255, 255, 0.75)', // thicker, sharper border
        background: 'radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.75) 0%, rgba(0, 180, 255, 0.2) 50%, rgba(0, 210, 255, 0.05) 100%)',
        boxShadow: 'inset 0 0 6px rgba(255, 255, 255, 0.8), 0 0 12px rgba(0, 210, 255, 0.45)', // stronger glows
        animation: `${animationName} ${duration}s ease-in-out infinite`,
        animationDelay: `${delay}s`,
        zIndex: 9999,
        pointerEvents: 'none',
        bottom: '-30px',
        opacity: 0
      }
    };
  };

  if (!isActive) return null;

  return (
    <>
      {theme !== 'fnaf' ? (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', pointerEvents: 'none', zIndex: 9999, overflow: 'hidden' }}>
          {elements.map(el => (
            <div key={el.id} style={el.style}>
              {el.type === 'note' ? (
                <div style={el.innerStyle}>{el.symbol}</div>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Five Nights At Freddy's overlays */}
          {fnafCamActive && fnafPower > 0 && (
            <>
              <div className="fnaf-camera-overlay" />
              <div className="fnaf-camera-scanlines" />
              
              {/* Floating warning cards for active animatronics in the room */}
              <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', pointerEvents: 'none', zIndex: 9999 }}>
                {['bonnie', 'chica', 'freddy'].map(key => {
                  const anim = animatronics[key];
                  const isHere = anim && anim.room === currentRoom.code && (!stunnedUntil[key] || stunnedUntil[key] < Date.now());
                  if (!isHere) return null;
                  
                  return (
                    <div 
                      key={key}
                      onClick={() => stunAnimatronic(key)}
                      className="fnaf-animatronic-glitch"
                      style={{
                        position: 'absolute',
                        top: '40%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        zIndex: 99999,
                        cursor: 'pointer',
                        background: 'rgba(0,0,0,0.92)',
                        border: `3px solid ${anim.color}`,
                        boxShadow: `0 0 25px ${anim.color}`,
                        borderRadius: '12px',
                        padding: '2rem',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '0.8rem',
                        pointerEvents: 'auto',
                        userSelect: 'none',
                        minWidth: '240px'
                      }}
                    >
                      <span style={{ fontSize: '5rem', filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.4))' }}>{anim.emoji}</span>
                      <span style={{ color: '#fff', fontWeight: 'bold', fontSize: '1.4rem', fontFamily: 'monospace', letterSpacing: '0.1em' }}>
                        {anim.name.toUpperCase()}
                      </span>
                      <span style={{ color: '#ef4444', fontSize: '0.85rem', fontWeight: 'bold', animation: 'fnaf-blink 0.8s steps(2, start) infinite' }}>
                        ⚠️ INTRUDER IN {currentRoom.code}
                      </span>
                      <button 
                        style={{
                          background: '#ff0000',
                          color: '#fff',
                          border: 'none',
                          padding: '0.6rem 1.2rem',
                          fontFamily: 'monospace',
                          fontWeight: 'bold',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          marginTop: '0.5rem',
                          boxShadow: '0 0 10px #ff0000'
                        }}
                      >
                        ⚡ SHOCK / DEFEND
                      </button>
                    </div>
                  );
                })}
                
                {/* Pirate Cove (CAM 07) Foxy stage display */}
                {(() => {
                  const anim = animatronics.foxy;
                  if (!anim || (stunnedUntil.foxy && stunnedUntil.foxy >= Date.now())) return null;
                  
                  if (currentRoom.code === 'CAM 07') {
                    let foxyStatus = "";
                    let foxyEmoji = "🎪";
                    if (anim.stage === 0) { foxyStatus = "CURTAINS CLOSED"; foxyEmoji = "🎪"; }
                    else if (anim.stage === 1) { foxyStatus = "PEEKING OUT"; foxyEmoji = "🦊"; }
                    else if (anim.stage === 2) { foxyStatus = "OUT OF COVE"; foxyEmoji = "🦊⚠️"; }
                    else if (anim.stage === 3) { foxyStatus = "COVE EMPTY!"; foxyEmoji = "🏃‍♂️"; }
                    
                    return (
                      <div 
                        onClick={() => stunAnimatronic('foxy')}
                        className="fnaf-animatronic-glitch"
                        style={{
                          position: 'absolute',
                          top: '40%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)',
                          zIndex: 99999,
                          cursor: 'pointer',
                          background: 'rgba(0,0,0,0.92)',
                          border: `3px solid ${anim.color}`,
                          boxShadow: `0 0 25px ${anim.color}`,
                          borderRadius: '12px',
                          padding: '2rem',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '0.8rem',
                          pointerEvents: 'auto',
                          userSelect: 'none',
                          minWidth: '240px'
                        }}
                      >
                        <span style={{ fontSize: '5rem' }}>{foxyEmoji}</span>
                        <span style={{ color: '#fff', fontWeight: 'bold', fontSize: '1.4rem', fontFamily: 'monospace' }}>
                          PIRATE COVE
                        </span>
                        <span style={{ color: anim.stage === 3 ? '#ff0000' : '#eab308', fontSize: '0.9rem', fontWeight: 'bold', animation: anim.stage >= 2 ? 'fnaf-blink 0.5s steps(2, start) infinite' : 'none' }}>
                          STATUS: {foxyStatus}
                        </span>
                        {anim.stage < 3 ? (
                          <button 
                            style={{
                              background: '#eab308',
                              color: '#000',
                              border: 'none',
                              padding: '0.5rem 1rem',
                              fontFamily: 'monospace',
                              fontWeight: 'bold',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              marginTop: '0.5rem',
                              boxShadow: '0 0 10px #eab308'
                            }}
                          >
                            ⚡ FLASH LIGHT
                          </button>
                        ) : (
                          <button 
                            style={{
                              background: '#ff0000',
                              color: '#fff',
                              border: 'none',
                              padding: '0.5rem 1rem',
                              fontFamily: 'monospace',
                              fontWeight: 'bold',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              marginTop: '0.5rem',
                              boxShadow: '0 0 10px #ff0000'
                            }}
                          >
                            ⚡ SOUND ALARM!
                          </button>
                        )}
                      </div>
                    );
                  }
                  
                  // Hallway (CAM 10) running Foxy
                  if (currentRoom.code === 'CAM 10' && anim.stage === 3) {
                    return (
                      <div 
                        onClick={() => stunAnimatronic('foxy')}
                        className="fnaf-animatronic-glitch"
                        style={{
                          position: 'absolute',
                          top: '40%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)',
                          zIndex: 99999,
                          cursor: 'pointer',
                          background: 'rgba(0,0,0,0.95)',
                          border: `4px solid #ff0000`,
                          boxShadow: `0 0 35px #ff0000`,
                          borderRadius: '12px',
                          padding: '2.5rem',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '1rem',
                          pointerEvents: 'auto',
                          userSelect: 'none',
                          minWidth: '260px'
                        }}
                      >
                        <span style={{ fontSize: '6rem', animation: 'fnaf-jumpscare-shake 0.1s infinite' }}>🦊🏃‍♂️</span>
                        <span style={{ color: '#ff0000', fontWeight: 'bold', fontSize: '1.6rem', fontFamily: 'monospace', animation: 'fnaf-blink 0.3s infinite' }}>
                          FOXY IS RUNNING!
                        </span>
                        <button 
                          style={{
                            background: '#ff0000',
                            color: '#fff',
                            border: 'none',
                            padding: '0.8rem 1.5rem',
                            fontFamily: 'monospace',
                            fontWeight: 'bold',
                            fontSize: '1.1rem',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            marginTop: '0.5rem',
                            boxShadow: '0 0 15px #ff0000'
                          }}
                        >
                          ⚡ SHOCK PIRATE!
                        </button>
                      </div>
                    );
                  }
                  
                  return null;
                })()}
              </div>
            </>
          )}

          {/* Fullscreen jumpscare overlay */}
          {fnafGameState === 'lose' && jumpscareAnimatronic && (
            <div className="fnaf-jumpscare-overlay-fullscreen" style={{ pointerEvents: 'auto' }}>
              <div className="fnaf-jumpscare-face">
                {animatronics[jumpscareAnimatronic]?.emoji || '🐻'}
              </div>
              <div className="fnaf-jumpscare-screamer">SCREEEEECH!!!</div>
              <div className="fnaf-jumpscare-status" style={{ fontSize: '1.5rem', color: '#ff5555', fontFamily: 'monospace', marginBottom: '1.5rem' }}>
                {animatronics[jumpscareAnimatronic]?.name.toUpperCase()} JUMPSCARED YOU!
              </div>
              <div className="fnaf-jumpscare-subtext" style={{ fontSize: '1.2rem', color: '#777', marginBottom: '2.5rem', fontFamily: 'monospace' }}>
                Night {fnafNight} Failed.
              </div>
              <button className="fnaf-retry-btn" onClick={resetFnafNight}>
                RETRY NIGHT {fnafNight}
              </button>
            </div>
          )}

          {/* Fullscreen victory overlay */}
          {fnafGameState === 'win' && (
            <div className="fnaf-victory-overlay" style={{ pointerEvents: 'auto' }}>
              <div className="fnaf-victory-digits">
                {victoryTick ? '6:00 AM' : '5:59 AM'}
              </div>
              {victoryTick && (
                <>
                  <div className="fnaf-victory-text" style={{ color: '#00ff00', fontSize: '2.5rem', textShadow: '0 0 10px #00ff00' }}>
                    ★ Night {fnafNight} Complete ★
                  </div>
                  <div className="fnaf-cheering-sound" style={{ color: '#fff', fontSize: '1.2rem', fontStyle: 'italic', marginBottom: '3rem', fontFamily: 'monospace', animation: 'fnaf-blink 1s infinite' }}>
                    * Children Cheering *
                  </div>
                  <button className="fnaf-retry-btn" style={{ background: '#00ff00 !important', border: '3px solid #55ff55 !important', boxShadow: '0 0 15px rgba(0, 255, 0, 0.6) !important' }} onClick={resetFnafNight}>
                    {fnafNight >= 6 ? 'RESTART CUSTOM NIGHT' : `CONTINUE TO NIGHT ${fnafNight + 1}`}
                  </button>
                </>
              )}
            </div>
          )}
        </>
      )}
    </>
  );
}
