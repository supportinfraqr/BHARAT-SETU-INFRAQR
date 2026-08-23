Here is the logic pseudocode illustrating the relationships and constraints between Employers (E), Contractors (C), Sites (S), and Workers (W) based on your provided rules.
Entity Relationships & Constraints Summary
●	Site (S) ➔ Many-to-One ➔ Employer (E): A site has exactly one employer.
●	Worker (W) ➔ Many-to-One ➔ Site (S): A worker is bound to exactly one site.
●	Worker (W) ➔ Many-to-One ➔ Contractor (C): A worker falls under one contractor at that site.
●	Contractor (C) ➔ Many-to-Many ➔ Site (S): A contractor can work on multiple sites, and a site can have multiple contractors.
Logic Pseudocode



Plaintext
// ==========================================
// 1. DEFINE CORE DATA STRUCTURES
// ==========================================

// Maps to enforce single-parent relationships
Global Map: Site_To_Employer = {}      // S -> E (Rule: Site always belongs to Employer)
Global Map: Worker_To_Site = {}        // W -> S (Rule: One worker always on a single site)
Global Map: Worker_To_Contractor = {}  // W -> C (Defines which contractor manages the worker)

// Sets to track existence and many-to-many bindings
Global Set: Employers = {}
Global Set: Contractors = {}
Global Set: Sites = {}
Global Set: Workers = {}

// Set to keep track of the unique E-C-S-W combinations
Global Set: ECSW_Master_Records = {}   // Format: "E_ID::C_ID::S_ID::W_ID"


// ==========================================
// 2. DEFINE SYSTEM FUNCTIONS & LOGIC
// ==========================================

Function Create_Employer(E_ID):
    Employers.add(E_ID)
    RETURN "Employer Created"

Function Create_Contractor(C_ID):
    Contractors.add(C_ID)
    RETURN "Contractor Created"

Function Assign_Site_To_Employer(S_ID, E_ID):
    IF E_ID does not exist in Employers:
        THROW Error "Employer does not exist"
    
    // Rule: Site ALWAYS belongs to the Employer
    IF S_ID exists in Site_To_Employer:
        THROW Error "Site is already assigned to an employer"
        
    Site_To_Employer[S_ID] = E_ID
    Sites.add(S_ID)
    RETURN "Site successfully bound to Employer"

Function Assign_Worker_To_System(W_ID, C_ID, S_ID):
    // Validate Entities
    IF C_ID does not exist in Contractors: THROW Error "Contractor not found"
    IF S_ID does not exist in Sites: THROW Error "Site not found"
    
    // Rule: One worker always on a single site
    IF W_ID exists in Workers:
        THROW Error "Worker already exists and is bound to a site/contractor. ECSW cannot be two times."

    // Derive Employer from the Site (Rule: Site always belongs to Employer)
    E_ID = Site_To_Employer[S_ID]

    // Save mapping
    Workers.add(W_ID)
    Worker_To_Site[W_ID] = S_ID
    Worker_To_Contractor[W_ID] = C_ID

    // Generate Unique E-C-S-W String (Rule: All E-C-S-W cannot be two times)
    ECSW_Tuple = E_ID + "-" + C_ID + "-" + S_ID + "-" + W_ID
    ECSW_Master_Records.add(ECSW_Tuple)

    RETURN "Worker successfully assigned. Constant tuple generated: " + ECSW_Tuple


// ==========================================
// 3. VALIDATION QUERIES (Checking the Rules)
// ==========================================

Function Get_Worker_Details(W_ID):
    // Ensures E1-C1-S1-W1 => Always Constant
    IF W_ID does not exist in Workers:
        RETURN "Worker not found"
        
    S_ID = Worker_To_Site[W_ID]
    C_ID = Worker_To_Contractor[W_ID]
    E_ID = Site_To_Employer[S_ID]
    
    RETURN "Tuple: " + E_ID + "-" + C_ID + "-" + S_ID + "-" + W_ID

Function Get_Contractor_Employers(C_ID):
    // Validates: One Contractor can be bound to multiple Employers
    List assigned_employers = []
    FOR EACH W_ID in Workers:
        IF Worker_To_Contractor[W_ID] == C_ID:
            S_ID = Worker_To_Site[W_ID]
            E_ID = Site_To_Employer[S_ID]
            assigned_employers.add_unique(E_ID)
    RETURN assigned_employers

Function Get_Contractor_Sites(C_ID):
    // Validates: One Contractor can be bound to multiple Sites
    List assigned_sites = []
    FOR EACH W_ID in Workers:
        IF Worker_To_Contractor[W_ID] == C_ID:
            assigned_sites.add_unique(Worker_To_Site[W_ID])
    RETURN assigned_sites

Function Get_Employer_Contractors_At_Site(E_ID, S_ID):
    // Validates: One employer can have multiple contractors at same or different site
    IF Site_To_Employer[S_ID] != E_ID:
        RETURN "Site does not belong to this Employer"
        
    List active_contractors = []
    FOR EACH W_ID in Workers:
        IF Worker_To_Site[W_ID] == S_ID:
            active_contractors.add_unique(Worker_To_Contractor[W_ID])
    RETURN active_contractors

How This Satisfies Your Rules
●	Site_To_Employer Map: Prevents a site from being mapped to more than one employer, guaranteeing that a site always belongs to a specific employer.
●	Worker_To_Site Map: Ensures that once a worker is assigned, they are locked to a single site. If you try to re-assign W1 to S2, the system throws an error.
●	Constant ECSW Generation: Because W relies on strict dictionaries (1 W = 1 S, 1 S = 1 E, 1 W = 1 C), querying the worker will always generate the exact same E-C-S-W tuple, fulfilling the E1-C1-S1-W1 => Always Constant rule.
●	Dynamic Binding: Contractors (C) and Employers (E) are linked passively through the Sites (S) and Workers (W). This allows C1 to easily show up under E1's site and E2's site simultaneously without break





Here is the logic pseudocode illustrating the QR-based consent, binding, and attendance system, incorporating the site-based hierarchy, data visibility rules, and network/hardware fallbacks (IVR and SMS OTP).
Core System Configuration & Data Views



Plaintext
// ==========================================
// 1. DATA VISIBILITY & ACCESS RULES
// ==========================================

// Global Mapping for Active Bindings
Global Map: Active_Bindings = {} // Format: "Entity1_ID::Entity2_ID" -> Boolean

Function Fetch_Profile_Data(Viewer_ID, Target_ID):
    // Rule 5 & 6: 100% view if bound, else general info only
    IF Active_Bindings.contains(Viewer_ID + "::" + Target_ID) OR Active_Bindings.contains(Target_ID + "::" + Viewer_ID):
        RETURN Fetch_Full_Database_View(Target_ID)
    ELSE:
        RETURN {
            Name: Target.Name,
            Age: Target.Age,
            Sex: Target.Sex,
            Company: Target.Company,
            BloodGroup: Target.BloodGroup
        }

Consent Mechanism & Fallbacks



Plaintext
// ==========================================
// 2. CONSENT & COMMUNICATION MANAGERS
// ==========================================

Function Request_App_Consent(Party_ID):
    // Pushes popup to smartphone app: [Approve / Disapprove]
    Status = Send_Push_Notification(Party_ID, "Pending Binding Request")
    RETURN Status // Returns TRUE (Approved), FALSE (Disapproved), or NULL (No Response)

Function Initiate_IVR_Fallback(W_ID):
    // Specific to Case I: Worker physical card scanning
    Phone_Number = Get_Registered_Phone(W_ID)
    Call_Status = Dial_IVR(Phone_Number, "Press 1 to accept binding, Press 0 to decline")
    
    IF Call_Status == 1: RETURN TRUE
    ELSE: RETURN FALSE

Function Initiate_Network_Delay_Fallback(Target_ID):
    // Specific to Case II: App-to-App internet delays
    Phone_Number = Get_Registered_Phone(Target_ID)
    
    // Step 1: SMS OTP
    Send_SMS(Phone_Number, "OTP for Binding Consent: 1234")
    OTP_Response = Wait_For_OTP_Input(Target_ID, Timeout = 60_seconds)
    
    IF OTP_Response == VALID:
        RETURN TRUE
    
    // Step 2: Fallback to Voice Call if OTP fails or times out
    Call_Status = Dial_Voice_Prompt(Phone_Number, "Press 1 to confirm app binding")
    IF Call_Status == 1:
        RETURN TRUE
    ELSE:
        RETURN FALSE

Flow Logic: Case I & Case II



Plaintext
// ==========================================
// 3. CASE I: E => C => W (Top-Down Flow)
// ==========================================

Function E_Scans_C_For_Site(E_ID, C_ID, S_ID):
    // Rule 3 & 4: Both parties must consent
    // E initiates (Default permission implied, but popup still confirms)
    E_Consent = Request_App_Consent(E_ID) 
    C_Consent = Request_App_Consent(C_ID)
    
    IF E_Consent == TRUE AND C_Consent == TRUE:
        Active_Bindings.add(E_ID + "::" + C_ID)
        Assign_Contractor_To_Site(C_ID, S_ID)
        RETURN "Binding Successful: E and C bound at Site " + S_ID
    ELSE:
        RETURN "Binding Failed: Consent Denied"

Function C_Scans_W_Physical_Card(C_ID, W_ID, S_ID):
    // Contractor scans Worker. Issue: Worker might not have smartphone.
    C_Consent = Request_App_Consent(C_ID) // C confirms on their app
    
    IF C_Consent == FALSE: RETURN "Binding Cancelled by Contractor"
    
    // Attempt App Consent for Worker first (in case they do have a smartphone)
    W_Consent = Request_App_Consent(W_ID)
    
    // Check for 1-minute timeout (Rule 7, Case I constraint)
    IF W_Consent == NULL AFTER 60_seconds:
        // Trigger IVR Call to Keypad/Basic phone
        W_Consent = Initiate_IVR_Fallback(W_ID)
        
    IF W_Consent == TRUE:
        Active_Bindings.add(C_ID + "::" + W_ID)
        Assign_Worker_To_Site(W_ID, S_ID) // Rule: One worker, single site
        RETURN "Binding Successful: C and W bound at Site " + S_ID
    ELSE:
        RETURN "Binding Failed: Worker Disapproved or Unreachable"


// ==========================================
// 4. CASE II: W => C => E (Bottom-Up Flow)
// ==========================================

Function W_Scans_C(W_ID, C_ID):
    // Worker has smartphone and initiates
    W_Consent = Request_App_Consent(W_ID)
    
    // Attempt App Consent for Contractor
    C_Consent = Request_App_Consent(C_ID)
    
    // Check for network delay (Rule 7, Case II addition)
    IF C_Consent == NULL AFTER 60_seconds:
         C_Consent = Initiate_Network_Delay_Fallback(C_ID)
         
    IF W_Consent == TRUE AND C_Consent == TRUE:
        Active_Bindings.add(W_ID + "::" + C_ID)
        RETURN "Binding Successful: W and C bound"
    ELSE:
        RETURN "Binding Failed: Consent Denied or Timeout"

Function C_Scans_E(C_ID, E_ID, S_ID):
    // App-to-App binding
    C_Consent = Request_App_Consent(C_ID)
    E_Consent = Request_App_Consent(E_ID)
    
    // Check for network delay
    IF E_Consent == NULL AFTER 60_seconds:
        E_Consent = Initiate_Network_Delay_Fallback(E_ID)
    IF C_Consent == NULL AFTER 60_seconds: // Just in case C lost internet immediately after scanning
        C_Consent = Initiate_Network_Delay_Fallback(C_ID)

    IF C_Consent == TRUE AND E_Consent == TRUE:
        ActiveBindings.add(C_ID + "::" + E_ID)
        Assign_Contractor_To_Site(C_ID, S_ID)
        RETURN "Binding Successful: C and E bound at Site " + S_ID
    ELSE:
        RETURN "Binding Failed"

Key Logic Handlers Outlined
●	Dual Handshake Requirement: Notice that in every Scan function, Request_App_Consent() is called for both parties. Even though the scanner implies permission by performing the action, the system still captures the explicit TRUE state from both interfaces.
●	Targeted Fallbacks:
○	Initiate_IVR_Fallback() is strictly scoped to C_Scans_W_Physical_Card(). It utilizes a simple Press 1 / Press 0 automated system ideal for keypad devices.
○	Initiate_Network_Delay_Fallback() handles the progressive fallback (App $\rightarrow$ SMS OTP $\rightarrow$ Voice Prompt) specifically engineered for Case II where smartphones are present but network connectivity drops.
●	Stateful Data: The Fetch_Profile_Data() function acts as an interceptor. Before any UI renders data, it checks the Active_Bindings map. If no cross-reference exists, the data payload is strictly truncated to the safe, general attributes.
