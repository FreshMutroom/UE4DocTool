# UE4DocTool
A UE4 plugin that creates documentation pages for UE4 projects, plugins and engines.

Examples of what it can do: https://freshmutroom.github.io/UE4DocTool/


Download GUI application of it here, capable of documenting UE4 projects: 
https://drive.google.com/file/d/199DYAOpCZ5nXx-vE7mViBrL9786oCODk/view?usp=sharing

To use this application requires the following:
- Windows 10 (small chance 7/8/8.1 will work)
- Visual Studio 2019 (2017 might work)
- Only works with UE4.23, UE4.24 and UE4.25 projects. In addition the engine version corrisponding to the engine association of your project must be installed (e.g. to document a 4.24 project will require UE4.24 to be installed)
- Pages it creates have been tested in Google Chrome. Other browsers might display correctly but unlikely

todo list:
- add ability to document plugins to the GUI application
- try find way to find all projects on computer for GUI application
- add ability for users to use their own designs
- Mac
- support more engine versions
- remove dependency on the UE4 docs style sheet
- make empty searches show everything (right now they show nothing)
- remove reliance on cl.exe expanding macros and instead do it myself
- cached file
