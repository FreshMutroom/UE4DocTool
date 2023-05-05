// Fill out your copyright notice in the Description page of Project Settings.

#pragma once


#if WITH_EDITOR

#include "CoreMinimal.h"
#include "DocToolTypes.h"
#include "ParsingV3/ParserV3Types.h"
//#include "BlueprintDataGatheringTypes.generated.h"

class UBlueprint;
class UK2Node_Event;
class USCS_Node;
class UBlueprintGeneratedClass;
class FDocThread;
struct FAnimBlueprintFunctionPinInfo;
class FJsonValue;
class UUserDefinedEnum;
struct FStructVariableDescription;
class UUserDefinedStruct;


//-----------------------------------------------------------------------------
//  ------- Enums -------
//-----------------------------------------------------------------------------

UENUM()
enum class EBlueprintAssetEventType : uint8
{
	CustomEventIntroducedByThisBlueprint,
	CustomEventIntroducedByAParentBlueprint,
	BlueprintImplementableEvent,
	BlueprintNativeEvent,
	AnimNotifyAddedViaPersona
};


UENUM()
enum class ERPCType : uint8
{
	None,
	Client,
	Server,
	Multicast
};


/* @See EVariableReplication */
UENUM()
enum class EBlueprintVariableReplicationType : uint8
{
	None,
	Replicated,
	RepNotify
};


/* Reasons why all the data for a blueprint asset event cannot be collected */
enum class EInvalidDataReason_BlueprintAssetEvent : uint8
{
	/* Nothing wrong - all data for event can be collected */
	None,

	/* An input pin's sub category object is null and has data we need */
	InputPinsSubCategoryObjectNull,

	/* The UFunction for the event is null and has data we need */
	UFunctionNull
};


enum class EInvalidDataReason_UserDefinedStructMember : uint8
{
	None,

	SubCategoryObjectNull
};


enum class EInvalidDataReason_BlueprintAssetFunction : uint8
{
	None,
	InputPinSubCategoryObjectNull,
	InputPinSubCategoryObjectIsFallbackStruct,
	ReturnNodePinSubCategoryObjectNull,
	ReturnNodePinSubCategoryObjectIsFallbackStruct
};


enum class EInvalidDataReason_BlueprintAssetMacro : uint8
{
	None,
	InputPinSubCategoryObjectNull,
	InputPinSubCategoryObjectIsFallbackStruct,
	OutputPinSubCategoryObjectNull,
	OutputPinSubCategoryObjectIsFallbackStruct
};


//-----------------------------------------------------------------
//	----------- Structs ------------
//-----------------------------------------------------------------

/* A string the user could enter whatever they wanted into to
describe something about a blueprint asset (or blueprint asset function,
variable, etc). */
struct BlueprintAssetDescriptionString
{
	BlueprintAssetDescriptionString()
		: String(FString())
		, ChopIndexForSearchComment(-1)
	{}

	FORCEINLINE bool HasChopAmountBeenSet() const
	{
		return (ChopIndexForSearchComment != -1);
	}

	//-------------------------------------------------------------
	//	Data
	//-------------------------------------------------------------

	FString String;

	/* Where to do String.Left to get comment to appear in search
	results */
	int32 ChopIndexForSearchComment;
};


/* Similar to BlueprintAssetDescriptionString but holds FText instead
of FString */
struct BlueprintAssetDescriptionText
{
	BlueprintAssetDescriptionText()
		: ChopIndexForSearchComment(-1)
	{}

	FORCEINLINE bool HasChopAmountBeenSet() const
	{
		return (ChopIndexForSearchComment != -1);
	}

	//-------------------------------------------------------------
	//	Data
	//-------------------------------------------------------------

	FText Text;

	/* Where to do Text.ToString().Left to get comment to appear in search
	results */
	int32 ChopIndexForSearchComment;
};


/* A component that appears in the "Components" tab of a blueprint */
struct BlueprintAssetComponent
{
	BlueprintAssetComponent() = delete;

	explicit BlueprintAssetComponent(const UBlueprint* Blueprint, UBlueprintGeneratedClass* BPGC, USCS_Node* Node);

	bool HasParentComponent() const
	{
		return ParentComponentName.Compare(TEXT("None")) != 0;
	}

	/** Returns true if the parent component was introduced by C++ */
	bool IsParentComponentNative() const
	{
		check(HasParentComponent());
		return bIsParentComponentNative;
	}

	/**
	 *	Returns true if the parent component was introduced by the
	 *	same blueprint that introduced this component
	 */
	bool IsParentComponentIntroducedByThisBlueprint() const
	{
		check(HasParentComponent());
		return ParentComponentOwnerClassName.Compare(TEXT("None")) != 0;
	}

	// For debugging
	FString ToString() const;

	//------------------------------------------------------------
	//	Data
	//------------------------------------------------------------

	/* Name of the component as it appears in the component hierachy */
	FString Name;

	/* The class of the component */
	FString Class;

	/* If this component is attached to another component the name of
	the component it is attached to. The name is the name as it
	appears in the component hierachy, minus the "(inherited)" */
	FString ParentComponentName;

	/* If this component is attached to another component that was
	not introduced by C++ AND also not introduced by this blueprint
	then this will be the name of the blueprint
	that introduced that component (with a _C added to the end). */
	FString ParentComponentOwnerClassName;

	/* If true this component has a parent that was introduced in C++ */
	uint8 bIsParentComponentNative : 1;
};


/* An input pin on an event node */
struct BlueprintAssetEventInputPin
{
	BlueprintAssetEventInputPin() = delete;

	/* @param OutIncompleteDataReason - if it's not possible to gather
	all the data about the pin then this will be returned as non "None" */
	explicit BlueprintAssetEventInputPin(const UEdGraphPin* InPin, EInvalidDataReason_BlueprintAssetEvent& OutIncompleteDataReason);

	// For debugging
	FString ToString() const;

	//------------------------------------------------------------
	//	Data
	//------------------------------------------------------------

	FString Name;

	FString Type;
	FString SubType;

	/* If this is an FText (i.e. Type equals "text") then this is the
	default value */
	FText DefaultTextValue;
	/* If this is not an FText (i.e. Type does not equal "text") then this is the
	default value (actually if it is for an FText this will be
	it's default value .ToString()) */
	FString DefaultValue;

	uint8 bIsPassByReference : 1;

	EPinContainerType ContainerType;
};


struct BlueprintAssetEvent
{
	BlueprintAssetEvent() = delete;

	/**
	 *	@param bIsOwningBlueprintAnAnimBlueprint - whether Blueprint is an
	 *	anim blueprint
	 *	@param OutIncompleteDataReason - if it's not possible to gather
	 *	all the data about the event then this will be returned as non "None"
	 */
	explicit BlueprintAssetEvent(
		const UBlueprint* Blueprint,
		bool bIsOwningBlueprintAnAnimBlueprint,
		UK2Node_Event* InNode,
		EInvalidDataReason_BlueprintAssetEvent& OutIncompleteDataReason);

	// For debugging
	FString ToString() const;

	//------------------------------------------------------------
	//	Data
	//------------------------------------------------------------

	/* This is the 'no collision' name i.e. no other function, variable, etc
	will be allowed to be called this. It is not the display name. Philippe: You
	might want to add another variable called like "DisplayName" to store the
	display name in */
	FString Name;

	EBlueprintAssetEventType Type;

	FString PathOfClassThisWasIntroducedBy;

	ERPCType RPCType;

	uint8 bIsRPCReliable : 1;
	uint8 bCallInEditor : 1;
#if ENGINE_VERSION_EQUAL_OR_NEWER_THAN(4, 23)
	uint8 bIsDeprecated : 1;

	FString DeprecationMessage;
#endif

	TArray<BlueprintAssetEventInputPin> InputPins;
};


struct BlueprintAssetEventGraph
{
	BlueprintAssetEventGraph() = delete;

	explicit BlueprintAssetEventGraph(FDocThread* Thread, const UBlueprint* Blueprint, bool bIsBlueprintAnimBlueprint, const UEdGraph* InEventGraph);

	// For debugging
	FString ToString() const;

	//------------------------------------------------------------
	//	Data
	//------------------------------------------------------------

	FString Name;

	/* Events that are inside this event graph that are considiered
	"enabled".
	Will exclude events that we could not gather 100% all info on,
	usually this is because they have warnings/errors */
	TArray<BlueprintAssetEvent> Events;
};


struct BlueprintAssetAnimationGraphInputInputInfo
{
	BlueprintAssetAnimationGraphInputInputInfo() = delete;

	explicit BlueprintAssetAnimationGraphInputInputInfo(const FAnimBlueprintFunctionPinInfo& InInput);

	// For debugging
	FString ToString() const;

	//------------------------------------------------------------
	//	Data
	//------------------------------------------------------------

	FString Name;

	FString Type;

	FString SubType;

	EPinContainerType ContainerType;
};


struct BlueprintAssetAnimationGraphInputInfo
{
	BlueprintAssetAnimationGraphInputInfo() = delete;

	explicit BlueprintAssetAnimationGraphInputInfo(const AnimGraphNodeInputType* InInputNode);

	// For debugging
	FString ToString() const;

	//------------------------------------------------------------
	//	Data
	//------------------------------------------------------------

	FString Name;

	TArray<BlueprintAssetAnimationGraphInputInputInfo> Inputs;
};


struct BlueprintAssetAnimationGraphInfo
{
	BlueprintAssetAnimationGraphInfo() = delete;

	explicit BlueprintAssetAnimationGraphInfo(const UEdGraph* InFunction);

	// For debugging
	FString ToString() const;

	//------------------------------------------------------------
	//	Data
	//------------------------------------------------------------

	FString Name;

	TArray<BlueprintAssetAnimationGraphInputInfo> Inputs;
};


struct BlueprintAssetAnimationLayerInputInputInfo
{
	BlueprintAssetAnimationLayerInputInputInfo() = delete;

	explicit BlueprintAssetAnimationLayerInputInputInfo(const FAnimBlueprintFunctionPinInfo& InInput);

	// For debugging
	FString ToString() const;

	//------------------------------------------------------------
	//	Data
	//------------------------------------------------------------

	FString Name;

	FString Type;

	FString SubType;

	EPinContainerType ContainerType;
};


struct BlueprintAssetAnimationLayerInputInfo
{
	BlueprintAssetAnimationLayerInputInfo() = delete;

	explicit BlueprintAssetAnimationLayerInputInfo(const AnimGraphNodeInputType* InInputNode);

	// For debugging
	FString ToString() const;

	//------------------------------------------------------------
	//	Data
	//------------------------------------------------------------

	FString Name;

	TArray<BlueprintAssetAnimationLayerInputInputInfo> Inputs;
};


struct BlueprintAssetAnimationLayerInfo
{
	BlueprintAssetAnimationLayerInfo() = delete;

	explicit BlueprintAssetAnimationLayerInfo(const UAnimBlueprint* AnimBlueprint, const UEdGraph* InFunction);

	// For debugging
	FString ToString() const;

	//------------------------------------------------------------
	//	Data
	//------------------------------------------------------------

	FString Name;

	/* If an empty string then might mean the default group */
	FString Group;

	TArray<BlueprintAssetAnimationLayerInputInfo> Inputs;
};


struct BlueprintAssetFunctionInputPin
{
	BlueprintAssetFunctionInputPin() = delete;

	explicit BlueprintAssetFunctionInputPin(const UEdGraphPin* InPin, EInvalidDataReason_BlueprintAssetFunction& OutIncompleteDataReason);

	// For debugging
	FString ToString() const;

	//------------------------------------------------------------
	//	Data
	//------------------------------------------------------------

	FString Name;

	FString Type;
	FString SubType;

	/* If this is an FText (i.e. Type equals "text") then this is the
	default value */
	FText DefaultTextValue;
	/* If this is not an FText (i.e. Type does not equal "text") then this is the
	default value (actually if it is for an FText this will be
	it's default value .ToString()) */
	FString DefaultValue;

	uint8 bIsPassByReference : 1;

	EPinContainerType ContainerType;
};


struct BlueprintAssetFunctionReturnNodePin
{
	BlueprintAssetFunctionReturnNodePin() = delete;

	explicit BlueprintAssetFunctionReturnNodePin(const UEdGraphPin* InPin, EInvalidDataReason_BlueprintAssetFunction& OutIncompleteDataReason);

	// For debugging
	FString ToString() const;

	//------------------------------------------------------------
	//	Data
	//------------------------------------------------------------

	FString Name;

	FString Type;
	FString SubType;

	EPinContainerType ContainerType;
};


/* Information about a function of a blueprint asset */
struct BlueprintAssetFunction
{
	BlueprintAssetFunction() = delete;

	explicit BlueprintAssetFunction(const UBlueprint* Blueprint, const UEdGraph* InFunctionGraph, EInvalidDataReason_BlueprintAssetFunction& OutIncompleteDataReason);

	// For debugging
	FString ToString() const;

	//------------------------------------------------------------
	//	Data
	//------------------------------------------------------------

	FString Name;

	BlueprintAssetDescriptionText Description;

	/* Can be in the form Category1 |Category2   | Category3
	Whitespace gets included as far as I'm aware. If it's the "Default"
	category I think sometimes this is empty */
	FString Category;

	FString PathOfClassThisWasIntroducedBy;

	EAccessSpecifier AccessSpecifier;

	uint8 bIsStatic : 1;
	uint8 bIsPure : 1;
	uint8 bCallInEditor : 1;
	uint8 bIsConst : 1;
	uint8 bIsDeprecated : 1;

	FString DeprecationMessage;

	/* AKA parameters, but will likely also include the exec pin
	(even if the function is pure).
	It will not include the self pin even if the function is non-static */
	TArray<BlueprintAssetFunctionInputPin> InputPins;

	/* Pins that appear on a return node.
	Note: if you added a return node to your function then this will
	include the exec pin (even if the function is pure) + any outputs,
	otherwise it will be empty */
	TArray<BlueprintAssetFunctionReturnNodePin> ReturnNodePins;
};


struct BlueprintAssetMacroInputPin
{
	BlueprintAssetMacroInputPin() = delete;

	explicit BlueprintAssetMacroInputPin(const UEdGraphPin* InPin, EInvalidDataReason_BlueprintAssetMacro& OutIncompleteDataReason);

	// For debugging
	FString ToString() const;

	//------------------------------------------------------------
	//	Data
	//------------------------------------------------------------

	FString Name;

	FString Type;
	FString SubType;

	/* If this is an FText (i.e. Type equals "text") then this is the
	default value */
	FText DefaultTextValue;
	/* If this is not an FText (i.e. Type does not equal "text") then this is the
	default value (actually if it is for an FText this will be
	it's default value .ToString()) */
	FString DefaultValue;

	uint8 bIsPassByReference : 1;

	EPinContainerType ContainerType;
};


struct BlueprintAssetMacroOutputPin
{
	BlueprintAssetMacroOutputPin() = delete;

	explicit BlueprintAssetMacroOutputPin(const UEdGraphPin* InPin, EInvalidDataReason_BlueprintAssetMacro& OutIncompleteDataReason);

	// For debugging
	FString ToString() const;

	//------------------------------------------------------------
	//	Data
	//------------------------------------------------------------

	FString Name;

	FString Type;
	FString SubType;

	EPinContainerType ContainerType;
};


/* Information about a macro of a blueprint asset */
struct BlueprintAssetMacro
{
	BlueprintAssetMacro() = delete;

	explicit BlueprintAssetMacro(const UBlueprint* Blueprint, const UEdGraph* InMacroGraph, EInvalidDataReason_BlueprintAssetMacro& OutIncompleteDataReason);

	// For debugging
	FString ToString() const;

	//------------------------------------------------------------
	//	Data
	//------------------------------------------------------------

	FString Name;

	BlueprintAssetDescriptionText Description;

	/* Can be in the form Category1 |Category2   | Category3
	Whitespace gets included as far as I'm aware. If it's the "Default"
	category I think sometimes this is empty. */
	FString Category;

	uint8 bCallInEditor : 1;

	TArray<BlueprintAssetMacroInputPin> Inputs;

	TArray<BlueprintAssetMacroOutputPin> Outputs;
};


struct BlueprintAssetInterface
{
	BlueprintAssetInterface() = delete;

	explicit BlueprintAssetInterface(const FString& InPath)
		: Path(InPath)
	{}

	// For debugging
	FString ToString() const
	{
		return Path;
	}

	//------------------------------------------------------------
	//	Data
	//------------------------------------------------------------

	FString Path;
};


struct BlueprintAssetVariable
{
	BlueprintAssetVariable() = delete;

	explicit BlueprintAssetVariable(const UBlueprint* Blueprint, UBlueprintGeneratedClass* BPGC, const FBPVariableDescription& InVariable);

	/**
	 *	If this returns true it means the variable's default value is
	 *	stored in DefaultValueAsJson. If false then it is stored in
	 *	DefaultValue
	 */
	FORCEINLINE bool UsesJsonObjectToStoreDefaultValue() const
	{
		// Structs store their default value in the json object. 
		// So do arrays, sets and maps 
		return ContainerType != EPinContainerType::None
			|| Type.Compare(TEXT("struct")) == 0;
	}

	FString GetFullTypeForDisplay() const;

	// For debugging
	FString ToString() const;

	//------------------------------------------------------------
	//	Data
	//------------------------------------------------------------

	/* Name as it appears in the "Variables" tab */
	FString Name;

	BlueprintAssetDescriptionString Tooltip;

	/* Will include spaces */
	FString Category;

	FString Type;

	FString SubType;

	EPinContainerType ContainerType;

	EBlueprintVariableReplicationType Replication;
	ELifetimeCondition ReplicationCondition;

	uint16 bInstanceEditable : 1;
	uint16 bBlueprintReadOnly : 1;
	uint16 bExposeOnSpawn : 1;
	uint16 bPrivate : 1;
	uint16 bExposeToCinematics : 1;
	uint16 bConfigVariable : 1;
	uint16 bTransient : 1;
	uint16 bSaveGame : 1;
	uint16 bAdvancedDisplay : 1;
	uint16 bMultiline : 1;
	uint16 bDeprecated : 1;

	FString DeprecationMessage;

	FString DefaultValue;

	/* @See UsesJsonObjectToStoreDefaultValue() to know the times this
	is used */
	TSharedPtr<FJsonValue> DefaultValueAsJson;
};


struct BlueprintAssetEventDispatcherInput
{
	BlueprintAssetEventDispatcherInput() = delete;

	/* @param CDO - class default object for blueprint generated class */
	explicit BlueprintAssetEventDispatcherInput(const UProperty* InInputProperty, const UObject* CDO);

	/* Extract data from UProperty */
	static void GetTypeAndSubTypeAndContainerType(const UProperty* InInputProperty, const UObject* CDO, FString& OutType, FString& OutSubType, EPinContainerType& OutContainerType);

private:

	static void GetTypeAndSubType(const UProperty* InInputProperty, const UObject* CDO, FString& OutType, FString& OutSubType);

public:

	// For debugging
	FString ToString() const;

	//------------------------------------------------------------
	//	Data
	//------------------------------------------------------------

	FString Name;

	FString Type;

	FString SubType;

	EPinContainerType ContainerType;

	uint8 bIsPassByReference : 1;
};


struct BlueprintAssetEventDispatcher
{
	BlueprintAssetEventDispatcher() = delete;

	explicit BlueprintAssetEventDispatcher(const UBlueprint* Blueprint, UBlueprintGeneratedClass* BPGC, const FBPVariableDescription& InVariable);

	// For debugging
	FString ToString() const;

	//------------------------------------------------------------
	//	Data
	//------------------------------------------------------------

	TArray<BlueprintAssetEventDispatcherInput> Inputs;

	FString Name;

	BlueprintAssetDescriptionString Tooltip;

	/* Will include spaces */
	FString Category;

	FString Type;

	EBlueprintVariableReplicationType Replication;
	ELifetimeCondition ReplicationCondition;

	uint8 bInstanceEditable : 1;
	uint8 bBlueprintReadOnly : 1;
	uint8 bPrivate : 1;
	uint8 bConfigVariable : 1;
	uint8 bTransient : 1;
	uint8 bSaveGame : 1;
	uint8 bAdvancedDisplay : 1;
	uint8 bDeprecated : 1;

	FString DeprecationMessage;

	FString DefaultValue;
};


/* Information about a blueprint asset */
struct BlueprintAssetInfo
{
	BlueprintAssetInfo();

	explicit BlueprintAssetInfo(const FAssetData& InAssetData);

	void GetSubType();

	void GetParentClassNameAndPath(bool bFromOutsidethisProject);

	void GetNativeParentClassName(bool bFromOutsidethisProject);

	/* Todo slow. Add a counter variable to this class and increment it
	for every event you add to an event graph, then just return that
	here - all really simple stuff */
	int32 GetNumEventsInEventGraphs() const
	{
		int32 Num = 0;
		for (const auto& Graph : EventGraphs)
		{
			Num += Graph.Events.Num();
		}
		return Num;
	}

	// For debugging
	FString ToString() const;

	//------------------------------------------------------------
	//	Data
	//------------------------------------------------------------

	FAssetData AssetData;

	/* Note: I will probably never call IsValid() on this weak pointer,
	so for performance it can actually be a raw pointer. If you get
	to the end of this plugin change this to a raw pointer todo */
	TWeakObjectPtr<UBlueprint> Blueprint;

	//-------------------------------------------------------------

	FString Name;

	/* Will not include name.
	Example:
	/Game/SomeFolder/SomeOtherFolder */
	FString Path;

	BlueprintAssetDescriptionString Description;

	EBlueprintType Type;
	/* Quick note about this:
	if you create a editor utility widget blueprint, then create another
	blueprint that is a child of it, then the child blueprint is actually
	a widget blueprint, not an editor utility widget blueprint. Same
	deal with editor utility blueprints: the child just becomes a
	regular blueprint. ParentClassName will indeed be the parent
	blueprint, so we have a situation where the parent blueprint is
	a different blueprint class (e.g. we're UBlueprint while parent
	is UEditorUtilityBlueprint). I'm not sure if this is the correct
	behavior i.e.  they do not want child blueprints
	of editor utility (widget) blueprints and trying to create one
	results in a regular (widget) blueprint, or if it is a UE4 bug.
	Actually I kinda take back what I said about the widgets - the
	child blueprint IS an editor utility widget blueprint: at least
	in the top right corner if you switch from Designer to Graph
	then look in the details panel in the bottom left the details
	are for editor utility widget blueprint (not widget blueprint)
	and in functions you can override the "Run" function which is
	also an editor utility widget function. However if you right-click
	the blueprint it does not give you the option "Run Editor Utility
	Widget"

	Bottom line: you can probably trust what this variable says.
	The blueprints that are children of editor utility widget blueprints
	appear to have characteristics of both a widget blueprint and
	an editor utility widget blueprint, so it's hard to say what one
	it really is */
	FString SubType;

	/* Whether we know what the parent class is */
	uint8 bHasValidParentClass : 1;
	uint8 bAbstractClass : 1;
	uint8 bConstClass : 1;

	FString ParentClassName;

	// I will probably only fill this out if the direct parent is a 
	// blueprint
	FString ParentClassPath;

	// True = direct parent is a blueprint, false = direct parent is a C++ class
	bool bIsDirectParentABlueprint;

	/* The prefix letter i.e. 'U' or 'A' will be missing */
	FString NativeParentClassName;

	/* This contains only interfaces that are implemented by blueprint
	i.e. it does not contain any interfaces the C++ class this blueprint
	is based on inherits, and also does not contain any interfaces the
	parent blueprint(s) implement (if this is the child of another
	blueprint) */
	TArray<BlueprintAssetInterface> BlueprintImplementedInterfaces;

	/* Only includes components introduced by this class. Also only
	includes components that appear in the component tab
	(usually in the top left corner of the blueprint. So yeah it
	does not include any you add using the "+Variable" button of the
	variables tab) */
	TArray<BlueprintAssetComponent> Components;

	/* Event graphs hold events */
	TArray<BlueprintAssetEventGraph> EventGraphs;

	/* If this isn't an anim blueprint then this will very likely be empty */
	TArray<BlueprintAssetAnimationGraphInfo> AnimationGraphs;

	/* If this isn't an anim blueprint then this will very likely be empty */
	TArray<BlueprintAssetAnimationLayerInfo> AnimationLayers;

	TArray<BlueprintAssetFunction> Functions;

	/* These are functions that appear in the "Interfaces" heading
	on the left of the blueprint e.g. it goes "Graphs", "Functions",
	"Interfaces", "Macros", etc.
	Note: how UE4 populates this is that it will not contain any
	event type interface functions i.e. functions that don't have
	a return value or any out params. Also, it will not contain any
	functions that override a parent blueprint's interface e.g.
	if this is a child blueprint and our parent blueprint has
	an interface and we override a function of that interface then
	that function does not appear in this graph. Instead it just
	appears in the "Functions" graph.

	A note with regards to warnings/errors:
	From my small amount of testing, if a input or output BP gets deleted
	from the signature (by doing it in the interface BP) if it was a:
	- user defined struct: then the param gets removed completely from
	BPs that implement the interface when it comes to documenting them
	(even though in editor it still shows them).
	- object deriving: gets replaced with Type == "object" and
	SubType == "Object" (editor still shows old param type though).
	However, when documenting the interface BP I do pick up that the
	params are bad and exclude it from documentation, so maybe when
	documenting the items in this array you could check if the interface
	BP has them in it's Functions array. If it doesn't then the function
	is maybe not callable (due to warnings/errors) and you could choose
	to leave it out of documentation page. Actually for the user defined
	struct case I found that it is callable and appears to function
	properly */
	TArray<BlueprintAssetFunction> InterfaceFunctions;

	TArray<BlueprintAssetMacro> Macros;

	/* Variables introduced by this blueprint */
	TArray<BlueprintAssetVariable> Variables;

	/* Event dispatchers introduced by this blueprint */
	TArray<BlueprintAssetEventDispatcher> EventDispatchers;
};


/* Info on a single value in a user defined enum */
struct UserDefinedEnumValueInfo
{
	UserDefinedEnumValueInfo() = delete;

	explicit UserDefinedEnumValueInfo(const FText& InDisplayName, const FText& InToolTip);

	// For debugging
	FString ToString() const;

	//------------------------------------------------------------
	//	Data
	//------------------------------------------------------------

	FText DisplayName;

	BlueprintAssetDescriptionText Description;
};


/* Information about a user defined enum */
struct UserDefinedEnumInfo
{
	UserDefinedEnumInfo() = delete;

	explicit UserDefinedEnumInfo(const FAssetData& InAssetData);

	// For debugging
	FString ToString() const;

	//------------------------------------------------------------
	//	Data
	//------------------------------------------------------------

	/* Note: I will probably never call IsValid() on this weak pointer,
	so for performance it can actually be a raw pointer. If you get
	to the end of this plugin change this to a raw pointer todo */
	TWeakObjectPtr<UUserDefinedEnum> Enum;

	//-------------------------------------------------------------

	FString Name;

	/* Will not include name:
	e.g. /Game/SomeFolder/SomeOtherFolder */
	FString Path;

	BlueprintAssetDescriptionText Description;

	bool bBitmaskFlags;

	TArray<UserDefinedEnumValueInfo> Values;
};


/* Info on a member of a user defined struct */
struct UserDefinedStructMemberInfo
{
	UserDefinedStructMemberInfo() = delete;

	explicit UserDefinedStructMemberInfo(const FStructVariableDescription& InVariable, EInvalidDataReason_UserDefinedStructMember& OutIncompleteDataReason);

	FString GetFullTypeForDisplay() const;

	// For debugging
	FString ToString() const;

	//------------------------------------------------------------
	//	Data
	//------------------------------------------------------------

	FString Name;

	FString Type;

	FString SubType;

	EPinContainerType ContainerType;

	BlueprintAssetDescriptionString ToolTip;

	uint8 bEditable : 1;
	uint8 bSaveGame : 1;
	uint8 bEnableMultiLineText : 1;
	uint8 b3DWidget : 1;

	/* To figure out the format of this you will need to do some
	logging of it.
	e.g.
	- an int64 default value of 5555 is: (5555)
	- a FText default value of Blah looks something like: NSLOCTEXT("[FB72BD5F485BEEE21E7A4EAAFDE9F2EB]", "EACD5A5E4A0DA4B5A7B98BB02B445B0A", "Blah")
	- a FTransform: 0.000000,0.000000,0.000000|0.000000,0.000000,-80.999908|99999.000000,1.000000,1.000000
	One additional thing I have figured out about it is for structs it only stores
	values that differ from the struct's defaults */
	FString DefaultValue;
};


struct UserDefinedStructInfo
{
	UserDefinedStructInfo() = delete;

	explicit UserDefinedStructInfo(const FAssetData& InAssetData);

	// For debugging
	FString ToString() const;

	//------------------------------------------------------------
	//	Data
	//------------------------------------------------------------

	/* Note: I will probably never call IsValid() on this weak pointer,
	so for performance it can actually be a raw pointer. If you get
	to the end of this plugin change this to a raw pointer todo */
	TWeakObjectPtr<UUserDefinedStruct> Struct;

	//-------------------------------------------------------------

	FString Name;

	/* Will not include name:
	e.g. /Game/SomeFolder/SomeOtherFolder */
	FString Path;

	BlueprintAssetDescriptionString Description;

	TArray<UserDefinedStructMemberInfo> Members;
};


struct AssetInfoPtr
{
	enum class EAssetType : uint8
	{
		Blueprint = (1 << 0),
		UserDefinedEnum = (1 << 1),
		UserDefinedStruct = (1 << 2)
	};

	AssetInfoPtr() = delete;

	explicit AssetInfoPtr(const BlueprintAssetInfo& InAsset)
		: DataPtr(&InAsset)
		, AssetType(EAssetType::Blueprint)
	{}

	explicit AssetInfoPtr(const UserDefinedEnumInfo& InAsset)
		: DataPtr(&InAsset)
		, AssetType(EAssetType::UserDefinedEnum)
	{}

	explicit AssetInfoPtr(const UserDefinedStructInfo& InAsset)
		: DataPtr(&InAsset)
		, AssetType(EAssetType::UserDefinedStruct)
	{}

	bool IsForBlueprint() const
	{
		return AssetType == EAssetType::Blueprint;
	}

	bool IsForUserDefinedEnum() const
	{
		return AssetType == EAssetType::UserDefinedEnum;
	}

	bool IsForUserDefinedStruct() const
	{
		return AssetType == EAssetType::UserDefinedStruct;
	}

	const BlueprintAssetInfo* GetBlueprintAssetInfo() const
	{
		check(IsForBlueprint());
		return static_cast<const BlueprintAssetInfo*>(DataPtr);
	}

	const UserDefinedEnumInfo* GetEnumAssetInfo() const
	{
		check(IsForUserDefinedEnum());
		return static_cast<const UserDefinedEnumInfo*>(DataPtr);
	}

	const UserDefinedStructInfo* GetStructAssetInfo() const
	{
		check(IsForUserDefinedStruct());
		return static_cast<const UserDefinedStructInfo*>(DataPtr);
	}

	/* Some convenience functions. You can always get all the data
	on the asset by checking whether it's for a blueprint, enum or
	struct, then calling the appropriate GetXXAssetInfo(), so these functions are
	just here for convenience */
	const FString& GetAssetName() const
	{
		if (IsForBlueprint())
		{
			return GetBlueprintAssetInfo()->Name;
		}
		else if (IsForUserDefinedEnum())
		{
			return GetEnumAssetInfo()->Name;
		}
		else // Assumed for struct
		{
			return GetStructAssetInfo()->Name;
		}
	}

	const FString& GetAssetDescription() const
	{
		if (IsForBlueprint())
		{
			return GetBlueprintAssetInfo()->Description.String;
		}
		else if (IsForUserDefinedEnum())
		{
			return GetEnumAssetInfo()->Description.Text.ToString();
		}
		else  // Assumed for struct
		{
			return GetStructAssetInfo()->Description.String;
		}
	}

private:

	//-------------------------------------------------------------
	//	Data
	//-------------------------------------------------------------

	const void* DataPtr;
	EAssetType AssetType;
};


/* Information about an operating system folder */
struct AssetFolderInfo
{
	AssetFolderInfo() = delete;

	explicit AssetFolderInfo(const FString& InThisFoldersPath);

	/* @return false - is for a folder */
	FORCEINLINE bool IsForContentAPIHomePage() const
	{
		return ThisFoldersPath.Len() == 0;
	}

	// For debugging
	FString ToString() const;

	//--------------------------------------------------------------
	//	Data
	//--------------------------------------------------------------

	/* e.g. "/Game", "/Game/SomeFolder" */
	FString ThisFoldersPath;

	/**
	 *	Folders that are direct subfolders of this folder, but does not
	 *	include any of their subfolders.
	 *	Use UProjectDocumentationTool::AssetFolders to lookup info on them
	 */
	TSet<FString> SubFolders;

	/**
	 *	Assets directly contained in this folder, but not any contained
	 *	in subfolders
	 */
	TArray<AssetInfoPtr> Assets;
};


/* Functions to help with the gathering of data from blueprint assets */
class BlueprintAssetParsingHelpers
{
public:

	/* To be honest this will likely end up being the exact same
	implementation as PostProcessComment.
	This is intended for any comment found anywhere in blueprint assets.

	Thought I would add some notes about this here:
	1. I call this during PrepareBlueprintAssetData instead of during
	PostProcessData. Currently this is fine. If in future I do something
	like check the comment for references to other things (e.g. UObject)
	and create hyperlinks for them then I might have to do it in
	PostProcessData. Well you could add that extra step in PostProcessData.
	Actually yeah I think that's a good idea: although we will be doing
	more work (iterating string twice instead of once) it will be better
	to do less work during PostProcessData since during PrepareBlueprintAssetData
	we will very likely be waiting on CL command to finish.
	*/
	static void GetBlueprintAssetDescription(const FString& InRawComment, BlueprintAssetDescriptionString& String);

	/* This version is for strings that appear to not have the
	functionality in editor where SHIFT+ENTER will add a new line to
	them.
	I'm not 100% sure why I created this function */
	static void GetBlueprintAssetDescription_NoShiftEnterToAddNewLineFunctionality(const FString& InRawComment, BlueprintAssetDescriptionString& String);

	static void GetBlueprintAssetDescription(const FText& InRawComment, BlueprintAssetDescriptionText& Text);

	/* Basically the same as GetBlueprintAssetDescription. I just
	added this cause it was being used in a ctor initialization list */
	static BlueprintAssetDescriptionText CreateBlueprintAssetDescription(const FText& InRawComment)
	{
		BlueprintAssetDescriptionText Text;
		GetBlueprintAssetDescription(InRawComment, Text);
		return Text;
	}

	static BlueprintAssetDescriptionString CreateBlueprintAssetDescription_NoShiftEnterToAddNewLineFunctionality(const FString& InRawComment)
	{
		BlueprintAssetDescriptionString String;
		GetBlueprintAssetDescription_NoShiftEnterToAddNewLineFunctionality(InRawComment, String);
		return String;
	}

	static void GetBlueprintAssetDeprecationMessage(const FString& InRawComment, FString& OutMessage);

	static FString CreateBlueprintAssetEventGraphName(const FString& InRawName);
	static FString CreateBlueprintAssetEventInputName(const FString& InRawName);
	static FString CreateBlueprintAssetEventName(const FString& InRawName);
	static FString CreateBlueprintAssetAnimGraphInputInputName(const FString& InRawName);
	static FString CreateBlueprintAssetAnimGraphInputName(const FString& InRawName);
	static FString CreateBlueprintAssetAnimGraphName(const FString& InRawName);
	static FString CreateBlueprintAssetAnimLayerInputName(const FString& InRawName);
	static FString CreateBlueprintAssetAnimLayerName(const FString& InRawName);
	static FString CreateBlueprintAssetFunctionInputName(const FString& InRawName);
	static FString CreateBlueprintAssetFunctionOutputName(const FString& InRawName);
	static FString CreateBlueprintAssetFunctionName(const FString& InRawName);
	static FString CreateBlueprintAssetMacroInputPinName(const FString& InRawName);
	static FString CreateBlueprintAssetMacroOutputPinName(const FString& InRawName);
	static FString CreateBlueprintAssetMacroName(const FString& InRawName);
	static FString CreateBlueprintAssetVariableName(const FString& InRawName);
	static FString CreateBlueprintAssetEventDispatcherName(const FString& InRawName);

protected:

	static FString CreateBlueprintAssetName_Inner(const FString& InRawName);
};


/* Maybe stuff in here can be moved to BlueprintAssetParsingHelpers */
class BlueprintAssetUtilities
{
public:

	FORCEINLINE static bool HasAllFlags(uint64 Flags, uint64 FlagsToCheck)
	{
		return FlagsToCheck == (Flags & FlagsToCheck);
	}

	// Copied implementation from FEmitHelper::IsBlueprintNativeEvent
	FORCEINLINE static bool IsBlueprintNativeEvent(uint64 FunctionFlags)
	{
		return HasAllFlags(FunctionFlags, FUNC_Event | FUNC_BlueprintEvent | FUNC_Native);
	}

	// Copied implementation from FEmitHelper::IsBlueprintImplementableEvent
	FORCEINLINE static bool IsBlueprintImplementableEvent(uint64 FunctionFlags)
	{
		return HasAllFlags(FunctionFlags, FUNC_Event | FUNC_BlueprintEvent) && HasAllFlags(FunctionFlags, FUNC_Native) == false;
	}
};

/* "BAU" stands for Blueprint Asset Utilities */
class BAU
{
public:

	FORCEINLINE static bool AreEqual(const FString& Str_1, const FString& Str_2)
	{
		return Str_1.Compare(Str_2, ESearchCase::CaseSensitive) == 0;
	}
};

#endif
