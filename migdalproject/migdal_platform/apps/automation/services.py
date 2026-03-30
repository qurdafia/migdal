import os
import tempfile
import shutil
import json
import threading
import subprocess
from django.utils import timezone
from django.conf import settings
from apps.automation.models import JobRun

# 🛡️ OS-AWARE IMPORT
try:
    import ansible_runner
    ANSIBLE_AVAILABLE = True
except ImportError:
    ANSIBLE_AVAILABLE = False
    print("⚠️ WARNING: ansible_runner not found or running on Windows. Migdal will MOCK execution locally.")

def setup_dynamic_environment(environment, temp_dir):
    """
    Reads the Environment JSON payloads and dynamically installs
    Ansible Collections and Python Packages via subprocess.
    """
    if not environment:
        return ""
        
    setup_logs = "--- Environment Provisioning ---\n"
    
    # 1. Install Python Packages via pip
    if environment.python_packages_json and isinstance(environment.python_packages_json, list):
        packages = environment.python_packages_json
        if packages:
            setup_logs += f"Installing Python packages: {', '.join(packages)}...\n"
            try:
                result = subprocess.run(['pip', 'install', '--quiet'] + packages, capture_output=True, text=True)
                if result.returncode == 0:
                    setup_logs += "✅ Python packages installed successfully.\n"
                else:
                    setup_logs += f"❌ Python package error: {result.stderr}\n"
            except Exception as e:
                setup_logs += f"❌ Failed to run pip: {str(e)}\n"

    # 2. Install Ansible Collections via ansible-galaxy
    if environment.collections_json and isinstance(environment.collections_json, list):
        collections = environment.collections_json
        if collections:
            req_path = os.path.join(temp_dir, 'requirements.yml')
            
            with open(req_path, 'w') as f:
                f.write("---\ncollections:\n")
                for col in collections:
                    name = col.get('name')
                    version = col.get('version', '')
                    if name:
                        if version and version.lower() != 'latest':
                            f.write(f"  - name: {name}\n    version: {version}\n")
                        else:
                            f.write(f"  - name: {name}\n")
            
            setup_logs += f"Installing Ansible collections...\n"
            try:
                collections_path = os.path.join(temp_dir, 'collections')
                result = subprocess.run(
                    ['ansible-galaxy', 'collection', 'install', '-r', req_path, '-p', collections_path],
                    capture_output=True, text=True
                )
                if result.returncode == 0:
                    setup_logs += "✅ Ansible collections installed successfully.\n"
                else:
                    setup_logs += f"❌ Ansible galaxy error: {result.stderr}\n"
            except Exception as e:
                setup_logs += f"❌ Failed to run ansible-galaxy: {str(e)}\n"

    setup_logs += "--- Environment Ready ---\n\n"
    return setup_logs


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

    run.status = 'running'
    run.save()

    if not ANSIBLE_AVAILABLE:
        run.status = 'successful'
        run.stdout = "MIGDAL DEV MODE: Simulated Execution Success."
        run.finished_at = timezone.now()
        run.save()
        return True

    temp_dir = tempfile.mkdtemp(prefix=f"migdal_job_{job_run_id}_")
    
    try:
        env_dir = os.path.join(temp_dir, 'env')
        inventory_dir = os.path.join(temp_dir, 'inventory')
        project_dir = os.path.join(temp_dir, 'project')
        
        os.makedirs(env_dir)
        os.makedirs(inventory_dir)
        os.makedirs(project_dir)

        # 🚀 THE NEW ENVIRONMENT BUILDER
        setup_logs = ""
        if job.environment:
            setup_logs = setup_dynamic_environment(job.environment, temp_dir)

        # Write the Playbook
        playbook_path = os.path.join(project_dir, 'main.yml')
        with open(playbook_path, 'w') as f:
            f.write(job.playbook.yaml_content)

        # 🌟 BUILD DYNAMIC INVENTORY
        migdal_host = getattr(settings, 'MIGDAL_BASE_URL', 'http://127.0.0.1:8000').rstrip('/')

        inventory_data = {
            "all": {
                "hosts": {},
                "children": {}, 
                "vars": {
                    "ansible_user": credential.username,
                    "ansible_ssh_common_args": "-o StrictHostKeyChecking=no",
                    "migdal_ingest_url": f"{migdal_host}/api/core/ingest/"
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

        # 1. ADD INDIVIDUAL TARGETS
        for target in targets:
            target_ip = target.ip_address or target.hostname or "127.0.0.1" 
            inventory_data["all"]["hosts"][target.name] = {
                "ansible_host": target_ip,
                "migdal_api_key": str(target.id)
            }

        # 2. ADD TARGET GROUPS
        for group in job.target_groups.all():
            group_name = group.name.replace(" ", "_").lower()
            inventory_data["all"]["children"][group_name] = {"hosts": {}}
            
            for device in group.devices.all():
                device_ip = device.ip_address or device.hostname or "127.0.0.1"
                inventory_data["all"]["children"][group_name]["hosts"][device.name] = {
                    "ansible_host": device_ip,
                    "migdal_api_key": str(device.id)
                }

        inventory_path = os.path.join(inventory_dir, 'hosts.json')
        with open(inventory_path, 'w') as f:
            json.dump(inventory_data, f, indent=4)
        
        # 🔗 Tell Ansible exactly where we installed the collections
        custom_env = os.environ.copy()
        custom_env['ANSIBLE_COLLECTIONS_PATH'] = os.path.join(temp_dir, 'collections')

        # Fire Ansible Runner
        r = ansible_runner.run(
            private_data_dir=temp_dir,
            playbook='main.yml',
            quiet=True,
            envvars=custom_env 
        )

        run.status = 'successful' if r.rc == 0 else 'failed'
        
        # Combine the setup logs with the actual playbook execution logs
        final_output = setup_logs
        if r.stdout and os.path.exists(r.stdout.name):
            with open(r.stdout.name, 'r') as log_file:
                final_output += log_file.read()
        else:
            final_output += "Execution completed, no standard output captured."
            
        run.stdout = final_output

    except Exception as e:
        run.status = 'failed'
        run.stdout = f"SYSTEM ERROR: Migdal encountered a fatal error.\n{str(e)}"
        
    finally:
        run.finished_at = timezone.now()
        run.save()
        shutil.rmtree(temp_dir, ignore_errors=True)

    return run.status == 'successful'


def trigger_job_async(job_run_id):
    thread = threading.Thread(target=execute_job_run, args=(job_run_id,))
    thread.start()