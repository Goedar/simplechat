# functions_settings.py

from config import *

def get_settings():
    try:
        settings_item = settings_container.read_item(
            item="app_settings",
            partition_key="app_settings"
        )
        print("Successfully retrieved settings.")
        return settings_item
    except CosmosResourceNotFoundError:
        # If settings do not exist, return default settings
        default_settings = {
            'id': 'app_settings',
            'app_title': 'AI Chat Application',
            'show_logo': False,
            'logo_path': 'images/logo.svg',
            'max_file_size_mb': 150,
            'conversation_history_limit': 10,
            'default_system_prompt': '',
            'use_external_apis': False,
            'external_chunking_api': '',
            'external_embedding_api': '',
            'azure_openai_gpt_endpoint': '',
            'azure_openai_gpt_api_version': '',
            'azure_openai_gpt_authentication_type': 'key',
            'azure_openai_gpt_key': '',
            'gpt_model': 'gpt-4o',
            'azure_openai_embedding_endpoint': '',
            'azure_openai_embedding_api_version': '',
            'azure_openai_embedding_authentication_type': 'key',
            'azure_openai_embedding_key': '',
            'embedding_model': 'text-embedding-ada-002',
            'enable_image_generation': False,
            'azure_openai_image_gen_endpoint': '',
            'azure_openai_image_gen_api_version': '',
            'azure_openai_image_gen_authentication_type': 'key',
            'azure_openai_image_gen_key': '',
            'image_gen_model': 'dall-e-2',
            'enable_web_search': False,
            'bing_search_key': '',
            'landing_page_text': 'Click the button below to start chatting with the AI assistant.'
        }
        settings_container.create_item(body=default_settings)
        print("Default settings created and returned.")
        return default_settings
    except Exception as e:
        print(f"Error retrieving settings: {str(e)}")
        return None

def update_settings(new_settings):
    try:
        settings_item = get_settings()
        settings_item.update(new_settings)
        settings_container.upsert_item(settings_item)
        print("Settings updated successfully.")
        return True
    except Exception as e:
        print(f"Error updating settings: {str(e)}")
        return False

def encrypt_key(key):
    cipher_suite = Fernet(app.config['SECRET_KEY'])
    encrypted_key = cipher_suite.encrypt(key.encode())
    return encrypted_key.decode()

def decrypt_key(encrypted_key):
    cipher_suite = Fernet(app.config['SECRET_KEY'])
    try:
        encrypted_key_bytes = base64.urlsafe_b64decode(encrypted_key.encode())
        decrypted_key = cipher_suite.decrypt(encrypted_key_bytes).decode()
        return decrypted_key
    except InvalidToken:
        print("Decryption failed: Invalid token")
        return None

def get_user_settings(user_id):
    doc_id = str(user_id)
    try:
        return user_settings_container.read_item(item=doc_id, partition_key=doc_id)
    except exceptions.CosmosResourceNotFoundError:
        # Return default user settings if not found
        return {
            "id": user_id,
            "settings": {
                "activeGroupOid": ""
            },
            "lastUpdated": None
        }
    
def update_user_settings(user_id, new_settings):
    doc_id = str(user_id)
    try:
        # Try to fetch the existing document
        doc = user_settings_container.read_item(item=doc_id, partition_key=doc_id)
        # Update the settings document
        doc.update(new_settings)
        user_settings_container.upsert_item(doc)
    except exceptions.CosmosResourceNotFoundError:
        # If the document doesn't exist, create a new one
        doc = {
            "id": doc_id,
            **new_settings
        }
        user_settings_container.upsert_item(doc)