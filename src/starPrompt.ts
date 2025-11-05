import { JupyterFrontEnd } from '@jupyterlab/application';
import { BoxLayout, Widget} from '@lumino/widgets';
// import { Notebook } from '@jupyterlab/notebook';
import { CommandIDs } from './token';
import { Cell, IInputPrompt, InputPrompt } from '@jupyterlab/cells';
import { ToolbarButton } from '@jupyterlab/ui-components';
import { filledStarIcon, starIcon } from './icons';
import { NotebookPanel } from '@jupyterlab/notebook';

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

    const layout = (this.layout = new BoxLayout({ direction: 'right-to-left' }));;
    this._promptIndicator = new InputPrompt();
    this._promptIndicator.node.classList.add(INPUT_PROMPT_NUMBER_CLASS)
    layout.addWidget(this._promptIndicator);
    this._favoriteIconOff = new ToolbarButton({
      icon: starIcon,
      onClick: () => {
      this._app.commands.execute(CommandIDs.toggleCellFavorite);
      },
      tooltip: 'Mark as favorite'
    });
    this._favoriteIconOff.addClass(FAVORITE_ICON_OFF_CLASS);
    this._favoriteIconOff.addClass(FAVORITE_ICON_BASE_CLASS)
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
    this._promptIndicator.executionCount = value
  }

}

export namespace StarredNotebookContentFactory {
  export interface IOptions extends Cell.ContentFactory.IOptions {
    app: JupyterFrontEnd
  }
}

export class StarredNotebookContentFactory extends NotebookPanel.ContentFactory {
  private _app: JupyterFrontEnd;

  constructor(options: StarredNotebookContentFactory.IOptions) {
    super(options)
    this._app = options.app;
  }

  createInputPrompt(): StarredInputPrompt {
    return new StarredInputPrompt(this._app);
  }
}
