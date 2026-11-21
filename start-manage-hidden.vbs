' Hidden start: manage API + Vite. Log: .manage-console.log in repo root.
Option Explicit

Dim sh, fso, root, logPath, i, viteOk, apiOk, distOk

Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
root = fso.GetParentFolderName(WScript.ScriptFullName)
logPath = root & "\.manage-console.log"
distOk = fso.FolderExists(root & "\manage\frontend\dist")
sh.CurrentDirectory = root

viteOk = HttpOk("http://127.0.0.1:5174/")
apiOk = HttpOk("http://127.0.0.1:8770/api/health")

If apiOk And (viteOk Or distOk) Then
  If viteOk Then
    sh.Run "http://127.0.0.1:5174/", 1, False
  Else
    sh.Run "http://127.0.0.1:8770/", 1, False
  End If
  WScript.Quit 0
End If

sh.Run "cmd /c """ & root & "\start-manage-service.bat""", 0, False

For i = 1 To 120
  WScript.Sleep 500
  viteOk = HttpOk("http://127.0.0.1:5174/")
  apiOk = HttpOk("http://127.0.0.1:8770/api/health")
  If apiOk And (viteOk Or distOk) Then Exit For
Next

If apiOk Then
  If viteOk Then
    sh.Run "http://127.0.0.1:5174/", 1, False
  ElseIf distOk Then
    sh.Run "http://127.0.0.1:8770/", 1, False
  Else
    sh.Run "http://127.0.0.1:8770/api/health", 1, False
  End If
Else
  MsgBox "Manage not ready in 60s." & vbCrLf & "Try: 博客控制台.bat debug" & vbCrLf & "Log: " & logPath, 48, "meiso-manage"
End If

Function HttpOk(url)
  On Error Resume Next
  HttpOk = False
  Dim http
  Set http = CreateObject("MSXML2.ServerXMLHTTP.6.0")
  If http Is Nothing Then Set http = CreateObject("MSXML2.XMLHTTP")
  If http Is Nothing Then Exit Function
  http.Open "GET", url, False
  http.SetTimeouts 2500, 2500, 2500, 2500
  http.Send
  If Err.Number <> 0 Then Exit Function
  HttpOk = (http.Status >= 200 And http.Status < 500)
End Function
