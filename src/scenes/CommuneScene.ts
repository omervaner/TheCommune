/**
 * CommuneScene — the management hub between battles.
 *
 * Dark atmospheric scene with Tim Burton-style building,
 * cityline silhouette, street lamp, and collapsible side panels.
 */

import { Container, FillGradient, Graphics, Text } from 'pixi.js';
import type { Application } from 'pixi.js';
import { gsap } from 'gsap';
import type { Scene } from '@scenes/SceneManager';
import { EventBus } from '../EventBus';
import { CommuneState } from '@game/CommuneState';
import { DialogueEngine } from '@dialogue/DialogueEngine';
import { DialogueRenderer } from '@rendering/DialogueRenderer';
import type { Character } from '@game/types';
import type { DialogueEvents, DialogueScript } from '@dialogue/types';

export interface CommuneSceneConfig {
  state: CommuneState;
  onStartCombat: (squad: Character[]) => void;
}

// Layout
const TOP_BAR_H = 0.06;
const LEFT_W = 0.20;
const RIGHT_W = 0.20;
const COLLAPSE_BTN_W = 24;

// Scroll
const DRAG_THRESHOLD = 5;
const MARQUEE_SPEED = 25;

// Class colors — used ONLY for borders and accents, NOT card fill
const CLASS_COLORS: Record<string, { accent: number; accentLight: number; accentDark: number }> = {
  karen:                { accent: 0xe05a9a, accentLight: 0xff7ab0, accentDark: 0x701848 },
  therapist:            { accent: 0x5a9ae0, accentLight: 0x7ab0ff, accentDark: 0x184870 },
  conspiracy_theorist:  { accent: 0xd09050, accentLight: 0xe0a868, accentDark: 0x6a4020 },
  suburban_warrior:     { accent: 0xe05a9a, accentLight: 0xff7ab0, accentDark: 0x701848 },
  default:              { accent: 0x6a6a8a, accentLight: 0x8a8aaa, accentDark: 0x2a2a4a },
};

// Dark palette — everything is dark, color comes from accents only
const PAL = {
  bg: 0x08081a,
  panelBg: 0x0c0c1e,
  panelGrain1: 0x14142a,
  panelGrain2: 0x0a0a16,
  cardTop: 0x1a1a32,
  cardBottom: 0x101028,
  cardBorder: 0x2a2a4a,
  btnTop: 0x1a1a32,
  btnBottom: 0x101028,
  buildingBody: 0x0a0a1a,
  buildingRoof: 0x0e0e22,
  ground: 0x1a1a30,
  skyHorizon: 0x101028,
  cityline: 0x060612,
  lampPost: 0x1a1a30,
  lampGlow: 0xffdd88,
  windowLit: 0xddaa44,
  windowDark: 0x0e0e1a,
};

const TEXT_RES = Math.max(2, window.devicePixelRatio);

const TYP = {
  header: 0xFFF8E8,
  number: 0xFFFFFF,
  label: 0x666680,
  dim: 0x444460,
};

export class CommuneScene implements Scene {
  private config: CommuneSceneConfig;
  private app: Application | null = null;
  private root = new Container();
  private uiContainer = new Container();

  // Dialogue
  private dialogueBus = new EventBus<DialogueEvents>();
  private dialogueEngine: DialogueEngine;
  private dialogueRenderer: DialogueRenderer | null = null;

  // Animations
  private windows: Graphics[] = [];
  private windowStates: boolean[] = [];
  private windowTimer: gsap.core.Tween | null = null;
  private stars: Graphics[] = [];
  private starTweens: gsap.core.Tween[] = [];
  private smokeTweens: gsap.core.Tween[] = [];
  private smokeParticles: Graphics[] = [];
  private lampGlow: Graphics | null = null;
  private lampFlickerTween: gsap.core.Tween | null = null;
  private marqueeTweens: gsap.core.Tween[] = [];

  // Scroll
  private scrollContent: Container | null = null;
  private scrollBoundsMin = 0;
  private scrollBoundsMax = 0;
  private rosterCardH = 0;
  private rosterGap = 0;
  private isDragging = false;
  private isScrolling = false;
  private dragStartY = 0;
  private dragLastY = 0;
  private dragVelocity = 0;
  private scrollMomentumTween: gsap.core.Tween | null = null;

  // Collapsible panels
  private leftPanel: Container | null = null;
  private rightPanel: Container | null = null;
  private leftCollapsed = false;
  private rightCollapsed = false;
  private centerContainer: Container | null = null;

  constructor(config: CommuneSceneConfig) {
    this.config = config;
    this.dialogueEngine = new DialogueEngine(this.dialogueBus);
  }

  enter(app: Application): void {
    this.app = app;
    app.stage.addChild(this.root);
    this.buildUI();

    const charMap = new Map<string, Character>();
    for (const c of this.config.state.roster) charMap.set(c.id, c);

    this.dialogueRenderer = new DialogueRenderer(
      this.dialogueBus, charMap, app.screen.width, app.screen.height,
    );
    this.dialogueRenderer.advanceCallback = () => this.dialogueEngine.advance();
    this.dialogueRenderer.choiceCallback = (id) => this.dialogueEngine.selectChoice(id);
    this.root.addChild(this.dialogueRenderer.container);

    this.startAnimations();
    window.addEventListener('resize', this.onResize);
  }

  exit(): void {
    window.removeEventListener('resize', this.onResize);
    this.cleanupScroll();
    this.stopAnimations();
    this.killMarquees();
    this.dialogueRenderer?.destroy();
    this.dialogueRenderer = null;
    this.dialogueBus.clear();
    if (this.app) this.app.stage.removeChild(this.root);
    this.root.removeChildren();
    this.root.destroy({ children: true });
    this.root = new Container();
    this.uiContainer = new Container();
    this.dialogueEngine = new DialogueEngine(this.dialogueBus);
    this.windows = [];
    this.windowStates = [];
    this.stars = [];
    this.starTweens = [];
    this.smokeParticles = [];
    this.smokeTweens = [];
    this.lampGlow = null;
    this.lampFlickerTween = null;
    this.leftPanel = null;
    this.rightPanel = null;
    this.centerContainer = null;
    this.app = null;
  }

  update(_dt: number): void {}

  // ========================================================
  // Layered panel renderer
  // ========================================================

  private drawGamePanel(
    g: Graphics,
    x: number, y: number, w: number, h: number, r: number,
    fillTop: number, fillBottom: number,
    borderColor: number, borderAlpha: number = 0.6,
    shadow: boolean = true,
  ): void {
    // Drop shadow
    if (shadow) {
      g.roundRect(x + 3, y + 3, w, h, r);
      g.fill({ color: 0x000000, alpha: 0.4 });
    }

    // Gradient fill
    const gradient = new FillGradient(0, y, 0, y + h);
    gradient.addColorStop(0, fillTop);
    gradient.addColorStop(1, fillBottom);
    g.roundRect(x, y, w, h, r);
    g.fill({ fill: gradient });

    // Border
    g.roundRect(x, y, w, h, r);
    g.stroke({ color: borderColor, width: 1.5, alpha: borderAlpha });

    // Top edge highlight
    g.moveTo(x + r, y + 1);
    g.lineTo(x + w - r, y + 1);
    g.stroke({ color: 0xffffff, width: 1, alpha: 0.06 });

    // Bottom edge shadow
    g.moveTo(x + r, y + h - 1);
    g.lineTo(x + w - r, y + h - 1);
    g.stroke({ color: 0x000000, width: 1, alpha: 0.15 });
  }

  // ========================================================
  // Full UI build
  // ========================================================

  private buildUI(): void {
    if (!this.app) return;
    const sw = this.app.screen.width;
    const sh = this.app.screen.height;

    this.cleanupScroll();
    this.killMarquees();
    this.uiContainer.parent?.removeChild(this.uiContainer);
    this.uiContainer.destroy({ children: true });
    this.uiContainer = new Container();
    this.windows = [];
    this.windowStates = [];
    this.stars = [];
    this.smokeParticles = [];

    // Sky background — gradient from dark top to slightly lighter horizon
    const skyGrad = new FillGradient(0, 0, 0, sh);
    skyGrad.addColorStop(0, 0x020210);      // near-black at top
    skyGrad.addColorStop(0.5, 0x0a0a24);    // still dark mid
    skyGrad.addColorStop(0.8, 0x141438);    // noticeably lighter at horizon
    skyGrad.addColorStop(1, 0x1a1a40);      // ground level — visible purple tint
    const bg = new Graphics();
    bg.rect(0, 0, sw, sh);
    bg.fill({ fill: skyGrad });
    this.uiContainer.addChild(bg);

    // Center area (built first, behind panels)
    this.centerContainer = new Container();
    this.uiContainer.addChild(this.centerContainer);

    this.buildCityline(sw, sh);
    this.buildBuilding(sw, sh);
    this.buildStreetLamp(sw, sh);
    this.buildGroundLine(sw, sh);

    // Side panels
    this.leftPanel = new Container();
    this.rightPanel = new Container();
    this.uiContainer.addChild(this.leftPanel);
    this.uiContainer.addChild(this.rightPanel);

    this.buildPanelBackground(this.leftPanel, 0, sh * TOP_BAR_H, sw * LEFT_W, sh - sh * TOP_BAR_H);
    this.buildPanelBackground(this.rightPanel, sw * (1 - RIGHT_W), sh * TOP_BAR_H, sw * RIGHT_W, sh - sh * TOP_BAR_H);

    this.buildLeftNav(sw, sh);
    this.buildRosterPanel(sw, sh);
    this.buildColumnSeparators(sw, sh);

    // Top bar on top of everything
    this.buildTopBar(sw, sh);

    // Collapse buttons
    this.buildCollapseButtons(sw, sh);

    this.root.addChildAt(this.uiContainer, 0);
  }

  // ========================================================
  // Panel backgrounds with grain
  // ========================================================

  private buildPanelBackground(parent: Container, x: number, y: number, w: number, h: number): void {
    const panel = new Graphics();
    panel.rect(x, y, w, h);
    panel.fill({ color: PAL.panelBg });

    // Subtle grain
    for (let i = 0; i < 200; i++) {
      const gx = x + Math.random() * w;
      const gy = y + Math.random() * h;
      const c = Math.random() > 0.5 ? PAL.panelGrain1 : PAL.panelGrain2;
      panel.rect(gx, gy, 2, 2);
      panel.fill({ color: c, alpha: 0.03 + Math.random() * 0.04 });
    }

    parent.addChild(panel);
  }

  // ========================================================
  // Column separators
  // ========================================================

  private buildColumnSeparators(sw: number, sh: number): void {
    const topY = sh * TOP_BAR_H;
    const lineH = sh - topY;

    const leftLine = new Graphics();
    leftLine.rect(sw * LEFT_W, topY, 1, lineH);
    leftLine.fill({ color: 0x2a2a4a, alpha: 0.4 });
    this.uiContainer.addChild(leftLine);

    const rightLine = new Graphics();
    rightLine.rect(sw * (1 - RIGHT_W), topY, 1, lineH);
    rightLine.fill({ color: 0x2a2a4a, alpha: 0.4 });
    this.uiContainer.addChild(rightLine);
  }

  // ========================================================
  // Collapse buttons
  // ========================================================

  private buildCollapseButtons(sw: number, sh: number): void {
    const midY = sh * TOP_BAR_H + (sh - sh * TOP_BAR_H) / 2;

    // Left collapse button
    const leftBtn = this.makeCollapseArrow(true);
    leftBtn.x = sw * LEFT_W - COLLAPSE_BTN_W / 2;
    leftBtn.y = midY - 15;
    leftBtn.on('pointerdown', () => this.togglePanel('left', sw));
    this.uiContainer.addChild(leftBtn);

    // Right collapse button
    const rightBtn = this.makeCollapseArrow(false);
    rightBtn.x = sw * (1 - RIGHT_W) - COLLAPSE_BTN_W / 2;
    rightBtn.y = midY - 15;
    rightBtn.on('pointerdown', () => this.togglePanel('right', sw));
    this.uiContainer.addChild(rightBtn);
  }

  private makeCollapseArrow(pointLeft: boolean): Container {
    const btn = new Container();
    const bg = new Graphics();
    bg.roundRect(0, 0, COLLAPSE_BTN_W, 30, 4);
    bg.fill({ color: 0x0c0c1e, alpha: 0.9 });
    bg.stroke({ color: 0x2a2a4a, width: 1, alpha: 0.5 });
    btn.addChild(bg);

    const arrow = this.makeText(pointLeft ? '‹' : '›', 16, true, TYP.label);
    arrow.x = (COLLAPSE_BTN_W - arrow.width) / 2;
    arrow.y = (30 - arrow.height) / 2;
    btn.addChild(arrow);

    btn.eventMode = 'static';
    btn.cursor = 'pointer';
    btn.on('pointerover', () => { bg.tint = 0x6666aa; });
    btn.on('pointerout', () => { bg.tint = 0xffffff; });

    return btn;
  }

  private togglePanel(side: 'left' | 'right', sw: number): void {
    if (side === 'left' && this.leftPanel) {
      this.leftCollapsed = !this.leftCollapsed;
      gsap.to(this.leftPanel, {
        x: this.leftCollapsed ? -(sw * LEFT_W) : 0,
        duration: 0.4,
        ease: 'power2.inOut',
      });
    } else if (side === 'right' && this.rightPanel) {
      this.rightCollapsed = !this.rightCollapsed;
      gsap.to(this.rightPanel, {
        x: this.rightCollapsed ? sw * RIGHT_W : 0,
        duration: 0.4,
        ease: 'power2.inOut',
      });
    }
  }

  // ========================================================
  // Top bar
  // ========================================================

  private buildTopBar(sw: number, sh: number): void {
    const barH = sh * TOP_BAR_H;
    const bar = new Container();

    const barGrad = new FillGradient(0, 0, 0, barH);
    barGrad.addColorStop(0, 0x0e0e22);
    barGrad.addColorStop(1, 0x08081a);
    const bg = new Graphics();
    bg.rect(0, 0, sw, barH);
    bg.fill({ fill: barGrad });
    bar.addChild(bg);

    const edge = new Graphics();
    edge.rect(0, barH - 1, sw, 1);
    edge.fill({ color: 0x2a2a4a, alpha: 0.3 });
    bar.addChild(edge);

    const state = this.config.state;
    const midY = Math.round(barH / 2);
    const fontSize = Math.max(11, Math.round(barH * 0.35));
    const padX = Math.max(9, sw * 0.009);
    const padY = Math.max(3, barH * 0.15);

    // Day
    const dayText = this.makeText(`Day ${state.day}`, fontSize, true, TYP.header);
    const dayBadge = this.wrapInBadge(dayText, padX, padY, PAL.cardBorder);
    dayBadge.x = sw * 0.03;
    dayBadge.y = midY - dayBadge.height / 2;
    bar.addChild(dayBadge);

    // Money
    const moneyText = this.makeText(`$${state.money}`, fontSize, true, 0x66cc66);
    const moneyBadge = this.wrapInBadge(moneyText, padX, padY, 0x2a4a2a);
    moneyBadge.x = Math.round(sw / 2 - moneyBadge.width / 2);
    moneyBadge.y = midY - moneyBadge.height / 2;
    bar.addChild(moneyBadge);

    // Morale
    const moraleBadge = this.buildMoraleBadge(state.morale, sw, barH, fontSize, padX, padY);
    moraleBadge.x = sw - sw * 0.03 - moraleBadge.width;
    moraleBadge.y = midY - moraleBadge.height / 2;
    bar.addChild(moraleBadge);

    this.uiContainer.addChild(bar);
  }

  private wrapInBadge(content: Text, padX: number, padY: number, borderColor: number): Container {
    const badge = new Container();
    const w = content.width + padX * 2;
    const h = content.height + padY * 2;
    const bg = new Graphics();
    bg.roundRect(0, 0, w, h, 4);
    bg.fill({ color: 0x0a0a1a, alpha: 0.8 });
    bg.stroke({ color: borderColor, width: 1, alpha: 0.4 });
    badge.addChild(bg);
    content.x = padX;
    content.y = padY;
    badge.addChild(content);
    return badge;
  }

  private buildMoraleBadge(
    morale: number, sw: number, barH: number,
    fontSize: number, padX: number, padY: number,
  ): Container {
    const badge = new Container();
    const label = this.makeText('Morale', Math.max(9, Math.round(barH * 0.25)), false, TYP.label);
    const barW = Math.max(40, sw * 0.08);
    const barHH = Math.max(6, barH * 0.28);
    const pct = this.makeText(`${morale}%`, Math.max(8, Math.round(fontSize * 0.8)), true, TYP.number);
    const innerW = label.width + 8 + barW + 6 + pct.width;
    const h = label.height + padY * 2;

    const bg = new Graphics();
    bg.roundRect(0, 0, innerW + padX * 2, h, 4);
    bg.fill({ color: 0x0a0a1a, alpha: 0.8 });
    bg.stroke({ color: PAL.cardBorder, width: 1, alpha: 0.4 });
    badge.addChild(bg);

    label.x = padX;
    label.y = padY;
    badge.addChild(label);

    const barX = padX + label.width + 8;
    const barY = padY + (label.height - barHH) / 2;

    const track = new Graphics();
    track.roundRect(barX, barY, barW, barHH, 3);
    track.fill({ color: 0x0a0a1a });
    badge.addChild(track);

    const ratio = morale / 100;
    const fillColor = morale >= 60 ? 0x44aa44 : morale >= 30 ? 0xccaa44 : 0xcc4444;
    if (ratio > 0) {
      const fill = new Graphics();
      fill.roundRect(barX, barY, barW * ratio, barHH, 3);
      fill.fill({ color: fillColor });
      badge.addChild(fill);
    }

    pct.x = barX + barW + 6;
    pct.y = padY;
    badge.addChild(pct);

    return badge;
  }

  // ========================================================
  // Left nav — dark buttons with colored accent stripe
  // ========================================================

  private buildLeftNav(sw: number, sh: number): void {
    const colW = sw * LEFT_W;
    const contentTop = sh * TOP_BAR_H;
    const contentH = sh - contentTop;
    const padX = colW * 0.15;
    const btnW = colW - padX * 2;
    const btnH = Math.max(36, contentH * 0.08);
    const gap = contentH * 0.025;

    const nav = new Container();
    nav.y = contentTop;
    const roster = this.config.state.roster;

    const totalH = 2 * btnH + gap;
    const startY = (contentH - totalH) / 2;

    const missionsBtn = this.makeNavButton('MISSIONS', 'Start a fight', btnW, btnH, 0x5a9ae0);
    missionsBtn.x = padX;
    missionsBtn.y = startY;
    missionsBtn.on('pointerdown', () => this.config.onStartCombat(roster));
    nav.addChild(missionsBtn);

    const eventsBtn = this.makeNavButton('EVENTS', 'Commune drama', btnW, btnH, 0xd09050);
    eventsBtn.x = padX;
    eventsBtn.y = startY + btnH + gap;
    eventsBtn.on('pointerdown', () => {
      if (this.dialogueEngine.isActive) return;
      this.dialogueEngine.start(this.getTestScript());
    });
    nav.addChild(eventsBtn);

    this.leftPanel!.addChild(nav);
  }

  private makeNavButton(
    title: string, subtitle: string,
    w: number, h: number, accentColor: number,
  ): Container {
    const btn = new Container();
    const r = 6;
    const stripeW = 4;

    // Dark body
    const panelGfx = new Graphics();
    this.drawGamePanel(panelGfx, stripeW, 0, w - stripeW, h, r,
      PAL.btnTop, PAL.btnBottom, PAL.cardBorder, 0.4, true);
    btn.addChild(panelGfx);

    // Colored left accent stripe
    const stripe = new Graphics();
    stripe.roundRect(0, 0, stripeW + r, h, { tl: r, bl: r, tr: 0, br: 0 } as any);
    stripe.fill({ color: accentColor, alpha: 0.8 });
    // Clip the right side that overlaps the body
    const clipStripe = new Graphics();
    clipStripe.rect(0, 0, stripeW, h);
    clipStripe.fill({ color: accentColor, alpha: 0.8 });
    btn.addChild(clipStripe);

    const titleSize = Math.max(10, Math.round(h * 0.3));
    const subSize = Math.max(8, Math.round(h * 0.22));

    const titleText = this.makeText(title, titleSize, true, TYP.header);
    titleText.x = stripeW + w * 0.06;
    titleText.y = h * 0.15;

    const subText = this.makeText(subtitle, subSize, false, TYP.label);
    subText.x = stripeW + w * 0.06;
    subText.y = h * 0.55;

    btn.addChild(titleText, subText);
    btn.eventMode = 'static';
    btn.cursor = 'pointer';
    btn.on('pointerover', () => { panelGfx.tint = 0x8888bb; });
    btn.on('pointerout', () => { panelGfx.tint = 0xffffff; });

    return btn;
  }

  // ========================================================
  // Cityline silhouette — behind everything
  // ========================================================

  private buildCityline(sw: number, sh: number): void {
    if (!this.centerContainer) return;
    const centerX = sw * LEFT_W;
    const centerW = sw * 0.60;
    const groundY = sh * 0.88;

    const city = new Graphics();

    // Random building silhouettes
    const buildingCount = 12;
    const slotW = centerW / buildingCount;

    for (let i = 0; i < buildingCount; i++) {
      const bw = slotW * (0.5 + Math.random() * 0.4);
      const bh = sh * (0.05 + Math.random() * 0.18);
      const bx = centerX + i * slotW + (slotW - bw) / 2 + (Math.random() - 0.5) * slotW * 0.2;
      const by = groundY - bh;

      city.rect(bx, by, bw, bh);
      city.fill({ color: PAL.cityline, alpha: 0.7 + Math.random() * 0.3 });

      // Occasional tiny window dots
      if (Math.random() > 0.4) {
        const winCount = Math.floor(bh / (sh * 0.03));
        for (let w = 0; w < Math.min(winCount, 4); w++) {
          const wx = bx + bw * (0.2 + Math.random() * 0.6);
          const wy = by + bh * (0.15 + w * 0.2);
          city.rect(wx, wy, 2, 2);
          city.fill({ color: PAL.windowLit, alpha: 0.1 + Math.random() * 0.15 });
        }
      }
    }

    this.centerContainer.addChild(city);
  }

  // ========================================================
  // Tim Burton building — tall, narrow, slightly crooked
  // ========================================================

  private buildBuilding(sw: number, sh: number): void {
    if (!this.centerContainer) return;
    const centerX = sw * LEFT_W;
    const centerW = sw * 0.60;
    const groundY = sh * 0.88;

    const building = new Container();

    // Building dimensions — tall and narrow, farther away
    const bw = centerW * 0.22;
    const bx = centerX + (centerW - bw) / 2;
    const floors = 6;
    const floorH = sh * 0.08;
    const bh = floors * floorH;
    const bt = groundY - bh;
    const roofH = sh * 0.05;

    // Slight lean — Tim Burton style
    const lean = bw * 0.02;

    // Building body shadow (offset right, not below — it's grounded)
    const shadowG = new Graphics();
    shadowG.beginPath();
    shadowG.moveTo(bx + lean + 6, bt);
    shadowG.lineTo(bx + bw + 6, bt + bh * 0.1);
    shadowG.lineTo(bx + bw + 6, groundY);
    shadowG.lineTo(bx + 6, groundY);
    shadowG.closePath();
    shadowG.fill({ color: 0x000000, alpha: 0.3 });
    building.addChild(shadowG);

    // Building body — subtle gradient
    const bodyGrad = new FillGradient(0, bt, 0, groundY);
    bodyGrad.addColorStop(0, 0x0e0e22);
    bodyGrad.addColorStop(1, PAL.buildingBody);
    const body = new Graphics();
    body.beginPath();
    body.moveTo(bx + lean, bt);
    body.lineTo(bx + bw + lean * 0.3, bt);
    body.lineTo(bx + bw, groundY);
    body.lineTo(bx, groundY);
    body.closePath();
    body.fill({ fill: bodyGrad });
    body.stroke({ color: 0x1a1a30, width: 1, alpha: 0.5 });
    building.addChild(body);

    // Roof — pointed, slightly asymmetric
    const roof = new Graphics();
    const roofPeakX = bx + bw * 0.45 + lean; // off-center peak
    roof.beginPath();
    roof.moveTo(roofPeakX, bt - roofH);
    roof.lineTo(bx + bw + lean * 0.3 + bw * 0.04, bt);
    roof.lineTo(bx + lean - bw * 0.04, bt);
    roof.closePath();
    roof.fill({ color: PAL.buildingRoof });
    roof.stroke({ color: 0x1a1a30, width: 1, alpha: 0.3 });
    building.addChild(roof);

    // Chimney — right side of roof
    const chimW = bw * 0.1;
    const chimH = roofH * 1.2;
    const chimX = bx + bw * 0.72 + lean * 0.5;
    const chimY = bt - chimH;
    const chimney = new Graphics();
    chimney.rect(chimX, chimY, chimW, chimH);
    chimney.fill({ color: 0x0e0e20 });
    chimney.stroke({ color: 0x1a1a30, width: 1, alpha: 0.3 });
    building.addChild(chimney);

    // Chimney cap
    chimney.rect(chimX - 2, chimY, chimW + 4, 3);
    chimney.fill({ color: 0x1a1a30 });

    // Smoke particles — will be animated
    for (let i = 0; i < 6; i++) {
      const smoke = new Graphics();
      const sr = 3 + Math.random() * 4;
      smoke.circle(0, 0, sr);
      smoke.fill({ color: 0x2a2a4a, alpha: 0 });
      smoke.x = chimX + chimW / 2;
      smoke.y = chimY;
      building.addChild(smoke);
      this.smokeParticles.push(smoke);
    }

    // Windows — 2 per floor, skip ground floor (that's the door)
    const winW = bw * 0.18;
    const winH = floorH * 0.4;
    const winGap = bw * 0.15;
    const winStartX = bw * 0.22;

    for (let floor = 0; floor < floors - 1; floor++) {
      const floorY = bt + floor * floorH + floorH * 0.25;
      // Per-floor lean interpolation
      const floorLean = lean * (1 - floor / floors);

      for (let w = 0; w < 2; w++) {
        const wx = bx + winStartX + w * (winW + winGap) + floorLean;
        const wy = floorY;

        // Window frame (dark recess)
        const frame = new Graphics();
        frame.rect(wx - 1, wy - 1, winW + 2, winH + 2);
        frame.fill({ color: 0x000000, alpha: 0.5 });
        building.addChild(frame);

        const win = new Graphics();
        win.rect(wx, wy, winW, winH);
        win.fill({ color: PAL.windowLit });

        const lit = Math.random() > 0.4;
        win.alpha = lit ? 0.7 : 0.05;

        this.windows.push(win);
        this.windowStates.push(lit);
        building.addChild(win);
      }
    }

    // Door
    const doorW = bw * 0.2;
    const doorH = floorH * 0.7;
    const doorX = bx + (bw - doorW) / 2;
    const doorFrame = new Graphics();
    doorFrame.roundRect(doorX - 1, groundY - doorH - 1, doorW + 2, doorH + 2, 2);
    doorFrame.fill({ color: 0x000000, alpha: 0.5 });
    building.addChild(doorFrame);

    const door = new Graphics();
    door.roundRect(doorX, groundY - doorH, doorW, doorH, 2);
    door.fill({ color: 0x060610 });
    building.addChild(door);

    // Building name — on the roof face, not overlapping windows
    const nameSize = Math.max(8, Math.round(bw * 0.07));
    const nameText = this.makeText('THE COMMUNE', nameSize, true, TYP.dim);
    nameText.anchor.set(0.5, 0.5);
    nameText.x = bx + bw / 2 + lean * 0.5;
    nameText.y = bt - roofH * 0.4;
    building.addChild(nameText);

    this.centerContainer.addChild(building);
  }

  // ========================================================
  // Street lamp
  // ========================================================

  private buildStreetLamp(sw: number, sh: number): void {
    if (!this.centerContainer) return;
    const centerX = sw * LEFT_W;
    const centerW = sw * 0.60;
    const groundY = sh * 0.88;

    // Position lamp to the right of building
    const lampX = centerX + centerW * 0.72;
    const poleH = sh * 0.18;
    const poleW = 3;

    const lamp = new Container();

    // Pole
    const pole = new Graphics();
    pole.rect(lampX, groundY - poleH, poleW, poleH);
    pole.fill({ color: PAL.lampPost });
    lamp.addChild(pole);

    // Lamp head — horizontal bar + fixture
    const headW = 14;
    const headH = 8;
    pole.rect(lampX - headW / 2 + poleW / 2, groundY - poleH - 2, headW, headH);
    pole.fill({ color: PAL.lampPost });

    // Light glow — radial-ish effect with layered circles
    const glowContainer = new Container();
    const glowX = lampX + poleW / 2;
    const glowY = groundY - poleH + headH;

    // Outer glow
    const outerGlow = new Graphics();
    outerGlow.circle(glowX, glowY, 40);
    outerGlow.fill({ color: PAL.lampGlow, alpha: 0.03 });
    glowContainer.addChild(outerGlow);

    // Mid glow
    const midGlow = new Graphics();
    midGlow.circle(glowX, glowY, 20);
    midGlow.fill({ color: PAL.lampGlow, alpha: 0.06 });
    glowContainer.addChild(midGlow);

    // Inner glow
    const innerGlow = new Graphics();
    innerGlow.circle(glowX, glowY, 8);
    innerGlow.fill({ color: PAL.lampGlow, alpha: 0.15 });
    glowContainer.addChild(innerGlow);

    // Bright center
    const center = new Graphics();
    center.circle(glowX, glowY, 3);
    center.fill({ color: 0xffffff, alpha: 0.4 });
    glowContainer.addChild(center);

    // Light cone on ground
    const cone = new Graphics();
    cone.beginPath();
    cone.moveTo(glowX - 5, glowY + 5);
    cone.lineTo(glowX - 30, groundY);
    cone.lineTo(glowX + 30, groundY);
    cone.lineTo(glowX + 5, glowY + 5);
    cone.closePath();
    cone.fill({ color: PAL.lampGlow, alpha: 0.02 });
    glowContainer.addChild(cone);

    lamp.addChild(glowContainer);
    this.lampGlow = glowContainer as any;

    this.centerContainer.addChild(lamp);
  }

  // ========================================================
  // Ground line
  // ========================================================

  private buildGroundLine(sw: number, sh: number): void {
    if (!this.centerContainer) return;
    const groundY = sh * 0.88;
    const ground = new Graphics();
    ground.rect(0, groundY, sw, 1);
    ground.fill({ color: 0x1a1a30, alpha: 0.5 });
    this.centerContainer.addChild(ground);
  }

  // ========================================================
  // Animations — windows, stars, smoke, lamp
  // ========================================================

  private startAnimations(): void {
    this.scheduleNextToggle();
    this.startStarAnimation();
    this.startSmokeAnimation();
    this.startLampFlicker();
  }

  private stopAnimations(): void {
    this.windowTimer?.kill();
    this.windowTimer = null;
    for (const win of this.windows) gsap.killTweensOf(win);
    for (const t of this.starTweens) t.kill();
    this.starTweens = [];
    for (const t of this.smokeTweens) t.kill();
    this.smokeTweens = [];
    this.lampFlickerTween?.kill();
    this.lampFlickerTween = null;
  }

  private startStarAnimation(): void {
    // Generate stars across the full sky
    if (!this.centerContainer || !this.app) return;
    const sw = this.app.screen.width;
    const sh = this.app.screen.height;

    for (let i = 0; i < 25; i++) {
      const star = new Graphics();
      const radius = 0.5 + Math.random() * 1.5;
      star.circle(0, 0, radius);
      star.fill({ color: 0x6666aa });
      star.alpha = 0.05 + Math.random() * 0.2;
      star.x = sw * LEFT_W + Math.random() * sw * 0.6;
      star.y = sh * TOP_BAR_H + Math.random() * sh * 0.5;
      this.centerContainer.addChildAt(star, 0);
      this.stars.push(star);

      this.starTweens.push(gsap.to(star, {
        alpha: 0.02 + Math.random() * 0.15,
        duration: 3 + Math.random() * 5,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true,
      }));
    }
  }

  private startSmokeAnimation(): void {
    for (const smoke of this.smokeParticles) {
      this.emitSmoke(smoke);
    }
  }

  private emitSmoke(particle: Graphics): void {
    const startX = particle.x;
    const startY = particle.y;
    const delay = Math.random() * 4;

    const tween = gsap.fromTo(particle,
      { x: startX, y: startY, alpha: 0 },
      {
        x: startX + (Math.random() - 0.3) * 30,
        y: startY - 30 - Math.random() * 40,
        alpha: 0.15,
        duration: 3 + Math.random() * 2,
        ease: 'power1.out',
        delay,
        repeat: -1,
        repeatDelay: Math.random() * 2,
        onRepeat: () => {
          particle.x = startX + (Math.random() - 0.5) * 5;
        },
      },
    );

    // Fade out at end of each cycle
    const fadeTween = gsap.to(particle, {
      alpha: 0,
      duration: 1,
      delay: delay + 2.5,
      repeat: -1,
      repeatDelay: 2 + Math.random() * 2,
    });

    this.smokeTweens.push(tween, fadeTween);
  }

  private startLampFlicker(): void {
    if (!this.lampGlow) return;
    const flicker = () => {
      if (!this.lampGlow) return;
      // Quick dim then restore
      gsap.to(this.lampGlow, {
        alpha: 0.3 + Math.random() * 0.3,
        duration: 0.05 + Math.random() * 0.1,
        onComplete: () => {
          if (!this.lampGlow) return;
          gsap.to(this.lampGlow, {
            alpha: 1,
            duration: 0.1,
            onComplete: () => {
              // Schedule next flicker
              this.lampFlickerTween = gsap.delayedCall(
                5 + Math.random() * 15,
                flicker,
              );
            },
          });
        },
      });
    };

    this.lampFlickerTween = gsap.delayedCall(3 + Math.random() * 8, flicker);
  }

  private scheduleNextToggle(): void {
    const delay = 4 + Math.random() * 6;
    this.windowTimer = gsap.delayedCall(delay, () => {
      this.toggleRandomWindow();
      this.scheduleNextToggle();
    });
  }

  private toggleRandomWindow(): void {
    if (this.windows.length === 0) return;
    const idx = Math.floor(Math.random() * this.windows.length);
    const win = this.windows[idx];
    const lit = this.windowStates[idx];
    this.windowStates[idx] = !lit;
    gsap.to(win, { alpha: lit ? 0.05 : 0.7, duration: 1.2, ease: 'power2.inOut' });
  }

  // ========================================================
  // Right column — scrollable roster
  // ========================================================

  private buildRosterPanel(sw: number, sh: number): void {
    const colX = sw * (1 - RIGHT_W);
    const colW = sw * RIGHT_W;
    const contentTop = sh * TOP_BAR_H;
    const contentH = sh - contentTop;
    const padX = colW * 0.1;
    const padY = contentH * 0.03;

    const panel = new Container();
    panel.x = colX;
    panel.y = contentTop;

    const labelSize = Math.max(10, Math.round(colW * 0.065));
    const label = this.makeText('RESIDENTS', labelSize, true, TYP.dim);
    label.anchor.set(0.5, 0);
    label.x = colW / 2;
    label.y = padY;
    panel.addChild(label);

    const roster = this.config.state.roster;
    const cardW = colW - padX * 2;
    const cardH = Math.max(58, contentH * 0.13);
    const gap = contentH * 0.02;
    const scrollStartY = padY + labelSize + gap * 2;
    const scrollAreaH = contentH - scrollStartY - contentH * 0.02;

    this.rosterCardH = cardH;
    this.rosterGap = gap;

    const scrollMask = new Graphics();
    scrollMask.rect(0, scrollStartY, colW, scrollAreaH);
    scrollMask.fill({ color: 0xffffff });
    panel.addChild(scrollMask);

    const scrollContent = new Container();
    scrollContent.y = scrollStartY;
    scrollContent.mask = scrollMask;

    const totalContentH = roster.length * (cardH + gap) - (roster.length > 0 ? gap : 0);
    const hitH = Math.max(totalContentH, scrollAreaH);
    const scrollBg = new Graphics();
    scrollBg.rect(0, 0, colW, hitH);
    scrollBg.fill({ color: 0x000000, alpha: 0.001 });
    scrollContent.addChild(scrollBg);

    for (let i = 0; i < roster.length; i++) {
      const card = this.buildRosterCard(roster[i], cardW, cardH);
      card.x = padX;
      card.y = i * (cardH + gap);
      scrollContent.addChild(card);
    }

    scrollContent.eventMode = 'static';
    scrollContent.on('pointerdown', (e) => {
      this.onScrollPointerDown(e.global.y);
    });

    panel.addChild(scrollContent);
    this.scrollContent = scrollContent;

    if (totalContentH > scrollAreaH) {
      this.scrollBoundsMin = scrollStartY - (totalContentH - scrollAreaH);
      this.scrollBoundsMax = scrollStartY;
    } else {
      this.scrollBoundsMin = scrollStartY;
      this.scrollBoundsMax = scrollStartY;
    }

    this.rightPanel!.addChild(panel);
  }

  // ========================================================
  // Roster card — dark body, class color border + name only
  // ========================================================

  private buildRosterCard(char: Character, w: number, h: number): Container {
    const card = new Container();
    const r = 8;
    const colors = CLASS_COLORS[char.class] ?? CLASS_COLORS.default;

    // Dark card body with class-colored border
    const panelGfx = new Graphics();
    this.drawGamePanel(panelGfx, 0, 0, w, h, r,
      PAL.cardTop, PAL.cardBottom, colors.accent, 0.6, true);
    card.addChild(panelGfx);

    // Portrait frame — recessed dark inset
    const frameSize = h * 0.65;
    const frameX = h * 0.1;
    const frameY = (h - frameSize) / 2;

    const frame = new Graphics();
    // Dark outer
    frame.roundRect(frameX - 1, frameY - 1, frameSize + 2, frameSize + 2, 6);
    frame.fill({ color: 0x000000, alpha: 0.5 });
    // Dark inner
    frame.roundRect(frameX, frameY, frameSize, frameSize, 5);
    frame.fill({ color: 0x060612 });
    // Subtle colored inner border
    frame.roundRect(frameX + 1, frameY + 1, frameSize - 2, frameSize - 2, 4);
    frame.stroke({ color: colors.accent, width: 1, alpha: 0.2 });
    card.addChild(frame);

    // Portrait swatch — muted class color
    const framePad = 3;
    const swatch = new Graphics();
    swatch.roundRect(
      frameX + framePad, frameY + framePad,
      frameSize - framePad * 2, frameSize - framePad * 2, 3,
    );
    swatch.fill({ color: colors.accentDark, alpha: 0.6 });
    card.addChild(swatch);

    const textX = frameX + frameSize + h * 0.08;
    const textMaxW = Math.max(10, w - textX - h * 0.08);

    // Name — class accent color
    const nameSize = Math.max(9, Math.round(h * 0.2));
    const nameEl = this.buildMarquee(char.name, textMaxW, nameSize, true, colors.accentLight);
    nameEl.x = textX;
    nameEl.y = h * 0.12;
    card.addChild(nameEl);

    // Class subtitle — dim
    const clsSize = Math.max(7, Math.round(h * 0.15));
    const cls = this.makeText(this.formatClass(char.class), clsSize, false, TYP.label);
    cls.x = textX;
    cls.y = h * 0.38;
    card.addChild(cls);

    // Divider
    const divider = new Graphics();
    divider.rect(textX, h * 0.56, textMaxW, 1);
    divider.fill({ color: 0xffffff, alpha: 0.06 });
    card.addChild(divider);

    // Resolve bar
    const barX = textX;
    const barY = h * 0.65;
    const barW = textMaxW;
    const barH = Math.max(5, h * 0.1);
    const ratio = char.currentResolve / char.maxResolve;

    const track = new Graphics();
    track.roundRect(barX, barY, barW, barH, 2);
    track.fill({ color: 0x060612 });
    card.addChild(track);

    if (ratio > 0) {
      const fill = new Graphics();
      fill.roundRect(barX, barY, barW * ratio, barH, 2);
      fill.fill({ color: ratio > 0.5 ? 0x44aa44 : 0xcc4444 });
      card.addChild(fill);
    }

    // Resolve text
    const resolveText = this.makeText(
      `${char.currentResolve}/${char.maxResolve}`,
      Math.max(7, Math.round(h * 0.12)), true, TYP.number,
    );
    resolveText.x = barX;
    resolveText.y = barY + barH + 2;
    card.addChild(resolveText);

    // Hover
    card.eventMode = 'static';
    card.cursor = 'pointer';
    card.on('pointerover', () => { panelGfx.tint = 0x8888bb; });
    card.on('pointerout', () => { panelGfx.tint = 0xffffff; });

    return card;
  }

  // ========================================================
  // Marquee for long names
  // ========================================================

  private buildMarquee(
    content: string, maxW: number, size: number, bold: boolean, color: number,
  ): Container {
    const testText = this.makeText(content, size, bold, color);
    if (testText.width <= maxW) return testText;

    const outer = new Container();
    const gapW = maxW * 0.5;
    const fullWidth = testText.width + gapW;

    const maskG = new Graphics();
    maskG.rect(0, -2, maxW, testText.height + 4);
    maskG.fill({ color: 0xffffff });
    outer.addChild(maskG);

    const ticker = new Container();
    const t1 = this.makeText(content, size, bold, color);
    const t2 = this.makeText(content, size, bold, color);
    t2.x = testText.width + gapW;
    ticker.addChild(t1, t2);
    ticker.mask = maskG;
    outer.addChild(ticker);
    testText.destroy();

    const duration = fullWidth / MARQUEE_SPEED;
    const tween = gsap.to(ticker, {
      x: -fullWidth,
      duration,
      ease: 'none',
      repeat: -1,
    });
    this.marqueeTweens.push(tween);

    return outer;
  }

  private killMarquees(): void {
    for (const t of this.marqueeTweens) t.kill();
    this.marqueeTweens = [];
  }

  // ========================================================
  // Scroll — drag with momentum
  // ========================================================

  private onScrollPointerDown(globalY: number): void {
    this.isDragging = true;
    this.isScrolling = false;
    this.dragStartY = globalY;
    this.dragLastY = globalY;
    this.dragVelocity = 0;
    this.scrollMomentumTween?.kill();

    window.addEventListener('pointermove', this.onScrollPointerMove);
    window.addEventListener('pointerup', this.onScrollPointerUp);
  }

  private onScrollPointerMove = (e: PointerEvent): void => {
    if (!this.isDragging || !this.scrollContent) return;
    const dy = e.clientY - this.dragLastY;
    if (!this.isScrolling && Math.abs(e.clientY - this.dragStartY) > DRAG_THRESHOLD) {
      this.isScrolling = true;
    }
    if (this.isScrolling) {
      this.scrollContent.y += dy;
      this.dragVelocity = this.dragVelocity * 0.6 + dy * 0.4;
      this.clampScroll();
    }
    this.dragLastY = e.clientY;
  };

  private onScrollPointerUp = (e: PointerEvent): void => {
    window.removeEventListener('pointermove', this.onScrollPointerMove);
    window.removeEventListener('pointerup', this.onScrollPointerUp);
    if (!this.isDragging) return;
    this.isDragging = false;

    if (this.isScrolling && this.scrollContent) {
      if (Math.abs(this.dragVelocity) > 0.5) {
        const targetY = this.scrollContent.y + this.dragVelocity * 18;
        const clampedY = Math.max(this.scrollBoundsMin, Math.min(this.scrollBoundsMax, targetY));
        this.scrollMomentumTween = gsap.to(this.scrollContent, {
          y: clampedY,
          duration: 0.7,
          ease: 'power3.out',
        });
      }
    } else {
      this.handleCardTap(e.clientY);
    }
    this.isScrolling = false;
  };

  private handleCardTap(clientY: number): void {
    if (!this.scrollContent || !this.app) return;
    const contentTop = this.app.screen.height * TOP_BAR_H;
    const localY = clientY - contentTop - this.scrollContent.y;
    const cardIdx = Math.floor(localY / (this.rosterCardH + this.rosterGap));
    const roster = this.config.state.roster;
    if (cardIdx >= 0 && cardIdx < roster.length) {
      this.dialogueRenderer?.showCard(roster[cardIdx], 'stats');
    }
  }

  private clampScroll(): void {
    if (!this.scrollContent) return;
    this.scrollContent.y = Math.max(
      this.scrollBoundsMin,
      Math.min(this.scrollBoundsMax, this.scrollContent.y),
    );
  }

  private cleanupScroll(): void {
    window.removeEventListener('pointermove', this.onScrollPointerMove);
    window.removeEventListener('pointerup', this.onScrollPointerUp);
    this.scrollMomentumTween?.kill();
    this.scrollMomentumTween = null;
    this.scrollContent = null;
    this.isDragging = false;
    this.isScrolling = false;
  }

  // ========================================================
  // Test dialogue script
  // ========================================================

  private getTestScript(): DialogueScript {
    return {
      id: 'test_fridge_war',
      title: 'The Fridge Incident',
      participants: ['karen_1', 'conspiracy_1'],
      steps: [
        {
          type: 'narration',
          text: 'The commune kitchen has become a warzone. Someone labeled all the fridge shelves. Someone else covered the labels with conspiracy pamphlets.',
        },
        {
          type: 'speech',
          characterId: 'karen_1',
          text: 'WHO put "chemtrails are turning the frogs gay" pamphlets on MY fridge shelf?! I had a SYSTEM.',
          expression: 'angry',
        },
        {
          type: 'speech',
          characterId: 'conspiracy_1',
          text: 'The people deserve to know the truth, Karen. Your organic kale is a government psyop anyway.',
          expression: 'neutral',
        },
        {
          type: 'speech',
          characterId: 'karen_1',
          text: "I am going to speak to WHOEVER is in charge of this commune. Oh wait. That's ME.",
          expression: 'angry',
        },
        {
          type: 'choice',
          prompt: 'How do you handle this?',
          choices: [
            { id: 'side_karen', text: 'Side with Karen \u2014 the fridge shelves stay labeled.' },
            { id: 'side_dave', text: 'Side with Dave \u2014 free speech includes the fridge.' },
            { id: 'compromise', text: 'Buy a second fridge. ($50)' },
          ],
        },
        {
          type: 'outcome',
          text: 'The fridge situation has been... resolved. For now.',
          effects: [{ type: 'morale', value: -5, label: 'Commune morale -5' }],
        },
        {
          type: 'speech',
          characterId: 'conspiracy_1',
          text: "This isn't over. The fridge knows what it did.",
          expression: 'defeated',
        },
      ],
    };
  }

  // ========================================================
  // Helpers
  // ========================================================

  private makeText(content: string, size: number, bold: boolean, color: number): Text {
    const t = new Text({
      text: content,
      style: {
        fontFamily: "'Segoe UI', Helvetica, Arial, sans-serif",
        fontSize: size,
        fontWeight: bold ? 'bold' : 'normal',
        fill: color,
      },
    });
    t.resolution = TEXT_RES;
    return t;
  }

  private formatClass(cls: string): string {
    return cls.split('_').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');
  }

  private onResize = (): void => {
    if (!this.app) return;
    this.stopAnimations();
    this.buildUI();
    this.startAnimations();
    this.dialogueRenderer?.resize(this.app.screen.width, this.app.screen.height);
  };
}
