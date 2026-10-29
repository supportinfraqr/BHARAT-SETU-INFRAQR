!macro BSS_STOP_RUNNING
  nsExec::ExecToLog 'taskkill /F /IM "BSS Attendance.exe" /T'
  nsExec::ExecToLog 'taskkill /F /IM "bss-attendance.exe" /T'
  nsExec::ExecToLog 'taskkill /F /IM "attendance-engine.exe" /T'
  nsExec::ExecToLog 'taskkill /F /IM "attendance-engine-x86_64-pc-windows-msvc.exe" /T'
  Sleep 1500
!macroend

!macro NSIS_HOOK_PREINSTALL
  !insertmacro BSS_STOP_RUNNING
!macroend

!macro NSIS_HOOK_PREUNINSTALL
  !insertmacro BSS_STOP_RUNNING
!macroend
