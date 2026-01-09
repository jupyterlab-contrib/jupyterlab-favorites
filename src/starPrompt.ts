import { JupyterFrontEnd } from '@jupyterlab/application';
import { BoxLayout, Widget } from '@lumino/widgets';
import { CommandIDs, FAVORITE_FILTER_CLASS, FAVORITE_TAG } from './token';
import {
  Cell,
  IInputPrompt,
  InputPrompt,
  MarkdownCell
} from '@jupyterlab/cells';
import { ToolbarButton } from '@jupyterlab/ui-components';
import { filledStarIcon, starIcon } from './icons';
import { Notebook, NotebookPanel } from '@jupyterlab/notebook';

const INPUT_PROMPT_CLASS = 'jp-InputPrompt';
const INPUT_PROMPT_NUMBER_CLASS = 'jp-Favorites-InputPromptNumber';
const FAVORITE_ICON_ON_CLASS = 'jp-Favorites-star-class';
const FAVORITE_ICON_OFF_CLASS = 'jp-Favorites-star-class-off';
const FAVORITE_ICON_BASE_CLASS = 'jp-Favorites-base-star-class';

export class StarredInputPrompt extends Widget implements IInputPrompt {
  private _executionCount: string | null = null;
  private _promptIndicator: InputPrompt;
  private _favoriteIconOn: ToolbarButton;
  private _favoriteIconOff: ToolbarButton;

  constructor(private _app: JupyterFrontEnd) {
    super();
    this.addClass(INPUT_PROMPT_CLASS);

    const layout = (this.layout = new BoxLayout({
      direction: 'right-to-left'
    }));
    this._promptIndicator = new InputPrompt();
    this._promptIndicator.node.classList.add(INPUT_PROMPT_NUMBER_CLASS);
    layout.addWidget(this._promptIndicator);
    this._favoriteIconOff = new ToolbarButton({
      icon: starIcon,
      onClick: () => {
        this._app.commands.execute(CommandIDs.toggleCellFavorite);
      },
      tooltip: 'Mark as favorite'
    });
    this._favoriteIconOff.addClass(FAVORITE_ICON_OFF_CLASS);
    this._favoriteIconOff.addClass(FAVORITE_ICON_BASE_CLASS);
    this._favoriteIconOn = new ToolbarButton({
      icon: filledStarIcon,
      onClick: () => {
        this._app.commands.execute(CommandIDs.toggleCellFavorite);
      },
      tooltip: 'Remove from favorites'
    });
    this._favoriteIconOn.addClass(FAVORITE_ICON_ON_CLASS);
    this._favoriteIconOn.addClass(FAVORITE_ICON_BASE_CLASS);
    layout.addWidget(this._favoriteIconOff);
    layout.addWidget(this._favoriteIconOn);
  }

  get executionCount(): string | null {
    return this._executionCount;
  }
  set executionCount(value: string | null) {
    this._executionCount = value;
    this._promptIndicator.executionCount = value;
  }
}

export namespace StarredNotebookContentFactory {
  export interface IOptions extends Cell.ContentFactory.IOptions {
    app: JupyterFrontEnd;
    mystFactory?: NotebookPanel.IContentFactory;
  }
}

class FavoritesNotebook extends Notebook {
  constructor(options: Notebook.IOptions) {
    super(options);
  }

  get activeCellIndex(): number {
    if (!this.model) {
      return -1;
    }
    return this.widgets.length ? super.activeCellIndex : -1;
  }

  set activeCellIndex(newValue: number) {
    const oldValue = super.activeCellIndex;

    // Validate bounds
    if (!this.model || !this.widgets.length) {
      newValue = -1;
    } else {
      newValue = Math.max(newValue, 0);
      newValue = Math.min(newValue, this.widgets.length - 1);
    }

    // If favorites filter is not active, use default behavior
    if (!this._isFavoritesFilterActive()) {
      super.activeCellIndex = newValue;
      return;
    }

    // If target cell is favorite, use default behavior
    if (this._isCellFavorite(newValue)) {
      super.activeCellIndex = newValue;
      return;
    }

    // Target cell is not a favorite, find nearest favorite
    const direction: 1 | -1 = newValue > oldValue ? 1 : -1;
    const nearestFavoriteIndex = this._findNearestFavoriteCell(
      newValue,
      direction
    );

    if (nearestFavoriteIndex !== -1) {
      super.activeCellIndex = nearestFavoriteIndex;
      return;
    }
  }

  /**
   * Check if a cell at the given index is marked as favorite
   */
  private _isCellFavorite(cellIndex: number): boolean {
    if (cellIndex < 0 || cellIndex >= this.widgets.length) {
      return false;
    }

    const cell = this.widgets[cellIndex];
    const tags = cell.model.getMetadata('tags');
    return Array.isArray(tags) && tags.includes(FAVORITE_TAG);
  }

  /**
   * Check if the favorites filter is currently active
   */
  private _isFavoritesFilterActive(): boolean {
    return this.node.classList.contains(FAVORITE_FILTER_CLASS);
  }

  /**
   * Find the nearest favorite cell in a given direction
   * @param startIndex - Index to start searching from
   * @param direction - 1 for down, -1 for up
   */
  private _findNearestFavoriteCell(
    startIndex: number,
    direction: 1 | -1
  ): number {
    let currentIndex = startIndex + direction;

    while (currentIndex >= 0 && currentIndex < this.widgets.length) {
      if (this._isCellFavorite(currentIndex)) {
        return currentIndex;
      }
      currentIndex += direction;
    }

    return -1;
  }
}

export class StarredNotebookContentFactory
  extends NotebookPanel.ContentFactory
{
  constructor(options: StarredNotebookContentFactory.IOptions) {
    super(options);
    this._app = options.app;
    this._mystFactory = options.mystFactory;
  }

  createInputPrompt(): StarredInputPrompt {
    return new StarredInputPrompt(this._app);
  }

  createMarkdownCell(options: MarkdownCell.IOptions): MarkdownCell {
    if (this._mystFactory) {
      return this._mystFactory.createMarkdownCell(options);
    }
    return new MarkdownCell(options).initializeState();
  }

  createNotebook(options: Notebook.IOptions): Notebook {
    return new FavoritesNotebook(options);
  }

  private _app: JupyterFrontEnd;
  private _mystFactory?: NotebookPanel.IContentFactory;
}
