from rest_framework import serializers
from .models import Credential, AutomationJob, Playbook, ExecutionEnvironment, JobRun

class CredentialSerializer(serializers.ModelSerializer):
    class Meta:
        model = Credential
        fields = '__all__'
        # 🛡️ 1. Tell the API to NEVER send this field back in a GET request
        extra_kwargs = {
            'secret': {'write_only': True}
        }

    def update(self, instance, validated_data):
        # 🛡️ 2. If the frontend sends a blank secret during an edit, 
        # ignore it so we don't overwrite the existing encrypted password.
        if 'secret' in validated_data and not validated_data['secret'].strip():
            validated_data.pop('secret')
            
        return super().update(instance, validated_data)


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