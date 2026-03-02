from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa

print("Generating 2048-bit RSA keys...")

# 1. Generate the Private Key
private_key = rsa.generate_private_key(
    public_exponent=65537,
    key_size=2048,
)

# 2. Save Private Key to file
with open("private_key.pem", "wb") as f:
    f.write(private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption()
    ))

# 3. Generate and Save Public Key
public_key = private_key.public_key()
with open("public_key.pem", "wb") as f:
    f.write(public_key.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo
    ))

print("Success! Created 'private_key.pem' and 'public_key.pem'")