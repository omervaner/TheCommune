/**
 * Library of reusable GSAP animations.
 * Every function takes a PixiJS display object and returns Promise<void>
 * (except tweenIdle which returns the Tween for manual kill).
 */

import { gsap } from 'gsap';
import { Container, Graphics, Text } from 'pixi.js';

/** Slide a character from current position to a new screen position */
export function tweenMove(container: Container, toX: number, toY: number, duration = 0.3): Promise<void> {
  return new Promise((resolve) => {
    gsap.to(container, {
      x: toX,
      y: toY,
      duration,
      ease: 'power2.inOut',
      onComplete: resolve,
    });
  });
}

/** Attacker slides ~40% toward target, then slides back */
export function tweenAttack(container: Container, targetX: number, targetY: number, duration = 0.35): Promise<void> {
  const startX = container.x;
  const startY = container.y;
  const midX = startX + (targetX - startX) * 0.4;
  const midY = startY + (targetY - startY) * 0.4;

  return new Promise((resolve) => {
    const tl = gsap.timeline({ onComplete: resolve });
    tl.to(container, { x: midX, y: midY, duration: duration * 0.4, ease: 'power2.in' });
    tl.to(container, { x: startX, y: startY, duration: duration * 0.6, ease: 'power2.out' });
  });
}

/** Flash red + pushback in screen-space direction, then spring back */
export function tweenHit(container: Container, pushX = 0, pushY = -3, duration = 0.3): Promise<void> {
  const startX = container.x;
  const startY = container.y;

  return new Promise((resolve) => {
    // Red flash via tint
    container.tint = 0xff4444;
    gsap.delayedCall(0.12, () => { container.tint = 0xffffff; });

    const tl = gsap.timeline({ onComplete: resolve });
    tl.to(container, {
      x: startX + pushX,
      y: startY + pushY,
      duration: duration * 0.25,
      ease: 'power2.out',
    });
    tl.to(container, {
      x: startX,
      y: startY,
      duration: duration * 0.75,
      ease: 'elastic.out(1, 0.5)',
    });
  });
}

/** Shake a container with random offsets */
export function tweenShake(container: Container, intensity = 3, duration = 0.2): Promise<void> {
  const startX = container.x;
  const startY = container.y;
  const steps = 6;
  const stepDur = duration / steps;

  return new Promise((resolve) => {
    const tl = gsap.timeline({
      onComplete: () => {
        container.x = startX;
        container.y = startY;
        resolve();
      },
    });
    for (let i = 0; i < steps; i++) {
      const dx = (Math.random() - 0.5) * intensity * 2;
      const dy = (Math.random() - 0.5) * intensity * 2;
      tl.to(container, { x: startX + dx, y: startY + dy, duration: stepDur, ease: 'none' });
    }
  });
}

/** Fade out + collapse for defeated characters */
export function tweenDefeat(container: Container, duration = 0.5): Promise<void> {
  return new Promise((resolve) => {
    gsap.to(container, {
      alpha: 0,
      y: container.y + 6,
      duration,
      ease: 'power2.in',
      onComplete: resolve,
    });
  });
}

/** Float a damage number upward and fade out, then destroy it */
export function tweenDamageNumber(parent: Container, text: string, x: number, y: number): void {
  const dmg = new Text({
    text,
    style: {
      fontFamily: 'monospace',
      fontSize: 14,
      fontWeight: 'bold',
      fill: 0xff4444,
    },
  });
  dmg.anchor.set(0.5, 0.5);
  dmg.x = x;
  dmg.y = y;
  parent.addChild(dmg);

  gsap.to(dmg, {
    y: y - 30,
    alpha: 0,
    duration: 0.8,
    ease: 'power2.out',
    onComplete: () => {
      parent.removeChild(dmg);
      dmg.destroy();
    },
  });
}

/** Infinite subtle sine-wave bob on the body container. Returns the tween so it can be killed. */
export function tweenIdle(body: Container): gsap.core.Tween {
  return gsap.to(body, {
    y: -3,
    duration: 1.2,
    yoyo: true,
    repeat: -1,
    ease: 'sine.inOut',
  });
}

/** Scale 1→peak→1 on a container, pivoting around a focal point so it stays centered */
export function tweenCameraFocus(
  container: Container,
  focalX: number,
  focalY: number,
  baseX: number,
  baseY: number,
  peak = 1.1,
  duration = 0.8,
): Promise<void> {
  // At scale s, the focal point shifts by (focalX * (s-1), focalY * (s-1))
  // We compensate with position offset to keep it centered
  const offsetX = baseX - focalX * (peak - 1);
  const offsetY = baseY - focalY * (peak - 1);

  return new Promise((resolve) => {
    const tl = gsap.timeline({ onComplete: resolve });
    tl.to(container, {
      x: offsetX,
      y: offsetY,
      duration: duration * 0.4,
      ease: 'power2.out',
    }, 0);
    tl.to(container.scale, {
      x: peak,
      y: peak,
      duration: duration * 0.4,
      ease: 'power2.out',
    }, 0);
    tl.to(container, {
      x: baseX,
      y: baseY,
      duration: duration * 0.6,
      ease: 'power2.inOut',
    }, duration * 0.4);
    tl.to(container.scale, {
      x: 1,
      y: 1,
      duration: duration * 0.6,
      ease: 'power2.inOut',
    }, duration * 0.4);
  });
}

/** Slide a turn banner in from the left, hold, then fade out. Adds/removes from parent. */
export function tweenTurnBanner(
  parent: Container,
  name: string,
  color: number,
  screenWidth: number,
  screenHeight: number,
): Promise<void> {
  const banner = new Container();

  const bg = new Graphics();
  bg.rect(0, -20, screenWidth, 40);
  bg.fill({ color: 0x000000, alpha: 0.7 });
  banner.addChild(bg);

  const label = new Text({
    text: `${name}'s Turn`,
    style: {
      fontFamily: 'monospace',
      fontSize: 18,
      fontWeight: 'bold',
      fill: color,
    },
  });
  label.anchor.set(0.5, 0.5);
  label.x = screenWidth / 2;
  banner.addChild(label);

  banner.y = screenHeight / 2;
  banner.x = -screenWidth;
  parent.addChild(banner);

  return new Promise((resolve) => {
    const tl = gsap.timeline({
      onComplete: () => {
        parent.removeChild(banner);
        banner.destroy({ children: true });
        resolve();
      },
    });
    tl.to(banner, { x: 0, duration: 0.25, ease: 'power2.out' });
    tl.to(banner, { alpha: 0, duration: 0.3, ease: 'power2.in' }, '+=0.4');
  });
}

/** Flip a card in via scaleX 0→1 */
export function tweenCardFlipIn(container: Container, duration = 0.2): Promise<void> {
  container.scale.x = 0;
  container.alpha = 0;
  return new Promise((resolve) => {
    gsap.to(container.scale, {
      x: 1,
      duration,
      ease: 'back.out(1.4)',
    });
    gsap.to(container, {
      alpha: 1,
      duration: duration * 0.5,
      onComplete: resolve,
    });
  });
}

/** Flip a card out via scaleX 1→0 */
export function tweenCardFlipOut(container: Container, duration = 0.15): Promise<void> {
  return new Promise((resolve) => {
    gsap.to(container.scale, {
      x: 0,
      duration,
      ease: 'power2.in',
    });
    gsap.to(container, {
      alpha: 0,
      duration,
      ease: 'power2.in',
      onComplete: resolve,
    });
  });
}
