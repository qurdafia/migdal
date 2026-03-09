import csv
import io
from django.core.mail import EmailMessage, get_connection
from django.utils import timezone

from apps.core.models import DataSource, EmailConfiguration
from apps.ai_engine.models import AnalysisReport
from apps.ai_engine.services import AIAnalysisService
from apps.reports.utils import render_to_pdf 

def generate_global_csv(organization):
    """
    Generates a master CSV containing ALL devices across ALL categories.
    """
    # Grab absolutely everything for this org, sorted by Type
    devices = DataSource.objects.filter(organization=organization).order_by('device_type', 'name')
    
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    # Added 'Type' to the columns so you can sort the CSV in Excel
    writer.writerow(['Type', 'Name', 'IP Address', 'Health Status', 'CPU Load', 'Memory', 'Last Timestamp'])
    
    for d in devices:
        qs = d.telemetry.all() if hasattr(d, 'telemetry') else d.telemetryrecord_set.all()
        rec = qs.order_by('-timestamp').first()
        
        health_status = "No Data"
        cpu = "N/A"
        mem = "N/A"
        ip = "N/A"
        ts = "N/A"
        
        if rec and rec.payload:
            payload_data = rec.payload
            ip = payload_data.get('ip_address') or payload_data.get('host_ip') or "N/A"
            
            c_val = payload_data.get('cpu_1min') or payload_data.get('cpu_usage') or payload_data.get('cluster_cpu_usage_pct') or 0
            m_val = payload_data.get('memory_usage') or payload_data.get('ram_usage') or 0
            
            try: float_c = float(c_val)
            except: float_c = 0
            try: float_m = float(m_val)
            except: float_m = 0

            if float_c > 90 or float_m > 90: health_status = "CRITICAL"
            elif float_c > 75 or float_m > 75: health_status = "WARNING"
            else: health_status = "HEALTHY"

            cpu = f"{c_val}%" if c_val != 0 else "N/A"
            mem = f"{m_val}%" if m_val != 0 else "N/A"
            ts = timezone.localtime(rec.timestamp).strftime("%Y-%m-%d %H:%M:%S")
            # ts = rec.timestamp.strftime("%Y-%m-%d %H:%M:%S")

        writer.writerow([d.device_type.upper(), d.name, ip, health_status, cpu, mem, ts])
        
    return buffer.getvalue()


def send_consolidated_alerts(device_ids):
    """
    Accepts a LIST of device_ids, runs AI for all of them, and sends ONE email
    using the Organization's specific Email Configuration.
    """
    if not device_ids:
        print("No devices provided. Skipping email.")
        return False
        
    try:
        # 🛡️ 1. Find the Organization from the first device in the payload
        first_device = DataSource.objects.get(id=device_ids[0])
        organization = first_device.organization
        
        # 🛡️ 2. Fetch the specific Email Config for THIS Organization
        config = EmailConfiguration.objects.filter(organization=organization).first()
        
        if not config or not config.is_active:
            print(f"Email notifications are OFF or missing for {organization.name}. Skipping email.")
            return False

        ai_service = AIAnalysisService()
        report_objs = []
        device_names = []
        
        # 3. Loop through all triggered devices and run AI
        for d_id in device_ids:
            device = DataSource.objects.get(id=d_id)
            device_names.append(device.name)
            
            print(f"🧠 Running AI Analysis for {device.name}...")
            ai_result = ai_service.analyze_device(d_id)
            
            if "report_id" in ai_result:
                report = AnalysisReport.objects.filter(id=ai_result["report_id"]).first()
                if report:
                    report_objs.append(report)

        # 4. Build ONE combined PDF
        pdf_bytes = None
        if report_objs:
            print(f"📄 Rendering combined multi-page AI PDF...")
            context = {
                'reports': report_objs,
                'generated_at': timezone.localtime(timezone.now()).strftime('%Y-%m-%d %H:%M:%S')
            }
            pdf_bytes = render_to_pdf('reports/consolidated_analysis_pdf.html', context)

        # 5. Build the Master CSV for THIS Organization
        print(f"📊 Generating global fleet health CSV for {organization.name}...")
        csv_string = generate_global_csv(organization)

        # 6. Connect to SMTP and Send ONE Email using the Org's credentials
        connection = get_connection(
            host=config.smtp_server, port=config.smtp_port,
            username=config.smtp_username, password=config.smtp_password,
            use_tls=config.use_tls, fail_silently=False,
        )
        
        device_list_text = "\n".join([f"- {name}" for name in device_names])
        body_text = f"{config.message_body}\n\nThe following devices reported new telemetry:\n{device_list_text}\n\nAttached is the combined AI diagnosis PDF and the global fleet health CSV."
        
        email = EmailMessage(
            subject=f"{config.subject} - {len(device_ids)} Devices Updated",
            body=body_text,
            from_email=config.from_address,
            to=[email.strip() for email in config.recipient_list.split(',')],
            connection=connection,
        )
        
        if pdf_bytes:
            email.attach('Combined_AI_Analysis.pdf', pdf_bytes, 'application/pdf')
            
        if csv_string:
            email.attach('Global_Fleet_Health.csv', csv_string, 'text/csv')
            
        email.send()
        print(f"✅ ONE master email sent to {organization.name} with {len(report_objs)} AI reports!")
        return True
        
    except Exception as e:
        print(f"❌ Batch Alert Pipeline Failed: {e}")
        return False
        

# def send_consolidated_alerts(device_ids):
#     """
#     Accepts a LIST of device_ids, runs AI for all of them, and sends ONE email.
#     """
#     config = EmailConfiguration.objects.first()
#     if not config or not config.is_active or not device_ids:
#         print("Email notifications are OFF or no devices updated. Skipping email.")
#         return False
        
#     try:
#         ai_service = AIAnalysisService()
#         report_objs = []
#         device_names = []
#         organization = None
        
#         # 1. Loop through all triggered devices and run AI
#         for d_id in device_ids:
#             device = DataSource.objects.get(id=d_id)
#             organization = device.organization # Save the org for the CSV
#             device_names.append(device.name)
            
#             print(f"🧠 Running AI Analysis for {device.name}...")
#             ai_result = ai_service.analyze_device(d_id)
            
#             if "report_id" in ai_result:
#                 report = AnalysisReport.objects.filter(id=ai_result["report_id"]).first()
#                 if report:
#                     report_objs.append(report)

#         # 2. Build ONE combined PDF (Pass the LIST of reports to the template)
#         pdf_bytes = None
#         if report_objs:
#             print(f"📄 Rendering combined multi-page AI PDF...")
#             context = {
#                 'reports': report_objs,  # Notice this is plural now!
#                 'generated_at': timezone.localtime(timezone.now()).strftime('%Y-%m-%d %H:%M:%S')
#                 # 'generated_at': timezone.now().strftime('%Y-%m-%d %H:%M:%S')
#             }
#             pdf_bytes = render_to_pdf('reports/consolidated_analysis_pdf.html', context)

#         # 3. Build the Master CSV
#         print(f"📊 Generating global fleet health CSV...")
#         csv_string = generate_global_csv(organization)

#         # 4. Connect to SMTP and Send ONE Email
#         connection = get_connection(
#             host=config.smtp_server, port=config.smtp_port,
#             username=config.smtp_username, password=config.smtp_password,
#             use_tls=config.use_tls, fail_silently=False,
#         )
        
#         device_list_text = "\n".join([f"- {name}" for name in device_names])
#         body_text = f"{config.message_body}\n\nThe following devices reported new telemetry:\n{device_list_text}\n\nAttached is the combined AI diagnosis PDF and the global fleet health CSV."
        
#         email = EmailMessage(
#             subject=f"{config.subject} - {len(device_ids)} Devices Updated",
#             body=body_text,
#             from_email=config.from_address,
#             to=[email.strip() for email in config.recipient_list.split(',')],
#             connection=connection,
#         )
        
#         if pdf_bytes:
#             email.attach('Combined_AI_Analysis.pdf', pdf_bytes, 'application/pdf')
            
#         if csv_string:
#             email.attach('Global_Fleet_Health.csv', csv_string, 'text/csv')
            
#         email.send()
#         print(f"✅ ONE master email sent with {len(report_objs)} AI reports and the Global CSV!")
#         return True
        
#     except Exception as e:
#         print(f"❌ Batch Alert Pipeline Failed: {e}")
#         return False