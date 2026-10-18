"""BSS Document Audit Agent — audits a contractor's submission against the workers' own documents
using the DeepSeek API, and produces BSS-branded HTML and PDF reports.

    from bss_agent import run_job
    result = run_job(groundtruth_dir, query_dir, out_dir, job={...})
"""

from .pipeline import JobError, run_job

__all__ = ["run_job", "JobError"]
