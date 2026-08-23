"""GUIDE.MD entity-relationship logic (E-C-S-W).

Relationships:
- Site -> Many-to-One -> Employer  (site always belongs to employer)
- Worker -> Many-to-One -> Site     (one worker, one site)
- Worker -> Many-to-One -> Contractor (worker under one contractor at that site)
- Contractor -> Many-to-Many -> Site (contractor works multiple sites)

ECSW tuple: E-C-S-W unique combination, never duplicated.
"""
from .models import Contractor, ContractorEmployment, Employer, Site, Worker


def derive_employer(site: Site):
    """Rule: Employer is derived from the Site."""
    return site.employer if site else None


def make_ecsw_tuple(employer_id, contractor_id, site_id, worker_id) -> str:
    return f"{employer_id}-{contractor_id}-{site_id}-{worker_id}"


def assign_worker_to_system(worker: Worker, contractor: Contractor, site: Site) -> Worker:
    """GUIDE.MD Assign_Worker_To_System(W, C, S).

    - One worker always on a single site.
    - Employer derived from the site.
    - Generates the unique constant ECSW tuple.
    Raises ValueError if the worker is already bound to a different site/contractor.
    """
    # One worker, one site
    if worker.contractor_id and worker.contractor_id != contractor.pk:
        raise ValueError("Worker already exists and is bound to a site/contractor. ECSW cannot be two times.")
    if worker.site_id and worker.site_id != site.pk:
        raise ValueError("Worker already exists and is bound to a site/contractor. ECSW cannot be two times.")

    employer = derive_employer(site)
    worker.site = site
    worker.contractor = contractor
    worker.employer = employer
    worker.ecsw_tuple = make_ecsw_tuple(
        employer.pk if employer else None,
        contractor.pk,
        site.pk,
        worker.pk,
    )
    worker.save(update_fields=["site", "contractor", "employer", "ecsw_tuple"])
    return worker


def get_worker_details(worker: Worker):
    """GUIDE.MD Get_Worker_Details -> constant tuple E-C-S-W."""
    if not worker.ecsw_tuple and worker.site_id and worker.contractor_id:
        worker.ecsw_tuple = make_ecsw_tuple(
            worker.employer_id, worker.contractor_id, worker.site_id, worker.pk
        )
        worker.save(update_fields=["ecsw_tuple"])
    return worker.ecsw_tuple


def get_contractor_employers(contractor: Contractor):
    """GUIDE.MD Get_Contractor_Employers(C) -> distinct employers via sites."""
    employer_ids = (
        ContractorEmployment.objects
        .filter(contractor=contractor, status="ACTIVE")
        .values_list("employer_id", flat=True)
        .distinct()
    )
    return list(Employer.objects.filter(pk__in=employer_ids))


def get_contractor_sites(contractor: Contractor):
    """GUIDE.MD Get_Contractor_Sites(C) -> distinct sites."""
    site_ids = (
        ContractorEmployment.objects
        .filter(contractor=contractor, status="ACTIVE")
        .values_list("site_id", flat=True)
        .distinct()
    )
    return list(Site.objects.filter(pk__in=site_ids))


def get_employer_contractors_at_site(employer: Employer, site: Site):
    """GUIDE.MD Get_Employer_Contractors_At_Site(E, S)."""
    if site.employer_id != employer.pk:
        return []
    contractor_ids = (
        ContractorEmployment.objects
        .filter(employer=employer, site=site, status="ACTIVE")
        .values_list("contractor_id", flat=True)
        .distinct()
    )
    return list(Contractor.objects.filter(pk__in=contractor_ids))
