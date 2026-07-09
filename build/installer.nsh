!include LogicLib.nsh
!include nsDialogs.nsh

Var AutoStartCheckbox
Var AutoStartEnabled

!macro customInit
  StrCpy $AutoStartEnabled "0"
  ReadRegStr $0 HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "Elegant Clock"
  ${If} $0 != ""
    StrCpy $AutoStartEnabled "1"
  ${EndIf}
!macroend

!macro customPageAfterChangeDir
  Page custom AutoStartPageCreate AutoStartPageLeave
!macroend

Function AutoStartPageCreate
  nsDialogs::Create 1018
  Pop $0
  ${If} $0 == error
    Abort
  ${EndIf}

  ${NSD_CreateLabel} 0 0 100% 24u "是否在登录 Windows 后自动启动 Elegant Clock？"
  Pop $0
  ${NSD_CreateCheckbox} 0 34u 100% 18u "为当前 Windows 用户配置开机自启动"
  Pop $AutoStartCheckbox

  ${If} $AutoStartEnabled == "1"
    ${NSD_Check} $AutoStartCheckbox
  ${EndIf}

  ${NSD_CreateLabel} 0 62u 100% 34u "此选项写入当前用户的 Windows 登录启动项；安装后仍可在 Elegant Clock 的设置中再次调整。"
  Pop $0
  nsDialogs::Show
FunctionEnd

Function AutoStartPageLeave
  ${NSD_GetState} $AutoStartCheckbox $0
  ${If} $0 == ${BST_CHECKED}
    StrCpy $AutoStartEnabled "1"
  ${Else}
    StrCpy $AutoStartEnabled "0"
  ${EndIf}
FunctionEnd

!macro customInstall
  ${If} $AutoStartEnabled == "1"
    WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "Elegant Clock" "$\"$INSTDIR\${APP_EXECUTABLE_FILENAME}$\" --autostart"
  ${Else}
    DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "Elegant Clock"
  ${EndIf}
!macroend

!macro customUnInstall
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "Elegant Clock"
!macroend
