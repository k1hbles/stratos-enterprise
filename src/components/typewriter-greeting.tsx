'use client';

import { useState, useEffect } from 'react';

interface TypewriterGreetingProps {
  greeting: string;
  onComplete?: () => void;
  className?: string;
}

export function TypewriterGreeting({
  greeting,
  onComplete,
  className = '',
}: TypewriterGreetingProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [cursorVisible, setCursorVisible] = useState(true);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    let index = 0;
    const typeTimer = setInterval(() => {
      if (index <= greeting.length) {
        setDisplayedText(greeting.slice(0, index));
        index++;
      } else {
        clearInterval(typeTimer);
        setIsComplete(true);
        onComplete?.();
      }
    }, 45);

    return () => clearInterval(typeTimer);
  }, [greeting, onComplete]);

  useEffect(() => {
    const blinkTimer = setInterval(() => {
      setCursorVisible((v) => !v);
    }, 530);

    return () => clearInterval(blinkTimer);
  }, []);

  useEffect(() => {
    if (isComplete) {
      const hideTimer = setTimeout(() => {
        setCursorVisible(false);
      }, 600);
      return () => clearTimeout(hideTimer);
    }
  }, [isComplete]);

  return (
    <h1
      className={className}
      style={{
        fontSize: '48px',
        fontWeight: 600,
        letterSpacing: '-0.03em',
        lineHeight: 1.15,
        minHeight: '58px',
        color: 'var(--greeting-text)',
      }}
    >
      {displayedText}
      {!isComplete && (
        <span
          className="inline-block w-[2px] h-[48px] ml-1 rounded-full"
          style={{
            background: 'var(--greeting-cursor)',
            opacity: cursorVisible ? 1 : 0,
            verticalAlign: 'middle',
            marginBottom: '4px',
          }}
        />
      )}
    </h1>
  );
}

export function getGreeting(name?: string): string {
  const hour = new Date().getHours();
  let timeGreeting: string;

  if (hour >= 5 && hour < 12) {
    timeGreeting = 'Good morning';
  } else if (hour >= 12 && hour < 17) {
    timeGreeting = 'Good afternoon';
  } else if (hour >= 17 && hour < 21) {
    timeGreeting = 'Good evening';
  } else {
    timeGreeting = 'Good night';
  }

  if (name) {
    return `${timeGreeting}, ${name}.`;
  }
  return `${timeGreeting}.`;
}
