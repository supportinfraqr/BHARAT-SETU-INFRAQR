"""Base helpers, geography data, ORM imports and shared constants for the v1 payload layer."""

# ruff: noqa: F401,F403
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
_GP_WELFARE_LABEL = {"ACTIVE": "Active", "PENDING": "Pending Approval", "REJECTED": "Rejected",
                     "EXPIRED": "Expired", "REVOKED": "Revoked"}
_RH_STATUS = {"PENDING": "Pending", "APPROVED": "Approved",
              "REJECTED": "Rejected", "CANCELLED": "Cancelled"}
_DIGILOCKER_DOC_CODES = {"AADHAR", "PAN", "UAN", "EDU"}
_CE_SOURCE_INITIATOR = {"site_qr": "Contractor", "employer_qr": "Contractor",
                        "contractor_qr": "Employer"}
_GRIEVANCE_UI_STATUS = {
    "RECORDED": "Submitted", "SUBMITTED": "Submitted", "VIEWED_ON_DASHBOARD": "Open",
    "OPEN": "Open", "IN_PROGRESS": "In Progress", "RESOLVED": "Resolved",
    "REOPENED": "Reopened", "CLOSED": "Closed",
}
_GRIEVANCE_ACTOR = {"worker": "Worker", "contractor": "Contractor", "employer": "Employer", "bss": "BSS"}
_GRIEVANCE_CATEGORY = {"WAGES": "Wages", "SAFETY": "Safety", "HARASSMENT": "Harassment",
                       "ACCOMMODATION": "Accommodation", "BENEFITS": "Benefits", "OTHER": "Other"}
_WORKER_BINDING_STATUS = {"PENDING": "Pending", "ACCEPTED": "Accepted",
                          "REJECTED": "Rejected", "CANCELLED": "Cancelled",
                          "EXPIRED": "Expired"}
_GP_TYPE_LABEL = {"TGP": "Temporary", "PGP": "Permanent"}
_GP_STATUS_LABEL = {"ACTIVE": "Approved", "PENDING": "Pending", "REJECTED": "Rejected",
                    "EXPIRED": "Expired", "REVOKED": "Revoked"}
_SITE_SCALAR_FIELDS = tuple(
    f.name for f in Site._meta.get_fields()
    if not getattr(f, "auto_created", False)
    and not getattr(f, "many_to_one", False)
    and not getattr(f, "many_to_many", False)
    and not getattr(f, "one_to_one", False)
    and f.name not in ("id", "site_qr_token", "created_at", "updated_at", "employer")
)
CATEGORY_MAP = {
    "INFO": "info", "APPROVAL": "approval", "WARNING": "warning",
    "GRIEVANCE": "grievance", "COMPLIANCE": "compliance", "PAYROLL": "payroll",
}


def _d(value, default=""):
    return value if value is not None and value != "" else default


def _bss_worker_code(user_id):
    return f"BSS-W{user_id:011d}"


def _bss_contractor_code(user_id):
    return f"BSS-C{user_id:011d}"


def _bss_employer_code(user_id):
    return f"BSS-E{user_id:011d}"


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


def _f(label, value, note="", sensitive=False, field_type="text"):
    """Profile section field helper."""
    return {"label": label, "value": "" if value is None else str(value), "note": note, "sensitive": sensitive, "type": field_type}


def sha256_checksum(file_obj):
    hasher = hashlib.sha256()
    for chunk in file_obj.chunks():
        hasher.update(chunk)
    return hasher.hexdigest()


__all__ = [
    "Attendance",
    "CATEGORY_MAP",
    "ComplianceBatch",
    "ComplianceDocument",
    "ComplianceMaster",
    "ComplianceReport",
    "ContractorEmployerBinding",
    "ContractorProfile",
    "ContractorSiteAllotment",
    "Course",
    "CourseEnrollment",
    "CourseLesson",
    "CourseQuestion",
    "CourseSubmission",
    "EmployerProfile",
    "GEOGRAPHY",
    "GratuityApplication",
    "LeaveRequest",
    "LeaveType",
    "Notification",
    "PIN_LOCATIONS",
    "PayrollConfig",
    "Q",
    "RestrictedHolidayRequest",
    "RozgarRequest",
    "SalaryAdvance",
    "Site",
    "SiteHoliday",
    "SiteLeavePolicy",
    "SubmissionEvidence",
    "User",
    "UserPreference",
    "WagePayment",
    "WorkerAddressMobility",
    "WorkerBanking",
    "WorkerBenefitRecord",
    "WorkerClassification",
    "WorkerContractorBinding",
    "WorkerDocument",
    "WorkerDocumentMaster",
    "WorkerEducation",
    "WorkerEmployment",
    "WorkerFamilyDependant",
    "WorkerGatePass",
    "WorkerGrievance",
    "WorkerIdentity",
    "WorkerOther",
    "WorkerSkill",
    "WorkerSkillsEmployability",
    "WorkerSocialSecurity",
    "WorkerWages",
    "WorkerWelfareSafety",
    "_CE_SOURCE_INITIATOR",
    "_DIGILOCKER_DOC_CODES",
    "_GP_STATUS_LABEL",
    "_GP_TYPE_LABEL",
    "_GP_WELFARE_LABEL",
    "_GRIEVANCE_ACTOR",
    "_GRIEVANCE_CATEGORY",
    "_GRIEVANCE_UI_STATUS",
    "_RH_STATUS",
    "_SITE_SCALAR_FIELDS",
    "_STATES",
    "_WORKER_BINDING_STATUS",
    "_bss_contractor_code",
    "_bss_employer_code",
    "_bss_worker_code",
    "_d",
    "_dts",
    "_f",
    "_get_identity",
    "_identity_display",
    "_num",
    "_org_name",
    "_party_name",
    "datetime",
    "geography_lookup",
    "get_user_model",
    "government_geography",
    "hashlib",
    "re",
    "sha256_checksum",
    "timezone",
]
