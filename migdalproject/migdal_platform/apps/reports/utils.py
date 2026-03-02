from io import BytesIO
from django.template.loader import get_template
from xhtml2pdf import pisa

def render_to_pdf(template_src, context_dict={}):
    """
    Renders a Django HTML template into a PDF Bytestream.
    """
    template = get_template(template_src)
    html  = template.render(context_dict)
    
    result = BytesIO()
    
    # Generate PDF
    pdf = pisa.pisaDocument(BytesIO(html.encode("UTF-8")), result)
    
    if not pdf.err:
        return result.getvalue()
    return None