const mongoose = require('mongoose');
const { Category, CategorySchema } = require('../models/userCategoryModel');

// Define default categories
const defaultCategorie = [
  {
    _id: "576beaf0ed777ab0145122d1", name: 'SUPERADMIN', permissions: [
      "super_admin_dashboard","employee_portal_dashboard","employee_leave","hr_dashboard","recruitment_dashboard","jobs_view","jobs_edit","job_template_view","job_template_edit","candidate_list_view","candidate_list_edit","interview_scheduler_view","interview_scheduler_edit","shortlisted_candidates_view","shortlisted_candidates_edit","separation_dashboard","pre_resignation_view","pre_resignation_edit","resignation_view","resignation_edit","admin_dashboard","change_password_page","role_permission","change_category_page","organization_dashboard","organization_details","organization_documents","organization_configuration_view","organization_configuration_edit","organization_pyramid_view","organization_pyramid_edit","employee_hierarchy","employee_details_dashboard","employee_master_view","employee_master_edit","department_view","department_edit","shift_view","shift_edit","pre_resignation_view","pre_resignation_edit","resignation_view","resignation_edit","attendance_dashboard","attendance_calendar_update","leave_dashboard","leave_types_view","leave_types_edit","leave_register_view","leave_register_approve","holiday_list_view","holiday_list_edit","payroll_employee_dashboard","payroll_employee_salary","payroll_employee_taxation","payroll_employee_claims","payroll_employee_request","payroll_admin_dashboard","payroll_admin_process","payroll_admin_salary_components","payroll_admin_statutory_compliance","payroll_admin_full_final_settlement","payroll_admin_pay_schedule","payroll_admin_tds_management","payroll_admin_salary_revisions","payroll_admin_arrears_management","payroll_admin_reports","payroll_admin_bank_file_generation","payroll_admin_staff_portal","payroll_admin_claims_declaration","payroll_hr_dashboard","payroll_hr_employee","payroll_hr_pay_runs","payroll_hr_claim_approval","payroll_hr_full_final_settlement","payroll_hr_arrears_management","payroll_hr_reports","site_view","site_edit","site_add","templates_view","templates_create"
    ]
  },
  {
    _id: "576beaf0ed777ab0145122d2", name: 'ADMIN', permissions: [
     "employee_portal_dashboard","employee_leave","hr_dashboard","recruitment_dashboard","jobs_view","jobs_edit","job_template_view","job_template_edit","candidate_list_view","candidate_list_edit","interview_scheduler_view","interview_scheduler_edit","shortlisted_candidates_view","shortlisted_candidates_edit","separation_dashboard","pre_resignation_view","pre_resignation_edit","resignation_view","resignation_edit","admin_dashboard","change_password_page","role_permission","change_category_page","organization_dashboard","organization_details","organization_documents","organization_configuration_view","organization_configuration_edit","organization_pyramid_view","organization_pyramid_edit","employee_hierarchy","employee_details_dashboard","employee_master_view","employee_master_edit","department_view","department_edit","shift_view","shift_edit","pre_resignation_view","pre_resignation_edit","resignation_view","resignation_edit","attendance_dashboard","attendance_calendar_update","leave_dashboard","leave_types_view","leave_types_edit","leave_register_view","leave_register_approve","holiday_list_view","holiday_list_edit","payroll_employee_dashboard","payroll_employee_salary","payroll_employee_taxation","payroll_employee_claims","payroll_employee_request","payroll_admin_dashboard","payroll_admin_process","payroll_admin_salary_components","payroll_admin_statutory_compliance","payroll_admin_full_final_settlement","payroll_admin_pay_schedule","payroll_admin_tds_management","payroll_admin_salary_revisions","payroll_admin_arrears_management","payroll_admin_reports","payroll_admin_bank_file_generation","payroll_admin_staff_portal","payroll_admin_claims_declaration","payroll_hr_dashboard","payroll_hr_employee","payroll_hr_pay_runs","payroll_hr_claim_approval","payroll_hr_full_final_settlement","payroll_hr_arrears_management","payroll_hr_reports","site_view","site_edit","site_add","templates_view","templates_create"
    ]
  }
];

// Function to check and initialize categories if empty
async function mainSystemUserCategories() {
  try {
    const categories = await Category.find({});
    if (categories.length === 0) {
      console.log('No categories found, initializing default categories...');
      await Category.insertMany(defaultCategorie);
      console.log('Default categories created successfully.');
    } else {
      console.log('Checking for permission updates in existing categories...');
      for (const dbCategory of categories) {
        const defaultCategory = defaultCategorie.find(cat => cat._id === dbCategory._id.toString());
        if (defaultCategory && dbCategory.permissions.length < defaultCategory.permissions.length) {
          // Find missing permissions
          const missingPermissions = defaultCategory.permissions.filter(
            perm => !dbCategory.permissions.includes(perm)
          );

          if (missingPermissions.length > 0) {
            dbCategory.permissions.push(...missingPermissions);
            await dbCategory.save();
            console.log(`Updated category "${dbCategory.name}" with missing permissions.`);
          }
        }
      }
      console.log('Permission check completed.');
    }
  } catch (error) {
    console.error('Error initializing categories:', error);
    throw new Error('Category initialization failed');
  }
}

async function newSystemUserCategories(connection) {
  try {
    if (!connection || typeof connection.model !== 'function') {
      throw new Error('Invalid database connection');
    }

    const CategoryModel = connection.model('Category', CategorySchema);
    const categories = await CategoryModel.find({});

    if (categories.length === 0) {
      console.log('No categories found, initializing default categories...');
      await CategoryModel.insertMany(defaultCategorie);
      console.log('Default categories created successfully.');
    } else {
      console.log('Categories already exist.');
    }
  } catch (error) {
    console.error('Error initializing categories:', error);
    throw new Error('Category initialization failed');
  }
}

module.exports = { mainSystemUserCategories, newSystemUserCategories };
