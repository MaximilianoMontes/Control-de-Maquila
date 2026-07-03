import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import API_URL from '../config';
import { 
  Menu,
  Search, 
  Bell, 
  HelpCircle, 
  User, 
  Settings, 
  LogOut, 
  X, 
  Check, 
  LayoutDashboard, 
  Users, 
  Package, 
  Scissors, 
  Factory, 
  FileText, 
  Wallet, 
  History,
  BookOpen,
  Info,
  ChevronDown,
  Globe,
  ExternalLink,
  Lock,
  Plus,
  Trash2,
  AlertTriangle,
  LayoutGrid,
  Flame,
  Layers,
  Calendar
} from 'lucide-react';

export default function Header({ onToggleSidebar }) {
  const { user, logout } = useAuth();
  const { settings, updateSetting, t, translateLog } = useSettings();
  const navigate = useNavigate();
  const location = useLocation();
  const isPlanchaPage = location.pathname.startsWith('/plancha') || location.search.includes('plancha');
  const isAdmin = user?.role === 'admin' || user?.rol === 'admin';
  
  // Dropdown states
  const [showNotifications, setShowNotifications] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  // PvZ Sun Collector state
  const [pvzSuns, setPvzSuns] = useState([]);
  const [pvzSunCount, setPvzSunCount] = useState(0);
  const pvzSunIdRef = useRef(0);
  
  // Modal states
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  
  // Command search state
  const [commandQuery, setCommandQuery] = useState('');
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);



  // Dynamic movements notifications state
  const [logs, setLogs] = useState([]);
  const [readIds, setReadIds] = useState(() => {
    try {
      const saved = localStorage.getItem('read_notification_ids');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [clearedUntil, setClearedUntil] = useState(() => {
    try {
      const saved = localStorage.getItem('notifications_cleared_until');
      return saved ? parseInt(saved, 10) : 0;
    } catch {
      return 0;
    }
  });

  // Fetch movements and poll every 10 seconds
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const [histRes, calRes] = await Promise.all([
          axios.get(`${API_URL}/api/historial?limit=15`),
          axios.get(`${API_URL}/api/calendario/upcoming`).catch(() => ({ data: [] }))
        ]);
        
        let mergedLogs = [];
        if (histRes.data && Array.isArray(histRes.data)) {
          mergedLogs = [...histRes.data];
        }
        
        if (calRes.data && Array.isArray(calRes.data)) {
          const calEvents = calRes.data.map(ev => ({
            id: `cal-${ev.id}`,
            action: 'CALENDAR_ALERT',
            target: 'CALENDARIO',
            timestamp: ev.fecha_inicio,
            user_name: ev.usuario,
            description: `${ev.titulo}: ${ev.descripcion || ''}`
          }));
          mergedLogs = [...calEvents, ...mergedLogs];
        }
        
        mergedLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        setLogs(mergedLogs);
      } catch (e) {
        console.error('Error fetching notifications for header:', e);
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, []);

  // Filter active notifications
  const activeNotifications = logs.filter(log => typeof log.id === 'string' || log.id > clearedUntil);
  const unreadCount = activeNotifications.filter(log => !readIds.includes(log.id)).length;

  const getRelativeTime = (timestamp, lang) => {
    const diffMs = new Date() - new Date(timestamp);
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (lang === 'en') {
      if (diffSec < 60) return 'Just now';
      if (diffMin < 60) return `${diffMin} min ago`;
      if (diffHour < 24) return diffHour === 1 ? '1 hour ago' : `${diffHour} hours ago`;
      return diffDay === 1 ? '1 day ago' : `${diffDay} days ago`;
    } else {
      if (diffSec < 60) return 'Justo ahora';
      if (diffMin < 60) return `Hace ${diffMin} min`;
      if (diffHour < 24) return diffHour === 1 ? 'Hace 1 hora' : `Hace ${diffHour} horas`;
      return diffDay === 1 ? 'Hace 1 día' : `Hace ${diffDay} días`;
    }
  };

  // Refs for closing dropdowns on click outside
  const notificationsRef = useRef(null);
  const helpRef = useRef(null);
  const profileRef = useRef(null);
  const commandPaletteInputRef = useRef(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
      if (helpRef.current && !helpRef.current.contains(event.target)) {
        setShowHelp(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfile(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // PvZ: spawn falling suns when theme is pvz
  useEffect(() => {
    if (settings.theme !== 'pvz') {
      setPvzSuns([]);
      return;
    }
    const spawnSun = () => {
      const id = ++pvzSunIdRef.current;
      const x = Math.random() * 90 + 2; // 2% - 92% horizontal
      setPvzSuns(prev => [...prev, { id, x, createdAt: Date.now() }]);
      // Auto-remove sun after 8s if not clicked
      setTimeout(() => {
        setPvzSuns(prev => prev.filter(s => s.id !== id));
      }, 8000);
    };
    // Initial spawn burst
    spawnSun();
    const interval = setInterval(spawnSun, 2500);
    return () => clearInterval(interval);
  }, [settings.theme]);

  const handleCollectSun = (id) => {
    setPvzSuns(prev => prev.filter(s => s.id !== id));
    setPvzSunCount(prev => prev + 25);
  };

  // Keyboard shortcut Ctrl + G for Command Palette
  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'g') {
        e.preventDefault();
        setShowCommandPalette(prev => !prev);
      }
      if (e.key === 'Escape') {
        setShowCommandPalette(false);
        setShowSettingsModal(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focus command palette input when opened
  useEffect(() => {
    if (showCommandPalette && commandPaletteInputRef.current) {
      setTimeout(() => commandPaletteInputRef.current.focus(), 50);
      setCommandQuery('');
      setSelectedCommandIndex(0);
    }
  }, [showCommandPalette]);

  // Available commands in Command Palette
  const commands = isPlanchaPage ? [
    { name: 'Tablero de Burros', desc: 'Interfaz interactiva de planchado y asignación', path: '/plancha?tab=plancha', icon: <Flame size={18} />, badge: 'Burros' },
    { name: 'Modelos en Tránsito', desc: 'Verificación de llegada y precios de plancha', path: '/plancha?tab=modelos', icon: <Layers size={18} />, badge: 'Modelos' },
    { name: 'Planchadores', desc: 'Registro y administración de planchadores', path: '/plancha?tab=planchadores', icon: <Users size={18} />, badge: 'Planchadores' },
    { name: 'Pagos a Planchadores', desc: 'Liquidación de sueldos, apoyos y cuadres', path: '/plancha?tab=pagos', icon: <Wallet size={18} />, badge: 'Pagos' },
    { name: 'Reportes e Historial', desc: 'Trabajos finalizados y exportación de reportes', path: '/plancha?tab=historial', icon: <FileText size={18} />, badge: 'Reportes' },
    { name: t('header.helpCenter'), desc: t('header.cmdHelpDesc'), path: '/ayuda?tab=plancha&from=plancha', icon: <HelpCircle size={18} />, badge: t('header.cmdHelpBadge') },
  ] : [
    { name: t('nav.dashboard'), desc: t('header.cmdDashboardDesc'), path: '/', icon: <LayoutDashboard size={18} />, badge: t('header.cmdDashboardBadge') },
    { name: t('nav.maquileros'), desc: t('header.cmdMaquilerosDesc'), path: '/maquileros', icon: <Users size={18} />, badge: t('header.cmdMaquilerosBadge') },
    { name: t('nav.inventario'), desc: t('header.cmdInventarioDesc'), path: '/inventario', icon: <Package size={18} />, badge: t('header.cmdInventarioBadge') },
    { name: t('nav.cortes'), desc: t('header.cmdCortesDesc'), path: '/cortes', icon: <Scissors size={18} />, badge: t('header.cmdCortesBadge') },
    { name: t('nav.produccion'), desc: t('header.cmdProduccionDesc'), path: '/produccion', icon: <Factory size={18} />, badge: t('header.cmdProduccionBadge') },
    { name: t('nav.reportes'), desc: t('header.cmdReportesDesc'), path: '/reportes', icon: <FileText size={18} />, badge: t('header.cmdReportesBadge') },
    { name: t('nav.pagos'), desc: t('header.cmdPagosDesc'), path: '/pagos', icon: <Wallet size={18} />, badge: t('header.cmdPagosBadge') },
    { name: t('nav.historial'), desc: t('header.cmdHistorialDesc'), path: '/historial', icon: <History size={18} />, badge: t('header.cmdHistorialBadge') },
    { name: t('header.helpCenter'), desc: t('header.cmdHelpDesc'), path: '/ayuda', icon: <HelpCircle size={18} />, badge: t('header.cmdHelpBadge') },
  ];

  // Filter commands based on search query
  const filteredCommands = commands.filter(c => 
    c.name.toLowerCase().includes(commandQuery.toLowerCase()) ||
    c.desc.toLowerCase().includes(commandQuery.toLowerCase()) ||
    c.badge.toLowerCase().includes(commandQuery.toLowerCase())
  );

  // Command palette navigation using arrows & Enter
  const handleCommandKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedCommandIndex(prev => (prev + 1) % filteredCommands.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedCommandIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands[selectedCommandIndex]) {
        handleNavigate(filteredCommands[selectedCommandIndex].path);
      }
    }
  };

  const handleNavigate = (path) => {
    navigate(path);
    setShowCommandPalette(false);
  };

  const handleMarkAllNotificationsAsRead = () => {
    const newReadIds = [...new Set([...readIds, ...activeNotifications.map(n => n.id)])];
    setReadIds(newReadIds);
    localStorage.setItem('read_notification_ids', JSON.stringify(newReadIds));
  };

  const handleClearNotifications = () => {
    const numericLogs = activeNotifications.filter(n => typeof n.id === 'number');
    const maxId = numericLogs.length > 0 ? Math.max(...numericLogs.map(n => n.id)) : clearedUntil;
    setClearedUntil(maxId);
    localStorage.setItem('notifications_cleared_until', maxId.toString());
  };

  const handleReadNotification = (id) => {
    if (!readIds.includes(id)) {
      const newReadIds = [...readIds, id];
      setReadIds(newReadIds);
      localStorage.setItem('read_notification_ids', JSON.stringify(newReadIds));
    }
    setShowNotifications(false);
    navigate('/historial');
  };

  const toggleSetting = (key, value) => {
    updateSetting(key, value);
  };

  // Risk of Rain 2 Theme: Difficulty Ticker State
  const [ror2Time, setRor2Time] = useState(0);

  useEffect(() => {
    if (settings.theme !== 'ror2') {
      sessionStorage.removeItem('ror2_session_time');
      setRor2Time(0);
      return;
    }

    const saved = sessionStorage.getItem('ror2_session_time');
    if (saved) {
      setRor2Time(parseInt(saved, 10));
    } else {
      setRor2Time(0);
    }

    const interval = setInterval(() => {
      setRor2Time(prev => {
        const next = prev + 1;
        sessionStorage.setItem('ror2_session_time', next.toString());
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [settings.theme]);

  const formatRor2Time = (sec) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // --- THE BINDING OF ISAAC ---
  const [isaacHearts, setIsaacHearts] = useState([1, 1, 1]);
  const [isaacDying, setIsaacDying] = useState(false);
  const handleIsaacHit = (index) => {
    if (isaacDying) return;
    setIsaacHearts(prev => {
      const next = [...prev];
      if (next[index] === 1) {
        next[index] = 0.5;
      } else if (next[index] === 0.5) {
        next[index] = 0;
      } else {
        next[index] = 1;
      }
      if (next.every(h => h === 0)) {
        setIsaacDying(true);
        setTimeout(() => {
          setIsaacHearts([1, 1, 1]);
          setIsaacDying(false);
        }, 3000);
      }
      return next;
    });
  };

  // --- HALO ---
  const [haloShield, setHaloShield] = useState(100);
  const [haloRecharging, setHaloRecharging] = useState(false);
  const [haloFlash, setHaloFlash] = useState(false);
  const handleHaloDamage = () => {
    if (haloShield <= 0) return;
    setHaloShield(0);
    setHaloFlash(true);
    setTimeout(() => setHaloFlash(false), 800);
    setHaloRecharging(true);
  };
  useEffect(() => {
    if (settings.theme !== 'halo') return;
    if (!haloRecharging) return;
    const interval = setInterval(() => {
      setHaloShield(prev => {
        if (prev >= 100) {
          setHaloRecharging(false);
          return 100;
        }
        return prev + 5;
      });
    }, 150);
    return () => clearInterval(interval);
  }, [haloRecharging, settings.theme]);

  // --- BLUE ARCHIVE ---
  const [bluePyroxenes, setBluePyroxenes] = useState(12000);
  const [blueBanner, setBlueBanner] = useState(null);
  const handleGachaRoll = () => {
    if (bluePyroxenes < 1200) {
      setBluePyroxenes(12000);
      return;
    }
    setBluePyroxenes(prev => prev - 1200);
    const students = ['Shiroko', 'Aris', 'Hina', 'Yuuka', 'Mika', 'Hoshino', 'Azusa', 'Aru', 'Koharu'];
    const chosen = students[Math.floor(Math.random() * students.length)];
    setBlueBanner(chosen);
    setTimeout(() => setBlueBanner(null), 3000);
  };

  // --- FIVE NIGHTS AT FREDDY'S ---
  const [fnafPower, setFnafPower] = useState(100);
  const [fnafTime, setFnafTime] = useState(12);
  const [fnafCamActive, setFnafCamActive] = useState(false);
  const [fnafBlackout, setFnafBlackout] = useState(false);
  useEffect(() => {
    if (settings.theme !== 'fnaf') {
      setFnafCamActive(false);
      document.body.classList.remove('fnaf-cam-active');
      return;
    }
    const interval = setInterval(() => {
      setFnafPower(prev => {
        if (prev <= 1) {
          setFnafBlackout(true);
          setTimeout(() => {
            setFnafPower(100);
            setFnafBlackout(false);
          }, 4000);
          return 0;
        }
        return prev - 1;
      });
    }, 4500);
    return () => clearInterval(interval);
  }, [settings.theme]);

  useEffect(() => {
    if (settings.theme !== 'fnaf') return;
    const interval = setInterval(() => {
      setFnafTime(prev => (prev === 12 ? 1 : prev === 5 ? 6 : prev + 1));
    }, 30000);
    return () => clearInterval(interval);
  }, [settings.theme]);

  const toggleFnafCamera = () => {
    const next = !fnafCamActive;
    setFnafCamActive(next);
    if (next) {
      document.body.classList.add('fnaf-cam-active');
    } else {
      document.body.classList.remove('fnaf-cam-active');
    }
  };

  // --- DEAD BY DAYLIGHT ---
  const [dbdBP, setDbdBP] = useState(50000);
  const [dbdChecking, setDbdChecking] = useState(false);
  const [dbdPointer, setDbdPointer] = useState(0);
  const [dbdOutcome, setDbdOutcome] = useState(null);
  const handleStartSkillCheck = () => {
    if (dbdChecking) {
      setDbdChecking(false);
      const angle = dbdPointer;
      if (angle >= 65 && angle <= 85) {
        setDbdOutcome('GREAT');
        setDbdBP(prev => prev + 5000);
      } else if (angle >= 50 && angle <= 95) {
        setDbdOutcome('GOOD');
        setDbdBP(prev => prev + 1500);
      } else {
        setDbdOutcome('FAILED');
        setDbdBP(prev => Math.max(0, prev - 3000));
      }
      setTimeout(() => setDbdOutcome(null), 2000);
    } else {
      setDbdChecking(true);
      setDbdPointer(0);
      setDbdOutcome(null);
    }
  };
  useEffect(() => {
    if (!dbdChecking) return;
    const interval = setInterval(() => {
      setDbdPointer(prev => {
        if (prev >= 360) {
          setDbdChecking(false);
          setDbdOutcome('FAILED');
          setDbdBP(prevBP => Math.max(0, prevBP - 3000));
          setTimeout(() => setDbdOutcome(null), 2000);
          return 0;
        }
        return prev + 12;
      });
    }, 30);
    return () => clearInterval(interval);
  }, [dbdChecking]);

  // --- INCREDIBOX ---
  const [incrediboxMode, setIncrediboxMode] = useState('mix1');
  const [incrediboxPlaying, setIncrediboxPlaying] = useState(true);

  // --- DARKEST DUNGEON ---
  const [darkestTorch, setDarkestTorch] = useState(100);
  const [darkestStress, setDarkestStress] = useState(20);
  const [darkestAffliction, setDarkestAffliction] = useState(null);
  useEffect(() => {
    if (settings.theme !== 'darkest') return;
    const interval = setInterval(() => {
      setDarkestTorch(prev => {
        const next = Math.max(0, prev - 2);
        if (next === 0) {
          setDarkestStress(s => {
            const nextStress = Math.min(200, s + 8);
            if (nextStress >= 200 && !darkestAffliction) {
              setDarkestAffliction('HOPELESS');
              setTimeout(() => {
                setDarkestStress(0);
                setDarkestTorch(100);
                setDarkestAffliction(null);
              }, 4000);
            }
            return nextStress;
          });
        }
        return next;
      });
    }, 3000);
    return () => clearInterval(interval);
  }, [settings.theme, darkestAffliction]);

  const handleDarkestTorchClick = () => {
    setDarkestTorch(100);
    setDarkestStress(prev => Math.max(0, prev - 15));
  };

  // --- DESTINY 2 ---
  const [destinyGlimmer, setDestinyGlimmer] = useState(250000);
  const [ghostScanning, setGhostScanning] = useState(false);
  const handleGhostScan = () => {
    if (ghostScanning) return;
    setGhostScanning(true);
    setTimeout(() => {
      setGhostScanning(false);
      setDestinyGlimmer(prev => Math.min(250000, prev + 25000));
    }, 2500);
  };

  // --- FRIDAY NIGHT FUNKIN' ---
  const [fnfHealth, setFnfHealth] = useState(50);
  const [fnfNote, setFnfNote] = useState(null);
  useEffect(() => {
    if (settings.theme !== 'fnf') return;
    const handleKeyDown = (e) => {
      const arrowKeys = {
        ArrowLeft: '◀',
        ArrowDown: '▼',
        ArrowUp: '▲',
        ArrowRight: '▶'
      };
      if (arrowKeys[e.key]) {
        setFnfNote(arrowKeys[e.key]);
        setFnfHealth(h => Math.min(100, h + 4));
        setTimeout(() => setFnfNote(null), 250);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [settings.theme]);

  // --- HELLTAKER ---
  const [helltakerSteps, setHelltakerSteps] = useState(23);
  const [helltakerDead, setHelltakerDead] = useState(false);
  const [helltakerPancakes, setHelltakerPancakes] = useState(0);

  useEffect(() => {
    if (settings.theme !== 'helltaker') return;
    setHelltakerSteps(prev => {
      const next = Math.max(0, prev - 1);
      if (next === 0) {
        setHelltakerDead(true);
        setTimeout(() => {
          setHelltakerSteps(23);
          setHelltakerDead(false);
        }, 3500);
      }
      return next;
    });
  }, [location.pathname, settings.theme]);

  const handleEatPancake = () => {
    setHelltakerSteps(prev => Math.min(40, prev + 10));
    setHelltakerPancakes(p => p + 1);
  };

  const ROR2_DIFFICULTIES = [
    { name: settings.language === 'en' ? 'Easy' : 'Fácil', color: '#4beb65', bg: 'rgba(75, 235, 101, 0.12)' },
    { name: settings.language === 'en' ? 'Medium' : 'Medio', color: '#b4e015', bg: 'rgba(180, 224, 21, 0.12)' },
    { name: settings.language === 'en' ? 'Hard' : 'Difícil', color: '#ff8c00', bg: 'rgba(255, 140, 0, 0.12)' },
    { name: settings.language === 'en' ? 'Very Hard' : 'Muy Difícil', color: '#ff5500', bg: 'rgba(255, 85, 0, 0.12)' },
    { name: settings.language === 'en' ? 'Insane' : 'Demente', color: '#ff0000', bg: 'rgba(255, 0, 0, 0.12)' },
    { name: settings.language === 'en' ? 'Impossible' : 'Imposible', color: '#aa0000', bg: 'rgba(170, 0, 0, 0.12)' },
    { name: settings.language === 'en' ? 'I See You' : 'Te Veo', color: '#9013fe', bg: 'rgba(144, 19, 254, 0.12)' },
    { name: settings.language === 'en' ? "I'm in Pain" : 'Tengo Dolor', color: '#c026d3', bg: 'rgba(192, 38, 211, 0.12)' },
    { name: 'HAHAHAHAHA', color: '#ef4444', bg: 'rgba(0, 0, 0, 0.8)', flash: true }
  ];

  const activeIndex = Math.min(Math.floor(ror2Time / 60), 8);
  const currentDifficulty = ROR2_DIFFICULTIES[activeIndex];
  const pointerPercent = activeIndex < 8 
    ? (activeIndex * 11.11) + (((ror2Time % 60) / 60) * 11.11)
    : 8 * 11.11 + 5.55;




  return (
    <>
      <header className="main-header">
        {/* Hamburger Menu for Mobile */}
        <button 
          className="mobile-menu-toggle"
          onClick={onToggleSidebar}
          aria-label="Toggle Menu"
        >
          <Menu size={22} />
        </button>

        {/* Search bar/Command search button */}
        <div className="header-search-container" onClick={() => setShowCommandPalette(true)}>
          <Search size={18} color="var(--text-secondary)" />
          <div className="header-search-input-placeholder">
            {t('header.search')}
          </div>
          <span className="header-search-badge">Ctrl + G</span>
        </div>

        {/* Risk of Rain 2 Difficulty Bar */}
        {settings.theme === 'ror2' && (
          <div className="ror2-difficulty-bar-container">
            <div className="ror2-timer">
              {formatRor2Time(ror2Time)}
            </div>
            <div className="ror2-bar-wrapper">
              <div className="ror2-difficulty-title">
                {settings.language === 'en' ? 'DIFFICULTY:' : 'DIFICULTAD:'}{' '}
                <span 
                  style={{ color: currentDifficulty.color }} 
                  className={currentDifficulty.flash ? 'ror2-flash-text' : ''}
                >
                  {currentDifficulty.name}
                </span>
              </div>
              <div className="ror2-bar-outer">
                <div className="ror2-bar-pointer" style={{ left: `${pointerPercent}%` }}>▼</div>
                <div className="ror2-bar-segments">
                  {ROR2_DIFFICULTIES.map((diff, idx) => (
                    <div 
                      key={diff.name} 
                      className={`ror2-segment ${idx === activeIndex ? 'active' : ''} ${diff.flash ? 'ror2-flash-bg' : ''}`}
                      style={{ 
                        backgroundColor: diff.bg, 
                        color: diff.color,
                        width: '11.11%'
                      }}
                      title={diff.name}
                    >
                      <span>{diff.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Isaac Heart HUD */}
        {settings.theme === 'isaac' && (
          <div className="isaac-hearts-container">
            <span className="isaac-label">HP:</span>
            <div className="isaac-hearts">
              {isaacHearts.map((heart, idx) => (
                <span 
                  key={idx} 
                  className={`isaac-heart ${heart === 1 ? 'full' : heart === 0.5 ? 'half' : 'empty'} ${isaacDying ? 'shaking' : ''}`}
                  onClick={() => handleIsaacHit(idx)}
                  title="Click to take damage!"
                  style={{ cursor: 'pointer', fontSize: '1.25rem', userSelect: 'none', margin: '0 2px' }}
                >
                  {heart === 1 ? '❤️' : heart === 0.5 ? '💔' : '🖤'}
                </span>
              ))}
            </div>
            {isaacDying && <span className="isaac-death-text">YOU DIED</span>}
          </div>
        )}

        {/* Halo HUD */}
        {settings.theme === 'halo' && (
          <div className={`halo-hud-container ${haloFlash ? 'shield-broken' : ''}`}>
            <span className="halo-hud-title">UNSC HUD [S-117]</span>
            <div className="halo-shield-wrapper" onClick={handleHaloDamage} title="Click to test shield failure!">
              <span className="halo-shield-label">SHIELD:</span>
              <div className="halo-shield-bar-outer">
                <div className={`halo-shield-bar-inner ${haloRecharging ? 'recharging' : ''}`} style={{ width: `${haloShield}%` }} />
              </div>
              <span className="halo-shield-percent">{haloShield}%</span>
            </div>
          </div>
        )}

        {/* Blue Archive Gacha */}
        {settings.theme === 'bluearchive' && (
          <div className="bluearchive-gacha-container">
            <div className="bluearchive-currency" onClick={handleGachaRoll} title="Click to roll 10x Gacha (1200 pyroxenes)">
              <span className="ba-diamond">💎</span>
              <span className="ba-count">{bluePyroxenes}</span>
              <button className="ba-roll-btn">ROLL 10x</button>
            </div>
            {blueBanner && (
              <div className="bluearchive-banner-alert">
                <span className="ba-banner-star">★★★</span>
                <span className="ba-student-name">RECRUITED: {blueBanner}!</span>
              </div>
            )}
          </div>
        )}

        {/* Five Nights At Freddy's HUD */}
        {settings.theme === 'fnaf' && (
          <div className={`fnaf-hud-container ${fnafBlackout ? 'blackout' : ''}`}>
            <div className="fnaf-status">
              <span className="fnaf-power-label">POWER:</span>
              <span className="fnaf-power-value" style={{ color: fnafPower < 30 ? '#ff0000' : '#00ff00' }}>{fnafPower}%</span>
            </div>
            <div className="fnaf-time-box">
              <span className="fnaf-time-val">{fnafTime} AM</span>
            </div>
            <button className={`fnaf-camera-btn ${fnafCamActive ? 'active' : ''}`} onClick={toggleFnafCamera}>
              📷 CAMERA MONITOR
            </button>
            {fnafBlackout && <div className="fnaf-jumpscare-overlay">🐻 IT'S ME</div>}
          </div>
        )}

        {/* Dead By Daylight HUD */}
        {settings.theme === 'dbd' && (
          <div className="dbd-hud-container">
            <div className="dbd-bp-counter" onClick={handleStartSkillCheck} title="Click to trigger Skill Check / Press again to hit!">
              <span className="dbd-hook-icon">🪝</span>
              <span className="dbd-bp-value">{dbdBP.toLocaleString()} BP</span>
              <button className="dbd-check-btn">{dbdChecking ? 'TAP NOW!' : 'TRIGGER SKILL CHECK'}</button>
            </div>
            {dbdChecking && (
              <div className="dbd-skill-check-circle">
                <div className="dbd-pointer" style={{ transform: `rotate(${dbdPointer}deg)` }} />
                <div className="dbd-target-zone" />
              </div>
            )}
            {dbdOutcome && (
              <div className={`dbd-outcome-alert ${dbdOutcome}`}>
                {dbdOutcome === 'GREAT' ? '✨ GREAT SKILL CHECK! +5000' : dbdOutcome === 'GOOD' ? '👍 GOOD SKILL CHECK +1500' : '💥 GENERATOR EXPLODED! -3000'}
              </div>
            )}
          </div>
        )}

        {/* Incredibox HUD */}
        {settings.theme === 'incredibox' && (
          <div className="incredibox-container" onClick={() => setIncrediboxPlaying(!incrediboxPlaying)} title="Click to pause/play beats">
            <span className="incredibox-logo-icon">🎵</span>
            <div className="incredibox-equalizer">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div 
                  key={i} 
                  className={`ib-bar ib-bar-${i} ${incrediboxPlaying ? 'playing' : 'paused'}`}
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
            <select 
              className="ib-select" 
              value={incrediboxMode} 
              onChange={(e) => { e.stopPropagation(); setIncrediboxMode(e.target.value); }}
              style={{ cursor: 'pointer', padding: '2px 8px', fontSize: '0.8rem', background: '#333', color: '#fff', border: '1px solid #666', borderRadius: '4px' }}
            >
              <option value="mix1">v1: Sunrise</option>
              <option value="mix2">v2: The Love</option>
              <option value="mix3">v3: Dystopia</option>
            </select>
          </div>
        )}

        {/* Darkest Dungeon HUD */}
        {settings.theme === 'darkest' && (
          <div className="darkest-hud-container">
            <div className="darkest-torch-box" onClick={handleDarkestTorchClick} title="Click to fuel torch (+light, -stress)">
              <span className="darkest-torch-icon" style={{ filter: darkestTorch < 30 ? 'grayscale(80%)' : 'none', cursor: 'pointer' }}>🔥</span>
              <span className="darkest-torch-value">TORCH: {darkestTorch}%</span>
            </div>
            <div className="darkest-stress-box" title="Stress level">
              <span className="darkest-stress-crown">👑</span>
              <span className="darkest-stress-value" style={{ color: darkestStress > 100 ? '#ff3333' : '#a3a3a3' }}>
                STRESS: {darkestStress}/200
              </span>
            </div>
            {darkestAffliction && (
              <div className="darkest-affliction-overlay">
                <div className="affliction-crown">👑</div>
                <div className="affliction-title">AFFLICTION: HOPELESS</div>
                <div className="affliction-quote">"There can be no hope in this hell... no hope at all."</div>
              </div>
            )}
          </div>
        )}

        {/* Destiny 2 HUD */}
        {settings.theme === 'destiny2' && (
          <div className="destiny-hud-container">
            <div className="destiny-ghost-wrapper" onClick={handleGhostScan} title="Click Ghost to scan for resources" style={{ cursor: 'pointer' }}>
              <span className={`destiny-ghost ${ghostScanning ? 'scanning' : ''}`} style={{ display: 'inline-block', transition: 'transform 0.5s ease' }}>🔷</span>
              <span className="destiny-glimmer-text">{destinyGlimmer.toLocaleString()} GLIMMER</span>
            </div>
            {ghostScanning && <div className="ghost-laser-line" />}
          </div>
        )}

        {/* Friday Night Funkin' HUD */}
        {settings.theme === 'fnf' && (
          <div className="fnf-hud-container">
            <span className="fnf-sing-tip">PRESS ARROWS TO SING!</span>
            <div className="fnf-health-bar-outer">
              <div className="fnf-health-bar-opponent" style={{ width: `${100 - fnfHealth}%` }} />
              <div className="fnf-health-bar-bf" style={{ width: `${fnfHealth}%` }} />
              <div className="fnf-icons-slider" style={{ left: `${fnfHealth}%` }}>
                <span className="fnf-icon-opponent">👿</span>
                <span className="fnf-icon-bf">🎤</span>
              </div>
            </div>
            {fnfNote && <div className="fnf-note-pop">{fnfNote}</div>}
          </div>
        )}

        {/* Helltaker HUD */}
        {settings.theme === 'helltaker' && (
          <div className="helltaker-hud-container">
            <div className="helltaker-steps" title="Steps remaining. Navigating the ERP uses steps!">
              <span className="ht-skull-icon">💀</span>
              <span className="ht-steps-count" style={{ color: helltakerSteps < 8 ? '#ff3333' : '#ffffff' }}>
                MOVES LEFT: {helltakerSteps}
              </span>
            </div>
            <div className="helltaker-pancake-plate" onClick={handleEatPancake} title="Click to cook a pancake (+10 moves)" style={{ cursor: 'pointer' }}>
              <span className="ht-pancake-icon">🥞</span>
              <span className="ht-pancake-count">({helltakerPancakes})</span>
            </div>
            {helltakerDead && (
              <div className="helltaker-dead-overlay">
                <div className="ht-dead-banner">TAKER IS DEAD</div>
                <div className="ht-dead-sub">RETRY FROM THE PANCAKE PLATE</div>
              </div>
            )}
          </div>
        )}

        {/* Action Controls */}
        <div className="header-actions">
          {/* PvZ Sun Counter - only visible in pvz theme */}
          {settings.theme === 'pvz' && (
            <div className="pvz-sun-counter" title="Soles recolectados">
              <span className="pvz-sun-icon">☀️</span>
              <span className="pvz-sun-count">{pvzSunCount}</span>
            </div>
          )}

          {/* Notifications Dropdown */}
          <div className="header-help-container" ref={notificationsRef}>
            <button 
              className="header-action-btn" 
              onClick={() => setShowNotifications(!showNotifications)}
              title={t('header.sysNotifications')}
            >
              <Bell size={20} />
              {unreadCount > 0 && <span className="header-action-badge" />}
            </button>

            <div className={`header-dropdown notifications-dropdown ${showNotifications ? 'active' : ''}`}>
              <div className="dropdown-header">
                <h4>{t('header.notifications')}</h4>
                {activeNotifications.length > 0 && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="dropdown-header-btn" onClick={handleMarkAllNotificationsAsRead}>
                      {t('header.readAll')}
                    </button>
                    <button className="dropdown-header-btn" style={{ color: 'var(--danger-color)' }} onClick={handleClearNotifications}>
                      {t('header.clear')}
                    </button>
                  </div>
                )}
              </div>
              <div className="notification-list">
                {activeNotifications.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    {t('header.noNotifications')}
                  </div>
                ) : (
                  activeNotifications.map(n => {
                    const isUnread = !readIds.includes(n.id);
                    const actionLower = (n.action || '').toLowerCase();
                    
                    let IconComponent = Info;
                    let iconColor = 'var(--primary-color)';
                    let bgColor = 'rgba(59, 130, 246, 0.1)';
                    
                    if (actionLower === 'alta') {
                      IconComponent = Plus;
                      iconColor = 'var(--success-color)';
                      bgColor = 'rgba(16, 185, 129, 0.1)';
                    } else if (actionLower === 'edit') {
                      IconComponent = AlertTriangle;
                      iconColor = '#fbbf24';
                      bgColor = 'rgba(245, 158, 11, 0.1)';
                    } else if (actionLower === 'baja') {
                      IconComponent = Trash2;
                      iconColor = 'var(--danger-color)';
                      bgColor = 'rgba(239, 68, 68, 0.1)';
                    } else if (actionLower === 'calendar_alert') {
                      IconComponent = Calendar;
                      iconColor = '#c084fc'; // a nice purple
                      bgColor = 'rgba(192, 132, 252, 0.1)';
                    }

                    return (
                      <div 
                        key={n.id} 
                        className={`notification-item ${isUnread ? 'unread' : ''}`} 
                        style={{ cursor: 'pointer', background: isUnread ? 'rgba(59, 130, 246, 0.04)' : 'transparent' }}
                        onClick={() => handleReadNotification(n.id)}
                      >
                        <div className="notification-icon-wrapper" style={{ background: bgColor, color: iconColor }}>
                          <IconComponent size={14} />
                        </div>
                        <div className="notification-item-content">
                          <p className="notification-text" style={isUnread ? { fontWeight: 600 } : {}}>
                            <strong style={{ color: 'var(--text-primary)' }}>{n.username}</strong>: {translateLog(n.description)}
                          </p>
                          <span className="notification-time">{getRelativeTime(n.timestamp, settings.language)}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Help Menu Dropdown */}
          <div className="header-help-container" ref={helpRef}>
            <button 
              className="header-help-trigger" 
              onClick={() => setShowHelp(!showHelp)}
            >
              <HelpCircle size={18} />
              <span>{t('header.help')}</span>
              <ChevronDown size={14} />
            </button>

            <div className={`header-dropdown help-dropdown ${showHelp ? 'active' : ''}`}>
              <div className="dropdown-header">
                <h4>{t('header.helpCenter')}</h4>
              </div>
              <div style={{ padding: '4px' }}>
                {isPlanchaPage ? (
                  <>
                    <Link to="/ayuda?tab=plancha&from=plancha" className="profile-dropdown-item" onClick={() => setShowHelp(false)}>
                      <Flame size={16} />
                      <span>{settings.language === 'en' ? 'Ironing Module Guide' : 'Guía del Módulo de Plancha'}</span>
                    </Link>
                    <Link to="/ayuda?tab=general&from=plancha" className="profile-dropdown-item" onClick={() => setShowHelp(false)}>
                      <BookOpen size={16} />
                      <span>{settings.language === 'en' ? 'General Help Center' : 'Centro de Ayuda General'}</span>
                    </Link>
                  </>
                ) : (
                  <>
                    <Link to="/ayuda?tab=general" className="profile-dropdown-item" onClick={() => setShowHelp(false)}>
                      <BookOpen size={16} />
                      <span>{t('header.userManual')}</span>
                    </Link>
                    <Link to="/ayuda?tab=maquileros" className="profile-dropdown-item" onClick={() => setShowHelp(false)}>
                      <Users size={16} />
                      <span>{t('header.tailorGuide')}</span>
                    </Link>
                    <Link to="/ayuda?tab=inventario" className="profile-dropdown-item" onClick={() => setShowHelp(false)}>
                      <Package size={16} />
                      <span>{t('header.inventoryControl')}</span>
                    </Link>
                    <Link to="/ayuda?tab=cortes" className="profile-dropdown-item" onClick={() => setShowHelp(false)}>
                      <Scissors size={16} />
                      <span>{t('header.cutsDesign')}</span>
                    </Link>
                    <Link to="/ayuda?tab=produccion" className="profile-dropdown-item" onClick={() => setShowHelp(false)}>
                      <Factory size={16} />
                      <span>{t('header.productionFlow')}</span>
                    </Link>
                    <Link to="/ayuda?tab=pagos" className="profile-dropdown-item" onClick={() => setShowHelp(false)}>
                      <Wallet size={16} />
                      <span>{t('header.paymentsAcum')}</span>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* User Profile dropdown */}
          <div className="header-profile-container" ref={profileRef}>
            <button 
              className="header-profile-trigger"
              onClick={() => setShowProfile(!showProfile)}
            >
              <div className="header-profile-avatar">
                {user?.username ? user.username.charAt(0).toUpperCase() : 'U'}
              </div>
            </button>

            <div className={`header-dropdown ${showProfile ? 'active' : ''}`}>
              <div className="profile-dropdown-user">
                <div className="header-profile-avatar" style={{ width: '42px', height: '42px', fontSize: '1.1rem' }}>
                  {user?.username ? user.username.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="profile-dropdown-info">
                  <span className="profile-dropdown-name">{user?.username || t('header.defaultUser')}</span>
                  <span className="profile-dropdown-role">{user?.role || user?.rol || t('header.defaultRole')}</span>
                </div>
              </div>
              <div style={{ padding: '4px' }}>
                <button 
                  className="profile-dropdown-item" 
                  onClick={() => { setShowProfile(false); navigate(isPlanchaPage ? '/ayuda?tab=plancha&from=plancha' : '/ayuda'); }}
                >
                  <User size={16} />
                  <span>{t('header.profileGuide')}</span>
                </button>
                <button 
                  className="profile-dropdown-item"
                  onClick={() => { setShowProfile(false); setShowSettingsModal(true); }}
                >
                  <Settings size={16} />
                  <span>{t('header.settings')}</span>
                </button>
                <div style={{ borderTop: '1px solid var(--border-color)', margin: '4px 0' }} />
                <button 
                  className="profile-dropdown-item danger" 
                  onClick={() => { setShowProfile(false); logout(); }}
                >
                  <LogOut size={16} />
                  <span>{t('header.logout')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* PvZ Falling Suns Overlay */}
      {settings.theme === 'pvz' && pvzSuns.map(sun => (
        <div
          key={sun.id}
          className="pvz-falling-sun"
          style={{ left: `${sun.x}%` }}
          onClick={() => handleCollectSun(sun.id)}
          role="button"
          tabIndex={0}
          title="¡Click para recolectar!"
          aria-label="Recolectar sol"
          onKeyDown={(e) => e.key === 'Enter' && handleCollectSun(sun.id)}
        >
          ☀️
        </div>
      ))}

      {/* Command Palette Overlay Modal */}
      {showCommandPalette && (
        <div className="command-palette-overlay" onClick={() => setShowCommandPalette(false)}>
          <div className="command-palette" onClick={(e) => e.stopPropagation()}>
            <div className="command-palette-search-wrapper">
              <Search size={20} color="var(--text-secondary)" />
              <input 
                ref={commandPaletteInputRef}
                type="text" 
                className="command-palette-input" 
                placeholder={t('header.commandPalettePlaceholder')} 
                value={commandQuery}
                onChange={(e) => { setCommandQuery(e.target.value); setSelectedCommandIndex(0); }}
                onKeyDown={handleCommandKeyDown}
              />
              <span className="command-palette-esc">Esc</span>
            </div>
            
            <div className="command-palette-results">
              <div className="command-palette-results-title">{t('header.commandPaletteTitle')}</div>
              
              {filteredCommands.length === 0 ? (
                <div className="command-palette-no-results">
                  {t('header.commandPaletteNoResults', { query: commandQuery })}
                </div>
              ) : (
                filteredCommands.map((cmd, index) => (
                  <div 
                    key={cmd.path} 
                    className={`command-palette-option ${index === selectedCommandIndex ? 'selected' : ''}`}
                    onClick={() => handleNavigate(cmd.path)}
                    onMouseEnter={() => setSelectedCommandIndex(index)}
                  >
                    <div className="command-palette-option-left">
                      <span className="command-palette-option-icon">{cmd.icon}</span>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span className="command-palette-option-name">{cmd.name}</span>
                        <span className="command-palette-option-desc">{cmd.desc}</span>
                      </div>
                    </div>
                    <span className="command-palette-option-badge">{cmd.badge}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-card settings-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <h2>{t('settings.title')}</h2>
              <button 
                className="header-action-btn" 
                onClick={() => setShowSettingsModal(false)}
                style={{ background: 'rgba(0,0,0,0.05)', padding: '6px' }}
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="settings-list" style={{ maxHeight: '70vh', overflowY: 'auto', paddingRight: '6px' }}>
              {/* Visual Theme */}
              <div className="settings-item">
                <span className="settings-item-label">{t('settings.themeLabel')}</span>
                <span className="settings-item-desc">{t('settings.themeDesc')}</span>
                <div style={{ marginTop: '8px' }}>
                  <select 
                    className="form-input" 
                    value={settings.theme} 
                    onChange={(e) => toggleSetting('theme', e.target.value)}
                    style={{ width: '100%', cursor: 'pointer', padding: '10px 12px' }}
                  >
                    <option value="light">{t('settings.themeLight')}</option>
                    <option value="dark">{t('settings.themeDark')}</option>
                    <option value="ocean">{t('settings.themeOcean')}</option>
                    <option value="nature">{t('settings.themeNature')}</option>
                    <option value="sunset">{t('settings.themeSunset')}</option>
                    <option value="lavender">{t('settings.themeLavender')}</option>
                    <option value="cherry">{t('settings.themeCherry')}</option>
                    <option value="midnight">{t('settings.themeMidnight')}</option>
                    <option value="dim">{t('settings.themeDim')}</option>
                    <option value="miku">{t('settings.themeMiku')}</option>
                    <option value="teto">{t('settings.themeTeto')}</option>
                    <option value="ror2">Risk of Rain 2</option>
                    <option value="limbus">{t('settings.themeLimbus')}</option>
                    <option value="ruina">{t('settings.themeRuina')}</option>
                    <option value="minecraft">{t('settings.themeMinecraft')}</option>
                    <option value="geometry">{t('settings.themeGeometry')}</option>
                    <option value="fallout">{t('settings.themeFallout')}</option>
                    <option value="tf2">{t('settings.themeTf2')}</option>
                    <option value="cyberpunk">{t('settings.themeCyberpunk')}</option>
                    <option value="backrooms">{t('settings.themeBackrooms')}</option>
                    <option value="terraria">{t('settings.themeTerraria')}</option>
                    <option value="castle">{t('settings.themeCastle')}</option>
                    <option value="starwars">{t('settings.themeStarwars')}</option>
                    <option value="cod3">{t('settings.themeCod3')}</option>
                    <option value="subnautica">{t('settings.themeSubnautica')}</option>
                    <option value="cuphead">{t('settings.themeCuphead')}</option>
                    <option value="ddlc">{t('settings.themeDdlc')}</option>
                    <option value="undertale">{t('settings.themeUndertale')}</option>
                    <option value="lobotomy">{t('settings.themeLobotomy')}</option>
                    <option value="papers">{t('settings.themePapers')}</option>
                    <option value="plague">{t('settings.themePlague')}</option>
                    <option value="pvz">{t('settings.themePvz')}</option>
                    <option value="isaac">{t('settings.themeIsaac')}</option>
                    <option value="halo">{t('settings.themeHalo')}</option>
                    <option value="bluearchive">{t('settings.themeBlueArchive')}</option>
                    <option value="fnaf">{t('settings.themeFnaf')}</option>
                    <option value="dbd">{t('settings.themeDbd')}</option>
                    <option value="incredibox">{t('settings.themeIncredibox')}</option>
                    <option value="darkest">{t('settings.themeDarkest')}</option>
                    <option value="destiny2">{t('settings.themeDestiny2')}</option>
                    <option value="fnf">{t('settings.themeFnf')}</option>
                    <option value="helltaker">{t('settings.themeHelltaker')}</option>
                    <option value="system">{t('settings.themeSystem')}</option>
                  </select>
                </div>
              </div>

              {/* Accent Color */}
              <div className="settings-item">
                <span className="settings-item-label">{t('settings.accentLabel')}</span>
                <span className="settings-item-desc">{t('settings.accentDesc')}</span>
                <div style={{ display: 'flex', gap: '14px', alignItems: 'center', marginTop: '6px', flexWrap: 'wrap' }}>
                  {[
                    { id: 'blue', color: '#2563eb', label: settings.language === 'en' ? 'Royal Blue' : 'Azul Real' },
                    { id: 'green', color: '#10b981', label: settings.language === 'en' ? 'Emerald Green' : 'Verde Esmeralda' },
                    { id: 'purple', color: '#6366f1', label: settings.language === 'en' ? 'Indigo Purple' : 'Púrpura Índigo' },
                    { id: 'red', color: '#ef4444', label: settings.language === 'en' ? 'Ruby Red' : 'Rojo Rubí' },
                    { id: 'orange', color: '#f97316', label: settings.language === 'en' ? 'Coral Orange' : 'Naranja Coral' },
                    { id: 'yellow', color: '#eab308', label: settings.language === 'en' ? 'Sunny Yellow' : 'Amarillo Sol' },
                    { id: 'pink', color: '#ec4899', label: settings.language === 'en' ? 'Hot Pink' : 'Rosa Fuerte' },
                    { id: 'slate', color: '#64748b', label: settings.language === 'en' ? 'Slate Gray' : 'Gris Pizarra' },
                    { id: 'black', color: '#171717', label: settings.language === 'en' ? 'Carbon Black' : 'Negro Carbón' },
                    { id: 'white', color: '#f8fafc', label: settings.language === 'en' ? 'Snow White' : 'Blanco Nieve' },
                    { id: 'brown', color: '#78350f', label: settings.language === 'en' ? 'Coffee Brown' : 'Café Tostado' },
                    { id: 'teal', color: '#14b8a6', label: settings.language === 'en' ? 'Ocean Teal' : 'Cian Océano' },
                    { id: 'cyan', color: '#06b6d4', label: settings.language === 'en' ? 'Sky Cyan' : 'Celeste Cielo' },
                    { id: 'rose', color: '#f43f5e', label: settings.language === 'en' ? 'Soft Rose' : 'Rosa Suave' }
                  ].map(item => (
                    <button
                      key={item.id}
                      onClick={() => toggleSetting('accentColor', item.id)}
                      title={item.label}
                      style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '50%',
                        background: item.color,
                        border: settings.accentColor === item.id ? '3px solid var(--text-primary)' : '2px solid transparent',
                        boxShadow: settings.accentColor === item.id ? `0 0 12px ${item.color}` : 'none',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        padding: 0
                      }}
                    >
                      {settings.accentColor === item.id && <Check size={14} strokeWidth={3} />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Visual Density */}
              <div className="settings-item">
                <span className="settings-item-label">{t('settings.densityLabel')}</span>
                <span className="settings-item-desc">{t('settings.densityDesc')}</span>
                <div className="settings-options-row">
                  <button 
                    className={`settings-option-btn ${settings.density === 'normal' ? 'active' : ''}`}
                    onClick={() => toggleSetting('density', 'normal')}
                  >
                    {settings.density === 'normal' && <Check size={14} />} {t('settings.densityNormal')}
                  </button>
                  <button 
                    className={`settings-option-btn ${settings.density === 'compact' ? 'active' : ''}`}
                    onClick={() => toggleSetting('density', 'compact')}
                  >
                    {settings.density === 'compact' && <Check size={14} />} {t('settings.densityCompact')}
                  </button>
                </div>
              </div>

              {/* System Alerts */}
              <div className="settings-item">
                <span className="settings-item-label">{t('settings.alertsLabel')}</span>
                <span className="settings-item-desc">{t('settings.alertsDesc')}</span>
                <div className="settings-options-row">
                  <button 
                    className={`settings-option-btn ${settings.alerts === 'enabled' ? 'active' : ''}`}
                    onClick={() => toggleSetting('alerts', 'enabled')}
                  >
                    {settings.alerts === 'enabled' && <Check size={14} />} {t('settings.alertsEnabled')}
                  </button>
                  <button 
                    className={`settings-option-btn ${settings.alerts === 'disabled' ? 'active' : ''}`}
                    onClick={() => toggleSetting('alerts', 'disabled')}
                  >
                    {settings.alerts === 'disabled' && <Check size={14} />} {t('settings.alertsDisabled')}
                  </button>
                </div>
              </div>

              {/* Interface Language */}
              <div className="settings-item">
                <span className="settings-item-label">{t('settings.languageLabel')}</span>
                <span className="settings-item-desc">{t('settings.languageDesc')}</span>
                <div className="settings-options-row">
                  <button 
                    className={`settings-option-btn ${settings.language === 'es' ? 'active' : ''}`}
                    onClick={() => toggleSetting('language', 'es')}
                  >
                    {settings.language === 'es' && <Check size={14} />} Español (MX)
                  </button>
                  <button 
                    className={`settings-option-btn ${settings.language === 'en' ? 'active' : ''}`}
                    onClick={() => toggleSetting('language', 'en')}
                  >
                    {settings.language === 'en' && <Check size={14} />} English (US)
                  </button>
                </div>
              </div>

              {/* Currency Selector */}
              <div className="settings-item">
                <span className="settings-item-label">{t('settings.currencyLabel')}</span>
                <span className="settings-item-desc">{t('settings.currencyDesc')}</span>
                <div className="settings-options-row">
                  <button 
                    className={`settings-option-btn ${settings.currency === 'mxn' ? 'active' : ''}`}
                    onClick={() => toggleSetting('currency', 'mxn')}
                  >
                    {settings.currency === 'mxn' && <Check size={14} />} MXN ($)
                  </button>
                  <button 
                    className={`settings-option-btn ${settings.currency === 'usd' ? 'active' : ''}`}
                    onClick={() => toggleSetting('currency', 'usd')}
                  >
                    {settings.currency === 'usd' && <Check size={14} />} USD ($ USD)
                  </button>
                </div>
              </div>

              {/* Auto Archive */}
              <div className="settings-item">
                <span className="settings-item-label">{t('settings.autoArchiveLabel')}</span>
                <span className="settings-item-desc">{t('settings.autoArchiveDesc')}</span>
                <div className="settings-options-row">
                  <button 
                    className={`settings-option-btn ${settings.autoArchive === 'enabled' ? 'active' : ''}`}
                    onClick={() => toggleSetting('autoArchive', 'enabled')}
                  >
                    {settings.autoArchive === 'enabled' && <Check size={14} />} {t('settings.autoArchiveEnabled')}
                  </button>
                  <button 
                    className={`settings-option-btn ${settings.autoArchive === 'disabled' ? 'active' : ''}`}
                    onClick={() => toggleSetting('autoArchive', 'disabled')}
                  >
                    {settings.autoArchive === 'disabled' && <Check size={14} />} {t('settings.autoArchiveDisabled')}
                  </button>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
              <button className="btn btn-primary" onClick={() => setShowSettingsModal(false)}>
                {t('settings.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

