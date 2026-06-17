# Cognentrz — Premium Mobile App Design Guide

## 🎨 New Design System

### Color Palette
- **Primary**: Emerald (#10b981) — Trust, growth, agriculture
- **Secondary**: Blue (#3b82f6) — Innovation, clarity
- **Accent**: Amber (#f59e0b) — Attention, warnings
- **Success**: Emerald (#10b981)
- **Warning**: Amber (#f59e0b)
- **Danger**: Red (#ef4444)

### Dark & Light Mode
The app now supports **true dark/light mode** with professional color schemes:
- **Light Mode**: Clean white backgrounds, dark text, subtle borders
- **Dark Mode**: Professional dark backgrounds (#0f1419), light text, minimalist design

Toggle theme: Click the sun/moon icon on the home page header

### Typography
- **Headlines**: Bold, gradient text (Emerald → Blue)
- **Body**: Inter font family, clean hierarchy
- **Sizes**: Responsive from 12px to 32px

---

## 📱 Pages & Features

### 1. **Home Page** (`/`)
**🎯 Purpose**: Dashboard showing key metrics and quick actions

**Features**:
- Animated background gradients
- Real-time statistics:
  - Active farm count
  - Average soil health score
  - Active alerts
  - Total farm area
- Quick action menu (4 main features)
- Smooth Framer Motion animations on scroll
- Welcome message with user name

**What's New**:
- Staggered container animations
- Hover effects on cards (scale + gradient)
- Professional gradient icons instead of emojis
- Dark/light mode toggle

---

### 2. **Farms Page** (`/farms`)
**🎯 Purpose**: View, search, and manage all farms

**Features**:
- Search bar with instant filtering
- Farm cards showing:
  - Farm name & crop type
  - Area (hectares)
  - Health score (0-100)
  - Health indicator bar (visual)
  - Last known moisture level
  - Visual status label (Excellent/Good/Needs Care/Critical)
- "Add Farm" button (floating action)
- Responsive grid layout

**What's New**:
- Professional health score cards with gradients
- Animated progress bars on card load
- Hover effects with scale & color transitions
- Status-based color coding (green → yellow → red)
- Search functionality with real-time results

---

### 3. **Farm Detail Page** (`/farms/[id]`)
**🎯 Purpose**: In-depth analysis of a single farm

**Features**:
- 6 tabs (redesigned):
  1. **Overview**: Health metrics, vegetation indices
  2. **🆕 Trends**: Time-series charts (NDVI, moisture, LST, soil health history)
  3. **Nutrients**: Soil chemistry, texture analysis
  4. **Predictions**: 12-month forecast charts
  5. **AI Tips**: Grounded recommendations (now citing specific metrics)
  6. **Weather**: Current & 7-day forecast
- Real-time soil health ring
- Satellite analysis button
- Health breakdown metrics

**What's New**:
- Trends tab (visualizes farm history with charts)
- NDVI map overlay button (on map page)
- Grounded AI recommendations (based on specific values)
- Anomaly alerts (if NDVI drops >0.1, LST spikes >4°C, etc.)
- Real trend calculation (vs previous analysis)

---

### 4. **Satellite Map** (`/map`)
**🎯 Purpose**: Live satellite view of all farms with NDVI overlay

**Features**:
- Interactive Leaflet map
- Farm boundary polygons color-coded by health
- Farm selector list (tap to fly to farm)
- Layer toggle: Satellite / Terrain / Enhanced (NDVI)
- 🆕 **NDVI Overlay Button**: Click to render LIVE satellite-derived NDVI as a color overlay
  - Red = crop stress
  - Green = healthy vegetation
  - Includes legend showing color scale

**What's New**:
- Professional map UI
- NDVI overlay with Earth Engine integration
- Premium map controls
- Better farm polygon rendering
- Smooth transitions between farms

---

### 5. **AI Reports** (`/reports`)
**🎯 Purpose**: Analyze and visualize soil health data

**Features**:
- Farm selector (dropdown)
- Key metrics cards:
  - Soil Health score
  - Fertility score
- Health breakdown bar chart
- Detailed metrics table:
  - Moisture Level
  - NDVI Index
  - Land Surface Temperature
  - Erosion Risk
- AI Recommendations section

**What's New**:
- Professional chart rendering (Recharts)
- Dark/light mode charts
- Responsive grid layout
- Icon + data pairing
- Better visual hierarchy

---

### 6. **Smart Alerts** (`/alerts`)
**🎯 Purpose**: Centralized alert management

**Features**:
- All farm alerts in one place
- Alert types:
  - 🔴 **Critical**: Soil health < 40
  - 🟠 **Warning**: NDVI drops >0.1, LST spikes >4°C, moisture drops >0.15
  - 🔵 **Info**: General notifications
- Severity badges
- Dismiss button (delete alert)
- Timestamp on each alert
- Active alert counter

**What's New**:
- Dedicated alerts page (replaces coming soon)
- Real anomaly detection from satellite data
- Color-coded severity levels
- Professional alert cards
- Actionable (can dismiss)

---

### 7. **Settings Page** (`/settings`)
**🎯 Purpose**: User preferences & account management

**Features** (all functional, no "coming soon"):
- ✅ **Profile Settings**:
  - Edit name, email, phone
  - Save changes button (POST to `/api/auth/profile`)
- ✅ **Password & Security**:
  - Change password with current/new/confirm fields
  - Show/hide password toggle
  - Secure password update
- ✅ **Notifications**:
  - Toggle critical alerts
  - Toggle weekly reports
  - Toggle AI recommendations
  - Save preferences
- ✅ **Display**:
  - Dark/Light mode toggle
  - Shows current mode
- ✅ **Account Actions**:
  - Sign out button (logs user out & redirects to login)

**What's New**:
- 100% functional (no placeholders)
- Professional form design
- Password visibility toggle
- Notification preferences
- Success/error messages
- Smooth transitions

---

## 🎬 Animation Details

### Framer Motion Animations
1. **Stagger Container**: Children animate in sequence with delay
2. **Slide Up**: Fade in + Y-axis movement
3. **Scale**: Hover effects on cards (1.05x scale)
4. **Pulse**: Loading spinners and breathing effects
5. **Gradient Shifts**: Background orbs animate subtly
6. **Spring Transitions**: Button interactions feel responsive

### Page Transitions
- Smooth fade-in on load
- Staggered child animations
- Hover states on interactive elements
- Tap feedback (scale down to 0.95)

---

## 📱 Responsive Design

The app is **fully responsive** across:
- 📱 Mobile phones (320px - 480px)
- 📱 Large phones (480px - 768px)
- 📱 Tablets (768px+)

### Key Responsive Breakpoints
- **Grid**: 2 columns on mobile, auto-adjusts on tablet
- **Fonts**: Scale with viewport
- **Spacing**: Padding/margins scale proportionally
- **Charts**: Responsive container heights

---

## 🌙 Dark Mode Implementation

### How It Works
1. Toggle button in home page header
2. Uses `localStorage` to persist preference
3. Respects system preference on first visit
4. All pages automatically switch colors
5. Smooth transition (0.3s) between modes

### Colors Used
- **Light**: #ffffff bg, #1a1a1a text
- **Dark**: #0f1419 bg, #ffffff text
- Secondary colors adjust for contrast

---

## 🚀 Getting Started

### Installation
```bash
npm install
npm run db:migrate
npm run dev
```

### First Time Setup
1. Create account or login
2. Create a farm (tap "+" on farms page)
3. Draw farm boundary on map
4. Run "Analyze" to get soil data
5. View results in farm detail page
6. Check trends after 2+ analyses
7. View reports and alerts

### Key User Flows

#### Creating a Farm
1. Tap "+" on Farms page
2. Enter farm name, crop type, area
3. Draw boundary on map (click to add points)
4. Save farm
5. Farm appears in list

#### Running Analysis
1. Open farm detail
2. Tap "🛰️ Analyze" button
3. Wait for satellite data (10-30s)
4. View results in Overview tab
5. Check Trends after 2+ analyses

#### Viewing NDVI Map
1. Go to Map page
2. Tap on a farm to select it
3. Tap "🌱 NDVI Overlay" button
4. Satellite-derived NDVI appears as colored overlay
5. Red = stressed, Green = healthy

---

## 🎨 Design Philosophy

### What Makes This Premium
1. **Professional Color Palette**: Emerald (trust) + Blue (innovation) + Amber (attention)
2. **Smooth Animations**: Every interaction feels responsive (not sluggish)
3. **Dark/Light Mode**: True support, not an afterthought
4. **Clear Hierarchy**: Important info first, details secondary
5. **Icons Not Emojis**: Professional Lucide icons throughout
6. **Consistent Spacing**: Predictable padding/margins
7. **Gradient Accents**: Subtle use of gradients for visual interest
8. **Responsive**: Works beautifully on any screen size

### Design Patterns Used
- **Card Design**: Elevated cards with subtle borders
- **Gradient Backgrounds**: Dynamic animated orbs
- **Icon + Label**: Every action has icon + text
- **Color Coding**: Status colors (green/amber/red) are consistent
- **Progressive Disclosure**: Show summary, expand on tap
- **Undo/Dismiss**: Users can always revert actions

---

## 📊 Data Visualization

### Charts Used
- **Line Charts**: Trends (NDVI, moisture, health over time)
- **Bar Charts**: Comparisons (soil health vs forecast)
- **Progress Bars**: Health score visualization
- **Gradient Rings**: Circular health indicators

All charts:
- Respond to theme (dark/light)
- Animate on load
- Are responsive to screen size
- Include tooltips on hover

---

## 🔧 Technical Stack

**Frontend**:
- Next.js 14
- React 18
- Framer Motion (animations)
- Tailwind CSS (styling)
- Recharts (visualizations)
- Lucide React (icons)

**Backend** (unchanged):
- Node.js + Express
- PostgreSQL
- Google Earth Engine API
- SoilGrids API

---

## 📝 Notes

### Dark/Light Mode
To test both modes, click the sun/moon icon on the home page.

### Alerts
Alerts are generated automatically when:
- NDVI drops >0.1 from previous analysis
- LST (temperature) spikes >4°C
- Soil moisture drops >0.15
- Soil health score < 40

### Trends Tab
Appears on farm detail page. Shows history of:
- NDVI changes
- Moisture changes
- LST changes
- Soil health over time

Requires ≥2 analyses on the same farm to render charts.

---

## 🎯 Future Enhancements

- Voice commands ("Analyze Farm 1")
- Push notifications for alerts
- Social sharing (compare with neighboring farms)
- Weather-based irrigation scheduling
- Carbon credit tracking
- Export reports as PDF
- Offline mode (cached farm data)

---

**Created with ❤️ for Tamil Nadu Farmers**

Version: 2.0 (Premium UI Redesign)
Last Updated: June 2026
