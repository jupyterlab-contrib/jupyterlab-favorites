"""JupyterLab Favorites : Add the ability to save favorite folders to JupyterLab for quicker browsing."""

from .favorites import FavoritesHandler
from notebook.utils import url_path_join

__version__='0.1.0'

def _jupyter_server_extension_paths():
    return [{
        'module': 'jupyterlab_favorites'
    }]

def load_jupyter_server_extension(nb_server_app):
    """
    Called when the extension is loaded.

    Args:
        nb_server_app (NotebookWebApplication): handle to the Notebook webserver instance.
    """
    nb_server_app.log.info('jupyterlab_favorites server extension loaded')
    web_app = nb_server_app.web_app
    host_pattern = '.*$'
    route_pattern = url_path_join(web_app.settings['base_url'], '/favorites')
    web_app.add_handlers(host_pattern, [(route_pattern, FavoritesHandler)])
