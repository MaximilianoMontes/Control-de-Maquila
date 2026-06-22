import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  Plus, 
  X,
  Clock,
  Layers,
  MinusCircle
} from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';
import API_URL from '../../config';
import Swal from 'sweetalert2';
import { toast } from 'react-toastify';

export default function PlanchaBurros({ 
  burrosState, 
  setBurrosState, 
  planchadores, 
  modelosDisponibles, 
  fetchModelosDisponibles, 
  modelosCamion,
  asistenciasHoy,
  fetchAsistenciasHoy,
  fetchPlanchadores,
  activeTab,
  setActiveTab
}) {
  const { settings, formatCurrency } = useSettings();
  const isEn = settings.language === 'en';

  const [searchQuery, setSearchQuery] = useState('');
  const [draggedItem, setDraggedItem] = useState(null);
  const [activeBurroScanner, setActiveBurroScanner] = useState(null);

  // Scanner Refs for event listeners
  const activeBurroScannerRef = useRef(activeBurroScanner);
  const burrosStateRef = useRef(burrosState);
  const planchadoresRef = useRef(planchadores);
  const modelosDisponiblesRef = useRef(modelosDisponibles);
  const modelosCamionRef = useRef(modelosCamion);

  useEffect(() => { activeBurroScannerRef.current = activeBurroScanner; }, [activeBurroScanner]);
  useEffect(() => { burrosStateRef.current = burrosState; }, [burrosState]);
  useEffect(() => { planchadoresRef.current = planchadores; }, [planchadores]);
  useEffect(() => { modelosDisponiblesRef.current = modelosDisponibles; }, [modelosDisponibles]);
  useEffect(() => { modelosCamionRef.current = modelosCamion; }, [modelosCamion]);

  const normalizeTalla = (t) => {
    if (!t) return "";
    let str = t.toString().trim().toUpperCase();
    // Strip ALL leading T characters (handles TT07, T07, 07, 7, etc.)
    str = str.replace(/^T+/i, '');
    if (/^\d+$/.test(str)) {
      return str.padStart(2, '0');
    }
    return str;
  };

  const displayTalla = (talla) => {
    if (!talla) return "";
    // Always normalize first to get a clean numeric or letter string
    const norm = normalizeTalla(talla); // e.g. "T07" -> "07", "07" -> "07", "7" -> "07"
    if (/^\d+$/.test(norm)) {
      return 'T' + norm; // Exactly one T prefix
    }
    return norm;
  };


  const sortTallasFunc = (a, b) => {
    const numA = parseInt(a, 10);
    const numB = parseInt(b, 10);
    if (!isNaN(numA) && !isNaN(numB)) {
      return numA - numB;
    }
    return a.toString().localeCompare(b.toString());
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const cleanDate = dateStr.split('T')[0];
    const parts = cleanDate.split('-');
    if (parts.length < 3) return dateStr;
    const [year, month, day] = parts;
    return `${parseInt(day, 10)}/${parseInt(month, 10)}/${year}`;
  };

  // Beep Audio Feedback
  const playBeep = (type = 'success') => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      if (type === 'success') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      } else {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      }
    } catch (e) {}
  };

  // Listen to global Keydowns for scanner
  useEffect(() => {
    if (activeTab !== 'plancha') return;

    let buffer = '';
    let timeout = null;

    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;

      if (e.key === 'Enter' || e.key === 'Tab') {
        if (e.key === 'Tab') e.preventDefault();
        if (buffer.length > 0) {
          const code = buffer.trim();
          buffer = '';
          handleScannedCode(code);
        }
        return;
      }

      if (e.key.length > 1) return;

      buffer += e.key;
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        buffer = '';
      }, 300);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timeout);
    };
  }, [activeTab]);

  const handleScannedCode = async (code) => {
    const codeUpper = code.toUpperCase();
    if (codeUpper.startsWith('B-') || codeUpper.startsWith('BURRO')) {
      const numStr = codeUpper.replace('BURRO', '').replace('B-', '');
      const num = parseInt(numStr, 10);
      if (!isNaN(num) && num >= 1 && num <= 12) {
        setActiveBurroScanner(num);
        playBeep('success');
        return;
      }
    }

    let planchadorNameCode = codeUpper.startsWith('P-') ? codeUpper.slice(2).trim() : codeUpper.trim();
    const normalizeStr = (str) => str.replace(/[^A-Z0-9]/ig, '').toUpperCase();
    const scanNorm = normalizeStr(planchadorNameCode);

    let planchadorEncontrado = null;
    let maxScore = 0;

    for (const p of planchadoresRef.current) {
      const dbWords = p.nombre.toUpperCase().replace(/[^A-Z0-9 ]/ig, '').split(/\s+/).filter(w => w.length >= 3);
      let score = 0;
      
      for (const word of dbWords) {
        const wordTrunc = word.substring(0, 5); 
        if (scanNorm.includes(wordTrunc)) {
          score += wordTrunc.length;
        }
      }
      
      const dbNorm = normalizeStr(p.nombre);
      if (dbNorm.includes(scanNorm) || scanNorm.includes(dbNorm)) {
        score += 100;
      }

      if (score > maxScore) {
        maxScore = score;
        planchadorEncontrado = p;
      }
    }

    if (maxScore < 3) {
      planchadorEncontrado = null;
    }
    if (planchadorEncontrado) {
      if (!activeBurroScannerRef.current) {
        playBeep('error');
        toast.warning(isEn ? "Scan a Board first to assign the ironer." : "Escanea primero un Burro para asignarle al planchador.", { theme: 'dark' });
        return;
      }
      const burroIdx = activeBurroScannerRef.current - 1;
      const newBurros = [...burrosStateRef.current];
      newBurros[burroIdx].planchador = planchadorEncontrado;
      setBurrosState(newBurros);
      playBeep('success');
      return;
    }

    let exactMatches = modelosDisponiblesRef.current.filter(m => code.toUpperCase().includes(m.modelo.toUpperCase()));
    
    if (exactMatches.length === 0) {
      exactMatches = modelosCamionRef.current.filter(m => code.toUpperCase().includes(m.modelo.toUpperCase()));
    }

    if (exactMatches.length === 0) {
      playBeep('error');
      toast.error(isEn ? `Model not found in Colima: ${code}` : `Modelo no encontrado en Colima: ${code}`, { theme: 'dark' });
      return;
    }

    let modeloMatch = exactMatches[0];
    let finalDecodedColor = null;
    let finalDecodedTalla = null;

    if (exactMatches.length > 0) {
      let bestScore = -1;
      for (const m of exactMatches) {
        const modelUpper = m.modelo.toUpperCase();
        const suffixIndex = codeUpper.indexOf(modelUpper);
        const suffix = suffixIndex !== -1 ? codeUpper.substring(suffixIndex + modelUpper.length) : "";

        let decodedColor = null;
        let decodedTalla = null;

        let tallasColoresObj = m.tallas_colores_disponibles;
        if (!tallasColoresObj) {
          const originalTallas = m.tallas_cantidades || {};
          const firstVal = Object.values(originalTallas)[0];
          const isNested = (typeof firstVal === 'object' && firstVal !== null);
          if (isNested) {
            tallasColoresObj = originalTallas;
          } else {
            tallasColoresObj = { "": originalTallas };
          }
        }

        if (tallasColoresObj && suffix) {
          const availableColors = Object.keys(tallasColoresObj).filter(c => c); // skip empty-string color
          // Sort colors longest first so more specific colors match before shorter ones
          availableColors.sort((a, b) => b.length - a.length);
          for (const c of availableColors) {
            const cUp = c.toUpperCase();
            const cPrefix4 = cUp.substring(0, 4);
            const cPrefix3 = cUp.substring(0, 3);
            // Find where the color prefix appears in the suffix
            let colorMatchEnd = -1;
            if (cPrefix4.length >= 4 && suffix.includes(cPrefix4)) {
              colorMatchEnd = suffix.indexOf(cPrefix4) + cPrefix4.length;
            } else if (cPrefix3.length >= 3 && suffix.includes(cPrefix3)) {
              colorMatchEnd = suffix.indexOf(cPrefix3) + cPrefix3.length;
            }
            if (colorMatchEnd !== -1) {
              decodedColor = c;
              break;
            }
          }
        }

        if (decodedColor) {
          const colorTallasObj = tallasColoresObj[decodedColor] || {};
          const standardSizes = ['3', '5', '7', '9', '11', '13', '15', '17', '38', 'S', 'M', 'L', 'XL', 'UNI', '03', '05', '07', '09', 'T03', 'T05', 'T07', 'T09', 'T11', 'T13', 'T15', 'T17'];
          const availableTallasForColor = Array.from(new Set([...Object.keys(colorTallasObj), ...standardSizes]));
          const sortedTallas = [...availableTallasForColor].sort((a,b) => b.length - a.length);

          // Build the portion of the suffix AFTER the matched color to avoid
          // the color letters (e.g. the 'T' in 'EST') being confused with a talla prefix.
          const cUp = decodedColor.toUpperCase();
          const cPrefix4 = cUp.substring(0, 4);
          const cPrefix3 = cUp.substring(0, 3);
          let colorMatchEnd = 0;
          if (cPrefix4.length >= 4 && suffix.includes(cPrefix4)) {
            colorMatchEnd = suffix.indexOf(cPrefix4) + cPrefix4.length;
          } else if (cPrefix3.length >= 3 && suffix.includes(cPrefix3)) {
            colorMatchEnd = suffix.indexOf(cPrefix3) + cPrefix3.length;
          }
          // tallaSearchSuffix: prefer the part after the color; fallback to full suffix
          const tallaSearchSuffix = colorMatchEnd > 0 ? suffix.substring(colorMatchEnd) : suffix;

          for (const t of sortedTallas) {
            const tUp = t.toUpperCase();
            const tNorm = normalizeTalla(t);
            // Search in the suffix AFTER the color match first, then in full suffix as fallback
            const inPost = tallaSearchSuffix.includes(tUp) || tallaSearchSuffix.includes(tNorm) || tallaSearchSuffix.includes('0' + tNorm);
            const inFull = suffix.includes(tUp) || suffix.includes(tNorm) || suffix.includes('0' + tNorm);
            if (inPost || inFull) {
              decodedTalla = t;
              break;
            }
          }
        }

        let score = 0;
        let stock = 0;

        if (decodedColor) {
          score += 10;
          if (decodedTalla) {
            score += 5;
            const colorTallasObj = tallasColoresObj[decodedColor] || {};
            const matchingKey = Object.keys(colorTallasObj).find(k => normalizeTalla(k) === normalizeTalla(decodedTalla));
            stock = matchingKey ? colorTallasObj[matchingKey] : 0;
          } else {
            const colorTallasObj = tallasColoresObj[decodedColor] || {};
            stock = Object.values(colorTallasObj).reduce((sum, q) => sum + (parseInt(q) || 0), 0);
          }
        } else {
          let flatTallas = m.tallas_disponibles;
          if (!flatTallas) {
            flatTallas = {};
            Object.values(tallasColoresObj || {}).forEach(tallasObj => {
              Object.entries(tallasObj || {}).forEach(([t, q]) => {
                flatTallas[t] = (flatTallas[t] || 0) + (parseInt(q) || 0);
              });
            });
          }
          if (flatTallas && suffix) {
            const standardSizes = ['3', '5', '7', '9', '11', '13', '15', '17', '38', 'S', 'M', 'L', 'XL', 'UNI', '03', '05', '07', '09', 'T03', 'T05', 'T07', 'T09', 'T11', 'T13', 'T15', 'T17'];
            const availableTallas = Array.from(new Set([...Object.keys(flatTallas), ...standardSizes]));
            const sortedTallas = [...availableTallas].sort((a,b) => b.length - a.length);
            for (const t of sortedTallas) {
              const tNorm = normalizeTalla(t);
              if (suffix.includes(t.toUpperCase()) || suffix.includes(tNorm) || suffix.includes("0" + tNorm)) {
                decodedTalla = t;
                break;
              }
            }
          }
          if (decodedTalla) {
            score += 2;
            const matchingKey = Object.keys(flatTallas || {}).find(k => normalizeTalla(k) === normalizeTalla(decodedTalla));
            stock = matchingKey ? flatTallas[matchingKey] : 0;
          } else {
            stock = m.piezas_disponibles_total || m.piezas || 0;
          }
        }

        if (stock > 0) {
          score += 1;
        }

        if (score > bestScore || bestScore === -1) {
          bestScore = score;
          modeloMatch = m;
          finalDecodedColor = decodedColor;
          finalDecodedTalla = decodedTalla;
        }
      }
    }

    if (!activeBurroScannerRef.current) {
      playBeep('error');
      setSearchQuery(modeloMatch.modelo);
      toast.info(isEn 
        ? `Model ${modeloMatch.modelo} detected. Select a Board first.` 
        : `Modelo ${modeloMatch.modelo} detectado. Escanea primero un Burro para asignarlo.`, 
        { theme: 'dark' }
      );
      return;
    }

    const burroIdx = activeBurroScannerRef.current - 1;
    const currentBurro = burrosStateRef.current[burroIdx];

    let selectedTalla = finalDecodedTalla;
    let selectedColor = finalDecodedColor || "";
    let stockDeEseColorYTalla = 0;
    const newBurros = [...burrosStateRef.current];

    if (selectedTalla) {
      const normTalla = normalizeTalla(selectedTalla);
      
      if (!selectedColor && modeloMatch.tallas_colores_disponibles) {
        const foundColorEntry = Object.entries(modeloMatch.tallas_colores_disponibles).find(
          ([color, tallasObj]) => {
            const matchingColorTallaKey = Object.keys(tallasObj || {}).find(k => normalizeTalla(k) === normTalla);
            const stockVal = matchingColorTallaKey ? (tallasObj[matchingColorTallaKey] || 0) : 0;
            return stockVal > 0;
          }
        );
        if (foundColorEntry) {
          selectedColor = foundColorEntry[0];
        }
      }

      if (selectedColor && modeloMatch.tallas_colores_disponibles) {
        const colorTallasObj = modeloMatch.tallas_colores_disponibles[selectedColor] || {};
        const matchingKey = Object.keys(colorTallasObj).find(k => normalizeTalla(k) === normTalla);
        stockDeEseColorYTalla = matchingKey ? colorTallasObj[matchingKey] : 0;
      } else {
        const availableTallas = modeloMatch.tallas_disponibles || {};
        const matchingKey = Object.keys(availableTallas).find(k => normalizeTalla(k) === normTalla);
        stockDeEseColorYTalla = matchingKey ? availableTallas[matchingKey] : 0;
      }
    } else {
      const availableTallas = Object.entries(modeloMatch.tallas_disponibles || {}).filter(([t, q]) => q > 0);
      
      if (availableTallas.length === 1) {
        selectedTalla = availableTallas[0][0];
      } else if (availableTallas.length > 1) {
        if (currentBurro.numero < 11) {
          const match = availableTallas.find(([t]) => normalizeTalla(t) === normalizeTalla(currentBurro.talla));
          if (match) selectedTalla = match[0];
        }
        if (!selectedTalla) {
          const result = await Swal.fire({
            title: isEn ? 'Select Size' : 'Seleccionar Talla',
            text: isEn 
              ? `The model ${modeloMatch.modelo} has multiple sizes. Enter the size to assign:` 
              : `El modelo ${modeloMatch.modelo} tiene varias tallas. Ingresa la talla a asignar:`,
            input: 'text',
            showCancelButton: true,
            confirmButtonText: isEn ? 'Assign' : 'Asignar',
            cancelButtonText: isEn ? 'Cancel' : 'Cancelar',
            confirmButtonColor: '#3b82f6',
            cancelButtonColor: '#64748b',
            background: '#1e293b',
            color: '#f8fafc',
            inputValidator: (value) => {
              if (!value || !value.trim()) {
                return isEn ? 'You must enter a size!' : '¡Debes ingresar una talla!';
              }
            }
          });
          if (result.isConfirmed) {
            selectedTalla = result.value.trim();
          } else {
            playBeep('error');
            return;
          }
        }
      } else {
        playBeep('error');
        toast.warning(isEn ? `Model ${modeloMatch.modelo} has no available stock.` : `El modelo ${modeloMatch.modelo} no tiene piezas disponibles.`, { theme: 'dark' });
        return;
      }

      const normTalla = normalizeTalla(selectedTalla);

      if (modeloMatch.tallas_colores_disponibles) {
        const foundColorEntry = Object.entries(modeloMatch.tallas_colores_disponibles).find(
          ([color, tallasObj]) => {
            const matchingColorTallaKey = Object.keys(tallasObj || {}).find(
              k => normalizeTalla(k) === normTalla
            );
            const stockVal = matchingColorTallaKey ? (tallasObj[matchingColorTallaKey] || 0) : 0;
            const alreadyAssigned = newBurros[burroIdx].modelos.some(
              m => m.id === modeloMatch.id && m.color === color && m.talla === selectedTalla
            );
            return stockVal > 0 && !alreadyAssigned;
          }
        );
        if (foundColorEntry) {
          selectedColor = foundColorEntry[0];
          const colorTallasObj = foundColorEntry[1];
          const matchingColorTallaKey = Object.keys(colorTallasObj || {}).find(
            k => normalizeTalla(k) === normTalla
          );
          stockDeEseColorYTalla = matchingColorTallaKey ? (colorTallasObj[matchingColorTallaKey] || 0) : 0;
        }
      }
    }

    if (stockDeEseColorYTalla <= 0) {
      playBeep('error');
      toast.warning(isEn 
        ? `All color variants for size ${selectedTalla} of model ${modeloMatch.modelo} are already assigned.`
        : `Todas las variantes de color disponibles del modelo ${modeloMatch.modelo} para la Talla ${selectedTalla} ya han sido agregadas a este burro.`,
        { theme: 'dark' }
      );
      return;
    }

    const existingModelIdx = newBurros[burroIdx].modelos.findIndex(m => m.id === modeloMatch.id && m.color === selectedColor && m.talla === selectedTalla);
    
    if (existingModelIdx !== -1) {
      playBeep('success');
    } else {
      newBurros[burroIdx].modelos.push({
        uid: Date.now() + Math.random().toString().slice(2, 6),
        id: modeloMatch.id,
        modelo: modeloMatch.modelo,
        imagen: modeloMatch.imagen,
        color: selectedColor,
        talla: selectedTalla,
        piezas: 1,
        maxPiezas: stockDeEseColorYTalla,
        tallas_colores_disponibles: modeloMatch.tallas_colores_disponibles,
        precio_plancha: modeloMatch.precio_plancha
      });
      setBurrosState(newBurros);
      playBeep('success');
    }
  };

  const handleDragStart = (e, type, data) => {
    setDraggedItem({ type, data });
    e.dataTransfer.setData('text/plain', ''); // Firefox fix
  };

  const handleDropOnBurro = (e, index, directItem = null) => {
    if (e) e.preventDefault();
    const currentItem = directItem || draggedItem;
    if (!currentItem) return;

    const newBurros = [...burrosState];
    const burro = newBurros[index];

    if (currentItem.type === 'planchador') {
      newBurros[index].planchador = currentItem.data;
      setBurrosState(newBurros);
    } else if (currentItem.type === 'modelo') {
      const model = currentItem.data;
      
      let defaultTalla = "";
      if (burro.numero < 11) {
        // Asignar talla correspondiente al burro
        const normBurroTalla = normalizeTalla(burro.talla);
        const match = Object.keys(model.tallas_disponibles || {}).find(
          t => normalizeTalla(t) === normBurroTalla
        );
        if (match) defaultTalla = match;
      }
      
      if (!defaultTalla) {
        const availableTallas = Object.entries(model.tallas_disponibles || {}).filter(([_, q]) => q > 0);
        if (availableTallas.length === 1) {
          defaultTalla = availableTallas[0][0];
        } else if (availableTallas.length > 1) {
          defaultTalla = availableTallas[0][0];
        } else {
          toast.warning(isEn ? 'No available pieces for this model.' : 'No hay piezas disponibles de este modelo.', { theme: 'dark' });
          return;
        }
      }

      const normDefaultTalla = normalizeTalla(defaultTalla);
      let defaultColor = "";
      let stockDeEseColorYTalla = 0;

      if (model.tallas_colores_disponibles) {
        // Encontrar el primer color con stock para esa talla
        const foundColorEntry = Object.entries(model.tallas_colores_disponibles).find(
          ([color, tallasObj]) => {
            const matchingColorTallaKey = Object.keys(tallasObj || {}).find(
              k => normalizeTalla(k) === normDefaultTalla
            );
            const stockVal = matchingColorTallaKey ? (tallasObj[matchingColorTallaKey] || 0) : 0;
            const alreadyAssigned = burro.modelos.some(
              m => m.id === model.id && m.color === color && m.talla === defaultTalla
            );
            return stockVal > 0 && !alreadyAssigned;
          }
        );
        if (foundColorEntry) {
          defaultColor = foundColorEntry[0];
          const colorTallasObj = foundColorEntry[1];
          const matchingColorTallaKey = Object.keys(colorTallasObj || {}).find(
            k => normalizeTalla(k) === normDefaultTalla
          );
          stockDeEseColorYTalla = matchingColorTallaKey ? (colorTallasObj[matchingColorTallaKey] || 0) : 0;
        }
      } else {
        const matchKey = Object.keys(model.tallas_disponibles || {}).find(
          t => normalizeTalla(t) === normDefaultTalla
        );
        stockDeEseColorYTalla = matchKey ? model.tallas_disponibles[matchKey] : 0;
      }

      if (stockDeEseColorYTalla <= 0) {
        toast.warning(isEn ? 'This size/color is already assigned to this board.' : 'Esta talla/color ya está asignada a este burro.', { theme: 'dark' });
        return;
      }

      const existingIndex = burro.modelos.findIndex(m => m.id === model.id && m.color === defaultColor && m.talla === defaultTalla);
      if (existingIndex !== -1) {
        toast.info(isEn ? 'Model already on this board.' : 'Este modelo ya está en la lista de este burro.', { theme: 'dark' });
        return;
      }

      burro.modelos.push({
        uid: Date.now() + Math.random().toString().slice(2, 6),
        id: model.id,
        modelo: model.modelo,
        imagen: model.imagen,
        color: defaultColor,
        talla: defaultTalla,
        piezas: 1,
        maxPiezas: stockDeEseColorYTalla,
        tallas_colores_disponibles: model.tallas_colores_disponibles,
        tallas_disponibles: model.tallas_disponibles,
        precio_plancha: model.precio_plancha
      });
    }

    setBurrosState(newBurros);
    setActiveBurroScanner(index + 1);
    setDraggedItem(null);
  };

  const handleChangeModeloColor = (burroIndex, uid, newColor) => {
    const newBurros = [...burrosState];
    const burro = newBurros[burroIndex];
    
    const model = burro.modelos.find(m => m.uid === uid);
    if (!model) return;
    if (model.color === newColor) return;

    const talla = model.talla;
    const normTalla = normalizeTalla(talla);

    const duplicate = !burro.is_comodin && burro.modelos.some(
      m => m.id === model.id && m.color === newColor && m.talla === talla && m.uid !== uid
    );
    if (duplicate) {
      toast.warning(isEn 
        ? `Color variant "${newColor || 'Unique'}" is already assigned to this board.`
        : `La variante de color "${newColor || 'Único'}" ya está en la lista de este burro.`,
        { theme: 'dark' }
      );
      return;
    }

    if (model) {
      let stockDeEseColorYTalla = 0;
      if (model.tallas_colores_disponibles && model.tallas_colores_disponibles[newColor]) {
        const colorTallasObj = model.tallas_colores_disponibles[newColor];
        const matchingColorTallaKey = Object.keys(colorTallasObj || {}).find(
          k => normalizeTalla(k) === normTalla
        );
        stockDeEseColorYTalla = matchingColorTallaKey ? (colorTallasObj[matchingColorTallaKey] || 0) : 0;
      }

      model.color = newColor;
      model.maxPiezas = stockDeEseColorYTalla;
      if (model.piezas > stockDeEseColorYTalla) {
        model.piezas = stockDeEseColorYTalla > 0 ? stockDeEseColorYTalla : 1;
      }
      setBurrosState(newBurros);
    }
  };

  const handleChangeModeloTalla = (burroIndex, uid, newTalla) => {
    const newBurros = [...burrosState];
    const burro = newBurros[burroIndex];
    
    const model = burro.modelos.find(m => m.uid === uid);
    if (!model) return;
    if (model.talla === newTalla) return;

    const normTalla = normalizeTalla(newTalla);
    const color = model.color;

    const duplicate = !burro.is_comodin && burro.modelos.some(
      m => m.id === model.id && m.color === color && m.talla === newTalla && m.uid !== uid
    );
    if (duplicate) {
      toast.warning(isEn 
        ? `Model ${model.modelo} with size ${newTalla} and color ${color || 'Unique'} is already assigned to this board.`
        : `El modelo ${model.modelo} con la Talla ${newTalla} y color ${color || 'Único'} ya está en este burro.`,
        { theme: 'dark' }
      );
      return;
    }

    let stockDeEseColorYTalla = 0;
    if (model.tallas_colores_disponibles && model.tallas_colores_disponibles[color]) {
      const colorTallasObj = model.tallas_colores_disponibles[color];
      const matchingColorTallaKey = Object.keys(colorTallasObj || {}).find(
        k => normalizeTalla(k) === normTalla
      );
      stockDeEseColorYTalla = matchingColorTallaKey ? (colorTallasObj[matchingColorTallaKey] || 0) : 0;
    }

    let finalColor = color;
    if (stockDeEseColorYTalla <= 0 && model.tallas_colores_disponibles) {
      const foundColorEntry = Object.entries(model.tallas_colores_disponibles).find(
        ([col, tallasObj]) => {
          const matchingColorTallaKey = Object.keys(tallasObj || {}).find(
            k => normalizeTalla(k) === normTalla
          );
          const stockVal = matchingColorTallaKey ? (tallasObj[matchingColorTallaKey] || 0) : 0;
          const alreadyAssigned = burro.modelos.some(
            m => m.id === model.id && m.color === col && m.talla === newTalla
          );
          return stockVal > 0 && !alreadyAssigned;
        }
      );
      if (foundColorEntry) {
        finalColor = foundColorEntry[0];
        const colorTallasObj = foundColorEntry[1];
        const matchingColorTallaKey = Object.keys(colorTallasObj || {}).find(
          k => normalizeTalla(k) === normTalla
        );
        stockDeEseColorYTalla = matchingColorTallaKey ? (colorTallasObj[matchingColorTallaKey] || 0) : 0;
      } else {
        toast.warning(isEn 
          ? `No available stock for model ${model.modelo} in size ${newTalla}`
          : `No hay stock disponible para ninguna variante de color del modelo ${model.modelo} en la Talla ${newTalla}`,
          { theme: 'dark' }
        );
        return;
      }
    }

    model.talla = newTalla;
    model.color = finalColor;
    model.maxPiezas = stockDeEseColorYTalla;
    if (model.piezas > stockDeEseColorYTalla) {
      model.piezas = stockDeEseColorYTalla > 0 ? stockDeEseColorYTalla : 1;
    }
    setBurrosState(newBurros);
  };

  const handleRemovePlanchadorFromBurro = (index) => {
    const newBurros = [...burrosState];
    newBurros[index].planchador = null;
    setBurrosState(newBurros);
  };

  const handleRemoveModeloFromBurro = (burroIndex, uid) => {
    const newBurros = [...burrosState];
    newBurros[burroIndex].modelos = newBurros[burroIndex].modelos.filter(
      m => m.uid !== uid
    );
    setBurrosState(newBurros);
  };

  const handleUpdatePiezas = (burroIndex, uid, delta) => {
    const newBurros = [...burrosState];
    const model = newBurros[burroIndex].modelos.find(m => m.uid === uid);
    if (model) {
      const newVal = model.piezas + delta;
      if (newVal >= 1 && newVal <= model.maxPiezas) {
        model.piezas = newVal;
        setBurrosState(newBurros);
      }
    }
  };

  const handleSetPiezas = (burroIndex, uid, val) => {
    const newBurros = [...burrosState];
    const model = newBurros[burroIndex].modelos.find(m => m.uid === uid);
    if (model) {
      if (val > model.maxPiezas) val = model.maxPiezas;
      if (val < 1) val = 1;
      model.piezas = val;
      setBurrosState(newBurros);
    }
  };

  const handleFinalizarPlanchado = async (index) => {
    const burro = burrosState[index];
    if (!burro.planchador) {
      toast.warning(isEn ? 'You must assign an ironer to this board first.' : 'Debes asignar un planchador a este burro primero', { theme: 'dark' });
      return;
    }
    if (burro.modelos.length === 0) {
      toast.warning(isEn ? 'Drag at least one model to this board.' : 'Debes arrastrar al menos un modelo a este burro', { theme: 'dark' });
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/api/plancha/asignar`, {
        planchador_id: burro.planchador.id,
        burro_numero: burro.numero,
        talla: burro.talla,
        modelos: burro.modelos.map(m => ({
          camion_detalles_id: m.id,
          piezas: m.piezas,
          color: m.color,
          talla: m.talla
        }))
      }, { headers: { Authorization: `Bearer ${token}` } });

      const newBurros = [...burrosState];
      newBurros[index].modelos = [];
      setBurrosState(newBurros);

      fetchModelosDisponibles();
      playBeep('success');
      toast.success(isEn ? 'Ironing job registered and finalized successfully!' : '¡Trabajo de planchado registrado y finalizado con éxito!', { theme: 'dark' });
    } catch (e) {
      console.error(e);
      toast.error(e.response?.data?.error || (isEn ? 'Error finalizing ironing job' : 'Error al finalizar planchado'), { theme: 'dark' });
    }
  };

  const handleFaltaLocal = async (id, nombre) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_URL}/api/planchadores/${id}/asistencia`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      playBeep('success');
      toast.success(
        isEn 
          ? `Absence logged today for ${nombre} (${res.data.asistencias_count}/5)` 
          : `Falta registrada hoy para ${nombre} (${res.data.asistencias_count}/5)`, 
        { theme: 'dark' }
      );
      if (fetchAsistenciasHoy) fetchAsistenciasHoy();
      if (fetchPlanchadores) fetchPlanchadores();
    } catch (e) {
      console.error(e);
      toast.error(e.response?.data?.error || (isEn ? 'Error registering absence' : 'Error al registrar falta'), { theme: 'dark' });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', fontFamily: 'Inter, sans-serif' }}>
      
      {/* KPIs Top */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div style={{ background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <h4 style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '0 0 0.5rem 0' }}>{isEn ? 'Active Boards' : 'Burros activos'}</h4>
          <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{burrosState.filter(b => b.planchador).length}</div>
        </div>
        <div style={{ background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <h4 style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '0 0 0.5rem 0' }}>{isEn ? 'Assigned Models' : 'Modelos asignados'}</h4>
          <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#10b981' }}>{burrosState.reduce((sum, b) => sum + b.modelos.length, 0)}</div>
        </div>
        <div style={{ background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <h4 style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '0 0 0.5rem 0' }}>{isEn ? 'Unassigned' : 'Sin asignar'}</h4>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#f59e0b' }}>{modelosDisponibles.length}</span>
            <span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>
              ({modelosDisponibles.reduce((acc, m) => acc + Object.values(m.tallas_disponibles||{}).reduce((a,b)=>a+b,0), 0)} pz)
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr 300px', gap: '1.5rem', alignItems: 'start' }}>
        
        {/* Left Column: Pendientes */}
        <div style={{ background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 250px)', position: 'sticky', top: '1.5rem' }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
            <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center' }}>
              {isEn ? 'Pending Models' : 'Modelos pendientes'} 
              <span style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem', marginLeft: 'auto', fontWeight: '600' }}>{modelosDisponibles.length}</span>
            </h3>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Arrastra un modelo a un burro disponible o usa Asignar</p>
          </div>
          
          <div style={{ padding: '1rem 1.5rem 0 1.5rem' }}>
            <input 
              type="text" 
              placeholder={isEn ? "Search model..." : "Buscar modelo..."} 
              value={searchQuery} 
              onChange={e => setSearchQuery(e.target.value)} 
              style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--border-color, #e2e8f0)', background: 'var(--bg-input)', color: 'var(--text-primary)', outline: 'none' }} 
            />
          </div>

          <div style={{ overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {modelosDisponibles.filter(m => m.modelo.toLowerCase().includes(searchQuery.toLowerCase())).map(m => (
              <div 
                key={m.id}
                draggable
                onDragStart={(e) => handleDragStart(e, 'modelo', m)}
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1rem', display: 'flex', gap: '1rem', cursor: 'grab', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', transition: 'all 0.2s' }}
                onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = 'var(--primary-color, #0ea5e9)'; }}
                onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}
              >
                {m.imagen ? (
                  <img src={`${API_URL}${m.imagen}`} style={{ width: '60px', height: '80px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--border-color)' }} />
                ) : (
                  <div style={{ width: '60px', height: '80px', background: 'var(--bg-input)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Layers color="#cbd5e1" /></div>
                )}
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <h4 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '0.95rem' }}>{m.modelo}</h4>
                      <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                        {Object.values(m.tallas_disponibles || {}).reduce((a, b) => a + b, 0)} pz
                      </span>
                    </div>
                    <p style={{ margin: '4px 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{formatCurrency(m.precio_plancha)}/pza</p>
                    <button onClick={() => { 
                      if (!activeBurroScanner) {
                        playBeep('error');
                        toast.warning(isEn ? 'First select a board' : 'Primero haz clic en un burro para seleccionarlo y poder asignar el modelo con este botón.', { theme: 'dark' });
                        return;
                      }
                      handleDropOnBurro(null, activeBurroScanner - 1, { type: 'modelo', data: m });
                    }} style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', padding: '4px 12px', fontSize: '0.75rem', cursor: 'pointer', alignSelf: 'flex-start', marginTop: '4px' }}>Asignar</button>
                  </div>
                  
                  {m.tallas_colores_disponibles && Object.keys(m.tallas_colores_disponibles).length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px' }}>
                      {Object.entries(m.tallas_colores_disponibles).map(([colorName, colorTallas]) => {
                        const availableForColor = Object.entries(colorTallas || {})
                          .filter(([_, q]) => q > 0)
                          .sort((a,b) => sortTallasFunc(a[0], b[0]));
                        if (availableForColor.length === 0) return null;
                        return (
                          <div key={colorName} style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-primary)', fontWeight: 'bold', textTransform: 'uppercase' }}>{colorName}:</span>
                            {availableForColor.map(([t, q]) => (
                              <span key={t} style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)', fontSize: '0.65rem', padding: '2px 4px', borderRadius: '4px', fontWeight: '600' }}>{displayTalla(t)}: {q}</span>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '8px' }}>
                      {Object.entries(m.tallas_disponibles)
                        .filter(([_, q]) => q > 0)
                        .sort((a,b) => sortTallasFunc(a[0], b[0]))
                        .map(([t, q]) => (
                        <span key={t} style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', fontWeight: '600' }}>{displayTalla(t)}: {q}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {planchadores.length > 0 && (
              <div style={{ marginTop: '0.5rem', paddingTop: '1.5rem', borderTop: '1px dashed var(--border-color)' }}>
                 <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600' }}>Operarios (Planchadores)</h4>
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                   {planchadores.map(p => (
                     <div key={p.id} draggable onDragStart={(e) => handleDragStart(e, 'planchador', p)} style={{ padding: '0.8rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '8px', cursor: 'grab', display: 'flex', alignItems: 'center', gap: '0.8rem', fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: '500', transition: 'background 0.2s' }} onMouseOver={e => e.currentTarget.style.opacity = '0.8'} onMouseOut={e => e.currentTarget.style.opacity = '1'}>
                       <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#dbeafe', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>{p.nombre.charAt(0)}</div>
                       {p.nombre}
                     </div>
                   ))}
                 </div>
              </div>
            )}
          </div>
        </div>

        {/* Middle Column: Mapa de Burros */}
        <div style={{ background: 'var(--bg-input)', borderRadius: '16px', border: '1px solid var(--border-color)', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-primary)' }}>{isEn ? 'Board Map' : 'Mapa de burros'}</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981' }}></div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Activos</span>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#cbd5e1', marginLeft: '8px' }}></div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Disponibles</span>
            </div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
            {burrosState.map((burro, index) => {
              const hasPlanchador = !!burro.planchador;
              const hasModelos = burro.modelos.length > 0;
              const isActiveScanner = activeBurroScanner === burro.numero;

              return (
                <div 
                  key={burro.numero}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => handleDropOnBurro(e, index)}
                  style={{ 
                    background: 'var(--bg-card)',
                    border: isActiveScanner ? '2px solid #3b82f6' : hasPlanchador ? '1px solid #cbd5e1' : '1px dashed #cbd5e1',
                    borderRadius: '16px',
                    padding: '1.2rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                    boxShadow: isActiveScanner ? '0 0 0 4px rgba(59, 130, 246, 0.1)' : '0 1px 3px rgba(0,0,0,0.05)',
                    position: 'relative',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)' }}>Burro {String(burro.numero).padStart(2, '0')}</h4>
                      <span style={{ fontSize: '0.7rem', fontWeight: 'bold', background: '#ecfdf5', color: '#059669', padding: '2px 8px', borderRadius: '12px' }}>
                        Comodín
                      </span>
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: '600', color: hasPlanchador ? '#10b981' : '#94a3b8' }}>
                      {hasPlanchador ? 'Activo' : 'Disponible'}
                    </span>
                  </div>

                  {/* Planchador Zone */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '0.8rem', background: 'var(--bg-input)', borderRadius: '8px', border: '1px solid transparent', minHeight: '60px' }}>
                    {hasPlanchador ? (
                      <>
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#dbeafe', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', flexShrink: 0 }}>{burro.planchador.nombre.charAt(0)}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Planchando:</p>
                          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{burro.planchador.nombre}</p>
                          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                            <button onClick={(e) => { e.stopPropagation(); setActiveTab('planchadores'); }} style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '4px', padding: '2px 8px', fontSize: '0.65rem', cursor: 'pointer', fontWeight: '600' }}>Detalle</button>
                            <button onClick={(e) => { e.stopPropagation(); handleRemovePlanchadorFromBurro(index); }} style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '4px', padding: '2px 8px', fontSize: '0.65rem', cursor: 'pointer', fontWeight: '600' }}>Reasignar</button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleFaltaLocal(burro.planchador.id, burro.planchador.nombre); }} 
                              disabled={asistenciasHoy.includes(burro.planchador.id) || (burro.planchador.nombre && burro.planchador.nombre.toLowerCase().includes('olga'))}
                              style={{ 
                                background: asistenciasHoy.includes(burro.planchador.id) ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)', 
                                color: asistenciasHoy.includes(burro.planchador.id) ? '#f59e0b' : '#ef4444', 
                                border: `1px solid ${asistenciasHoy.includes(burro.planchador.id) ? 'rgba(245, 158, 11, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`, 
                                borderRadius: '4px', padding: '2px 8px', fontSize: '0.65rem', cursor: asistenciasHoy.includes(burro.planchador.id) ? 'not-allowed' : 'pointer', fontWeight: '600' 
                              }}>
                              {asistenciasHoy.includes(burro.planchador.id) ? 'Falta (Registrada)' : 'Falta'}
                            </button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div style={{ flex: 1, textAlign: 'center', color: 'var(--text-muted, #94a3b8)', fontSize: '0.85rem' }}>Arrastra un operario aquí</div>
                    )}
                  </div>

                  {/* Models Zone */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', minHeight: '120px', background: 'var(--bg-input)', borderRadius: '8px', padding: '0.8rem', border: '1px dashed var(--border-color)' }}>
                    {!hasModelos ? (
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted, #94a3b8)' }}>
                        <Layers size={24} style={{ marginBottom: '8px' }} />
                        <span style={{ fontSize: '0.8rem' }}>Suelta un modelo aquí</span>
                      </div>
                    ) : (
                      burro.modelos.map(m => (
                        <div key={m.uid} style={{ background: 'var(--bg-card)', borderRadius: '8px', padding: '0.8rem', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.8rem', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-primary)' }}>{m.modelo} ({m.color || 'Único'} - {displayTalla(m.talla)})</span>
                            <button onClick={() => handleRemoveModeloFromBurro(index, m.uid)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '2px' }}><X size={14} /></button>
                          </div>
                          
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                              {m.tallas_colores_disponibles && Object.keys(m.tallas_colores_disponibles).length > 1 && (
                                <select value={m.color} onChange={(e) => handleChangeModeloColor(index, m.uid, e.target.value)} style={{ fontSize: '0.75rem', padding: '2px 4px', borderRadius: '4px', border: '1px solid var(--border-color)', outline: 'none' }}>
                                  {Object.keys(m.tallas_colores_disponibles).map(c => (
                                    <option key={c} value={c}>{c}</option>
                                  ))}
                                </select>
                              )}
                              <select value={normalizeTalla(m.talla)} onChange={(e) => handleChangeModeloTalla(index, m.uid, e.target.value)} style={{ fontSize: '0.75rem', padding: '2px 4px', borderRadius: '4px', border: '1px solid var(--border-color)', outline: 'none' }}>
                                {Object.entries(m.color && m.tallas_colores_disponibles && m.tallas_colores_disponibles[m.color] ? m.tallas_colores_disponibles[m.color] : (m.tallas_disponibles || {}))
                                  .filter(([t, q]) => burro.is_comodin || q > 0 || normalizeTalla(t) === normalizeTalla(m.talla))
                                  .sort((a,b) => sortTallasFunc(a[0], b[0]))
                                  .map(([t, _]) => <option key={t} value={normalizeTalla(t)}>{displayTalla(t)}</option>)}
                              </select>
                            
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--bg-input)', borderRadius: '6px', padding: '2px' }}>
                              <button onClick={() => handleUpdatePiezas(index, m.uid, -1)} style={{ border: 'none', background: 'var(--bg-card)', width: '22px', height: '22px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 1px rgba(0,0,0,0.05)' }}>-</button>
                              <input type="number" value={m.piezas} onChange={(e) => handleSetPiezas(index, m.uid, parseInt(e.target.value)||1)} style={{ width: '32px', border: 'none', background: 'transparent', textAlign: 'center', fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-primary)', outline: 'none' }} />
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted, #94a3b8)', fontWeight: '600' }}>/ {m.maxPiezas}</span>
                              <button onClick={() => handleUpdatePiezas(index, m.uid, 1)} style={{ border: 'none', background: 'var(--bg-card)', width: '22px', height: '22px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 1px rgba(0,0,0,0.05)' }}>+</button>
                            </div>
                          </div>

                          {/* Progress Bar */}
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: '600' }}>
                              <span>{m.piezas} / {m.maxPiezas} pz</span>
                              <span>{Math.round((m.piezas/m.maxPiezas)*100)}%</span>
                            </div>
                            <div style={{ width: '100%', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                              <div style={{ width: `${(m.piezas/m.maxPiezas)*100}%`, height: '100%', background: '#10b981', transition: 'width 0.3s ease' }}></div>
                            </div>
                          </div>

                        </div>
                      ))
                    )}
                  </div>

                  {/* Footer Action */}
                  <button 
                    onClick={() => handleFinalizarPlanchado(index)}
                    disabled={!hasPlanchador || !hasModelos}
                    style={{ 
                      width: '100%', 
                      padding: '0.8rem', 
                      border: 'none', 
                      borderRadius: '8px', 
                      background: (!hasPlanchador || !hasModelos) ? 'var(--bg-input)' : '#2563eb', 
                      color: (!hasPlanchador || !hasModelos) ? '#94a3b8' : '#fff', 
                      fontWeight: '600', 
                      cursor: (!hasPlanchador || !hasModelos) ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s',
                      marginTop: 'auto',
                      boxShadow: (!hasPlanchador || !hasModelos) ? 'none' : '0 2px 4px rgba(37, 99, 235, 0.2)'
                    }}
                  >
                    Confirmar asignación
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Third Column: Detalle y Carga Operario */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Detalle de Asignación */}
          <div style={{ background: 'var(--bg-card, #fff)', borderRadius: '16px', border: '1px solid var(--border-color, #e2e8f0)', padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: 'var(--text-primary)' }}>Detalle de Asignación</h3>
            <div style={{ background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color, #e2e8f0)', overflow: 'hidden' }}>
              {activeBurroScanner && burrosState[activeBurroScanner - 1] ? (() => {
                const activeBurroObj = burrosState[activeBurroScanner - 1];
                const activeModel = activeBurroObj.modelos.length > 0 ? activeBurroObj.modelos[activeBurroObj.modelos.length - 1] : null;
                const totalPiezasAsignadas = activeBurroObj.modelos.reduce((acc, m) => acc + m.piezas, 0);
                const totalMaxPiezas = activeBurroObj.modelos.reduce((acc, m) => acc + m.maxPiezas, 0) || 1;
                const progresoCarga = Math.min(100, Math.round((totalPiezasAsignadas / totalMaxPiezas) * 100));
                const avanceTrabajo = 0;

                const minutosPorPieza = 5;
                const minutosEstimados = totalPiezasAsignadas * minutosPorPieza;
                const horasEstimadas = Math.floor(minutosEstimados / 60);
                const minsRestantes = minutosEstimados % 60;
                const tiempoTexto = horasEstimadas > 0 ? `${horasEstimadas}h ${minsRestantes}m` : `${minsRestantes} min`;
                
                let horaFinEst = "--:--";
                if (minutosEstimados > 0) {
                  const now = new Date();
                  now.setMinutes(now.getMinutes() + minutosEstimados);
                  horaFinEst = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                }

                const prioridadActual = activeBurroObj.prioridad || 'Normal';
                const prioridadColor = prioridadActual === 'Urgente' ? '#ef4444' : prioridadActual === 'Alta' ? '#f97316' : prioridadActual === 'Baja' ? '#3b82f6' : '#10b981';
                const prioridadBg = prioridadActual === 'Urgente' ? '#fee2e2' : prioridadActual === 'Alta' ? '#ffedd5' : prioridadActual === 'Baja' ? '#dbeafe' : '#d1fae5';

                return (
                  <div style={{ padding: '1.2rem', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                    {/* Cabecera / Modelo Activo */}
                    {activeModel ? (
                      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <div style={{ width: '70px', height: '90px', borderRadius: '8px', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                          {activeModel.imagen ? (
                            <img src={`${API_URL}${activeModel.imagen}`} alt={activeModel.modelo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <Layers color="#cbd5e1" size={32} />
                          )}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <h4 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1rem', fontWeight: 'bold' }}>{activeModel.modelo}</h4>
                            <span style={{ fontSize: '0.65rem', background: prioridadBg, color: prioridadColor, padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold' }}>{prioridadActual}</span>
                          </div>
                          <p style={{ margin: '2px 0 0 0', fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: '600' }}>{activeModel.color ? `${activeModel.color}` : 'Variante Única'} - {displayTalla(activeModel.talla)}</p>
                        </div>
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '1rem', background: 'var(--bg-input)', borderRadius: '8px', border: '1px dashed var(--border-color)' }}>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Sin modelo asignado aún.</p>
                      </div>
                    )}

                    {/* Detalles Stats */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', fontSize: '0.8rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Prioridad</span>
                        <select 
                          value={activeBurroObj.prioridad || 'Normal'}
                          onChange={(e) => {
                            const newBurros = [...burrosState];
                            newBurros[activeBurroScanner - 1].prioridad = e.target.value;
                            setBurrosState(newBurros);
                          }}
                          style={{ padding: '0.3rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: '0.75rem', outline: 'none', minWidth: '90px' }}
                        >
                          <option value="Baja">Baja</option>
                          <option value="Normal">Normal</option>
                          <option value="Alta">Alta</option>
                          <option value="Urgente">Urgente</option>
                        </select>
                      </div>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Fecha límite</span>
                        <input 
                          type="datetime-local" 
                          value={activeBurroObj.fecha_limite || ''}
                          onChange={(e) => {
                            const newBurros = [...burrosState];
                            newBurros[activeBurroScanner - 1].fecha_limite = e.target.value;
                            setBurrosState(newBurros);
                          }}
                          style={{ padding: '0.3rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: '0.75rem', outline: 'none', maxWidth: '170px' }}
                        />
                      </div>
                    </div>

                    {/* Manipulacion de Piezas */}
                    <div style={{ marginTop: '0.5rem' }}>
                      <p style={{ margin: '0 0 0.5rem 0', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 'bold' }}>Modelos Asignados (Piezas a Planchar)</p>
                      {activeBurroObj.modelos.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '120px', overflowY: 'auto', paddingRight: '4px' }}>
                          {activeBurroObj.modelos.map((m, idx) => (
                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-input)', padding: '0.5rem', borderRadius: '6px' }}>
                              <span style={{ color: 'var(--text-primary)', fontWeight: '500', fontSize: '0.8rem' }}>{m.modelo} <span style={{ fontSize:'0.7rem', color:'var(--text-secondary)'}}>({m.color || 'Único'} - {displayTalla(m.talla)})</span></span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <button 
                                  onClick={() => handleUpdatePiezas(activeBurroScanner - 1, m.uid, -1)}
                                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', width: '22px', height: '22px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems:'center', justifyContent:'center' }}
                                ><MinusCircle size={12} /></button>
                                <span style={{ fontWeight: 'bold', width: '24px', textAlign: 'center', fontSize: '0.8rem' }}>{m.piezas}</span>
                                <button 
                                  onClick={() => handleUpdatePiezas(activeBurroScanner - 1, m.uid, 1)}
                                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', width: '22px', height: '22px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems:'center', justifyContent:'center' }}
                                ><Plus size={12} /></button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>Sin modelos</p>
                      )}
                    </div>

                    {/* Asignar a */}
                    <div>
                      <h4 style={{ margin: '0 0 0.8rem 0', fontSize: '0.95rem', color: 'var(--text-primary)', fontWeight: 'bold' }}>Asignar a</h4>
                      
                      <div style={{ marginBottom: '0.8rem' }}>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: '600' }}>Burro</label>
                        <select 
                          value={activeBurroScanner} 
                          onChange={(e) => setActiveBurroScanner(Number(e.target.value))}
                          style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none' }}
                        >
                          {burrosState.map((b, i) => (
                            <option key={i} value={b.numero}>Burro {b.numero.toString().padStart(2, '0')}</option>
                          ))}
                        </select>
                      </div>

                      <div style={{ marginBottom: '0.8rem' }}>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: '600' }}>Operario</label>
                        <select 
                          value={activeBurroObj.planchador ? activeBurroObj.planchador.id : ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            const newBurros = [...burrosState];
                            if (!val) {
                              newBurros[activeBurroScanner - 1].planchador = null;
                              setBurrosState(newBurros);
                            } else {
                              const p = planchadores.find(pl => pl.id === parseInt(val));
                              if (p) {
                                newBurros[activeBurroScanner - 1].planchador = p;
                                setBurrosState(newBurros);
                              }
                            }
                          }}
                          style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none' }}
                        >
                          <option value="">Selecciona Operario</option>
                          {planchadores.map(p => (
                            <option key={p.id} value={p.id}>{p.nombre}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: '600' }}>Hora estimada de finalización</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: '0.85rem' }}>
                          <Clock size={14} color="var(--text-secondary)" />
                          <span>{horaFinEst === "--:--" ? "N/A" : horaFinEst}</span>
                        </div>
                      </div>
                    </div>

                    {/* Proyección */}
                    <div style={{ background: 'var(--bg-input)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <p style={{ margin: '0 0 0.8rem 0', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Análisis de Proyección</p>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', fontSize: '0.8rem' }}>
                        <span style={{ color: 'var(--text-primary)' }}>Tiempo estimado</span>
                        <span style={{ color: '#10b981', fontWeight: 'bold' }}>{tiempoTexto}</span>
                      </div>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', fontSize: '0.8rem' }}>
                        <span style={{ color: 'var(--text-primary)' }}>Avance proyectado</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, margin: '0 1rem' }}>
                          <div style={{ flex: 1, height: '6px', background: 'var(--border-color)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ width: `${avanceTrabajo}%`, height: '100%', background: '#10b981', borderRadius: '3px' }}></div>
                          </div>
                        </div>
                        <span style={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>{avanceTrabajo}%</span>
                      </div>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.8rem' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Piezas vs Cap. Original</span>
                        <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>{totalPiezasAsignadas} / {totalMaxPiezas}</span>
                      </div>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Eficiencia Operario</span>
                        <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>{activeBurroObj.planchador ? '95%' : 'N/A'}</span>
                      </div>
                    </div>

                    {/* Botones de Acción */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                      <button 
                        onClick={() => handleFinalizarPlanchado(activeBurroScanner - 1)}
                        disabled={!activeBurroObj.planchador || activeBurroObj.modelos.length === 0}
                        style={{ 
                          width: '100%', 
                          padding: '0.8rem', 
                          background: (!activeBurroObj.planchador || activeBurroObj.modelos.length === 0) ? 'var(--bg-input)' : '#2563eb', 
                          color: (!activeBurroObj.planchador || activeBurroObj.modelos.length === 0) ? '#94a3b8' : '#fff', 
                          border: 'none', 
                          borderRadius: '8px', 
                          fontWeight: '600', 
                          fontSize: '0.95rem',
                          cursor: (!activeBurroObj.planchador || activeBurroObj.modelos.length === 0) ? 'not-allowed' : 'pointer',
                          boxShadow: (!activeBurroObj.planchador || activeBurroObj.modelos.length === 0) ? 'none' : '0 2px 6px rgba(37,99,235,0.3)',
                          transition: 'all 0.2s'
                        }}
                      >
                        Confirmar asignación
                      </button>
                      
                      <button 
                        onClick={() => {
                          const newBurros = [...burrosState];
                          newBurros[activeBurroScanner - 1].modelos = [];
                          newBurros[activeBurroScanner - 1].planchador = null;
                          setBurrosState(newBurros);
                        }}
                        style={{ 
                          width: '100%', 
                          padding: '0.6rem', 
                          background: 'transparent', 
                          color: '#3b82f6', 
                          border: 'none', 
                          fontWeight: '600', 
                          fontSize: '0.9rem',
                          cursor: 'pointer'
                        }}
                      >
                        Cancelar
                      </button>
                    </div>

                  </div>
                );
              })() : (
                <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                  <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Selecciona un burro o arrastra un elemento para comenzar.</p>
                </div>
              )}
            </div>
          </div>

          {/* Carga Operario */}
          <div style={{ background: 'var(--bg-card, #fff)', borderRadius: '16px', border: '1px solid var(--border-color, #e2e8f0)', padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: 'var(--text-primary)' }}>Carga Operario</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              {planchadores.slice(0, 8).map(p => {
                let piezasAsignadas = 0;
                burrosState.forEach(b => {
                  if (b.planchador && b.planchador.id === p.id) {
                    b.modelos.forEach(m => piezasAsignadas += (parseInt(m.piezas)||0));
                  }
                });
                return (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.8rem', background: 'var(--bg-input)', borderRadius: '8px', border: '1px solid var(--border-color, #e2e8f0)' }}>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: '500' }}>{p.nombre}</span>
                    <span style={{ fontSize: '0.85rem', color: '#10b981', fontWeight: 'bold', background: 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: '12px' }}>{piezasAsignadas} pzas</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
