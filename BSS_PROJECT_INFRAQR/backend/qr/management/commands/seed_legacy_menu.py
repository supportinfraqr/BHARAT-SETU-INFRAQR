"""Seed the legacy module/menu/submenu tables with the EXACT legacy sidebar data.

The rows come from the client SQL Server dump (bss1826.sql -> ModuleMaster /
MenuMaster / SubMenuMaster). This is the authoritative data the legacy sidebar
rendered (see legacy_menu_data.py).

Usage:  ./venv/bin/python manage.py seed_legacy_menu [--clear]
"""
from django.core.management.base import BaseCommand

from legacy.models import MenuMaster, ModuleMaster, SubMenuMaster
from .legacy_menu_data import MENUS, MODULES, SUBMENUS


class Command(BaseCommand):
    help = "Seed ModuleMaster/MenuMaster/SubMenuMaster from the exact legacy sidebar data."

    def add_arguments(self, parser):
        parser.add_argument("--clear", action="store_true", help="Delete existing rows first.")

    def handle(self, *args, **options):
        if options["clear"]:
            SubMenuMaster.objects.all().delete()
            MenuMaster.objects.all().delete()
            ModuleMaster.objects.all().delete()
            self.stdout.write("Cleared existing module/menu/submenu rows.")

        for row in MODULES:
            ModuleMaster.objects.update_or_create(
                ModuleId=row["ModuleId"],
                defaults={
                    "Name": row["Name"],
                    "DisplayOrder": row["DisplayOrder"],
                    "Icon": row["Icon"],
                },
            )
        for row in MENUS:
            MenuMaster.objects.update_or_create(
                MenuId=row["MenuId"],
                defaults={
                    "ModuleId": row["ModuleId"],
                    "Name": row["Name"],
                    "Url": row["Url"],
                    "DisplayOrder": row["DisplayOrder"],
                    "Icon": row["Icon"],
                },
            )
        for row in SUBMENUS:
            SubMenuMaster.objects.update_or_create(
                SubMenuId=row["SubMenuId"],
                defaults={
                    "MenuId": row["MenuId"],
                    "DisplayName": row["DisplayName"],
                    "Name": row["Name"],
                    "HostedFolder": row["HostedFolder"],
                    "Url": row["Url"],
                    "DisplayOrder": row["DisplayOrder"],
                    "Icon": row["Icon"],
                    "PermissionFor": row["PermissionFor"],
                    "NameForMobile": row["NameForMobile"],
                    "SAAccess": row["SAAccess"],
                    "AdminAccess": row["AdminAccess"],
                    "StaffAccess": row["StaffAccess"],
                    "UserFor": row["UserFor"],
                },
            )
        self.stdout.write(self.style.SUCCESS(
            f"Seeded {ModuleMaster.objects.count()} modules, "
            f"{MenuMaster.objects.count()} menus, {SubMenuMaster.objects.count()} submenus."
        ))
