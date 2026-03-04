from django.urls import path
from .views import DownloadReportView, CategoryHealthReportView, HistoricalReportView

urlpatterns = [
    # Individual Report Download (for AI reports)
    path('download/<int:report_id>/', DownloadReportView.as_view(), name='download_pdf'),

    # Category Reports (Matches both /hypervisor/download/ AND /hypervisor/csv/)
    path('category/<str:category>/<str:report_type>/', CategoryHealthReportView.as_view(), name='category_report'),
    path('historical/', HistoricalReportView.as_view()),
]