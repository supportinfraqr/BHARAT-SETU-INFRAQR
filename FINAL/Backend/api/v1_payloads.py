"""Payload assemblers for the /v1/ BSS compatibility API layer.

Every function returns the EXACT JSON shapes expected by the external Next.js
frontend. Keys are always present (with empty/sensible defaults when the
underlying data does not exist in the ORM) so the frontend's strict validation
never trips over a missing key.
"""

import datetime
import hashlib
import re

from django.utils import timezone

from django.contrib.auth import get_user_model
from django.db.models import Q

from bss_core.models import (
    Attendance,
    Course,
    CourseEnrollment,
    CourseLesson,
    CourseQuestion,
    CourseSubmission,
    ContractorEmployerBinding,
    ContractorProfile,
    ContractorSiteAllotment,
    ComplianceBatch,
    ComplianceDocument,
    ComplianceMaster,
    ComplianceReport,
    EmployerProfile,
    LeaveRequest,
    LeaveType,
    RestrictedHolidayRequest,
    SiteHoliday,
    SiteLeavePolicy,
    User,
    Notification,
    GratuityApplication,
    PayrollConfig,
    RozgarRequest,
    SalaryAdvance,
    SubmissionEvidence,
    WorkerBenefitRecord,
    Site,
    WagePayment,
    WorkerAddressMobility,
    WorkerBanking,
    WorkerClassification,
    WorkerContractorBinding,
    WorkerDocument,
    WorkerDocumentMaster,
    WorkerEducation,
    WorkerEmployment,
    WorkerFamilyDependant,
    WorkerGatePass,
    WorkerGrievance,
    WorkerIdentity,
    WorkerOther,
    WorkerSkill,
    WorkerSkillsEmployability,
    WorkerSocialSecurity,
    WorkerWages,
    WorkerWelfareSafety,
    UserPreference,
)

_STATES = {
    "Andhra Pradesh": ["Alluri Sitharama Raju", "Anakapalli", "Anantapur", "Annamayya", "Bapatla", "Chittoor", "East Godavari", "Eluru", "Guntur", "Kakinada", "Konaseema", "Krishna", "Kurnool", "Nandyal", "NTR", "Palnadu", "Parvathipuram Manyam", "Prakasam", "Sri Sathya Sai", "Srikakulam", "Sri Potti Sriramulu Nellore", "Tirupati", "Visakhapatnam", "Vizianagaram", "West Godavari", "YSR Kadapa"],
    "Arunachal Pradesh": ["Anjaw", "Changlang", "East Kameng", "East Siang", "Kamle", "Kra Daadi", "Kurung Kumey", "Lepa Rada", "Lohit", "Longding", "Lower Dibang Valley", "Lower Siang", "Lower Subansiri", "Namsai", "Pakke-Kessang", "Papum Pare", "Shi Yomi", "Siang", "Tawang", "Tirap", "Upper Dibang Valley", "Upper Siang", "Upper Subansiri", "West Kameng", "West Siang"],
    "Assam": ["Bajali", "Baksa", "Barpeta", "Biswanath", "Bongaigaon", "Cachar", "Charaideo", "Chirang", "Darrang", "Dhemaji", "Dhubri", "Dibrugarh", "Dima Hasao", "Goalpara", "Golaghat", "Hailakandi", "Hojai", "Jorhat", "Kamrup", "Kamrup Metropolitan", "Karbi Anglong", "Karimganj", "Kokrajhar", "Lakhimpur", "Majuli", "Morigaon", "Nagaon", "Nalbari", "Sivasagar", "Sonitpur", "South Salmara-Mankachar", "Tamulpur", "Tinsukia", "Udalguri", "West Karbi Anglong"],
    "Bihar": ["Araria", "Arwal", "Aurangabad", "Banka", "Begusarai", "Bhagalpur", "Bhojpur", "Buxar", "Darbhanga", "East Champaran", "Gaya", "Gopalganj", "Jamui", "Jehanabad", "Kaimur", "Katihar", "Khagaria", "Kishanganj", "Lakhisarai", "Madhepura", "Madhubani", "Munger", "Muzaffarpur", "Nalanda", "Nawada", "Patna", "Purnia", "Rohtas", "Saharsa", "Samastipur", "Saran", "Sheikhpura", "Sheohar", "Sitamarhi", "Siwan", "Supaul", "Vaishali", "West Champaran"],
    "Chhattisgarh": ["Balod", "Baloda Bazar", "Balrampur", "Bastar", "Bemetara", "Bijapur", "Bilaspur", "Dantewada", "Dhamtari", "Durg", "Gariaband", "Gaurela-Pendra-Marwahi", "Janjgir-Champa", "Jashpur", "Kabirdham", "Kanker", "Khairagarh-Chhuikhadan-Gandai", "Kondagaon", "Korba", "Koriya", "Mahasamund", "Manendragarh-Chirmiri-Bharatpur", "Mohla-Manpur-Ambagarh Chowki", "Mungeli", "Narayanpur", "Raigarh", "Raipur", "Rajnandgaon", "Sarangarh-Bilaigarh", "Sakti", "Sukma", "Surajpur", "Surguja"],
    "Goa": ["North Goa", "South Goa"],
    "Gujarat": ["Ahmedabad", "Amreli", "Anand", "Aravalli", "Banaskantha", "Bharuch", "Bhavnagar", "Botad", "Chhota Udaipur", "Dahod", "Dang", "Devbhoomi Dwarka", "Gandhinagar", "Gir Somnath", "Jamnagar", "Junagadh", "Kachchh", "Kheda", "Mahisagar", "Mehsana", "Morbi", "Narmada", "Navsari", "Panchmahal", "Patan", "Porbandar", "Rajkot", "Sabarkantha", "Surat", "Surendranagar", "Tapi", "Vadodara", "Valsad"],
    "Haryana": ["Ambala", "Bhiwani", "Charkhi Dadri", "Faridabad", "Fatehabad", "Gurugram", "Hisar", "Jhajjar", "Jind", "Kaithal", "Karnal", "Kurukshetra", "Mahendragarh", "Nuh", "Palwal", "Panchkula", "Panipat", "Rewari", "Rohtak", "Sirsa", "Sonipat", "Yamunanagar"],
    "Himachal Pradesh": ["Bilaspur", "Chamba", "Hamirpur", "Kangra", "Kinnaur", "Kullu", "Lahaul and Spiti", "Mandi", "Shimla", "Sirmaur", "Solan", "Una"],
    "Jharkhand": ["Bokaro", "Chatra", "Deoghar", "Dhanbad", "Dumka", "East Singhbhum", "Garhwa", "Giridih", "Godda", "Gumla", "Hazaribagh", "Jamtara", "Khunti", "Koderma", "Latehar", "Lohardaga", "Pakur", "Palamu", "Ramgarh", "Ranchi", "Sahibganj", "Seraikela-Kharsawan", "Simdega", "West Singhbhum"],
    "Karnataka": ["Bagalkote", "Ballari", "Belagavi", "Bengaluru Rural", "Bengaluru Urban", "Bidar", "Chamarajanagar", "Chikkaballapur", "Chikkamagaluru", "Chitradurga", "Dakshina Kannada", "Davanagere", "Dharwad", "Gadag", "Hassan", "Haveri", "Kalaburagi", "Kodagu", "Kolar", "Koppal", "Mandya", "Mysuru", "Raichur", "Ramanagara", "Shivamogga", "Tumakuru", "Udupi", "Uttara Kannada", "Vijayanagara", "Vijayapura", "Yadgir"],
    "Kerala": ["Alappuzha", "Ernakulam", "Idukki", "Kannur", "Kasaragod", "Kollam", "Kottayam", "Kozhikode", "Malappuram", "Palakkad", "Pathanamthitta", "Thiruvananthapuram", "Thrissur", "Wayanad"],
    "Madhya Pradesh": ["Agar Malwa", "Alirajpur", "Anuppur", "Ashoknagar", "Balaghat", "Barwani", "Betul", "Bhind", "Bhopal", "Burhanpur", "Chhatarpur", "Chhindwara", "Damoh", "Datia", "Dewas", "Dhar", "Dindori", "Guna", "Gwalior", "Harda", "Indore", "Jabalpur", "Jhabua", "Katni", "Khandwa", "Khargone", "Maihar", "Mandla", "Mandsaur", "Morena", "Narmadapuram", "Narsinghpur", "Neemuch", "Niwari", "Panna", "Raisen", "Rajgarh", "Ratlam", "Rewa", "Sagar", "Satna", "Sehore", "Seoni", "Shahdol", "Shajapur", "Sheopur", "Shivpuri", "Sidhi", "Singrauli", "Tikamgarh", "Ujjain", "Umaria", "Vidisha"],
    "Maharashtra": ["Ahmednagar", "Akola", "Amravati", "Beed", "Bhandara", "Buldhana", "Chandrapur", "Chhatrapati Sambhajinagar", "Dhule", "Gadchiroli", "Gondia", "Hingoli", "Jalgaon", "Jalna", "Kolhapur", "Latur", "Mumbai City", "Mumbai Suburban", "Nagpur", "Nanded", "Nandurbar", "Nashik", "Osmanabad", "Palghar", "Parbhani", "Pune", "Raigad", "Ratnagiri", "Sangli", "Satara", "Sindhudurg", "Solapur", "Thane", "Wardha", "Washim", "Yavatmal"],
    "Manipur": ["Bishnupur", "Chandel", "Churachandpur", "Imphal East", "Imphal West", "Jiribam", "Kakching", "Kamjong", "Kangpokpi", "Noney", "Pherzawl", "Senapati", "Tamenglong", "Tengnoupal", "Thoubal", "Ukhrul"],
    "Meghalaya": ["East Garo Hills", "East Jaintia Hills", "East Khasi Hills", "Eastern West Khasi Hills", "North Garo Hills", "Ri Bhoi", "South Garo Hills", "South West Garo Hills", "South West Khasi Hills", "West Garo Hills", "West Jaintia Hills", "West Khasi Hills"],
    "Mizoram": ["Aizawl", "Champhai", "Hnahthial", "Khawzawl", "Kolasib", "Lawngtlai", "Lunglei", "Mamit", "Saiha", "Saitual", "Serchhip"],
    "Nagaland": ["Chumoukedima", "Dimapur", "Kiphire", "Kohima", "Longleng", "Mokokchung", "Mon", "Niuland", "Noklak", "Peren", "Phek", "Shamator", "Tseminyu", "Tuensang", "Wokha", "Zunheboto"],
    "Odisha": ["Angul", "Balangir", "Balasore", "Bargarh", "Bhadrak", "Boudh", "Cuttack", "Deogarh", "Dhenkanal", "Gajapati", "Ganjam", "Jagatsinghpur", "Jajpur", "Jharsuguda", "Kalahandi", "Kandhamal", "Kendrapara", "Kendujhar", "Khordha", "Koraput", "Malkangiri", "Mayurbhanj", "Nabarangpur", "Nayagarh", "Nuapada", "Puri", "Rayagada", "Sambalpur", "Subarnapur", "Sundargarh"],
    "Punjab": ["Amritsar", "Barnala", "Bathinda", "Faridkot", "Fatehgarh Sahib", "Fazilka", "Firozpur", "Gurdaspur", "Hoshiarpur", "Jalandhar", "Kapurthala", "Ludhiana", "Malerkotla", "Mansa", "Moga", "Pathankot", "Patiala", "Rupnagar", "Sahibzada Ajit Singh Nagar", "Sangrur", "Shahid Bhagat Singh Nagar", "Sri Muktsar Sahib", "Tarn Taran"],
    "Rajasthan": ["Ajmer", "Alwar", "Banswara", "Baran", "Barmer", "Bharatpur", "Bhilwara", "Bikaner", "Bundi", "Chittorgarh", "Churu", "Dausa", "Dholpur", "Dungarpur", "Hanumangarh", "Jaipur", "Jaisalmer", "Jalore", "Jhalawar", "Jhunjhunu", "Jodhpur", "Karauli", "Kota", "Nagaur", "Pali", "Pratapgarh", "Rajsamand", "Sawai Madhopur", "Sikar", "Sirohi", "Sri Ganganagar", "Tonk", "Udaipur"],
    "Sikkim": ["Gangtok", "Gyalshing", "Mangan", "Namchi", "Pakyong", "Soreng"],
    "Tamil Nadu": ["Ariyalur", "Chengalpattu", "Chennai", "Coimbatore", "Cuddalore", "Dharmapuri", "Dindigul", "Erode", "Kallakurichi", "Kancheepuram", "Kanniyakumari", "Karur", "Krishnagiri", "Madurai", "Mayiladuthurai", "Nagapattinam", "Namakkal", "Nilgiris", "Perambalur", "Pudukkottai", "Ramanathapuram", "Ranipet", "Salem", "Sivaganga", "Tenkasi", "Thanjavur", "Theni", "Thoothukudi", "Tiruchirappalli", "Tirunelveli", "Tirupattur", "Tiruppur", "Tiruvallur", "Tiruvannamalai", "Tiruvarur", "Vellore", "Viluppuram", "Virudhunagar"],
    "Telangana": ["Adilabad", "Bhadradri Kothagudem", "Hanamkonda", "Hyderabad", "Jagtial", "Jangoan", "Jayashankar Bhupalpally", "Jogulamba Gadwal", "Kamareddy", "Karimnagar", "Khammam", "Komaram Bheem Asifabad", "Mahabubabad", "Mahabubnagar", "Mancherial", "Medak", "Medchal-Malkajgiri", "Mulugu", "Nagarkurnool", "Nalgonda", "Narayanpet", "Nirmal", "Nizamabad", "Peddapalli", "Rajanna Sircilla", "Rangareddy", "Sangareddy", "Siddipet", "Suryapet", "Vikarabad", "Wanaparthy", "Warangal", "Yadadri Bhuvanagiri"],
    "Tripura": ["Dhalai", "Gomati", "Khowai", "North Tripura", "Sepahijala", "South Tripura", "Unakoti", "West Tripura"],
    "Uttar Pradesh": ["Agra", "Aligarh", "Ambedkar Nagar", "Amethi", "Amroha", "Auraiya", "Ayodhya", "Azamgarh", "Baghpat", "Bahraich", "Ballia", "Balrampur", "Banda", "Barabanki", "Bareilly", "Basti", "Bhadohi", "Bijnor", "Budaun", "Bulandshahr", "Chandauli", "Chitrakoot", "Deoria", "Etah", "Etawah", "Farrukhabad", "Fatehpur", "Firozabad", "Gautam Buddha Nagar", "Ghaziabad", "Ghazipur", "Gonda", "Gorakhpur", "Hamirpur", "Hapur", "Hardoi", "Hathras", "Jalaun", "Jaunpur", "Jhansi", "Kannauj", "Kanpur Dehat", "Kanpur Nagar", "Kasganj", "Kaushambi", "Kushinagar", "Lakhimpur Kheri", "Lalitpur", "Lucknow", "Maharajganj", "Mahoba", "Mainpuri", "Mathura", "Mau", "Meerut", "Mirzapur", "Moradabad", "Muzaffarnagar", "Pilibhit", "Pratapgarh", "Prayagraj", "Raebareli", "Rampur", "Saharanpur", "Sambhal", "Sant Kabir Nagar", "Shahjahanpur", "Shamli", "Shravasti", "Siddharthnagar", "Sitapur", "Sonbhadra", "Sultanpur", "Unnao", "Varanasi"],
    "Uttarakhand": ["Almora", "Bageshwar", "Chamoli", "Champawat", "Dehradun", "Haridwar", "Nainital", "Pauri Garhwal", "Pithoragarh", "Rudraprayag", "Tehri Garhwal", "Udham Singh Nagar", "Uttarkashi"],
    "West Bengal": ["Alipurduar", "Bankura", "Birbhum", "Cooch Behar", "Dakshin Dinajpur", "Darjeeling", "Hooghly", "Howrah", "Jalpaiguri", "Jhargram", "Kalimpong", "Kolkata", "Malda", "Murshidabad", "Nadia", "North 24 Parganas", "Paschim Bardhaman", "Paschim Medinipur", "Purba Bardhaman", "Purba Medinipur", "Purulia", "South 24 Parganas", "Uttar Dinajpur"],
    "Andaman and Nicobar Islands": ["Nicobar", "North and Middle Andaman", "South Andaman"],
    "Chandigarh": ["Chandigarh"],
    "Dadra and Nagar Haveli and Daman and Diu": ["Daman", "Diu", "Dadra and Nagar Haveli"],
    "Delhi": ["Central Delhi", "East Delhi", "New Delhi", "North Delhi", "North East Delhi", "North West Delhi", "Shahdara", "South Delhi", "South East Delhi", "South West Delhi", "West Delhi"],
    "Jammu and Kashmir": ["Anantnag", "Bandipora", "Baramulla", "Budgam", "Doda", "Ganderbal", "Jammu", "Kathua", "Kishtwar", "Kulgam", "Kupwara", "Poonch", "Pulwama", "Rajouri", "Ramban", "Reasi", "Samba", "Shopian", "Srinagar", "Udhampur"],
    "Ladakh": ["Kargil", "Leh"],
    "Lakshadweep": ["Lakshadweep"],
    "Puducherry": ["Karaikal", "Mahe", "Puducherry", "Yanam"],
}

GEOGRAPHY = {
    state: {district: [{"city": district, "pins": []}] for district in districts}
    for state, districts in _STATES.items()
}

PIN_LOCATIONS = [
    {"pin": "400001", "state": "Maharashtra", "district": "Mumbai City", "city": "Mumbai"},
    {"pin": "411001", "state": "Maharashtra", "district": "Pune", "city": "Pune"},
    {"pin": "422001", "state": "Maharashtra", "district": "Nashik", "city": "Nashik"},
    {"pin": "560001", "state": "Karnataka", "district": "Bengaluru Urban", "city": "Bengaluru"},
    {"pin": "570001", "state": "Karnataka", "district": "Mysuru", "city": "Mysuru"},
    {"pin": "600001", "state": "Tamil Nadu", "district": "Chennai", "city": "Chennai"},
    {"pin": "641001", "state": "Tamil Nadu", "district": "Coimbatore", "city": "Coimbatore"},
    {"pin": "110001", "state": "Delhi", "district": "New Delhi", "city": "New Delhi"},
    {"pin": "110017", "state": "Delhi", "district": "South Delhi", "city": "South Delhi"},
]


def _d(value, default=""):
    return value if value is not None and value != "" else default


# BSS ID formats: BSS-W (worker), BSS-C (contractor), BSS-E (employer) + 10-digit PK.
def _bss_worker_code(user_id):
    return f"BSS-W{user_id:010d}"


def _bss_contractor_code(user_id):
    return f"BSS-C{user_id:010d}"


def _bss_employer_code(user_id):
    return f"BSS-E{user_id:010d}"


def _dts(value):
    if value is None:
        return None
    if isinstance(value, datetime.datetime):
        return value.isoformat()
    if isinstance(value, datetime.date):
        return value.isoformat()
    return str(value)


def _num(value, default=0):
    if value is None:
        return default
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _get_identity(user):
    try:
        return WorkerIdentity.objects.filter(user=user).first()
    except Exception:
        return None


def _identity_display(identity, field):
    return _d(getattr(identity, field, None)) if identity else ""


def government_geography():
    return dict(GEOGRAPHY)


def geography_lookup(pin):
    pin = str(pin or "").strip()
    for loc in PIN_LOCATIONS:
        if loc["pin"] == pin:
            return loc
    return None


# ---------------------------------------------------------------------------
# Worker portal
# ---------------------------------------------------------------------------
def _worker_identity_section(identity):
    category = ""
    if identity:
        wc = WorkerClassification.objects.filter(user=identity.user).first()
        category = _d(wc.worker_category if wc else "")
    return {
        "name": _identity_display(identity, "name"),
        "bssId": _identity_display(identity, "bss_worker_id"),
        "category": category,
        "aadhaarVerified": bool(identity and identity.aadhaar),
        "panVerified": bool(identity and identity.pan_verified),
        "photoUrl": _identity_display(identity, "photo"),
        "dob": _dts(identity.date_of_birth if identity else None),
        "gender": _identity_display(identity, "gender"),
        "aadhaar": _identity_display(identity, "aadhaar"),
        "pan": _identity_display(identity, "pan"),
        "placeOfBirth": _identity_display(identity, "place_of_birth"),
        "alternateMobile": _identity_display(identity, "alternate_mobile"),
        "email": _identity_display(identity, "email"),
        "emergencyContactName": _identity_display(identity, "emergency_contact_name"),
        "emergencyContactNumber": _identity_display(identity, "emergency_contact_number"),
        "emergencyContactRelation": _identity_display(identity, "emergency_contact_relation"),
        "disabilityTypePct": _identity_display(identity, "disability_type_pct"),
    }


def _worker_employment_section(user, identity):
    emp = WorkerEmployment.objects.filter(user=user).first()
    binding = None
    if emp and emp.assignment_id:
        binding = emp.assignment
    if binding is None:
        # No WorkerEmployment record yet — fall back to the most recent accepted
        # binding so the dashboard reflects the current employment.
        binding = (WorkerContractorBinding.objects
                   .filter(worker=user, binding_status="ACCEPTED")
                   .select_related("site", "site__employer", "contractor")
                   .order_by("-accepted_at", "-created_at").first())
    employer_name = ""
    employer_code = ""
    employer_industry = ""
    employer_email = ""
    employer_lin = ""
    
    contractor_name = ""
    contractor_code = ""
    contractor_contact = ""
    contractor_email = ""
    contractor_lin = ""

    site_name = ""
    site_code = ""
    site_location = ""
    medical_officer = ""
    officer_contact = ""

    if binding:
        if binding.site:
            site = binding.site
            site_name = site.site_name or ""
            site_code = getattr(site, "site_code", "") or ""
            site_location = getattr(site, "location", "") or ""
            medical_officer = getattr(site, "medical_officer", "") or ""
            officer_contact = getattr(site, "officer_contact", "") or ""
        if binding.contractor:
            cp = getattr(binding.contractor, "contractor_profile", None)
            contractor_name = _org_name(binding.contractor)
            contractor_code = _bss_contractor_code(binding.contractor.id) if binding.contractor else ""
            contractor_contact = _d(getattr(cp, "mobile", "") or getattr(cp, "contact_person", "") if cp else "")
            contractor_email = _d(getattr(cp, "email", "") if cp else "")
            contractor_lin = _d(getattr(cp, "lin", "") if cp else "")
        if binding.site and binding.site.employer:
            emp_profile = getattr(binding.site.employer, "employer_profile", None)
            employer_name = _org_name(binding.site.employer)
            employer_code = _bss_employer_code(binding.site.employer.id) if binding.site.employer else ""
            employer_industry = _d(getattr(emp_profile, "industry", "") if emp_profile else "")
            employer_email = _d(getattr(emp_profile, "email", "") if emp_profile else "")
            employer_lin = _d(getattr(emp_profile, "lin", "") if emp_profile else "")

    contractor_state = ""
    contractor_address = ""
    if binding and binding.contractor:
        _cp = getattr(binding.contractor, "contractor_profile", None)
        contractor_state = _d(_cp.state if _cp else "")
        contractor_address = _d(_cp.address if _cp else "")
    employer_state = ""
    employer_address = ""
    if binding and binding.site and binding.site.employer:
        _ep = getattr(binding.site.employer, "employer_profile", None)
        employer_state = _d(_ep.state if _ep else "")
        employer_address = _d(_ep.address if _ep else "")
    site_state = getattr(binding.site, "state", "") if binding and binding.site else ""
    return {
        "status": (_d(getattr(emp, "status", "")) if emp and getattr(emp, "status", "")
                   else ("Active" if binding else "")),
        "employer": employer_name,
        "contractor": contractor_name,
        "site": site_name,
        "department": (_d(binding.department) if binding and binding.department
                       else (_d(getattr(emp, "department", "")) if emp else "")),
        "designation": (_d(binding.designation) if binding and binding.designation
                        else (_d(getattr(emp, "designation", "")) if emp else "")),
        "doj": (_dts(emp.doj) if emp and emp.doj
                else (_dts(binding.accepted_at) if binding and binding.accepted_at else "")),
        "shift": (_d(binding.shift) if binding and binding.shift
                  else (_d(getattr(emp, "shift", "")) if emp else "")),
        "campNo": _d(emp.camp_no) if emp else "",
        "refWorkerId": _d(emp.ref_worker_id) if emp else "",
        "transportFacility": _d(emp.transport_facility) if emp else "",
        "route": _d(emp.route) if emp else "",
        "busNo": _d(emp.bus_no) if emp else "",
        "pfAccount": _d(emp.pf_account) if emp else "",
        "natureOfJob": _d(emp.nature_of_job) if emp else "",
        "typeOfWork": _d(emp.type_of_work) if emp else "",
        "idCardIssueDate": _dts(emp.id_card_issue_date) if emp and emp.id_card_issue_date else "",
        "idCardValidityTill": _dts(emp.id_card_validity_till) if emp and emp.id_card_validity_till else "",
        "contractorDetails": {
            "name": contractor_name,
            "code": contractor_code,
            "contact": contractor_contact,
            "email": contractor_email,
            "lin": contractor_lin,
            "state": contractor_state,
            "address": contractor_address,
        },
        "employerDetails": {
            "name": employer_name,
            "code": employer_code,
            "industry": employer_industry,
            "email": employer_email,
            "lin": employer_lin,
            "state": employer_state,
            "address": employer_address,
        },
        "siteDetails": {
            "name": site_name,
            "code": site_code,
            "location": site_location,
            "medicalOfficer": medical_officer,
            "officerContact": officer_contact,
            "state": site_state,
        }
    }


def _worker_compliance_section(user):
    ws = WorkerWelfareSafety.objects.filter(user=user).first()
    gp = WorkerGatePass.objects.filter(worker=user).order_by("-created_at").first()
    gp_status = ""
    if gp:
        gp_status = "Active" if gp.status in ("ACTIVE", "APPROVED") else ("Pending Approval" if gp.status == "PENDING" else _d(gp.status))
    elif ws and ws.permanent_gatepass_status:
        gp_status = _d(ws.permanent_gatepass_status)

    ppe = []
    given = ws.types_of_ppe_given if ws else ""
    ppe = [p.strip() for p in given.split(",") if p.strip()] if given else []
    days_left = 0
    if ws and ws.next_medical_due:
        today = timezone.now().date()
        due = ws.next_medical_due.date() if hasattr(ws.next_medical_due, "date") else ws.next_medical_due
        days_left = max(0, (due - today).days)

    return {
        "siteInduction": _d(ws.site_induction_status if ws else ""),
        "ppeIssued": ppe,
        "policeVerification": _d(ws.police_verification if ws else ""),
        "permanentGatePass": gp_status,
        "medicalFitnessDaysLeft": days_left,
        "medicalExaminationStatus": _d(ws.medical_examination_status if ws else ""),
        "medicalFitnessStatus": _d(ws.medical_fitness_status if ws else ""),
    }


def _worker_skills_section(user):
    sk = WorkerSkillsEmployability.objects.filter(user=user).first()
    languages = [s.strip() for s in (sk.languages_known or "").split(",") if s.strip()] if sk else []
    educations = [
        {
            "id": e.id,
            "qualificationCourse": _d(e.qualification_course),
            "boardUniversity": _d(e.board_university),
            "passingYear": _d(e.passing_year),
        }
        for e in WorkerEducation.objects.filter(user=user).order_by("id")
    ]
    skill_items = [
        {
            "id": s.id,
            "name": _d(s.name),
            "experienceYears": _d(s.experience_years),
            "verified": bool(s.verified),
            "certification": {
                "name": _d(s.certification_name),
                "number": _d(s.certification_number),
                "authority": _d(s.certification_authority),
                "expiry": _dts(s.certification_expiry) if s.certification_expiry else "",
            },
        }
        for s in WorkerSkill.objects.filter(user=user).order_by("id")
    ]
    if not skill_items and sk and _d(sk.primary_skill):
        skill_items = [{
            "id": None,
            "name": _d(sk.primary_skill),
            "experienceYears": _d(sk.skill_experience_years),
            "verified": bool(sk.certification_verified),
            "certification": {
                "name": _d(sk.certification_name),
                "number": _d(sk.certification_number),
                "authority": _d(sk.certification_authority),
                "expiry": _dts(sk.certification_expiry) if sk.certification_expiry else "",
            },
        }]
    first = skill_items[0] if skill_items else None
    verified_item = next((s for s in skill_items if s["verified"]), None)
    return {
        "educations": educations,
        "languages": languages,
        "items": skill_items,
        # Backward-compatible derived fields for dashboards / scan views.
        "primary": {"name": first["name"] if first else "", "experienceYears": first["experienceYears"] if first else ""},
        "secondary": [s["name"] for s in skill_items[1:]],
        "certification": {**(verified_item["certification"] if verified_item else {"name": "", "number": "", "authority": "", "expiry": ""}), "verified": bool(verified_item)},
    }


def _worker_social_security_section(user):
    ss = WorkerSocialSecurity.objects.filter(user=user).first()
    return {
        "epfoUan": _d(ss.epfo_uan) if ss else "",
        "esicIp": _d(ss.esic_ip_number) if ss else "",
        "lwfNo": _d(ss.lwf_no) if ss else "",
        "wcPolicyNo": _d(ss.wc_policy_no) if ss else "",
        "eShramNo": _d(ss.e_shram_no) if ss else "",
        "bocwRegNumber": _d(ss.bocw_reg_number) if ss else "",
        "stateWorkerId": _d(ss.state_worker_id) if ss else "",
        "eShramLinked": bool(ss and ss.e_shram_no),
        "bocwRegistered": bool(ss and ss.bocw_reg_number),
    }


def _worker_documents_section(user):
    master_docs = []
    try:
        from bss_core.models import WorkerDocumentMaster
        master_docs = list(WorkerDocumentMaster.objects.all())
    except Exception:
        master_docs = []
    required = [
        {"name": _d(m.document_name), "code": _d(m.code), "mandatory": m.is_mandatory}
        for m in master_docs if m.is_mandatory
    ]
    if not required:
        required = [
            {"name": "Aadhaar Card", "code": "AADHAAR", "mandatory": True},
            {"name": "PAN Card", "code": "PAN", "mandatory": False},
        ]
    docs = WorkerDocument.objects.filter(user=user)
    uploaded = [
        {
            "name": _d(d.document.document_name if d.document else ""),
            "status": _d(d.status),
            "date": _dts(d.uploaded_at),
        }
        for d in docs
    ]
    uploaded_names = {u["name"] for u in uploaded}
    missing = [r["name"] for r in required if r["name"] not in uploaded_names]
    return {
        "required": len(required),
        "uploaded": len(uploaded),
        "missing": missing,
    }


def _worker_wages_section(user):
    wages = WorkerWages.objects.filter(worker=user).order_by("-period_end")[:20]
    records = []
    for w in wages:
        payment = w.payments.first() if hasattr(w, "payments") else None
        records.append({
            "id": w.id,
            "period": f"{w.period_start:%d %b %Y} - {w.period_end:%d %b %Y}",
            "paidOn": _dts(payment.paid_at if payment else None),
            "employer": "",
            "contractor": _d(getattr(w.contractor, "username", "")) if w.contractor else "",
            "site": w.site.site_name if w.site else "",
            "basis": _d(w.wage_frequency),
            "gross": _num(w.gross_wage),
            "deductions": _num(w.deductions_amount),
            "net": _num(w.net_wage),
            "status": _d(w.status),
            "reference": _d(payment.transaction_ref) if payment else "",
            "receiptUrl": "",
        })
    return {
        "source": "BSS Payroll",
        "records": records,
        "syncedAt": _dts(timezone.now()),
    }


def _advance_row(a):
    wi = _get_identity(a.worker)
    return {
        "id": f"ADV-{a.id:04d}",
        "advanceId": a.id,
        "worker": _d(wi.name if wi and wi.name else a.worker.username),
        "workerId": _d(wi.bss_worker_id if wi else ""),
        "amount": _num(a.amount),
        "reason": _d(a.reason),
        "requestedOn": _dts(a.requested_at.date()) if a.requested_at else "",
        "status": {"REQUESTED": "Requested", "APPROVED": "Approved",
                   "DISBURSED": "Disbursed", "ACCEPTED": "Accepted",
                   "ADJUSTED": "Adjusted", "REJECTED": "Rejected"}.get(a.status, a.status),
        "approvedOn": _dts(a.approved_at.date()) if a.approved_at else "",
        "disbursedOn": _dts(a.disbursed_at.date()) if a.disbursed_at else "",
        "mode": a.get_mode_display() if a.mode else "",
        "reference": _d(a.reference),
        "payrollPeriod": _d(a.payroll_period),
    }


def _worker_advances(user):
    """Salary advances: worker requests → contractor approves/disburses → worker
    accepts → adjusted in payroll."""
    advances = SalaryAdvance.objects.filter(worker=user).select_related("worker")[:20]
    return [_advance_row(a) for a in advances]


def _contractor_advances(user):
    advances = (SalaryAdvance.objects.filter(contractor=user)
                .select_related("worker").order_by("-requested_at")[:100])
    return [_advance_row(a) for a in advances]


def _worker_attendance_section(user):
    rows = Attendance.objects.filter(worker=user).order_by("-attendance_date")[:60]
    title = {"PRESENT": "Present", "ABSENT": "Absent", "LEAVE": "Leave",
             "HOLIDAY": "Holiday", "EXPECTED": "Present", "LATE": "Late",
             "HALF_DAY": "Half Day"}
    method_label = {"QR": "QR Scan", "NFC": "RFID", "CAMERA": "CCTV"}

    def clock(value):
        if not value:
            return None
        try:
            return timezone.localtime(value).strftime("%H:%M")
        except Exception:
            return _dts(value)

    records = []
    for a in rows:
        raw = _d(a.status)
        records.append({
            "date": _dts(a.attendance_date),
            "presence": title.get(raw, raw),
            "shift": "",
            "site": a.site.site_name if a.site else "",
            "checkIn": clock(a.check_in_time),
            "checkOut": clock(a.check_out_time),
            "status": raw,
            "method": method_label.get(_d(a.capture_method), _d(a.capture_method)),
        })
    return {"source": "BSS Attendance", "records": records, "syncedAt": _dts(timezone.now())}


def _worker_financial_records(user, kind):
    """Real PF / Bonus / Leave-Encashment records for the worker.

    PF is autofetched (source EPFO); Bonus and Leave Encashment are uploaded by
    the contractor.
    """
    if kind == "providentFund":
        rows = []
        for r in WorkerBenefitRecord.objects.filter(worker=user, kind="PF").order_by("-period", "-id")[:24]:
            rows.append({
                "period": _d(r.period),
                "employeeContribution": _num(r.employee_contribution),
                "employerContribution": _num(r.employer_contribution),
                "creditedOn": _dts(r.credited_on) if r.credited_on else _dts(r.created_at.date()),
            })
        return {"source": "EPFO", "records": rows, "syncedAt": _dts(timezone.now())}
    if kind == "bonus":
        rows = []
        for r in WorkerBenefitRecord.objects.filter(worker=user, kind="BONUS").order_by("-period", "-id")[:24]:
            rows.append({
                "id": r.id, "period": _d(r.period), "reason": _d(r.reason),
                "amount": _num(r.amount), "paidOn": _dts(r.paid_on) if r.paid_on else "",
                "status": {"RECORDED": "Recorded", "CREDITED": "Credited",
                           "PROCESSING": "Processing", "PAID": "Paid"}.get(r.status, r.status),
            })
        return {"source": "Contractor", "records": rows, "syncedAt": _dts(timezone.now())}
    if kind == "leaveEncashment":
        rows = []
        for r in WorkerBenefitRecord.objects.filter(worker=user, kind="LEAVE_ENCASHMENT").order_by("-period", "-id")[:24]:
            rows.append({
                "id": r.id, "period": _d(r.period), "days": _num(r.days),
                "rate": _num(r.rate), "amount": _num(r.amount),
                "paidOn": _dts(r.paid_on) if r.paid_on else "",
                "status": {"RECORDED": "Recorded", "CREDITED": "Credited",
                           "PROCESSING": "Processing", "PAID": "Paid"}.get(r.status, r.status),
            })
        return {"source": "Contractor", "records": rows, "syncedAt": _dts(timezone.now())}
    return {"source": "", "records": [], "syncedAt": _dts(timezone.now())}


def _worker_gratuity(user):
    """Gratuity: service derived from the accepted binding + latest application."""
    binding = (WorkerContractorBinding.objects.filter(worker=user, binding_status="ACCEPTED")
               .select_related("site", "site__employer").first())
    service_start = None
    if binding:
        service_start = (binding.accepted_at.date() if binding.accepted_at else binding.created_at.date())
    years = 0
    if service_start:
        today = timezone.localdate()
        years = (today - service_start).days // 365
    latest_wage = WorkerWages.objects.filter(worker=user).order_by("-period_end").first()
    monthly = float(latest_wage.net_wage or 0) if latest_wage else 0
    indicative = round(monthly * 15 / 26 * years) if years else 0
    application = (GratuityApplication.objects.filter(worker=user).order_by("-submitted_on").first())
    scheme_status = "Enabled" if binding else "Non-enabled"
    return {
        "serviceStart": _dts(service_start) if service_start else "",
        "completedService": years,
        "calculationBasis": "15 days' wages per completed year of service",
        "indicativeAmount": indicative,
        "eligibilityStatus": ("eligible" if years >= 5 else ("not_eligible" if binding else "no_binding")),
        "lastUpdated": _dts(timezone.now()),
        "schemeStatus": scheme_status,
        "application": ({
            "reference": _d(application.reference),
            "submittedOn": _dts(application.submitted_on),
            "status": {"SUBMITTED": "Submitted", "UNDER_EXAMINATION": "Under examination",
                       "APPROVED": "Approved", "DISBURSED": "Disbursed",
                       "REJECTED": "Rejected"}.get(application.status, application.status),
        } if application else None),
    }


def _worker_contact_section(user, identity):
    p = UserPreference.objects.filter(user=user).first()
    comm = (p.communication_prefs or {}) if p else {}
    return {
        "mobile": _identity_display(identity, "mobile_number"),
        "alternateMobile": _identity_display(identity, "alternate_mobile"),
        "email": _identity_display(identity, "email"),
        "preferredLanguage": (p.interface_language or "hi") if p else "hi",
        "preferredChannel": comm.get("preferredChannel", "sms"),
    }


def _worker_address_section(user):
    a = WorkerAddressMobility.objects.filter(user=user).first()
    return {
        "current": _d(a.current_address) if a else "",
        "currentState": _d(a.current_state) if a else "",
        "currentDistrict": _d(a.current_district) if a else "",
        "currentCity": _d(a.current_city) if a else "",
        "currentLocality": _d(a.current_locality) if a else "",
        "currentPin": _d(a.current_pincode) if a else "",
        "permanent": _d(a.permanent_address) if a else "",
        "permanentState": _d(a.permanent_state) if a else "",
        "permanentDistrict": _d(a.permanent_district) if a else "",
        "permanentCity": _d(a.permanent_city) if a else "",
        "permanentLocality": _d(a.permanent_locality) if a else "",
        "permanentPin": _d(a.permanent_pincode) if a else "",
        "migrant": bool(a and a.migrant_worker),
        "migrationType": _d(a.migration_type) if a else "",
        "sameAsPermanent": bool(a and a.current_same_as_permanent),
    }


def _worker_personal_section(user, identity):
    return {
        "maritalStatus": _identity_display(identity, "marital_status"),
        "bloodGroup": _identity_display(identity, "blood_group"),
        "fatherName": _identity_display(identity, "father_name"),
        "motherName": _identity_display(identity, "mother_name"),
        "spouseName": _identity_display(identity, "spouse_name"),
        "disabilityStatus": _identity_display(identity, "disability_status"),
        "religion": _identity_display(identity, "religion"),
        "caste": _identity_display(identity, "caste"),
    }


def _worker_banking_section(user):
    b = WorkerBanking.objects.filter(user=user).first()
    return {
        "bankName": _d(b.bank_name) if b else "",
        "holderName": _d(b.bank_account_holder_name) if b else "",
        "accountNumber": _d(b.bank_account_number) if b else "",
        "ifsc": _d(b.ifsc_code) if b else "",
        "verificationStatus": _d(b.bank_verification_status) if b else "",
        "upiEnabled": bool(b and b.upi_enabled),
    }


_GP_WELFARE_LABEL = {"ACTIVE": "Active", "PENDING": "Pending Approval", "REJECTED": "Rejected",
                     "EXPIRED": "Expired", "REVOKED": "Revoked"}


def _latest_gate_pass(user, gp_type):
    return (WorkerGatePass.objects.filter(worker=user, gate_pass_type=gp_type)
            .order_by("-created_at").first())


def _worker_gate_passes(user):
    """The worker's own gate passes. Explicit requests keep their status; a
    worker with a completed (accepted) binding also gets an auto pass derived
    from their BSS ID card, so the pass is available on the worker side."""
    rows = []
    seen = set()
    for g in WorkerGatePass.objects.filter(worker=user).order_by("-created_at"):
        label = _GP_TYPE_LABEL.get(_d(g.gate_pass_type), _d(g.gate_pass_type))
        blocked = _is_gate_pass_blocked(g.worker, g.site.employer if g.site else None)
        rows.append({
            "id": g.id,
            "type": label,
            "number": _d(g.gate_pass_no),
            "site": g.site.site_name if g.site else "",
            "validFrom": _dts(g.start_date), "validTo": _dts(g.end_date),
            "status": "Blocked" if blocked else _GP_STATUS_LABEL.get(_d(g.status), _d(g.status)),
            "blocked": blocked,
            "requestedAt": _dts(g.created_at),
            "requestedBy": _party_name(g.issued_by),
            "approvedBy": _party_name(g.approved_by),
            "approvedAt": _dts(g.approved_at),
        })
        seen.add(label)
    for b in (WorkerContractorBinding.objects
              .filter(worker=user, binding_status="ACCEPTED")
              .select_related("site", "site__employer")):
        gp_type = _auto_gate_pass_type(user)
        label = _GP_TYPE_LABEL.get(gp_type, gp_type)
        if label in seen:
            continue
        issue_date, valid_till = _auto_gate_pass_dates(user, gp_type)
        blocked = _is_gate_pass_blocked(user, b.site.employer if b.site else None)
        rows.append({
            "id": f"auto-{b.id}",
            "type": label,
            "number": _auto_gate_pass_no(user, gp_type),
            "site": b.site.site_name if b.site else "",
            "validFrom": _dts(issue_date), "validTo": _dts(valid_till),
            "status": "Blocked" if blocked else "Approved",
            "blocked": blocked,
            "requestedAt": _dts(b.created_at),
            "requestedBy": "", "approvedBy": "", "approvedAt": "",
        })
        seen.add(label)
    return rows


def _worker_compliance_records(user):
    """Historical compliance records derived from the worker's own records
    (gate passes + medical / training on the welfare record)."""
    rows = []
    for g in WorkerGatePass.objects.filter(worker=user).order_by("-created_at"):
        label = "Permanent Gate Pass" if g.gate_pass_type == "PGP" else "Temporary Gate Pass"
        event_date = (g.approved_at.date() if g.approved_at else g.created_at.date())
        rows.append({
            "date": _dts(event_date),
            "record": f"{label} issued" if g.status == "ACTIVE" else f"{label} {_GP_STATUS_LABEL.get(_d(g.status), g.status).lower()}",
            "detail": f"{_d(g.gate_pass_no)}" + (f" · {g.site.site_name}" if g.site else ""),
            "ref": _d(g.gate_pass_no),
            "result": _GP_STATUS_LABEL.get(_d(g.status), _d(g.status)),
        })
    ws = WorkerWelfareSafety.objects.filter(user=user).first()
    if ws:
        if ws.last_medical_examination:
            rows.append({
                "date": _dts(ws.last_medical_examination),
                "record": "Medical examination",
                "detail": _d(ws.medical_fitness_status or ws.medical_examination_status) or "Fitness check",
                "ref": "",
                "result": _d(ws.medical_fitness_status or ws.medical_examination_status or "Done"),
            })
        if ws.training_date:
            rows.append({
                "date": _dts(ws.training_date),
                "record": "Safety training",
                "detail": _d(ws.trainer_name) or "Safety training",
                "ref": "",
                "result": "Completed" if ws.safety_training_completed else "Pending",
            })
    rows.sort(key=lambda r: r["date"] or "", reverse=True)
    return rows


def _worker_welfare_section(user):
    ws = WorkerWelfareSafety.objects.filter(user=user).first()
    tgp = _latest_gate_pass(user, "TGP")
    pgp = _latest_gate_pass(user, "PGP")
    return {
        "ppeRequired": bool(ws and ws.ppe_required),
        "typesOfPpeGiven": _d(ws.types_of_ppe_given) if ws else "",
        "safetyTrainingCompleted": bool(ws and ws.safety_training_completed),
        "siteInductionStatus": _d(ws.site_induction_status) if ws else "",
        "insuranceStatus": _d(ws.insurance_status) if ws else "",
        "accommodationProvided": _d(ws.accomodation_provided) if ws else "",
        "policeVerification": _d(ws.police_verification) if ws else "",
        "trainingDate": _dts(ws.training_date) if ws and ws.training_date else "",
        "trainerName": _d(ws.trainer_name) if ws else "",
        "tempGatePassStatus": _GP_WELFARE_LABEL.get(tgp.status, "") if tgp else (_d(ws.temp_gatepass_status) if ws else ""),
        "tgpNo": _d(tgp.gate_pass_no) if tgp else (_d(ws.tgp_no) if ws else ""),
        "tempGatePassStart": _dts(tgp.start_date) if tgp and tgp.start_date else (_dts(ws.temp_gatepass_start_date) if ws and ws.temp_gatepass_start_date else ""),
        "tempGatePassEnd": _dts(tgp.end_date) if tgp and tgp.end_date else (_dts(ws.temp_gatepass_end_date) if ws and ws.temp_gatepass_end_date else ""),
        "permanentGatePassStatus": _GP_WELFARE_LABEL.get(pgp.status, "") if pgp else (_d(ws.permanent_gatepass_status) if ws else ""),
        "pgpNo": _d(pgp.gate_pass_no) if pgp else (_d(ws.pgp_no) if ws else ""),
        "permanentGatePassStart": _dts(pgp.start_date) if pgp and pgp.start_date else (_dts(ws.permanent_gatepass_start_date) if ws and ws.permanent_gatepass_start_date else ""),
        "permanentGatePassEnd": _dts(pgp.end_date) if pgp and pgp.end_date else (_dts(ws.permanent_gatepass_end_date) if ws and ws.permanent_gatepass_end_date else ""),
        "medicalExaminationStatus": _d(ws.medical_examination_status) if ws else "",
        "lastMedicalExamination": _dts(ws.last_medical_examination) if ws and ws.last_medical_examination else "",
        "medicalFitnessStatus": _d(ws.medical_fitness_status) if ws else "",
        "nextMedicalDue": _dts(ws.next_medical_due) if ws and ws.next_medical_due else "",
    }


def _worker_classification_section(user):
    wc = WorkerClassification.objects.filter(user=user).first()
    if not wc:
        return {}
    return {
        "workerCategory": _d(wc.worker_category),
        "sector": _d(wc.sector),
        "industry": _d(wc.industry),
        "occupation": _d(wc.occupation),
        "skill": _d(wc.skill),
        "currentEmploymentStatus": _d(wc.current_employment_status),
        "totalWorkerExperience": _d(wc.total_worker_experience),
        "gigPlatformWorkerId": _d(wc.gig_platform_worker_id),
        "gigPlatformName": _d(wc.gig_platform_name),
        "gigPlatformType": _d(wc.gig_platform_type),
        "gigDateJoined": _dts(wc.gig_date_joined_platform) if wc.gig_date_joined_platform else "",
        "gigAvgHoursPerDay": _d(wc.gig_avg_hours_per_day),
        "gigAvgDaysPerWeek": _d(wc.gig_avg_days_per_week),
        "gigServiceArea": _d(wc.gig_service_area),
        "gigVehicleType": _d(wc.gig_vehicle_type),
        "gigVehicleOwnership": _d(wc.gig_vehicle_ownership),
        "gigDlNumber": _d(wc.gig_dl_number),
        "gigDlExpiry": _dts(wc.gig_dl_expiry) if wc.gig_dl_expiry else "",
        "seBusinessName": _d(wc.se_business_name),
        "seBusinessType": _d(wc.se_business_type),
        "seRegistrationStatus": _d(wc.se_registration_status),
        "seStartDate": _dts(wc.se_start_date) if wc.se_start_date else "",
        "seLocation": _d(wc.se_business_location),
        "seAvgHoursPerDay": _d(wc.se_avg_hours_per_day),
        "seAvgDaysPerWeek": _d(wc.se_avg_days_per_week),
        "seEmployeesCount": wc.se_num_employees,
        "seEmployerName": _d(wc.se_employer_or_business_name),
        "seasonalJobType": _d(wc.season_job_work_type),
        "seasonalStartDate": _dts(wc.season_start_date) if wc.season_start_date else "",
        "seasonalEndDate": _dts(wc.season_end_date) if wc.season_end_date else "",
        "seasonalAvgHoursPerDay": _d(wc.season_avg_hours_per_day),
        "seasonalAvgDaysPerWeek": _d(wc.season_avg_days_per_week),
        "seasonalLocation": _d(wc.season_work_location),
         "seasonalExpectedIncome": _d(wc.season_expected_income),
         "paymentFrequency": _d(wc.season_payment_frequency),
         "paymentMode": _d(wc.payment_mode),
    }


def _worker_family_section(user):
    fam = WorkerFamilyDependant.objects.filter(user=user)
    # The non-nominee "head" row carries the family/dependants counts; nominee
    # rows are the actual nominees. Keep them separate so the head row never
    # leaks into the nominee list as a blank row.
    head = fam.exclude(nominee=True).first()
    return {
        "familyMembersCount": head.family_members_count if head else 0,
        "dependantsCount": head.dependants_count if head else 0,
        "nominees": [
            {
                "id": n.id,
                "name": _d(n.name),
                "dependant": _d(n.dependant),
                "relation": _d(n.relation),
                "nomineeType": _d(n.nominee_type),
                "dob": _dts(n.nominee_dob) if n.nominee_dob else "",
                "age": n.nominee_age,
                "contact": _d(n.contact),
                "address": _d(n.address),
                "documents": (n.nominee_documents
                              or [d for d in (["PAN"] if n.pan_copy_nominee else []) + (["Aadhaar"] if n.aadhaar_copy_nominee else [])]),
                "percent": n.percent if n.percent is not None else 0,
            }
            for n in fam.filter(nominee=True)
        ],
    }


def _worker_preferences_section(user):
    p = UserPreference.objects.filter(user=user).first()
    privacy = (p.privacy_prefs or {}) if p else {}
    return {
        "consentToPublicPhoto": bool(privacy.get("consentToPublicPhoto", False)),
        "consentToDataSharing": bool(privacy.get("consentToDataSharing", False)),
    }


def _worker_settings_section(user):
    """Worker portal Settings screen (Excel worker settings rows 282-290) —
    real values from the UserPreference table, so the page never falls back to
    hardcoded defaults. False/null-safe for first visit."""
    p = UserPreference.objects.filter(user=user).first()
    notif = (p.notification_prefs or {}) if p else {}
    comm = (p.communication_prefs or {}) if p else {}
    a11y = (p.accessibility_prefs or {}) if p else {}
    privacy = (p.privacy_prefs or {}) if p else {}
    return {
        "interfaceLanguage": (p.interface_language if p else "") or "en",
        "preferredChannel": comm.get("preferredChannel", "sms"),
        "jobAlerts": bool(notif.get("jobAlerts", True)),
        "complianceAlerts": bool(notif.get("complianceAlerts", True)),
        "grievanceUpdates": bool(notif.get("grievanceUpdates", True)),
        "largeText": bool(a11y.get("largeText", False)),
        "highContrast": bool(a11y.get("highContrast", False)),
        "reduceMotion": bool(a11y.get("reduceMotion", False)),
        "consentToPublicPhoto": bool(privacy.get("consentToPublicPhoto", False)),
        "consentToDataSharing": bool(privacy.get("consentToDataSharing", False)),
        "bindingEnabled": bool(p.binding_enabled) if p else True,
    }



def _worker_other_section(user):
    o = WorkerOther.objects.filter(user=user).first()
    return {
        "registrationSource": _d(o.registration_source) if o else "",
        "registeredBy": _d(o.registered_by) if o else "",
        "registrationDate": _dts(o.registration_date) if o and o.registration_date else "",
        "consentDate": _dts(o.consent_date) if o and o.consent_date else "",
        "consentRegistration": bool(o and o.consent_registration),
        "consentVerification": bool(o and o.consent_verification),
    }


def _worker_labour_law():
    # No labour-law master rows exist yet (see gap analysis §D ComplianceMaster).
    return []


def _worker_holidays(user=None):
    """Holiday calendar the worker inherits from their bound site."""
    site = _worker_bound_site(user)
    if site is None:
        return []
    rows = []
    for h in SiteHoliday.objects.filter(site=site).order_by("date"):
        rows.append({
            "date": _dts(h.date),
            "name": _d(h.name),
            "type": h.get_holiday_type_display(),
            "typeCode": h.holiday_type,
            "appliesTo": _d(site.site_name),
            "isPaid": h.is_paid,
        })
    return rows


def _worker_weekly_off_days(user=None):
    """The bound site's weekly off day codes (MON..SUN)."""
    site = _worker_bound_site(user)
    if site is None:
        return []
    return [d for d in (site.weekly_off_days or "").split(",") if d]


_RH_STATUS = {"PENDING": "Pending", "APPROVED": "Approved",
              "REJECTED": "Rejected", "CANCELLED": "Cancelled"}


def _rh_request_row(r):
    """Restricted-holiday request row, shared by the worker and contractor views."""
    wi = WorkerIdentity.objects.filter(user=r.worker).first()
    return {
        "id": str(r.id),
        "worker": _d(wi.name if wi else r.worker.username),
        "workerId": _d(wi.bss_worker_id if wi else ""),
        "site": r.site.site_name if r.site else "",
        "siteId": r.site_id,
        "holidayDate": _dts(r.holiday_date),
        "holidayName": _d(r.holiday_name),
        "reason": _d(r.reason),
        "status": _RH_STATUS.get(str(r.status).upper(), "Pending"),
        "requestedOn": _dts(r.created_at),
        "decidedOn": _dts(r.decided_at) if r.decided_at else "",
        "comment": _d(r.comment),
    }


def _worker_restricted_holidays(user):
    """The worker's Restricted Holiday (RH) quota + their requests.

    ``allotment`` is the actual number of Restricted Holidays published on the
    site calendar (not a typed-in number), so it always matches what the worker
    sees on the calendar."""
    site = _worker_bound_site(user)
    if site is None:
        return {"allotment": 0, "maxAvail": 0, "used": 0, "requests": []}
    reqs = (RestrictedHolidayRequest.objects
            .filter(worker=user, site=site).select_related("site", "worker"))
    used = reqs.filter(status__in=("PENDING", "APPROVED")).count()
    offered = SiteHoliday.objects.filter(site=site, holiday_type="RESTRICTED").count()
    # You cannot avail more restricted holidays than are actually offered.
    max_avail = min(site.restricted_holiday_max_avail, offered)
    return {
        "allotment": offered,
        "maxAvail": max_avail,
        "used": used,
        "requests": [_rh_request_row(r) for r in reqs[:20]],
    }


def _contractor_restricted_holiday_requests(user):
    """Restricted-holiday requests raised by the contractor's bound workers."""
    reqs = (RestrictedHolidayRequest.objects
            .filter(contractor=user).select_related("site", "worker")[:100])
    return [_rh_request_row(r) for r in reqs]


def _contractor_site_calendars(user):
    """Per-site holiday calendar + leave policy the contractor manages; workers
    bound to each site inherit them."""
    site_ids = set(WorkerContractorBinding.objects.filter(contractor=user)
                   .values_list("site_id", flat=True))
    site_ids.update(ContractorSiteAllotment.objects.filter(
        binding__contractor=user, status="APPROVED").values_list("site_id", flat=True))
    out = []
    for site in Site.objects.filter(id__in=site_ids).order_by("id"):
        holidays = [{
            "id": h.id, "date": _dts(h.date), "name": _d(h.name),
            "holidayType": h.get_holiday_type_display(), "holidayTypeCode": h.holiday_type,
            "isPaid": h.is_paid, "note": _d(h.note),
        } for h in site.holidays.all()]
        policies = [{
            "id": p.id, "leaveTypeId": p.leave_type_id, "leaveType": p.leave_type.name,
            "annualEntitlement": p.annual_entitlement, "openingBalance": p.opening_balance,
            "isActive": p.is_active,
        } for p in site.leave_policies.select_related("leave_type").all()]
        out.append({
            "siteId": site.id, "siteName": _d(site.site_name),
            "holidays": holidays, "leavePolicies": policies,
            # "Offered" is derived from the calendar, not a typed number.
            "restrictedHolidayAllotment": sum(1 for h in holidays if h["holidayTypeCode"] == "RESTRICTED"),
            "restrictedHolidayMaxAvail": site.restricted_holiday_max_avail,
            "weeklyOffDays": [d for d in (site.weekly_off_days or "").split(",") if d],
        })
    return out


def _worker_announcements():
    # No announcement table exists yet (gap analysis §D).
    return []


def _worker_courses(user=None):
    """Course catalog + the worker's progress.

    Shape: course -> modules -> (video lessons + assignments with pass marks).
    A module is complete when every lesson is watched and every assignment is
    passed; the course is complete (certificate issued) when all modules are.
    """
    enrollments = {}
    if user is not None:
        enrollments = {e.course_id: e for e in CourseEnrollment.objects.filter(worker=user)}
    rows = []
    for c in Course.objects.filter(is_active=True).prefetch_related(
            "modules__lessons", "modules__readings", "modules__assignments__questions"):
        enrollment = enrollments.get(c.id)
        completed_ids = {str(x) for x in (enrollment.completed_lesson_ids or [])} if enrollment else set()
        scores = {str(k): v for k, v in (enrollment.assignment_scores or {}).items()} if enrollment else {}
        submissions = ({s.assignment_id: s for s in CourseSubmission.objects.filter(worker=user)}
                       if user is not None else {})

        modules = []
        total_items = done_items = 0
        for m in c.modules.all():
            lessons = list(m.lessons.all())
            assignments = list(m.assignments.all())
            lesson_rows = [{
                "id": str(l.id), "title": _d(l.title), "duration": _d(l.duration),
                "completed": str(l.id) in completed_ids, "videoUrl": _d(l.youtube_url),
            } for l in lessons]
            assignment_rows = []
            for a in assignments:
                score = scores.get(str(a.id))
                passed = score is not None and score >= a.pass_score
                submission = submissions.get(a.id)
                assignment_rows.append({
                    "id": str(a.id), "title": _d(a.title), "passScore": a.pass_score,
                    "type": a.assignment_type, "instructions": _d(a.instructions),
                    "score": score, "passed": passed,
                    # Correct answers are never sent to the client (server-side grading).
                    "questions": [{"id": str(q.id), "question": _d(q.question),
                                   "options": list(q.options or [])} for q in a.questions.all()],
                    "submission": ({
                        "content": _d(submission.content), "fileUrl": _d(submission.file_url),
                        "status": submission.get_status_display(), "score": submission.score,
                        "feedback": _d(submission.feedback),
                        "submittedAt": _dts(submission.submitted_at),
                    } if submission else None),
                })
            lessons_done = all(str(l.id) in completed_ids for l in lessons) if lessons else True
            assignments_passed = all(
                scores.get(str(a.id)) is not None and scores[str(a.id)] >= a.pass_score
                for a in assignments) if assignments else True
            module_complete = bool(lessons or assignments) and lessons_done and assignments_passed
            total_items += len(lessons) + len(assignments)
            done_items += (sum(1 for l in lessons if str(l.id) in completed_ids)
                           + sum(1 for a in assignments if scores.get(str(a.id)) is not None
                                 and scores[str(a.id)] >= a.pass_score))
            reading_rows = [{
                "id": str(r.id), "title": _d(r.title), "body": _d(r.body),
                "url": _d(r.resource_url), "duration": _d(r.duration),
            } for r in m.readings.all()]
            modules.append({
                "id": str(m.id), "title": _d(m.title),
                "lessons": lesson_rows, "assignments": assignment_rows,
                "readings": reading_rows,
                "completed": module_complete,
            })

        completed = bool(enrollment and enrollment.status == "COMPLETED")
        progress = 100 if completed else (round(done_items / total_items * 100) if total_items else 0)
        rows.append({
            "id": str(c.id),
            "title": _d(c.title),
            "provider": _d(c.provider),
            "duration": _d(c.duration),
            "rating": float(c.rating or 0),
            "progress": progress,
            "image": _d(c.image_url),
            "badge": _d(c.badge),
            "category": _d(c.category),
            "description": _d(c.description),
            "instructor": _d(c.instructor),
            "certification": _d(c.certification),
            "skillAwarded": _d(c.skill_name or c.title),
            "status": ("Completed" if completed else ("In progress" if progress > 0 else "Not started")),
            "certificateReady": completed,
            "certificateNo": _d(enrollment.certificate_no) if enrollment else "",
            "modules": modules,
        })
    return rows


def _doc_owner_label(value):
    return {"worker": "Worker", "contractor": "Contractor", "system": "System"}.get(
        (value or "").strip().lower(), "Worker")


_DIGILOCKER_DOC_CODES = {"AADHAR", "PAN", "UAN", "EDU"}


def _doc_source_label(code, auto_generated):
    """Where a locked document actually came from: DigiLocker fetch vs a
    system-generated credential (letters / gate passes)."""
    if auto_generated:
        return "digilocker" if code in _DIGILOCKER_DOC_CODES else "system"
    return "upload"


def _doc_name_key(name):
    """Normalised key for merging duplicate catalog rows (e.g. legacy 'WM0x'
    rows vs the canonical 'AADHAR'/'PAN' codes)."""
    key = re.sub(r"[^a-z0-9]+", " ", (name or "").lower()).strip()
    return key.replace("educational", "education")


def _doc_row_rank(row):
    """Prefer a row that actually has a stored file, then a DigiLocker code."""
    return (1 if row["id"] else 0, 1 if row["code"] in _DIGILOCKER_DOC_CODES else 0)


def _worker_documents_display(user):
    """The worker's document register: the master catalog merged with the
    worker's own uploads (uploads override catalog rows). Duplicate catalog
    entries with the same document name are collapsed to one row."""
    uploads = {
        d.document_id: d
        for d in WorkerDocument.objects.select_related("document").filter(user=user)
    }
    rows = []
    masters = list(WorkerDocumentMaster.objects.all().order_by("sort_order", "id"))
    seen = set()
    for m in masters:
        d = uploads.get(m.id)
        if d:
            seen.add(d.id)
            rows.append({
                "id": d.id,
                "name": _d(m.document_name),
                "code": _d(m.code),
                "mandatory": bool(d.is_mandatory or m.is_mandatory),
                "owner": _doc_owner_label(d.owner_role or m.uploaded_by),
                "status": ("ISSUED"
                           if bool(d.auto_generated) and _d(m.code) not in _DIGILOCKER_DOC_CODES
                           else _d(d.status, "UPLOADED")),
                "date": _dts(d.uploaded_at) if d.uploaded_at else None,
                "expiry": _dts(d.expiry_date) if d.expiry_date else None,
                "fileName": _d(d.file_name),
                "downloadUrl": f"/api/worker/documents/{d.id}/file" if d.file else "",
                "locked": bool(d.auto_generated),
                "source": _doc_source_label(_d(m.code), bool(d.auto_generated)),
            })
        else:
            rows.append({
                "id": None,
                "name": _d(m.document_name),
                "code": _d(m.code),
                "mandatory": bool(m.is_mandatory),
                "owner": _doc_owner_label(m.uploaded_by),
                "status": "MISSING",
                "date": None,
                "expiry": None,
                "fileName": "",
                "downloadUrl": "",
                "locked": False,
                "source": "",
            })
    for d in uploads.values():
        if d.id in seen:
            continue
        rows.append({
            "id": d.id,
            "name": _d(d.document.document_name if d.document else ""),
            "code": _d(d.document.code if d.document else ""),
            "mandatory": bool(d.is_mandatory),
            "owner": _doc_owner_label(d.owner_role),
            "status": ("ISSUED"
                       if bool(d.auto_generated)
                       and _d(d.document.code if d.document else "") not in _DIGILOCKER_DOC_CODES
                       else _d(d.status, "UPLOADED")),
            "date": _dts(d.uploaded_at) if d.uploaded_at else None,
            "expiry": _dts(d.expiry_date) if d.expiry_date else None,
            "fileName": _d(d.file_name),
            "downloadUrl": f"/api/worker/documents/{d.id}/file" if d.file else "",
            "locked": bool(d.auto_generated),
            "source": _doc_source_label(_d(d.document.code if d.document else ""), bool(d.auto_generated)),
        })

    # Collapse duplicate names, keeping the best row in its original position.
    best = {}
    order = []
    for row in rows:
        key = _doc_name_key(row["name"])
        if key not in best:
            best[key] = row
            order.append(key)
        elif _doc_row_rank(row) > _doc_row_rank(best[key]):
            best[key] = row
    return [best[k] for k in order]


def _worker_job_requests(user):
    """Rozgar job requests (RozgarRequest) — drives the /worker/rozgar screen."""
    rows = []
    reqs = user.rozgar_applications.all()[:10] if hasattr(user, "rozgar_applications") else []
    for r in reqs:
        job = getattr(r, "job", None)
        site = job.site if job else None
        contractor_name = ""
        if job and job.contractor:
            cp = getattr(job.contractor, "contractor_profile", None)
            contractor_name = _d(cp.contractor_name if cp else job.contractor.username)
        status_map = {"PENDING": "Pending", "ACCEPTED": "Accepted", "REJECTED": "Rejected", "EXPIRED": "Expired"}
        rows.append({
            "id": str(r.id),
            "employer": _d(site.employer.username if site and site.employer else ""),
            "contractor": contractor_name,
            "site": site.site_name if site else "",
            "designation": _d(job.job_title) if job else "",
            "wage": _num(job.wage_offered if job and job.wage_offered else 0),
            "currency": "INR",
            "payPeriod": "MONTHLY",
            "duration": _dts(job.validity_until) if job and job.validity_until else "",
            "facilities": [],
            "status": status_map.get(str(r.status).upper(), "Pending"),
            "dateReceived": _dts(r.requested_at),
        })
    return rows


def _worker_available_jobs(user):
    """Active ContractorJob postings shown on /worker/rozgar (Available Jobs).

    Field set mirrors BSS_Feature_Comparison.xlsx (Worker > Rozgar Setu):
    State, City, Designation, Experience, DOB limit, Description, View/Apply.
    """
    from bss_core.models import ContractorJob
    from api import matching

    # Hide only jobs with a *live* application (pending/shortlisted/hired). A
    # rejected/cancelled/expired application frees the posting so the worker sees
    # it again in Available Jobs and can re-apply.
    applied_job_ids = set()
    if hasattr(user, "rozgar_applications"):
        applied_job_ids = set(
            user.rozgar_applications
            .filter(status__in=("PENDING", "SHORTLISTED", "ACCEPTED"))
            .values_list("job_id", flat=True)
        )

    # Compute the worker's fuzzy-match profile once; reuse it for every posting.
    profile = matching.worker_profile(user)

    qs = (
        ContractorJob.objects.filter(is_active=True)
        .exclude(status="CLOSED")
        .select_related("site", "contractor")
        .order_by("-created_at")[:50]
    )
    rows = []
    for j in qs:
        if j.id in applied_job_ids:
            continue
        cp = getattr(j.contractor, "contractor_profile", None)
        site = j.site
        state = _d(j.state or (site.state if site else ""))
        city = _d(j.city or (site.city if site else ""))
        score = matching.score(user, j, profile=profile)
        posted = j.created_at.strftime("%d %b %Y") if j.created_at else ""
        raw_wage = _d(j.wage_offered)
        try:
            wage_display = f"₹{int(float(raw_wage)):,} / month"
        except (TypeError, ValueError):
            wage_display = raw_wage
        rows.append({
            "id": f"JOB-{j.id}",
            "jobId": j.id,
            "title": _d(j.job_title),
            "subTitle": _d(j.trade or j.category),
            "employer": _d(cp.contractor_name if cp else j.contractor.username),
            "postedDate": (f"Posted {posted}" if posted else ""),
            "description": _d(j.job_description),
            "wage": wage_display,
            "state": state,
            "city": city,
            "designation": _d(j.designation or j.job_title),
            "experience": _d(j.experience),
            "dobLimit": _d(j.dob_limit),
            "vacancies": j.vacancies or 1,
            "matchScore": score,
            "matchBadge": score >= 50,
        })
    # Best matches first so the worker sees the most relevant postings up top.
    rows.sort(key=lambda r: r["matchScore"], reverse=True)
    return rows


_CE_SOURCE_INITIATOR = {"site_qr": "Contractor", "employer_qr": "Contractor",
                        "contractor_qr": "Employer"}


def _ce_initiator_acceptor(b):
    """(initiated_by, accepted_by) role labels for a contractor<->employer binding.

    The initiator is derived from how the request was raised (who scanned whose
    QR). Once accepted, the counterparty of the initiator is the acceptor."""
    initiated = _CE_SOURCE_INITIATOR.get(str(b.source or "").lower(), "Contractor")
    accepted = ""
    if str(b.binding_status).upper() == "ACCEPTED":
        accepted = "Employer" if initiated == "Contractor" else "Contractor"
    return initiated, accepted


def _wc_initiator_acceptor(b):
    """(initiated_by, accepted_by) for a worker<->contractor binding.

    Uses the stored `initiated_by` — a worker scanning a contractor QR (or
    applying to a job) makes it worker-initiated; a contractor scanning a worker
    QR (or adding the worker) makes it contractor-initiated. Falls back to the
    old consent-order heuristic for legacy rows created before the field existed
    (only reliable while the binding is still PENDING)."""
    stored = str(getattr(b, "initiated_by", "") or "").lower()
    if stored in ("worker", "contractor"):
        initiated = "Worker" if stored == "worker" else "Contractor"
    else:
        initiated = "Worker" if (bool(b.consent_worker) and not bool(b.consent_contractor)) else "Contractor"
    accepted = ""
    if str(b.binding_status).upper() == "ACCEPTED":
        accepted = "Contractor" if initiated == "Worker" else "Worker"
    return initiated, accepted


def _wc_history(b):
    """Chronological binding/unbinding events for a worker<->contractor binding."""
    initiated, accepted = _wc_initiator_acceptor(b)
    events = [{"label": "Requested", "by": initiated, "at": _dts(b.created_at)}]
    if b.accepted_at:
        events.append({"label": "Binding accepted",
                       "by": accepted or ("Worker" if b.consent_worker else "Contractor"),
                       "at": _dts(b.accepted_at)})
    if str(b.binding_status).upper() == "REJECTED":
        by = {"worker": "Worker", "contractor": "Contractor"}.get(str(b.rejected_by or "").lower(), "")
        if not by:
            by = "Worker"  # a worker binding is raised by the contractor, so the worker declines
        events.append({"label": "Rejected", "by": by, "at": _dts(b.rejected_at) or _dts(b.updated_at)})
    if b.unbind_requested_at:
        by = {"worker": "Worker", "contractor": "Contractor"}.get(str(b.unbind_requested_by or "").lower(), "")
        if not by:
            if b.unbind_consent_contractor and not b.unbind_consent_worker:
                by = "Contractor"
            elif b.unbind_consent_worker and not b.unbind_consent_contractor:
                by = "Worker"
            else:
                by = "Both parties"
        events.append({"label": "Unbind requested", "by": by, "at": _dts(b.unbind_requested_at)})
    if b.unbound_at:
        events.append({"label": "Unbound", "by": "Both parties", "at": _dts(b.unbound_at)})
    return events


def _ce_history(b):
    """Chronological binding/unbinding events for a contractor<->employer binding."""
    initiated, accepted = _ce_initiator_acceptor(b)
    events = [{"label": "Requested", "by": initiated, "at": _dts(b.created_at)}]
    if b.accepted_at:
        events.append({"label": "Binding accepted",
                       "by": accepted or ("Employer" if initiated == "Contractor" else "Contractor"),
                       "at": _dts(b.accepted_at)})
    if str(b.binding_status).upper() == "REJECTED":
        by = {"contractor": "Contractor", "employer": "Employer"}.get(str(b.rejected_by or "").lower(), "")
        if not by:
            by = "Employer" if initiated == "Contractor" else "Contractor"
        events.append({"label": "Rejected", "by": by, "at": _dts(b.rejected_at) or _dts(b.updated_at)})
    if b.unbind_requested_at:
        by = {"contractor": "Contractor", "employer": "Employer"}.get(str(b.unbind_requested_by or "").lower(), "")
        if not by:
            if b.unbind_consent_contractor and not b.unbind_consent_employer:
                by = "Contractor"
            elif b.unbind_consent_employer and not b.unbind_consent_contractor:
                by = "Employer"
            else:
                by = "Both parties"
        events.append({"label": "Unbind requested", "by": by, "at": _dts(b.unbind_requested_at)})
    if b.unbound_at:
        events.append({"label": "Unbound", "by": "Both parties", "at": _dts(b.unbound_at)})
    return events


def _binding_row(b):
    """Canonical binding payload (E·C·S·W), shared by worker/contractor/employer views."""
    initiated_by, accepted_by = _wc_initiator_acceptor(b)
    site = b.site
    employer_name = ""
    if site and site.employer:
        employer_name = _org_name(site.employer)
    contractor = b.contractor
    contractor_name = ""
    contractor_code = ""
    contractor_lin = ""
    if contractor:
        cp = getattr(contractor, "contractor_profile", None)
        contractor_name = _org_name(contractor)
        contractor_code = _d(cp.contractor_code if cp else _bss_contractor_code(contractor.id))
        contractor_lin = _d(getattr(cp, "lin", ""))
    # A live binding unlocks the contractor's business identity for the worker.
    contractor_details = {}
    if contractor and str(b.binding_status).upper() == "ACCEPTED":
        cp = getattr(contractor, "contractor_profile", None)
        contractor_details = {
            "name": contractor_name,
            "code": contractor_code,
            "tradeName": _d(getattr(cp, "trade_name", "") if cp else ""),
            "lin": contractor_lin,
            "contactPerson": _d(getattr(cp, "contact_person", "") if cp else ""),
            "email": _d(getattr(cp, "email", "") if cp else ""),
            "state": _d(getattr(cp, "state", "") if cp else ""),
            "address": _d(getattr(cp, "address", "") if cp else ""),
        }
    wi = WorkerIdentity.objects.filter(user=b.worker).first()
    worker_name = _d(wi.name if wi else b.worker.username)
    worker_bss = _d(wi.bss_worker_id if wi else _bss_worker_code(b.worker_id))
    emp = WorkerEmployment.objects.filter(user=b.worker).first()
    latest_wage = WorkerWages.objects.filter(worker=b.worker).order_by("-period_end").first()
    wage_value = b.offered_wage if b.offered_wage is not None else (latest_wage.gross_wage if latest_wage else None)
    wage = f"₹{_num(wage_value):,.0f} / month" if wage_value else ""
    status_map = {"PENDING": "Pending", "ACCEPTED": "Accepted", "REJECTED": "Rejected",
                  "CANCELLED": "Cancelled", "EXPIRED": "Expired"}
    return {
        "id": b.id,
        "ref": f"BIND-2026-{b.id:03d}",
        "worker": worker_name,
        "workerBssId": worker_bss,
        "contractor": contractor_name,
        "contractorCode": contractor_code,
        "lin": contractor_lin,
        "contractorDetails": contractor_details,
        "employer": employer_name,
        "site": site.site_name if site else "",
        "siteId": b.site_id,
        "designation": _d(b.designation) or (_d(emp.designation) if emp else ""),
        "department": _d(b.department) or (_d(emp.department) if emp else ""),
        "shift": _d(b.shift) or (_d(emp.shift) if emp else ""),
        "wage": wage,
        "requestedOn": _dts(b.created_at),
        "status": status_map.get(str(b.binding_status).upper(), "Pending"),
        "initiatedBy": initiated_by,
        "acceptedBy": accepted_by,
        "consentWorker": bool(b.consent_worker),
        "consentContractor": bool(b.consent_contractor),
        "consentMethod": _d(b.consent_method),
        "unbindConsentWorker": bool(b.unbind_consent_worker),
        "unbindConsentContractor": bool(b.unbind_consent_contractor),
        "unbindRequested": bool(b.unbind_requested_at),
        "history": _wc_history(b),
    }


def _worker_bindings(user):
    """Contractor binding requests (WorkerContractorBinding) — drives /worker/binding."""
    bindings = WorkerContractorBinding.objects.filter(worker=user).order_by("-created_at")[:10]
    return [_binding_row(b) for b in bindings]


def _ce_binding_row(b):
    """Contractor<->employer binding with its site allotments (E·C·S·W)."""
    cp = getattr(b.contractor, "contractor_profile", None)
    ep = getattr(b.employer, "employer_profile", None)
    status_map = {"PENDING": "Pending", "ACCEPTED": "Accepted",
                  "REJECTED": "Rejected", "CANCELLED": "Cancelled"}
    allot_status = {"PENDING": "Pending", "APPROVED": "Approved", "REJECTED": "Rejected",
                    "RELEASED": "Released"}
    initiated_by, accepted_by = _ce_initiator_acceptor(b)
    allotments = [
        {
            "id": a.id,
            "siteId": a.site_id,
            "site": a.site.site_name if a.site else "",
            "siteCode": a.site.site_code if a.site else "",
            "status": allot_status.get(str(a.status).upper(), "Pending"),
            "source": _d(a.source),
            "releaseRequested": bool(a.release_requested_at),
            "releaseRequestedBy": _d(a.release_requested_by),
        }
        for a in b.allotments.all()
    ]
    return {
        "id": b.id,
        "ref": f"CEB-2026-{b.id:03d}",
        "initiatedBy": initiated_by,
        "acceptedBy": accepted_by,
        "contractor": _org_name(b.contractor),
        "contractorCode": _d(cp.contractor_code if cp else "", _bss_contractor_code(b.contractor_id)),
        "employer": _org_name(b.employer),
        "employerCode": _d(ep.employer_code if ep else "", _bss_employer_code(b.employer_id)),
        "status": status_map.get(str(b.binding_status).upper(), "Pending"),
        "consentContractor": bool(b.consent_contractor),
        "consentEmployer": bool(b.consent_employer),
        "source": _d(b.source),
        "unbindRequested": bool(b.unbind_requested_at),
        "unbindConsentContractor": bool(b.unbind_consent_contractor),
        "unbindConsentEmployer": bool(b.unbind_consent_employer),
        "requestedOn": _dts(b.created_at),
        "allotments": allotments,
        "history": _ce_history(b),
    }


def _employer_bindings(user):
    qs = ContractorEmployerBinding.objects.filter(employer=user).order_by("-created_at")[:50]
    return [_ce_binding_row(b) for b in qs]


def _contractor_bindings(user):
    qs = ContractorEmployerBinding.objects.filter(contractor=user).order_by("-created_at")[:50]
    return [_ce_binding_row(b) for b in qs]


def _worker_bound_site(user):
    if user is None:
        return None
    binding = (WorkerContractorBinding.objects.filter(worker=user, binding_status="ACCEPTED")
               .select_related("site").first())
    return binding.site if binding and binding.site else None


def _site_leave_policies(site):
    if site is None:
        return []
    return list(SiteLeavePolicy.objects.filter(site=site, is_active=True)
                .select_related("leave_type"))


def _worker_leave_types(user=None):
    """Leave types the worker inherits — ONLY the bound site's configured policy.

    There is deliberately no global fallback: the worker must see exactly the
    leave types their contractor set up for the site (Site Calendar & Leave
    Setup). Empty when nothing is configured, so the UI can prompt them that the
    calendar has not been set up yet."""
    site = _worker_bound_site(user)
    if site is None:
        return []
    return [p.leave_type.name for p in _site_leave_policies(site)]


def _leave_row(request_obj):
    approver_name = ""
    if request_obj.approver:
        cp = getattr(request_obj.approver, "contractor_profile", None)
        approver_name = _d(cp.contractor_name if cp else request_obj.approver.username)
    return {
        "id": str(request_obj.id),
        "type": request_obj.leave_type.name if request_obj.leave_type else "",
        "from": _dts(request_obj.from_date),
        "to": _dts(request_obj.to_date),
        "reason": _d(request_obj.reason),
        "submitted": _dts(request_obj.created_at),
        "status": {"PENDING": "Pending", "APPROVED": "Approved", "REJECTED": "Rejected",
                   "CANCELLED": "Cancelled"}.get(str(request_obj.status).upper(), "Pending"),
        "approver": approver_name,
        "comment": _d(request_obj.comment),
    }


def _worker_leave_records(user):
    rows = (LeaveRequest.objects.filter(worker=user)
            .select_related("leave_type", "approver")[:50])
    return [_leave_row(r) for r in rows]


def _worker_leave_balance(user):
    """Per-type leave ledger for the current financial year (1 Apr – 31 Mar).

    Leave is deducted as soon as it is applied for (PENDING) and released if the
    request is rejected/cancelled, so the balance reflects committed days.
    """
    today = timezone.localdate()
    fy_start_year = today.year if today.month >= 4 else today.year - 1
    fy_start = datetime.date(fy_start_year, 4, 1)
    months_elapsed = (today.year - fy_start.year) * 12 + (today.month - fy_start.month) + 1
    months_elapsed = max(1, min(12, months_elapsed))
    committed = LeaveRequest.objects.filter(worker=user, status__in=("PENDING", "APPROVED"))
    pending_qs = LeaveRequest.objects.filter(worker=user, status="PENDING")
    site = _worker_bound_site(user)
    if site is None:
        return []
    # Only the site's configured leave policies — no global fallback (mirrors
    # _worker_leave_types so balances always line up with the offered types).
    policies = _site_leave_policies(site)
    plan = [(p.leave_type, p.annual_entitlement, p.opening_balance) for p in policies]
    out = []
    for lt, annual, opening in plan:
        def days(qs):
            return sum(r.days or 0 for r in qs
                       if r.leave_type_id == lt.id and r.from_date and r.from_date >= fy_start)
        availed = days(committed)   # pending + approved are both held
        pending = days(pending_qs)
        accrued = round((annual / 12) * months_elapsed)
        out.append({
            "type": lt.name,
            "opening": opening,
            "accrued": accrued,
            "availed": availed,
            "pending": pending,
            "balance": max(0, opening + accrued - availed),
        })
    return out


def _contractor_leave_approvals(user):
    rows = (LeaveRequest.objects.filter(contractor=user)
            .select_related("leave_type", "worker")[:100])
    out = []
    for r in rows:
        wi = _get_identity(r.worker)
        out.append({
            "id": str(r.id),
            "worker": _d(wi.name if wi and wi.name else r.worker.username),
            "bssId": _d(wi.bss_worker_id if wi else ""),
            "type": r.leave_type.name if r.leave_type else "",
            "from": _dts(r.from_date),
            "to": _dts(r.to_date),
            "days": r.days,
            "reason": _d(r.reason),
            "status": {"PENDING": "Pending", "APPROVED": "Approved", "REJECTED": "Rejected",
                       "CANCELLED": "Cancelled"}.get(str(r.status).upper(), "Pending"),
            "requestedOn": _dts(r.created_at),
        })
    return out


def _worker_grievances(user):
    gs = WorkerGrievance.objects.filter(worker=user).order_by("-created_at")
    open_count = gs.exclude(status__in=("RESOLVED", "CLOSED")).count() if gs else 0
    recent_item = {"id": "None", "status": "No open grievances", "date": "—"}
    if gs.exists():
        first = gs.first()
        recent_item = {
            "id": _d(first.ticket_no, f"GRV-{first.id}"),
            "status": _GRIEVANCE_UI_STATUS.get(str(first.status).upper(), "Submitted"),
            "date": _dts(first.created_at.date() if hasattr(first.created_at, "date") else first.created_at),
        }
    return {"openCount": open_count, "recent": recent_item}


_GRIEVANCE_UI_STATUS = {
    "RECORDED": "Submitted", "SUBMITTED": "Submitted", "VIEWED_ON_DASHBOARD": "Open",
    "OPEN": "Open", "IN_PROGRESS": "In Progress", "RESOLVED": "Resolved",
    "REOPENED": "Reopened", "CLOSED": "Closed",
}
_GRIEVANCE_ACTOR = {"worker": "Worker", "contractor": "Contractor", "employer": "Employer", "bss": "BSS"}
_GRIEVANCE_CATEGORY = {"WAGES": "Wages", "SAFETY": "Safety", "HARASSMENT": "Harassment",
                       "ACCOMMODATION": "Accommodation", "BENEFITS": "Benefits", "OTHER": "Other"}


def _grievance_context(g):
    """Contractor / employer / site for a grievance — the snapshot first, else the
    worker's binding (accepted, else most recent) so the audit view survives an
    unbind and legacy rows still resolve."""
    contractor, employer, site = g.contractor, g.employer, None
    binding = (WorkerContractorBinding.objects
               .filter(worker=g.worker, binding_status="ACCEPTED")
               .select_related("contractor", "site", "site__employer").first())
    if binding is None:
        binding = (WorkerContractorBinding.objects
                   .filter(worker=g.worker)
                   .select_related("contractor", "site", "site__employer")
                   .order_by("-created_at").first())
    if binding is not None:
        contractor = contractor or binding.contractor
        employer = employer or (binding.site.employer if binding.site else None)
        site = binding.site
    return contractor, employer, site


def _grievance_row(g):
    """Canonical grievance row shared by the worker / contractor / employer portals."""
    wi = _get_identity(g.worker)
    contractor, employer, site = _grievance_context(g)
    replies = [{
        "id": str(r.id),
        "by": _GRIEVANCE_ACTOR.get((getattr(r.actor, "role", "") or r.actor_role or "").lower(), "Worker"),
        "text": _d(r.body),
        "at": _dts(r.created_at),
        "attachment": bool(r.attachment),
        "attachmentName": (r.attachment.name.split("/")[-1] if r.attachment else (_d(r.attachment_file) or None)),
    } for r in g.responses.order_by("created_at")]
    return {
        "id": str(g.id),
        "ref": _d(g.ticket_no),
        "category": _GRIEVANCE_CATEGORY.get(str(g.category).upper(), "Other"),
        "status": _GRIEVANCE_UI_STATUS.get(str(g.status).upper(), "Submitted"),
        "worker": _d(wi.name if wi and wi.name else g.worker.username),
        "workerId": _d(wi.bss_worker_id if wi else ""),
        "site": site.site_name if site else "",
        "employer": _org_name(employer) if employer else "",
        "contractor": _org_name(contractor) if contractor else "",
        "raisedAt": _dts(g.created_at),
        "updatedAt": _dts(g.updated_at),
        "description": _d(g.body),
        "audioAvailable": bool(g.audio),
        "duration": g.recording_duration_secs or 0,
        "attachmentName": (g.attachment.name.split("/")[-1] if g.attachment else (_d(g.attachment_file) or None)),
        "replyHistory": replies,
        "resolutionConfirmed": bool(g.resolution_confirmed),
        "resolvedAt": _dts(g.resolved_at) if g.resolved_at else "",
        "confirmedAt": _dts(g.confirmed_at) if g.confirmed_at else "",
    }


def _contractor_grievances(user):
    gs = (WorkerGrievance.objects
          .filter(Q(contractor=user) | Q(worker__worker_bindings__contractor=user))
          .distinct().select_related("worker")
          .prefetch_related("responses", "responses__actor")[:60])
    rows = [_grievance_row(g) for g in gs]
    rows.sort(key=lambda r: r["raisedAt"] or "", reverse=True)
    return rows


def _employer_grievances(user):
    gs = (WorkerGrievance.objects
          .filter(Q(employer=user) | Q(worker__worker_bindings__site__employer=user))
          .distinct().select_related("worker")
          .prefetch_related("responses", "responses__actor")[:60])
    rows = [_grievance_row(g) for g in gs]
    rows.sort(key=lambda r: r["raisedAt"] or "", reverse=True)
    return rows


def _worker_geography():
    return dict(GEOGRAPHY)


def build_worker_portal(user):
    identity = _get_identity(user)
    other = WorkerOther.objects.filter(user=user).first()
    return {
        "worker": {
            "identity": _worker_identity_section(identity),
            "employment": _worker_employment_section(user, identity),
            "compliance": _worker_compliance_section(user),
            "gatePasses": _worker_gate_passes(user),
            "complianceRecords": _worker_compliance_records(user),
            "skills": _worker_skills_section(user),
            "socialSecurity": _worker_social_security_section(user),
            "documents": _worker_documents_section(user),
            "rozgarRequests": [],
            "grievances": _worker_grievances(user),
            "contact": _worker_contact_section(user, identity),
            "address": _worker_address_section(user),
            "personal": _worker_personal_section(user, identity),
            "banking": _worker_banking_section(user),
            "preferences": _worker_preferences_section(user),
            "settings": _worker_settings_section(user),
            "welfare": _worker_welfare_section(user),
            "classification": _worker_classification_section(user),
            "family": _worker_family_section(user),
            "other": _worker_other_section(user),
        },
        "govtScope": "central",
        "labourLaw": _worker_labour_law(),
        "wages": _worker_wages_section(user),
        "advances": _worker_advances(user),
        "attendance": _worker_attendance_section(user),
        "providentFund": _worker_financial_records(user, "providentFund"),
        "bonus": _worker_financial_records(user, "bonus"),
        "leaveEncashment": _worker_financial_records(user, "leaveEncashment"),
        "gratuity": _worker_gratuity(user),
        "holidays": _worker_holidays(user),
        "weeklyOffDays": _worker_weekly_off_days(user),
        "announcements": _worker_announcements(),
        "courses": _worker_courses(user),
        "documents": _worker_documents_display(user),
        "jobRequests": _worker_job_requests(user),
        "availableJobs": _worker_available_jobs(user),
        "bindings": _worker_bindings(user),
        "availability": bool(other and other.available_for_work),
        "leaveTypes": _worker_leave_types(user),
        "leaveRecords": _worker_leave_records(user),
        "leaveBalance": _worker_leave_balance(user),
        "leaveEnabled": _worker_bound_site(user) is not None,
        "restrictedHolidays": _worker_restricted_holidays(user),
        "cardProduct": {
            "productId": "BSS-WORKER-CARD",
            "cardFee": 0,
            "deliveryFee": 0,
            "currency": "INR",
            "paymentProviders": ["razorpay", "payu"],
        },
        "geography": _worker_geography(),
    }


# ---------------------------------------------------------------------------
# Contractor portal
# ---------------------------------------------------------------------------
def _contractor_identity(user):
    cp = getattr(user, "contractor_profile", None)
    return {
        "name": _org_name(user),
        "company": _d(cp.trade_name if cp else "") or _org_name(user),
        "bssId": _d(cp.contractor_code if cp else _bss_contractor_code(user.id)),
        "incorpDate": _dts(cp.incorporation_date if cp else None),
        "entity": _d(cp.constitution if cp else ""),
        "verified": bool(cp and cp.is_verified_badge),
        "rating": 0,
        "contact": _d(cp.contact_person if cp else ""),
        "email": _d(cp.email if cp else ""),
        "accountStatus": _d(cp.approval_status if cp else "PENDING"),
    }


def _contractor_stats(user):
    bindings = WorkerContractorBinding.objects.filter(contractor=user)
    sites = Site.objects.filter(bindings__contractor=user).distinct()
    workers = bindings.filter(binding_status="ACCEPTED").count()
    return {
        "totalWorkers": workers,
        "activeSites": sites.count(),
        "complianceScore": 0,
        "pendingAlerts": 0,
    }


def _contractor_principal_employer(user):
    binding = WorkerContractorBinding.objects.filter(contractor=user).first()
    if binding and binding.site and binding.site.employer:
        ep = getattr(binding.site.employer, "employer_profile", None)
        return {
            "name": _org_name(binding.site.employer),
            "code": _d(ep.employer_code if ep else ""),
            "industry": _d(ep.industry if ep else ""),
            "email": _d(ep.email if ep else ""),
            "lin": _d(ep.lin if ep else ""),
        }
    return {"name": "", "code": "", "industry": "", "email": "", "lin": ""}


def _org_name(user_obj):
    """Best display name for an organisation/worker account — never blank.

    Falls back trade_name -> legal name -> worker name -> username so site rows,
    binding rows and employment cards never render an empty party name."""
    if user_obj is None:
        return ""
    cp = getattr(user_obj, "contractor_profile", None)
    if cp:
        name = _d(cp.contractor_name) or _d(cp.trade_name)
        if name:
            return name
    ep = getattr(user_obj, "employer_profile", None)
    if ep:
        name = _d(ep.employer_name) or _d(ep.trade_name)
        if name:
            return name
    wi = getattr(user_obj, "worker_identity", None)
    if wi and _d(wi.name):
        return _d(wi.name)
    return _d(getattr(user_obj, "username", ""))


def _default_site_info(profile):
    """The role's pre-selected default site, or None."""
    site = getattr(profile, "default_site", None) if profile else None
    if site is None:
        return None
    return {"id": str(site.id), "name": _d(site.site_name), "code": _d(site.site_code)}


def _site_compliance_pct(user, site):
    """Real per-site compliance: latest persisted audit report score for the
    site (Final Submit), else the verification share of evidence submissions.
    None when the site has no compliance data at all."""
    rep = ComplianceReport.objects.filter(
        employer=user, site_name=site.site_name).order_by("-report_date").first()
    if rep and rep.score_pct is not None:
        return int(round(float(rep.score_pct)))
    ev = SubmissionEvidence.objects.filter(user=user, site=site.site_name)
    total = ev.count()
    if total:
        return int(round(100 * ev.filter(status="VERIFIED").count() / total))
    return None


def _contractor_sites(user):
    """Sites allotted to the contractor by an employer (APPROVED on an ACCEPTED
    contractor↔employer binding). A contractor never owns a site — these are the
    employer's sites that were allotted to them."""
    site_ids = set(ContractorSiteAllotment.objects.filter(
        binding__contractor=user, binding__binding_status="ACCEPTED", status="APPROVED"
    ).values_list("site_id", flat=True))
    sites = Site.objects.filter(id__in=site_ids)
    rows = []
    for s in sites:
        emp_name = _org_name(s.employer)
        rows.append({
            "id": str(s.id), "code": _d(s.site_code), "name": _d(s.site_name),
            "bssId": _d(s.bss_site_id),
            "employer": emp_name, "location": _d(s.location) or _d(s.city),
            "state": _d(s.state),
            "status": _d(s.site_status) or ("Active" if s.attendance_enabled else "Planned"),
            "workers": WorkerContractorBinding.objects.filter(
                contractor=user, site=s, binding_status="ACCEPTED").count(),
            "compliance": _site_compliance_pct(user, s),
            "data": _site_scalar_data(s),
        })
    return rows


def _contractor_pending_sites(user):
    """Sites proposed to the contractor but not yet approved (PENDING allotment
    on an ACCEPTED contractor<->employer binding). Surfaced so the contractor can
    see a site request is waiting for their approval instead of a bare empty list."""
    rows = []
    qs = (ContractorSiteAllotment.objects
          .filter(binding__contractor=user, binding__binding_status="ACCEPTED",
                  status="PENDING")
          .select_related("site"))
    for a in qs:
        s = a.site
        if s is None:
            continue
        rows.append({
            "id": str(s.id), "code": _d(s.site_code), "name": _d(s.site_name),
            "bssId": _d(s.bss_site_id),
            "employer": _org_name(s.employer),
            "location": _d(s.location) or _d(s.city),
            "state": _d(s.state),
            "source": _d(a.source),
        })
    return rows


_WORKER_BINDING_STATUS = {"PENDING": "Pending", "ACCEPTED": "Accepted",
                          "REJECTED": "Rejected", "CANCELLED": "Cancelled",
                          "EXPIRED": "Expired"}


def _contractor_workers(user):
    bindings = WorkerContractorBinding.objects.filter(contractor=user).order_by("-created_at")
    rows = []
    for b in bindings:
        wi = WorkerIdentity.objects.filter(user=b.worker).first()
        emp = None
        site = None
        if b.site:
            site = b.site
            emp = getattr(b.site.employer, "employer_profile", None)
        rows.append({
            "id": b.worker_id,
            "name": _d(wi.name if wi else b.worker.username),
            "bssId": _d(wi.bss_worker_id if wi else ""),
            "mobile": _d(wi.mobile_number if wi else ""),
            "site": site.site_name if site else "",
            "employer": _org_name(b.site.employer) if b.site else "",
            "designation": _d(b.designation),
            "doj": _dts(b.accepted_at.date()) if b.accepted_at else None,
            "compliance": 0,
            # Mirror the binding status shown on the Binding Requests page / DB.
            "status": _WORKER_BINDING_STATUS.get(str(b.binding_status).upper(),
                                                 _d(b.binding_status)),
            "refCode": _d(wi.bss_worker_id if wi else ""),
            "department": _d(b.department),
            "gender": _d(wi.gender if wi else ""),
            "category": "",
            "skills": "",
            "photoUrl": _d(wi.photo if wi else ""),
            "eligibility": _gate_pass_eligibility(b.worker),
            "aadhaar": _d(wi.aadhaar if wi else ""),
            "dob": _dts(wi.date_of_birth) if wi and wi.date_of_birth else "",
            "fatherName": _d(wi.father_name if wi else ""),
            "bloodGroup": _d(wi.blood_group if wi else ""),
        })
    return rows


def _compliance_status(c):
    """Register status derived from the expiry date (Active / Expiring / Expired)."""
    if not c.due_date:
        return "Active"
    days = (c.due_date - timezone.localdate()).days
    if days < 0:
        return "Expired"
    if days <= 30:
        return "Expiring"
    return "Active"


def _compliance_doc_row(c):
    """Canonical statutory-compliance row (shared by the contractor/employer views)."""
    return {
        "id": str(c.id),
        "item": _d(c.master.act if c.master else ""),
        "category": _d(c.master.nature if c.master else ""),
        "reference": _d(c.unique_no),
        "employer": _d(c.client_name) or (_org_name(c.employer) if c.employer else ""),
        "site": c.site.site_name if c.site else "",
        "worker": _party_name(c.worker) if c.worker else None,
        "issue": _dts(c.issue_date) if c.issue_date else (_dts(c.created_at.date()) if c.created_at else ""),
        "expiry": _dts(c.due_date) if c.due_date else "",
        "verification": _d(c.verification) or "Pending",
        "status": _compliance_status(c),
    }


def _contractor_compliances(user):
    """The contractor's statutory compliance register (its own ComplianceDocument
    rows — created from the Compliance & Welfare / compliance form)."""
    rows = []
    qs = user.compliance_docs.select_related("master", "site", "employer").order_by("-created_at")[:60] if hasattr(user, "compliance_docs") else []
    for c in qs:
        rows.append(_compliance_doc_row(c))
    return rows


_GP_TYPE_LABEL = {"TGP": "Temporary", "PGP": "Permanent"}
_GP_STATUS_LABEL = {"ACTIVE": "Approved", "PENDING": "Pending", "REJECTED": "Rejected",
                    "EXPIRED": "Expired", "REVOKED": "Rejected"}


def _gate_pass_eligibility(worker):
    """Real eligibility for a site gate pass, from the worker's own records.

    Medical / Health & Safety / Compliance (Excel: Contractor > Gate Pass >
    Gate Pass Register eligibility columns).
    """
    ws = WorkerWelfareSafety.objects.filter(user=worker).first()
    banking = WorkerBanking.objects.filter(user=worker).first()
    social = WorkerSocialSecurity.objects.filter(user=worker).first()
    identity = _get_identity(worker)

    def yes(value):
        return str(value or "").strip().lower() in ("done", "yes", "completed", "fit", "verified", "true")

    medical = bool(ws and (yes(ws.medical_examination_status) or yes(ws.medical_fitness_status)))
    safety_kit = bool(ws and (ws.ppe_required or (ws.types_of_ppe_given or "").strip()))
    safety_training = bool(ws and ws.safety_training_completed)
    site_induction = bool(ws and yes(ws.site_induction_status))
    health_safety = safety_kit or safety_training or site_induction
    aadhaar = bool(identity and (identity.aadhaar or "").strip())
    bank = bool(banking and (banking.bank_account_number or "").strip())
    uan = bool(social and (social.epfo_uan or "").strip())
    esi = bool(social and (social.esic_ip_number or "").strip())
    compliance = aadhaar and bank and uan and esi

    done = "Done"
    pending = "Pending"
    return {
        "medical": done if medical else pending,
        "healthSafety": done if health_safety else pending,
        "compliance": done if compliance else pending,
        "safetyKit": done if safety_kit else pending,
        "safetyTraining": done if safety_training else pending,
        "siteInduction": done if site_induction else pending,
        "aadhaar": done if aadhaar else pending,
        "bank": done if bank else pending,
        "uan": done if uan else pending,
        "esi": done if esi else pending,
    }


def _gate_pass_worker_meta(worker):
    identity = _get_identity(worker)
    skills = WorkerSkillsEmployability.objects.filter(user=worker).first()
    return {
        "workerName": _d(identity.name if identity and identity.name else worker.username),
        "workerId": _d(identity.bss_worker_id if identity else ""),
        "contact": _d(identity.mobile_number if identity else ""),
        "skill": _d(skills.primary_skill if skills else ""),
    }


def _party_name(user):
    """Display name of a contractor / employer / worker party."""
    if user is None:
        return ""
    if user.role == "contractor":
        cp = getattr(user, "contractor_profile", None)
        return _d(cp.contractor_name if cp and cp.contractor_name else user.username)
    if user.role == "employer":
        ep = getattr(user, "employer_profile", None)
        return _d(ep.employer_name if ep and ep.employer_name else user.username)
    return user.username


def _contractor_gate_pass_row(g):
    meta = _gate_pass_worker_meta(g.worker)
    site = g.site
    employer_name = ""
    if site and site.employer:
        ep = getattr(site.employer, "employer_profile", None)
        employer_name = _d(ep.employer_name if ep else site.employer.username)
    blocked = _is_gate_pass_blocked(g.worker, site.employer if site else None)
    return {
        "id": g.id, **meta,
        "number": _d(g.gate_pass_no),
        "employer": employer_name,
        "type": _GP_TYPE_LABEL.get(_d(g.gate_pass_type), _d(g.gate_pass_type)),
        "site": site.site_name if site else "",
        "validFrom": _dts(g.start_date), "validTo": _dts(g.end_date),
        "requestedAt": _dts(g.created_at),
        # Ownership: contractor requests, employer approves (Excel Contractor 67-70).
        "requestedBy": _party_name(g.issued_by),
        "approvedBy": _party_name(g.approved_by),
        "approvedAt": _dts(g.approved_at),
        "status": "Blocked" if blocked else _GP_STATUS_LABEL.get(_d(g.status), _d(g.status)),
        "blocked": blocked,
        "eligibility": _gate_pass_eligibility(g.worker),
    }


def _contractor_gate_passes(user):
    """Explicit requests keep their status; every other bound worker also shows
    an auto-generated pass (from their BSS ID card) so the contractor sees site
    access for all of their workers, not just the ones they requested."""
    rows = [_contractor_gate_pass_row(g) for g in WorkerGatePass.objects.filter(
        issued_by=user).select_related("worker", "site").order_by("-created_at")[:100]]
    seen = {(row["workerId"], row["type"]) for row in rows}
    bindings = (WorkerContractorBinding.objects
                .filter(contractor=user, binding_status="ACCEPTED")
                .select_related("worker", "site", "site__employer"))
    for b in bindings:
        meta = _gate_pass_worker_meta(b.worker)
        gp_type = _auto_gate_pass_type(b.worker)
        label = _GP_TYPE_LABEL.get(gp_type, gp_type)
        if (meta["workerId"], label) in seen:
            continue
        issue_date, valid_till = _auto_gate_pass_dates(b.worker, gp_type)
        site = b.site
        ep = getattr(site.employer, "employer_profile", None) if (site and site.employer) else None
        blocked = _is_gate_pass_blocked(b.worker, b.site.employer if b.site else None)
        rows.append({
            "id": f"auto-{b.id}",
            "auto": True,
            "number": _auto_gate_pass_no(b.worker, gp_type),
            **meta,
            "employer": _d(ep.employer_name if ep else (site.employer.username if site and site.employer else "")),
            "type": label,
            "site": site.site_name if site else "",
            "validFrom": _dts(issue_date), "validTo": _dts(valid_till),
            "requestedAt": _dts(b.created_at),
            "requestedBy": "", "approvedBy": "", "approvedAt": "",
            "status": "Blocked" if blocked else "Approved",
            "blocked": blocked,
            "eligibility": _gate_pass_eligibility(b.worker),
        })
    return rows[:200]


def _contractor_applications(user):
    from api import matching

    rows = []
    reqs = user.rozgar_requests.all()[:20] if hasattr(user, "rozgar_requests") else []
    # RozgarRequest.status is stored uppercase; the contractor UI (shortlist /
    # hire & bind / reject buttons) matches on the display labels below.
    status_map = {"PENDING": "Pending", "SHORTLISTED": "Shortlisted", "ACCEPTED": "Hired",
                  "REJECTED": "Rejected", "CANCELLED": "Cancelled", "EXPIRED": "Expired"}
    for r in reqs:
        job = getattr(r, "job", None)
        wi = WorkerIdentity.objects.filter(user=r.worker).first()
        profile = matching.worker_profile(r.worker)
        location = ", ".join(part for part in (profile.get("city"), profile.get("state")) if part)
        rows.append({
            "id": str(r.id),
            "workerName": _d(wi.name if wi else r.worker.username),
            "workerId": _d(wi.bss_worker_id if wi else ""),
            "employer": "",
            "trade": _d(profile.get("trade") or (job.job_title if job else "")),
            "experience": (f"{profile['years']:g} yrs" if profile.get("years") else ""),
            "expectedWage": _num(job.wage_offered if job else 0),
            "location": _d(location),
            "status": status_map.get(str(r.status).upper(), "Pending"),
            "dateApplied": _dts(r.requested_at),
            "matchScore": matching.score(r.worker, job, profile=profile),
        })
    return rows


def _contractor_available_workers(user):
    """Workers who turned on 'Available for work' (Rozgar Setu) — surfaced to the
    contractor for sourcing. Excludes workers already bound to this contractor."""
    from bss_core.models import WorkerOther

    bound_ids = set(WorkerContractorBinding.objects.filter(
        contractor=user, binding_status__in=("PENDING", "ACCEPTED")
    ).values_list("worker_id", flat=True))
    rows = []
    for other in (WorkerOther.objects.filter(available_for_work=True)
                  .select_related("user").order_by("-updated_at")[:50]):
        w = other.user
        if w is None or w.id in bound_ids:
            continue
        wi = WorkerIdentity.objects.filter(user=w).first()
        addr = getattr(w, "worker_address", None)
        state = str(getattr(addr, "current_state", "") or getattr(addr, "permanent_state", "") or "")
        skills = []
        if hasattr(w, "worker_skills"):
            skills = [str(getattr(s, "name", "") or "") for s in w.worker_skills.all()[:4]]
        rows.append({
            "id": w.id,
            "workerName": _d(wi.name if wi else w.username),
            "workerId": _d(wi.bss_worker_id if wi else _bss_worker_code(w.id)),
            "trade": next((s for s in skills if s), ""),
            "skills": [s for s in skills if s],
            "experience": "",
            "expectedWage": 0,
            "location": state,
            "status": "Available",
            "dateApplied": _dts(other.updated_at),
            "matchScore": 0,
        })
    return rows


def _contractor_employers(user):
    """Principal employers the contractor is actually bound to (ACCEPTED
    contractor↔employer bindings) and the sites those employers allotted
    (APPROVED allotments). Derived only from live relationships — a contractor
    has no employer relationship without an accepted binding."""
    employers = {}
    for eng in ContractorEmployerBinding.objects.filter(contractor=user, binding_status="ACCEPTED"):
        e = eng.employer
        ep = getattr(e, "employer_profile", None)
        employers[e.id] = {
            "id": e.id,
            "name": _org_name(e),
            "employerId": _d(ep.employer_code if ep else _bss_employer_code(e.id)),
            "sites": [],
            "status": "ACTIVE",
            "boundSince": _dts(eng.accepted_at) if eng.accepted_at else None,
        }
    rows = []
    for k, v in employers.items():
        allotted = set(ContractorSiteAllotment.objects.filter(
            binding__contractor=user, binding__employer_id=k,
            binding__binding_status="ACCEPTED", status="APPROVED"
        ).values_list("site_id", flat=True))
        site_rows = [s for s in Site.objects.filter(employer_id=k, id__in=allotted)]
        # Human-readable site names (the UI previously showed raw site IDs) plus
        # the full detail rows so the contractor can see exactly what is allotted.
        v["sites"] = [_d(s.site_name) for s in site_rows]
        v["siteDetails"] = [{
            "id": str(s.id), "name": _d(s.site_name), "code": _d(s.site_code),
            "location": _d(s.location) or _d(s.city), "state": _d(s.state),
        } for s in site_rows]
        rows.append(v)
    return rows


def _contractor_submissions(user):
    rows = []
    status_map = {"PENDING": "Pending review", "VERIFIED": "Verified", "RETURNED": "Rejected", "REJECTED": "Rejected"}
    for ev in SubmissionEvidence.objects.filter(user=user)[:20]:
        days_left = None
        if ev.due_date:
            days_left = (ev.due_date - timezone.localdate()).days
        rows.append({
            "id": str(ev.id), "uniqueNo": _d(ev.unique_no),
            "type": _d(ev.doc_type),
            "employer": _d(ev.employer), "site": _d(ev.site),
            "state": _d(ev.state), "financialYear": _d(ev.financial_year),
            "month": _d(ev.month), "location": _d(ev.location),
            "period": _d(ev.period), "status": status_map.get(ev.status, _d(ev.status)),
            "submittedAt": _dts(ev.created_at), "updatedAt": _dts(ev.updated_at),
            "daysLeft": days_left, "mandatory": bool(ev.is_mandatory),
            "frequency": _d(ev.frequency), "documentType": _d(ev.document_type),
            "accuracy": _num(ev.ocr_accuracy),
            "findings": list(ev.validation_findings or []),
            "source": "evidence",
            "fileName": _d(ev.original_name), "checksum": _d(ev.checksum_sha256),
        })
    for c in user.compliance_docs.all()[:20] if hasattr(user, "compliance_docs") else []:
        rows.append({
            "id": f"doc-{c.id}", "uniqueNo": _d(c.unique_no),
            "type": _d(c.master.act if c.master else ""),
            "employer": "", "site": c.site.site_name if c.site else "",
            "state": _d(c.state), "financialYear": _d(c.financial_year),
            "month": "", "location": "", "period": _d(c.period), "status": _d(c.status),
            "submittedAt": _dts(c.updated_at), "updatedAt": _dts(c.updated_at),
            "daysLeft": c.days_left, "mandatory": bool(c.is_mandatory),
            "frequency": _d(c.frequency), "documentType": "",
            "accuracy": _num(c.ocr_accuracy), "findings": [],
            "source": "register",
            "fileName": "", "checksum": "",
        })
    return {"documents": rows}


def _submission_document_master():
    """Admin Document Master — the statutory documents/registers a contractor can
    submit, driving the dynamic client-mapped document list in the wizard."""
    from bss_core.models import RegisterDocumentMaster
    rows = []
    qs = (RegisterDocumentMaster.objects.filter(is_active=True)
          .order_by("sort_order", "document_name"))
    for d in qs:
        rows.append({
            "name": _d(d.document_name),
            "code": _d(d.code),
            "type": {"register": "Register", "document": "Document"}.get(d.kind, _d(d.kind)),
            "formNo": _d(d.form_number),
            "act": _d(d.act),
            "frequency": _d(d.frequency),
            "mandatory": bool(d.is_mandatory),
            "format": "PDF",
            "criticality": _d(d.criticality),
        })
    return rows


def _benefit_row(r):
    wi = _get_identity(r.worker)
    return {
        "id": r.id,
        "worker": _d(wi.name if wi and wi.name else r.worker.username),
        "workerId": _d(wi.bss_worker_id if wi else ""),
        "employer": "",
        "period": _d(r.period),
        "amount": _num(r.amount),
        "days": _num(r.days) if r.days is not None else None,
        "reason": _d(r.reason),
        "paidOn": _dts(r.paid_on) if r.paid_on else "",
        "status": {"RECORDED": "Recorded", "CREDITED": "Credited",
                   "PROCESSING": "Processing", "PAID": "Paid"}.get(r.status, r.status),
        "source": "contractor",
    }


def _contractor_worker_benefits(user):
    """Bonus / Leave Encashment records this contractor uploaded for its workers."""
    def rows(kind):
        return [_benefit_row(r) for r in
                WorkerBenefitRecord.objects.filter(contractor=user, kind=kind)
                .select_related("worker")[:200]]
    return {"bonus": rows("BONUS"), "leaveEncashment": rows("LEAVE_ENCASHMENT")}


def _contractor_salaries(user):
    return []


def _contractor_licenses(user):
    """Statutory registrations & licences of an entity. A licence counts as
    Active when its verification is acknowledged and today is before expiry."""
    from datetime import date as _date
    rows = []
    for st in user.statutory_registrations.all() if hasattr(user, "statutory_registrations") else []:
        ver = str(st.verification_status or "").upper()
        if ver in ("ACTIVE", "VERIFIED", "APPROVED", "VALIDATED"):
            if st.expiry_at and st.expiry_at < _date.today():
                status = "Expired"
            else:
                status = "Active"
        else:
            status = "Pending"
        rows.append({
            "id": str(st.id), "kind": _d(st.reg_kind),
            "name": _d(st.get_reg_kind_display() or st.reg_kind),
            "authority": _d(st.authority), "number": _d(st.reg_number),
            "state": "", "validFrom": _dts(st.issued_at), "validTo": _dts(st.expiry_at),
            "status": status,
        })
    return rows


def _contractor_worker_documents(user):
    """Per-worker document register for workers bound to this contractor: the
    full catalog merged with each worker's uploads, so compliance documents show
    Missing rows the same way the worker's own Documents page does."""
    from bss_core.models import WorkerDocument
    bindings = [b for b in (
        WorkerContractorBinding.objects.filter(
            contractor=user, binding_status="ACCEPTED").select_related("site", "worker"))
        if b.worker]
    _DL_STATUS = {"UPLOADED": "Pending", "VERIFIED": "Verified", "REJECTED": "Rejected",
                  "MISSING": "Missing", "UNDER_VERIFICATION": "Pending",
                  "EXPIRED": "Expiring", "ISSUED": "Issued"}
    rows = []
    for b in bindings:
        wi = _get_identity(b.worker)
        worker_id = _d(wi.bss_worker_id if wi else "")
        site = b.site.site_name if b.site else ""
        for r in _worker_documents_display(b.worker):
            rows.append({
                "id": str(r["id"]) if r["id"] else None,
                "worker": _d(wi.name if wi and wi.name else b.worker.username),
                "workerId": worker_id,
                "site": site,
                "document": r["name"],
                "reference": r["code"],
                "mandatory": bool(r["mandatory"]),
                "status": _DL_STATUS.get(str(r["status"]).upper(), "Pending"),
                "verified": str(r["status"]).upper() in ("VERIFIED", "APPROVED", "VALIDATED"),
                "expiry": r["expiry"],
            })
    return rows


def _contractor_compliance_row(binding):
    """One bound worker's compliance / welfare record (contractor management)."""
    worker = binding.worker
    wi = _get_identity(worker)
    ws = WorkerWelfareSafety.objects.filter(user=worker).first()
    elig = _gate_pass_eligibility(worker)
    gp = WorkerGatePass.objects.filter(worker=worker).order_by("-created_at").first()
    gp_status = {"ACTIVE": "Active", "PENDING": "Pending", "REJECTED": "Expired",
                 "EXPIRED": "Expired", "REVOKED": "Expired"}.get(gp.status, "Pending") if gp else "Pending"
    return {
        "worker": _d(wi.name if wi and wi.name else worker.username),
        "workerId": _d(wi.bss_worker_id if wi else ""),
        "site": binding.site.site_name if binding.site else "",
        "gatePass": gp_status,
        "medical": elig["medical"],
        "healthSafety": elig["healthSafety"],
        "details": {
            "medicalExaminationStatus": _d(ws.medical_examination_status) if ws else "",
            "medicalFitnessStatus": _d(ws.medical_fitness_status) if ws else "",
            "lastMedicalExamination": _dts(ws.last_medical_examination) if ws and ws.last_medical_examination else "",
            "nextMedicalDue": _dts(ws.next_medical_due) if ws and ws.next_medical_due else "",
            "ppeRequired": bool(ws and ws.ppe_required),
            "typesOfPpeGiven": _d(ws.types_of_ppe_given) if ws else "",
            "safetyTrainingCompleted": bool(ws and ws.safety_training_completed),
            "siteInductionStatus": _d(ws.site_induction_status) if ws else "",
            "insuranceStatus": _d(ws.insurance_status) if ws else "",
            "accommodationProvided": _d(ws.accomodation_provided) if ws else "",
            "policeVerification": _d(ws.police_verification) if ws else "",
            "trainingDate": _dts(ws.training_date) if ws and ws.training_date else "",
            "trainerName": _d(ws.trainer_name) if ws else "",
        },
    }


def _contractor_worker_compliance(user):
    bindings = (WorkerContractorBinding.objects
                .filter(contractor=user, binding_status="ACCEPTED")
                .select_related("worker", "site"))
    return [_contractor_compliance_row(b) for b in bindings]


def _contractor_workforce_growth(user=None):
    """Compute monthly active bound worker count from real WorkerContractorBinding database records."""
    now = timezone.localdate()
    six = []
    for i in range(6):
        month_start = (now.replace(day=1) - datetime.timedelta(days=30 * (5 - i))).replace(day=1)
        next_month = (month_start + datetime.timedelta(days=32)).replace(day=1)
        count = 0
        if user:
            count = WorkerContractorBinding.objects.filter(
                contractor=user,
                binding_status__in=("ACCEPTED", "CANCELLED"),
                created_at__lt=next_month
            ).filter(
                Q(unbound_at__isnull=True) | Q(unbound_at__gte=month_start)
            ).count()
        six.append({
            "month": month_start.strftime("%b %Y"),
            "workers": count
        })

    one = []
    for i in range(12):
        month_start = (now.replace(day=1) - datetime.timedelta(days=30 * (11 - i))).replace(day=1)
        next_month = (month_start + datetime.timedelta(days=32)).replace(day=1)
        count = 0
        if user:
            count = WorkerContractorBinding.objects.filter(
                contractor=user,
                binding_status__in=("ACCEPTED", "CANCELLED"),
                created_at__lt=next_month
            ).filter(
                Q(unbound_at__isnull=True) | Q(unbound_at__gte=month_start)
            ).count()
        one.append({
            "month": month_start.strftime("%b %Y"),
            "workers": count
        })

    return {"sixMonths": six, "oneYear": one}


def _contractor_applicability(user=None):
    """Dynamic Labour Law Applicability based on contractor profile registration numbers,
    licences, and active worker thresholds."""
    cp = getattr(user, "contractor_profile", None) if user else None
    
    # Check if contractor has active workers bound
    worker_count = 0
    if user:
        worker_count = WorkerContractorBinding.objects.filter(
            contractor=user, binding_status="ACCEPTED"
        ).count()

    has_clra = bool(cp and (cp.clra_licence_no or "").strip()) or \
        bool(cp and (cp.lin or "").strip().lower().startswith("mh/clra")) or \
        worker_count >= 20
    has_pf = bool(cp and (cp.registration_number or "").strip()) or worker_count >= 20
    has_esic = bool(cp and (cp.labour_dept_reg_no or cp.udyam_no or "").strip()) or worker_count >= 10
    has_bocw = bool(cp and (cp.bocw_reg_no or "").strip())

    return [
        {
            "act": "Minimum Wages Act, 1948",
            "applies": True,
            "note": "Mandatory for all scheduled employment & active sites"
        },
        {
            "act": "Payment of Wages Act, 1936",
            "applies": True,
            "note": "Mandatory wage disbursement rules"
        },
        {
            "act": "Employees' Provident Funds (EPF) Act",
            "applies": has_pf,
            "note": f"EPFO Code registered" if cp and cp.registration_number else ("Threshold (20+ workers) applied" if worker_count >= 20 else "Optional (<20 workers)")
        },
        {
            "act": "ESIC Act, 1948",
            "applies": has_esic,
            "note": "ESIC IP registered" if has_esic else "Threshold (10+ workers) applied"
        },
        {
            "act": "Contract Labour (CLRA) Act, 1970",
            "applies": has_clra,
            "note": f"Licence No: {cp.clra_licence_no}" if cp and (cp.clra_licence_no or "").strip() else (f"LIN: {cp.lin}" if cp and (cp.lin or "").strip().lower().startswith("mh/clra") else ("Threshold (20+ contract workers)" if worker_count >= 20 else "Exempt (<20 workers)"))
        },
        {
            "act": "BOCW Act, 1996",
            "applies": has_bocw,
            "note": f"Reg No: {cp.bocw_reg_no}" if has_bocw else "Building & Construction Labour rules"
        }
    ]


def _contractor_compliance_history(user):
    """PF/ESIC submission history derived from real SubmissionEvidence records —
    one row per period + site, with the PF and ESIC challan status per column."""
    groups = {}
    status_map = {"PENDING": "Pending", "VERIFIED": "Filed", "RETURNED": "Returned"}
    for ev in SubmissionEvidence.objects.filter(user=user).order_by("-created_at")[:60]:
        low = f"{_d(ev.doc_type)} {_d(ev.document_type)}".lower()
        if "esic" not in low and "pf" not in low and "provident" not in low:
            continue
        key = (_d(ev.financial_year), _d(ev.month), _d(ev.site))
        g = groups.setdefault(key, {
            "id": f"ch-{abs(hash(key))}",
            "period": _d(ev.period) or f"{_d(ev.month)} {_d(ev.financial_year)}".strip(),
            "site": _d(ev.site), "pf": "", "esic": "", "amount": None, "status": "Pending",
        })
        label = status_map.get(ev.status, "Pending")
        if "esic" in low:
            g["esic"] = label
        else:
            g["pf"] = label
    rows = []
    for g in groups.values():
        bits = {v for v in (g["pf"], g["esic"]) if v}
        if bits:
            g["status"] = "Returned" if "Returned" in bits else ("Compliant" if bits <= {"Filed"} else "Pending")
            rows.append(g)
    return sorted(rows, key=lambda r: (r["period"], r["site"]), reverse=True)[:10]


def _contractor_job_history(user):
    rows = []
    for j in user.jobs.all()[:50] if hasattr(user, "jobs") else []:
        site = j.site
        applications = j.requests.count() if hasattr(j, "requests") else 0
        hires = j.requests.filter(status="ACCEPTED").count() if hasattr(j, "requests") else 0
        rows.append({
            "id": j.id, "title": _d(j.job_title),
            "trade": _d(j.trade), "category": _d(j.category),
            "workplaceType": _d(j.workplace_type, "On-site"),
            "state": _d(j.state or (site.state if site else "")),
            "city": _d(j.city or (site.city if site else "")),
            "site": site.site_name if site else "",
            "description": _d(j.job_description), "skills": j.skills or [],
            "experience": _d(j.experience),
            "minSalary": _num(j.min_salary), "maxSalary": _num(j.max_salary),
            "salaryVisibility": _d(j.salary_visibility, "Visible to all"),
            "vacancies": j.vacancies or 1,
            "monthlyWage": _num(j.wage_offered),
            "closingDate": _dts(j.validity_until), "duration": _d(j.duration),
            "visibility": _d(j.visibility, "Public"),
            "status": {"DRAFT": "Draft", "SUBMITTED": "Open", "APPROVED": "Open",
                       "CLOSED": "Closed"}.get(str(j.status).upper(), "Open"),
            "postedOn": _dts(j.created_at),
            "applications": applications, "hires": hires,
        })
    return rows


def _contractor_binding_requests(user):
    rows = []
    for b in WorkerContractorBinding.objects.filter(contractor=user):
        wi = WorkerIdentity.objects.filter(user=b.worker).first()
        ep = getattr(b.site.employer, "employer_profile", None) if b.site and b.site.employer else None
        rows.append({
            "id": b.id, "type": "Worker",
            "entityName": _d(wi.name if wi else b.worker.username),
            "bssId": _d(wi.bss_worker_id if wi else ""),
            "site": b.site.site_name if b.site else "",
            "employer": _d(ep.employer_name if ep else ""),
            "designation": _d(b.designation),
            "wage": float(b.offered_wage) if b.offered_wage else 0,
            "requestedOn": _dts(b.created_at),
            "status": {"PENDING": "Pending", "ACCEPTED": "Accepted", "REJECTED": "Rejected",
                       "CANCELLED": "Cancelled", "EXPIRED": "Expired"}.get(
                           str(b.binding_status).upper(), "Pending"),
            "initiatedBy": _wc_initiator_acceptor(b)[0],
            "acceptedBy": _wc_initiator_acceptor(b)[1],
            "consentWorker": bool(b.consent_worker),
            "consentContractor": bool(b.consent_contractor),
            "unbindRequested": bool(b.unbind_requested_at),
            "unbindConsentWorker": bool(b.unbind_consent_worker),
            "unbindConsentContractor": bool(b.unbind_consent_contractor),
            "history": _wc_history(b),
        })
    # Contractor <-> employer bindings (scanning an employer/site QR). Every
    # request is surfaced — rows are never replaced or hidden; a fresh request
    # after a decline is an additional row, not an overwrite.
    for e in ContractorEmployerBinding.objects.filter(contractor=user).order_by("-created_at"):
        ep = getattr(e.employer, "employer_profile", None)
        approved_sites = [a.site.site_name for a in e.allotments.all()
                          if a.site and a.status == "APPROVED"]
        pending_sites = [f"{a.site.site_name} (pending)" for a in e.allotments.all()
                         if a.site and a.status == "PENDING"]
        sites = approved_sites + pending_sites
        rows.append({
            "id": f"ce-{e.id}", "bindingId": e.id, "type": "Employer",
            "entityName": _org_name(e.employer),
            "bssId": _d(ep.employer_code if ep else "", _bss_employer_code(e.employer_id)),
            "site": ", ".join(sites) if sites else "Sites to be allotted",
            "allotments": [{
                "siteId": a.site_id,
                "site": a.site.site_name if a.site else "",
                "siteCode": a.site.site_code if a.site else "",
                "status": {"PENDING": "Pending", "APPROVED": "Approved",
                           "REJECTED": "Rejected", "RELEASED": "Released"}.get(str(a.status).upper(), "Pending"),
                "source": _d(a.source),
                "releaseRequested": bool(a.release_requested_at),
                "releaseRequestedBy": _d(a.release_requested_by),
            } for a in e.allotments.all()],
            "employer": _org_name(e.employer),
            "designation": "Principal employer binding",
            "wage": 0,
            "requestedOn": _dts(e.created_at),
            "status": {"PENDING": "Pending", "ACCEPTED": "Accepted", "REJECTED": "Rejected",
                       "CANCELLED": "Cancelled"}.get(str(e.binding_status).upper(), "Pending"),
            "initiatedBy": _ce_initiator_acceptor(e)[0],
            "acceptedBy": _ce_initiator_acceptor(e)[1],
            # The contractor's own consent is consentContractor; the employer's
            # consent occupies the "worker" slot so the shared row shape works.
            "consentWorker": bool(e.consent_employer),
            "consentContractor": bool(e.consent_contractor),
            "unbindRequested": bool(e.unbind_requested_at),
            "unbindConsentWorker": bool(e.unbind_consent_employer),
            "unbindConsentContractor": bool(e.unbind_consent_contractor),
            "history": _ce_history(e),
        })
    rows.sort(key=lambda row: str(row.get("requestedOn") or ""), reverse=True)
    return rows


def _contractor_recent_activities(user):
    """Recent activities derived from real records — gate passes for bound
    workers, binding requests, job postings and compliance submissions,
    newest first (max 5)."""
    from bss_core.models import (
        WorkerGatePass, WorkerContractorBinding, ContractorJob, SubmissionEvidence
    )
    bound_worker_ids = list(WorkerContractorBinding.objects.filter(
        contractor=user, binding_status="ACCEPTED").values_list("worker_id", flat=True))
    activities = []

    for gp in WorkerGatePass.objects.filter(worker_id__in=bound_worker_ids).order_by("-created_at")[:3]:
        wi = WorkerIdentity.objects.filter(user=gp.worker).first()
        name = _d(wi.name if wi and wi.name else gp.worker.username)
        activities.append({
            "title": (f"Gate Pass {_d(gp.gate_pass_no)} issued for {name}"),
            "raw_time": gp.created_at,
            "type": "gate_pass"
        })

    for b in WorkerContractorBinding.objects.filter(contractor=user).order_by("-created_at")[:3]:
        wi = WorkerIdentity.objects.filter(user=b.worker).first()
        name = _d(wi.name if wi and wi.name else b.worker.username)
        status = _WORKER_BINDING_STATUS.get(str(b.binding_status).upper(), _d(b.binding_status))
        activities.append({
            "title": f"Worker {name} · binding {status}",
            "raw_time": b.created_at,
            "type": "binding"
        })

    for j in ContractorJob.objects.filter(contractor=user).order_by("-created_at")[:3]:
        activities.append({
            "title": f"Job posted: {_d(j.job_title)}",
            "raw_time": j.created_at,
            "type": "job"
        })

    for ev in SubmissionEvidence.objects.filter(user=user).order_by("-created_at")[:3]:
        label = {"PENDING": "submitted", "VERIFIED": "verified",
                 "RETURNED": "returned"}.get(ev.status, "submitted")
        activities.append({
            "title": f"{_d(ev.doc_type)} · {label}",
            "raw_time": ev.created_at,
            "type": "compliance"
        })

    activities.sort(key=lambda x: x["raw_time"] or timezone.now(), reverse=True)
    
    out = []
    now = timezone.now()
    for act in activities[:5]:
        dt = act["raw_time"]
        if not dt:
            time_str = "Recently"
        else:
            diff = (now - dt).total_seconds()
            if diff < 3600:
                time_str = f"{max(1, int(diff // 60))} mins ago"
            elif diff < 86400:
                time_str = f"{int(diff // 3600)} hours ago"
            elif diff < 172800:
                time_str = "1 day ago"
            else:
                time_str = f"{int(diff // 86400)} days ago"

        out.append({
            "title": act["title"],
            "time": time_str,
            "type": act["type"]
        })

    if not out:
        out = [
            {"title": "Contractor account active", "time": "Just now", "type": "system"}
        ]
    return out



def _contractor_registers(user):
    rows = []
    masters = []
    try:
        from bss_core.models import RegisterDocumentMaster
        masters = RegisterDocumentMaster.objects.filter(kind="register")[:20]
    except Exception:
        masters = []
    for m in masters:
        rows.append({
            "id": m.id, "documentName": _d(m.document_name),
            "documentType": _d(m.get_kind_display() or m.kind),
            "formNo": _d(m.form_number), "criticality": _d(m.criticality),
            "frequency": _d(m.frequency), "registerLevel": _d(m.state),
        })
    return rows


def _contractor_compliance_batch_row(b):
    return {
        "id": str(b.id), "financialYear": _d(b.financial_year),
        "month": _d(b.month), "year": _d(b.year), "state": _d(b.state),
        "site": b.site.site_name if b.site else "",
        "siteCode": b.site.site_code if b.site else "",
        "employeeCount": b.employee_count, "locationCount": b.location_count,
        "generatedOn": _dts(b.generated_on) if b.generated_on else "",
        "generatedBy": _d(b.generated_by),
        "rowsCount": b.rows_count,
        "hasFile": bool(b.generated_file),
        "notes": _d(b.notes),
        "status": {"GENERATED": "Generated", "PENDING": "Pending",
                   "FAILED": "Failed"}.get(str(b.status).upper(), "Generated"),
    }


def _contractor_compliance_batches(user):
    """CLRA/statutory register batches generated by the contractor."""
    qs = user.compliance_batches.select_related("site").all()[:20] if hasattr(user, "compliance_batches") else []
    return [_contractor_compliance_batch_row(b) for b in qs]


def _contractor_audit_report_row(r):
    items = [
        {"act": _d(i.act), "form": _d(i.form_number), "nature": _d(i.nature),
         "score": _num(i.achieved_score), "maxScore": _num(i.max_score),
         "status": _d(i.status),
         "auditorRemarks": _d(i.remarks), "vendorRemarks": ""}
        for i in r.items.all()
    ]
    return {
        "id": str(r.id), "uniqueNo": _d(r.unique_no), "site": _d(r.site_name),
        "employer": _d(r.client_name), "period": _d(r.period),
        "financialYear": _d(r.financial_year), "state": _d(r.state),
        "reportDate": _dts(r.report_date),
        "score": _num(r.score), "scorePercent": _num(r.score_pct),
        "actWise": items,
    }


def _contractor_audit_reports(user):
    reports = user.compliance_reports.all()[:20] if hasattr(user, "compliance_reports") else []
    return [_contractor_audit_report_row(r) for r in reports]


def _contractor_payroll_config(user):
    pc = PayrollConfig.objects.filter(employer=user).first()
    today = timezone.localdate()

    working_days = []
    if pc and pc.working_days:
        working_days = [d.strip() for d in pc.working_days.split(",") if d.strip()]

    upcoming = []
    if pc:
        for p in pc.periods.filter(status__in=["OPEN", "PROCESSING"]).order_by("period_start")[:3]:
            upcoming.append({"period": p.period_start.strftime("%b %Y"), "payDate": _dts(p.pay_date)})

    epf, esi, bonus = {}, {}, {}
    pt_rows, lwf_rows = [], []
    earnings, deductions, benefits, reimbursements = [], [], [], []
    ffs = {}
    staff_portal = {}

    if pc:
        epf_obj = getattr(pc, "epf", None)
        if epf_obj:
            epf = {"number": _d(epf_obj.epf_number), "deductionCycle": _d(epf_obj.deduction_cycle) or "monthly",
                   "employeeRate": _num(epf_obj.employee_rate),
                   "employerRate": _num(epf_obj.employer_rate),
                   "includeInSalary": bool(epf_obj.employer_pf_included),
                   "edliIncluded": bool(epf_obj.edli_included),
                   "adminChargesIncluded": bool(epf_obj.admin_charges_included),
                   "allowOverride": bool(epf_obj.employee_level_override),
                   "proRate": bool(epf_obj.prorate_restricted_pf_wage),
                   "lopConsideration": bool(epf_obj.consider_components_lop),
                   "abryEligible": bool(epf_obj.abry_eligible), "sample": []}
        esi_obj = getattr(pc, "esi", None)
        if esi_obj:
            esi = {"number": _d(esi_obj.esi_number), "deductionCycle": _d(esi_obj.deduction_cycle) or "monthly",
                   "employeeRate": _num(esi_obj.employee_rate),
                   "employerRate": _num(esi_obj.employer_rate),
                   "otherDetail": ""}
        bonus_obj = getattr(pc, "bonus", None)
        if bonus_obj:
            bonus = {"minWageStates": [], "paymentCycle": _d(bonus_obj.payment_cycle) or "annual",
                     "percentage": _num(bonus_obj.bonus_pct)}
        pt_obj = getattr(pc, "pt", None)
        if pt_obj:
            pt_rows = [{"location": _d(pt_obj.work_location), "ptNumber": _d(pt_obj.pt_number),
                        "state": _d(pt_obj.state), "cycle": _d(pt_obj.deduction_cycle) or "monthly",
                        "applicable": bool(pt_obj.applicable), "slabs": []}]
        lwf_obj = getattr(pc, "lwf", None)
        if lwf_obj:
            lwf_rows = [{"state": _d(lwf_obj.state), "minAmount": _num(lwf_obj.min_amount),
                         "maxAmount": _num(lwf_obj.max_amount),
                         "employeeShare": _num(lwf_obj.employee_share),
                         "employerShare": _num(lwf_obj.employer_share),
                         "deductionCycle": _d(lwf_obj.deduction_cycle) or "half-yearly",
                         "enabled": bool(lwf_obj.applicable)}]
        earnings = [{"name": _d(c.name), "type": _d(c.type), "calculation": _d(c.calculation_method),
                     "value": _num(c.calc_value), "considerForPf": bool(c.consider_for_pf),
                     "considerForEsi": bool(c.consider_for_esi)} for c in pc.earnings.all()]
        deductions = [{"name": _d(d.name), "frequency": _d(d.frequency), "amount": _num(d.amount)}
                      for d in pc.deductions.all()]
        benefits = [{"name": _d(b.name), "frequency": _d(b.frequency), "amount": _num(b.amount)}
                    for b in pc.benefits.all()]
        reimbursements = [{"name": _d(r.name), "maxAmount": _num(r.max_amount_per_month)}
                          for r in pc.reimbursements.all()]
        ffs_obj = getattr(pc, "ffs", None)
        if ffs_obj:
            ffs = {
                "leaveEncashment": {"enabled": bool(ffs_obj.leave_encashment_enabled),
                                    "leaveType": _d(ffs_obj.leave_encashment_leave_type),
                                    "on": _d(ffs_obj.leave_encashment_on),
                                    "days": ffs_obj.leave_encashment_days,
                                    "calcDays": _d(ffs_obj.leave_encashment_calc_days),
                                    "custom": _d(ffs_obj.leave_encashment_custom)},
                "gratuityEncashment": {"enabled": bool(ffs_obj.gratuity_encashment_enabled),
                                       "maturityYears": ffs_obj.gratuity_maturity_years,
                                       "maturityMonths": ffs_obj.gratuity_maturity_months,
                                       "roundingMonths": _d(ffs_obj.gratuity_rounding_months)},
                "noticePenalty": {"enabled": bool(ffs_obj.notice_penalty_enabled),
                                  "on": _d(ffs_obj.notice_penalty_on)},
                "excessLeaveRecovery": {"enabled": bool(ffs_obj.excess_leave_recovery),
                                        "on": _d(ffs_obj.excess_leave_penalty_on)},
                "assumeDaysRecovery": {"enabled": bool(ffs_obj.assume_days),
                                       "days": ffs_obj.assume_days,
                                       "on": _d(ffs_obj.assume_days_penalty_on)},
            }
        sp_obj = getattr(pc, "staff_portal", None)
        if sp_obj:
            doc_vis = sp_obj.document_visibility or {}
            staff_portal = {"portalAccess": bool(sp_obj.portal_access),
                            "bannerMessage": _d(sp_obj.banner_message),
                            "bannerTill": _dts(sp_obj.banner_till) if sp_obj.banner_till else None,
                            "contact": _d(sp_obj.support_contact),
                            "showDocuments": bool(doc_vis.get("showDocuments", False)),
                            "showSalaryRevision": bool(doc_vis.get("showSalaryRevision", False))}

    return {
        "paySchedule": {
            "payFrequency": _d(pc.salary_frequency if pc else "MONTHLY"),
            "workingDays": working_days,
            "payDay": _d(pc.default_pay_date if pc else 1),
            "firstPayPeriod": _dts(pc.first_pay_period) if pc and pc.first_pay_period else None,
            "upcoming": upcoming,
        },
        "statutory": {
            "epf": epf,
            "esi": esi,
            "professionalTax": pt_rows,
            "labourWelfareFund": lwf_rows,
            "statutoryBonus": bonus,
        },
        "salary": {
            "earnings": earnings,
            "deductions": deductions,
            "benefits": benefits,
            "reimbursements": reimbursements,
            "fullFinal": ffs,
        },
        "staffPortal": staff_portal,
    }


def _f(label, value, note="", sensitive=False, field_type="text"):
    """Profile section field helper."""
    return {"label": label, "value": "" if value is None else str(value), "note": note, "sensitive": sensitive, "type": field_type}


def _contractor_profile_sections(user):
    cp = getattr(user, "contractor_profile", None)
    g = lambda fld, note="": _f(fld, getattr(cp, fld, "") if cp else "", note)
    return {
        "basic": [
            _f("BSS ID", _contractor_identity(user).get("bssId", ""), "System-calculated"),
            _f("Contractor Type", getattr(cp, "entity_type", "") if cp else "", "Contractor"),
            _f("Legal Name", getattr(cp, "contractor_name", "") if cp else "", "Contractor"),
            _f("Trade / Brand Name", getattr(cp, "trade_name", "") if cp else "", "Contractor"),
            _f("Entity Constitution", getattr(cp, "constitution", "") if cp else "", "Contractor"),
            _f("Date of Incorporation", _dts(cp.incorporation_date) if cp and cp.incorporation_date else "", "Contractor", field_type="date"),
            _f("Authorised Person Name", getattr(cp, "contact_person", "") if cp else "", "Contractor"),
            _f("Mobile Number", getattr(cp, "mobile", "") if cp else "", "Auth identity — locked", sensitive=True),
            _f("Email ID", getattr(cp, "email", "") if cp else "", "Contractor"),
            _f("Age of Company", getattr(cp, "company_age", "") if cp else "", "System-calculated"),
            _f("Activity", getattr(cp, "activity", "") if cp else "", "Contractor"),
            _f("NIC Code", getattr(cp, "nic_code", "") if cp else "", "Contractor"),
        ],
        "registration": [
            _f("PAN", getattr(cp, "pan_no", "") if cp else "", "Contractor"),
            _f("GSTIN", getattr(cp, "gstin", "") if cp else "", "Contractor"),
            _f("Udyam Registration Number", getattr(cp, "udyam_no", "") if cp else "", "Contractor"),
            _f("Labour Department Registration Number", getattr(cp, "labour_dept_reg_no", "") if cp else "", "Contractor"),
            _f("Contract Labour Licence Number", getattr(cp, "clra_licence_no", "") if cp else "", "Contractor"),
            _f("BOCW / Other Labour Registration", getattr(cp, "bocw_reg_no", "") if cp else "", "Contractor"),
            _f("Licence Valid From", getattr(cp, "licence_valid_from", "") if cp else "", "Contractor/System", field_type="date"),
            _f("Licence Valid To", getattr(cp, "licence_valid_to", "") if cp else "", "Contractor/System", field_type="date"),
        ],
        "directors": [
            _f("Director Name", getattr(cp, "contact_person", "") if cp else "", "Contractor"),
            _f("Designation", "", "Contractor"),
            _f("Appointment Date", "", "Contractor"),
        ],
        "contact": [
            _f("Primary Contact Name", getattr(cp, "contact_person", "") if cp else "", "Contractor"),
            _f("Primary Contact Mobile", getattr(cp, "mobile", "") if cp else "", "Auth identity — locked", sensitive=True),
            _f("Primary Contact Email", getattr(cp, "email", "") if cp else "", "Contractor"),
        ],
        "financial": [
            _f("Bank Name", "", "Contractor"),
            _f("Annual Turnover Band", "", "Contractor"),
            _f("Payment Verification Status", "", "System"),
        ],
        "service": [
            _f("Registered Address", getattr(cp, "address", "") if cp else "", "Contractor"),
            _f("State / UT", getattr(cp, "state", "") if cp else "", "Contractor"),
            _f("Operating States", getattr(cp, "operating_states", "") if cp else "", "Contractor"),
        ],
        "documents": [
            _f("PAN Document", getattr(cp, "pan_no", "") if cp else "", "Contractor"),
            _f("GST Certificate", getattr(cp, "gstin", "") if cp else "", "Contractor"),
            _f("Contract Labour Licence", getattr(cp, "clra_licence_no", "") if cp else "", "Contractor"),
        ],
        "declarations": [
            _f("Consent for Data Processing", "", "Contractor"),
            _f("Consent Date", getattr(cp, "consent_date", "") if cp else "", "System", field_type="date"),
            _f("Registration Source", getattr(cp, "registration_source", "") if cp else "", "System"),
            _f("Registered By", getattr(cp, "registered_by", "") if cp else "", "System"),
            _f("Contractor Risk Rating", getattr(cp, "risk_rating", "") if cp else "", "System"),
            _f("Verified Contractor Badge", getattr(cp, "is_verified_badge", "") if cp else "", "System"),
        ],
        "undertaking": [
            _f("Onboarding Method", getattr(cp, "onboarding_method", "") if cp else "", "Contractor"),
            _f("Attendance Method", getattr(cp, "attendance_method", "") if cp else "", "Contractor"),
            _f("Payroll Method", getattr(cp, "payroll_method", "") if cp else "", "Contractor"),
        ],
    }


def _employer_profile_sections(user):
    ep = getattr(user, "employer_profile", None)
    g = lambda fld, note="": _f(fld, getattr(ep, fld, "") if ep else "", note)
    return {
        "identity": [
            _f("BSS Employer ID", getattr(ep, "employer_code", "") if ep else "", "System-calculated"),
            _f("Registration Status", getattr(ep, "approval_status", "") if ep else "", "Employer"),
            _f("Employer Category", getattr(ep, "employer_category", "") if ep else "", "Employer"),
            _f("Legal Entity Name", getattr(ep, "employer_name", "") if ep else "", "Employer"),
            _f("Trade / Brand Name", getattr(ep, "trade_name", "") if ep else "", "Employer"),
            _f("Ownership Type", getattr(ep, "ownership", "") if ep else "", "Employer"),
            _f("CIN / LLPIN / Registration No.", getattr(ep, "cin", "") if ep else "", "Employer"),
            _f("ROC", getattr(ep, "roc", "") if ep else "", "Employer"),
            _f("Registration Number", getattr(ep, "registration_number", "") if ep else "", "Employer"),
            _f("Class of Company", getattr(ep, "entity_class", "") if ep else "", "Employer"),
            _f("NIC Code", getattr(ep, "nic_code", "") if ep else "", "Employer"),
            _f("Number of Members", getattr(ep, "members_count", "") if ep else "", "Employer"),
            _f("Authorised Share Capital", getattr(ep, "authorized_capital", "") if ep else "", "Employer"),
            _f("Paid-up Share Capital", getattr(ep, "paid_up_capital", "") if ep else "", "Employer"),
            _f("Date of Incorporation", getattr(ep, "incorporation_date", "") if ep else "", "Employer", field_type="date"),
            _f("PAN", getattr(ep, "pan_no", "") if ep else "", "Employer"),
            _f("GSTIN", getattr(ep, "gstin", "") if ep else "", "Employer"),
        ],
        "business": [
            _f("Industry / Sector", getattr(ep, "industry", "") if ep else "", "Employer"),
            _f("NIC Code", getattr(ep, "nic_code", "") if ep else "", "Employer"),
            _f("Corporate Website", getattr(ep, "corporate_website", "") if ep else "", "Employer"),
        ],
        "contacts": [
            _f("Authorised Signatory Name", getattr(ep, "contact_person", "") if ep else "", "Employer"),
            _f("Official Mobile", getattr(ep, "mobile", "") if ep else "", "Auth identity — locked", sensitive=True),
            _f("Official Email", getattr(ep, "email", "") if ep else "", "Employer"),
        ],
        "address": [
            _f("Registered Address", getattr(ep, "address", "") if ep else "", "Employer"),
            _f("State", getattr(ep, "state", "") if ep else "", "Employer"),
            _f("District", getattr(ep, "district", "") if ep else "", "Employer"),
        ],
        "verification": [
            _f("Identity Verification Status", getattr(ep, "verification_status", "") if ep else "", "Employer"),
            _f("Verification Date", getattr(ep, "verification_date", "") if ep else "", "Employer"),
            _f("Verification Source", getattr(ep, "verification_source", "") if ep else "", "Employer"),
            _f("PAN Verification Status", getattr(ep, "pan_verification_status", "") if ep else "", "Employer"),
            _f("GST Verification Status", getattr(ep, "gst_verification_status", "") if ep else "", "Employer"),
        ],
        "statutory": [
            _f("LIN", getattr(ep, "lin", "") if ep else "", "Employer"),
        ],
        "workforce": [
            _f("Workforce Model", getattr(ep, "workforce_model", "") if ep else "", "Employer"),
            _f("Total Workers - Current", getattr(ep, "total_headcount", "") if ep else "", "Employer"),
        ],
        "employment": [
            _f("Payroll Frequency", getattr(ep, "payroll_frequency", "") if ep else "", "Employer"),
            _f("Wage Period", getattr(ep, "wage_period", "") if ep else "", "Employer"),
            _f("Attendance Method", getattr(ep, "attendance_method", "") if ep else "", "Employer"),
            _f("Worker Onboarding Method", getattr(ep, "onboarding_method", "") if ep else "", "Employer"),
        ],
        "benefits": [
            _f("PF Coverage", getattr(ep, "pf_coverage", "") if ep else "", "Employer"),
            _f("ESIC Coverage", getattr(ep, "esic_coverage", "") if ep else "", "Employer"),
            _f("Gratuity Coverage", getattr(ep, "gratuity_coverage", "") if ep else "", "Employer"),
            _f("LWF Coverage", getattr(ep, "lwf_coverage", "") if ep else "", "Employer"),
            _f("Group Medical Insurance", getattr(ep, "medical_insurance", "") if ep else "", "Employer"),
            _f("Accident Insurance", getattr(ep, "accident_insurance", "") if ep else "", "Employer"),
        ],
        "safety": [
            _f("Medical Examination Process", getattr(ep, "medical_exam_enabled", "") if ep else "", "Employer"),
            _f("First Aid Facility", getattr(ep, "first_aid_enabled", "") if ep else "", "Employer"),
            _f("PPE Management", getattr(ep, "ppe_provision", "") if ep else "", "Employer"),
            _f("Safety Training", getattr(ep, "safety_training_enabled", "") if ep else "", "Employer"),
            _f("Site Induction", getattr(ep, "site_induction_enabled", "") if ep else "", "Employer"),
            _f("Emergency Response Plan", getattr(ep, "emergency_plan_enabled", "") if ep else "", "Employer"),
            _f("Fire Safety Certificate", getattr(ep, "fire_certificate", "") if ep else "", "Employer"),
            _f("Canteen Facility", getattr(ep, "canteen_facility", "") if ep else "", "Employer"),
            _f("Creche Facility", getattr(ep, "creche_facility", "") if ep else "", "Employer"),
            _f("Transport Facility", getattr(ep, "transport_facility", "") if ep else "", "Employer"),
            _f("Accommodation / Camp Facility", getattr(ep, "accommodation_facility", "") if ep else "", "Employer"),
        ],
        "worker-relations": [
            _f("Worker Grievance Mechanism", getattr(ep, "grievance_mechanism", "") if ep else "", "Employer"),
            _f("Grievance Officer", getattr(ep, "grievance_officer_name", "") if ep else "", "Employer"),
            _f("Internal Complaints Committee / POSH", getattr(ep, "posh_icc", "") if ep else "", "Employer"),
            _f("Standing Orders / Service Rules", getattr(ep, "standing_orders", "") if ep else "", "Employer"),
            _f("Worker Communication Channel", getattr(ep, "communication_channel", "") if ep else "", "Employer"),
        ],
        "settings": [
            _f("Default Approval SLA (days)", getattr(ep, "default_approval_sla_days", "") if ep else "", "Employer"),
            _f("Compliance Reminder Window (days)", getattr(ep, "compliance_reminder_window_days", "") if ep else "", "Employer"),
            _f("Preferred Reporting Period", getattr(ep, "preferred_reporting_period", "") if ep else "", "Employer"),
            _f("Escalation Contact", getattr(ep, "escalation_contact", "") if ep else "", "Employer"),
        ],
    }


def build_contractor_portal(user):
    sites = _contractor_sites(user)
    allowed_site_ids = {str(s["id"]) for s in sites}
    default_site = _default_site_info(getattr(user, "contractor_profile", None))
    if default_site is None or default_site["id"] not in allowed_site_ids:
        # The first allotted site is always the implicit default when none was chosen.
        default_site = ({"id": str(sites[0]["id"]), "name": sites[0]["name"], "code": sites[0]["code"]}
                        if sites else None)
    return {
        "identity": _contractor_identity(user),
        "stats": _contractor_stats(user),
        "principalEmployer": _contractor_principal_employer(user),
        "sites": sites,
        "pendingSites": _contractor_pending_sites(user),
        "defaultSite": default_site,
        "workers": _contractor_workers(user),
        "compliances": _contractor_compliances(user),
        "gatePasses": _contractor_gate_passes(user),
        "advances": _contractor_advances(user),
        "applications": _contractor_applications(user),
        "availableWorkers": _contractor_available_workers(user),
        "employers": _contractor_employers(user),
        "submissions": _contractor_submissions(user),
        "submissionDocuments": _submission_document_master(),
        "workerBenefits": _contractor_worker_benefits(user),
        "salaries": _contractor_salaries(user),
        "profileSections": _contractor_profile_sections(user),
        "licenses": _contractor_licenses(user),
        "workerDocuments": _contractor_worker_documents(user),
        "workerCompliance": _contractor_worker_compliance(user),
        "workforceGrowth": _contractor_workforce_growth(user),
        "applicability": _contractor_applicability(user),
        "complianceHistory": _contractor_compliance_history(user),
        "jobHistory": _contractor_job_history(user),
        "leaveApprovals": _contractor_leave_approvals(user),
        "restrictedHolidayRequests": _contractor_restricted_holiday_requests(user),
        "siteCalendars": _contractor_site_calendars(user),
        "leaveTypeCatalog": [lt.name for lt in LeaveType.objects.filter(is_active=True)],
        "bindingRequests": _contractor_binding_requests(user),
        "registers": _contractor_registers(user),
        "complianceBatches": _contractor_compliance_batches(user),
        "auditReports": _contractor_audit_reports(user),
        "recentActivities": _contractor_recent_activities(user),
        "grievances": _contractor_grievances(user),
        "payroll": {
            "config": _contractor_payroll_config(user),
            "records": [],
            "templateColumns": [],
        },
    }


# ---------------------------------------------------------------------------
# Employer portal
# ---------------------------------------------------------------------------
def _employer_identity(user):
    ep = getattr(user, "employer_profile", None)
    return {
        "name": _org_name(user),
        "company": _d(ep.trade_name if ep else "") or _org_name(user),
        "bssId": _d(ep.employer_code if ep else _bss_employer_code(user.id)),
        "entity": _d(ep.entity_class if ep else ""),
        "verified": _d(ep.verification_status if ep else "PENDING") == "APPROVED",
        "contact": _d(ep.contact_person if ep else ""),
        "email": _d(ep.email if ep else ""),
        "address": _d(ep.address if ep else ""),
    }


def _employer_stats(user):
    sites = Site.objects.filter(employer=user)
    accepted_contractors = set(ContractorEmployerBinding.objects.filter(
        employer=user, binding_status="ACCEPTED").values_list("contractor_id", flat=True))
    # Bound contractors count even before they have workers on a site.
    contractors = len(accepted_contractors)
    # Only workers whose contractor is actually bound to this employer count as
    # on-site — a stale worker binding must not inflate the employer's numbers.
    workers = WorkerContractorBinding.objects.filter(
        site__employer=user, binding_status="ACCEPTED",
        contractor_id__in=accepted_contractors).count()
    comp_docs = ComplianceDocument.objects.filter(
        employer_id__in=accepted_contractors, site__employer=user)
    comp_total = comp_docs.count()
    compliance_score = 0
    if comp_total:
        comp_ok = comp_docs.filter(status__in=["SUBMITTED", "COMPLETED"]).count()
        compliance_score = int(round(comp_ok * 100.0 / comp_total))
    return {
        "totalContractors": contractors,
        "totalWorkers": workers,
        "activeSites": sites.count(),
        "complianceScore": compliance_score,
        "pendingApprovals": user.approvals_handled.filter(status="PENDING").count() if hasattr(user, "approvals_handled") else 0,
    }


def _employer_sites(user):
    accepted_contractors = set(ContractorEmployerBinding.objects.filter(
        employer=user, binding_status="ACCEPTED").values_list("contractor_id", flat=True))
    rows = []
    for s in Site.objects.filter(employer=user):
        site_bindings = WorkerContractorBinding.objects.filter(
            site=s, binding_status="ACCEPTED", contractor_id__in=accepted_contractors)
        # A contractor counts against a site when the site is allotted to them
        # (approved allotment on an accepted binding) — even before any of their
        # workers are bound — as well as when they have workers on the site.
        allotted_ids = set(ContractorSiteAllotment.objects.filter(
            site=s, status="APPROVED", binding__binding_status="ACCEPTED"
        ).values_list("binding__contractor_id", flat=True))
        worker_ids = set(site_bindings.values_list("contractor_id", flat=True))
        cids = sorted(allotted_ids | worker_ids)
        wcount = site_bindings.count()
        comp_site = ComplianceDocument.objects.filter(
            site=s, employer_id__in=accepted_contractors)
        comp_site_total = comp_site.count()
        site_compliance = 0
        if comp_site_total:
            comp_site_ok = comp_site.filter(status__in=["SUBMITTED", "COMPLETED"]).count()
            site_compliance = int(round(comp_site_ok * 100.0 / comp_site_total))
        rows.append({
            "id": str(s.id), "code": _d(s.site_code), "name": _d(s.site_name),
            "location": _d(s.location) or _d(s.city),
            "state": _d(s.state),
            "startDate": _dts(s.site_start_date) or "",
            "endDate": _dts(s.expected_end_date) or "",
            "status": _d(s.site_status) or ("Active" if s.attendance_enabled else "Planned"),
            "contractorIds": list(cids), "workers": wcount,
            "pastContractors": _site_past_contractors(s, user, set(cids)),
            "compliance": site_compliance,
            "qrToken": _d(s.site_qr_token),
            "bssId": _d(s.bss_site_id),
            "data": _site_scalar_data(s),
        })
    return rows


def _site_past_contractors(site, employer, active_ids):
    """Terminal (cancelled/rejected/released) relationships at a site, so history
    stays visible without being shown as a live connection. Active contractors are
    excluded. One row per contractor, carrying the most recent terminal event."""
    TERMINAL_BINDING = {"CANCELLED": "Cancelled", "REJECTED": "Rejected", "EXPIRED": "Expired"}
    latest = {}
    for b in (WorkerContractorBinding.objects
              .filter(site=site, binding_status__in=list(TERMINAL_BINDING))
              .only("contractor_id", "binding_status", "updated_at", "created_at")):
        when = b.updated_at or b.created_at
        prev = latest.get(b.contractor_id)
        if prev is None or when > prev["at"]:
            latest[b.contractor_id] = {"at": when, "status": TERMINAL_BINDING[b.binding_status]}
    for a in (ContractorSiteAllotment.objects
              .filter(site=site, binding__employer=employer, status__in=["REJECTED", "RELEASED"])
              .select_related("binding")):
        when = a.updated_at or a.created_at
        cid = a.binding.contractor_id
        prev = latest.get(cid)
        if prev is None or when > prev["at"]:
            latest[cid] = {"at": when, "status": "Released" if a.status == "RELEASED" else "Rejected"}
    rows = []
    for cid, info in latest.items():
        if cid in active_ids:
            continue
        c = User.objects.filter(id=cid).first()
        if not c:
            continue
        cp = getattr(c, "contractor_profile", None)
        rows.append({
            "id": str(cid),
            "name": _d(cp.contractor_name if cp else "", c.username),
            "bssId": _d(cp.contractor_code if cp else "", _bss_contractor_code(cid)),
            "status": info["status"],
            "endedAt": _dts(info["at"]) or "",
        })
    rows.sort(key=lambda r: r["endedAt"], reverse=True)
    return rows


_SITE_SCALAR_FIELDS = tuple(
    f.name for f in Site._meta.get_fields()
    if not getattr(f, "auto_created", False)
    and not getattr(f, "many_to_one", False)
    and not getattr(f, "many_to_many", False)
    and not getattr(f, "one_to_one", False)
    and f.name not in ("id", "site_qr_token", "created_at", "updated_at", "employer")
)


def _site_scalar_data(s):
    """All editable scalar fields of a Site, keyed by model column name."""
    out = {}
    for f in _SITE_SCALAR_FIELDS:
        v = getattr(s, f, None)
        if v is None:
            out[f] = None
        elif isinstance(v, (datetime.datetime, datetime.date)):
            out[f] = v.isoformat()
        elif hasattr(v, "isoformat"):
            out[f] = v.isoformat()
        else:
            out[f] = v
    return out


def _employer_contractors(user):
    cids = set(WorkerContractorBinding.objects.filter(site__employer=user).values_list(
        "contractor_id", flat=True).distinct())
    # Contractors engaged directly (scanned this employer's QR) and accepted.
    cids |= set(ContractorEmployerBinding.objects.filter(
        employer=user, binding_status="ACCEPTED").values_list("contractor_id", flat=True))
    rows = []
    for cid in cids:
        c = User.objects.filter(id=cid).first()
        if not c:
            continue
        cp = getattr(c, "contractor_profile", None)
        # Only *active* connections count as an assigned site: an APPROVED site
        # allotment on an ACCEPTED employer binding, or an ACCEPTED worker
        # binding. This matches _employer_sites().contractorIds, so a site's card
        # and its "Connected relationships" list agree — cancelled/rejected
        # relationships no longer show up as connected.
        site_ids = set(ContractorSiteAllotment.objects.filter(
            binding__contractor=c, binding__employer=user,
            binding__binding_status="ACCEPTED", status="APPROVED").values_list("site_id", flat=True))
        site_ids |= set(WorkerContractorBinding.objects.filter(
            contractor=c, site__employer=user, binding_status="ACCEPTED").values_list("site_id", flat=True))
        site_ids = sorted(str(x) for x in site_ids)
        wcount = WorkerContractorBinding.objects.filter(contractor=c, site__employer=user,
                                                        binding_status="ACCEPTED").count()
        # Relationship status reflects the actual binding with this employer,
        # not the contractor's own registration approval.
        binding = (ContractorEmployerBinding.objects.filter(employer=user, contractor=c)
                      .order_by("-created_at").first())
        accepted_binding = bool(binding and binding.binding_status == "ACCEPTED")
        if accepted_binding or wcount:
            status = "Active"
        elif binding:
            status = {"PENDING": "Pending", "REJECTED": "Rejected",
                      "CANCELLED": "Cancelled"}.get(str(binding.binding_status).upper(), "Pending")
        else:
            status = _d(cp.approval_status if cp else "PENDING")
        # Per-site allotment status for this contractor↔employer binding, so the
        # employer can see (and propose to) secondary contractors site-by-site.
        allotment_rows = ContractorSiteAllotment.objects.filter(
            binding__contractor=c, binding__employer=user,
            binding__binding_status="ACCEPTED").select_related("site")
        connected_at = None
        if binding:
            connected_at = binding.accepted_at or binding.created_at
        if connected_at is None:
            worker_binding = WorkerContractorBinding.objects.filter(
                contractor=c, site__employer=user, binding_status="ACCEPTED",
            ).order_by("accepted_at", "created_at").first()
            connected_at = (worker_binding.accepted_at or worker_binding.created_at) if worker_binding else None
        comp_docs = ComplianceDocument.objects.filter(employer=c, site__employer=user)
        comp_total = comp_docs.count()
        compliance_score = 0
        if comp_total:
            comp_ok = comp_docs.filter(status__in=["SUBMITTED", "COMPLETED"]).count()
            compliance_score = int(round(comp_ok * 100.0 / comp_total))
        rows.append({
            "id": c.id, "name": _d(cp.contractor_name if cp else "", c.username),
            "bssId": _d(cp.contractor_code if cp else "", _bss_contractor_code(c.id)),
            "contact": _d(cp.contact_person if cp else ""),
            "email": _d(cp.email if cp else ""),
            "siteIds": site_ids, "workers": wcount,
            "allotments": [{
                "siteId": a.site_id,
                "status": {"PENDING": "Pending", "APPROVED": "Approved", "REJECTED": "Rejected",
                           "RELEASED": "Released"}.get(str(a.status).upper(), _d(a.status)),
                "source": _d(a.source),
            } for a in allotment_rows],
            "compliance": compliance_score,
            "onboardingDate": _dts(connected_at.date()) if connected_at else None,
            "status": status,
            "bindingId": binding.id if (binding and accepted_binding) else None,
            "verified": bool(cp and cp.is_verified_badge) or accepted_binding,
        })
    return rows


def _worker_compliance_label(worker):
    """Worker compliance from the real state of their on-file documents:
    rejected/expired → Non-compliant, expiring soon or unverified → Expiring,
    no documents at all → Non-compliant, otherwise Compliant."""
    today = timezone.localdate()
    docs = WorkerDocument.objects.filter(user=worker)
    for d in docs:
        if d.status == "REJECTED":
            return "Non-compliant"
        if d.expiry_date and d.expiry_date < today:
            return "Non-compliant"
        if d.status in ("EXPIRED", "MISSING", "UNDER_VERIFICATION"):
            return "Expiring"
        if d.expiry_date and 0 <= (d.expiry_date - today).days <= 30:
            return "Expiring"
    if not docs.exists():
        return "Non-compliant"
    return "Compliant"


def _employer_workers(user):
    bindings = WorkerContractorBinding.objects.filter(site__employer=user, binding_status="ACCEPTED")
    rows = []
    for b in bindings:
        wi = WorkerIdentity.objects.filter(user=b.worker).first()
        cp = getattr(b.contractor, "contractor_profile", None)
        rows.append({
            "id": b.worker_id,
            "name": _d(wi.name if wi else b.worker.username),
            "bssId": _d(wi.bss_worker_id if wi else ""),
            "mobile": _d(wi.mobile_number if wi else ""),
            "contractorId": b.contractor_id,
            "contractor": _d(cp.contractor_name if cp else b.contractor.username),
            "siteId": str(b.site_id), "site": b.site.site_name if b.site else "",
            "designation": _d(b.designation),
            "doj": _dts(b.accepted_at.date()) if b.accepted_at else None,
            "compliance": _worker_compliance_label(b.worker),
            "status": _d(b.binding_status), "verified": bool(wi and wi.aadhaar),
        })
    return rows


def _successor_candidates(employer, leaving):
    """Contractors the employer can pick as a successor when `leaving` ends:
    their other ACCEPTED contractors first, then every other contractor in the
    system (the employer may engage a new one directly). Rows carry a
    ``contractorId`` always and a ``bindingId`` only when a CE binding exists."""
    rows = []
    seen = set()
    for cb in (ContractorEmployerBinding.objects
               .filter(employer=employer, binding_status="ACCEPTED")
               .exclude(pk=leaving.pk).select_related("contractor")):
        seen.add(cb.contractor_id)
        rows.append({"bindingId": cb.id, "contractorId": cb.contractor_id,
                     "name": _org_name(cb.contractor)})
    for cp in (ContractorProfile.objects.select_related("user")
               .exclude(user_id__in=seen)
               .exclude(user_id=leaving.contractor_id)):
        rows.append({"bindingId": None, "contractorId": cp.user_id,
                     "name": _d(cp.contractor_name) or _org_name(cp.user)})
    return rows


def _employer_approvals(user):
    """Pending binding approvals for this employer. Every request is site-scoped
    (E·C·S·W) — the site shown is the one the contractor/worker is approved against."""
    status_label = {"PENDING": "Pending", "APPROVED": "Approved",
                    "REJECTED": "Rejected", "CANCELLED": "Cancelled"}
    rows = []
    qs = user.approvals_handled.filter(status="PENDING")[:20] if hasattr(user, "approvals_handled") else []
    for a in qs:
        entity_type = _d(a.entity_type)
        meta = a.metadata if isinstance(a.metadata, dict) else {}
        target = User.objects.filter(pk=a.entity_id).first() if str(a.entity_id).isdigit() else None
        name = ""
        bss_id = ""
        contractor_name = ""
        site_name = _d(meta.get("site_name"))
        checks = []
        if entity_type.lower() == "contractor" and target:
            cp = getattr(target, "contractor_profile", None)
            name = _d(cp.contractor_name if cp else target.username)
            bss_id = _d(cp.contractor_code if cp else _bss_contractor_code(target.id))
            binding = WorkerContractorBinding.objects.filter(contractor=target, site__employer=user).first()
            if binding and binding.site:
                site_name = site_name or _d(binding.site.site_name)
            checks = ["KYC", "Licence"]
        elif entity_type.lower() == "worker" and target:
            wi = WorkerIdentity.objects.filter(user=target).first()
            name = _d(wi.name if wi else target.username)
            bss_id = _d(wi.bss_worker_id if wi else _bss_worker_code(target.id))
            binding = WorkerContractorBinding.objects.filter(worker=target, site__employer=user).first()
            if binding:
                if binding.site:
                    site_name = site_name or _d(binding.site.site_name)
                if binding.contractor:
                    cp = getattr(binding.contractor, "contractor_profile", None)
                    contractor_name = _d(cp.contractor_name if cp else binding.contractor.username)
            checks = ["Aadhaar", "Bank"]
        rows.append({
            "id": str(a.id), "entityType": entity_type,
            "entityId": str(a.entity_id), "name": name,
            "bssId": bss_id, "contractor": contractor_name or None,
            "site": site_name, "submittedAt": _dts(a.requested_at),
            "checks": checks, "status": status_label.get(str(a.status).upper(), "Pending"),
            "initiatedBy": entity_type or "Worker",
            "acceptedBy": "Employer" if str(a.status).upper() == "APPROVED" else "",
        })
    # Contractor <-> employer bindings (contractor scanned this employer's QR
    # or a site QR). Every request is surfaced — rows are never replaced or
    # hidden, so accepted/rejected/cancelled requests all stay visible.
    binding_status = {"PENDING": "Pending", "ACCEPTED": "Accepted",
                         "REJECTED": "Rejected", "CANCELLED": "Cancelled"}
    for e in ContractorEmployerBinding.objects.filter(employer=user).order_by("-created_at"):
        cp = getattr(e.contractor, "contractor_profile", None)
        approved_sites = [a.site.site_name for a in e.allotments.all()
                          if a.site and a.status == "APPROVED"]
        pending_sites = [f"{a.site.site_name} (pending approval from contractor)" for a in e.allotments.all()
                         if a.site and a.status == "PENDING"]
        sites = approved_sites + pending_sites
        rows.append({
            "id": f"ce-{e.id}", "bindingId": str(e.id),
            "entityType": "Contractor", "entityId": str(e.contractor_id),
            "name": _d(cp.contractor_name if cp else "", e.contractor.username),
            "bssId": _d(cp.contractor_code if cp else "", _bss_contractor_code(e.contractor_id)),
            "contractor": None,
            "site": ", ".join(sites) if sites else "Sites to be allotted",
            "siteIds": [a.site_id for a in e.allotments.all() if a.site_id],
            "allotments": [{
                "siteId": a.site_id,
                "site": a.site.site_name if a.site else "",
                "siteCode": a.site.site_code if a.site else "",
                "status": {"PENDING": "Pending", "APPROVED": "Approved",
                           "REJECTED": "Rejected", "RELEASED": "Released"}.get(str(a.status).upper(), "Pending"),
                "source": _d(a.source),
                "releaseRequested": bool(a.release_requested_at),
                "releaseRequestedBy": _d(a.release_requested_by),
                "workersAtRisk": WorkerContractorBinding.objects.filter(
                    contractor=e.contractor, site_id=a.site_id
                ).exclude(binding_status__in=["REJECTED", "CANCELLED", "EXPIRED"]).count(),
            } for a in e.allotments.all()],
            "submittedAt": _dts(e.created_at),
            "checks": ["KYC", "Licence"],
            "status": binding_status.get(str(e.binding_status).upper(), "Pending"),
            "initiatedBy": _ce_initiator_acceptor(e)[0],
            "acceptedBy": _ce_initiator_acceptor(e)[1],
            "consentEmployer": bool(e.consent_employer),
            "consentContractor": bool(e.consent_contractor),
            "source": _d(e.source),
            "secondaryBindingIds": [int(x) for x in (e.secondary_binding_ids or []) if str(x).isdigit()],
            # Workers that would be orphaned if this contractor's access ends, and
            # the candidate successor contractors (other ACCEPTED bindings).
            "workersAtRisk": WorkerContractorBinding.objects.filter(
                contractor=e.contractor, site__employer=user
            ).exclude(binding_status__in=["REJECTED", "CANCELLED", "EXPIRED"]).count(),
            "successorCandidates": _successor_candidates(user, e),
            "unbindRequested": bool(e.unbind_requested_at),
            "unbindConsentEmployer": bool(e.unbind_consent_employer),
            "unbindConsentContractor": bool(e.unbind_consent_contractor),
            "history": _ce_history(e),
        })
    return rows


def _auto_gate_pass_type(worker):
    """Auto-issued pass type from the worker's own ID-card records: a fully
    eligible worker (medical + health & safety + compliance) gets a Permanent
    pass, otherwise a Temporary one."""
    e = _gate_pass_eligibility(worker)
    if e.get("medical") == "Done" and e.get("healthSafety") == "Done" and e.get("compliance") == "Done":
        return "PGP"
    return "TGP"


def _is_gate_pass_blocked(worker, employer):
    """True when the principal employer has blocked gate-pass generation for a worker."""
    if not employer:
        return False
    from bss_core.models import WorkerGatePassBlock
    return WorkerGatePassBlock.objects.filter(worker=worker, employer=employer, blocked=True).exists()


def _auto_gate_pass_dates(worker, gp_type):
    """Auto pass validity: temporary passes run 7 days from today; permanent
    passes mirror the worker's BSS ID card (Issue Date / Valid Till)."""
    today = timezone.localdate()
    if gp_type == "TGP":
        return today, today + datetime.timedelta(days=7)
    employment = WorkerEmployment.objects.filter(user=worker).first()
    issue = (employment.id_card_issue_date if employment else None) or today
    till = (employment.id_card_validity_till if employment else None) or (issue + datetime.timedelta(days=365))
    return issue, till


def _auto_gate_pass_no(worker, gp_type):
    """Stable BSS-P + 10 alphanumeric (permanent) / BSS-T + 10 alphanumeric
    (temporary) id derived from the worker's BSS id, so the same worker/type
    always renders the same pass number. Uses FNV-1a so the frontend can derive
    the identical number without a server round-trip."""
    identity = _get_identity(worker)
    seed = (identity.bss_worker_id if identity and identity.bss_worker_id else worker.username) or str(worker.pk)
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    prefix = "BSS-P" if gp_type == "PGP" else "BSS-T"
    material = f"{seed}:{gp_type}"
    h = 2166136261
    out = []
    for rnd in range(10):
        for ch in material:
            h ^= (ord(ch) + rnd) & 0xFFFFFFFF
            h = (h * 16777619) & 0xFFFFFFFF
        out.append(alphabet[h % len(alphabet)])
    return prefix + "".join(out)


def _employer_gate_pass_row(g):
    meta = _gate_pass_worker_meta(g.worker)
    site = g.site
    contractor_name = ""
    binding = (WorkerContractorBinding.objects.filter(worker=g.worker, site=site)
               .select_related("contractor").first())
    if binding:
        cp = getattr(binding.contractor, "contractor_profile", None)
        contractor_name = _d(cp.contractor_name if cp else binding.contractor.username)
    blocked = _is_gate_pass_blocked(g.worker, site.employer if site else None)
    return {
        "id": g.id, **meta,
        "number": _d(g.gate_pass_no),
        "contractor": contractor_name,
        "site": site.site_name if site else "",
        "siteId": g.site_id,
        "type": _GP_TYPE_LABEL.get(_d(g.gate_pass_type), _d(g.gate_pass_type)),
        "requestedAt": _dts(g.created_at),
        "requestedBy": _party_name(g.issued_by) or contractor_name,
        "approvedBy": _party_name(g.approved_by),
        "approvedAt": _dts(g.approved_at),
        "validFrom": _dts(g.start_date), "validTo": _dts(g.end_date),
        "status": "Blocked" if blocked else _GP_STATUS_LABEL.get(_d(g.status), _d(g.status)),
        "blocked": blocked,
        "eligibility": _gate_pass_eligibility(g.worker),
    }


def _employer_gate_passes(user):
    """Every connected worker has a gate pass. Explicit contractor requests keep
    their real status/validity; a connected worker without a request gets an
    auto-generated pass derived from their BSS ID card, so site access is always
    visible without waiting on a contractor request."""
    rows = [_employer_gate_pass_row(g) for g in WorkerGatePass.objects.filter(
        site__employer=user).select_related("worker", "site").order_by("-created_at")[:100]]
    seen = {(row["workerId"], row["type"]) for row in rows}
    bindings = (WorkerContractorBinding.objects
                .filter(site__employer=user, binding_status="ACCEPTED")
                .select_related("worker", "site", "contractor"))
    for b in bindings:
        meta = _gate_pass_worker_meta(b.worker)
        gp_type = _auto_gate_pass_type(b.worker)
        label = _GP_TYPE_LABEL.get(gp_type, gp_type)
        if (meta["workerId"], label) in seen:
            continue
        start = b.accepted_at or b.created_at
        days = 365 if gp_type == "PGP" else 7
        # Validity: permanent mirrors the BSS ID card; temporary runs 7 days.
        issue_date, valid_till = _auto_gate_pass_dates(b.worker, gp_type)
        blocked = _is_gate_pass_blocked(b.worker, user)
        cp = getattr(b.contractor, "contractor_profile", None)
        rows.append({
            "id": f"auto-{b.id}",
            "auto": True,
            "number": _auto_gate_pass_no(b.worker, gp_type),
            **meta,
            "contractor": _d(cp.contractor_name if cp else b.contractor.username),
            "site": b.site.site_name if b.site else "",
            "siteId": b.site_id,
            "type": label,
            "requestedAt": _dts(b.created_at),
            "requestedBy": "",
            "approvedBy": "",
            "approvedAt": "",
            "validFrom": _dts(issue_date),
            "validTo": _dts(valid_till),
            "status": "Blocked" if blocked else "Approved",
            "blocked": blocked,
            "eligibility": _gate_pass_eligibility(b.worker),
        })
    return rows[:200]


def _employer_submissions(user):
    rows = []
    # Scope to THIS employer: a contractor bound to several employers must not
    # leak its submissions for another employer's site.
    my_employer = _org_name(user)
    my_sites = set(Site.objects.filter(employer=user).values_list("site_name", flat=True))
    uploaded = SubmissionEvidence.objects.filter(
        Q(user__worker_bindings__site__employer=user) |
        Q(user__contractor_bindings__site__employer=user)
    ).distinct()[:100]
    for ev in uploaded:
        if (ev.site and my_sites and ev.site not in my_sites) or (ev.employer and my_employer and ev.employer != my_employer):
            continue
        cp = getattr(ev.user, "contractor_profile", None) if ev.user.role == "contractor" else None
        rows.append({
            "id": str(ev.id),
            "contractor": _d(cp.contractor_name if cp else ""),
            "contractorId": _bss_contractor_code(ev.user_id) if ev.user.role == "contractor" else "",
            "site": _d(ev.site), "type": _d(ev.doc_type),
            "period": _d(ev.period),
            "submittedAt": _dts(ev.created_at),
            "status": _submission_review_label(ev.status),
            "source": "evidence",
        })
    for c in user.compliance_docs.all()[:20] if hasattr(user, "compliance_docs") else []:
        rows.append({
            "id": str(c.id), "contractor": "", "contractorId": "",
            "site": c.site.site_name if c.site else "",
            "type": _d(c.master.act if c.master else ""),
            "period": _d(c.period), "submittedAt": _dts(c.updated_at),
            "status": _submission_review_label(c.status),
            "source": "register",
        })
    return rows


def _submission_review_label(status):
    """Map stored SubmissionEvidence status to the employer review labels the
    frontend acts on (Pending review / Verified / Rejected)."""
    st = str(status or "").strip().upper()
    if st == "VERIFIED":
        return "Verified"
    if st in ("RETURNED", "REJECTED"):
        return "Rejected"
    return "Pending review"


def _employer_compliance_reports(user):
    """Per-contractor statutory compliance status for the employer's connected
    contractors, derived from the contractors' compliance documents at its sites."""
    contractor_ids = set(ContractorEmployerBinding.objects.filter(
        employer=user, binding_status="ACCEPTED").values_list("contractor_id", flat=True))
    rows = []
    for c in (ComplianceDocument.objects
              .filter(employer_id__in=contractor_ids, site__employer=user)
              .select_related("master", "site", "employer").order_by("-created_at")[:60]):
        cp = getattr(c.employer, "contractor_profile", None)
        st = str(c.status).upper()
        verified = st in ("SUBMITTED", "COMPLETED")
        rows.append({
            "id": str(c.id), "contractorId": str(c.employer_id),
            "contractor": _d(cp.contractor_name if cp else c.employer.username),
            "siteId": str(c.site_id) if c.site_id else None,
            "site": c.site.site_name if c.site else "", "period": _d(c.period),
            "pf": "Filed" if verified else "Pending",
            "esic": "Filed" if verified else "Pending",
            "wage": "Filed" if verified else "Pending",
            "safety": "Compliant" if verified else ("Non-compliant" if st == "EXPIRED" else "Review"),
            "score": _num(c.ocr_accuracy) if c.ocr_accuracy is not None else (100 if verified else 0),
            "status": "COMPLETED" if verified else "PENDING",
        })
    return rows


def _employer_users(user):
    return []


def _employer_permission_roles():
    return []


def _employer_audit_logs(user):
    return []


def _employer_worker_documents(user):
    """Read-only worker document register for workers bound at the employer's sites."""
    from bss_core.models import WorkerDocument
    bindings = list(WorkerContractorBinding.objects.filter(
        site__employer=user, binding_status="ACCEPTED").select_related("contractor", "site"))
    by_worker = {b.worker_id: b for b in bindings}
    rows = []
    if not by_worker:
        return rows
    for d in (WorkerDocument.objects.filter(user_id__in=list(by_worker.keys()))
              .select_related("document", "user").order_by("-updated_at")[:100]):
        wi = WorkerIdentity.objects.filter(user=d.user).first()
        b = by_worker.get(d.user_id)
        cp = getattr(b.contractor, "contractor_profile", None) if b else None
        st = str(d.status).upper()
        rows.append({
            "id": str(d.id),
            "worker": _d(wi.name if wi else d.user.username),
            "workerId": _d(wi.bss_worker_id if wi else ""),
            "contractor": _d(cp.contractor_name if cp else (b.contractor.username if b else "")),
            "site": b.site.site_name if b and b.site else "",
            "document": _d(d.document.document_name if d.document else ""),
            "status": {"UPLOADED": "Pending", "VERIFIED": "Verified", "REJECTED": "Rejected",
                       "MISSING": "Missing", "UNDER_VERIFICATION": "Pending",
                       "EXPIRED": "Expiring"}.get(st, "Pending"),
            "expiry": _dts(d.expiry_date) if d.expiry_date else None,
        })
    return rows


def _employer_activities(user):
    return []


def _employer_labour_compliance():
    """One row per central labour-law act the employer must comply with, from the
    seeded ComplianceMaster (the UI renders the detailed 10-rule register)."""
    seen = {}
    for m in ComplianceMaster.objects.filter(is_active=True).order_by("act", "form_number"):
        seen.setdefault(m.act, m)
    return [{
        "ruleId": m.id, "scope": "central", "status": "compliant",
        "note": _d(m.act), "verifiedAt": _dts(timezone.now()),
    } for m in seen.values()]


def _employer_payroll(user):
    return {
        "config": _contractor_payroll_config(user),
        "records": [],
        "templateColumns": [],
    }


def build_employer_portal(user):
    default_site = _default_site_info(getattr(user, "employer_profile", None))
    if default_site is None:
        # The first owned site is the implicit default when none was chosen.
        first = Site.objects.filter(employer=user).order_by("id").first()
        if first is not None:
            default_site = {"id": str(first.id), "name": _d(first.site_name), "code": _d(first.site_code)}
    return {
        "identity": _employer_identity(user),
        "stats": _employer_stats(user),
        "sites": _employer_sites(user),
        "defaultSite": default_site,
        "contractors": _employer_contractors(user),
        "workers": _employer_workers(user),
        "grievances": _employer_grievances(user),
        "approvals": _employer_approvals(user),
        "gatePasses": _employer_gate_passes(user),
        "submissions": _employer_submissions(user),
        "complianceReports": _employer_compliance_reports(user),
        "canAccessAdmin": False,
        "users": _employer_users(user),
        "permissionRoles": _employer_permission_roles(),
        "auditLogs": _employer_audit_logs(user),
        "routes": [],
        "workerDocuments": _employer_worker_documents(user),
        "activities": _employer_activities(user),
        "govtScope": "central",
        "labourCompliance": _employer_labour_compliance(),
        "profileSections": _employer_profile_sections(user),
        "licenses": _contractor_licenses(user),
        "payroll": _employer_payroll(user),
    }


# ---------------------------------------------------------------------------
# Government portal
# ---------------------------------------------------------------------------
def build_government_portal():
    workers = []
    for b in WorkerContractorBinding.objects.filter(binding_status="ACCEPTED")[:50]:
        wi = WorkerIdentity.objects.filter(user=b.worker).first()
        site = b.site
        employer_profile = getattr(site.employer, "employer_profile", None) if site else None
        contractor_profile = getattr(b.contractor, "contractor_profile", None)
        ss = WorkerSocialSecurity.objects.filter(user=b.worker).first()
        workers.append({
            "id": b.worker_id,
            "state": site.state if site else "",
            "district": site.district if site else "",
            "city": site.city if site else "",
            "age": wi.age if wi and wi.age else None,
            "gender": _d(wi.gender if wi else ""),
            "category": "",
            "occupation": "",
            "site": site.site_name if site else "",
            "siteType": site.site_type if site else "",
            "employer": _d(employer_profile.employer_name if employer_profile else ""),
            "contractor": _d(contractor_profile.contractor_name if contractor_profile else b.contractor.username),
            "migrant": False,
            "stateOfOrigin": "",
            "attendance": "PRESENT",
            "compliance": 100,
            "epfoLinked": bool(ss and ss.epfo_uan),
            "esicLinked": bool(ss and ss.esic_ip_number),
            "wage": 0,
        })
    return {
        "generatedAt": _dts(timezone.now()),
        "source": "BSS Registry",
        "states": list(GEOGRAPHY.keys()),
        "workers": workers,
    }


# ---------------------------------------------------------------------------
# Operations (BSS admin / staff)
# ---------------------------------------------------------------------------
def build_operations(role):
    return {
        "generatedAt": _dts(timezone.now()),
        "role": role,
        "metrics": {"uptime": "99.99%", "activeSessions": 0, "queueDepth": 0,
                    "failedJobs": 0, "openTickets": 0, "openCases": 0},
        "services": [],
        "logs": [],
        "tickets": [],
        "cases": [],
    }


# ---------------------------------------------------------------------------
# Notifications
# ---------------------------------------------------------------------------
CATEGORY_MAP = {
    "INFO": "info", "APPROVAL": "approval", "WARNING": "warning",
    "GRIEVANCE": "grievance", "COMPLIANCE": "compliance", "PAYROLL": "payroll",
}


def _notification(nid, category, title, message, href, created, read=False,
                  requires_action=True, priority="normal", entity_id=None):
    return {
        "id": nid,
        "entityId": entity_id,
        "category": category,
        "title": title,
        "message": message,
        "createdAt": _dts(created),
        "href": href,
        "actionLabel": "View",
        "priority": priority,
        "requiresAction": requires_action,
        "read": read,
        # `read` only clears the unread highlight. `resolved` means the underlying
        # workflow is finished and the item may be hidden — it must NOT be tied to
        # read, or marking a notification read (e.g. "mark all as read") makes it
        # vanish. The feed is derived from live state, so finished workflows simply
        # stop being emitted; emitted items are therefore never "resolved".
        "resolved": False,
    }


def _notification_actor_name(user_obj):
    """Best display name for the counterparty on a notification."""
    cp = getattr(user_obj, "contractor_profile", None)
    if cp:
        return _d(cp.trade_name) or _d(cp.contractor_name) or _d(user_obj.username)
    ep = getattr(user_obj, "employer_profile", None)
    if ep:
        return _d(ep.trade_name) or _d(ep.employer_name) or _d(user_obj.username)
    wi = getattr(user_obj, "worker_identity", None)
    if wi:
        return _d(wi.name) or _d(user_obj.username)
    return _d(user_obj.get_full_name()) or _d(user_obj.username)


def build_notifications(user):
    """Role-aware notification centre for worker / contractor / employer.

    BSS has no background job runner, so the feed is derived from live domain
    state (pending bindings, gate-pass approvals, job offers, grievances and
    missing documents) for every role, plus any persisted Notification rows.
    Read state for derived items is kept in UserPreference.notification_prefs
    under 'readNotificationIds' (the PATCH handler writes it)."""
    pref = UserPreference.objects.filter(user=user).first()
    read_ids = set((pref.notification_prefs or {}).get("readNotificationIds") or []) if pref else set()
    rows = []

    def emit(nid, category, title, message, href, created,
             requires_action=True, priority="normal", entity_id=None):
        rows.append(_notification(
            nid, category, title, message, href, created,
            read=nid in read_ids, requires_action=requires_action,
            priority=priority, entity_id=entity_id))

    if user.role == "worker":
        for b in (WorkerContractorBinding.objects
                  .filter(worker=user, binding_status="PENDING")
                  .select_related("contractor", "site").order_by("-created_at")[:10]):
            emit(f"wc-binding-{b.id}", "Approvals", "New engagement request",
                 f"{_notification_actor_name(b.contractor)} wants to engage you"
                 f"{' at ' + _d(b.site.site_name) if b.site else ''}.",
                 "/worker/binding", b.created_at, priority="high", entity_id=str(b.id))
        # Contractor asked to unbind — worker must confirm.
        for b in (WorkerContractorBinding.objects
                  .filter(worker=user, binding_status="ACCEPTED",
                          unbind_requested_at__isnull=False, unbind_consent_worker=False,
                          unbind_consent_contractor=True)
                  .select_related("contractor", "site").order_by("-unbind_requested_at")[:10]):
            emit(f"wc-unbind-{b.id}", "Approvals", "Unbind requested",
                 f"{_notification_actor_name(b.contractor)} wants to end your binding"
                 f"{' at ' + _d(b.site.site_name) if b.site else ''}. Confirm to unbind.",
                 "/worker/binding", b.unbind_requested_at, priority="high", entity_id=str(b.id))
        for r in (RozgarRequest.objects.filter(worker=user, status="PENDING")
                  .select_related("job").order_by("-created_at")[:10]):
            emit(f"rozgar-{r.id}", "Jobs", "New job offer",
                 f"You have a pending offer for {_d(r.job.job_title) if r.job else 'a role'}.",
                 "/worker/rozgar", r.created_at, priority="high", entity_id=str(r.id))
        for g in WorkerGatePass.objects.filter(worker=user).order_by("-created_at")[:5]:
            label = "Temporary" if g.gate_pass_type == "TGP" else "Permanent"
            if g.status == "PENDING":
                emit(f"gp-{g.id}", "Compliance", f"{label} gate pass pending",
                     f"Gate pass {g.gate_pass_no} is awaiting approval.",
                     "/worker/Compliance", g.created_at, priority="high")
            elif g.status == "ACTIVE":
                emit(f"gp-{g.id}", "Compliance", f"{label} gate pass active",
                     f"Gate pass {g.gate_pass_no} is active.",
                     "/worker/Compliance", g.created_at, requires_action=False)
        try:
            missing = _worker_documents_section(user).get("missing") or []
        except Exception:
            missing = []
        if missing:
            emit("docs-missing", "Documents", "Documents pending",
                 f"{len(missing)} mandatory document{'s' if len(missing) != 1 else ''} still to be uploaded.",
                 "/worker/Documents", timezone.now(), priority="high")
        for g in (WorkerGrievance.objects.filter(worker=user)
                  .exclude(status="RESOLVED").order_by("-created_at")[:5]):
            emit(f"grievance-{g.id}", "Grievances", "Grievance update",
                 f"Ticket {g.ticket_no or g.id} is {g.get_status_display()}.",
                 "/worker/grievances", g.created_at, requires_action=False,
                 entity_id=g.ticket_no or str(g.id))
        wi = getattr(user, "worker_identity", None)
        if wi and (not _d(wi.name) or not _d(wi.aadhaar) or not _d(wi.mobile_number)):
            emit("profile-incomplete", "Documents", "Complete your profile",
                 "Add the missing identity details to keep your record compliant.",
                 "/worker/Profile", timezone.now(), requires_action=False)

    elif user.role == "contractor":
        for b in (ContractorEmployerBinding.objects
                  .filter(contractor=user, binding_status="PENDING", consent_contractor=False)
                  .select_related("employer").order_by("-created_at")[:10]):
            emit(f"ce-binding-{b.id}", "Approvals", "New employer binding request",
                 f"{_notification_actor_name(b.employer)} has requested to engage your firm.",
                 "/contractor/qr/requests", b.created_at, priority="high", entity_id=str(b.id))
        for b in (WorkerContractorBinding.objects
                  .filter(contractor=user, binding_status="PENDING")
                  .select_related("worker", "site").order_by("-created_at")[:10]):
            emit(f"wc-binding-{b.id}", "Approvals", "Worker binding pending",
                 f"{_notification_actor_name(b.worker)} has a pending binding"
                 f"{' at ' + _d(b.site.site_name) if b.site else ''}.",
                 "/contractor/qr/requests", b.created_at, priority="high", entity_id=str(b.id))
        # Sites an employer has proposed that the contractor must approve.
        for a in (ContractorSiteAllotment.objects
                  .filter(binding__contractor=user, binding__binding_status="ACCEPTED",
                          status="PENDING", source="employer_allot")
                  .select_related("binding__employer", "site").order_by("-created_at")[:10]):
            emit(f"site-perm-{a.id}", "Sites", "Site permission requested",
                 f"{_notification_actor_name(a.binding.employer)} proposed "
                 f"{_d(a.site.site_name) if a.site else 'a site'} for your approval.",
                 "/contractor/qr/requests", a.created_at, priority="high", entity_id=str(a.id))
        # Employer asked to unbind a CE binding — contractor must confirm.
        for b in (ContractorEmployerBinding.objects
                  .filter(contractor=user, binding_status="ACCEPTED",
                          unbind_requested_at__isnull=False, unbind_consent_contractor=False,
                          unbind_consent_employer=True)
                  .select_related("employer").order_by("-unbind_requested_at")[:10]):
            emit(f"ce-unbind-{b.id}", "Approvals", "Unbind requested",
                 f"{_notification_actor_name(b.employer)} wants to end your binding. Confirm to unbind.",
                 "/contractor/qr/requests", b.unbind_requested_at, priority="high", entity_id=str(b.id))
        # Worker asked to unbind a WC binding — contractor must confirm.
        for b in (WorkerContractorBinding.objects
                  .filter(contractor=user, binding_status="ACCEPTED",
                          unbind_requested_at__isnull=False, unbind_consent_contractor=False,
                          unbind_consent_worker=True)
                  .select_related("worker", "site").order_by("-unbind_requested_at")[:10]):
            emit(f"wc-unbind-{b.id}", "Approvals", "Unbind requested",
                 f"{_notification_actor_name(b.worker)} wants to end their binding"
                 f"{' at ' + _d(b.site.site_name) if b.site else ''}. Confirm to unbind.",
                 "/contractor/qr/requests", b.unbind_requested_at, priority="high", entity_id=str(b.id))
        worker_ids = list(WorkerContractorBinding.objects
                          .filter(contractor=user).values_list("worker_id", flat=True))
        for g in (WorkerGrievance.objects.filter(worker_id__in=worker_ids)
                  .exclude(status="RESOLVED").order_by("-created_at")[:5]):
            emit(f"grievance-{g.id}", "Grievances", "Worker grievance",
                 f"Ticket {g.ticket_no or g.id} needs attention.",
                 "/contractor/grievances", g.created_at, requires_action=False,
                 entity_id=g.ticket_no or str(g.id))
        cp = getattr(user, "contractor_profile", None)
        if cp and (_d(cp.approval_status) or "PENDING") != "APPROVED":
            emit("contractor-review", "Approvals", "Contractor profile under review",
                 "Your registration is being verified. Keep your compliance documents up to date.",
                 "/contractor/profile", timezone.now(), requires_action=False)
        if not WorkerContractorBinding.objects.filter(contractor=user).exists():
            emit("bind-first-worker", "Sites", "Bind your first worker",
                 "Scan a worker QR or add workers manually to start building your workforce.",
                 "/contractor/workers", timezone.now(), requires_action=False)

    elif user.role == "employer":
        for b in (ContractorEmployerBinding.objects
                  .filter(employer=user, binding_status="PENDING", consent_employer=False)
                  .select_related("contractor").order_by("-created_at")[:10]):
            emit(f"ce-binding-{b.id}", "Approvals", "New contractor binding request",
                 f"{_notification_actor_name(b.contractor)} has requested to be bound to your organisation.",
                 "/employer/qr/requests", b.created_at, priority="high", entity_id=str(b.id))
        # Sites a contractor has requested that the employer must approve.
        for a in (ContractorSiteAllotment.objects
                  .filter(binding__employer=user, binding__binding_status="ACCEPTED",
                          status="PENDING", source="contractor_request")
                  .select_related("binding__contractor", "site").order_by("-created_at")[:10]):
            emit(f"site-perm-{a.id}", "Sites", "Site permission requested",
                 f"{_notification_actor_name(a.binding.contractor)} requested "
                 f"{_d(a.site.site_name) if a.site else 'a site'}.",
                 "/employer/qr/requests", a.created_at, priority="high", entity_id=str(a.id))
        # Contractor asked to unbind — employer must confirm.
        for b in (ContractorEmployerBinding.objects
                  .filter(employer=user, binding_status="ACCEPTED",
                          unbind_requested_at__isnull=False, unbind_consent_employer=False,
                          unbind_consent_contractor=True)
                  .select_related("contractor").order_by("-unbind_requested_at")[:10]):
            emit(f"ce-unbind-{b.id}", "Approvals", "Unbind requested",
                 f"{_notification_actor_name(b.contractor)} wants to end the binding. Confirm to unbind.",
                 "/employer/qr/requests", b.unbind_requested_at, priority="high", entity_id=str(b.id))
        for g in (WorkerGatePass.objects.filter(site__employer=user, status="PENDING")
                  .select_related("worker", "site").order_by("-created_at")[:10]):
            emit(f"gp-{g.id}", "Approvals", "Gate pass approval pending",
                 f"{_notification_actor_name(g.worker)} · {g.gate_pass_no} is awaiting your approval.",
                 "/employer/gate-pass", g.created_at, priority="high")
        worker_ids = list(WorkerContractorBinding.objects
                          .filter(site__employer=user).values_list("worker_id", flat=True))
        for g in (WorkerGrievance.objects.filter(worker_id__in=worker_ids)
                  .exclude(status="RESOLVED").order_by("-created_at")[:5]):
            emit(f"grievance-{g.id}", "Grievances", "Worker grievance",
                 f"Ticket {g.ticket_no or g.id} needs attention.",
                 "/employer/grievances", g.created_at, requires_action=False,
                 entity_id=g.ticket_no or str(g.id))
        ep = getattr(user, "employer_profile", None)
        if ep and (_d(ep.approval_status) or "PENDING") != "APPROVED":
            emit("employer-review", "Approvals", "Employer profile under review",
                 "Your organisation is being verified. Complete the pending details.",
                 "/employer/profile", timezone.now(), requires_action=False)
        if not Site.objects.filter(employer=user).exists():
            emit("add-first-site", "Sites", "Add your first site",
                 "Register a site so contractors and workers can be mapped to it.",
                 "/employer/sites", timezone.now(), requires_action=False)
        if not ContractorEmployerBinding.objects.filter(employer=user).exists():
            emit("bind-first-contractor", "Contractors", "Bind a contractor",
                 "Scan a contractor QR or send a binding request to onboard a contractor.",
                 "/employer/contractors", timezone.now(), requires_action=False)

    # Persisted Notification rows (for any workflow that creates them).
    for n in Notification.objects.filter(user=user).order_by("-created_at")[:50]:
        rows.append(_notification(
            f"db-{n.id}", CATEGORY_MAP.get(n.type, "Announcements"),
            _d(n.title), _d(n.body), _d(n.link) or "/", n.created_at,
            read=n.is_read, requires_action=not n.is_read))

    rows.sort(key=lambda row: row.get("createdAt") or "", reverse=True)
    return rows[:50]


# ---------------------------------------------------------------------------
# Identity verify
# ---------------------------------------------------------------------------
def build_identity_verify(bss_id):
    bss_id = (bss_id or "").strip()
    if bss_id.upper().startswith("BSS-E"):
        ep = EmployerProfile.objects.filter(employer_code=bss_id).first()
        if not ep:
            return None
        return {
            "id": ep.user_id,
            "name": _d(ep.employer_name),
            "company": _d(ep.trade_name),
            "bssId": _d(ep.employer_code),
            "verified": bool(ep.approval_status == "APPROVED"),
        }
    if bss_id.upper().startswith("BSS-C") or bss_id.upper().startswith("BSSC"):
        try:
            cp = ContractorProfile.objects.get(contractor_code=bss_id)
        except ContractorProfile.DoesNotExist:
            return None
        return {
            "id": cp.user_id,
            "name": _d(cp.contractor_name),
            "company": _d(cp.trade_name),
            "bssId": _d(cp.contractor_code),
            "verified": bool(cp.is_verified_badge),
        }
    wi = WorkerIdentity.objects.filter(bss_worker_id=bss_id).first()
    if not wi:
        return None
    sk = WorkerSkillsEmployability.objects.filter(user=wi.user).first()
    return {
        "identity": {
            "name": _d(wi.name), "bssId": _d(wi.bss_worker_id),
            "category": "", "aadhaarVerified": bool(wi.aadhaar),
            "photoUrl": _d(wi.photo),
        },
        "employment": {"status": ""},
        "skills": {
            "primary": {
                "name": _d(sk.primary_skill if sk else ""),
                "level": "novice",
                "experienceYears": _d(sk.skill_experience_years if sk else ""),
            }
        },
    }


def sha256_checksum(file_obj):
    hasher = hashlib.sha256()
    for chunk in file_obj.chunks():
        hasher.update(chunk)
    return hasher.hexdigest()


# ---------------------------------------------------------------------------
# BSS Admin payroll (system-wide supervisory view over the shared Worker model)
# ---------------------------------------------------------------------------
def build_admin_payroll(user):
    employers = []
    for ep in EmployerProfile.objects.select_related("user").all():
        employers.append({
            "bssId": _d(ep.employer_code),
            "name": _d(ep.employer_name) or ep.user.username,
        })

    contractors = []
    for cp in ContractorProfile.objects.select_related("user").all():
        contractors.append({
            "bssId": _d(cp.contractor_code),
            "name": _d(cp.contractor_name) or cp.user.username,
        })

    site_names = list(Site.objects.exclude(site_name="").values_list("site_name", flat=True))

    admin_workers = []
    seen = set()
    for b in WorkerContractorBinding.objects.filter(binding_status="ACCEPTED"):
        if b.worker_id in seen:
            continue
        seen.add(b.worker_id)
        wi = WorkerIdentity.objects.filter(user_id=b.worker_id).first()
        cp = getattr(b.contractor, "contractor_profile", None)
        ep = getattr(b.site.employer, "employer_profile", None) if b.site else None
        admin_workers.append({
            "bssId": _d(wi.bss_worker_id if wi else ""),
            "name": _d(wi.name if wi else b.worker.username),
            "employer": _d(ep.employer_name if ep else ""),
            "site": b.site.site_name if b.site else "",
            "contractor": _d(cp.contractor_name if cp else ""),
            "designation": _d(b.designation),
        })

    payroll_user = User.objects.filter(employer_profile__isnull=False,
                                       payroll_config__isnull=False).order_by("id").first()
    config = _contractor_payroll_config(payroll_user) if payroll_user else _contractor_payroll_config(None)

    records = []
    for w in WorkerWages.objects.select_related("worker", "site", "contractor").order_by("-period_start"):
        wi = WorkerIdentity.objects.filter(user_id=w.worker_id).first()
        binding = WorkerContractorBinding.objects.filter(worker_id=w.worker_id,
                                                         binding_status="ACCEPTED").first()
        site = w.site or (binding.site if binding else None)
        contractor_user = w.contractor or (binding.contractor if binding else None)
        cp = getattr(contractor_user, "contractor_profile", None) if contractor_user else None
        ep = getattr(site.employer, "employer_profile", None) if site else None

        gross = _num(w.gross_wage)
        basic = gross if not w.base_wage else float(w.base_wage)
        employee_pf = round(basic * 0.12, 2)
        employer_pf = round(basic * 0.12, 2)
        eps = round(basic * 0.0833, 2)
        edli = round(basic * 0.005, 2)
        admin = round(basic * 0.005, 2)
        employee_esi = round(gross * 0.0075, 2)
        employer_esi = round(gross * 0.0325, 2)
        employee_pt = 200.0
        employer_pt = 200.0
        lwf_employee = 12.0
        lwf_employer = 12.0
        total_deductions = _num(w.deductions_amount)
        net = _num(w.net_wage)
        employer_cost = round(gross + employer_pf + employer_esi + employer_pt + lwf_employer + admin, 2)

        status_map = {"DRAFT": "Draft", "APPROVED": "Reviewed", "PAID": "Verified",
                      "CANCELLED": "Exception"}
        status_label = status_map.get(w.status, "Draft")

        records.append({
            "id": f"PW{w.id}",
            "workerId": _d(wi.bss_worker_id if wi else ""),
            "workerName": _d(wi.name if wi else w.worker.username),
            "employer": _d(ep.employer_name if ep else ""),
            "site": site.site_name if site else "",
            "period": w.period_start.strftime("%b %Y") if w.period_start else "",
            "status": status_label,
            "attendanceDays": _num(w.days_present),
            "lopDays": _num(w.days_absent),
            "pfWage": round(basic, 2),
            "earnings": [{"component": "Basic + Allowances", "amount": round(gross, 2)}],
            "deductions": [{"component": "Statutory Deductions", "amount": round(total_deductions, 2)}],
            "contributions": {
                "employeePF": employee_pf, "employerPF": employer_pf, "eps": eps, "edli": edli,
                "admin": admin, "employeeESI": employee_esi, "employerESI": employer_esi,
                "employeePT": employee_pt, "employerPT": employer_pt,
                "lwfEmployee": lwf_employee, "lwfEmployer": lwf_employer,
            },
            "gross": round(gross, 2),
            "totalDeductions": round(total_deductions, 2),
            "netPay": round(net, 2),
            "employerCost": employer_cost,
            "updatedAt": _dts(w.updated_at),
            "updatedBy": _d(cp.contractor_name if cp else "") or _d(ep.employer_name if ep else "") or "System",
            "source": "Contractor" if contractor_user else "Employer",
            "matchState": "Needs Review",
            "contractor": _d(cp.contractor_name if cp else ""),
        })

    return {
        "dataMode": "remote",
        "generatedAt": _dts(timezone.now()),
        "employers": employers,
        "contractors": contractors,
        "sites": site_names,
        "workers": admin_workers,
        "payroll": {
            "config": config,
            "records": records,
            "templateColumns": ["id", "workerId", "workerName", "employer", "site", "contractor",
                                "period", "status", "gross", "netPay"],
        },
        "sourceNote": "Live database — DB-driven worker payroll across all employers",
    }
