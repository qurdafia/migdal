from rest_framework import serializers
from .models import Credential, ExecutionEnvironment, Playbook, AutomationJob, JobRun

class CredentialSerializer(serializers.ModelSerializer):
    class Meta:
        model = Credential
        fields = ['id', 'name', 'credential_type', 'username', 'secret', 'created_at']
        extra_kwargs = {
            # 🛡️ THE IRON CLAD SECURITY RULE:
            # React can POST the secret to save it, but Django will NEVER include it in a GET request.
            'secret': {'write_only': True} 
        }

class ExecutionEnvironmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExecutionEnvironment
        fields = ['id', 'name', 'collections_json', 'python_packages_json']

class PlaybookSerializer(serializers.ModelSerializer):
    class Meta:
        model = Playbook
        fields = ['id', 'name', 'description', 'yaml_content', 'updated_at']

class AutomationJobSerializer(serializers.ModelSerializer):
    class Meta:
        model = AutomationJob
        fields = ['id', 'name', 'playbook', 'environment', 'credential', 'targets', 'cron_schedule', 'is_active']

class JobRunSerializer(serializers.ModelSerializer):
    class Meta:
        model = JobRun
        fields = ['id', 'job', 'status', 'stdout', 'started_at', 'finished_at']
        # 🛡️ Logs are strictly read-only. The frontend cannot fake a successful run.
        read_only_fields = ['status', 'stdout', 'started_at', 'finished_at']