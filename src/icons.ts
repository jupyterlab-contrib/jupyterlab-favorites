import { LabIcon } from '@jupyterlab/ui-components';
import starSvgstr from '../style/icons/md/baseline-star-24px.svg';
import starBorderSvgstr from '../style/icons/md/baseline-star_border-24px.svg';

export const filledStarIcon = new LabIcon({
  name: 'jupyterlab-favorites:filledStar',
  svgstr: starSvgstr,
});

export const starIcon = new LabIcon({
  name: 'jupyterlab-favorites:star',
  svgstr: starBorderSvgstr,
});
