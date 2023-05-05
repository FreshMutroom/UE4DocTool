// Fill out your copyright notice in the Description page of Project Settings.


#if WITH_EDITOR

#include "SDocToolWidget.h"
#include "DocToolTypes.h"
#include "Windows/WinPlatformMemory.h"
#include "DocsTool.h"
#include "DocToolStyle.h"
#include "PluginPackaging.h"
#include "DocToolUICommands.h"

#include "SlateOptMacros.h"
#include "Widgets/Text/STextBlock.h"
#include "Widgets/SBoxPanel.h"
#include "Widgets/Input/SButton.h"
#include "Widgets/Images/SImage.h"
#include "Widgets/SOverlay.h"
#include "Widgets/Layout/SSeparator.h"
#include "Widgets/Views/STileView.h"
#include "Widgets/Views/STableRow.h"
#include "Widgets/Input/SSearchBox.h"
#include "Widgets/Input/SComboBox.h"
#include "Widgets/Input/SCheckBox.h"
#include "Widgets/Input/SSpinBox.h"
#include "Widgets/Layout/SScrollBox.h"
#include "Widgets/Layout/SWrapBox.h"
#include "Widgets/Navigation/SBreadcrumbTrail.h"
#include "Widgets/SToolTip.h"
#include "Widgets/Layout/SUniformGridPanel.h"
#include "Widgets/Layout/SGridPanel.h"
#include "Widgets/Input/SNumericEntryBox.h"
#include "DesktopPlatformModule.h"
#include "Misc/FileHelper.h"
#include "Serialization/JsonReader.h"
#include "Serialization/JsonSerializer.h"
#include "EditorStyleSet.h"
#include "Brushes/SlateDynamicImageBrush.h"
#include "HAL/PlatformFileManager.h"
#include "Framework/Application/SlateApplication.h"
#include "SlateFileDialogs/Public/ISlateFileDialogModule.h"
#include "Framework/Application/SWindowTitleBar.h"
#include "JsonObjectConverter.h"
#include "Windows/WindowsPlatformApplicationMisc.h"
#include "UObject/UObjectHash.h"
#include "AssetRegistryModule.h"
#include "Engine/Blueprint.h"
#include "K2Node_FunctionEntry.h"
#include "Containers/Ticker.h"
#include "EdGraph/EdGraph.h"
#include "K2Node_Event.h"
#include "K2Node_CallFunction.h"
#include "EdGraphUtilities.h"
#include "Framework/Commands/GenericCommands.h"
#include "Interfaces/IPluginManager.h"


DISABLE_OPTIMIZATION

#define LOCTEXT_NAMESPACE "DocToolWidget"


SDocToolWidget::SDocToolWidget()
	: ViewContainer(nullptr)
	, CurrentPage(nullptr)
	, MainPage(nullptr)
	, SelectCreateDocumentationTargetTypePage(nullptr)
	, SelectCreateDocumentationTargetProjectPage(nullptr)
	, SelectCreateDocumentationTargetPluginPage(nullptr)
	, SelectCreateDocumentationTargetEnginePage(nullptr)
	, CreateDocumentationTargetingProjectOptionsPage(nullptr)
	, CreateDocumentationTargetingPluginOptionsPage(nullptr)
	, CreateDocumentationTargetingEngineOptionsPage(nullptr)
	, CreateDocumentationTargetingProjectStartedPage(nullptr)
	, CreateDocumentationTargetingPluginStartedPage(nullptr)
	, CreateDocumentationTargetingEngineStartedPage(nullptr)
	, SelectParseTargetTypePage(nullptr)
	, SelectParseTargetProjectPage(nullptr)
	, SelectParseTargetPluginPage(nullptr)
	, SelectParseTargetEnginePage(nullptr)
	, ParseTargetingProjectOptionsPage(nullptr)
	, ParseTargetingPluginOptionsPage(nullptr)
	, ParseTargetingEngineOptionsPage(nullptr)
	, ParseTargetingProjectStartedPage(nullptr)
	, ParseTargetingPluginStartedPage(nullptr)
	, ParseTargetingEngineStartedPage(nullptr)
	, MiscellaneousPage(nullptr)
	, DeveloperToolsPage(nullptr)
	, PackageDocToolPage(nullptr)
	, ProjectShownOnLastOptionsPage(nullptr)
	, PluginShownOnLastOptionsPage(nullptr)
	, EngineShownOnLastOptionsPage(nullptr)
	, MainTaskOptionsShownOnLastOptionsPage(MainTaskOptionsState())
{
}

void SDocToolWidget::Construct(const FArguments& InArgs)
{
	ChildSlot
	[
		SAssignNew(ViewContainer, SBorder)
	];

	SavedState State;
	State.Load();
	SetStateFromStateObject(State);
}

void SDocToolWidget::SetStateFromStateObject(const SavedState& State)
{
	/* Set last target project */
	if (State.LastTargetedProject.Len() > 0)
	{
		/* Check the project exists */
		TSharedPtr<FJsonObject> JsonObj = ProjectInfo::LoadUProjectFile(State.LastTargetedProject);
		if (JsonObj.IsValid())
		{
			ProjectShownOnLastOptionsPage = MakeShareable(new ProjectInfo(State.LastTargetedProject, JsonObj));
		}
	}

	/* Set last target plugin */
	if (State.LastTargetedPlugin.Len() > 0)
	{
		FString PathPart;
		FString FriendlyNamePart;
		if (State.LastTargetedPlugin.Split(TEXT(","), &PathPart, &FriendlyNamePart, ESearchCase::CaseSensitive))
		{
			/* Check the plugin exists */
			FPluginDescriptor PluginDescriptor;
			FText FailReason;
			if (PluginDescriptor.Load(PathPart, FailReason))
			{
				PluginShownOnLastOptionsPage = MakeShareable(new PluginInfo(FPaths::GetBaseFilename(PathPart), PathPart, FriendlyNamePart));
			}
		}
	}

	/* Set last target engine */
	if (State.LastTargetedEngine.Len() > 0)
	{
		FString VersionPart;
		FString PathPart;
		if (State.LastTargetedEngine.Split(TEXT(","), &VersionPart, &PathPart, ESearchCase::CaseSensitive))
		{
			/* Verify it's still an engine dir */
			if (SMyEngineBrowser::IsValidEngineDirectory(PathPart))
			{
				EngineShownOnLastOptionsPage = MakeShareable(new EngineInfo(VersionPart, PathPart));
			}
		}
	}

	MainTaskOptionsShownOnLastOptionsPage = State.OptionsPage;

	/* Set what page to open */
	if (State.OpenPage.Len() == 0)
	{
		/* First time opening doc tool widget */
		SetCurrentViewType_MainPage();
	}
	else if (GH::AreEqual(State.OpenPage, TEXT("SDocToolWidget_SelectCreateDocumentationTargetTypePage")))
	{
		SetCurrentViewType_SelectCreateDocumentationTargetTypePage();
	}
	else if (GH::AreEqual(State.OpenPage, TEXT("SDocToolWidget_SelectCreateDocumentationTargetProjectPage")))
	{
		SetCurrentViewType_SelectCreateDocumentationTargetProjectPage();
	}
	else if (GH::AreEqual(State.OpenPage, TEXT("SDocToolWidget_SelectCreateDocumentationTargetPluginPage")))
	{
		SetCurrentViewType_SelectCreateDocumentationTargetPluginPage();
	}
	else if (GH::AreEqual(State.OpenPage, TEXT("SDocToolWidget_SelectCreateDocumentationTargetEnginePage")))
	{
		SetCurrentViewType_SelectCreateDocumentationTargetEnginePage();
	}
	else if (GH::AreEqual(State.OpenPage, TEXT("SDocToolWidget_CreateDocumentationTargetingProjectOptionsPage")))
	{
		if (ProjectShownOnLastOptionsPage.IsValid())
		{
			SetCurrentViewType_CreateDocumentationTargetingProjectOptionsPage(ProjectShownOnLastOptionsPage, GetMainTaskOptionsShownOnLastOptionsPage());
		}
		else
		{
			/* One reason for getting here is that the .ini entry was bogus. Maybe we wanna 
			delete it? (btw this comment applies to all other 5 cases below too) */
			SetCurrentViewType_SelectCreateDocumentationTargetProjectPage();
		}
	}
	else if (GH::AreEqual(State.OpenPage, TEXT("SDocToolWidget_CreateDocumentationTargetingPluginOptionsPage")))
	{
		if (PluginShownOnLastOptionsPage.IsValid())
		{
			SetCurrentViewType_CreateDocumentationTargetingPluginOptionsPage(PluginShownOnLastOptionsPage, GetMainTaskOptionsShownOnLastOptionsPage());
		}
		else
		{
			SetCurrentViewType_SelectCreateDocumentationTargetEnginePage();
		}
	}
	else if (GH::AreEqual(State.OpenPage, TEXT("SDocToolWidget_CreateDocumentationTargetingEngineOptionsPage")))
	{
		if (EngineShownOnLastOptionsPage.IsValid())
		{
			SetCurrentViewType_CreateDocumentationTargetingEngineOptionsPage(EngineShownOnLastOptionsPage, GetMainTaskOptionsShownOnLastOptionsPage());
		}
		else
		{
			SetCurrentViewType_SelectCreateDocumentationTargetEnginePage();
		}
	}
	else if (GH::AreEqual(State.OpenPage, TEXT("SDocToolWidget_ParseTargetingProjectOptionsPage")))
	{
		if (ProjectShownOnLastOptionsPage.IsValid())
		{
			SetCurrentViewType_ParseTargetingProjectOptionsPage(ProjectShownOnLastOptionsPage, GetMainTaskOptionsShownOnLastOptionsPage());
		}
		else
		{
			SetCurrentViewType_SelectParseTargetProjectPage();
		}
	}
	else if (GH::AreEqual(State.OpenPage, TEXT("SDocToolWidget_ParseTargetingPluginOptionsPage")))
	{
		if (PluginShownOnLastOptionsPage.IsValid())
		{
			SetCurrentViewType_ParseTargetingPluginOptionsPage(PluginShownOnLastOptionsPage, GetMainTaskOptionsShownOnLastOptionsPage());
		}
		else
		{
			SetCurrentViewType_SelectParseTargetPluginPage();
		}
	}
	else if (GH::AreEqual(State.OpenPage, TEXT("SDocToolWidget_ParseTargetingEngineOptionsPage")))
	{
		if (EngineShownOnLastOptionsPage.IsValid())
		{
			SetCurrentViewType_ParseTargetingEngineOptionsPage(EngineShownOnLastOptionsPage, GetMainTaskOptionsShownOnLastOptionsPage());
		}
		else
		{
			SetCurrentViewType_SelectParseTargetEnginePage();
		}
	}
	else if (GH::AreEqual(State.OpenPage, TEXT("SDocToolWidget_SelectParseTargetTypePage")))
	{
		SetCurrentViewType_SelectParseTargetTypePage();
	}
	else if (GH::AreEqual(State.OpenPage, TEXT("SDocToolWidget_SelectParseTargetProjectPage")))
	{
		SetCurrentViewType_SelectParseTargetProjectPage();
	}
	else if (GH::AreEqual(State.OpenPage, TEXT("SDocToolWidget_SelectParseTargetPluginPage")))
	{
		SetCurrentViewType_SelectParseTargetPluginPage();
	}
	else if (GH::AreEqual(State.OpenPage, TEXT("SDocToolWidget_SelectParseTargetEnginePage")))
	{
		SetCurrentViewType_SelectParseTargetEnginePage();
	}
	else if (GH::AreEqual(State.OpenPage, TEXT("SDocToolWidget_MiscellaneousPage")))
	{
		SetCurrentViewType_MiscellaneousPage();
	}
	else if (GH::AreEqual(State.OpenPage, TEXT("SDocToolWidget_DeveloperToolsPage")))
	{
		SetCurrentViewType_DeveloperToolsPage();
	}
	else
	{
		/* .ini entry was bogus */
		SetCurrentViewType_MainPage();
	}
}

void SDocToolWidget::SetCurrentViewType_MainPage()
{
	if (ShouldShowWidget(MainPage))
	{
		SAssignNew(MainPage, SDocToolWidget_MainPage)
			.DocToolWidget(this);
		
		CurrentPage = &MainPage;
		ViewContainer->SetContent(MainPage.ToSharedRef());
	}
}

void SDocToolWidget::SetCurrentViewType_SelectCreateDocumentationTargetTypePage()
{
	if (ShouldShowWidget(SelectCreateDocumentationTargetTypePage))
	{
		SAssignNew(SelectCreateDocumentationTargetTypePage, SDocToolWidget_SelectCreateDocumentationTargetTypePage)
			.DocToolWidget(this);

		CurrentPage = &SelectCreateDocumentationTargetTypePage;
		ViewContainer->SetContent(SelectCreateDocumentationTargetTypePage.ToSharedRef());
	}
}

void SDocToolWidget::SetCurrentViewType_SelectCreateDocumentationTargetProjectPage()
{
	if (ShouldShowWidget(SelectCreateDocumentationTargetProjectPage))
	{
		SAssignNew(SelectCreateDocumentationTargetProjectPage, SDocToolWidget_SelectCreateDocumentationTargetProjectPage)
			.DocToolWidget(this);

		CurrentPage = &SelectCreateDocumentationTargetProjectPage;
		ViewContainer->SetContent(SelectCreateDocumentationTargetProjectPage.ToSharedRef());
	}
}

void SDocToolWidget::SetCurrentViewType_SelectCreateDocumentationTargetPluginPage()
{
	if (ShouldShowWidget(SelectCreateDocumentationTargetPluginPage))
	{
		SAssignNew(SelectCreateDocumentationTargetPluginPage, SDocToolWidget_SelectCreateDocumentationTargetPluginPage)
			.DocToolWidget(this);

		CurrentPage = &SelectCreateDocumentationTargetPluginPage;
		ViewContainer->SetContent(SelectCreateDocumentationTargetPluginPage.ToSharedRef());
	}
}

void SDocToolWidget::SetCurrentViewType_SelectCreateDocumentationTargetEnginePage()
{
	if (ShouldShowWidget(SelectCreateDocumentationTargetEnginePage))
	{
		SAssignNew(SelectCreateDocumentationTargetEnginePage, SDocToolWidget_SelectCreateDocumentationTargetEnginePage)
			.DocToolWidget(this);

		CurrentPage = &SelectCreateDocumentationTargetEnginePage;
		ViewContainer->SetContent(SelectCreateDocumentationTargetEnginePage.ToSharedRef());
	}
}

void SDocToolWidget::SetCurrentViewType_CreateDocumentationTargetingProjectOptionsPage(TSharedPtr<ProjectInfo> TargetProject, const MainTaskOptionsState* OpeningStateToUse)
{
	if (ShouldShowWidget(CreateDocumentationTargetingProjectOptionsPage))
	{
		SAssignNew(CreateDocumentationTargetingProjectOptionsPage, SDocToolWidget_CreateDocumentationTargetingProjectOptionsPage)
			.DocToolWidget(this)
			.TargetProject(TargetProject)
			.OriginalValues(OpeningStateToUse);

		CurrentPage = &CreateDocumentationTargetingProjectOptionsPage;
		ViewContainer->SetContent(CreateDocumentationTargetingProjectOptionsPage.ToSharedRef());
	}
}

void SDocToolWidget::SetCurrentViewType_CreateDocumentationTargetingPluginOptionsPage(TSharedPtr<PluginInfo> TargetPlugin, const MainTaskOptionsState* OpeningStateToUse)
{
	if (ShouldShowWidget(CreateDocumentationTargetingPluginOptionsPage))
	{
		SAssignNew(CreateDocumentationTargetingPluginOptionsPage, SDocToolWidget_CreateDocumentationTargetingPluginOptionsPage)
			.DocToolWidget(this)
			.TargetPlugin(TargetPlugin)
			.OriginalValues(OpeningStateToUse);

		CurrentPage = &CreateDocumentationTargetingPluginOptionsPage;
		ViewContainer->SetContent(CreateDocumentationTargetingPluginOptionsPage.ToSharedRef());
	}
}

void SDocToolWidget::SetCurrentViewType_CreateDocumentationTargetingEngineOptionsPage(TSharedPtr<EngineInfo> TargetEngine, const MainTaskOptionsState* OpeningStateToUse)
{
	if (ShouldShowWidget(CreateDocumentationTargetingEngineOptionsPage))
	{
		SAssignNew(CreateDocumentationTargetingEngineOptionsPage, SDocToolWidget_CreateDocumentationTargetingEngineOptionsPage)
			.DocToolWidget(this)
			.TargetEngine(TargetEngine)
			.OriginalValues(OpeningStateToUse);

		CurrentPage = &CreateDocumentationTargetingEngineOptionsPage;
		ViewContainer->SetContent(CreateDocumentationTargetingEngineOptionsPage.ToSharedRef());
	}
}

void SDocToolWidget::SetCurrentViewType_ParseTargetingProjectOptionsPage(TSharedPtr<ProjectInfo> TargetProject, const MainTaskOptionsState* OpeningStateToUse)
{
	if (ShouldShowWidget(ParseTargetingProjectOptionsPage))
	{
		SAssignNew(ParseTargetingProjectOptionsPage, SDocToolWidget_ParseTargetingProjectOptionsPage)
			.DocToolWidget(this)
			.TargetProject(TargetProject)
			.OriginalValues(OpeningStateToUse);

		CurrentPage = &ParseTargetingProjectOptionsPage;
		ViewContainer->SetContent(ParseTargetingProjectOptionsPage.ToSharedRef());
	}
}

void SDocToolWidget::SetCurrentViewType_ParseTargetingPluginOptionsPage(TSharedPtr<PluginInfo> TargetPlugin, const MainTaskOptionsState* OpeningStateToUse)
{
	if (ShouldShowWidget(ParseTargetingPluginOptionsPage))
	{
		SAssignNew(ParseTargetingPluginOptionsPage, SDocToolWidget_ParseTargetingPluginOptionsPage)
			.DocToolWidget(this)
			.TargetPlugin(TargetPlugin)
			.OriginalValues(OpeningStateToUse);

		CurrentPage = &ParseTargetingPluginOptionsPage;
		ViewContainer->SetContent(ParseTargetingPluginOptionsPage.ToSharedRef());
	}
}

void SDocToolWidget::SetCurrentViewType_ParseTargetingEngineOptionsPage(TSharedPtr<EngineInfo> TargetEngine, const MainTaskOptionsState* OpeningStateToUse)
{
	if (ShouldShowWidget(ParseTargetingEngineOptionsPage))
	{
		SAssignNew(ParseTargetingEngineOptionsPage, SDocToolWidget_ParseTargetingEngineOptionsPage)
			.DocToolWidget(this)
			.TargetEngine(TargetEngine)
			.OriginalValues(OpeningStateToUse);

		CurrentPage = &ParseTargetingEngineOptionsPage;
		ViewContainer->SetContent(ParseTargetingEngineOptionsPage.ToSharedRef());
	}
}

void SDocToolWidget::SetCurrentViewType_CreateDocumentationTargetingProjectStartedPage()
{
	if (ShouldShowWidget(CreateDocumentationTargetingProjectStartedPage))
	{
		SAssignNew(CreateDocumentationTargetingProjectStartedPage, SDocToolWidget_CreateDocumentationTargetingProjectStartedPage)
			.DocToolWidget(this);

		CurrentPage = &CreateDocumentationTargetingProjectStartedPage;
		ViewContainer->SetContent(CreateDocumentationTargetingProjectStartedPage.ToSharedRef());
	}
}

void SDocToolWidget::SetCurrentViewType_CreateDocumentationTargetingPluginStartedPage()
{
	if (ShouldShowWidget(CreateDocumentationTargetingPluginStartedPage))
	{
		SAssignNew(CreateDocumentationTargetingPluginStartedPage, SDocToolWidget_CreateDocumentationTargetingPluginStartedPage)
			.DocToolWidget(this);

		CurrentPage = &CreateDocumentationTargetingPluginStartedPage;
		ViewContainer->SetContent(CreateDocumentationTargetingPluginStartedPage.ToSharedRef());
	}
}

void SDocToolWidget::SetCurrentViewType_CreateDocumentationTargetingEngineStartedPage()
{
	if (ShouldShowWidget(CreateDocumentationTargetingEngineStartedPage))
	{
		SAssignNew(CreateDocumentationTargetingEngineStartedPage, SDocToolWidget_CreateDocumentationTargetingEngineStartedPage)
			.DocToolWidget(this);

		CurrentPage = &CreateDocumentationTargetingEngineStartedPage;
		ViewContainer->SetContent(CreateDocumentationTargetingEngineStartedPage.ToSharedRef());
	}
}

void SDocToolWidget::SetCurrentViewType_ParseTargetingProjectStartedPage()
{
	if (ShouldShowWidget(ParseTargetingProjectStartedPage))
	{
		SAssignNew(ParseTargetingProjectStartedPage, SDocToolWidget_ParseTargetingProjectStartedPage)
			.DocToolWidget(this);

		CurrentPage = &ParseTargetingProjectStartedPage;
		ViewContainer->SetContent(ParseTargetingProjectStartedPage.ToSharedRef());
	}
}

void SDocToolWidget::SetCurrentViewType_ParseTargetingPluginStartedPage()
{
	if (ShouldShowWidget(ParseTargetingPluginStartedPage))
	{
		SAssignNew(ParseTargetingPluginStartedPage, SDocToolWidget_ParseTargetingPluginStartedPage)
			.DocToolWidget(this);

		CurrentPage = &ParseTargetingPluginStartedPage;
		ViewContainer->SetContent(ParseTargetingPluginStartedPage.ToSharedRef());
	}
}

void SDocToolWidget::SetCurrentViewType_ParseTargetingEngineStartedPage()
{
	if (ShouldShowWidget(ParseTargetingEngineStartedPage))
	{
		SAssignNew(ParseTargetingEngineStartedPage, SDocToolWidget_ParseTargetingEngineStartedPage)
			.DocToolWidget(this);

		CurrentPage = &ParseTargetingEngineStartedPage;
		ViewContainer->SetContent(ParseTargetingEngineStartedPage.ToSharedRef());
	}
}

void SDocToolWidget::SetCurrentViewType_SelectParseTargetTypePage()
{
	if (ShouldShowWidget(SelectParseTargetTypePage))
	{
		SAssignNew(SelectParseTargetTypePage, SDocToolWidget_SelectParseTargetTypePage)
			.DocToolWidget(this);

		CurrentPage = &SelectParseTargetTypePage;
		ViewContainer->SetContent(SelectParseTargetTypePage.ToSharedRef());
	}
}

void SDocToolWidget::SetCurrentViewType_SelectParseTargetProjectPage()
{
	if (ShouldShowWidget(SelectParseTargetProjectPage))
	{
		SAssignNew(SelectParseTargetProjectPage, SDocToolWidget_SelectParseTargetProjectPage)
			.DocToolWidget(this);

		CurrentPage = &SelectParseTargetProjectPage;
		ViewContainer->SetContent(SelectParseTargetProjectPage.ToSharedRef());
	}
}

void SDocToolWidget::SetCurrentViewType_SelectParseTargetPluginPage()
{
	if (ShouldShowWidget(SelectParseTargetPluginPage))
	{
		SAssignNew(SelectParseTargetPluginPage, SDocToolWidget_SelectParseTargetPluginPage)
			.DocToolWidget(this);

		CurrentPage = &SelectParseTargetPluginPage;
		ViewContainer->SetContent(SelectParseTargetPluginPage.ToSharedRef());
	}
}

void SDocToolWidget::SetCurrentViewType_SelectParseTargetEnginePage()
{
	if (ShouldShowWidget(SelectParseTargetEnginePage))
	{
		SAssignNew(SelectParseTargetEnginePage, SDocToolWidget_SelectParseTargetEnginePage)
			.DocToolWidget(this);

		CurrentPage = &SelectParseTargetEnginePage;
		ViewContainer->SetContent(SelectParseTargetEnginePage.ToSharedRef());
	}
}

void SDocToolWidget::SetCurrentViewType_MiscellaneousPage()
{
	if (ShouldShowWidget(MiscellaneousPage))
	{
		SAssignNew(MiscellaneousPage, SDocToolWidget_MiscellaneousPage)
			.DocToolWidget(this);

		CurrentPage = &MiscellaneousPage;
		ViewContainer->SetContent(MiscellaneousPage.ToSharedRef());
	}
}

void SDocToolWidget::SetCurrentViewType_DeveloperToolsPage()
{
	if (ShouldShowWidget(DeveloperToolsPage))
	{
		SAssignNew(DeveloperToolsPage, SDocToolWidget_DeveloperToolsPage)
			.DocToolWidget(this);

		CurrentPage = &DeveloperToolsPage;
		ViewContainer->SetContent(DeveloperToolsPage.ToSharedRef());
	}
}

void SDocToolWidget::SetCurrentViewType_PackageDocToolPage()
{
	if (ShouldShowWidget(PackageDocToolPage))
	{
		SAssignNew(PackageDocToolPage, SDocToolWidget_PackageDocToolPage)
			.DocToolWidget(this);

		CurrentPage = &PackageDocToolPage;
		ViewContainer->SetContent(PackageDocToolPage.ToSharedRef());
	}
}

bool SDocToolWidget::ShouldShowWidget(const TSharedPtr<SWidget>& WidgetToSwitchTo)
{
	bool bShowWidget = false;
	
	if (CurrentPage == nullptr)
	{
		bShowWidget = true;
	}
	else if (CurrentPage->Get() != WidgetToSwitchTo.Get())
	{
		bShowWidget = true;
		CurrentPage->Reset();
	}

	return bShowWidget;
}

TSharedPtr<ProjectInfo> SDocToolWidget::GetProjectShownOnLastOptionsPage() const
{
	return ProjectShownOnLastOptionsPage;
}

TSharedPtr<PluginInfo> SDocToolWidget::GetPluginShownOnLastOptionsPage() const
{
	return PluginShownOnLastOptionsPage;
}

TSharedPtr<EngineInfo> SDocToolWidget::GetEngineShownOnLastOptionsPage() const
{
	return EngineShownOnLastOptionsPage;
}

const MainTaskOptionsState* SDocToolWidget::GetMainTaskOptionsShownOnLastOptionsPage() const
{
	return &MainTaskOptionsShownOnLastOptionsPage;
}

void SDocToolWidget::OnNavigateAwayFromOptionsPage(TSharedPtr<const SMainTaskOptions> OptionsWidgetPtr)
{
	NoteDownOptionsPageState(OptionsWidgetPtr);
}

void SDocToolWidget::OnContainingTabSavingVisualState()
{
	/* If we're showing the options page get it's state so it will be serialized 
	in CreateStateObject */
	if (*CurrentPage == CreateDocumentationTargetingProjectOptionsPage)
	{
		TSharedPtr<SMainTaskOptions> OptionsWidgetPtr = StaticCastSharedPtr<SDocToolWidget_CreateDocumentationTargetingProjectOptionsPage>(CreateDocumentationTargetingProjectOptionsPage)->GetOptionsWidgetPtr();
		NoteDownOptionsPageState(OptionsWidgetPtr);
	}
	else if (*CurrentPage == CreateDocumentationTargetingPluginOptionsPage)
	{
		TSharedPtr<SMainTaskOptions> OptionsWidgetPtr = StaticCastSharedPtr<SDocToolWidget_CreateDocumentationTargetingPluginOptionsPage>(CreateDocumentationTargetingPluginOptionsPage)->GetOptionsWidgetPtr();
		NoteDownOptionsPageState(OptionsWidgetPtr);
	}
	else if (*CurrentPage == CreateDocumentationTargetingEngineOptionsPage)
	{
		TSharedPtr<SMainTaskOptions> OptionsWidgetPtr = StaticCastSharedPtr<SDocToolWidget_CreateDocumentationTargetingEngineOptionsPage>(CreateDocumentationTargetingEngineOptionsPage)->GetOptionsWidgetPtr();
		NoteDownOptionsPageState(OptionsWidgetPtr);
	}
	else if (*CurrentPage == ParseTargetingProjectOptionsPage)
	{
		TSharedPtr<SMainTaskOptions> OptionsWidgetPtr = StaticCastSharedPtr<SDocToolWidget_ParseTargetingProjectOptionsPage>(ParseTargetingProjectOptionsPage)->GetOptionsWidgetPtr();
		NoteDownOptionsPageState(OptionsWidgetPtr);
	}
	else if (*CurrentPage == ParseTargetingPluginOptionsPage)
	{
		TSharedPtr<SMainTaskOptions> OptionsWidgetPtr = StaticCastSharedPtr<SDocToolWidget_ParseTargetingPluginOptionsPage>(ParseTargetingPluginOptionsPage)->GetOptionsWidgetPtr();
		NoteDownOptionsPageState(OptionsWidgetPtr);
	}
	else if (*CurrentPage == ParseTargetingEngineOptionsPage)
	{
		TSharedPtr<SMainTaskOptions> OptionsWidgetPtr = StaticCastSharedPtr<SDocToolWidget_ParseTargetingEngineOptionsPage>(ParseTargetingEngineOptionsPage)->GetOptionsWidgetPtr();
		NoteDownOptionsPageState(OptionsWidgetPtr);
	}

	SavedState State;
	CreateStateObject(State);

	State.Save();
}

void SDocToolWidget::NoteDownOptionsPageState(TSharedPtr<const SMainTaskOptions> OptionsWidgetPtr)
{
	ProjectShownOnLastOptionsPage = OptionsWidgetPtr->GetTargetProject();
	PluginShownOnLastOptionsPage = OptionsWidgetPtr->GetTargetPlugin();
	EngineShownOnLastOptionsPage = OptionsWidgetPtr->GetTargetEngine();
	MainTaskOptionsShownOnLastOptionsPage = OptionsWidgetPtr->GetState();
}

void SDocToolWidget::CreateStateObject(SavedState& OutState)
{
	/* This along with SetStateFromStateObject were put together quickly */

	OutState.OpenPage = CurrentPage->Get()->GetTypeAsString();
	OutState.LastTargetedProject = ProjectShownOnLastOptionsPage.IsValid() ? ProjectShownOnLastOptionsPage->Path + TEXT("/") + ProjectShownOnLastOptionsPage->Name + TEXT(".uproject") : FString();
	OutState.LastTargetedPlugin = PluginShownOnLastOptionsPage.IsValid() ? PluginShownOnLastOptionsPage->Path + TEXT(",") + PluginShownOnLastOptionsPage->FriendlyName : FString();
	OutState.LastTargetedEngine = EngineShownOnLastOptionsPage.IsValid() ? EngineShownOnLastOptionsPage->Name + TEXT(",") + EngineShownOnLastOptionsPage->Path : FString();
	OutState.OptionsPage = MainTaskOptionsShownOnLastOptionsPage;
}

void SDocToolWidget::SavedState::Save()
{
	FConfigSection* Section = GConfig->GetSectionPrivate(INI_SECTION_NAME, true, false, GEditorPerProjectIni);
	if (Section != nullptr)
	{
		AddToSection(Section, NAME_OpenPage, OpenPage);
		AddToSection(Section, NAME_LastTargetedProject, LastTargetedProject);
		AddToSection(Section, NAME_LastTargetedPlugin, LastTargetedPlugin);
		AddToSection(Section, NAME_LastTargetedEngine, LastTargetedEngine);

		if (OptionsPage.NonEngineTargetDisplayName.IsSet())
		{
			AddToSection(Section, NAME_NonEngineTargetDisplayName, OptionsPage.NonEngineTargetDisplayName.GetValue().ToString());
		}
		if (OptionsPage.OutputPath.IsSet())
		{
			AddToSection(Section, NAME_OutputPath, OptionsPage.OutputPath.GetValue());
		}
		if (OptionsPage.bRunOnSeparateProcess.IsSet())
		{
			AddToSection(Section, NAME_RunOnSeparateProcess, ToString(OptionsPage.bRunOnSeparateProcess.GetValue()));
		}
		if (OptionsPage.bReportProgressToNotificationWidget.IsSet())
		{
			AddToSection(Section, NAME_ReportProgressToNotificationWidget, ToString(OptionsPage.bReportProgressToNotificationWidget.GetValue()));
		}
		if (OptionsPage.bReportProgressToLog.IsSet())
		{
			AddToSection(Section, NAME_ReportProgressToLog, ToString(OptionsPage.bReportProgressToLog.GetValue()));
		}
		if (OptionsPage.ProgressDelegate.IsSet())
		{
			AddToSection(Section, NAME_ProgressDelegate, OptionsPage.ProgressDelegate.GetValue().ToString());
		}
		if (OptionsPage.StoppedDelegate.IsSet())
		{
			AddToSection(Section, NAME_StoppedDelegate, OptionsPage.StoppedDelegate.GetValue().ToString());
		}
		if (OptionsPage.NumThreads.IsSet())
		{
			AddToSection(Section, NAME_NumThreads, FString::FromInt(OptionsPage.NumThreads.GetValue()));
		}
	}
}

void SDocToolWidget::SavedState::Load()
{
	const FConfigSection* Section = GConfig->GetSectionPrivate(INI_SECTION_NAME, false, true, GEditorPerProjectIni);
	if (Section != nullptr)
	{
		GetFromSection(Section, NAME_OpenPage, OpenPage);
		GetFromSection(Section, NAME_LastTargetedProject, LastTargetedProject);
		GetFromSection(Section, NAME_LastTargetedPlugin, LastTargetedPlugin);
		GetFromSection(Section, NAME_LastTargetedEngine, LastTargetedEngine);

		FString String;
		
		if (GetFromSection(Section, NAME_NonEngineTargetDisplayName, String))
		{
			OptionsPage.NonEngineTargetDisplayName = FText::AsCultureInvariant(String);
		}
		if (GetFromSection(Section, NAME_OutputPath, String))
		{
			OptionsPage.OutputPath = String;
		}
		if (GetFromSection(Section, NAME_RunOnSeparateProcess, String))
		{
			OptionsPage.bRunOnSeparateProcess = ToBool(String);
		}
		if (GetFromSection(Section, NAME_ReportProgressToNotificationWidget, String))
		{
			OptionsPage.bReportProgressToNotificationWidget = ToBool(String);
		}
		if (GetFromSection(Section, NAME_ReportProgressToLog, String))
		{
			OptionsPage.bReportProgressToLog = ToBool(String);
		}
		if (GetFromSection(Section, NAME_ProgressDelegate, String))
		{
			OptionsPage.ProgressDelegate = FText::AsCultureInvariant(String);
		}
		if (GetFromSection(Section, NAME_StoppedDelegate, String))
		{
			OptionsPage.StoppedDelegate = FText::AsCultureInvariant(String);
		}
		if (GetFromSection(Section, NAME_NumThreads, String))
		{
			OptionsPage.NumThreads = FCString::Atoi(*String);
		}
	}
}

void SDocToolWidget::SavedState::AddToSection(FConfigSection* Section, const FName& Key, const FString& Value)
{
	FConfigValue* ValuePtr = Section->Find(Key);
	if (ValuePtr == nullptr)
	{
		Section->Add(Key, Value);
	}
	else if (GH::AreEqual(ValuePtr->GetSavedValue(), Value) == false)
	{
		*ValuePtr = Value;
	}
}

bool SDocToolWidget::SavedState::GetFromSection(const FConfigSection* Section, const FName& Key, FString& OutValue)
{
	const FConfigValue* ValuePtr = Section->Find(Key);
	if (ValuePtr == nullptr)
	{
		return false;
	}
	
	OutValue = ValuePtr->GetValue();
	return true;
}

FString SDocToolWidget::SavedState::ToString(bool Bool)
{
	return Bool ? TEXT("True") : TEXT("False");
}

bool SDocToolWidget::SavedState::ToBool(const FString& String)
{
	return (String == TEXT("True"));
}

const FName SDocToolWidget::SavedState::NAME_OpenPage								= FName(TEXT("OpenPage"));
const FName SDocToolWidget::SavedState::NAME_LastTargetedProject					= FName(TEXT("LastTargetedProject"));
const FName SDocToolWidget::SavedState::NAME_LastTargetedPlugin						= FName(TEXT("LastTargetedPlugin"));
const FName SDocToolWidget::SavedState::NAME_LastTargetedEngine						= FName(TEXT("LastTargetedEngine"));
const FName SDocToolWidget::SavedState::NAME_NonEngineTargetDisplayName				= FName(TEXT("NonEngineTargetDisplayName"));
const FName SDocToolWidget::SavedState::NAME_OutputPath								= FName(TEXT("OutputPath"));
const FName SDocToolWidget::SavedState::NAME_RunOnSeparateProcess					= FName(TEXT("RunOnSeparateProcess"));
const FName SDocToolWidget::SavedState::NAME_ReportProgressToNotificationWidget		= FName(TEXT("ReportProgressToNotificationWidget"));
const FName SDocToolWidget::SavedState::NAME_ReportProgressToLog					= FName(TEXT("ReportProgressToLog"));
const FName SDocToolWidget::SavedState::NAME_ProgressDelegate						= FName(TEXT("ProgressDelegate"));
const FName SDocToolWidget::SavedState::NAME_StoppedDelegate						= FName(TEXT("StoppedDelegate"));
const FName SDocToolWidget::SavedState::NAME_NumThreads								= FName(TEXT("NumThreads"));


//-------------------------------------------------------------------
// ------------ Main Page -------------
//-------------------------------------------------------------------
DocToolWidgetPageInfo SDocToolWidget_MainPage::GetHistoryCrumbTrailInfo()
{
	return DocToolWidgetPageInfo(LOCTEXT("Main Page Display Name", "Home"), EDocToolWidgetPageType::Main);
}

SDocToolWidget_MainPage::SDocToolWidget_MainPage()
	: DocToolWidget(nullptr)
{
}

void SDocToolWidget_MainPage::Construct(const FArguments& InArgs)
{
	DocToolWidget = InArgs._DocToolWidget;

	ChildSlot
	[
		SNew(SBorder)
		.BorderImage(FEditorStyle::GetBrush(TEXT("ToolPanel.GroupBorder")))
		.Padding(FMargin(8.f, 4.f))
		[
			SNew(SVerticalBox)
			
			+ DocToolWidgetHelpers::AddPageHeader(
				LOCTEXT("Home", "Home"),
				FOnDocToolWidgetCrumbClicked::CreateSP(this, &SDocToolWidget_MainPage::OnHistoryPathClicked),
				FGetDocToolWidgetCrumbMenuContent::CreateSP(this, &SDocToolWidget_MainPage::OnGetCrumbDelimiterContent),
				nullptr,
				{ SDocToolWidget_MainPage::GetHistoryCrumbTrailInfo() }
			)

			+ SVerticalBox::Slot()
			[
				SNew(SGridPanel)
				.FillColumn(1, 1.f)

				+ SGridPanel::Slot(0, 0)
				.Padding(8.f, 0.f, 0.f, 0.f)
				.VAlign(VAlign_Top)
				[
					SNew(STextBlock)
					.Text(LOCTEXT("Create", "Create"))
					.TextStyle(FDocToolStyle::Get(), TEXT("SDocToolWidget_MainPage.Section"))
				]

				+ SGridPanel::Slot(1, 0)
				.HAlign(HAlign_Left)
				.Padding(32.f, 0.f, 8.f, 0.f)
				[
					SNew(SVerticalBox)

					// Create documentation button
					+ SVerticalBox::Slot()
					.Padding(0.f, 2.f)
					[
						SNew(SButton)
						.ButtonStyle(FDocToolStyle::Get(), TEXT("DocToolWidget.GenericButton"))
						.HAlign(HAlign_Center)
						.VAlign(VAlign_Center)
						.Text(FText::AsCultureInvariant(TEXT("Create Documentation")))
						.OnClicked(this, &SDocToolWidget_MainPage::OnCreateDocumentationButtonClicked)
					]

					// Parse button
					+ SVerticalBox::Slot()
					.Padding(0.f, 2.f)
					[
						SNew(SButton)
						.ButtonStyle(FDocToolStyle::Get(), TEXT("DocToolWidget.GenericButton"))
						.HAlign(HAlign_Center)
						.VAlign(VAlign_Center)
						.Text(FText::AsCultureInvariant(TEXT("Parse")))
						.OnClicked(this, &SDocToolWidget_MainPage::OnParseButtonClicked)
					]
				]

				+ SGridPanel::Slot(0, 1)
				.ColumnSpan(3)
				.Padding(0.f, 16.f)
				[
					SNew(SSeparator)
					.Orientation(Orient_Horizontal)
				]

				+ SGridPanel::Slot(0, 2)
				.Padding(8.f, 0.f, 0.f, 0.f)
				.VAlign(VAlign_Top)
				[
					SNew(STextBlock)
					.Text(LOCTEXT("Other", "Other"))
					.TextStyle(FDocToolStyle::Get(), TEXT("SDocToolWidget_MainPage.Section"))
				]

				+ SGridPanel::Slot(1, 2)
				.HAlign(HAlign_Left)
				.Padding(32.f, 0.f, 8.f, 0.f)
				[
					SNew(SVerticalBox)

					// Miscellaneous button
					+ SVerticalBox::Slot()
					.Padding(0.f, 2.f)
					[
						SNew(SButton)
						.ButtonStyle(FDocToolStyle::Get(), TEXT("DocToolWidget.GenericButton"))
						.HAlign(HAlign_Center)
						.VAlign(VAlign_Center)
						.Text(FText::AsCultureInvariant(TEXT("Miscellaneous")))
						.OnClicked(this, &SDocToolWidget_MainPage::OnMiscellaneousButtonClicked)
					]

					// Developer tools button
					+ SVerticalBox::Slot()
					.Padding(0.f, 2.f)
					[
						SNew(SButton)
						.ButtonStyle(FDocToolStyle::Get(), TEXT("DocToolWidget.GenericButton"))
						.HAlign(HAlign_Center)
						.VAlign(VAlign_Center)
						.Text(FText::AsCultureInvariant(TEXT("Developer Tools")))
						.OnClicked(this, &SDocToolWidget_MainPage::OnDeveloperToolsButtonClicked)
					]
				]
			]
		]
	];
}

void SDocToolWidget_MainPage::OnHistoryPathClicked(const EDocToolWidgetPageType& CrumbData)
{
	DocToolWidgetHelpers::NavigateDocToolWidgetToPageForHistoryCrumbClick(DocToolWidget, CrumbData);
}

FGetDocToolWidgetCrumbMenuContent_RetValType SDocToolWidget_MainPage::OnGetCrumbDelimiterContent(const EDocToolWidgetPageType& CrumbData)
{
	return SNullWidget::NullWidget;
}

FReply SDocToolWidget_MainPage::OnCreateDocumentationButtonClicked()
{
	DocToolWidget->SetCurrentViewType_SelectCreateDocumentationTargetTypePage();
	return FReply::Handled();
}

FReply SDocToolWidget_MainPage::OnParseButtonClicked()
{
	DocToolWidget->SetCurrentViewType_SelectParseTargetTypePage();
	return FReply::Handled();
}

FReply SDocToolWidget_MainPage::OnMiscellaneousButtonClicked()
{
	DocToolWidget->SetCurrentViewType_MiscellaneousPage();
	return FReply::Handled();
}

FReply SDocToolWidget_MainPage::OnDeveloperToolsButtonClicked()
{
	DocToolWidget->SetCurrentViewType_DeveloperToolsPage();
	return FReply::Handled();
}


void STargetTypeSelector::Construct(const FArguments& InArgs)
{
	ChildSlot
	[
		SNew(SBorder)
		.BorderImage(FEditorStyle::GetBrush(TEXT("ToolPanel.GroupBorder")))
		.Padding(FMargin(8.f, 4.f))
		[
			SNew(SVerticalBox)

			+ DocToolWidgetHelpers::AddPageHeader(
				LOCTEXT("Select Target Type", "Select Target Type"),
				InArgs._OnCrumbClicked,
				InArgs._GetCrumbMenuContent,
				nullptr,
				InArgs._CrumbTrail
			)

			+ SVerticalBox::Slot()
			.Padding(64.f, 16.f)
			[
				SNew(SVerticalBox)

				// Project button
				+ SVerticalBox::Slot()
				.AutoHeight()
				.Padding(0.f, 8.f)
				[
					SNew(SButton)
					.HAlign(HAlign_Center)
					.VAlign(VAlign_Center)
					.ContentPadding(8.f)
					.Text(FText::AsCultureInvariant(TEXT("Project")))
					.OnClicked(InArgs._OnProjectButtonClicked)
				]

				// Plugin button
				+ SVerticalBox::Slot()
				.AutoHeight()
				.Padding(0.f, 8.f)
				[
					SNew(SButton)
					.HAlign(HAlign_Center)
					.VAlign(VAlign_Center)
					.ContentPadding(8.f)
					.Text(FText::AsCultureInvariant(TEXT("Plugin")))
					.OnClicked(InArgs._OnPluginButtonClicked)
				]

				// Engine button
				+ SVerticalBox::Slot()
				.AutoHeight()
				.Padding(0.f, 8.f)
				[
					SNew(SButton)
					.HAlign(HAlign_Center)
					.VAlign(VAlign_Center)
					.ContentPadding(8.f)
					.Text(FText::AsCultureInvariant(TEXT("Engine")))
					.OnClicked(InArgs._OnEngineButtonClicked)
				]
			]

			+ SVerticalBox::Slot()
			.Padding(0, 20, 0, 0)
			.AutoHeight()
			[
				SNew(SHorizontalBox)

				// Back Button
				+ SHorizontalBox::Slot()
				.AutoWidth()
				.Padding(0.f, 0.f, 8.f, 0.f)
				[
					SNew(SButton)
					.ButtonStyle(FDocToolStyle::Get(), TEXT("DocToolWidget.GenericButton"))
					.Text(LOCTEXT("BackButton", "Back"))
					.OnClicked(InArgs._OnBackButtonClicked)
				]
			]
		]
	];
}


DocToolWidgetPageInfo SDocToolWidget_SelectCreateDocumentationTargetTypePage::GetHistoryCrumbTrailInfo()
{
	return DocToolWidgetPageInfo(LOCTEXT("Select Create Documentation Target Type Page Display Name", "Documentation Target Type"), EDocToolWidgetPageType::SelectCreateDocumentationTargetType);
}

//-------------------------------------------------------------------
// ------------ Select Create Documentation Target Type Page -------------
//-------------------------------------------------------------------
SDocToolWidget_SelectCreateDocumentationTargetTypePage::SDocToolWidget_SelectCreateDocumentationTargetTypePage()
	: DocToolWidget(nullptr)
{
}

void SDocToolWidget_SelectCreateDocumentationTargetTypePage::Construct(const FArguments& InArgs)
{
	DocToolWidget = InArgs._DocToolWidget;

	ChildSlot
	[
		SNew(STargetTypeSelector)
		.OnCrumbClicked(FOnDocToolWidgetCrumbClicked::CreateSP(this, &SDocToolWidget_SelectCreateDocumentationTargetTypePage::OnHistoryPathClicked))
		.GetCrumbMenuContent(FGetDocToolWidgetCrumbMenuContent::CreateSP(this, &SDocToolWidget_SelectCreateDocumentationTargetTypePage::OnGetCrumbDelimiterContent))
		.CrumbTrail({ SDocToolWidget_MainPage::GetHistoryCrumbTrailInfo(), SDocToolWidget_SelectCreateDocumentationTargetTypePage::GetHistoryCrumbTrailInfo() })
		.OnProjectButtonClicked(FOnClicked::CreateSP(this, &SDocToolWidget_SelectCreateDocumentationTargetTypePage::OnProjectButtonClicked))
		.OnPluginButtonClicked(FOnClicked::CreateSP(this, &SDocToolWidget_SelectCreateDocumentationTargetTypePage::OnPluginButtonClicked))
		.OnEngineButtonClicked(FOnClicked::CreateSP(this, &SDocToolWidget_SelectCreateDocumentationTargetTypePage::OnEngineButtonClicked))
		.OnBackButtonClicked(FOnClicked::CreateSP(this, &SDocToolWidget_SelectCreateDocumentationTargetTypePage::OnBackButtonClicked))
	];
}

void SDocToolWidget_SelectCreateDocumentationTargetTypePage::OnHistoryPathClicked(const EDocToolWidgetPageType& CrumbData)
{
	DocToolWidgetHelpers::NavigateDocToolWidgetToPageForHistoryCrumbClick(DocToolWidget, CrumbData);
}

FGetDocToolWidgetCrumbMenuContent_RetValType SDocToolWidget_SelectCreateDocumentationTargetTypePage::OnGetCrumbDelimiterContent(const EDocToolWidgetPageType& CrumbData)
{
	return SNullWidget::NullWidget;
}

FReply SDocToolWidget_SelectCreateDocumentationTargetTypePage::OnProjectButtonClicked()
{
	DocToolWidget->SetCurrentViewType_SelectCreateDocumentationTargetProjectPage();
	return FReply::Handled();
}

FReply SDocToolWidget_SelectCreateDocumentationTargetTypePage::OnPluginButtonClicked()
{
	DocToolWidget->SetCurrentViewType_SelectCreateDocumentationTargetPluginPage();
	return FReply::Handled();
}

FReply SDocToolWidget_SelectCreateDocumentationTargetTypePage::OnEngineButtonClicked()
{
	DocToolWidget->SetCurrentViewType_SelectCreateDocumentationTargetEnginePage();
	return FReply::Handled();
}

FReply SDocToolWidget_SelectCreateDocumentationTargetTypePage::OnBackButtonClicked()
{
	DocToolWidget->SetCurrentViewType_MainPage();
	return FReply::Handled();
}


DocToolWidgetPageInfo SDocToolWidget_SelectParseTargetTypePage::GetHistoryCrumbTrailInfo()
{
	return DocToolWidgetPageInfo(LOCTEXT("Select Parse Target Type Page Display Name", "Parse Target Type"), EDocToolWidgetPageType::SelectParseTargetType);
}

SDocToolWidget_SelectParseTargetTypePage::SDocToolWidget_SelectParseTargetTypePage()
	: DocToolWidget(nullptr)
{
}

void SDocToolWidget_SelectParseTargetTypePage::Construct(const FArguments& InArgs)
{
	DocToolWidget = InArgs._DocToolWidget;

	ChildSlot
	[
		SNew(STargetTypeSelector)
		.OnCrumbClicked(FOnDocToolWidgetCrumbClicked::CreateSP(this, &SDocToolWidget_SelectParseTargetTypePage::OnHistoryPathClicked))
		.GetCrumbMenuContent(FGetDocToolWidgetCrumbMenuContent::CreateSP(this, &SDocToolWidget_SelectParseTargetTypePage::OnGetCrumbDelimiterContent))
		.CrumbTrail({ SDocToolWidget_MainPage::GetHistoryCrumbTrailInfo(), SDocToolWidget_SelectParseTargetTypePage::GetHistoryCrumbTrailInfo() })
		.OnProjectButtonClicked(FOnClicked::CreateSP(this, &SDocToolWidget_SelectParseTargetTypePage::OnProjectButtonClicked))
		.OnPluginButtonClicked(FOnClicked::CreateSP(this, &SDocToolWidget_SelectParseTargetTypePage::OnPluginButtonClicked))
		.OnEngineButtonClicked(FOnClicked::CreateSP(this, &SDocToolWidget_SelectParseTargetTypePage::OnEngineButtonClicked))
		.OnBackButtonClicked(FOnClicked::CreateSP(this, &SDocToolWidget_SelectParseTargetTypePage::OnBackButtonClicked))
	];
}

void SDocToolWidget_SelectParseTargetTypePage::OnHistoryPathClicked(const EDocToolWidgetPageType& CrumbData)
{
	DocToolWidgetHelpers::NavigateDocToolWidgetToPageForHistoryCrumbClick(DocToolWidget, CrumbData);
}

FGetDocToolWidgetCrumbMenuContent_RetValType SDocToolWidget_SelectParseTargetTypePage::OnGetCrumbDelimiterContent(const EDocToolWidgetPageType& CrumbData)
{
	return SNullWidget::NullWidget;
}

FReply SDocToolWidget_SelectParseTargetTypePage::OnProjectButtonClicked()
{
	DocToolWidget->SetCurrentViewType_SelectParseTargetProjectPage();
	return FReply::Handled();
}

FReply SDocToolWidget_SelectParseTargetTypePage::OnPluginButtonClicked()
{
	DocToolWidget->SetCurrentViewType_SelectParseTargetPluginPage();
	return FReply::Handled();
}

FReply SDocToolWidget_SelectParseTargetTypePage::OnEngineButtonClicked()
{
	DocToolWidget->SetCurrentViewType_SelectParseTargetEnginePage();
	return FReply::Handled();
}

FReply SDocToolWidget_SelectParseTargetTypePage::OnBackButtonClicked()
{
	DocToolWidget->SetCurrentViewType_MainPage();
	return FReply::Handled();
}


TSharedPtr<FJsonObject> ProjectInfo::LoadUProjectFile(const FString& ProjectsUProjectFilePath)
{
	FString FileContents;

	if (FFileHelper::LoadFileToString(FileContents, *ProjectsUProjectFilePath) == false)
	{
		return TSharedPtr<FJsonObject>(nullptr);
	}

	TSharedPtr<FJsonObject> JsonObject;
	TSharedRef<TJsonReader<>> Reader = TJsonReaderFactory<>::Create(FileContents);
	if (FJsonSerializer::Deserialize(Reader, JsonObject) == false || JsonObject.IsValid() == false)
	{
		return TSharedPtr<FJsonObject>(nullptr);
	}

	return JsonObject;
}

TSharedPtr<FSlateDynamicImageBrush> ProjectInfo::GetThumbnailForProject(const FString& ProjectsPath, const FString& ProjectsName)
{
	TSharedPtr<FSlateDynamicImageBrush> DynamicBrush;
	const FString ThumbnailPNGFile = ProjectsPath + TEXT("/") + ProjectsName + TEXT(".png");
	const FString AutoScreenShotPNGFile = ProjectsPath + TEXT("/") + TEXT("Saved/AutoScreenshot.png");
	FString PNGFileToUse;
	if (FPaths::FileExists(*ThumbnailPNGFile))
	{
		PNGFileToUse = ThumbnailPNGFile;
	}
	else if (FPaths::FileExists(*AutoScreenShotPNGFile))
	{
		PNGFileToUse = AutoScreenShotPNGFile;
	}

	if (PNGFileToUse.IsEmpty() == false)
	{
		const FName BrushName = FName(*PNGFileToUse);
		DynamicBrush = MakeShareable(new FSlateDynamicImageBrush(BrushName, FVector2D(128, 128)));
	}

	return DynamicBrush;
}

/* Similar to FDesktopPlatformBase::GetEngineIdentifierForProject, except I left a lot
of stuff out cause I'm too busy right now */
bool ProjectInfo::GetEngineIdentifierFromProjectFile(
	const FString& ProjectsUProjectFilePath, 
	TSharedPtr<FJsonObject> TargetProjectsUProjectFileContents, 
	FString& OutIdentifier)
{
	TSharedPtr<FJsonValue> Value = TargetProjectsUProjectFileContents->TryGetField(TEXT("EngineAssociation"));
	if (Value.IsValid() && Value->Type == EJson::String)
	{
		OutIdentifier = Value->AsString();
		if (OutIdentifier.Len() > 0)
		{
			return true;
		}
	}

	return false;
}

bool ProjectInfo::GetCategoryFromProjectFile(
	TSharedPtr<FJsonObject> TargetProjectsUProjectFileContents, 
	FString& OutCategory)
{
	TSharedPtr<FJsonValue> Value = TargetProjectsUProjectFileContents->TryGetField(TEXT("Category"));
	if (Value.IsValid() && Value->Type == EJson::String)
	{
		OutCategory = Value->AsString();
		if (OutCategory.Len() > 0)
		{
			return true;
		}
	}

	return false;
}

bool ProjectInfo::GetDescriptionFromProjectFile(
	TSharedPtr<FJsonObject> TargetProjectsUProjectFileContents, 
	FString& OutDescription)
{
	TSharedPtr<FJsonValue> Value = TargetProjectsUProjectFileContents->TryGetField(TEXT("Description"));
	if (Value.IsValid() && Value->Type == EJson::String)
	{
		OutDescription = Value->AsString();
		if (OutDescription.Len() > 0)
		{
			return true;
		}
	}

	return false;
}


ProjectInfo::ProjectInfo(const FString& ProjectsUProjectFilePath, TSharedPtr<FJsonObject> TargetProjectsUProjectFileContents)
{
	FString Str;

	//----------------------------------------------
	//	Name

	Str = ProjectsUProjectFilePath.LeftChop(FString(TEXT(".uproject")).Len());
	const int32 IndexOfLastSlash = Str.Find(TEXT("/"), ESearchCase::CaseSensitive, ESearchDir::FromEnd);
	Str = Str.RightChop(IndexOfLastSlash + 1);
	Name = Str;

	//----------------------------------------------
	//	Path

	Path = ProjectsUProjectFilePath.Left(IndexOfLastSlash);

	//----------------------------------------------
	//	Thumbnail

	Thumbnail = GetThumbnailForProject(Path, Name);

	if (TargetProjectsUProjectFileContents.IsValid())
	{
		//----------------------------------------------
		//	EngineIdentifier

		GetEngineIdentifierFromProjectFile(ProjectsUProjectFilePath, TargetProjectsUProjectFileContents, EngineIdentifier);
	
		//----------------------------------------------
		//	Category part 1

		GetCategoryFromProjectFile(TargetProjectsUProjectFileContents, Category);

		//----------------------------------------------
		//	Description

		GetDescriptionFromProjectFile(TargetProjectsUProjectFileContents, Description);
	}

	//----------------------------------------------
	//	Category part 2

	// @todo this might need to be a param and you'll want to base it off
	// what type of project it is e.g. user generated ("My Projects"),
	// sample, etc
	FString DefaultCategory = PredefinedProjectCategories::MyProjects;
	if (Category.Len() == 0)
	{
		Category = DefaultCategory;
	}
}


const FString PredefinedProjectCategories::MyProjects	= TEXT("My Projects");
const FString PredefinedProjectCategories::Samples		= TEXT("Samples");


//-------------------------------------------------------------------
// ------------ Select Create Documentation Target Project Page -----
//-------------------------------------------------------------------
void ProjectItemToString(const TSharedPtr<ProjectInfo> InItem, TArray<FString>& OutFilterStrings)
{
	OutFilterStrings.Emplace(InItem->Name);
}

SMyProjectBrowser::SMyProjectBrowser()
	: CategoriesBox(nullptr)
	, OverlayForPopupsPtr(nullptr)
	, SearchBoxPtr(nullptr)
	, ProjectItemFilter(ProjectItemTextFilter::FItemToStringArray::CreateStatic(ProjectItemToString))
	, ThumbnailBorderPadding(8)
	, ThumbnailSize(128)
	, NumFilteredProjects(0)
	, bPreventSelectionChangeEvent(false)
	, SelectedProject(nullptr)
{
}

void SMyProjectBrowser::Construct(const FArguments& InArgs)
{
	HandleProjectItemDoubleClickDelegate = InArgs._HandleProjectItemDoubleClick;
	OnBackButtonClickedDelegate = InArgs._OnBackButtonClicked;
	OnContinueButtonClickedDelegate = InArgs._OnContinueButtonClicked;

	CategoriesBox = SNew(SVerticalBox);

	FindProjects();

	ChildSlot
	[
		SNew(SBorder)
		.BorderImage(FEditorStyle::GetBrush(TEXT("ToolPanel.GroupBorder")))
		.Padding(GetMainBorderPadding())
		[
			SAssignNew(OverlayForPopupsPtr, SOverlay)

			+ SOverlay::Slot()
			[
				SNew(SVerticalBox)

				+ DocToolWidgetHelpers::AddPageHeader(
					LOCTEXT("Select Project", "Select Project"),
					InArgs._OnHistoryPathClicked,
					InArgs._OnGetCrumbDelimiterContent,
					nullptr,
					InArgs._CrumbTrail
				)

				// Categories
				+ SVerticalBox::Slot()
				.Padding(8.f)
				.FillHeight(1.0f)
				[
					SNew(SVerticalBox)

					+ SVerticalBox::Slot()
					.AutoHeight()
					.VAlign(VAlign_Top)
					[
						SNew(SHorizontalBox)

						+ SHorizontalBox::Slot()
						.Padding(FMargin(0, 0, 5.f, 0))
						.VAlign(VAlign_Center)
						[
							SNew(SOverlay)

							+ SOverlay::Slot()
							[
								SAssignNew(SearchBoxPtr, SSearchBox)
								.HintText(LOCTEXT("FilterHint", "Filter Projects..."))
								.OnTextChanged(this, &SMyProjectBrowser::OnFilterTextChanged)
							]

							+ SOverlay::Slot()
							[
								SNew(SBorder)
								.Visibility(this, &SMyProjectBrowser::GetFilterActiveOverlayVisibility)
								.BorderImage(FEditorStyle::Get().GetBrush(TEXT("SearchBox.ActiveBorder")))
							]
						]

						+ SHorizontalBox::Slot()
						.AutoWidth()
						.VAlign(VAlign_Center)
						.Padding(FMargin(0.f, 0.f, 5.f, 0.f))
						[
							SNew(SButton)
							.ButtonStyle(FEditorStyle::Get(), TEXT("ToggleButton"))
							.OnClicked(this, &SMyProjectBrowser::OnRefreshButtonClicked)
							.ForegroundColor(FSlateColor::UseForeground())
							.ToolTipText(LOCTEXT("RefreshProjectList", "Refresh the project list"))
							.HAlign(HAlign_Center)
							.VAlign(VAlign_Center)
							[
								SNew(SHorizontalBox)

								+ SHorizontalBox::Slot()
								.Padding(2.0f)
								.VAlign(VAlign_Center)
								.AutoWidth()
								[
									SNew(SImage)
									.Image(FEditorStyle::GetBrush(TEXT("Icons.Refresh")))
								]

								+ SHorizontalBox::Slot()
								.VAlign(VAlign_Center)
								.Padding(2.0f)
								[
									SNew(STextBlock)
									.TextStyle(FEditorStyle::Get(), TEXT("ProjectBrowser.Toolbar.Text"))
									.Text(LOCTEXT("RefreshProjectsText", "Refresh"))
								]
							]
						]
					]

					+ SVerticalBox::Slot()
					.Padding(FMargin(0.f, 5.f))
					[
						SNew(SScrollBox)

						+ SScrollBox::Slot()
						[
							CategoriesBox.ToSharedRef()
						]
					]
				]

				+ SVerticalBox::Slot()
				.Padding(0, 20, 0, 0)	// Lots of vertical padding before the dialog buttons at the bottom
				.AutoHeight()
				[
					SNew(SHorizontalBox)

					// Back Button
					+ SHorizontalBox::Slot()
					.AutoWidth()
					.Padding(0.f, 0.f, 8.f, 0.f)
					[
						SNew(SButton)
						.ButtonStyle(FDocToolStyle::Get(), TEXT("DocToolWidget.GenericButton"))
						.Text(LOCTEXT("BackButton", "Back"))
						.OnClicked(this, &SMyProjectBrowser::OnBackButtonClicked)
					]

					+ SHorizontalBox::Slot()
					.FillWidth(1.0f)
					[
						SNullWidget::NullWidget
					]

					// Manually Locate Project Button
					+ SHorizontalBox::Slot()
					.AutoWidth()
					.Padding(0.f, 0.f, 8.f, 0.f)
					[
						SNew(SButton)
						.ButtonStyle(FDocToolStyle::Get(), TEXT("DocToolWidget.GenericButton"))
						.Text(LOCTEXT("ManullyLocateProjectButton", "Locate Project"))
						.OnClicked(this, &SMyProjectBrowser::OnManuallyLocateProjectButtonClicked)
					]

					// Continue Button
					+ SHorizontalBox::Slot()
					.AutoWidth()
					[
						SNew(SButton)
						.ButtonStyle(FDocToolStyle::Get(), TEXT("DocToolWidget.GenericButton"))
						.Text(LOCTEXT("ContinueButton", "Continue"))
						.OnClicked(this, &SMyProjectBrowser::OnContinueButtonClicked)
						.IsEnabled(this, &SMyProjectBrowser::HandleContinueButtonIsEnabled)
					]
				]
			]
		]
	];
}

FMargin SMyProjectBrowser::GetMainBorderPadding() const
{
	return FMargin(8.f, 4.f);
}

void SMyProjectBrowser::FindProjects()
{
	CategoriesBox->ClearChildren();

	CategoriesBox->AddSlot()
	.HAlign(HAlign_Center)
	.Padding(FMargin(0.f, 25.f))
	[
		SNew(STextBlock)
		.Visibility(this, &SMyProjectBrowser::GetNoProjectsErrorVisibility)
		.Text(LOCTEXT("NoProjects", "You don\'t have any projects yet :("))
	];

	CategoriesBox->AddSlot()
	.HAlign(HAlign_Center)
	.Padding(FMargin(0.f, 25.f))
	[
		SNew(STextBlock)
		.Visibility(this, &SMyProjectBrowser::GetNoProjectsAfterFilterErrorVisibility)
		.Text(LOCTEXT("NoProjectsAfterFilter", "There are no projects that match the specified filter"))
	];

	//-------------------------------------------------------------------------------------------
	//	-------- Locating all projects --------

	TMap<FString, FString> EngineInstallations;
	DocToolWidgetHelpers::GetEngineInstallations(EngineInstallations);

	TArray<FString> Projects;
	DocToolWidgetHelpers::GetProjects(EngineInstallations, Projects);

	//-------------------------------------------------------------------------------------------
	/* Read from disk any projects the user manually located in the past and wants us to 
	auto-load */
	
	const FString DocToolWidgetDataFilePath = FString(FWindowsPlatformProcess::UserSettingsDir()) + TEXT("UE4DocTool/DocToolWidgetData.json");
	FString FileContents;

	if (DocToolWidgetHelpers::AquireDocToolWidgetDataMutex())
	{
		FFileHelper::LoadFileToString(FileContents, *DocToolWidgetDataFilePath);
		TSharedPtr<FJsonObject> JsonObject = MakeShareable(new FJsonObject);
		TSharedRef<TJsonReader<>> Reader = TJsonReaderFactory<>::Create(FileContents);
		if (FJsonSerializer::Deserialize(Reader, JsonObject))
		{
			const TArray<TSharedPtr<FJsonValue>>* ManuallyLocatedProjectsArrayUnmutable;
			if (JsonObject->TryGetArrayField(TEXT("Projects to auto-load for project browser"), ManuallyLocatedProjectsArrayUnmutable))
			{
				/* Is it safe to const_cast here? The person who implemented TryGetArrayField 
				probably has it as const for a reason... I'm thinking because maybe another thread 
				is reading or writing to it perhaps? For now I'll just assume it's safe. 
				If no then you'll have to create a local copy of it, that's all */
				TArray<TSharedPtr<FJsonValue>>* ManuallyLocatedProjectsArray = const_cast<TArray<TSharedPtr<FJsonValue>>*>(ManuallyLocatedProjectsArrayUnmutable);

				/* This loop will remove any projects from the json array that either:
				1. are duplicates in the file
				2. get discovered by FindProjects
				3. no longer exist (.uproject file is gone)
				I never do this in my code - it is just in case a user edits the file.
				The loop also adds things to Projects array */
				for (int32 i = ManuallyLocatedProjectsArray->Num() - 1; i >= 0; --i)
				{
					FString Elem;
					if ((*ManuallyLocatedProjectsArray)[i]->TryGetString(Elem) == false)
					{
						ManuallyLocatedProjectsArray->RemoveAtSwap(i, 1, false);
						continue;
					}

					if (Elem.EndsWith(TEXT(".uproject")) == false)
					{
						ManuallyLocatedProjectsArray->RemoveAtSwap(i, 1, false);
						continue;
					}

					/* This file is shared by every engine so it doesn't make sense to have a 
					relative path in it - it would be different depending on which engine 
					you launched */
					if (FPaths::IsRelative(Elem))
					{
						ManuallyLocatedProjectsArray->RemoveAtSwap(i, 1, false);
						continue;
					}

					if (Projects.Contains(Elem))
					{
						ManuallyLocatedProjectsArray->RemoveAtSwap(i, 1, false);
						continue;
					}

					if (FPaths::FileExists(Elem) == false)
					{
						ManuallyLocatedProjectsArray->RemoveAtSwap(i, 1, false);
						continue;
					}

					Projects.Emplace(Elem);
				}

				FString UpdatedFileContents;
				TSharedRef<TJsonWriter<>> Writer = TJsonWriterFactory<>::Create(&UpdatedFileContents);
				FJsonSerializer::Serialize(JsonObject.ToSharedRef(), Writer);
				FFileHelper::SaveStringToFile(UpdatedFileContents, *DocToolWidgetDataFilePath);
			}
		}

		DocToolWidgetHelpers::ReleaseDocToolWidgetDataMutex();
	}

	//-------------------------------------------------------------------------------------------

	/* Add projects the users wants us to remember just for this time ("this time" 
	meaning "as long as this page is showing", but could make it as long as the time the 
	engine is running, depending on where NonRememberedManuallyLocatedProjects is 
	located) */
	for (int32 i = NonRememberedManuallyLocatedProjects.Num() - 1; i >= 0; --i)
	{
		const FString& Elem = NonRememberedManuallyLocatedProjects[i];

		if (Projects.Contains(Elem) == false && FPaths::FileExists(Elem))
		{
			Projects.Emplace(Elem);
		}
		else
		{
			NonRememberedManuallyLocatedProjects.RemoveAtSwap(i, 1, false);
		}
	}

	//-------------------------------------------------------------------------------------------

	ProjectInfos.Reset(Projects.Num());
	ProjectCategories.Reset();
	for (const auto& ProjectUProjectFilePath : Projects)
	{
		ProjectInfos.Emplace(MakeShareable(new ProjectInfo(ProjectUProjectFilePath, ProjectInfo::LoadUProjectFile(ProjectUProjectFilePath))));
	}

	/* Add entry to categories container */
	for (const auto& ProjectsInfo : ProjectInfos)
	{
		TSharedPtr<ProjectCategoryInfo>& Value = (ProjectCategories.Contains(ProjectsInfo->Category) == false) ? ProjectCategories.Emplace(ProjectsInfo->Category, MakeShareable(new ProjectCategoryInfo)) : ProjectCategories[ProjectsInfo->Category];
		Value->Projects.Emplace(ProjectsInfo);
	}

	/* Sort categories. Sort such that "My Projects" and "Samples" are 1st and 2nd, then the rest 
	alphabetically */
	ProjectCategories.KeySort([](const FString& S1, const FString& S2)
	{
		if (GH::AreEqual(S1, PredefinedProjectCategories::MyProjects))
		{
			return true;
		}
		else if (GH::AreEqual(S2, PredefinedProjectCategories::MyProjects))
		{
			return false;
		}
		else if (GH::AreEqual(S1, PredefinedProjectCategories::Samples))
		{
			return true;
		}
		else if (GH::AreEqual(S2, PredefinedProjectCategories::Samples))
		{
			return false;
		}
		else
		{
			return S1 < S2;
		}
	});

	for (auto& Pair : ProjectCategories)
	{
		/* Sort projects alphabetically */
		Pair.Value->Projects.Sort([](const TSharedPtr<ProjectInfo>& S1, const TSharedPtr<ProjectInfo>& S2)
		{
			return S1->Name < S2->Name;
		});
	}

	PopulateFilteredProjectCategories();

	for (const auto& Pair : ProjectCategories)
	{
		ConstructCategory(CategoriesBox.ToSharedRef(), Pair.Key, Pair.Value.ToSharedRef());
	}

	/* The OnSelectionChanged delegate doesn't get called during any of the code above, yet 
	the selection will go away. Update SelectedProject to reflect there's no selection 
	(alternatively you could select something using 
	STileView::SetSelection(Something, ESelectInfo::Direct);, the OnSelectionChanged
	delegate should handle setting SelectedProject) */
	SelectedProject = nullptr;
}

void SMyProjectBrowser::ConstructCategory(
	const TSharedRef<SVerticalBox>& InCategoriesBox, 
	const FString& CategoryName,
	const TSharedRef<ProjectCategoryInfo>& CategoryInfo)
{
	// Title
	InCategoriesBox->AddSlot()
	.AutoHeight()
	[
		SNew(STextBlock)
		.Visibility(this, &SMyProjectBrowser::GetProjectCategoryVisibility, CategoryInfo)
		.TextStyle(FEditorStyle::Get(), TEXT("GameProjectDialog.ProjectNamePathLabels"))
		.Text(FText::AsCultureInvariant(CategoryName))
	];

	// Separator
	InCategoriesBox->AddSlot()
	.AutoHeight()
	.Padding(0.f, 2.f, 0.f, 8.f)
	[
		SNew(SSeparator)
		.Visibility(this, &SMyProjectBrowser::GetProjectCategoryVisibility, CategoryInfo)
	];

	// Project tile view
	InCategoriesBox->AddSlot()
	.AutoHeight()
	[
		SAssignNew(CategoryInfo->ProjectTileView, STileView<TSharedPtr<ProjectInfo>>)
		.Visibility(this, &SMyProjectBrowser::GetProjectCategoryVisibility, CategoryInfo)
		.ListItemsSource(&CategoryInfo->FilteredProjects)
		.SelectionMode(ESelectionMode::Single)
		.ClearSelectionOnClick(true)
		.AllowOverscroll(EAllowOverscroll::No)
		.OnGenerateTile(this, &SMyProjectBrowser::MakeProjectViewWidget)
		.OnMouseButtonDoubleClick(this, &SMyProjectBrowser::HandleProjectItemDoubleClick)
		.OnSelectionChanged(this, &SMyProjectBrowser::HandleProjectViewSelectionChanged, FText::AsCultureInvariant(CategoryName))
		.ItemHeight(ThumbnailSize + ThumbnailBorderPadding + 32)
		.ItemWidth(ThumbnailSize + ThumbnailBorderPadding)
	];
}

TSharedRef<ITableRow> SMyProjectBrowser::MakeProjectViewWidget(TSharedPtr<ProjectInfo> ProjectItem, const TSharedRef<STableViewBase>& OwnerTable)
{
	TSharedRef<ITableRow> TableRow = SNew(STableRow<TSharedPtr<ProjectInfo>>, OwnerTable)
	.Style(FEditorStyle::Get(), TEXT("GameProjectDialog.TemplateListView.TableRow"))
	[
		SNew(SBox)
		.HeightOverride(ThumbnailSize + ThumbnailBorderPadding + 5)
		[
			SNew(SVerticalBox)

			// Thumbnail
			+ SVerticalBox::Slot()
			.AutoHeight()
			[
				SNew(SBox)
				.WidthOverride(ThumbnailSize + ThumbnailBorderPadding * 2)
				.HeightOverride(ThumbnailSize + ThumbnailBorderPadding * 2)
				[
					SNew(SOverlay)

					+ SOverlay::Slot()
					[
						SNew(SBorder)
						.Padding(ThumbnailBorderPadding)
						.BorderImage(FEditorStyle::GetBrush(TEXT("ContentBrowser.ThumbnailShadow")))
						.ColorAndOpacity(FLinearColor::White)
						.BorderBackgroundColor(FLinearColor::White)
						[
							SNew(SImage)
							.Image(ProjectItem->Thumbnail.IsValid() ? ProjectItem->Thumbnail.Get() : FEditorStyle::GetBrush(TEXT("GameProjectDialog.DefaultGameThumbnail")))
						]
					]

					// Show the engine version for this project file
					+ SOverlay::Slot()
					.HAlign(HAlign_Right)
					.VAlign(VAlign_Bottom)
					.Padding(10)
					[
						SNew(STextBlock)
						.Text(FText::AsCultureInvariant(ProjectItem->EngineIdentifier))
						.TextStyle(FEditorStyle::Get(), TEXT("ProjectBrowser.VersionOverlayText"))
						.ColorAndOpacity(FLinearColor::White.CopyWithNewOpacity(0.5f))
					]
				]
			]

			// Name
			+ SVerticalBox::Slot()
			.HAlign(HAlign_Center)
			.VAlign(VAlign_Top)
			[
				SNew(STextBlock)
				.HighlightText(this, &SMyProjectBrowser::GetItemHighlightText)
				.Text(FText::AsCultureInvariant(ProjectItem->Name))
			]
		]
	];

	TableRow->AsWidget()->SetToolTip(MakeProjectToolTip(ProjectItem));

	return TableRow;
}

TSharedRef<SToolTip> SMyProjectBrowser::MakeProjectToolTip(TSharedPtr<ProjectInfo> ProjectItem)
{
	// Create a box to hold every line of info in the body of the tooltip
	TSharedRef<SVerticalBox> InfoBox = SNew(SVerticalBox);

	if (ProjectItem->Description.Len() > 0)
	{
		AddToToolTipInfoBox(InfoBox, LOCTEXT("ProjectTileTooltipDescription", "Description"), FText::AsCultureInvariant(ProjectItem->Description));
	}

	{
		AddToToolTipInfoBox(InfoBox, LOCTEXT("ProjectTileTooltipPath", "Path"), FText::AsCultureInvariant(ProjectItem->Path));
	}

	{
		FText Description;
		if (FDesktopPlatformModule::Get()->IsStockEngineRelease(ProjectItem->EngineIdentifier))
		{
			Description = FText::AsCultureInvariant(ProjectItem->EngineIdentifier);
		}
		else
		{
			FString RootDir;
			if (FDesktopPlatformModule::Get()->GetEngineRootDirFromIdentifier(ProjectItem->EngineIdentifier, RootDir))
			{
				FString PlatformRootDir = RootDir;
				FPaths::MakePlatformFilename(PlatformRootDir);
				Description = FText::AsCultureInvariant(PlatformRootDir);
			}
			else
			{
				Description = LOCTEXT("UnknownEngineVersion", "Unknown engine version");
			}
		}
		AddToToolTipInfoBox(InfoBox, LOCTEXT("EngineVersion", "Engine"), Description);
	}

	TSharedRef<SToolTip> Tooltip = SNew(SToolTip)
	.TextMargin(1)
	.BorderImage(FEditorStyle::GetBrush(TEXT("ProjectBrowser.TileViewTooltip.ToolTipBorder")))
	[
		SNew(SBorder)
		.Padding(6)
		.BorderImage(FEditorStyle::GetBrush(TEXT("ProjectBrowser.TileViewTooltip.NonContentBorder")))
		[
			SNew(SVerticalBox)

			+ SVerticalBox::Slot()
			.AutoHeight()
			.Padding(0, 0, 0, 4)
			[
				SNew(SBorder)
				.Padding(6)
				.BorderImage(FEditorStyle::GetBrush(TEXT("ProjectBrowser.TileViewTooltip.ContentBorder")))
				[
					SNew(SVerticalBox)

					+ SVerticalBox::Slot()
					.AutoHeight()
					.VAlign(VAlign_Center)
					[
						SNew(STextBlock)
						.Text(FText::AsCultureInvariant(ProjectItem->Name))
						.Font(FEditorStyle::GetFontStyle(TEXT("ProjectBrowser.TileViewTooltip.NameFont")))
					]
				]
			]

			+ SVerticalBox::Slot()
			.AutoHeight()
			[
				SNew(SBorder)
				.Padding(6)
				.BorderImage(FEditorStyle::GetBrush(TEXT("ProjectBrowser.TileViewTooltip.ContentBorder")))
				[
					InfoBox
				]
			]
		]
	];

	return Tooltip;
}

void SMyProjectBrowser::AddToToolTipInfoBox(const TSharedRef<SVerticalBox>& InfoBox, const FText& Key, const FText& Value)
{
	InfoBox->AddSlot()
	.AutoHeight()
	.Padding(0, 1)
	[
		SNew(SHorizontalBox)

		+ SHorizontalBox::Slot()
		.AutoWidth()
		.Padding(0, 0, 4, 0)
		[
			SNew(STextBlock)
			.Text(FText::Format(LOCTEXT("ProjectBrowserTooltipFormat", "{0}:"), Key))
			.ColorAndOpacity(FSlateColor::UseSubduedForeground())
		]

		+ SHorizontalBox::Slot()
		.AutoWidth()
		[
			SNew(STextBlock)
			.Text(Value)
			.ColorAndOpacity(FSlateColor::UseForeground())
		]
	];
}

EVisibility SMyProjectBrowser::GetProjectCategoryVisibility(const TSharedRef<ProjectCategoryInfo> InCategory) const
{
	if (NumFilteredProjects == 0)
	{
		return EVisibility::Collapsed;
	}
	return InCategory->FilteredProjects.Num() > 0 ? EVisibility::Visible : EVisibility::Collapsed;
}

EVisibility SMyProjectBrowser::GetNoProjectsErrorVisibility() const
{
	return (ProjectInfos.Num() > 0) ? EVisibility::Collapsed : EVisibility::Visible;
}

EVisibility SMyProjectBrowser::GetNoProjectsAfterFilterErrorVisibility() const
{
	return (ProjectInfos.Num() > 0 && NumFilteredProjects == 0) ? EVisibility::Visible : EVisibility::Collapsed;
}

void SMyProjectBrowser::HandleProjectItemDoubleClick(TSharedPtr<ProjectInfo> TemplateItem)
{
	HandleProjectItemDoubleClickDelegate.Execute(TemplateItem);
}

void SMyProjectBrowser::HandleProjectViewSelectionChanged(TSharedPtr<ProjectInfo> ProjectItem, ESelectInfo::Type SelectInfo, FText CategoryName)
{
	if (bPreventSelectionChangeEvent == false)
	{
		TGuardValue<bool> SelectionEventGuard(bPreventSelectionChangeEvent, true);

		const FString CategoryNameAsString = CategoryName.ToString();
		for (const auto& Pair : ProjectCategories)
		{
			TSharedPtr<ProjectCategoryInfo> Category = Pair.Value;
			if (Category->ProjectTileView.IsValid())
			{
				const FString CategorysName = Pair.Key;
				if (GH::AreEqual(CategorysName, CategoryNameAsString) == false)
				{
					Category->ProjectTileView->ClearSelection();
				}
			}
		}

		SelectedProject = ProjectItem;
	}
}

void SMyProjectBrowser::OnFilterTextChanged(const FText& InText)
{
	ProjectItemFilter.SetRawFilterText(InText);
	SearchBoxPtr->SetError(ProjectItemFilter.GetFilterErrorText());
	PopulateFilteredProjectCategories();
}

void SMyProjectBrowser::PopulateFilteredProjectCategories()
{
	NumFilteredProjects = 0;
	for (const auto& Pair : ProjectCategories)
	{
		ProjectCategoryInfo* Category = Pair.Value.Get();
		
		Category->FilteredProjects.Reset();

		for (const auto& ProjectItem : Category->Projects)
		{
			if (ProjectItemFilter.PassesFilter(ProjectItem))
			{
				Category->FilteredProjects.Emplace(ProjectItem);
				NumFilteredProjects++;
			}
		}

		if (Category->ProjectTileView.IsValid())
		{
			Category->ProjectTileView->RequestListRefresh();
		}
	}
}

EVisibility SMyProjectBrowser::GetFilterActiveOverlayVisibility() const
{
	return ProjectItemFilter.GetRawFilterText().IsEmpty() ? EVisibility::Collapsed : EVisibility::HitTestInvisible;
}

FText SMyProjectBrowser::GetItemHighlightText() const
{
	return ProjectItemFilter.GetRawFilterText();
}

FReply SMyProjectBrowser::OnRefreshButtonClicked()
{
	FindProjects();
	return FReply::Handled();
}

FReply SMyProjectBrowser::OnBackButtonClicked()
{
	return OnBackButtonClickedDelegate.Execute(SelectedProject);
}

FReply SMyProjectBrowser::OnManuallyLocateProjectButtonClicked()
{
	TArray<FString> SelectedFiles;
	IDesktopPlatform* DesktopPlatform = FDesktopPlatformModule::Get();
	bool bOpened = DesktopPlatform->OpenFileDialog
	(
		FSlateApplication::Get().FindBestParentWindowHandleForDialogs(nullptr),
		TEXT("Select .uproject file"),
		FString(),
		FString(),
		TEXT("Unreal Engine Project File (*.uproject)|*.uproject|All files (*.*)|*.*"),
		EFileDialogFlags::None,
		SelectedFiles
	);

	if (bOpened)
	{
		if (SelectedFiles.Num() == 1)
		{
			const FString& SelectedFile = SelectedFiles[0];
			const FString SelectedFile_Abs = FPaths::ConvertRelativePathToFull(SelectedFile);
			const FString SelectedFilesPath_Abs = FPaths::GetPath(SelectedFile_Abs);

			/* Check to see if the selected project is actually already known about */
			bool bProjectAlreadyKnownAbout = false;
			for (int32 i = 0; i < ProjectInfos.Num(); ++i)
			{
				const TSharedPtr<ProjectInfo>& Elem = ProjectInfos[i];
				if (Elem->Path == SelectedFilesPath_Abs)
				{
					bProjectAlreadyKnownAbout = true;
					break;
				}
			}

			if (bProjectAlreadyKnownAbout == false)
			{
				/* Show a widget asking user if they want us to automatically locate this
				project for next time */

				/* First remove keyboard focus - it is on the "manually locate" button. 
				Without doing this user can press enter to re-open the file dialog */
				FSlateApplication::Get().ClearKeyboardFocus();

				OverlayForPopupsPtr->AddSlot(1000)
				.Padding(GetMainBorderPadding() * -1.f)
				[
					SNew(SModalWidget)
					.TextContent(FText::AsCultureInvariant(TEXT("Auto-locate project next time?")))
					.OnNoClicked(FOnClicked::CreateSP(this, &SMyProjectBrowser::OnAskAutoLoadNoButtonClicked, SelectedFilesPath_Abs, SelectedFile_Abs, bProjectAlreadyKnownAbout))
					.OnYesClicked(FOnClicked::CreateSP(this, &SMyProjectBrowser::OnAskAutoLoadYesButtonClicked, SelectedFilesPath_Abs, SelectedFile_Abs, bProjectAlreadyKnownAbout))
				];
			}
			else
			{
				PostProjectManuallyLocated(SelectedFilesPath_Abs, SelectedFile_Abs, bProjectAlreadyKnownAbout);
			}
		}
	}

	return FReply::Handled();
}

FReply SMyProjectBrowser::OnAskAutoLoadNoButtonClicked(FString SelectedFilesPath_Abs, FString SelectedFile_Abs, bool bProjectAlreadyKnownAbout)
{
	/* Remove the 'auto load next time?' widget */
	OverlayForPopupsPtr->RemoveSlot(1000);

	if (NonRememberedManuallyLocatedProjects.Contains(SelectedFile_Abs) == false)
	{
		NonRememberedManuallyLocatedProjects.Emplace(SelectedFile_Abs);
	}

	PostProjectManuallyLocated(SelectedFilesPath_Abs, SelectedFile_Abs, bProjectAlreadyKnownAbout);
	
	return FReply::Handled();
}

FReply SMyProjectBrowser::OnAskAutoLoadYesButtonClicked(FString SelectedFilesPath_Abs, FString SelectedFile_Abs, bool bProjectAlreadyKnownAbout)
{
	/* Remove the 'auto load next time?' widget */
	OverlayForPopupsPtr->RemoveSlot(1000);

	const FString FilePath = FString(FWindowsPlatformProcess::UserSettingsDir()) + TEXT("UE4DocTool/DocToolWidgetData.json");
	FString FileContents;

	if (DocToolWidgetHelpers::AquireDocToolWidgetDataMutex())
	{
		const bool bFileExists = FFileHelper::LoadFileToString(FileContents, *FilePath);
		TSharedPtr<FJsonObject> JsonObject = MakeShareable(new FJsonObject);
		TSharedRef<TJsonReader<>> Reader = TJsonReaderFactory<>::Create(FileContents);
		if (bFileExists == false || FJsonSerializer::Deserialize(Reader, JsonObject))
		{
			TArray<TSharedPtr<FJsonValue>> Array;
			if (JsonObject->HasTypedField<EJson::Array>(TEXT("Projects to auto-load for project browser")))
			{
				Array = JsonObject->GetArrayField(TEXT("Projects to auto-load for project browser"));
			}

			Array.Emplace(MakeShareable(new FJsonValueString(SelectedFile_Abs)));
			JsonObject->SetArrayField(TEXT("Projects to auto-load for project browser"), Array);

			FString UpdatedFileContents;
			TSharedRef<TJsonWriter<>> Writer = TJsonWriterFactory<>::Create(&UpdatedFileContents);
			FJsonSerializer::Serialize(JsonObject.ToSharedRef(), Writer);
			FFileHelper::SaveStringToFile(UpdatedFileContents, *FilePath);
		}

		DocToolWidgetHelpers::ReleaseDocToolWidgetDataMutex();
	}

	PostProjectManuallyLocated(SelectedFilesPath_Abs, SelectedFile_Abs, bProjectAlreadyKnownAbout);
	
	return FReply::Handled();
}

void SMyProjectBrowser::PostProjectManuallyLocated(const FString& SelectedFilesPath_Abs, const FString& SelectedFile_Abs, bool bProjectAlreadyKnownAbout)
{
	/* We're about to select the project the user found with the file
	dialog. If it's currently hidden (due to the filter) then it's kinda
	weird - it will be selected but user can't see it (it might not even
	work, probably will though), so we'll clear the filter so this
	is never a possible scenario. */
	SearchBoxPtr->SetText(FText::GetEmpty());

	if (bProjectAlreadyKnownAbout == false)
	{
		FindProjects();
	}

	/* Select project for user since that is probably what they want */
	SelectProject(SelectedFilesPath_Abs);

	/* Show a brief window letting the user know that the filter was cleared, their
	project was added to the list and we have selected the project */
	const FText Message = bProjectAlreadyKnownAbout ? LOCTEXT("Project successfully located", "Filter cleared, project selected") : LOCTEXT("Project successfully located", "Project added, filter cleared, project selected");
	const bool bIsPopupAlreadyShowing = (OverlayForPopupsPtr->GetNumWidgets() > 1);
	if (bIsPopupAlreadyShowing)
	{
		TSharedRef<SPopupNotification> Popup = StaticCastSharedRef<SPopupNotification>(OverlayForPopupsPtr->GetChildren()->GetChildAt(1));
		Popup->SetMessage(Message);
		Popup->ResetDurationPostModal();
	}
	else
	{
		OverlayForPopupsPtr->AddSlot(500)
		.HAlign(HAlign_Center)
		.VAlign(VAlign_Center)
		[
			SNew(SPopupNotification)
			.TextContent(Message)
			.SolidOneOpacityDuration(2.5f)
			.FadeOutDuration(3.f)
		];
	}
}

void SMyProjectBrowser::SelectProject(const FString& ProjectFilePath, bool bScrollProjectIntoView)
{
	/* This function would be faster if you knew the project's category ahead of time */

	for (const auto& Pair : ProjectCategories)
	{
		TSharedPtr<ProjectCategoryInfo> Category = Pair.Value;
		
		for (const auto& Project : Category->Projects)
		{
			if (Project->Path == ProjectFilePath)
			{
				Category->ProjectTileView->SetSelection(Project);
				
				if (bScrollProjectIntoView)
				{
					/* Note that if Category->ProjectTileView->WidgetFromItem(Project) returns
					non-null at this time then we can actually scroll to it now, 
					(do:
					SScrollBox::ScrollDescendantIntoView(Category->ProjectTileView->WidgetFromItem(Project)->AsWidget(), false)
					but if it returns null then I cannot find a way to scroll to it. I tried
					pretty hard too
					*/
				}
				
				return;
			}
		}
	}
}

FReply SMyProjectBrowser::OnContinueButtonClicked()
{
	return OnContinueButtonClickedDelegate.Execute(SelectedProject);
}

bool SMyProjectBrowser::HandleContinueButtonIsEnabled() const
{
	return SelectedProject.IsValid();
}


DocToolWidgetPageInfo SDocToolWidget_SelectCreateDocumentationTargetProjectPage::GetHistoryCrumbTrailInfo()
{
	return DocToolWidgetPageInfo(LOCTEXT("Select Create Documentation Target Project Page Display Name", "Select Project"), EDocToolWidgetPageType::SelectCreateDocumentationTargetProject);
}

SDocToolWidget_SelectCreateDocumentationTargetProjectPage::SDocToolWidget_SelectCreateDocumentationTargetProjectPage()
	: DocToolWidget(nullptr)
{
}

void SDocToolWidget_SelectCreateDocumentationTargetProjectPage::Construct(const FArguments& InArgs)
{
	DocToolWidget = InArgs._DocToolWidget;

	ChildSlot
	[
		SNew(SMyProjectBrowser)
		.OnHistoryPathClicked(this, &SDocToolWidget_SelectCreateDocumentationTargetProjectPage::OnHistoryPathClicked)
		.OnGetCrumbDelimiterContent(this, &SDocToolWidget_SelectCreateDocumentationTargetProjectPage::OnGetCrumbDelimiterContent)
		.CrumbTrail({ SDocToolWidget_MainPage::GetHistoryCrumbTrailInfo(), SDocToolWidget_SelectCreateDocumentationTargetTypePage::GetHistoryCrumbTrailInfo(), SDocToolWidget_SelectCreateDocumentationTargetProjectPage::GetHistoryCrumbTrailInfo() })
		.HandleProjectItemDoubleClick(this, &SDocToolWidget_SelectCreateDocumentationTargetProjectPage::HandleProjectItemDoubleClick)
		.OnBackButtonClicked(this, &SDocToolWidget_SelectCreateDocumentationTargetProjectPage::OnBackButtonClicked)
		.OnContinueButtonClicked(this, &SDocToolWidget_SelectCreateDocumentationTargetProjectPage::OnContinueButtonClicked)
	];
}

void SDocToolWidget_SelectCreateDocumentationTargetProjectPage::OnHistoryPathClicked(const EDocToolWidgetPageType& CrumbData)
{
	DocToolWidgetHelpers::NavigateDocToolWidgetToPageForHistoryCrumbClick(DocToolWidget, CrumbData);
}

FGetDocToolWidgetCrumbMenuContent_RetValType SDocToolWidget_SelectCreateDocumentationTargetProjectPage::OnGetCrumbDelimiterContent(const EDocToolWidgetPageType& CrumbData)
{
	return SNullWidget::NullWidget;
}

void SDocToolWidget_SelectCreateDocumentationTargetProjectPage::HandleProjectItemDoubleClick(TSharedPtr<ProjectInfo> DoubleClickedItem)
{
	DocToolWidget->SetCurrentViewType_CreateDocumentationTargetingProjectOptionsPage(DoubleClickedItem, nullptr);
}

FReply SDocToolWidget_SelectCreateDocumentationTargetProjectPage::OnBackButtonClicked(TSharedPtr<ProjectInfo> SelectedItem)
{
	DocToolWidget->SetCurrentViewType_SelectCreateDocumentationTargetTypePage();
	return FReply::Handled();
}

FReply SDocToolWidget_SelectCreateDocumentationTargetProjectPage::OnContinueButtonClicked(TSharedPtr<ProjectInfo> SelectedItem)
{
	DocToolWidget->SetCurrentViewType_CreateDocumentationTargetingProjectOptionsPage(SelectedItem, nullptr);
	return FReply::Handled();
}


DocToolWidgetPageInfo SDocToolWidget_SelectParseTargetProjectPage::GetHistoryCrumbTrailInfo()
{
	return DocToolWidgetPageInfo(LOCTEXT("Select Parse Target Project Page Display Name", "Select Project"), EDocToolWidgetPageType::SelectParseTargetProject);
}

SDocToolWidget_SelectParseTargetProjectPage::SDocToolWidget_SelectParseTargetProjectPage()
	: DocToolWidget(nullptr)
{
}

void SDocToolWidget_SelectParseTargetProjectPage::Construct(const FArguments& InArgs)
{
	DocToolWidget = InArgs._DocToolWidget;

	ChildSlot
	[
		SNew(SMyProjectBrowser)
		.OnHistoryPathClicked(this, &SDocToolWidget_SelectParseTargetProjectPage::OnHistoryPathClicked)
		.OnGetCrumbDelimiterContent(this, &SDocToolWidget_SelectParseTargetProjectPage::OnGetCrumbDelimiterContent)
		.CrumbTrail({ SDocToolWidget_MainPage::GetHistoryCrumbTrailInfo(), SDocToolWidget_SelectParseTargetTypePage::GetHistoryCrumbTrailInfo(), SDocToolWidget_SelectParseTargetProjectPage::GetHistoryCrumbTrailInfo() })
		.HandleProjectItemDoubleClick(this, &SDocToolWidget_SelectParseTargetProjectPage::HandleProjectItemDoubleClick)
		.OnBackButtonClicked(this, &SDocToolWidget_SelectParseTargetProjectPage::OnBackButtonClicked)
		.OnContinueButtonClicked(this, &SDocToolWidget_SelectParseTargetProjectPage::OnContinueButtonClicked)
	];
}

void SDocToolWidget_SelectParseTargetProjectPage::OnHistoryPathClicked(const EDocToolWidgetPageType& CrumbData)
{
	DocToolWidgetHelpers::NavigateDocToolWidgetToPageForHistoryCrumbClick(DocToolWidget, CrumbData);
}

FGetDocToolWidgetCrumbMenuContent_RetValType SDocToolWidget_SelectParseTargetProjectPage::OnGetCrumbDelimiterContent(const EDocToolWidgetPageType& CrumbData)
{
	return SNullWidget::NullWidget;
}

void SDocToolWidget_SelectParseTargetProjectPage::HandleProjectItemDoubleClick(TSharedPtr<ProjectInfo> DoubleClickedItem)
{
	DocToolWidget->SetCurrentViewType_ParseTargetingProjectOptionsPage(DoubleClickedItem, nullptr);
}

FReply SDocToolWidget_SelectParseTargetProjectPage::OnBackButtonClicked(TSharedPtr<ProjectInfo> SelectedItem)
{
	DocToolWidget->SetCurrentViewType_SelectParseTargetTypePage();
	return FReply::Handled();
}

FReply SDocToolWidget_SelectParseTargetProjectPage::OnContinueButtonClicked(TSharedPtr<ProjectInfo> SelectedItem)
{
	DocToolWidget->SetCurrentViewType_ParseTargetingProjectOptionsPage(SelectedItem, nullptr);
	return FReply::Handled();
}


TSharedPtr<FJsonObject> PluginGroupInfo::LoadUPluginFile(const FString& UPluginFilePath)
{
	FString FileContents;

	if (FFileHelper::LoadFileToString(FileContents, *UPluginFilePath) == false)
	{
		return TSharedPtr<FJsonObject>(nullptr);
	}

	TSharedPtr<FJsonObject> JsonObject;
	TSharedRef<TJsonReader<>> Reader = TJsonReaderFactory<>::Create(FileContents);
	if (FJsonSerializer::Deserialize(Reader, JsonObject) == false || JsonObject.IsValid() == false)
	{
		return TSharedPtr<FJsonObject>(nullptr);
	}

	return JsonObject;
}

TSharedPtr<FSlateDynamicImageBrush> PluginGroupInfo::GetIcon(const FString& PluginsUPluginFilePath)
{
	TSharedPtr<FSlateDynamicImageBrush> DynamicBrush;

	const FString PluginPath = FPaths::GetPath(PluginsUPluginFilePath);
	
	FString Icon128FilePath = PluginPath + TEXT("/Resources/Icon128.png");
	if (FPlatformFileManager::Get().GetPlatformFile().FileExists(*Icon128FilePath) == false)
	{
		Icon128FilePath = FPaths::EnginePluginsDir() + TEXT("Editor/PluginBrowser/Resources/DefaultIcon128.png");
	}

	const FName BrushName(*Icon128FilePath);
	const FIntPoint Size = FSlateApplication::Get().GetRenderer()->GenerateDynamicImageResource(BrushName);
	if ((Size.X > 0) && (Size.Y > 0))
	{
		DynamicBrush = MakeShareable(new FSlateDynamicImageBrush(BrushName, FVector2D(Size.X, Size.Y)));
	}

	return DynamicBrush;
}

PluginGroupInfo::PluginGroupInfo(const FString& InName, const TArray<FString>& InPaths, TSharedPtr<FJsonObject> UPluginFileContents)
	: Name(InName)
	, FriendlyName(UPluginFileContents->GetStringField(TEXT("FriendlyName")))
	, Paths(InPaths)
	, Thumbnail(GetIcon(InPaths[0]))
	, Category(UPluginFileContents->GetStringField(TEXT("Category")))
	, Description(UPluginFileContents->GetStringField(TEXT("Description")))
{
}


void PluginItemToString(const TSharedPtr<PluginGroupInfo> InItem, TArray<FString>& OutFilterStrings)
{
	OutFilterStrings.Emplace(InItem->FriendlyName);
}

SMyPluginBrowser::SMyPluginBrowser()
	: CategoriesBox(nullptr)
	, OverlayForPopupsPtr(nullptr)
	, SearchBoxPtr(nullptr)
	, PluginVersionComboBoxPtr(nullptr)
	, PluginItemFilter(PluginItemTextFilter::FItemToStringArray::CreateStatic(PluginItemToString))
	, ThumbnailBorderPadding(8)
	, ThumbnailSize(128)
	, NumFilteredPlugins(0)
	, bPreventSelectionChangeEvent(false)
	, SelectedPluginGroup(nullptr)
	, SelectedPluginGroupsPaths(TArray<TSharedPtr<FString>>())
{
}

void SMyPluginBrowser::Construct(const FArguments& InArgs)
{
	HandlePluginItemDoubleClickDelegate = InArgs._HandlePluginItemDoubleClick;
	OnBackButtonClickedDelegate = InArgs._OnBackButtonClicked;
	OnContinueButtonClickedDelegate = InArgs._OnContinueButtonClicked;

	CategoriesBox = SNew(SVerticalBox);

	FindPlugins();

	ChildSlot
	[
		SNew(SBorder)
		.BorderImage(FEditorStyle::GetBrush(TEXT("ToolPanel.GroupBorder")))
		.Padding(GetMainBorderPadding())
		[
			SAssignNew(OverlayForPopupsPtr, SOverlay)

			+ SOverlay::Slot()
			[
				SNew(SVerticalBox)

				+ DocToolWidgetHelpers::AddPageHeader(
					LOCTEXT("Select Plugin", "Select Plugin"),
					InArgs._OnHistoryPathClicked,
					InArgs._OnGetCrumbDelimiterContent,
					nullptr,
					InArgs._CrumbTrail
				)

				// Categories
				+ SVerticalBox::Slot()
				.Padding(8.f)
				.FillHeight(1.0f)
				[
					SNew(SVerticalBox)

					+ SVerticalBox::Slot()
					.AutoHeight()
					.VAlign(VAlign_Top)
					[
						SNew(SHorizontalBox)

						+ SHorizontalBox::Slot()
						.Padding(FMargin(0, 0, 5.f, 0))
						.VAlign(VAlign_Center)
						[
							SNew(SOverlay)

							+ SOverlay::Slot()
							[
								SAssignNew(SearchBoxPtr, SSearchBox)
								.HintText(LOCTEXT("FilterHint", "Filter Plugins..."))
								.OnTextChanged(this, &SMyPluginBrowser::OnFilterTextChanged)
							]

							+ SOverlay::Slot()
							[
								SNew(SBorder)
								.Visibility(this, &SMyPluginBrowser::GetFilterActiveOverlayVisibility)
								.BorderImage(FEditorStyle::Get().GetBrush(TEXT("SearchBox.ActiveBorder")))
							]
						]

						+ SHorizontalBox::Slot()
						.AutoWidth()
						.VAlign(VAlign_Center)
						.Padding(FMargin(0.f, 0.f, 5.f, 0.f))
						[
							SNew(SButton)
							.ButtonStyle(FEditorStyle::Get(), TEXT("ToggleButton"))
							.OnClicked(this, &SMyPluginBrowser::OnRefreshButtonClicked)
							.ForegroundColor(FSlateColor::UseForeground())
							.ToolTipText(LOCTEXT("RefreshPluginList", "Refresh the plugin list"))
							.HAlign(HAlign_Center)
							.VAlign(VAlign_Center)
							[
								SNew(SHorizontalBox)

								+ SHorizontalBox::Slot()
								.Padding(2.0f)
								.VAlign(VAlign_Center)
								.AutoWidth()
								[
									SNew(SImage)
									.Image(FEditorStyle::GetBrush(TEXT("Icons.Refresh")))
								]

								+ SHorizontalBox::Slot()
								.VAlign(VAlign_Center)
								.Padding(2.0f)
								[
									SNew(STextBlock)
									.TextStyle(FEditorStyle::Get(), TEXT("ProjectBrowser.Toolbar.Text"))
									.Text(LOCTEXT("RefreshPluginsText", "Refresh"))
								]
							]
						]
					]

					+ SVerticalBox::Slot()
					.Padding(FMargin(0.f, 5.f))
					[
						SNew(SScrollBox)

						+ SScrollBox::Slot()
						[
							CategoriesBox.ToSharedRef()
						]
					]
				]

				+ SVerticalBox::Slot()
				.Padding(0, 20, 0, 0)	// Lots of vertical padding before the dialog buttons at the bottom
				.AutoHeight()
				[
					SNew(SHorizontalBox)

					// Back Button
					+ SHorizontalBox::Slot()
					.AutoWidth()
					.Padding(0.f, 0.f, 8.f, 0.f)
					[
						SNew(SButton)
						.ButtonStyle(FDocToolStyle::Get(), TEXT("DocToolWidget.GenericButton"))
						.Text(LOCTEXT("BackButton", "Back"))
						.OnClicked(this, &SMyPluginBrowser::OnBackButtonClicked)
					]

					+ SHorizontalBox::Slot()
					.FillWidth(1.0f)
					[
						SNullWidget::NullWidget
					]

					// Manually Locate Plugin Button
					+ SHorizontalBox::Slot()
					.AutoWidth()
					.Padding(0.f, 0.f, 8.f, 0.f)
					[
						SNew(SButton)
						.ButtonStyle(FDocToolStyle::Get(), TEXT("DocToolWidget.GenericButton"))
						.Text(LOCTEXT("ManullyLocatePluginButton", "Locate Plugin"))
						.OnClicked(this, &SMyPluginBrowser::OnManuallyLocatePluginButtonClicked)
					]

					// Select Version Combo Box
					+ SHorizontalBox::Slot()
					.Padding(0.f, 0.f, 8.f, 0.f)
					[
						SAssignNew(PluginVersionComboBoxPtr, SComboBox<TSharedPtr<FString>>)
						.IsEnabled(this, &SMyPluginBrowser::HandleVersionComboBoxIsEnabled)
						.ButtonStyle(FDocToolStyle::Get(), TEXT("DocToolWidget.GenericButton"))
						.OptionsSource(&SelectedPluginGroupsPaths)
						.OnSelectionChanged(this, &SMyPluginBrowser::OnVersionComboBoxSelectionChanged)
						.OnGenerateWidget(this, &SMyPluginBrowser::MakeVersionComboBoxItemWidget)
						[
							SNew(STextBlock)
							.Text(this, &SMyPluginBrowser::GetPluginVersionComboBoxSelectionText)
						]
					]

					// Continue Button
					+ SHorizontalBox::Slot()
					.AutoWidth()
					[
						SNew(SButton)
						.ButtonStyle(FDocToolStyle::Get(), TEXT("DocToolWidget.GenericButton"))
						.Text(LOCTEXT("ContinueButton", "Continue"))
						.OnClicked(this, &SMyPluginBrowser::OnContinueButtonClicked)
						.IsEnabled(this, &SMyPluginBrowser::HandleContinueButtonIsEnabled)
					]
				]
			]
		]
	];
}

FMargin SMyPluginBrowser::GetMainBorderPadding() const
{
	return FMargin(8.f, 4.f);
}

void SMyPluginBrowser::FindPlugins()
{
	CategoriesBox->ClearChildren();

	/* Probably not possible this will ever show cause you're using the doc tool plugin
	right now - if it does show it means FindPlugins()
	didn't do a good job */
	CategoriesBox->AddSlot()
	.HAlign(HAlign_Center)
	.Padding(FMargin(0.f, 25.f))
	[
		SNew(STextBlock)
		.Visibility(this, &SMyPluginBrowser::GetNoPluginsErrorVisibility)
		.Text(LOCTEXT("NoPlugins", "You don\'t have any plugins yet :("))
	];

	CategoriesBox->AddSlot()
	.HAlign(HAlign_Center)
	.Padding(FMargin(0.f, 25.f))
	[
		SNew(STextBlock)
		.Visibility(this, &SMyPluginBrowser::GetNoPluginsAfterFilterErrorVisibility)
		.Text(LOCTEXT("NoPluginsAfterFilter", "There are no plugins that match the specified filter"))
	];

	//--------------------------------------------------------------------------
	//	Locating all plugins

	TMap<FString, FString> EngineInstallations;
	DocToolWidgetHelpers::GetEngineInstallations(EngineInstallations);

	TArray<FString> Projects;
	DocToolWidgetHelpers::GetProjects(EngineInstallations, Projects);

	TMap<FString, TArray<FString>> Plugins;
	DocToolWidgetHelpers::GetPlugins(EngineInstallations, Projects, Plugins);

	/* Read from disk any plugins the user manually located in the past and wants us to
	auto-load */

	const FString DocToolWidgetDataFilePath = FString(FWindowsPlatformProcess::UserSettingsDir()) + TEXT("UE4DocTool/DocToolWidgetData.json");
	FString FileContents;

	if (DocToolWidgetHelpers::AquireDocToolWidgetDataMutex())
	{
		FFileHelper::LoadFileToString(FileContents, *DocToolWidgetDataFilePath);
		TSharedPtr<FJsonObject> JsonObject = MakeShareable(new FJsonObject);
		TSharedRef<TJsonReader<>> Reader = TJsonReaderFactory<>::Create(FileContents);
		if (FJsonSerializer::Deserialize(Reader, JsonObject))
		{
			const TArray<TSharedPtr<FJsonValue>>* ManuallyLocatedPluginsArrayUnmutable;
			if (JsonObject->TryGetArrayField(TEXT("Plugins to auto-load for plugin browser"), ManuallyLocatedPluginsArrayUnmutable))
			{
				TArray<TSharedPtr<FJsonValue>>* ManuallyLocatedPluginsArray = const_cast<TArray<TSharedPtr<FJsonValue>>*>(ManuallyLocatedPluginsArrayUnmutable);

				for (int32 i = ManuallyLocatedPluginsArray->Num() - 1; i >= 0; --i)
				{
					FString Elem;
					if ((*ManuallyLocatedPluginsArray)[i]->TryGetString(Elem) == false)
					{
						ManuallyLocatedPluginsArray->RemoveAtSwap(i, 1, false);
						continue;
					}

					if (Elem.EndsWith(TEXT(".uplugin")) == false)
					{
						ManuallyLocatedPluginsArray->RemoveAtSwap(i, 1, false);
						continue;
					}

					if (FPaths::IsRelative(Elem))
					{
						ManuallyLocatedPluginsArray->RemoveAtSwap(i, 1, false);
						continue;
					}

					const FString PluginName = FPaths::GetBaseFilename(Elem);
					TArray<FString>* PluginArrayPtr = Plugins.Find(PluginName);
					if (PluginArrayPtr != nullptr && PluginArrayPtr->Contains(Elem))
					{
						ManuallyLocatedPluginsArray->RemoveAtSwap(i, 1, false);
						continue;
					}

					if (FPaths::FileExists(Elem) == false)
					{
						ManuallyLocatedPluginsArray->RemoveAtSwap(i, 1, false);
						continue;
					}

					PluginArrayPtr != nullptr ? PluginArrayPtr->Emplace(Elem) : Plugins.Emplace(PluginName).Emplace(Elem);
				}

				FString UpdatedFileContents;
				TSharedRef<TJsonWriter<>> Writer = TJsonWriterFactory<>::Create(&UpdatedFileContents);
				FJsonSerializer::Serialize(JsonObject.ToSharedRef(), Writer);
				FFileHelper::SaveStringToFile(UpdatedFileContents, *DocToolWidgetDataFilePath);
			}
		}

		DocToolWidgetHelpers::ReleaseDocToolWidgetDataMutex();
	}

	/* Add plugins the user wants us to remember just for this time */
	for (int32 i = NonRememberedManuallyLocatedPlugins.Num() - 1; i >= 0; --i)
	{
		const FString& Elem = NonRememberedManuallyLocatedPlugins[i];

		const FString PluginName = FPaths::GetBaseFilename(Elem);
		TArray<FString>* PluginArrayPtr = Plugins.Find(PluginName);
		if (PluginArrayPtr == nullptr)
		{
			if (FPaths::FileExists(Elem))
			{
				Plugins.Emplace(PluginName).Emplace(Elem);
			}
			else
			{
				NonRememberedManuallyLocatedPlugins.RemoveAtSwap(i, 1, false);
			}
		}
		else if (PluginArrayPtr->Contains(Elem) == false)
		{
			if (FPaths::FileExists(Elem))
			{
				PluginArrayPtr->Emplace(Elem);
			}
			else
			{
				NonRememberedManuallyLocatedPlugins.RemoveAtSwap(i, 1, false);
			}
		}
		else
		{
			NonRememberedManuallyLocatedPlugins.RemoveAtSwap(i, 1, false);
		}
	}

	//--------------------------------------------------------------------------

	PluginInfos.Reset(Plugins.Num());
	PluginCategories.Reset();
	for (const auto& Pair : Plugins)
	{
		PluginInfos.Emplace(MakeShareable(new PluginGroupInfo(Pair.Key, Pair.Value, PluginGroupInfo::LoadUPluginFile(Pair.Value[0]))));
	}

	/* Add entry to categories container */
	for (const auto& PluginsInfo : PluginInfos)
	{
		TSharedPtr<PluginCategoryInfo>& Value = (PluginCategories.Contains(PluginsInfo->Category) == false) ? PluginCategories.Emplace(PluginsInfo->Category, MakeShareable(new PluginCategoryInfo)) : PluginCategories[PluginsInfo->Category];
		Value->Plugins.Emplace(PluginsInfo);
	}

	/* Sort categories */
	PluginCategories.KeySort([](const FString& S1, const FString& S2)
	{
		return S1 < S2;
	});

	for (auto& Pair : PluginCategories)
	{
		/* Sort plugins alphabetically */
		Pair.Value->Plugins.Sort([](const TSharedPtr<PluginGroupInfo>& S1, const TSharedPtr<PluginGroupInfo>& S2)
		{
			return S1->FriendlyName < S2->FriendlyName;
		});
	}

	PopulateFilteredPluginCategories();

	for (const auto& Pair : PluginCategories)
	{
		ConstructCategory(CategoriesBox.ToSharedRef(), Pair.Key, Pair.Value.ToSharedRef());
	}

	SelectedPluginGroup = nullptr;

	if (PluginVersionComboBoxPtr.IsValid())
	{
		PluginVersionComboBoxPtr->ClearSelection();
	}
}

void SMyPluginBrowser::ConstructCategory(const TSharedRef<SVerticalBox>& InCategoriesBox, const FString& CategoryName, const TSharedRef<PluginCategoryInfo>& CategoryInfo)
{
	// Title
	InCategoriesBox->AddSlot()
	.AutoHeight()
	[
		SNew(STextBlock)
		.Visibility(this, &SMyPluginBrowser::GetPluginCategoryVisibility, CategoryInfo)
		.TextStyle(FEditorStyle::Get(), TEXT("GameProjectDialog.ProjectNamePathLabels"))
		.Text(FText::AsCultureInvariant(CategoryName))
	];

	// Separator
	InCategoriesBox->AddSlot()
	.AutoHeight()
	.Padding(0.f, 2.f, 0.f, 8.f)
	[
		SNew(SSeparator)
		.Visibility(this, &SMyPluginBrowser::GetPluginCategoryVisibility, CategoryInfo)
	];

	// Project tile view
	InCategoriesBox->AddSlot()
	.AutoHeight()
	[
		SAssignNew(CategoryInfo->PluginTileView, STileView<TSharedPtr<PluginGroupInfo>>)
		.Visibility(this, &SMyPluginBrowser::GetPluginCategoryVisibility, CategoryInfo)
		.ListItemsSource(&CategoryInfo->FilteredPlugins)
		.SelectionMode(ESelectionMode::Single)
		.ClearSelectionOnClick(true)
		.AllowOverscroll(EAllowOverscroll::No)
		.OnGenerateTile(this, &SMyPluginBrowser::MakePluginViewWidget)
		.OnMouseButtonDoubleClick(this, &SMyPluginBrowser::HandlePluginItemDoubleClick)
		.OnSelectionChanged(this, &SMyPluginBrowser::HandlePluginViewSelectionChanged, FText::AsCultureInvariant(CategoryName))
		.ItemHeight(ThumbnailSize + ThumbnailBorderPadding + 32)
		.ItemWidth(ThumbnailSize + ThumbnailBorderPadding)
	];
}

TSharedRef<ITableRow> SMyPluginBrowser::MakePluginViewWidget(TSharedPtr<PluginGroupInfo> PluginItem, const TSharedRef<STableViewBase>& OwnerTable)
{
	TSharedRef<ITableRow> TableRow = SNew(STableRow<TSharedPtr<PluginGroupInfo>>, OwnerTable)
	.Style(FEditorStyle::Get(), TEXT("GameProjectDialog.TemplateListView.TableRow"))
	[
		SNew(SBox)
		.HeightOverride(ThumbnailSize + ThumbnailBorderPadding + 5)
		[
			SNew(SVerticalBox)

			// Thumbnail
			+ SVerticalBox::Slot()
			.AutoHeight()
			[
				SNew(SBox)
				.WidthOverride(ThumbnailSize + ThumbnailBorderPadding * 2)
				.HeightOverride(ThumbnailSize + ThumbnailBorderPadding * 2)
				[
					SNew(SOverlay)

					+ SOverlay::Slot()
					[
						SNew(SBorder)
						.Padding(ThumbnailBorderPadding)
						.BorderImage(FEditorStyle::GetBrush(TEXT("ContentBrowser.ThumbnailShadow")))
						.ColorAndOpacity(FLinearColor::White)
						.BorderBackgroundColor(FLinearColor::White)
						[
							SNew(SImage)
							.Image(PluginItem->Thumbnail.Get())
						]
					]
				]
			]

			// Name
			+ SVerticalBox::Slot()
			.HAlign(HAlign_Center)
			.VAlign(VAlign_Top)
			[
				SNew(STextBlock)
				.HighlightText(this, &SMyPluginBrowser::GetItemHighlightText)
				.Text(FText::AsCultureInvariant(PluginItem->FriendlyName))
			]
		]
	];

	TableRow->AsWidget()->SetToolTip(MakePluginToolTip(PluginItem));

	return TableRow;
}

TSharedRef<SToolTip> SMyPluginBrowser::MakePluginToolTip(TSharedPtr<PluginGroupInfo> PluginItem)
{
	// Create a box to hold every line of info in the body of the tooltip
	TSharedRef<SVerticalBox> InfoBox = SNew(SVerticalBox);

	if (PluginItem->Description.Len() > 0)
	{
		AddToToolTipInfoBox(InfoBox, LOCTEXT("PluginTileTooltipDescription", "Description"), FText::AsCultureInvariant(PluginItem->Description));
	}

	{
		FString PathsString;
		for (int32 i = 0; i < PluginItem->Paths.Num(); ++i)
		{
			const FString& Elem = PluginItem->Paths[i];
			PathsString += FPaths::GetPath(Elem);
			if (i != PluginItem->Paths.Num() - 1)
			{
				PathsString += TEXT("\n");
			}
		}
	
		AddToToolTipInfoBox(InfoBox, LOCTEXT("PluginTileTooltipPaths", "Paths"), FText::AsCultureInvariant(PathsString));
	}

	TSharedRef<SToolTip> Tooltip = SNew(SToolTip)
	.TextMargin(1)
	.BorderImage(FEditorStyle::GetBrush(TEXT("ProjectBrowser.TileViewTooltip.ToolTipBorder")))
	[
		SNew(SBorder)
		.Padding(6)
		.BorderImage(FEditorStyle::GetBrush(TEXT("ProjectBrowser.TileViewTooltip.NonContentBorder")))
		[
			SNew(SVerticalBox)

			+ SVerticalBox::Slot()
			.AutoHeight()
			.Padding(0, 0, 0, 4)
			[
				SNew(SBorder)
				.Padding(6)
				.BorderImage(FEditorStyle::GetBrush(TEXT("ProjectBrowser.TileViewTooltip.ContentBorder")))
				[
					SNew(SVerticalBox)

					+ SVerticalBox::Slot()
					.AutoHeight()
					.VAlign(VAlign_Center)
					[
						SNew(STextBlock)
						.Text(FText::AsCultureInvariant(PluginItem->FriendlyName))
						.Font(FEditorStyle::GetFontStyle(TEXT("ProjectBrowser.TileViewTooltip.NameFont")))
					]
				]
			]

			+ SVerticalBox::Slot()
			.AutoHeight()
			[
				SNew(SBorder)
				.Padding(6)
				.BorderImage(FEditorStyle::GetBrush(TEXT("ProjectBrowser.TileViewTooltip.ContentBorder")))
				[
					InfoBox
				]
			]
		]
	];

	return Tooltip;
}

void SMyPluginBrowser::AddToToolTipInfoBox(const TSharedRef<SVerticalBox>& InfoBox, const FText& Key, const FText& Value)
{
	InfoBox->AddSlot()
	.AutoHeight()
	.Padding(0, 1)
	[
		SNew(SHorizontalBox)

		+ SHorizontalBox::Slot()
		.AutoWidth()
		.Padding(0, 0, 4, 0)
		[
			SNew(STextBlock)
			.Text(FText::Format(LOCTEXT("ProjectBrowserTooltipFormat", "{0}:"), Key))
			.ColorAndOpacity(FSlateColor::UseSubduedForeground())
		]

		+ SHorizontalBox::Slot()
		.AutoWidth()
		[
			SNew(STextBlock)
			.Text(Value)
			.ColorAndOpacity(FSlateColor::UseForeground())
		]
	];
}

EVisibility SMyPluginBrowser::GetPluginCategoryVisibility(const TSharedRef<PluginCategoryInfo> InCategory) const
{
	if (NumFilteredPlugins == 0)
	{
		return EVisibility::Collapsed;
	}
	return InCategory->FilteredPlugins.Num() > 0 ? EVisibility::Visible : EVisibility::Collapsed;
}

EVisibility SMyPluginBrowser::GetNoPluginsErrorVisibility() const
{
	return (PluginInfos.Num() > 0) ? EVisibility::Collapsed : EVisibility::Visible;
}

EVisibility SMyPluginBrowser::GetNoPluginsAfterFilterErrorVisibility() const
{
	return (PluginInfos.Num() > 0 && NumFilteredPlugins == 0) ? EVisibility::Visible : EVisibility::Collapsed;
}

void SMyPluginBrowser::HandlePluginItemDoubleClick(TSharedPtr<PluginGroupInfo> TemplateItem)
{
	HandlePluginItemDoubleClickDelegate.Execute(TemplateItem);
}

void SMyPluginBrowser::HandlePluginViewSelectionChanged(TSharedPtr<PluginGroupInfo> PluginItem, ESelectInfo::Type SelectInfo, FText CategoryName)
{
	if (bPreventSelectionChangeEvent == false)
	{
		TGuardValue<bool> SelectionEventGuard(bPreventSelectionChangeEvent, true);

		const FString CategoryNameAsString = CategoryName.ToString();
		for (const auto& Pair : PluginCategories)
		{
			TSharedPtr<PluginCategoryInfo> Category = Pair.Value;
			if (Category->PluginTileView.IsValid())
			{
				const FString CategorysName = Pair.Key;
				if (GH::AreEqual(CategorysName, CategoryNameAsString) == false)
				{
					Category->PluginTileView->ClearSelection();
				}
			}
		}

		SelectedPluginGroup = PluginItem;

		//---------------------------------------------------------------------
		//	Updating plugin version combo box

		if (SelectedPluginGroup.IsValid() == false)
		{
			SelectedPluginGroupsPaths.Reset();

			PluginVersionComboBoxPtr->ClearSelection();
			/* This might not be necessary so I have commented it */
			//PluginVersionComboBoxPtr->RefreshOptions();
		}
		else
		{
			SelectedPluginGroupsPaths.Reset(SelectedPluginGroup->Paths.Num());
			for (const auto& Elem : SelectedPluginGroup->Paths)
			{
				SelectedPluginGroupsPaths.Emplace(MakeShareable(new FString(Elem)));
			}

			PluginVersionComboBoxPtr->ClearSelection();
			PluginVersionComboBoxPtr->RefreshOptions();
		}
	}

	//---------------------------------------------------------------------
}

void SMyPluginBrowser::OnFilterTextChanged(const FText& InText)
{
	PluginItemFilter.SetRawFilterText(InText);
	SearchBoxPtr->SetError(PluginItemFilter.GetFilterErrorText());
	PopulateFilteredPluginCategories();
}

void SMyPluginBrowser::PopulateFilteredPluginCategories()
{
	NumFilteredPlugins = 0;
	for (const auto& Pair : PluginCategories)
	{
		PluginCategoryInfo* Category = Pair.Value.Get();

		Category->FilteredPlugins.Reset();

		for (const auto& PluginItem : Category->Plugins)
		{
			if (PluginItemFilter.PassesFilter(PluginItem))
			{
				Category->FilteredPlugins.Emplace(PluginItem);
				NumFilteredPlugins++;
			}
		}

		if (Category->PluginTileView.IsValid())
		{
			Category->PluginTileView->RequestListRefresh();
		}
	}
}

EVisibility SMyPluginBrowser::GetFilterActiveOverlayVisibility() const
{
	return PluginItemFilter.GetRawFilterText().IsEmpty() ? EVisibility::Collapsed : EVisibility::HitTestInvisible;
}

FText SMyPluginBrowser::GetItemHighlightText() const
{
	return PluginItemFilter.GetRawFilterText();
}

FReply SMyPluginBrowser::OnRefreshButtonClicked()
{
	FindPlugins();
	return FReply::Handled();
}

bool SMyPluginBrowser::HandleVersionComboBoxIsEnabled() const
{
	return SelectedPluginGroup.IsValid();
}

void SMyPluginBrowser::OnVersionComboBoxSelectionChanged(TSharedPtr<FString> Selection, ESelectInfo::Type SelectInfo)
{
}

TSharedRef<SWidget> SMyPluginBrowser::MakeVersionComboBoxItemWidget(TSharedPtr<FString> InItem)
{
	return SNew(STextBlock)
		.Text(FText::AsCultureInvariant(*InItem))
		.Margin(FMargin(0.f, 4.f));
}

FText SMyPluginBrowser::GetPluginVersionComboBoxSelectionText() const
{
	if (PluginVersionComboBoxPtr->GetSelectedItem().IsValid())
	{
		return FText::AsCultureInvariant(*PluginVersionComboBoxPtr->GetSelectedItem());
	}
	else
	{
		if (SelectedPluginGroup.IsValid())
		{
			return LOCTEXT("Please select a version", "Please select a version");
		}
		else
		{
			return LOCTEXT("Please select a plugin", "Please select a plugin");
		}
	}
}

FReply SMyPluginBrowser::OnBackButtonClicked()
{
	TSharedPtr<PluginInfo> SelectedPlugin = nullptr;
	if (SelectedPluginGroup.IsValid() && PluginVersionComboBoxPtr->GetSelectedItem().IsValid())
	{
		SelectedPlugin = MakeShareable(new PluginInfo(SelectedPluginGroup->Name, *PluginVersionComboBoxPtr->GetSelectedItem(), SelectedPluginGroup->FriendlyName));
	}

	return OnBackButtonClickedDelegate.Execute(SelectedPlugin);
}

FReply SMyPluginBrowser::OnManuallyLocatePluginButtonClicked()
{
	TArray<FString> SelectedFiles;
	IDesktopPlatform* DesktopPlatform = FDesktopPlatformModule::Get();
	bool bOpened = DesktopPlatform->OpenFileDialog
	(
		FSlateApplication::Get().FindBestParentWindowHandleForDialogs(nullptr),
		TEXT("Select .uplugin file"),
		FString(),
		FString(),
		TEXT("Unreal Engine Plugin File (*.uplugin)|*.uplugin|All files (*.*)|*.*"),
		EFileDialogFlags::None,
		SelectedFiles
	);

	if (bOpened)
	{
		if (SelectedFiles.Num() == 1)
		{
			const FString& SelectedFile = SelectedFiles[0];
			const FString PluginName = FPaths::GetBaseFilename(SelectedFile);
			const FString SelectedFile_Abs = FPaths::ConvertRelativePathToFull(SelectedFile);

			/* Check to see if the selected plugin is actually already known about */
			bool bPluginAlreadyKnownAbout = false;
			for (int32 i = 0; i < PluginInfos.Num(); ++i)
			{
				const TSharedPtr<PluginGroupInfo>& Elem = PluginInfos[i];
				if (GH::AreEqual(PluginName, Elem->Name))
				{
					for (const auto& Path : Elem->Paths)
					{
						if (Path == SelectedFile_Abs)
						{
							bPluginAlreadyKnownAbout = true;
							break;
						}
					}

					break;
				}
			}

			if (bPluginAlreadyKnownAbout == false)
			{
				/* Show a widget asking user if they want us to automatically locate this
				plugin for next time */

				/* First remove keyboard focus - it is on the "manually locate" button.
				Without doing this user can press enter to re-open the file dialog */
				FSlateApplication::Get().ClearKeyboardFocus();

				OverlayForPopupsPtr->AddSlot(1000)
				.Padding(GetMainBorderPadding() * -1.f)
				[
					SNew(SModalWidget)
					.TextContent(FText::AsCultureInvariant(TEXT("Auto-locate plugin next time?")))
					.OnNoClicked(FOnClicked::CreateSP(this, &SMyPluginBrowser::OnAskAutoLoadNoButtonClicked, PluginName, SelectedFile_Abs, bPluginAlreadyKnownAbout))
					.OnYesClicked(FOnClicked::CreateSP(this, &SMyPluginBrowser::OnAskAutoLoadYesButtonClicked, PluginName, SelectedFile_Abs, bPluginAlreadyKnownAbout))
				];
			}
			else
			{
				PostPluginManuallyLocated(PluginName, SelectedFile_Abs, bPluginAlreadyKnownAbout);
			}
		}
	}

	return FReply::Handled();
}

FReply SMyPluginBrowser::OnAskAutoLoadNoButtonClicked(FString PluginName, FString SelectedFile_Abs, bool bPluginAlreadyKnownAbout)
{
	/* Remove the 'auto load next time?' widget */
	OverlayForPopupsPtr->RemoveSlot(1000);

	if (NonRememberedManuallyLocatedPlugins.Contains(SelectedFile_Abs) == false)
	{
		NonRememberedManuallyLocatedPlugins.Emplace(SelectedFile_Abs);
	}

	PostPluginManuallyLocated(PluginName, SelectedFile_Abs, bPluginAlreadyKnownAbout);

	return FReply::Handled();
}

FReply SMyPluginBrowser::OnAskAutoLoadYesButtonClicked(FString PluginName, FString SelectedFile_Abs, bool bPluginAlreadyKnownAbout)
{
	/* Remove the 'auto load next time?' widget */
	OverlayForPopupsPtr->RemoveSlot(1000);

	const FString FilePath = FString(FWindowsPlatformProcess::UserSettingsDir()) + TEXT("UE4DocTool/DocToolWidgetData.json");
	FString FileContents;

	if (DocToolWidgetHelpers::AquireDocToolWidgetDataMutex())
	{
		const bool bFileExists = FFileHelper::LoadFileToString(FileContents, *FilePath);
		TSharedPtr<FJsonObject> JsonObject = MakeShareable(new FJsonObject);
		TSharedRef<TJsonReader<>> Reader = TJsonReaderFactory<>::Create(FileContents);
		if (bFileExists == false || FJsonSerializer::Deserialize(Reader, JsonObject))
		{
			TArray<TSharedPtr<FJsonValue>> Array;
			if (JsonObject->HasTypedField<EJson::Array>(TEXT("Plugins to auto-load for plugin browser")))
			{
				Array = JsonObject->GetArrayField(TEXT("Plugins to auto-load for plugin browser"));
			}

			Array.Emplace(MakeShareable(new FJsonValueString(SelectedFile_Abs)));
			JsonObject->SetArrayField(TEXT("Plugins to auto-load for plugin browser"), Array);

			FString UpdatedFileContents;
			TSharedRef<TJsonWriter<>> Writer = TJsonWriterFactory<>::Create(&UpdatedFileContents);
			FJsonSerializer::Serialize(JsonObject.ToSharedRef(), Writer);
			FFileHelper::SaveStringToFile(UpdatedFileContents, *FilePath);
		}

		DocToolWidgetHelpers::ReleaseDocToolWidgetDataMutex();
	}

	PostPluginManuallyLocated(PluginName, SelectedFile_Abs, bPluginAlreadyKnownAbout);

	return FReply::Handled();
}

void SMyPluginBrowser::PostPluginManuallyLocated(const FString& PluginName, const FString& SelectedFile_Abs, bool bPluginAlreadyKnownAbout)
{
	SearchBoxPtr->SetText(FText::GetEmpty());

	if (bPluginAlreadyKnownAbout == false)
	{
		FindPlugins();
	}

	/* Select plugin for user since that is probably what they want */
	SelectPlugin(PluginName, SelectedFile_Abs);

	/* Show a brief window letting the user know that the filter was cleared, their
	plugin was added to the list and we have selected the plugin */
	const FText Message = bPluginAlreadyKnownAbout ? LOCTEXT("Plugin successfully located", "Filter cleared, plugin selected") : LOCTEXT("Plugin successfully located", "Plugin added, filter cleared, plugin selected");
	const bool bIsPopupAlreadyShowing = (OverlayForPopupsPtr->GetNumWidgets() > 1);
	if (bIsPopupAlreadyShowing)
	{
		TSharedRef<SPopupNotification> Popup = StaticCastSharedRef<SPopupNotification>(OverlayForPopupsPtr->GetChildren()->GetChildAt(1));
		Popup->SetMessage(Message);
		Popup->ResetDurationPostModal();
	}
	else
	{
		OverlayForPopupsPtr->AddSlot(500)
		.HAlign(HAlign_Center)
		.VAlign(VAlign_Center)
		[
			SNew(SPopupNotification)
			.TextContent(Message)
			.SolidOneOpacityDuration(2.5f)
			.FadeOutDuration(3.f)
		];
	}
}

void SMyPluginBrowser::SelectPlugin(const FString& PluginName, const FString& PluginFilesFilePath, bool bScrollPluginIntoView)
{
	for (const auto& Pair : PluginCategories)
	{
		TSharedPtr<PluginCategoryInfo> Category = Pair.Value;

		for (const auto& Plugin : Category->Plugins)
		{
			if (GH::AreEqual(PluginName, Plugin->Name))
			{
				Category->PluginTileView->SetSelection(Plugin);

				if (bScrollPluginIntoView)
				{
					/* Note that if Category->PluginTileView->WidgetFromItem(Plugin) returns
					non-null at this time then we can actually scroll to it now,
					(do:
					SScrollBox::ScrollDescendantIntoView(Category->PluginTileView->WidgetFromItem(Plugin)->AsWidget(), false)
					but if it returns null then I cannot find a way to scroll to it. I tried
					pretty hard too
					*/
				}

				//--------------------------------------------------------------
				/* Select the corrisponding entry in the version combo box */
				
				bool bFoundPtr = false;
				for (const auto& Path : SelectedPluginGroupsPaths)
				{
					if (*Path == PluginFilesFilePath)
					{
						PluginVersionComboBoxPtr->SetSelectedItem(Path);
						bFoundPtr = true;
						break;
					}
				}

				/* It really should be there */
				check(bFoundPtr);

				//--------------------------------------------------------------

				return;
			}
		}
	}
}

FReply SMyPluginBrowser::OnContinueButtonClicked()
{
	TSharedPtr<PluginInfo> SelectedPlugin = MakeShareable(new PluginInfo(SelectedPluginGroup->Name, *PluginVersionComboBoxPtr->GetSelectedItem(), SelectedPluginGroup->FriendlyName));
	return OnContinueButtonClickedDelegate.Execute(SelectedPlugin);
}

bool SMyPluginBrowser::HandleContinueButtonIsEnabled() const
{
	return SelectedPluginGroup.IsValid() && PluginVersionComboBoxPtr->GetSelectedItem().IsValid();
}


DocToolWidgetPageInfo SDocToolWidget_SelectCreateDocumentationTargetPluginPage::GetHistoryCrumbTrailInfo()
{
	return DocToolWidgetPageInfo(LOCTEXT("Select Create Documentation Target Plugin Page Display Name", "Select Plugin"), EDocToolWidgetPageType::SelectCreateDocumentationTargetPlugin);
}

SDocToolWidget_SelectCreateDocumentationTargetPluginPage::SDocToolWidget_SelectCreateDocumentationTargetPluginPage()
	: DocToolWidget(nullptr)
{
}

void SDocToolWidget_SelectCreateDocumentationTargetPluginPage::Construct(const FArguments& InArgs)
{
	DocToolWidget = InArgs._DocToolWidget;

	ChildSlot
	[
		SNew(SMyPluginBrowser)
		.OnHistoryPathClicked(this, &SDocToolWidget_SelectCreateDocumentationTargetPluginPage::OnHistoryPathClicked)
		.OnGetCrumbDelimiterContent(this, &SDocToolWidget_SelectCreateDocumentationTargetPluginPage::OnGetCrumbDelimiterContent)
		.CrumbTrail({ SDocToolWidget_MainPage::GetHistoryCrumbTrailInfo(), SDocToolWidget_SelectCreateDocumentationTargetTypePage::GetHistoryCrumbTrailInfo(), SDocToolWidget_SelectCreateDocumentationTargetPluginPage::GetHistoryCrumbTrailInfo() })
		.HandlePluginItemDoubleClick(this, &SDocToolWidget_SelectCreateDocumentationTargetPluginPage::HandlePluginItemDoubleClick)
		.OnBackButtonClicked(this, &SDocToolWidget_SelectCreateDocumentationTargetPluginPage::OnBackButtonClicked)
		.OnContinueButtonClicked(this, &SDocToolWidget_SelectCreateDocumentationTargetPluginPage::OnContinueButtonClicked)
	];
}

void SDocToolWidget_SelectCreateDocumentationTargetPluginPage::OnHistoryPathClicked(const EDocToolWidgetPageType& CrumbData)
{
	DocToolWidgetHelpers::NavigateDocToolWidgetToPageForHistoryCrumbClick(DocToolWidget, CrumbData);
}

FGetDocToolWidgetCrumbMenuContent_RetValType SDocToolWidget_SelectCreateDocumentationTargetPluginPage::OnGetCrumbDelimiterContent(const EDocToolWidgetPageType& CrumbData)
{
	return SNullWidget::NullWidget;
}

void SDocToolWidget_SelectCreateDocumentationTargetPluginPage::HandlePluginItemDoubleClick(TSharedPtr<PluginGroupInfo> DoubleClickedItem)
{
	/* @todo something like: */
	//DocToolWidget->SetCurrentViewType_CreateDocumentationOptionsPage(SelectedPlugin);

	/* Actually now that the version combo box is a thing you might wanna perhaps just
	make this a NOOP */
}

FReply SDocToolWidget_SelectCreateDocumentationTargetPluginPage::OnBackButtonClicked(TSharedPtr<PluginInfo> SelectedItem)
{
	DocToolWidget->SetCurrentViewType_SelectCreateDocumentationTargetTypePage();
	return FReply::Handled();
}

FReply SDocToolWidget_SelectCreateDocumentationTargetPluginPage::OnContinueButtonClicked(TSharedPtr<PluginInfo> SelectedItem)
{
	DocToolWidget->SetCurrentViewType_CreateDocumentationTargetingPluginOptionsPage(SelectedItem, nullptr);
	return FReply::Handled();
}


DocToolWidgetPageInfo SDocToolWidget_SelectParseTargetPluginPage::GetHistoryCrumbTrailInfo()
{
	return DocToolWidgetPageInfo(LOCTEXT("Select Parse Target Plugin Page Display Name", "Select Plugin"), EDocToolWidgetPageType::SelectParseTargetPlugin);
}

SDocToolWidget_SelectParseTargetPluginPage::SDocToolWidget_SelectParseTargetPluginPage()
	: DocToolWidget(nullptr)
{
}

void SDocToolWidget_SelectParseTargetPluginPage::Construct(const FArguments& InArgs)
{
	DocToolWidget = InArgs._DocToolWidget;

	ChildSlot
	[
		SNew(SMyPluginBrowser)
		.OnHistoryPathClicked(this, &SDocToolWidget_SelectParseTargetPluginPage::OnHistoryPathClicked)
		.OnGetCrumbDelimiterContent(this, &SDocToolWidget_SelectParseTargetPluginPage::OnGetCrumbDelimiterContent)
		.CrumbTrail({ SDocToolWidget_MainPage::GetHistoryCrumbTrailInfo(), SDocToolWidget_SelectParseTargetTypePage::GetHistoryCrumbTrailInfo(), SDocToolWidget_SelectParseTargetPluginPage::GetHistoryCrumbTrailInfo() })
		.HandlePluginItemDoubleClick(this, &SDocToolWidget_SelectParseTargetPluginPage::HandlePluginItemDoubleClick)
		.OnBackButtonClicked(this, &SDocToolWidget_SelectParseTargetPluginPage::OnBackButtonClicked)
		.OnContinueButtonClicked(this, &SDocToolWidget_SelectParseTargetPluginPage::OnContinueButtonClicked)
	];
}

void SDocToolWidget_SelectParseTargetPluginPage::OnHistoryPathClicked(const EDocToolWidgetPageType& CrumbData)
{
	DocToolWidgetHelpers::NavigateDocToolWidgetToPageForHistoryCrumbClick(DocToolWidget, CrumbData);
}

FGetDocToolWidgetCrumbMenuContent_RetValType SDocToolWidget_SelectParseTargetPluginPage::OnGetCrumbDelimiterContent(const EDocToolWidgetPageType& CrumbData)
{
	return SNullWidget::NullWidget;
}

void SDocToolWidget_SelectParseTargetPluginPage::HandlePluginItemDoubleClick(TSharedPtr<PluginGroupInfo> DoubleClickedItem)
{
	/* @todo something like: */
	//DocToolWidget->SetCurrentViewType_ParseOptionsPage(SelectedPlugin);

	/* Actually now that the version combo box is a thing you might wanna perhaps just
	make this a NOOP */
}

FReply SDocToolWidget_SelectParseTargetPluginPage::OnBackButtonClicked(TSharedPtr<PluginInfo> SelectedItem)
{
	DocToolWidget->SetCurrentViewType_SelectParseTargetTypePage();
	return FReply::Handled();
}

FReply SDocToolWidget_SelectParseTargetPluginPage::OnContinueButtonClicked(TSharedPtr<PluginInfo> SelectedItem)
{
	DocToolWidget->SetCurrentViewType_ParseTargetingPluginOptionsPage(SelectedItem, nullptr);
	return FReply::Handled();
}


EngineInfo::EngineInfo(const FString& EngineVersion, const FString& EnginePath)
	: Name(EngineVersion)
	, Path(EnginePath)
	/* I whack "Unknown" at the front currently for any manually located engines */
	, Category(EngineVersion.StartsWith(TEXT("Unknown"), ESearchCase::CaseSensitive) ? PredefinedEngineCategories::Unknown : FDesktopPlatformModule::Get()->IsStockEngineRelease(EngineVersion) ? PredefinedEngineCategories::Official : PredefinedEngineCategories::Custom)
	, Thumbnail(nullptr)  // Not sure where/if there's a thumbnail, so will just assign null
{
}


const FString PredefinedEngineCategories::Official	= TEXT("Official");
const FString PredefinedEngineCategories::Custom	= TEXT("Custom");
const FString PredefinedEngineCategories::Unknown	= TEXT("Unknown");


void EngineItemToString(const TSharedPtr<EngineInfo> InItem, TArray<FString>& OutFilterStrings)
{
	OutFilterStrings.Emplace(InItem->Name);
}

SMyEngineBrowser::SMyEngineBrowser()
	: CategoriesBox(nullptr)
	, OverlayForPopupsPtr(nullptr)
	, SearchBoxPtr(nullptr)
	, EngineItemFilter(EngineItemTextFilter::FItemToStringArray::CreateStatic(EngineItemToString))
	, ThumbnailBorderPadding(8)
	, ThumbnailSize(128)
	, NumFilteredEngines(0)
	, bPreventSelectionChangeEvent(false)
	, SelectedEngine(nullptr)
{
}

void SMyEngineBrowser::Construct(const FArguments& InArgs)
{
	HandleEngineItemDoubleClickDelegate = InArgs._HandleEngineItemDoubleClick;
	OnBackButtonClickedDelegate = InArgs._OnBackButtonClicked;
	OnContinueButtonClickedDelegate = InArgs._OnContinueButtonClicked;

	CategoriesBox = SNew(SVerticalBox);

	FindEngines();

	ChildSlot
	[
		SNew(SBorder)
		.BorderImage(FEditorStyle::GetBrush(TEXT("ToolPanel.GroupBorder")))
		.Padding(GetMainBorderPadding())
		[
			SAssignNew(OverlayForPopupsPtr, SOverlay)

			+ SOverlay::Slot()
			[
				SNew(SVerticalBox)

				+ DocToolWidgetHelpers::AddPageHeader(
					LOCTEXT("Select Engine", "Select Engine"),
					InArgs._OnHistoryPathClicked,
					InArgs._OnGetCrumbDelimiterContent,
					nullptr,
					InArgs._CrumbTrail
				)

				// Categories
				+ SVerticalBox::Slot()
				.Padding(8.f)
				.FillHeight(1.0f)
				[
					SNew(SVerticalBox)

					+ SVerticalBox::Slot()
					.AutoHeight()
					.VAlign(VAlign_Top)
					[
						SNew(SHorizontalBox)

						+ SHorizontalBox::Slot()
						.Padding(FMargin(0, 0, 5.f, 0))
						.VAlign(VAlign_Center)
						[
							SNew(SOverlay)

							+ SOverlay::Slot()
							[
								SAssignNew(SearchBoxPtr, SSearchBox)
								.HintText(LOCTEXT("FilterHint", "Filter Engines..."))
								.OnTextChanged(this, &SMyEngineBrowser::OnFilterTextChanged)
							]

							+ SOverlay::Slot()
							[
								SNew(SBorder)
								.Visibility(this, &SMyEngineBrowser::GetFilterActiveOverlayVisibility)
								.BorderImage(FEditorStyle::Get().GetBrush(TEXT("SearchBox.ActiveBorder")))
							]
						]

						+ SHorizontalBox::Slot()
						.AutoWidth()
						.VAlign(VAlign_Center)
						.Padding(FMargin(0.f, 0.f, 5.f, 0.f))
						[
							SNew(SButton)
							.ButtonStyle(FEditorStyle::Get(), TEXT("ToggleButton"))
							.OnClicked(this, &SMyEngineBrowser::OnRefreshButtonClicked)
							.ForegroundColor(FSlateColor::UseForeground())
							.ToolTipText(LOCTEXT("RefreshEngineList", "Refresh the engine list"))
							.HAlign(HAlign_Center)
							.VAlign(VAlign_Center)
							[
								SNew(SHorizontalBox)

								+ SHorizontalBox::Slot()
								.Padding(2.0f)
								.VAlign(VAlign_Center)
								.AutoWidth()
								[
									SNew(SImage)
									.Image(FEditorStyle::GetBrush(TEXT("Icons.Refresh")))
								]

								+ SHorizontalBox::Slot()
								.VAlign(VAlign_Center)
								.Padding(2.0f)
								[
									SNew(STextBlock)
									.TextStyle(FEditorStyle::Get(), TEXT("ProjectBrowser.Toolbar.Text"))
									.Text(LOCTEXT("RefreshEnginesText", "Refresh"))
								]
							]
						]
					]

					+ SVerticalBox::Slot()
					.Padding(FMargin(0.f, 5.f))
					[
						SNew(SScrollBox)

						+ SScrollBox::Slot()
						[
							CategoriesBox.ToSharedRef()
						]
					]
				]

				+ SVerticalBox::Slot()
				.Padding(0, 20, 0, 0)	// Lots of vertical padding before the dialog buttons at the bottom
				.AutoHeight()
				[
					SNew(SHorizontalBox)

					// Back Button
					+ SHorizontalBox::Slot()
					.AutoWidth()
					.Padding(0.f, 0.f, 8.f, 0.f)
					[
						SNew(SButton)
						.ButtonStyle(FDocToolStyle::Get(), TEXT("DocToolWidget.GenericButton"))
						.Text(LOCTEXT("BackButton", "Back"))
						.OnClicked(this, &SMyEngineBrowser::OnBackButtonClicked)
					]

					+ SHorizontalBox::Slot()
					.FillWidth(1.0f)
					[
						SNullWidget::NullWidget
					]

					// Manually Locate Engine Button
					+ SHorizontalBox::Slot()
					.AutoWidth()
					.Padding(0.f, 0.f, 8.f, 0.f)
					[
						SNew(SButton)
						.ButtonStyle(FDocToolStyle::Get(), TEXT("DocToolWidget.GenericButton"))
						.Text(LOCTEXT("ManullyLocateEngineButton", "Locate Engine"))
						.OnClicked(this, &SMyEngineBrowser::OnManuallyLocateEngineButtonClicked)
					]

					// Continue Button
					+ SHorizontalBox::Slot()
					.AutoWidth()
					[
						SNew(SButton)
						.ButtonStyle(FDocToolStyle::Get(), TEXT("DocToolWidget.GenericButton"))
						.Text(LOCTEXT("ContinueButton", "Continue"))
						.OnClicked(this, &SMyEngineBrowser::OnContinueButtonClicked)
						.IsEnabled(this, &SMyEngineBrowser::HandleContinueButtonIsEnabled)
					]
				]
			]
		]
	];
}

FMargin SMyEngineBrowser::GetMainBorderPadding() const
{
	return FMargin(8.f, 4.f);
}

void SMyEngineBrowser::FindEngines()
{
	CategoriesBox->ClearChildren();

	CategoriesBox->AddSlot()
	.HAlign(HAlign_Center)
	.Padding(FMargin(0.f, 25.f))
	[
		SNew(STextBlock)
		.Visibility(this, &SMyEngineBrowser::GetNoEnginesAfterFilterErrorVisibility)
		.Text(LOCTEXT("NoEnginesAfterFilter", "There are no engines that match the specified filter"))
	];

	//----------------------------------------------------------------------------------------
	//	Gathering all engines

	TArray<VeryBasicEngineInfo> EngineInstallations;

	TMap<FString, FString> EngineInstallationsTMap;
	DocToolWidgetHelpers::GetEngineInstallations(EngineInstallationsTMap);

	EngineInstallations.Reserve(EngineInstallationsTMap.Num());
	for (const auto& Pair : EngineInstallationsTMap)
	{
		EngineInstallations.Emplace(VeryBasicEngineInfo(Pair.Key, Pair.Value));
	}

	/* Read from disk any engines the user manually located in the past and wants us to
	auto-load */

	const FString DocToolWidgetDataFilePath = FString(FWindowsPlatformProcess::UserSettingsDir()) + TEXT("UE4DocTool/DocToolWidgetData.json");
	FString FileContents;

	if (DocToolWidgetHelpers::AquireDocToolWidgetDataMutex())
	{
		FFileHelper::LoadFileToString(FileContents, *DocToolWidgetDataFilePath);
		TSharedPtr<FJsonObject> JsonObject = MakeShareable(new FJsonObject);
		TSharedRef<TJsonReader<>> Reader = TJsonReaderFactory<>::Create(FileContents);
		if (FJsonSerializer::Deserialize(Reader, JsonObject))
		{
			const TArray<TSharedPtr<FJsonValue>>* ManuallyLocatedEnginesArrayUnmutable;
			if (JsonObject->TryGetArrayField(TEXT("Engines to auto-load for engine browser"), ManuallyLocatedEnginesArrayUnmutable))
			{
				TArray<TSharedPtr<FJsonValue>>* ManuallyLocatedEnginesArray = const_cast<TArray<TSharedPtr<FJsonValue>>*>(ManuallyLocatedEnginesArrayUnmutable);

				/* This loop will remove any engines from the json array that either:
				1. are duplicates in the file
				2. get discovered by FindEngines
				3. no longer exist (folder gone or is no longer has an unreal engine in it)
				I never do this in my code - it is just in case a user edits the file.
				The loop also adds things to EngineInstallations array */
				for (int32 i = ManuallyLocatedEnginesArray->Num() - 1; i >= 0; --i)
				{
					const TSharedPtr<FJsonObject>* Elem;
					if ((*ManuallyLocatedEnginesArray)[i]->TryGetObject(Elem) == false)
					{
						ManuallyLocatedEnginesArray->RemoveAtSwap(i, 1, false);
						continue;
					}

					FString Path;
					if (Elem->Get()->TryGetStringField(TEXT("Path"), Path) == false)
					{
						ManuallyLocatedEnginesArray->RemoveAtSwap(i, 1, false);
						continue;
					}

					if (FPaths::IsRelative(Path))
					{
						ManuallyLocatedEnginesArray->RemoveAtSwap(i, 1, false);
						continue;
					}

					if (EngineInstallations.Contains(Path))
					{
						ManuallyLocatedEnginesArray->RemoveAtSwap(i, 1, false);
						continue;
					}

					if (IsValidEngineDirectory(Path) == false)
					{
						ManuallyLocatedEnginesArray->RemoveAtSwap(i, 1, false);
						continue;
					}

					FString Version;
					if (Elem->Get()->TryGetStringField(TEXT("Version"), Version) == false)
					{
						ManuallyLocatedEnginesArray->RemoveAtSwap(i, 1, false);
						continue;
					}

					EngineInstallations.Emplace(VeryBasicEngineInfo(Version, Path));
				}

				FString UpdatedFileContents;
				TSharedRef<TJsonWriter<>> Writer = TJsonWriterFactory<>::Create(&UpdatedFileContents);
				FJsonSerializer::Serialize(JsonObject.ToSharedRef(), Writer);
				FFileHelper::SaveStringToFile(UpdatedFileContents, *DocToolWidgetDataFilePath);
			}
		}

		DocToolWidgetHelpers::ReleaseDocToolWidgetDataMutex();
	}

	/* Add engines the user wants us to remember just for this time */
	for (int32 i = NonRememberedManuallyLocatedEngines.Num() - 1; i >= 0; --i)
	{
		const VeryBasicEngineInfo& Elem = NonRememberedManuallyLocatedEngines[i];

		if (EngineInstallations.Contains(Elem) == false && IsValidEngineDirectory(Elem.Path))
		{
			EngineInstallations.Emplace(Elem);
		}
		else
		{
			NonRememberedManuallyLocatedEngines.RemoveAtSwap(i, 1, false);
		}
	}

	//----------------------------------------------------------------------------------------

	EngineInfos.Reset(EngineInstallations.Num());
	EngineCategories.Reset();
	for (const auto& Elem : EngineInstallations)
	{
		EngineInfos.Emplace(MakeShareable(new EngineInfo(Elem.Version, Elem.Path)));
	}

	/* Add entry to categories container */
	for (const auto& EnginesInfo : EngineInfos)
	{
		TSharedPtr<EngineCategoryInfo>& Value = (EngineCategories.Contains(EnginesInfo->Category) == false) ? EngineCategories.Emplace(EnginesInfo->Category, MakeShareable(new EngineCategoryInfo)) : EngineCategories[EnginesInfo->Category];
		Value->Engines.Emplace(EnginesInfo);
	}

	/* Sort categories. Sort such that "Official" then "Custom" */
	EngineCategories.KeySort([](const FString& S1, const FString& S2)
	{
		if (GH::AreEqual(S1, PredefinedEngineCategories::Official))
		{
			return true;
		}
		else if (GH::AreEqual(S1, PredefinedEngineCategories::Custom))
		{
			return true;
		}
		else  // Assuming "Unknown"
		{
			return false;
		}
	});

	for (auto& Pair : EngineCategories)
	{
		/* Sort engines alphabetically */
		Pair.Value->Engines.Sort([](const TSharedPtr<EngineInfo>& S1, const TSharedPtr<EngineInfo>& S2)
		{
			return S1->Name < S2->Name;
		});
	}

	PopulateFilteredEngineCategories();

	for (const auto& Pair : EngineCategories)
	{
		ConstructCategory(CategoriesBox.ToSharedRef(), Pair.Key, Pair.Value.ToSharedRef());
	}

	SelectedEngine = nullptr;
}

void SMyEngineBrowser::ConstructCategory(
	const TSharedRef<SVerticalBox>& InCategoriesBox,
	const FString& CategoryName, 
	const TSharedRef<EngineCategoryInfo>& CategoryInfo)
{
	// Title
	InCategoriesBox->AddSlot()
	.AutoHeight()
	[
		SNew(STextBlock)
		.Visibility(this, &SMyEngineBrowser::GetEngineCategoryVisibility, CategoryInfo)
		.TextStyle(FEditorStyle::Get(), TEXT("GameProjectDialog.ProjectNamePathLabels"))
		.Text(FText::AsCultureInvariant(CategoryName))
	];

	// Separator
	InCategoriesBox->AddSlot()
	.AutoHeight()
	.Padding(0.f, 2.f, 0.f, 8.f)
	[
		SNew(SSeparator)
		.Visibility(this, &SMyEngineBrowser::GetEngineCategoryVisibility, CategoryInfo)
	];

	// Project tile view
	InCategoriesBox->AddSlot()
	.AutoHeight()
	[
		SAssignNew(CategoryInfo->EngineTileView, STileView<TSharedPtr<EngineInfo>>)
		.Visibility(this, &SMyEngineBrowser::GetEngineCategoryVisibility, CategoryInfo)
		.ListItemsSource(&CategoryInfo->FilteredEngines)
		.SelectionMode(ESelectionMode::Single)
		.ClearSelectionOnClick(true)
		.AllowOverscroll(EAllowOverscroll::No)
		.OnGenerateTile(this, &SMyEngineBrowser::MakeEngineViewWidget)
		.OnMouseButtonDoubleClick(this, &SMyEngineBrowser::HandleEngineItemDoubleClick)
		.OnSelectionChanged(this, &SMyEngineBrowser::HandleEngineViewSelectionChanged, FText::AsCultureInvariant(CategoryName))
		.ItemHeight(ThumbnailSize + ThumbnailBorderPadding + 32)
		.ItemWidth(ThumbnailSize + ThumbnailBorderPadding)
	];
}

TSharedRef<ITableRow> SMyEngineBrowser::MakeEngineViewWidget(TSharedPtr<EngineInfo> EngineItem, const TSharedRef<STableViewBase>& OwnerTable)
{
	TSharedRef<ITableRow> TableRow = SNew(STableRow<TSharedPtr<EngineInfo>>, OwnerTable)
	.Style(FEditorStyle::Get(), TEXT("GameProjectDialog.TemplateListView.TableRow"))
	[
		SNew(SBox)
		.HeightOverride(ThumbnailSize + ThumbnailBorderPadding + 5)
		[
			SNew(SVerticalBox)

			// Thumbnail
			+ SVerticalBox::Slot()
			.AutoHeight()
			[
				SNew(SBox)
				.WidthOverride(ThumbnailSize + ThumbnailBorderPadding * 2)
				.HeightOverride(ThumbnailSize + ThumbnailBorderPadding * 2)
				[
					SNew(SOverlay)

					+ SOverlay::Slot()
					[
						SNew(SBorder)
						.Padding(ThumbnailBorderPadding)
						.BorderImage(FEditorStyle::GetBrush(TEXT("ContentBrowser.ThumbnailShadow")))
						.ColorAndOpacity(FLinearColor::White)
						.BorderBackgroundColor(FLinearColor::White)
						[
							SNew(SImage)
							.Image(EngineItem->Thumbnail.IsValid() ? EngineItem->Thumbnail.Get() : FEditorStyle::GetBrush(TEXT("GameProjectDialog.DefaultGameThumbnail")))
						]
					]
				]
			]

			// Name
			+ SVerticalBox::Slot()
			.HAlign(HAlign_Center)
			.VAlign(VAlign_Top)
			[
				SNew(STextBlock)
				.HighlightText(this, &SMyEngineBrowser::GetItemHighlightText)
				.Text(FText::AsCultureInvariant(EngineItem->Name))
			]
		]
	];

	TableRow->AsWidget()->SetToolTip(MakeEngineToolTip(EngineItem));

	return TableRow;
}

TSharedRef<SToolTip> SMyEngineBrowser::MakeEngineToolTip(TSharedPtr<EngineInfo> EngineItem)
{
	// Create a box to hold every line of info in the body of the tooltip
	TSharedRef<SVerticalBox> InfoBox = SNew(SVerticalBox);

	{
		AddToToolTipInfoBox(InfoBox, LOCTEXT("EngineTileTooltipPath", "Path"), FText::AsCultureInvariant(EngineItem->Path));
	}

	TSharedRef<SToolTip> Tooltip = SNew(SToolTip)
	.TextMargin(1)
	.BorderImage(FEditorStyle::GetBrush(TEXT("ProjectBrowser.TileViewTooltip.ToolTipBorder")))
	[
		SNew(SBorder)
		.Padding(6)
		.BorderImage(FEditorStyle::GetBrush(TEXT("ProjectBrowser.TileViewTooltip.NonContentBorder")))
		[
			SNew(SVerticalBox)

			+ SVerticalBox::Slot()
			.AutoHeight()
			.Padding(0, 0, 0, 4)
			[
				SNew(SBorder)
				.Padding(6)
				.BorderImage(FEditorStyle::GetBrush(TEXT("ProjectBrowser.TileViewTooltip.ContentBorder")))
				[
					SNew(SVerticalBox)

					+ SVerticalBox::Slot()
					.AutoHeight()
					.VAlign(VAlign_Center)
					[
						SNew(STextBlock)
						.Text(FText::AsCultureInvariant(EngineItem->Name))
						.Font(FEditorStyle::GetFontStyle(TEXT("ProjectBrowser.TileViewTooltip.NameFont")))
					]
				]
			]

			+ SVerticalBox::Slot()
			.AutoHeight()
			[
				SNew(SBorder)
				.Padding(6)
				.BorderImage(FEditorStyle::GetBrush(TEXT("ProjectBrowser.TileViewTooltip.ContentBorder")))
				[
					InfoBox
				]
			]
		]
	];

	return Tooltip;
}

void SMyEngineBrowser::AddToToolTipInfoBox(const TSharedRef<SVerticalBox>& InfoBox, const FText& Key, const FText& Value)
{
	InfoBox->AddSlot()
	.AutoHeight()
	.Padding(0, 1)
	[
		SNew(SHorizontalBox)

		+ SHorizontalBox::Slot()
		.AutoWidth()
		.Padding(0, 0, 4, 0)
		[
			SNew(STextBlock)
			.Text(FText::Format(LOCTEXT("ProjectBrowserTooltipFormat", "{0}:"), Key))
			.ColorAndOpacity(FSlateColor::UseSubduedForeground())
		]

		+ SHorizontalBox::Slot()
		.AutoWidth()
		[
			SNew(STextBlock)
			.Text(Value)
			.ColorAndOpacity(FSlateColor::UseForeground())
		]
	];
}

EVisibility SMyEngineBrowser::GetEngineCategoryVisibility(const TSharedRef<EngineCategoryInfo> InCategory) const
{
	if (NumFilteredEngines == 0)
	{
		return EVisibility::Collapsed;
	}
	return InCategory->FilteredEngines.Num() > 0 ? EVisibility::Visible : EVisibility::Collapsed;
}

EVisibility SMyEngineBrowser::GetNoEnginesAfterFilterErrorVisibility() const
{
	return (EngineInfos.Num() > 0 && NumFilteredEngines == 0) ? EVisibility::Visible : EVisibility::Collapsed;
}

void SMyEngineBrowser::HandleEngineItemDoubleClick(TSharedPtr<EngineInfo> TemplateItem)
{
	HandleEngineItemDoubleClickDelegate.Execute(TemplateItem);
}

void SMyEngineBrowser::HandleEngineViewSelectionChanged(TSharedPtr<EngineInfo> EngineItem, ESelectInfo::Type SelectInfo, FText CategoryName)
{
	if (bPreventSelectionChangeEvent == false)
	{
		TGuardValue<bool> SelectionEventGuard(bPreventSelectionChangeEvent, true);

		const FString CategoryNameAsString = CategoryName.ToString();
		for (const auto& Pair : EngineCategories)
		{
			TSharedPtr<EngineCategoryInfo> Category = Pair.Value;
			if (Category->EngineTileView.IsValid())
			{
				const FString CategorysName = Pair.Key;
				if (GH::AreEqual(CategorysName, CategoryNameAsString) == false)
				{
					Category->EngineTileView->ClearSelection();
				}
			}
		}

		SelectedEngine = EngineItem;
	}
}

void SMyEngineBrowser::OnFilterTextChanged(const FText& InText)
{
	EngineItemFilter.SetRawFilterText(InText);
	SearchBoxPtr->SetError(EngineItemFilter.GetFilterErrorText());
	PopulateFilteredEngineCategories();
}

void SMyEngineBrowser::PopulateFilteredEngineCategories()
{
	NumFilteredEngines = 0;
	for (const auto& Pair : EngineCategories)
	{
		EngineCategoryInfo* Category = Pair.Value.Get();

		Category->FilteredEngines.Reset();

		for (const auto& EngineItem : Category->Engines)
		{
			if (EngineItemFilter.PassesFilter(EngineItem))
			{
				Category->FilteredEngines.Emplace(EngineItem);
				NumFilteredEngines++;
			}
		}

		if (Category->EngineTileView.IsValid())
		{
			Category->EngineTileView->RequestListRefresh();
		}
	}
}

EVisibility SMyEngineBrowser::GetFilterActiveOverlayVisibility() const
{
	return EngineItemFilter.GetRawFilterText().IsEmpty() ? EVisibility::Collapsed : EVisibility::HitTestInvisible;
}

FText SMyEngineBrowser::GetItemHighlightText() const
{
	return EngineItemFilter.GetRawFilterText();
}

FReply SMyEngineBrowser::OnRefreshButtonClicked()
{
	FindEngines();
	return FReply::Handled();
}

FReply SMyEngineBrowser::OnBackButtonClicked()
{
	return OnBackButtonClickedDelegate.Execute(SelectedEngine);
}

FReply SMyEngineBrowser::OnManuallyLocateEngineButtonClicked()
{
	FString SelectedDirectory;
	IDesktopPlatform* DesktopPlatform = FDesktopPlatformModule::Get();
	bool bOpened = DesktopPlatform->OpenDirectoryDialog
	(
		FSlateApplication::Get().FindBestParentWindowHandleForDialogs(nullptr),
		TEXT("Select engine\'s folder"),
		FString(),
		SelectedDirectory
	);

	if (bOpened)
	{
		FString EngineVersion;
		bool bValidEngineDirectory = false;
		/* Check directory user chose is actually an unreal engine's directory and not 
		something else */
		if (IsValidEngineDirectory(SelectedDirectory, &EngineVersion))
		{
			bValidEngineDirectory = true;
		}
		else
		{
			/* We want the directory above the Engine folder (the epic games launcher defaults
			it to UE_4.XX, but it can be anything afaik). Check to see if user selected
			the Engine folder and if yes adjust the path to the folder above it */
			if (SelectedDirectory.EndsWith(TEXT("/Engine")))
			{
				const FString PathToTest = SelectedDirectory.LeftChop(FString(TEXT("/Engine")).Len());
				if (IsValidEngineDirectory(PathToTest, &EngineVersion))
				{
					SelectedDirectory = PathToTest;
					bValidEngineDirectory = true;
				}
			}
		}

		if (bValidEngineDirectory == false)
		{
			PostEngineManuallyLocated_InvalidEngineDirectory(SelectedDirectory);
			return FReply::Handled();
		}

		/* Check to see if the selected engine is actually already known about */
		bool bEngineAlreadyKnownAbout = false;
		for (int32 i = 0; i < EngineInfos.Num(); ++i)
		{
			const TSharedPtr<EngineInfo>& Elem = EngineInfos[i];
			if (Elem->Path == SelectedDirectory)
			{
				bEngineAlreadyKnownAbout = true;
				break;
			}
		}

		if (bEngineAlreadyKnownAbout == false)
		{
			/* Show a widget asking user if they want us to automatically locate this
			engine for next time */

			/* First remove keyboard focus - it is on the "manually locate" button.
			Without doing this user can press enter to re-open the file dialog */
			FSlateApplication::Get().ClearKeyboardFocus();

			OverlayForPopupsPtr->AddSlot(1000)
			.Padding(GetMainBorderPadding() * -1.f)
			[
				SNew(SModalWidget)
				.TextContent(FText::AsCultureInvariant(TEXT("Auto-locate engine next time?")))
				.OnNoClicked(FOnClicked::CreateSP(this, &SMyEngineBrowser::OnAskAutoLoadNoButtonClicked, EngineVersion, SelectedDirectory, bEngineAlreadyKnownAbout))
				.OnYesClicked(FOnClicked::CreateSP(this, &SMyEngineBrowser::OnAskAutoLoadYesButtonClicked, EngineVersion, SelectedDirectory, bEngineAlreadyKnownAbout))
			];
		}
		else
		{
			PostEngineManuallyLocated(SelectedDirectory, bEngineAlreadyKnownAbout);
		}
	}

	return FReply::Handled();
}

bool SMyEngineBrowser::IsValidEngineDirectory(const FString& Directory, FString* OutEngineVersion)
{
	/* Don't know why I chose this - perhaps there are better ways of knowing.
	Also you wanna try and avoid false positives so perhaps check a few other things.
	Also I don't think this file is included for versions < 4.9.
	I'm assuming that if it's a custom engine then there is no 100% sure way to know for 
	certain since people can probably delete this file if they like. For 99.9% of cases 
	this will work fine */
	const FString BuildVersionFilePath = Directory + TEXT("/Engine/Build/Build.version");
	FString FileContents;
	const bool bFileExists = FFileHelper::LoadFileToString(FileContents, *BuildVersionFilePath);
	if (bFileExists && OutEngineVersion != nullptr)
	{
		*OutEngineVersion = TEXT("Unknown");

		/* Figuring out engine version */

		TSharedPtr<FJsonObject> JsonObject = MakeShareable(new FJsonObject);
		TSharedRef<TJsonReader<>> Reader = TJsonReaderFactory<>::Create(FileContents);
		if (FJsonSerializer::Deserialize(Reader, JsonObject))
		{
			int32 MajorVersion;
			if (JsonObject->TryGetNumberField(TEXT("MajorVersion"), MajorVersion))
			{
				int32 MinorVersion;
				if (JsonObject->TryGetNumberField(TEXT("MinorVersion"), MinorVersion))
				{
					*OutEngineVersion += TEXT(" ");
					*OutEngineVersion += FString::FromInt(MajorVersion) + TEXT(".") + FString::FromInt(MinorVersion);
				}
			}
		}
	}

	return bFileExists;
}

FReply SMyEngineBrowser::OnAskAutoLoadNoButtonClicked(FString EngineVersion, FString SelectedDirectory, bool bEngineAlreadyKnownAbout)
{
	/* Remove the 'auto load next time?' widget */
	OverlayForPopupsPtr->RemoveSlot(1000);

	if (NonRememberedManuallyLocatedEngines.Contains(SelectedDirectory) == false)
	{
		NonRememberedManuallyLocatedEngines.Emplace(VeryBasicEngineInfo(EngineVersion, SelectedDirectory));
	}

	PostEngineManuallyLocated(SelectedDirectory, bEngineAlreadyKnownAbout);

	return FReply::Handled();
}

FReply SMyEngineBrowser::OnAskAutoLoadYesButtonClicked(FString EngineVersion, FString SelectedDirectory, bool bEngineAlreadyKnownAbout)
{
	/* Remove the 'auto load next time?' widget */
	OverlayForPopupsPtr->RemoveSlot(1000);

	const FString FilePath = FString(FWindowsPlatformProcess::UserSettingsDir()) + TEXT("UE4DocTool/DocToolWidgetData.json");
	FString FileContents;

	if (DocToolWidgetHelpers::AquireDocToolWidgetDataMutex())
	{
		const bool bFileExists = FFileHelper::LoadFileToString(FileContents, *FilePath);
		TSharedPtr<FJsonObject> JsonObject = MakeShareable(new FJsonObject);
		TSharedRef<TJsonReader<>> Reader = TJsonReaderFactory<>::Create(FileContents);
		if (bFileExists == false || FJsonSerializer::Deserialize(Reader, JsonObject))
		{
			TArray<TSharedPtr<FJsonValue>> Array;
			if (JsonObject->HasTypedField<EJson::Array>(TEXT("Engines to auto-load for engine browser")))
			{
				Array = JsonObject->GetArrayField(TEXT("Engines to auto-load for engine browser"));
			}

			TSharedPtr<FJsonObject> NewJsonObject = MakeShareable(new FJsonObject);
			NewJsonObject->SetStringField(TEXT("Version"), EngineVersion);
			NewJsonObject->SetStringField(TEXT("Path"), SelectedDirectory);
			Array.Emplace(MakeShareable(new FJsonValueObject(NewJsonObject)));
			JsonObject->SetArrayField(TEXT("Engines to auto-load for engine browser"), Array);

			FString UpdatedFileContents;
			TSharedRef<TJsonWriter<>> Writer = TJsonWriterFactory<>::Create(&UpdatedFileContents);
			FJsonSerializer::Serialize(JsonObject.ToSharedRef(), Writer);
			FFileHelper::SaveStringToFile(UpdatedFileContents, *FilePath);
		}

		DocToolWidgetHelpers::ReleaseDocToolWidgetDataMutex();
	}

	PostEngineManuallyLocated(SelectedDirectory, bEngineAlreadyKnownAbout);

	return FReply::Handled();
}

void SMyEngineBrowser::PostEngineManuallyLocated_InvalidEngineDirectory(const FString& SelectedDirectory)
{
	/* Show a brief window letting the user know the directory they selected is not
	an unreal engine directory */
	const FText Message = LOCTEXT("Directory not engine directory", "Directory not an engine directory");
	const bool bIsPopupAlreadyShowing = (OverlayForPopupsPtr->GetNumWidgets() > 1);
	if (bIsPopupAlreadyShowing)
	{
		TSharedRef<SPopupNotification> Popup = StaticCastSharedRef<SPopupNotification>(OverlayForPopupsPtr->GetChildren()->GetChildAt(1));
		Popup->SetMessage(Message);
		Popup->ResetDurationPostModal();
	}
	else
	{
		OverlayForPopupsPtr->AddSlot(500)
		.HAlign(HAlign_Center)
		.VAlign(VAlign_Center)
		[
			SNew(SPopupNotification)
			.TextContent(Message)
			.SolidOneOpacityDuration(2.5f)
			.FadeOutDuration(3.f)
		];
	}
}

void SMyEngineBrowser::PostEngineManuallyLocated(const FString& SelectedDirectory, bool bEngineAlreadyKnownAbout)
{
	SearchBoxPtr->SetText(FText::GetEmpty());

	if (bEngineAlreadyKnownAbout == false)
	{
		FindEngines();
	}

	/* Select engine for user since that is probably what they want */
	SelectEngine(SelectedDirectory);

	/* Show a brief window letting the user know that the filter was cleared, their
	engine was added to the list and we have selected the engine */
	const FText Message = bEngineAlreadyKnownAbout ? LOCTEXT("Engine successfully located", "Filter cleared, engine selected") : LOCTEXT("Engine successfully located", "Engine added, filter cleared, engine selected");
	const bool bIsPopupAlreadyShowing = (OverlayForPopupsPtr->GetNumWidgets() > 1);
	if (bIsPopupAlreadyShowing)
	{
		TSharedRef<SPopupNotification> Popup = StaticCastSharedRef<SPopupNotification>(OverlayForPopupsPtr->GetChildren()->GetChildAt(1));
		Popup->SetMessage(Message);
		Popup->ResetDurationPostModal();
	}
	else
	{
		OverlayForPopupsPtr->AddSlot(500)
		.HAlign(HAlign_Center)
		.VAlign(VAlign_Center)
		[
			SNew(SPopupNotification)
			.TextContent(Message)
			.SolidOneOpacityDuration(2.5f)
			.FadeOutDuration(3.f)
		];
	}
}

void SMyEngineBrowser::SelectEngine(const FString& EngineDirectory, bool bScrollEngineIntoView)
{
	for (const auto& Pair : EngineCategories)
	{
		TSharedPtr<EngineCategoryInfo> Category = Pair.Value;

		for (const auto& Engine : Category->Engines)
		{
			if (Engine->Path == EngineDirectory)
			{
				Category->EngineTileView->SetSelection(Engine);

				if (bScrollEngineIntoView)
				{
					/* Note that if Category->EngineTileView->WidgetFromItem(Engine) returns
					non-null at this time then we can actually scroll to it now,
					(do:
					SScrollBox::ScrollDescendantIntoView(Category->EngineTileView->WidgetFromItem(Engine)->AsWidget(), false)
					but if it returns null then I cannot find a way to scroll to it. I tried
					pretty hard too
					*/
				}

				return;
			}
		}
	}
}

FReply SMyEngineBrowser::OnContinueButtonClicked()
{
	return OnContinueButtonClickedDelegate.Execute(SelectedEngine);
}

bool SMyEngineBrowser::HandleContinueButtonIsEnabled() const
{
	return SelectedEngine.IsValid();
}


DocToolWidgetPageInfo SDocToolWidget_SelectCreateDocumentationTargetEnginePage::GetHistoryCrumbTrailInfo()
{
	return DocToolWidgetPageInfo(LOCTEXT("Select Create Documentation Target Engine Page Display Name", "Select Engine"), EDocToolWidgetPageType::SelectCreateDocumentationTargetEngine);
}

SDocToolWidget_SelectCreateDocumentationTargetEnginePage::SDocToolWidget_SelectCreateDocumentationTargetEnginePage()
	: DocToolWidget(nullptr)
{
}

void SDocToolWidget_SelectCreateDocumentationTargetEnginePage::Construct(const FArguments& InArgs)
{
	DocToolWidget = InArgs._DocToolWidget;

	ChildSlot
	[
		SNew(SMyEngineBrowser)
		.OnHistoryPathClicked(this, &SDocToolWidget_SelectCreateDocumentationTargetEnginePage::OnHistoryPathClicked)
		.OnGetCrumbDelimiterContent(this, &SDocToolWidget_SelectCreateDocumentationTargetEnginePage::OnGetCrumbDelimiterContent)
		.CrumbTrail({ SDocToolWidget_MainPage::GetHistoryCrumbTrailInfo(), SDocToolWidget_SelectCreateDocumentationTargetTypePage::GetHistoryCrumbTrailInfo(), SDocToolWidget_SelectCreateDocumentationTargetEnginePage::GetHistoryCrumbTrailInfo() })
		.HandleEngineItemDoubleClick(this, &SDocToolWidget_SelectCreateDocumentationTargetEnginePage::HandleEngineItemDoubleClick)
		.OnBackButtonClicked(this, &SDocToolWidget_SelectCreateDocumentationTargetEnginePage::OnBackButtonClicked)
		.OnContinueButtonClicked(this, &SDocToolWidget_SelectCreateDocumentationTargetEnginePage::OnContinueButtonClicked)
	];
}

void SDocToolWidget_SelectCreateDocumentationTargetEnginePage::OnHistoryPathClicked(const EDocToolWidgetPageType& CrumbData)
{
	DocToolWidgetHelpers::NavigateDocToolWidgetToPageForHistoryCrumbClick(DocToolWidget, CrumbData);
}

FGetDocToolWidgetCrumbMenuContent_RetValType SDocToolWidget_SelectCreateDocumentationTargetEnginePage::OnGetCrumbDelimiterContent(const EDocToolWidgetPageType& CrumbData)
{
	return SNullWidget::NullWidget;
}

void SDocToolWidget_SelectCreateDocumentationTargetEnginePage::HandleEngineItemDoubleClick(TSharedPtr<EngineInfo> DoubleClickedItem)
{
	DocToolWidget->SetCurrentViewType_CreateDocumentationTargetingEngineOptionsPage(DoubleClickedItem, nullptr);
}

FReply SDocToolWidget_SelectCreateDocumentationTargetEnginePage::OnBackButtonClicked(TSharedPtr<EngineInfo> SelectedItem)
{
	DocToolWidget->SetCurrentViewType_SelectCreateDocumentationTargetTypePage();
	return FReply::Handled();
}

FReply SDocToolWidget_SelectCreateDocumentationTargetEnginePage::OnContinueButtonClicked(TSharedPtr<EngineInfo> SelectedItem)
{
	DocToolWidget->SetCurrentViewType_CreateDocumentationTargetingEngineOptionsPage(SelectedItem, nullptr);
	return FReply::Handled();
}


DocToolWidgetPageInfo SDocToolWidget_SelectParseTargetEnginePage::GetHistoryCrumbTrailInfo()
{
	return DocToolWidgetPageInfo(LOCTEXT("Select Parse Target Engine Page Display Name", "Select Engine"), EDocToolWidgetPageType::SelectParseTargetEngine);
}

SDocToolWidget_SelectParseTargetEnginePage::SDocToolWidget_SelectParseTargetEnginePage()
	: DocToolWidget(nullptr)
{
}

void SDocToolWidget_SelectParseTargetEnginePage::Construct(const FArguments& InArgs)
{
	DocToolWidget = InArgs._DocToolWidget;

	ChildSlot
	[
		SNew(SMyEngineBrowser)
		.OnHistoryPathClicked(this, &SDocToolWidget_SelectParseTargetEnginePage::OnHistoryPathClicked)
		.OnGetCrumbDelimiterContent(this, &SDocToolWidget_SelectParseTargetEnginePage::OnGetCrumbDelimiterContent)
		.CrumbTrail({ SDocToolWidget_MainPage::GetHistoryCrumbTrailInfo(), SDocToolWidget_SelectParseTargetTypePage::GetHistoryCrumbTrailInfo(), SDocToolWidget_SelectParseTargetEnginePage::GetHistoryCrumbTrailInfo() })
		.HandleEngineItemDoubleClick(this, &SDocToolWidget_SelectParseTargetEnginePage::HandleEngineItemDoubleClick)
		.OnBackButtonClicked(this, &SDocToolWidget_SelectParseTargetEnginePage::OnBackButtonClicked)
		.OnContinueButtonClicked(this, &SDocToolWidget_SelectParseTargetEnginePage::OnContinueButtonClicked)
	];
}

void SDocToolWidget_SelectParseTargetEnginePage::OnHistoryPathClicked(const EDocToolWidgetPageType& CrumbData)
{
	DocToolWidgetHelpers::NavigateDocToolWidgetToPageForHistoryCrumbClick(DocToolWidget, CrumbData);
}

FGetDocToolWidgetCrumbMenuContent_RetValType SDocToolWidget_SelectParseTargetEnginePage::OnGetCrumbDelimiterContent(const EDocToolWidgetPageType& CrumbData)
{
	return SNullWidget::NullWidget;
}

void SDocToolWidget_SelectParseTargetEnginePage::HandleEngineItemDoubleClick(TSharedPtr<EngineInfo> DoubleClickedItem)
{
	DocToolWidget->SetCurrentViewType_ParseTargetingEngineOptionsPage(DoubleClickedItem, nullptr);
}

FReply SDocToolWidget_SelectParseTargetEnginePage::OnBackButtonClicked(TSharedPtr<EngineInfo> SelectedItem)
{
	DocToolWidget->SetCurrentViewType_SelectParseTargetTypePage();
	return FReply::Handled();
}

FReply SDocToolWidget_SelectParseTargetEnginePage::OnContinueButtonClicked(TSharedPtr<EngineInfo> SelectedItem)
{
	DocToolWidget->SetCurrentViewType_ParseTargetingEngineOptionsPage(SelectedItem, nullptr);
	return FReply::Handled();
}


SMyPopupErrorText::SMyPopupErrorText()
	: HasErrorSymbol(nullptr)
	, ErrorText(nullptr)
{
}

void SMyPopupErrorText::Construct(const FArguments& InArgs)
{
	SComboButton::Construct(SComboButton::FArguments()
		.ComboButtonStyle(FCoreStyle::Get(), TEXT("MessageLogListingComboButton"))
		.HasDownArrow(false)
		.ContentPadding(0)
		.IsFocusable(false)
		.ButtonContent()
		[
			SAssignNew(HasErrorSymbol, SErrorText)
			.Font(InArgs._Font)
		]
		.MenuPlacement(MenuPlacement_BelowAnchor)
		.MenuContent()
		[
			SAssignNew(ErrorText, SErrorText)
			.Font(InArgs._Font)
		]
	);
}

void SMyPopupErrorText::SetError(const FText& InErrorText)
{
	const bool bHasError = (InErrorText.IsEmpty() == false);

	ErrorText->SetError(InErrorText);
	HasErrorSymbol->SetError(bHasError ? LOCTEXT("Error", "!") : FText::GetEmpty());

	SetIsOpen(bHasError, false);
}

void SMyPopupErrorText::SetError(const FString& InErrorText)
{
	SetError(FText::AsCultureInvariant(InErrorText));
}

bool SMyPopupErrorText::HasError() const
{
	return ErrorText->HasError();
}

TSharedRef<SWidget> SMyPopupErrorText::AsWidget()
{
	return SharedThis(this);
}


void SResetToDefaultButton::Construct(const FArguments& InArgs)
{
	DiffersFromDefault = InArgs._DiffersFromDefault;
	OnResetToDefault = InArgs._OnResetToDefault;

	ChildSlot
	[
		SNew(SButton)
		.IsFocusable(false)
		.ToolTip(InArgs._ResetToolTip)
		.ButtonStyle(FEditorStyle::Get(), TEXT("NoBorder"))
		.ContentPadding(FMargin(4.f, 4.f, 4.f, 4.f))
		.Visibility(this, &SResetToDefaultButton::GetDiffersFromDefaultAsVisibility)
		.OnClicked(this, &SResetToDefaultButton::OnResetClicked)
		.Content()
		[
			SNew(SImage)
			.Image(FEditorStyle::GetBrush(TEXT("PropertyWindow.DiffersFromDefault")))
		]
	];
}

EVisibility SResetToDefaultButton::GetDiffersFromDefaultAsVisibility() const
{
	return DiffersFromDefault.Execute() ? EVisibility::Visible : EVisibility::Hidden;
}

FReply SResetToDefaultButton::OnResetClicked()
{
	OnResetToDefault.Execute();
	return FReply::Handled();
}


SMyDirectoryPicker::SMyDirectoryPicker()
	: EditableText(nullptr)
	, Directory(FString())
{
}

void SMyDirectoryPicker::Construct(const FArguments& InArgs)
{
	ChildSlot
	[
		SNew(SHorizontalBox)

		+ SHorizontalBox::Slot()
		.VAlign(VAlign_Center)
		[
			SAssignNew(EditableText, SEditableText)
			.OnTextChanged(this, &SMyDirectoryPicker::OnDirectoryTextChanged)
		]

		+ SHorizontalBox::Slot()
		.AutoWidth()
		[
			SNew(SButton)
			.ToolTip(DocToolWidgetToolTips::MakeGenericToolTip(DocToolWidgetToolTips::LocateOutputPathButton()))
			.Text(FText::AsCultureInvariant(TEXT("...")))
			.OnClicked(this, &SMyDirectoryPicker::OnBrowseButtonClicked)
		]
	];

	SetDirectory(InArgs._InitialDirectory);

	OnDirectoryTextChangedDelegate = InArgs._OnDirectoryTextChanged;
}

FString SMyDirectoryPicker::GetDirectory() const
{
	return Directory;
}

void SMyDirectoryPicker::SetDirectory(const FString& InDirectory)
{
	EditableText->SetText(FText::AsCultureInvariant(InDirectory));
}

void SMyDirectoryPicker::OnDirectoryTextChanged(const FText& Text)
{
	Directory = Text.ToString();

	/* Would be cool if we could detect how we got here and pass it in as a param to this 
	delegate e.g. distinguish between:
	- user typed into text box
	- user selected directory via OS directory dialog */
	OnDirectoryTextChangedDelegate.ExecuteIfBound(Text);
}

FReply SMyDirectoryPicker::OnBrowseButtonClicked()
{
	FString SelectedDirectory;
	IDesktopPlatform* DesktopPlatform = FDesktopPlatformModule::Get();
	bool bOpened = DesktopPlatform->OpenDirectoryDialog
	(
		FSlateApplication::Get().FindBestParentWindowHandleForDialogs(nullptr),
		TEXT("Select folder"),
		FString(),
		SelectedDirectory
	);

	if (bOpened)
	{
		EditableText->SetText(FText::AsCultureInvariant(SelectedDirectory));
	}

	return FReply::Handled();
}


SEditableTextWithSuggestions::SEditableTextWithSuggestions()
	: SuggestionsMenuAnchorPtr(nullptr)
	, EditableTextPtr(nullptr)
	, SuggestionsListViewPtr(nullptr)
	, AllSuggestionsArrayPtr(nullptr)
	, FilteredSuggestions(TArray<TSharedPtr<FString>>())
	, SuggestionsSort(nullptr)
	, SuggestionsHighlight(FText())
	, SelectedSuggestionIndex(INDEX_NONE)
	, bSuggestionsNeedRefreshingSometimeBeforeFocusGain(false)
	, bIgnoreOnTextChangedCallback(false)
	, bIgnoreHandleSuggestionSelectionChangedCallback(false)
	, UsersEnteredText(FText())
{
}

void SEditableTextWithSuggestions::Construct(const FArguments& InArgs)
{
	check(InArgs._Suggestions != nullptr);

	AllSuggestionsArrayPtr = InArgs._Suggestions;
	SuggestionsSort = InArgs._SuggestionsSort;

	bSuggestionsNeedRefreshingSometimeBeforeFocusGain = true;

	OnInputTextChanged = InArgs._OnInputTextChanged;

	ChildSlot
	[
		SAssignNew(SuggestionsMenuAnchorPtr, SMenuAnchor)
		.Placement(InArgs._SuggestionBoxPlacement)
		.Method(EPopupMethod::UseCurrentWindow)
		.Content()
		[
			SAssignNew(EditableTextPtr, SEditableText)
			.Text(InArgs._InitialText)
			.HintText(InArgs._EditableTextHint)
			.OnTextChanged(this, &SEditableTextWithSuggestions::OnTextChanged)
			.OnTextCommitted(this, &SEditableTextWithSuggestions::OnTextCommitted)
		]
		.MenuContent
		(
			SNew(SBorder)
			.ToolTip(SNullToolTip::NullToolTip)
			.BorderImage(FEditorStyle::GetBrush(TEXT("Menu.Background")))
			.Padding(FMargin(2))
			[
				SNew(SBox)
				.MinDesiredWidth(300.f)
				.MaxDesiredHeight(InArgs._SuggestionBoxMaxHeight)
				[
					SAssignNew(SuggestionsListViewPtr, SListView<TSharedPtr<FString>>)
					.OnGenerateRow(this, &SEditableTextWithSuggestions::MakeSuggestionListItemWidget)
					.ListItemsSource(&FilteredSuggestions)
					.OnMouseButtonClick(this, &SEditableTextWithSuggestions::HandleSuggestionClicked)
					.OnSelectionChanged(this, &SEditableTextWithSuggestions::HandleSuggestionSelectionChanged)
				]
			]
		)
	];
}

void SEditableTextWithSuggestions::OnFocusChanging(const FWeakWidgetPath& PreviousFocusPath, const FWidgetPath& NewWidgetPath, const FFocusEvent& InFocusEvent)
{
	/* Figure out whether we gained focus or lost focus. This seems to do the trick */
	const bool bGainedFocus = (NewWidgetPath.IsValid()) && (NewWidgetPath.GetLastWidget() == EditableTextPtr);
	if (bGainedFocus)
	{
		/* If there are no possible suggestions then there's no point opening the 
		suggestions box */
		if (AllSuggestionsArrayPtr->Num() > 0)
		{
			if (bSuggestionsNeedRefreshingSometimeBeforeFocusGain)
			{
				bSuggestionsNeedRefreshingSometimeBeforeFocusGain = false;

				bIgnoreHandleSuggestionSelectionChangedCallback = true;
				SelectedSuggestionIndex = INDEX_NONE;
				SuggestionsListViewPtr->ClearSelection();
				bIgnoreHandleSuggestionSelectionChangedCallback = false;

				UpdateSuggestionsWidget(EditableTextPtr->GetText(), EditableTextPtr->GetText().ToString());
			}
			else
			{
				if (FilteredSuggestions.Num() > 0)
				{
					SuggestionsMenuAnchorPtr->SetIsOpen(true, false);
				}
			}
		}
	}
	else  // We lost focus
	{
		if (NewWidgetPath.IsValid() == false || NewWidgetPath.GetLastWidget() != SuggestionsListViewPtr)
		{
			SuggestionsMenuAnchorPtr->SetIsOpen(false);
		}
	}

	return SCompoundWidget::OnFocusChanging(PreviousFocusPath, NewWidgetPath, InFocusEvent);
}

FReply SEditableTextWithSuggestions::OnPreviewKeyDown(const FGeometry& MyGeometry, const FKeyEvent& KeyEvent)
{
	if (SuggestionsMenuAnchorPtr->IsOpen())
	{
		if (KeyEvent.GetKey() == EKeys::Up || KeyEvent.GetKey() == EKeys::Down)
		{
			StepSelectedSuggestionIndex(KeyEvent.GetKey() == EKeys::Up ? -1 : +1);

			return FReply::Handled();
		}
	}

	return SCompoundWidget::OnPreviewKeyDown(MyGeometry, KeyEvent);
}

void SEditableTextWithSuggestions::UpdateSuggestionsWidget(const FText& Text, const FString& SearchString)
{
	if (SearchString.Len() == 0)
	{
		/* Show all suggestions (no filtering) */
		FilteredSuggestions = *AllSuggestionsArrayPtr;
	}
	else
	{
		FilteredSuggestions.Reset();

		for (const auto& Elem : *AllSuggestionsArrayPtr)
		{
			/* Very basic filter */
			if (Elem->Contains(*SearchString))
			{
				FilteredSuggestions.Emplace(Elem);
			}
		}
	}

	if (FilteredSuggestions.Num() > 0)
	{
		if (SuggestionsSort != nullptr)
		{
			FilteredSuggestions.Sort(SuggestionsSort);
		}

		SuggestionsListViewPtr->RequestListRefresh();

		SuggestionsHighlight = Text;
	
		SuggestionsMenuAnchorPtr->SetIsOpen(true, false);
	}
	else
	{
		SuggestionsMenuAnchorPtr->SetIsOpen(false);
	}

	UsersEnteredText = Text;
}

void SEditableTextWithSuggestions::StepSelectedSuggestionIndex(int32 StepAmount)
{
	/* Where the suggestions anchor is positioned relative to the editable textbox.
	There might be a better way to figure this out */
	const bool bIsSuggestionsBoxAbove = (GetCachedGeometry().AbsolutePosition.Y > SuggestionsMenuAnchorPtr->GetMenuPosition().Y);

	if (bIsSuggestionsBoxAbove)
	{
		SelectedSuggestionIndex = (SelectedSuggestionIndex == INDEX_NONE) ? FilteredSuggestions.Num() + StepAmount : SelectedSuggestionIndex + StepAmount;
		if (SelectedSuggestionIndex < 0)
		{
			SelectedSuggestionIndex = 0;
		}
		else if (SelectedSuggestionIndex >= FilteredSuggestions.Num())
		{
			SelectedSuggestionIndex = INDEX_NONE;
		}
	}
	else
	{
		SelectedSuggestionIndex += StepAmount;
		if (SelectedSuggestionIndex < 0)
		{
			SelectedSuggestionIndex = INDEX_NONE;
		}
		else if (SelectedSuggestionIndex >= FilteredSuggestions.Num())
		{
			SelectedSuggestionIndex = FilteredSuggestions.Num() - 1;
		}
	}

	if (SelectedSuggestionIndex != INDEX_NONE)
	{
		SuggestionsListViewPtr->SetSelection(FilteredSuggestions[SelectedSuggestionIndex]);
		SuggestionsListViewPtr->RequestScrollIntoView(FilteredSuggestions[SelectedSuggestionIndex]);
	}
	else
	{
		SuggestionsListViewPtr->ClearSelection();
	}
}

void SEditableTextWithSuggestions::OnTextChanged(const FText& NewText)
{
	OnInputTextChanged.Execute(NewText);

	if (bIgnoreOnTextChangedCallback)
	{
		return;
	}

	if (AllSuggestionsArrayPtr->Num() > 0)
	{
		const FString NewTextString = NewText.ToString();
		UpdateSuggestionsWidget(NewText, NewTextString);

		if (SelectedSuggestionIndex != INDEX_NONE)
		{
			/* As a result of typing/pasting the highlighted suggestion may no longer be
			visible. If so then de-select it so when it re-appears it won't have any
			possibility of being selected */
			SelectedSuggestionIndex = FilteredSuggestions.IndexOfByPredicate([&](const TSharedPtr<FString>& InSuggestion)
			{
				return NewTextString == *InSuggestion;
			});

			if (SelectedSuggestionIndex == INDEX_NONE)
			{
				bIgnoreHandleSuggestionSelectionChangedCallback = true;
				SuggestionsListViewPtr->ClearSelection();
				bIgnoreHandleSuggestionSelectionChangedCallback = false;
			}
		}

		bSuggestionsNeedRefreshingSometimeBeforeFocusGain = false;
	}
}

void SEditableTextWithSuggestions::OnTextCommitted(const FText& Text, ETextCommit::Type CommitType)
{
}

TSharedRef<ITableRow> SEditableTextWithSuggestions::MakeSuggestionListItemWidget(TSharedPtr<FString> Message, const TSharedRef<STableViewBase>& OwnerTable)
{
	return

		SNew(STableRow<TSharedPtr<FString>>, OwnerTable)
		[
			SNew(STextBlock)
			.Text(FText::AsCultureInvariant(*Message))
			/* Interesting... SConsoleInputBox seems to get away with just using a variable 
			here while SAssetSearchBox uses a function. */
			.HighlightText(this, &SEditableTextWithSuggestions::HandleSuggestionHighlightText)
			.Margin(FMargin(0.f, 4.f))
		];
}

void SEditableTextWithSuggestions::HandleSuggestionClicked(TSharedPtr<FString> ClickedItem)
{
	if (SuggestionsListViewPtr->GetSelectedItems()[0] == ClickedItem)
	{
		/* Handle the case where you click on what is already selected (by already 
		selected I mean it has the solid light grey almost white highlight) and 
		HandleSuggestionSelectionChanged doesn't get called */
		HandleSuggestionSelectionChanged(ClickedItem, ESelectInfo::OnMouseClick);
	}
}

void SEditableTextWithSuggestions::HandleSuggestionSelectionChanged(TSharedPtr<FString> NewValue, ESelectInfo::Type SelectInfo)
{
	if (bIgnoreHandleSuggestionSelectionChangedCallback)
	{
		return;
	}

	bIgnoreOnTextChangedCallback = true;
	if (NewValue.IsValid())
	{
		EditableTextPtr->SetText(FText::AsCultureInvariant(*NewValue));
		bSuggestionsNeedRefreshingSometimeBeforeFocusGain = true;
	}
	else  // No suggestion selected
	{
		/* Restore editable text to what the user entered themselves */
		EditableTextPtr->SetText(UsersEnteredText);
	}
	bIgnoreOnTextChangedCallback = false;

	if (SelectInfo == ESelectInfo::OnMouseClick)
	{
		SuggestionsMenuAnchorPtr->SetIsOpen(false);
	}
}

void SEditableTextWithSuggestions::NotifyOfSuggestionsUpdated()
{
	/* Don't actually need to do anything - next time user changes text new suggestions 
	will be used. */
}

void SEditableTextWithSuggestions::SetInputTextBoxText(const FText& Text)
{
	const bool bHasFocus = HasKeyboardFocus();
	if (bHasFocus)
	{
		UE_LOG(DOCLOG, Warning, TEXT("SEditableTextWithSuggestions::SetTextBoxText unimplemented branch"));
	
		/* I cbf implementing this since I don't ever need it, and testing if it works 
		will require setting up a timer. 
		Just EditableTextPtr->SetText(Text); might be enough */
	}
	else
	{
		bIgnoreOnTextChangedCallback = true;
		EditableTextPtr->SetText(Text);
		bIgnoreOnTextChangedCallback = false;

		bSuggestionsNeedRefreshingSometimeBeforeFocusGain = true;
	}
}


const TSharedRef<SNullToolTip::SNullToolTipActual> SNullToolTip::NullToolTip = SNew(SNullToolTip::SNullToolTipActual).Visibility(EVisibility::Collapsed);


FString FunctionLocatingHelpers::GetOnDocToolProgressDelegatePathName()
{
	/* Note: If the name changes you will need to come here and change this. */
	return TEXT("/Script/") + FString(DOC_TOOL_MODULE_NAME) + TEXT(".OnDocToolProgress_Dynamic") + FString(HEADER_GENERATED_DELEGATE_SIGNATURE_SUFFIX);
}

const UDelegateFunction* FunctionLocatingHelpers::GetOnDocToolProgressDelegate()
{
	/* For performance using a function local static because FindObject looks kinda slow */
	static const UDelegateFunction* Pointer = FindObject<UDelegateFunction>(nullptr, *GetOnDocToolProgressDelegatePathName(), true);
	return Pointer;
}

FString FunctionLocatingHelpers::GetOnDocToolStoppedDelegatePathName()
{
	/* Note: If the name changes you will need to come here and change this. */
	return TEXT("/Script/DocumentationTool.OnDocToolStopped_Dynamic") + FString(HEADER_GENERATED_DELEGATE_SIGNATURE_SUFFIX);
}

const UDelegateFunction* FunctionLocatingHelpers::GetOnDocToolStoppedDelegate()
{
	/* For performance using a function local static because FindObject looks kinda slow */
	static const UDelegateFunction* Pointer = FindObject<UDelegateFunction>(nullptr, *GetOnDocToolStoppedDelegatePathName(), true);
	return Pointer;
}

void FunctionLocatingHelpers::GetFunctionsWithSignaturesFromCPPClasses(
	const FunctionSignatures& DesiredFunctionSignatures,
	EFunctionFlags FlagsRequirement,
	const RetVal& OutFunctions)
{
	/* I wrote this with UE4.23. Async object iteration was not a thing at that time. 
	In 4.27 TObjectIterator supports being able to be run on the non-game thread.
	Here in 4.23 FUObjectArray::ObjObjectsCritical *might* be the lock you need to 
	obtain in order to iterate on non-game thread, but it is private */

	ForEachObjectOfClass(UClass::StaticClass(),
		[&](UObject* Object)
	{
		const UClass* Class = static_cast<UClass*>(Object);
	
		for (TFieldIterator<UFunction> FuncIter(Class, EFieldIteratorFlags::ExcludeSuper, EFieldIteratorFlags::IncludeDeprecated, EFieldIteratorFlags::ExcludeInterfaces); FuncIter; ++FuncIter)
		{
			const UFunction* Function = *FuncIter;
	
			if (Function->HasAllFunctionFlags(FlagsRequirement))
			{
				for (int32 i = 0; i < DesiredFunctionSignatures.GetSignatures().Num(); ++i)
				{
					const UFunction* Signature = DesiredFunctionSignatures.GetSignatures()[i];
					if (IsCPPFunctionSuitableForDynamicDelegate(Function, Signature))
					{
						OutFunctions.GetArrays()[i]->Emplace(MakeShareable(new FString(Class->GetPathName() + TEXT("::") + Function->GetName())));
					}
				}
			}
		}
	}
	, false, RF_ClassDefaultObject, EInternalObjectFlags::None);
}

void FunctionLocatingHelpers::GetFunctionsWithSignaturesFromBlueprintAssets(
	const FunctionSignatures& DesiredFunctionSignatures,
	EFunctionFlags FlagsRequirement,
	const RetVal& OutFunctions,
	const TArray<FName>& PackagePaths)
{
	FAssetRegistryModule& AssetRegistryModule = FModuleManager::LoadModuleChecked<FAssetRegistryModule>(FName(TEXT("AssetRegistry")));
	IAssetRegistry& AssetRegistry = AssetRegistryModule.Get();

	/* You might not care about this warning if you did AssetRegistry.ScanPathsSynchronous
	before calling this func */
	UE_CLOG(AssetRegistry.IsLoadingAssets(), DOCLOG, Warning,
		TEXT("Calling GetFunctionsFromBlueprintAssetsWithSignature before asset registry "
			"has completed it\'s initial scan. \nThis might therefore return nothing. \n"
			"Consider doing if (AssetRegistry.IsLoadingAssets()) AssetRegistry.OnFilesLoaded().Add(...)"));

	FARFilter Filter;
	Filter.ClassNames.Emplace(UBlueprint::StaticClass()->GetFName());
	Filter.bRecursiveClasses = true;
	Filter.PackagePaths = PackagePaths;
	Filter.bRecursivePaths = true;
	TArray<FAssetData> AssetData;
	AssetData.Reserve(512);
	AssetRegistry.GetAssets(Filter, AssetData);

	for (const auto& Elem : AssetData)
	{
		const UBlueprint* Blueprint = CastChecked<UBlueprint>(Elem.GetAsset());

		GetFunctionsWithSignaturesFromBlueprintAsset(Blueprint, DesiredFunctionSignatures, FlagsRequirement, OutFunctions);
	}
}

void FunctionLocatingHelpers::GetFunctionsWithSignaturesFromBlueprintAsset(
	const UBlueprint* Blueprint,
	const FunctionSignatures& DesiredFunctionSignatures,
	EFunctionFlags FlagsRequirement,
	const RetVal& OutFunctions)
{
	for (const auto& EventGraph : Blueprint->UbergraphPages)
	{
		for (const auto& Node : EventGraph->Nodes)
		{
			UK2Node_Event* EventNode = Cast<UK2Node_Event>(Node);
			if (EventNode != nullptr)
			{
				const UFunction* Function = EventNode->FindEventSignatureFunction();
				
				if (Function != nullptr)
				{
					if (Function->HasAllFunctionFlags(FlagsRequirement))
					{
						for (int32 i = 0; i < DesiredFunctionSignatures.GetSignatures().Num(); ++i)
						{
							const UFunction* Signature = DesiredFunctionSignatures.GetSignatures()[i];
							if (IsBlueprintAssetFunctionSuitableForDynamicDelegate(Function, Signature, 0))
							{
								OutFunctions.GetArrays()[i]->Emplace(MakeShareable(new FString(Blueprint->GetPathName() + TEXT("::") + Function->GetName())));
							}
						}
					}
				}
				else
				{
					/* @todo Function will be null if it is a custom event. I can't be bothered
					right now trying to find out how to get the UFunction pointer in that
					case. Look in BlueprintAssetEvent ctor for ideas maybe */
				}
			}
		}
	}

	/* Blueprint function libraries add an extra __WorldContext parameter. I'm gonna 
	ignore it */
	const uint8 NumParamsToIgnore = (Blueprint->BlueprintType == BPTYPE_FunctionLibrary) ? 1 : 0;
	for (const auto& Graph : Blueprint->FunctionGraphs)
	{
		const UK2Node_FunctionEntry* EntryNode = CastChecked<UK2Node_FunctionEntry>(Graph->Nodes[0]);
		const UFunction* Function = EntryNode->FindSignatureFunction();

		if (Function->HasAllFunctionFlags(FlagsRequirement))
		{
			for (int32 i = 0; i < DesiredFunctionSignatures.GetSignatures().Num(); ++i)
			{
				const UFunction* Signature = DesiredFunctionSignatures.GetSignatures()[i];
				if (IsBlueprintAssetFunctionSuitableForDynamicDelegate(Function, Signature, NumParamsToIgnore))
				{
					OutFunctions.GetArrays()[i]->Emplace(MakeShareable(new FString(Blueprint->GetPathName() + TEXT("::") + Function->GetName())));
				}
			}
		}
	}
}

bool FunctionLocatingHelpers::IsCPPFunctionSuitableForDynamicDelegate(
	const UFunction* FunctionToTest, 
	const UFunction* Delegate)
{
	/* Another function to look at: AreFunctionSignaturesEqual located in HeaderParser.cpp 
	(doesn't actually get called anywhere in code which is a little worrying). */

	return FunctionToTest->IsSignatureCompatibleWith(Delegate);
}

bool FunctionLocatingHelpers::IsBlueprintAssetFunctionSuitableForDynamicDelegate(
	const UFunction* FunctionToTest,
	const UFunction* Delegate,
	uint8 NumParamsOnEndToIgnore)
{
	/* Implemented quite quickly */

	struct Helpers
	{
		/* Copy of FStructUtils::ArePropertiesTheSame */
		static bool ArePropertiesTheSame(const UProperty* A, const UProperty* B, bool bCheckPropertiesNames)
		{
			if (A == B)
			{
				return true;
			}

			if (A == nullptr || B == nullptr)
			{
				return false;
			}

			if (bCheckPropertiesNames && (A->GetFName() != B->GetFName()))
			{
				return false;
			}

			if (A->GetSize() != B->GetSize())
			{
				return false;
			}

			if (A->GetOffset_ForGC() != B->GetOffset_ForGC())
			{
				return false;
			}

			if (A->SameType(B) == false)
			{
				return false;
			}

			return true;
		}
	};

	const uint64 IgnoreFlags = UFunction::GetDefaultIgnoredSignatureCompatibilityFlags();

	check(NumParamsOnEndToIgnore <= FunctionToTest->NumParms);

	const int32 NumParamsWeCareAboutOnFunctionToTest = FunctionToTest->NumParms - NumParamsOnEndToIgnore;
	
	/* Check function has correct number of params */
	if (NumParamsWeCareAboutOnFunctionToTest == Delegate->NumParms)
	{
		if (Delegate->NumParms == 0)
		{
			return true;
		}
	
		TFieldIterator<UProperty> IteratorA(Delegate, EFieldIteratorFlags::ExcludeSuper, EFieldIteratorFlags::IncludeDeprecated, EFieldIteratorFlags::ExcludeInterfaces);
		TFieldIterator<UProperty> IteratorB(FunctionToTest, EFieldIteratorFlags::ExcludeSuper, EFieldIteratorFlags::IncludeDeprecated, EFieldIteratorFlags::ExcludeInterfaces);

		while (IteratorA && (IteratorA->PropertyFlags & CPF_Parm))
		{
			if (IteratorB && (IteratorB->PropertyFlags & CPF_Parm))
			{
				const UProperty* PropA = *IteratorA;
				const UProperty* PropB = *IteratorB;

				const uint64 PropertyMash = PropA->PropertyFlags ^ PropB->PropertyFlags;
				if (((PropertyMash & ~IgnoreFlags) != 0) || Helpers::ArePropertiesTheSame(PropA, PropB, false) == false)
				{
					return false;
				}
			}
			
			++IteratorA;
			++IteratorB;
		}

		return true;
	}
	else
	{
		return false;
	}
}


SMainTaskOptionsCategory::SMainTaskOptionsCategory()
	: SlotIndex(INDEX_NONE)
	, ContentWidget(nullptr)
	, ExpandAndCollapseCurveSequence(FCurveSequence())
{
}

void SMainTaskOptionsCategory::Construct(const FArguments& InArgs)
{
	SlotIndex = InArgs._SlotIndex;
	ContentWidget = InArgs._Content.Widget;

	ExpandAndCollapseCurveSequence.AddCurve(0.f, 1.f, ECurveEaseFunction::QuadInOut);
	SetCanTick(false);

	ChildSlot
	[
		SNew(SVerticalBox)

		+ SVerticalBox::Slot()
		.AutoHeight()
		[
			SNew(SHorizontalBox)

			+ SHorizontalBox::Slot()
			.AutoWidth()
			[
				SNew(STextBlock)
				.Text(InArgs._Title)
				.TextStyle(FDocToolStyle::Get(), TEXT("SMainTaskOptionsCategory.Title"))
			]
			
			+ SHorizontalBox::Slot()
			.HAlign(HAlign_Right)
			.Padding(FMargin(0.f, 0.f, 20.f, 0.f))
			[
				/* Quick note here: what you are trying to do here is have the plus/minus 
				symbol be in the center of the button. As far as I'm aware this is 
				not possible to be exact (because in the font I have chosen I think 
				the plus/minus symbols aren't centered vertically). However you can guess it 
				using ContentPadding which is what I have done. A better solution is 
				to use an image which is centered instead of text. I found a set in 
				/Engine/Content called "MinusSymbol_12x" and "PlusSymbol_12x". Haven't 
				tried them though */
				SNew(SBox)
				.WidthOverride(50.f)
				.HeightOverride(40.f)
				[
					SNew(SButton)
					.TextStyle(FDocToolStyle::Get(), TEXT("SMainTaskOptionsCategory.Title"))
					.HAlign(HAlign_Center)
					.VAlign(VAlign_Center)
					.ContentPadding(FMargin(3.f, 2.f, 3.f, 9.f))
					.Text(this, &SMainTaskOptionsCategory::HandleExpandAndCollapseButtonText)
					.OnClicked(this, &SMainTaskOptionsCategory::OnExpandAndCollapseButtonClicked)
					.ForegroundColor(FLinearColor::White)
				]
			]
		]
		
		+ SVerticalBox::Slot()
		.AutoHeight()
		[
			ContentWidget.ToSharedRef()
		]
	];
}

/** 
 *	Notes about this function: 
 *	
 *	- You can't forward declare nested classes in C++ (looking at SBoxPanel::FSlot), so to avoid 
 *	#include "SBoxPanel.h" in the header I have declared this function here instead. 
 *	
 *	- It assumes the parent's GetChildren() will point to a TPanelChildren<SBoxPanel::FSlot>.
 *	It makes use of TPanelChildren<T>::operator[] (which is public) to get the widget's slot. 
 *	
 *	- I am aware SVerticalBox::Slot() will also return you the slot, but I still wanna avoid 
 *	#include "SBoxPanel.h" in the header, so I wouldn't be able to actually store it. I guess
 *	I could store it as a void* in the header and cast it here as a workaround.
 */
static SBoxPanel::FSlot& GetOurSlot(SMainTaskOptionsCategory* This, int32 SlotIndex)
{
	/* Check parent is a vertical box (actually, any TPanelChildren<SBoxPanel::FSlot> 
	widget is fine) */
	static const FName ParentsType(TEXT("SVerticalBox"));
	check(This->GetParentWidget()->GetType() == ParentsType);

	TPanelChildren<SBoxPanel::FSlot>* ParentsChildren = static_cast<TPanelChildren<SBoxPanel::FSlot>*>(This->GetParentWidget()->GetChildren());
	return (*ParentsChildren)[SlotIndex];
}

void SMainTaskOptionsCategory::Tick(const FGeometry& AllottedGeometry, const double InCurrentTime, const float InDeltaTime)
{
	SBoxPanel::FSlot& OurSlot = GetOurSlot(this, SlotIndex);

	if (ExpandAndCollapseCurveSequence.IsPlaying())
	{
		const float Lerp = ExpandAndCollapseCurveSequence.GetLerp();

		OurSlot.MaxSize = GetDesiredSize().Y - (ContentWidget->GetDesiredSize().Y * Lerp);
		ContentWidget->SetRenderTransform(FSlateRenderTransform(FScale2D(1.f, 1.f - Lerp)));
	}
	else
	{
		// The animation is complete, so just make sure the target transform is reached.
		if (ExpandAndCollapseCurveSequence.IsForward())
		{
			OurSlot.MaxSize = GetDesiredSize().Y - ContentWidget->GetDesiredSize().Y;
			ContentWidget->SetRenderTransform(FSlateRenderTransform(FScale2D(1.f, 0.f)));
		}
		else
		{
			OurSlot.MaxSize = 0.f;  // 0 means "no limit"
			ContentWidget->SetRenderTransform(FSlateRenderTransform(FScale2D(1.f, 1.f)));
		}

		SetCanTick(false);
	}
}

FText SMainTaskOptionsCategory::HandleExpandAndCollapseButtonText() const
{
	if (ExpandAndCollapseCurveSequence.IsForward())
	{
		return FText::AsCultureInvariant(TEXT("+"));
	}
	else
	{
		return FText::AsCultureInvariant(TEXT("-"));
	}
}

FReply SMainTaskOptionsCategory::OnExpandAndCollapseButtonClicked()
{
	// Start Animation
	SetCanTick(true);
	if (ExpandAndCollapseCurveSequence.IsPlaying())
	{
		ExpandAndCollapseCurveSequence.Reverse();
	}
	else if (ExpandAndCollapseCurveSequence.IsForward())
	{
		ExpandAndCollapseCurveSequence.PlayReverse(AsShared());
	}
	else
	{
		ExpandAndCollapseCurveSequence.Play(AsShared());
	}

	return FReply::Handled();
}


SMainTaskOptions::SMainTaskOptions()
	: MainTaskType(EMainTaskType::Unknown)
	, TargetProject(nullptr)
	, TargetPlugin(nullptr)
	, TargetEngine(nullptr)
	, DocToolPredictedValues(PredictedValues())
	, NonEngineTargetDisplayNameErrorBorderPtr(nullptr)
	, NonEngineTargetDisplayNameTextPtr(nullptr)
	, NonEngineTargetDisplayNameErrorTextPtr(nullptr)
	, OutputPathErrorBorderPtr(nullptr)
	, OutputPathDirectoryPickerPtr(nullptr)
	, OutputPathErrorTextPtr(nullptr)
	, RunOnSeparateProcessCheckBoxPtr(nullptr)
	, ReportProgressToNotificationWidgetCheckBoxPtr(nullptr)
	, ReportProgressToLogCheckBoxPtr(nullptr)
	, ProgressDelegateErrorBorderPtr(nullptr)
	, ProgressDelegateInputPtr(nullptr)
	, ProgressDelegateErrorTextPtr(nullptr)
	, StoppedDelegateErrorBorderPtr(nullptr)
	, StoppedDelegateInputPtr(nullptr)
	, StoppedDelegateErrorTextPtr(nullptr)
	, NumThreadsBoxPtr(nullptr)
	, NumThreadsBoxValue(TOptional<int32>())
	, OverlayForPopupsPtr(nullptr)
	, ProgressDelegateSuggestions(TArray<TSharedPtr<FString>>())
	, StoppedDelegateSuggestions(TArray<TSharedPtr<FString>>())
{
}

void SMainTaskOptions::Construct(const FArguments& InArgs)
{
	MainTaskType = InArgs._MainTaskType;
	TargetProject = InArgs._TargetProject;
	TargetPlugin = InArgs._TargetPlugin;
	TargetEngine = InArgs._TargetEngine;

	if (IsTargetingProject())
	{
		DocToolPredictedValues = PredictedValues(TargetProject);
	}
	else if (IsTargetingPlugin())
	{
		DocToolPredictedValues = PredictedValues(TargetPlugin);
	}
	else  // Assumed engine
	{
		check(IsTargetingEngine());
		DocToolPredictedValues = PredictedValues(TargetEngine);
	}
	
	/* Set the opening value for each widget. Some of these values don't need to be calculated 
	if the widget isn't created (e.g. NonEngineTargetDisplayNameStartingValue doesn't need
	to be calculated if we're not creating the non engine target display name widget) but for 
	simplicity I've just calculated all of them now */
	FText NonEngineTargetDisplayNameStartingValue;
	FString OutputPathStartingValue;
	bool RunOnSeparateProcessStartingValue;
	bool ReportProgressToNotificationWidgetStartingValue;
	bool ReportProgressToLogStartingValue;
	FText ProgressDelegateStartingValue;
	FText StoppedDelegateStartingValue;
	int32 NumThreadsBoxValueStartingValue;
	if (InArgs._OriginalValues != nullptr)
	{
		NonEngineTargetDisplayNameStartingValue			= InArgs._OriginalValues->NonEngineTargetDisplayName.Get(DefaultValues::NonEngineTargetDisplayName(DocToolPredictedValues));
		OutputPathStartingValue							= InArgs._OriginalValues->OutputPath.Get(DefaultValues::OutputPath(DocToolPredictedValues));
		RunOnSeparateProcessStartingValue				= InArgs._OriginalValues->bRunOnSeparateProcess.Get(DefaultValues::RunOnSeparateProcess());
		ReportProgressToNotificationWidgetStartingValue = InArgs._OriginalValues->bReportProgressToNotificationWidget.Get(DefaultValues::ReportProgressToNotificationWidget());
		ReportProgressToLogStartingValue				= InArgs._OriginalValues->bReportProgressToLog.Get(DefaultValues::ReportProgressToLog());
		ProgressDelegateStartingValue					= InArgs._OriginalValues->ProgressDelegate.Get(DefaultValues::ProgressDelegate());
		StoppedDelegateStartingValue					= InArgs._OriginalValues->StoppedDelegate.Get(DefaultValues::StoppedDelegate());
		NumThreadsBoxValueStartingValue					= InArgs._OriginalValues->NumThreads.Get(DefaultValues::NumberOfThreads(DocToolPredictedValues));
	}
	else  // No values specified. Use defaults
	{
		NonEngineTargetDisplayNameStartingValue			= DefaultValues::NonEngineTargetDisplayName(DocToolPredictedValues);
		OutputPathStartingValue							= DefaultValues::OutputPath(DocToolPredictedValues);
		RunOnSeparateProcessStartingValue				= DefaultValues::RunOnSeparateProcess();
		ReportProgressToNotificationWidgetStartingValue = DefaultValues::ReportProgressToNotificationWidget();
		ReportProgressToLogStartingValue				= DefaultValues::ReportProgressToLog();
		ProgressDelegateStartingValue					= DefaultValues::ProgressDelegate();
		StoppedDelegateStartingValue					= DefaultValues::StoppedDelegate();
		NumThreadsBoxValueStartingValue					= DefaultValues::NumberOfThreads(DocToolPredictedValues);
	}

	NumThreadsBoxValue = NumThreadsBoxValueStartingValue;

	//-----------------------------------------------------------------------------------
	//	Delegate text input suggestions

	CreateDocToolDelegateSuggestionsFromCPPClasses();

	FAssetRegistryModule& AssetRegistryModule = FModuleManager::LoadModuleChecked<FAssetRegistryModule>(FName(TEXT("AssetRegistry")));
	IAssetRegistry& AssetRegistry = AssetRegistryModule.Get();
	if (AssetRegistry.IsLoadingAssets())
	{
		AssetRegistry.OnFilesLoaded().AddSP(this, &SMainTaskOptions::OnAssetRegistryInitialSearchComplete);
	}
	else
	{
		CreateDocToolDelegateSuggestionsFromBlueprintAssets();

		HookIntoEventsForSuggestionsFromBlueprintAssets();
	}

	SortDocToolDelegateSuggestions();

	//-----------------------------------------------------------------------------------

	TSharedRef<SVerticalBox> CategoriesVBox = SNew(SVerticalBox);
	{
		// Populating CategoriesVBox

		int32 SlotIndex = 0;

		const bool bAddNonEngineTargetDisplayNameText = (MainTaskType == EMainTaskType::Documentation) && (IsTargetingProject() || IsTargetingPlugin());
		const bool bAddOutputPathText = (MainTaskType == EMainTaskType::Documentation) && (IsTargetingProject() || IsTargetingPlugin());
		const bool bAddRunOnSeparateProcessCheckbox = true;
		const bool bAddGeneralOptions = bAddNonEngineTargetDisplayNameText | bAddOutputPathText | bAddRunOnSeparateProcessCheckbox;
		if (bAddGeneralOptions)
		{
			TSharedRef<SVerticalBox> GeneralOptionsVBox = SNew(SVerticalBox);

			struct Helpers
			{
				static void AddInterOptionSpacer(TSharedRef<SVerticalBox> VBox)
				{
					VBox->AddSlot()
					.AutoHeight()
					[
						SNew(SSpacer)
						.Size((VBox->GetChildren()->Num() > 0) ? GetSpacerBetweenOptionsSize() : GetSpacerBetweenOptionsSize() / 2.f)
					];
				}
			};

			if (bAddNonEngineTargetDisplayNameText)
			{
				Helpers::AddInterOptionSpacer(GeneralOptionsVBox);

				// Non-engine target display name
				GeneralOptionsVBox->AddSlot()
				.AutoHeight()
				[
					SNew(SVerticalBox)

					+ SVerticalBox::Slot()
					.AutoHeight()
					[
						SAssignNew(NonEngineTargetDisplayNameErrorBorderPtr, SBorder)
						.Padding(6)
						.BorderImage(FEditorStyle::GetBrush(TEXT("ContentBrowser.TileViewTooltip.ContentBorder")))
						.BorderBackgroundColor(DocToolWidgetConstants::GetTextEntryBackgroundColor())
						[
							SNew(SHorizontalBox)

							+ SHorizontalBox::Slot()
							[
								SNew(SHorizontalBox)
								.ToolTip(DocToolWidgetToolTips::MakeGenericToolTip(DocToolWidgetToolTips::NonEngineTargetDisplayName(IsTargetingProject())))

								+ SHorizontalBox::Slot()
								.AutoWidth()
								[
									SNew(STextBlock)
									.Text(IsTargetingProject() ? LOCTEXT("Project Display Name: ", "Project Display Name: ") : LOCTEXT("Plugin Display Name: ", "Plugin Display Name: "))
									.TextStyle(FDocToolStyle::Get(), TEXT("SMainTaskOptions.OptionHeading"))
								]

								+ SHorizontalBox::Slot()
								.VAlign(VAlign_Center)
								[
									SAssignNew(NonEngineTargetDisplayNameTextPtr, SEditableText)
									.Text(NonEngineTargetDisplayNameStartingValue)
									.OnTextChanged(this, &SMainTaskOptions::OnNonEngineTargetDisplayNameTextChanged)
								]
							]

							// Reset to default button
							+ SHorizontalBox::Slot()
							.AutoWidth()
							.Padding(FMargin(2.f))
							.VAlign(VAlign_Center)
							[
								SNew(SResetToDefaultButton)
								.ResetToolTip(DocToolWidgetToolTips::MakeGenericToolTip(DocToolWidgetToolTips::ResetToDefault(DefaultValues::NonEngineTargetDisplayName(DocToolPredictedValues))))
								.DiffersFromDefault(this, &SMainTaskOptions::GetNonEngineTargetDisplayNameDiffersFromDefaultValue)
								.OnResetToDefault(this, &SMainTaskOptions::ResetNonEngineTargetDisplayNameToDefaultValue)
							]
						]
					]

					// Error text
					+ SVerticalBox::Slot()
					[
						SAssignNew(NonEngineTargetDisplayNameErrorTextPtr, STextBlock)
						.Visibility(EVisibility::Collapsed)
						.ColorAndOpacity(DocToolWidgetConstants::GetErrorColor())
						.Margin(FMargin(6))
					]
				];
			}

			if (bAddOutputPathText)
			{ 
				Helpers::AddInterOptionSpacer(GeneralOptionsVBox);

				// Output path
				GeneralOptionsVBox->AddSlot()
				.AutoHeight()
				[
					SNew(SVerticalBox)

					+ SVerticalBox::Slot()
					.AutoHeight()
					[
						SAssignNew(OutputPathErrorBorderPtr, SBorder)
						.Padding(6)
						.BorderImage(FEditorStyle::GetBrush(TEXT("ContentBrowser.TileViewTooltip.ContentBorder")))
						.BorderBackgroundColor(DocToolWidgetConstants::GetTextEntryBackgroundColor())
						[
							SNew(SHorizontalBox)

							+ SHorizontalBox::Slot()
							[
								SNew(SHorizontalBox)
								.ToolTip(DocToolWidgetToolTips::MakeGenericToolTip(DocToolWidgetToolTips::OutputPath()))

								+ SHorizontalBox::Slot()
								.AutoWidth()
								.VAlign(VAlign_Center)
								[
									SNew(STextBlock)
									.Text(LOCTEXT("Output Path: ", "Output Path: "))
									.TextStyle(FDocToolStyle::Get(), TEXT("SMainTaskOptions.OptionHeading"))
								]

								+ SHorizontalBox::Slot()
								[
									SAssignNew(OutputPathDirectoryPickerPtr, SMyDirectoryPicker)
									.InitialDirectory(OutputPathStartingValue)
									.OnDirectoryTextChanged(this, &SMainTaskOptions::OnOutputPathDirectoryPickerTextChanged)
								]
							]

							// Reset to default button
							+ SHorizontalBox::Slot()
							.AutoWidth()
							.Padding(FMargin(2.f))
							.VAlign(VAlign_Center)
							[
								SNew(SResetToDefaultButton)
								.ResetToolTip(DocToolWidgetToolTips::MakeGenericToolTip(DocToolWidgetToolTips::ResetToDefault(DefaultValues::OutputPath(DocToolPredictedValues))))
								.DiffersFromDefault(this, &SMainTaskOptions::GetOutputPathDiffersFromDefaultValue)
								.OnResetToDefault(this, &SMainTaskOptions::ResetOutputPathToDefaultValue)
							]
						]
					]

					// Error text
					+ SVerticalBox::Slot()
					[
						SAssignNew(OutputPathErrorTextPtr, STextBlock)
						.Visibility(EVisibility::Collapsed)
						.ColorAndOpacity(DocToolWidgetConstants::GetErrorColor())
						.Margin(FMargin(6))
					]
				];
			}

			if (bAddRunOnSeparateProcessCheckbox)
			{
				Helpers::AddInterOptionSpacer(GeneralOptionsVBox);

				GeneralOptionsVBox->AddSlot()
				.AutoHeight()
				[
					SNew(SBorder)
					.Padding(6)
					.BorderImage(FEditorStyle::GetBrush(TEXT("ContentBrowser.TileViewTooltip.ContentBorder")))
					.BorderBackgroundColor(DocToolWidgetConstants::GetTextEntryBackgroundColor())
					[
						SNew(SHorizontalBox)

						+ SHorizontalBox::Slot()
						[
							SNew(SHorizontalBox)
							.ToolTip(DocToolWidgetToolTips::MakeGenericToolTip(DocToolWidgetToolTips::RunOnSeparateProcess()))

							+ SHorizontalBox::Slot()
							.AutoWidth()
							.VAlign(VAlign_Center)
							[
								SNew(STextBlock)
								.Text(LOCTEXT("Run on Separate Process: ", "Run on Separate Process: "))
								.TextStyle(FDocToolStyle::Get(), TEXT("SMainTaskOptions.OptionHeading"))
							]

							+ SHorizontalBox::Slot()
							.AutoWidth()
							[
								SAssignNew(RunOnSeparateProcessCheckBoxPtr, SCheckBox)
								.IsChecked(RunOnSeparateProcessStartingValue ? ECheckBoxState::Checked : ECheckBoxState::Unchecked)
							]
						]

						// Reset to default button
						+ SHorizontalBox::Slot()
						.AutoWidth()
						.Padding(FMargin(2.f))
						.VAlign(VAlign_Center)
						[
							SNew(SResetToDefaultButton)
							.ResetToolTip(DocToolWidgetToolTips::MakeGenericToolTip(DocToolWidgetToolTips::ResetToDefault(DefaultValues::RunOnSeparateProcess())))
							.DiffersFromDefault(this, &SMainTaskOptions::GetRunOnSeparateProcessDiffersFromDefaultValue)
							.OnResetToDefault(this, &SMainTaskOptions::ResetRunOnSeparateProcessToDefaultValue)
						]
					]
				];
			}

			// General options
			CategoriesVBox->AddSlot()
			.AutoHeight()
			.Padding(0.f, 0.f, 0.f, 4.f)
			[
				SNew(SMainTaskOptionsCategory)
				.Title(LOCTEXT("General Options", "General Options"))
				.SlotIndex(SlotIndex++)
				.Content()
				[
					GeneralOptionsVBox
				]
			];
		}

		// Progress output options
		CategoriesVBox->AddSlot()
		.AutoHeight()
		.Padding(0.f, 4.f, 0.f, 4.f)
		[
			SNew(SMainTaskOptionsCategory)
			.Title(LOCTEXT("Progress Output Options", "Progress Output Options"))
			.SlotIndex(SlotIndex++)
			.Content()
			[
				SNew(SVerticalBox)

				+ SVerticalBox::Slot()
				.AutoHeight()
				[
					SNew(SSpacer)
					.Size(GetSpacerBetweenOptionsSize() / 2.f)
				]

				// Report progress to notification widget
				+ SVerticalBox::Slot()
				.AutoHeight()
				[
					SNew(SBorder)
					.Padding(6)
					.BorderImage(FEditorStyle::GetBrush(TEXT("ContentBrowser.TileViewTooltip.ContentBorder")))
					.BorderBackgroundColor(DocToolWidgetConstants::GetTextEntryBackgroundColor())
					[
						SNew(SHorizontalBox)

						+ SHorizontalBox::Slot()
						[
							SNew(SHorizontalBox)
							.ToolTip(DocToolWidgetToolTips::MakeGenericToolTip(DocToolWidgetToolTips::ReportProgressToNotificationWidget()))

							+ SHorizontalBox::Slot()
							.AutoWidth()
							.VAlign(VAlign_Center)
							[
								SNew(STextBlock)
								.Text(LOCTEXT("Report Progress to Notification Widget: ", "Report Progress to Notification Widget: "))
								.TextStyle(FDocToolStyle::Get(), TEXT("SMainTaskOptions.OptionHeading"))
							]

							+ SHorizontalBox::Slot()
							.AutoWidth()
							[
								SAssignNew(ReportProgressToNotificationWidgetCheckBoxPtr, SCheckBox)
								.IsChecked(ReportProgressToNotificationWidgetStartingValue ? ECheckBoxState::Checked : ECheckBoxState::Unchecked)
							]
						]

						// Reset to default button
						+ SHorizontalBox::Slot()
						.AutoWidth()
						.Padding(FMargin(2.f))
						.VAlign(VAlign_Center)
						[
							SNew(SResetToDefaultButton)
							.ResetToolTip(DocToolWidgetToolTips::MakeGenericToolTip(DocToolWidgetToolTips::ResetToDefault(DefaultValues::ReportProgressToNotificationWidget())))
							.DiffersFromDefault(this, &SMainTaskOptions::GetReportProgressToNotificationWidgetDiffersFromDefaultValue)
							.OnResetToDefault(this, &SMainTaskOptions::ResetReportProgressToNotificationWidgetToDefaultValue)
						]
					]
				]

				+ SVerticalBox::Slot()
				.AutoHeight()
				[
					SNew(SSpacer)
					.Size(GetSpacerBetweenOptionsSize())
				]

				// Report progress to log
				+ SVerticalBox::Slot()
				.AutoHeight()
				[
					SNew(SBorder)
					.Padding(6)
					.BorderImage(FEditorStyle::GetBrush(TEXT("ContentBrowser.TileViewTooltip.ContentBorder")))
					.BorderBackgroundColor(DocToolWidgetConstants::GetTextEntryBackgroundColor())
					[
						SNew(SHorizontalBox)

						+ SHorizontalBox::Slot()
						[
							SNew(SHorizontalBox)
							.ToolTip(DocToolWidgetToolTips::MakeGenericToolTip(DocToolWidgetToolTips::ReportProgressToLog()))

							+ SHorizontalBox::Slot()
							.AutoWidth()
							.VAlign(VAlign_Center)
							[
								SNew(STextBlock)
								.Text(LOCTEXT("Report Progress to Log: ", "Report Progress to Log: "))
								.TextStyle(FDocToolStyle::Get(), TEXT("SMainTaskOptions.OptionHeading"))
							]

							+ SHorizontalBox::Slot()
							.AutoWidth()
							[
								SAssignNew(ReportProgressToLogCheckBoxPtr, SCheckBox)
								.IsChecked(ReportProgressToLogStartingValue ? ECheckBoxState::Checked : ECheckBoxState::Unchecked)
							]
						]

						// Reset to default button
						+ SHorizontalBox::Slot()
						.AutoWidth()
						.Padding(FMargin(2.f))
						.VAlign(VAlign_Center)
						[
							SNew(SResetToDefaultButton)
							.ResetToolTip(DocToolWidgetToolTips::MakeGenericToolTip(DocToolWidgetToolTips::ResetToDefault(DefaultValues::ReportProgressToLog())))
							.DiffersFromDefault(this, &SMainTaskOptions::GetReportProgressToLogDiffersFromDefaultValue)
							.OnResetToDefault(this, &SMainTaskOptions::ResetReportProgressToLogToDefaultValue)
						]
					]
				]

				+ SVerticalBox::Slot()
				.AutoHeight()
				[
					SNew(SSpacer)
					.Size(GetSpacerBetweenOptionsSize())
				]

				// Progress delegate
				+ SVerticalBox::Slot()
				.AutoHeight()
				[
					SNew(SVerticalBox)

					+ SVerticalBox::Slot()
					.AutoHeight()
					[
						SAssignNew(ProgressDelegateErrorBorderPtr, SBorder)
						.Padding(6)
						.BorderImage(FEditorStyle::GetBrush(TEXT("ContentBrowser.TileViewTooltip.ContentBorder")))
						.BorderBackgroundColor(DocToolWidgetConstants::GetTextEntryBackgroundColor())
						[
							SNew(SHorizontalBox)

							+ SHorizontalBox::Slot()
							[
								SNew(SHorizontalBox)
								.ToolTip(DocToolWidgetToolTips::MakeGenericToolTip(DocToolWidgetToolTips::ProgressDelegate()))

								+ SHorizontalBox::Slot()
								.AutoWidth()
								.VAlign(VAlign_Center)
								[
									SNew(STextBlock)
									.Text(LOCTEXT("Progress Delegate: ", "Progress Delegate: "))
									.TextStyle(FDocToolStyle::Get(), TEXT("SMainTaskOptions.OptionHeading"))
								]

								+ SHorizontalBox::Slot()
								.VAlign(VAlign_Center)
								[
									SAssignNew(ProgressDelegateInputPtr, SEditableTextWithSuggestions)
									.Suggestions(&ProgressDelegateSuggestions)
									.SuggestionsSort(nullptr)
									.InitialText(ProgressDelegateStartingValue)
									.EditableTextHint(LOCTEXT("Enter a function...", "Enter a function..."))
									.OnInputTextChanged(this, &SMainTaskOptions::HandleProgressDelegateTextChanged)
									/* Above so it interferes with the error text is little as possible */
									.SuggestionBoxPlacement(MenuPlacement_AboveAnchor)
								]
							]

							// Reset to default button
							+ SHorizontalBox::Slot()
							.AutoWidth()
							.Padding(FMargin(2.f))
							.VAlign(VAlign_Center)
							[
								SNew(SResetToDefaultButton)
								.ResetToolTip(DocToolWidgetToolTips::MakeGenericToolTip(DocToolWidgetToolTips::ResetToDefault(DefaultValues::ProgressDelegate())))
								.DiffersFromDefault(this, &SMainTaskOptions::GetProgressDelegateDiffersFromDefaultValue)
								.OnResetToDefault(this, &SMainTaskOptions::ResetProgressDelegateToDefaultValue)
							]
						]
					]

					// Error text
					+ SVerticalBox::Slot()
					[
						SAssignNew(ProgressDelegateErrorTextPtr, STextBlock)
						.Visibility(EVisibility::Collapsed)
						.ColorAndOpacity(DocToolWidgetConstants::GetErrorColor())
						.Margin(FMargin(6))
					]
				]

				+ SVerticalBox::Slot()
				.AutoHeight()
				[
					SNew(SSpacer)
					.Size(GetSpacerBetweenOptionsSize())
				]

				// Stopped delegate
				+ SVerticalBox::Slot()
				.AutoHeight()
				[
					SNew(SVerticalBox)

					+ SVerticalBox::Slot()
					.AutoHeight()
					[
						SAssignNew(StoppedDelegateErrorBorderPtr, SBorder)
						.Padding(6)
						.BorderImage(FEditorStyle::GetBrush(TEXT("ContentBrowser.TileViewTooltip.ContentBorder")))
						.BorderBackgroundColor(DocToolWidgetConstants::GetTextEntryBackgroundColor())
						[
							SNew(SHorizontalBox)

							+ SHorizontalBox::Slot()
							[
								SNew(SHorizontalBox)
								.ToolTip(DocToolWidgetToolTips::MakeGenericToolTip(DocToolWidgetToolTips::StoppedDelegate()))

								+ SHorizontalBox::Slot()
								.AutoWidth()
								.VAlign(VAlign_Center)
								[
									SNew(STextBlock)
									.Text(LOCTEXT("Stopped Delegate: ", "Stopped Delegate: "))
									.TextStyle(FDocToolStyle::Get(), TEXT("SMainTaskOptions.OptionHeading"))
								]

								+ SHorizontalBox::Slot()
								.VAlign(VAlign_Center)
								[
									SAssignNew(StoppedDelegateInputPtr, SEditableTextWithSuggestions)
									.Suggestions(&StoppedDelegateSuggestions)
									.SuggestionsSort(nullptr)
									.InitialText(StoppedDelegateStartingValue)
									.EditableTextHint(LOCTEXT("Enter a function...", "Enter a function..."))
									.OnInputTextChanged(this, &SMainTaskOptions::HandleStoppedDelegateTextChanged)
									/* Above so it interferes with the error text is little as possible */
									.SuggestionBoxPlacement(MenuPlacement_AboveAnchor)
								]
							]

							// Reset to default button
							+ SHorizontalBox::Slot()
							.AutoWidth()
							.Padding(FMargin(2.f))
							.VAlign(VAlign_Center)
							[
								SNew(SResetToDefaultButton)
								.ResetToolTip(DocToolWidgetToolTips::MakeGenericToolTip(DocToolWidgetToolTips::ResetToDefault(DefaultValues::StoppedDelegate())))
								.DiffersFromDefault(this, &SMainTaskOptions::GetStoppedDelegateDiffersFromDefaultValue)
								.OnResetToDefault(this, &SMainTaskOptions::ResetStoppedDelegateToDefaultValue)
							]
						]
					]

					// Error text
					+ SVerticalBox::Slot()
					[
						SAssignNew(StoppedDelegateErrorTextPtr, STextBlock)
						.Visibility(EVisibility::Collapsed)
						.ColorAndOpacity(DocToolWidgetConstants::GetErrorColor())
						.Margin(FMargin(6))
					]
				]
			]
		];

		// Performance options
		CategoriesVBox->AddSlot()
		.AutoHeight()
		.Padding(0.f, 4.f, 0.f, 0.f)
		[
			SNew(SMainTaskOptionsCategory)
			.Title(LOCTEXT("Performance Options", "Performance Options"))
			.SlotIndex(SlotIndex++)
			.Content()
			[
				SNew(SVerticalBox)

				+ SVerticalBox::Slot()
				.AutoHeight()
				[
					SNew(SSpacer)
					.Size(GetSpacerBetweenOptionsSize() / 2.f)
				]

				// Number of threads
				+ SVerticalBox::Slot()
				.AutoHeight()
				[
					SNew(SBorder)
					.Padding(6)
					.BorderImage(FEditorStyle::GetBrush(TEXT("ContentBrowser.TileViewTooltip.ContentBorder")))
					.BorderBackgroundColor(DocToolWidgetConstants::GetTextEntryBackgroundColor())
					[
						SNew(SHorizontalBox)

						+ SHorizontalBox::Slot()
						[
							SNew(SHorizontalBox)
							.ToolTip(DocToolWidgetToolTips::MakeGenericToolTip(DocToolWidgetToolTips::NumberOfThreads()))

							+ SHorizontalBox::Slot()
							.AutoWidth()
							.VAlign(VAlign_Center)
							[
								SNew(STextBlock)
								.Text(LOCTEXT("Number of Threads: ", "Number of Threads: "))
								.TextStyle(FDocToolStyle::Get(), TEXT("SMainTaskOptions.OptionHeading"))
							]

							+ SHorizontalBox::Slot()
							[
								SAssignNew(NumThreadsBoxPtr, SNumericEntryBox<int32>)
								.Value(this, &SMainTaskOptions::HandleNumThreadsBoxValue)
								.AllowSpin(true)
								.MinValue(1)
								.MaxValue(DefaultValues::MaxNumberOfThreads(DocToolPredictedValues))
								.MaxSliderValue(DefaultValues::MaxNumberOfThreads(DocToolPredictedValues))
								.OnValueChanged(this, &SMainTaskOptions::OnNumThreadsBoxValueChanged)
							]
						]

						// Reset to default button
						+ SHorizontalBox::Slot()
						.AutoWidth()
						.Padding(FMargin(2.f))
						.VAlign(VAlign_Center)
						[
							SNew(SResetToDefaultButton)
							.ResetToolTip(DocToolWidgetToolTips::MakeGenericToolTip(DocToolWidgetToolTips::ResetToDefault(DefaultValues::NumberOfThreads(DocToolPredictedValues))))
							.DiffersFromDefault(this, &SMainTaskOptions::GetNumThreadsDiffersFromDefaultValue)
							.OnResetToDefault(this, &SMainTaskOptions::ResetNumThreadsToDefaultValue)
						]
					]
				]
			]
		];
	}

	ChildSlot
	[
		SNew(SBorder)
		.BorderImage(FEditorStyle::GetBrush(TEXT("ToolPanel.GroupBorder")))
		.Padding(FMargin(8.f, 4.f))
		[
			SAssignNew(OverlayForPopupsPtr, SOverlay)

			+ SOverlay::Slot()
			[
				SNew(SVerticalBox)

				+ DocToolWidgetHelpers::AddPageHeader(
					GetTitleText(IsTargetingProject() ? TargetProject->Name : IsTargetingPlugin() ? TargetPlugin->Name : TargetEngine->Name),
					InArgs._OnHistoryPathClicked,
					InArgs._OnGetCrumbDelimiterContent,
					nullptr,
					InArgs._CrumbTrail
				)

				// Options categories scrollbox
				+ SVerticalBox::Slot()
				[
					/* I want the scrollbar to not be visible if not needed but to still 
					occupy layout space, then become visible when needed. I cannot seem 
					to do this. */
					SNew(SScrollBox)
					.ScrollBarAlwaysVisible(true)
					.ScrollBarThickness(FVector2D(9.f, 9.f))

					+ SScrollBox::Slot()
					[
						CategoriesVBox
					]
				]

				// Footer
				+ SVerticalBox::Slot()
				.AutoHeight()
				.Padding(0.f, 16.f, 0.f, 0.f)
				[
					SNew(SHorizontalBox)

					// Back button
					+ SHorizontalBox::Slot()
					.AutoWidth()
					.Padding(0.f, 0.f, 8.f, 0.f)
					[
						SNew(SButton)
						.ButtonStyle(FDocToolStyle::Get(), TEXT("DocToolWidget.GenericButton"))
						.Text(LOCTEXT("Back", "Back"))
						.OnClicked(this, &SMainTaskOptions::HandleBackButtonClicked)
					]

					+ SHorizontalBox::Slot()
					.FillWidth(1.f)
					[
						SNullWidget::NullWidget
					]

					// Copy command to clipboard for BP graph button
					+ SHorizontalBox::Slot()
					.AutoWidth()
					.Padding(0.f, 0.f, 8.f, 0.f)
					[
						SNew(SButton)
						.ToolTip(DocToolWidgetToolTips::MakeGenericToolTip(DocToolWidgetToolTips::CopyCommandToClipboardForBlueprintGraph()))
						.IsEnabled(this, (MainTaskType == EMainTaskType::Documentation) ? &SMainTaskOptions::HandleCopyCommandToClipboardForBlueprintGraphButtonIsEnabled_CreateDocumentation : &SMainTaskOptions::HandleCopyCommandToClipboardForBlueprintGraphButtonIsEnabled_Parse)
						.ButtonStyle(FDocToolStyle::Get(), TEXT("DocToolWidget.GenericButton"))
						.Text(LOCTEXT("Copy Command to Clipboard for Blueprint Graph", "Copy to Clipboard for Blueprint Graph"))
						.OnClicked(this, &SMainTaskOptions::HandleCopyCommandToClipboardForBlueprintGraphButtonClicked)
					]

					// Copy command to clipboard button
					+ SHorizontalBox::Slot()
					.AutoWidth()
					.Padding(0.f, 0.f, 8.f, 0.f)
					[
						SNew(SButton)
						.ToolTip(DocToolWidgetToolTips::MakeGenericToolTip(DocToolWidgetToolTips::CopyCommandToClipboard()))
						.IsEnabled(this, (MainTaskType == EMainTaskType::Documentation) ? &SMainTaskOptions::HandleCopyCommandToClipboardButtonIsEnabled_CreateDocumentation : &SMainTaskOptions::HandleCopyCommandToClipboardButtonIsEnabled_Parse)
						.ButtonStyle(FDocToolStyle::Get(), TEXT("DocToolWidget.GenericButton"))
						.Text(LOCTEXT("Copy Command to Clipboard", "Copy to Clipboard"))
						.OnClicked(this, &SMainTaskOptions::HandleCopyCommandToClipboardButtonClicked)
					]

					// Start button
					+ SHorizontalBox::Slot()
					.AutoWidth()
					[
						SNew(SButton)
						.ToolTip(DocToolWidgetToolTips::MakeGenericToolTip(DocToolWidgetToolTips::Start(MainTaskType)))
						.IsEnabled(this, (MainTaskType == EMainTaskType::Documentation) ? &SMainTaskOptions::HandleStartButtonIsEnabled_CreateDocumentation : &SMainTaskOptions::HandleStartButtonIsEnabled_Parse)
						.ButtonStyle(FDocToolStyle::Get(), TEXT("DocToolWidget.GenericButton"))
						.Text(LOCTEXT("Start", "Start"))
						.OnClicked(this, &SMainTaskOptions::HandleStartButtonClicked)
					]
				]
			]
		]
	];

	OnBackButtonClickedDelegate = InArgs._OnBackButtonClicked;
	OnStartButtonClickedDelegate = InArgs._OnStartButtonClicked;

	/* Here I'm checking whether the starting value is an error for each widget that:
	1. can have errors 
	2. checks for errors on value change (as opposed to checking each frame - we can just 
	let it get done on tick. This happens to be no widgets at the time of writing this).
	Probably not necessary if the starting values are the default values but doesn't hurt 
	(well, it hurts performance) */
	if (NonEngineTargetDisplayNameTextPtr.IsValid())
	{
		CheckForNonEngineTargetDisplayNameTextErrors(NonEngineTargetDisplayNameTextPtr->GetText());
	}
	if (OutputPathDirectoryPickerPtr.IsValid())
	{
		CheckForOutputPathDirectoryPickerTextErrors();
	}
	CheckForDelegateInputBoxErrors(ProgressDelegateInputPtr->GetInputTextBoxText(), FunctionLocatingHelpers::GetOnDocToolProgressDelegate(), ProgressDelegateErrorBorderPtr, ProgressDelegateErrorTextPtr, false);
	CheckForDelegateInputBoxErrors(StoppedDelegateInputPtr->GetInputTextBoxText(), FunctionLocatingHelpers::GetOnDocToolStoppedDelegate(), StoppedDelegateErrorBorderPtr, StoppedDelegateErrorTextPtr, bAllowParseWithoutStoppedDelegate ? false : (MainTaskType == EMainTaskType::ParseThenPostProcess));
	/* Adjust num threads box to acceptable range */
	NumThreadsBoxValue = FMath::Clamp(NumThreadsBoxValue.GetValue(), StaticCastSharedPtr<SSpinBox<int32>>(NumThreadsBoxPtr->GetSpinBox())->GetMinValue(), StaticCastSharedPtr<SSpinBox<int32>>(NumThreadsBoxPtr->GetSpinBox())->GetMaxValue());
}

bool SMainTaskOptions::IsTargetingProject() const
{
	return TargetProject != nullptr;
}

bool SMainTaskOptions::IsTargetingPlugin() const
{
	return TargetPlugin != nullptr;
}

bool SMainTaskOptions::IsTargetingEngine() const
{
	return TargetEngine != nullptr;
}

FText SMainTaskOptions::GetTitleText(const FString& TargetsName)
{
	return FText::AsCultureInvariant(TargetsName + TEXT(" Options"));
}

void SMainTaskOptions::OnNonEngineTargetDisplayNameTextChanged(const FText& NewText)
{
	CheckForNonEngineTargetDisplayNameTextErrors(NewText);
}

bool SMainTaskOptions::GetNonEngineTargetDisplayNameDiffersFromDefaultValue() const
{
	return (NonEngineTargetDisplayNameTextPtr->GetText().EqualTo(DefaultValues::NonEngineTargetDisplayName(DocToolPredictedValues)) == false);
}

void SMainTaskOptions::ResetNonEngineTargetDisplayNameToDefaultValue()
{
	NonEngineTargetDisplayNameTextPtr->SetText(DefaultValues::NonEngineTargetDisplayName(DocToolPredictedValues));
}

void SMainTaskOptions::CheckForNonEngineTargetDisplayNameTextErrors(const FText& InputBoxText)
{
	FString Error;

	const int32 MAX_LENGTH = 150;  // Pulled this number out of nowhere

	/* Check length */
	FString String = InputBoxText.ToString();
	if (String.Len() == 0)
	{
		Error = TEXT("Please enter a value");
	}
	else if (String.Len() > MAX_LENGTH)
	{
		Error = TEXT("Value too long");
	}

	const bool bIsError = (Error.Len() > 0);
	if (bIsError)
	{
		NonEngineTargetDisplayNameErrorBorderPtr->SetBorderBackgroundColor(DocToolWidgetConstants::GetErrorColor());

		NonEngineTargetDisplayNameErrorTextPtr->SetText(Error);
		NonEngineTargetDisplayNameErrorTextPtr->SetVisibility(EVisibility::SelfHitTestInvisible);
	}
	else
	{
		NonEngineTargetDisplayNameErrorBorderPtr->SetBorderBackgroundColor(DocToolWidgetConstants::GetTextEntryBackgroundColor());

		NonEngineTargetDisplayNameErrorTextPtr->SetVisibility(EVisibility::Collapsed);
	}
}

void SMainTaskOptions::OnOutputPathDirectoryPickerTextChanged(const FText& NewText)
{
	CheckForOutputPathDirectoryPickerTextErrors();
}

bool SMainTaskOptions::GetOutputPathDiffersFromDefaultValue() const
{
	return (DocToolWidgetHelpers::IsSamePath(OutputPathDirectoryPickerPtr->GetDirectory(), DefaultValues::OutputPath(DocToolPredictedValues)) == false);
}

void SMainTaskOptions::ResetOutputPathToDefaultValue()
{
	OutputPathDirectoryPickerPtr->SetDirectory(DefaultValues::OutputPath(DocToolPredictedValues));
}

void SMainTaskOptions::CheckForOutputPathDirectoryPickerTextErrors()
{
	const FString& Path = OutputPathDirectoryPickerPtr->GetDirectory();

	FText Error;
	bool bIsError = false;

	/* FPaths::ValidatePath does not check for length I believe, so check now.
	In practice it'll need to be more than just 1 char shorter than the max path
	length because some files will be created in it */
	if (Path.Len() > FPlatformMisc::GetMaxPathLength())
	{
		bIsError = true;
		Error = LOCTEXT("Path too long", "Path too long");
	}
	else
	{
		bIsError = (FPaths::ValidatePath(Path, &Error) == false);

		if (bIsError == false)
		{
			if (UDocumentationTool::IsOutputDirectorySafe(Path) == false)
			{
				bIsError = true;
				Error = LOCTEXT("Directory not safe to delete", "Directory not considered safe to delete - contains non documentation tool files/folders");
			}
		}
	}

	if (bIsError)
	{
		OutputPathErrorBorderPtr->SetBorderBackgroundColor(DocToolWidgetConstants::GetErrorColor());

		OutputPathErrorTextPtr->SetText(Error);
		OutputPathErrorTextPtr->SetVisibility(EVisibility::SelfHitTestInvisible);
	}
	else
	{
		OutputPathErrorBorderPtr->SetBorderBackgroundColor(DocToolWidgetConstants::GetTextEntryBackgroundColor());

		OutputPathErrorTextPtr->SetVisibility(EVisibility::Collapsed);
	}
}

bool SMainTaskOptions::GetRunOnSeparateProcessDiffersFromDefaultValue() const
{
	return RunOnSeparateProcessCheckBoxPtr->IsChecked() != DefaultValues::RunOnSeparateProcess();
}

void SMainTaskOptions::ResetRunOnSeparateProcessToDefaultValue()
{
	RunOnSeparateProcessCheckBoxPtr->SetIsChecked(DefaultValues::RunOnSeparateProcess() ? ECheckBoxState::Checked : ECheckBoxState::Unchecked);
}

bool SMainTaskOptions::GetReportProgressToNotificationWidgetDiffersFromDefaultValue() const
{
	return ReportProgressToNotificationWidgetCheckBoxPtr->IsChecked() != DefaultValues::ReportProgressToNotificationWidget();
}

void SMainTaskOptions::ResetReportProgressToNotificationWidgetToDefaultValue()
{
	ReportProgressToNotificationWidgetCheckBoxPtr->SetIsChecked(DefaultValues::ReportProgressToNotificationWidget() ? ECheckBoxState::Checked : ECheckBoxState::Unchecked);
}

bool SMainTaskOptions::GetReportProgressToLogDiffersFromDefaultValue() const
{
	return ReportProgressToLogCheckBoxPtr->IsChecked() != DefaultValues::ReportProgressToLog();
}

void SMainTaskOptions::ResetReportProgressToLogToDefaultValue()
{
	ReportProgressToLogCheckBoxPtr->SetIsChecked(DefaultValues::ReportProgressToLog() ? ECheckBoxState::Checked : ECheckBoxState::Unchecked);
}

void SMainTaskOptions::HandleProgressDelegateTextChanged(const FText& Text)
{
	/* Might be a little annoying checking for errors on text changed. Maybe make it
	on text committed instead? */

	CheckForDelegateInputBoxErrors(Text, FunctionLocatingHelpers::GetOnDocToolProgressDelegate(), ProgressDelegateErrorBorderPtr, ProgressDelegateErrorTextPtr, false);
}

bool SMainTaskOptions::GetProgressDelegateDiffersFromDefaultValue() const
{
	return (ProgressDelegateInputPtr->GetInputTextBoxText().EqualTo(DefaultValues::ProgressDelegate()) == false);
}

void SMainTaskOptions::ResetProgressDelegateToDefaultValue()
{
	ProgressDelegateInputPtr->SetInputTextBoxText(DefaultValues::ProgressDelegate());
}

void SMainTaskOptions::HandleStoppedDelegateTextChanged(const FText& Text)
{
	/* Might be a little annoying checking for errors on text changed. Maybe make it
	on text committed instead? */

	const bool bIsErrorIfEmpty = bAllowParseWithoutStoppedDelegate ? false : (MainTaskType == EMainTaskType::ParseThenPostProcess);
	CheckForDelegateInputBoxErrors(Text, FunctionLocatingHelpers::GetOnDocToolStoppedDelegate(), StoppedDelegateErrorBorderPtr, StoppedDelegateErrorTextPtr, bIsErrorIfEmpty);
}

bool SMainTaskOptions::GetStoppedDelegateDiffersFromDefaultValue() const
{
	return (StoppedDelegateInputPtr->GetInputTextBoxText().EqualTo(DefaultValues::StoppedDelegate()) == false);
}

void SMainTaskOptions::ResetStoppedDelegateToDefaultValue()
{
	StoppedDelegateInputPtr->SetInputTextBoxText(DefaultValues::StoppedDelegate());
}

void SMainTaskOptions::CheckForDelegateInputBoxErrors(const FText& InputBoxText, const UDelegateFunction* Delegate, TSharedPtr<SBorder> ErrorBorderPtr, TSharedPtr<STextBlock> ErrorTextPtr, bool bIsErrorIfEmpty)
{
	FText Error = FText::GetEmpty();

	const FString InputBoxString = InputBoxText.ToString();
	if (InputBoxString.Len() > 0)
	{
		FString ClassNamePart;
		FString FunctionNamePart;
		if (InputBoxString.Split(TEXT("::"), &ClassNamePart, &FunctionNamePart, ESearchCase::CaseSensitive))
		{
			const FString ClassName = ClassNamePart;
			const FName FunctionName = FName(*FunctionNamePart);

			const UObject* Obj = LoadObject<UObject>(nullptr, *ClassName, nullptr, LOAD_NoWarn | LOAD_Quiet);

			if (Obj != nullptr)
			{
				if (Obj->IsA(UClass::StaticClass()))
				{
					const UClass* Class = CastChecked<UClass>(Obj);

					if (const UFunction* Function = Class->FindFunctionByName(FunctionName))
					{
						if (Function->HasAllFunctionFlags(FUNC_Static))
						{
							if (FunctionLocatingHelpers::IsCPPFunctionSuitableForDynamicDelegate(Function, Delegate))
							{
								// No error
							}
							else
							{
								Error = LOCTEXT("Function not the correct signature", "Function not the correct signature");
							}
						}
						else
						{
							Error = LOCTEXT("Function must be static", "Function must be static");
						}
					}
					else
					{
						Error = LOCTEXT("Function not found on class", "Function not found on class");
					}
				}
				else if (Obj->IsA(UBlueprint::StaticClass()))
				{
					const UBlueprint* Blueprint = CastChecked<UBlueprint>(Obj);

					if (const UFunction* Function = Blueprint->GeneratedClass->FindFunctionByName(FunctionName))
					{
						const uint8 NumParamsToIgnore = (Blueprint->BlueprintType == BPTYPE_FunctionLibrary) ? 1 : 0;
						if (FunctionLocatingHelpers::IsBlueprintAssetFunctionSuitableForDynamicDelegate(Function, Delegate, NumParamsToIgnore))
						{
							// No error
						}
						else
						{
							Error = LOCTEXT("Function not the correct signature", "Function not the correct signature");
						}
					}
					else
					{
						Error = LOCTEXT("Function not found on blueprint", "Function not found on blueprint");
					}
				}
				else
				{
					Error = LOCTEXT("Object not a class or blueprint", "Object not a class or blueprint");
				}
			}
			else
			{
				Error = LOCTEXT("Object not found", "Object not found");
			}
		}
		else
		{
			Error = LOCTEXT("String must contain \"::\"", "String must contain \"::\"");
		}
	}
	else
	{
		if (bIsErrorIfEmpty)
		{
			Error = LOCTEXT("You must enter a function", "You must enter a function");
		}
	}

	const bool bIsError = (Error.IdenticalTo(FText::GetEmpty()) == false);
	if (bIsError)
	{
		ErrorBorderPtr->SetBorderBackgroundColor(DocToolWidgetConstants::GetErrorColor());

		ErrorTextPtr->SetText(Error);
		ErrorTextPtr->SetVisibility(EVisibility::SelfHitTestInvisible);
	}
	else
	{
		ErrorBorderPtr->SetBorderBackgroundColor(DocToolWidgetConstants::GetTextEntryBackgroundColor());

		ErrorTextPtr->SetVisibility(EVisibility::Collapsed);
	}
}

TOptional<int32> SMainTaskOptions::HandleNumThreadsBoxValue() const
{
	return NumThreadsBoxValue;
}

void SMainTaskOptions::OnNumThreadsBoxValueChanged(int32 NewValue)
{
	NumThreadsBoxValue = NewValue;
}

bool SMainTaskOptions::GetNumThreadsDiffersFromDefaultValue() const
{
	return NumThreadsBoxValue.GetValue() != DefaultValues::NumberOfThreads(DocToolPredictedValues);
}

void SMainTaskOptions::ResetNumThreadsToDefaultValue()
{
	NumThreadsBoxValue = DefaultValues::NumberOfThreads(DocToolPredictedValues);
}

FReply SMainTaskOptions::HandleBackButtonClicked()
{
	return OnBackButtonClickedDelegate.Execute();
}

bool SMainTaskOptions::HandleCopyCommandToClipboardForBlueprintGraphButtonIsEnabled_CreateDocumentation() const
{
	/* Return true if there are no errors. Some of these values considered as "errors"
	would actually probably be fine if you used them */
	if (IsTargetingProject() || IsTargetingPlugin())
	{
		return NonEngineTargetDisplayNameErrorTextPtr->GetVisibility() == EVisibility::Collapsed
			&& OutputPathErrorTextPtr->GetVisibility() == EVisibility::Collapsed
			&& ProgressDelegateErrorTextPtr->GetVisibility() == EVisibility::Collapsed
			&& StoppedDelegateErrorTextPtr->GetVisibility() == EVisibility::Collapsed;
	}
	else
	{
		return ProgressDelegateErrorTextPtr->GetVisibility() == EVisibility::Collapsed
			&& StoppedDelegateErrorTextPtr->GetVisibility() == EVisibility::Collapsed;
	}
}

bool SMainTaskOptions::HandleCopyCommandToClipboardForBlueprintGraphButtonIsEnabled_Parse() const
{
	/* Return true if there are no errors. Some of these values considered as "errors"
	would actually probably be fine if you used them */
	return ProgressDelegateErrorTextPtr->GetVisibility() == EVisibility::Collapsed
		&& StoppedDelegateErrorTextPtr->GetVisibility() == EVisibility::Collapsed;
}

FReply SMainTaskOptions::HandleCopyCommandToClipboardForBlueprintGraphButtonClicked()
{
	FDocOptions Options;
	CreateMainTaskParameters(Options);

	/* Create a blueprint and a graph for the node.
	Set GeneratedClass to something so SetFromFunction call later on won't crash */
	UBlueprint* Blueprint = NewObject<UBlueprint>();
	Blueprint->GeneratedClass = UDocToolFunctions::StaticClass();
	UEdGraph* Graph = NewObject<UEdGraph>(Blueprint);

	UK2Node_CallFunction* FunctionNode = NewObject<UK2Node_CallFunction>(Graph);

	if (MainTaskType == EMainTaskType::Documentation)
	{
		const UFunction* CreateDocumentationFunction = UDocToolFunctions::StaticClass()->FindFunctionByName(GET_FUNCTION_NAME_CHECKED(UDocToolFunctions, CreateDocumentationV0));
		FunctionNode->SetFromFunction(CreateDocumentationFunction);
		FunctionNode->AllocateDefaultPins();

		/* Set the values of the params */
		FunctionNode->FindPinChecked(TEXT("TargetType"),						EGPD_Input)->DefaultValue = DocDebugHelpers::EnumValueToString<EDocToolTarget>(Options.TargetOptions.Type);
		FunctionNode->FindPinChecked(TEXT("Target"),							EGPD_Input)->DefaultValue = Options.TargetOptions.Target;
		FunctionNode->FindPinChecked(TEXT("NonEngineTargetNameOverride"),		EGPD_Input)->DefaultValue = Options.PageDesignOptions.NonEngineTargetNameOverride;
		FunctionNode->FindPinChecked(TEXT("OutputPath"),						EGPD_Input)->DefaultValue = Options.MiscOptions.OutputPath;
		FunctionNode->FindPinChecked(TEXT("SpawnNewProcessBehavior"),			EGPD_Input)->DefaultValue = DocDebugHelpers::EnumValueToString<ESpawnNewProcessBehavior_New>(Options.MiscOptions.SpawnNewProcessBehavior.SpawnNewProcessBehavior);
		FunctionNode->FindPinChecked(TEXT("OutputOption"),						EGPD_Input)->DefaultValue = DocDebugHelpers::EnumValueToString<EDocProgressOutputFlags>(Options.ProgressOutputOptions.OutputOption);
		FunctionNode->FindPinChecked(TEXT("bReportPercentageCompleteToWidget"), EGPD_Input)->DefaultValue = Options.ProgressOutputOptions.bReportPercentageCompleteToWidget ? TEXT("true") : TEXT("false");
		FunctionNode->FindPinChecked(TEXT("OnProgressDelegateString"),			EGPD_Input)->DefaultValue = DocToolMisc::DelegateToString(Options.ProgressOutputOptions.OnProgressDelegate);
		FunctionNode->FindPinChecked(TEXT("OnStoppedDelegateString"),			EGPD_Input)->DefaultValue = DocToolMisc::DelegateToString(Options.ProgressOutputOptions.OnStoppedDelegate);
		FunctionNode->FindPinChecked(TEXT("NumThreads"),						EGPD_Input)->DefaultValue = FString::FromInt(Options.PerformanceOptions.NumThreads);
	}
	else  // Assumed parse
	{
		check(MainTaskType == EMainTaskType::ParseThenPostProcess);

		const UFunction* ParseFunction = UDocToolFunctions::StaticClass()->FindFunctionByName(GET_FUNCTION_NAME_CHECKED(UDocToolFunctions, ParseThenPostProcessV0));
		FunctionNode->SetFromFunction(ParseFunction);
		FunctionNode->AllocateDefaultPins();

		/* Set the values of the params */
		FunctionNode->FindPinChecked(TEXT("TargetType"),						EGPD_Input)->DefaultValue = DocDebugHelpers::EnumValueToString<EDocToolTarget>(Options.TargetOptions.Type);
		FunctionNode->FindPinChecked(TEXT("Target"),							EGPD_Input)->DefaultValue = Options.TargetOptions.Target;
		FunctionNode->FindPinChecked(TEXT("SpawnNewProcessBehavior"),			EGPD_Input)->DefaultValue = DocDebugHelpers::EnumValueToString<ESpawnNewProcessBehavior_New>(Options.MiscOptions.SpawnNewProcessBehavior.SpawnNewProcessBehavior);
		FunctionNode->FindPinChecked(TEXT("OutputOption"),						EGPD_Input)->DefaultValue = DocDebugHelpers::EnumValueToString<EDocProgressOutputFlags>(Options.ProgressOutputOptions.OutputOption);
		FunctionNode->FindPinChecked(TEXT("bReportPercentageCompleteToWidget"), EGPD_Input)->DefaultValue = Options.ProgressOutputOptions.bReportPercentageCompleteToWidget ? TEXT("true") : TEXT("false");
		FunctionNode->FindPinChecked(TEXT("OnProgressDelegateString"),			EGPD_Input)->DefaultValue = DocToolMisc::DelegateToString(Options.ProgressOutputOptions.OnProgressDelegate);
		FunctionNode->FindPinChecked(TEXT("OnStoppedDelegateString"),			EGPD_Input)->DefaultValue = DocToolMisc::DelegateToString(Options.ProgressOutputOptions.OnStoppedDelegate);
		FunctionNode->FindPinChecked(TEXT("NumThreads"),						EGPD_Input)->DefaultValue = FString::FromInt(Options.PerformanceOptions.NumThreads);
	}

	FunctionNode->PrepareForCopying();

	FString ExportedText;
	FEdGraphUtilities::ExportNodesToText({ FunctionNode }, ExportedText);
	FPlatformApplicationMisc::ClipboardCopy(*ExportedText);

	/* Show a popup notifying the user the copy to clipboard took place */
	const FText Message = LOCTEXT("BP node copied to clipboard", "BP node copied to clipboard");
	const bool bPopupAlreadyShowing = (OverlayForPopupsPtr->GetNumWidgets() > 1);
	if (bPopupAlreadyShowing)
	{
		TSharedRef<SPopupNotification> Popup = StaticCastSharedRef<SPopupNotification>(OverlayForPopupsPtr->GetChildren()->GetChildAt(1));
		Popup->SetMessage(Message);
		Popup->ResetDuration();
	}
	else
	{
		OverlayForPopupsPtr->AddSlot(1000)
		.HAlign(HAlign_Center)
		.VAlign(VAlign_Center)
		[
			SNew(SPopupNotification)
			.TextContent(Message)
			.SolidOneOpacityDuration(1.5f)
			.FadeOutDuration(1.5f)
		];
	}

	return FReply::Handled();
}

bool SMainTaskOptions::HandleCopyCommandToClipboardButtonIsEnabled_CreateDocumentation() const
{
	/* Return true if there are no errors. Some of these values considered as "errors" 
	would actually probably be fine if you used them */
	if (IsTargetingProject() || IsTargetingPlugin())
	{
		return NonEngineTargetDisplayNameErrorTextPtr->GetVisibility() == EVisibility::Collapsed
			&& OutputPathErrorTextPtr->GetVisibility() == EVisibility::Collapsed
			&& ProgressDelegateErrorTextPtr->GetVisibility() == EVisibility::Collapsed
			&& StoppedDelegateErrorTextPtr->GetVisibility() == EVisibility::Collapsed;
	}
	else
	{
		return ProgressDelegateErrorTextPtr->GetVisibility() == EVisibility::Collapsed
			&& StoppedDelegateErrorTextPtr->GetVisibility() == EVisibility::Collapsed;
	}
}

bool SMainTaskOptions::HandleCopyCommandToClipboardButtonIsEnabled_Parse() const
{
	/* Return true if there are no errors. Some of these values considered as "errors"
	would actually probably be fine if you used them */
	return ProgressDelegateErrorTextPtr->GetVisibility() == EVisibility::Collapsed
		&& StoppedDelegateErrorTextPtr->GetVisibility() == EVisibility::Collapsed;
}

FReply SMainTaskOptions::HandleCopyCommandToClipboardButtonClicked()
{
	FDocOptions Options;
	CreateMainTaskParameters(Options);

	/* @todo Note: this function does not 'look ahead' much. By that I mean it could for instance
	predict which engine version to open. The command still works though, but it may be required
	to launch a new process. If we look ahead more we can avoid this.
	To do this you might need to run LocateNonEngineTargetAndEngineTarget and 
	CheckIfNeedToRunNewProcess. Eventually you might need the info these 2 funcs provide 
	even earlier than now so you might wanna call them in PredictValuesPreMainTask_XX instead */

	FString S;

	//----------------------------------------------------------------
	//	Add the version of the engine to run

	S += TEXT("\"") + FPaths::ConvertRelativePathToFull(FPlatformMisc::EngineDir()) + TEXT("Binaries/Win64/UE4Editor.exe") + TEXT("\"");
	S += ' ';

	//----------------------------------------------------------------
	// Add the project we're gonna open

	if (EnumHasAnyFlags(Options.TargetOptions.Type, EDocToolTarget::Project))
	{
		S += TEXT("\"") + Options.TargetOptions.Target + TEXT("\"");
		S += ' ';
	}

	//--------------------------------------------------
	// Add path to doc tool plugin

	const FString DocToolPluginPath = FPaths::ConvertRelativePathToFull(IPluginManager::Get().FindPlugin(DOC_TOOL_PLUGIN_NAME)->GetDescriptorFileName());
	S += TEXT("-PLUGIN=\"") + DocToolPluginPath + TEXT("\"");
	S += ' ';
	S += TEXT("-EnablePlugins=\"") + FPaths::GetBaseFilename(DocToolPluginPath) + TEXT("\"");
	S += ' ';

	//--------------------------------------------------
	// Add param to run commandlet

	S += TEXT("-run=DocumentationToolCommandlet");
	S += ' ';

	//--------------------------------------------------
	// Add the main task

	if (MainTaskType == EMainTaskType::Documentation)
	{
		S += TEXT("Create");
		S += ' ';
	}
	else  // Assumed Parse
	{
		check(MainTaskType == EMainTaskType::ParseThenPostProcess);

		S += TEXT("Parse");
		S += ' ';
	}

	//--------------------------------------------------
	//	Add the main task's params

	DocToolCommands::WriteOptionsToParamString(S, MainTaskType, Options, false);

	//--------------------------------------------------

	FPlatformApplicationMisc::ClipboardCopy(*S);

	/* Show a popup notifying the user the copy to clipboard took place */
	const FText Message = LOCTEXT("Command copied to clipboard", "Command copied to clipboard");
	const bool bPopupAlreadyShowing = (OverlayForPopupsPtr->GetNumWidgets() > 1);
	if (bPopupAlreadyShowing)
	{
		TSharedRef<SPopupNotification> Popup = StaticCastSharedRef<SPopupNotification>(OverlayForPopupsPtr->GetChildren()->GetChildAt(1));
		Popup->SetMessage(Message);
		Popup->ResetDuration();
	}
	else
	{
		OverlayForPopupsPtr->AddSlot(1000)
		.HAlign(HAlign_Center)
		.VAlign(VAlign_Center)
		[
			SNew(SPopupNotification)
			.TextContent(Message)
			.SolidOneOpacityDuration(1.5f)
			.FadeOutDuration(1.5f)
		];
	}

	return FReply::Handled();
}

bool SMainTaskOptions::HandleStartButtonIsEnabled_CreateDocumentation() const
{
	/* Return true if there are no errors */
	if (IsTargetingProject() || IsTargetingPlugin())
	{
		return NonEngineTargetDisplayNameErrorTextPtr->GetVisibility() == EVisibility::Collapsed
			&& OutputPathErrorTextPtr->GetVisibility() == EVisibility::Collapsed
			&& ProgressDelegateErrorTextPtr->GetVisibility() == EVisibility::Collapsed
			&& StoppedDelegateErrorTextPtr->GetVisibility() == EVisibility::Collapsed;
	}
	else
	{
		return ProgressDelegateErrorTextPtr->GetVisibility() == EVisibility::Collapsed
			&& StoppedDelegateErrorTextPtr->GetVisibility() == EVisibility::Collapsed;
	}
}

bool SMainTaskOptions::HandleStartButtonIsEnabled_Parse() const
{
	return ProgressDelegateErrorTextPtr->GetVisibility() == EVisibility::Collapsed
		&& StoppedDelegateErrorTextPtr->GetVisibility() == EVisibility::Collapsed;
}

FReply SMainTaskOptions::HandleStartButtonClicked()
{
	FDocOptions Options;
	CreateMainTaskParameters(Options);

	return OnStartButtonClickedDelegate.Execute(Options);
}

void SMainTaskOptions::CreateDocToolDelegateSuggestionsFromCPPClasses()
{
	FunctionLocatingHelpers::GetFunctionsWithSignaturesFromCPPClasses(
		FunctionLocatingHelpers::FunctionSignatures()
		.Add(FunctionLocatingHelpers::GetOnDocToolProgressDelegate())
		.Add(FunctionLocatingHelpers::GetOnDocToolStoppedDelegate()),
		/* At the time of writing this if the function is non-static it will cause a 
		crash at some point during the documentation process, so only find static functions.
		Something to investigate. */
		FUNC_Static,
		FunctionLocatingHelpers::RetVal()
		.Add(ProgressDelegateSuggestions)
		.Add(StoppedDelegateSuggestions)
	);
}

void SMainTaskOptions::CreateDocToolDelegateSuggestionsFromBlueprintAssets()
{
	FunctionLocatingHelpers::GetFunctionsWithSignaturesFromBlueprintAssets(
		FunctionLocatingHelpers::FunctionSignatures()
		.Add(FunctionLocatingHelpers::GetOnDocToolProgressDelegate())
		.Add(FunctionLocatingHelpers::GetOnDocToolStoppedDelegate()),
		FUNC_None,
		FunctionLocatingHelpers::RetVal()
		.Add(ProgressDelegateSuggestions)
		.Add(StoppedDelegateSuggestions)
	);
}

void SMainTaskOptions::SortDocToolDelegateSuggestions()
{
	ProgressDelegateSuggestions.Sort([](const TSharedPtr<FString>& A, const TSharedPtr<FString>& B)
	{
		return *A < *B;
	});

	StoppedDelegateSuggestions.Sort([](const TSharedPtr<FString>& A, const TSharedPtr<FString>& B)
	{
		return *A < *B;
	});
}

void SMainTaskOptions::OnAssetRegistryInitialSearchComplete()
{
	/* Don't think AssetRegistry.OnFilesLoaded() ever fires again but we'll remove this
	function just in case */
	FAssetRegistryModule& AssetRegistryModule = FModuleManager::LoadModuleChecked<FAssetRegistryModule>(FName(TEXT("AssetRegistry")));
	IAssetRegistry& AssetRegistry = AssetRegistryModule.Get();
	AssetRegistry.OnFilesLoaded().RemoveAll(this);  // What's faster? Remove or RemoveAll?

	/* There are probably some heavy functions in the engine code that are bound to
	OnFilesLoaded(). To avoid adding any more time to this frame we will delay our work
	by a bit */
	FTicker::GetCoreTicker().AddTicker(FTickerDelegate::CreateSP(this, &SMainTaskOptions::HandleTickerTick), 0.2f);
}

bool SMainTaskOptions::HandleTickerTick(float DeltaTime)
{
	CreateDocToolDelegateSuggestionsFromBlueprintAssets();
	SortDocToolDelegateSuggestions();
	ProgressDelegateInputPtr->NotifyOfSuggestionsUpdated();
	StoppedDelegateInputPtr->NotifyOfSuggestionsUpdated();

	HookIntoEventsForSuggestionsFromBlueprintAssets();

	return false;
}

void SMainTaskOptions::HookIntoEventsForSuggestionsFromBlueprintAssets()
{
	/* The purpose of this function is to update the suggestions as you add/remove 
	compatible functions e.g. you add a function to your blueprint, change it's signature 
	to the compatible signature and compile it, so the suggestion box should update 
	accordingly. You might need to use more than just GEditor->OnBlueprintPreCompile() 
	(maybe some asset registry events too). There's lots of things that can happen - BP
	deleted, BP renamed, BP moved to different folder. It might be possible, but I'm 
	going to not do this because I do not want to add any more time to BP compile time.
	So if you want to refresh the suggestions you'll need to (at time of writing this)
	navigate away from this widget and back to it */
}

void SMainTaskOptions::CreateMainTaskParameters(FDocOptions& Options)
{
	if (IsTargetingProject())
	{
		Options.TargetOptions.Type = EDocToolTarget::EngineAndProject;
		Options.TargetOptions.Target = TargetProject->Path + TEXT("/") + TargetProject->Name + TEXT(".uproject");
	}
	else if (IsTargetingPlugin())
	{
		Options.TargetOptions.Type = EDocToolTarget::EngineAndPlugin;
		Options.TargetOptions.Target = TargetPlugin->Path;
	}
	else  // Assumed engine
	{
		check(IsTargetingEngine());
		Options.TargetOptions.Type = EDocToolTarget::Engine;
		Options.TargetOptions.Target = TargetEngine->Path;
	}

	//----------------------------------------------------------------------------------------

	if (MainTaskType == EMainTaskType::Documentation && (IsTargetingProject() || IsTargetingPlugin()))
	{
		Options.MiscOptions.OutputPath = OutputPathDirectoryPickerPtr->GetDirectory();
		if (Options.MiscOptions.OutputPath.EndsWith(TEXT("/"), ESearchCase::CaseSensitive) == false)
		{
			Options.MiscOptions.OutputPath += TEXT("/");
		}
	}
	Options.MiscOptions.SpawnNewProcessBehavior.SpawnNewProcessBehavior = RunOnSeparateProcessCheckBoxPtr->IsChecked() ? ESpawnNewProcessBehavior_New::Default : ESpawnNewProcessBehavior_New::IfRequired;

	//----------------------------------------------------------------------------------------

	if (ReportProgressToLogCheckBoxPtr->IsChecked())
	{
		Options.ProgressOutputOptions.OutputOption |= EDocProgressOutputFlags::Log;
	}
	Options.ProgressOutputOptions.bReportPercentageCompleteToWidget = ReportProgressToNotificationWidgetCheckBoxPtr->IsChecked();
	
	struct Helpers
	{
		static void PossiblyBindToDelegate(TSharedPtr<SEditableTextWithSuggestions> InputWidgetPtr, FScriptDelegate& Delegate)
		{
			const FString DelegateString = InputWidgetPtr->GetInputTextBoxText().ToString();
			FString ClassNamePart;
			FString FunctionNamePart;
			if (DelegateString.Split(TEXT("::"), &ClassNamePart, &FunctionNamePart, ESearchCase::CaseSensitive))
			{
				const FString ClassName = ClassNamePart;
				const FName FunctionName = FName(*FunctionNamePart);

				UObject* Obj = FindObject<UObject>(nullptr, *ClassName);

				if (Obj->IsA(UClass::StaticClass()))
				{
					UClass* Class = CastChecked<UClass>(Obj);

					Delegate.BindUFunction(Class->GetDefaultObject(), FunctionName);
				}
				else
				{
					check(Obj->IsA(UBlueprint::StaticClass()));

					UBlueprint* Blueprint = CastChecked<UBlueprint>(Obj);

					Delegate.BindUFunction(Blueprint->GeneratedClass->GetDefaultObject(), FunctionName);
				}
			}
		}
	};

	Helpers::PossiblyBindToDelegate(ProgressDelegateInputPtr, Options.ProgressOutputOptions.OnProgressDelegate);
	Helpers::PossiblyBindToDelegate(StoppedDelegateInputPtr, Options.ProgressOutputOptions.OnStoppedDelegate);

	//----------------------------------------------------------------------------------------

	Options.PerformanceOptions.NumThreads = NumThreadsBoxValue.GetValue();

	//----------------------------------------------------------------------------------------

	/* Because macros take a long time last time I checked and I have not designed their pages
	I am leaving them off for now */
	Options.ParserOptions.Mode &= ~EParsingModeFlags::Macros;

	//----------------------------------------------------------------------------------------

	if (MainTaskType == EMainTaskType::Documentation && (IsTargetingProject() || IsTargetingPlugin()))
	{
		Options.PageDesignOptions.NonEngineTargetNameOverride = NonEngineTargetDisplayNameTextPtr->GetText().ToString();
	}
}

MainTaskOptionsState SMainTaskOptions::GetState() const
{
	MainTaskOptionsState State;

	State.NonEngineTargetDisplayName = NonEngineTargetDisplayNameTextPtr.IsValid() ? NonEngineTargetDisplayNameTextPtr->GetText() : TOptional<FText>();
	State.OutputPath = OutputPathDirectoryPickerPtr.IsValid() ? OutputPathDirectoryPickerPtr->GetDirectory() : TOptional<FString>();
	State.bRunOnSeparateProcess = RunOnSeparateProcessCheckBoxPtr->IsChecked();
	State.bReportProgressToNotificationWidget = ReportProgressToNotificationWidgetCheckBoxPtr->IsChecked();
	State.bReportProgressToLog = ReportProgressToLogCheckBoxPtr->IsChecked();
	State.ProgressDelegate = ProgressDelegateInputPtr->GetInputTextBoxText();
	State.StoppedDelegate = StoppedDelegateInputPtr->GetInputTextBoxText();
	State.NumThreads = NumThreadsBoxValue.GetValue();

	return State;
}

SMainTaskOptions::PredictedValues::PredictedValues(TSharedPtr<ProjectInfo> Project)
{
	UDocToolFunctions::PredictValuesPreMainTask_TargetingProject(
		Project->Name,
		Project->Path,
		NonEngineTargetDisplayName,
		OutputPath,
		NumThreads,
		MaxThreads
	);
}

SMainTaskOptions::PredictedValues::PredictedValues(TSharedPtr<PluginInfo> Plugin)
{
	UDocToolFunctions::PredictValuesPreMainTask_TargetingPlugin(
		Plugin->Name,
		FPaths::GetPath(Plugin->Path),
		Plugin->FriendlyName,
		NonEngineTargetDisplayName,
		OutputPath,
		NumThreads,
		MaxThreads
	);
}

SMainTaskOptions::PredictedValues::PredictedValues(TSharedPtr<EngineInfo> Engine)
{
	UDocToolFunctions::PredictValuesPreMainTask_TargetingEngine(
		NumThreads,
		MaxThreads
	);
}


DocToolWidgetPageInfo SDocToolWidget_CreateDocumentationTargetingProjectOptionsPage::GetHistoryCrumbTrailInfo()
{
	return DocToolWidgetPageInfo(LOCTEXT("Create Documentation Targeting Project Page Display Name", "Options"), EDocToolWidgetPageType::CreateDocumentationTargetingProjectOptions);
}

SDocToolWidget_CreateDocumentationTargetingProjectOptionsPage::SDocToolWidget_CreateDocumentationTargetingProjectOptionsPage()
	: DocToolWidget(nullptr)
	, OptionsPtr(nullptr)
{
}

void SDocToolWidget_CreateDocumentationTargetingProjectOptionsPage::Construct(const FArguments& InArgs)
{
	DocToolWidget = InArgs._DocToolWidget;

	ChildSlot
	[
		SAssignNew(OptionsPtr, SMainTaskOptions)
		.OnHistoryPathClicked(this, &SDocToolWidget_CreateDocumentationTargetingProjectOptionsPage::OnHistoryPathClicked)
		.OnGetCrumbDelimiterContent(this, &SDocToolWidget_CreateDocumentationTargetingProjectOptionsPage::OnGetCrumbDelimiterContent)
		.CrumbTrail({ SDocToolWidget_MainPage::GetHistoryCrumbTrailInfo(), SDocToolWidget_SelectCreateDocumentationTargetTypePage::GetHistoryCrumbTrailInfo(), SDocToolWidget_SelectCreateDocumentationTargetProjectPage::GetHistoryCrumbTrailInfo(), SDocToolWidget_CreateDocumentationTargetingProjectOptionsPage::GetHistoryCrumbTrailInfo() })
		.MainTaskType(EMainTaskType::Documentation)
		.TargetProject(InArgs._TargetProject)
		.OriginalValues(InArgs._OriginalValues)
		.OnBackButtonClicked(this, &SDocToolWidget_CreateDocumentationTargetingProjectOptionsPage::OnBackButtonClicked)
		.OnStartButtonClicked(this, &SDocToolWidget_CreateDocumentationTargetingProjectOptionsPage::OnStartButtonClicked)
	];
}

void SDocToolWidget_CreateDocumentationTargetingProjectOptionsPage::OnHistoryPathClicked(const EDocToolWidgetPageType& CrumbData)
{
	DocToolWidget->OnNavigateAwayFromOptionsPage(OptionsPtr);
	DocToolWidgetHelpers::NavigateDocToolWidgetToPageForHistoryCrumbClick(DocToolWidget, CrumbData);
}

FGetDocToolWidgetCrumbMenuContent_RetValType SDocToolWidget_CreateDocumentationTargetingProjectOptionsPage::OnGetCrumbDelimiterContent(const EDocToolWidgetPageType& CrumbData)
{
	return SNullWidget::NullWidget;
}

FReply SDocToolWidget_CreateDocumentationTargetingProjectOptionsPage::OnBackButtonClicked()
{
	DocToolWidget->OnNavigateAwayFromOptionsPage(OptionsPtr);
	DocToolWidget->SetCurrentViewType_SelectCreateDocumentationTargetProjectPage();
	return FReply::Handled();
}

FReply SDocToolWidget_CreateDocumentationTargetingProjectOptionsPage::OnStartButtonClicked(const FDocOptions& Options)
{
	DocToolWidget->OnNavigateAwayFromOptionsPage(OptionsPtr);
	DocToolWidget->SetCurrentViewType_CreateDocumentationTargetingProjectStartedPage();

	UDocToolFunctions::CreateDocumentation(Options);

	return FReply::Handled();
}


DocToolWidgetPageInfo SDocToolWidget_ParseTargetingProjectOptionsPage::GetHistoryCrumbTrailInfo()
{
	return DocToolWidgetPageInfo(LOCTEXT("Parse Targeting Project Page Display Name", "Options"), EDocToolWidgetPageType::ParseTargetingProjectOptions);
}

SDocToolWidget_ParseTargetingProjectOptionsPage::SDocToolWidget_ParseTargetingProjectOptionsPage()
	: DocToolWidget(nullptr)
	, OptionsPtr(nullptr)
{
}

void SDocToolWidget_ParseTargetingProjectOptionsPage::Construct(const FArguments& InArgs)
{
	DocToolWidget = InArgs._DocToolWidget;

	ChildSlot
	[
		SAssignNew(OptionsPtr, SMainTaskOptions)
		.OnHistoryPathClicked(this, &SDocToolWidget_ParseTargetingProjectOptionsPage::OnHistoryPathClicked)
		.OnGetCrumbDelimiterContent(this, &SDocToolWidget_ParseTargetingProjectOptionsPage::OnGetCrumbDelimiterContent)
		.CrumbTrail({ SDocToolWidget_MainPage::GetHistoryCrumbTrailInfo(), SDocToolWidget_SelectParseTargetTypePage::GetHistoryCrumbTrailInfo(), SDocToolWidget_SelectParseTargetProjectPage::GetHistoryCrumbTrailInfo(), SDocToolWidget_ParseTargetingProjectOptionsPage::GetHistoryCrumbTrailInfo() })
		.MainTaskType(EMainTaskType::ParseThenPostProcess)
		.TargetProject(InArgs._TargetProject)
		.OriginalValues(InArgs._OriginalValues)
		.OnBackButtonClicked(this, &SDocToolWidget_ParseTargetingProjectOptionsPage::OnBackButtonClicked)
		.OnStartButtonClicked(this, &SDocToolWidget_ParseTargetingProjectOptionsPage::OnStartButtonClicked)
	];
}

void SDocToolWidget_ParseTargetingProjectOptionsPage::OnHistoryPathClicked(const EDocToolWidgetPageType& CrumbData)
{
	DocToolWidget->OnNavigateAwayFromOptionsPage(OptionsPtr);
	DocToolWidgetHelpers::NavigateDocToolWidgetToPageForHistoryCrumbClick(DocToolWidget, CrumbData);
}

FGetDocToolWidgetCrumbMenuContent_RetValType SDocToolWidget_ParseTargetingProjectOptionsPage::OnGetCrumbDelimiterContent(const EDocToolWidgetPageType& CrumbData)
{
	return SNullWidget::NullWidget;
}

FReply SDocToolWidget_ParseTargetingProjectOptionsPage::OnBackButtonClicked()
{
	DocToolWidget->OnNavigateAwayFromOptionsPage(OptionsPtr);
	DocToolWidget->SetCurrentViewType_SelectParseTargetProjectPage();
	return FReply::Handled();
}

FReply SDocToolWidget_ParseTargetingProjectOptionsPage::OnStartButtonClicked(const FDocOptions& Options)
{
	DocToolWidget->OnNavigateAwayFromOptionsPage(OptionsPtr);
	DocToolWidget->SetCurrentViewType_ParseTargetingProjectStartedPage();

	UDocToolFunctions::ParseThenPostProcess(Options);

	return FReply::Handled();
}


DocToolWidgetPageInfo SDocToolWidget_CreateDocumentationTargetingPluginOptionsPage::GetHistoryCrumbTrailInfo()
{
	return DocToolWidgetPageInfo(LOCTEXT("Create Documentation Targeting Plugin Page Display Name", "Options"), EDocToolWidgetPageType::CreateDocumentationTargetingPluginOptions);
}

SDocToolWidget_CreateDocumentationTargetingPluginOptionsPage::SDocToolWidget_CreateDocumentationTargetingPluginOptionsPage()
	: DocToolWidget(nullptr)
	, OptionsPtr(nullptr)
{
}

void SDocToolWidget_CreateDocumentationTargetingPluginOptionsPage::Construct(const FArguments& InArgs)
{
	DocToolWidget = InArgs._DocToolWidget;

	ChildSlot
	[
		SAssignNew(OptionsPtr, SMainTaskOptions)
		.OnHistoryPathClicked(this, &SDocToolWidget_CreateDocumentationTargetingPluginOptionsPage::OnHistoryPathClicked)
		.OnGetCrumbDelimiterContent(this, &SDocToolWidget_CreateDocumentationTargetingPluginOptionsPage::OnGetCrumbDelimiterContent)
		.CrumbTrail({ SDocToolWidget_MainPage::GetHistoryCrumbTrailInfo(), SDocToolWidget_SelectCreateDocumentationTargetTypePage::GetHistoryCrumbTrailInfo(), SDocToolWidget_SelectCreateDocumentationTargetPluginPage::GetHistoryCrumbTrailInfo(), SDocToolWidget_CreateDocumentationTargetingPluginOptionsPage::GetHistoryCrumbTrailInfo() })
		.MainTaskType(EMainTaskType::Documentation)
		.TargetPlugin(InArgs._TargetPlugin)
		.OriginalValues(InArgs._OriginalValues)
		.OnBackButtonClicked(this, &SDocToolWidget_CreateDocumentationTargetingPluginOptionsPage::OnBackButtonClicked)
		.OnStartButtonClicked(this, &SDocToolWidget_CreateDocumentationTargetingPluginOptionsPage::OnStartButtonClicked)
	];
}

void SDocToolWidget_CreateDocumentationTargetingPluginOptionsPage::OnHistoryPathClicked(const EDocToolWidgetPageType& CrumbData)
{
	DocToolWidget->OnNavigateAwayFromOptionsPage(OptionsPtr);
	DocToolWidgetHelpers::NavigateDocToolWidgetToPageForHistoryCrumbClick(DocToolWidget, CrumbData);
}

FGetDocToolWidgetCrumbMenuContent_RetValType SDocToolWidget_CreateDocumentationTargetingPluginOptionsPage::OnGetCrumbDelimiterContent(const EDocToolWidgetPageType& CrumbData)
{
	return SNullWidget::NullWidget;
}

FReply SDocToolWidget_CreateDocumentationTargetingPluginOptionsPage::OnBackButtonClicked()
{
	DocToolWidget->OnNavigateAwayFromOptionsPage(OptionsPtr);
	DocToolWidget->SetCurrentViewType_SelectCreateDocumentationTargetPluginPage();
	return FReply::Handled();
}

FReply SDocToolWidget_CreateDocumentationTargetingPluginOptionsPage::OnStartButtonClicked(const FDocOptions& Options)
{
	DocToolWidget->OnNavigateAwayFromOptionsPage(OptionsPtr);
	DocToolWidget->SetCurrentViewType_CreateDocumentationTargetingPluginStartedPage();

	UDocToolFunctions::CreateDocumentation(Options);

	return FReply::Handled();
}


DocToolWidgetPageInfo SDocToolWidget_ParseTargetingPluginOptionsPage::GetHistoryCrumbTrailInfo()
{
	return DocToolWidgetPageInfo(LOCTEXT("Parse Targeting Plugin Page Display Name", "Options"), EDocToolWidgetPageType::ParseTargetingPluginOptions);
}

SDocToolWidget_ParseTargetingPluginOptionsPage::SDocToolWidget_ParseTargetingPluginOptionsPage()
	: DocToolWidget(nullptr)
	, OptionsPtr(nullptr)
{
}

void SDocToolWidget_ParseTargetingPluginOptionsPage::Construct(const FArguments& InArgs)
{
	DocToolWidget = InArgs._DocToolWidget;

	ChildSlot
	[
		SAssignNew(OptionsPtr, SMainTaskOptions)
		.OnHistoryPathClicked(this, &SDocToolWidget_ParseTargetingPluginOptionsPage::OnHistoryPathClicked)
		.OnGetCrumbDelimiterContent(this, &SDocToolWidget_ParseTargetingPluginOptionsPage::OnGetCrumbDelimiterContent)
		.CrumbTrail({ SDocToolWidget_MainPage::GetHistoryCrumbTrailInfo(), SDocToolWidget_SelectParseTargetTypePage::GetHistoryCrumbTrailInfo(), SDocToolWidget_SelectParseTargetPluginPage::GetHistoryCrumbTrailInfo(), SDocToolWidget_ParseTargetingPluginOptionsPage::GetHistoryCrumbTrailInfo() })
		.MainTaskType(EMainTaskType::ParseThenPostProcess)
		.TargetPlugin(InArgs._TargetPlugin)
		.OriginalValues(InArgs._OriginalValues)
		.OnBackButtonClicked(this, &SDocToolWidget_ParseTargetingPluginOptionsPage::OnBackButtonClicked)
		.OnStartButtonClicked(this, &SDocToolWidget_ParseTargetingPluginOptionsPage::OnStartButtonClicked)
	];
}

void SDocToolWidget_ParseTargetingPluginOptionsPage::OnHistoryPathClicked(const EDocToolWidgetPageType& CrumbData)
{
	DocToolWidget->OnNavigateAwayFromOptionsPage(OptionsPtr);
	DocToolWidgetHelpers::NavigateDocToolWidgetToPageForHistoryCrumbClick(DocToolWidget, CrumbData);
}

FGetDocToolWidgetCrumbMenuContent_RetValType SDocToolWidget_ParseTargetingPluginOptionsPage::OnGetCrumbDelimiterContent(const EDocToolWidgetPageType& CrumbData)
{
	return SNullWidget::NullWidget;
}

FReply SDocToolWidget_ParseTargetingPluginOptionsPage::OnBackButtonClicked()
{
	DocToolWidget->OnNavigateAwayFromOptionsPage(OptionsPtr);
	DocToolWidget->SetCurrentViewType_SelectParseTargetPluginPage();
	return FReply::Handled();
}

FReply SDocToolWidget_ParseTargetingPluginOptionsPage::OnStartButtonClicked(const FDocOptions& Options)
{
	DocToolWidget->OnNavigateAwayFromOptionsPage(OptionsPtr);
	DocToolWidget->SetCurrentViewType_ParseTargetingPluginStartedPage();

	UDocToolFunctions::ParseThenPostProcess(Options);

	return FReply::Handled();
}


DocToolWidgetPageInfo SDocToolWidget_CreateDocumentationTargetingEngineOptionsPage::GetHistoryCrumbTrailInfo()
{
	return DocToolWidgetPageInfo(LOCTEXT("Create Documentation Targeting Engine Page Display Name", "Options"), EDocToolWidgetPageType::CreateDocumentationTargetingEngineOptions);
}

SDocToolWidget_CreateDocumentationTargetingEngineOptionsPage::SDocToolWidget_CreateDocumentationTargetingEngineOptionsPage()
	: DocToolWidget(nullptr)
	, OptionsPtr(nullptr)
{
}

void SDocToolWidget_CreateDocumentationTargetingEngineOptionsPage::Construct(const FArguments& InArgs)
{
	DocToolWidget = InArgs._DocToolWidget;

	ChildSlot
	[
		SAssignNew(OptionsPtr, SMainTaskOptions)
		.OnHistoryPathClicked(this, &SDocToolWidget_CreateDocumentationTargetingEngineOptionsPage::OnHistoryPathClicked)
		.OnGetCrumbDelimiterContent(this, &SDocToolWidget_CreateDocumentationTargetingEngineOptionsPage::OnGetCrumbDelimiterContent)
		.CrumbTrail({ SDocToolWidget_MainPage::GetHistoryCrumbTrailInfo(), SDocToolWidget_SelectCreateDocumentationTargetTypePage::GetHistoryCrumbTrailInfo(), SDocToolWidget_SelectCreateDocumentationTargetEnginePage::GetHistoryCrumbTrailInfo(), SDocToolWidget_CreateDocumentationTargetingEngineOptionsPage::GetHistoryCrumbTrailInfo() })
		.MainTaskType(EMainTaskType::Documentation)
		.TargetEngine(InArgs._TargetEngine)
		.OriginalValues(InArgs._OriginalValues)
		.OnBackButtonClicked(this, &SDocToolWidget_CreateDocumentationTargetingEngineOptionsPage::OnBackButtonClicked)
		.OnStartButtonClicked(this, &SDocToolWidget_CreateDocumentationTargetingEngineOptionsPage::OnStartButtonClicked)
	];
}

void SDocToolWidget_CreateDocumentationTargetingEngineOptionsPage::OnHistoryPathClicked(const EDocToolWidgetPageType& CrumbData)
{
	DocToolWidget->OnNavigateAwayFromOptionsPage(OptionsPtr);
	DocToolWidgetHelpers::NavigateDocToolWidgetToPageForHistoryCrumbClick(DocToolWidget, CrumbData);
}

FGetDocToolWidgetCrumbMenuContent_RetValType SDocToolWidget_CreateDocumentationTargetingEngineOptionsPage::OnGetCrumbDelimiterContent(const EDocToolWidgetPageType& CrumbData)
{
	return SNullWidget::NullWidget;
}

FReply SDocToolWidget_CreateDocumentationTargetingEngineOptionsPage::OnBackButtonClicked()
{
	DocToolWidget->OnNavigateAwayFromOptionsPage(OptionsPtr);
	DocToolWidget->SetCurrentViewType_SelectCreateDocumentationTargetEnginePage();
	return FReply::Handled();
}

FReply SDocToolWidget_CreateDocumentationTargetingEngineOptionsPage::OnStartButtonClicked(const FDocOptions& Options)
{
	DocToolWidget->OnNavigateAwayFromOptionsPage(OptionsPtr);
	DocToolWidget->SetCurrentViewType_CreateDocumentationTargetingEngineStartedPage();

	UDocToolFunctions::CreateDocumentation(Options);

	return FReply::Handled();
}


DocToolWidgetPageInfo SDocToolWidget_ParseTargetingEngineOptionsPage::GetHistoryCrumbTrailInfo()
{
	return DocToolWidgetPageInfo(LOCTEXT("Parse Targeting Engine Page Display Name", "Options"), EDocToolWidgetPageType::ParseTargetingEngineOptions);
}

SDocToolWidget_ParseTargetingEngineOptionsPage::SDocToolWidget_ParseTargetingEngineOptionsPage()
	: DocToolWidget(nullptr)
	, OptionsPtr(nullptr)
{
}

void SDocToolWidget_ParseTargetingEngineOptionsPage::Construct(const FArguments& InArgs)
{
	DocToolWidget = InArgs._DocToolWidget;

	ChildSlot
	[
		SAssignNew(OptionsPtr, SMainTaskOptions)
		.OnHistoryPathClicked(this, &SDocToolWidget_ParseTargetingEngineOptionsPage::OnHistoryPathClicked)
		.OnGetCrumbDelimiterContent(this, &SDocToolWidget_ParseTargetingEngineOptionsPage::OnGetCrumbDelimiterContent)
		.CrumbTrail({ SDocToolWidget_MainPage::GetHistoryCrumbTrailInfo(), SDocToolWidget_SelectParseTargetTypePage::GetHistoryCrumbTrailInfo(), SDocToolWidget_SelectParseTargetEnginePage::GetHistoryCrumbTrailInfo(), SDocToolWidget_ParseTargetingEngineOptionsPage::GetHistoryCrumbTrailInfo() })
		.MainTaskType(EMainTaskType::ParseThenPostProcess)
		.TargetEngine(InArgs._TargetEngine)
		.OriginalValues(InArgs._OriginalValues)
		.OnBackButtonClicked(this, &SDocToolWidget_ParseTargetingEngineOptionsPage::OnBackButtonClicked)
		.OnStartButtonClicked(this, &SDocToolWidget_ParseTargetingEngineOptionsPage::OnStartButtonClicked)
	];
}

void SDocToolWidget_ParseTargetingEngineOptionsPage::OnHistoryPathClicked(const EDocToolWidgetPageType& CrumbData)
{
	DocToolWidget->OnNavigateAwayFromOptionsPage(OptionsPtr);
	DocToolWidgetHelpers::NavigateDocToolWidgetToPageForHistoryCrumbClick(DocToolWidget, CrumbData);
}

FGetDocToolWidgetCrumbMenuContent_RetValType SDocToolWidget_ParseTargetingEngineOptionsPage::OnGetCrumbDelimiterContent(const EDocToolWidgetPageType& CrumbData)
{
	return SNullWidget::NullWidget;
}

FReply SDocToolWidget_ParseTargetingEngineOptionsPage::OnBackButtonClicked()
{
	DocToolWidget->OnNavigateAwayFromOptionsPage(OptionsPtr);
	DocToolWidget->SetCurrentViewType_SelectParseTargetEnginePage();
	return FReply::Handled();
}

FReply SDocToolWidget_ParseTargetingEngineOptionsPage::OnStartButtonClicked(const FDocOptions& Options)
{
	DocToolWidget->OnNavigateAwayFromOptionsPage(OptionsPtr);
	DocToolWidget->SetCurrentViewType_ParseTargetingEngineStartedPage();

	UDocToolFunctions::ParseThenPostProcess(Options);

	return FReply::Handled();
}


void SMainTaskStarted::Construct(const FArguments& InArgs)
{
	ChildSlot
	[
		SNew(SBorder)
		.BorderImage(FEditorStyle::GetBrush(TEXT("ToolPanel.GroupBorder")))
		.Padding(FMargin(8.f, 4.f))
		[
			SNew(SVerticalBox)

			+ DocToolWidgetHelpers::AddPageHeader(
				(InArgs._MainTaskType == EMainTaskType::Documentation) ? LOCTEXT("Documentation Underway", "Documentation Underway") : LOCTEXT("Parse Underway", "Parse Underway"),
				InArgs._OnCrumbClicked,
				InArgs._GetCrumbMenuContent,
				nullptr,
				InArgs._CrumbTrail
			)

			+ SVerticalBox::Slot()
			.HAlign(HAlign_Center)
			.VAlign(VAlign_Center)
			[
				SNew(STextBlock)
				.Text((InArgs._MainTaskType == EMainTaskType::Documentation) ? LOCTEXT("Documentation underway", "Documentation underway") : LOCTEXT("Parse underway", "Parse underway"))
			]

			+ SVerticalBox::Slot()
			.Padding(0, 20, 0, 0)
			.AutoHeight()
			[
				SNew(SHorizontalBox)

				// Back to main menu button
				+ SHorizontalBox::Slot()
				.AutoWidth()
				.Padding(0.f, 0.f, 8.f, 0.f)
				[
					SNew(SButton)
					.ButtonStyle(FDocToolStyle::Get(), TEXT("DocToolWidget.GenericButton"))
					.HAlign(HAlign_Center)
					.VAlign(VAlign_Center)
					.Text(LOCTEXT("Back to Main Menu", "Back to Main Menu"))
					.OnClicked(InArgs._OnReturnToMainMenuButtonClicked)
				]
			]
		]
	];
}


DocToolWidgetPageInfo SDocToolWidget_CreateDocumentationTargetingProjectStartedPage::GetHistoryCrumbTrailInfo()
{
	return DocToolWidgetPageInfo(LOCTEXT("Create Documentation Started Page Display Name", "Started"), EDocToolWidgetPageType::CreateDocumentationTargetingProjectStarted);
}

SDocToolWidget_CreateDocumentationTargetingProjectStartedPage::SDocToolWidget_CreateDocumentationTargetingProjectStartedPage()
	: DocToolWidget(nullptr)
{
}

void SDocToolWidget_CreateDocumentationTargetingProjectStartedPage::Construct(const FArguments& InArgs)
{
	DocToolWidget = InArgs._DocToolWidget;

	ChildSlot
	[
		SNew(SMainTaskStarted)
		.MainTaskType(EMainTaskType::Documentation)
		.OnCrumbClicked(this, &SDocToolWidget_CreateDocumentationTargetingProjectStartedPage::OnHistoryPathClicked)
		.GetCrumbMenuContent(this, &SDocToolWidget_CreateDocumentationTargetingProjectStartedPage::OnGetCrumbDelimiterContent)
		.CrumbTrail({ SDocToolWidget_MainPage::GetHistoryCrumbTrailInfo(), SDocToolWidget_SelectCreateDocumentationTargetTypePage::GetHistoryCrumbTrailInfo(), SDocToolWidget_SelectCreateDocumentationTargetProjectPage::GetHistoryCrumbTrailInfo(), SDocToolWidget_CreateDocumentationTargetingProjectOptionsPage::GetHistoryCrumbTrailInfo(), SDocToolWidget_CreateDocumentationTargetingProjectStartedPage::GetHistoryCrumbTrailInfo() })
		.OnReturnToMainMenuButtonClicked(this, &SDocToolWidget_CreateDocumentationTargetingProjectStartedPage::OnBackToMainMenuButtonClicked)
	];
}

void SDocToolWidget_CreateDocumentationTargetingProjectStartedPage::OnHistoryPathClicked(const EDocToolWidgetPageType& CrumbData)
{
	DocToolWidgetHelpers::NavigateDocToolWidgetToPageForHistoryCrumbClick(DocToolWidget, CrumbData);
}

FGetDocToolWidgetCrumbMenuContent_RetValType SDocToolWidget_CreateDocumentationTargetingProjectStartedPage::OnGetCrumbDelimiterContent(const EDocToolWidgetPageType& CrumbData)
{
	return SNullWidget::NullWidget;
}

FReply SDocToolWidget_CreateDocumentationTargetingProjectStartedPage::OnBackToMainMenuButtonClicked()
{
	DocToolWidget->SetCurrentViewType_MainPage();
	return FReply::Handled();
}


DocToolWidgetPageInfo SDocToolWidget_CreateDocumentationTargetingPluginStartedPage::GetHistoryCrumbTrailInfo()
{
	return DocToolWidgetPageInfo(LOCTEXT("Create Documentation Started Page Display Name", "Started"), EDocToolWidgetPageType::CreateDocumentationTargetingPluginStarted);
}

SDocToolWidget_CreateDocumentationTargetingPluginStartedPage::SDocToolWidget_CreateDocumentationTargetingPluginStartedPage()
	: DocToolWidget(nullptr)
{
}

void SDocToolWidget_CreateDocumentationTargetingPluginStartedPage::Construct(const FArguments& InArgs)
{
	DocToolWidget = InArgs._DocToolWidget;

	ChildSlot
	[
		SNew(SMainTaskStarted)
		.MainTaskType(EMainTaskType::Documentation)
		.OnCrumbClicked(this, &SDocToolWidget_CreateDocumentationTargetingPluginStartedPage::OnHistoryPathClicked)
		.GetCrumbMenuContent(this, &SDocToolWidget_CreateDocumentationTargetingPluginStartedPage::OnGetCrumbDelimiterContent)
		.CrumbTrail({ SDocToolWidget_MainPage::GetHistoryCrumbTrailInfo(), SDocToolWidget_SelectCreateDocumentationTargetTypePage::GetHistoryCrumbTrailInfo(), SDocToolWidget_SelectCreateDocumentationTargetPluginPage::GetHistoryCrumbTrailInfo(), SDocToolWidget_CreateDocumentationTargetingPluginOptionsPage::GetHistoryCrumbTrailInfo(), SDocToolWidget_CreateDocumentationTargetingPluginStartedPage::GetHistoryCrumbTrailInfo() })
		.OnReturnToMainMenuButtonClicked(this, &SDocToolWidget_CreateDocumentationTargetingPluginStartedPage::OnBackToMainMenuButtonClicked)
	];
}

void SDocToolWidget_CreateDocumentationTargetingPluginStartedPage::OnHistoryPathClicked(const EDocToolWidgetPageType& CrumbData)
{
	DocToolWidgetHelpers::NavigateDocToolWidgetToPageForHistoryCrumbClick(DocToolWidget, CrumbData);
}

FGetDocToolWidgetCrumbMenuContent_RetValType SDocToolWidget_CreateDocumentationTargetingPluginStartedPage::OnGetCrumbDelimiterContent(const EDocToolWidgetPageType& CrumbData)
{
	return SNullWidget::NullWidget;
}

FReply SDocToolWidget_CreateDocumentationTargetingPluginStartedPage::OnBackToMainMenuButtonClicked()
{
	DocToolWidget->SetCurrentViewType_MainPage();
	return FReply::Handled();
}


DocToolWidgetPageInfo SDocToolWidget_CreateDocumentationTargetingEngineStartedPage::GetHistoryCrumbTrailInfo()
{
	return DocToolWidgetPageInfo(LOCTEXT("Create Documentation Started Page Display Name", "Started"), EDocToolWidgetPageType::CreateDocumentationTargetingEngineStarted);
}

SDocToolWidget_CreateDocumentationTargetingEngineStartedPage::SDocToolWidget_CreateDocumentationTargetingEngineStartedPage()
	: DocToolWidget(nullptr)
{
}

void SDocToolWidget_CreateDocumentationTargetingEngineStartedPage::Construct(const FArguments& InArgs)
{
	DocToolWidget = InArgs._DocToolWidget;

	ChildSlot
	[
		SNew(SMainTaskStarted)
		.MainTaskType(EMainTaskType::Documentation)
		.OnCrumbClicked(this, &SDocToolWidget_CreateDocumentationTargetingEngineStartedPage::OnHistoryPathClicked)
		.GetCrumbMenuContent(this, &SDocToolWidget_CreateDocumentationTargetingEngineStartedPage::OnGetCrumbDelimiterContent)
		.CrumbTrail({ SDocToolWidget_MainPage::GetHistoryCrumbTrailInfo(), SDocToolWidget_SelectCreateDocumentationTargetTypePage::GetHistoryCrumbTrailInfo(), SDocToolWidget_SelectCreateDocumentationTargetEnginePage::GetHistoryCrumbTrailInfo(), SDocToolWidget_CreateDocumentationTargetingEngineOptionsPage::GetHistoryCrumbTrailInfo(), SDocToolWidget_CreateDocumentationTargetingEngineStartedPage::GetHistoryCrumbTrailInfo() })
		.OnReturnToMainMenuButtonClicked(this, &SDocToolWidget_CreateDocumentationTargetingEngineStartedPage::OnBackToMainMenuButtonClicked)
	];
}

void SDocToolWidget_CreateDocumentationTargetingEngineStartedPage::OnHistoryPathClicked(const EDocToolWidgetPageType& CrumbData)
{
	DocToolWidgetHelpers::NavigateDocToolWidgetToPageForHistoryCrumbClick(DocToolWidget, CrumbData);
}

FGetDocToolWidgetCrumbMenuContent_RetValType SDocToolWidget_CreateDocumentationTargetingEngineStartedPage::OnGetCrumbDelimiterContent(const EDocToolWidgetPageType& CrumbData)
{
	return SNullWidget::NullWidget;
}

FReply SDocToolWidget_CreateDocumentationTargetingEngineStartedPage::OnBackToMainMenuButtonClicked()
{
	DocToolWidget->SetCurrentViewType_MainPage();
	return FReply::Handled();
}


DocToolWidgetPageInfo SDocToolWidget_ParseTargetingProjectStartedPage::GetHistoryCrumbTrailInfo()
{
	return DocToolWidgetPageInfo(LOCTEXT("Parse Started Page Display Name", "Started"), EDocToolWidgetPageType::ParseTargetingProjectStarted);
}

SDocToolWidget_ParseTargetingProjectStartedPage::SDocToolWidget_ParseTargetingProjectStartedPage()
	: DocToolWidget(nullptr)
{
}

void SDocToolWidget_ParseTargetingProjectStartedPage::Construct(const FArguments& InArgs)
{
	DocToolWidget = InArgs._DocToolWidget;

	ChildSlot
	[
		SNew(SMainTaskStarted)
		.MainTaskType(EMainTaskType::ParseThenPostProcess)
		.OnCrumbClicked(this, &SDocToolWidget_ParseTargetingProjectStartedPage::OnHistoryPathClicked)
		.GetCrumbMenuContent(this, &SDocToolWidget_ParseTargetingProjectStartedPage::OnGetCrumbDelimiterContent)
		.CrumbTrail({ SDocToolWidget_MainPage::GetHistoryCrumbTrailInfo(), SDocToolWidget_SelectParseTargetTypePage::GetHistoryCrumbTrailInfo(), SDocToolWidget_SelectParseTargetProjectPage::GetHistoryCrumbTrailInfo(), SDocToolWidget_ParseTargetingProjectOptionsPage::GetHistoryCrumbTrailInfo(), SDocToolWidget_ParseTargetingProjectStartedPage::GetHistoryCrumbTrailInfo() })
		.OnReturnToMainMenuButtonClicked(this, &SDocToolWidget_ParseTargetingProjectStartedPage::OnBackToMainMenuButtonClicked)
	];
}

void SDocToolWidget_ParseTargetingProjectStartedPage::OnHistoryPathClicked(const EDocToolWidgetPageType& CrumbData)
{
	DocToolWidgetHelpers::NavigateDocToolWidgetToPageForHistoryCrumbClick(DocToolWidget, CrumbData);
}

FGetDocToolWidgetCrumbMenuContent_RetValType SDocToolWidget_ParseTargetingProjectStartedPage::OnGetCrumbDelimiterContent(const EDocToolWidgetPageType& CrumbData)
{
	return SNullWidget::NullWidget;
}

FReply SDocToolWidget_ParseTargetingProjectStartedPage::OnBackToMainMenuButtonClicked()
{
	DocToolWidget->SetCurrentViewType_MainPage();
	return FReply::Handled();
}


DocToolWidgetPageInfo SDocToolWidget_ParseTargetingPluginStartedPage::GetHistoryCrumbTrailInfo()
{
	return DocToolWidgetPageInfo(LOCTEXT("Parse Started Page Display Name", "Started"), EDocToolWidgetPageType::ParseTargetingPluginStarted);
}

SDocToolWidget_ParseTargetingPluginStartedPage::SDocToolWidget_ParseTargetingPluginStartedPage()
	: DocToolWidget(nullptr)
{
}

void SDocToolWidget_ParseTargetingPluginStartedPage::Construct(const FArguments& InArgs)
{
	DocToolWidget = InArgs._DocToolWidget;

	ChildSlot
	[
		SNew(SMainTaskStarted)
		.MainTaskType(EMainTaskType::ParseThenPostProcess)
		.OnCrumbClicked(this, &SDocToolWidget_ParseTargetingPluginStartedPage::OnHistoryPathClicked)
		.GetCrumbMenuContent(this, &SDocToolWidget_ParseTargetingPluginStartedPage::OnGetCrumbDelimiterContent)
		.CrumbTrail({ SDocToolWidget_MainPage::GetHistoryCrumbTrailInfo(), SDocToolWidget_SelectParseTargetTypePage::GetHistoryCrumbTrailInfo(), SDocToolWidget_SelectParseTargetPluginPage::GetHistoryCrumbTrailInfo(), SDocToolWidget_ParseTargetingPluginOptionsPage::GetHistoryCrumbTrailInfo(), SDocToolWidget_ParseTargetingPluginStartedPage::GetHistoryCrumbTrailInfo() })
		.OnReturnToMainMenuButtonClicked(this, &SDocToolWidget_ParseTargetingPluginStartedPage::OnBackToMainMenuButtonClicked)
	];
}

void SDocToolWidget_ParseTargetingPluginStartedPage::OnHistoryPathClicked(const EDocToolWidgetPageType& CrumbData)
{
	DocToolWidgetHelpers::NavigateDocToolWidgetToPageForHistoryCrumbClick(DocToolWidget, CrumbData);
}

FGetDocToolWidgetCrumbMenuContent_RetValType SDocToolWidget_ParseTargetingPluginStartedPage::OnGetCrumbDelimiterContent(const EDocToolWidgetPageType& CrumbData)
{
	return SNullWidget::NullWidget;
}

FReply SDocToolWidget_ParseTargetingPluginStartedPage::OnBackToMainMenuButtonClicked()
{
	DocToolWidget->SetCurrentViewType_MainPage();
	return FReply::Handled();
}


DocToolWidgetPageInfo SDocToolWidget_ParseTargetingEngineStartedPage::GetHistoryCrumbTrailInfo()
{
	return DocToolWidgetPageInfo(LOCTEXT("Parse Started Page Display Name", "Started"), EDocToolWidgetPageType::ParseTargetingEngineStarted);
}

SDocToolWidget_ParseTargetingEngineStartedPage::SDocToolWidget_ParseTargetingEngineStartedPage()
	: DocToolWidget(nullptr)
{
}

void SDocToolWidget_ParseTargetingEngineStartedPage::Construct(const FArguments& InArgs)
{
	DocToolWidget = InArgs._DocToolWidget;

	ChildSlot
	[
		SNew(SMainTaskStarted)
		.MainTaskType(EMainTaskType::ParseThenPostProcess)
		.OnCrumbClicked(this, &SDocToolWidget_ParseTargetingEngineStartedPage::OnHistoryPathClicked)
		.GetCrumbMenuContent(this, &SDocToolWidget_ParseTargetingEngineStartedPage::OnGetCrumbDelimiterContent)
		.CrumbTrail({ SDocToolWidget_MainPage::GetHistoryCrumbTrailInfo(), SDocToolWidget_SelectParseTargetTypePage::GetHistoryCrumbTrailInfo(), SDocToolWidget_SelectParseTargetEnginePage::GetHistoryCrumbTrailInfo(), SDocToolWidget_ParseTargetingEngineOptionsPage::GetHistoryCrumbTrailInfo(), SDocToolWidget_ParseTargetingEngineStartedPage::GetHistoryCrumbTrailInfo() })
		.OnReturnToMainMenuButtonClicked(this, &SDocToolWidget_ParseTargetingEngineStartedPage::OnBackToMainMenuButtonClicked)
	];
}

void SDocToolWidget_ParseTargetingEngineStartedPage::OnHistoryPathClicked(const EDocToolWidgetPageType& CrumbData)
{
	DocToolWidgetHelpers::NavigateDocToolWidgetToPageForHistoryCrumbClick(DocToolWidget, CrumbData);
}

FGetDocToolWidgetCrumbMenuContent_RetValType SDocToolWidget_ParseTargetingEngineStartedPage::OnGetCrumbDelimiterContent(const EDocToolWidgetPageType& CrumbData)
{
	return SNullWidget::NullWidget;
}

FReply SDocToolWidget_ParseTargetingEngineStartedPage::OnBackToMainMenuButtonClicked()
{
	DocToolWidget->SetCurrentViewType_MainPage();
	return FReply::Handled();
}


DocToolWidgetPageInfo SDocToolWidget_MiscellaneousPage::GetHistoryCrumbTrailInfo()
{
	return DocToolWidgetPageInfo(LOCTEXT("Miscellaneous Page Display Name", "Miscellaneous"), EDocToolWidgetPageType::Miscellaneous);
}

SDocToolWidget_MiscellaneousPage::SDocToolWidget_MiscellaneousPage()
	: DocToolWidget(nullptr)
{
}

void SDocToolWidget_MiscellaneousPage::Construct(const FArguments& InArgs)
{
	DocToolWidget = InArgs._DocToolWidget;

	ChildSlot
	[
		SNew(SBorder)
		.BorderImage(FEditorStyle::GetBrush(TEXT("ToolPanel.GroupBorder")))
		.Padding(FMargin(8.f, 4.f))
		[
			SNew(SVerticalBox)

			+ DocToolWidgetHelpers::AddPageHeader(
				LOCTEXT("Miscellaneous", "Miscellaneous"),
				FOnDocToolWidgetCrumbClicked::CreateSP(this, &SDocToolWidget_MiscellaneousPage::OnHistoryPathClicked),
				FGetDocToolWidgetCrumbMenuContent::CreateSP(this, &SDocToolWidget_MiscellaneousPage::OnGetCrumbDelimiterContent),
				nullptr,
				{ SDocToolWidget_MainPage::GetHistoryCrumbTrailInfo(), SDocToolWidget_MiscellaneousPage::GetHistoryCrumbTrailInfo() }
			)

			+ SVerticalBox::Slot()
			.Padding(0, 20, 0, 0)
			.AutoHeight()
			[
				SNew(SHorizontalBox)

				// Back Button
				+ SHorizontalBox::Slot()
				.AutoWidth()
				.Padding(0.f, 0.f, 8.f, 0.f)
				[
					SNew(SButton)
					.ButtonStyle(FDocToolStyle::Get(), TEXT("DocToolWidget.GenericButton"))
					.HAlign(HAlign_Center)
					.VAlign(VAlign_Center)
					.Text(FText::AsCultureInvariant(TEXT("Back")))
					.OnClicked(this, &SDocToolWidget_MiscellaneousPage::OnBackButtonClicked)
				]
			]
		]
	];
}

void SDocToolWidget_MiscellaneousPage::OnHistoryPathClicked(const EDocToolWidgetPageType& CrumbData)
{
	DocToolWidgetHelpers::NavigateDocToolWidgetToPageForHistoryCrumbClick(DocToolWidget, CrumbData);
}

FGetDocToolWidgetCrumbMenuContent_RetValType SDocToolWidget_MiscellaneousPage::OnGetCrumbDelimiterContent(const EDocToolWidgetPageType& CrumbData)
{
	return SNullWidget::NullWidget;
}

FReply SDocToolWidget_MiscellaneousPage::OnBackButtonClicked()
{
	DocToolWidget->SetCurrentViewType_MainPage();
	return FReply::Handled();
}


DocToolWidgetPageInfo SDocToolWidget_DeveloperToolsPage::GetHistoryCrumbTrailInfo()
{
	return DocToolWidgetPageInfo(LOCTEXT("Developer Tools Page Display Name", "Developer Tools"), EDocToolWidgetPageType::DeveloperTools);
}

SDocToolWidget_DeveloperToolsPage::SDocToolWidget_DeveloperToolsPage()
	: DocToolWidget(nullptr)
{
}

void SDocToolWidget_DeveloperToolsPage::Construct(const FArguments& InArgs)
{
	DocToolWidget = InArgs._DocToolWidget;

	ChildSlot
	[
		SNew(SBorder)
		.BorderImage(FEditorStyle::GetBrush(TEXT("ToolPanel.GroupBorder")))
		.Padding(FMargin(8.f, 4.f))
		[
			SNew(SVerticalBox)

			+ DocToolWidgetHelpers::AddPageHeader(
				LOCTEXT("Developer Tools", "Developer Tools"),
				FOnDocToolWidgetCrumbClicked::CreateSP(this, &SDocToolWidget_DeveloperToolsPage::OnHistoryPathClicked),
				FGetDocToolWidgetCrumbMenuContent::CreateSP(this, &SDocToolWidget_DeveloperToolsPage::OnGetCrumbDelimiterContent),
				nullptr,
				{ SDocToolWidget_MainPage::GetHistoryCrumbTrailInfo(), SDocToolWidget_DeveloperToolsPage::GetHistoryCrumbTrailInfo() }
			)

			// Package doc tool plugin button
			+ SVerticalBox::Slot()
			[
				SNew(SButton)
				.ButtonStyle(FDocToolStyle::Get(), TEXT("DocToolWidget.GenericButton"))
				.HAlign(HAlign_Center)
				.VAlign(VAlign_Center)
				.Text(FText::AsCultureInvariant(TEXT("Package Doc Tool")))
				.OnClicked(this, &SDocToolWidget_DeveloperToolsPage::OnPackageDocToolButtonClicked)
			]

			+ SVerticalBox::Slot()
			.Padding(0, 20, 0, 0)
			.AutoHeight()
			[
				SNew(SHorizontalBox)

				// Back Button
				+ SHorizontalBox::Slot()
				.AutoWidth()
				.Padding(0.f, 0.f, 8.f, 0.f)
				[
					SNew(SButton)
					.ButtonStyle(FDocToolStyle::Get(), TEXT("DocToolWidget.GenericButton"))
					.HAlign(HAlign_Center)
					.VAlign(VAlign_Center)
					.Text(FText::AsCultureInvariant(TEXT("Back")))
					.OnClicked(this, &SDocToolWidget_DeveloperToolsPage::OnBackButtonClicked)
				]
			]
		]
	];
}

void SDocToolWidget_DeveloperToolsPage::OnHistoryPathClicked(const EDocToolWidgetPageType& CrumbData)
{
	DocToolWidgetHelpers::NavigateDocToolWidgetToPageForHistoryCrumbClick(DocToolWidget, CrumbData);
}

FGetDocToolWidgetCrumbMenuContent_RetValType SDocToolWidget_DeveloperToolsPage::OnGetCrumbDelimiterContent(const EDocToolWidgetPageType& CrumbData)
{
	return SNullWidget::NullWidget;
}

FReply SDocToolWidget_DeveloperToolsPage::OnPackageDocToolButtonClicked()
{
	DocToolWidget->SetCurrentViewType_PackageDocToolPage();
	return FReply::Handled();
}

FReply SDocToolWidget_DeveloperToolsPage::OnBackButtonClicked()
{
	DocToolWidget->SetCurrentViewType_MainPage();
	return FReply::Handled();
}


SDocToolWidget_PackageDocToolPage::SDocToolWidget_PackageDocToolPage()
	: DocToolWidget(nullptr)
	, CheckedEngineVersions(TSet<FString, CaseSensitiveStringKeyFuncs>())
{
}

void SDocToolWidget_PackageDocToolPage::Construct(const FArguments& InArgs)
{
	DocToolWidget = InArgs._DocToolWidget;

	TSharedRef<SVerticalBox> EngineCheckBoxesVBox = SNew(SVerticalBox);
	{
		TMap<FString, FString> EngineInstallations;
		DocToolWidgetHelpers::GetEngineInstallations(EngineInstallations);
		EngineInstallations.KeySort([](const FString& A, const FString& B)
		{
			return A < B;
		});

		if (EngineInstallations.Num() > 0)
		{
			/* All the 'all installed engine versions' checkbox */
			EngineCheckBoxesVBox->AddSlot()
			.VAlign(VAlign_Center)
			[
				SNew(SHorizontalBox)

				+ SHorizontalBox::Slot()
				.AutoWidth()
				[
					SNew(STextBlock)
					.Text(FText::AsCultureInvariant(TEXT("All Installed Engine Versions")))
				]

				+ SHorizontalBox::Slot()
				.AutoWidth()
				[
					SNew(SCheckBox)
					.OnCheckStateChanged(this, &SDocToolWidget_PackageDocToolPage::OnEngineInstallationCheckBoxStateChanged, FString(TEXT("All")))
				]
			];

			TSharedPtr<SUniformGridPanel> GridPanel;
			EngineCheckBoxesVBox->AddSlot()
			[
				SAssignNew(GridPanel, SUniformGridPanel)
				.IsEnabled(this, &SDocToolWidget_PackageDocToolPage::HandleEngineVersionsPanelIsEnabled)
			];

			/* Add a checkbox for every engine installation */
			const int32 MAX_ITEMS_PER_ROW = 3;
			int32 Column = 0;
			int32 Row = 1;
			for (const auto& Pair : EngineInstallations)
			{
				Row = (Column == MAX_ITEMS_PER_ROW) ? Row + 1 : Row;
				Column %= MAX_ITEMS_PER_ROW;

				GridPanel->AddSlot(Column++, Row)
				.VAlign(VAlign_Center)
				[
					SNew(SHorizontalBox)

					+ SHorizontalBox::Slot()
					.AutoWidth()
					[
						SNew(STextBlock)
						.Text(FText::AsCultureInvariant(Pair.Key))
					]

					+ SHorizontalBox::Slot()
					.AutoWidth()
					[
						SNew(SCheckBox)
						.OnCheckStateChanged(this, &SDocToolWidget_PackageDocToolPage::OnEngineInstallationCheckBoxStateChanged, Pair.Key)
					]
				];
			}
		}
		else
		{
			EngineCheckBoxesVBox->AddSlot()
			[
				SNew(STextBlock)
				.Text(FText::AsCultureInvariant(TEXT("No engines installed apparently")))
			];
		}
	}

	ChildSlot
	[
		SNew(SBorder)
		.BorderImage(FEditorStyle::GetBrush(TEXT("ToolPanel.GroupBorder")))
		.Padding(FMargin(8.f, 4.f))
		[
			SNew(SVerticalBox)

			+ DocToolWidgetHelpers::AddPageHeader(
				LOCTEXT("Package Doc Tool", "Package Doc Tool"),
				FOnDocToolWidgetCrumbClicked::CreateSP(this, &SDocToolWidget_PackageDocToolPage::OnHistoryPathClicked),
				FGetDocToolWidgetCrumbMenuContent::CreateSP(this, &SDocToolWidget_PackageDocToolPage::OnGetCrumbDelimiterContent),
				nullptr,
				{ SDocToolWidget_MainPage::GetHistoryCrumbTrailInfo(), SDocToolWidget_DeveloperToolsPage::GetHistoryCrumbTrailInfo(), SDocToolWidget_PackageDocToolPage::GetHistoryCrumbTrailInfo() }
			)

			// Engine versions checkboxes
			+ SVerticalBox::Slot()
			[
				EngineCheckBoxesVBox
			]

			// Package doc tool plugin button
			+ SVerticalBox::Slot()
			[
				SNew(SButton)
				/* @todo [empty tooltip text shows a small black square - we want nothing instead]
				here in 4.23 ToolTip is an argument not an attribute, otherwise we
				would pass in func ptr to a func that returns TSharedRef<IToolTip>,
				and that would probably work.
				As a workaround i tried calling SetToolTip in Tick... doesn't wanna change
				the tooltip */
				.ToolTip(DocToolWidgetToolTips::MakeGenericToolTip(TAttribute<FText>(this, &SDocToolWidget_PackageDocToolPage::HandlePackagePluginButtonToolTipText)))
				.IsEnabled(this, &SDocToolWidget_PackageDocToolPage::HandlePackageButtonIsEnabled)
				.HAlign(HAlign_Center)
				.VAlign(VAlign_Center)
				.Text(FText::AsCultureInvariant(TEXT("Package")))
				.OnClicked(this, &SDocToolWidget_PackageDocToolPage::OnPackageButtonClicked)
			]

			+ SVerticalBox::Slot()
			.Padding(0, 20, 0, 0)
			.AutoHeight()
			[
				SNew(SHorizontalBox)

				// Back Button
				+ SHorizontalBox::Slot()
				.AutoWidth()
				.Padding(0.f, 0.f, 8.f, 0.f)
				[
					SNew(SButton)
					.ButtonStyle(FDocToolStyle::Get(), TEXT("DocToolWidget.GenericButton"))
					.HAlign(HAlign_Center)
					.VAlign(VAlign_Center)
					.Text(FText::AsCultureInvariant(TEXT("Back")))
					.OnClicked(this, &SDocToolWidget_PackageDocToolPage::OnBackButtonClicked)
				]
			]
		]
	];
}

DocToolWidgetPageInfo SDocToolWidget_PackageDocToolPage::GetHistoryCrumbTrailInfo()
{
	return DocToolWidgetPageInfo(LOCTEXT("Package Doc Tool Page Display Name", "Package Doc Tool"), EDocToolWidgetPageType::PackageDocTool);
}

void SDocToolWidget_PackageDocToolPage::OnHistoryPathClicked(const EDocToolWidgetPageType& CrumbData)
{
	DocToolWidgetHelpers::NavigateDocToolWidgetToPageForHistoryCrumbClick(DocToolWidget, CrumbData);
}

FGetDocToolWidgetCrumbMenuContent_RetValType SDocToolWidget_PackageDocToolPage::OnGetCrumbDelimiterContent(const EDocToolWidgetPageType& CrumbData)
{
	return SNullWidget::NullWidget;
}

bool SDocToolWidget_PackageDocToolPage::HandleEngineVersionsPanelIsEnabled() const
{
	return (CheckedEngineVersions.Contains(TEXT("All")) == false);
}

void SDocToolWidget_PackageDocToolPage::OnEngineInstallationCheckBoxStateChanged(ECheckBoxState NewState, FString EngineVersion)
{
	if (NewState == ECheckBoxState::Checked)
	{
		CheckedEngineVersions.Emplace(EngineVersion);
	}
	else
	{
		CheckedEngineVersions.Remove(EngineVersion);
	}
}

FText SDocToolWidget_PackageDocToolPage::HandlePackagePluginButtonToolTipText() const
{
	if (bIsPackagePluginRunning)
	{
		return LOCTEXT("Plugin packaging already underway", "Plugin packaging already underway. Please wait for it to finish.");
	}
	else if (CheckedEngineVersions.Num() == 0)
	{
		return LOCTEXT("Select at least 1 engine version", "Please select at least 1 engine version.");
	}
	else
	{
		return FText::GetEmpty();
	}
}

bool SDocToolWidget_PackageDocToolPage::HandlePackageButtonIsEnabled() const
{
	return (bIsPackagePluginRunning == false) && (CheckedEngineVersions.Num() > 0);
}

FReply SDocToolWidget_PackageDocToolPage::OnPackageButtonClicked()
{
	/* Build the engine versions TSet we're gonna pass into PackagePlugin */
	TSet<FString> EngineVersions;
	if (CheckedEngineVersions.Contains(TEXT("All")) == false)
	{
		EngineVersions.Reserve(CheckedEngineVersions.Num());
		for (const auto& Elem : CheckedEngineVersions)
		{
			EngineVersions.Emplace(Elem);
		}
	}

	/* The path to the doc tool plugin */
	const FString DocToolPluginPath = IPluginManager::Get().FindPlugin(DOC_TOOL_PLUGIN_NAME)->GetDescriptorFileName();

	/* Notification widget settings */
	PluginPackaging::NotificationInfo NotificationInfo;
	NotificationInfo.bShowNotificationWidget = true;
	NotificationInfo.OnShowErrorsButtonClickedDelegate = PluginPackaging::FOnShowErrorsButtonClicked::CreateStatic(&SDocToolWidget_PackageDocToolPage::OnPluginPackagingNotificationWidgetShowErrorsButtonClicked);

	bIsPackagePluginRunning = true;
	PluginPackaging::PackagePlugin(
		DocToolPluginPath,
		TEXT("C:/Users/Philippe/AppData/Local/UE4DocTool/PackagedPlugins/"),
		true,
		EngineVersions,
		NotificationInfo,
		true,
		nullptr,
		nullptr,
		PluginPackaging::FOnAllPluginPackagingTasksComplete::CreateStatic(&SDocToolWidget_PackageDocToolPage::OnPackageDocToolPluginComplete)
	);

	DocToolWidget->SetCurrentViewType_DeveloperToolsPage();

	return FReply::Handled();
}

void SDocToolWidget_PackageDocToolPage::OnPackageDocToolPluginComplete()
{
	bIsPackagePluginRunning = false;
}

void SDocToolWidget_PackageDocToolPage::OnPluginPackagingNotificationWidgetShowErrorsButtonClicked(const TSharedPtr<TArray<PackagePluginTask>>& AllTasks)
{
	for (const auto& Task : *AllTasks)
	{
		if (Task.Result == PackagePluginTask::EResult::Failed)
		{
			UE_LOG(DOCLOG, Log, TEXT("%s"), *Task.LogOutput);
		}
	}
}

FReply SDocToolWidget_PackageDocToolPage::OnBackButtonClicked()
{
	DocToolWidget->SetCurrentViewType_DeveloperToolsPage();
	return FReply::Handled();
}


void DocToolWidgetHelpers::GetEngineInstallations(TMap<FString, FString>& OutEngineInstallations)
{
	FDesktopPlatformModule::Get()->EnumerateEngineInstallations(OutEngineInstallations);
}

void DocToolWidgetHelpers::GetProjects(const TMap<FString, FString>& EngineInstallations, TArray<FString>& OutProjectFiles)
{
	const int32 ArrayOriginalNum = OutProjectFiles.Num();

	for (const auto& Pair : EngineInstallations)
	{
		FDesktopPlatformModule::Get()->EnumerateProjectsKnownByEngine(Pair.Key, false, OutProjectFiles);
	}

	/* Apparently EnumerateProjectsKnownByEngine will return some projects that don't exist.
	Use FPaths::FileExists to check if they really do exist or not, and remove them if they 
	do not exist */
	for (int32 i = OutProjectFiles.Num() - 1; i >= ArrayOriginalNum; --i)
	{
		const FString& Elem = OutProjectFiles[i];
		if (FPaths::FileExists(Elem) == false)
		{
			OutProjectFiles.RemoveAtSwap(i, 1, false);
		}
	}
}

void DocToolWidgetHelpers::GetPlugins(const TMap<FString, FString>& EngineInstallations, const TArray<FString>& ProjectFiles, TMap<FString, TArray<FString>>& OutPlugins)
{
	for (const auto& Pair : EngineInstallations)
	{
		TArray<FString> FileNames;
		const FString EnginesPluginDir = Pair.Value + TEXT("/Engine/Plugins/Marketplace");
		FPlatformFileManager::Get().GetPlatformFile().FindFilesRecursively(FileNames, *EnginesPluginDir, TEXT(".uplugin"));
	
		for (const auto& Path : FileNames)
		{
			const FString PluginName = FPaths::GetBaseFilename(Path);
			TArray<FString>& PluginsArray = OutPlugins.Contains(PluginName) ? OutPlugins[PluginName] : OutPlugins.Emplace(PluginName, TArray<FString>());
			PluginsArray.Emplace(Path);
		}
	}

	for (const auto& Project : ProjectFiles)
	{
		const FString ProjectsPluginsFolder = FPaths::GetPath(Project) + TEXT("/Plugins");
		TArray<FString> FileNames;
		FPlatformFileManager::Get().GetPlatformFile().FindFilesRecursively(FileNames, *ProjectsPluginsFolder, TEXT(".uplugin"));

		for (const auto& Path : FileNames)
		{
			const FString PluginName = FPaths::GetBaseFilename(Path);
			TArray<FString>& PluginsArray = OutPlugins.Contains(PluginName) ? OutPlugins[PluginName] : OutPlugins.Emplace(PluginName, TArray<FString>());
			PluginsArray.Emplace(Path);
		}
	}
}

SVerticalBox::FSlot& DocToolWidgetHelpers::AddPageHeader(
	const FText& Title,
	const FOnDocToolWidgetCrumbClicked& OnPathClicked,
	const FGetDocToolWidgetCrumbMenuContent& OnGetCrumbDelimiterContent, 
	TSharedPtr<SBreadcrumbTrail<EDocToolWidgetPageType>>* OutBreadcrumbTrail, 
	const TArray<DocToolWidgetPageInfo>& OriginalCrumbs)
{
	return

		SVerticalBox::Slot()
		.AutoHeight()
		.Padding(0, 0, 0, 0)
		[
			SNew(SVerticalBox)

			+ AddPageTitle(Title)

			+ AddHistoryWidget(
				OnPathClicked, 
				OnGetCrumbDelimiterContent, 
				OutBreadcrumbTrail, 
				OriginalCrumbs
			)

			+ SVerticalBox::Slot()
			.Padding(0.f, 0.f, 0.f, 16.f)
			[
				SNew(SSeparator)
				.Orientation(Orient_Horizontal)
			]
		];
}

SVerticalBox::FSlot& DocToolWidgetHelpers::AddPageTitle(const FText& Title)
{
	return SVerticalBox::Slot()
	.AutoHeight()
	.Padding(0, 0, 0, 0)
	.HAlign(HAlign_Center)
	[
		SNew(STextBlock)
		.Text(Title)
		.TextStyle(FDocToolStyle::Get(), TEXT("DocToolWidget.Title"))
	];
}

SVerticalBox::FSlot& DocToolWidgetHelpers::AddHistoryWidget(
	const FOnDocToolWidgetCrumbClicked& OnPathClicked,
	const FGetDocToolWidgetCrumbMenuContent& OnGetCrumbDelimiterContent,
	TSharedPtr<SBreadcrumbTrail<EDocToolWidgetPageType>>* OutBreadcrumbTrail,
	const TArray<DocToolWidgetPageInfo>& OriginalCrumbs)
{
	TSharedPtr<SBreadcrumbTrail<EDocToolWidgetPageType>> BreadcrumbTrail = nullptr;

	SVerticalBox::FSlot& Slot = SVerticalBox::Slot()
	.AutoHeight()
	.Padding(0, 0, 0, 0)
	[
		SNew(SWrapBox)
		.UseAllottedWidth(true)
		.InnerSlotPadding(FVector2D(5, 2))

		+ SWrapBox::Slot()
		.FillEmptySpace(true)
		[
			SNew(SBorder)
			.Padding(FMargin(3))
			.BorderImage(FEditorStyle::GetBrush(TEXT("ToolPanel.GroupBorder")))
			[
				SAssignNew(BreadcrumbTrail, SBreadcrumbTrail<EDocToolWidgetPageType>)
				.ButtonContentPadding(FMargin(2, 2))
				.ButtonStyle(FEditorStyle::Get(), TEXT("FlatButton"))
				.DelimiterImage(FEditorStyle::GetBrush(TEXT("ContentBrowser.PathDelimiter")))
				.TextStyle(FEditorStyle::Get(), TEXT("ContentBrowser.PathText"))
				.ShowLeadingDelimiter(false)
				.InvertTextColorOnHover(false)
				.OnCrumbClicked(OnPathClicked)
				.GetCrumbMenuContent(OnGetCrumbDelimiterContent)
			]
		]
	];

	for (const auto& Crumb : OriginalCrumbs)
	{
		BreadcrumbTrail->PushCrumb(Crumb.HistoryCrumbPathDisplayName, Crumb.Type);
	}

	if (OutBreadcrumbTrail != nullptr)
	{
		*OutBreadcrumbTrail = BreadcrumbTrail;
	}

	return Slot;
}

void DocToolWidgetHelpers::NavigateDocToolWidgetToPageForHistoryCrumbClick(SDocToolWidget* Widget, EDocToolWidgetPageType PageType)
{
	if (PageType == EDocToolWidgetPageType::Main)
	{
		Widget->SetCurrentViewType_MainPage();
	}
	else if (PageType == EDocToolWidgetPageType::SelectCreateDocumentationTargetType)
	{
		Widget->SetCurrentViewType_SelectCreateDocumentationTargetTypePage();
	}
	else if (PageType == EDocToolWidgetPageType::SelectCreateDocumentationTargetProject)
	{
		Widget->SetCurrentViewType_SelectCreateDocumentationTargetProjectPage();
	}
	else if (PageType == EDocToolWidgetPageType::SelectCreateDocumentationTargetPlugin)
	{
		Widget->SetCurrentViewType_SelectCreateDocumentationTargetPluginPage();
	}
	else if (PageType == EDocToolWidgetPageType::SelectCreateDocumentationTargetEngine)
	{
		Widget->SetCurrentViewType_SelectCreateDocumentationTargetEnginePage();
	}
	else if (PageType == EDocToolWidgetPageType::CreateDocumentationTargetingProjectOptions)
	{
		Widget->SetCurrentViewType_CreateDocumentationTargetingProjectOptionsPage(Widget->GetProjectShownOnLastOptionsPage(), Widget->GetMainTaskOptionsShownOnLastOptionsPage());
	}
	else if (PageType == EDocToolWidgetPageType::CreateDocumentationTargetingPluginOptions)
	{
		Widget->SetCurrentViewType_CreateDocumentationTargetingPluginOptionsPage(Widget->GetPluginShownOnLastOptionsPage(), Widget->GetMainTaskOptionsShownOnLastOptionsPage());
	}
	else if (PageType == EDocToolWidgetPageType::CreateDocumentationTargetingEngineOptions)
	{
		Widget->SetCurrentViewType_CreateDocumentationTargetingEngineOptionsPage(Widget->GetEngineShownOnLastOptionsPage(), Widget->GetMainTaskOptionsShownOnLastOptionsPage());
	}
	else if (PageType == EDocToolWidgetPageType::CreateDocumentationTargetingProjectStarted)
	{
		Widget->SetCurrentViewType_CreateDocumentationTargetingProjectStartedPage();
	}
	else if (PageType == EDocToolWidgetPageType::CreateDocumentationTargetingPluginStarted)
	{
		Widget->SetCurrentViewType_CreateDocumentationTargetingPluginStartedPage();
	}
	else if (PageType == EDocToolWidgetPageType::CreateDocumentationTargetingEngineStarted)
	{
		Widget->SetCurrentViewType_CreateDocumentationTargetingEngineStartedPage();
	}
	else if (PageType == EDocToolWidgetPageType::SelectParseTargetType)
	{
		Widget->SetCurrentViewType_SelectParseTargetTypePage();
	}
	else if (PageType == EDocToolWidgetPageType::SelectParseTargetProject)
	{
		Widget->SetCurrentViewType_SelectParseTargetProjectPage();
	}
	else if (PageType == EDocToolWidgetPageType::SelectParseTargetPlugin)
	{
		Widget->SetCurrentViewType_SelectParseTargetPluginPage();
	}
	else if (PageType == EDocToolWidgetPageType::SelectParseTargetEngine)
	{
		Widget->SetCurrentViewType_SelectParseTargetEnginePage();
	}
	else if (PageType == EDocToolWidgetPageType::ParseTargetingProjectOptions)
	{
		Widget->SetCurrentViewType_ParseTargetingProjectOptionsPage(Widget->GetProjectShownOnLastOptionsPage(), Widget->GetMainTaskOptionsShownOnLastOptionsPage());
	}
	else if (PageType == EDocToolWidgetPageType::ParseTargetingPluginOptions)
	{
		Widget->SetCurrentViewType_ParseTargetingPluginOptionsPage(Widget->GetPluginShownOnLastOptionsPage(), Widget->GetMainTaskOptionsShownOnLastOptionsPage());
	}
	else if (PageType == EDocToolWidgetPageType::ParseTargetingEngineOptions)
	{
		Widget->SetCurrentViewType_ParseTargetingEngineOptionsPage(Widget->GetEngineShownOnLastOptionsPage(), Widget->GetMainTaskOptionsShownOnLastOptionsPage());
	}
	else if (PageType == EDocToolWidgetPageType::ParseTargetingProjectStarted)
	{
		Widget->SetCurrentViewType_ParseTargetingProjectStartedPage();
	}
	else if (PageType == EDocToolWidgetPageType::ParseTargetingPluginStarted)
	{
		Widget->SetCurrentViewType_ParseTargetingPluginStartedPage();
	}
	else if (PageType == EDocToolWidgetPageType::ParseTargetingEngineStarted)
	{
		Widget->SetCurrentViewType_ParseTargetingEngineStartedPage();
	}
	else if (PageType == EDocToolWidgetPageType::Miscellaneous)
	{
		Widget->SetCurrentViewType_MiscellaneousPage();
	}
	else if (PageType == EDocToolWidgetPageType::DeveloperTools)
	{
		Widget->SetCurrentViewType_DeveloperToolsPage();
	}
	else  // Assumed PackageDocTool
	{
		check(PageType == EDocToolWidgetPageType::PackageDocTool);
		Widget->SetCurrentViewType_PackageDocToolPage();
	}
}

bool DocToolWidgetHelpers::AquireDocToolWidgetDataMutex()
{
	if (DocToolWidgetDataMutex.IsValid() == false)
	{
		/* Here we create the mutex but do not aquire it - this document warns against
		doing that:
		https://docs.microsoft.com/en-us/windows/win32/api/synchapi/nf-synchapi-createmutexa
		Quoting he document in case it gets taken down:
		"Two or more processes can call CreateMutex to create the same named mutex. The first process
		actually creates the mutex, and subsequent processes with sufficient access rights simply
		open a handle to the existing mutex. This enables multiple processes to get handles of the
		same mutex, while relieving the user of the responsibility of ensuring that the creating
		process is started first. When using this technique, you should set the bInitialOwner flag
		to FALSE; otherwise, it can be difficult to be certain which process has initial ownership."

		Actually you should probably modify CreateSystemWideCriticalSection so that if user wants
		to aquire it then the func makes the mutex and then calls Aquire on it instead of doing
		it in CreateMutex
		*/
		DocToolWidgetDataMutex = FWinPlatformMemory::CreateSystemWideCriticalSection(DOC_TOOL_WIDGET_DATA_MUTEX_NAME);
	}
	
	return DocToolWidgetDataMutex.Aquire() == FWinPlatformMemory::FSystemWideCriticalSection::ETermOfAquisition::Aquired_NoIssues;
}

void DocToolWidgetHelpers::ReleaseDocToolWidgetDataMutex()
{
	DocToolWidgetDataMutex.Release();
}

FWinPlatformMemory::FSystemWideCriticalSection DocToolWidgetHelpers::DocToolWidgetDataMutex = FWinPlatformMemory::FSystemWideCriticalSection();

bool DocToolWidgetHelpers::IsSamePath(const FString& PathA, const FString& PathB)
{
	/* This implementation is based off FPaths::IsSamePath from UE4.27. The version from 
	4.23 does not seem to work */

	FString TmpA = FPaths::ConvertRelativePathToFull(PathA) + TEXT("/");
	FString TmpB = FPaths::ConvertRelativePathToFull(PathB) + TEXT("/");
	
	FPaths::RemoveDuplicateSlashes(TmpA);
	FPaths::RemoveDuplicateSlashes(TmpB);
	
#if PLATFORM_WINDOWS
	return TmpA.Compare(TmpB, ESearchCase::IgnoreCase) == 0;
#else
	return TmpA.Compare(TmpB, ESearchCase::CaseSensitive) == 0;
#endif

	/* Well I'm not sure this 100% works. 1 issue: 
	- ../../folder != ../folder even if base dir is C:/
	Not sure if those two paths are actually considered the same though */
}

FString DocToolWidgetHelpers::ToString(const FTextBlockStyle& Style)
{
	FString S;
	FJsonObjectConverter::UStructToJsonObjectString(Style, S);
	return S;
}


FText DocToolWidgetToolTips::ResetToDefault(const FText& DefaultValue)
{
	return FText::Format(LOCTEXT("ToolTip: Reset to default", "Reset to default.\n\nDefault value is {0}"), DefaultValue);
}

FText DocToolWidgetToolTips::ResetToDefault(const FString& DefaultValue)
{
	return ResetToDefault(FText::AsCultureInvariant(DefaultValue));
}

FText DocToolWidgetToolTips::ResetToDefault(int32 DefaultValue)
{
	return ResetToDefault(FText::AsNumber(DefaultValue));
}

FText DocToolWidgetToolTips::ResetToDefault(bool DefaultValue)
{
	return ResetToDefault(DefaultValue ? FText::AsCultureInvariant(TEXT("true")) : FText::AsCultureInvariant(TEXT("false")));
}

FText DocToolWidgetToolTips::NonEngineTargetDisplayName(bool bTargetingProject)
{
	return FText::Format(LOCTEXT("ToolTip: Non-engine target display name", "What to call your {0} in the documentation."), bTargetingProject ? FText::AsCultureInvariant(TEXT("project")) : FText::AsCultureInvariant(TEXT("plugin")));
}

FText DocToolWidgetToolTips::OutputPath()
{
	return LOCTEXT("ToolTip: Output path", "Where the documentation files should go.\n\nNotes:\n- directory will be deleted if it already exists.");
}

FText DocToolWidgetToolTips::RunOnSeparateProcess()
{
	return LOCTEXT("ToolTip: Run on separate process", "Whether to force the task to run on a new Unreal Engine process.\n\nTwo benefits of running on a separate process:\n - if you crash this process then the doc tool will be unaffected\n - if doc tool crashes then this process will be unaffected\n\nNote: if this is checked the doc tool always runs on a new process. If not checked it will try to run on this process but may still run on a new one.");
}

FText DocToolWidgetToolTips::LocateOutputPathButton()
{
	return LOCTEXT("ToolTip: locate output path button", "Locate Folder");
}

FText DocToolWidgetToolTips::ReportProgressToNotificationWidget()
{
	return LOCTEXT("ToolTip: report progress to notification widget", "Whether to show how far along the task is on a notification widget.");
}

FText DocToolWidgetToolTips::ReportProgressToLog()
{
	return LOCTEXT("ToolTip: report progress to log", "Whether to show how far along the task is in the log.");
}

FText DocToolWidgetToolTips::ProgressDelegate()
{
	return LOCTEXT("ToolTip: progress delegate", "A function that will be called every time a significant amount of progress is made.\n\nSome examples:\n - /Script/ModuleName.MyClassMinusUOrAPrefix::MyFunction\n - /Game/MyBlueprint.MyBlueprint::MyFunc\n\nA suggestions box with all compatible functions should pop up if you click inside the text box.");
}

FText DocToolWidgetToolTips::StoppedDelegate()
{
	return LOCTEXT("ToolTip: stopped delegate", "A function that will be called when the task has stopped, either success or failure.\n\nSome examples:\n - /Script/ModuleName.MyClassMinusUOrAPrefix::MyFunction\n - /Game/MyBlueprint.MyBlueprint::MyFunc\n\nA suggestions box with all compatible functions should pop up if you click inside the text box.");
}

FText DocToolWidgetToolTips::NumberOfThreads()
{
	return LOCTEXT("ToolTip: number of threads", "How many worker threads to spawn.");
}

FText DocToolWidgetToolTips::CopyCommandToClipboardForBlueprintGraph()
{
	TSharedRef<const FInputChord> PasteInputChord = FGenericCommands::Get().Paste->GetActiveChord(EMultipleKeyBindingIndex::Primary);

	return FText::Format(LOCTEXT("ToolTip: copy command to clipboard for blueprint graph", "Copies to clipboard. If you paste inside a blueprint graph ({0}) you will get a node representing these options.\n\nNote: because DocumentationTool is an editor module the function can only be called from either an editor utility blueprint graph or an editor utility widget blueprint graph."), PasteInputChord->GetInputText());
}

FText DocToolWidgetToolTips::CopyCommandToClipboard()
{
	return LOCTEXT("ToolTip: copy command to clipboard", "Copies to clipboard. Useful if you want to paste into a windows cmd box to execute it.");
}

FText DocToolWidgetToolTips::Start(EMainTaskType MainTask)
{
	const FText TaskName = (MainTask == EMainTaskType::Documentation) ? FText::AsCultureInvariant(TEXT("documentation")) : FText::AsCultureInvariant(TEXT("parse"));
	
	return FText::Format(LOCTEXT("ToolTip: start", "Starts the {0} task."), TaskName);
}

TSharedRef<IToolTip> DocToolWidgetToolTips::MakeGenericToolTip(const TAttribute<FText>& ToolTipText)
{
	return SNew(SToolTip)
	.TextMargin(1)
	.BorderImage(FEditorStyle::GetBrush(TEXT("ProjectBrowser.TileViewTooltip.ToolTipBorder")))
	[
		SNew(SBorder)
		.Padding(6)
		.BorderImage(FEditorStyle::GetBrush(TEXT("ProjectBrowser.TileViewTooltip.ContentBorder")))
		[
			SNew(STextBlock)
			.Text(ToolTipText)
			.Font(FEditorStyle::GetFontStyle(TEXT("ProjectBrowser.TileViewTooltip.NameFont")))
			.WrapTextAt(600.f)
		]
	];
}


//--------------------------------------------------------------
//	SMyCustomDialog
//--------------------------------------------------------------
SMyCustomDialog::SMyCustomDialog()
	: LastPressedButton(-1)
{
}

void SMyCustomDialog::Construct(const FArguments& InArgs)
{
	check(InArgs._Buttons.Num() > 0);

	TSharedPtr<SHorizontalBox> ContentBox;
	TSharedPtr<SHorizontalBox> ButtonBox;

	SWindow::Construct(SWindow::FArguments()
	.Title(InArgs._Title)
	.SizingRule(ESizingRule::Autosized)
	.SupportsMaximize(false)
	.SupportsMinimize(false)
	[
		SNew(SBorder)
		.Padding(4.f)
		.BorderImage(FEditorStyle::GetBrush(TEXT("ToolPanel.GroupBorder")))
		[
			SNew(SVerticalBox)

			+ SVerticalBox::Slot()
			.FillHeight(1.0f)
			[
				SAssignNew(ContentBox, SHorizontalBox)
			]
			
			+ SVerticalBox::Slot()
			.VAlign(VAlign_Center)
			.AutoHeight()
			[
				SAssignNew(ButtonBox, SHorizontalBox)
			]
		]
	]);

	if (InArgs._IconBrush.IsValid())
	{
		const FSlateBrush* ImageBrush = FEditorStyle::GetBrush(InArgs._IconBrush);
		if (ImageBrush != nullptr)
		{
			ContentBox->AddSlot()
			.AutoWidth()
			.VAlign(VAlign_Center)
			.HAlign(HAlign_Left)
			.Padding(0, 0, 8, 0)
			[
				SNew(SImage)
				.Image(ImageBrush)
			];
		}
	}

	if (InArgs._UseScrollBox)
	{
		ContentBox->AddSlot()
		[
			SNew(SBox)
			.MaxDesiredHeight(InArgs._ScrollBoxMaxHeight)
			[
				SNew(SScrollBox)
				+ SScrollBox::Slot()
				[
					InArgs._DialogContent.ToSharedRef()
				]
			]
		];
	}
	else
	{
		ContentBox->AddSlot()
		.FillWidth(1.0f)
		.VAlign(VAlign_Center)
		.HAlign(HAlign_Left)
		[
			InArgs._DialogContent.ToSharedRef()
		];
	}

	ButtonBox->AddSlot()
	.AutoWidth()
	[
		SNew(SSpacer)
		.Size(FVector2D(20.0f, 1.0f))
	];

	TSharedPtr<SUniformGridPanel> ButtonPanel;

	ButtonBox->AddSlot()
	.FillWidth(1.0f)
	.VAlign(VAlign_Center)
	.HAlign(HAlign_Right)
	[
		SAssignNew(ButtonPanel, SUniformGridPanel)
		.SlotPadding(FEditorStyle::GetMargin(TEXT("StandardDialog.SlotPadding")))
		.MinDesiredSlotWidth(FEditorStyle::GetFloat(TEXT("StandardDialog.MinDesiredSlotWidth")))
		.MinDesiredSlotHeight(FEditorStyle::GetFloat(TEXT("StandardDialog.MinDesiredSlotHeight")))
	];

	for (int i = 0; i < InArgs._Buttons.Num(); ++i)
	{
		const FButton& Button = InArgs._Buttons[i];

		ButtonPanel->AddSlot(ButtonPanel->GetChildren()->Num(), 0)
		[
			SNew(SButton)
			.OnClicked(FOnClicked::CreateSP(this, &SMyCustomDialog::OnButtonClicked, Button.OnClicked, i))
			[
				SNew(SHorizontalBox)
				+ SHorizontalBox::Slot()
				.VAlign(VAlign_Center)
				.HAlign(HAlign_Center)
				[
					SNew(STextBlock)
					.Text(Button.ButtonText)
				]
			]
		];
	}
}

int32 SMyCustomDialog::ShowModal()
{
	FSlateApplication::Get().AddModalWindow(StaticCastSharedRef<SWindow>(AsShared()), FGlobalTabmanager::Get()->GetRootWindow());

	return LastPressedButton;
}

void SMyCustomDialog::Show()
{
	FSlateApplication::Get().AddWindow(StaticCastSharedRef<SWindow>(AsShared()), true);
}

FReply SMyCustomDialog::OnButtonClicked(FSimpleDelegate OnClicked, int32 ButtonIndex)
{
	LastPressedButton = ButtonIndex;

	FSlateApplication::Get().RequestDestroyWindow(StaticCastSharedRef<SWindow>(AsShared()));

	OnClicked.ExecuteIfBound();
	return FReply::Handled();
}


void SModalWidget::Construct(const FArguments& InArgs)
{
	/* Style commonly used by SWindow. I use some things from it */
	static const FName NAME_WindowStyle(TEXT("Window"));
	const FWindowStyle& WindowStyle = FCoreStyle::Get().GetWidgetStyle<FWindowStyle>(NAME_WindowStyle);

	ChildSlot
	[
		// Border to cover widget to block mouse events on it
		SNew(SBorder)
		.HAlign(HAlign_Center)
		.VAlign(VAlign_Center)
		.OnMouseButtonDown(this, &SModalWidget::HandleMouseButtonDownOnOuterBorder)
		.BorderImage(FEditorStyle::GetBrush(TEXT("Menu.Background")))
		.BorderBackgroundColor(FSlateColor(FLinearColor(1.f, 1.f, 1.f, 0.75f)))
		.Content()
		[
			// Box with the text and buttons on it
			SNew(SBorder)
			.HAlign(HAlign_Center)
			.VAlign(VAlign_Center)
			.OnMouseButtonDown(this, &SModalWidget::HandleMouseButtonDownOnInnerBorder)
			.BorderImage(FEditorStyle::GetBrush(TEXT("NotificationList.ItemBackground")))
			.Content()
			[
				SNew(SOverlay)
				
				+ SOverlay::Slot()
				[
					// Flashing image
					SNew(SImage)
					/* Visibility binding seems to make no difference but whatever */
					.Visibility(this, &SModalWidget::GetWindowFlashVisibility)
					.Image(&WindowStyle.FlashTitleBrush)
					.ColorAndOpacity(this, &SModalWidget::GetWindowFlashAreaColor)
				]

				+ SOverlay::Slot()
				.Padding(FMargin(32.f, 32.f))
				[
					SNew(SVerticalBox)

					+ SVerticalBox::Slot()
					.AutoHeight()
					.HAlign(HAlign_Center)
					.VAlign(VAlign_Center)
					.Padding(FMargin(0.f, 0.f, 0.f, 8.f))
					[
						SNew(STextBlock)
						.Text(InArgs._TextContent)
						.TextStyle(FEditorStyle::Get(), TEXT("ContentBrowser.TopBar.Font"))
						.Justification(ETextJustify::Center)
					]

					+ SVerticalBox::Slot()
					.AutoHeight()
					.HAlign(HAlign_Center)
					.VAlign(VAlign_Center)
					.Padding(FMargin(0.f, 8.f, 0.f, 0.f))
					[
						SNew(SHorizontalBox)

						+ SHorizontalBox::Slot()
						.Padding(FMargin(0.f, 0.f, 8.f, 0.f))
						[
							SNew(SButton)
							.TextStyle(FEditorStyle::Get(), TEXT("ContentBrowser.TopBar.Font"))
							.ContentPadding(FMargin(24.f, 12.f))
							.Text(InArgs._NoButtonText)
							.OnClicked(InArgs._OnNoClicked)
							.ButtonColorAndOpacity(FLinearColor(0.5f, 0.5f, 0.5f, 1.f))
						]

						+ SHorizontalBox::Slot()
						.Padding(FMargin(8.f, 0.f, 0.f, 0.f))
						[
							SNew(SButton)
							.TextStyle(FEditorStyle::Get(), TEXT("ContentBrowser.TopBar.Font"))
							.ContentPadding(FMargin(24.f, 12.f))
							.Text(InArgs._YesButtonText)
							.OnClicked(InArgs._OnYesClicked)
							.ButtonColorAndOpacity(FLinearColor(0.5f, 0.5f, 0.5f, 1.f))
						]
					]
				]
			]
		]
	];

	FlashSequence = FCurveSequence(0.f, SWindowTitleBarDefs::WindowFlashDuration, ECurveEaseFunction::Linear);
}

FSlateColor SModalWidget::GetWindowFlashAreaColor() const
{
	float Flash = GetFlashValue();
	float Alpha = Flash * 0.4f;

	FLinearColor Color = FLinearColor::White;
	Color.A = Alpha;

	return Color;
}

float SModalWidget::GetFlashValue() const
{
	/* Copy of SWindowTitleBar::GetFlashValue */

	if (FlashSequence.IsPlaying())
	{
		float Lerp = FlashSequence.GetLerp();

		const float SinRateMultiplier = 2.f * PI * SWindowTitleBarDefs::WindowFlashDuration * SWindowTitleBarDefs::WindowFlashFrequency;
		float SinTerm = 0.5f * (FMath::Sin(Lerp * SinRateMultiplier) + 1.f);

		float FadeTerm = 1.f - Lerp;

		return SinTerm * FadeTerm;
	}

	return 0.f;
}

EVisibility SModalWidget::GetWindowFlashVisibility() const
{
	return FlashSequence.IsPlaying() ? EVisibility::SelfHitTestInvisible : EVisibility::Hidden;
}

FReply SModalWidget::HandleMouseButtonDownOnOuterBorder(const FGeometry& InGeometry, const FPointerEvent& MouseEvent)
{
	FlashSequence.Play(AsShared());
	return FReply::Handled();
}

FReply SModalWidget::HandleMouseButtonDownOnInnerBorder(const FGeometry& InGeometry, const FPointerEvent& MouseEvent)
{
	/* Return "handled" so it doesn't bubble to the outer border's version */
	return FReply::Handled();
}


SPopupNotification::SPopupNotification()
	: TextBlockPtr(nullptr)
	, CurveSequence(FCurveSequence())
	, FadeOutAnimCurve(FCurveHandle())
	, ActiveTimerHandle_Opacity(nullptr)
	, bResetDurationNextTick(false)
{
}

void SPopupNotification::Construct(const FArguments& InArgs)
{
	SetVisibility(EVisibility::HitTestInvisible);
	SetRenderOpacity(0.75f);

	ChildSlot
	[
		SNew(SBorder)
		.BorderImage(FEditorStyle::GetBrush(TEXT("Menu.Background")))
		[
			SAssignNew(TextBlockPtr, STextBlock)
			.Text(InArgs._TextContent)
			.Font(FEditorStyle::GetFontStyle(TEXT("AssetDiscoveryIndicator.MainStatusFont")))
			.Margin(FMargin(8.f, 8.f))
			.Justification(ETextJustify::Center)
		]
	];

	CurveSequence.AddCurve(0.f, InArgs._SolidOneOpacityDuration);
	FadeOutAnimCurve = CurveSequence.AddCurve(InArgs._SolidOneOpacityDuration, InArgs._FadeOutDuration, ECurveEaseFunction::CubicIn);

	// Start Animation
	SetCanTick(true);
	ActiveTimerHandle_Opacity = RegisterActiveTimer(0.f, FWidgetActiveTimerDelegate::CreateSP(this, &SPopupNotification::TriggerPlayOpacitySequence));
}

void SPopupNotification::Tick(const FGeometry& AllottedGeometry, const double InCurrentTime, const float InDeltaTime)
{
	if (bResetDurationNextTick)
	{
		ResetDuration();
		bResetDurationNextTick = false;
	}

	if (CurveSequence.IsPlaying())
	{
		const float NewOpacity = CalculateOpacity();
		SetRenderOpacity(NewOpacity);
	}
	else
	{
		// The animation is complete, so just make sure the target opacity is reached
		SetRenderOpacity(0.f);
		SetCanTick(false);

		/* Remove ourselves from parent */
		StaticCastSharedPtr<SOverlay>(GetParentWidget())->RemoveSlot(AsShared());
	}
}

void SPopupNotification::SetMessage(const FText& Message)
{
	TextBlockPtr->SetText(Message);
}

void SPopupNotification::ResetDuration()
{
	CurveSequence.Play(AsShared());
}

void SPopupNotification::ResetDurationPostModal()
{
	/* FCurveSequence::Play (in SPopupNotification::ResetDuration) looks at FSlateApplication::GetCurrentTime. If you call
	GetCurrentTime right after closing a modal window you will get the time BEFORE you 
	opened the modal window, not after. So basically if I call JumpToStart right now then 
	the first X seconds of the animation will be missed, where X is the time you had the 
	modal window open */
	bResetDurationNextTick = true;
}

float SPopupNotification::GetInterpAlpha() const
{
	const float Time = CurveSequence.GetSequenceTime();
	if (Time > CurveSequence.GetCurve(1).StartTime)
	{
		return FadeOutAnimCurve.GetLerp();
	}
	else  // Assumed period of constant 1 opacity
	{
		return 0.f;
	}
}

float SPopupNotification::CalculateOpacity() const
{
	const float InterpAlpha = GetInterpAlpha();

	return FMath::Lerp(0.75f, 0.f, InterpAlpha);
}

EActiveTimerReturnType SPopupNotification::TriggerPlayOpacitySequence(double InCurrentTime, float InDeltaTime)
{
	CurveSequence.Play(AsShared());
	return EActiveTimerReturnType::Stop;
}



#undef LOCTEXT_NAMESPACE

ENABLE_OPTIMIZATION

#endif


