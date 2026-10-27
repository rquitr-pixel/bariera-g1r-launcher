# Bariera launcher - drives the G1R:MP game client window with ordinary mouse/keyboard input.
# Does only what a person would click. Official authentication stays in the client.
# Protocol: JSON lines on stdout {"ev":...}; reads the password as the first stdin line (before anything is clicked).
# Client 0.1.9 is GLFW/OpenGL (no UIA) -> coordinates relative to the window rect (mapped 2026-10-27).
param([string]$Exe,[string]$ServerName='Bariera',[string]$Address='57.129.157.207:7777',[int]$Timeout=60,[string]$Log,[string]$AfterGame='minimize')
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type @"
using System;using System.Runtime.InteropServices;
public class BW{
[DllImport("user32.dll",CharSet=CharSet.Unicode)]public static extern IntPtr FindWindow(string c,string t);
[DllImport("user32.dll")]public static extern bool SetForegroundWindow(IntPtr h);
[DllImport("user32.dll")]public static extern bool ShowWindow(IntPtr h,int n);
[DllImport("user32.dll")]public static extern bool IsIconic(IntPtr h);
[DllImport("user32.dll")]public static extern bool GetWindowRect(IntPtr h,out RECT r);
[DllImport("user32.dll")]public static extern bool SetCursorPos(int x,int y);
[DllImport("user32.dll")]public static extern void mouse_event(uint f,uint x,uint y,uint d,UIntPtr e);
[DllImport("user32.dll")]public static extern bool SetProcessDPIAware();
public struct RECT{public int L,T,R,B;}
}
"@
[BW]::SetProcessDPIAware()|Out-Null
function Out($ev,$extra=@{}){ $o=@{ev=$ev;t=(Get-Date).ToString('HH:mm:ss')}+$extra; $j=($o|ConvertTo-Json -Compress); [Console]::Out.WriteLine($j); [Console]::Out.Flush(); if($Log){Add-Content -Path $Log -Value $j -Encoding UTF8} }
function LPids(){ @(Get-Process -ErrorAction SilentlyContinue | Where-Object { $_.ProcessName -like 'G1RMP-Launcher*' } | ForEach-Object Id) }
function GamePid(){ $g=Get-Process -ErrorAction SilentlyContinue | Where-Object { $_.ProcessName -like 'G1R-Win64*' } | Select-Object -First 1; if($g){$g.Id} }
function GetWin(){ $w=[BW]::FindWindow('GLFW30','G1R:MP Launcher'); if($w -ne [IntPtr]::Zero){return $w}; $w=[BW]::FindWindow($null,'G1R:MP Launcher'); if($w -ne [IntPtr]::Zero){return $w}; $null }
function Front($h){ if([BW]::IsIconic($h)){[BW]::ShowWindow($h,9)|Out-Null}; [BW]::SetForegroundWindow($h)|Out-Null; Start-Sleep -m 350 }
function ClickRel($h,$rx,$ry){ Front $h; $r=New-Object BW+RECT; [BW]::GetWindowRect($h,[ref]$r)|Out-Null; $x=[int]($r.L+($r.R-$r.L)*$rx); $y=[int]($r.T+($r.B-$r.T)*$ry); [BW]::SetCursorPos($x,$y)|Out-Null; Start-Sleep -m 80; [BW]::mouse_event(2,0,0,0,[UIntPtr]::Zero); Start-Sleep -m 60; [BW]::mouse_event(4,0,0,0,[UIntPtr]::Zero); Start-Sleep -m 500 }
function Typ($t){ [Windows.Forms.SendKeys]::SendWait(($t -replace '([+^%~(){}\[\]])','{$1}')); Start-Sleep -m 300 }
# mapped points (0..1 of window rect)
$P=@{ first=@(0.313,0.256); search=@(0.84,0.121); pass=@(0.855,0.827); join=@(0.855,0.901) }
try{
  $pw=[Console]::In.ReadLine(); if([string]::IsNullOrEmpty($pw)){ Out 'FAIL' @{step='password-missing'}; exit 5 }
  if(-not (LPids)){ Start-Process -FilePath $Exe -WorkingDirectory (Split-Path $Exe) | Out-Null; Out 'LAUNCHED' } else { Out 'ALREADY_RUNNING' }
  $dl=(Get-Date).AddSeconds($Timeout); $h=$null
  while((Get-Date) -lt $dl){ $h=GetWin; if($h){break}; Start-Sleep -m 700 }
  if(-not $h){ Out 'FAIL' @{step='window'}; exit 2 }
  Out 'WINDOW' @{cls='GLFW30'}
  Start-Sleep 4   # server list loads from master
  # 1) filter list by name, select first entry
  ClickRel $h $P.search[0] $P.search[1]; [Windows.Forms.SendKeys]::SendWait('^a'); [Windows.Forms.SendKeys]::SendWait('{DEL}'); Typ $ServerName; Start-Sleep 1
  ClickRel $h $P.first[0] $P.first[1]; Out 'SERVER' @{via='click'}
  # 2) this server shows a password field -> ask app (stored encrypted) and type it
  Start-Sleep -m 1500
  ClickRel $h $P.pass[0] $P.pass[1]; ClickRel $h $P.pass[0] $P.pass[1]; [Windows.Forms.SendKeys]::SendWait('^a'); [Windows.Forms.SendKeys]::SendWait('{DEL}'); Typ $pw; Start-Sleep -m 500; $pw=$null; Out 'PASSWORD_SENT'
  ClickRel $h $P.join[0] $P.join[1]; Out 'CONNECT' @{via='click'}
  $dl=(Get-Date).AddSeconds($Timeout+60); $gp=$null; $retry=(Get-Date).AddSeconds(12); $tries=0
  while((Get-Date) -lt $dl){ $gp=GamePid; if($gp){break}; if((Get-Date) -gt $retry -and $tries -lt 2 -and -not (Get-Process G1RMP-Anticheat -EA 0)){ $tries++; ClickRel $h $P.join[0] $P.join[1]; Out 'CONNECT_RETRY' @{n=$tries}; $retry=(Get-Date).AddSeconds(12) }; Start-Sleep -m 800 }
  if(-not $gp){ Out 'FAIL' @{step='game'}; exit 6 }
  Out 'GAME' @{pid=$gp}
  # success only if the game survives ~60 s after join (server rejects bad password at hello -> game exits)
  $min=$false; $alive=(Get-Date).AddSeconds(60)
  while((Get-Date) -lt $alive){ Start-Sleep 2; if(-not (Get-Process -Id $gp -EA 0)){ Out 'FAIL' @{step='rejected'}; exit 8 }; if(-not $min -and (Get-Date) -gt $alive.AddSeconds(-50)){ $h=GetWin; if($h){ [BW]::ShowWindow($h,6)|Out-Null }; $min=$true } }
  Out 'OFFICIAL_MINIMIZED'
  Out 'DONE'; exit 0
} catch { Out 'ERROR' @{msg="$_"}; exit 9 }
