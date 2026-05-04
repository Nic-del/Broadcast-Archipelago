import asyncio
import json
import websockets
import argparse
import os
import sys
import logging

# Silence the noisy websockets handshake errors
logging.getLogger('websockets.server').setLevel(logging.CRITICAL)

# --- Archipelago Constants ---
AP_VERSION = {"major": 0, "minor": 6, "build": 7, "class": "Version"}

# OPTIMIZATION: Set low priority for this process to not impact the game
import platform
if platform.system() == "Windows":
    try:
        import psutil
        p = psutil.Process(os.getpid())
        p.nice(psutil.BELOW_NORMAL_PRIORITY_CLASS)
    except:
        # Fallback without psutil
        try:
            import win32api, win32process, win32con
            handle = win32api.OpenProcess(win32con.PROCESS_ALL_ACCESS, True, os.getpid())
            win32process.SetPriorityClass(handle, win32process.BELOW_NORMAL_PRIORITY_CLASS)
        except: pass

# --- Track connected UI clients ---
UI_CLIENTS = set()

async def register_ui(websocket):
    UI_CLIENTS.add(websocket)
    # Immediately send the current room state if we are already connected to AP
    if hasattr(websocket, 'ap_client'):
        c = websocket.ap_client
        # Use absolute paths for everything to be safe on Windows
        base_dir = os.path.dirname(os.path.abspath(__file__))
        root_dir = os.path.dirname(base_dir)
        settings_path = os.path.join(root_dir, "broadcast_settings.json")
        
        overlay_mode, obs_mode, tracked_players = "all", "all", []
        ov_duration, ob_duration, ob_fade = 10, 0, False
        try:
            if os.path.exists(settings_path):
                with open(settings_path, "r") as f:
                    s = json.load(f)
                    overlay_mode = s.get("sync_mode", "all")
                    obs_mode = s.get("obs_sync_mode", "all")
                    ov_duration = s.get("overlay_duration", 10)
                    ob_duration = s.get("obs_duration", 15)
                    ob_fade = s.get("obs_fade", False)
                    tracked_str = s.get("tracked_players", "")
                    if tracked_str:
                        tracked_players = [p.strip() for p in tracked_str.split(",") if p.strip()]
        except: pass

        # Load avatar settings
        avatar_settings = {}
        avatar_path = os.path.join(root_dir, "broadcast_avatars.json")
        try:
            if os.path.exists(avatar_path):
                with open(avatar_path, "r") as f:
                    avatar_settings = json.load(f)
        except: pass

        await websocket.send(json.dumps({
            "type": "room_info", 
            "players": list(c.player_names.values()),
            "current_player": c.my_alias,
            "profiles": list(c.profiles.keys()),
            "current_slot": c.slot,
            "overlay_sync_mode": overlay_mode,
            "obs_sync_mode": obs_mode,
            "overlay_duration": ov_duration,
            "obs_duration": ob_duration,
            "obs_fade": ob_fade,
            "hint_points": c.hint_points,
            "hint_cost": c.hint_cost,
            "tracked_players": tracked_players,
            "custom_mode_overlay": avatar_settings.get("custom_mode_overlay", False),
            "custom_mode_obs": avatar_settings.get("custom_mode_obs", False),
            "player_avatars": avatar_settings.get("player_avatars", {}),
            "friends_library": avatar_settings.get("friends_library", {})
        }))

        # Also send item list if we have it (Filtered for current game)
        if hasattr(websocket, 'ap_client'):
            await websocket.ap_client.broadcast_current_game_data(websocket)
            
            # Send cached hints immediately if we have them
            if hasattr(websocket.ap_client, 'cached_hints') and websocket.ap_client.cached_hints:
                print(f"DEBUG: Sending {len(websocket.ap_client.cached_hints)} cached hints to new UI client.")
                await websocket.send(json.dumps({
                    "type": "hint_list",
                    "hints": websocket.ap_client.cached_hints
                }))
            else:
                print("DEBUG: No cached hints to send to new UI client.")
    
    try:
        async for message in websocket:
            try:
                data = json.loads(message)
                if data.get("type") == "clear_history":
                    await broadcast_to_ui({"type": "clear_history"})
                elif data.get("type") == "notification":
                    await broadcast_to_ui(data)
                elif data.get("type") == "update_settings":
                    try:
                        # Redefine settings_path to be safe
                        base_dir = os.path.dirname(os.path.abspath(__file__))
                        settings_path = os.path.join(os.path.dirname(base_dir), "broadcast_settings.json")
                        
                        settings = {}
                        if os.path.exists(settings_path):
                            with open(settings_path, "r") as f:
                                settings = json.load(f)
                        
                        if "overlay_duration" in data: settings["overlay_duration"] = data["overlay_duration"]
                        if "obs_duration" in data: settings["obs_duration"] = data["obs_duration"]
                        if "obs_fade" in data: settings["obs_fade"] = data["obs_fade"]
                        
                        with open(settings_path, "w") as f:
                            json.dump(settings, f, indent=4)
                        
                        # Broadcast updated settings to ALL clients
                        await broadcast_to_ui({
                            "type": "room_info",
                            "overlay_duration": settings.get("overlay_duration", 10),
                            "obs_duration": settings.get("obs_duration", 15),
                            "obs_fade": settings.get("obs_fade", False)
                        })
                    except Exception as e: print(f"Error updating settings: {e}")
                elif data.get("type") == "update_avatar_data":
                    try:
                        base_dir = os.path.dirname(os.path.abspath(__file__))
                        avatar_path = os.path.join(os.path.dirname(base_dir), "broadcast_avatars.json")
                        
                        avatar_settings = {}
                        if os.path.exists(avatar_path):
                            with open(avatar_path, "r") as f:
                                avatar_settings = json.load(f)
                        
                        # Update specific keys
                        if "custom_mode_overlay" in data: avatar_settings["custom_mode_overlay"] = data["custom_mode_overlay"]
                        if "custom_mode_obs" in data: avatar_settings["custom_mode_obs"] = data["custom_mode_obs"]
                        if "player_avatars" in data: avatar_settings["player_avatars"] = data["player_avatars"]
                        if "friends_library" in data: avatar_settings["friends_library"] = data["friends_library"]
                        
                        with open(avatar_path, "w") as f:
                            json.dump(avatar_settings, f) # No indent for large data
                        
                        # Broadcast update to all
                        update_msg = {"type": "avatar_sync"}
                        if "custom_mode_overlay" in data: update_msg["custom_mode_overlay"] = data["custom_mode_overlay"]
                        if "custom_mode_obs" in data: update_msg["custom_mode_obs"] = data["custom_mode_obs"]
                        if "player_avatars" in data: update_msg["player_avatars"] = data["player_avatars"]
                        if "friends_library" in data: update_msg["friends_library"] = data["friends_library"]
                        
                        await broadcast_to_ui(update_msg)
                    except Exception as e: print(f"Error updating avatar data: {e}")
                elif data.get("type") == "change_slot":
                    new_slot = data.get("slot")
                    source = "OBS/Stream" if data.get("is_stream") else "UI/Overlay"
                    if new_slot:
                        # Prevent redundant switches that cause disconnect loops
                        if hasattr(websocket, 'ap_client') and websocket.ap_client.slot == new_slot and websocket.ap_client.is_connected:
                            print(f"[{source}] Already connected to slot: {new_slot}, ignoring switch request.")
                            continue
                            
                        # Find the password for this slot if we have it
                        new_pass = websocket.ap_client.profiles.get(new_slot, "")
                        print(f"[{source}] Switching to slot: {new_slot}")
                        if hasattr(websocket, 'ap_client'):
                            websocket.ap_client.slot = new_slot
                            websocket.ap_client.password = new_pass
                            websocket.ap_client.switching_slot = True
                            if websocket.ap_client.ws:
                                await websocket.ap_client.ws.close()
                elif data.get("type") == "change_player":
                    c = websocket.ap_client
                    new_player = data.get("player")
                    if new_player:
                        # Treat player change as a full slot switch/reconnection
                        c.slot = new_player
                        c.my_alias = new_player
                        c.switching_slot = True
                        # Update cache so this player is remembered for this slot
                        c.slot_cache[c.slot] = c.my_alias
                        c.save_cache()
                        if c.ws:
                            await c.ws.close()
                            await broadcast_to_ui({"type": "notification", "event": "normal", "text": f"Tracking player: {new_player}"})
                elif data.get("type") == "update_sync_mode":
                    target = data.get("target") # "overlay" or "obs"
                    new_mode = data.get("mode")
                    if target in ["overlay", "obs"] and new_mode in ["all", "personal", "filtered"]:
                        try:
                            # Redefine settings_path to be safe
                            base_dir = os.path.dirname(os.path.abspath(__file__))
                            settings_path = os.path.join(os.path.dirname(base_dir), "broadcast_settings.json")
                            
                            settings = {}
                            if os.path.exists(settings_path):
                                with open(settings_path, "r") as f:
                                    settings = json.load(f)
                            
                            key = "sync_mode" if target == "overlay" else "obs_sync_mode"
                            settings[key] = new_mode
                            
                            with open(settings_path, "w") as f:
                                json.dump(settings, f, indent=4)
                            
                            # Update ap_client if it's the bridge mode (overlay)
                            # Actually bridge always works in 'all' if needed, but we should notify others
                            await broadcast_to_ui({
                                "type": "room_info", 
                                "players": list(websocket.ap_client.player_names.values()),
                                "current_player": websocket.ap_client.my_alias,
                                "profiles": list(websocket.ap_client.profiles.keys()),
                                "current_slot": websocket.ap_client.slot,
                                "overlay_sync_mode": settings.get("sync_mode", "all"),
                                "obs_sync_mode": settings.get("obs_sync_mode", "all"),
                                "tracked_players": [p.strip() for p in settings.get("tracked_players", "").split(",") if p.strip()]
                            })
                        except Exception as e: print(f"Error updating sync mode: {e}")

                elif data.get("type") == "update_tracked_players":
                    players = data.get("players", [])
                    try:
                        # Redefine settings_path to be safe
                        base_dir = os.path.dirname(os.path.abspath(__file__))
                        settings_path = os.path.join(os.path.dirname(base_dir), "broadcast_settings.json")
                        
                        settings = {}
                        if os.path.exists(settings_path):
                            with open(settings_path, "r") as f:
                                settings = json.load(f)
                        
                        settings["tracked_players"] = ", ".join(players)
                        
                        with open(settings_path, "w") as f:
                            json.dump(settings, f, indent=4)
                        
                        await broadcast_to_ui({
                            "type": "room_info", 
                            "players": list(websocket.ap_client.player_names.values()),
                            "current_player": websocket.ap_client.my_alias,
                            "profiles": list(websocket.ap_client.profiles.keys()),
                            "current_slot": websocket.ap_client.slot,
                            "overlay_sync_mode": settings.get("sync_mode", "all"),
                            "obs_sync_mode": settings.get("obs_sync_mode", "all"),
                            "tracked_players": players
                        })
                    except Exception as e: print(f"Error updating tracked players: {e}")

                elif data.get("type") == "test_fill":
                    # Send 10 test notifications
                    
                    import random
                    items = [
                        ("Master Sword", 0), ("Mirror Shield", 1), ("50 Rupees", 2), 
                        ("Ice Trap", 3), ("Hookshot", 0), ("Bow", 0), 
                        ("Bomb Bag", 1), ("Empty Bottle", 1), ("Green Rupee", 2), ("Heart Container", 0)
                    ]
                    players = ["Link", "Zelda", "Ganon", "Saria", "Darunia", "Ruto"]
                    for i in range(10):
                        item, iclass = random.choice(items)
                        p1, p2 = random.sample(players, 2)
                        await broadcast_to_ui({
                            "type": "notification",
                            "event": "receive",
                            "item": f"Test {item}",
                            "from": p1,
                            "to": p2,
                            "class": iclass,
                            "is_mine": random.choice([True, False]),
                            "my_alias": p2,
                            "is_test": True
                        })
                        await asyncio.sleep(0.1)
                elif data.get("type") == "refresh_hints":
                    if hasattr(websocket, 'ap_client') and websocket.ap_client.ws:
                        c = websocket.ap_client
                        debug_text = "Bridge: Manual hint refresh requested..."
                        print(debug_text)
                        print(debug_text)
                        keys = [c.hint_key]
                        await c.ws.send(json.dumps([{"cmd": "Get", "keys": keys}]))
                elif data.get("type") == "request_hint":
                    item = data.get("item")
                    if item and hasattr(websocket, 'ap_client') and websocket.ap_client.ws:
                        print(f"Requesting hint for: {item}")
                        await websocket.ap_client.ws.send(json.dumps([{"cmd": "Say", "text": f"!hint {item}"}]))
            except: pass
    except: pass
    finally: UI_CLIENTS.remove(websocket)

async def broadcast_to_ui(message):
    log_msg = json.dumps(message) if isinstance(message, dict) else str(message)
    if UI_CLIENTS:
        for client in list(UI_CLIENTS):
            try: await client.send(log_msg)
            except: pass
    
    # Internal log file only
    try:
        with open("broadcast/bridge_notifications.log", "a", encoding="utf-8") as f:
            f.write(log_msg + "\n")
    except: pass

class ArchipelagoClient:
    def __init__(self, server, slot, password=None, filter_mode="all"):
        self.raw_server = server.replace("ws://", "").replace("wss://", "")
        self.slot = slot
        self.password = password
        self.filter_mode = filter_mode # "all" or "personal"
        self.ws = None
        self.player_names = {}
        self.slot_to_game = {}
        self.item_maps = {}
        self.available_games = []
        self.current_game_index = 0
        self.my_alias = slot
        self.is_connected = False
        self.initial_game_hint = None
        self.profiles = {} # slot -> password
        self.switching_slot = False
        self.tracked_players = []
        self.team = 0
        self.location_maps = {}
        self.item_groups = {}
        self.location_groups = {}
        self.hint_key = ""
        self.all_game_data = {} # Raw data from DataPackage
        self.hint_points = 0
        self.hint_cost = 0
        self.cached_hints = []
        self.slot_id = 0
        
        # Use absolute path for cache to be safe on Windows
        base_dir = os.path.dirname(os.path.abspath(__file__))
        self.cache_path = os.path.join(base_dir, "slot_cache.json")
        self.slot_cache = {}
        self.load_cache()

    def load_cache(self):
        try:
            if os.path.exists(self.cache_path):
                with open(self.cache_path, "r") as f:
                    self.slot_cache = json.load(f)
                    print(f"Loaded slot cache: {len(self.slot_cache)} entries", flush=True)
        except Exception as e: 
            print(f"Failed to load cache: {e}", flush=True)
            self.slot_cache = {}

    def save_cache(self):
        try:
            with open(self.cache_path, "w") as f:
                json.dump(self.slot_cache, f, indent=4)
                print(f"Saved cache: {self.slot} -> {self.slot_cache.get(self.slot)}", flush=True)
        except Exception as e: 
            print(f"Failed to save cache: {e}", flush=True)



    async def connect(self):
        # We only reset the hunting index when starting a fresh session or switching slots
        self.current_game_index = 0
        
        while True:
            is_switching = self.switching_slot
            if is_switching:
                self.current_game_index = 0 # Reset hunt on manual switch
                self.switching_slot = False
            
            # OPTIMIZATION: If localhost, try WS first to avoid SSL handshake delay/errors
            is_local = "localhost" in self.raw_server or "127.0.0.1" in self.raw_server
            if is_local:
                protocols = [f"ws://{self.raw_server}", f"wss://{self.raw_server}"]
            else:
                protocols = [f"wss://{self.raw_server}", f"ws://{self.raw_server}"]
                
            success = False
            for url in protocols:
                if self.switching_slot: break
                print(f"Connecting to {url}...", flush=True)
                try:
                    # increase max_size and use longer timeouts for large DataPackages
                    async with websockets.connect(
                        url, 
                        origin="http://localhost", 
                        ping_interval=30, 
                        ping_timeout=30, 
                        max_size=None
                    ) as ws:
                        print(f"Connected to {url}!", flush=True)
                        self.ws = ws
                        self.is_connected = True
                        success = True
                        
                        # Reset internal names but NOT current_game_index (it might be in the middle of a hunt)
                        self.player_names = {}
                        self.slot_to_game = {}
                        
                        await self.listen()
                        print("Session ended naturally.", flush=True)
                        break 
                except Exception as e:
                    if not self.switching_slot:
                        print(f"Connection attempt failed: {e}", flush=True)
                    self.is_connected = False
                    if self.ws:
                        try: await self.ws.close()
                        except: pass
                    self.ws = None
                
                if success or self.switching_slot: break

            # Determine wait time before retry
            wait_time = 1 if self.switching_slot or is_switching else 5
            await asyncio.sleep(wait_time)
            # DO NOT reset self.current_game_index here, it must persist across reconnections during a hunt

    async def identify(self, game_name=""):
        hello = [{
            "cmd": "Connect", "password": self.password, "game": game_name,
            "name": self.slot, "items_handling": 7, "uuid": "ArchipelagoBroadcastBridge",
            "tags": ["Tracker", "Text"], "version": AP_VERSION
        }]
        await self.ws.send(json.dumps(hello))

    async def listen(self):
        try:
            # Request DataPackage only once at the start of the session
            await self.ws.send(json.dumps([{"cmd": "GetDataPackage"}]))
            
            async for message in self.ws:
                packets = json.loads(message)
                for packet in packets:
                    cmd = packet.get("cmd")
                    # Log raw commands for debugging
                    try:
                        with open("broadcast/bridge_notifications.log", "a", encoding="utf-8") as f:
                            f.write(f"AP_CMD: {cmd} {json.dumps(packet)}\n")
                    except: pass
                    
                    if cmd == "RoomInfo":
                        self.available_games = packet.get("games", [])
                        self.hint_cost = packet.get("hint_cost", 0)
                        await broadcast_to_ui({"type": "hint_stats", "points": self.hint_points, "cost": self.hint_cost})
                        
                        # Priority 1: Cache for this specific slot name (Most accurate)
                        # Priority 2: Hint from command line (Global last successful)
                        initial_game = ""
                        if self.slot in self.slot_cache and self.slot_cache[self.slot] in self.available_games:
                            initial_game = self.slot_cache[self.slot]
                        elif hasattr(self, 'initial_game_hint') and self.initial_game_hint in self.available_games:
                            initial_game = self.initial_game_hint
                        
                        if initial_game:
                            # Move the initial game to the front of available_games to try it first
                            self.available_games = [g for g in self.available_games if g != initial_game]
                            self.available_games.insert(0, initial_game)
                        
                        # Safety check for index
                        if self.current_game_index >= len(self.available_games):
                            self.current_game_index = 0
                            
                        await self.identify(self.available_games[self.current_game_index] if self.available_games else "")

                    elif cmd == "RoomUpdate":
                        if "hint_points" in packet:
                            self.hint_points = packet["hint_points"]
                            await broadcast_to_ui({"type": "hint_stats", "points": self.hint_points, "cost": self.hint_cost})
                        if "hint_cost" in packet:
                            self.hint_cost = packet["hint_cost"]
                            await broadcast_to_ui({"type": "hint_stats", "points": self.hint_points, "cost": self.hint_cost})
                            
                    elif cmd == "DataPackage":
                        self.all_game_data = packet.get("data", {}).get("games", {})
                        
                        # Process item maps for all games (needed for hint translation)
                        for game, game_data in self.all_game_data.items():
                            item_map = game_data.get("item_name_to_id", {})
                            self.item_maps[game] = {str(v): k for k, v in item_map.items()}
                            
                            loc_map = game_data.get("location_name_to_id", {})
                            self.location_maps[game] = {str(v): k for k, v in loc_map.items()}

                        print(f"DataPackage received: {len(self.all_game_data)} games mapped.")
                        
                        # If we are already connected, broadcast the filtered data now
                        if self.is_connected:
                            await self.broadcast_current_game_data()
                    elif cmd == "ConnectionRefused":
                        errors = packet.get('errors', [])
                        if "InvalidGame" in errors and self.current_game_index < len(self.available_games) - 1:
                            # Silent hunt: don't print InvalidGame errors while we are still trying other games
                            self.current_game_index += 1
                            await self.identify(self.available_games[self.current_game_index])
                        else:
                            print(f"Connection refused: {errors}", flush=True)
                            # Other errors (InvalidPassword, IncompatibleVersion, etc)
                            await broadcast_to_ui({"type": "notification", "event": "error", "text": f"Connection Refused: {', '.join(errors)}"})
                    elif cmd == "Connected":
                        # Find our own alias (the name we have on the server)
                        self.slot_id = packet.get("slot", 0)
                        our_slot_id = self.slot_id
                        for p in packet.get("players", []):
                            alias = p["alias"]
                            self.player_names[str(p["slot"])] = alias
                            if p["slot"] == our_slot_id: self.my_alias = alias
                        
                        # Store game mapping for each slot
                        slot_info = packet.get("slot_info", {})
                        for s_id, info in slot_info.items():
                            self.slot_to_game[str(s_id)] = info.get("game", "Unknown")
                        
                        # Track hint points
                        self.hint_points = packet.get("hint_points", 0)
                        await broadcast_to_ui({"type": "hint_stats", "points": self.hint_points, "cost": self.hint_cost})
                        
                        my_game = self.slot_to_game.get(str(our_slot_id), "Unknown")
                        print(f"SUCCESS! Connected as {self.slot} (Game: {my_game})", flush=True)
                        
                        # Broadcast items/locations/groups for THIS game only
                        await self.broadcast_current_game_data()
                        
                        # Subscribe to hints
                        self.team = packet.get("team", 0)
                        self.hint_key = f"_read_hints_{self.team}_{self.slot_id}"
                        debug_text = f"Bridge: Subscribing to hint key: {self.hint_key}"
                        print(debug_text)
                        print(debug_text)
                        
                        await self.ws.send(json.dumps([
                            {"cmd": "SetNotify", "keys": [self.hint_key]},
                            {"cmd": "Get", "keys": [self.hint_key]}
                        ]))
                        
                        # Update slot cache
                        self.slot_cache[self.slot] = my_game
                        self.save_cache()
                        
                        # Load latest sync modes and durations
                        ov_mode, ob_mode = "all", "all"
                        ov_duration, ob_duration, ob_fade = 10, 15, False
                        try:
                            base_dir = os.path.dirname(os.path.abspath(__file__))
                            settings_path = os.path.join(os.path.dirname(base_dir), "broadcast_settings.json")
                            if os.path.exists(settings_path):
                                with open(settings_path, "r") as f:
                                    s = json.load(f)
                                    ov_mode = s.get("sync_mode", "all")
                                    ob_mode = s.get("obs_sync_mode", "all")
                                    ov_duration = s.get("overlay_duration", 10)
                                    ob_duration = s.get("obs_duration", 15)
                                    ob_fade = s.get("obs_fade", False)
                        except: pass

                        # Send full player list and profiles to UI
                        await broadcast_to_ui({
                            "type": "room_info", 
                            "players": list(self.player_names.values()),
                            "current_player": self.my_alias,
                            "profiles": list(self.profiles.keys()),
                            "current_slot": self.slot,
                            "overlay_sync_mode": ov_mode,
                            "obs_sync_mode": ob_mode,
                            "overlay_duration": ov_duration,
                            "obs_duration": ob_duration,
                            "obs_fade": ob_fade,
                            "tracked_players": self.tracked_players
                        })
                        
                        print(f"Connected to AP as {self.slot} ({my_game})")
                        
                        # Cache the successful game name in settings
                        try:
                            base_dir = os.path.dirname(os.path.abspath(__file__))
                            settings_path = os.path.join(os.path.dirname(base_dir), "broadcast_settings.json")
                            if os.path.exists(settings_path):
                                with open(settings_path, "r") as f:
                                    settings = json.load(f)
                                settings["last_game"] = my_game
                                with open(settings_path, "w") as f:
                                    json.dump(settings, f, indent=4)
                        except: pass
                    elif cmd == "PrintJSON":
                        await self.handle_print_json(packet)
                    elif cmd in ["Retrieved", "SetReply"]:
                        keys = packet.get("keys", {})
                        print(f"DEBUG: Received {cmd} with keys: {list(keys.keys())}")
                        print(f"DEBUG: Received {cmd} for keys {list(keys.keys())}")
                        for k, hints_raw in keys.items():
                            if "_read_hints" in k or "_hints" in k:
                                if isinstance(hints_raw, list):
                                    await self.process_hint_list(hints_raw)
        except Exception as e:
            print(f"BRIDGE ERROR in listen loop: {e}", flush=True)

    async def broadcast_current_game_data(self, target_ws=None):
        # Find which game WE are currently playing
        our_slot_id = None
        for s_id, alias in self.player_names.items():
            if alias == self.my_alias:
                our_slot_id = s_id
                break
        
        if not our_slot_id: return
        
        my_game = self.slot_to_game.get(our_slot_id)
        if not my_game: return

        # We only want items from our game + core Archipelago items
        target_games = {my_game, "Archipelago"}
        
        print(f"Broadcasting autocomplete data for your game: {my_game}")
        
        all_items = set()
        all_locations = set()
        all_groups = set()
        
        for game in target_games:
            if game in self.all_game_data:
                game_data = self.all_game_data[game]
                all_items.update(game_data.get("item_name_to_id", {}).keys())
                all_locations.update(game_data.get("location_name_to_id", {}).keys())
                all_groups.update(game_data.get("item_name_groups", {}).keys())
                all_groups.update(game_data.get("location_name_groups", {}).keys())

        msg_items = {"type": "item_list", "items": sorted(list(all_items))}
        msg_locs = {"type": "location_list", "locations": sorted(list(all_locations))}
        msg_groups = {"type": "groups_list", "groups": sorted(list(all_groups))}

        if target_ws:
            await target_ws.send(json.dumps(msg_items))
            await target_ws.send(json.dumps(msg_locs))
            await target_ws.send(json.dumps(msg_groups))
        else:
            await broadcast_to_ui(msg_items)
            await broadcast_to_ui(msg_locs)
            await broadcast_to_ui(msg_groups)

    async def process_hint_list(self, hints_raw):
        debug_text = f"Bridge: Processing {len(hints_raw)} hints from server..."
        print(debug_text)
        print(debug_text)
        
        processed_hints = []
        for h in hints_raw:
            # Archipelago Hint object structure:
            # finding_player, receiving_player, item, location, found, entrance
            p_finder_id = str(h.get("finding_player", ""))
            p_owner_id = str(h.get("receiving_player", ""))
            item_id = str(h.get("item", ""))
            loc_id = str(h.get("location", ""))
            found = h.get("found", False)
            
            # Translate IDs to names
            p_finder = self.player_names.get(p_finder_id, f"Player {p_finder_id}")
            p_owner = self.player_names.get(p_owner_id, f"Player {p_owner_id}")
            
            # Smart item lookup
            item_name = ""
            target_game = self.slot_to_game.get(p_owner_id)
            if target_game and target_game in self.item_maps:
                item_name = self.item_maps[target_game].get(item_id)
            if not item_name: item_name = f"Item {item_id}"
            
            # Smart location lookup
            location_name = ""
            finder_game = self.slot_to_game.get(p_finder_id)
            if finder_game and finder_game in self.location_maps:
                location_name = self.location_maps[finder_game].get(loc_id)
            if not location_name: location_name = f"Location {loc_id}"
            
            processed_hints.append({
                "item": item_name,
                "location": location_name,
                "owner": p_owner,
                "finder": p_finder,
                "found": found
            })
            
        print(f"DEBUG: Processed {len(processed_hints)} hints from Archipelago.")
        self.cached_hints = processed_hints
        await broadcast_to_ui({
            "type": "hint_list",
            "hints": self.cached_hints
        })

    async def handle_print_json(self, packet):
        msg_type = packet.get("type", "Unknown")
        parts = packet.get("data", [])
        
        # Process hints
        if msg_type == "Hint":
            item_name, location_name, p_owner, p_finder = "", "", "", ""
            found = packet.get("found", False)
            
            for part in parts:
                p_type, text = part.get("type"), part.get("text", "")
                if p_type == "item_id":
                    target_player_id = str(part.get("player", ""))
                    target_game = self.slot_to_game.get(target_player_id)
                    if target_game and target_game in self.item_maps:
                        item_name = self.item_maps[target_game].get(text)
                    if not item_name: item_name = f"Item {text}"
                elif p_type == "item_name": item_name = text
                elif p_type == "location_id": 
                    # Smart location lookup
                    finder_id = str(part.get("player", ""))
                    finder_game = self.slot_to_game.get(finder_id)
                    if finder_game and finder_game in self.location_maps:
                        location_name = self.location_maps[finder_game].get(text)
                    
                    # Fallback lookup in all known games
                    if not location_name:
                        for g_map in self.location_maps.values():
                            if text in g_map:
                                location_name = g_map[text]
                                break
                    
                    if not location_name: location_name = f"Location {text}"
                elif p_type == "location_name": location_name = text
                elif p_type == "player_id":
                    p_name = self.player_names.get(str(text), f"Player {text}")
                    # The first player_id in a hint is usually the owner, the second is the finder
                    if not p_owner: p_owner = p_name
                    else: p_finder = p_name
            
            if not p_owner: p_owner = "Someone"
            if not p_finder: p_finder = "Someone"

            new_hint = {
                "item": item_name,
                "location": location_name,
                "owner": p_owner,
                "finder": p_finder,
                "found": found
            }
            
            # --- FILTER LOGIC ---
            if self.filter_mode == "personal":
                if p_owner != self.my_alias:
                    return # Skip hints for other players' items

            # Update cache (avoid duplicates)
            exists = any(h["item"] == item_name and h["location"] == location_name and h["owner"] == p_owner for h in self.cached_hints)
            if not exists:
                self.cached_hints.insert(0, new_hint)

            await broadcast_to_ui({
                "type": "notification",
                "event": "hint",
                "item": item_name,
                "location": location_name,
                "owner": p_owner,
                "finder": p_finder,
                "found": found,
                "raw_data": packet
            })
            return
            
        if msg_type in ["ItemSend", "ItemReceive"] or any(p.get("type") in ["item_id", "item_name"] for p in parts):
            item_name, p_from, p_to, item_class = "", "Someone", "Someone", 1
            found_players = []
            for part in parts:
                p_type, text = part.get("type"), part.get("text", "")
                if p_type == "item_id":
                    # Smart lookup: find the game name for the specific player listed in the item part
                    target_player_id = str(part.get("player", ""))
                    target_game = self.slot_to_game.get(target_player_id)
                    
                    if target_game and target_game in self.item_maps:
                        item_name = self.item_maps[target_game].get(text)
                    
                    # Fallback if specific lookup failed
                    if not item_name:
                        for game in self.item_maps:
                            if text in self.item_maps[game]:
                                item_name = self.item_maps[game][text]
                                break
                    
                    if not item_name:
                        item_name = f"Item {text}"
                    
                    flags = part.get("flags", 0)
                    item_class = 0 if flags & 1 else (1 if flags & 2 else (3 if flags & 4 else 2))
                elif p_type == "item_name": item_name = text
                elif p_type == "player_id":
                    p_name = self.player_names.get(str(text), f"Player {text}")
                    found_players.append(p_name)
            
            # Use explicit packet data where available for accurate sender/receiver
            item_data = packet.get("item", {})
            if isinstance(item_data, dict) and "player" in item_data:
                p_from = self.player_names.get(str(item_data["player"]), "Someone")
            elif len(found_players) >= 1:
                p_from = found_players[0]

            recv_col = packet.get("receiving")
            if recv_col:
                p_to = self.player_names.get(str(recv_col), "Someone")
            elif len(found_players) >= 2:
                p_to = found_players[1]
            elif len(found_players) == 1:
                p_to = found_players[0] # Finding their own item

            # --- FILTER LOGIC ---
            if self.filter_mode == "personal":
                # Only show if we are the sender OR the receiver
                if self.my_alias != p_from and self.my_alias != p_to:
                    return # Skip this item

            # --- SMART ROLE DETECTION ---
            is_me_receiving = (p_to == self.my_alias)
            is_me_sending = (p_from == self.my_alias)

            if is_me_receiving:
                event = "receive"
            elif is_me_sending:
                event = "send"
            else:
                event = "receive" if msg_type == "ItemReceive" else "send"

            await broadcast_to_ui({
                "type": "notification", 
                "event": event, 
                "item": item_name, 
                "from": p_from, 
                "to": p_to, 
                "class": item_class,
                "is_mine": (is_me_receiving or is_me_sending),
                "my_alias": self.my_alias, # Send current alias to UI
                "raw_data": packet # Add raw data for UI debugging
            })

def kill_port(port):
    """Forcefully close any process using the specified port on Windows."""
    import subprocess
    import os
    try:
        # Find the PID using the port
        cmd = f"netstat -ano | findstr LISTENING | findstr :{port}"
        output = subprocess.check_output(cmd, shell=True).decode()
        for line in output.splitlines():
            parts = line.strip().split()
            if len(parts) >= 5 and parts[1].endswith(f":{port}"):
                pid = parts[-1]
                if int(pid) != os.getpid():
                    print(f"Closing existing bridge on port {port} (PID {pid})...")
                    subprocess.run(["taskkill", "/F", "/T", "/PID", pid], capture_output=True)
    except Exception: pass

async def main():
    # ... (args parsing) ...
    parser = argparse.ArgumentParser()
    parser.add_argument("--server", required=True)
    parser.add_argument("--slot", required=True)
    parser.add_argument("--password")
    parser.add_argument("--port", type=int, default=8089)
    parser.add_argument("--mode", default="all", choices=["all", "personal"])
    parser.add_argument("--game") # Optional hinted game
    parser.add_argument("--multi") # Comma separated multi-slots (Slot:Pass)
    parser.add_argument("--tracked") # Comma separated tracked players
    args = parser.parse_args()
    
    kill_port(args.port)
    
    ap_client = ArchipelagoClient(args.server, args.slot, args.password, args.mode)
    if args.game: ap_client.initial_game_hint = args.game
    if args.multi:
        parts = [p.strip() for p in args.multi.split(",") if p.strip()]
        for p in parts:
            if ":" in p:
                s, pw = p.split(":", 1)
                ap_client.profiles[s.strip()] = pw.strip()
            else:
                ap_client.profiles[p.strip()] = ""
        # Ensure our main slot is in the profiles too
        if args.slot not in ap_client.profiles:
            ap_client.profiles[args.slot] = args.password or ""
    
    if args.tracked:
        ap_client.tracked_players = [p.strip() for p in args.tracked.split(",") if p.strip()]
    
    # Define the websocket handler to have access to the client
    async def bridge_handler(websocket):
        websocket.ap_client = ap_client
        await register_ui(websocket)

    print(f"\n--- Bridge Starting ({args.mode} mode) ---", flush=True)
    async with websockets.serve(bridge_handler, "localhost", args.port):
        await ap_client.connect()

if __name__ == "__main__":
    try: asyncio.run(main())
    except KeyboardInterrupt: print("\nStopped.")
