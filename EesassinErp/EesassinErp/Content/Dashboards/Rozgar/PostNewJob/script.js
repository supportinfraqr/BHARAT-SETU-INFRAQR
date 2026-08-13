
    document.addEventListener("DOMContentLoaded", function () {

    /* ==========================================
    QUILL
    ========================================== */

    const quill = new Quill('#jobDescriptionEditor', {
        theme: 'snow',
    placeholder: 'Write a detailed job description...',
    modules: {
        toolbar: [
    ['bold', 'italic', 'underline'],
    [{list: 'ordered' }, {list: 'bullet' }],
    ['link']
    ]
        }
    });



    /* ==========================================
       STATE
    ========================================== */

    const jobData = {
        title: '',
    category: '',
    workplace: 'On-site',
    location: '',
    description: '',
    salaryMin: '',
    salaryMax: '',
    skills: []
    };



    /* ==========================================
       ELEMENTS
    ========================================== */

    const steps = document.querySelectorAll('.wizardStep');
    const stepIndicators = document.querySelectorAll('.stepItem');
    const sidebars = document.querySelectorAll('.sidebarStep');



    /* ==========================================
       STEP SWITCHER
    ========================================== */

    function showStep(stepNumber) {

        steps.forEach(step => {
            step.classList.remove('activeStep');
        });

    document
    .getElementById(`step${stepNumber}`)
    .classList.add('activeStep');



        stepIndicators.forEach((item, index) => {

        item.classList.remove('active');

    if ((index + 1) <= stepNumber) {
        item.classList.add('active');
            }

        });



        sidebars.forEach(side => {
        side.classList.remove('activeSidebar');
        });

    document
    .getElementById(`sidebar${stepNumber}`)
    .classList.add('activeSidebar');



    window.scrollTo({
        top: 0,
    behavior: 'smooth'
        });

    }



    /* ==========================================
       WORKPLACE SELECTION
    ========================================== */

    const workplaceCards =
    document.querySelectorAll('.workplaceCard');



    workplaceCards.forEach(card => {

        card.addEventListener('click', function () {

            workplaceCards.forEach(c => {
                c.classList.remove('active');
            });

            this.classList.add('active');

            jobData.workplace =
                this.dataset.workplace;

        });

    });



    /* ==========================================
       SKILLS
    ========================================== */

    const skillInput =
    document.getElementById('skillInput');

    const skillsContainer =
    document.getElementById('skillsContainer');



    function renderSkills() {

        skillsContainer.innerHTML = '';

        jobData.skills.forEach((skill, index) => {

            const tag =
    document.createElement('div');

    tag.className = 'skillTag';

    tag.innerHTML = `
    ${skill}
    <i class="fa-solid fa-xmark"
        data-index="${index}">
    </i>
    `;

    skillsContainer.appendChild(tag);

        });



    document
    .querySelectorAll('.skillTag i')
            .forEach(btn => {

        btn.addEventListener('click', function () {

            const index =
                parseInt(this.dataset.index);

            jobData.skills.splice(index, 1);

            renderSkills();

        });

            });

    }



    skillInput.addEventListener('keydown', function (e) {

        if (
    e.key === 'Enter' ||
    e.key === ','
    ) {

        e.preventDefault();

    const value =
    this.value.trim();

    if (!value) return;

    if (!jobData.skills.includes(value)) {

        jobData.skills.push(value);

    renderSkills();

            }

    this.value = '';

        }

    });



    /* ==========================================
       STEP 1 → STEP 2
    ========================================== */

    document
    .querySelector('[data-next="2"]')
    .addEventListener('click', function () {

        jobData.title =
        document
            .getElementById('jobTitle')
            .value
            .trim();

    jobData.category =
    document
    .getElementById('jobCategory')
    .value;

    jobData.location =
    document
    .getElementById('jobLocation')
    .value
    .trim();



    if (!jobData.title) {

        alert('Please enter Job Title');
    return;

            }

    showStep(2);

        });



    /* ==========================================
       STEP 2 → STEP 3
    ========================================== */

    document
    .querySelector('[data-next="3"]')
    .addEventListener('click', function () {

        jobData.description =
        quill.root.innerHTML;

    jobData.salaryMin =
    document
    .getElementById('salaryMin')
    .value;

    jobData.salaryMax =
    document
    .getElementById('salaryMax')
    .value;



    populateReview();

    showStep(3);

        });



    /* ==========================================
       PREVIOUS BUTTONS
    ========================================== */

    document
    .querySelectorAll('.prevBtn')
        .forEach(btn => {

        btn.addEventListener('click', function () {

            const step =
                parseInt(this.dataset.prev);

            showStep(step);

        });

        });



    /* ==========================================
       REVIEW
    ========================================== */

    function populateReview() {

        document.getElementById('previewTitle').textContent =
        jobData.title || '-';



    document.getElementById('previewLocation').innerHTML =
    `<i class="fa-solid fa-location-dot"></i> ${jobData.location || '-'}`;



    document.getElementById('previewWorkplace').innerHTML =
    `<i class="fa-solid fa-briefcase"></i> ${jobData.workplace}`;



    let salaryText = '-';

    if (jobData.salaryMin || jobData.salaryMax) {

        salaryText =
        `₹${jobData.salaryMin || 0} - ₹${jobData.salaryMax || 0}`;

        }



    document.getElementById('previewSalary').innerHTML =
    `<i class="fa-solid fa-indian-rupee-sign"></i> ${salaryText}`;



    document.getElementById('previewDescription').innerHTML =
    jobData.description;



    const reviewSkills =
    document.getElementById('reviewSkills');

    reviewSkills.innerHTML = '';



    if (jobData.skills.length === 0) {

        reviewSkills.innerHTML =
        '<p>No skills added</p>';

    return;

        }



        jobData.skills.forEach(skill => {

            const tag =
    document.createElement('div');

    tag.className = 'skillTag';

    tag.innerHTML = skill;

    reviewSkills.appendChild(tag);

        });

    }



    /* ==========================================
       INITIAL
    ========================================== */

    showStep(1);

});
