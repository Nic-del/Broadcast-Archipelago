import argparse
import subprocess
import json
import os
import sys
import time

SETTINGS_FILE = "broadcast_settings.json"

# OPTIMIZATION: Set low priority so this launcher doesn't steal CPU from the game
try:
    if os.name == 'nt':
        import win32api, win32process, win32con
        handle = win32api.OpenProcess(win32con.PROCESS_ALL_ACCESS, True, os.getpid())
        win32process.SetPriorityClass(handle, win32process.BELOW_NORMAL_PRIORITY_CLASS)
except: pass

def load_settings():
    defaults = {
        "server": "", "slot": "", "password": "", "mode": "personal",
        "win_w": 400, "win_h": 600, "win_x": -1, "win_y": -1,
        "display_index": 0
    }
    if os.path.exists(SETTINGS_FILE):
        try:
            with open(SETTINGS_FILE, "r") as f:
                data = json.load(f)
                defaults.update(data)
        except: pass
    return defaults

def save_settings(settings):
    with open(SETTINGS_FILE, "w") as f:
        json.dump(settings, f, indent=4)

def main():
    parser = argparse.ArgumentParser(description="Headless Broadcast Launcher")
    parser.add_argument("--server", help="Archipelago server address (e.g., archipelago.gg:12345)")
    parser.add_argument("--slot", help="Slot name")
    parser.add_argument("--password", help="Server password")
    parser.add_argument("--mode", choices=["all", "personal", "obs"], help="Tracking mode")
    
    args = parser.parse_args()
    
    settings = load_settings()
    
    # Update settings from CLI if provided
    updated = False
    if args.server: settings["server"] = args.server; updated = True
    if args.slot: settings["slot"] = args.slot; updated = True
    if args.password is not None: settings["password"] = args.password; updated = True
    if args.mode: settings["mode"] = args.mode; updated = True
    
    if updated:
        save_settings(settings)
        print("Settings updated from command line arguments.")
        
    if not settings.get("server") or not settings.get("slot"):
        print("Error: Server and Slot must be configured either in broadcast_settings.json or via arguments.")
        sys.exit(1)
        
    print(f"Starting broadcast system for {settings['slot']} on {settings['server']} (Mode: {settings['mode']})...")
    
    procs = []
    
    try:
        # 0. Start Dev Server if in OBS mode (needed for the web page)
        if settings["mode"] == "obs":
            print("[0/3] Starting Dev Server for OBS Web Page (no-open)...")
            procs.append(subprocess.Popen(["cmd", "/c", "npx vite --no-open"], cwd="broadcast-app", shell=True))
            # OBS Mode logic: We don't open the browser automatically anymore as requested
            # Users will manually use the URL in OBS as a browser source

        # 1. Start or check Production Build of Frontend
        print("\n[1/3] Checking Frontend Build...")
        dist_path = os.path.join("broadcast-app", "dist")
        if not os.path.exists(dist_path) or not os.path.exists(os.path.join(dist_path, "index.html")):
            print("Building Frontend for the first time... (This may take a minute)")
            subprocess.run(["cmd", "/c", "npm run build"], cwd="broadcast-app", shell=True)
            print("Finished building Frontend!")
        else:
            if settings["mode"] != "obs":
                print("Frontend Build exists. Skipping dev server for better game performance.")
        
        # 2. Start Bridge
        print("[2/3] Starting AP Bridge Connection...")
        bridge_mode = "all" if settings["mode"] in ["all", "obs"] else "personal"
        bridge_cmd = [sys.executable, "-u", "broadcast/bridge.py", "--server", settings["server"], "--slot", settings["slot"], "--mode", bridge_mode]
        if settings.get("password"):
            bridge_cmd.extend(["--password", settings["password"]])
        procs.append(subprocess.Popen(bridge_cmd))
        
        # 3. Wait and Start Electron Overlay
        sys.stdout.write("Launching UI overlay... ")
        sys.stdout.flush()
        time.sleep(0.5) # Réduit de 2s à 0.5s pour plus de réactivité
        
        print("\r[3/3] Starting Electron Overlay UI...        ")
        procs.append(subprocess.Popen(["cmd", "/c", "npm run overlay"], cwd="broadcast-app", shell=True))
        
        print("\n>>> System is completely operational! <<<")
        print(">>> Press Ctrl+C in this console to gracefully stop all processes. <<<\n")
        
        # Keep main thread alive
        while True:
            time.sleep(1)
            
    except KeyboardInterrupt:
        print("\n\nShutting down system...")
    finally:
        for p in procs:
            try:
                subprocess.run(["taskkill", "/F", "/T", "/PID", str(p.pid)], capture_output=True)
            except: pass
        
        os.system("taskkill /F /IM node.exe /T >nul 2>&1")
        os.system("taskkill /F /IM electron.exe /T >nul 2>&1")
        print("Cleaned up all background processes.")

if __name__ == "__main__":
    main()
