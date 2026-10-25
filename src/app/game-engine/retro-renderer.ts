import Phaser from 'phaser';

import { CELL, PAL } from './game-config';
import { PORTAL_COLORS } from './glc';
import type { MealyState } from './mealy';

export class RetroRenderer {
  constructor(
    private readonly grid: number[][],
    private readonly groups: Map<string, number>
  ) {}

  drawLabels(scene: Phaser.Scene): void {
    for (let r = 0; r < this.grid.length; r++) {
      for (let c = 0; c < this.grid[0].length; c++) {
        const value = this.grid[r][c];
        if (value === 3) {
          scene.add.text(c * CELL + CELL / 2, r * CELL + CELL / 2, 'EXIT', {
            fontFamily: '"Press Start 2P"',
            fontSize: '5px',
            color: '#00cc66',
          }).setOrigin(0.5);
        }

        if (value >= 10) {
          const color = PORTAL_COLORS[(value - 10) % PORTAL_COLORS.length];
          scene.add.text(c * CELL + CELL / 2, r * CELL + CELL / 2, 'λ', {
            fontFamily: '"Press Start 2P"',
            fontSize: '10px',
            color: color.css,
          }).setOrigin(0.5);
        }
      }
    }
  }

  drawMap(gfx: Phaser.GameObjects.Graphics, pulse: number): void {
    const zoneFills = [0x0d0d18, 0x0e0e1a, 0x0c0c17, 0x0f0f1c, 0x0d0e19, 0x0b0c16];
    gfx.clear();

    for (let r = 0; r < this.grid.length; r++) {
      for (let c = 0; c < this.grid[0].length; c++) {
        const value = this.grid[r][c];
        const px = c * CELL;
        const py = r * CELL;

        if (value === 0) {
          this.drawWall(gfx, px, py);
        } else if (value >= 10) {
          this.drawPortal(gfx, px, py, value - 10, pulse);
        } else {
          this.drawFloor(gfx, px, py, r, c, value, pulse, zoneFills);
        }
      }
    }
  }

  drawPlayer(
    gfx: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    alpha: number,
    portalColor?: number
  ): void {
    const bx = Math.round(x);
    const by = Math.round(y);
    gfx.clear();
    gfx.fillStyle(0x000000, alpha * 0.25).fillRect(bx - 7, by + 7, 14, 4);
    gfx.fillStyle(PAL.player, alpha).fillRect(bx - 7, by - 8, 14, 14);
    gfx.fillStyle(PAL.floor, alpha)
      .fillRect(bx - 7, by - 8, 1, 1)
      .fillRect(bx + 6, by - 8, 1, 1)
      .fillRect(bx - 7, by + 5, 1, 1)
      .fillRect(bx + 6, by + 5, 1, 1);
    gfx.fillStyle(PAL.playerDark, alpha).fillRect(bx - 4, by - 5, 8, 8);
    gfx.fillStyle(PAL.playerEye, alpha).fillRect(bx - 3, by - 3, 2, 2).fillRect(bx + 1, by - 3, 2, 2);

    if (portalColor != null) {
      gfx.lineStyle(1, portalColor, alpha * 0.6).strokeRect(bx - 9, by - 10, 18, 18);
    }
  }

  drawEnemy(gfx: Phaser.GameObjects.Graphics, x: number, y: number, state: MealyState): void {
    const bx = Math.round(x);
    const by = Math.round(y);
    const colors: Record<MealyState, number> = {
      patrullando: PAL.eP,
      persiguiendo: PAL.eC,
      atacando: PAL.eA,
    };
    const color = colors[state] ?? PAL.eP;
    gfx.clear();
    gfx.fillStyle(0x000000, 0.2).fillRect(bx - 6, by + 6, 12, 3);
    gfx.fillStyle(color, 0.92).fillRect(bx - 5, by - 7, 10, 10).fillRect(bx - 6, by - 5, 12, 8);
    gfx.fillRect(bx - 6, by + 3, 3, 4).fillRect(bx - 1, by + 3, 3, 4).fillRect(bx + 4, by + 3, 3, 4);
    gfx.fillStyle(0xffffff, 0.9).fillRect(bx - 3, by - 4, 3, 3).fillRect(bx + 1, by - 4, 3, 3);
    const pupil = state === 'atacando' ? 0xff0000 : state === 'persiguiendo' ? 0xff8800 : 0x333333;
    gfx.fillStyle(pupil, 1).fillRect(bx - 2, by - 3, 2, 2).fillRect(bx + 2, by - 3, 2, 2);
  }

  private drawWall(gfx: Phaser.GameObjects.Graphics, px: number, py: number): void {
    gfx.fillStyle(PAL.wall, 1).fillRect(px, py, CELL, CELL);
    gfx.fillStyle(PAL.wallEdge, 1).fillRect(px, py, CELL, 1).fillRect(px, py, 1, CELL);
    gfx.fillStyle(0x0a0a15, 1).fillRect(px, py + CELL - 1, CELL, 1).fillRect(px + CELL - 1, py, 1, CELL);
  }

  private drawPortal(gfx: Phaser.GameObjects.Graphics, px: number, py: number, colorIdx: number, pulse: number): void {
    const color = PORTAL_COLORS[colorIdx % PORTAL_COLORS.length];
    const brightness = 0.4 + 0.6 * Math.sin(pulse + colorIdx * 1.05);
    gfx.fillStyle(color.dark, 1).fillRect(px, py, CELL, CELL);
    gfx.lineStyle(2, color.hex, brightness * 0.95).strokeRect(px + 1, py + 1, CELL - 2, CELL - 2);
    gfx.fillStyle(color.hex, brightness * 0.15).fillRect(px + 2, py + 2, CELL - 4, CELL - 4);
    const cx = px + Math.floor(CELL / 2);
    const cy = py + Math.floor(CELL / 2);
    const size = Math.round(4 * brightness);
    gfx.fillStyle(color.hex, brightness * 0.8).fillRect(cx - 1, cy - size, 2, size * 2).fillRect(cx - size, cy - 1, size * 2, 2);
  }

  private drawFloor(
    gfx: Phaser.GameObjects.Graphics,
    px: number,
    py: number,
    r: number,
    c: number,
    value: number,
    pulse: number,
    zoneFills: number[]
  ): void {
    const groupIndex = this.groups.get(`${r},${c}`) ?? 0;
    gfx.fillStyle(zoneFills[groupIndex % zoneFills.length], 1).fillRect(px, py, CELL, CELL);
    gfx.fillStyle(0x080812, 1).fillRect(px, py, 1, 1).fillRect(px + CELL - 1, py + CELL - 1, 1, 1);

    if (value === 3) this.drawExit(gfx, px, py, pulse);
    if (value === 2) this.drawStart(gfx, px, py);
  }

  private drawExit(gfx: Phaser.GameObjects.Graphics, px: number, py: number, pulse: number): void {
    gfx.fillStyle(PAL.exit, 1).fillRect(px, py, CELL, CELL);
    const exitPulse = 0.5 + 0.5 * Math.sin(pulse * 2.5);
    gfx.lineStyle(2, PAL.exitBorder, exitPulse).strokeRect(px + 1, py + 1, CELL - 2, CELL - 2);
    gfx.lineStyle(1, PAL.exitBorder, 0.7);
    gfx.lineBetween(px + 5, py + 5, px + CELL - 5, py + CELL - 5);
    gfx.lineBetween(px + CELL - 5, py + 5, px + 5, py + CELL - 5);
  }

  private drawStart(gfx: Phaser.GameObjects.Graphics, px: number, py: number): void {
    gfx.fillStyle(PAL.start, 1).fillRect(px, py, CELL, CELL);
    gfx.fillStyle(0x003366, 0.5).fillRect(px + CELL / 2 - 3, py + CELL / 2 - 3, 6, 6);
  }
}
