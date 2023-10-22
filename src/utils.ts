import { LabIcon } from '@jupyterlab/ui-components';
import { filledStarIcon, starIcon } from './icons';
import { PathExt } from '@jupyterlab/coreutils';

export function getFavoritesIcon(filled: boolean): LabIcon {
  return filled ? filledStarIcon : starIcon;
}

/**
 * Split the file path in two parts: the name and the folder
 * @param path Path to display
 * @returns [name, folder]
 */
export function getName(path: string): [string, string] {
  return [PathExt.basename(path), PathExt.dirname(path)];
}

export function getPinnerActionDescription(showRemove: boolean): string {
  return `${showRemove ? 'Remove' : 'Add'} Favorite`;
}

export function mergePaths(root: string, path: string): string {
  return PathExt.join(root, path);
}
