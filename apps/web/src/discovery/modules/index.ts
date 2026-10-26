/** Every working experiment's module, loaded only when a student opens it. The catalog's `module` names these keys; a test
 *  (tests-unit/search.test.ts) checks the two lists match, so a "working" chip always has a real experiment behind it. */
import type { ExperimentModule } from "../engine.ts";

type Loader = () => Promise<{ default: () => ExperimentModule }>;

export const MODULES: Record<string, Loader> = {
  graphing: () => import("./graphing.ts"),
  solids: () => import("./solids.ts"),
  projectile: () => import("./projectile.ts"),
  gas: () => import("./gas.ts"),
  ecosystem: () => import("./ecosystem.ts"),
  circuit: () => import("./circuit.ts"),
  piano: () => import("./piano.ts"),
  moon: () => import("./moon.ts"),
  seismic: () => import("./seismic.ts"),
  robotarm: () => import("./robotarm.ts"),
  gears: () => import("./gears.ts"),
  sorting: () => import("./sorting.ts"),
  globe: () => import("./globe.ts"),
  climate: () => import("./climate.ts"),
};
