"""One-time copy: read reference tables from the legacy SQL Server and insert into PostgreSQL.

Run ONLY while the SQL Server container (bss-sql) is still up.
Usage: ./venv/bin/python copy_from_mssql.py
"""
import os
import pyodbc
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "bss_qr.settings")
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend"))
django.setup()

from django.db import transaction

from legacy.models import LoginTable, EmployeeMaster, StoreMaster, PartyMaster, MaintainLog

MSSQL = os.environ.get(
    "BSS_MSSQL_DSN",
    "DRIVER={ODBC Driver 18 for SQL Server};SERVER=127.0.0.1,1433;DATABASE=BharatSharamShetu;UID=sa;PWD=InfraQR2026!sql;TrustServerCertificate=yes;Encrypt=yes",
)


def fetch(conn, table, columns):
    cur = conn.cursor()
    cur.execute(f"SELECT {', '.join(columns)} FROM {table}")
    cols = [c[0] for c in cur.description]
    return [dict(zip(cols, row)) for row in cur.fetchall()]


def main():
    conn = pyodbc.connect(MSSQL)
    conn.setencoding("utf-8")
    conn.setdecoding(pyodbc.SQL_CHAR, encoding="utf-8")

    with transaction.atomic():
        EmployeeMaster.objects.all().delete()
        LoginTable.objects.all().delete()
        StoreMaster.objects.all().delete()
        PartyMaster.objects.all().delete()
        MaintainLog.objects.all().delete()

        rows = fetch(conn, "[RTL].[EmployeeMaster]",
                     ["Id", "EmployeeCode", "RefEmployeeCode", "EmployeeName", "EmployeeDesignation",
                      "EmployeeDepartment", "Father_Husband_Name", "Gendar", "MaritalStatus",
                      "DateOfBirth", "DOJ", "PresentAddress", "MobileNumber", "PANNumber",
                      "AdharCardNumber", "PreviousUAN", "PFAccount", "BankAccountNumber",
                      "GrossSalary", "StoreCode", "UserId", "PartyId", "IsActive"])
        objs = [EmployeeMaster(**{k: v for k, v in r.items()}) for r in rows]
        EmployeeMaster.objects.bulk_create(objs, batch_size=500)
        print(f"EmployeeMaster: {len(objs)}")

        rows = fetch(conn, "[dbo].[LoginTable]",
                     ["LoginId", "UserName", "Password", "MapId", "Name", "LoginType",
                      "SessionId", "LastLogin", "BranchCode", "ContactNo", "EmailId",
                      "CreatedOn", "IsActive", "UpdatedOn", "Otp", "MPIN", "DigiLockerId"])
        objs = [LoginTable(**r) for r in rows]
        LoginTable.objects.bulk_create(objs, batch_size=500)
        print(f"LoginTable: {len(objs)}")

        rows = fetch(conn, "[RTL].[StoreMaster]",
                     ["Id", "StoreCode", "RefStoreCode", "StoreName", "Category", "IsActive",
                      "StoreLocation", "CompleteAddress", "CreatedBy"])
        objs = [StoreMaster(**r) for r in rows]
        StoreMaster.objects.bulk_create(objs, batch_size=500)
        print(f"StoreMaster: {len(objs)}")

        rows = fetch(conn, "[EVM].[TBL_PartyMaster]",
                     ["PartyId", "PartyCode", "PartyName", "PartyType", "ContactMobile",
                      "ContactPerson", "EmailId", "Address", "IsActive", "IsDeleted"])
        objs = [PartyMaster(**r) for r in rows]
        PartyMaster.objects.bulk_create(objs, batch_size=500)
        print(f"PartyMaster: {len(objs)}")

        rows = fetch(conn, "[dbo].[MaintainLog]",
                     ["Id", "UserId", "Activity", "MachineName", "SystemUserName", "CreatedOn"])
        objs = [MaintainLog(**r) for r in rows]
        MaintainLog.objects.bulk_create(objs, batch_size=500)
        print(f"MaintainLog: {len(objs)}")

    conn.close()
    print("Done.")


if __name__ == "__main__":
    main()
