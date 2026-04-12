# Connecting to OBS via WebSocket

For bot triggers to drive OBS (switch scenes, toggle sources and filters, control media, etc.), OBS needs to listen on a local WebSocket server and this app needs to know its password.

One-time setup, ~2 minutes.

## 1. Enable the WebSocket server in OBS

The WebSocket server is built into OBS starting from version **28.0** (released in 2022) — no plugins required.

1. Open OBS
2. In the top menu: **Tools → WebSocket Server Settings**.
3. Check **Enable WebSocket Server**
4. **Server Port**: leave the default `4455` unless you have a reason to change it
5. **Enable Authentication**: keep it on — this protects OBS from connections by browsers and other apps on your machine
6. Click **Show Connect Info** — a dialog opens with the password. Copy the password, you'll need it in step 2.
7. Click **Apply** → **OK**

> **Note:** every time you click **Generate New Password** in OBS, the old password stops working. If you do that, you'll need to copy the new one and update it in the app.

## 2. Enter connection details in the app

1. Open **Settings → OBS Actions** from the sidebar
2. In the page header, flip the **OBS Actions → Enabled** toggle (that's the integration master switch)
3. Fill out the **"OBS connection"** card:
   - **Host**: `localhost` (if OBS runs on the same machine as this app)
   - **Port**: `4455` (or whatever you set in OBS)
   - **Password**: paste the password you copied in step 1
4. (Optional) Enable **Connect on startup** — the app will then automatically connect to OBS at launch
5. Click **Save settings**
6. Click **Connect**

If everything worked, a green **"Connected"** badge appears on the right side of the header. A matching green dot shows up next to "OBS Actions" in the sidebar — a live connection indicator.

## 3. Troubleshooting

**"OBS not reachable"** (code 1006)
OBS isn't running, or its WebSocket server is disabled. Verify OBS is actually running and step 1 was completed (including the **Apply** button). Also check that the port matches the one set in OBS.

**"Auth failed"** (codes 4008 / 4009)
Wrong or empty password. Go back to OBS → **Show Connect Info** → copy the current password → paste it into the app → **Save settings** → **Connect**.

**Any other error code**
Usually this means your OBS is too old (pre-28.0) or has an incompatible built-in WebSocket version. Update OBS to the latest stable release.

## 4. What's next

Once you're connected:

- In the **"OBS connection"** card, click **"Refresh OBS cache"** — the app pulls the list of scenes, sources, filters and hotkeys that will populate the action editor dropdowns
- Click **"Add action"** and build your first OBS action: pick an operation (e.g. **"Switch scene"**) and select the target scene from the dropdown
- You can test any action directly from the list via the **"Test"** button — OBS reacts immediately, without wiring it to a trigger first
- A finished action can be attached to a trigger in **Settings → Bot → Triggers** — pick action type **"OBS action"** and select your entry from the dropdown

While OBS is connected, deleting or recreating a source/scene is safe — the app fetches the fresh list the next time the editor opens.
