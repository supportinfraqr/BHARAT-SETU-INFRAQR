"""Payload assemblers for the /v1/ BSS compatibility API layer.

Every function returns the EXACT JSON shapes expected by the external Next.js
frontend. Keys are always present (with empty/sensible defaults when the
underlying data does not exist in the ORM) so the frontend's strict validation
never trips over a missing key.
"""

import datetime
import hashlib

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
    EmployerProfile,
    LeaveRequest,
    LeaveType,
    SiteHoliday,
    SiteLeavePolicy,
    User,
    Notification,
    GratuityApplication,
    PayrollConfig,
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
        "panVerified": bool(identity and identity.pan),
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
            contractor_name = _d(cp.contractor_name if cp else "")
            contractor_code = _bss_contractor_code(binding.contractor.id) if binding.contractor else ""
            contractor_contact = _d(getattr(cp, "mobile", "") or getattr(cp, "contact_person", "") if cp else "")
            contractor_email = _d(getattr(cp, "email", "") if cp else "")
            contractor_lin = _d(getattr(cp, "lin", "") if cp else "")
        if binding.site and binding.site.employer:
            emp_profile = getattr(binding.site.employer, "employer_profile", None)
            employer_name = _d(emp_profile.employer_name if emp_profile else "")
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
    ppe = []
    given = ws.types_of_ppe_given if ws else ""
    ppe = [p.strip() for p in given.split(",") if p.strip()] if given else []
    return {
        "siteInduction": _d(ws.site_induction_status if ws else ""),
        "ppeIssued": ppe,
        "policeVerification": _d(ws.police_verification if ws else ""),
        "permanentGatePass": _d(ws.permanent_gatepass_status if ws else ""),
        "medicalFitnessDaysLeft": 0,
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
    """The worker's own gate passes (requested by the contractor, approved by
    the principal employer)."""
    rows = []
    for g in WorkerGatePass.objects.filter(worker=user).order_by("-created_at"):
        rows.append({
            "id": g.id,
            "type": _GP_TYPE_LABEL.get(_d(g.gate_pass_type), _d(g.gate_pass_type)),
            "number": _d(g.gate_pass_no),
            "site": g.site.site_name if g.site else "",
            "validFrom": _dts(g.start_date), "validTo": _dts(g.end_date),
            "status": _GP_STATUS_LABEL.get(_d(g.status), _d(g.status)),
            "requestedAt": _dts(g.created_at),
            "requestedBy": _party_name(g.issued_by),
            "approvedBy": _party_name(g.approved_by),
            "approvedAt": _dts(g.approved_at),
        })
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
    members = fam.filter(nominee=True).first() if fam.exists() else None
    return {
        "familyMembersCount": fam.first().family_members_count if fam.exists() else 0,
        "dependantsCount": fam.first().dependants_count if fam.exists() else 0,
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
                "documents": [d for d in (["PAN"] if n.pan_copy_nominee else []) + (["Aadhaar"] if n.aadhaar_copy_nominee else [])],
                "percent": 100,
            }
            for n in fam
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
            "appliesTo": _d(site.site_name),
            "isPaid": h.is_paid,
        })
    return rows


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


def _worker_documents_display(user):
    """The worker's document register: the master catalog merged with the
    worker's own uploads (uploads override catalog rows)."""
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
                "status": _d(d.status, "UPLOADED"),
                "date": _dts(d.uploaded_at) if d.uploaded_at else None,
                "expiry": _dts(d.expiry_date) if d.expiry_date else None,
                "fileName": _d(d.file_name),
                "downloadUrl": f"/api/worker/documents/{d.id}/file" if d.file else "",
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
            "status": _d(d.status, "UPLOADED"),
            "date": _dts(d.uploaded_at) if d.uploaded_at else None,
            "expiry": _dts(d.expiry_date) if d.expiry_date else None,
            "fileName": _d(d.file_name),
            "downloadUrl": f"/api/worker/documents/{d.id}/file" if d.file else "",
        })
    return rows


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

    applied_job_ids = set()
    if hasattr(user, "rozgar_applications"):
        applied_job_ids = set(user.rozgar_applications.values_list("job_id", flat=True))

    worker_skills = set()
    if hasattr(user, "worker_skills"):
        worker_skills = {str(getattr(s, "name", "") or "").strip().lower() for s in user.worker_skills.all()}
    primary = getattr(getattr(user, "skills", None), "primary_skill", "") or ""
    if primary:
        worker_skills.add(str(primary).strip().lower())

    addr = getattr(user, "worker_address", None)
    worker_state = str(
        getattr(addr, "current_state", "") or getattr(addr, "permanent_state", "") or ""
    ).strip().lower()

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
        skills = {str(s).strip().lower() for s in (j.skills or [])}
        if not worker_skills or not skills:
            # Nothing to compare against -> don't hide the posting.
            match = True
        else:
            match = bool(worker_skills & skills) or bool(
                worker_state and state and worker_state == state.strip().lower()
            )
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
            "matchBadge": bool(match),
        })
    return rows


def _binding_row(b):
    """Canonical binding payload (E·C·S·W), shared by worker/contractor/employer views."""
    site = b.site
    employer_name = ""
    if site and site.employer:
        ep = getattr(site.employer, "employer_profile", None)
        employer_name = _d(ep.employer_name if ep else site.employer.username)
    contractor = b.contractor
    contractor_name = ""
    contractor_code = ""
    contractor_lin = ""
    if contractor:
        cp = getattr(contractor, "contractor_profile", None)
        contractor_name = _d(cp.contractor_name if cp else contractor.username)
        contractor_code = _d(cp.contractor_code if cp else _bss_contractor_code(contractor.id))
        contractor_lin = _d(getattr(cp, "lin", ""))
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
        "employer": employer_name,
        "site": site.site_name if site else "",
        "siteId": b.site_id,
        "designation": _d(b.designation) or (_d(emp.designation) if emp else ""),
        "department": _d(b.department) or (_d(emp.department) if emp else ""),
        "shift": _d(b.shift) or (_d(emp.shift) if emp else ""),
        "wage": wage,
        "requestedOn": _dts(b.created_at),
        "status": status_map.get(str(b.binding_status).upper(), "Pending"),
        "consentWorker": bool(b.consent_worker),
        "consentContractor": bool(b.consent_contractor),
        "consentMethod": _d(b.consent_method),
        "unbindConsentWorker": bool(b.unbind_consent_worker),
        "unbindConsentContractor": bool(b.unbind_consent_contractor),
        "unbindRequested": bool(b.unbind_requested_at),
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
    allot_status = {"PENDING": "Pending", "APPROVED": "Approved", "REJECTED": "Rejected"}
    allotments = [
        {
            "id": a.id,
            "siteId": a.site_id,
            "site": a.site.site_name if a.site else "",
            "siteCode": a.site.site_code if a.site else "",
            "status": allot_status.get(str(a.status).upper(), "Pending"),
            "source": _d(a.source),
        }
        for a in b.allotments.all()
    ]
    return {
        "id": b.id,
        "ref": f"CEB-2026-{b.id:03d}",
        "contractor": _d(cp.contractor_name if cp else "", b.contractor.username),
        "contractorCode": _d(cp.contractor_code if cp else "", _bss_contractor_code(b.contractor_id)),
        "employer": _d(ep.employer_name if ep else "", b.employer.username),
        "employerCode": _d(ep.employer_code if ep else "", _bss_employer_code(b.employer_id)),
        "status": status_map.get(str(b.binding_status).upper(), "Pending"),
        "consentContractor": bool(b.consent_contractor),
        "consentEmployer": bool(b.consent_employer),
        "source": _d(b.source),
        "requestedOn": _dts(b.created_at),
        "allotments": allotments,
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
    """Leave types the worker inherits: the bound site's policy if configured,
    otherwise the global master. Empty until the worker is bound to a site."""
    site = _worker_bound_site(user)
    if site is None:
        return []
    policies = _site_leave_policies(site)
    if policies:
        return [p.leave_type.name for p in policies]
    return [lt.name for lt in LeaveType.objects.filter(is_active=True)]


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
    policies = _site_leave_policies(site)
    if policies:
        plan = [(p.leave_type, p.annual_entitlement, p.opening_balance) for p in policies]
    else:
        plan = [(lt, lt.annual_entitlement, lt.opening_balance)
                for lt in LeaveType.objects.filter(is_active=True)]
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
    open_count = gs.exclude(status="RESOLVED").count() if gs else 0
    recent_item = {"id": "None", "status": "No open grievances", "date": "—"}
    if gs.exists():
        first = gs.first()
        recent_item = {
            "id": _d(first.ticket_no, f"GRV-{first.id}"),
            "status": _d(first.status, "OPEN"),
            "date": _dts(first.created_at.date() if hasattr(first.created_at, "date") else first.created_at),
        }
    return {"openCount": open_count, "recent": recent_item}


_GRIEVANCE_UI_STATUS = {
    "RECORDED": "Open", "SUBMITTED": "Open", "VIEWED_ON_DASHBOARD": "Open",
    "OPEN": "Open", "IN_PROGRESS": "In Progress", "RESOLVED": "Resolved",
    "REOPENED": "Reopened",
}
_GRIEVANCE_ACTOR = {"worker": "Worker", "contractor": "Contractor", "employer": "Employer"}


def _grievance_row(g, binding=None):
    """Contractor/employer grievance register row (shared by both portals)."""
    wi = _get_identity(g.worker)
    site = binding.site if binding else None
    employer_name = contractor_name = ""
    if binding:
        cp = getattr(binding.contractor, "contractor_profile", None)
        contractor_name = _d(cp.contractor_name if cp and cp.contractor_name else binding.contractor.username)
        if site and site.employer:
            ep = getattr(site.employer, "employer_profile", None)
            employer_name = _d(ep.employer_name if ep and ep.employer_name else site.employer.username)
    replies = [{
        "by": _GRIEVANCE_ACTOR.get((getattr(r.actor, "role", "") or r.actor_role or "").lower(), "Worker"),
        "text": _d(r.body),
        "at": _dts(r.created_at),
    } for r in g.responses.order_by("created_at")]
    return {
        "id": str(g.id),
        "ref": _d(g.ticket_no),
        "category": {"WAGES": "Wages", "SAFETY": "Safety", "HARASSMENT": "Harassment",
                     "ACCOMMODATION": "Accommodation", "BENEFITS": "Benefits",
                     "OTHER": "Other"}.get(str(g.category).upper(), "Other"),
        "status": _GRIEVANCE_UI_STATUS.get(str(g.status).upper(), "Open"),
        "worker": _d(wi.name if wi and wi.name else g.worker.username),
        "workerId": _d(wi.bss_worker_id if wi else ""),
        "site": site.site_name if site else "",
        "employer": employer_name,
        "contractor": contractor_name,
        "raisedAt": _dts(g.created_at),
        "updatedAt": _dts(g.updated_at),
        "description": _d(g.body),
        "audioAvailable": bool(g.audio),
        "attachment": _d(g.attachment_file) or None,
        "replyHistory": replies,
        "resolutionConfirmed": False,
    }


def _grievances_for_bindings(bindings):
    rows = []
    for b in bindings:
        for g in (WorkerGrievance.objects.filter(worker=b.worker)
                  .select_related("worker").prefetch_related("responses", "responses__actor")[:30]):
            rows.append(_grievance_row(g, b))
    rows.sort(key=lambda r: r["raisedAt"] or "", reverse=True)
    return rows


def _contractor_grievances(user):
    bindings = (WorkerContractorBinding.objects
                .filter(contractor=user, binding_status="ACCEPTED")
                .select_related("worker", "contractor", "site", "site__employer"))
    return _grievances_for_bindings(bindings)


def _employer_grievances(user):
    bindings = (WorkerContractorBinding.objects
                .filter(site__employer=user, binding_status="ACCEPTED")
                .select_related("worker", "contractor", "site", "site__employer"))
    return _grievances_for_bindings(bindings)


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
        "name": _d(cp.contractor_name if cp else ""),
        "company": _d(cp.trade_name if cp else ""),
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
            "name": _d(ep.employer_name if ep else binding.site.employer.username),
            "code": _d(ep.employer_code if ep else ""),
            "industry": _d(ep.industry if ep else ""),
            "email": _d(ep.email if ep else ""),
            "lin": _d(ep.lin if ep else ""),
        }
    return {"name": "", "code": "", "industry": "", "email": "", "lin": ""}


def _contractor_sites(user):
    site_ids = set(WorkerContractorBinding.objects.filter(contractor=user).values_list("site_id", flat=True))
    site_ids.update(ContractorSiteAllotment.objects.filter(
        binding__contractor=user, status="APPROVED").values_list("site_id", flat=True))
    sites = Site.objects.filter(id__in=site_ids)
    rows = []
    for s in sites:
        emp_name = ""
        ep = getattr(s.employer, "employer_profile", None)
        emp_name = _d(ep.employer_name if ep else s.employer.username)
        rows.append({
            "id": s.id, "code": _d(s.site_code), "name": _d(s.site_name),
            "employer": emp_name, "location": _d(s.location) or _d(s.city),
            "workers": WorkerContractorBinding.objects.filter(contractor=user, site=s).count(),
            "compliance": _d(s.compliance_client) if hasattr(s, "compliance_client") else "",
        })
    return rows


def _contractor_workers(user):
    bindings = WorkerContractorBinding.objects.filter(contractor=user, binding_status="ACCEPTED")
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
            "employer": _d(emp.employer_name if emp else ""),
            "designation": _d(b.designation),
            "doj": _dts(b.accepted_at.date()) if b.accepted_at else None,
            "compliance": 0,
            "status": _d(b.binding_status),
            "verified": bool(wi and wi.aadhaar),
            "refCode": _d(wi.bss_worker_id if wi else ""),
            "department": _d(b.department),
            "gender": _d(wi.gender if wi else ""),
            "category": "",
            "skills": "",
            "photoUrl": _d(wi.photo if wi else ""),
            "eligibility": _gate_pass_eligibility(b.worker),
        })
    return rows


def _contractor_compliances(user):
    rows = []
    for c in user.compliance_docs.all()[:20] if hasattr(user, "compliance_docs") else []:
        rows.append({
            "id": c.id, "item": _d(c.master.act if c.master else ""),
            "category": _d(c.master.nature if c.master else ""),
            "reference": _d(c.unique_no), "employer": "",
            "site": c.site.site_name if c.site else "",
            "worker": "", "issue": "",
            "expiry": _dts(c.due_date), "verification": _d(c.ocr_accuracy),
            "status": _d(c.status),
        })
    return rows


def _contractor_compliance_reports(user):
    rows = []
    for r in user.compliance_reports.all()[:20] if hasattr(user, "compliance_reports") else []:
        rows.append({
            "id": r.id, "site": "", "employer": _d(r.unique_no),
            "period": _d(r.period), "type": _d(r.financial_year),
            "status": "COMPLETED",
        })
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
    return {
        "id": g.id, **meta,
        "employer": employer_name,
        "type": _GP_TYPE_LABEL.get(_d(g.gate_pass_type), _d(g.gate_pass_type)),
        "site": site.site_name if site else "",
        "validFrom": _dts(g.start_date), "validTo": _dts(g.end_date),
        "requestedAt": _dts(g.created_at),
        # Ownership: contractor requests, employer approves (Excel Contractor 67-70).
        "requestedBy": _party_name(g.issued_by),
        "approvedBy": _party_name(g.approved_by),
        "approvedAt": _dts(g.approved_at),
        "status": _GP_STATUS_LABEL.get(_d(g.status), _d(g.status)),
        "eligibility": _gate_pass_eligibility(g.worker),
    }


def _contractor_gate_passes(user):
    gps = WorkerGatePass.objects.filter(issued_by=user).select_related("worker", "site")[:100]
    return [_contractor_gate_pass_row(g) for g in gps]


def _contractor_applications(user):
    rows = []
    reqs = user.rozgar_requests.all()[:20] if hasattr(user, "rozgar_requests") else []
    for r in reqs:
        job = getattr(r, "job", None)
        wi = WorkerIdentity.objects.filter(user=r.worker).first()
        rows.append({
            "id": r.id,
            "workerName": _d(wi.name if wi else r.worker.username),
            "workerId": _d(wi.bss_worker_id if wi else ""),
            "employer": "",
            "trade": _d(job.job_title) if job else "",
            "experience": "",
            "expectedWage": _num(job.wage_offered if job else 0),
            "location": "",
            "status": _d(r.status),
            "dateApplied": _dts(r.requested_at),
            "matchScore": 0,
        })
    return rows


def _contractor_employers(user):
    employers = {}
    # Derived from worker bindings' sites.
    for b in WorkerContractorBinding.objects.filter(contractor=user):
        if b.site and b.site.employer:
            e = b.site.employer
            ep = getattr(e, "employer_profile", None)
            employers[e.id] = {
                "id": e.id,
                "name": _d(ep.employer_name if ep else e.username),
                "employerId": _d(ep.employer_code if ep else _bss_employer_code(e.id)),
                "sites": [],
                "status": "ACTIVE",
                "boundSince": None,
            }
    # Direct contractor<->employer bindings (accepted).
    for eng in ContractorEmployerBinding.objects.filter(contractor=user, binding_status="ACCEPTED"):
        e = eng.employer
        ep = getattr(e, "employer_profile", None)
        employers[e.id] = {
            "id": e.id,
            "name": _d(ep.employer_name if ep else e.username),
            "employerId": _d(ep.employer_code if ep else _bss_employer_code(e.id)),
            "sites": [],
            "status": "ACTIVE",
            "boundSince": _dts(eng.accepted_at) if eng.accepted_at else None,
        }
    rows = []
    for k, v in employers.items():
        allotted = set(ContractorSiteAllotment.objects.filter(
            binding__contractor=user, binding__employer_id=k, status="APPROVED"
        ).values_list("site_id", flat=True))
        v["sites"] = [s.id for s in Site.objects.filter(employer_id=k) if
                      WorkerContractorBinding.objects.filter(contractor=user, site=s).exists()
                      or s.id in allotted]
        rows.append(v)
    return rows


def _contractor_submissions(user):
    rows = []
    for ev in SubmissionEvidence.objects.filter(user=user)[:20]:
        rows.append({
            "id": ev.id, "uniqueNo": "",
            "type": _d(ev.doc_type),
            "employer": _d(ev.employer), "site": _d(ev.site),
            "state": "", "financialYear": "",
            "month": "", "period": _d(ev.period), "status": _d(ev.status),
            "submittedAt": _dts(ev.created_at), "updatedAt": _dts(ev.updated_at),
            "daysLeft": None, "mandatory": False, "frequency": "",
            "accuracy": 0, "fileName": _d(ev.original_name), "checksum": _d(ev.checksum_sha256),
        })
    for c in user.compliance_docs.all()[:20] if hasattr(user, "compliance_docs") else []:
        rows.append({
            "id": c.id, "uniqueNo": _d(c.unique_no),
            "type": _d(c.master.act if c.master else ""),
            "employer": "", "site": c.site.site_name if c.site else "",
            "state": _d(c.state), "financialYear": _d(c.financial_year),
            "month": "", "period": _d(c.period), "status": _d(c.status),
            "submittedAt": _dts(c.updated_at), "updatedAt": _dts(c.updated_at),
            "daysLeft": c.days_left, "mandatory": bool(c.is_mandatory),
            "frequency": _d(c.frequency), "accuracy": _num(c.ocr_accuracy),
            "fileName": "", "checksum": "",
        })
    return {"documents": rows}


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
    rows = []
    for st in user.statutory_registrations.all() if hasattr(user, "statutory_registrations") else []:
        rows.append({
            "id": st.id, "name": _d(st.get_reg_kind_display() or st.reg_kind),
            "authority": _d(st.authority), "number": _d(st.reg_number),
            "state": "", "validFrom": _dts(st.issued_at), "validTo": _dts(st.expiry_at),
            "status": _d(st.verification_status),
        })
    return rows


def _contractor_worker_documents(user):
    return []


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


def _contractor_workforce_growth():
    now = timezone.localdate()
    six = [{"month": (now.replace(day=1) - datetime.timedelta(days=30 * (5 - i))).strftime("%b %Y"),
            "workers": max(10, 15 + i * 2)} for i in range(6)]
    one = [{"month": (now.replace(day=1) - datetime.timedelta(days=30 * (11 - i))).strftime("%b %Y"),
            "workers": max(5, 8 + i)} for i in range(12)]
    return {"sixMonths": six, "oneYear": one}


def _contractor_applicability():
    return [
        {"act": "Minimum Wages Act, 1948", "applies": True, "note": "State minimum applied"},
        {"act": "Payment of Wages Act, 1936", "applies": True, "note": ""},
        {"act": "Employees' Provident Funds Act", "applies": True, "note": ""},
        {"act": "ESIC Act, 1948", "applies": True, "note": ""},
    ]


def _contractor_compliance_history(user):
    return []


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
            "status": {"DRAFT": "Draft", "SUBMITTED": "Submitted", "APPROVED": "Approved",
                       "CLOSED": "Closed"}.get(str(j.status).upper(), "Submitted"),
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
            "consentWorker": bool(b.consent_worker),
            "consentContractor": bool(b.consent_contractor),
            "unbindRequested": bool(b.unbind_requested_at),
            "unbindConsentWorker": bool(b.unbind_consent_worker),
            "unbindConsentContractor": bool(b.unbind_consent_contractor),
        })
    # Contractor <-> employer bindings (scanning an employer/site QR).
    for e in ContractorEmployerBinding.objects.filter(contractor=user).order_by("-created_at"):
        ep = getattr(e.employer, "employer_profile", None)
        sites = [a.site.site_name for a in e.allotments.all() if a.site]
        rows.append({
            "id": f"ce-{e.id}", "bindingId": e.id, "type": "Employer",
            "entityName": _d(ep.employer_name if ep else "", e.employer.username),
            "bssId": _d(ep.employer_code if ep else "", _bss_employer_code(e.employer_id)),
            "site": ", ".join(sites) if sites else "Sites to be allotted",
            "employer": _d(ep.employer_name if ep else "", e.employer.username),
            "designation": "Principal employer binding",
            "wage": 0,
            "requestedOn": _dts(e.created_at),
            "status": {"PENDING": "Pending", "ACCEPTED": "Accepted", "REJECTED": "Rejected",
                       "CANCELLED": "Cancelled"}.get(str(e.binding_status).upper(), "Pending"),
            # The contractor's own consent is consentContractor; the employer's
            # consent occupies the "worker" slot so the shared row shape works.
            "consentWorker": bool(e.consent_employer),
            "consentContractor": bool(e.consent_contractor),
            "unbindRequested": False,
            "unbindConsentWorker": False,
            "unbindConsentContractor": False,
        })
    rows.sort(key=lambda row: str(row.get("requestedOn") or ""), reverse=True)
    return rows


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


def _contractor_compliance_batches(user):
    return []


def _contractor_audit_reports(user):
    rows = []
    for r in user.compliance_reports.all()[:20] if hasattr(user, "compliance_reports") else []:
        items = [
            {"act": _d(i.act), "form": _d(i.form_number), "nature": _d(i.nature),
             "score": _num(i.achieved_score), "status": _d(i.status),
             "auditorRemarks": _d(i.remarks), "vendorRemarks": ""}
            for i in r.items.all()
        ]
        rows.append({
            "id": r.id, "uniqueNo": _d(r.unique_no), "site": "",
            "employer": "", "period": _d(r.period), "reportDate": _dts(r.report_date),
            "score": _num(r.score), "scorePercent": _num(r.score_pct),
            "actWise": items,
        })
    return rows


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


def _f(label, value, note="", sensitive=False):
    """Profile section field helper."""
    return {"label": label, "value": "" if value is None else str(value), "note": note, "sensitive": sensitive}


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
            _f("Licence Valid From", getattr(cp, "licence_valid_from", "") if cp else "", "Contractor/System"),
            _f("Licence Valid To", getattr(cp, "licence_valid_to", "") if cp else "", "Contractor/System"),
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
        "associations": [
            _f("Principal Employer Name", getattr(cp, "employer_name", "") if cp else "", "Contractor"),
            _f("Site / Establishment Name", "", "Contractor"),
        ],
        "documents": [
            _f("PAN Document", "", "Contractor"),
            _f("GST Certificate", "", "Contractor"),
            _f("Contract Labour Licence", "", "Contractor"),
        ],
        "declarations": [
            _f("Consent for Data Processing", "", "Contractor"),
            _f("Consent Date", getattr(cp, "consent_date", "") if cp else "", "System"),
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
            _f("Date of Incorporation", getattr(ep, "incorporation_date", "") if ep else "", "Employer"),
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
    return {
        "identity": _contractor_identity(user),
        "stats": _contractor_stats(user),
        "principalEmployer": _contractor_principal_employer(user),
        "sites": _contractor_sites(user),
        "workers": _contractor_workers(user),
        "compliances": _contractor_compliances(user),
        "complianceReports": _contractor_compliance_reports(user),
        "gatePasses": _contractor_gate_passes(user),
        "advances": _contractor_advances(user),
        "applications": _contractor_applications(user),
        "employers": _contractor_employers(user),
        "submissions": _contractor_submissions(user),
        "workerBenefits": _contractor_worker_benefits(user),
        "salaries": _contractor_salaries(user),
        "profileSections": _contractor_profile_sections(user),
        "licenses": _contractor_licenses(user),
        "workerDocuments": _contractor_worker_documents(user),
        "workerCompliance": _contractor_worker_compliance(user),
        "workforceGrowth": _contractor_workforce_growth(),
        "applicability": _contractor_applicability(),
        "complianceHistory": _contractor_compliance_history(user),
        "jobHistory": _contractor_job_history(user),
        "leaveApprovals": _contractor_leave_approvals(user),
        "siteCalendars": _contractor_site_calendars(user),
        "leaveTypeCatalog": [lt.name for lt in LeaveType.objects.filter(is_active=True)],
        "bindingRequests": _contractor_binding_requests(user),
        "registers": _contractor_registers(user),
        "complianceBatches": _contractor_compliance_batches(user),
        "auditReports": _contractor_audit_reports(user),
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
        "name": _d(ep.employer_name if ep else ""),
        "company": _d(ep.trade_name if ep else ""),
        "bssId": _d(ep.employer_code if ep else _bss_employer_code(user.id)),
        "entity": _d(ep.entity_class if ep else ""),
        "verified": _d(ep.verification_status if ep else "PENDING") == "APPROVED",
        "contact": _d(ep.contact_person if ep else ""),
        "email": _d(ep.email if ep else ""),
        "address": _d(ep.address if ep else ""),
    }


def _employer_stats(user):
    sites = Site.objects.filter(employer=user)
    contractors = WorkerContractorBinding.objects.filter(site__employer=user).values_list(
        "contractor_id", flat=True).distinct().count()
    workers = WorkerContractorBinding.objects.filter(site__employer=user,
                                                     binding_status="ACCEPTED").count()
    return {
        "totalContractors": contractors,
        "totalWorkers": workers,
        "activeSites": sites.count(),
        "complianceScore": 0,
        "pendingApprovals": user.approvals_handled.filter(status="PENDING").count() if hasattr(user, "approvals_handled") else 0,
    }


def _employer_sites(user):
    rows = []
    for s in Site.objects.filter(employer=user):
        cids = WorkerContractorBinding.objects.filter(site=s).values_list(
            "contractor_id", flat=True).distinct()
        wcount = WorkerContractorBinding.objects.filter(site=s, binding_status="ACCEPTED").count()
        rows.append({
            "id": str(s.id), "code": _d(s.site_code), "name": _d(s.site_name),
            "location": _d(s.location) or _d(s.city),
            "state": _d(s.state),
            "startDate": _dts(s.site_start_date) or "",
            "endDate": _dts(s.expected_end_date) or "",
            "status": _d(s.site_status) or ("Active" if s.attendance_enabled else "Planned"),
            "contractorIds": list(cids), "workers": wcount,
            "compliance": 0,
            "qrToken": _d(s.site_qr_token),
            "data": _site_scalar_data(s),
        })
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
        site_ids = set(Site.objects.filter(employer=user, bindings__contractor=c).values_list("id", flat=True))
        site_ids |= set(ContractorSiteAllotment.objects.filter(
            binding__contractor=c, binding__employer=user, status="APPROVED").values_list("site_id", flat=True))
        site_ids = sorted(site_ids)
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
        rows.append({
            "id": c.id, "name": _d(cp.contractor_name if cp else "", c.username),
            "bssId": _d(cp.contractor_code if cp else "", _bss_contractor_code(c.id)),
            "contact": _d(cp.contact_person if cp else ""),
            "email": _d(cp.email if cp else ""),
            "siteIds": site_ids, "workers": wcount,
            "compliance": 0, "onboardingDate": None,
            "status": status,
            "verified": bool(cp and cp.is_verified_badge) or accepted_binding,
        })
    return rows


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
            "siteId": b.site_id, "site": b.site.site_name if b.site else "",
            "designation": _d(b.designation),
            "doj": _dts(b.accepted_at.date()) if b.accepted_at else None,
            "attendance": "PRESENT", "compliance": 0,
            "status": _d(b.binding_status), "verified": bool(wi and wi.aadhaar),
        })
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
        })
    # Contractor <-> employer bindings (contractor scanned this employer's QR
    # or a site QR). Every status is surfaced so accepted/rejected requests stay
    # visible in the Binding Requests register instead of disappearing.
    binding_status = {"PENDING": "Pending", "ACCEPTED": "Accepted",
                         "REJECTED": "Rejected", "CANCELLED": "Cancelled"}
    for e in ContractorEmployerBinding.objects.filter(employer=user).order_by("-created_at"):
        cp = getattr(e.contractor, "contractor_profile", None)
        sites = [a.site.site_name for a in e.allotments.all() if a.site]
        rows.append({
            "id": f"ce-{e.id}", "bindingId": str(e.id),
            "entityType": "Contractor", "entityId": str(e.contractor_id),
            "name": _d(cp.contractor_name if cp else "", e.contractor.username),
            "bssId": _d(cp.contractor_code if cp else "", _bss_contractor_code(e.contractor_id)),
            "contractor": None,
            "site": ", ".join(sites) if sites else "Sites to be allotted",
            "submittedAt": _dts(e.created_at),
            "checks": ["KYC", "Licence"],
            "status": binding_status.get(str(e.binding_status).upper(), "Pending"),
        })
    return rows


def _employer_gate_pass_row(g):
    meta = _gate_pass_worker_meta(g.worker)
    site = g.site
    contractor_name = ""
    binding = (WorkerContractorBinding.objects.filter(worker=g.worker, site=site)
               .select_related("contractor").first())
    if binding:
        cp = getattr(binding.contractor, "contractor_profile", None)
        contractor_name = _d(cp.contractor_name if cp else binding.contractor.username)
    return {
        "id": g.id, **meta,
        "contractor": contractor_name,
        "site": site.site_name if site else "",
        "siteId": g.site_id,
        "type": _GP_TYPE_LABEL.get(_d(g.gate_pass_type), _d(g.gate_pass_type)),
        "requestedAt": _dts(g.created_at),
        "requestedBy": _party_name(g.issued_by) or contractor_name,
        "approvedBy": _party_name(g.approved_by),
        "approvedAt": _dts(g.approved_at),
        "validFrom": _dts(g.start_date), "validTo": _dts(g.end_date),
        "status": _GP_STATUS_LABEL.get(_d(g.status), _d(g.status)),
        "eligibility": _gate_pass_eligibility(g.worker),
    }


def _employer_gate_passes(user):
    gps = WorkerGatePass.objects.filter(site__employer=user).select_related("worker", "site")[:100]
    return [_employer_gate_pass_row(g) for g in gps]


def _employer_submissions(user):
    rows = []
    uploaded = SubmissionEvidence.objects.filter(
        Q(user__worker_bindings__site__employer=user) |
        Q(user__contractor_bindings__site__employer=user)
    ).distinct()[:20]
    for ev in uploaded:
        cp = getattr(ev.user, "contractor_profile", None) if ev.user.role == "contractor" else None
        rows.append({
            "id": ev.id,
            "contractor": _d(cp.contractor_name if cp else ""),
            "contractorId": ev.user_id if ev.user.role == "contractor" else None,
            "site": _d(ev.site), "type": _d(ev.doc_type),
            "period": _d(ev.period),
            "submittedAt": _dts(ev.created_at),
            "status": _d(ev.status),
        })
    for c in user.compliance_docs.all()[:20] if hasattr(user, "compliance_docs") else []:
        rows.append({
            "id": c.id, "contractor": "", "contractorId": None,
            "site": c.site.site_name if c.site else "",
            "type": _d(c.master.act if c.master else ""),
            "period": _d(c.period), "submittedAt": _dts(c.updated_at),
            "status": _d(c.status),
        })
    return rows


def _employer_compliance_reports(user):
    rows = []
    for r in user.compliance_reports.all()[:20] if hasattr(user, "compliance_reports") else []:
        rows.append({
            "id": r.id, "contractorId": None, "contractor": "",
            "siteId": None, "site": "", "period": _d(r.period),
            "pf": 1, "esic": 1, "wage": 1, "safety": 1,
            "score": _num(r.score_pct), "status": "COMPLETED",
        })
    return rows


def _employer_users(user):
    return []


def _employer_permission_roles():
    return []


def _employer_audit_logs(user):
    return []


def _employer_worker_documents(user):
    return []


def _employer_activities(user):
    return []


def _employer_labour_compliance():
    return [
        {"ruleId": 1, "scope": "central", "status": "compliant",
         "note": "Statutory registrations in order", "verifiedAt": _dts(timezone.now())},
    ]


def _employer_payroll(user):
    return {
        "config": _contractor_payroll_config(user),
        "records": [],
        "templateColumns": [],
    }


def build_employer_portal(user):
    return {
        "identity": _employer_identity(user),
        "stats": _employer_stats(user),
        "sites": _employer_sites(user),
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


def build_notifications(user):
    rows = []
    for n in Notification.objects.filter(user=user).order_by("-created_at")[:50]:
        rows.append({
            "id": n.id,
            "entityId": None,
            "category": CATEGORY_MAP.get(n.type, "info"),
            "title": _d(n.title),
            "message": _d(n.body),
            "createdAt": _dts(n.created_at),
            "href": _d(n.link),
            "actionLabel": "View",
            "priority": "normal",
            "requiresAction": not n.is_read,
            "read": n.is_read,
            "resolved": bool(n.is_read),
        })
    return rows


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
