export class ArcadeHud {
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  setHUD(level: number, lives: number, score: number, highScore: number, enemyCount?: number): void {
    this.byId('hl').textContent = String(level);
    this.byId('hv').textContent = '♥'.repeat(Math.max(0, lives));
    this.byId('hs').textContent = String(score);
    this.byId('hh').textContent = String(highScore);
    if (enemyCount != null) this.byId('he').textContent = String(enemyCount);
  }

  showPortal(colorCss: string): void {
    const portal = this.byId('hbp');
    portal.style.color = colorCss;
    portal.classList.add('show');
    setTimeout(() => portal.classList.remove('show'), 1200);
  }

  toast(message: string, color = '#aaa'): void {
    const node = this.byId('toast');
    node.textContent = message;
    node.style.color = color;
    node.style.borderColor = color;
    node.classList.add('on');
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => node.classList.remove('on'), 1600);
  }

  showRecord(): void {
    this.toast('★ NUEVO RÉCORD!', '#ffcc00');
  }

  showMenu(highScore: number): void {
    this.hide('ov-go');
    this.hide('ov-win');
    this.show('ov-menu');
    this.byId('hudbar').classList.remove('on');
    if (highScore > 0) {
      this.byId('menu-hi').style.display = 'block';
      this.byId('menu-hi-val').textContent = String(highScore);
    }
  }

  showGame(): void {
    this.hide('ov-go');
    this.hide('ov-win');
    this.byId('hudbar').classList.add('on');
  }

  hideMenu(): void {
    this.hide('ov-menu');
  }

  showGameOver(score: number, level: number): void {
    this.byId('go-s').textContent = String(score);
    this.byId('go-l').textContent = String(level);
    this.byId('hudbar').classList.remove('on');
    this.show('ov-go');
  }

  showWin(score: number, nextLevel: number, onNextLevel: () => void): void {
    this.byId('win-s').textContent = "PTS " + String(score);
    this.byId('win-nl').textContent = String(nextLevel);
    this.byId('win-sub').textContent = `NVL ${nextLevel}`;
    (this.byId('win-btn') as HTMLButtonElement).onclick = onNextLevel;
    this.byId('hudbar').classList.remove('on');
    this.show('ov-win');
  }

  private show(id: string): void {
    this.byId(id).classList.remove('off');
  }

  private hide(id: string): void {
    this.byId(id).classList.add('off');
  }

  private byId<T extends HTMLElement = HTMLElement>(id: string): T {
    return document.getElementById(id)! as T;
  }
}
