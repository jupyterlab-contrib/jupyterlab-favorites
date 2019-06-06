import {
  JupyterLab, JupyterLabPlugin
} from '@jupyterlab/application';

import '../style/index.css';


/**
 * Initialization data for the jupyterlab-favorites extension.
 */
const extension: JupyterLabPlugin<void> = {
  id: 'jupyterlab-favorites',
  autoStart: true,
  activate: (app: JupyterLab) => {
    console.log('JupyterLab extension jupyterlab-favorites is activated!');
  }
};

export default extension;
