@echo off
setlocal EnableDelayedExpansion

echo ========================================================
echo       HTP 自动 SSH 配置与修复工具 (Auto SSH Fix)
echo ========================================================
echo.
echo 正在自动生成 SSH 密钥并配置 GitHub 连接...
echo (Generating SSH key and configuring GitHub connection...)
echo.

:: 1. 检查 SSH 目录
if not exist "%USERPROFILE%\.ssh" mkdir "%USERPROFILE%\.ssh"

:: 2. 生成密钥（如果有旧的会备份）
if exist "%USERPROFILE%\.ssh\id_ed25519" (
    echo [INFO] 发现已有密钥，正在备份...
    copy /Y "%USERPROFILE%\.ssh\id_ed25519" "%USERPROFILE%\.ssh\id_ed25519.bak" >nul
    copy /Y "%USERPROFILE%\.ssh\id_ed25519.pub" "%USERPROFILE%\.ssh\id_ed25519.pub.bak" >nul
)

echo [INFO] 生成新密钥...
ssh-keygen -t ed25519 -C "auto-generated-by-htp-script" -f "%USERPROFILE%\.ssh\id_ed25519" -N "" >nul 2>&1

:: 3. 启动 ssh-agent
echo [INFO] 启动 ssh-agent 服务...
powershell -Command "Get-Service ssh-agent | Set-Service -StartupType Automatic"
powershell -Command "Start-Service ssh-agent"
ssh-add "%USERPROFILE%\.ssh\id_ed25519" >nul 2>&1

:: 4. 配置 config 强制走 443 端口
echo [INFO] 配置 SSH 端口转发 (绕过防火墙)...
(
echo Host github.com
echo   HostName ssh.github.com
echo   Port 443
echo   User git
echo   StrictHostKeyChecking no
) > "%USERPROFILE%\.ssh\config"

:: 5. 修改 git 仓库地址
echo [INFO] 修改项目 Git 远程地址为 SSH...
cd /d "%~dp0"
git remote set-url origin git@github.com:xnupji/miaoda.git

echo.
echo ========================================================
echo [重要] 请按照以下步骤完成最后一步：
echo.
echo 1. 记事本会自动打开一个文件，里面有一行乱码一样的文字。
echo 2. 按 Ctrl+A 全选，Ctrl+C 复制。
echo 3. 回到 GitHub 网页，点 "New SSH key"，在 Key 那里 Ctrl+V 粘贴。
echo 4. 点 "Add SSH key" 保存。
echo 5. 保存完后，在这个黑框里按任意键，开始自动部署。
echo ========================================================
echo.

notepad "%USERPROFILE%\.ssh\id_ed25519.pub"
pause

echo.
echo 正在开始自动部署...
powershell -NoProfile -ExecutionPolicy Bypass -File ".\deploy_all.ps1"
pause
