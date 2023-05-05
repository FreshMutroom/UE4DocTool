// Fill out your copyright notice in the Description page of Project Settings.

#pragma once

#if WITH_EDITOR

#include "CoreMinimal.h"
#include "Widgets/SCompoundWidget.h"
#include "Misc/TextFilter.h"
#include "Widgets/Notifications/SErrorText.h"

#include "DocToolTypes.h"

struct FArguments;
class SDocToolWidget_MainPage;
class SDocToolWidget_SelectCreateDocumentationTargetTypePage;
class SDocToolWidget_SelectCreateDocumentationTargetProjectPage;
class FJsonObject;
struct ProjectInfo;
template <typename ItemType>
class STileView;
class SSearchBox;
class SToolTip;
class SVerticalBox;
template <typename ItemType>
class SBreadcrumbTrail;
class SWidget;
class SScrollBox;
template <typename OptionType>
class SComboBox;
class SCheckBox;
struct FDocOptions;
struct EngineInfo;
struct PackagePluginTask;
class SOverlay;
struct PluginInfo;
class SMainTaskOptions;
class FUICommandInfo;


struct MainTaskOptionsState
{
	/* With paramless ctor I want all TOptionals to have bIsSet == false. 
	Does = default do that? */
	MainTaskOptionsState() = default;

	//----------------------------------------------------
	// 	   Variables
	//----------------------------------------------------

	TOptional<FText> NonEngineTargetDisplayName;
	TOptional<FString> OutputPath;
	TOptional<bool> bRunOnSeparateProcess;
	TOptional<bool> bReportProgressToNotificationWidget;
	TOptional<bool> bReportProgressToLog;
	TOptional<FText> ProgressDelegate;
	TOptional<FText> StoppedDelegate;
	TOptional<int32> NumThreads;
};


/**
 *	This widget is here to provide a GUI alternative to document stuff
 * 
 * -------------------------------------------------------------------
 *	There are 5 ways you can show this widget:
 * 
 *	1. through code: 
 *		#include "DocumentationTool.h"
 *		DocToolWidget::Show();
 * 
 *	2. via blueprint graph node "Show Doc Tool Widget" (only callable from an editor utility 
 *	blueprint or editor utility widget)
 * 
 *	3. Window > Developer Tools > Documentation Tool
 * 
 *	4. using a key binding (assign it via Edit > Editor Preferences... 
 *	then search "documentation tool")
 *
 *	5. via the console command doctool.widget.show
 * -------------------------------------------------------------------
 * 
 *	Notes about saving state:
 *	Currently only writes to GConfig when you close the widget, and I never flush (lol).
 *	I feel a little hesitant flushing cause it will update all sections in the file I think,
 *	and this might affect other parts of the engine (lots of engine code does flush though,
 *	so maybe it's ok).
 *	So this means if the editor crashes the widget's state won't be restored to how it 
 *	was next time you open editor. 
 * 
 *	You could add two enums that let's users customize how often GConfig writes/flushes happen.
 *
 *	// Whether when you close then re-open the doc tool widget, it restores it's state to how 
 *	// it was when you closed it. 
 *	enum EDocToolWidgetStatePersistance
 *	{
 *		No,
 *		Yes
 *	};
 * 
 *	enum EDocToolWidgetStateWriteToDiskFrequency
 *	{  
 *		Never,
 *		WheneverEngineDecidesTo, 
 *		OnClose,
 *		AnyChange
 *	};
 * 
 *	Note: neither of these enums control whether to show the doc tool widget on opening the 
 *	editor (that's controlled by some engine code somewhere and happens because I do
 *	RegisterTabSpawner in the doc tool module startup. If you did wanna control this you 
 *	probably just need to delete an .ini file value before calling RegisterTabSpawner).
 * 
 *	Right now we're doing EDocToolWidgetStatePersistance::Yes + EDocToolWidgetStateWriteToDiskFrequency::WheneverEngineDecidesTo.
 * 
 *	My notes on how to implement these:
 *  - first off, if "No" then we don't ever need to write to GConfig. 
 *	EDocToolWidgetStateWriteToDiskFrequency is only relevant if "Yes".
 *	- For "Never":
 *	You wanna never write to GConfig and instead write to somewhere else. You might have to 
 *	create a new variable for this (something like a static SDocToolWidget::SavedState* on
 *	on the doc tool module perhaps). We wanna avoid GConfig in case it flushes. When reopening 
 *	the widget you wanna load state from your new variable not GConfig. Just thinking about 
 *	hot reloads... you wanna make sure this variable persists through a hot reload. I don't
 *	think static vars on the module will.
 *	- For WheneverEngineDecidesTo: you have already implemented this. Nothing needed to be done.
 *	- For OnClose: all you have to do is call Flush after writing to GConfig. Actually, to 
 *	avoid a double flush (for performance) only flush if engine isn't exiting (querying
 *	GIsRequestingExit might work).
 *	- For AnyChange: you'll have to write to GConfig and Flush on every change e.g. change 
 *	page, change a main task option, etc
 */
class DOCUMENTATIONTOOL_API SDocToolWidget : public SCompoundWidget
{
public:

	SDocToolWidget();

	SLATE_BEGIN_ARGS(SDocToolWidget)
	{}
	SLATE_END_ARGS()

	/** Constructs this widget with InArgs */
	void Construct(const FArguments& InArgs);

protected:

	/* This class is used for serializing some of this widget's state. 
	
	This class never really needs to be instantiated - you can just read/write directly to 
	SDocToolWidget.variables/GConfig instead. Actually you could probably even get rid of the 
	values on SDocToolWidget such as ProjectShownOnLastOptionsPage, PluginShownOnLastOptionsPage,
	EngineShownOnLastOptionsPage, MainTaskOptionsShownOnLastOptionsPage and just use GConfig,
	maybe that's going a little too far */
	struct SavedState
	{
		void Save();
		void Load();

		static void AddToSection(FConfigSection* Section, const FName& Key, const FString& Value);
		static bool GetFromSection(const FConfigSection* Section, const FName& Key, FString& OutValue);

		static FString ToString(bool Bool);
		static bool ToBool(const FString& String);

		//----------------------------------------------------
		// 	   Variables
		//----------------------------------------------------

		static constexpr TCHAR* INI_SECTION_NAME = TEXT("Doc Tool Widget");
		static const FName NAME_OpenPage;
		static const FName NAME_LastTargetedProject;
		static const FName NAME_LastTargetedPlugin;
		static const FName NAME_LastTargetedEngine;
		static const FName NAME_NonEngineTargetDisplayName;
		static const FName NAME_OutputPath;
		static const FName NAME_RunOnSeparateProcess;
		static const FName NAME_ReportProgressToNotificationWidget;
		static const FName NAME_ReportProgressToLog;
		static const FName NAME_ProgressDelegate;
		static const FName NAME_StoppedDelegate;
		static const FName NAME_NumThreads;

		FString OpenPage;
		FString LastTargetedProject;
		FString LastTargetedPlugin;
		FString LastTargetedEngine;

		// Options page
		MainTaskOptionsState OptionsPage;
	};

	void SetStateFromStateObject(const SavedState& State);

public:

	void SetCurrentViewType_MainPage();
	void SetCurrentViewType_SelectCreateDocumentationTargetTypePage();
	void SetCurrentViewType_SelectCreateDocumentationTargetProjectPage();
	void SetCurrentViewType_SelectCreateDocumentationTargetPluginPage();
	void SetCurrentViewType_SelectCreateDocumentationTargetEnginePage();
	/* @param OpeningStateToUse - values to show originally. If null then the defaults will be 
	used */
	void SetCurrentViewType_CreateDocumentationTargetingProjectOptionsPage(TSharedPtr<ProjectInfo> TargetProject, const MainTaskOptionsState* OpeningStateToUse);
	void SetCurrentViewType_CreateDocumentationTargetingPluginOptionsPage(TSharedPtr<PluginInfo> TargetPlugin, const MainTaskOptionsState* OpeningStateToUse);
	void SetCurrentViewType_CreateDocumentationTargetingEngineOptionsPage(TSharedPtr<EngineInfo> TargetEngine, const MainTaskOptionsState* OpeningStateToUse);
	void SetCurrentViewType_ParseTargetingProjectOptionsPage(TSharedPtr<ProjectInfo> TargetProject, const MainTaskOptionsState* OpeningStateToUse);
	void SetCurrentViewType_ParseTargetingPluginOptionsPage(TSharedPtr<PluginInfo> TargetPlugin, const MainTaskOptionsState* OpeningStateToUse);
	void SetCurrentViewType_ParseTargetingEngineOptionsPage(TSharedPtr<EngineInfo> TargetEngine, const MainTaskOptionsState* OpeningStateToUse);
	void SetCurrentViewType_CreateDocumentationTargetingProjectStartedPage();
	void SetCurrentViewType_CreateDocumentationTargetingPluginStartedPage();
	void SetCurrentViewType_CreateDocumentationTargetingEngineStartedPage();
	void SetCurrentViewType_ParseTargetingProjectStartedPage();
	void SetCurrentViewType_ParseTargetingPluginStartedPage();
	void SetCurrentViewType_ParseTargetingEngineStartedPage();
	void SetCurrentViewType_SelectParseTargetTypePage();
	void SetCurrentViewType_SelectParseTargetProjectPage();
	void SetCurrentViewType_SelectParseTargetPluginPage();
	void SetCurrentViewType_SelectParseTargetEnginePage();
	void SetCurrentViewType_MiscellaneousPage();
	void SetCurrentViewType_DeveloperToolsPage();
	void SetCurrentViewType_PackageDocToolPage();

protected:

	bool ShouldShowWidget(const TSharedPtr<SWidget>& WidgetToSwitchTo);

public:

	TSharedPtr<ProjectInfo> GetProjectShownOnLastOptionsPage() const;
	TSharedPtr<PluginInfo> GetPluginShownOnLastOptionsPage() const;
	TSharedPtr<EngineInfo> GetEngineShownOnLastOptionsPage() const;

	const MainTaskOptionsState* GetMainTaskOptionsShownOnLastOptionsPage() const;

	void OnNavigateAwayFromOptionsPage(TSharedPtr<const SMainTaskOptions> OptionsWidgetPtr);

	void OnContainingTabSavingVisualState();

protected:

	void NoteDownOptionsPageState(TSharedPtr<const SMainTaskOptions> OptionsWidgetPtr);

	void CreateStateObject(SavedState& OutState);

	//----------------------------------------------------
	// 	   Variables
	//----------------------------------------------------

	TSharedPtr<SBorder> ViewContainer;
	TSharedPtr<SWidget>* CurrentPage;

	// SDocToolWidget_MainPage
	TSharedPtr<SWidget> MainPage;

	// SDocToolWidget_SelectCreateDocumentationTargetTypePage
	TSharedPtr<SWidget> SelectCreateDocumentationTargetTypePage;
	
	// SDocToolWidget_SelectCreateDocumentationTargetProjectPage
	TSharedPtr<SWidget> SelectCreateDocumentationTargetProjectPage;

	// SDocToolWidget_SelectCreateDocumentationTargetPluginPage
	TSharedPtr<SWidget> SelectCreateDocumentationTargetPluginPage;

	// SDocToolWidget_SelectCreateDocumentationTargetEnginePage
	TSharedPtr<SWidget> SelectCreateDocumentationTargetEnginePage;

	// SDocToolWidget_CreateDocumentationTargetingProjectOptionsPage
	TSharedPtr<SWidget> CreateDocumentationTargetingProjectOptionsPage;

	// SDocToolWidget_CreateDocumentationTargetingPluginOptionsPage
	TSharedPtr<SWidget> CreateDocumentationTargetingPluginOptionsPage;

	// SDocToolWidget_CreateDocumentationTargetingEngineOptionsPage
	TSharedPtr<SWidget> CreateDocumentationTargetingEngineOptionsPage;

	// SDocToolWidget_CreateDocumentationTargetingProjectStartedPage
	TSharedPtr<SWidget> CreateDocumentationTargetingProjectStartedPage;

	// SDocToolWidget_CreateDocumentationTargetingPluginStartedPage
	TSharedPtr<SWidget> CreateDocumentationTargetingPluginStartedPage;

	// SDocToolWidget_CreateDocumentationTargetingEngineStartedPage
	TSharedPtr<SWidget> CreateDocumentationTargetingEngineStartedPage;

	// SDocToolWidget_SelectParseTargetTypePage
	TSharedPtr<SWidget> SelectParseTargetTypePage;

	// SDocToolWidget_SelectParseTargetProjectPage
	TSharedPtr<SWidget> SelectParseTargetProjectPage;

	// SDocToolWidget_SelectParseTargetPluginPage
	TSharedPtr<SWidget> SelectParseTargetPluginPage;

	// SDocToolWidget_SelectParseTargetEnginePage
	TSharedPtr<SWidget> SelectParseTargetEnginePage;

	// SDocToolWidget_ParseTargetingProjectOptionsPage
	TSharedPtr<SWidget> ParseTargetingProjectOptionsPage;

	// SDocToolWidget_ParseTargetingPluginOptionsPage
	TSharedPtr<SWidget> ParseTargetingPluginOptionsPage;

	// SDocToolWidget_ParseTargetingEngineOptionsPage
	TSharedPtr<SWidget> ParseTargetingEngineOptionsPage;

	// SDocToolWidget_ParseTargetingProjectStartedPage
	TSharedPtr<SWidget> ParseTargetingProjectStartedPage;

	// SDocToolWidget_ParseTargetingPluginStartedPage
	TSharedPtr<SWidget> ParseTargetingPluginStartedPage;

	// SDocToolWidget_ParseTargetingEngineStartedPage
	TSharedPtr<SWidget> ParseTargetingEngineStartedPage;

	// SDocToolWidget_MiscellaneousPage
	TSharedPtr<SWidget> MiscellaneousPage;

	// SDocToolWidget_DeveloperToolsPage
	TSharedPtr<SWidget> DeveloperToolsPage;

	// SDocToolWidget_PackageDocToolPage
	TSharedPtr<SWidget> PackageDocToolPage;

	TSharedPtr<ProjectInfo> ProjectShownOnLastOptionsPage;
	TSharedPtr<PluginInfo> PluginShownOnLastOptionsPage;
	TSharedPtr<EngineInfo> EngineShownOnLastOptionsPage;

	MainTaskOptionsState MainTaskOptionsShownOnLastOptionsPage;
};


enum class EDocToolWidgetPageType : uint8
{
	Main,
	SelectCreateDocumentationTargetType,
	SelectCreateDocumentationTargetProject,
	SelectCreateDocumentationTargetPlugin,
	SelectCreateDocumentationTargetEngine,
	CreateDocumentationTargetingProjectOptions,
	CreateDocumentationTargetingPluginOptions,
	CreateDocumentationTargetingEngineOptions,
	CreateDocumentationTargetingProjectStarted,
	CreateDocumentationTargetingPluginStarted,
	CreateDocumentationTargetingEngineStarted,
	SelectParseTargetType,
	SelectParseTargetProject,
	SelectParseTargetPlugin,
	SelectParseTargetEngine,
	ParseTargetingProjectOptions,
	ParseTargetingPluginOptions,
	ParseTargetingEngineOptions,
	ParseTargetingProjectStarted,
	ParseTargetingPluginStarted,
	ParseTargetingEngineStarted,
	Miscellaneous,
	DeveloperTools,
	PackageDocTool
};


struct DocToolWidgetPageInfo
{
	DocToolWidgetPageInfo() = delete;
	explicit DocToolWidgetPageInfo(const FText& InHistoryCrumbPathDisplayName, EDocToolWidgetPageType InType)
		: HistoryCrumbPathDisplayName(InHistoryCrumbPathDisplayName)
		, Type(InType)
	{}

	FText HistoryCrumbPathDisplayName;
	EDocToolWidgetPageType Type;
};


class DocToolWidgetConstants
{
public:

	static FSlateColor GetErrorColor()
	{
		return FLinearColor::Red;
	}

	// For SMainTaskOptions
	static FSlateColor GetTextEntryBackgroundColor()
	{
		return FLinearColor(0.625f, 0.625f, 0.625f);
	}
};


/* Delegates for the widget history crumb trail */
DECLARE_DELEGATE_OneParam(FOnDocToolWidgetCrumbClicked, const EDocToolWidgetPageType&);

#if ENGINE_VERSION_EQUAL_OR_NEWER_THAN(4, 24)
typedef TSharedRef<SWidget> FGetDocToolWidgetCrumbMenuContent_RetValType;
#else
typedef TSharedPtr<SWidget> FGetDocToolWidgetCrumbMenuContent_RetValType;
#endif

DECLARE_DELEGATE_RetVal_OneParam(FGetDocToolWidgetCrumbMenuContent_RetValType, FGetDocToolWidgetCrumbMenuContent, const EDocToolWidgetPageType&);


class SDocToolWidget_MainPage : public SCompoundWidget
{
public:

	static DocToolWidgetPageInfo GetHistoryCrumbTrailInfo();

	SDocToolWidget_MainPage();

	SLATE_BEGIN_ARGS(SDocToolWidget_MainPage)
		: _DocToolWidget(nullptr)
	{}

		SLATE_ARGUMENT(SDocToolWidget*, DocToolWidget)

	SLATE_END_ARGS()

	/** Constructs this widget with InArgs */
	void Construct(const FArguments& InArgs);

protected:

	void OnHistoryPathClicked(const EDocToolWidgetPageType& CrumbData);
	FGetDocToolWidgetCrumbMenuContent_RetValType OnGetCrumbDelimiterContent(const EDocToolWidgetPageType& CrumbData);

	FReply OnCreateDocumentationButtonClicked();

	FReply OnParseButtonClicked();

	FReply OnMiscellaneousButtonClicked();

	FReply OnDeveloperToolsButtonClicked();

	//----------------------------------------------------
	// 	   Variables
	//----------------------------------------------------

	SDocToolWidget* DocToolWidget;
};


/* A widget that lets you choose the target type for a doc tool main task. The 3 targets are 
project, plugin and engine */
class STargetTypeSelector : public SCompoundWidget
{
public:

	SLATE_BEGIN_ARGS(STargetTypeSelector)
	{}

		SLATE_EVENT(FOnDocToolWidgetCrumbClicked, OnCrumbClicked)

		SLATE_EVENT(FGetDocToolWidgetCrumbMenuContent, GetCrumbMenuContent)

		SLATE_ARGUMENT(TArray<DocToolWidgetPageInfo>, CrumbTrail)

		SLATE_EVENT(FOnClicked, OnProjectButtonClicked)
		
		SLATE_EVENT(FOnClicked, OnPluginButtonClicked)
		
		SLATE_EVENT(FOnClicked, OnEngineButtonClicked)

		SLATE_EVENT(FOnClicked, OnBackButtonClicked)

	SLATE_END_ARGS()

	/** Constructs this widget with InArgs */
	void Construct(const FArguments& InArgs);
};


class SDocToolWidget_SelectCreateDocumentationTargetTypePage : public SCompoundWidget
{
public:

	static DocToolWidgetPageInfo GetHistoryCrumbTrailInfo();

	SDocToolWidget_SelectCreateDocumentationTargetTypePage();

	SLATE_BEGIN_ARGS(SDocToolWidget_SelectCreateDocumentationTargetTypePage)
		: _DocToolWidget(nullptr)
	{}

		SLATE_ARGUMENT(SDocToolWidget*, DocToolWidget)

	SLATE_END_ARGS()

	/** Constructs this widget with InArgs */
	void Construct(const FArguments& InArgs);

protected:

	void OnHistoryPathClicked(const EDocToolWidgetPageType& CrumbData);
	FGetDocToolWidgetCrumbMenuContent_RetValType OnGetCrumbDelimiterContent(const EDocToolWidgetPageType& CrumbData);

	FReply OnProjectButtonClicked();
	FReply OnPluginButtonClicked();
	FReply OnEngineButtonClicked();
	FReply OnBackButtonClicked();

	//----------------------------------------------------
	// 	   Variables
	//----------------------------------------------------

	SDocToolWidget* DocToolWidget;
};


class SDocToolWidget_SelectParseTargetTypePage : public SCompoundWidget
{
public:

	static DocToolWidgetPageInfo GetHistoryCrumbTrailInfo();

	SDocToolWidget_SelectParseTargetTypePage();

	SLATE_BEGIN_ARGS(SDocToolWidget_SelectParseTargetTypePage)
		: _DocToolWidget(nullptr)
	{}

		SLATE_ARGUMENT(SDocToolWidget*, DocToolWidget)

	SLATE_END_ARGS()

	/** Constructs this widget with InArgs */
	void Construct(const FArguments& InArgs);

protected:

	void OnHistoryPathClicked(const EDocToolWidgetPageType& CrumbData);
	FGetDocToolWidgetCrumbMenuContent_RetValType OnGetCrumbDelimiterContent(const EDocToolWidgetPageType& CrumbData);

	FReply OnProjectButtonClicked();
	FReply OnPluginButtonClicked();
	FReply OnEngineButtonClicked();
	FReply OnBackButtonClicked();

	//----------------------------------------------------
	// 	   Variables
	//----------------------------------------------------

	SDocToolWidget* DocToolWidget;
};


/* Some information about an unreal engine project */
struct ProjectInfo
{
	/* Returns TSharedPtr<FJsonObject>(nullptr) if error */
	static TSharedPtr<FJsonObject> LoadUProjectFile(const FString& ProjectsUProjectFilePath);

	static TSharedPtr<FSlateDynamicImageBrush> GetThumbnailForProject(const FString& ProjectsPath, const FString& ProjectsName);

	static bool GetEngineIdentifierFromProjectFile(
		const FString& ProjectsUProjectFilePath, 
		TSharedPtr<FJsonObject> TargetProjectsUProjectFileContents,
		FString& OutIdentifier
	);

	static bool GetCategoryFromProjectFile(
		TSharedPtr<FJsonObject> TargetProjectsUProjectFileContents,
		FString& OutCategory
	);

	static bool GetDescriptionFromProjectFile(
		TSharedPtr<FJsonObject> TargetProjectsUProjectFileContents,
		FString& OutDescription
	);

	explicit ProjectInfo(const FString& ProjectsUProjectFilePath, TSharedPtr<FJsonObject> TargetProjectsUProjectFileContents);


	//----------------------------------------------------
	// 	   Variables
	//----------------------------------------------------

	FString Name;

	FString Path;

	TSharedPtr<FSlateDynamicImageBrush> Thumbnail;

	FString EngineIdentifier;

	FString Category;

	FString Description;
};


struct ProjectCategoryInfo
{
	TArray<TSharedPtr<ProjectInfo>> Projects;
	TArray<TSharedPtr<ProjectInfo>> FilteredProjects;
	TSharedPtr<STileView<TSharedPtr<ProjectInfo>>> ProjectTileView;
};


class PredefinedProjectCategories
{
public:

	static const FString MyProjects;
	static const FString Samples;
};


/** 
 *	This widget is similar to SProjectBrowser.
 *	
 *	One thing that is off is that when selecting projects from another category from the 
 *	one already selected there is a small delay in unhighlighting the previous selection. 
 *	This is also the case for SProjectBrowser, so it isn't any of my code doing this 
 *	probably. Would be cool to fix it though 
 */
class DOCUMENTATIONTOOL_API SMyProjectBrowser : public SCompoundWidget
{
public:

	DECLARE_DELEGATE_OneParam(FOnMouseButtonDoubleClickOnProject, TSharedPtr<ProjectInfo>);
	DECLARE_DELEGATE_RetVal_OneParam(FReply, FOnBackButtonClicked, TSharedPtr<ProjectInfo>);
	DECLARE_DELEGATE_RetVal_OneParam(FReply, FOnContinueButtonClicked, TSharedPtr<ProjectInfo>);

public:

	SMyProjectBrowser();

	SLATE_BEGIN_ARGS(SMyProjectBrowser)
	{}

		SLATE_EVENT(FOnDocToolWidgetCrumbClicked, OnHistoryPathClicked)

		SLATE_EVENT(FGetDocToolWidgetCrumbMenuContent, OnGetCrumbDelimiterContent)

		SLATE_ARGUMENT(TArray<DocToolWidgetPageInfo>, CrumbTrail)

		SLATE_EVENT(FOnMouseButtonDoubleClickOnProject, HandleProjectItemDoubleClick)

		SLATE_EVENT(FOnBackButtonClicked, OnBackButtonClicked)

		SLATE_EVENT(FOnContinueButtonClicked, OnContinueButtonClicked)

	SLATE_END_ARGS()

	/** Constructs this widget with InArgs */
	void Construct(const FArguments& InArgs);

protected:

	FMargin GetMainBorderPadding() const;

	void FindProjects();

	void ConstructCategory(
		const TSharedRef<SVerticalBox>& InCategoriesBox, 
		const FString& CategoryName,
		const TSharedRef<ProjectCategoryInfo>& CategoryInfo
	);

	TSharedRef<ITableRow> MakeProjectViewWidget(TSharedPtr<ProjectInfo> ProjectItem, const TSharedRef<STableViewBase>& OwnerTable);

	static TSharedRef<SToolTip> MakeProjectToolTip(TSharedPtr<ProjectInfo> ProjectItem);

	static void AddToToolTipInfoBox(const TSharedRef<SVerticalBox>& InfoBox, const FText& Key, const FText& Value);

	EVisibility GetProjectCategoryVisibility(const TSharedRef<ProjectCategoryInfo> InCategory) const;

	EVisibility GetNoProjectsErrorVisibility() const;

	EVisibility GetNoProjectsAfterFilterErrorVisibility() const;

	void HandleProjectItemDoubleClick(TSharedPtr<ProjectInfo> TemplateItem);

	void HandleProjectViewSelectionChanged(TSharedPtr<ProjectInfo> ProjectItem, ESelectInfo::Type SelectInfo, FText CategoryName);

	void OnFilterTextChanged(const FText& InText);

	void PopulateFilteredProjectCategories();

	EVisibility GetFilterActiveOverlayVisibility() const;

	FText GetItemHighlightText() const;

	FReply OnRefreshButtonClicked();

	FReply OnBackButtonClicked();

	FReply OnManuallyLocateProjectButtonClicked();

	FReply OnAskAutoLoadNoButtonClicked(FString SelectedFilesPath_Abs, FString SelectedFile_Abs, bool bProjectAlreadyKnownAbout);
	FReply OnAskAutoLoadYesButtonClicked(FString SelectedFilesPath_Abs, FString SelectedFile_Abs, bool bProjectAlreadyKnownAbout);
	void PostProjectManuallyLocated(const FString& SelectedFilesPath_Abs, const FString& SelectedFile_Abs, bool bProjectAlreadyKnownAbout);

	void SelectProject(const FString& ProjectFilePath, bool bScrollProjectIntoView = true);

	FReply OnContinueButtonClicked();

	bool HandleContinueButtonIsEnabled() const;

	//----------------------------------------------------
	// 	   Variables
	//----------------------------------------------------

	TSharedPtr<SVerticalBox> CategoriesBox;

	TSharedPtr<SOverlay> OverlayForPopupsPtr;

	TSharedPtr<SSearchBox> SearchBoxPtr;

	typedef TTextFilter<const TSharedPtr<ProjectInfo>> ProjectItemTextFilter;
	ProjectItemTextFilter ProjectItemFilter;

	int32 ThumbnailBorderPadding;
	int32 ThumbnailSize;

	/** 
	 *	Paths to .uplugin files that the user manually located but does not want us to 
	 *	remember for next time. 
	 *	
	 *	Note: you can whack this on SDocToolWidget so it gets remembered for the lifetime 
	 *	of the widget being open, or you could whack it on FDocumentationToolModule for 
	 *	it to be remembered for the lifetime of the module (which will be the lifetime 
	 *	of the editor) 
	 */
	TArray<FString> NonRememberedManuallyLocatedProjects;

	/* Holds info about unreal engine projects */
	TArray<TSharedPtr<ProjectInfo>> ProjectInfos;

	/* E.g. "My Projects", "Samples".
	Key == category name, value == index in ProjectInfos.
	Also, should this be case sensitive? Honestly haven't checked @todo */
	TMap<FString, TSharedPtr<ProjectCategoryInfo>> ProjectCategories;

	int32 NumFilteredProjects;

	/* I'm not really sure why/if this is needed - I just blindly copied it from SProjectBrowser.
	Figured it out I think: it's to prevent the ClearSelection call in 
	HandleProjectViewSelectionChanged from doing anything in HandleProjectViewSelectionChanged 
	(ClearSelection can call it again) */
	bool bPreventSelectionChangeEvent;

	TSharedPtr<ProjectInfo> SelectedProject;

	FOnMouseButtonDoubleClickOnProject HandleProjectItemDoubleClickDelegate;
	FOnBackButtonClicked OnBackButtonClickedDelegate;
	FOnContinueButtonClicked OnContinueButtonClickedDelegate;
};


class SDocToolWidget_SelectCreateDocumentationTargetProjectPage : public SCompoundWidget
{
public:

	static DocToolWidgetPageInfo GetHistoryCrumbTrailInfo();

	SDocToolWidget_SelectCreateDocumentationTargetProjectPage();

	SLATE_BEGIN_ARGS(SDocToolWidget_SelectCreateDocumentationTargetProjectPage)
		: _DocToolWidget(nullptr)
	{}

		SLATE_ARGUMENT(SDocToolWidget*, DocToolWidget)

	SLATE_END_ARGS()

	void Construct(const FArguments& InArgs);

protected:

	void OnHistoryPathClicked(const EDocToolWidgetPageType& CrumbData);
	FGetDocToolWidgetCrumbMenuContent_RetValType OnGetCrumbDelimiterContent(const EDocToolWidgetPageType& CrumbData);

	void HandleProjectItemDoubleClick(TSharedPtr<ProjectInfo> DoubleClickedItem);

	FReply OnBackButtonClicked(TSharedPtr<ProjectInfo> SelectedItem);

	FReply OnContinueButtonClicked(TSharedPtr<ProjectInfo> SelectedItem);

	//----------------------------------------------------
	// 	   Variables
	//----------------------------------------------------

	SDocToolWidget* DocToolWidget;
};


class SDocToolWidget_SelectParseTargetProjectPage : public SCompoundWidget
{
public:

	static DocToolWidgetPageInfo GetHistoryCrumbTrailInfo();

	SDocToolWidget_SelectParseTargetProjectPage();

	SLATE_BEGIN_ARGS(SDocToolWidget_SelectParseTargetProjectPage)
		: _DocToolWidget(nullptr)
	{}

		SLATE_ARGUMENT(SDocToolWidget*, DocToolWidget)

	SLATE_END_ARGS()

	void Construct(const FArguments& InArgs);

protected:

	void OnHistoryPathClicked(const EDocToolWidgetPageType& CrumbData);
	FGetDocToolWidgetCrumbMenuContent_RetValType OnGetCrumbDelimiterContent(const EDocToolWidgetPageType& CrumbData);

	void HandleProjectItemDoubleClick(TSharedPtr<ProjectInfo> DoubleClickedItem);

	FReply OnBackButtonClicked(TSharedPtr<ProjectInfo> SelectedItem);

	FReply OnContinueButtonClicked(TSharedPtr<ProjectInfo> SelectedItem);

	//----------------------------------------------------
	// 	   Variables
	//----------------------------------------------------

	SDocToolWidget* DocToolWidget;
};


struct PluginGroupInfo
{
	static TSharedPtr<FJsonObject> LoadUPluginFile(const FString& UPluginFilePath);

	static TSharedPtr<FSlateDynamicImageBrush> GetIcon(const FString& PluginsUPluginFilePath);

	PluginGroupInfo() = delete;

	/* @param UPluginFileContents - the file contents of the .uplugin file of the first entry 
	in the Paths param */
	explicit PluginGroupInfo(const FString& InName, const TArray<FString>& InPaths, TSharedPtr<FJsonObject> UPluginFileContents);

	//----------------------------------------------------
	// 	   Variables
	//----------------------------------------------------

	FString Name;

	FString FriendlyName;

	TArray<FString> Paths;

	TSharedPtr<FSlateDynamicImageBrush> Thumbnail;

	FString Category;

	FString Description;
};


struct PluginInfo
{
	PluginInfo() = delete;
	explicit PluginInfo(const FString& InName, const FString& InPath, const FString& InFriendlyName)
		: Name(InName)
		, Path(InPath)
		, FriendlyName(InFriendlyName)
	{}

	FString Name;
	FString Path;
	FString FriendlyName;
};


struct PluginCategoryInfo
{
	TArray<TSharedPtr<PluginGroupInfo>> Plugins;
	TArray<TSharedPtr<PluginGroupInfo>> FilteredPlugins;
	TSharedPtr<STileView<TSharedPtr<PluginGroupInfo>>> PluginTileView;
};


class DOCUMENTATIONTOOL_API SMyPluginBrowser : public SCompoundWidget
{
public:

	DECLARE_DELEGATE_OneParam(FOnMouseButtonDoubleClickOnPlugin, TSharedPtr<PluginGroupInfo>);
	DECLARE_DELEGATE_RetVal_OneParam(FReply, FOnBackButtonClicked, TSharedPtr<PluginInfo>);
	DECLARE_DELEGATE_RetVal_OneParam(FReply, FOnContinueButtonClicked, TSharedPtr<PluginInfo>);

public:

	SMyPluginBrowser();

	SLATE_BEGIN_ARGS(SMyPluginBrowser)
	{}

		SLATE_EVENT(FOnDocToolWidgetCrumbClicked, OnHistoryPathClicked)

		SLATE_EVENT(FGetDocToolWidgetCrumbMenuContent, OnGetCrumbDelimiterContent)

		SLATE_ARGUMENT(TArray<DocToolWidgetPageInfo>, CrumbTrail)

		SLATE_EVENT(FOnMouseButtonDoubleClickOnPlugin, HandlePluginItemDoubleClick)

		SLATE_EVENT(FOnBackButtonClicked, OnBackButtonClicked)

		SLATE_EVENT(FOnContinueButtonClicked, OnContinueButtonClicked)

	SLATE_END_ARGS()

	/** Constructs this widget with InArgs */
	void Construct(const FArguments& InArgs);

protected:

	FMargin GetMainBorderPadding() const;

	void FindPlugins();

	void ConstructCategory(
		const TSharedRef<SVerticalBox>& InCategoriesBox,
		const FString& CategoryName,
		const TSharedRef<PluginCategoryInfo>& CategoryInfo
	);

	TSharedRef<ITableRow> MakePluginViewWidget(TSharedPtr<PluginGroupInfo> PluginItem, const TSharedRef<STableViewBase>& OwnerTable);

	static TSharedRef<SToolTip> MakePluginToolTip(TSharedPtr<PluginGroupInfo> PluginItem);

	static void AddToToolTipInfoBox(const TSharedRef<SVerticalBox>& InfoBox, const FText& Key, const FText& Value);

	EVisibility GetPluginCategoryVisibility(const TSharedRef<PluginCategoryInfo> InCategory) const;

	EVisibility GetNoPluginsErrorVisibility() const;

	EVisibility GetNoPluginsAfterFilterErrorVisibility() const;

	void HandlePluginItemDoubleClick(TSharedPtr<PluginGroupInfo> TemplateItem);

	void HandlePluginViewSelectionChanged(TSharedPtr<PluginGroupInfo> PluginItem, ESelectInfo::Type SelectInfo, FText CategoryName);

	void OnFilterTextChanged(const FText& InText);

	void PopulateFilteredPluginCategories();

	EVisibility GetFilterActiveOverlayVisibility() const;

	FText GetItemHighlightText() const;

	FReply OnRefreshButtonClicked();

	bool HandleVersionComboBoxIsEnabled() const;

	void OnVersionComboBoxSelectionChanged(TSharedPtr<FString> Selection, ESelectInfo::Type SelectInfo);

	TSharedRef<SWidget> MakeVersionComboBoxItemWidget(TSharedPtr<FString> InItem);

	FText GetPluginVersionComboBoxSelectionText() const;

	FReply OnBackButtonClicked();

	FReply OnManuallyLocatePluginButtonClicked();

	FReply OnAskAutoLoadNoButtonClicked(FString PluginName, FString SelectedFile_Abs, bool bPluginAlreadyKnownAbout);
	FReply OnAskAutoLoadYesButtonClicked(FString PluginName, FString SelectedFile_Abs, bool bPluginAlreadyKnownAbout);
	void PostPluginManuallyLocated(const FString& PluginName, const FString& SelectedFile_Abs, bool bPluginAlreadyKnownAbout);

	void SelectPlugin(const FString& PluginName, const FString& PluginFilesFilePath, bool bScrollPluginIntoView = true);

	FReply OnContinueButtonClicked();

	bool HandleContinueButtonIsEnabled() const;

	//----------------------------------------------------
	// 	   Variables
	//----------------------------------------------------

	TSharedPtr<SVerticalBox> CategoriesBox;

	TSharedPtr<SOverlay> OverlayForPopupsPtr;

	TSharedPtr<SSearchBox> SearchBoxPtr;

	TSharedPtr<SComboBox<TSharedPtr<FString>>> PluginVersionComboBoxPtr;

	typedef TTextFilter<const TSharedPtr<PluginGroupInfo>> PluginItemTextFilter;
	PluginItemTextFilter PluginItemFilter;

	int32 ThumbnailBorderPadding;
	int32 ThumbnailSize;

	TArray<FString> NonRememberedManuallyLocatedPlugins;

	/* Holds info about unreal engine plugins */
	TArray<TSharedPtr<PluginGroupInfo>> PluginInfos;

	TMap<FString, TSharedPtr<PluginCategoryInfo>> PluginCategories;

	int32 NumFilteredPlugins;

	/* I'm not really sure why/if this is needed - I just blindly copied it from SProjectBrowser */
	bool bPreventSelectionChangeEvent;

	TSharedPtr<PluginGroupInfo> SelectedPluginGroup;

	/* Instead of having this array you could change PluginInfo::Paths from TArray<FString>
	to TArray<TSharedPtr<FString>>. I chose this way so the time it takes to load widget
	decreases. Most people would do it the other way */
	TArray<TSharedPtr<FString>> SelectedPluginGroupsPaths;

	FOnMouseButtonDoubleClickOnPlugin HandlePluginItemDoubleClickDelegate;
	FOnBackButtonClicked OnBackButtonClickedDelegate;
	FOnContinueButtonClicked OnContinueButtonClickedDelegate;
};


class SDocToolWidget_SelectCreateDocumentationTargetPluginPage : public SCompoundWidget
{
public:

	static DocToolWidgetPageInfo GetHistoryCrumbTrailInfo();

	SDocToolWidget_SelectCreateDocumentationTargetPluginPage();

	SLATE_BEGIN_ARGS(SDocToolWidget_SelectCreateDocumentationTargetPluginPage)
		: _DocToolWidget(nullptr)
	{}

		SLATE_ARGUMENT(SDocToolWidget*, DocToolWidget)

	SLATE_END_ARGS()
			
	void Construct(const FArguments& InArgs);

protected:

	void OnHistoryPathClicked(const EDocToolWidgetPageType& CrumbData);
	FGetDocToolWidgetCrumbMenuContent_RetValType OnGetCrumbDelimiterContent(const EDocToolWidgetPageType& CrumbData);
	
	void HandlePluginItemDoubleClick(TSharedPtr<PluginGroupInfo> DoubleClickedItem);
	
	FReply OnBackButtonClicked(TSharedPtr<PluginInfo> SelectedItem);
	
	FReply OnContinueButtonClicked(TSharedPtr<PluginInfo> SelectedItem);

	//----------------------------------------------------
	// 	   Variables
	//----------------------------------------------------

	SDocToolWidget* DocToolWidget;
};


class SDocToolWidget_SelectParseTargetPluginPage : public SCompoundWidget
{
public:

	static DocToolWidgetPageInfo GetHistoryCrumbTrailInfo();

	SDocToolWidget_SelectParseTargetPluginPage();

	SLATE_BEGIN_ARGS(SDocToolWidget_SelectParseTargetPluginPage)
		: _DocToolWidget(nullptr)
	{}

		SLATE_ARGUMENT(SDocToolWidget*, DocToolWidget)

	SLATE_END_ARGS()

	void Construct(const FArguments& InArgs);

protected:

	void OnHistoryPathClicked(const EDocToolWidgetPageType& CrumbData);
	FGetDocToolWidgetCrumbMenuContent_RetValType OnGetCrumbDelimiterContent(const EDocToolWidgetPageType& CrumbData);

	void HandlePluginItemDoubleClick(TSharedPtr<PluginGroupInfo> DoubleClickedItem);

	FReply OnBackButtonClicked(TSharedPtr<PluginInfo> SelectedItem);

	FReply OnContinueButtonClicked(TSharedPtr<PluginInfo> SelectedItem);

	//----------------------------------------------------
	// 	   Variables
	//----------------------------------------------------

	SDocToolWidget* DocToolWidget;
};


struct VeryBasicEngineInfo
{
	VeryBasicEngineInfo() = delete;
	explicit VeryBasicEngineInfo(const FString& InVersion, const FString& InPath)
		: Version(InVersion)
		, Path(InPath)
	{}

	/* Implemented for TArray::Contains */
	friend bool operator==(const VeryBasicEngineInfo& S1, const VeryBasicEngineInfo& S2)
	{
		return S1.Path == S2.Path;
	}

	/* Implemented for TArray::Contains */
	friend bool operator==(const VeryBasicEngineInfo& S1, const FString& S2)
	{
		return S1.Path == S2;
	}

	//----------------------------------------------------
	// 	   Variables
	//----------------------------------------------------

	FString Version;
	FString Path;
};


struct EngineInfo
{
	explicit EngineInfo(const FString& EngineVersion, const FString& EnginePath);

	//----------------------------------------------------
	// 	   Variables
	//----------------------------------------------------

	FString Name;

	FString Path;

	FString Category;

	TSharedPtr<FSlateDynamicImageBrush> Thumbnail;
};


struct EngineCategoryInfo
{
	TArray<TSharedPtr<EngineInfo>> Engines;
	TArray<TSharedPtr<EngineInfo>> FilteredEngines;
	TSharedPtr<STileView<TSharedPtr<EngineInfo>>> EngineTileView;
};


class PredefinedEngineCategories
{
public:

	/* Engines installed via the epic games launcher or something */
	static const FString Official;
	/* Engines you didn't install via the epic games launcher or something */
	static const FString Custom;
	/* Engines you've manually located and we don't know whether they're official or custom */
	static const FString Unknown;
};


class DOCUMENTATIONTOOL_API SMyEngineBrowser : public SCompoundWidget
{
public:

	DECLARE_DELEGATE_OneParam(FOnMouseButtonDoubleClickOnEngine, TSharedPtr<EngineInfo>);
	DECLARE_DELEGATE_RetVal_OneParam(FReply, FOnBackButtonClicked, TSharedPtr<EngineInfo>);
	DECLARE_DELEGATE_RetVal_OneParam(FReply, FOnContinueButtonClicked, TSharedPtr<EngineInfo>);

public:

	SMyEngineBrowser();

	SLATE_BEGIN_ARGS(SMyEngineBrowser)
	{}

		SLATE_EVENT(FOnDocToolWidgetCrumbClicked, OnHistoryPathClicked)

		SLATE_EVENT(FGetDocToolWidgetCrumbMenuContent, OnGetCrumbDelimiterContent)

		SLATE_ARGUMENT(TArray<DocToolWidgetPageInfo>, CrumbTrail)

		SLATE_EVENT(FOnMouseButtonDoubleClickOnEngine, HandleEngineItemDoubleClick)

		SLATE_EVENT(FOnBackButtonClicked, OnBackButtonClicked)

		SLATE_EVENT(FOnContinueButtonClicked, OnContinueButtonClicked)

	SLATE_END_ARGS()

	/** Constructs this widget with InArgs */
	void Construct(const FArguments& InArgs);

protected:

	FMargin GetMainBorderPadding() const;

	void FindEngines();

	void ConstructCategory(
		const TSharedRef<SVerticalBox>& InCategoriesBox,
		const FString& CategoryName,
		const TSharedRef<EngineCategoryInfo>& CategoryInfo
	);

	TSharedRef<ITableRow> MakeEngineViewWidget(TSharedPtr<EngineInfo> EngineItem, const TSharedRef<STableViewBase>& OwnerTable);

	static TSharedRef<SToolTip> MakeEngineToolTip(TSharedPtr<EngineInfo> EngineItem);

	static void AddToToolTipInfoBox(const TSharedRef<SVerticalBox>& InfoBox, const FText& Key, const FText& Value);

	EVisibility GetEngineCategoryVisibility(const TSharedRef<EngineCategoryInfo> InCategory) const;

	EVisibility GetNoEnginesAfterFilterErrorVisibility() const;

	void HandleEngineItemDoubleClick(TSharedPtr<EngineInfo> TemplateItem);

	void HandleEngineViewSelectionChanged(TSharedPtr<EngineInfo> EngineItem, ESelectInfo::Type SelectInfo, FText CategoryName);

	void OnFilterTextChanged(const FText& InText);

	void PopulateFilteredEngineCategories();

	EVisibility GetFilterActiveOverlayVisibility() const;

	FText GetItemHighlightText() const;

	FReply OnRefreshButtonClicked();

	FReply OnBackButtonClicked();

	FReply OnManuallyLocateEngineButtonClicked();

public:

	/* Checks whether a directory is where an unreal engine is installed. If yes also figures out 
	the engine's version */
	static bool IsValidEngineDirectory(const FString& Directory, FString* OutEngineVersion = nullptr);

protected:

	FReply OnAskAutoLoadNoButtonClicked(FString EngineVersion, FString SelectedDirectory, bool bEngineAlreadyKnownAbout);
	FReply OnAskAutoLoadYesButtonClicked(FString EngineVersion, FString SelectedDirectory, bool bEngineAlreadyKnownAbout);
	void PostEngineManuallyLocated_InvalidEngineDirectory(const FString& SelectedDirectory);
	void PostEngineManuallyLocated(const FString& SelectedDirectory, bool bEngineAlreadyKnownAbout);

	void SelectEngine(const FString& EngineDirectory, bool bScrollEngineIntoView = true);

	FReply OnContinueButtonClicked();

	bool HandleContinueButtonIsEnabled() const;

	//----------------------------------------------------
	// 	   Variables
	//----------------------------------------------------

	TSharedPtr<SVerticalBox> CategoriesBox;

	TSharedPtr<SOverlay> OverlayForPopupsPtr;

	TSharedPtr<SSearchBox> SearchBoxPtr;

	typedef TTextFilter<const TSharedPtr<EngineInfo>> EngineItemTextFilter;
	EngineItemTextFilter EngineItemFilter;

	int32 ThumbnailBorderPadding;
	int32 ThumbnailSize;

	TArray<VeryBasicEngineInfo> NonRememberedManuallyLocatedEngines;

	/* Holds info about unreal engines */
	TArray<TSharedPtr<EngineInfo>> EngineInfos;

	TMap<FString, TSharedPtr<EngineCategoryInfo>> EngineCategories;

	int32 NumFilteredEngines;

	/* I'm not really sure why/if this is needed - I just blindly copied it from SProjectBrowser */
	bool bPreventSelectionChangeEvent;

	TSharedPtr<EngineInfo> SelectedEngine;

	FOnMouseButtonDoubleClickOnEngine HandleEngineItemDoubleClickDelegate;
	FOnBackButtonClicked OnBackButtonClickedDelegate;
	FOnContinueButtonClicked OnContinueButtonClickedDelegate;
};


class SDocToolWidget_SelectCreateDocumentationTargetEnginePage : public SCompoundWidget
{
public:

	static DocToolWidgetPageInfo GetHistoryCrumbTrailInfo();

	SDocToolWidget_SelectCreateDocumentationTargetEnginePage();

	SLATE_BEGIN_ARGS(SDocToolWidget_SelectCreateDocumentationTargetEnginePage)
		: _DocToolWidget(nullptr)
	{}

		SLATE_ARGUMENT(SDocToolWidget*, DocToolWidget)

	SLATE_END_ARGS()

	void Construct(const FArguments& InArgs);

protected:

	void OnHistoryPathClicked(const EDocToolWidgetPageType& CrumbData);
	FGetDocToolWidgetCrumbMenuContent_RetValType OnGetCrumbDelimiterContent(const EDocToolWidgetPageType& CrumbData);

	void HandleEngineItemDoubleClick(TSharedPtr<EngineInfo> DoubleClickedItem);

	FReply OnBackButtonClicked(TSharedPtr<EngineInfo> SelectedItem);

	FReply OnContinueButtonClicked(TSharedPtr<EngineInfo> SelectedItem);

	//----------------------------------------------------
	// 	   Variables
	//----------------------------------------------------

	SDocToolWidget* DocToolWidget;
};


class SDocToolWidget_SelectParseTargetEnginePage : public SCompoundWidget
{
public:

	static DocToolWidgetPageInfo GetHistoryCrumbTrailInfo();

	SDocToolWidget_SelectParseTargetEnginePage();

	SLATE_BEGIN_ARGS(SDocToolWidget_SelectParseTargetEnginePage)
		: _DocToolWidget(nullptr)
	{}

		SLATE_ARGUMENT(SDocToolWidget*, DocToolWidget)

	SLATE_END_ARGS()

	void Construct(const FArguments& InArgs);

protected:

	void OnHistoryPathClicked(const EDocToolWidgetPageType& CrumbData);
	FGetDocToolWidgetCrumbMenuContent_RetValType OnGetCrumbDelimiterContent(const EDocToolWidgetPageType& CrumbData);

	void HandleEngineItemDoubleClick(TSharedPtr<EngineInfo> DoubleClickedItem);

	FReply OnBackButtonClicked(TSharedPtr<EngineInfo> SelectedItem);

	FReply OnContinueButtonClicked(TSharedPtr<EngineInfo> SelectedItem);

	//----------------------------------------------------
	// 	   Variables
	//----------------------------------------------------

	SDocToolWidget* DocToolWidget;
};


class DOCUMENTATIONTOOL_API SMyPopupErrorText : public SComboButton, public IErrorReportingWidget
{
public:
	
	SMyPopupErrorText();

	SLATE_BEGIN_ARGS(SMyPopupErrorText)
		: _Font()
	{}

		SLATE_ATTRIBUTE(FSlateFontInfo, Font)

	SLATE_END_ARGS()

	void Construct(const FArguments& InArgs);

	//~ Begin IErrorReportingWidget interface
	virtual void SetError(const FText& InErrorText) override;
	virtual void SetError(const FString& InErrorText) override;
	virtual bool HasError() const override;
	virtual TSharedRef<SWidget> AsWidget() override;
	//~ End IErrorReportingWidget interface

	//----------------------------------------------------
	// 	   Variables
	//----------------------------------------------------

	TSharedPtr<SErrorText> HasErrorSymbol;
	TSharedPtr<SErrorText> ErrorText;
};


/* Similar to SResetToDefaultMenu and SResetToDefaultPropertyEditor */
class DOCUMENTATIONTOOL_API SResetToDefaultButton : public SCompoundWidget
{
public:

	DECLARE_DELEGATE_RetVal(bool, FDiffersFromDefault);

public:

	SLATE_BEGIN_ARGS(SResetToDefaultButton)
		: _ResetToolTip(nullptr)
	{}

		SLATE_ARGUMENT(TSharedPtr<IToolTip>, ResetToolTip)

		SLATE_EVENT(FDiffersFromDefault, DiffersFromDefault)

		SLATE_EVENT(FSimpleDelegate, OnResetToDefault)

	SLATE_END_ARGS()

	void Construct(const FArguments& InArgs);

protected:

	EVisibility GetDiffersFromDefaultAsVisibility() const;

	FReply OnResetClicked();

	//----------------------------------------------------
	// 	   Variables
	//----------------------------------------------------

	FDiffersFromDefault DiffersFromDefault;

	FSimpleDelegate OnResetToDefault;
};


/* A widget that lets you choose an operating system directory. 
Similar to SDirectoryPicker */
class DOCUMENTATIONTOOL_API SMyDirectoryPicker : public SCompoundWidget
{
public:

	SMyDirectoryPicker();

	SLATE_BEGIN_ARGS(SMyDirectoryPicker)
	{}

		SLATE_ARGUMENT(FString, InitialDirectory)

		SLATE_EVENT(FOnTextChanged, OnDirectoryTextChanged)

	SLATE_END_ARGS()

	void Construct(const FArguments& InArgs);

	/* Return the directory that is currently chosen by this widget */
	FString GetDirectory() const;
	void SetDirectory(const FString& InDirectory);

protected:

	void OnDirectoryTextChanged(const FText& Text);

	FReply OnBrowseButtonClicked();

	//----------------------------------------------------
	// 	   Variables
	//----------------------------------------------------
	
	TSharedPtr<SEditableText> EditableText;

	/* FString of EditableText->GetText() */
	FString Directory;

	FOnTextChanged OnDirectoryTextChangedDelegate;
};


/**
 *	This class was added as a way for widgets to say "if you hover me, don't show a tooltip, 
 *	even if any of my parent widgets want to show one".
 *	
 *	This kind of functionality can probably already be achieved without this class.
 *	
 *	Example of how I used it:
 *	
 *		SNew(SHorizontalBox)
 *		.TooltipText("Blah")
 *	
 *		+ SHorizontalBox::Slot()
 *		[
 *			SNew(STextBlock)
 *		]
 *	
 *		+ SHorizontalBox::Slot()
 *		[
 *			SNew(STextBlock)
 *		]
 *	
 *		+ SHorizontalBox::Slot()  
 *		[
 *			// Don't want to show "Blah" tooltip when hovering this widget, so do .Tooltip(SNullTooltip::NullTooltip)
 *			SNew(STextBlock)
 *			.Tooltip(SNullTooltip::NullTooltip)
 *		]
 *	
 *	The above probably could have been achieved without SNullTooltip by not setting tooltip text
 *	on the HBox and instead setting it on the first 2 STextBlocks, so my way is just an alternative
 */
class SNullToolTip
{
private:

	class SNullToolTipActual : public SWidget, public IToolTip
	{
	public:

		SNullToolTipActual()
		{
			SetCanTick(false);
			bCanSupportFocus = false;
			bCanHaveChildren = false;
		}

		SLATE_BEGIN_ARGS(SNullToolTip::SNullToolTipActual)
		{}

		SLATE_END_ARGS()

		void Construct(const FArguments& InArgs)
		{
		}

		//~ Begin SWidget interface

		virtual int32 OnPaint(const FPaintArgs& Args, const FGeometry& AllottedGeometry, const FSlateRect& MyCullingRect, FSlateWindowElementList& OutDrawElements, int32 LayerId, const FWidgetStyle& InWidgetStyle, bool bParentEnabled) const override final
		{
			return LayerId;
		}

		virtual FChildren* GetChildren() override final
		{
			return nullptr;
		}

		virtual void OnArrangeChildren(const FGeometry& AllottedGeometry, FArrangedChildren& ArrangedChildren) const override final
		{
		}

		virtual FVector2D ComputeDesiredSize(float LayoutScaleMultiplier) const override final
		{
			return FVector2D::ZeroVector;
		}

		virtual bool ComputeVolatility() const override final
		{
			return false;
		}

		//~ End SWidget interface

		//~ Begin IToolTip interface
		virtual TSharedRef<SWidget> AsWidget() override { return AsShared(); }
		virtual TSharedRef<SWidget> GetContentWidget() override { return SNullWidget::NullWidget; }
		virtual void SetContentWidget(const TSharedRef<SWidget>& InContentWidget) override { }
		virtual bool IsEmpty() const override { return false; }
		virtual bool IsInteractive() const override { return false; }
		virtual void OnOpening() override { }
		virtual void OnClosed() override { }
		//~ End IToolTip interface
	};

public:

	static const TSharedRef<SNullToolTipActual> NullToolTip;
};


class FunctionLocatingHelpers
{
public:

	static FString GetOnDocToolProgressDelegatePathName();

	static const UDelegateFunction* GetOnDocToolProgressDelegate();

	static FString GetOnDocToolStoppedDelegatePathName();

	static const UDelegateFunction* GetOnDocToolStoppedDelegate();


	struct FunctionSignatures
	{
		FunctionSignatures() = default;

		FunctionSignatures& Add(const UFunction* Function)
		{
			check(Function != nullptr);
			Array.Emplace(Function);
			return *this;
		}

		const TArray<const UFunction*>& GetSignatures() const { return Array; }

	protected:

		TArray<const UFunction*> Array;
	};


	/* The return value for the functions GetFunctionsWithSignaturesFromCPPClasses and 
	GetFunctionsWithSignaturesFromBlueprintAssets */
	struct RetVal
	{
		RetVal() = default;

		RetVal& Add(TArray<TSharedPtr<FString>>& OutArray)
		{
			Arrays.Emplace(&OutArray);
			return *this;
		}

		const TArray<TArray<TSharedPtr<FString>>*>& GetArrays() const { return Arrays; }

	protected:

		TArray<TArray<TSharedPtr<FString>>*> Arrays;
	};


	/* @param FlagsRequirement - in addition to checking the signature the function must
	have these flags. Note: changing this to a 'per-signature' basis would not be too
	difficult */
	static void GetFunctionsWithSignaturesFromCPPClasses(
		const FunctionSignatures& DesiredFunctionSignatures,
		EFunctionFlags FlagsRequirement,
		const RetVal& OutFunctions
	);

	/* On blueprint assets finds all the functions the blueprint has that are suitable for
	a function signature. "Suitable" is open to interpretation. 
	
	@param FlagsRequirement - in addition to checking the signature the function must 
	have these flags. Note: changing this to a 'per-signature' basis would not be too
	difficult */
	static void GetFunctionsWithSignaturesFromBlueprintAssets(
		const FunctionSignatures& DesiredFunctionSignatures,
		EFunctionFlags FlagsRequirement,
		const RetVal& OutFunctions,
		const TArray<FName>& PackagePaths = { FName(TEXT("/Game")) }
	);

	/* @param FlagsRequirement - in addition to checking the signature the function must
	have these flags. Note: changing this to a 'per-signature' basis would not be too
	difficult */
	static void GetFunctionsWithSignaturesFromBlueprintAsset(
		const UBlueprint* Blueprint,
		const FunctionSignatures& DesiredFunctionSignatures,
		EFunctionFlags FlagsRequirement,
		const RetVal& OutFunctions
	);

	/**
	 *	As far as I am aware you can bind any UFUNCTION() (this includes functions 
	 *	implemented in BP too) to any dynamic delegate and it will get called. I'm not 100%
	 *	sure what happens if you have the incorrect param type or amounts, but they 
	 *	do get called. Return value doesn't matter either. So when I say "suitable"
	 *	I'm basically saying that the signatures match
	 * 
	 *	@param FunctionToTest - a UFUNCTION() introduced from C++ (as opposed to one 
	 *	introduced from a blueprint asset)
	 *	@return - true if FunctionToTest's signature matches Delegate's signature close enough
	 */
	static bool IsCPPFunctionSuitableForDynamicDelegate(
		const UFunction* FunctionToTest, 
		const UFunction* Delegate
	);

	static bool IsBlueprintAssetFunctionSuitableForDynamicDelegate(
		const UFunction* FunctionToTest,
		const UFunction* Delegate,
		uint8 NumParamsOnEndToIgnore = 0
	);
};


/* This is a text input widget that will show suggestions. Maybe the engine already has
something like this in the slate module I'm not sure, but I've based it off SConsoleInputBox.
It's intended to work differently though.

The structure of it is a bit of a mess. Works though as far as I can tell, but could 
use a re-write.
Actually there are some issues:
- sometimes when you click a suggestion with the mouse the editable text keeps focus.
Actually since I did .Method(EPopupMethod::UseCurrentWindow) it hasn't happened */
class DOCUMENTATIONTOOL_API SEditableTextWithSuggestions : public SCompoundWidget
{
public:

	/* Suggestions sorting function typedef */
	typedef bool (*FSuggestionsSort)(const TSharedPtr<FString>&, const TSharedPtr<FString>&);

public:

	SEditableTextWithSuggestions();

	SLATE_BEGIN_ARGS(SEditableTextWithSuggestions)
		: _Suggestions(nullptr)
		, _SuggestionsSort(nullptr)
		, _InitialText()
		, _EditableTextHint()
		, _SuggestionBoxMaxHeight(250.f)
		, _SuggestionBoxPlacement(MenuPlacement_BelowAnchor)
	{}

		/* All the possible suggestions you want to use. You must pass in a non-null value */
		SLATE_ARGUMENT(const TArray<TSharedPtr<FString>>*, Suggestions)

		/* A function to sort suggestions. If you leave this empty then no sorting 
		of suggestions will happen. 
		Note: it will probably help performance if you sort Suggestions with this algorithm 
		before you pass it in */
		SLATE_ARGUMENT(FSuggestionsSort, SuggestionsSort)

		SLATE_ARGUMENT(FText, InitialText)
		
		SLATE_ARGUMENT(FText, EditableTextHint)

		SLATE_ARGUMENT(float, SuggestionBoxMaxHeight)

		SLATE_EVENT(FOnTextChanged, OnInputTextChanged)

		SLATE_ARGUMENT(EMenuPlacement, SuggestionBoxPlacement)

	SLATE_END_ARGS()

	void Construct(const FArguments& InArgs);

protected:

	//~ SWidget interface begin
	virtual void OnFocusChanging(const FWeakWidgetPath& PreviousFocusPath, const FWidgetPath& NewWidgetPath, const FFocusEvent& InFocusEvent) override;
	virtual FReply OnPreviewKeyDown(const FGeometry& MyGeometry, const FKeyEvent& KeyEvent) override;
	//~ SWidget interface end

	/* @param SearchString - Text.ToString() */
	void UpdateSuggestionsWidget(const FText& Text, const FString& SearchString);

	void StepSelectedSuggestionIndex(int32 StepAmount);

	void OnTextChanged(const FText& NewText);
	
	void OnTextCommitted(const FText& Text, ETextCommit::Type CommitType);

	TSharedRef<ITableRow> MakeSuggestionListItemWidget(TSharedPtr<FString> Message, const TSharedRef<STableViewBase>& OwnerTable);

	FText HandleSuggestionHighlightText() const
	{
		return SuggestionsHighlight;
	}

	void HandleSuggestionClicked(TSharedPtr<FString> ClickedItem);

	void HandleSuggestionSelectionChanged(TSharedPtr<FString> NewValue, ESelectInfo::Type SelectInfo);

public:

	void NotifyOfSuggestionsUpdated();

	FText GetInputTextBoxText() const { return EditableTextPtr->GetText(); }

	void SetInputTextBoxText(const FText& Text);

protected:

	//----------------------------------------------------
	// 	   Variables
	//----------------------------------------------------

	TSharedPtr<SMenuAnchor> SuggestionsMenuAnchorPtr;

	TSharedPtr<SEditableText> EditableTextPtr;

	TSharedPtr<SListView<TSharedPtr<FString>>> SuggestionsListViewPtr;

	const TArray<TSharedPtr<FString>>* AllSuggestionsArrayPtr;

	TArray<TSharedPtr<FString>> FilteredSuggestions;

	FSuggestionsSort SuggestionsSort;

	FText SuggestionsHighlight;

	int32 SelectedSuggestionIndex;

	uint8 bSuggestionsNeedRefreshingSometimeBeforeFocusGain : 1;

	uint8 bIgnoreOnTextChangedCallback : 1;

	uint8 bIgnoreHandleSuggestionSelectionChangedCallback : 1;

	FText UsersEnteredText;

	FOnTextChanged OnInputTextChanged;
};


/* @todo (often/always, not actually sure which) the first time (and sometimes times after the 
first too I think) you collapse it it looks like it actually expands briefly. When I print 
ContentWidget->GetRenderTransform() in tick it shows all normal values (Y always stays in 
range [0, 1]) so not sure why this is happening */
class SMainTaskOptionsCategory : public SCompoundWidget
{
public:
	
	SMainTaskOptionsCategory();

	SLATE_BEGIN_ARGS(SMainTaskOptionsCategory)
		: _Content()
		, _SlotIndex(INDEX_NONE)
	{}

		SLATE_DEFAULT_SLOT(FArguments, Content)

		SLATE_ARGUMENT(FText, Title)

		/* Where this widget is in it's parents GetChildren() */
		SLATE_ARGUMENT(int32, SlotIndex)

	SLATE_END_ARGS()

	void Construct(const FArguments& InArgs);

	virtual void Tick(const FGeometry& AllottedGeometry, const double InCurrentTime, const float InDeltaTime) override;

protected:

	FText HandleExpandAndCollapseButtonText() const;

	FReply OnExpandAndCollapseButtonClicked();

	//----------------------------------------------------
	// 	   Variables
	//----------------------------------------------------

	int32 SlotIndex;

	TSharedPtr<SWidget> ContentWidget;

	FCurveSequence ExpandAndCollapseCurveSequence;
};


class SMainTaskOptions : public SCompoundWidget
{
public:

	DECLARE_DELEGATE_RetVal_OneParam(FReply, FOnStartButtonClicked, const FDocOptions&);

public:

	SMainTaskOptions();

	SLATE_BEGIN_ARGS(SMainTaskOptions)
		: _MainTaskType(EMainTaskType::Unknown)
		, _TargetProject(nullptr)
		, _TargetPlugin(nullptr)
		, _TargetEngine(nullptr)
		, _OriginalValues(nullptr)
	{}

		SLATE_EVENT(FOnDocToolWidgetCrumbClicked, OnHistoryPathClicked)

		SLATE_EVENT(FGetDocToolWidgetCrumbMenuContent, OnGetCrumbDelimiterContent)

		SLATE_ARGUMENT(TArray<DocToolWidgetPageInfo>, CrumbTrail)

		SLATE_ARGUMENT(EMainTaskType, MainTaskType)

		SLATE_ARGUMENT(TSharedPtr<ProjectInfo>, TargetProject)
			
		SLATE_ARGUMENT(TSharedPtr<PluginInfo>, TargetPlugin)
		
		SLATE_ARGUMENT(TSharedPtr<EngineInfo>, TargetEngine)

		SLATE_ARGUMENT(const MainTaskOptionsState*, OriginalValues)

		SLATE_EVENT(FOnClicked, OnBackButtonClicked)
		
		SLATE_EVENT(FOnStartButtonClicked, OnStartButtonClicked)

	SLATE_END_ARGS()

	void Construct(const FArguments& InArgs);

protected:

	/* Whether the user is targeting a project for the main task (and possibly the engine 
	too, not sure) */
	bool IsTargetingProject() const;
	bool IsTargetingPlugin() const;
	/* Whether the user is targeting an engine for the main task */
	bool IsTargetingEngine() const;

	static FText GetTitleText(const FString& TargetsName);

	void OnNonEngineTargetDisplayNameTextChanged(const FText& NewText);
	bool GetNonEngineTargetDisplayNameDiffersFromDefaultValue() const;
	void ResetNonEngineTargetDisplayNameToDefaultValue();
	void CheckForNonEngineTargetDisplayNameTextErrors(const FText& InputBoxText);
	void OnOutputPathDirectoryPickerTextChanged(const FText& NewText);
	bool GetOutputPathDiffersFromDefaultValue() const;
	void ResetOutputPathToDefaultValue();
	void CheckForOutputPathDirectoryPickerTextErrors();
	bool GetRunOnSeparateProcessDiffersFromDefaultValue() const;
	void ResetRunOnSeparateProcessToDefaultValue();
	bool GetReportProgressToNotificationWidgetDiffersFromDefaultValue() const;
	void ResetReportProgressToNotificationWidgetToDefaultValue();
	bool GetReportProgressToLogDiffersFromDefaultValue() const;
	void ResetReportProgressToLogToDefaultValue();
	void HandleProgressDelegateTextChanged(const FText& Text);
	bool GetProgressDelegateDiffersFromDefaultValue() const;
	void ResetProgressDelegateToDefaultValue();
	void HandleStoppedDelegateTextChanged(const FText& Text);
	bool GetStoppedDelegateDiffersFromDefaultValue() const;
	void ResetStoppedDelegateToDefaultValue();
	static void CheckForDelegateInputBoxErrors(const FText& InputBoxText, const UDelegateFunction* Delegate, TSharedPtr<SBorder> ErrorBorderPtr, TSharedPtr<STextBlock> ErrorTextPtr, bool bIsErrorIfEmpty);
	TOptional<int32> HandleNumThreadsBoxValue() const;
	void OnNumThreadsBoxValueChanged(int32 NewValue);
	bool GetNumThreadsDiffersFromDefaultValue() const;
	void ResetNumThreadsToDefaultValue();
	FReply HandleBackButtonClicked();
	bool HandleCopyCommandToClipboardForBlueprintGraphButtonIsEnabled_CreateDocumentation() const;
	bool HandleCopyCommandToClipboardForBlueprintGraphButtonIsEnabled_Parse() const;
	FReply HandleCopyCommandToClipboardForBlueprintGraphButtonClicked();
	bool HandleCopyCommandToClipboardButtonIsEnabled_CreateDocumentation() const;
	bool HandleCopyCommandToClipboardButtonIsEnabled_Parse() const;
	FReply HandleCopyCommandToClipboardButtonClicked();
	bool HandleStartButtonIsEnabled_CreateDocumentation() const;
	bool HandleStartButtonIsEnabled_Parse() const;
	FReply HandleStartButtonClicked();

	void CreateDocToolDelegateSuggestionsFromCPPClasses();

	void CreateDocToolDelegateSuggestionsFromBlueprintAssets();
	
	void SortDocToolDelegateSuggestions();

	void OnAssetRegistryInitialSearchComplete();

	bool HandleTickerTick(float DeltaTime);

	void HookIntoEventsForSuggestionsFromBlueprintAssets();

	/* 
	Creates doc tool main task parameter structs using the values on the widgets of 
	this widget

	Assumes the params you pass into this function are the default 
	constructed values */
	void CreateMainTaskParameters(FDocOptions& Options);

public:

	TSharedPtr<ProjectInfo> GetTargetProject() const { return TargetProject; }
	TSharedPtr<PluginInfo> GetTargetPlugin() const { return TargetPlugin; }
	TSharedPtr<EngineInfo> GetTargetEngine() const { return TargetEngine; }
	MainTaskOptionsState GetState() const;

protected:

	//----------------------------------------------------
	// 	   Variables
	//----------------------------------------------------

	/**
	 *	Whether users should be allowed to do the main task "parse and post process" without
	 *	binding a function to the "on stopped" delegate.
	 *
	 *	Because parse and post process just gathers data and doesn't create any documentation files
	 *	it only makes sense to run it if you plan to do something with the data you gather. The on
	 *	stopped delegate has a UDocToolResult param that contains all the data.
	 */
	static constexpr bool bAllowParseWithoutStoppedDelegate = false;


	/* These are the values that the doc tool will use */
	class PredictedValues
	{
	public:

		PredictedValues() = default;

		/* @param Project - project to base predictions off */
		explicit PredictedValues(TSharedPtr<ProjectInfo> Project);
		explicit PredictedValues(TSharedPtr<PluginInfo> Plugin);
		explicit PredictedValues(TSharedPtr<EngineInfo> Engine);

		//------------------------------------------------------
		//	Predicted Values
		//------------------------------------------------------

		FString NonEngineTargetDisplayName;
		FString OutputPath;
		/* How many FDocsThread the doc tool will spawn */
		int32 NumThreads;
		/* The maximum number of threads allowed */
		int32 MaxThreads;
	};

	EMainTaskType MainTaskType;

	TSharedPtr<ProjectInfo> TargetProject;
	TSharedPtr<PluginInfo> TargetPlugin;
	TSharedPtr<EngineInfo> TargetEngine;

	PredictedValues DocToolPredictedValues;

	TSharedPtr<SBorder> NonEngineTargetDisplayNameErrorBorderPtr;

	TSharedPtr<SEditableText> NonEngineTargetDisplayNameTextPtr;
	
	TSharedPtr<STextBlock> NonEngineTargetDisplayNameErrorTextPtr;

	TSharedPtr<SBorder> OutputPathErrorBorderPtr;

	TSharedPtr<SMyDirectoryPicker> OutputPathDirectoryPickerPtr;

	TSharedPtr<STextBlock> OutputPathErrorTextPtr;

	TSharedPtr<SCheckBox> RunOnSeparateProcessCheckBoxPtr;

	TSharedPtr<SCheckBox> ReportProgressToNotificationWidgetCheckBoxPtr;
	
	TSharedPtr<SCheckBox> ReportProgressToLogCheckBoxPtr;

	TSharedPtr<SBorder> ProgressDelegateErrorBorderPtr;

	TSharedPtr<SEditableTextWithSuggestions> ProgressDelegateInputPtr;

	TSharedPtr<STextBlock> ProgressDelegateErrorTextPtr;

	TSharedPtr<SBorder> StoppedDelegateErrorBorderPtr;

	TSharedPtr<SEditableTextWithSuggestions> StoppedDelegateInputPtr;

	TSharedPtr<STextBlock> StoppedDelegateErrorTextPtr;

	TSharedPtr<SNumericEntryBox<int32>> NumThreadsBoxPtr;

	TOptional<int32> NumThreadsBoxValue;

	TSharedPtr<SOverlay> OverlayForPopupsPtr;

	TArray<TSharedPtr<FString>> ProgressDelegateSuggestions;

	TArray<TSharedPtr<FString>> StoppedDelegateSuggestions;

	FOnClicked OnBackButtonClickedDelegate;
	FOnStartButtonClicked OnStartButtonClickedDelegate;


	/** Default values to appear on widgets */
	class DefaultValues
	{
	public:

		static FText NonEngineTargetDisplayName(const PredictedValues& Values)
		{
			return FText::AsCultureInvariant(Values.NonEngineTargetDisplayName);
		}

		static FString OutputPath(const PredictedValues& Values)
		{
			return Values.OutputPath;
		}

		static bool RunOnSeparateProcess()
		{
			return true;
		}

		static bool ReportProgressToNotificationWidget()
		{
			return true;
		}

		static bool ReportProgressToLog()
		{
			return true;
		}

		static FText ProgressDelegate()
		{
			return FText::GetEmpty();
		}

		static FText StoppedDelegate()
		{
			return FText::GetEmpty();
		}

		static int32 NumberOfThreads(const PredictedValues& Values)
		{
			const int32 MaxValueForNumThreadsBox = MaxNumberOfThreads(Values);
			
			/* Make sure value isn't larger than the max we calculated above */
			return FMath::Min(Values.NumThreads, MaxValueForNumThreadsBox);
		}

		static int32 MaxNumberOfThreads(const PredictedValues& Values)
		{
			/* Here I am going to possibly reduce the amount further because I feel like it - it
			makes the spinbox less sensitive.
			If you want more threads then don't use the doc tool widget */
			return FMath::Min(Values.MaxThreads, FPlatformMisc::NumberOfCoresIncludingHyperthreads());
		}
	};

	static FVector2D GetSpacerBetweenOptionsSize()
	{
		return FVector2D(0.f, 20.f);
	}
};


class SDocToolWidget_CreateDocumentationTargetingProjectOptionsPage : public SCompoundWidget
{
public:

	static DocToolWidgetPageInfo GetHistoryCrumbTrailInfo();

	SDocToolWidget_CreateDocumentationTargetingProjectOptionsPage();

	SLATE_BEGIN_ARGS(SDocToolWidget_CreateDocumentationTargetingProjectOptionsPage)
		: _DocToolWidget(nullptr)
		, _TargetProject(nullptr)
		, _OriginalValues(nullptr)
	{}

		SLATE_ARGUMENT(SDocToolWidget*, DocToolWidget)

		SLATE_ARGUMENT(TSharedPtr<ProjectInfo>, TargetProject)

		SLATE_ARGUMENT(const MainTaskOptionsState*, OriginalValues)

	SLATE_END_ARGS()

	void Construct(const FArguments& InArgs);

protected:

	void OnHistoryPathClicked(const EDocToolWidgetPageType& CrumbData);
	FGetDocToolWidgetCrumbMenuContent_RetValType OnGetCrumbDelimiterContent(const EDocToolWidgetPageType& CrumbData);

	FReply OnBackButtonClicked();

	FReply OnStartButtonClicked(const FDocOptions& Options);

public:

	const TSharedPtr<SMainTaskOptions>& GetOptionsWidgetPtr() const { return OptionsPtr; }

protected:

	//----------------------------------------------------
	// 	   Variables
	//----------------------------------------------------

	SDocToolWidget* DocToolWidget;

	TSharedPtr<SMainTaskOptions> OptionsPtr;
};


class SDocToolWidget_ParseTargetingProjectOptionsPage : public SCompoundWidget
{
public:

	static DocToolWidgetPageInfo GetHistoryCrumbTrailInfo();

	SDocToolWidget_ParseTargetingProjectOptionsPage();

	SLATE_BEGIN_ARGS(SDocToolWidget_ParseTargetingProjectOptionsPage)
		: _DocToolWidget(nullptr)
		, _TargetProject(nullptr)
		, _OriginalValues(nullptr)
	{}

		SLATE_ARGUMENT(SDocToolWidget*, DocToolWidget)

		SLATE_ARGUMENT(TSharedPtr<ProjectInfo>, TargetProject)

		SLATE_ARGUMENT(const MainTaskOptionsState*, OriginalValues)

	SLATE_END_ARGS()

	void Construct(const FArguments& InArgs);

protected:

	void OnHistoryPathClicked(const EDocToolWidgetPageType& CrumbData);
	FGetDocToolWidgetCrumbMenuContent_RetValType OnGetCrumbDelimiterContent(const EDocToolWidgetPageType& CrumbData);

	FReply OnBackButtonClicked();

	FReply OnStartButtonClicked(const FDocOptions& Options);

public:

	const TSharedPtr<SMainTaskOptions>& GetOptionsWidgetPtr() const { return OptionsPtr; }

protected:

	//----------------------------------------------------
	// 	   Variables
	//----------------------------------------------------

	SDocToolWidget* DocToolWidget;

	TSharedPtr<SMainTaskOptions> OptionsPtr;
};


class SDocToolWidget_CreateDocumentationTargetingPluginOptionsPage : public SCompoundWidget
{
public:

	static DocToolWidgetPageInfo GetHistoryCrumbTrailInfo();

	SDocToolWidget_CreateDocumentationTargetingPluginOptionsPage();

	SLATE_BEGIN_ARGS(SDocToolWidget_CreateDocumentationTargetingPluginOptionsPage)
		: _DocToolWidget(nullptr)
		, _TargetPlugin(nullptr)
		, _OriginalValues(nullptr)
	{}

		SLATE_ARGUMENT(SDocToolWidget*, DocToolWidget)

		SLATE_ARGUMENT(TSharedPtr<PluginInfo>, TargetPlugin)

		SLATE_ARGUMENT(const MainTaskOptionsState*, OriginalValues)

	SLATE_END_ARGS()

	void Construct(const FArguments& InArgs);

protected:

	void OnHistoryPathClicked(const EDocToolWidgetPageType& CrumbData);
	FGetDocToolWidgetCrumbMenuContent_RetValType OnGetCrumbDelimiterContent(const EDocToolWidgetPageType& CrumbData);

	FReply OnBackButtonClicked();

	FReply OnStartButtonClicked(const FDocOptions& Options);

public:

	const TSharedPtr<SMainTaskOptions>& GetOptionsWidgetPtr() const { return OptionsPtr; }

protected:

	//----------------------------------------------------
	// 	   Variables
	//----------------------------------------------------

	SDocToolWidget* DocToolWidget;

	TSharedPtr<SMainTaskOptions> OptionsPtr;
};


class SDocToolWidget_ParseTargetingPluginOptionsPage : public SCompoundWidget
{
public:

	static DocToolWidgetPageInfo GetHistoryCrumbTrailInfo();

	SDocToolWidget_ParseTargetingPluginOptionsPage();

	SLATE_BEGIN_ARGS(SDocToolWidget_ParseTargetingPluginOptionsPage)
		: _DocToolWidget(nullptr)
		, _TargetPlugin(nullptr)
		, _OriginalValues(nullptr)
	{}

		SLATE_ARGUMENT(SDocToolWidget*, DocToolWidget)

		SLATE_ARGUMENT(TSharedPtr<PluginInfo>, TargetPlugin)

		SLATE_ARGUMENT(const MainTaskOptionsState*, OriginalValues)

	SLATE_END_ARGS()

	void Construct(const FArguments& InArgs);

protected:

	void OnHistoryPathClicked(const EDocToolWidgetPageType& CrumbData);
	FGetDocToolWidgetCrumbMenuContent_RetValType OnGetCrumbDelimiterContent(const EDocToolWidgetPageType& CrumbData);

	FReply OnBackButtonClicked();

	FReply OnStartButtonClicked(const FDocOptions& Options);

public:

	const TSharedPtr<SMainTaskOptions>& GetOptionsWidgetPtr() const { return OptionsPtr; }

protected:

	//----------------------------------------------------
	// 	   Variables
	//----------------------------------------------------

	SDocToolWidget* DocToolWidget;

	TSharedPtr<SMainTaskOptions> OptionsPtr;
};


class SDocToolWidget_CreateDocumentationTargetingEngineOptionsPage : public SCompoundWidget
{
public:

	static DocToolWidgetPageInfo GetHistoryCrumbTrailInfo();

	SDocToolWidget_CreateDocumentationTargetingEngineOptionsPage();

	SLATE_BEGIN_ARGS(SDocToolWidget_CreateDocumentationTargetingEngineOptionsPage)
		: _DocToolWidget(nullptr)
		, _TargetEngine(nullptr)
		, _OriginalValues(nullptr)
	{}

		SLATE_ARGUMENT(SDocToolWidget*, DocToolWidget)

		SLATE_ARGUMENT(TSharedPtr<EngineInfo>, TargetEngine)

		SLATE_ARGUMENT(const MainTaskOptionsState*, OriginalValues)

	SLATE_END_ARGS()

	void Construct(const FArguments& InArgs);

protected:

	void OnHistoryPathClicked(const EDocToolWidgetPageType& CrumbData);
	FGetDocToolWidgetCrumbMenuContent_RetValType OnGetCrumbDelimiterContent(const EDocToolWidgetPageType& CrumbData);

	FReply OnBackButtonClicked();

	FReply OnStartButtonClicked(const FDocOptions& Options);

public:

	const TSharedPtr<SMainTaskOptions>& GetOptionsWidgetPtr() const { return OptionsPtr; }

protected:

	//----------------------------------------------------
	// 	   Variables
	//----------------------------------------------------

	SDocToolWidget* DocToolWidget;

	TSharedPtr<SMainTaskOptions> OptionsPtr;
};


class SDocToolWidget_ParseTargetingEngineOptionsPage : public SCompoundWidget
{
public:

	static DocToolWidgetPageInfo GetHistoryCrumbTrailInfo();

	SDocToolWidget_ParseTargetingEngineOptionsPage();

	SLATE_BEGIN_ARGS(SDocToolWidget_ParseTargetingEngineOptionsPage)
		: _DocToolWidget(nullptr)
		, _TargetEngine(nullptr)
		, _OriginalValues(nullptr)
	{}

		SLATE_ARGUMENT(SDocToolWidget*, DocToolWidget)

		SLATE_ARGUMENT(TSharedPtr<EngineInfo>, TargetEngine)

		SLATE_ARGUMENT(const MainTaskOptionsState*, OriginalValues)

	SLATE_END_ARGS()

	void Construct(const FArguments& InArgs);

protected:

	void OnHistoryPathClicked(const EDocToolWidgetPageType& CrumbData);
	FGetDocToolWidgetCrumbMenuContent_RetValType OnGetCrumbDelimiterContent(const EDocToolWidgetPageType& CrumbData);

	FReply OnBackButtonClicked();

	FReply OnStartButtonClicked(const FDocOptions& Options);

public:

	const TSharedPtr<SMainTaskOptions>& GetOptionsWidgetPtr() const { return OptionsPtr; }

protected:

	//----------------------------------------------------
	// 	   Variables
	//----------------------------------------------------

	SDocToolWidget* DocToolWidget;

	TSharedPtr<SMainTaskOptions> OptionsPtr;
};


class SMainTaskStarted : public SCompoundWidget
{
	SLATE_BEGIN_ARGS(SMainTaskStarted)
		: _MainTaskType(EMainTaskType::Unknown)
	{}

		SLATE_ARGUMENT(EMainTaskType, MainTaskType)

		SLATE_EVENT(FOnDocToolWidgetCrumbClicked, OnCrumbClicked)

		SLATE_EVENT(FGetDocToolWidgetCrumbMenuContent, GetCrumbMenuContent)

		SLATE_ARGUMENT(TArray<DocToolWidgetPageInfo>, CrumbTrail)

		SLATE_EVENT(FOnClicked, OnReturnToMainMenuButtonClicked)

	SLATE_END_ARGS()

	void Construct(const FArguments& InArgs);
};


class SDocToolWidget_CreateDocumentationTargetingProjectStartedPage : public SCompoundWidget
{
public:

	static DocToolWidgetPageInfo GetHistoryCrumbTrailInfo();

	SDocToolWidget_CreateDocumentationTargetingProjectStartedPage();

	SLATE_BEGIN_ARGS(SDocToolWidget_CreateDocumentationTargetingProjectStartedPage)
		: _DocToolWidget(nullptr)
	{}

		SLATE_ARGUMENT(SDocToolWidget*, DocToolWidget)

	SLATE_END_ARGS()

	void Construct(const FArguments& InArgs);

protected:

	void OnHistoryPathClicked(const EDocToolWidgetPageType& CrumbData);
	FGetDocToolWidgetCrumbMenuContent_RetValType OnGetCrumbDelimiterContent(const EDocToolWidgetPageType& CrumbData);

	FReply OnBackToMainMenuButtonClicked();

	//----------------------------------------------------
	// 	   Variables
	//----------------------------------------------------

	SDocToolWidget* DocToolWidget;
};


class SDocToolWidget_CreateDocumentationTargetingPluginStartedPage : public SCompoundWidget
{
public:

	static DocToolWidgetPageInfo GetHistoryCrumbTrailInfo();

	SDocToolWidget_CreateDocumentationTargetingPluginStartedPage();

	SLATE_BEGIN_ARGS(SDocToolWidget_CreateDocumentationTargetingPluginStartedPage)
		: _DocToolWidget(nullptr)
	{}

		SLATE_ARGUMENT(SDocToolWidget*, DocToolWidget)

	SLATE_END_ARGS()

	void Construct(const FArguments& InArgs);

protected:

	void OnHistoryPathClicked(const EDocToolWidgetPageType& CrumbData);
	FGetDocToolWidgetCrumbMenuContent_RetValType OnGetCrumbDelimiterContent(const EDocToolWidgetPageType& CrumbData);

	FReply OnBackToMainMenuButtonClicked();

	//----------------------------------------------------
	// 	   Variables
	//----------------------------------------------------

	SDocToolWidget* DocToolWidget;
};


class SDocToolWidget_CreateDocumentationTargetingEngineStartedPage : public SCompoundWidget
{
public:

	static DocToolWidgetPageInfo GetHistoryCrumbTrailInfo();

	SDocToolWidget_CreateDocumentationTargetingEngineStartedPage();

	SLATE_BEGIN_ARGS(SDocToolWidget_CreateDocumentationTargetingEngineStartedPage)
		: _DocToolWidget(nullptr)
	{}

		SLATE_ARGUMENT(SDocToolWidget*, DocToolWidget)

	SLATE_END_ARGS()

	void Construct(const FArguments& InArgs);

protected:

	void OnHistoryPathClicked(const EDocToolWidgetPageType& CrumbData);
	FGetDocToolWidgetCrumbMenuContent_RetValType OnGetCrumbDelimiterContent(const EDocToolWidgetPageType& CrumbData);

	FReply OnBackToMainMenuButtonClicked();

	//----------------------------------------------------
	// 	   Variables
	//----------------------------------------------------

	SDocToolWidget* DocToolWidget;
};


class SDocToolWidget_ParseTargetingProjectStartedPage : public SCompoundWidget
{
public:

	static DocToolWidgetPageInfo GetHistoryCrumbTrailInfo();

	SDocToolWidget_ParseTargetingProjectStartedPage();

	SLATE_BEGIN_ARGS(SDocToolWidget_ParseTargetingProjectStartedPage)
		: _DocToolWidget(nullptr)
	{}

		SLATE_ARGUMENT(SDocToolWidget*, DocToolWidget)

	SLATE_END_ARGS()

	void Construct(const FArguments& InArgs);

protected:

	void OnHistoryPathClicked(const EDocToolWidgetPageType& CrumbData);
	FGetDocToolWidgetCrumbMenuContent_RetValType OnGetCrumbDelimiterContent(const EDocToolWidgetPageType& CrumbData);

	FReply OnBackToMainMenuButtonClicked();

	//----------------------------------------------------
	// 	   Variables
	//----------------------------------------------------

	SDocToolWidget* DocToolWidget;
};


class SDocToolWidget_ParseTargetingPluginStartedPage : public SCompoundWidget
{
public:

	static DocToolWidgetPageInfo GetHistoryCrumbTrailInfo();

	SDocToolWidget_ParseTargetingPluginStartedPage();

	SLATE_BEGIN_ARGS(SDocToolWidget_ParseTargetingPluginStartedPage)
		: _DocToolWidget(nullptr)
	{}

		SLATE_ARGUMENT(SDocToolWidget*, DocToolWidget)

	SLATE_END_ARGS()

	void Construct(const FArguments& InArgs);

protected:

	void OnHistoryPathClicked(const EDocToolWidgetPageType& CrumbData);
	FGetDocToolWidgetCrumbMenuContent_RetValType OnGetCrumbDelimiterContent(const EDocToolWidgetPageType& CrumbData);

	FReply OnBackToMainMenuButtonClicked();

	//----------------------------------------------------
	// 	   Variables
	//----------------------------------------------------

	SDocToolWidget* DocToolWidget;
};


class SDocToolWidget_ParseTargetingEngineStartedPage : public SCompoundWidget
{
public:

	static DocToolWidgetPageInfo GetHistoryCrumbTrailInfo();

	SDocToolWidget_ParseTargetingEngineStartedPage();

	SLATE_BEGIN_ARGS(SDocToolWidget_ParseTargetingEngineStartedPage)
		: _DocToolWidget(nullptr)
	{}

		SLATE_ARGUMENT(SDocToolWidget*, DocToolWidget)

	SLATE_END_ARGS()

	void Construct(const FArguments& InArgs);

protected:

	void OnHistoryPathClicked(const EDocToolWidgetPageType& CrumbData);
	FGetDocToolWidgetCrumbMenuContent_RetValType OnGetCrumbDelimiterContent(const EDocToolWidgetPageType& CrumbData);

	FReply OnBackToMainMenuButtonClicked();

	//----------------------------------------------------
	// 	   Variables
	//----------------------------------------------------

	SDocToolWidget* DocToolWidget;
};


class SDocToolWidget_MiscellaneousPage : public SCompoundWidget
{
public:

	static DocToolWidgetPageInfo GetHistoryCrumbTrailInfo();

	SDocToolWidget_MiscellaneousPage();

	SLATE_BEGIN_ARGS(SDocToolWidget_MiscellaneousPage)
		: _DocToolWidget(nullptr)
	{}

		SLATE_ARGUMENT(SDocToolWidget*, DocToolWidget)

	SLATE_END_ARGS()

	void Construct(const FArguments& InArgs);

protected:

	void OnHistoryPathClicked(const EDocToolWidgetPageType& CrumbData);
	FGetDocToolWidgetCrumbMenuContent_RetValType OnGetCrumbDelimiterContent(const EDocToolWidgetPageType& CrumbData);

	FReply OnBackButtonClicked();

	//----------------------------------------------------
	// 	   Variables
	//----------------------------------------------------

	SDocToolWidget* DocToolWidget;
};


class SDocToolWidget_DeveloperToolsPage : public SCompoundWidget
{
public:

	static DocToolWidgetPageInfo GetHistoryCrumbTrailInfo();

	SDocToolWidget_DeveloperToolsPage();

	SLATE_BEGIN_ARGS(SDocToolWidget_DeveloperToolsPage)
		: _DocToolWidget(nullptr)
	{}

		SLATE_ARGUMENT(SDocToolWidget*, DocToolWidget)

	SLATE_END_ARGS()

	void Construct(const FArguments& InArgs);

protected:

	void OnHistoryPathClicked(const EDocToolWidgetPageType& CrumbData);
	FGetDocToolWidgetCrumbMenuContent_RetValType OnGetCrumbDelimiterContent(const EDocToolWidgetPageType& CrumbData);

	FReply OnPackageDocToolButtonClicked();
	FReply OnBackButtonClicked();

	//----------------------------------------------------
	// 	   Variables
	//----------------------------------------------------

	SDocToolWidget* DocToolWidget;
};


class SDocToolWidget_PackageDocToolPage : public SCompoundWidget
{
public:

	static DocToolWidgetPageInfo GetHistoryCrumbTrailInfo();

	SDocToolWidget_PackageDocToolPage();

	SLATE_BEGIN_ARGS(SDocToolWidget_PackageDocToolPage)
		: _DocToolWidget(nullptr)
	{}

		SLATE_ARGUMENT(SDocToolWidget*, DocToolWidget)

	SLATE_END_ARGS()

	void Construct(const FArguments& InArgs);

protected:

	void OnHistoryPathClicked(const EDocToolWidgetPageType& CrumbData);
	FGetDocToolWidgetCrumbMenuContent_RetValType OnGetCrumbDelimiterContent(const EDocToolWidgetPageType& CrumbData);

	bool HandleEngineVersionsPanelIsEnabled() const;
	void OnEngineInstallationCheckBoxStateChanged(ECheckBoxState NewState, FString EngineVersion);
	FText HandlePackagePluginButtonToolTipText() const;
	bool HandlePackageButtonIsEnabled() const;
	FReply OnPackageButtonClicked();
	static void OnPackageDocToolPluginComplete();
	/* This function is static - the user can choose to navigate to another page or close the
	doc tool widget entirely, either of which would cause a shared pointer delegate to become
	unbound */
	static void OnPluginPackagingNotificationWidgetShowErrorsButtonClicked(const TSharedPtr<TArray<PackagePluginTask>>& AllTasks);
	FReply OnBackButtonClicked();

	//----------------------------------------------------
	// 	   Variables
	//----------------------------------------------------

	SDocToolWidget* DocToolWidget;

	TSet<FString, CaseSensitiveStringKeyFuncs> CheckedEngineVersions;
};


class DocToolWidgetHelpers
{
public:

	static void GetEngineInstallations(TMap<FString, FString>& OutEngineInstallations);

	/* Get all unreal engine projects */
	static void GetProjects(const TMap<FString, FString>& EngineInstallations, TArray<FString>& OutProjectFiles);

	/* @param OutPlugins - maps plugin name to path of every .uplugin file with that name */
	static void GetPlugins(const TMap<FString, FString>& EngineInstallations, const TArray<FString>& ProjectFiles, TMap<FString, TArray<FString>>& OutPlugins);

	static SVerticalBox::FSlot& AddPageHeader(
		const FText& Title,
		const FOnDocToolWidgetCrumbClicked& OnPathClicked,
		const FGetDocToolWidgetCrumbMenuContent& OnGetCrumbDelimiterContent,
		TSharedPtr<SBreadcrumbTrail<EDocToolWidgetPageType>>* OutBreadcrumbTrail,
		const TArray<DocToolWidgetPageInfo>& OriginalCrumbs
	);

protected:

	static SVerticalBox::FSlot& AddPageTitle(const FText& Title);

	/* Adds a widget to a vertical box that is similar to the path history part of the 
	content browser */
	static SVerticalBox::FSlot& AddHistoryWidget(
		const FOnDocToolWidgetCrumbClicked& OnPathClicked,
		const FGetDocToolWidgetCrumbMenuContent& OnGetCrumbDelimiterContent,
		TSharedPtr<SBreadcrumbTrail<EDocToolWidgetPageType>>* OutBreadcrumbTrail,
		const TArray<DocToolWidgetPageInfo>& OriginalCrumbs
	);

public:

	static void NavigateDocToolWidgetToPageForHistoryCrumbClick(SDocToolWidget* Widget, EDocToolWidgetPageType PageType);

	/** 
	 *	This mutex is for reading and/or writing to the DocToolWidgetData.json file: a file
	 *	that will hold certain settings for the doc tool widget.
	 *
	 *	Note: this mutex exists because it is possible that the user has multiple UE4's 
	 *	(with doc tool) running.
	 *	Note: the user can open the file with say notepad and 
	 *	do edits to the file. Unfortunately the mutex won't stop things like this. 
	 *	Note: at the time of writing this this mutex is only used by the project browser page 
	 *	Note: for performance is it possible to do away with this mutex and lock only 
	 *	certain parts of the file, so like if process1 wants to access the first half then 
	 *	it won't delay process2 in accessing the second half. I think windows supports this 
	 *	kind of behavior, I just don't know how to do it or whether it's feasible.
	 * 
	 *	@return - true if the mutex is aquired with no issues
	 */
	static bool AquireDocToolWidgetDataMutex();
	static void ReleaseDocToolWidgetDataMutex();
	static constexpr TCHAR* DOC_TOOL_WIDGET_DATA_MUTEX_NAME = TEXT("DocToolWidgetData_Mutex");
	static FWinPlatformMemory::FSystemWideCriticalSection DocToolWidgetDataMutex;

	/** 
	 *	Checks if two paths are the same 
	 * 
	 *	In UE4.23 FPaths::IsSamePath doesn't appear to work correctly. I think they've 
	 *	fixed it in later versions
	 */
	static bool IsSamePath(const FString& PathA, const FString& PathB);

	/* FTextBlockStyle to string */
	static FString ToString(const FTextBlockStyle& Style);
};


class DocToolWidgetToolTips
{
public:

	// These are for SMainTaskOptions
	static FText ResetToDefault(const FText& DefaultValue);
	static FText ResetToDefault(const FString& DefaultValue);
	static FText ResetToDefault(int32 DefaultValue);
	static FText ResetToDefault(bool DefaultValue);
	static FText NonEngineTargetDisplayName(bool bTargetingProject);
	static FText OutputPath();
	static FText RunOnSeparateProcess();
	static FText LocateOutputPathButton();
	static FText ReportProgressToNotificationWidget();
	static FText ReportProgressToLog();
	static FText ProgressDelegate();
	static FText StoppedDelegate();
	static FText NumberOfThreads();
	static FText CopyCommandToClipboardForBlueprintGraph();
	static FText CopyCommandToClipboard();
	static FText Start(EMainTaskType MainTask);


	static TSharedRef<IToolTip> MakeGenericToolTip(const TAttribute<FText>& ToolTipText);
};


/**
 *	This is a (possibly exact) copy of SCustomDialog.
 *
 *	I wanted to use SCustomDialog but I get unresolved symbol errors when compiling even if I 
 *	add UnrealEd module to Build.cs file.
 *
 *	@Note: at the time of writing this I do not use this class anywhere
 */
class SMyCustomDialog : public SWindow
{
public:
	
	struct FButton
	{
		FButton(const FText& InButtonText, const FSimpleDelegate& InOnClicked = FSimpleDelegate())
			: ButtonText(InButtonText)
			, OnClicked(InOnClicked)
		{
		}

		FText ButtonText;
		FSimpleDelegate OnClicked;
	};

	SMyCustomDialog();

	SLATE_BEGIN_ARGS(SMyCustomDialog)
		: _UseScrollBox(true)
		, _ScrollBoxMaxHeight(300)
	{}
		/** Title to display for the dialog. */
		SLATE_ARGUMENT(FText, Title)

		/** Optional icon to display in the dialog. (default: none) */
		SLATE_ARGUMENT(FName, IconBrush)

		/** Should this dialog use a scroll box for over-sized content? (default: true) */
		SLATE_ARGUMENT(bool, UseScrollBox)

		/** Max height for the scroll box (default: 300) */
		SLATE_ARGUMENT(int32, ScrollBoxMaxHeight)

		/** The buttons that this dialog should have. One or more buttons must be added.*/
		SLATE_ARGUMENT(TArray<FButton>, Buttons)

		/** Content for the dialog */
		SLATE_ARGUMENT(TSharedPtr<SWidget>, DialogContent)

	SLATE_END_ARGS()

	void Construct(const FArguments& InArgs);

	/** 
	 *	Show the dialog.
	 *	This method will return immediately.
	 */
	void Show();

	/** 
	 *	Show a modal dialog. Will block until an input is received.
	 *	Returns the index of the button that was pressed.
	 */
	int32 ShowModal();

protected:
	
	FReply OnButtonClicked(FSimpleDelegate OnClicked, int32 ButtonIndex);

	/** The index of the button that was pressed last. */
	int32 LastPressedButton;
};


/* This is a widget with some text and two buttons, ideal for asking a yes/no question.
If the mouse is pressed on the outer border then the inner border will flash to try 
and draw the user's attention to it, similar to a modal window */
class SModalWidget : public SCompoundWidget
{
public:
	
	SLATE_BEGIN_ARGS(SModalWidget)
		: _TextContent()
		, _NoButtonText(FText::AsCultureInvariant(TEXT("No")))
		, _YesButtonText(FText::AsCultureInvariant(TEXT("Yes")))
	{}

		/** Text to show */
		SLATE_ATTRIBUTE(FText, TextContent)

		/** Text to show on a button */
		SLATE_ATTRIBUTE(FText, NoButtonText)

		/** Text to show on a button */
		SLATE_ATTRIBUTE(FText, YesButtonText)

		/** Called when the "no" button is clicked */
		SLATE_EVENT(FOnClicked, OnNoClicked)

		/** Called when the "yes" button is clicked */
		SLATE_EVENT(FOnClicked, OnYesClicked)

	SLATE_END_ARGS()

	void Construct(const FArguments& InArgs);

protected:

	FSlateColor GetWindowFlashAreaColor() const;

	float GetFlashValue() const;

	EVisibility GetWindowFlashVisibility() const;

	FReply HandleMouseButtonDownOnOuterBorder(const FGeometry& InGeometry, const FPointerEvent& MouseEvent);
	FReply HandleMouseButtonDownOnInnerBorder(const FGeometry& InGeometry, const FPointerEvent& MouseEvent);

	//-------------------------------------------------------
	//	Variables
	//-------------------------------------------------------

	FCurveSequence FlashSequence;
};


class SPopupNotification : public SCompoundWidget
{
public:

	SPopupNotification();

	SLATE_BEGIN_ARGS(SPopupNotification)
		: _TextContent()
		, _SolidOneOpacityDuration(3.f)
		, _FadeOutDuration(3.f)
	{}

		/** Text to show */
		SLATE_ATTRIBUTE(FText, TextContent)

		/** How long to show the window before it starts to fade out */
		SLATE_ARGUMENT(float, SolidOneOpacityDuration)
		
		SLATE_ARGUMENT(float, FadeOutDuration)

	SLATE_END_ARGS()

	void Construct(const FArguments& InArgs);

	virtual void Tick(const FGeometry& AllottedGeometry, const double InCurrentTime, const float InDeltaTime) override;

	void SetMessage(const FText& Message);

	void ResetDuration();

	void ResetDurationPostModal();

	float GetInterpAlpha() const;

	float CalculateOpacity() const;

	EActiveTimerReturnType TriggerPlayOpacitySequence(double InCurrentTime, float InDeltaTime);

	//---------------------------------------------------------
	// 	   Variables
	//---------------------------------------------------------

	TSharedPtr<STextBlock> TextBlockPtr;

	FCurveSequence CurveSequence;
	FCurveHandle FadeOutAnimCurve;

	TWeakPtr<FActiveTimerHandle> ActiveTimerHandle_Opacity;

	uint8 bResetDurationNextTick : 1;
};


#endif
