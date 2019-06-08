from jupyterlab import labapp
from notebook.base.handlers import IPythonHandler

class FavoritesHandler(IPythonHandler):
    def get(self):
        """
        Get a list a favorites from data on disk.
        """
        print('labapp', labapp)
        pass