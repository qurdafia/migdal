from django.contrib import admin
from .models import Credential, ExecutionEnvironment, Playbook, AutomationJob, JobRun

@admin.register(Credential)
class CredentialAdmin(admin.ModelAdmin):
    list_display = ('name', 'credential_type', 'username', 'organization')
    search_fields = ('name', 'username')
    list_filter = ('credential_type', 'organization')
    
    # We do NOT put 'secret' in list_display for security reasons!
    fields = ('organization', 'name', 'credential_type', 'username', 'secret')

@admin.register(ExecutionEnvironment)
class ExecutionEnvironmentAdmin(admin.ModelAdmin):
    list_display = ('name', 'organization')
    search_fields = ('name',)
    list_filter = ('organization',)

@admin.register(Playbook)
class PlaybookAdmin(admin.ModelAdmin):
    list_display = ('name', 'organization', 'updated_at')
    search_fields = ('name', 'description')
    list_filter = ('organization',)
    
    # Make the YAML text area take up more space
    fields = ('organization', 'name', 'description', 'yaml_content')

@admin.register(AutomationJob)
class AutomationJobAdmin(admin.ModelAdmin):
    list_display = ('name', 'playbook', 'environment', 'organization', 'is_active')
    search_fields = ('name',)
    list_filter = ('is_active', 'organization')
    
    # 🎨 UX MAGIC: This renders the target DataSources as a beautiful dual-list box
    filter_horizontal = ('targets',)
    
    fields = (
        'organization', 
        'name', 
        'is_active',
        'playbook', 
        'environment', 
        'credential', 
        'targets', 
        'cron_schedule'
    )

@admin.register(JobRun)
class JobRunAdmin(admin.ModelAdmin):
    list_display = ('job', 'status', 'started_at', 'finished_at')
    list_filter = ('status',)
    search_fields = ('job__name',)
    
    # 🛡️ Logs should be immutable! We make stdout and timestamps read-only.
    readonly_fields = ('status', 'stdout', 'started_at', 'finished_at')
    
    def get_readonly_fields(self, request, obj=None):
        if obj: # If viewing an existing run, lock everything
            return [f.name for f in self.model._meta.fields]
        return self.readonly_fields