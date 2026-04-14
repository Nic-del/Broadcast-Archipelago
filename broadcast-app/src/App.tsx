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
  GripVertical
} from 'lucide-react';
import { cn } from './lib/utils';

// Types
interface GameNotification {
  id: string;
  type: string;
  event: 'receive' | 'send' | 'normal' | 'error';
  item?: string;
  from?: string;
  to?: string;
  text?: string;
  item_id?: number;
  class?: number;
  timestamp: string;
  my_alias?: string;
  raw_data?: Record<string, unknown>;
}

interface DisplayInfo {
  id: number;
  label: string;
  isPrimary: boolean;
  bounds: { x: number; y: number; width: number; height: number };
}

const App: React.FC = () => {
  // Detect Steam/OBS Mode from URL
  const isStreamMode = useMemo(() => {
    return new URLSearchParams(window.location.search).get('mode') === 'obs';
  }, []);

  const [notifications, setNotifications] = useState<GameNotification[]>(() => {
    if (isStreamMode) {
      try {
        const saved = localStorage.getItem('broadcast_history');
        if (saved) {
          // Load items and filter out system messages for OBS
          const parsed = JSON.parse(saved) as GameNotification[];
          return parsed
            .filter(n => n.event === 'receive' || n.event === 'send')
            .slice(0, 15)
            .reverse();
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
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isConnected, setIsConnected] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [displays, setDisplays] = useState<DisplayInfo[]>([]);
  const [windowBounds, setWindowBounds] = useState({ x: 0, y: 0, width: 0, height: 0 });
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
          
          const clearAllData = () => {
            localStorage.clear();
            sessionStorage.clear();
            // Clear cookies
            document.cookie.split(";").forEach((c) => {
              document.cookie = c
                .replace(/^ +/, "")
                .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
            });
            setNotifications([]);
            setHistory([]);
          };

          if (data.type === 'clear_history') {
            clearAllData();
            return;
          }

          if (data.type === 'notification') {
            // Skip system messages in OBS mode
            if (isStreamMode && (data.event === 'normal' || data.event === 'error')) {
              return;
            }
            const newNotif: GameNotification = {
              ...data,
              id: Math.random().toString(36).substr(2, 9),
              timestamp: new Date().toLocaleTimeString()
            };
            
            setNotifications(prev => [...prev, newNotif]);
            setHistory(prev => {
              const updated = [newNotif, ...prev].slice(0, 100);
              localStorage.setItem('broadcast_history', JSON.stringify(updated));
              return updated;
            });

            // Auto-remove from overlay (ONLY if not in stream mode)
            if (!isStreamMode) {
              setTimeout(() => {
                if (!isMounted) return;
                setNotifications(prev => prev.filter(n => n.id !== newNotif.id));
              }, 10000);
            }
          }
        } catch (e) {
          console.error('Failed to parse message', e);
        }
      };
    };

    connect();

    // Cleanup function
    return () => {
      isMounted = false;
      clearTimeout(reconnectTimeout);
      if (socketRef.current) {
        // Disabling onclose ensures we don't accidentally trigger a reconnect on manual close
        socketRef.current.onclose = null;
        socketRef.current.close();
      }
    };
  }, [isStreamMode]);

  // Debug position logic
  useEffect(() => {
    if (!isStreamMode) {
      console.log('Window X:', windowBounds.x, 'Limit:', (displays[activeDisplayIndex]?.bounds.x || 0) + 40);
    }
  }, [windowBounds, displays, activeDisplayIndex, isStreamMode]);

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
      my_alias: 'Main Player'
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
        isStreamMode && "bg-black/20" // Optional subtle dark shade for OBS
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
              >
                {(notif.event === 'receive' || notif.event === 'send') ? (
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
          "fixed right-0 top-0 bottom-0 w-80 bg-neutral-900/40 backdrop-blur-3xl border-l border-white/5 p-6 flex flex-col gap-6 transition-transform duration-500 z-50",
          !showHistory && "translate-x-full"
        )}>
          <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-2">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <History className="w-5 h-5" /> History
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

          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-6">
            {/* Screen Preview */}
            {displays.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-2">
                  <Monitor className="w-3 h-3" /> Screen Preview
                </h3>
                <div 
                  className="relative bg-black/40 rounded-xl border border-white/10 overflow-hidden mx-auto"
                  style={{
                    width: '240px',
                    height: `${(displays[activeDisplayIndex].bounds.height / displays[activeDisplayIndex].bounds.width) * 240}px`,
                    transition: 'height 0.3s ease-out'
                  }}
                >
                  {/* Visual Monitor Frame */}
                  <div className="absolute inset-0 border-[6px] border-neutral-800 rounded-lg pointer-events-none z-10" />
                  
                  {/* Wallpaper-like background */}
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent animate-pulse" />

                  {/* Overlay Window Representation */}
                  <motion.div
                    animate={{ 
                      x: (windowBounds.x - displays[activeDisplayIndex].bounds.x) * (240 / displays[activeDisplayIndex].bounds.width),
                      y: (windowBounds.y - displays[activeDisplayIndex].bounds.y) * (240 / displays[activeDisplayIndex].bounds.width),
                      width: windowBounds.width * (240 / displays[activeDisplayIndex].bounds.width),
                      height: windowBounds.height * (240 / displays[activeDisplayIndex].bounds.width)
                    }}
                    className="absolute bg-accent-useful/40 border border-accent-useful shadow-[0_0_15px_rgba(34,197,94,0.3)] rounded-sm z-20 backdrop-blur-[2px]"
                  />

                  {/* Grid indicator */}
                  <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
                    style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '10px 10px' }} 
                  />
                </div>
              </div>
            )}

            {/* Screens Section */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-2">
                <Monitor className="w-3 h-3" /> Monitors ({displays.length})
              </h3>
              <div className="grid gap-2">
                {displays.map((disp, idx) => (
                  <button
                    key={disp.id}
                    onClick={() => (window as unknown as { electron: { setDisplay: (idx: number) => void } }).electron?.setDisplay(idx)}
                    className={cn(
                      "flex flex-col gap-1 p-3 bg-white/5 hover:bg-white/10 border transition-all text-left group rounded-xl",
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
                    <span className="text-[10px] text-neutral-500">
                      {disp.bounds.width}x{disp.bounds.height} at {disp.bounds.x},{disp.bounds.y}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2">
            <div className="flex items-center justify-between mb-3">
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
            <div className="space-y-4">
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
