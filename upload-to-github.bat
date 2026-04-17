@echo off
echo ========================================
echo  CivilEstimator Pro - GitHub Uploader
echo ========================================
echo.

REM Use Git from its default install location
SET GIT="C:\Program Files\Git\bin\git.exe"

%GIT% config --global user.name "Moawia Husnain"
%GIT% config --global user.email "moawiahussnaing@gmail.com"

%GIT% init
%GIT% remote remove origin 2>nul
%GIT% remote add origin https://github.com/Moawia45/COST-ESTIMATER-AI.git
%GIT% add .
%GIT% commit -m "CivilEstimator Pro - Full Release v1.0"
%GIT% branch -M main
%GIT% push -u origin main

echo.
echo ========================================
echo  Done! Check github.com/Moawia45/COST-ESTIMATER-AI
echo ========================================
pause
