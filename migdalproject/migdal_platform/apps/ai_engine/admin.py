from django.contrib import admin
from .models import AIProvider, PromptTemplate, AnalysisReport

class AIProviderAdmin(admin.ModelAdmin):
    list_display = ('name', 'provider_type', 'model_name', 'is_active')
    list_filter = ('provider_type', 'is_active')
    search_fields = ('name',)

class PromptTemplateAdmin(admin.ModelAdmin):
    list_display = ('name', 'is_default', 'created_at')
    list_filter = ('is_default',)
    search_fields = ('name', 'template_text')

class AnalysisReportAdmin(admin.ModelAdmin):
    list_display = ('created_at', 'source', 'provider', 'is_anomaly')
    list_filter = ('is_anomaly', 'created_at', 'source')
    readonly_fields = ('content', 'source', 'provider', 'created_at')

admin.site.register(AIProvider, AIProviderAdmin)
admin.site.register(PromptTemplate, PromptTemplateAdmin)
admin.site.register(AnalysisReport, AnalysisReportAdmin)