"""Middleware that maps a legacy session LoginId (header) to an authenticated context.

For migration, the legacy frontend passes `X-Legacy-Login-Id`. We validate it against
the migrated production LoginTable and mark the request authenticated so legacy
endpoints can serve data scoped to that user.
"""
from django.contrib.auth import get_user_model

from legacy.models import LoginTable


def login_type_to_role(login_type):
    """Map legacy LoginType -> Django role."""
    try:
        lt = int(login_type)
    except (TypeError, ValueError):
        lt = 0
    if lt == 1:
        return "SUPER_ADMIN"
    if lt == 5:
        return "EMPLOYER"
    if lt in (2, 6):
        return "PRIMARY_CONTRACTOR"
    if lt == 7:
        return "WORKER"
    return "BSS_STAFF"


class LegacySessionAuthMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        legacy_login_id = request.headers.get("X-Legacy-Login-Id")
        if legacy_login_id and legacy_login_id.isdigit():
            login_id = int(legacy_login_id)
            User = get_user_model()
            user = None
            try:
                user = User.objects.get(legacy_login_id=login_id)
            except User.DoesNotExist:
                user = None
            if user is None:
                if LoginTable.objects.filter(LoginId=login_id).exists():
                    try:
                        user = User.objects.get(username=f"legacy_{login_id}")
                    except User.DoesNotExist:
                        lt = LoginTable.objects.get(LoginId=login_id)
                        user = User(
                            username=f"legacy_{login_id}",
                            legacy_login_id=login_id,
                            first_name=(lt.Name or "")[:30],
                            email=(lt.EmailId or "")[:254],
                            mobile=(lt.ContactNo or "")[:20],
                            role=login_type_to_role(lt.LoginType),
                            is_active=True,
                        )
                        user.set_unusable_password()
                        user.save()
                        _link_scope(user, lt.LoginType)
            else:
                # Sync role + scope in case legacy data changed or user predates role mapping
                lt = LoginTable.objects.filter(LoginId=login_id).first()
                if lt:
                    desired_role = login_type_to_role(lt.LoginType)
                    changed = False
                    if user.role != desired_role:
                        user.role = desired_role
                        changed = True
                    _link_scope(user, lt.LoginType, persist=False)
                    if changed:
                        try:
                            user.save(update_fields=["role"])
                        except Exception:
                            pass
            if user is not None:
                request.user = user
                request._cached_user = user
                request.legacy_login_id = login_id
        return self.get_response(request)


def _link_scope(user, login_type, persist=True):
    """Link an employer/contractor user to their QR entity by email/mobile."""
    try:
        lt = int(login_type)
    except (TypeError, ValueError):
        return
    if lt == 5:
        # Principal Employer -> link to Employer by email
        from qr.models import Employer
        emp = Employer.objects.filter(email__iexact=(user.email or "")).first()
        if emp:
            user.employer_id = emp.pk
            if persist:
                try:
                    user.save(update_fields=["employer_id"])
                except Exception:
                    pass
    elif lt in (2, 6):
        from qr.models import Contractor
        con = Contractor.objects.filter(contact_mobile=user.mobile).first()
        if not con:
            con = Contractor.objects.filter(name=user.username).first()
        if con:
            user.contractor_id = con.pk
            if persist:
                try:
                    user.save(update_fields=["contractor_id"])
                except Exception:
                    pass
