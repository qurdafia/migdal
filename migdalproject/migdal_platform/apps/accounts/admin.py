from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import Organization, User

class OrganizationAdmin(admin.ModelAdmin):
    list_display = ('name', 'tier', 'max_devices', 'is_license_valid', 'license_expiry')
    search_fields = ('name', 'license_key')
    list_filter = ('tier', 'created_at')
    readonly_fields = ('id',)

# Extend the default UserAdmin to show our custom fields
class CustomUserAdmin(UserAdmin):
    # 1. Show these columns in the user list
    list_display = ('username', 'email', 'organization', 'role', 'is_staff')
    
    # 2. Add a new section to the "Edit User" form
    fieldsets = UserAdmin.fieldsets + (
        ('Organization Info', {'fields': ('organization', 'role')}),
    )
    
    # 3. Add a new section to the "Create User" form
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Organization Info', {'fields': ('organization', 'role')}),
    )

# Register the models using the new config
admin.site.register(Organization, OrganizationAdmin)
admin.site.register(User, CustomUserAdmin)