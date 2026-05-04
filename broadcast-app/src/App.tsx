import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Wifi, 
  WifiOff, 
  Settings, 
  Bell, 
  History,
  Info, 
  AlertCircle,
  Monitor,
  GripVertical,
  RefreshCw,
  MapPin,
  User,
  Package,
  CheckCircle2,
  ArrowRight,
  Trash2,
  Upload,
  Image as ImageIcon
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

interface Hint {
  item: string;
  location: string;
  owner: string;
  finder: string;
  found: boolean;
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
  const [allHints, setAllHints] = useState<Hint[]>([]);
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

  // Sync refs with state
  useEffect(() => {
    syncModeRef.current = currentSyncMode;
  }, [currentSyncMode]);

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
    localStorage.setItem('broadcast_player_avatars', JSON.stringify(playerAvatars));
  }, [playerAvatars]);

  useEffect(() => {
    localStorage.setItem('broadcast_friends_library', JSON.stringify(friendsLibrary));
  }, [friendsLibrary]);

  // Connect to Bridge
  useEffect(() => {
    let isMounted = true;
    let reconnectTimeout: ReturnType<typeof setTimeout>;

    const connect = () => {
      const socket = new WebSocket('ws://localhost:8089');
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
            localStorage.removeItem('broadcast_history');
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

  const requestHint = () => {
    if (hintInput.trim() && socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ 
        type: 'request_hint', 
        item: hintInput.trim() 
      }));
      setHintInput('');
    }
  };

  const handleAvatarUpload = (playerName: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const image = reader.result as string;
        const updated = { ...playerAvatars, [playerName]: image };
        setPlayerAvatars(updated);
        
        // Sync to bridge
        if (socketRef.current?.readyState === WebSocket.OPEN) {
          socketRef.current.send(JSON.stringify({
            type: 'update_avatar_data',
            player_avatars: updated
          }));
        }
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

  const isFlipped = useMemo(() => {
    return (windowBounds.x < (displays[activeDisplayIndex]?.bounds.x || 0) + 40);
  }, [windowBounds, displays, activeDisplayIndex]);

  return (
    <div className="h-screen w-screen flex flex-col md:flex-row bg-transparent">
      {/* Overlay Area (Notifications) */}
      <div className={cn(
        "flex-1 relative overflow-hidden pointer-events-none p-4",
        isStreamMode && "bg-transparent" // OBS mode MUST be transparent
      )}>
        {/* Notifications offset intelligently based on the button position */}
        <div className={cn(
          "absolute bottom-4 flex flex-col gap-3 items-start max-w-sm transition-all duration-300",
          !isStreamMode ? (isFlipped ? "right-28 left-6" : "left-28 right-6") : "left-6 right-6"
        )}>
          <AnimatePresence>
            {notifications.map((notif) => (
              <motion.div
                key={notif.id}
                initial={{ opacity: 0, x: -50, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -50, scale: 0.9 }}
                className={cn(
                  "w-full bg-neutral-900/90 backdrop-blur-xl border p-3 rounded-xl flex items-center gap-3 shadow-2xl pointer-events-auto",
                  getAccentColor(notif.class),
                  notif.event === 'error' && "border-red-500 shadow-red-500/20"
                )}
                style={{}} 
              >
                {((isStreamMode ? isCustomModeOBS : isCustomModeOverlay) && (notif.event === 'receive' || notif.event === 'send')) ? (
                  <div className="flex items-center gap-1 shrink-0">
                    {notif.from === notif.to ? (
                      <div className="w-12 h-12 bg-white/5 rounded-lg flex items-center justify-center border border-white/10 overflow-hidden">
                        {playerAvatars[notif.from] ? (
                          <img src={playerAvatars[notif.from]} alt={notif.from} className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-6 h-6 text-neutral-500" />
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 p-1 bg-black/20 rounded-xl border border-white/5">
                        <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center border border-white/10 overflow-hidden shrink-0">
                          {playerAvatars[notif.from] ? (
                            <img src={playerAvatars[notif.from]} alt={notif.from} className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-4 h-4 text-neutral-600" />
                          )}
                        </div>
                        <ArrowRight className="w-3 h-3 text-neutral-600" />
                        <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center border border-white/10 overflow-hidden shrink-0">
                          {playerAvatars[notif.to] ? (
                            <img src={playerAvatars[notif.to]} alt={notif.to} className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-4 h-4 text-neutral-600" />
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (notif.event === 'receive' || notif.event === 'send') ? (
                  <div className="w-12 h-12 bg-white/5 rounded-lg flex items-center justify-center border border-white/10 shrink-0">
                    <img src={getLogo(notif.class)} alt="Logo" className="w-8 h-8 object-contain filter drop-shadow-md" />
                  </div>
                ) : (
                  <div className="w-12 h-12 bg-white/5 rounded-lg flex items-center justify-center border border-white/10 shrink-0">
                    {notif.event === 'error' ? <AlertCircle className="w-5 h-5 text-red-500" /> : <Info className="w-5 h-5 text-blue-400" />}
                  </div>
                )}
                
                <div className="flex-1 overflow-hidden">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                      {(notif.event === 'receive' || notif.event === 'send') 
                        ? (notif.from === notif.to ? 'Item Found' : (notif.to === notif.my_alias ? 'Incoming Item' : 'Sent Item')) 
                        : 'System Message'}
                    </span>
                    <span className="text-[10px] text-neutral-600">{notif.timestamp}</span>
                  </div>
                  
                  <div className="text-[14px] leading-tight font-medium">
                    {(notif.event === 'receive' || notif.event === 'send') && (
                      <p>
                        {notif.from === notif.to ? (
                          <><span className="text-accent-prog font-bold">{notif.from}</span> found <span className={cn("font-bold", getItemColor(notif.class))}>{notif.item}</span></>
                        ) : (
                          <><span className="text-accent-prog font-bold">{notif.from}</span> sent <span className={cn("font-bold", getItemColor(notif.class))}>{notif.item}</span> to <span className="text-accent-prog font-bold">{notif.to}</span></>
                        )}
                      </p>
                    )}
                    {notif.event === 'hint' && (
                      <div className="space-y-1">
                        <p>
                          <span className="text-accent-prog font-bold">{notif.owner}</span>'s <span className="text-accent-junk font-bold">{notif.item}</span>
                        </p>
                        <p className="text-[11px] text-neutral-400">
                          is at <span className="text-white font-medium">{notif.location}</span>
                        </p>
                        <p className="text-[9px] text-neutral-500 italic">
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
            ))}
          </AnimatePresence>
        </div>
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
              <button onClick={() => setShowHistory(false)} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
                <Settings className="w-5 h-5 text-neutral-400" />
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
                                <div className="absolute bottom-full mb-2 left-0 right-0 bg-neutral-900 border border-white/10 rounded-lg shadow-2xl max-h-48 overflow-y-auto z-50 custom-scrollbar animate-in fade-in slide-in-from-bottom-2">
                                  {[
                                    ...itemList.map(i => ({ name: i, type: 'Item' })),
                                    ...locationList.map(l => ({ name: l, type: 'Location' })),
                                    ...groupsList.map(g => ({ name: g, type: 'Group' }))
                                  ]
                                    .filter(obj => obj.name.toLowerCase().includes(hintInput.toLowerCase()))
                                    .sort((a, b) => {
                                      // Prioritize items over locations
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
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <div className="flex flex-col">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-white">Desktop Overlay</span>
                            <span className="text-[8px] text-neutral-500 lowercase italic">Use avatars on your desktop screen</span>
                          </div>
                          <button 
                            onClick={() => {
                              const newValue = !isCustomModeOverlay;
                              setIsCustomModeOverlay(newValue);
                              if (socketRef.current?.readyState === WebSocket.OPEN) {
                                socketRef.current.send(JSON.stringify({
                                  type: 'update_avatar_data',
                                  custom_mode_overlay: newValue
                                }));
                              }
                            }}
                            className={cn(
                              "w-8 h-4 rounded-full relative transition-colors duration-200",
                              isCustomModeOverlay ? "bg-indigo-500" : "bg-neutral-800"
                            )}
                          >
                            <div className={cn(
                              "absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all duration-200",
                              isCustomModeOverlay ? "left-4.5" : "left-0.5"
                            )} />
                          </button>
                        </div>

                        <div className="flex justify-between items-center pt-3 border-t border-white/5">
                          <div className="flex flex-col">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-white">OBS / Stream Mode</span>
                            <span className="text-[8px] text-neutral-500 lowercase italic">Use avatars in your stream overlay</span>
                          </div>
                          <button 
                            onClick={() => {
                              const newValue = !isCustomModeOBS;
                              setIsCustomModeOBS(newValue);
                              if (socketRef.current?.readyState === WebSocket.OPEN) {
                                socketRef.current.send(JSON.stringify({
                                  type: 'update_avatar_data',
                                  custom_mode_obs: newValue
                                }));
                              }
                            }}
                            className={cn(
                              "w-8 h-4 rounded-full relative transition-colors duration-200",
                              isCustomModeOBS ? "bg-emerald-500" : "bg-neutral-800"
                            )}
                          >
                            <div className={cn(
                              "absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all duration-200",
                              isCustomModeOBS ? "left-4.5" : "left-0.5"
                            )} />
                          </button>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-white/5 space-y-4">
                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Player Avatars</h4>
                        
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
                      {(item.event === 'receive' || item.event === 'send') && (
                        <div className="w-8 h-8 bg-white/5 rounded border border-white/10 flex items-center justify-center shrink-0">
                          <img src={getLogo(item.class)} alt="" className="w-5 h-5 object-contain" />
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="text-neutral-300">
                          {(item.event === 'receive' || item.event === 'send') 
                            ? (item.from === item.to 
                                ? <>{item.from} found <span className={getItemColor(item.class)}>{item.item}</span></>
                                : <>{item.from} sent <span className={getItemColor(item.class)}>{item.item}</span> to {item.to}</>)
                            : item.text}
                        </p>
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
