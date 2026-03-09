from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import Organization, User


from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import Organization, User


class OrganizationAdmin(admin.ModelAdmin):
    list_display = ('name', 'tier', 'max_devices', 'is_license_valid', 'license_expiry')
    search_fields = ('name', 'license_key')
    list_filter = ('created_at',)
    
    # 🛡️ 1. Declare these at the CLASS level so Django knows they aren't database columns
    readonly_fields = ('id', 'tier', 'max_devices', 'license_expiry', 'is_license_valid')
    
    # 2. Define the order they appear on the screen
    fields = (
        'id', 
        'name', 
        'license_key', 
        'tier', 
        'max_devices', 
        'license_expiry', 
        'is_license_valid'
    )
    
    # 3. Dynamically lock 'name' ONLY when editing an existing organization
    def get_readonly_fields(self, request, obj=None):
        if obj: 
            # Editing existing: lock the name field too
            return self.readonly_fields + ('name',)
            
        # Creating new: keep the base read-only fields, but let them type the name
        return self.readonly_fields

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




# class OrganizationAdmin(admin.ModelAdmin):
#     list_display = ('name', 'tier', 'max_devices', 'is_license_valid', 'license_expiry')
#     search_fields = ('name', 'license_key')
#     list_filter = ('created_at',)
    
#     # id, name, and the calculated properties are all READ-ONLY
#     readonly_fields = ('id', 'name', 'tier', 'max_devices', 'license_expiry', 'is_license_valid')
    
#     fields = (
#         'id', 
#         'name', # This is now locked!
#         'license_key', 
#         'tier', 
#         'max_devices', 
#         'license_expiry', 
#         'is_license_valid'
#     )
    
#     # OPTIONAL: Allow naming only during the initial creation
#     def get_readonly_fields(self, request, obj=None):
#         if obj: # If the object exists (editing), name is read-only
#             return self.readonly_fields
#         return ('id',) # If creating a new one, name is editable
        

# Extend the default UserAdmin to show our custom fields
# class CustomUserAdmin(UserAdmin):
#     # 1. Show these columns in the user list
#     list_display = ('username', 'email', 'organization', 'role', 'is_staff')
    
#     # 2. Add a new section to the "Edit User" form
#     fieldsets = UserAdmin.fieldsets + (
#         ('Organization Info', {'fields': ('organization', 'role')}),
#     )
    
#     # 3. Add a new section to the "Create User" form
#     add_fieldsets = UserAdmin.add_fieldsets + (
#         ('Organization Info', {'fields': ('organization', 'role')}),
#     )

# # Register the models using the new config
# admin.site.register(Organization, OrganizationAdmin)
# admin.site.register(User, CustomUserAdmin)