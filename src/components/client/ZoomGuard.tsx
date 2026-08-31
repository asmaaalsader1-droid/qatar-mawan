"use client";

import { useEffect } from "react";

/** يمنع التكبير باللمس والاختصارات مع إبقاء التمرير الطبيعي متاحًا. */
export function ZoomGuard() {
  useEffect(() => {
    const preventGesture = (event: Event) => event.preventDefault();
    const preventCtrlWheel = (event: WheelEvent) => {
      if (event.ctrlKey) event.preventDefault();
    };
    const preventCtrlKey = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        const key = event.key.toLowerCase();
        if (key === "+" || key === "-" || key === "=" || key === "0") {
          event.preventDefault();
        }
      }
    };
    const preventPinchTouch = (event: TouchEvent) => {
      if (event.touches.length > 1) event.preventDefault();
    };

    document.addEventListener("gesturestart", preventGesture, { passive: false });
    document.addEventListener("gesturechange", preventGesture, { passive: false });
    document.addEventListener("gestureend", preventGesture, { passive: false });
    document.addEventListener("wheel", preventCtrlWheel, { passive: false });
    document.addEventListener("keydown", preventCtrlKey, { passive: false });
    document.addEventListener("touchmove", preventPinchTouch, { passive: false });

    return () => {
      document.removeEventListener("gesturestart", preventGesture);
      document.removeEventListener("gesturechange", preventGesture);
      document.removeEventListener("gestureend", preventGesture);
      document.removeEventListener("wheel", preventCtrlWheel);
      document.removeEventListener("keydown", preventCtrlKey);
      document.removeEventListener("touchmove", preventPinchTouch);
    };
  }, []);

  return null;
}
