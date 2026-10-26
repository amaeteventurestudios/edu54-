FROM quay.io/jupyterhub/jupyterhub:5.3.0
RUN pip install --no-cache-dir jupyterlab notebook
COPY jupyterhub_config.py /srv/jupyterhub/jupyterhub_config.py
