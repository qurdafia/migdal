import os
import tempfile
import shutil
import json
import threading
import time
from django.utils import timezone
from apps.automation.models import JobRun

# 🛡️ OS-AWARE IMPORT: Catch the Windows 'fcntl' error gracefully
try:
    import ansible_runner
    ANSIBLE_AVAILABLE = True
except ImportError:
    ANSIBLE_AVAILABLE = False
    print("⚠️ WARNING: ansible_runner not found or running on Windows. Migdal will MOCK execution locally.")

def execute_job_run(job_run_id):
    """
    The core automation engine. Builds the temporary Ansible environment,
    decrypts the Vault, executes the playbook, and vaporizes the evidence.
    """
    try:
        run = JobRun.objects.get(id=job_run_id)
    except JobRun.DoesNotExist:
        return False
        
    job = run.job
    credential = job.credential
    targets = job.targets.all()

    # 1. Update status to running
    run.status = 'running'
    run.save()

    # ==========================================
    # 🛑 THE WINDOWS DEV BYPASS 🛑
    # If running locally on Windows, mock the execution and exit early
    # ==========================================
    if not ANSIBLE_AVAILABLE:
        print(f"🛠️ [MOCK] Pretending to execute Job: {job.name} on targets: {[t.name for t in targets]}")
        time.sleep(3) # Simulate network delay
        
        run.status = 'successful'
        run.stdout = (
            "====================================================\n"
            "MIGDAL DEVELOPMENT MODE (WINDOWS DETECTED)\n"
            "====================================================\n"
            "Ansible is not supported natively on Windows.\n"
            "This is a simulated successful execution log to test the React UI.\n\n"
            "PLAY [Simulated Target Execution] *******************\n"
            "TASK [Gathering Facts] ******************************\n"
            "ok: [Mock-Target-01]\n"
            "TASK [Simulated Command] ****************************\n"
            "changed: [Mock-Target-01]\n\n"
            "PLAY RECAP ******************************************\n"
            "Mock-Target-01  : ok=2  changed=1  unreachable=0  failed=0\n"
        )
        run.finished_at = timezone.now()
        run.save()
        return True

    # ==========================================
    # 🚀 REAL RHEL/LINUX EXECUTION BELOW 🚀
    # ==========================================
    temp_dir = tempfile.mkdtemp(prefix=f"migdal_job_{job_run_id}_")
    
    try:
        env_dir = os.path.join(temp_dir, 'env')
        inventory_dir = os.path.join(temp_dir, 'inventory')
        project_dir = os.path.join(temp_dir, 'project')
        
        os.makedirs(env_dir)
        os.makedirs(inventory_dir)
        os.makedirs(project_dir)

        playbook_path = os.path.join(project_dir, 'main.yml')
        with open(playbook_path, 'w') as f:
            f.write(job.playbook.yaml_content)

        inventory_data = {
            "all": {
                "hosts": {},
                "vars": {
                    "ansible_user": credential.username,
                    "ansible_ssh_common_args": "-o StrictHostKeyChecking=no" 
                }
            }
        }

        secret_value = credential.secret 
        
        if "BEGIN " in secret_value: 
            ssh_key_path = os.path.join(env_dir, 'ssh_key')
            with open(ssh_key_path, 'w') as f:
                f.write(secret_value)
            os.chmod(ssh_key_path, 0o600) 
            inventory_data["all"]["vars"]["ansible_ssh_private_key_file"] = ssh_key_path
        else: 
            inventory_data["all"]["vars"]["ansible_password"] = secret_value
            inventory_data["all"]["vars"]["ansible_become_password"] = secret_value

        for target in targets:
            target_ip = target.ip_address or target.hostname or "127.0.0.1" 
            inventory_data["all"]["hosts"][target.name] = {
                "ansible_host": target_ip
            }

        inventory_path = os.path.join(inventory_dir, 'hosts.json')
        with open(inventory_path, 'w') as f:
            json.dump(inventory_data, f, indent=4)

        r = ansible_runner.run(
            private_data_dir=temp_dir,
            playbook='main.yml',
            quiet=True 
        )

        run.status = 'successful' if r.rc == 0 else 'failed'
        
        if r.stdout and os.path.exists(r.stdout.name):
            with open(r.stdout.name, 'r') as log_file:
                run.stdout = log_file.read()
        else:
            run.stdout = "Execution completed, but no standard output was captured."

    except Exception as e:
        run.status = 'failed'
        run.stdout = f"SYSTEM ERROR: Migdal encountered a fatal error before execution.\n{str(e)}"
        
    finally:
        run.finished_at = timezone.now()
        run.save()
        shutil.rmtree(temp_dir, ignore_errors=True)

    return run.status == 'successful'

def trigger_job_async(job_run_id):
    """
    A lightweight wrapper to run the job in the background so the API doesn't freeze.
    """
    thread = threading.Thread(target=execute_job_run, args=(job_run_id,))
    thread.start()