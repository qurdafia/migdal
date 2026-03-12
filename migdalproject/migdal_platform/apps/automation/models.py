import uuid
from django.db import models
from django_cryptography.fields import encrypt
from apps.accounts.models import Organization
from apps.core.models import DataSource

# --- 1. THE VAULT (CREDENTIALS) ---
class Credential(models.Model):
    """
    Securely stores passwords, SSH keys, and API tokens. 
    The 'secret' field is AES-256 encrypted at rest.
    """
    CREDENTIAL_TYPES = [
        ('machine', 'Machine (SSH/WinRM)'),
        ('vcenter', 'VMware vCenter'),
        ('network', 'Network Device (OSPF/BGP)'),
        ('api', 'Generic API Token'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='credentials')
    
    name = models.CharField(max_length=255, help_text="e.g., 'Prod vCenter Admin'")
    credential_type = models.CharField(max_length=50, choices=CREDENTIAL_TYPES)
    
    # Public identity
    username = models.CharField(max_length=255, blank=True, null=True, help_text="e.g., 'root' or 'administrator@vsphere.local'")
    
    # 🛡️ THE ENCRYPTED VAULT
    secret = encrypt(models.TextField(help_text="Encrypted at rest. Stores the password, API token, or SSH Private Key."))

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.get_credential_type_display()})"


# --- 2. EXECUTION ENVIRONMENTS (DEPENDENCIES) ---
class ExecutionEnvironment(models.Model):
    """
    Defines the Ansible Collections and Python packages needed for a job.
    Migdal uses this to spin up isolated Podman containers on the fly.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='environments')
    
    name = models.CharField(max_length=255, help_text="e.g., 'VMware & Dell Storage Ops'")
    
    # Stores the requirements.yml payload
    collections_json = models.JSONField(
        default=list, 
        help_text='[{"name": "community.vmware", "version": "3.6.0"}, {"name": "dellemc.powerstore", "version": "2.2.0"}]'
    )
    
    # Stores the requirements.txt payload
    python_packages_json = models.JSONField(
        default=list,
        help_text='["pyvmomi", "requests"]'
    )

    def __str__(self):
        return self.name


# --- 3. THE CODE (PLAYBOOKS) ---
class Playbook(models.Model):
    """
    Stores the actual YAML code written by the engineers in the React GUI.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='playbooks')
    
    name = models.CharField(max_length=255, help_text="e.g., 'Provision New VM'")
    description = models.TextField(blank=True, null=True)
    
    yaml_content = models.TextField(help_text="The raw Ansible YAML payload")
    
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


# --- 4. THE SCHEDULER (AUTOMATION JOB) ---
class AutomationJob(models.Model):
    """
    The Master Template. Ties the Code, the Targets, the Vault, and the Environment together.
    Matches the concept of an AAP "Job Template".
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='automation_jobs')
    
    name = models.CharField(max_length=255, help_text="e.g., 'Weekly Nginx Patching'")
    
    playbook = models.ForeignKey(Playbook, on_delete=models.RESTRICT)
    environment = models.ForeignKey(ExecutionEnvironment, on_delete=models.RESTRICT)
    credential = models.ForeignKey(Credential, on_delete=models.RESTRICT)
    
    # The dynamic inventory bridge mapping directly to Migdal's existing targets
    targets = models.ManyToManyField(DataSource, related_name='targeted_jobs')
    
    # Scheduling (Using standard Cron syntax)
    cron_schedule = models.CharField(max_length=100, blank=True, null=True, help_text="e.g., '0 2 * * 0' for every Sunday at 2 AM")
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name


# --- 5. THE HISTORY (JOB RUNS) ---
class JobRun(models.Model):
    """
    The live execution record. Stores the stdout logs streamed back from Ansible Runner.
    """
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('running', 'Running'),
        ('successful', 'Successful'),
        ('failed', 'Failed'),
        ('canceled', 'Canceled'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    job = models.ForeignKey(AutomationJob, on_delete=models.CASCADE, related_name='runs')
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    # The live green/red terminal text
    stdout = models.TextField(blank=True, null=True)
    
    started_at = models.DateTimeField(auto_now_add=True)
    finished_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        ordering = ['-started_at']

    def __str__(self):
        return f"{self.job.name} - {self.get_status_display()} ({self.started_at.strftime('%Y-%m-%d %H:%M')})"