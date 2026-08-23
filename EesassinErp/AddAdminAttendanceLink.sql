-- Admin "Attendance System" sidebar link
-- Run this on the client's SQL Server (BharatSharamShetu) to add an admin-only
-- sidebar menu item that opens the QR Attendance System.
-- It creates a "QR" module -> "Attendance" menu -> "Attendance System" submenu.

-- Ensure the module exists
IF NOT EXISTS (SELECT 1 FROM ModuleMaster WHERE Name = 'QR')
BEGIN
    DECLARE @ModId INT = (SELECT ISNULL(MAX(ModuleId),0) + 1 FROM ModuleMaster)
    INSERT INTO ModuleMaster (ModuleId, Name, DisplayOrder, Icon)
    VALUES (@ModId, 'QR', 50, N'icofont-qr-code')
END

DECLARE @ModId2 INT = (SELECT ModuleId FROM ModuleMaster WHERE Name = 'QR')

-- Ensure the menu exists
IF NOT EXISTS (SELECT 1 FROM MenuMaster WHERE ModuleId = @ModId2 AND Name = 'Attendance')
BEGIN
    DECLARE @MenuId INT = (SELECT ISNULL(MAX(MenuId),0) + 1 FROM MenuMaster)
    INSERT INTO MenuMaster (MenuId, ModuleId, Name, Url, DisplayOrder, Icon)
    VALUES (@MenuId, @ModId2, 'Attendance', NULL, 1, N'icofont-calendar')
END

DECLARE @MenuId2 INT = (SELECT MenuId FROM MenuMaster WHERE ModuleId = @ModId2 AND Name = 'Attendance')

-- Add the submenu (admin only)
IF NOT EXISTS (SELECT 1 FROM SubMenuMaster WHERE MenuId = @MenuId2 AND Name = 'Attendance System')
BEGIN
    DECLARE @SubId INT = (SELECT ISNULL(MAX(SubMenuId),0) + 1 FROM SubMenuMaster)
    INSERT INTO SubMenuMaster (SubMenuId, MenuId, DisplayName, Name, HostedFolder, Url, DisplayOrder, Icon, PermissionFor, SAAccess, AdminAccess, StaffAccess)
    VALUES (@SubId, @MenuId2, 'Attendance System', 'Attendance System', NULL, N'https://bharat-setu.infraqr.com/', 1, N'mdi mdi-chevron-right', 'Web', 1, 1, 0)
END
GO
