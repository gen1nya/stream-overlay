# Mobile Chat

Mobile Chat lets you read and moderate your stream chat from a smartphone. It works over local network — the phone and the computer must be on the same Wi-Fi.

Setup takes less than a minute.

## 1. Enable Mobile Chat in the app

1. Open **Settings → Mobile Chat** in the sidebar
2. Turn on the toggle — the app will start a local server and show a QR code
3. Note the **access code** (8 characters) — you will need it if you have to enter it manually

## 2. Connect your phone

### Option 1: QR code (recommended)

1. Open the camera app on your phone
2. Point it at the QR code shown in the settings
3. Follow the link — the app will open and connect automatically

> **Tip:** after connecting, add the page to your home screen (in Safari: Share → Add to Home Screen). It will open as a standalone app with its own icon.

### Option 2: manual entry

If the QR code is not available (for example, you are controlling the computer remotely):

1. Open the browser on your phone
2. Enter the address shown in the settings (e.g. `http://192.168.1.10:42010`)
3. On the connection screen enter the **access code** from the desktop app settings
4. Tap **Connect**

## 3. Features

### Chat

- Messages are displayed in real time with badges and emotes
- Follows, channel point redemptions, and raids appear as distinct cards with color coding

### Moderation

Tap a **username** in chat to open a profile card with actions:

- **Timeout** — presets from 1 minute to 24 hours
- **Ban** — permanent ban (with confirmation)
- **Unban** — lift a ban
- **Shoutout** — recommend the channel to viewers
- **Moderator** and **VIP** — toggle roles
- **Delete message** — delete a specific message (also available via the `×` button on each chat message)

### Connection debugging

If the connection is not established, tap the **Log** button in the header — a panel will open showing technical details: address, code, WebSocket status, error codes.

## 4. Security

- The app works **only over local network** — it cannot be accessed from the internet
- Access is protected by a code that is generated automatically and stored on your computer
- The **"Change"** button in the desktop app settings lets you regenerate the code — all previously connected devices will lose access

## 5. Troubleshooting

**Phone cannot connect**
Make sure the phone and computer are on the same Wi-Fi network. Some routers isolate devices from each other (AP Isolation) — check your router settings.

**App shows "Connecting…" and never reaches "Online"**
Open the Log panel and check for errors. If `GET /health` fails — it is a network issue. If health succeeds but WebSocket does not — try reloading the page or reconnecting.

**After adding to iOS home screen the app asks for the code again**
This should not happen — the code is preserved in the URL. If it does, scan the QR code again with the camera and re-add to the home screen.
