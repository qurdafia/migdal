from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import Organization, User

class OrganizationAdmin(admin.ModelAdmin):
    list_display = ('name', 'tier', 'max_devices', 'is_license_valid', 'license_expiry')
    search_fields = ('name', 'license_key')
    list_filter = ('created_at',)
    
    # id, name, and the calculated properties are all READ-ONLY
    readonly_fields = ('id', 'name', 'tier', 'max_devices', 'license_expiry', 'is_license_valid')
    
    fields = (
        'id', 
        'name', # This is now locked!
        'license_key', 
        'tier', 
        'max_devices', 
        'license_expiry', 
        'is_license_valid'
    )
    
    # OPTIONAL: Allow naming only during the initial creation
    def get_readonly_fields(self, request, obj=None):
        if obj: # If the object exists (editing), name is read-only
            return self.readonly_fields
        return ('id',) # If creating a new one, name is editable
        

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