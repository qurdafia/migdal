import os
from celery import Celery

# 👇 CHANGE THIS: migdal_platform.settings -> migdal.settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'migdal.settings')

# 👇 CHANGE THIS: migdal_platform -> migdal
app = Celery('migdal')

app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()

@app.task(bind=True, ignore_result=True)
def debug_task(self):
    print(f'Request: {self.request!r}')