import argparse
import subprocess
import json
import os
import sys
import time

# Use absolute path relative to the script to ensure settings are found regardless of CWD
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
SETTINGS_FILE = os.path.join(SCRIPT_DIR, "broadcast_settings.json")

# OPTIMIZATION: Set low priority so this launcher doesn't steal CPU from the game
try:
    if os.name == 'nt':
        import win32api, win32process, win32con
        handle = win32api.OpenProcess(win32con.PROCESS_ALL_ACCESS, True, os.getpid())
        win32process.SetPriorityClass(handle, win32process.BELOW_NORMAL_PRIORITY_CLASS)
except: pass

def load_settings():
    # Aligned with BroadCast-Archipelago.pyw defaults
    defaults = {
        "server": "archipelago.gg:", "slot": "", "password": "", "sync_mode": "all",
        "win_w": 400, "win_h": 600, "win_x": -1, "win_y": -1, "display_index": 0,
        "last_game": "", "multi_slots": "",
        "sync_mode": "all", "enable_overlay": True, "enable_obs": False
    }
    if os.path.exists(SETTINGS_FILE):
        try:
            with open(SETTINGS_FILE, "r") as f:
                data = json.load(f)
                # Legacy compatibility: if 'mode' exists but not 'sync_mode', use 'mode'
                if "mode" in data and "sync_mode" not in data:
                    data["sync_mode"] = data["mode"]
                defaults.update(data)
        except Exception as e:
            print(f"Warning: Failed to load settings from {SETTINGS_FILE}: {e}")
    else:
        print(f"Notice: Settings file not found at {SETTINGS_FILE}. Using defaults.")
    return defaults

def save_settings(settings):
    try:
        with open(SETTINGS_FILE, "w") as f:
            json.dump(settings, f, indent=4)
    except Exception as e:
        print(f"Error saving settings: {e}")

def main():
    parser = argparse.ArgumentParser(description="Headless Broadcast Launcher")
    parser.add_argument("--server", help="Archipelago server address (e.g., archipelago.gg:12345)")
    parser.add_argument("--slot", help="Slot name")
    parser.add_argument("--password", help="Server password")
    parser.add_argument("--mode", choices=["all", "personal", "obs", "filtered"], help="Tracking mode (alias for sync_mode)")
    parser.add_argument("--obs", action="store_true", help="Enable OBS Web Server")
    parser.add_argument("--no-obs", action="store_true", help="Disable OBS Web Server")
    parser.add_argument("--obs-mode", choices=["all", "personal", "filtered"], help="Tracking mode for OBS specifically")
    parser.add_argument("--multi", help="Multi-slots (Slot1:Pass1, Slot2:Pass2)")
    parser.add_argument("--tracked", help="Tracked players list (comma separated)")
    parser.add_argument("--overlay", action="store_true", help="Force enable overlay")
    parser.add_argument("--no-overlay", action="store_true", help="Force disable overlay")
    
    args = parser.parse_args()
    
    settings = load_settings()
    
    # Update settings from CLI if provided
    updated = False
    if args.server: settings["server"] = args.server; updated = True
    if args.slot: settings["slot"] = args.slot; updated = True
    if args.password is not None: settings["password"] = args.password; updated = True
    
    # Map --mode argument to sync_mode
    if args.mode:
        if args.mode == "obs":
            settings["enable_obs"] = True
            # We don't change sync_mode if it was just 'obs' to enable features,
            # unless sync_mode isn't set yet.
        else:
            settings["sync_mode"] = args.mode
        updated = True
        
    if args.obs: settings["enable_obs"] = True; updated = True
    if args.no_obs: settings["enable_obs"] = False; updated = True
    if args.obs_mode: settings["obs_sync_mode"] = args.obs_mode; updated = True
    if args.multi: settings["multi_slots"] = args.multi; updated = True
    if args.tracked: settings["tracked_players"] = args.tracked; updated = True
    
    if args.overlay: settings["enable_overlay"] = True; updated = True
    if args.no_overlay: settings["enable_overlay"] = False; updated = True
    
    if updated:
        save_settings(settings)
        print("Settings updated from command line arguments.")
        
    if not settings.get("server") or settings.get("server") == "archipelago.gg:" or not settings.get("slot"):
        print("\n[!] Error: System not configured.")
        print(f"Please configure settings in the Control Center (BroadCast-Archipelago.pyw)")
        print(f"or use arguments: --server <addr> --slot <name>")
        print(f"Checked path: {SETTINGS_FILE}")
        sys.exit(1)
        
    sync_mode = settings.get("sync_mode", "all")
    print(f"Starting broadcast system for {settings['slot']} on {settings['server']}...")
    print(f"  - Sync Mode: {sync_mode}")
    print(f"  - Overlay: {'Enabled' if settings.get('enable_overlay') else 'Disabled'}")
    print(f"  - OBS Web Server: {'Enabled' if settings.get('enable_obs') else 'Disabled'}")
    
    procs = []
    
    try:
        # 0. Start Dev Server if needed (Vite)
        # Vite is needed if either Overlay is enabled (for dev mode) or OBS Web Server is enabled
        dist_path = os.path.join(SCRIPT_DIR, "broadcast-app", "dist")
        needs_vite = settings.get("enable_obs") or (settings.get("enable_overlay") and not os.path.exists(dist_path))
        
        if needs_vite:
            print("\n[0/3] Starting Vite Dev Server (for OBS/Background) on port 5173...")
            # We use shell=True for npx on Windows
            procs.append(subprocess.Popen(["cmd", "/c", "npx vite --no-open"], cwd=os.path.join(SCRIPT_DIR, "broadcast-app"), shell=True))

        # 1. Check/Build Frontend if Overlay is enabled
        if settings.get("enable_overlay"):
            print("[1/3] Checking Frontend Build...")
            if not os.path.exists(dist_path) or not os.path.exists(os.path.join(dist_path, "index.html")):
                print("      Building Frontend for the first time... (This may take a minute)")
                subprocess.run(["cmd", "/c", "npm run build"], cwd=os.path.join(SCRIPT_DIR, "broadcast-app"), shell=True)
                print("      Finished building Frontend!")
        
        # 2. Start Bridge
        print("[2/3] Starting AP Bridge Connection...")
        
        # Determine bridge mode: If EITHER is 'all' or 'filtered', bridge must be 'all' to get the data
        # This logic matches BroadCast-Archipelago.pyw
        bridge_mode = "all"
        if settings.get("sync_mode") == "personal" and settings.get("obs_sync_mode", "all") == "personal":
            bridge_mode = "personal"
            
        bridge_script = os.path.join(SCRIPT_DIR, "broadcast", "bridge.py")
        bridge_cmd = [sys.executable, "-u", bridge_script, "--server", settings["server"], "--slot", settings["slot"], "--mode", bridge_mode]
        
        if settings.get("password"):
            bridge_cmd.extend(["--password", settings["password"]])
        if settings.get("last_game"):
            bridge_cmd.extend(["--game", settings["last_game"]])
        if settings.get("multi_slots"):
            bridge_cmd.extend(["--multi", settings["multi_slots"]])
        if settings.get("tracked_players"):
            bridge_cmd.extend(["--tracked", settings["tracked_players"]])
            
        procs.append(subprocess.Popen(bridge_cmd))
        
        # 3. Start Electron Overlay if enabled
        if settings.get("enable_overlay"):
            sys.stdout.write("Launching UI overlay... ")
            sys.stdout.flush()
            time.sleep(1) # Wait a bit for bridge
            
            print("\r[3/3] Starting Electron Overlay UI...        ")
            procs.append(subprocess.Popen(["cmd", "/c", "npm run overlay"], cwd=os.path.join(SCRIPT_DIR, "broadcast-app"), shell=True))
        else:
            print("[3/3] Electron Overlay disabled in settings. Skipping.")
        
        print("\n>>> System is operational! <<<")
        print(">>> Press Ctrl+C in this console to stop all processes. <<<\n")
        
        # Keep main thread alive
        while True:
            # Check if bridge is still running
            if procs:
                for p in procs:
                    if p.poll() is not None and p.poll() != 0:
                        print(f"\n[!] A background process exited unexpectedly (Code: {p.poll()})")
            time.sleep(2)
            
    except KeyboardInterrupt:
        print("\n\nShutting down system...")
    finally:
        for p in procs:
            try:
                subprocess.run(["taskkill", "/F", "/T", "/PID", str(p.pid)], capture_output=True)
            except: pass
        
        print("Cleaned up background processes.")

if __name__ == "__main__":
    main()
