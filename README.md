# ?? Car World — Cinematic 3D Automotive Experience

A stunning, immersive 3D automotive showcase built with React, Three.js, and Framer Motion. Experience cars like never before — with cinematic visuals, interactive configurators, and smooth scroll-driven animations.

![React](https://img.shields.io/badge/React-19-blue?logo=react)
![Three.js](https://img.shields.io/badge/Three.js-0.186-black?logo=three.js)
![Vite](https://img.shields.io/badge/Vite-7-purple?logo=vite)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?logo=typescript)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4-teal?logo=tailwindcss)

---

## ? Features

- ?? **Cinematic Hero Scene** — Full-screen 3D animated introduction with dramatic lighting
- ?? **Car Collection Gallery** — Browse a curated lineup of high-performance vehicles
- ?? **Interactive Configurator** — Customize colors, wheels, and trim in real time
- ? **Electric Future Section** — Showcasing next-gen EV technology
- ?? **Aerodynamics Visualization** — Real-time airflow simulations rendered in WebGL
- ??? **Performance Stats** — Animated specs and 0–60 mph breakdowns
- ?? **Engineering Detail View** — Deep-dive into engine and chassis engineering
- ?? **Smooth Scroll Experience** — Powered by Lenis for buttery smooth scrolling

---

## ??? Tech Stack

| Technology | Purpose |
|---|---|
| **React 19** | UI Framework |
| **Three.js + R3F** | 3D Rendering (WebGL) |
| **@react-three/drei** | R3F helpers & abstractions |
| **@react-three/postprocessing** | Post-processing effects (bloom, depth of field) |
| **Framer Motion** | Animations & transitions |
| **Lenis** | Smooth scroll |
| **TailwindCSS 4** | Utility-first styling |
| **Vite 7** | Lightning-fast build tool |
| **TypeScript** | Type safety |

---

## ?? Getting Started

### Prerequisites

- Node.js v18 or higher
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/Raman-1166/car-world.git

# Navigate into the project
cd car-world

# Install dependencies
npm install

# Start the development server
npm run dev
```

Open http://localhost:5173 in your browser to view the app.

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

---

## ?? Project Structure

```
car-world/
+-- index.html
+-- package.json
+-- tsconfig.json
+-- vite.config.ts
+-- src/
    +-- main.tsx              # App entry point
    +-- App.tsx               # Root component & routing
    +-- index.css             # Global styles
    +-- components/
    ¦   +-- HeroScene.tsx     # Cinematic 3D hero section
    ¦   +-- CarCollection.tsx # Vehicle lineup gallery
    ¦   +-- CarDetail.tsx     # Individual car detail view
    ¦   +-- Configurator.tsx  # Interactive car configurator
    ¦   +-- ElectricFuture.tsx# EV showcase section
    ¦   +-- Aerodynamics.tsx  # Airflow visualization
    ¦   +-- Performance.tsx   # Performance stats section
    ¦   +-- Engineering.tsx   # Engineering detail section
    ¦   +-- Navbar.tsx        # Navigation bar
    ¦   +-- Footer.tsx        # Footer
    ¦   +-- three/            # Custom Three.js components
    ¦   +-- ui/               # Reusable UI components
    +-- data/                 # Car data & configuration
    +-- hooks/                # Custom React hooks
    +-- lib/                  # Utility libraries
    +-- utils/                # Helper functions
```

---

## ?? License

This project is open source and available under the MIT License.

---

## ?? Acknowledgements

- React Three Fiber — React renderer for Three.js
- Drei — Useful helpers for R3F
- Lenis — Smooth scroll library
- Framer Motion — Production-ready animation library

---

Made with ?? and Three.js
