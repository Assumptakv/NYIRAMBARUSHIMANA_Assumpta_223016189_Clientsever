
import os
import uuid
import requests


def get_supabase_user(request):
    """
    Verify the Supabase access token and return the authenticated user ID.

    Returns:
        (user_id, error_message, status_code)
    """

    # Read the Authorization header
    authorization = request.headers.get("Authorization", "")

    if not authorization.startswith("Bearer "):
        return None, "Authentication required. Please log in.", 401

    access_token = authorization.split(" ", 1)[1].strip()

    if not access_token:
        return None, "Invalid authentication token.", 401

    # Read Supabase configuration from Django environment
    supabase_url = os.getenv("SUPABASE_URL")
    publishable_key = os.getenv("SUPABASE_PUBLISHABLE_KEY")

    if not supabase_url or not publishable_key:
        return None, "Supabase authentication is not configured.", 500

    try:
        # Ask Supabase Auth to verify the access token
        response = requests.get(
            f"{supabase_url.rstrip('/')}/auth/v1/user",
            headers={
                "apikey": publishable_key,
                "Authorization": f"Bearer {access_token}",
            },
            timeout=10,
        )

        if response.status_code != 200:
            return None, "Your session is invalid or expired. Please log in again.", 401

        user_data = response.json()

        # Extract and validate the authenticated user's UUID
        user_id = user_data.get("id")

        if not user_id:
            return None, "Could not identify your account.", 401

        try:
            user_id = str(uuid.UUID(user_id))
        except (ValueError, TypeError, AttributeError):
            return None, "Invalid user information returned by Supabase.", 401

        return user_id, None, None

    except requests.Timeout:
        return None, "Authentication service timed out. Please try again.", 503

    except requests.RequestException:
        return None, "Could not contact the authentication service.", 503

    except ValueError:
        return None, "Invalid response from the authentication service.", 503
