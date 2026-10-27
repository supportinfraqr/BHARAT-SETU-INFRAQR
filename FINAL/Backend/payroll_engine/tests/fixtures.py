"""Shared fixtures: a real BSS contractor + employer + site + bound worker."""

from datetime import date, datetime

from django.utils import timezone
from rest_framework.test import APIClient

from bss_core.models import (ContractorProfile, EmployerProfile, Site, User, WorkerBanking,
                             WorkerContractorBinding, WorkerIdentity, WorkerSocialSecurity)

BASE = "/v1/payroll-engine/"


def make_org_world(n_workers=1, suffix="1"):
    from django.core.cache import cache
    cache.clear()
    employer = User.objects.create_user(username=f"emp{suffix}", password="x", role="employer",
                                        full_name="Adani Infra")
    EmployerProfile.objects.create(user=employer, employer_name="Adani Infra Pvt Ltd",
                                   employer_code=f"EMP{suffix}", state="Gujarat",
                                   address="Ahmedabad", pan_no="AAACA1234A")
    contractor = User.objects.create_user(username=f"con{suffix}", password="x", role="contractor",
                                          full_name="BuildWell")
    ContractorProfile.objects.create(user=contractor, contractor_name="BuildWell Contractors",
                                     contractor_code=f"CON{suffix}", state="Gujarat",
                                     address="Mundra", pan_no="AABCB1234B")
    site = Site.objects.create(employer=employer, site_name="Mundra Port", state="Gujarat",
                               weekly_off_days="SUN")
    workers = []
    for i in range(n_workers):
        w = User.objects.create_user(username=f"9{suffix}{i:08d}", password="x", role="worker",
                                     full_name=f"Ramesh Kumar {i}")
        WorkerIdentity.objects.create(user=w, bss_worker_id=f"BSSW{suffix}{i:04d}",
                                      name=f"Ramesh Kumar{i}", gender="Male",
                                      date_of_birth=date(1990, 1, 1), pan="ABCDE1234F",
                                      mobile_number=w.username)
        WorkerBanking.objects.create(user=w, bank_name="SBI", bank_account_number=f"1234567890{i}",
                                     ifsc_code="SBIN0001234", bank_account_holder_name="Ramesh Kumar")
        WorkerSocialSecurity.objects.create(user=w, epfo_uan=f"10000000000{i}")
        WorkerContractorBinding.objects.create(
            worker=w, contractor=contractor, site=site, binding_status="ACCEPTED",
            consent_worker=True, consent_contractor=True, designation="Mason",
            date_of_joining=date(2024, 4, 1),
            accepted_at=timezone.make_aware(datetime(2024, 4, 1)))
        workers.append(w)
    return {"employer": employer, "contractor": contractor, "site": site, "workers": workers}


def client_for(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client
