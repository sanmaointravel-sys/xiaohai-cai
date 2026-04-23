@echo off
chcp 65001 >nul
title 小孩菜 - 后端服务
color 0A

echo.
echo ========================================
echo   小孩菜 - 后端服务启动器
echo ========================================
echo.

set "PYTHON=C:\Program Files\Python311\python.exe"

REM 检查Python
"%PYTHON%" --version >nul 2>&1
if errorlevel 1 (
    echo [错误] 未检测到 Python，请先安装
    echo 下载地址: https://www.python.org/downloads/
    pause
    exit /b 1
)

echo [1/4] 检测Python版本...
"%PYTHON%" --version

REM 检查依赖
echo [2/4] 检查依赖...
"%PYTHON%" -c "import flask" 2>nul
if errorlevel 1 (
    echo [安装] 正在安装 Flask 等依赖（首次安装约需1分钟）...
    "%PYTHON%" -m pip install flask flask-cors pyyaml pytz requests feedparser
    if errorlevel 1 (
        echo.
        echo [错误] 依赖安装失败，请右键 [以管理员身份运行]
        pause
        exit /b 1
    )
)

REM 创建虚拟环境（可选，防止污染全局）
echo [3/4] 准备启动...
cd /d "%~dp0backend"

REM 初始化数据库
echo [4/4] 启动服务...
echo.
echo 服务地址: http://localhost:5000
echo 按 Ctrl+C 可以停止服务
echo.
"%PYTHON%" app.py

pause
