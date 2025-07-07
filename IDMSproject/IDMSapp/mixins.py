# mixins.py - Simple email notification mixin without templates
from django.core.mail import send_mail
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

class NotificationMixinn:
    """Mixin to handle email notifications without templates"""
    
    def _get_user_full_name(self, user):
        """Get user's full name with fallback options"""
        try:
            # Try different methods to get full name
            if hasattr(user, 'get_full_name') and callable(user.get_full_name):
                name = user.get_full_name()
                if name and name.strip():
                    return name
            
            # Try first_name + last_name
            if hasattr(user, 'first_name') and hasattr(user, 'last_name'):
                first_name = getattr(user, 'first_name', '') or ''
                last_name = getattr(user, 'last_name', '') or ''
                full_name = f"{first_name} {last_name}".strip()
                if full_name:
                    return full_name
            
            # Try username
            if hasattr(user, 'username'):
                return getattr(user, 'username', 'User')
            
            # Try email
            if hasattr(user, 'email'):
                return getattr(user, 'email', 'User')
            
            # Final fallback
            return 'User'
            
        except Exception as e:
            logger.warning(f"Error getting user full name: {e}")
            return 'User'
    
    def _send_email(self, recipient, subject, message, from_email=None):
        """Send plain text email notification"""
        try:
            if not recipient:
                logger.warning("No recipient email provided")
                return False
                
            # Use default from email if not provided
            if not from_email:
                from_email = settings.DEFAULT_FROM_EMAIL
            
            # Send email
            send_mail(
                subject=subject,
                message=message,
                from_email=from_email,
                recipient_list=[recipient],
                fail_silently=False
            )
            
            logger.info(f"Email sent successfully to {recipient}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email to {recipient}: {str(e)}")
            return False