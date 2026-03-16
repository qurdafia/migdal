from celery import shared_task
from django.utils import timezone
from apps.automation.models import AutomationJob, JobRun
from apps.automation.services import execute_job_run

@shared_task(bind=True)
def execute_scheduled_job(self, job_id):
    try:
        # 1. Verify the job still exists and is active
        job = AutomationJob.objects.get(id=job_id)
        
        if not job.is_active:
            return f"Job '{job.name}' (ID: {job_id}) is disabled. Skipping."

        # 2. Create the JobRun record
        # 👇 FIX: Removed created_at. Django handles started_at automatically!
        run = JobRun.objects.create(
            job=job,
            status='pending'
        )

        # 3. Hand it off to your execution engine
        success = execute_job_run(run.id)

        if success:
            return f"Successfully executed Job '{job.name}' (Run #{run.id})"
        else:
            return f"Failed execution for Job '{job.name}' (Run #{run.id})"

    except AutomationJob.DoesNotExist:
        return f"Error: Attempted to run Job ID {job_id}, but it was deleted."
    except Exception as e:
        return f"Critical failure in scheduled task: {str(e)}"