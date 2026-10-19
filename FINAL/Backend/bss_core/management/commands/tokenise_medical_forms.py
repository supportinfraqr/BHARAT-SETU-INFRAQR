"""Convert legacy `data-field="x"` slots in stored medical form templates into
the equivalent `{{token}}` placeholders. Idempotent — already-tokenised rows
are left unchanged."""

import re

from django.core.management.base import BaseCommand

from bss_core.models import EmployerMedicalFormAdoption, MedicalFormTemplate

TOKENS = {
    "name": "self.name", "gender": "self.gender", "age_dob": "self.age_dob",
    "company": "self.company", "designation": "self.designation", "uan": "self.uan",
    "aadhaar": "self.aadhaar", "incharge": "exam.incharge", "address": "self.address",
    "mobile": "self.mobile", "email": "self.email", "illness": "exam.illness",
    "nature": "exam.nature", "employee_date": "exam.date", "height": "test.height",
    "weight": "test.weight", "chest_insp": "test.chest.insp", "chest_exp": "test.chest.exp",
    "waist": "test.waist", "bmi": "test.bmi", "visual_acuity": "test.vision",
    "colour_vision": "test.colour", "bp": "test.bp", "cbc": "test.cbc", "fbs": "test.fbs",
    "ppbs": "test.ppbs", "spo2": "test.spo2", "urea": "test.urea",
    "creatinine": "test.creatinine", "bilirubin": "test.bilirubin", "sgot": "test.sgot",
    "sgpt": "test.sgpt", "lipid": "test.lipid", "tsh": "test.tsh", "xray": "test.xray",
    "ecg": "test.ecg", "others": "exam.others", "diagnosis": "exam.diagnosis",
    "seizure": "exam.seizure", "mo_date": "exam.date", "mo_name": "exam.doctor",
    "cert_no": "exam.certNo", "mine_name": "site.name", "employee_no": "self.bssId",
    "age": "self.age", "ix_suffering": "custom.ix_suffering",
    "ix_unfit_work": "custom.ix_unfit_work", "ix_cure": "custom.ix_cure",
    "ix_months": "custom.ix_months", "place": "site.location", "exam_date": "exam.date",
    "id_mark": "custom.id_mark", "general_dev": "custom.general_dev",
    "va_right": "test.vision.right", "va_left": "test.vision.left",
    "hearing_right": "test.audiometry.right", "hearing_left": "test.audiometry.left",
    "pulse": "test.pulse", "other_abnormality": "exam.otherAbnormality",
}


def _tokenise(html):
    def repl(match):
        key, attrs = match.group(1), match.group(2)
        if key == "photo":
            return f'<span class="f"{attrs}></span>'
        token = TOKENS.get(key)
        return f'<span class="f"{attrs}>{{{{{token}}}}}</span>' if token else match.group(0)

    return re.sub(r'<span class="f" data-field="([^"]+)"([^>]*)>(.*?)</span>', repl, html, flags=re.S)


class Command(BaseCommand):
    help = "Convert data-field slots in stored medical forms to {{token}} placeholders."

    def handle(self, *args, **options):
        changed = 0
        for row in MedicalFormTemplate.objects.all():
            if not row.html or "data-field=" not in row.html:
                continue
            row.html = _tokenise(row.html)
            row.save(update_fields=["html", "updated_at"])
            changed += 1
        adoptions = 0
        for adoption in EmployerMedicalFormAdoption.objects.all():
            if not adoption.adopted_html or "data-field=" not in adoption.adopted_html:
                continue
            adoption.adopted_html = _tokenise(adoption.adopted_html)
            adoption.save(update_fields=["adopted_html", "updated_at"])
            adoptions += 1
        self.stdout.write(self.style.SUCCESS(
            f"Tokenised {changed} template(s) and {adoptions} adopted snapshot(s)."))
