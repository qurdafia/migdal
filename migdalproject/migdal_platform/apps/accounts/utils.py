import jwt
import os
PUBLIC_KEY_PATH = os.path.join(os.path.dirname(__file__), 'public_key.pem')

def verify_license_payload(license_string):
    try:
        with open(PUBLIC_KEY_PATH, 'rb') as f:
            public_key = f.read()
        return jwt.decode(license_string, public_key, algorithms=["RS256"])
    except Exception as e:
        raise ValueError("Invalid License")