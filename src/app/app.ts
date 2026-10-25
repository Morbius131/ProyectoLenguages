import { ChangeDetectionStrategy, Component } from '@angular/core';

import { MazeGameComponent } from './maze-game/maze-game.component';

@Component({
  selector: 'app-root',
  imports: [MazeGameComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {}
