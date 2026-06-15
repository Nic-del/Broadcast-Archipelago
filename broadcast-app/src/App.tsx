import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Wifi, 
  WifiOff, 
  Bell, 
  History,
  Info, 
  AlertCircle,
  Monitor,
  GripVertical,
  RefreshCw,
  MapPin,
  User,
  CheckCircle2,
  ArrowRight,
  Trash2,
  Upload,
  X,
  Play,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { cn } from './lib/utils';

// Types
interface GameNotification {
  id: string;
  type: string;
  event: 'receive' | 'send' | 'normal' | 'error' | 'hint';
  item?: string;
  from?: string;
  to?: string;
  text?: string;
  item_id?: number;
  class?: number;
  timestamp: string;
  my_alias?: string;
  raw_data?: Record<string, unknown>;
  is_mine?: boolean;
  is_test?: boolean;
  location?: string;
  owner?: string;
  finder?: string;
  found?: boolean;
}



interface DisplayInfo {
  id: number;
  label: string;
  isPrimary: boolean;
  bounds: { x: number; y: number; width: number; height: number };
}

const App: React.FC = () => {
  // Detect View Mode and Sync Mode from URL
  const { isStreamMode, syncMode } = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const isElectron = !!(window as any).electron;
    
    // Auto-detect OBS: If explicitly requested via URL OR if NOT running in Electron
    return {
      isStreamMode: params.get('view') === 'obs' || params.get('mode') === 'obs' || !isElectron,
      syncMode: params.get('sync') || 'all'
    };
  }, []);

  const [notifications, setNotifications] = useState<GameNotification[]>(() => {
    if (isStreamMode) {
      try {
        const saved = localStorage.getItem('broadcast_history');
        if (saved) {
          let parsed = JSON.parse(saved) as GameNotification[];
          
          // Filter history based on sync mode if in OBS mode
          if (syncMode === 'personal') {
            parsed = parsed.filter(n => n.is_mine);
          } else if (syncMode === 'filtered') {
            const tracked = JSON.parse(localStorage.getItem('broadcast_tracked_players') || '[]');
            parsed = parsed.filter(n => tracked.includes(n.from) || tracked.includes(n.to));
          }

          // For OBS mode, we show the last 15 items in chronological order (newest at bottom)
          return parsed
            .filter(n => n.event === 'receive' || n.event === 'send')
            .slice(0, 15)
            .reverse(); // Reverse because history is [newest, ..., oldest]
        }
      } catch {
        return [];
      }
    }
    return [];
  });
  
  const [history, setHistory] = useState<GameNotification[]>(() => {
    try {
      const saved = localStorage.getItem('broadcast_history');
      if (!saved) return [];
      let parsed = JSON.parse(saved) as GameNotification[];
      
      // Filter history based on sync mode
      if (syncMode === 'personal') {
        parsed = parsed.filter(n => n.is_mine);
      } else if (syncMode === 'filtered') {
        const tracked = JSON.parse(localStorage.getItem('broadcast_tracked_players') || '[]');
        parsed = parsed.filter(n => tracked.includes(n.from) || tracked.includes(n.to));
      }
      return parsed;
    } catch {
      return [];
    }
  });

  const [isConnected, setIsConnected] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [displays, setDisplays] = useState<DisplayInfo[]>([]);
  const [windowBounds, setWindowBounds] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [playerList, setPlayerList] = useState<string[]>([]);
  const [multiSlots, setMultiSlots] = useState<string[]>([]);
  const [trackedPlayers, setTrackedPlayers] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('broadcast_tracked_players');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [currentPlayer, setCurrentPlayer] = useState<string>('');
  const [currentSlot, setCurrentSlot] = useState<string>('');
  const [hintInput, setHintInput] = useState('');
  const [showHints, setShowHints] = useState<boolean>(() => {
    const saved = localStorage.getItem('broadcast_show_hints');
    return saved ? JSON.parse(saved) : true;
  });
  const [itemList, setItemList] = useState<string[]>([]);
  const [locationList, setLocationList] = useState<string[]>([]);
  const [groupsList, setGroupsList] = useState<string[]>([]);
  const [hintPoints, setHintPoints] = useState<number>(0);
  const [hintCost, setHintCost] = useState<number>(0);

  const [isCustomModeOverlay, setIsCustomModeOverlay] = useState<boolean>(() => {
    const saved = localStorage.getItem('broadcast_custom_mode_overlay');
    return saved ? JSON.parse(saved) : false;
  });
  const [isCustomModeOBS, setIsCustomModeOBS] = useState<boolean>(() => {
    const saved = localStorage.getItem('broadcast_custom_mode_obs');
    return saved ? JSON.parse(saved) : false;
  });
  const [playerAvatars, setPlayerAvatars] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('broadcast_player_avatars');
    return saved ? JSON.parse(saved) : {};
  });
  const [friendsLibrary, setFriendsLibrary] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('broadcast_friends_library');
    return saved ? JSON.parse(saved) : {};
  });
  const [showLocations, setShowLocations] = useState<boolean>(() => {
    const saved = localStorage.getItem('broadcast_show_locations');
    return saved ? JSON.parse(saved) : true;
  });

  const [useGridPopupOverlay, setUseGridPopupOverlay] = useState<boolean>(() => {
    const saved = localStorage.getItem('broadcast_use_grid_popup_overlay');
    return saved ? JSON.parse(saved) : false;
  });
  const [useGridPopupOBS, setUseGridPopupOBS] = useState<boolean>(() => {
    const saved = localStorage.getItem('broadcast_use_grid_popup_obs');
    return saved ? JSON.parse(saved) : false;
  });
  const [gridMaxPeople, setGridMaxPeople] = useState<number>(() => {
    const saved = localStorage.getItem('broadcast_grid_max_people');
    return saved ? parseInt(saved) : 5;
  });
  const [gridLayoutOverlay, setGridLayoutOverlay] = useState<'horizontal' | 'vertical' | 'horizontal-bottom' | 'horizontal-top' | 'vertical-left' | 'vertical-right'>(() => {
    const saved = localStorage.getItem('broadcast_grid_layout_overlay');
    return (saved as any) || 'horizontal';
  });
  const [gridLayoutOBS, setGridLayoutOBS] = useState<'horizontal' | 'vertical' | 'horizontal-bottom' | 'horizontal-top' | 'vertical-left' | 'vertical-right'>(() => {
    const saved = localStorage.getItem('broadcast_grid_layout_obs');
    return (saved as any) || 'horizontal';
  });
  const [singleBubbleFocus, setSingleBubbleFocus] = useState<boolean>(() => {
    const saved = localStorage.getItem('broadcast_single_bubble_focus');
    return saved ? JSON.parse(saved) : true;
  });
  const [gridPlayers, setGridPlayers] = useState<{
    name: string;
    lastActive: number;
    activeNotification: GameNotification | null;
    notifId: string | null;
  }[]>(() => {
    try {
      const saved = localStorage.getItem('broadcast_grid_players');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Notification Styling Settings
  const [avatarSize, setAvatarSize] = useState<number>(() => {
    const saved = localStorage.getItem('broadcast_avatar_size');
    return saved ? parseInt(saved) : 48;
  });
  const [textSize, setTextSize] = useState<number>(() => {
    const saved = localStorage.getItem('broadcast_text_size');
    return saved ? parseInt(saved) : 14;
  });
  const [showTimestamp, setShowTimestamp] = useState<boolean>(() => {
    const saved = localStorage.getItem('broadcast_show_timestamp');
    return saved ? JSON.parse(saved) : true;
  });
  const [showEventLabel, setShowEventLabel] = useState<boolean>(() => {
    const saved = localStorage.getItem('broadcast_show_event_label');
    return saved ? JSON.parse(saved) : true;
  });
  const [notifColor, setNotifColor] = useState<string>(() => {
    const saved = localStorage.getItem('broadcast_notif_color');
    return saved || '#171717';
  });
  const [notifLayout, setNotifLayout] = useState<'standard' | 'reversed' | 'vertical'>(() => {
    const saved = localStorage.getItem('broadcast_notif_layout');
    return (saved as any) || 'standard';
  });
  const [notifPadding, setNotifPadding] = useState<number>(() => {
    const saved = localStorage.getItem('broadcast_notif_padding');
    return saved ? parseInt(saved) : 12;
  });

  const [overlayPosition, setOverlayPosition] = useState<string>(() => {
    const saved = localStorage.getItem('broadcast_overlay_position');
    return saved || 'bottom-left';
  });
  const [obsPosition, setObsPosition] = useState<string>(() => {
    const saved = localStorage.getItem('broadcast_obs_position');
    return saved || 'bottom-left';
  });

  // Sound settings state
  const [soundSettings, setSoundSettings] = useState<{
    enabled: boolean;
    volume: number;
    categories: Record<string, { enabled: boolean; mode: 'synth' | 'custom'; volume: number }>;
  }>(() => {
    try {
      const saved = localStorage.getItem('broadcast_sound_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        const categories = parsed.categories || {};
        const updatedCategories: Record<string, { enabled: boolean; mode: 'synth' | 'custom'; volume: number }> = {};
        const defaultCats = {
          progression: { enabled: true, mode: 'synth', volume: 100 },
          useful: { enabled: true, mode: 'synth', volume: 80 },
          junk: { enabled: false, mode: 'synth', volume: 50 },
          trap: { enabled: true, mode: 'synth', volume: 100 },
          hint: { enabled: true, mode: 'synth', volume: 80 },
          other: { enabled: true, mode: 'synth', volume: 70 }
        };
        for (const [key, val] of Object.entries(defaultCats)) {
          updatedCategories[key] = {
            enabled: categories[key]?.enabled !== undefined ? categories[key].enabled : val.enabled,
            mode: categories[key]?.mode !== undefined ? categories[key].mode : val.mode,
            volume: categories[key]?.volume !== undefined ? categories[key].volume : val.volume
          };
        }
        return {
          enabled: parsed.enabled !== undefined ? parsed.enabled : true,
          volume: parsed.volume !== undefined ? parsed.volume : 50,
          categories: updatedCategories
        };
      }
    } catch {}
    return {
      enabled: true,
      volume: 50,
      categories: {
        progression: { enabled: true, mode: 'synth', volume: 100 },
        useful: { enabled: true, mode: 'synth', volume: 80 },
        junk: { enabled: false, mode: 'synth', volume: 50 },
        trap: { enabled: true, mode: 'synth', volume: 100 },
        hint: { enabled: true, mode: 'synth', volume: 80 },
        other: { enabled: true, mode: 'synth', volume: 70 }
      }
    };
  });

  useEffect(() => {
    localStorage.setItem('broadcast_sound_settings', JSON.stringify(soundSettings));
  }, [soundSettings]);

  // Audio Synthesizer via Web Audio API
  const playSynthesizedSound = (type: string, volume: number) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime((volume / 100) * 0.75, ctx.currentTime);
      masterGain.connect(ctx.destination);

      const now = ctx.currentTime;

      if (type === 'progression') {
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + idx * 0.08);
          gain.gain.setValueAtTime(0, now + idx * 0.08);
          gain.gain.linearRampToValueAtTime(0.4, now + idx * 0.08 + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 0.3);
          osc.connect(gain);
          gain.connect(masterGain);
          osc.start(now + idx * 0.08);
          osc.stop(now + idx * 0.08 + 0.35);
        });
      } else if (type === 'useful') {
        const notes = [880.00, 1109.73];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.08);
          gain.gain.setValueAtTime(0, now + idx * 0.08);
          gain.gain.linearRampToValueAtTime(0.3, now + idx * 0.08 + 0.01);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 0.15);
          osc.connect(gain);
          gain.connect(masterGain);
          osc.start(now + idx * 0.08);
          osc.stop(now + idx * 0.08 + 0.2);
        });
      } else if (type === 'junk') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(150, now + 0.06);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(now);
        osc.stop(now + 0.07);
      } else if (type === 'trap') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.linearRampToValueAtTime(100, now + 0.4);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.linearRampToValueAtTime(0.2, now + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(now);
        osc.stop(now + 0.45);
      } else if (type === 'hint') {
        const freqs = [392.00, 493.88, 587.33];
        freqs.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.04);
          gain.gain.setValueAtTime(0, now + idx * 0.04);
          gain.gain.linearRampToValueAtTime(0.25, now + idx * 0.04 + 0.1);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.04 + 0.6);
          osc.connect(gain);
          gain.connect(masterGain);
          osc.start(now + idx * 0.04);
          osc.stop(now + idx * 0.04 + 0.7);
        });
      } else {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.05);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(now);
        osc.stop(now + 0.07);
      }
    } catch (e) {
      console.error("Synthesizer playback failed:", e);
    }
  };

  const playCustomSound = (category: string, volume: number) => {
    try {
      const savedSound = localStorage.getItem(`broadcast_custom_sound_${category}`);
      if (!savedSound) return;
      const audio = new Audio(savedSound);
      audio.volume = Math.max(0, Math.min(1, volume / 100));
      audio.play().catch(err => console.error("Custom audio play failed:", err));
    } catch (err) {
      console.error("Custom audio load failed:", err);
    }
  };

  const playNotificationSound = (category: string) => {
    if (!soundSettings.enabled) return;
    const catSettings = soundSettings.categories[category];
    if (!catSettings || !catSettings.enabled) return;

    const catVol = catSettings.volume !== undefined ? catSettings.volume : 100;
    const finalVolume = (soundSettings.volume / 100) * catVol;

    if (catSettings.mode === 'custom') {
      const savedSound = localStorage.getItem(`broadcast_custom_sound_${category}`);
      if (savedSound) {
        playCustomSound(category, finalVolume);
      } else {
        playSynthesizedSound(category, finalVolume);
      }
    } else {
      playSynthesizedSound(category, finalVolume);
    }
  };

  const playSoundForNotification = (event: string, itemClass?: number) => {
    if (event === 'hint') {
      playNotificationSound('hint');
    } else if (event === 'receive' || event === 'send') {
      if (itemClass === 0) {
        playNotificationSound('progression');
      } else if (itemClass === 1) {
        playNotificationSound('useful');
      } else if (itemClass === 2) {
        playNotificationSound('junk');
      } else if (itemClass === 3) {
        playNotificationSound('trap');
      } else {
        playNotificationSound('other');
      }
    }
  };

  const handleCustomSoundUpload = (category: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 500 * 1024) {
      alert("File is too large! Maximum size allowed is 500KB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        try {
          localStorage.setItem(`broadcast_custom_sound_${category}`, result);
          const catSettings = soundSettings.categories[category];
          const catVol = catSettings?.volume !== undefined ? catSettings.volume : 100;
          const finalVolume = (soundSettings.volume / 100) * catVol;
          const audio = new Audio(result);
          audio.volume = Math.max(0, Math.min(1, finalVolume / 100));
          audio.play().catch(e => console.error(e));
        } catch (error) {
          alert("Failed to save custom sound. LocalStorage might be full.");
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCategorySoundToggle = (category: string) => {
    setSoundSettings(prev => ({
      ...prev,
      categories: {
        ...prev.categories,
        [category]: {
          ...prev.categories[category],
          enabled: !prev.categories[category].enabled
        }
      }
    }));
  };

  const handleCategorySoundModeChange = (category: string, mode: 'synth' | 'custom') => {
    setSoundSettings(prev => ({
      ...prev,
      categories: {
        ...prev.categories,
        [category]: {
          ...prev.categories[category],
          mode
        }
      }
    }));
  };

  const socketRef = useRef<WebSocket | null>(null);

  // Fetch initial data from Electron
  useEffect(() => {
    interface ElectronBridge {
      getDisplays: () => Promise<DisplayInfo[]>;
      getWindowBounds: () => Promise<{ x: number; y: number; width: number; height: number }>;
      onDisplaysUpdated: (callback: (data: DisplayInfo[]) => void) => () => void;
      onWindowBoundsUpdated: (callback: (bounds: { x: number; y: number; width: number; height: number }) => void) => () => void;
      setDisplay: (idx: number) => void;
    }
    const electron = (window as unknown as { electron: ElectronBridge }).electron;
    if (electron) {
      electron.getDisplays().then((data: DisplayInfo[]) => {
        setDisplays(data);
      });
      
      electron.getWindowBounds().then((bounds) => {
        setWindowBounds(bounds);
      });

      const unsubDisplays = electron.onDisplaysUpdated((data: DisplayInfo[]) => setDisplays(data));
      const unsubBounds = electron.onWindowBoundsUpdated((bounds) => {
        setWindowBounds(bounds);
      });

      return () => {
        unsubDisplays();
        unsubBounds();
      };
    }
  }, []);

  // Calculate active display index based on window position
  const activeDisplayIndex = useMemo(() => {
    if (displays.length === 0) return 0;
    
    // Find which display contains the center of the window
    const winCenterX = windowBounds.x + windowBounds.width / 2;
    const winCenterY = windowBounds.y + windowBounds.height / 2;
    
    const index = displays.findIndex(d => 
      winCenterX >= d.bounds.x && winCenterX <= d.bounds.x + d.bounds.width &&
      winCenterY >= d.bounds.y && winCenterY <= d.bounds.y + d.bounds.height
    );
    
    return index !== -1 ? index : 0;
  }, [windowBounds, displays]);

  const [activeTab, setActiveTab] = useState<'display' | 'settings' | 'hints' | 'room' | 'custom'>('display');

  const [overlayMode, setOverlayMode] = useState<string>('all');
  const [obsMode, setObsMode] = useState<string>('all');
  const [currentSyncMode, setCurrentSyncMode] = useState<string>(syncMode);
  const [overlayDuration, setOverlayDuration] = useState<number>(10);
  const [obsDuration, setObsDuration] = useState<number>(15);
  const [obsFade, setObsFade] = useState<boolean>(false);
  const [bgOpacity, setBgOpacity] = useState<number>(() => {
    const saved = localStorage.getItem('broadcast_bg_opacity');
    return saved ? parseInt(saved) : 90;
  });
  const [persistentHints, setPersistentHints] = useState<any[]>([]);
  const [bridgeLogs, setBridgeLogs] = useState<string[]>([]);
  const syncModeRef = useRef<string>(syncMode);
  const trackedPlayersRef = useRef<string[]>(trackedPlayers);
  const durationsRef = useRef({ overlay: 10, obs: 15, fade: false });
  const gridMaxPeopleRef = useRef<number>(gridMaxPeople);
  const singleBubbleFocusRef = useRef<boolean>(singleBubbleFocus);

  // Sync refs with state
  useEffect(() => {
    syncModeRef.current = currentSyncMode;
  }, [currentSyncMode]);

  useEffect(() => {
    gridMaxPeopleRef.current = gridMaxPeople;
    // Slice grid players if max count is reduced
    setGridPlayers(prev => {
      if (prev.length > gridMaxPeople) {
        const sorted = [...prev].sort((a, b) => b.lastActive - a.lastActive);
        const sliced = sorted.slice(0, gridMaxPeople);
        const updated = prev.filter(p => sliced.some(s => s.name === p.name));
        localStorage.setItem('broadcast_grid_players', JSON.stringify(updated));
        return updated;
      }
      return prev;
    });
  }, [gridMaxPeople]);

  useEffect(() => {
    durationsRef.current = { overlay: overlayDuration, obs: obsDuration, fade: obsFade };
    
    // Retro-active cleanup for OBS mode when fade is toggled on
    if (isStreamMode && obsFade && obsDuration > 0) {
      const now = Date.now();
      setNotifications(prev => prev.filter(n => {
        const createdAt = (n as any).createdAt || now;
        const elapsed = now - createdAt;
        return elapsed < (obsDuration * 1000);
      }));
    }
  }, [overlayDuration, obsDuration, obsFade, isStreamMode]);

  useEffect(() => {
    trackedPlayersRef.current = trackedPlayers;
    localStorage.setItem('broadcast_tracked_players', JSON.stringify(trackedPlayers));
  }, [trackedPlayers]);

  useEffect(() => {
    localStorage.setItem('broadcast_show_hints', JSON.stringify(showHints));
  }, [showHints]);

  useEffect(() => {
    localStorage.setItem('broadcast_bg_opacity', bgOpacity.toString());
  }, [bgOpacity]);

  useEffect(() => {
    localStorage.setItem('broadcast_custom_mode_overlay', JSON.stringify(isCustomModeOverlay));
  }, [isCustomModeOverlay]);

  useEffect(() => {
    localStorage.setItem('broadcast_custom_mode_obs', JSON.stringify(isCustomModeOBS));
  }, [isCustomModeOBS]);

  useEffect(() => {
    localStorage.setItem('broadcast_use_grid_popup_overlay', JSON.stringify(useGridPopupOverlay));
  }, [useGridPopupOverlay]);

  useEffect(() => {
    localStorage.setItem('broadcast_use_grid_popup_obs', JSON.stringify(useGridPopupOBS));
  }, [useGridPopupOBS]);

  useEffect(() => {
    localStorage.setItem('broadcast_grid_max_people', gridMaxPeople.toString());
  }, [gridMaxPeople]);

  useEffect(() => {
    localStorage.setItem('broadcast_grid_layout_overlay', gridLayoutOverlay);
  }, [gridLayoutOverlay]);

  useEffect(() => {
    localStorage.setItem('broadcast_grid_layout_obs', gridLayoutOBS);
  }, [gridLayoutOBS]);

  useEffect(() => {
    singleBubbleFocusRef.current = singleBubbleFocus;
    localStorage.setItem('broadcast_single_bubble_focus', JSON.stringify(singleBubbleFocus));
  }, [singleBubbleFocus]);

  useEffect(() => {
    localStorage.setItem('broadcast_player_avatars', JSON.stringify(playerAvatars));
  }, [playerAvatars]);

  useEffect(() => {
    localStorage.setItem('broadcast_friends_library', JSON.stringify(friendsLibrary));
  }, [friendsLibrary]);

  useEffect(() => {
    localStorage.setItem('broadcast_show_locations', JSON.stringify(showLocations));
  }, [showLocations]);

  useEffect(() => {
    localStorage.setItem('broadcast_avatar_size', avatarSize.toString());
  }, [avatarSize]);

  useEffect(() => {
    localStorage.setItem('broadcast_text_size', textSize.toString());
  }, [textSize]);

  useEffect(() => {
    localStorage.setItem('broadcast_show_timestamp', JSON.stringify(showTimestamp));
  }, [showTimestamp]);

  useEffect(() => {
    localStorage.setItem('broadcast_show_event_label', JSON.stringify(showEventLabel));
  }, [showEventLabel]);

  useEffect(() => {
    localStorage.setItem('broadcast_notif_color', notifColor);
  }, [notifColor]);

  useEffect(() => {
    localStorage.setItem('broadcast_notif_layout', notifLayout);
  }, [notifLayout]);

  useEffect(() => {
    localStorage.setItem('broadcast_notif_padding', notifPadding.toString());
  }, [notifPadding]);

  useEffect(() => {
    localStorage.setItem('broadcast_overlay_position', overlayPosition);
  }, [overlayPosition]);

  useEffect(() => {
    localStorage.setItem('broadcast_obs_position', obsPosition);
  }, [obsPosition]);

  // Connect to Bridge
  useEffect(() => {
    let isMounted = true;
    let reconnectTimeout: ReturnType<typeof setTimeout>;
    const connect = () => {
      const hostname = window.location.hostname;
      const wsHost = (hostname === 'localhost' || !hostname) ? '127.0.0.1' : hostname;
      const socket = new WebSocket(`ws://${wsHost}:8089`);
      socketRef.current = socket;

      socket.onopen = () => {
        if (!isMounted) return;
        setIsConnected(true);
        console.log('Connected to Broadcast Bridge');
      };

      socket.onclose = () => {
        if (!isMounted) return;
        setIsConnected(false);
        reconnectTimeout = setTimeout(connect, 3000); // Reconnect loop
      };

      socket.onmessage = (event) => {
        if (!isMounted) return;
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'hint_stats') {
            setHintPoints(data.points);
            setHintCost(data.cost);
            return;
          }
          
          if (data.type === 'room_info') {
            if (data.players) setPlayerList(data.players.sort());
            if (data.current_player) setCurrentPlayer(data.current_player);
            if (data.profiles) setMultiSlots(data.profiles);
            if (data.current_slot) setCurrentSlot(data.current_slot);
            if (data.tracked_players) setTrackedPlayers(data.tracked_players);
            if (data.overlay_sync_mode) setOverlayMode(data.overlay_sync_mode);
            if (data.obs_sync_mode) setObsMode(data.obs_sync_mode);
            if (data.overlay_duration !== undefined) setOverlayDuration(data.overlay_duration);
            if (data.obs_duration !== undefined) setObsDuration(data.obs_duration);
            if (data.obs_fade !== undefined) setObsFade(data.obs_fade);
            if (data.hint_points !== undefined) setHintPoints(data.hint_points);
            if (data.hint_cost !== undefined) setHintCost(data.hint_cost);
            
            // Avatar Sync
            if (data.custom_mode_overlay !== undefined) setIsCustomModeOverlay(data.custom_mode_overlay);
            if (data.custom_mode_obs !== undefined) setIsCustomModeOBS(data.custom_mode_obs);
            if (data.player_avatars) setPlayerAvatars(data.player_avatars);
            if (data.friends_library) setFriendsLibrary(data.friends_library);
            if (data.use_grid_popup_overlay !== undefined) setUseGridPopupOverlay(data.use_grid_popup_overlay);
            if (data.use_grid_popup_obs !== undefined) setUseGridPopupOBS(data.use_grid_popup_obs);
            if (data.grid_max_people !== undefined) setGridMaxPeople(data.grid_max_people);
            if (data.grid_layout_overlay !== undefined) setGridLayoutOverlay(data.grid_layout_overlay);
            if (data.grid_layout_obs !== undefined) setGridLayoutOBS(data.grid_layout_obs);
            if (data.single_bubble_focus !== undefined) setSingleBubbleFocus(data.single_bubble_focus);
            if (data.overlay_position !== undefined) setOverlayPosition(data.overlay_position);
            if (data.obs_position !== undefined) setObsPosition(data.obs_position);
            
            // Style Sync
            if (data.avatar_size !== undefined) setAvatarSize(data.avatar_size);
            if (data.text_size !== undefined) setTextSize(data.text_size);
            if (data.show_timestamp !== undefined) setShowTimestamp(data.show_timestamp);
            if (data.show_event_label !== undefined) setShowEventLabel(data.show_event_label);
            if (data.notif_color !== undefined) setNotifColor(data.notif_color);
            if (data.notif_layout !== undefined) setNotifLayout(data.notif_layout);
            if (data.notif_padding !== undefined) setNotifPadding(data.notif_padding);
            if (data.show_locations !== undefined) setShowLocations(data.show_locations);

            // Dynamic Mode Sync from Bridge
            const remoteMode = isStreamMode ? data.obs_sync_mode : data.overlay_sync_mode;
            if (remoteMode) {
              console.log('Dynamic sync mode update:', remoteMode);
              setCurrentSyncMode(remoteMode);
            }
            return;
          }

          if (data.type === 'item_list') {
            if (data.items) setItemList(data.items);
            return;
          }

          if (data.type === 'location_list') {
            if (data.locations) setLocationList(data.locations);
            return;
          }

          if (data.type === 'groups_list') {
            if (data.groups) setGroupsList(data.groups);
            return;
          }

          // Handled further down to update persistentHints

          if (data.type === 'clear_history') {
            console.log('Clearing history from bridge command');
            setNotifications([]);
            setHistory([]);
            setGridPlayers([]);
            localStorage.removeItem('broadcast_history');
            localStorage.removeItem('broadcast_grid_players');
            return;
          }

          if (data.type === 'notification') {
            // Apply sync filtering using the REF to avoid stale closures
            const mode = syncModeRef.current;
            
            // Bypass filters for test messages
            if (data.is_test) {
              // Continue processing
            } else {
              if (mode === 'personal' && !data.is_mine) {
                return;
              }
              if (mode === 'filtered') {
                const isFromTracked = trackedPlayersRef.current.includes(data.from);
                const isToTracked = trackedPlayersRef.current.includes(data.to);
                if (!isFromTracked && !isToTracked) {
                  return;
                }
              }
            }

            // Skip system messages in OBS mode
            if (isStreamMode && (data.event === 'normal' || data.event === 'error')) {
              return;
            }

            // Hint logic (Show all hints received from bridge)
            if (data.event === 'hint') {
              if (!showHints) return;
            }

            const newNotif: GameNotification = {
              ...data,
              id: Math.random().toString(36).substr(2, 9),
              timestamp: new Date().toLocaleTimeString(),
              createdAt: Date.now()
            } as any;

            // Trigger sound effects
            playSoundForNotification(data.event, data.class);

            setNotifications(prev => {
              const updated = [...prev, newNotif];
              if (isStreamMode) return updated.slice(-15);
              return updated;
            });

            setHistory(prev => {
              const updated = [newNotif, ...prev].slice(0, 100);
              localStorage.setItem('broadcast_history', JSON.stringify(updated));
              return updated;
            });

            // Auto-remove overlay items
            const duration = isStreamMode ? durationsRef.current.obs : durationsRef.current.overlay;
            const shouldFade = !isStreamMode || durationsRef.current.fade;

            if (shouldFade && duration > 0) {
              setTimeout(() => {
                if (!isMounted) return;
                setNotifications(prev => prev.filter(n => n.id !== newNotif.id));
              }, duration * 1000);
            }

            // Grid Popup Mode LRU Logic
            const isHint = newNotif.event === 'hint';
            if (newNotif.event === 'receive' || newNotif.event === 'send' || isHint) {
              const playerName = isHint ? newNotif.finder : newNotif.from;
              if (playerName) {
                setGridPlayers(prev => {
                  const existingIdx = prev.findIndex(p => p.name === playerName);
                  let updated = [...prev];
                  const newEntry = {
                    name: playerName,
                    lastActive: Date.now(),
                    activeNotification: newNotif,
                    notifId: newNotif.id
                  };
                  if (existingIdx !== -1) {
                    updated[existingIdx] = newEntry;
                  } else {
                    if (updated.length < gridMaxPeopleRef.current) {
                      updated.push(newEntry);
                    } else {
                      // LRU displacement
                      let oldestIdx = 0;
                      for (let i = 1; i < updated.length; i++) {
                        if (updated[i].lastActive < updated[oldestIdx].lastActive) {
                          oldestIdx = i;
                        }
                      }
                      updated[oldestIdx] = newEntry;
                    }
                  }
                  
                  // If single bubble focus is enabled, clear notifications for other players
                  if (singleBubbleFocusRef.current) {
                    updated = updated.map(p => {
                      if (p.name !== playerName) {
                        return { ...p, activeNotification: null, notifId: null };
                      }
                      return p;
                    });
                  }

                  localStorage.setItem('broadcast_grid_players', JSON.stringify(updated));
                  return updated;
                });

                // Set timer to clear active popup
                if (shouldFade && duration > 0) {
                  setTimeout(() => {
                    if (!isMounted) return;
                    setGridPlayers(prev => {
                      const afterClear = prev.map(p => {
                        if (p.name === playerName && p.notifId === newNotif.id) {
                          return { ...p, activeNotification: null };
                        }
                        return p;
                      });
                      localStorage.setItem('broadcast_grid_players', JSON.stringify(afterClear));
                      return afterClear;
                    });
                  }, duration * 1000);
                }
              }
            }

            // Also add to persistent hints if it's a hint
            if (data.event === 'hint') {
              setPersistentHints(prev => {
                // Avoid duplicates
                const exists = prev.some(h => h.item === data.item && h.location === data.location && h.owner === data.owner);
                if (exists) return prev;
                return [data, ...prev];
              });
            }
          } else if (data.type === 'hint_list') {
            setPersistentHints(data.hints);
          } else if (data.type === 'bridge_log') {
            setBridgeLogs(prev => [data.text, ...prev].slice(0, 5));
          } else if (data.type === 'avatar_sync') {
            if (data.custom_mode_overlay !== undefined) setIsCustomModeOverlay(data.custom_mode_overlay);
            if (data.custom_mode_obs !== undefined) setIsCustomModeOBS(data.custom_mode_obs);
            if (data.player_avatars) setPlayerAvatars(data.player_avatars);
            if (data.friends_library) setFriendsLibrary(data.friends_library);
            if (data.use_grid_popup_overlay !== undefined) setUseGridPopupOverlay(data.use_grid_popup_overlay);
            if (data.use_grid_popup_obs !== undefined) setUseGridPopupOBS(data.use_grid_popup_obs);
            if (data.grid_max_people !== undefined) setGridMaxPeople(data.grid_max_people);
            if (data.grid_layout_overlay !== undefined) setGridLayoutOverlay(data.grid_layout_overlay);
            if (data.grid_layout_obs !== undefined) setGridLayoutOBS(data.grid_layout_obs);
            if (data.single_bubble_focus !== undefined) setSingleBubbleFocus(data.single_bubble_focus);
            if (data.overlay_position !== undefined) setOverlayPosition(data.overlay_position);
            if (data.obs_position !== undefined) setObsPosition(data.obs_position);
            
            if (data.avatar_size !== undefined) setAvatarSize(data.avatar_size);
            if (data.text_size !== undefined) setTextSize(data.text_size);
            if (data.show_timestamp !== undefined) setShowTimestamp(data.show_timestamp);
            if (data.show_event_label !== undefined) setShowEventLabel(data.show_event_label);
            if (data.notif_color !== undefined) setNotifColor(data.notif_color);
            if (data.notif_layout !== undefined) setNotifLayout(data.notif_layout);
            if (data.notif_padding !== undefined) setNotifPadding(data.notif_padding);
          }
        } catch (e) { console.error(e); }
      };
    };
    connect();
    return () => { isMounted = false; clearTimeout(reconnectTimeout); if (socketRef.current) socketRef.current.close(); };
  }, [isStreamMode]);

  const sendTestNotification = () => {
    const testItems = [
      { name: "Master Sword", class: 0 },
      { name: "Mirror Shield", class: 1 },
      { name: "50 Rupees", class: 2 },
      { name: "Ice Trap", class: 3 }
    ];
    const randomItem = testItems[Math.floor(Math.random() * testItems.length)];
    
    const newNotif = {
      type: 'notification',
      event: 'receive' as const,
      item: randomItem.name,
      from: 'Test Player',
      to: 'Main Player',
      class: randomItem.class,
      my_alias: 'Main Player',
      is_test: true
    };

    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(newNotif));
    } else {
      // Fallback local update if bridge is offline
      const localNotif: GameNotification = {
        ...newNotif,
        id: Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toLocaleTimeString()
      };
      setNotifications(prev => [...prev, localNotif]);
      setHistory(prev => {
        const updated = [localNotif, ...prev].slice(0, 100);
        localStorage.setItem('broadcast_history', JSON.stringify(updated));
        return updated;
      });
    }
  };

  const switchSlot = (slot: string) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ 
        type: 'change_slot', 
        slot: slot,
        is_stream: isStreamMode 
      }));
      setCurrentSlot(slot); // Immediate visual feedback
    }
  };

  const switchPlayer = (name: string) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'change_player', player: name }));
      setCurrentPlayer(name);
    }
  };

  const toggleTrackedPlayer = (name: string) => {
    const newTracked = trackedPlayers.includes(name) 
      ? trackedPlayers.filter(p => p !== name) 
      : [...trackedPlayers, name];
    
    setTrackedPlayers(newTracked);
    
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ 
        type: 'update_tracked_players', 
        players: newTracked 
      }));
    }
  };

  const changeSyncMode = (target: 'overlay' | 'obs', mode: string) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ 
        type: 'update_sync_mode', 
        target, 
        mode 
      }));
    }
  };

  const updateTiming = (key: string, value: any) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ 
        type: 'update_settings', 
        [key]: value 
      }));
    }
  };

  const selectOverlayModeSetting = (mode: 'disabled' | 'standard' | 'grid') => {
    const isCustom = mode === 'standard';
    const isGrid = mode === 'grid';
    
    setIsCustomModeOverlay(isCustom);
    setUseGridPopupOverlay(isGrid);
    
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'update_avatar_data',
        custom_mode_overlay: isCustom,
        use_grid_popup_overlay: isGrid
      }));
    }
  };

  const selectOBSModeSetting = (mode: 'disabled' | 'standard' | 'grid') => {
    const isCustom = mode === 'standard';
    const isGrid = mode === 'grid';
    
    setIsCustomModeOBS(isCustom);
    setUseGridPopupOBS(isGrid);
    
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'update_avatar_data',
        custom_mode_obs: isCustom,
        use_grid_popup_obs: isGrid
      }));
    }
  };

  const requestHint = () => {
    const trimmed = hintInput.trim();
    if (trimmed && socketRef.current?.readyState === WebSocket.OPEN) {
      const isLocation = locationList.some(loc => loc.toLowerCase() === trimmed.toLowerCase());
      const itemType = isLocation ? 'Location' : 'Item';
      
      socketRef.current.send(JSON.stringify({ 
        type: 'request_hint', 
        item: trimmed,
        item_type: itemType
      }));
      setHintInput('');
    }
  };

  const handleAvatarUpload = (playerName: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_SIZE = 256;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) ctx.drawImage(img, 0, 0, width, height);
          
          const compressedImage = canvas.toDataURL('image/webp', 0.85);
          const updated = { ...playerAvatars, [playerName]: compressedImage };
          setPlayerAvatars(updated);
          
          // Sync to bridge
          if (socketRef.current?.readyState === WebSocket.OPEN) {
            socketRef.current.send(JSON.stringify({
              type: 'update_avatar_data',
              player_avatars: updated
            }));
          }
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const removeAvatar = (playerName: string) => {
    const updated = { ...playerAvatars };
    delete updated[playerName];
    setPlayerAvatars(updated);
    
    // Sync to bridge
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'update_avatar_data',
        player_avatars: updated
      }));
    }
  };

  const saveToLibrary = (friendName: string, image: string) => {
    if (!friendName.trim()) return;
    const newLibrary = { ...friendsLibrary, [friendName]: image };
    setFriendsLibrary(newLibrary);
    
    // Sync to bridge
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'update_avatar_data',
        friends_library: newLibrary
      }));
    }
  };

  const removeFromLibrary = (friendName: string) => {
    const updated = { ...friendsLibrary };
    delete updated[friendName];
    setFriendsLibrary(updated);
    
    // Sync to bridge
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'update_avatar_data',
        friends_library: updated
      }));
    }
  };

  const applyFromLibrary = (playerName: string, friendName: string) => {
    const avatar = friendsLibrary[friendName];
    if (avatar) {
      const updated = { ...playerAvatars, [playerName]: avatar };
      setPlayerAvatars(updated);
      
      // Sync to bridge
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({
          type: 'update_avatar_data',
          player_avatars: updated
        }));
      }
    }
  };

  const handleCloseApp = () => {
    if (window.confirm("Are you sure you want to close BroadCast Archipelago?")) {
      (window as any).electron?.closeApp();
    }
  };

  const resetStyling = () => {
    const defaults = {
      avatar_size: 48,
      text_size: 14,
      show_timestamp: true,
      show_event_label: true,
      notif_color: '#171717',
      notif_layout: 'standard',
      notif_padding: 12
    };
    
    setAvatarSize(defaults.avatar_size);
    setTextSize(defaults.text_size);
    setShowTimestamp(defaults.show_timestamp);
    setShowEventLabel(defaults.show_event_label);
    setNotifColor(defaults.notif_color);
    setNotifLayout(defaults.notif_layout as any);
    setNotifPadding(defaults.notif_padding);
    
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'update_avatar_data',
        ...defaults
      }));
    }
  };

  const getAccentColor = (itemClass?: number) => {
    switch(itemClass) {
      case 0: return 'border-accent-prog shadow-accent-prog/20';
      case 1: return 'border-accent-useful shadow-accent-useful/20';
      case 2: return 'border-accent-junk shadow-accent-junk/20';
      case 3: return 'border-accent-trap shadow-accent-trap/20';
      default: return 'border-white/10 shadow-black/40';
    }
  };

  const getLogo = (itemClass?: number) => {
    switch(itemClass) {
      case 0: return 'assets/apLogoProg.png';
      case 1: return 'assets/apLogoNormal.png';
      case 2: return 'assets/apLogoFiller.png';
      default: return 'assets/apLogoNormal.png';
    }
  };

  const getItemColor = (itemClass?: number) => {
    switch(itemClass) {
      case 0: return 'text-accent-prog';
      case 1: return 'text-accent-useful';
      case 2: return 'text-accent-junk';
      case 3: return 'text-accent-trap';
      default: return 'text-white';
    }
  };

  const useGridPopup = isStreamMode ? useGridPopupOBS : useGridPopupOverlay;
  const gridLayout = isStreamMode ? gridLayoutOBS : gridLayoutOverlay;

  const isHorizontal = gridLayout === 'horizontal' || gridLayout === 'horizontal-bottom' || gridLayout === 'horizontal-top';
  const isVertical = gridLayout === 'vertical' || gridLayout === 'vertical-right' || gridLayout === 'vertical-left';
  const isTopHorizontal = gridLayout === 'horizontal-top';
  const isLeftVertical = gridLayout === 'vertical-left';

  const getNotificationListClasses = () => {
    const pos = isStreamMode ? obsPosition : overlayPosition;
    
    if (isStreamMode) {
      switch (pos) {
        case 'top-left':
          return 'absolute top-4 left-6 flex flex-col gap-3 items-start max-w-sm transition-all duration-300';
        case 'top-right':
          return 'absolute top-4 right-6 flex flex-col gap-3 items-end max-w-sm transition-all duration-300 text-right';
        case 'bottom-right':
          return 'absolute bottom-4 right-6 flex flex-col gap-3 items-end max-w-sm transition-all duration-300 text-right';
        case 'bottom-left':
        default:
          return 'absolute bottom-4 left-6 flex flex-col gap-3 items-start max-w-sm transition-all duration-300';
      }
    }
    
    switch (pos) {
      case 'top-left':
        return 'absolute top-4 left-6 flex flex-col gap-3 items-start max-w-sm transition-all duration-300';
      case 'top-right':
        return 'absolute top-4 right-6 flex flex-col gap-3 items-end max-w-sm transition-all duration-300 text-right';
      case 'bottom-right':
        return cn(
          'absolute bottom-4 flex flex-col gap-3 items-end max-w-sm transition-all duration-300 text-right',
          isFlipped ? 'right-28 left-6' : 'right-6 left-28'
        );
      case 'bottom-left':
      default:
        return cn(
          'absolute bottom-4 flex flex-col gap-3 items-start max-w-sm transition-all duration-300',
          isFlipped ? 'left-6 right-28' : 'left-28 right-6'
        );
    }
  };

  const { renderedAvatarSize, renderedGap } = useMemo(() => {
    const N = gridPlayers.length;
    
    if (useGridPopup && isVertical && N > 0) {
      const height = windowBounds.height || window.innerHeight;
      const padding = 48; // padding around the window edges
      const availableHeight = height - padding;
      
      const defaultTotal = N * (avatarSize * 1.5) + (N - 1) * 24;
      
      if (defaultTotal > availableHeight) {
        const k = availableHeight / defaultTotal;
        const scaledAvatarSize = avatarSize * k;
        
        // Don't shrink below a minimum of 24px base avatar size safeguard
        const finalAvatarSize = Math.max(24, scaledAvatarSize);
        // Compute gap that fits the remaining height
        const remainingHeight = availableHeight - N * (finalAvatarSize * 1.5);
        const finalGap = N > 1 ? Math.max(6, remainingHeight / (N - 1)) : 24;
        
        return {
          renderedAvatarSize: finalAvatarSize,
          renderedGap: finalGap
        };
      }
    }
    
    return {
      renderedAvatarSize: avatarSize,
      renderedGap: 24
    };
  }, [gridPlayers.length, avatarSize, useGridPopup, isVertical, windowBounds.height]);

  const isFlipped = useMemo(() => {
    return (windowBounds.x < (displays[activeDisplayIndex]?.bounds.x || 0) + 40);
  }, [windowBounds, displays, activeDisplayIndex]);

  return (
    <div className="h-screen w-screen flex flex-col md:flex-row bg-transparent">
      {/* Overlay Area (Notifications / Grid Avatars) */}
      <div className={cn(
        "flex-1 relative overflow-hidden pointer-events-none p-4",
        isStreamMode && "bg-transparent" // OBS mode MUST be transparent
      )}>
        {useGridPopup ? (
          /* Grid & Popup Mode */
          <div 
            className={cn(
              isHorizontal 
                ? cn(
                    "absolute left-6 right-6 flex flex-row justify-center gap-8 flex-wrap transition-all duration-300 pointer-events-none",
                    isTopHorizontal ? "top-6 items-start" : "bottom-6 items-end"
                  )
                : cn(
                    "absolute top-6 bottom-6 flex flex-col justify-center transition-all duration-300 pointer-events-none",
                    isLeftVertical ? "left-6 items-start" : "right-6 items-end"
                  ),
              isHorizontal && !isStreamMode ? (isFlipped ? "pr-24" : "pl-24") : "" // Offset slightly for desktop launcher button
            )}
            style={isVertical ? { gap: `${renderedGap}px` } : undefined}
          >
            <AnimatePresence>
              {gridPlayers.map((player) => (
                <motion.div
                  key={player.name}
                  layout
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className={cn(
                    "flex relative group",
                    isHorizontal 
                      ? "flex-col items-center min-w-[100px]" 
                      : (isLeftVertical ? "flex-row justify-start items-center" : "flex-row justify-end items-center")
                  )}
                >
                  {/* Popup Bubble */}
                  <AnimatePresence>
                    {player.activeNotification && (
                      <motion.div
                        initial={
                          isHorizontal 
                            ? { opacity: 0, scale: 0.8, y: isTopHorizontal ? -15 : 15 } 
                            : { opacity: 0, scale: 0.8, x: isLeftVertical ? 15 : -15 }
                        }
                        animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
                        exit={
                          isHorizontal 
                            ? { opacity: 0, scale: 0.8, y: isTopHorizontal ? -15 : 15 } 
                            : { opacity: 0, scale: 0.8, x: isLeftVertical ? 15 : -15 }
                        }
                        className={cn(
                          "absolute p-3 rounded-2xl border backdrop-blur-xl shadow-2xl z-30 pointer-events-auto transition-all duration-300",
                          isHorizontal 
                            ? (isTopHorizontal ? "top-[110%] mt-3 w-64" : "bottom-[110%] mb-3 w-64") 
                            : (isLeftVertical ? "left-[110%] ml-3 w-64" : "right-[110%] mr-3 w-64"),
                          getAccentColor(player.activeNotification.class)
                        )}
                        style={{
                          backgroundColor: `${notifColor}${Math.floor(bgOpacity * 2.55).toString(16).padStart(2, '0')}`,
                          padding: `${notifPadding}px`,
                        }}
                      >
                        {/* Triangle arrow pointing to the avatar */}
                        <div 
                          className={cn(
                            "absolute w-3 h-3 rotate-45 border",
                            isHorizontal 
                              ? (isTopHorizontal ? "-top-1.5 left-1/2 -translate-x-1/2 border-l border-t" : "-bottom-1.5 left-1/2 -translate-x-1/2 border-r border-b") 
                              : (isLeftVertical ? "top-1/2 -translate-y-1/2 -left-1.5 border-b border-l" : "top-1/2 -translate-y-1/2 -right-1.5 border-t border-r")
                          )}
                          style={{
                            backgroundColor: `${notifColor}`,
                            borderColor: 'inherit'
                          }}
                        />
                        
                        {/* Bubble Content */}
                        <div className="text-left space-y-1">
                          {/* Header */}
                          {(showEventLabel || showTimestamp) && (
                            <div className="flex justify-between items-center border-b border-white/5 pb-1 mb-1">
                              {showEventLabel && (
                                <span className="font-bold uppercase tracking-wider text-neutral-400" style={{ fontSize: `${Math.max(8, textSize - 5)}px` }}>
                                  {player.activeNotification.event === 'hint' 
                                    ? 'Item Hint' 
                                    : (player.activeNotification.from === player.activeNotification.to ? 'Item Found' : 'Sent Item')}
                                </span>
                              )}
                              {showTimestamp && <span className="text-neutral-500" style={{ fontSize: `${Math.max(8, textSize - 5)}px` }}>{player.activeNotification.timestamp}</span>}
                            </div>
                          )}
                          
                          {/* Message */}
                          <div className="leading-tight font-medium text-white" style={{ fontSize: `${Math.max(10, textSize - 2)}px` }}>
                            {player.activeNotification.event === 'hint' ? (
                              <div className="space-y-1">
                                <p>
                                  <span className="text-accent-prog font-bold">{player.activeNotification.owner}</span>'s <span className={cn("font-bold", getItemColor(player.activeNotification.class))}>{player.activeNotification.item}</span>
                                </p>
                                <p className="text-neutral-400" style={{ fontSize: `${Math.max(8, textSize - 4)}px` }}>
                                  is at <span className="text-white font-medium">{player.activeNotification.location}</span>
                                </p>
                              </div>
                            ) : player.activeNotification.from === player.activeNotification.to ? (
                              <p>Found <span className={cn("font-bold", getItemColor(player.activeNotification.class))}>{player.activeNotification.item}</span></p>
                            ) : (
                              <p>Sent <span className={cn("font-bold", getItemColor(player.activeNotification.class))}>{player.activeNotification.item}</span> to <span className="text-accent-prog font-bold">{player.activeNotification.to}</span></p>
                            )}
                          </div>
                          
                          {player.activeNotification.event !== 'hint' && showLocations && player.activeNotification.location && (
                            <p className="text-neutral-400 italic mt-0.5" style={{ fontSize: `${Math.max(8, textSize - 5)}px` }}>
                              at <span className="text-neutral-200">{player.activeNotification.location}</span>
                            </p>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
 
                  {/* Avatar Frame */}
                  <div className="relative">
                    {/* Animated Ring on recent activity */}
                    {player.activeNotification && (
                      <span className="absolute -inset-1 rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 animate-spin blur-sm opacity-70" />
                    )}
                    
                    <div 
                      className={cn(
                        "relative rounded-full flex items-center justify-center border-2 overflow-hidden shadow-lg bg-neutral-800 transition-transform duration-300",
                        player.activeNotification ? "scale-105 border-white" : "border-white/10 hover:border-white/30"
                      )}
                      style={{ width: `${renderedAvatarSize * 1.5}px`, height: `${renderedAvatarSize * 1.5}px` }}
                    >
                      {playerAvatars[player.name] ? (
                        <img src={playerAvatars[player.name]} alt={player.name} className="w-full h-full object-cover" />
                      ) : (
                        <User className="text-neutral-500" style={{ width: `${renderedAvatarSize * 0.75}px`, height: `${renderedAvatarSize * 0.75}px` }} />
                      )}
                    </div>
                  </div>
 
                  {/* Player Name */}
                  <span className={cn(
                    "text-[10px] font-bold text-neutral-200 tracking-wide text-shadow bg-black/40 px-2.5 py-0.5 rounded-full border border-white/5 whitespace-nowrap transition-all duration-200",
                    isHorizontal 
                      ? "mt-2" 
                      : (isLeftVertical 
                          ? "absolute left-[115%] top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 pointer-events-none"
                          : "absolute right-[115%] top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 pointer-events-none"
                        ),
                    isVertical && player.activeNotification && "group-hover:opacity-0" // Hide name label on hover if speech bubble is active to prevent overlap
                  )}>
                    {player.name}
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          /* Notifications offset intelligently based on the button position */
          <div className={getNotificationListClasses()}>
            <AnimatePresence>
              {notifications.map((notif) => {
                const isRightSide = (isStreamMode ? obsPosition : overlayPosition).endsWith('right');
                return (
                <motion.div
                  key={notif.id}
                  initial={{ opacity: 0, x: isRightSide ? 50 : -50, scale: 0.9 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: isRightSide ? 50 : -50, scale: 0.9 }}
                  className={cn(
                    "w-full backdrop-blur-xl border rounded-xl flex shadow-2xl pointer-events-auto transition-all duration-300 relative",
                    notifLayout === 'vertical' ? "flex-col items-center text-center" : (notifLayout === 'reversed' ? "flex-row-reverse" : "flex-row items-center"),
                    getAccentColor(notif.class),
                    notif.event === 'error' && "border-red-500 shadow-red-500/20",
                    (notif.event === 'hint' && notif.finder?.toLowerCase() === currentPlayer?.toLowerCase()) && "border-[#c36e7a]/80 shadow-[#c36e7a]/30 ring-1 ring-[#c36e7a]/30"
                  )}
                  style={{ 
                    backgroundColor: `${notifColor}${Math.floor(bgOpacity * 2.55).toString(16).padStart(2, '0')}`,
                    padding: `${notifPadding}px`,
                    gap: `${notifPadding}px`
                  }} 
                >
                {((isStreamMode ? isCustomModeOBS : isCustomModeOverlay) && (notif.event === 'receive' || notif.event === 'send')) ? (
                  <div className="flex items-center gap-1 shrink-0">
                    {notif.from === notif.to ? (
                      <div 
                        className="bg-white/5 rounded-lg flex items-center justify-center border border-white/10 overflow-hidden"
                        style={{ width: `${avatarSize}px`, height: `${avatarSize}px` }}
                      >
                        {(notif.from && playerAvatars[notif.from]) ? (
                          <img src={playerAvatars[notif.from]} alt={notif.from} className="w-full h-full object-cover" />
                        ) : (
                          <User style={{ width: `${avatarSize/2}px`, height: `${avatarSize/2}px` }} className="text-neutral-500" />
                        )}
                      </div>
                    ) : (
                      <div className={cn(
                        "flex items-center p-1 bg-black/20 rounded-xl border border-white/5",
                        notifLayout === 'vertical' ? "flex-row" : "flex-row",
                        avatarSize < 40 ? "gap-1" : "gap-1.5"
                      )}>
                        <div 
                          className="bg-white/5 rounded-lg flex items-center justify-center border border-white/10 overflow-hidden shrink-0"
                          style={{ width: `${avatarSize * 0.7}px`, height: `${avatarSize * 0.7}px` }}
                        >
                          {(notif.from && playerAvatars[notif.from]) ? (
                            <img src={playerAvatars[notif.from]} alt={notif.from} className="w-full h-full object-cover" />
                          ) : (
                            <User style={{ width: `${avatarSize * 0.35}px`, height: `${avatarSize * 0.35}px` }} className="text-neutral-600" />
                          )}
                        </div>
                        <ArrowRight className="w-3 h-3 text-neutral-600" />
                        <div 
                          className="bg-white/5 rounded-lg flex items-center justify-center border border-white/10 overflow-hidden shrink-0"
                          style={{ width: `${avatarSize * 0.7}px`, height: `${avatarSize * 0.7}px` }}
                        >
                          {(notif.to && playerAvatars[notif.to]) ? (
                            <img src={playerAvatars[notif.to]} alt={notif.to} className="w-full h-full object-cover" />
                          ) : (
                            <User style={{ width: `${avatarSize * 0.35}px`, height: `${avatarSize * 0.35}px` }} className="text-neutral-600" />
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (notif.event === 'receive' || notif.event === 'send') ? (
                  <div 
                    className="bg-white/5 rounded-lg flex items-center justify-center border border-white/10 shrink-0"
                    style={{ width: `${avatarSize}px`, height: `${avatarSize}px` }}
                  >
                    <img 
                      src={getLogo(notif.class)} 
                      alt="Logo" 
                      className="object-contain filter drop-shadow-md" 
                      style={{ width: `${avatarSize * 0.6}px`, height: `${avatarSize * 0.6}px` }}
                    />
                  </div>
                ) : (
                  <div 
                    className={cn(
                      "bg-white/5 rounded-lg flex items-center justify-center border border-white/10 shrink-0",
                      (notif.event === 'hint' && notif.finder?.toLowerCase() === currentPlayer?.toLowerCase()) && "bg-[#c36e7a]/10 border-[#c36e7a]/20"
                    )}
                    style={{ width: `${avatarSize}px`, height: `${avatarSize}px` }}
                  >
                    {notif.event === 'error' ? (
                      <AlertCircle style={{ width: `${avatarSize * 0.4}px`, height: `${avatarSize * 0.4}px` }} className="text-red-500" />
                    ) : notif.event === 'hint' ? (
                      notif.finder?.toLowerCase() === currentPlayer?.toLowerCase() ? (
                        <MapPin style={{ width: `${avatarSize * 0.45}px`, height: `${avatarSize * 0.45}px` }} className="text-[#c36e7a] animate-bounce" />
                      ) : (
                        <Info style={{ width: `${avatarSize * 0.4}px`, height: `${avatarSize * 0.4}px` }} className="text-sky-400" />
                      )
                    ) : (
                      <Info style={{ width: `${avatarSize * 0.4}px`, height: `${avatarSize * 0.4}px` }} className="text-blue-400" />
                    )}
                  </div>
                )}
                
                <div className="flex-1 overflow-hidden">
                  {(showEventLabel || showTimestamp) && (
                    <div className={cn(
                      "flex justify-between items-center mb-1",
                      notifLayout === 'vertical' && "justify-center gap-4"
                    )}>
                      {showEventLabel && (
                        <span className="font-bold uppercase tracking-widest text-neutral-500" style={{ fontSize: `${Math.max(8, textSize - 4)}px` }}>
                          {notif.event === 'hint' 
                            ? 'Item Hint'
                            : ((notif.event === 'receive' || notif.event === 'send') 
                              ? (notif.from === notif.to ? 'Item Found' : (notif.to === notif.my_alias ? 'Incoming Item' : 'Sent Item')) 
                              : 'System Message')}
                        </span>
                      )}
                      {showTimestamp && <span className="text-neutral-600" style={{ fontSize: `${Math.max(8, textSize - 4)}px` }}>{notif.timestamp}</span>}
                    </div>
                  )}
                  
                  <div className="leading-tight font-medium" style={{ fontSize: `${textSize}px` }}>
                    {(notif.event === 'receive' || notif.event === 'send') && (
                      <p>
                        {notif.from === notif.to ? (
                          <><span className="text-accent-prog font-bold">{notif.from}</span> found <span className={cn("font-bold", getItemColor(notif.class))}>{notif.item}</span></>
                        ) : (
                          <><span className="text-accent-prog font-bold">{notif.from}</span> sent <span className={cn("font-bold", getItemColor(notif.class))}>{notif.item}</span> to <span className="text-accent-prog font-bold">{notif.to}</span></>
                        )}
                      </p>
                    )}
                    {(notif.event === 'receive' || notif.event === 'send') && showLocations && notif.location && (
                      <p className="text-neutral-400 italic mt-1" style={{ fontSize: `${Math.max(9, textSize - 4)}px` }}>
                        at <span className="text-neutral-200 font-medium not-italic">{notif.location}</span>
                      </p>
                    )}
                    {notif.event === 'hint' && (
                      <div className="space-y-1">
                        <p>
                          <span className="text-accent-prog font-bold">{notif.owner}</span>'s <span className="text-accent-junk font-bold">{notif.item}</span>
                        </p>
                        <p className="text-neutral-400" style={{ fontSize: `${Math.max(10, textSize - 3)}px` }}>
                          is at <span className="text-white font-medium">{notif.location}</span>
                        </p>
                        <p className="text-neutral-500 italic" style={{ fontSize: `${Math.max(8, textSize - 5)}px` }}>
                          (<span className="text-sky-400 font-bold not-italic">{notif.finder}</span>) {notif.found && <span className="text-accent-useful ml-1">✓</span>}
                        </p>
                      </div>
                    )}
                    {(notif.event === 'normal' || notif.event === 'error') && (
                      <p className={notif.event === 'error' ? 'text-red-400' : 'text-neutral-200'}>{notif.text}</p>
                    )}
                  </div>
                </div>
              </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
      </div>

      {/* Control Panel (Visible on Second Screen for configuration/history) */}
      {!isStreamMode && (
        <div className={cn(
          "fixed right-0 top-0 bottom-0 w-80 backdrop-blur-3xl border-l border-white/5 p-6 flex flex-col gap-6 transition-transform duration-500 z-50",
          !showHistory && "translate-x-full"
        )}
        style={{ backgroundColor: `rgba(23, 23, 23, ${bgOpacity / 100})` }}
        >
          <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-2">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <History className="w-5 h-5" /> Settings
            </h2>
            <div className="flex gap-2">
              <button 
                onClick={sendTestNotification} 
                className="text-[10px] text-neutral-500 hover:text-accent-prog transition-colors uppercase tracking-widest mr-2"
              >
                Test
              </button>
              <button 
                onClick={() => {
                  setHistory([]);
                  setNotifications([]);
                  localStorage.removeItem('broadcast_history');
                  if (socketRef.current?.readyState === WebSocket.OPEN) {
                    socketRef.current.send(JSON.stringify({ type: 'clear_history' }));
                  }
                }} 
                className="text-[10px] text-neutral-500 hover:text-red-400 transition-colors uppercase tracking-widest"
              >
                Clear
              </button>
              <button 
                onClick={handleCloseApp} 
                className="p-2 hover:bg-red-500/10 rounded-lg transition-colors group"
                title="Close Application"
              >
                <X className="w-5 h-5 text-neutral-400 group-hover:text-red-500" />
              </button>
            </div>
          </div>

          {/* Tab Bar Selection */}
          <div className="flex bg-black/40 p-1 rounded-xl border border-white/5 mb-4">
            {(['display', 'settings', 'hints', 'room', 'custom'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all",
                  activeTab === tab 
                    ? "bg-white/10 text-white shadow-lg" 
                    : "text-neutral-500 hover:text-neutral-300"
                )}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                {activeTab === 'display' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-4 w-1 bg-accent-useful rounded-full" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">Display</h3>
                    </div>

                    {/* Position Preview */}
                    {displays.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-2">
                          <Monitor className="w-3 h-3" /> Position Preview
                        </h4>
                        <div 
                          className="relative bg-black/40 rounded-xl border border-white/10 overflow-hidden mx-auto"
                          style={{
                            width: '240px',
                            height: `${(displays[activeDisplayIndex].bounds.height / displays[activeDisplayIndex].bounds.width) * 240}px`,
                            transition: 'height 0.3s ease-out'
                          }}
                        >
                          <div className="absolute inset-0 border-[6px] border-neutral-800 rounded-lg pointer-events-none z-10" />
                          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent animate-pulse" />
                          <motion.div
                            animate={{ 
                              x: (windowBounds.x - displays[activeDisplayIndex].bounds.x) * (240 / displays[activeDisplayIndex].bounds.width),
                              y: (windowBounds.y - displays[activeDisplayIndex].bounds.y) * (240 / displays[activeDisplayIndex].bounds.width),
                              width: windowBounds.width * (240 / displays[activeDisplayIndex].bounds.width),
                              height: windowBounds.height * (240 / displays[activeDisplayIndex].bounds.width)
                            }}
                            className="absolute bg-accent-useful/40 border border-accent-useful shadow-[0_0_15px_rgba(34,197,94,0.3)] rounded-sm z-20 backdrop-blur-[2px]"
                          />
                        </div>
                      </div>
                    )}

                    {/* Screens Section */}
                    <div className="space-y-3 bg-white/5 p-3 rounded-xl border border-white/5">
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-2">
                        <Monitor className="w-3 h-3" /> Monitors ({displays.length})
                      </h4>
                      <div className="grid gap-2">
                        {displays.map((disp, idx) => (
                          <button
                            key={disp.id}
                            onClick={() => (window as unknown as { electron: { setDisplay: (idx: number) => void } }).electron?.setDisplay(idx)}
                            className={cn(
                              "flex flex-col gap-1 p-3 bg-black/20 hover:bg-white/10 border transition-all text-left group rounded-xl",
                              activeDisplayIndex === idx ? "border-accent-useful/50 bg-accent-useful/5" : "border-white/5"
                            )}
                          >
                            <div className="flex justify-between items-center">
                              <span className={cn(
                                "text-sm font-medium transition-colors",
                                activeDisplayIndex === idx ? "text-accent-useful" : "group-hover:text-accent-useful"
                              )}>
                                {disp.label || `Display ${idx + 1}`}
                              </span>
                              <div className="flex gap-1">
                                {disp.isPrimary && (
                                  <span className="text-[9px] bg-accent-prog/20 text-accent-prog px-1.5 py-0.5 rounded border border-accent-prog/30 uppercase font-bold">
                                    Primary
                                  </span>
                                )}
                                {activeDisplayIndex === idx && (
                                  <div className="w-2 h-2 bg-accent-useful rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                                )}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                  </div>
                )}

                {activeTab === 'settings' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-4 w-1 bg-accent-prog rounded-full" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">Settings</h3>
                    </div>
                    
                    <div className="space-y-4 bg-white/5 p-3 rounded-xl border border-white/5">
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <div className="flex justify-between text-[9px] uppercase font-bold">
                            <span className="text-accent-prog">Overlay Duration</span>
                            <span>{overlayDuration}s</span>
                          </div>
                          <input 
                            type="range" min="3" max="60" value={overlayDuration} 
                            onChange={(e) => updateTiming('overlay_duration', parseInt(e.target.value))}
                            className="w-full accent-accent-prog h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                          />
                        </div>

                        <div className="space-y-2 border-t border-white/5 pt-2">
                          <div className="flex justify-between items-center">
                            <div className="flex flex-col">
                              <span className="text-[9px] uppercase font-bold text-accent-useful">OBS Auto-Hide</span>
                              <span className="text-[8px] text-neutral-500 lowercase italic">Fade out messages in OBS</span>
                            </div>
                            <button 
                              onClick={() => updateTiming('obs_fade', !obsFade)}
                              className={cn(
                                "w-8 h-4 rounded-full relative transition-colors duration-200",
                                obsFade ? "bg-accent-useful" : "bg-neutral-800"
                              )}
                            >
                              <div className={cn(
                                "absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all duration-200",
                                obsFade ? "left-4.5" : "left-0.5"
                              )} />
                            </button>
                          </div>
                          
                          {obsFade && (
                            <div className="space-y-1 animate-in fade-in slide-in-from-top-1">
                              <div className="flex justify-between text-[9px] uppercase font-bold">
                                <span className="text-accent-useful">OBS Duration</span>
                                <span>{obsDuration}s</span>
                              </div>
                              <input 
                                type="range" min="3" max="60" value={obsDuration} 
                                onChange={(e) => updateTiming('obs_duration', parseInt(e.target.value))}
                                className="w-full accent-accent-useful h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                              />
                            </div>
                          )}
                        </div>

                        <div className="space-y-1 border-t border-white/5 pt-2">
                          <div className="flex justify-between text-[9px] uppercase font-bold">
                            <span className="text-white">BG Opacity</span>
                            <span>{bgOpacity}%</span>
                          </div>
                          <input 
                            type="range" min="0" max="100" value={bgOpacity} 
                            onChange={(e) => setBgOpacity(parseInt(e.target.value))}
                            className="w-full accent-white h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Sound Settings Section */}
                    <div className="space-y-4 bg-white/5 p-3 rounded-xl border border-white/5">
                      <div className="flex justify-between items-center pb-2 border-b border-white/5">
                        <div className="flex flex-col">
                          <span className="text-[10px] uppercase font-bold text-neutral-400">Sound Effects</span>
                          <span className="text-[8px] text-neutral-500 lowercase italic">Configurable audio cues for notifications</span>
                        </div>
                        <button 
                          onClick={() => setSoundSettings(prev => ({ ...prev, enabled: !prev.enabled }))}
                          className={cn(
                            "w-8 h-4 rounded-full relative transition-colors duration-200 shrink-0",
                            soundSettings.enabled ? "bg-accent-prog" : "bg-neutral-800"
                          )}
                        >
                          <div className={cn(
                            "absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all duration-200",
                            soundSettings.enabled ? "left-4.5" : "left-0.5"
                          )} />
                        </button>
                      </div>

                      {soundSettings.enabled && (
                        <div className="space-y-4 animate-in fade-in duration-200">
                          {/* Volume control */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-[9px] uppercase font-bold text-neutral-400">
                              <span className="flex items-center gap-1">
                                {soundSettings.volume > 0 ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
                                Volume
                              </span>
                              <span>{soundSettings.volume}%</span>
                            </div>
                            <input 
                              type="range" min="0" max="100" value={soundSettings.volume} 
                              onChange={(e) => setSoundSettings(prev => ({ ...prev, volume: parseInt(e.target.value) }))}
                              className="w-full accent-accent-prog h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                            />
                          </div>

                          {/* Sound Categories */}
                          <div className="space-y-3 pt-2 border-t border-white/5">
                            {([
                              { key: 'progression', label: 'Progression Items', color: 'text-accent-prog' },
                              { key: 'useful', label: 'Useful Items', color: 'text-accent-useful' },
                              { key: 'junk', label: 'Junk Items', color: 'text-accent-junk' },
                              { key: 'trap', label: 'Trap Items', color: 'text-accent-trap' },
                              { key: 'hint', label: 'Item Hints', color: 'text-sky-400' },
                              { key: 'other', label: 'Sent / Other', color: 'text-neutral-300' }
                            ] as const).map(cat => {
                              const config = soundSettings.categories[cat.key] || { enabled: true, mode: 'synth' };
                              return (
                                <div key={cat.key} className="flex flex-col gap-2 p-2 bg-black/25 rounded-lg border border-white/5">
                                  <div className="flex justify-between items-center">
                                    <label className="flex items-center gap-2 cursor-pointer group">
                                      <input 
                                        type="checkbox" 
                                        checked={config.enabled}
                                        onChange={() => handleCategorySoundToggle(cat.key)}
                                        className="w-3 h-3 rounded bg-black/40 border border-white/10 accent-accent-prog"
                                      />
                                      <span className={cn("text-[10px] font-bold group-hover:text-white transition-colors", cat.color)}>
                                        {cat.label}
                                      </span>
                                    </label>
                                                                        {config.enabled && (
                                      <div className="flex items-center gap-2">
                                        <select
                                          value={config.mode}
                                          onChange={(e) => handleCategorySoundModeChange(cat.key, e.target.value as any)}
                                          className="bg-neutral-900 border border-white/10 rounded px-1.5 py-0.5 text-[9px] text-neutral-300 focus:outline-none"
                                        >
                                          <option value="synth">Synth</option>
                                          <option value="custom">Custom</option>
                                        </select>
                                        
                                        <button
                                          onClick={() => {
                                            const catVol = config.volume !== undefined ? config.volume : 100;
                                            const finalVolume = (soundSettings.volume / 100) * catVol;
                                            if (config.mode === 'custom') {
                                              playCustomSound(cat.key, finalVolume);
                                            } else {
                                              playSynthesizedSound(cat.key, finalVolume);
                                            }
                                          }}
                                          className="p-1 hover:text-white text-neutral-500 hover:bg-white/5 rounded transition-colors"
                                          title="Test Sound"
                                        >
                                          <Play className="w-3 h-3" />
                                        </button>
                                      </div>
                                    )}
                                  </div>

                                  {config.enabled && (
                                    <div className="space-y-1 pt-1.5 border-t border-white/5 animate-in fade-in duration-200">
                                      <div className="flex justify-between text-[8px] uppercase font-bold text-neutral-500">
                                        <span>Category Volume</span>
                                        <span>{config.volume !== undefined ? config.volume : 100}%</span>
                                      </div>
                                      <input 
                                        type="range" min="0" max="100" value={config.volume !== undefined ? config.volume : 100} 
                                        onChange={(e) => {
                                          const val = parseInt(e.target.value);
                                          setSoundSettings(prev => ({
                                            ...prev,
                                            categories: {
                                              ...prev.categories,
                                              [cat.key]: {
                                                ...prev.categories[cat.key],
                                                volume: val
                                              }
                                            }
                                          }));
                                        }}
                                        className="w-full accent-accent-prog h-0.5 bg-white/10 rounded-lg appearance-none cursor-pointer"
                                      />
                                    </div>
                                  )}

                                  {config.enabled && config.mode === 'custom' && (
                                    <div className="flex items-center gap-2 pt-1.5 border-t border-white/5 justify-between">
                                      <label className="cursor-pointer text-[8px] uppercase font-bold text-neutral-400 hover:text-white transition-colors flex items-center gap-1 bg-white/5 px-2 py-1 rounded border border-white/5">
                                        <Upload className="w-2.5 h-2.5" />
                                        Upload Sound
                                        <input 
                                          type="file" 
                                          accept="audio/*" 
                                          className="hidden" 
                                          onChange={(e) => handleCustomSoundUpload(cat.key, e)}
                                        />
                                      </label>
                                      {localStorage.getItem(`broadcast_custom_sound_${cat.key}`) && (
                                        <button
                                          onClick={() => {
                                            localStorage.removeItem(`broadcast_custom_sound_${cat.key}`);
                                            alert(`Cleared custom sound for ${cat.label}.`);
                                          }}
                                          className="text-[8px] uppercase font-bold text-red-400 hover:text-red-300 transition-colors bg-red-500/10 px-1.5 py-1 rounded"
                                        >
                                          Clear
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'hints' && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-1 bg-amber-400 rounded-full" />
                        <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">Hints</h3>
                      </div>
                      <button 
                        onClick={() => socketRef.current?.send(JSON.stringify({ type: 'refresh_hints' }))}
                        className="text-[10px] text-neutral-500 hover:text-white transition-colors flex items-center gap-1 bg-white/5 px-2 py-1 rounded"
                      >
                        <RefreshCw className="w-3 h-3" /> Refresh
                      </button>
                    </div>

                    <div className="space-y-4 bg-white/5 p-3 rounded-xl border border-white/5">
                      <div className="flex justify-between items-center">
                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                          Hint Point Tracking
                        </h4>
                        <button 
                          onClick={() => setShowHints(!showHints)}
                          className={cn(
                            "w-8 h-4 rounded-full relative transition-colors duration-200",
                            showHints ? "bg-accent-prog" : "bg-neutral-800"
                          )}
                        >
                          <div className={cn(
                            "absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all duration-200",
                            showHints ? "left-4.5" : "left-0.5"
                          )} />
                        </button>
                      </div>

                      {showHints && (
                        <div className="space-y-3 animate-in fade-in slide-in-from-top-1">
                          <div className="space-y-2 pt-2 border-t border-white/5">
                            <div className="flex justify-between items-end mb-1">
                              <span className="text-[9px] uppercase font-bold text-neutral-500">Request Hint</span>
                              <div className="flex flex-col items-end">
                                <div className="text-[9px] font-mono text-neutral-400">
                                  Points: <span className={hintPoints >= hintCost ? "text-accent-prog" : "text-amber-400"}>{hintPoints}</span> / {hintCost}
                                </div>
                                {hintPoints < hintCost && hintCost > 0 && (
                                  <div className="text-[7px] text-neutral-500 italic">
                                    Need {hintCost - hintPoints} more
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="relative">
                              <div className="flex gap-2">
                                <input 
                                  type="text" 
                                  value={hintInput}
                                  onChange={(e) => setHintInput(e.target.value)}
                                  onKeyDown={(e) => e.key === 'Enter' && requestHint()}
                                  placeholder="Item name..."
                                  className="flex-1 bg-black/40 border border-white/10 rounded px-2 py-1 text-xs focus:outline-none focus:border-accent-prog transition-colors"
                                />
                                <button 
                                  onClick={requestHint}
                                  disabled={hintPoints < hintCost}
                                  className={cn(
                                    "transition-all duration-300 text-[10px] font-bold px-3 py-1 rounded flex items-center gap-1",
                                    hintPoints >= hintCost 
                                      ? "bg-accent-prog text-black hover:bg-accent-prog/80 shadow-[0_0_10px_rgba(175,153,239,0.3)]" 
                                      : "bg-neutral-800 text-neutral-500 cursor-not-allowed border border-white/5 opacity-50"
                                  )}
                                >
                                  {hintPoints < hintCost ? (
                                    <>
                                      <AlertCircle className="w-3 h-3" /> Locked
                                    </>
                                  ) : 'Ask'}
                                </button>
                              </div>
                              {/* Autocomplete Suggestions */}
                              {hintInput.length >= 2 && (
                                <div className="absolute top-full mt-2 left-0 right-0 bg-neutral-900 border border-white/10 rounded-lg shadow-2xl max-h-48 overflow-y-auto z-50 custom-scrollbar animate-in fade-in slide-in-from-top-2">
                                  {[
                                    ...itemList.map(i => ({ name: i, type: 'Item' })),
                                    ...locationList.map(l => ({ name: l, type: 'Location' })),
                                    ...groupsList.map(g => ({ name: g, type: 'Group' }))
                                  ]
                                    .filter(obj => obj.name.toLowerCase().includes(hintInput.toLowerCase()))
                                    .sort((a, b) => {
                                      if (a.type === 'Item' && b.type !== 'Item') return -1;
                                      if (a.type !== 'Item' && b.type === 'Item') return 1;
                                      return a.name.localeCompare(b.name);
                                    })
                                    .slice(0, 15)
                                    .map((obj, idx) => (
                                      <button
                                        key={`hint-suggest-${idx}`}
                                        onClick={() => {
                                          setHintInput(obj.name);
                                        }}
                                        className="w-full text-left px-3 py-2 text-[11px] hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 flex justify-between items-center"
                                      >
                                        <span>{obj.name}</span>
                                        <span className={`text-[8px] uppercase px-1 border rounded ${
                                          obj.type === 'Item' ? 'border-blue-500/30 text-blue-400 bg-blue-500/10' : 
                                          obj.type === 'Location' ? 'border-purple-500/30 text-purple-400 bg-purple-500/10' : 
                                          'border-green-500/30 text-green-400 bg-green-500/10'
                                        }`}>
                                          {obj.type === 'Location' ? 'Loc' : obj.type}
                                        </span>
                                      </button>
                                    ))
                                  }
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Persistent Hint List */}
                      <div className="space-y-3 pt-4 border-t border-white/5 animate-in fade-in slide-in-from-top-2">
                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                          Hint List {persistentHints.length > 0 && `(${persistentHints.length})`}
                        </h4>
                        
                        {persistentHints.length === 0 ? (
                          <div className="space-y-4">
                            <div className="text-center py-8 bg-black/20 rounded-lg border border-white/5 border-dashed">
                              <p className="text-[10px] text-neutral-600 italic">No hints recorded yet.</p>
                              <p className="text-[9px] text-neutral-700 mt-1">Make sure you are connected to the correct slot.</p>
                            </div>
                            
                            {bridgeLogs.length > 0 && (
                              <div className="p-3 bg-red-500/5 rounded-lg border border-red-500/10">
                                <h5 className="text-[8px] font-bold uppercase text-red-400 mb-2 tracking-tighter">Bridge Debug Output</h5>
                                <div className="space-y-1 font-mono text-[8px] text-neutral-500 overflow-hidden whitespace-nowrap overflow-ellipsis">
                                  {bridgeLogs.map((log, i) => (
                                    <div key={i}>{log}</div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-3 pr-1">
                            {persistentHints.map((hint, idx) => (
                              <div 
                                key={`persistent-hint-${idx}`} 
                                className={cn(
                                  "group relative p-4 rounded-2xl border transition-all duration-300",
                                  hint.found 
                                    ? "bg-emerald-500/5 border-emerald-500/20 shadow-inner" 
                                    : "bg-white/5 border-white/10 hover:border-white/20 shadow-xl"
                                )}
                              >
                                <div className="space-y-3 relative z-10">
                                  {/* Item Section */}
                                  <div className="flex items-start gap-3">
                                    <div className={cn(
                                      "w-1.5 h-5 rounded-full shrink-0 mt-0.5",
                                      hint.found ? "bg-emerald-500" : "bg-accent-prog"
                                    )} />
                                    <h4 className={cn(
                                      "text-[14px] font-bold leading-tight",
                                      hint.found ? "text-emerald-300" : "text-white"
                                    )}>
                                      {hint.item}
                                    </h4>
                                  </div>

                                  {/* Location Section */}
                                  <div className="flex items-start gap-2 pl-4 text-neutral-300">
                                    <MapPin className="w-4 h-4 text-neutral-500 shrink-0 mt-0.5" />
                                    <span className="text-[12px] leading-relaxed">
                                      Located at <span className="text-white font-medium">{hint.location}</span>
                                    </span>
                                  </div>

                                  {/* Player Flow Section */}
                                  <div className="flex flex-wrap items-center gap-x-3 gap-y-3 pl-4 pt-3 border-t border-white/5">
                                    <div className="flex flex-col gap-0.5 min-w-[80px] flex-1">
                                      <span className="text-[9px] uppercase font-bold text-neutral-500 tracking-wider">In World</span>
                                      <span className="text-[11px] text-sky-400 font-bold break-all">{hint.finder}</span>
                                    </div>
                                    <ArrowRight className="w-4 h-4 text-neutral-700 shrink-0" />
                                    <div className="flex flex-col gap-0.5 min-w-[80px] flex-1">
                                      <span className="text-[9px] uppercase font-bold text-neutral-500 tracking-wider">For Player</span>
                                      <span className="text-[11px] text-accent-useful font-bold break-all">{hint.owner}</span>
                                    </div>
                                    {hint.found && (
                                      <div className="flex items-center gap-1.5 text-emerald-500 text-[10px] font-bold bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20">
                                        <CheckCircle2 className="w-3.5 h-3.5" /> FOUND
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'room' && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-4 w-1 bg-neutral-600 rounded-full" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">Advanced / Room</h3>
                    </div>

                    {/* Sync Modes Selection */}
                    <div className="space-y-4 bg-white/5 p-3 rounded-xl border border-white/5">
                      <div className="space-y-2">
                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 flex justify-between items-center">
                          Overlay Sync Selection
                        </h4>
                        <div className="grid grid-cols-3 gap-1">
                          {['all', 'filtered', 'personal'].map(m => (
                            <button
                              key={m}
                              onClick={() => changeSyncMode('overlay', m)}
                              className={cn(
                                "text-[9px] py-1 rounded border uppercase font-bold transition-all",
                                overlayMode === m 
                                  ? "bg-accent-prog/20 border-accent-prog text-accent-prog shadow-[0_0_8px_rgba(175,153,239,0.3)]" 
                                  : "bg-black/20 border-white/5 text-neutral-600 hover:text-neutral-400"
                              )}
                            >
                              {m === 'personal' ? 'Perso' : m}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 flex justify-between items-center">
                          OBS Sync Selection
                        </h4>
                        <div className="grid grid-cols-3 gap-1">
                          {['all', 'filtered', 'personal'].map(m => (
                            <button
                              key={m}
                              onClick={() => changeSyncMode('obs', m)}
                              className={cn(
                                "text-[9px] py-1 rounded border uppercase font-bold transition-all",
                                obsMode === m 
                                  ? "bg-accent-useful/20 border-accent-useful text-accent-useful shadow-[0_0_8px_rgba(34,197,94,0.3)]" 
                                  : "bg-black/20 border-white/5 text-neutral-600 hover:text-neutral-400"
                              )}
                            >
                              {m === 'personal' ? 'Perso' : m}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Multi-Slot Selector */}
                    {multiSlots.length > 1 && (
                      <div className="space-y-3">
                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                          Pre-configured Slots
                        </h4>
                        <div className="flex flex-wrap gap-1.5">
                          {multiSlots.map(slot => (
                            <button
                              key={slot}
                              onClick={() => switchSlot(slot)}
                              className={cn(
                                "text-[10px] px-2 py-1 rounded-md border transition-all truncate min-w-[80px]",
                                currentSlot === slot 
                                  ? "bg-accent-useful/20 border-accent-useful text-accent-useful font-bold" 
                                  : "bg-white/5 border-white/10 text-neutral-400 hover:border-white/20 text-white"
                              )}
                            >
                              {slot}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Output Features */}
                    <div className="space-y-4 bg-white/5 p-3 rounded-xl border border-white/5">
                      <div className="flex justify-between items-center">
                        <div className="flex flex-col">
                          <span className="text-[10px] uppercase font-bold text-neutral-400">Show Locations</span>
                          <span className="text-[8px] text-neutral-500 lowercase italic">Display where items were found</span>
                        </div>
                        <button 
                          onClick={() => {
                            const newValue = !showLocations;
                            setShowLocations(newValue);
                            if (socketRef.current?.readyState === WebSocket.OPEN) {
                              socketRef.current.send(JSON.stringify({ 
                                type: 'update_settings', 
                                show_locations: newValue 
                              }));
                            }
                          }}
                          className={cn(
                            "w-8 h-4 rounded-full relative transition-colors duration-200 shrink-0",
                            showLocations ? "bg-accent-useful" : "bg-neutral-800"
                          )}
                        >
                          <div className={cn(
                            "absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all duration-200",
                            showLocations ? "left-4.5" : "left-0.5"
                          )} />
                        </button>
                      </div>
                    </div>

                    {/* Players Selection */}
                    {playerList.length > 0 && (
                      <div className="space-y-6">
                        {/* Tracked Players */}
                        {(overlayMode === 'filtered' || obsMode === 'filtered') && (
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <h4 className="text-[10px] font-bold uppercase tracking-wider text-accent-filtered">
                                Tracked Players (Filtered)
                              </h4>
                              <button 
                                onClick={() => {
                                  setTrackedPlayers([]);
                                  if (socketRef.current?.readyState === WebSocket.OPEN) {
                                    socketRef.current.send(JSON.stringify({ type: 'update_tracked_players', players: [] }));
                                  }
                                }}
                                className="text-[9px] text-neutral-500 hover:text-white uppercase"
                              >
                                Clear
                              </button>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {playerList.map(name => {
                                const isTracked = trackedPlayers.includes(name);
                                return (
                                  <button
                                    key={`tracked-${name}`}
                                    onClick={() => toggleTrackedPlayer(name)}
                                    className={cn(
                                      "text-[10px] px-2 py-1 rounded-md border transition-all truncate max-w-[120px]",
                                      isTracked 
                                        ? "bg-accent-filtered/20 border-accent-filtered text-accent-filtered font-bold" 
                                        : "bg-white/5 border-white/10 text-neutral-400 hover:border-white/20"
                                    )}
                                  >
                                    {name}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Main Viewer Selection */}
                        {(overlayMode !== 'filtered' || obsMode !== 'filtered') && (
                          <div className="space-y-3">
                            <h4 className="text-[10px] font-bold uppercase tracking-wider text-accent-prog">
                              Main Player Selection
                            </h4>
                            <div className="flex flex-wrap gap-1.5">
                              {playerList.map(name => {
                                const isCurrent = currentPlayer === name;
                                return (
                                  <button
                                    key={`view-${name}`}
                                    onClick={() => switchPlayer(name)}
                                    className={cn(
                                      "text-[10px] px-2 py-1 rounded-md border transition-all truncate max-w-[120px]",
                                      isCurrent 
                                        ? "bg-accent-prog/20 border-accent-prog text-accent-prog font-bold shadow-[0_0_10px_rgba(175,153,239,0.2)]" 
                                        : "bg-white/5 border-white/10 text-neutral-400 hover:border-white/20"
                                    )}
                                  >
                                    {name}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'custom' && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-4 w-1 bg-pink-500 rounded-full" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">Custom Mode</h3>
                    </div>
                    <div className="space-y-4 bg-white/5 p-3 rounded-xl border border-white/5">
                      <div className="space-y-5">
                        
                        {/* Desktop Overlay Mode Selection */}
                        <div className="space-y-2.5">
                          <div className="flex flex-col">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-white">Desktop Overlay Mode</span>
                            <span className="text-[8px] text-neutral-500 lowercase italic">Choose the active style on your desktop screen</span>
                          </div>
                          <div className="grid grid-cols-3 gap-1.5 p-1 bg-black/45 rounded-xl border border-white/5">
                            <button
                              onClick={() => selectOverlayModeSetting('disabled')}
                              className={cn(
                                "py-2 text-[9px] font-bold uppercase tracking-wider rounded-lg transition-all text-center cursor-pointer",
                                (!isCustomModeOverlay && !useGridPopupOverlay)
                                  ? "bg-white/10 text-white shadow-lg border border-white/10" 
                                  : "text-neutral-500 hover:text-neutral-300"
                              )}
                            >
                              Disabled
                            </button>
                            <button
                              onClick={() => selectOverlayModeSetting('standard')}
                              className={cn(
                                "py-2 text-[9px] font-bold uppercase tracking-wider rounded-lg transition-all text-center cursor-pointer",
                                (isCustomModeOverlay && !useGridPopupOverlay)
                                  ? "bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 shadow-lg" 
                                  : "text-neutral-500 hover:text-neutral-300"
                              )}
                            >
                              Notification List
                            </button>
                            <button
                              onClick={() => selectOverlayModeSetting('grid')}
                              className={cn(
                                "py-2 text-[9px] font-bold uppercase tracking-wider rounded-lg transition-all text-center cursor-pointer",
                                (!isCustomModeOverlay && useGridPopupOverlay)
                                  ? "bg-pink-500/20 border border-pink-500/40 text-pink-300 shadow-lg" 
                                  : "text-neutral-500 hover:text-neutral-300"
                              )}
                            >
                              Avatar Grid
                            </button>
                          </div>
                        </div>

                        {/* Overlay Notification Position Select */}
                        {isCustomModeOverlay && !useGridPopupOverlay && (
                          <div className="space-y-1.5 animate-in fade-in duration-200">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">Overlay Placement</span>
                            <div className="grid grid-cols-2 gap-1.5">
                              {([
                                { key: 'top-left', label: 'Top Left' },
                                { key: 'top-right', label: 'Top Right' },
                                { key: 'bottom-left', label: 'Bottom Left' },
                                { key: 'bottom-right', label: 'Bottom Right' }
                              ] as const).map(pos => (
                                <button
                                  key={`overlay-pos-${pos.key}`}
                                  onClick={() => {
                                    setOverlayPosition(pos.key);
                                    if (socketRef.current?.readyState === WebSocket.OPEN) {
                                      socketRef.current.send(JSON.stringify({ type: 'update_avatar_data', overlay_position: pos.key }));
                                    }
                                  }}
                                  className={cn(
                                    "text-[9px] py-1.5 rounded border uppercase font-bold transition-all",
                                    overlayPosition === pos.key 
                                      ? "bg-indigo-500/20 border-indigo-500 text-indigo-300 shadow-[0_0_8px_rgba(99,102,241,0.2)]" 
                                      : "bg-black/20 border-white/5 text-neutral-600 hover:text-neutral-400"
                                  )}
                                >
                                  {pos.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* OBS / Stream Mode Selection */}
                        <div className="space-y-2.5 pt-4 border-t border-white/5">
                          <div className="flex flex-col">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-white">OBS / Stream Mode</span>
                            <span className="text-[8px] text-neutral-500 lowercase italic">Choose the active style for your stream overlays</span>
                          </div>
                          <div className="grid grid-cols-3 gap-1.5 p-1 bg-black/45 rounded-xl border border-white/5">
                            <button
                              onClick={() => selectOBSModeSetting('disabled')}
                              className={cn(
                                "py-2 text-[9px] font-bold uppercase tracking-wider rounded-lg transition-all text-center cursor-pointer",
                                (!isCustomModeOBS && !useGridPopupOBS)
                                  ? "bg-white/10 text-white shadow-lg border border-white/10" 
                                  : "text-neutral-500 hover:text-neutral-300"
                                )}
                            >
                              Disabled
                            </button>
                            <button
                              onClick={() => selectOBSModeSetting('standard')}
                              className={cn(
                                "py-2 text-[9px] font-bold uppercase tracking-wider rounded-lg transition-all text-center cursor-pointer",
                                (isCustomModeOBS && !useGridPopupOBS)
                                  ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 shadow-lg" 
                                  : "text-neutral-500 hover:text-neutral-300"
                              )}
                            >
                              Notification List
                            </button>
                            <button
                              onClick={() => selectOBSModeSetting('grid')}
                              className={cn(
                                "py-2 text-[9px] font-bold uppercase tracking-wider rounded-lg transition-all text-center cursor-pointer",
                                (!isCustomModeOBS && useGridPopupOBS)
                                  ? "bg-pink-500/20 border-pink-500/40 text-pink-300 shadow-lg" 
                                  : "text-neutral-500 hover:text-neutral-300"
                              )}
                            >
                              Avatar Grid
                            </button>
                          </div>
                        </div>

                        {/* OBS Notification Position Select */}
                        {isCustomModeOBS && !useGridPopupOBS && (
                          <div className="space-y-1.5 animate-in fade-in duration-200">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">OBS Overlay Placement</span>
                            <div className="grid grid-cols-2 gap-1.5">
                              {([
                                { key: 'top-left', label: 'Top Left' },
                                { key: 'top-right', label: 'Top Right' },
                                { key: 'bottom-left', label: 'Bottom Left' },
                                { key: 'bottom-right', label: 'Bottom Right' }
                              ] as const).map(pos => (
                                <button
                                  key={`obs-pos-${pos.key}`}
                                  onClick={() => {
                                    setObsPosition(pos.key);
                                    if (socketRef.current?.readyState === WebSocket.OPEN) {
                                      socketRef.current.send(JSON.stringify({ type: 'update_avatar_data', obs_position: pos.key }));
                                    }
                                  }}
                                  className={cn(
                                    "text-[9px] py-1.5 rounded border uppercase font-bold transition-all",
                                    obsPosition === pos.key 
                                      ? "bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.2)]" 
                                      : "bg-black/20 border-white/5 text-neutral-600 hover:text-neutral-400"
                                  )}
                                >
                                  {pos.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Grid max capacity slider and Reset button */}
                        {(useGridPopupOverlay || useGridPopupOBS) && (
                          <div className="space-y-4 pt-3 border-t border-white/5 animate-in fade-in duration-200">
                            
                            {/* Overlay Grid Layout Toggle */}
                            {useGridPopupOverlay && (
                              <div className="space-y-2">
                                <div className="text-[10px] font-bold uppercase tracking-wider text-pink-400">Overlay Grid Layout</div>
                                <div className="grid grid-cols-2 gap-2">
                                  {([
                                    { key: 'horizontal-bottom', label: 'Horizontal (Bottom)' },
                                    { key: 'horizontal-top', label: 'Horizontal (Top)' },
                                    { key: 'vertical-left', label: 'Vertical (Left)' },
                                    { key: 'vertical-right', label: 'Vertical (Right)' }
                                  ] as const).map(layout => {
                                    const isActive = gridLayoutOverlay === layout.key || 
                                      (layout.key === 'horizontal-bottom' && gridLayoutOverlay === 'horizontal') ||
                                      (layout.key === 'vertical-right' && gridLayoutOverlay === 'vertical');
                                    return (
                                      <button
                                        key={`grid-overlay-layout-${layout.key}`}
                                        onClick={() => {
                                          setGridLayoutOverlay(layout.key);
                                          if (socketRef.current?.readyState === WebSocket.OPEN) {
                                            socketRef.current.send(JSON.stringify({ type: 'update_avatar_data', grid_layout_overlay: layout.key }));
                                          }
                                        }}
                                        className={cn(
                                          "text-[9px] py-1.5 rounded border uppercase font-bold transition-all",
                                          isActive
                                            ? "bg-pink-500/20 border-pink-500 text-pink-400 shadow-[0_0_8px_rgba(236,72,153,0.2)]"
                                            : "bg-black/20 border-white/5 text-neutral-600 hover:text-neutral-400"
                                        )}
                                      >
                                        {layout.label}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* OBS Grid Layout Toggle */}
                            {useGridPopupOBS && (
                              <div className="space-y-2 pt-2 border-t border-white/5">
                                <div className="text-[10px] font-bold uppercase tracking-wider text-pink-400">OBS Grid Layout</div>
                                <div className="grid grid-cols-2 gap-2">
                                  {([
                                    { key: 'horizontal-bottom', label: 'Horizontal (Bottom)' },
                                    { key: 'horizontal-top', label: 'Horizontal (Top)' },
                                    { key: 'vertical-left', label: 'Vertical (Left)' },
                                    { key: 'vertical-right', label: 'Vertical (Right)' }
                                  ] as const).map(layout => {
                                    const isActive = gridLayoutOBS === layout.key || 
                                      (layout.key === 'horizontal-bottom' && gridLayoutOBS === 'horizontal') ||
                                      (layout.key === 'vertical-right' && gridLayoutOBS === 'vertical');
                                    return (
                                      <button
                                        key={`grid-obs-layout-${layout.key}`}
                                        onClick={() => {
                                          setGridLayoutOBS(layout.key);
                                          if (socketRef.current?.readyState === WebSocket.OPEN) {
                                            socketRef.current.send(JSON.stringify({ type: 'update_avatar_data', grid_layout_obs: layout.key }));
                                          }
                                        }}
                                        className={cn(
                                          "text-[9px] py-1.5 rounded border uppercase font-bold transition-all",
                                          isActive
                                            ? "bg-pink-500/20 border-pink-500 text-pink-400 shadow-[0_0_8px_rgba(236,72,153,0.2)]"
                                            : "bg-black/20 border-white/5 text-neutral-600 hover:text-neutral-400"
                                        )}
                                      >
                                        {layout.label}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Single Bubble Focus Toggle */}
                            <div className="flex justify-between items-center pt-3 border-t border-white/5">
                              <div className="flex flex-col">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-pink-400">Single Bubble Focus</span>
                                <span className="text-[8px] text-neutral-500 lowercase italic">Only show the most recent bubble to prevent overlaps</span>
                              </div>
                              <button 
                                onClick={() => {
                                  const newValue = !singleBubbleFocus;
                                  setSingleBubbleFocus(newValue);
                                  if (socketRef.current?.readyState === WebSocket.OPEN) {
                                    socketRef.current.send(JSON.stringify({
                                      type: 'update_avatar_data',
                                      single_bubble_focus: newValue
                                    }));
                                  }
                                }}
                                className={cn(
                                  "w-8 h-4 rounded-full relative transition-colors duration-200 shrink-0",
                                  singleBubbleFocus ? "bg-pink-500" : "bg-neutral-800"
                                )}
                              >
                                <div className={cn(
                                  "absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all duration-200",
                                  singleBubbleFocus ? "left-4.5" : "left-0.5"
                                )} />
                              </button>
                            </div>

                            <div className="flex justify-between text-[9px] uppercase font-bold text-neutral-400 pt-2 border-t border-white/5">
                              <span>Max Grid Avatars</span>
                              <span className="text-pink-400">{gridMaxPeople} Players</span>
                            </div>
                            <div className="flex items-center gap-4">
                              <input 
                                type="range" min="1" max="10" value={gridMaxPeople} 
                                onChange={(e) => {
                                  const val = parseInt(e.target.value);
                                  setGridMaxPeople(val);
                                  if (socketRef.current?.readyState === WebSocket.OPEN) {
                                    socketRef.current.send(JSON.stringify({ type: 'update_avatar_data', grid_max_people: val }));
                                  }
                                }}
                                className="flex-1 accent-pink-500 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                              />
                              <button
                                onClick={() => {
                                  setGridPlayers([]);
                                  localStorage.removeItem('broadcast_grid_players');
                                }}
                                className="text-[9px] uppercase font-bold text-red-400 hover:text-red-300 transition-colors bg-red-500/10 border border-red-500/25 px-2.5 py-1 rounded shrink-0 pointer-events-auto"
                              >
                                Reset Grid
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="pt-4 border-t border-white/5 space-y-4">
                        <div className="flex items-center justify-between pt-4 border-t border-white/5">
                          <h4 className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-2">
                             Notification Design
                          </h4>
                          <button 
                            onClick={resetStyling}
                            className="text-[9px] text-neutral-500 hover:text-white transition-colors flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded border border-white/5 uppercase"
                          >
                            <RefreshCw className="w-2.5 h-2.5" /> Reset Defaults
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <div className="flex justify-between text-[9px] uppercase font-bold text-neutral-400">
                              <span>Avatar Size</span>
                              <span>{avatarSize}px</span>
                            </div>
                            <input 
                              type="range" min="32" max="128" value={avatarSize} 
                              onChange={(e) => {
                                const val = parseInt(e.target.value);
                                setAvatarSize(val);
                                if (socketRef.current?.readyState === WebSocket.OPEN) {
                                  socketRef.current.send(JSON.stringify({ type: 'update_avatar_data', avatar_size: val }));
                                }
                              }}
                              className="w-full accent-pink-500 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                            />
                          </div>

                          <div className="space-y-1">
                            <div className="flex justify-between text-[9px] uppercase font-bold text-neutral-400">
                              <span>Text Size</span>
                              <span>{textSize}px</span>
                            </div>
                            <input 
                              type="range" min="10" max="24" value={textSize} 
                              onChange={(e) => {
                                const val = parseInt(e.target.value);
                                setTextSize(val);
                                if (socketRef.current?.readyState === WebSocket.OPEN) {
                                  socketRef.current.send(JSON.stringify({ type: 'update_avatar_data', text_size: val }));
                                }
                              }}
                              className="w-full accent-pink-500 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                            />
                          </div>
                          
                          <div className="space-y-1">
                            <div className="flex justify-between text-[9px] uppercase font-bold text-neutral-400">
                              <span>Padding</span>
                              <span>{notifPadding}px</span>
                            </div>
                            <input 
                              type="range" min="4" max="24" value={notifPadding} 
                              onChange={(e) => {
                                const val = parseInt(e.target.value);
                                setNotifPadding(val);
                                if (socketRef.current?.readyState === WebSocket.OPEN) {
                                  socketRef.current.send(JSON.stringify({ type: 'update_avatar_data', notif_padding: val }));
                                }
                              }}
                              className="w-full accent-pink-500 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                            />
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-4 pt-2">
                          <label className="flex items-center gap-2 cursor-pointer group">
                            <input 
                              type="checkbox" checked={showTimestamp} 
                              onChange={(e) => {
                                const val = e.target.checked;
                                setShowTimestamp(val);
                                if (socketRef.current?.readyState === WebSocket.OPEN) {
                                  socketRef.current.send(JSON.stringify({ type: 'update_avatar_data', show_timestamp: val }));
                                }
                              }}
                              className="w-3 h-3 rounded bg-black/40 border border-white/10 accent-pink-500"
                            />
                            <span className="text-[10px] text-neutral-400 group-hover:text-white transition-colors">Show Time</span>
                          </label>

                          <label className="flex items-center gap-2 cursor-pointer group">
                            <input 
                              type="checkbox" checked={showEventLabel} 
                              onChange={(e) => {
                                const val = e.target.checked;
                                setShowEventLabel(val);
                                if (socketRef.current?.readyState === WebSocket.OPEN) {
                                  socketRef.current.send(JSON.stringify({ type: 'update_avatar_data', show_event_label: val }));
                                }
                              }}
                              className="w-3 h-3 rounded bg-black/40 border border-white/10 accent-pink-500"
                            />
                            <span className="text-[10px] text-neutral-400 group-hover:text-white transition-colors">Show Label</span>
                          </label>

                          <div className="flex items-center gap-2 bg-black/20 p-1.5 rounded-lg border border-white/5">
                            <span className="text-[9px] uppercase font-bold text-neutral-500 px-1">Color</span>
                            <input 
                              type="color" value={notifColor} 
                              onChange={(e) => {
                                const val = e.target.value;
                                setNotifColor(val);
                                if (socketRef.current?.readyState === WebSocket.OPEN) {
                                  socketRef.current.send(JSON.stringify({ type: 'update_avatar_data', notif_color: val }));
                                }
                              }}
                              className="w-6 h-4 bg-transparent border-0 cursor-pointer p-0"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="text-[9px] uppercase font-bold text-neutral-400">Layout Mode</div>
                          <div className="grid grid-cols-3 gap-2">
                            {(['standard', 'reversed', 'vertical'] as const).map(mode => (
                              <button
                                key={mode}
                                onClick={() => {
                                  setNotifLayout(mode);
                                  if (socketRef.current?.readyState === WebSocket.OPEN) {
                                    socketRef.current.send(JSON.stringify({ type: 'update_avatar_data', notif_layout: mode }));
                                  }
                                }}
                                className={cn(
                                  "text-[9px] py-1.5 rounded border uppercase font-bold transition-all",
                                  notifLayout === mode 
                                    ? "bg-pink-500/20 border-pink-500 text-pink-400 shadow-[0_0_8px_rgba(236,72,153,0.2)]" 
                                    : "bg-black/20 border-white/5 text-neutral-600 hover:text-neutral-400"
                                )}
                              >
                                {mode}
                              </button>
                            ))}
                          </div>
                        </div>

                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 pt-4 border-t border-white/5">Player Avatars</h4>
                        
                        {playerList.length === 0 ? (
                          <div className="text-center py-4 text-[10px] text-neutral-600 italic">
                            No players found. Connect to a slot first.
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {playerList.map(name => (
                              <div key={`avatar-config-${name}`} className="space-y-3 p-3 bg-black/20 rounded-xl border border-white/5 shadow-inner">
                                <div className="flex items-center gap-3">
                                  <div className="w-12 h-12 bg-white/5 rounded-xl border border-white/10 overflow-hidden flex items-center justify-center shrink-0 shadow-lg">
                                    {playerAvatars[name] ? (
                                      <img src={playerAvatars[name]} alt={name} className="w-full h-full object-cover" />
                                    ) : (
                                      <User className="w-6 h-6 text-neutral-600" />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-[12px] font-bold truncate text-white">{name}</div>
                                    <div className="flex gap-2 mt-1.5 overflow-x-auto pb-1 custom-scrollbar">
                                      <label className="shrink-0 cursor-pointer text-[9px] uppercase font-bold text-neutral-400 hover:text-white transition-colors flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded-md border border-white/5">
                                        <Upload className="w-3 h-3" />
                                        Upload
                                        <input 
                                          type="file" 
                                          accept="image/*" 
                                          className="hidden" 
                                          onChange={(e) => handleAvatarUpload(name, e)}
                                        />
                                      </label>
                                      
                                      <div className="flex items-center gap-1 bg-black/40 rounded-md px-1.5 border border-white/5 shrink-0">
                                        <User className="w-3 h-3 text-neutral-500" />
                                        <select 
                                          className="bg-transparent border-0 text-[9px] text-neutral-400 focus:outline-none appearance-none cursor-pointer py-1"
                                          onChange={(e) => applyFromLibrary(name, e.target.value)}
                                          value=""
                                        >
                                          <option value="" disabled className="bg-neutral-900">Apply Friend...</option>
                                          {Object.keys(friendsLibrary).map(f => (
                                            <option key={f} value={f} className="bg-neutral-900">{f}</option>
                                          ))}
                                        </select>
                                      </div>

                                      {playerAvatars[name] && (
                                        <>
                                          <button 
                                            onClick={() => saveToLibrary(name, playerAvatars[name])}
                                            className="shrink-0 text-[9px] uppercase font-bold text-accent-useful/80 hover:text-accent-useful transition-colors flex items-center gap-1.5 bg-accent-useful/10 px-2 py-1 rounded-md border border-accent-useful/20"
                                          >
                                            <CheckCircle2 className="w-3 h-3" /> Save
                                          </button>
                                          <button 
                                            onClick={() => removeAvatar(name)}
                                            className="shrink-0 text-[9px] uppercase font-bold text-red-500/70 hover:text-red-400 transition-colors flex items-center gap-1.5 bg-red-500/10 px-2 py-1 rounded-md border border-red-500/20"
                                          >
                                            <Trash2 className="w-3 h-3" /> Clear
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Friends Library Management */}
                      <div className="pt-6 border-t border-white/10 space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-[10px] font-bold uppercase tracking-wider text-pink-400 flex items-center gap-2">
                            <History className="w-3.5 h-3.5" /> Friends Library
                          </h4>
                        </div>

                        {Object.keys(friendsLibrary).length === 0 ? (
                          <div className="text-center py-6 bg-black/20 rounded-xl border border-white/5 border-dashed">
                            <p className="text-[10px] text-neutral-600 italic">Library is empty.</p>
                            <p className="text-[9px] text-neutral-700 mt-1">Save a player avatar to see it here.</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-2">
                            {Object.entries(friendsLibrary).map(([fName, img]) => (
                              <div key={`lib-item-${fName}`} className="flex items-center gap-2 p-2 bg-white/5 rounded-lg border border-white/5 group relative overflow-hidden">
                                <div className="w-8 h-8 rounded-md border border-white/10 overflow-hidden shrink-0">
                                  <img src={img} alt={fName} className="w-full h-full object-cover" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-[10px] font-bold truncate text-neutral-300">{fName}</div>
                                </div>
                                <button 
                                  onClick={() => removeFromLibrary(fName)}
                                  className="p-1 text-neutral-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            <div className="border-t border-white/5 pt-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-2">
                  <Bell className="w-3 h-3" /> Event History
                </h3>
                <button 
                  onClick={() => setShowDebug(!showDebug)} 
                  className={cn(
                    "text-[9px] px-2 py-0.5 rounded border transition-colors uppercase tracking-widest font-bold",
                    showDebug ? "bg-accent-prog/20 border-accent-prog text-accent-prog" : "border-white/10 text-neutral-600 hover:text-neutral-400"
                  )}
                >
                  Debug
                </button>
              </div>
              <div className="space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                {history.length === 0 && <p className="text-neutral-600 text-sm italic">No recent events.</p>}
                {history.map(item => (
                  <div key={item.id} className="text-xs p-3 bg-white/5 rounded-xl border border-white/5 space-y-2">
                    <div className="flex justify-between text-[10px] text-neutral-500">
                      <span>{item.timestamp}</span>
                      <span className="uppercase">{item.event}</span>
                    </div>
                    <div className="flex items-start gap-3">
                      {(item.event === 'receive' || item.event === 'send' || item.event === 'hint') && (
                        <div className="w-8 h-8 bg-white/5 rounded border border-white/10 flex items-center justify-center shrink-0">
                          {item.event === 'hint' ? (
                            <MapPin className="w-4 h-4 text-sky-400" />
                          ) : (
                            <img src={getLogo(item.class)} alt="" className="w-5 h-5 object-contain" />
                          )}
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="text-neutral-300">
                          {(item.event === 'receive' || item.event === 'send') 
                            ? (item.from === item.to 
                                ? <>{item.from} found <span className={getItemColor(item.class)}>{item.item}</span></>
                                : <>{item.from} sent <span className={getItemColor(item.class)}>{item.item}</span> to {item.to}</>)
                            : item.event === 'hint'
                              ? <><span className="text-accent-prog font-bold">{item.owner}</span>'s <span className={cn("font-bold", getItemColor(item.class))}>{item.item}</span> (<span className="text-sky-400 font-bold">{item.finder}</span>)</>
                              : item.text}
                        </p>
                        {(item.event === 'hint' || (showLocations && item.location)) && item.location && (
                          <p className="text-[10px] text-neutral-400 italic mt-0.5">
                            at <span className="text-neutral-200 font-medium not-italic">{item.location}</span>
                          </p>
                        )}
                      </div>
                    </div>
                    {showDebug && item.raw_data && (
                      <div className="mt-2 p-2 bg-black/40 rounded border border-white/5 font-mono text-[9px] text-neutral-500 overflow-x-auto whitespace-pre-wrap">
                        {JSON.stringify(item.raw_data, null, 2)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-white/5">
            <div className="flex items-center gap-3 text-sm text-neutral-400">
              {isConnected ? <Wifi className="w-4 h-4 text-emerald-500" /> : <WifiOff className="w-4 h-4 text-red-500" />}
              <span>{isConnected ? 'Bridge Connected' : 'Bridge Offline'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Single Draggable Toggle Button - Positioned at the bottom with flip logic */}
      {!isStreamMode && (
        <div 
          className={cn(
            "fixed bottom-6 flex items-center transition-all duration-500 z-[60]",
            // Flip to right side if the window is pushed too far left
            isFlipped ? "right-6 left-auto" : "left-6 right-auto"
          )}
          style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        >
          {/* This outer div is the designated drag handle */}
          <div className="p-0.5 bg-neutral-900/80 backdrop-blur-xl border border-white/10 rounded-full shadow-2xl flex items-center group cursor-move hover:bg-neutral-800 transition-colors">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setShowHistory(!showHistory);
              }}
              title="Click icon for History / Drag the border to move"
              style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
              className="p-[14px] bg-white/5 hover:bg-white/10 rounded-full transition-all relative flex items-center justify-center"
            >
              <Monitor className="w-[22px] h-[22px] text-neutral-400 group-hover:text-white" />
              {!isConnected && <div className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-neutral-900 animate-pulse" />}
            </button>
            
            {/* Minimalist grip handle for extra drag area */}
            <div className="pr-2.5 pl-0.5 text-neutral-600 group-hover:text-neutral-400 transition-colors">
              <GripVertical className="w-4 h-4" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
