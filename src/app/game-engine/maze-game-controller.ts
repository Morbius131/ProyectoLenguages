import Phaser from 'phaser';

import { AFD } from './afd';
import { ArcadeHud } from './arcade-hud';
import { bfs } from './bfs';
import {
  CELL,
  DIFFS,
  cellToPixel,
  enemiesForLevel,
  manhattan,
  normalizeDifficulty,
  portalsForLevel,
  type DifficultyId,
  type State,
  type SymbolKey,
} from './game-config';
import { GLC, PORTAL_COLORS } from './glc';
import { LambdaTransitions } from './lambda';
import { EnemyMealy } from './mealy';
import { RetroRenderer } from './retro-renderer';

declare global {
  interface Window {
    startGame?: (difficulty: number) => void;
    showMenu?: () => void;
  }
}

let controller: MazeGameController | null = null;

export function loadOriginalMazeGame(): void {
  controller = new MazeGameController();
  window.startGame = (difficulty: number) => controller?.startGame(difficulty);
  window.showMenu = () => controller?.showMenu();
  controller.showMenu();
}

export function destroyOriginalMazeGame(): void {
  controller?.destroy();
  controller = null;
}

class MazeGameController {
  private readonly hud = new ArcadeHud();
  private game: Phaser.Game | null = null;
  private difficulty: DifficultyId = 1;
  private level = 1;
  private score = 0;
  private lives = 3;
  private highScore = 0;

  startGame(difficulty: number): void {
    this.difficulty = normalizeDifficulty(difficulty);
    this.level = 1;
    this.score = 0;
    this.lives = DIFFS[this.difficulty].lv;
    this.hud.hideMenu();
    this.runLevel();
  }

  showMenu(): void {
    this.destroyCurrentGame();
    this.hud.showMenu(this.highScore);
  }

  destroy(): void {
    this.destroyCurrentGame();
  }

  private runLevel(): void {
    this.destroyCurrentGame();
    this.hud.showGame();
    this.hud.setHUD(this.level, this.lives, this.score, this.highScore);
    this.game = this.createGame();
  }

  private createGame(): Phaser.Game {
    const diff = DIFFS[this.difficulty];
    const seed = this.seedFor(this.level);
    const generated = new GLC(seed).generate(this.level, portalsForLevel(this.level, PORTAL_COLORS.length), diff.sizeBonus);
    const scene = new MazeLevelScene({
      generated,
      difficultyId: this.difficulty,
      level: this.level,
      score: this.score,
      lives: this.lives,
      highScore: this.highScore,
      hud: this.hud,
      onScore: (score) => {
        this.score = score;
      },
      onLives: (lives) => {
        this.lives = lives;
      },
      onRecord: (score) => {
        this.highScore = score;
      },
      onRetry: () => this.runLevel(),
      onGameOver: () => this.finishGameOver(),
      onWin: () => this.finishLevelWin(),
    });

    return new Phaser.Game({
      type: Phaser.AUTO,
      width: generated.cols * CELL,
      height: generated.rows * CELL,
      backgroundColor: '#080812',
      parent: 'gc',
      scene: [scene],
    });
  }

  private finishGameOver(): void {
    this.hud.showGameOver(this.score, this.level);
  }

  private finishLevelWin(): void {
    const nextLevel = this.level + 1;
    this.hud.showWin(this.score, nextLevel, () => {
      this.level = nextLevel;
      this.runLevel();
    });
  }

  private destroyCurrentGame(): void {
    if (this.game) {
      this.game.destroy(true);
      this.game = null;
    }
  }

  private seedFor(level: number): number {
    return (this.difficulty * 10000 + level) * 31 + 7;
  }
}

interface MazeLevelSceneConfig {
  generated: ReturnType<GLC['generate']>;
  difficultyId: DifficultyId;
  level: number;
  score: number;
  lives: number;
  highScore: number;
  hud: ArcadeHud;
  onScore: (score: number) => void;
  onLives: (lives: number) => void;
  onRecord: (score: number) => void;
  onRetry: () => void;
  onGameOver: () => void;
  onWin: () => void;
}

interface EnemyRuntime {
  pos: State;
  mealy: EnemyMealy;
  moving: boolean;
  pPath: State[];
  pIdx: number;
  px: { x: number; y: number };
  tpx: { x: number; y: number };
}

class MazeLevelScene extends Phaser.Scene {
  private readonly diff;
  private readonly grid: number[][];
  private readonly afd: AFD;
  private readonly lambda: LambdaTransitions;
  private readonly retroRenderer: RetroRenderer;
  private readonly enemyCount: number;
  private readonly enemies: EnemyRuntime[];
  private readonly enemyTickMs: number;

  private mapGfx!: Phaser.GameObjects.Graphics;
  private playerGfx!: Phaser.GameObjects.Graphics;
  private enemyGfx: Phaser.GameObjects.Graphics[] = [];
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;

  private playerState: State;
  private playerPixel: { x: number; y: number };
  private playerTarget: { x: number; y: number };
  private playerMoving = false;
  private teleporting = false;
  private teleportTimer = 0;
  private teleportAlpha = 1;
  private pulse = 0;
  private playerBob = 0;
  private keyHeld: SymbolKey | null = null;
  private keyTimer = 0;
  private enemyAccum = 0;
  private gameOn = true;
  private deathPauseEnemyIndex: number | null = null;
  private readonly deathPauseDuration = 1800;
  private score: number;
  private lives: number;

  constructor(private readonly config: MazeLevelSceneConfig) {
    super({ key: 'GameScene' });
    this.diff = DIFFS[config.difficultyId];
    this.grid = config.generated.grid;
    this.afd = new AFD(this.grid);
    this.lambda = new LambdaTransitions(config.generated.portals);
    this.retroRenderer = new RetroRenderer(this.grid, this.afd.minimize());
    this.enemyCount = enemiesForLevel(config.level, this.diff, config.generated.rows, config.generated.cols);
    this.playerState = this.afd.startState;
    this.playerPixel = cellToPixel(this.playerState);
    this.playerTarget = cellToPixel(this.playerState);
    this.enemies = this.spawnEnemies();
    this.enemyTickMs = (CELL / this.diff.spd) * 1000;
    this.score = config.score;
    this.lives = config.lives;
  }

  create(): void {
    this.mapGfx = this.add.graphics();
    this.playerGfx = this.add.graphics();
    this.enemyGfx = this.enemies.map(() => this.add.graphics());
    this.retroRenderer.drawLabels(this);
    this.retroRenderer.drawMap(this.mapGfx, 0);
    this.drawPlayer();
    this.enemies.forEach((enemy, i) => this.retroRenderer.drawEnemy(this.enemyGfx[i], enemy.px.x, enemy.px.y, enemy.mealy.state));
    this.keys = this.input.keyboard!.addKeys({
      u: Phaser.Input.Keyboard.KeyCodes.W,
      d: Phaser.Input.Keyboard.KeyCodes.S,
      l: Phaser.Input.Keyboard.KeyCodes.A,
      r: Phaser.Input.Keyboard.KeyCodes.D,
      u2: Phaser.Input.Keyboard.KeyCodes.UP,
      d2: Phaser.Input.Keyboard.KeyCodes.DOWN,
      l2: Phaser.Input.Keyboard.KeyCodes.LEFT,
      r2: Phaser.Input.Keyboard.KeyCodes.RIGHT,
    }) as Record<string, Phaser.Input.Keyboard.Key>;
    this.config.hud.setHUD(this.config.level, this.lives, this.score, this.config.highScore, this.enemyCount);
  }

  override update(_time: number, delta: number): void {
    if (!this.gameOn) return;

    this.pulse += delta * 0.0035;
    this.playerBob += delta * 0.005;
    this.retroRenderer.drawMap(this.mapGfx, this.pulse);
    this.updateTeleport(delta);
    this.handleInput(delta);
    this.updatePlayer(delta);
    this.updateEnemies(delta);
    this.checkWin();
  }

  private spawnEnemies(): EnemyRuntime[] {
    const free: State[] = [];
    for (let r = 0; r < this.config.generated.rows; r++) {
      for (let c = 0; c < this.config.generated.cols; c++) {
        const value = this.grid[r][c];
        if (value !== 0 && value !== 2 && value !== 3) free.push(`${r},${c}`);
      }
    }

    free.sort((a, b) => manhattan(b, this.playerState) - manhattan(a, this.playerState));
    const step = Math.max(1, Math.floor(free.length / (this.enemyCount + 1)));
    return Array.from({ length: this.enemyCount }, (_, i) => {
      const pos = free[Math.min(step * (i + 1) - 1, free.length - 1)] ?? free[0] ?? this.playerState;
      const px = cellToPixel(pos);
      return { pos, mealy: new EnemyMealy(), moving: false, pPath: [], pIdx: 0, px: { ...px }, tpx: { ...px } };
    });
  }

  private handleInput(delta: number): void {
    if (this.playerMoving || this.teleporting) return;
    this.keyTimer += delta;
    const symbol = this.currentInput();

    if (symbol) {
      if (symbol !== this.keyHeld) {
        this.keyHeld = symbol;
        this.keyTimer = 0;
        this.move(symbol);
      } else if (this.keyTimer > 140) {
        this.keyTimer = 0;
        this.move(symbol);
      }
    } else {
      this.keyHeld = null;
    }
  }

  private currentInput(): SymbolKey | null {
    if (this.keys['u'].isDown || this.keys['u2'].isDown) return 'W';
    if (this.keys['d'].isDown || this.keys['d2'].isDown) return 'S';
    if (this.keys['l'].isDown || this.keys['l2'].isDown) return 'A';
    if (this.keys['r'].isDown || this.keys['r2'].isDown) return 'D';
    return null;
  }

  private move(symbol: SymbolKey): void {
    const next = this.afd.delta(this.playerState, symbol);
    if (next === this.playerState) return;

    this.playerState = next;
    this.score += this.diff.mult;
    this.config.onScore(this.score);

    if (this.lambda.isPortal(this.playerState)) this.enterPortal();
    else {
      this.playerTarget = cellToPixel(this.playerState);
      this.playerMoving = true;
    }

    this.config.hud.setHUD(this.config.level, this.lives, this.score, this.config.highScore);
  }

  private enterPortal(): void {
    this.playerTarget = cellToPixel(this.playerState);
    this.playerMoving = true;
    setTimeout(() => {
      const destination = this.lambda.applyLambda(this.playerState);
      if (!destination) return;
      this.playerState = destination;
      this.playerPixel = cellToPixel(destination);
      this.playerTarget = cellToPixel(destination);
      this.playerMoving = false;
      this.teleporting = true;
      this.teleportTimer = 0;
      const closure = this.lambda.epsilonClosure(this.playerState);
      const color = PORTAL_COLORS[this.lambda.colorOf(this.playerState) % PORTAL_COLORS.length];
      this.config.hud.toast(`PORTAL λ ${[...closure].join('→')}`, color.css);
      this.config.hud.showPortal(color.css);
    }, 180);
  }

  private updateTeleport(delta: number): void {
    if (!this.teleporting) return;
    this.teleportTimer += delta;
    this.teleportAlpha = 1 - Math.min(1, this.teleportTimer / 200);
    if (this.teleportTimer >= 200) {
      this.teleporting = false;
      this.teleportAlpha = 1;
      this.teleportTimer = 0;
    }
  }

  private updatePlayer(delta: number): void {
    const lerp = Math.min(1, delta * 0.02);
    this.playerPixel.x += (this.playerTarget.x - this.playerPixel.x) * lerp;
    this.playerPixel.y += (this.playerTarget.y - this.playerPixel.y) * lerp;

    if (Math.abs(this.playerPixel.x - this.playerTarget.x) < 0.5 && Math.abs(this.playerPixel.y - this.playerTarget.y) < 0.5) {
      this.playerPixel = { ...this.playerTarget };
      this.playerMoving = false;
    }

    this.drawPlayer();
  }

  private drawPlayer(): void {
    const portalColor = this.lambda.isPortal(this.playerState)
      ? PORTAL_COLORS[this.lambda.colorOf(this.playerState) % PORTAL_COLORS.length].hex
      : undefined;
    const bob = this.playerMoving ? 0 : Math.sin(this.playerBob) * 1.2;
    this.retroRenderer.drawPlayer(this.playerGfx, this.playerPixel.x, this.playerPixel.y + bob, this.teleportAlpha, portalColor);
  }

  private updateEnemies(delta: number): void {
    this.enemyAccum += delta;
    const doTick = this.enemyAccum >= this.enemyTickMs;
    if (doTick) this.enemyAccum = 0;

    this.enemies.forEach((enemy, i) => {
      this.updateEnemyPixel(enemy, delta);
      if (doTick && !enemy.moving) this.tickEnemy(enemy, i);
    });

    this.renderEnemies();
  }

  private renderEnemies(): void {
    const pauseAttackerIndex = !this.gameOn ? this.deathPauseEnemyIndex : null;
    this.enemies.forEach((enemy, i) => {
      const renderState = pauseAttackerIndex === i ? 'atacando' : enemy.mealy.state;
      this.retroRenderer.drawEnemy(
        this.enemyGfx[i],
        enemy.px.x,
        enemy.px.y + Math.sin(this.playerBob + i * 1.3),
        renderState
      );
    });
  }

  private updateEnemyPixel(enemy: EnemyRuntime, delta: number): void {
    const lerp = Math.min(1, delta * 0.014);
    enemy.px.x += (enemy.tpx.x - enemy.px.x) * lerp;
    enemy.px.y += (enemy.tpx.y - enemy.px.y) * lerp;
    if (Math.abs(enemy.px.x - enemy.tpx.x) < 0.5 && Math.abs(enemy.px.y - enemy.tpx.y) < 0.5) {
      enemy.px = { ...enemy.tpx };
      enemy.moving = false;
    }
  }

  private tickEnemy(enemy: EnemyRuntime, enemyIndex: number): void {
    const path = bfs(this.grid, enemy.pos, this.playerState);
    const realDistance = path.length > 0 ? path.length : 999;
    const { action } = enemy.mealy.step(realDistance, this.diff.vr);
    let next = enemy.pos;

    if (action === 'perseguir' || action === 'atacar') {
      if (path.length) next = path[0];
    } else {
      next = this.nextPatrolStep(enemy);
    }

    if (next !== enemy.pos) {
      enemy.pos = next;
      enemy.tpx = cellToPixel(next);
      enemy.moving = true;
    }

    if (enemy.pos === this.playerState && this.gameOn) this.handleDeath(enemyIndex);
  }

  private nextPatrolStep(enemy: EnemyRuntime): State {
    if (enemy.pPath.length === 0 || enemy.pIdx >= enemy.pPath.length) {
      const candidates = this.patrolCandidates(enemy.pos);
      if (candidates.length) {
        const destination = candidates[Math.floor(Math.random() * candidates.length)];
        enemy.pPath = bfs(this.grid, enemy.pos, destination);
        enemy.pIdx = 0;
      }
    }
    if (enemy.pPath.length && enemy.pIdx < enemy.pPath.length) return enemy.pPath[enemy.pIdx++];
    return enemy.pos;
  }

  private patrolCandidates(pos: State): State[] {
    const [er, ec] = pos.split(',').map(Number);
    const candidates: State[] = [];
    for (let dr = -this.diff.pr; dr <= this.diff.pr; dr++) {
      for (let dc = -this.diff.pr; dc <= this.diff.pr; dc++) {
        const nr = er + dr;
        const nc = ec + dc;
        if (this.afd.isValid(nr, nc) && this.grid[nr][nc] !== 3) candidates.push(`${nr},${nc}`);
      }
    }
    return candidates;
  }

  private handleDeath(enemyIndex: number): void {
    this.gameOn = false;
    this.deathPauseEnemyIndex = enemyIndex;
    this.lives--;
    this.config.onLives(this.lives);
    setTimeout(() => {
      if (this.lives <= 0) {
        this.updateRecord();
        this.config.onGameOver();
      } else {
        this.config.onRetry();
      }
    }, this.deathPauseDuration);
  }

  private checkWin(): void {
    if (!this.afd.isFinal(this.playerState) || !this.gameOn) return;
    this.gameOn = false;
    this.score += 100 * this.diff.mult + this.lives * 30 * this.diff.mult + Math.floor(this.config.level * 10 * this.diff.mult);
    this.config.onScore(this.score);
    this.updateRecord();
    this.config.hud.setHUD(this.config.level, this.lives, this.score, this.config.highScore);
    setTimeout(() => this.config.onWin(), 300);
  }

  private updateRecord(): void {
    if (this.score <= this.config.highScore) return;
    this.config.onRecord(this.score);
    this.config.hud.showRecord();
  }
}
