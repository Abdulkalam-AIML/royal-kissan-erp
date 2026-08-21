# Royal Kissan ERP - TVS RP3230ABW Print Agent Guide

This repository contains the enterprise **ESC/POS Thermal Printing System** for the **TVS-E RP3230ABW** thermal receipt printer over WiFi TCP/IP.

## Printing Architecture

```
Royal Kissan ERP (Next.js 15)
       ↓
API Route (/api/print) OR Local Print Agent (localhost:3002)
       ↓
TCP Socket Connection (net.Socket)
       ↓
TVS RP3230ABW Printer (192.168.1.1:9100)
       ↓
Binary ESC/POS Commands (Logo + Items + Totals + QR + Auto Cut)
```

---

## 1. Running the Local Print Agent (Optional Fallback)

If the ERP is hosted on Vercel or a remote cloud server that cannot directly access your local WiFi LAN IP (`192.168.1.1`), run the lightweight Node.js Local Print Agent on the local POS computer.

### Start the Agent:

```bash
node scripts/print-agent.js
```

- **URL**: `http://localhost:3002`
- **Default Printer Target**: `192.168.1.1:9100`
- **Endpoints**:
  - `POST /print` - Send base64 ESC/POS payload
  - `GET /health` - Ping printer network connection

---

## 2. Printer Settings Configuration

Navigate to **System Settings $\rightarrow$ Printer Setup** (`/settings/printer`) in the ERP menu to configure:
- **Printer IP**: `192.168.1.1` (Default)
- **Port**: `9100` (Default raw ESC/POS port)
- **Paper Width**: `80mm`
- **Character Width**: `48` characters per line
- **Auto Cut**: Enabled (`GS V`)
- **Cash Drawer**: Enabled (`ESC p`)

### Trigger Test Print:
Click **Print Test Ticket** on `/settings/printer` to test the connection.

---

## 3. Billing Workflow (Zero Browser Print Dialog)

1. Open **Billing** (`/billing`).
2. Add customer details and line items.
3. Action Buttons:
   - **Preview**: View exact 48-column 80mm thermal receipt output simulation.
   - **Save**: Saves bill into database without printing.
   - **Save & Print**: Saves bill, generates ESC/POS binary data, sends directly over TCP socket to `192.168.1.1:9100`, auto-cuts paper, and displays *"Bill Printed Successfully"*.
   - **Reprint**: Instant duplicate reprint of last bill over ESC/POS.
