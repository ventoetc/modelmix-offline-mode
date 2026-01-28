import { useEffect, useRef, useState } from "react";

interface SwipeGestureOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number; // Minimum distance for swipe (default: 50px)
}

export const useSwipeGesture = ({
  onSwipeLeft,
  onSwipeRight,
  threshold = 50,
}: SwipeGestureOptions) => {
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);
  const [isSwiping, setIsSwiping] = useState(false);

  const handleTouchStart = (e: TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    setIsSwiping(true);
  };

  const handleTouchMove = (e: TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    setIsSwiping(false);

    const distance = touchStartX.current - touchEndX.current;
    const isSignificantSwipe = Math.abs(distance) > threshold;

    if (!isSignificantSwipe) return;

    if (distance > 0 && onSwipeLeft) {
      // Swiped left
      onSwipeLeft();
    } else if (distance < 0 && onSwipeRight) {
      // Swiped right
      onSwipeRight();
    }
  };

  return {
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    isSwiping,
  };
};
