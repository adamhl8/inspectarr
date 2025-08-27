Output assets/demo.gif

Set Theme "Catppuccin Macchiato"
Set WindowBar Colorful
Set FontFamily "JetBrainsMono Nerd Font"
Set Width 1250
Set Height 400
Set Padding 25

Set Shell bash
Env IS_VHS_DEMO "true"

Type "inspectarr radarr 'source == bluray && resolution ^= 1920 | SORT title'"
Sleep 1.5s
Enter
Wait

Sleep 8s
