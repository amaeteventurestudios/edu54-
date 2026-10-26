# JupyterHub for teachers and admins (docs/53). Not linked from student screens; students reach it only through
# Build -> "Open in notebook" for classes that allow it. Single-user servers run without network access by default.
import os

c = get_config()  # noqa: F821
c.JupyterHub.bind_url = "http://0.0.0.0:8000"
c.JupyterHub.authenticator_class = "jupyterhub.auth.DummyAuthenticator"
c.DummyAuthenticator.password = os.environ["JUPYTERHUB_SHARED_PASSWORD"]   # from the secrets file, never the repo
c.Authenticator.allowed_users = set(filter(None, os.environ.get("JUPYTERHUB_ALLOWED_USERS", "admin,mswilliams").split(",")))
c.Authenticator.admin_users = {"admin"}
c.JupyterHub.spawner_class = "jupyterhub.spawner.SimpleLocalProcessSpawner"
c.SimpleLocalProcessSpawner.home_dir_template = "/home/jupyter/{username}"
c.Spawner.default_url = "/lab"
c.Spawner.mem_limit = "512M"
c.Spawner.cpu_limit = 1
c.JupyterHub.cleanup_servers = True
c.MappingKernelManager.cull_idle_timeout = 900       # idle culling
