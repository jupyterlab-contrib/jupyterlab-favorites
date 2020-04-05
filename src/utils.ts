import { LabIcon } from '@jupyterlab/ui-components';
import { filledStarIcon, starIcon } from './icons';

export function getFavoritesIcon(filled: boolean): LabIcon {
  return filled ? filledStarIcon : starIcon;
}

export function getName(path: string) {
  let name = '';
  const parts = path.split('/');
  if (parts.length > 0) {
    name = parts[parts.length - 1];
  }
  return name;
}

export function getPinnerActionDescription(showRemove: boolean) {
  return `${showRemove ? 'Remove' : 'Add'} Favorite`;
}

export function mergePaths(root: string, path: string) {
  if (root.endsWith('/')) {
    root = root.slice(0, -1);
  }
  if (path.endsWith('/')) {
    path = path.slice(1);
  }
  return `${root}/${path}`;
}
