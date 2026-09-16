"""Payload assemblers for the /v1/ BSS compatibility API layer.

This package replaces the former monolithic ``v1_payloads.py``. The public
surface is unchanged: every name is re-exported here so ``from api import
v1_payloads as payloads`` and ``payloads.<name>`` keep working.
"""

# ruff: noqa: F401,F403
from .common import *  # noqa: F401,F403
from .shared import *  # noqa: F401,F403
from .worker import *  # noqa: F401,F403
from .contractor import *  # noqa: F401,F403
from .employer import *  # noqa: F401,F403
from .notifications import *  # noqa: F401,F403
from .identity import *  # noqa: F401,F403
from .ops import *  # noqa: F401,F403
