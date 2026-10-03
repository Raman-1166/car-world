import { Suspense, lazy, useCallback, useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Navbar, MenuOverlay, SearchOverlay } from "./components/Navbar";
import { HeroScene } from "./components/HeroScene";
import { CarCollection } from "./components/CarCollection";
import { Footer } from "./components/Footer";
import { Cursor } from "./components/ui/Cursor";
import { Loader } from "./components/ui/Loader";
import { SoundControl } from "./components/ui/SoundControl";
import { defaultBuild } from "./data/cars";
import { initScroll, lockScroll, scrollToTarget } from "./lib/scroll";

// Below-the-fold experiences are code-split and mounted lazily.
const Configurator = lazy(() => import("./components/Configurator").then((m) => ({ default: m.Configurator })));
const Performance = lazy(() => import("./components/Performance").then((m) => ({ default: m.Performance })));
const Engineering = lazy(() => import("./components/Engineering").then((m) => ({ default: m.Engineering })));
const ElectricFuture = lazy(() => import("./components/ElectricFuture").then((m) => ({ default: m.ElectricFuture })));
const Aerodynamics = lazy(() => import("./components/Aerodynamics").then((m) => ({ default: m.Aerodynamics })));
const CarDetail = lazy(() => import("./components/CarDetail").then((m) => ({ default: m.CarDetail })));

const Placeholder = ({ h = "100vh" }: { h?: string }) => <div style={{ height: h }} className="bg-ink" />;

export default function App() {
  const [sceneReady, setSceneReady] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [detail, setDetail] = useState<string | null>(null);
  const [build, setBuild] = useState(() => defaultBuild("apex"));
  const [menu, setMenu] = useState(false);
  const [search, setSearch] = useState(false);

  useEffect(() => {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    window.scrollTo(0, 0);
    const destroy = initScroll();
    lockScroll(true);
    return destroy;
  }, []);

  useEffect(() => {
    if (loaded) lockScroll(false);
  }, [loaded]);

  useEffect(() => {
    lockScroll(menu || search || !loaded);
  }, [menu, search, loaded]);

  const onReady = useCallback(() => setSceneReady(true), []);
  const onDone = useCallback(() => setLoaded(true), []);
  const closeDetail = useCallback(() => setDetail(null), []);
  const closeMenu = useCallback(() => setMenu(false), []);
  const closeSearch = useCallback(() => setSearch(false), []);

  const configure = useCallback((id: string) => {
    setBuild(defaultBuild(id));
    setDetail(null);
    window.setTimeout(() => scrollToTarget("#configurator", 0, 2.4), 900);
  }, []);

  return (
    <div className="relative min-h-screen bg-ink text-bone">
      <Cursor />

      <Navbar visible={loaded} onSearch={() => setSearch(true)} onMenu={() => setMenu(true)} />
      <SoundControl visible={loaded} />

      <main>
        <HeroScene started={loaded} onReady={onReady} />
        <CarCollection onOpen={setDetail} />
        <Suspense fallback={<Placeholder h="110vh" />}>
          <Configurator build={build} setBuild={setBuild} />
        </Suspense>
        <Suspense fallback={<Placeholder h="150vh" />}>
          <Performance />
        </Suspense>
        <Suspense fallback={<Placeholder h="560vh" />}>
          <Engineering />
        </Suspense>
        <Suspense fallback={<Placeholder h="330vh" />}>
          <ElectricFuture />
        </Suspense>
        <Suspense fallback={<Placeholder />}>
          <Aerodynamics />
        </Suspense>
      </main>
      <Footer />

      <Suspense fallback={null}>
        <CarDetail carId={detail} onClose={closeDetail} onConfigure={configure} />
      </Suspense>
      <MenuOverlay open={menu} onClose={closeMenu} />
      <SearchOverlay open={search} onClose={closeSearch} onOpenCar={setDetail} />

      <AnimatePresence>{!loaded && <Loader key="loader" ready={sceneReady} onDone={onDone} />}</AnimatePresence>
    </div>
  );
}
