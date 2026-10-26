import { useEffect, useRef, useState } from "react";
import { sayAloud } from "@/lib/bands";

// Shared by both Student Homes (the AI Lab's and EDU54's), so the motion rules live in one place.

// The cards rise in one after another on the first Home of a visit only; coming back to Home shows them at once.
let homeShown = false;
export function useFirstVisit() {
  const [first] = useState(() => !homeShown);
  useEffect(() => { homeShown = true; }, []);
  return first;
}
export const stagger = (i: number) => ({ animationDelay: `${i * 50}ms` });

// Read aloud on mouse hover only after the pointer rests on a tile (not while sweeping across), and never on touch:
// a tap already opens the tile, and the speaker button reads it.
export function useHoverSay(say: (text: string) => void = sayAloud) {
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return {
    start: (text: string) => {
      if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => say(text), 350);
    },
    cancel: () => window.clearTimeout(timer.current),
  };
}
