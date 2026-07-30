@echo off
mode con cp select=437 >nul
setlocal

set "LogFile=%SystemDrive%\windows-postinstall-rds-policy.log"
set "PolicyInf=%SystemDrive%\windows-postinstall-policy.inf"
set "PolicyDb=%SystemRoot%\security\Database\reinstall-postinstall.sdb"
set "PsScript=%SystemDrive%\windows-install-rdsh.ps1"
set "TaskbarScript=%SystemDrive%\windows-taskbar-cleanup.bat"

echo [%date% %time%] Start postinstall RDS and security policy > "%LogFile%"

(
    echo [Unicode]
    echo Unicode=yes
    echo [Version]
    echo signature="$CHICAGO$"
    echo Revision=1
    echo [System Access]
    echo MinimumPasswordLength = 1
    echo MaximumPasswordAge = 999
    echo PasswordComplexity = 0
    echo [Registry Values]
    echo MACHINE\System\CurrentControlSet\Services\Netlogon\Parameters\MaximumPasswordAge=4,999
    echo MACHINE\Software\Microsoft\Windows\CurrentVersion\Policies\System\DisableCAD=4,1
) > "%PolicyInf%"

secedit /configure /db "%PolicyDb%" /cfg "%PolicyInf%" /areas SECURITYPOLICY /quiet >> "%LogFile%" 2>&1
net accounts /minpwlen:1 /maxpwage:999 /minpwage:0 /uniquepw:0 >> "%LogFile%" 2>&1

reg add "HKLM\SYSTEM\CurrentControlSet\Control\Terminal Server" /v fDenyTSConnections /t REG_DWORD /d 0 /f >> "%LogFile%" 2>&1
netsh advfirewall firewall set rule group="remote desktop" new enable=Yes >> "%LogFile%" 2>&1

rem Hide volume and battery/power tray icons for every user via machine policy.
reg add "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\Explorer" /v HideSCAVolume /t REG_DWORD /d 1 /f >> "%LogFile%" 2>&1
reg add "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\Explorer" /v HideSCAPower /t REG_DWORD /d 1 /f >> "%LogFile%" 2>&1

rem Remove default profile taskbar pins when the folder already exists.
if exist "%SystemDrive%\Users\Default\AppData\Roaming\Microsoft\Internet Explorer\Quick Launch\User Pinned\TaskBar" (
    del /f /q "%SystemDrive%\Users\Default\AppData\Roaming\Microsoft\Internet Explorer\Quick Launch\User Pinned\TaskBar\*" >> "%LogFile%" 2>&1
)

rem Apply taskbar cleanup once when the first administrator desktop session is created.
(
    echo @echo off
    echo setlocal
    echo set "LogFile=%%SystemDrive%%\windows-taskbar-cleanup.log"
    echo echo [%%date%% %%time%%] Start taskbar cleanup ^> "%%LogFile%%"
    echo reg add "HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\Explorer" /v HideSCAVolume /t REG_DWORD /d 1 /f ^>^> "%%LogFile%%" 2^>^&1
    echo reg add "HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\Explorer" /v HideSCAPower /t REG_DWORD /d 1 /f ^>^> "%%LogFile%%" 2^>^&1
    echo reg delete "HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Taskband" /f ^>^> "%%LogFile%%" 2^>^&1
    echo if exist "%%APPDATA%%\Microsoft\Internet Explorer\Quick Launch\User Pinned\TaskBar" del /f /q "%%APPDATA%%\Microsoft\Internet Explorer\Quick Launch\User Pinned\TaskBar\*" ^>^> "%%LogFile%%" 2^>^&1
    echo taskkill /f /im explorer.exe ^>^> "%%LogFile%%" 2^>^&1
    echo start explorer.exe
    echo echo [%%date%% %%time%%] Done taskbar cleanup ^>^> "%%LogFile%%"
    echo del "%%~f0"
) > "%TaskbarScript%"
reg add "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\RunOnce" /v ReinstallTaskbarCleanup /t REG_SZ /d "cmd.exe /c %TaskbarScript%" /f >> "%LogFile%" 2>&1

(
    echo $ErrorActionPreference = 'Continue'
    echo $log = '%LogFile%'
    echo "[$(Get-Date)] Start RDSH install" ^| Out-File -FilePath $log -Append -Encoding ASCII
    echo $installCommand = Get-Command Install-WindowsFeature -ErrorAction SilentlyContinue
    echo if (-not $installCommand^) { $installCommand = Get-Command Add-WindowsFeature -ErrorAction SilentlyContinue }
    echo if ($installCommand^) {
    echo     $feature = Get-WindowsFeature -Name RDS-RD-Server -ErrorAction SilentlyContinue
    echo     if ($feature -and -not $feature.Installed^) {
    echo         $result = ^& $installCommand -Name RDS-RD-Server -IncludeManagementTools -ErrorAction Continue
    echo         $result ^| Format-List * ^| Out-File -FilePath $log -Append -Encoding ASCII
    echo         if ($result.RestartNeeded -and $result.RestartNeeded.ToString(^) -ne 'No'^) {
    echo             "[$(Get-Date)] RDSH requested reboot" ^| Out-File -FilePath $log -Append -Encoding ASCII
    echo             schtasks /Create /TN "ReinstallPostInstallReboot" /SC ONCE /ST 23:59 /TR "shutdown.exe /r /t 30 /c RDSH-postinstall-reboot" /F ^| Out-File -FilePath $log -Append -Encoding ASCII
    echo             schtasks /Run /TN "ReinstallPostInstallReboot" ^| Out-File -FilePath $log -Append -Encoding ASCII
    echo         }
    echo     } elseif ($feature -and $feature.Installed^) {
    echo         "[$(Get-Date)] RDS-RD-Server already installed" ^| Out-File -FilePath $log -Append -Encoding ASCII
    echo     } else {
    echo         "[$(Get-Date)] RDS-RD-Server feature not found on this Windows edition" ^| Out-File -FilePath $log -Append -Encoding ASCII
    echo     }
    echo } else {
    echo     "[$(Get-Date)] Install-WindowsFeature/Add-WindowsFeature not available" ^| Out-File -FilePath $log -Append -Encoding ASCII
    echo }
    echo try {
    echo     $rdpGroupName = (New-Object System.Security.Principal.SecurityIdentifier 'S-1-5-32-555'^).Translate([System.Security.Principal.NTAccount]^).Value.Split('\'^)[-1]
    echo     $everyoneName = (New-Object System.Security.Principal.SecurityIdentifier 'S-1-1-0'^).Translate([System.Security.Principal.NTAccount]^).Value.Split('\'^)[-1]
    echo     "[$(Get-Date)] Add $everyoneName to $rdpGroupName" ^| Out-File -FilePath $log -Append -Encoding ASCII
    echo     net localgroup "$rdpGroupName" "$everyoneName" /add ^| Out-File -FilePath $log -Append -Encoding ASCII
    echo } catch {
    echo     "[$(Get-Date)] Failed to add Everyone to Remote Desktop Users: $($_.Exception.Message)" ^| Out-File -FilePath $log -Append -Encoding ASCII
    echo }
) > "%PsScript%"

powershell -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "%PsScript%" >> "%LogFile%" 2>&1

del "%PolicyInf%" 2>nul
del "%PsScript%" 2>nul
echo [%date% %time%] Done postinstall RDS and security policy >> "%LogFile%"
del "%~f0"
