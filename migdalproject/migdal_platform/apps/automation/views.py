from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import Credential, ExecutionEnvironment, Playbook, AutomationJob, JobRun
from .serializers import (
    CredentialSerializer, ExecutionEnvironmentSerializer, 
    PlaybookSerializer, AutomationJobSerializer, JobRunSerializer
)

from .services import trigger_job_async


class BaseTenantViewSet(viewsets.ModelViewSet):
    """
    A master ViewSet that automatically locks everything down to the user's organization.
    """
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # 🛡️ STRICT MULTI-TENANCY: Only return data belonging to this organization
        return self.queryset.filter(organization=self.request.user.organization)

    def perform_create(self, serializer):
        # 🛡️ Automatically attach the organization when creating a new record
        serializer.save(organization=self.request.user.organization)

class CredentialViewSet(BaseTenantViewSet):
    queryset = Credential.objects.all()
    serializer_class = CredentialSerializer

class ExecutionEnvironmentViewSet(BaseTenantViewSet):
    queryset = ExecutionEnvironment.objects.all()
    serializer_class = ExecutionEnvironmentSerializer

class PlaybookViewSet(BaseTenantViewSet):
    queryset = Playbook.objects.all()
    serializer_class = PlaybookSerializer

class AutomationJobViewSet(BaseTenantViewSet):
    
    queryset = AutomationJob.objects.all()

    serializer_class = AutomationJobSerializer


    # 🚀 THE MAGIC EXECUTION ENDPOINT
    @action(detail=True, methods=['post'])
    def execute(self, request, pk=None):
        job = self.get_object()
        
        # 1. Create a "Pending" Job Run record
        run = JobRun.objects.create(job=job, status='pending')
        
        # 2. Fire off the Ansible engine in the background!
        trigger_job_async(run.id)
        
        return Response({
            "status": "Job initiated successfully", 
            "run_id": run.id
        }, status=status.HTTP_202_ACCEPTED)


class JobRunViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Job Runs are Read-Only from the API perspective. 
    React can fetch them to show logs, but cannot edit them.
    """
    serializer_class = JobRunSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return JobRun.objects.filter(job__organization=self.request.user.organization).order_by('-started_at')