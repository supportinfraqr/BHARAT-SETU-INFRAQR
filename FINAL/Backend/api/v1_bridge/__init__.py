"""BSS /v1/ compatibility API bridge (package).

Replaces the former monolithic ``v1_bridge.py``. Every public name is
re-exported here so ``from api import v1_bridge`` and ``v1_bridge.<name>``
(used by config/urls.py) keep working unchanged.
"""

# ruff: noqa: F401,F403
from .common import *  # noqa: F401,F403
from .aadhaar import *  # noqa: F401,F403
from .auth import *  # noqa: F401,F403
from .benefits import *  # noqa: F401,F403
from .courses import *  # noqa: F401,F403
from .documents import *  # noqa: F401,F403
from .grievances import *  # noqa: F401,F403
from .misc import *  # noqa: F401,F403
from .bindings import *  # noqa: F401,F403
from .leave import *  # noqa: F401,F403
from .sites import *  # noqa: F401,F403
from .submissions import *  # noqa: F401,F403
from .mutations import *  # noqa: F401,F403
from .portals import *  # noqa: F401,F403
from .letter_templates import *  # noqa: F401,F403
from .register_templates import *  # noqa: F401,F403
from .attendance import *  # noqa: F401,F403
from .history import *  # noqa: F401,F403
from .cctv import *  # noqa: F401,F403
from .ai import *  # noqa: F401,F403
from .translation import *  # noqa: F401,F403
from .ai_audit import *  # noqa: F401,F403
from .ai_report import *  # noqa: F401,F403
from .audit_reports import *  # noqa: F401,F403
from .admin_bulk import *  # noqa: F401,F403
from .onboarding import *  # noqa: F401,F403
from .devices import *  # noqa: F401,F403
from .form_names import *  # noqa: F401,F403
from .entitylocker import *  # noqa: F401,F403
from .sap import *  # noqa: F401,F403
from .cost_sheets import *  # noqa: F401,F403
from .gst import *  # noqa: F401,F403
from .verification import *  # noqa: F401,F403
from .accounts_admin import *  # noqa: F401,F403
from .employer_analytics import *  # noqa: F401,F403
