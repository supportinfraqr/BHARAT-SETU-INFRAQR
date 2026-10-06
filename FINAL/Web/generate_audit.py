import pandas as pd
import json
import os

xls = pd.ExcelFile('BSS_Final_worker_form_and_permission.xlsx')
sheets = ['Worker form & Access', 'workplace compliance', 'Wages & Social Security', 'Rozgar & Request', 'Grievance', 'Skills', 'Documents']

md_lines = []
md_lines.append("# BSS Worker Portal - Feature Coverage Audit\n")
md_lines.append("| Workbook Sheet | Feature/Field | UI Page/Component | Data Owner | Permission Rule | Implemented? |")
md_lines.append("|---|---|---|---|---|---|")

for sheet in sheets:
    if sheet in xls.sheet_names:
        df = pd.read_excel(xls, sheet_name=sheet)
        # Find columns like 'Field Name' or 'Feature'
        field_col = None
        for col in df.columns:
            if 'field' in str(col).lower() or 'feature' in str(col).lower() or 'item' in str(col).lower():
                field_col = col
                break
        
        owner_col = None
        for col in df.columns:
            if 'owner' in str(col).lower():
                owner_col = col
                break
                
        rule_col = None
        for col in df.columns:
            if 'rule' in str(col).lower() or 'access' in str(col).lower() or 'permission' in str(col).lower():
                rule_col = col
                break
                
        if field_col:
            for idx, row in df.iterrows():
                field = str(row[field_col]).replace('\n', ' ') if pd.notna(row[field_col]) else 'Unknown'
                if field == 'Unknown': continue
                
                owner = str(row[owner_col]).replace('\n', ' ') if owner_col and pd.notna(row[owner_col]) else 'System'
                rule = str(row[rule_col]).replace('\n', ' ') if rule_col and pd.notna(row[rule_col]) else 'Standard'
                
                # Check if it's currently implemented in our minimal scaffold
                implemented = "Partial" if "Dashboard" in sheet or "Profile" in sheet else "No"
                
                md_lines.append(f"| {sheet} | {field} | Pending Route | {owner} | {rule} | {implemented} |")

with open('Feature_Coverage_Audit.md', 'w') as f:
    f.write('\n'.join(md_lines))
