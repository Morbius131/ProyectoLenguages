import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  NgZone,
  OnDestroy,
  PLATFORM_ID,
  ViewEncapsulation,
  inject,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

import { destroyOriginalMazeGame, loadOriginalMazeGame } from '../game-engine/game-scene';

@Component({
  selector: 'app-maze-game',
  templateUrl: './maze-game.component.html',
  styleUrl: './maze-game.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class MazeGameComponent implements AfterViewInit, OnDestroy {
  private readonly zone = inject(NgZone);
  private readonly platformId = inject(PLATFORM_ID);

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.zone.runOutsideAngular(() => {
      void loadOriginalMazeGame();
    });
  }

  ngOnDestroy(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    destroyOriginalMazeGame();
  }
}
