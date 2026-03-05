import requests
import json
import logging
import urllib3
from .models import AIProvider, PromptTemplate, AnalysisReport
from apps.core.models import DataSource

# 1. DISABLE SSL WARNINGS (Crucial for your environment)
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

logger = logging.getLogger(__name__)

class AIAnalysisService:
    def analyze_device(self, source_id):
        print(f"DEBUG: Starting analysis for device {source_id}")
        
        try:
            # 1. Validation & Setup
            source = DataSource.objects.get(id=source_id)
            
            # MULTI-TENANT: Get settings for THIS organization
            provider = AIProvider.objects.filter(organization=source.organization, is_active=True).first()
            template = PromptTemplate.objects.filter(organization=source.organization, is_default=True).first()

            if not provider:
                return {"error": "No Active AI Provider configured in Settings."}
                
            if not provider.api_key:
                return {"error": "Missing API Key in AI Settings."}

            # 2. Fetch Data
            records = list(source.telemetry.all().order_by('-timestamp')[:3])

            if not records:
                return {"error": "No telemetry data found for this device."}
            
            # ========================================================
            # 🛡️ THE ULTIMATE CACHE GATEKEEPER
            # ========================================================
            latest_record = records[0]
            last_report = AnalysisReport.objects.filter(source=source).order_by('-created_at').first()

            # SCENARIO A: UI Button Spam Protection
            # If the most recent AI report was created AFTER the latest telemetry arrived,
            # it means we have ALREADY analyzed this exact snapshot!
            
            if last_report and last_report.created_at >= latest_record.timestamp:
                print(f"♻️ CACHE HIT (UI): Already analyzed latest data for {source.name}.")
                return {
                    "report_id": last_report.id,
                    "content": last_report.content,
                    "status": "cached"
                }

            # SCENARIO B: Ansible Ingest Spam Protection
            # If the newest payload is mathematically identical to the previous payload,
            # the server state hasn't changed at all.

            if len(records) >= 2:
                latest_payload = records[0].payload
                previous_payload = records[1].payload
                
                if latest_payload == previous_payload and last_report:
                    print(f"♻️ CACHE HIT (Payload): No metric changes for {source.name}.")
                    return {
                        "report_id": last_report.id,
                        "content": last_report.content,
                        "status": "cached"
                    }
            # ========================================================

            # 3. If data changed and no recent report exists, proceed to Gemini

            records.reverse()

            # Prepare Context
            data_context = [r.payload for r in records] # Keep chronological order logic if needed
            json_string = json.dumps(data_context, indent=2)

            # 3. Build Prompt

            # Use the DB template or a fallback default
            base_prompt = template.template_text if template else "Analyze:\n{json_data}"
            full_prompt = base_prompt.replace("{json_data}", json_string)

            print(f"DEBUG: Sending to {provider.provider_type} (Model: {provider.model_name})...")

            # 4. Call the AI (Direct REST Method)
            ai_response_text = ""
            
            if provider.provider_type == 'gemini':
                ai_response_text = self._call_gemini_direct(provider, full_prompt)
            else:
                return {"error": f"Provider '{provider.provider_type}' logic not implemented yet."}

            print("DEBUG: Response received!")

            # 5. Save Report
            is_anomaly = any(x in ai_response_text.upper() for x in ["CRITICAL", "WARN", "ANOMALY", "FAILURE"])
            
            report = AnalysisReport.objects.create(
                source=source,
                provider=provider,
                content=ai_response_text,
                is_anomaly=is_anomaly
            )
            
            return {
                "summary": ai_response_text,
                "anomaly_detected": is_anomaly,
                "report_id": report.id
            }

        except Exception as e:
            print(f"DEBUG: ERROR: {str(e)}")
            return {"error": str(e)}

    def _call_gemini_direct(self, provider, prompt_text):
        """
        Uses raw requests to bypass SSL verification issues.
        """
        api_key = provider.api_key
        model = provider.model_name # e.g. "gemini-1.5-flash"
        
        # Google REST Endpoint
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
        
        headers = {'Content-Type': 'application/json'}
        payload = {
            "contents": [{
                "parts": [{"text": prompt_text}]
            }]
        }

        # THE FIX: verify=False disables the SSL check
        response = requests.post(
            url, 
            headers=headers, 
            json=payload, 
            verify=False  # <--- MAGIC FIX
        )

        if response.status_code != 200:
            raise Exception(f"Gemini API Error {response.status_code}: {response.text}")

        # Parse the nested JSON response
        data = response.json()
        try:
            return data['candidates'][0]['content']['parts'][0]['text']
        except (KeyError, IndexError):
            raise Exception(f"Unexpected response format: {data}")