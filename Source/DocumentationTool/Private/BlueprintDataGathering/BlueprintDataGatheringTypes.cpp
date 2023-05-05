// Fill out your copyright notice in the Description page of Project Settings.


#if WITH_EDITOR

#include "BlueprintDataGatheringTypes.h"
#include "Engine/SCS_Node.h"
#include "K2Node_FunctionEntry.h"
#include "K2Node_Tunnel.h"
#include "K2Node_FunctionResult.h"
#include "K2Node_CustomEvent.h"
#include "Engine/SimpleConstructionScript.h"
#include "Math/BigInt.h"
#if ENGINE_VERSION_EQUAL_OR_NEWER_THAN(4, 24)
#include "AnimGraphNode_LinkedInputPose.h"
#else
#include "AnimGraphNode_SubInput.h"
#endif
#include "JsonObjectConverter.h"
#include "UserDefinedStructure/UserDefinedStructEditorData.h"
#include "Engine/UserDefinedEnum.h"
#include "Engine/UserDefinedStruct.h"

#include "DocsTool.h"
#include "PostProcessing/PostProcessingTypes.h"
#include "HTMLCreation/HTMLCreation_Default.h"


DISABLE_OPTIMIZATION

//---------------------------------------------------------------------
//	------------------- Blueprint asset structs -----------------------

BlueprintAssetComponent::BlueprintAssetComponent(const UBlueprint* Blueprint, UBlueprintGeneratedClass* BPGC, USCS_Node* Node)
	: Name(Node->GetVariableName().ToString())
	, Class(Node->ComponentClass->GetName())
	, bIsParentComponentNative(Node->bIsParentComponentNative)
{
	/* Check if the direct parent component was introduced
	by C++ */
	if (Node->bIsParentComponentNative)
	{
		/* This code here gets the display name of the
		component e.g. the mesh for ACharacter is called
		"Mesh". Note that it appears to always be what was
		typed in C++
		e.g.
		UPROPERTY()
		UCharacterMovementComponent * MoveComp;
		// The displayed name will be "MoveComp"

		This code here is the fastest way I know how
		to do it. It is relatively slow */
		UClass* BlueprintParentClass = Blueprint->ParentClass;
		UObject* CDO = BlueprintParentClass->ClassDefaultObject;
		check(CDO != nullptr);
		for (TFieldIterator<UObjectPropertyBase> Iter(BlueprintParentClass); Iter; ++Iter)
		{
			UObjectPropertyBase* Prop = *Iter;

			UObject* Obj = Prop->GetObjectPropertyValue_InContainer(CDO);
			// lol, we can get null here!?
			if (Obj != nullptr)
			{
				if (Obj->GetFName() == Node->ParentComponentOrVariableName)
				{
					ParentComponentName = Prop->GetName();
					break;
				}
			}
		}

		/* Check we found the parent component */
		check(ParentComponentName.Len() > 0);
	}
	else
	{
		/* This is what I found: ParentComponentOrVariableName
		will be NAME_None if either:
		1. the component does not have any parent
		2. the component has a parent that is a component
		introduced by this blueprint (kinda unexpected
		for this to be the case but whatever, that's
		how it works apparently, maybe it's unintentional
		and is a bug). So if it equals NAME_None we
		use the simple constructon script to check if
		it has a parent. */
		if (Node->ParentComponentOrVariableName == NAME_None)
		{
			/* Maybe there is a faster way to figure out
			if it has a parent component, maybe not. I
			have spent enough time on this so this will
			do for now */
			if (BPGC->SimpleConstructionScript->FindParentNode(Node))
			{
				ParentComponentName = BPGC->SimpleConstructionScript->FindParentNode(Node)->GetVariableName().ToString();
			}
			else
			{
				ParentComponentName = Node->ParentComponentOrVariableName.ToString();
			}
		}
		else
		{
			ParentComponentName = Node->ParentComponentOrVariableName.ToString();
		}
	}

	ParentComponentOwnerClassName = Node->ParentComponentOwnerClassName.ToString();
}

FString BlueprintAssetComponent::ToString() const
{
	FString S;

	S += TEXT("Name: ") + Name;
	S += TEXT(", ");
	S += TEXT("Class: ") + Class;
	S += TEXT(", ");
	S += TEXT("ParentComponentName: ") + ParentComponentName;
	S += TEXT(", ");
	S += TEXT("ParentComponentOwnerClassName: ") + ParentComponentOwnerClassName;

	return S;
}

BlueprintAssetEventInputPin::BlueprintAssetEventInputPin(const UEdGraphPin* InPin, EInvalidDataReason_BlueprintAssetEvent& OutIncompleteDataReason)
	: Name(BlueprintAssetParsingHelpers::CreateBlueprintAssetEventInputName(InPin->GetName()))
	, Type(InPin->PinType.PinCategory.ToString())
	, bIsPassByReference(InPin->PinType.bIsReference)
	, ContainerType(InPin->PinType.ContainerType)
{
	/* Start this out as "None". We'll change it along the way if we
	encounter any issues */
	OutIncompleteDataReason = EInvalidDataReason_BlueprintAssetEvent::None;

	if (BAU::AreEqual(Type, TEXT("object"))
		|| BAU::AreEqual(Type, TEXT("struct"))
		|| BAU::AreEqual(Type, TEXT("class"))
		|| BAU::AreEqual(Type, TEXT("interface"))
		|| BAU::AreEqual(Type, TEXT("softclass"))
		|| BAU::AreEqual(Type, TEXT("softobject")))
	{
		if (InPin->PinType.PinSubCategoryObject.IsValid())
		{
			SubType = InPin->PinType.PinSubCategoryObject->GetName();
		}
		else
		{
			/* One time when this can happen is if you delete
			the blueprint asset it was for. In that case the
			engine changes it to a generic value
			(if Type == "object" ----> "Object",
			if Type == "class" or "softclass" or "softobject" ----> "Object",
			I haven't actually tested those 3 cases - just assuming,
			if Type == "interface" ----> "Interface",
			if Type == "struct" ----> "Fallback Struct").
			You will get a compile error (which might be a bit puzzling
			for the "Object" cases(s) since "Object" is actually a
			valid type - it's for UObject) so to get rid of it you just need
			to change it to anything else, actually even selecting
			"Object" will work (or delete the input if you don't need it
			anymore - that could work also).

			Note that despite there being a compile error, if things
			still worked OK (e.g. you could pass
			the param into event and it would still work) then
			here I would probably just do something like SubType = "Object"
			or SubType = "Interface", etc (depends on what Type equals) -
			whether stuff works trumps what the compiler says. However,
			from my testing the event does nothing when called so the error belongs and
			so here I choose to stop documenting this pin */
			OutIncompleteDataReason = EInvalidDataReason_BlueprintAssetEvent::InputPinsSubCategoryObjectNull;
			return;
		}
	}

	if (BAU::AreEqual(Type, TEXT("text")))
	{
		DefaultTextValue = InPin->DefaultTextValue;
		// Do this as well I guess
		DefaultValue = InPin->DefaultTextValue.ToString();
	}
	else
	{
		DefaultValue = InPin->DefaultValue;
	}
}

FString BlueprintAssetEventInputPin::ToString() const
{
	FString S;

	S += TEXT("Name: ") + Name;
	S += TEXT(", ");
	S += TEXT("Type: ") + Type;
	S += TEXT(", ");
	S += TEXT("SubType: ") + SubType;
	S += TEXT(", ");
	S += TEXT("DefaultValue: ") + DefaultValue;
	S += TEXT(", ");
	S += TEXT("bIsPassByReference: ") + (bIsPassByReference ? FString("true") : FString("false"));
	S += TEXT(", ");
	S += TEXT("ContainerType: ") + DocDebugHelpers::EnumValueToString(ContainerType);

	return S;
}


BlueprintAssetEvent::BlueprintAssetEvent(const UBlueprint* Blueprint, bool bIsOwningBlueprintAnAnimBlueprint, UK2Node_Event* InNode, EInvalidDataReason_BlueprintAssetEvent& OutIncompleteDataReason)
	: Name(BlueprintAssetParsingHelpers::CreateBlueprintAssetEventName(InNode->GetFunctionName().ToString()))
{
	/* Start this out as "None". We'll change it along the way if we
	encounter any issues */
	OutIncompleteDataReason = EInvalidDataReason_BlueprintAssetEvent::None;

	InputPins.Reserve(InNode->Pins.Num());
	for (const auto& Pin : InNode->Pins)
	{
		InputPins.Emplace(BlueprintAssetEventInputPin(Pin, OutIncompleteDataReason));
		/* Check if there was any issues gathering data for pin */
		if (OutIncompleteDataReason != EInvalidDataReason_BlueprintAssetEvent::None)
		{
			/* Because it is assumed OutInputPins will be thrown away
			I do not remove the element we just added to it.
			Actually another good reason not to remove it is that
			later on in BlueprintAssetEventGraph ctor I need to reference
			that element we just added for
			NoteDownBlueprintAssetEventOnlyPartiallyParsableDueToInputPinsSubCategoryObjectNull */
			return;
		}
	}

	bool bIsEventForAnimNotifyAddedViaPersona = false;
	EFunctionFlags FuncFlags = FUNC_None;
	const UFunction* UFunc = InNode->FindEventSignatureFunction();
	/* FindEventSignatureFunction() will return null if this is a
	UK2Node_CustomEvent node. All the function flags are contained
	in EventNode->FunctionFlags in this case (actually maybe they're
	always contained on there, I don't know, I just bitwise OR
	both sets of flags to be safe) */
	if (InNode->GetClass() != UK2Node_CustomEvent::StaticClass())
	{
		if (UFunc == nullptr)
		{
			/* FindEventSignatureFunction() will also return null for anim
			notifies nodes for notifies you added via Persona by right-clicking
			a track and adding an anim notify, so here we are going to check if
			it is one of those anim notifies */
			if (bIsOwningBlueprintAnAnimBlueprint)
			{
				/* All anim notifies created via Persona must start with
				"AnimNotify_" so check that.
				Note: checking this is not enough to determine if it is
				a Persona-added anim notify - users can create custom events
				or UFUNCTIONs that start with "AnimNotify_" */
				if (Name.StartsWith(TEXT("AnimNotify_"), ESearchCase::CaseSensitive))
				{
					/* Remove "AnimNotify_" from start - the entries contained in
					USkeleton::AnimationNotifies do not have that part there */
					const FName FNAME_Event(*Name.RightChop(11));
					/* Check if anim notify. This is the fastest way I
					know how */
					bIsEventForAnimNotifyAddedViaPersona = CastChecked<UAnimBlueprint>(Blueprint)->TargetSkeleton->AnimationNotifies.Contains(FNAME_Event);
				}
			}

			if (bIsEventForAnimNotifyAddedViaPersona == false)
			{
				OutIncompleteDataReason = EInvalidDataReason_BlueprintAssetEvent::UFunctionNull;
				return;
			}
		}
		else
		{
			FuncFlags = UFunc->FunctionFlags;
		}
	}

	/* I *think* I need to consider these flags too, not 100% sure though.
	I think they aren't just a copy of FuncFlags but are indeed actually different */
	const uint32 MoreFuncFlags = InNode->FunctionFlags;
	const uint32 FunctionFlags = FuncFlags | MoreFuncFlags;

	// Set Type
	if (bIsEventForAnimNotifyAddedViaPersona)
	{
		Type = EBlueprintAssetEventType::AnimNotifyAddedViaPersona;
	}
	else if (InNode->GetClass() == UK2Node_CustomEvent::StaticClass())
	{
		Type = EBlueprintAssetEventType::CustomEventIntroducedByThisBlueprint;
	}
	else if (BlueprintAssetUtilities::IsBlueprintImplementableEvent(FunctionFlags))
	{
		Type = EBlueprintAssetEventType::BlueprintImplementableEvent;
	}
	else if (BlueprintAssetUtilities::IsBlueprintNativeEvent(FunctionFlags))
	{
		Type = EBlueprintAssetEventType::BlueprintNativeEvent;
	}
	else
	{
		Type = EBlueprintAssetEventType::CustomEventIntroducedByAParentBlueprint;
	}

	if (Type == EBlueprintAssetEventType::CustomEventIntroducedByThisBlueprint)
	{
		const UK2Node_CustomEvent* CustomEventNode = CastChecked<UK2Node_CustomEvent>(InNode);

		PathOfClassThisWasIntroducedBy = Blueprint->SkeletonGeneratedClass->GetPathName();
		if (BlueprintAssetUtilities::HasAllFlags(FunctionFlags, FUNC_NetClient))
		{
			RPCType = ERPCType::Client;
		}
		else if (BlueprintAssetUtilities::HasAllFlags(FunctionFlags, FUNC_NetServer))
		{
			RPCType = ERPCType::Server;
		}
		else if (BlueprintAssetUtilities::HasAllFlags(FunctionFlags, FUNC_NetMulticast))
		{
			RPCType = ERPCType::Multicast;
		}
		else
		{
			RPCType = ERPCType::None;
		}
		bIsRPCReliable = BlueprintAssetUtilities::HasAllFlags(FunctionFlags, FUNC_NetReliable);
		bCallInEditor = CustomEventNode->bCallInEditor;
#if ENGINE_VERSION_EQUAL_OR_NEWER_THAN(4, 23)
		bIsDeprecated = CustomEventNode->bIsDeprecated;
		BlueprintAssetParsingHelpers::GetBlueprintAssetDeprecationMessage(CustomEventNode->DeprecationMessage, DeprecationMessage);
#endif
	}
	else if (Type == EBlueprintAssetEventType::AnimNotifyAddedViaPersona)
	{
		/* Maybe set PathOfClassThisWasIntroducedBy to the USkeleton.
		Maybe not? Everything else (RPCType, bCallInEditor, etc) will
		be falsy since anim notifies cannot have any of that stuff so
		as long as falsy is the default values of the ctor we are good.
		If not then you might want to set them to false here in this block */
	}
	else
	{
		check(InNode->GetClass() != UK2Node_CustomEvent::StaticClass());
		/* The node will NOT be of the type UK2Node_CustomEvent so we
		cannot extract all the data we want I think. Might have to
		gather it later during PostProcessData. Name and InputPins
		is pretty much all I have gathered so far I think */
		PathOfClassThisWasIntroducedBy = UFunc->GetOuterUClass()->GetPathName();
	}
}


FString BlueprintAssetEvent::ToString() const
{
	FString S;

	S += TEXT("Name: ") + Name;
	S += TEXT(", ");
	S += TEXT("Type: ") + DocDebugHelpers::EnumValueToString(Type);
	S += TEXT(", ");
	S += TEXT("PathOfClassThisWasIntroducedBy: ") + PathOfClassThisWasIntroducedBy;
	S += TEXT(", ");
	S += TEXT("RPCType: ") + DocDebugHelpers::EnumValueToString(RPCType);
	S += TEXT(", ");
	S += TEXT("bIsRPCReliable: ") + (bIsRPCReliable ? FString("true") : FString("false"));
	S += TEXT(", ");
	S += TEXT("bCallInEditor: ") + (bCallInEditor ? FString("true") : FString("false"));
#if ENGINE_VERSION_EQUAL_OR_NEWER_THAN(4, 23)
	S += TEXT(", ");
	S += TEXT("bIsDeprecated: ") + (bIsDeprecated ? FString("true") : FString("false"));
	S += TEXT(", ");
	S += TEXT("DeprecationMessage: ") + DeprecationMessage;
#endif
	if (InputPins.Num() > 0)
	{
		S += TEXT(", inputs: ");
		for (const auto& Pin : InputPins)
		{
			S += Pin.ToString() + TEXT(", ");
		}
		S = S.LeftChop(2);
	}

	return S;
}


BlueprintAssetEventGraph::BlueprintAssetEventGraph(FDocThread* Thread, const UBlueprint* Blueprint, bool bIsBlueprintAnimBlueprint, const UEdGraph* InEventGraph)
	: Name(BlueprintAssetParsingHelpers::CreateBlueprintAssetEventGraphName(InEventGraph->GetName()))
{
	for (const auto& Node : InEventGraph->Nodes)
	{
		/* All sorts of nodes could be on the graph. Look for nodes
		signalling the start of an event */
		UK2Node_Event* EventNode = Cast<UK2Node_Event>(Node);
		if (EventNode != nullptr)
		{
			/* Ignore the node if it is an auto-generated node with
			no nodes attached to it OR it is auto-generated with only
			the parent's implementation attached to it
			e.g. 3 examples of these are the
			EventBegingPlay, EventActorOverlap and EventTick auto-generated
			nodes that get made with every actor blueprint.
			This is pretty much optional though. I'm just trying to
			ignore events which have no impact. */
			if (EventNode->IsAutomaticallyPlacedGhostNode() == false)
			{
				EInvalidDataReason_BlueprintAssetEvent IncompleteDataReason = EInvalidDataReason_BlueprintAssetEvent::None;
				Events.Emplace(BlueprintAssetEvent(Blueprint, bIsBlueprintAnimBlueprint, EventNode, IncompleteDataReason));

				/* Check if we can only partially gather data on the event
				(not everything). If yes then I will choose to not bother gathering
				anything at all on it.
				Usually if any of these if/elseif statements evaluate true
				then it means there are warnings/errors on your event node.
				You should open up the editor and fix them */
				if (IncompleteDataReason == EInvalidDataReason_BlueprintAssetEvent::InputPinsSubCategoryObjectNull)
				{
					Thread->NoteDownBlueprintAssetEventOnlyPartiallyParsableDueToInputPinsSubCategoryObjectNull(Blueprint->GetName(), Events.Last().Name, Events.Last().InputPins.Last().Name);

					// Remove the element we just added
					Events.RemoveAt(Events.Num() - 1, 1, false);
				}
				else if (IncompleteDataReason == EInvalidDataReason_BlueprintAssetEvent::UFunctionNull)
				{
					Thread->NoteDownBlueprintAssetEventOnlyPartiallyParsableDueToEventsUFunctionNull(Blueprint->GetName(), Events.Last().Name);

					// Remove the element we just added
					Events.RemoveAt(Events.Num() - 1, 1, false);
				}
			}
		}
	}
}

FString BlueprintAssetEventGraph::ToString() const
{
	FString S;

	S += TEXT("Name: ") + Name;
	if (Events.Num() > 0)
	{
		S += TEXT("\n");
		S += TEXT("events: \n");
		for (const auto& Event : Events)
		{
			S += TEXT("\t") + Event.ToString() + TEXT("\n");
		}
		S = S.LeftChop(1);
	}

	return S;
}


BlueprintAssetAnimationGraphInputInputInfo::BlueprintAssetAnimationGraphInputInputInfo(const FAnimBlueprintFunctionPinInfo& InInput)
	: Name(BlueprintAssetParsingHelpers::CreateBlueprintAssetAnimGraphInputInputName(InInput.Name.ToString()))
	, Type(InInput.Type.PinCategory.ToString())
	, ContainerType(InInput.Type.ContainerType)
{
	if (InInput.Type.PinSubCategoryObject != nullptr)
	{
		SubType = InInput.Type.PinSubCategoryObject->GetName();
	}
}

FString BlueprintAssetAnimationGraphInputInputInfo::ToString() const
{
	FString S;

	S += TEXT("Name: ") + Name;
	S += TEXT(", ");
	S += TEXT("Type: ") + Type;
	S += TEXT(", ");
	S += TEXT("SubType: ") + SubType;
	S += TEXT(", ");
	S += TEXT("ContainerType: ") + DocDebugHelpers::EnumValueToString(ContainerType);

	return S;
}


BlueprintAssetAnimationGraphInputInfo::BlueprintAssetAnimationGraphInputInfo(const AnimGraphNodeInputType* InInputNode)
	: Name(BlueprintAssetParsingHelpers::CreateBlueprintAssetAnimGraphInputName(InInputNode->Node.Name.ToString()))
{
	Inputs.Reserve(InInputNode->Inputs.Num());
	for (const auto& Elem : InInputNode->Inputs)
	{
		Inputs.Emplace(BlueprintAssetAnimationGraphInputInputInfo(Elem));
	}
}

FString BlueprintAssetAnimationGraphInputInfo::ToString() const
{
	FString S;

	S += TEXT("Name: ") + Name;
	if (Inputs.Num() > 0)
	{
		S += TEXT(", inputs: ");
		for (const auto& Input : Inputs)
		{
			S += Input.ToString() + TEXT(", ");
		}
		S = S.LeftChop(2);
	}

	return S;
}


BlueprintAssetAnimationGraphInfo::BlueprintAssetAnimationGraphInfo(const UEdGraph* InFunction)
	: Name(BlueprintAssetParsingHelpers::CreateBlueprintAssetAnimGraphName(InFunction->GetName()))
{
	/* This is the fastest way I know how to do inputs */

	TArray<AnimGraphNodeInputType*> LinkedInputPoseInputs;
	InFunction->GetNodesOfClass<AnimGraphNodeInputType>(LinkedInputPoseInputs);

	Inputs.Reserve(LinkedInputPoseInputs.Num());
	for (const auto& InputNode : LinkedInputPoseInputs)
	{
		Inputs.Emplace(BlueprintAssetAnimationGraphInputInfo(InputNode));
	}
}

FString BlueprintAssetAnimationGraphInfo::ToString() const
{
	FString S;

	S += TEXT("Name: ") + Name;
	if (Inputs.Num() > 0)
	{
		S += TEXT(", inputs: ");
		for (const auto& Input : Inputs)
		{
			S += Input.ToString() + TEXT(", ");
		}
		S = S.LeftChop(2);
	}

	return S;
}


BlueprintAssetAnimationLayerInputInputInfo::BlueprintAssetAnimationLayerInputInputInfo(const FAnimBlueprintFunctionPinInfo& InInput)
	: Name(InInput.Name.ToString())
	, Type(InInput.Type.PinCategory.ToString())
	, ContainerType(InInput.Type.ContainerType)
{
	if (InInput.Type.PinSubCategoryObject != nullptr)
	{
		SubType = InInput.Type.PinSubCategoryObject->GetName();
	}
}

FString BlueprintAssetAnimationLayerInputInputInfo::ToString() const
{
	FString S;

	S += TEXT("Name: ") + Name;
	S += TEXT(", ");
	S += TEXT("Type: ") + Type;
	S += TEXT(", ");
	S += TEXT("SubType: ") + SubType;
	S += TEXT(", ");
	S += TEXT("ContainerType: ") + DocDebugHelpers::EnumValueToString(ContainerType);

	return S;
}


BlueprintAssetAnimationLayerInputInfo::BlueprintAssetAnimationLayerInputInfo(const AnimGraphNodeInputType* InInputNode)
	: Name(BlueprintAssetParsingHelpers::CreateBlueprintAssetAnimLayerInputName(InInputNode->Node.Name.ToString()))
{
	Inputs.Reserve(InInputNode->Inputs.Num());
	for (const auto& Elem : InInputNode->Inputs)
	{
		Inputs.Emplace(BlueprintAssetAnimationLayerInputInputInfo(Elem));
	}
}

FString BlueprintAssetAnimationLayerInputInfo::ToString() const
{
	FString S;

	S += TEXT("Name: ") + Name;
	if (Inputs.Num() > 0)
	{
		S += TEXT(", inputs: ");
		for (const auto& Input : Inputs)
		{
			S += Input.ToString() + TEXT(", ");
		}
		S = S.LeftChop(2);
	}

	return S;
}


BlueprintAssetAnimationLayerInfo::BlueprintAssetAnimationLayerInfo(const UAnimBlueprint* AnimBlueprint, const UEdGraph* InFunction)
	: Name(BlueprintAssetParsingHelpers::CreateBlueprintAssetAnimLayerName(InFunction->GetName()))
{
	UFunction* UFunc = FindField<UFunction>(AnimBlueprint->GeneratedClass, InFunction->GetFName());
	Group = UFunc->GetMetaData(FBlueprintMetadata::MD_FunctionCategory);
	/* Alternative way of calculating Group */
	//Group = CastChecked<UAnimGraphNode_Root>(InFunction->Nodes[0])->Node.Group.ToString();

	/* This is the fastest way I know how to do inputs */

	TArray<AnimGraphNodeInputType*> LinkedInputPoseInputs;
	InFunction->GetNodesOfClass<AnimGraphNodeInputType>(LinkedInputPoseInputs);

	Inputs.Reserve(LinkedInputPoseInputs.Num());
	for (const auto& InputNode : LinkedInputPoseInputs)
	{
		Inputs.Emplace(BlueprintAssetAnimationLayerInputInfo(InputNode));
	}
}

FString BlueprintAssetAnimationLayerInfo::ToString() const
{
	FString S;

	S += TEXT("Name: ") + Name;
	S += TEXT(", ");
	S += TEXT("Group: ") + Group;
	if (Inputs.Num() > 0)
	{
		S += TEXT(", inputs: ");
		for (const auto& Input : Inputs)
		{
			S += Input.ToString() + TEXT(", ");
		}
		S = S.LeftChop(2);
	}

	return S;
}


BlueprintAssetFunctionInputPin::BlueprintAssetFunctionInputPin(const UEdGraphPin* InPin, EInvalidDataReason_BlueprintAssetFunction& OutIncompleteDataReason)
	: Name(BlueprintAssetParsingHelpers::CreateBlueprintAssetFunctionInputName(InPin->GetName()))
	, Type(InPin->PinType.PinCategory.ToString())
	, bIsPassByReference(InPin->PinType.bIsReference)
	, ContainerType(InPin->PinType.ContainerType)
{
	if (BAU::AreEqual(Type, TEXT("object"))
		|| BAU::AreEqual(Type, TEXT("class"))
		|| BAU::AreEqual(Type, TEXT("interface"))
		|| BAU::AreEqual(Type, TEXT("softclass"))
		|| BAU::AreEqual(Type, TEXT("softobject")))
	{
		if (InPin->PinType.PinSubCategoryObject.IsValid())
		{
			SubType = InPin->PinType.PinSubCategoryObject->GetName();
		}
		else
		{
			OutIncompleteDataReason = EInvalidDataReason_BlueprintAssetFunction::InputPinSubCategoryObjectNull;
			return;
		}
	}
	else if (BAU::AreEqual(Type, TEXT("struct")))
	{
		if (InPin->PinType.PinSubCategoryObject == GetFallbackStruct())
		{
			OutIncompleteDataReason = EInvalidDataReason_BlueprintAssetFunction::InputPinSubCategoryObjectIsFallbackStruct;
			return;
		}
		else if (InPin->PinType.PinSubCategoryObject.IsValid())
		{
			SubType = InPin->PinType.PinSubCategoryObject->GetName();
		}
		else
		{
			/* A case where I got here: deleted user defined struct BP
			that was a param for an interface even though in editor it shows
			"Fallback Struct" (sometimes I hit the == GetFallbackStruct()
			case though, not sure why) */
			OutIncompleteDataReason = EInvalidDataReason_BlueprintAssetFunction::InputPinSubCategoryObjectNull;
			return;
		}
	}

	if (BAU::AreEqual(Type, TEXT("text")))
	{
		DefaultTextValue = InPin->DefaultTextValue;
		// Do this as well I guess
		DefaultValue = InPin->DefaultTextValue.ToString();
	}
	else
	{
		DefaultValue = InPin->DefaultValue;
	}
}

FString BlueprintAssetFunctionInputPin::ToString() const
{
	FString S;

	S += TEXT("Name: ") + Name;
	S += TEXT(", ");
	S += TEXT("Type: ") + Type;
	S += TEXT(", ");
	S += TEXT("SubType: ") + SubType;
	S += TEXT(", ");
	S += TEXT("DefaultValue: ") + DefaultValue;
	S += TEXT(", ");
	S += TEXT("bIsPassByReference: ") + (bIsPassByReference ? FString("true") : FString("false"));
	S += TEXT(", ");
	S += TEXT("ContainerType: ") + DocDebugHelpers::EnumValueToString(ContainerType);

	return S;
}


BlueprintAssetFunctionReturnNodePin::BlueprintAssetFunctionReturnNodePin(const UEdGraphPin* InPin, EInvalidDataReason_BlueprintAssetFunction& OutIncompleteDataReason)
	: Name(BlueprintAssetParsingHelpers::CreateBlueprintAssetFunctionOutputName(InPin->GetName()))
	, Type(InPin->PinType.PinCategory.ToString())
	, ContainerType(InPin->PinType.ContainerType)
{
	if (BAU::AreEqual(Type, TEXT("object"))
		|| BAU::AreEqual(Type, TEXT("class"))
		|| BAU::AreEqual(Type, TEXT("interface"))
		|| BAU::AreEqual(Type, TEXT("softclass"))
		|| BAU::AreEqual(Type, TEXT("softobject")))
	{
		if (InPin->PinType.PinSubCategoryObject.IsValid())
		{
			SubType = InPin->PinType.PinSubCategoryObject->GetName();
		}
		else
		{
			OutIncompleteDataReason = EInvalidDataReason_BlueprintAssetFunction::ReturnNodePinSubCategoryObjectNull;
			return;
		}
	}
	else if (BAU::AreEqual(Type, TEXT("struct")))
	{
		if (InPin->PinType.PinSubCategoryObject == GetFallbackStruct())
		{
			OutIncompleteDataReason = EInvalidDataReason_BlueprintAssetFunction::ReturnNodePinSubCategoryObjectIsFallbackStruct;
			return;
		}
		else if (InPin->PinType.PinSubCategoryObject.IsValid())
		{
			SubType = InPin->PinType.PinSubCategoryObject->GetName();
		}
		else
		{
			/* A case where I got here: deleted user defined struct BP
			that was a param for an interface even though in editor it shows
			"Fallback Struct" (sometimes I hit the == GetFallbackStruct()
			case though, not sure why) */
			OutIncompleteDataReason = EInvalidDataReason_BlueprintAssetFunction::ReturnNodePinSubCategoryObjectNull;
			return;
		}
	}
}

FString BlueprintAssetFunctionReturnNodePin::ToString() const
{
	FString S;

	S += TEXT("Name: ") + Name;
	S += TEXT(", ");
	S += TEXT("Type: ") + Type;
	S += TEXT(", ");
	S += TEXT("SubType: ") + SubType;
	S += TEXT(", ");
	S += TEXT("ContainerType: ") + DocDebugHelpers::EnumValueToString(ContainerType);

	return S;
}


BlueprintAssetFunction::BlueprintAssetFunction(const UBlueprint* Blueprint, const UEdGraph* InFunctionGraph, EInvalidDataReason_BlueprintAssetFunction& OutIncompleteDataReason)
	: Name(BlueprintAssetParsingHelpers::CreateBlueprintAssetFunctionName(InFunctionGraph->GetName()))
{
	/* Start this out as None. We'll change it if we encounter any
	problems along the way */
	OutIncompleteDataReason = EInvalidDataReason_BlueprintAssetFunction::None;

	const UK2Node_FunctionEntry* EntryNode = CastChecked<UK2Node_FunctionEntry>(InFunctionGraph->Nodes[0]);
	const int32 FunctionFlags = EntryNode->GetFunctionFlags();

	BlueprintAssetParsingHelpers::GetBlueprintAssetDescription(EntryNode->MetaData.ToolTip, Description);
	Category = EntryNode->MetaData.Category.ToString();

	//-------------------------------------------------------------
	//	PathOfClassThisWasIntroducedBy

	/* Micro optimization but you call this ctor during iteration
	of Blueprint->ImplementedInterfaces's elem's Graphs. You
	could create another ctor that does all the same as this one
	except it takes an extra param called like InPathOfClassThisWasIntroducedBy.
	The value of that param would be the elem's GetPathName() */
	UFunction* UFunc = EntryNode->FindSignatureFunction();
	PathOfClassThisWasIntroducedBy = UFunc->GetOuterUClass()->GetPathName();

	//-------------------------------------------------------------
	//	AccessSpecifier

	if ((FunctionFlags & FUNC_Public) != 0)
	{
		AccessSpecifier = EAccessSpecifier::Public;
	}
	else if ((FunctionFlags & FUNC_Protected) != 0)
	{
		AccessSpecifier = EAccessSpecifier::Protected;
	}
	else
	{
		/* This asset will trigger for the auto-generated OnRep functions
		the engine creates so I have commented it. */
		//UE_CLOG((FunctionFlags & FUNC_Private) == 0, DOCLOG, Fatal, 
		//	TEXT("Expected private flag. Function: %s"), *Name);
		AccessSpecifier = EAccessSpecifier::Private;
	}

	//-------------------------------------------------------------
	//	bIsStatic, bIsPure, bCanCallInEditor, bIsConst, bIsDeprecated, DeprecationMessage

	bIsStatic = ((FunctionFlags & FUNC_Static) != 0);
	bIsPure = ((FunctionFlags & FUNC_BlueprintPure) != 0);
	bCallInEditor = EntryNode->MetaData.bCallInEditor;
	bIsConst = ((FunctionFlags & FUNC_Const) != 0);
	bIsDeprecated = EntryNode->MetaData.bIsDeprecated;
	BlueprintAssetParsingHelpers::GetBlueprintAssetDeprecationMessage(EntryNode->MetaData.DeprecationMessage, DeprecationMessage);

	//-------------------------------------------------------------
	//	Inputs

	InputPins.Reserve(EntryNode->Pins.Num());
	for (int32 i = 0; i < EntryNode->Pins.Num(); ++i)
	{
		const UEdGraphPin* Pin = EntryNode->Pins[i];
		InputPins.Emplace(BlueprintAssetFunctionInputPin(Pin, OutIncompleteDataReason));
		if (OutIncompleteDataReason != EInvalidDataReason_BlueprintAssetFunction::None)
		{
			/* @todo: for performance, since this function info gets
			thrown away if all data cannot be gathered on it you might
			want to do Inputs and Outputs as the first things in this
			function */
			return;
		}
	}

	//-------------------------------------------------------------
	//	Outputs

	/* Loop to find a return node */
	for (const auto& Node : InFunctionGraph->Nodes)
	{
		/* Check if it's a return node. Similar to ExactCast minus
		the null check for performance */
		const UK2Node_FunctionResult* ReturnNode = (Node->GetClass() == UK2Node_FunctionResult::StaticClass()) ? static_cast<UK2Node_FunctionResult*>(Node) : nullptr;
		if (ReturnNode != nullptr)
		{
			ReturnNodePins.Reserve(ReturnNode->Pins.Num());
			for (const auto& Pin : ReturnNode->Pins)
			{
				ReturnNodePins.Emplace(BlueprintAssetFunctionReturnNodePin(Pin, OutIncompleteDataReason));
				if (OutIncompleteDataReason != EInvalidDataReason_BlueprintAssetFunction::None)
				{
					return;
				}
			}
			break;
		}
	}
}

FString BlueprintAssetFunction::ToString() const
{
	FString S;

	S += TEXT("Name: ") + Name;
	S += TEXT(", ");
	S += TEXT("Description: ") + Description.Text.ToString();
	S += TEXT(", ");
	S += TEXT("Category: ") + Category;
	S += TEXT(", ");
	S += TEXT("PathOfClassThisWasIntroducedBy: ") + PathOfClassThisWasIntroducedBy;
	S += TEXT(", ");
	S += TEXT("bIsStatic: ") + (bIsStatic ? FString("true") : FString("false"));
	S += TEXT(", ");
	S += TEXT("bIsPure: ") + (bIsPure ? FString("true") : FString("false"));
	S += TEXT(", ");
	S += TEXT("bCallInEditor: ") + (bCallInEditor ? FString("true") : FString("false"));
	S += TEXT(", ");
	S += TEXT("bIsConst: ") + (bIsConst ? FString("true") : FString("false"));
	S += TEXT(", ");
	S += TEXT("bIsDeprecated: ") + (bIsDeprecated ? FString("true") : FString("false"));
	S += TEXT(", ");
	S += TEXT("DeprecationMessage: ") + DeprecationMessage;
	S += TEXT(", ");
	S += TEXT("AccessSpecifier: ");
	if (AccessSpecifier == EAccessSpecifier::Public)
	{
		S += TEXT("Public");
	}
	else if (AccessSpecifier == EAccessSpecifier::Protected)
	{
		S += TEXT("Protected");
	}
	else
	{
		S += TEXT("Private");
	}
	if (InputPins.Num() > 0)
	{
		S += TEXT(", inputs: ");
		for (const auto& Elem : InputPins)
		{
			S += Elem.ToString() + TEXT(", ");
		}
		S = S.LeftChop(2);
	}
	if (ReturnNodePins.Num() > 0)
	{
		S += TEXT(", return value node pins: ");
		for (const auto& Elem : ReturnNodePins)
		{
			S += Elem.ToString() + TEXT(", ");
		}
		S = S.LeftChop(2);
	}

	return S;
}


BlueprintAssetMacroInputPin::BlueprintAssetMacroInputPin(const UEdGraphPin* InPin, EInvalidDataReason_BlueprintAssetMacro& OutIncompleteDataReason)
	: Name(BlueprintAssetParsingHelpers::CreateBlueprintAssetMacroInputPinName(InPin->GetName()))
	, Type(InPin->PinType.PinCategory.ToString())
	, bIsPassByReference(InPin->PinType.bIsReference)
	, ContainerType(InPin->PinType.ContainerType)
{
	if (BAU::AreEqual(Type, TEXT("object"))
		|| BAU::AreEqual(Type, TEXT("class"))
		|| BAU::AreEqual(Type, TEXT("interface"))
		|| BAU::AreEqual(Type, TEXT("softclass"))
		|| BAU::AreEqual(Type, TEXT("softobject")))
	{
		if (InPin->PinType.PinSubCategoryObject.IsValid())
		{
			SubType = InPin->PinType.PinSubCategoryObject->GetName();
		}
		else
		{
			OutIncompleteDataReason = EInvalidDataReason_BlueprintAssetMacro::InputPinSubCategoryObjectNull;
			return;
		}
	}
	else if (BAU::AreEqual(Type, TEXT("struct")))
	{
		if (InPin->PinType.PinSubCategoryObject == GetFallbackStruct())
		{
			OutIncompleteDataReason = EInvalidDataReason_BlueprintAssetMacro::InputPinSubCategoryObjectIsFallbackStruct;
			return;
		}
		// Might need a IsValid check here too just like I did for functions
		else
		{
			SubType = InPin->PinType.PinSubCategoryObject->GetName();
		}
	}

	if (BAU::AreEqual(Type, TEXT("text")))
	{
		DefaultTextValue = InPin->DefaultTextValue;
		// Do this as well I guess
		DefaultValue = InPin->DefaultTextValue.ToString();
	}
	else
	{
		DefaultValue = InPin->DefaultValue;
	}
}

FString BlueprintAssetMacroInputPin::ToString() const
{
	FString S;

	S += TEXT("Name: ") + Name;
	S += TEXT(", ");
	S += TEXT("Type: ") + Type;
	S += TEXT(", ");
	S += TEXT("SubType: ") + SubType;
	S += TEXT(", ");
	S += TEXT("DefaultValue: ") + DefaultValue;
	S += TEXT(", ");
	S += TEXT("bIsPassByReference: ") + (bIsPassByReference ? FString("true") : FString("false"));
	S += TEXT(", ");
	S += TEXT("ContainerType: ") + DocDebugHelpers::EnumValueToString(ContainerType);

	return S;
}


BlueprintAssetMacroOutputPin::BlueprintAssetMacroOutputPin(const UEdGraphPin* InPin, EInvalidDataReason_BlueprintAssetMacro& OutIncompleteDataReason)
	: Name(BlueprintAssetParsingHelpers::CreateBlueprintAssetMacroOutputPinName(InPin->GetName()))
	, Type(InPin->PinType.PinCategory.ToString())
	, ContainerType(InPin->PinType.ContainerType)
{
	if (BAU::AreEqual(Type, TEXT("object"))
		|| BAU::AreEqual(Type, TEXT("class"))
		|| BAU::AreEqual(Type, TEXT("interface"))
		|| BAU::AreEqual(Type, TEXT("softclass"))
		|| BAU::AreEqual(Type, TEXT("softobject")))
	{
		if (InPin->PinType.PinSubCategoryObject.IsValid())
		{
			SubType = InPin->PinType.PinSubCategoryObject->GetName();
		}
		else
		{
			OutIncompleteDataReason = EInvalidDataReason_BlueprintAssetMacro::OutputPinSubCategoryObjectNull;
			return;
		}
	}
	else if (BAU::AreEqual(Type, TEXT("struct")))
	{
		if (InPin->PinType.PinSubCategoryObject == GetFallbackStruct())
		{
			OutIncompleteDataReason = EInvalidDataReason_BlueprintAssetMacro::OutputPinSubCategoryObjectIsFallbackStruct;
			return;
		}
		// Might need to IsValid check here too just like you did with functions
		else
		{
			SubType = InPin->PinType.PinSubCategoryObject->GetName();
		}
	}
}


FString BlueprintAssetMacroOutputPin::ToString() const
{
	FString S;

	S += TEXT("Name: ") + Name;
	S += TEXT(", ");
	S += TEXT("Type: ") + Type;
	S += TEXT(", ");
	S += TEXT("SubType: ") + SubType;
	S += TEXT(", ");
	S += TEXT("ContainerType: ") + DocDebugHelpers::EnumValueToString(ContainerType);

	return S;
}


BlueprintAssetMacro::BlueprintAssetMacro(const UBlueprint* Blueprint, const UEdGraph* InMacroGraph, EInvalidDataReason_BlueprintAssetMacro& OutIncompleteDataReason)
	: Name(BlueprintAssetParsingHelpers::CreateBlueprintAssetMacroName(InMacroGraph->GetName()))
{
	/* We'll start this out as none and change it if we encounter any
	problems along the way */
	OutIncompleteDataReason = EInvalidDataReason_BlueprintAssetMacro::None;

	const UK2Node_Tunnel* EntryNode = CastChecked<UK2Node_Tunnel>(InMacroGraph->Nodes[0]);

	BlueprintAssetParsingHelpers::GetBlueprintAssetDescription(EntryNode->MetaData.ToolTip, Description);
	Category = EntryNode->MetaData.Category.ToString();

	bCallInEditor = EntryNode->MetaData.bCallInEditor;

	Inputs.Reserve(EntryNode->Pins.Num());
	for (const auto& Pin : EntryNode->Pins)
	{
		Inputs.Emplace(BlueprintAssetMacroInputPin(Pin, OutIncompleteDataReason));
		if (OutIncompleteDataReason != EInvalidDataReason_BlueprintAssetMacro::None)
		{
			return;
		}
	}

	/* I believe the output node is the second node in the graph */
	const UEdGraphNode* OutputNode = InMacroGraph->Nodes[1];
	Outputs.Reserve(OutputNode->Pins.Num());
	for (const auto& Pin : OutputNode->Pins)
	{
		Outputs.Emplace(BlueprintAssetMacroOutputPin(Pin, OutIncompleteDataReason));
		if (OutIncompleteDataReason != EInvalidDataReason_BlueprintAssetMacro::None)
		{
			return;
		}
	}
}

FString BlueprintAssetMacro::ToString() const
{
	FString S;

	S += TEXT("Name: ") + Name;
	S += TEXT(", ");
	S += TEXT("Description: ") + Description.Text.ToString();
	S += TEXT(", ");
	S += TEXT("Category: ") + Category;
	S += TEXT(", ");
	S += TEXT("bCallInEditor: ") + (bCallInEditor ? FString("true") : FString("false"));
	if (Inputs.Num() > 0)
	{
		S += TEXT(", inputs: ");
		for (const auto& Elem : Inputs)
		{
			S += Elem.ToString() + TEXT(", ");
		}
		S = S.LeftChop(2);
	}
	if (Outputs.Num() > 0)
	{
		S += TEXT(", outputs: ");
		for (const auto& Elem : Outputs)
		{
			S += Elem.ToString() + TEXT(", ");
		}
		S = S.LeftChop(2);
	}

	return S;
}


BlueprintAssetVariable::BlueprintAssetVariable(const UBlueprint* Blueprint, UBlueprintGeneratedClass* BPGC, const FBPVariableDescription& InVariable)
	: Name(BlueprintAssetParsingHelpers::CreateBlueprintAssetVariableName(InVariable.VarName.ToString()))
	, Category(InVariable.Category.ToString())
	, Type(InVariable.VarType.PinCategory.ToString())
	, ContainerType(InVariable.VarType.ContainerType)
	, ReplicationCondition(InVariable.ReplicationCondition)
	, bInstanceEditable((InVariable.PropertyFlags& CPF_DisableEditOnInstance) == 0)
	, bBlueprintReadOnly((InVariable.PropertyFlags& CPF_BlueprintReadOnly) != 0)
	, bExposeToCinematics((InVariable.PropertyFlags& CPF_Interp) != 0)
	, bConfigVariable((InVariable.PropertyFlags& CPF_Config) != 0)
	, bTransient((InVariable.PropertyFlags& CPF_Transient) != 0)
	, bSaveGame((InVariable.PropertyFlags& CPF_SaveGame) != 0)
	, bAdvancedDisplay((InVariable.PropertyFlags& CPF_AdvancedDisplay) != 0)
	, bDeprecated((InVariable.PropertyFlags& CPF_Deprecated) != 0)
{
	if (InVariable.HasMetaData(FBlueprintMetadata::MD_Tooltip))
	{
		BlueprintAssetParsingHelpers::GetBlueprintAssetDescription_NoShiftEnterToAddNewLineFunctionality(InVariable.GetMetaData(FBlueprintMetadata::MD_Tooltip), Tooltip);
	}

	if (BAU::AreEqual(Type, TEXT("object"))
		|| BAU::AreEqual(Type, TEXT("class"))
		|| BAU::AreEqual(Type, TEXT("softclass"))
		|| BAU::AreEqual(Type, TEXT("softobject")))
	{
		if (InVariable.VarType.PinSubCategoryObject.IsValid())
		{
			SubType = InVariable.VarType.PinSubCategoryObject->GetName();
		}
		else
		{
			SubType = TEXT("Object");
			/* Why did I choose "Object"?
			Answer: from my small amount of testing if the variable was
			for a blueprint class that you delete using "Force Delete"
			(and maybe other delete methods too) then the type gets
			replaced as Object in editor and it seems to work perfectly
			fine. But yeah, behind the scenes PinSubCategoryObject is null still.
			Note: this is similar to the case for BP asset event inputs -
			they also have the type get replaced with Object/Interface/Fallback.Struct.
			However, they get compile errors and don't function if called.

			Note: if PinSubCategoryObject can be null at times that the
			variable doesn't function (e.g. cannot get/set it, whatever, etc)
			(and therefore there might be warnings/errors on it too) then
			I would need to try and distinguish between that case and
			the case I described above (where PinSubCategoryObject is
			null yet the variable functions just fine) here. If I cannot
			find a way to do that then it would be best to treat anytime
			we reach here as worst case (i.e. variable doesn't function
			correctly) and would probably want to set some out param
			with an error code and return */
		}
	}
	else if (BAU::AreEqual(Type, TEXT("struct")))
	{
		/* No need to null check PinSubCategoryObject here - from my
		experience PinSubCategoryObject is always valid */
		SubType = InVariable.VarType.PinSubCategoryObject->GetName();
	}
	else if (BAU::AreEqual(Type, TEXT("interface")))
	{
		if (InVariable.VarType.PinSubCategoryObject.IsValid())
		{
			SubType = InVariable.VarType.PinSubCategoryObject->GetName();
		}
		else
		{
			Type = TEXT("object");
			SubType = TEXT("Object");
			/* Why did I do this? If you delete your interface asset then
			the engine will change the variable type to "Object". It
			functions as a regular Object Reference, so essentially the
			engine changed your interface reference to an Object Reference,
			but InVariable.VarType.PinCategory (which I assign to Type in ctor
			initializer list) stays as "interface". Since it behaves exactly as
			an Object Reference I change it to one by setting Type to "object" */
		}
	}

	if ((InVariable.PropertyFlags & CPF_Net) != 0)
	{
		if ((InVariable.PropertyFlags & CPF_RepNotify) != 0)
		{
			/* In editor if you delete the OnRep function then the variable's
			Replication changes to 'Replicated' (which seems sensible). However the CPF_RepNotify
			flag stays there. So I do an extra check to see if the OnRep
			function exists. I'm assuming that the CPF_RepNotify remaining
			there was a bug simply cause the UI shows only 'Replicated'
			(or maybe it isn't a bug - maybe when you go to package
			your game it gives you an error saying "no OnRep function
			exists") */
			UFunction* OnRepFunc = BPGC->FindFunctionByName(InVariable.RepNotifyFunc, EIncludeSuperFlag::ExcludeSuper);
			// These are the same checks as used in FBlueprintVarActionDetails::GetVariableReplicationType()
			if (OnRepFunc != nullptr
				&& OnRepFunc->NumParms == 0
				&& OnRepFunc->GetReturnProperty() == nullptr)
			{
				Replication = EBlueprintVariableReplicationType::RepNotify;
			}
			else
			{
				Replication = EBlueprintVariableReplicationType::Replicated;
			}
		}
		else
		{
			Replication = EBlueprintVariableReplicationType::Replicated;
		}
	}
	else
	{
		Replication = EBlueprintVariableReplicationType::None;
	}

	if (InVariable.HasMetaData(FBlueprintMetadata::MD_ExposeOnSpawn))
	{
		if (InVariable.GetMetaData(FBlueprintMetadata::MD_ExposeOnSpawn).Compare(TEXT("true")) == 0)
		{
			bExposeOnSpawn = true;
		}
		else
		{
			/* Assuming only "true" or "false" would be stored for it */
			check(InVariable.GetMetaData(FBlueprintMetadata::MD_ExposeOnSpawn).Compare(TEXT("false")) == 0);
			bExposeOnSpawn = false;
		}
	}
	else
	{
		bExposeOnSpawn = false;
	}

	if (InVariable.HasMetaData(FBlueprintMetadata::MD_Private))
	{
		if (InVariable.GetMetaData(FBlueprintMetadata::MD_Private).Compare(TEXT("true")) == 0)
		{
			bPrivate = true;
		}
		else
		{
			/* Assuming only "true" or "false" would be stored for it */
			check(InVariable.GetMetaData(FBlueprintMetadata::MD_Private).Compare(TEXT("false")) == 0);
			bPrivate = false;
		}
	}
	else
	{
		bPrivate = false;
	}

	static const FName MultilineKey(TEXT("MultiLine"));
	if (InVariable.HasMetaData(MultilineKey))
	{
		if (InVariable.GetMetaData(MultilineKey).Compare(TEXT("true")) == 0)
		{
			bMultiline = true;
		}
		else
		{
			/* Assuming only "true" or "false" would be stored for it */
			check(InVariable.GetMetaData(MultilineKey).Compare(TEXT("false")) == 0);
			bMultiline = false;
		}
	}
	else
	{
		bMultiline = false;
	}

	if (InVariable.HasMetaData(FBlueprintMetadata::MD_DeprecationMessage))
	{
		BlueprintAssetParsingHelpers::GetBlueprintAssetDeprecationMessage(InVariable.GetMetaData(FBlueprintMetadata::MD_DeprecationMessage), DeprecationMessage);
	}

	// DefaultValue / DefaultValueAsJson
	UProperty* Prop = Blueprint->GeneratedClass->FindPropertyByName(InVariable.VarName);
	UObject* CDO = Blueprint->GeneratedClass->GetDefaultObject();
	check(Prop != nullptr);
	if (ContainerType == EPinContainerType::None)
	{
		if (BAU::AreEqual(Type, TEXT("int")))
		{
			DefaultValue = FString::FromInt(*Prop->ContainerPtrToValuePtr<int32>(CDO));
		}
		else if (BAU::AreEqual(Type, TEXT("float")))
		{
			DefaultValue = FString::SanitizeFloat(*Prop->ContainerPtrToValuePtr<float>(CDO));
		}
		else if (BAU::AreEqual(Type, TEXT("bool")))
		{
			// todo this does not work. Casting Prop to a UBoolProperty 
			// and calling UBoolProperty::GetPropertyValue doesn't 
			// work either
			const bool BoolDefaultValue = *Prop->ContainerPtrToValuePtr<bool>(CDO);
			DefaultValue = (BoolDefaultValue == true) ? TEXT("true") : TEXT("false");
		}
		else if (BAU::AreEqual(Type, TEXT("struct")))
		{
			/* Store it as json I guess. */
			DefaultValueAsJson = FJsonObjectConverter::UPropertyToJsonValue(Prop, Prop->ContainerPtrToValuePtr<void>(CDO), 0, 0);
		}
		else if (BAU::AreEqual(Type, TEXT("object")))
		{
			UObject* Obj = *Prop->ContainerPtrToValuePtr<UObject*>(CDO);
			if (Obj != nullptr)
			{
				DefaultValue = Obj->GetPathName();
			}
		}
		else if (BAU::AreEqual(Type, TEXT("byte")))
		{
			/* Check if it is an enum property, or just a regular byte property */
			UEnumProperty* EnumProp = Cast<UEnumProperty>(Prop);
			if (EnumProp != nullptr)
			{
				const FText DefaultTextValue = EnumProp->GetEnum()->GetDisplayNameTextByValue(*EnumProp->ContainerPtrToValuePtr<uint8>(CDO));
				DefaultValue = DefaultTextValue.ToString();
			}
			else // Regular byte property
			{
				DefaultValue = FString::FromInt(*Prop->ContainerPtrToValuePtr<uint8>(CDO));
			}
		}
		else if (BAU::AreEqual(Type, TEXT("name")))
		{
			DefaultValue = Prop->ContainerPtrToValuePtr<FName>(CDO)->ToString();
		}
		else if (BAU::AreEqual(Type, TEXT("string")))
		{
			DefaultValue = *Prop->ContainerPtrToValuePtr<FString>(CDO);
		}
		else if (BAU::AreEqual(Type, TEXT("text")))
		{
			DefaultValue = Prop->ContainerPtrToValuePtr<FText>(CDO)->ToString();
		}
		else if (BAU::AreEqual(Type, TEXT("class")))
		{
			UObject* Obj = *Prop->ContainerPtrToValuePtr<UObject*>(CDO);
			if (Obj != nullptr)
			{
				DefaultValue = Obj->GetPathName();
			}
		}
		else if (BAU::AreEqual(Type, TEXT("int64")))
		{
			const int64 Integer = *Prop->ContainerPtrToValuePtr<int64>(CDO);
			/* todo it returns value as hex, but I want decimal */
			TBigInt<64, true> BigInt(Integer);
			DefaultValue = BigInt.ToString();
		}
		else if (BAU::AreEqual(Type, TEXT("softobject")))
		{
			FSoftObjectPtr* Obj = Prop->ContainerPtrToValuePtr<FSoftObjectPtr>(CDO);
			if (Obj != nullptr)
			{
				DefaultValue = Obj->ToString();
			}
		}
		else if (BAU::AreEqual(Type, TEXT("softclass")))
		{
			FSoftObjectPtr* Obj = Prop->ContainerPtrToValuePtr<FSoftObjectPtr>(CDO);
			if (Obj != nullptr)
			{
				DefaultValue = Obj->ToString();
			}
		}
		else if (BAU::AreEqual(Type, TEXT("interface")))
		{
			UObject* Obj = *Prop->ContainerPtrToValuePtr<UObject*>(CDO);
			if (Obj != nullptr)
			{
				DefaultValue = Obj->GetPathName();
			}
		}
		else
		{
			UE_LOG(DOCLOG, Fatal, TEXT("Unhandled type: %s"), *Type);
		}
	}
	else if (ContainerType == EPinContainerType::Array)
	{
		DefaultValueAsJson = FJsonObjectConverter::UPropertyToJsonValue(Prop, Prop->ContainerPtrToValuePtr<void>(CDO), 0, 0);
	}
	else if (ContainerType == EPinContainerType::Map)
	{
		DefaultValueAsJson = FJsonObjectConverter::UPropertyToJsonValue(Prop, Prop->ContainerPtrToValuePtr<void>(CDO), 0, 0);
	}
	else // Assumed EPinContainerType::Set
	{
		check(ContainerType == EPinContainerType::Set);
		DefaultValueAsJson = FJsonObjectConverter::UPropertyToJsonValue(Prop, Prop->ContainerPtrToValuePtr<void>(CDO), 0, 0);
	}
}

FString BlueprintAssetVariable::GetFullTypeForDisplay() const
{
	FString S;

	if (ContainerType != EPinContainerType::None)
	{
		S += DocDebugHelpers::EnumValueToString(ContainerType);
		S += TEXT(" of ");
	}

	if (BAU::AreEqual(Type, TEXT("bool")))
	{
		S += TEXT("Boolean");
	}
	else if (BAU::AreEqual(Type, TEXT("integer")))
	{
		S += TEXT("Integer");
	}
	else if (BAU::AreEqual(Type, TEXT("float")))
	{
		S += TEXT("Float");
	}
	else if (BAU::AreEqual(Type, TEXT("string")))
	{
		S += TEXT("String");
	}
	else if (BAU::AreEqual(Type, TEXT("name")))
	{
		S += TEXT("Name");
	}
	else if (BAU::AreEqual(Type, TEXT("text")))
	{
		S += TEXT("Text");
	}
	else if (BAU::AreEqual(Type, TEXT("byte")))
	{
		S += TEXT("Byte");
	}
	else if (BAU::AreEqual(Type, TEXT("int64")))
	{
		S += TEXT("Integer64");
	}
	else
	{
		/* Do you wanna perhaps put spaces between words e.g. AudioComponent
		becomes Audio Component */
		S += SubType;

		if (BAU::AreEqual(Type, TEXT("object")))
		{
			S += TEXT(" Object Reference");
		}
		else if (BAU::AreEqual(Type, TEXT("class")))
		{
			S += TEXT(" Class Reference");
		}
		else if (BAU::AreEqual(Type, TEXT("softobject")))
		{
			S += TEXT(" Soft Object Reference");
		}
		else if (BAU::AreEqual(Type, TEXT("softclass")))
		{
			S += TEXT(" Soft Class Reference");
		}
		else if (BAU::AreEqual(Type, TEXT("interface")))
		{
			S += TEXT(" Interface Reference");
		}
	}

	if (ContainerType != EPinContainerType::None)
	{
		/* Pluralize */
		S += TEXT("s");
	}

	return S;
}

FString BlueprintAssetVariable::ToString() const
{
	FString S;

	S += TEXT("Name: ") + Name;
	S += TEXT(", ");
	S += TEXT("Category: ") + Category;
	S += TEXT(", ");
	S += TEXT("Tooltip: ") + Tooltip.String;
	S += TEXT(", ");
	S += TEXT("Type: ") + Type;
	S += TEXT(", ");
	S += TEXT("SubType: ") + SubType;
	S += TEXT(", ");
	S += TEXT("ContainerType: ") + DocDebugHelpers::EnumValueToString(ContainerType);
	S += TEXT(", ");
	if (UsesJsonObjectToStoreDefaultValue())
	{
		/* Create a string representation of json object.
		Todo: not quite displayed how I want e.g. if you have a transform
		and set a value to say 1.2345 you will get back here something
		like 1.234504618292. Either it's an 'issue' with the Serialize
		function or OR at the time DefaultValueAsJson is created.
		Also, some 0 values are -0 (but that's no biggie) */
		FString JsonAsString;
		TSharedRef<TJsonWriter<>> Writer = TJsonWriterFactory<>::Create(&JsonAsString);
		FJsonSerializer::Serialize(DefaultValueAsJson, TEXT(""), Writer);

		if (JsonAsString.Len() > 0)
		{
			S += TEXT("DefaultValue: \n") + JsonAsString;
			S += TEXT("\n, ");
		}
		else
		{
			S += TEXT("DefaultValue: ") + JsonAsString;
			S += TEXT(", ");
		}
	}
	else
	{
		S += TEXT("DefaultValue: ") + DefaultValue;
		S += TEXT(", ");
	}
	S += TEXT("Replication: ") + DocDebugHelpers::EnumValueToString(Replication);
	S += TEXT(", ");
	S += TEXT("ReplicationCondition: ") + DocDebugHelpers::EnumValueToString(ReplicationCondition);
	S += TEXT(", ");
	S += TEXT("bInstanceEditable: ") + (bInstanceEditable ? FString("true") : FString("false"));
	S += TEXT(", ");
	S += TEXT("bBlueprintReadOnly: ") + (bBlueprintReadOnly ? FString("true") : FString("false"));
	S += TEXT(", ");
	S += TEXT("bExposeOnSpawn: ") + (bExposeOnSpawn ? FString("true") : FString("false"));
	S += TEXT(", ");
	S += TEXT("bPrivate: ") + (bPrivate ? FString("true") : FString("false"));
	S += TEXT(", ");
	S += TEXT("bExposeToCinematics: ") + (bExposeToCinematics ? FString("true") : FString("false"));
	S += TEXT(", ");
	S += TEXT("bConfigVariable: ") + (bConfigVariable ? FString("true") : FString("false"));
	S += TEXT(", ");
	S += TEXT("bTransient: ") + (bTransient ? FString("true") : FString("false"));
	S += TEXT(", ");
	S += TEXT("bSaveGame: ") + (bSaveGame ? FString("true") : FString("false"));
	S += TEXT(", ");
	S += TEXT("bAdvancedDisplay: ") + (bAdvancedDisplay ? FString("true") : FString("false"));
	S += TEXT(", ");
	S += TEXT("bMultiline: ") + (bMultiline ? FString("true") : FString("false"));
	S += TEXT(", ");
	S += TEXT("bDeprecated: ") + (bDeprecated ? FString("true") : FString("false"));
	S += TEXT(", ");
	S += TEXT("DeprecationMessage: ") + DeprecationMessage;

	return S;
}


BlueprintAssetEventDispatcherInput::BlueprintAssetEventDispatcherInput(const UProperty* InInputProperty, const UObject* CDO)
	: Name(InInputProperty->GetName())
	// Copying what was written in UEdGraphSchema_K2::ConvertPropertyToPinType
	, bIsPassByReference(InInputProperty->HasAllPropertyFlags(CPF_OutParm | CPF_ReferenceParm))
{
	/* Well this is the fastest way I know of getting the rest of the
	info about the param. Ideally I would like to locate the code in
	UE4 source that creates/modifies the UFunction for the delegate.
	It's possible by looking at that there might be a quicker way
	to figure this stuff out, maybe not though */
	GetTypeAndSubTypeAndContainerType(InInputProperty, CDO, Type, SubType, ContainerType);
}

void BlueprintAssetEventDispatcherInput::GetTypeAndSubTypeAndContainerType(const UProperty* InInputProperty, const UObject* CDO, FString& OutType, FString& OutSubType, EPinContainerType& OutContainerType)
{
	if (const UArrayProperty* ArrayProp = Cast<UArrayProperty>(InInputProperty))
	{
		OutContainerType = EPinContainerType::Array;
		GetTypeAndSubType(ArrayProp->Inner, CDO, OutType, OutSubType);
	}
	else if (const UMapProperty* MapProp = Cast<UMapProperty>(InInputProperty))
	{
		OutContainerType = EPinContainerType::Map;
		GetTypeAndSubType(MapProp->KeyProp, CDO, OutType, OutSubType);
		/* When you do the value part of the map's key/value pair you'll
		wanna run GetTypeAndSubType(MapProp->ValueProp, TypeValueForMapKey, TypeValueForMapValue) here.
		TypeValueForMapKey and TypeValueForMapValue will need to be extra
		params. Really simple stuff */
	}
	else if (const USetProperty* SetProp = Cast<USetProperty>(InInputProperty))
	{
		OutContainerType = EPinContainerType::Set;
		GetTypeAndSubType(SetProp->ElementProp, CDO, OutType, OutSubType);
	}
	else
	{
		OutContainerType = EPinContainerType::None;
		GetTypeAndSubType(InInputProperty, CDO, OutType, OutSubType);
	}
}

void BlueprintAssetEventDispatcherInput::GetTypeAndSubType(const UProperty* InInputProperty, const UObject* CDO, FString& OutType, FString& OutSubType)
{
	if (const UBoolProperty* BoolProp = Cast<UBoolProperty>(InInputProperty))
	{
		OutType = UEdGraphSchema_K2::PC_Boolean.ToString();
	}
	else if (const UNumericProperty* NumericProp = Cast<UNumericProperty>(InInputProperty))
	{
		if (NumericProp->IsFloatingPoint())
		{
			OutType = UEdGraphSchema_K2::PC_Float.ToString();
		}
		// Check if it's an Integer64
		// INT64_MAX is apparently too big so divide by 4
		else if (NumericProp->CanHoldValue<int64>(INT64_MAX / 4))
		{
			OutType = UEdGraphSchema_K2::PC_Int64.ToString();
		}
		// Check if it's an Integer
		else if (NumericProp->CanHoldValue<int32>(INT32_MAX))
		{
			OutType = UEdGraphSchema_K2::PC_Int.ToString();
		}
		else
		{
			OutType = UEdGraphSchema_K2::PC_Byte.ToString();
		}
	}
	else if (const UObjectProperty* ObjectProp = Cast<UObjectProperty>(InInputProperty))
	{
		if (ObjectProp->GetClass() == UClassProperty::StaticClass())
		{
			OutType = UEdGraphSchema_K2::PC_Class.ToString();
			// todo assign value to OutSubType
			/* This comment is for the todo above. It applies to
			all the "todo assign value to OutSubtype" comments in
			this function too. Calling
			ObjectProp->ContainerPtrToValuePtr will cause an assert
			Assertion failed: GetOuter()->IsA(UClass::StaticClass()) [File:C:\Program Files\Epic Games\UE_4.23\Engine\Source\Runtime\CoreUObject\Public\UObject/UnrealType.h] [Line: 360]
			If you do ObjectProp->GetOuter()->GetName() it will print
			like some delegate name... it must be the UFunction this
			property is a param for */
		}
		else
		{
			OutType = UEdGraphSchema_K2::PC_Object.ToString();
			// todo assign value to OutSubType
		}
	}
	else if (const UStructProperty* StructProp = Cast<UStructProperty>(InInputProperty))
	{
		OutType = UEdGraphSchema_K2::PC_Struct.ToString();
		OutSubType = StructProp->Struct->GetName();
	}
	else if (const UNameProperty* NameProp = Cast<UNameProperty>(InInputProperty))
	{
		OutType = UEdGraphSchema_K2::PC_Name.ToString();
	}
	else if (const UStrProperty* StringProp = Cast<UStrProperty>(InInputProperty))
	{
		OutType = UEdGraphSchema_K2::PC_String.ToString();
	}
	else if (const UEnumProperty* EnumProp = Cast<UEnumProperty>(InInputProperty))
	{
		OutType = UEdGraphSchema_K2::PC_Enum.ToString();
	}
	else if (const UTextProperty* TextProp = Cast<UTextProperty>(InInputProperty))
	{
		OutType = UEdGraphSchema_K2::PC_Text.ToString();
	}
	else if (const UByteProperty* ByteProp = Cast<UByteProperty>(InInputProperty))
	{
		/* Might never reach here since UByteProprty are UNumericProperty
		and I handle UNumericPropertys above */
		OutType = UEdGraphSchema_K2::PC_Byte.ToString();
	}
	else if (const UInterfaceProperty* InterfaceProp = Cast<UInterfaceProperty>(InInputProperty))
	{
		OutType = UEdGraphSchema_K2::PC_Interface.ToString();
		OutSubType = InterfaceProp->InterfaceClass->GetName();
	}
	else if (const USoftObjectProperty* SoftObjectProp = Cast<USoftObjectProperty>(InInputProperty))
	{
		if (SoftObjectProp->GetClass() == USoftClassProperty::StaticClass())
		{
			OutType = UEdGraphSchema_K2::PC_SoftClass.ToString();
			// todo assign value to OutSubType
		}
		else
		{
			OutType = UEdGraphSchema_K2::PC_SoftObject.ToString();
			// todo assign value to OutSubType
		}
	}
	else
	{
		UE_LOG(DOCLOG, Fatal, TEXT("Unhandled property type: %s"), *InInputProperty->GetClass()->GetName());
	}
}

FString BlueprintAssetEventDispatcherInput::ToString() const
{
	FString S;

	S += TEXT("Name: ") + Name;
	S += TEXT(", ");
	S += TEXT("Type: ") + Type;
	S += TEXT(", ");
	S += TEXT("SubType: ") + SubType;
	S += TEXT(", ");
	S += TEXT("ContainerType: ") + DocDebugHelpers::EnumValueToString(ContainerType);
	S += TEXT(", ");
	S += TEXT("bIsPassByReference: ") + (bIsPassByReference ? FString("true") : FString("false"));

	return S;
}


BlueprintAssetEventDispatcher::BlueprintAssetEventDispatcher(const UBlueprint* Blueprint, UBlueprintGeneratedClass* BPGC, const FBPVariableDescription& InVariable)
	: Name(BlueprintAssetParsingHelpers::CreateBlueprintAssetEventDispatcherName(InVariable.VarName.ToString()))
	, Category(InVariable.Category.ToString())
	, Type(InVariable.VarType.PinCategory.ToString())
	, ReplicationCondition(InVariable.ReplicationCondition)
	, bInstanceEditable((InVariable.PropertyFlags& CPF_DisableEditOnInstance) == 0)
	, bBlueprintReadOnly((InVariable.PropertyFlags& CPF_BlueprintReadOnly) != 0)
	, bConfigVariable((InVariable.PropertyFlags& CPF_Config) != 0)
	, bTransient((InVariable.PropertyFlags& CPF_Transient) != 0)
	, bSaveGame((InVariable.PropertyFlags& CPF_SaveGame) != 0)
	, bAdvancedDisplay((InVariable.PropertyFlags& CPF_AdvancedDisplay) != 0)
	, bDeprecated((InVariable.PropertyFlags& CPF_Deprecated) != 0)
{
	// Inputs
	UMulticastDelegateProperty* DelProp = CastChecked<UMulticastDelegateProperty>(Blueprint->GeneratedClass->FindPropertyByName(InVariable.VarName));
	UObject* CDO = Blueprint->GeneratedClass->GetDefaultObject();
	UFunction* UFunc = DelProp->SignatureFunction;
	check(UFunc != nullptr);
	Inputs.Reserve(UFunc->NumParms);
	for (TFieldIterator<UProperty> Iter(UFunc, EFieldIteratorFlags::ExcludeSuper); Iter; ++Iter)
	{
		UProperty* Prop = *Iter;
		if (Prop->PropertyFlags & CPF_Parm)
		{
			Inputs.Emplace(BlueprintAssetEventDispatcherInput(Prop, CDO));
		}
	}

	if (InVariable.HasMetaData(FBlueprintMetadata::MD_Tooltip))
	{
		BlueprintAssetParsingHelpers::GetBlueprintAssetDescription_NoShiftEnterToAddNewLineFunctionality(InVariable.GetMetaData(FBlueprintMetadata::MD_Tooltip), Tooltip);
	}

	if ((InVariable.PropertyFlags & CPF_Net) != 0)
	{
		if ((InVariable.PropertyFlags & CPF_RepNotify) != 0)
		{
			// Check the OnRep function exists
			UFunction* OnRepFunc = BPGC->FindFunctionByName(InVariable.RepNotifyFunc, EIncludeSuperFlag::ExcludeSuper);
			// These are the same checks as used in FBlueprintVarActionDetails::GetVariableReplicationType()
			if (OnRepFunc != nullptr
				&& OnRepFunc->NumParms == 0
				&& OnRepFunc->GetReturnProperty() == nullptr)
			{
				Replication = EBlueprintVariableReplicationType::RepNotify;
			}
			else
			{
				Replication = EBlueprintVariableReplicationType::Replicated;
			}
		}
		else
		{
			Replication = EBlueprintVariableReplicationType::Replicated;
		}
	}
	else
	{
		Replication = EBlueprintVariableReplicationType::None;
	}

	if (InVariable.HasMetaData(FBlueprintMetadata::MD_Private))
	{
		if (InVariable.GetMetaData(FBlueprintMetadata::MD_Private).Compare(TEXT("true")) == 0)
		{
			bPrivate = true;
		}
		else
		{
			/* Assuming only "true" or "false" would be stored for it */
			check(InVariable.GetMetaData(FBlueprintMetadata::MD_Private).Compare(TEXT("false")) == 0);
			bPrivate = false;
		}
	}

	if (InVariable.HasMetaData(FBlueprintMetadata::MD_DeprecationMessage))
	{
		BlueprintAssetParsingHelpers::GetBlueprintAssetDeprecationMessage(InVariable.GetMetaData(FBlueprintMetadata::MD_DeprecationMessage), DeprecationMessage);
	}

	/* This is what the editor shows so this is what we will show */
	DefaultValue = TEXT("()");
}

FString BlueprintAssetEventDispatcher::ToString() const
{
	FString S;

	S += TEXT("Name: ") + Name;
	S += TEXT(", ");
	S += TEXT("Category: ") + Category;
	S += TEXT(", ");
	S += TEXT("Tooltip: ") + Tooltip.String;
	S += TEXT(", ");
	S += TEXT("Type: ") + Type;
	S += TEXT(", ");
	S += TEXT("DefaultValue: ") + DefaultValue;
	S += TEXT(", ");
	S += TEXT("Replication: ") + DocDebugHelpers::EnumValueToString(Replication);
	S += TEXT(", ");
	S += TEXT("ReplicationCondition: ") + DocDebugHelpers::EnumValueToString(ReplicationCondition);
	S += TEXT(", ");
	S += TEXT("bInstanceEditable: ") + (bInstanceEditable ? FString("true") : FString("false"));
	S += TEXT(", ");
	S += TEXT("bBlueprintReadOnly: ") + (bBlueprintReadOnly ? FString("true") : FString("false"));
	S += TEXT(", ");
	S += TEXT("bPrivate: ") + (bPrivate ? FString("true") : FString("false"));
	S += TEXT(", ");
	S += TEXT("bConfigVariable: ") + (bConfigVariable ? FString("true") : FString("false"));
	S += TEXT(", ");
	S += TEXT("bTransient: ") + (bTransient ? FString("true") : FString("false"));
	S += TEXT(", ");
	S += TEXT("bSaveGame: ") + (bSaveGame ? FString("true") : FString("false"));
	S += TEXT(", ");
	S += TEXT("bAdvancedDisplay: ") + (bAdvancedDisplay ? FString("true") : FString("false"));
	S += TEXT(", ");
	S += TEXT("bDeprecated: ") + (bDeprecated ? FString("true") : FString("false"));
	S += TEXT(", ");
	S += TEXT("DeprecationMessage: ") + DeprecationMessage;
	if (Inputs.Num() > 0)
	{
		S += TEXT(", Inputs: ");
		for (const auto& Input : Inputs)
		{
			S += Input.ToString() + TEXT(", ");
		}
		S = S.LeftChop(2);
	}

	return S;
}


BlueprintAssetInfo::BlueprintAssetInfo()
	: Blueprint(nullptr)
{
}

BlueprintAssetInfo::BlueprintAssetInfo(const FAssetData& InAssetData)
	: AssetData(InAssetData)
	, Blueprint(CastChecked<UBlueprint>(InAssetData.GetAsset()))
	, Path(Blueprint->GetPathName().LeftChop(Blueprint->GetName().Len() * 2 + 2))
{
}

void BlueprintAssetInfo::GetSubType()
{
	SubType = AssetData.AssetClass.ToString();
}

void BlueprintAssetInfo::GetParentClassNameAndPath(bool bFromOutsidethisProject)
{
	if (bFromOutsidethisProject)
	{
		const FString Data = AssetData.GetTagValueRef<FName>(FBlueprintTags::ParentClassPath).ToString();
		const int32 IndexOfLastDot = Data.Find(TEXT("."), ESearchCase::CaseSensitive, ESearchDir::FromEnd, Data.Len() - 1);

		if (Data.StartsWith(TEXT("Class"), ESearchCase::CaseSensitive))
		{
			// Parent is a C++ class
			ParentClassName = Data.RightChop(IndexOfLastDot + 1).LeftChop(1);
			bIsDirectParentABlueprint = false;
		}
		else
		{
			// Parent is a blueprint asset
			check(Data.StartsWith(TEXT("BlueprintGeneratedClass"), ESearchCase::CaseSensitive));
			ParentClassName = Data.RightChop(IndexOfLastDot + 1).LeftChop(3);
			ParentClassPath = Data.Mid(24, Data.Len() - 25 - ParentClassName.Len() * 2 - 4);
			bIsDirectParentABlueprint = true;
		}
	}
	else
	{
		// Check if this blueprint is the child of another blueprint. 
		// Not 100% if my way of checking is correct
		if (Blueprint->ParentClass->ClassGeneratedBy != nullptr)
		{
			ParentClassName = Blueprint->ParentClass->GetName().LeftChop(2);
			ParentClassPath = Blueprint->ParentClass->GetPathName().LeftChop(ParentClassName.Len() * 2 + 4);
			bIsDirectParentABlueprint = true;
		}
		else
		{
			ParentClassName = Blueprint->ParentClass->GetName();
			bIsDirectParentABlueprint = false;
		}
	}
}

void BlueprintAssetInfo::GetNativeParentClassName(bool bFromOutsidethisProject)
{
	if (bFromOutsidethisProject)
	{
		const FString Data = AssetData.GetTagValueRef<FName>(FBlueprintTags::NativeParentClassPath).ToString();
		const int32 IndexOfLastDot = Data.Find(TEXT("."), ESearchCase::CaseSensitive, ESearchDir::FromEnd, Data.Len() - 1);
		NativeParentClassName = Data.RightChop(IndexOfLastDot + 1).LeftChop(1);
	}
	else
	{
		/* Walk up parents until we hit a C++ class */
		UClass* Obj = Blueprint->ParentClass;
		while (true)
		{
			if (Obj->ClassGeneratedBy == nullptr)
			{
				break;
			}
			Obj = CastChecked<UBlueprint>(Obj->ClassGeneratedBy)->ParentClass;
		}
		NativeParentClassName = Obj->GetName();
	}
}

FString BlueprintAssetInfo::ToString() const
{
	FString S;

	S += '\n';
	S += TEXT("Name: ") + Name + '\n';
	S += TEXT("Path: ") + Path + '\n';
	S += TEXT("Description: ") + Description.String + '\n';
	S += TEXT("Type: ") + DocDebugHelpers::EnumValueToString(Type) + '\n';
	S += TEXT("SubType: ") + SubType + '\n';
	S += TEXT("bAbstractClass: ") + (bAbstractClass ? FString("true") : FString("false")) + '\n';
	S += TEXT("bConstClass: ") + (bConstClass ? FString("true") : FString("false")) + '\n';
	S += TEXT("ParentClassName: ") + ParentClassName + '\n';
	S += TEXT("ParentClassPath: ") + ParentClassPath + '\n';
	S += TEXT("NativeParentClassName: ") + NativeParentClassName + '\n';
	if (BlueprintImplementedInterfaces.Num() > 0)
	{
		S += TEXT("BlueprintImplementedInterfaces: ");
		for (const auto& Interface : BlueprintImplementedInterfaces)
		{
			S += Interface.ToString() + TEXT(", ");
		}
		S = S.LeftChop(2);
		S += '\n';
	}
	if (Components.Num() > 0)
	{
		S += TEXT("Components: \n");
		for (const auto& Comp : Components)
		{
			S += TEXT("\t") + Comp.ToString() + '\n';
		}
	}
	if (EventGraphs.Num() > 0)
	{
		S += TEXT("Event Graphs: \n");
		for (const auto& Graph : EventGraphs)
		{
			S += Graph.ToString() + '\n';
		}
	}
	if (AnimationGraphs.Num() > 0)
	{
		S += TEXT("Animation Graphs: \n");
		for (const auto& Graph : AnimationGraphs)
		{
			S += TEXT("\t") + Graph.ToString() + '\n';
		}
	}
	if (AnimationLayers.Num() > 0)
	{
		S += TEXT("Animation Layers: \n");
		for (const auto& Layer : AnimationLayers)
		{
			S += TEXT("\t") + Layer.ToString() + '\n';
		}
	}
	if (Functions.Num() > 0)
	{
		/* Really odd but this "Functions: " string has to be a
		FString otherwise it does not display correctly */
		S += FString(TEXT("Functions: ")) + '\n';
		for (const auto& Function : Functions)
		{
			S += TEXT("\t") + Function.ToString() + '\n';
		}
	}
	if (InterfaceFunctions.Num() > 0)
	{
		S += TEXT("Interface Heading Functions: \n");
		for (const auto& Function : InterfaceFunctions)
		{
			S += TEXT("\t") + Function.ToString() + '\n';
		}
	}
	if (Macros.Num() > 0)
	{
		S += TEXT("Macros: \n");
		for (const auto& Macro : Macros)
		{
			S += TEXT("\t") + Macro.ToString() + '\n';
		}
	}
	if (Variables.Num() > 0)
	{
		S += TEXT("Variables: \n");
		for (const auto& Variable : Variables)
		{
			S += TEXT("\t") + Variable.ToString() + '\n';
		}
	}
	if (EventDispatchers.Num() > 0)
	{
		S += TEXT("Event Dispatchers: \n");
		for (const auto& Dispatcher : EventDispatchers)
		{
			S += TEXT("\t") + Dispatcher.ToString() + '\n';
		}
	}

	return S;
}


UserDefinedEnumValueInfo::UserDefinedEnumValueInfo(const FText& InDisplayName, const FText& InToolTip)
	: DisplayName(InDisplayName)
	, Description(BlueprintAssetParsingHelpers::CreateBlueprintAssetDescription(InToolTip))
{
}

FString UserDefinedEnumValueInfo::ToString() const
{
	FString S;

	S += TEXT("DisplayName: ") + DisplayName.ToString();
	S += TEXT(", ");
	S += TEXT("Description: ") + Description.Text.ToString();

	return S;
}


UserDefinedEnumInfo::UserDefinedEnumInfo(const FAssetData& InAssetData)
	: Enum(CastChecked<UUserDefinedEnum>(InAssetData.GetAsset()))
	, Path(Enum->GetPathName().LeftChop(Enum->GetName().Len() * 2 + 2))
{
}

FString UserDefinedEnumInfo::ToString() const
{
	FString S;

	S += '\n';
	S += TEXT("Name: ") + Name + '\n';
	S += TEXT("Path: ") + Path + '\n';
	S += TEXT("Description: ") + Description.Text.ToString() + '\n';
	S += TEXT("bBitmaskFlags: ") + (bBitmaskFlags ? FString("true") : FString("false")) + '\n';
	if (Values.Num() > 0)
	{
		S += TEXT("Values: \n");
		for (const auto& Value : Values)
		{
			S += TEXT("\t") + Value.ToString() + '\n';
		}
	}

	return S;
}


UserDefinedStructMemberInfo::UserDefinedStructMemberInfo(const FStructVariableDescription& InVariable, EInvalidDataReason_UserDefinedStructMember& OutIncompleteDataReason)
	: Name(InVariable.FriendlyName)
	, Type(InVariable.Category.ToString())
	, ContainerType(InVariable.ContainerType)
	, ToolTip(BlueprintAssetParsingHelpers::CreateBlueprintAssetDescription_NoShiftEnterToAddNewLineFunctionality(InVariable.ToolTip))
	, bEditable(!InVariable.bDontEditOnInstance)
	, bSaveGame(InVariable.bEnableSaveGame)
	, bEnableMultiLineText(InVariable.bEnableMultiLineText)
	, b3DWidget(InVariable.bEnable3dWidget)
	, DefaultValue(InVariable.DefaultValue)  // InVariable.CurrentDefaultValue could be something else to try if this does not work
{
	/* We'll start this out as None and change it if we encounter any
	problems along the way */
	OutIncompleteDataReason = EInvalidDataReason_UserDefinedStructMember::None;

	if (BAU::AreEqual(Type, TEXT("object"))
		|| BAU::AreEqual(Type, TEXT("struct"))
		|| BAU::AreEqual(Type, TEXT("class"))
		|| BAU::AreEqual(Type, TEXT("interface"))
		|| BAU::AreEqual(Type, TEXT("softclass"))
		|| BAU::AreEqual(Type, TEXT("softobject")))
	{
		if (InVariable.SubCategoryObject != nullptr)
		{
			SubType = InVariable.SubCategoryObject->GetName();
		}
		else
		{
			OutIncompleteDataReason = EInvalidDataReason_UserDefinedStructMember::SubCategoryObjectNull;
			return;
		}
	}
}

FString UserDefinedStructMemberInfo::GetFullTypeForDisplay() const
{
	// Just copied BlueprintAssetVariable::GetFullTypeForDisplay

	FString S;

	if (ContainerType != EPinContainerType::None)
	{
		S += DocDebugHelpers::EnumValueToString(ContainerType);
		S += TEXT(" of ");
	}

	if (BAU::AreEqual(Type, TEXT("bool")))
	{
		S += TEXT("Boolean");
	}
	else if (BAU::AreEqual(Type, TEXT("integer")))
	{
		S += TEXT("Integer");
	}
	else if (BAU::AreEqual(Type, TEXT("float")))
	{
		S += TEXT("Float");
	}
	else if (BAU::AreEqual(Type, TEXT("string")))
	{
		S += TEXT("String");
	}
	else if (BAU::AreEqual(Type, TEXT("name")))
	{
		S += TEXT("Name");
	}
	else if (BAU::AreEqual(Type, TEXT("text")))
	{
		S += TEXT("Text");
	}
	else if (BAU::AreEqual(Type, TEXT("byte")))
	{
		S += TEXT("Byte");
	}
	else if (BAU::AreEqual(Type, TEXT("int64")))
	{
		S += TEXT("Integer64");
	}
	else
	{
		/* Do you wanna perhaps put spaces between words e.g. AudioComponent
		becomes Audio Component */
		S += SubType;

		if (BAU::AreEqual(Type, TEXT("object")))
		{
			S += TEXT(" Object Reference");
		}
		else if (BAU::AreEqual(Type, TEXT("class")))
		{
			S += TEXT(" Class Reference");
		}
		else if (BAU::AreEqual(Type, TEXT("softobject")))
		{
			S += TEXT(" Soft Object Reference");
		}
		else if (BAU::AreEqual(Type, TEXT("softclass")))
		{
			S += TEXT(" Soft Class Reference");
		}
		else if (BAU::AreEqual(Type, TEXT("interface")))
		{
			S += TEXT(" Interface Reference");
		}
	}

	if (ContainerType != EPinContainerType::None)
	{
		/* Pluralize */
		S += TEXT("s");
	}

	return S;
}

FString UserDefinedStructMemberInfo::ToString() const
{
	FString S;

	S += TEXT("Name: ") + Name;
	S += TEXT(", ");
	S += TEXT("Type: ") + Type;
	S += TEXT(", ");
	S += TEXT("SubType: ") + SubType;
	S += TEXT(", ");
	S += TEXT("ContainerType: ") + DocDebugHelpers::EnumValueToString(ContainerType);
	S += TEXT(", ");
	S += TEXT("ToolTip: ") + ToolTip.String;
	S += TEXT(", ");
	S += TEXT("bEditable: ") + (bEditable ? FString("true") : FString("false"));
	S += TEXT(", ");
	S += TEXT("bSaveGame: ") + (bSaveGame ? FString("true") : FString("false"));
	S += TEXT(", ");
	S += TEXT("bEnableMultiLineText: ") + (bEnableMultiLineText ? FString("true") : FString("false"));
	S += TEXT(", ");
	S += TEXT("b3DWidget: ") + (b3DWidget ? FString("true") : FString("false"));
	S += TEXT(", ");
	S += TEXT("DefaultValue: ") + DefaultValue;

	return S;
}


UserDefinedStructInfo::UserDefinedStructInfo(const FAssetData& InAssetData)
	: Struct(CastChecked<UUserDefinedStruct>(InAssetData.GetAsset()))
	, Path(Struct->GetPathName().LeftChop(Struct->GetName().Len() * 2 + 2))
{
}

FString UserDefinedStructInfo::ToString() const
{
	FString S;

	S += '\n';
	S += TEXT("Name: ") + Name + '\n';
	S += TEXT("Path: ") + Path + '\n';
	S += TEXT("Description: ") + Description.String + '\n';
	if (Members.Num() > 0)
	{
		S += TEXT("Members: \n");
		for (const auto& Member : Members)
		{
			S += TEXT("\t") + Member.ToString() + '\n';
		}
	}

	return S;
}


AssetFolderInfo::AssetFolderInfo(const FString& InThisFoldersPath)
	: ThisFoldersPath(InThisFoldersPath)
{
}

FString AssetFolderInfo::ToString() const
{
	FString S;

	S += ThisFoldersPath + TEXT(": \n");
	if (SubFolders.Num() > 0)
	{
		S += TEXT("SubFolders: ");
		for (const auto& Folder : SubFolders)
		{
			S += Folder + TEXT(", ");
		}
		S = S.LeftChop(2);
		S += '\n';
	}
	if (Assets.Num() > 0)
	{
		S += TEXT("Assets: ");
		for (const auto& Asset : Assets)
		{
			/* Here we don't use the asset's Name field and instead
			use UObject::GetName because Name might not have been
			calculated yet */
			if (Asset.IsForBlueprint())
			{
				S += Asset.GetBlueprintAssetInfo()->Blueprint->GetName() + TEXT(", ");
			}
			else if (Asset.IsForUserDefinedEnum())
			{
				S += Asset.GetEnumAssetInfo()->Enum->GetName() + TEXT(", ");
			}
			else // Assumed for user defined struct
			{
				S += Asset.GetStructAssetInfo()->Struct->GetName() + TEXT(", ");
			}
		}
		S = S.LeftChop(2);
		S += '\n';
	}

	return S;
}


//--------------------------------------------------------------------
//====================================================================
//	---------- BlueprintAssetParsingHelpers ----------
//====================================================================
//--------------------------------------------------------------------

void BlueprintAssetParsingHelpers::GetBlueprintAssetDescription(const FString& InRawComment, BlueprintAssetDescriptionString& String)
{
	/* No reason string shouldn't be empty before calling this */
	check(String.String.Len() == 0);

	// -1 is to exclude null char at end
	const int32 LENGTH_OF_NEWLINE_TOKEN = ARRAY_COUNT(PostProcessingTypes::NewlineCharacterForDescriptions) - 1;

	/* The extra +(InRawComment.Len()/16) is for extra escape characters
	we have to add e.g. we encounter a '"' but we have to add a '\' and
	a '"', or if newline char is "<br>"... well that's 3 more than just
	a newline char */
	String.String.Reserve(InRawComment.Len() + (InRawComment.Len() / 16));

	int32 NumNewlinesEncountered = 0;
	/* How many characters will actually appear on the HTML page
	e.g. if we add "<br>" that's 4 chracters but it will just be a
	newline, adding \ and " is 2 chars but will just be displayed
	as a single character (a ") */
	int32 ActualStringLength = 0;
	int32 LengthOfLastTokenAdded = 0;
	int32 IndexOfLastSpace = INDEX_NONE;

	const int32 CommentLen = InRawComment.Len();
	for (int32 Idx = 0; Idx < CommentLen; ++Idx)
	{
		TCHAR c = InRawComment[Idx];
		if (c == '\"')
		{
			String.String += TEXT("\\\"");
			LengthOfLastTokenAdded = 2;
		}
		else if (c == '\'')
		{
			String.String += TEXT("\\\'");
			LengthOfLastTokenAdded = 2;
		}
		/* It appears that if you put a newline into a description in
		a blueprint asset in editor (by doing SHIFT + ENTER) it will
		put in \r\n.
		I'm not sure if someone could get just a \r char (as opposed
		to a \r\n combo) into the description. If yes then I'll need
		to change the check(Comment[Idx + 1] == '\n') to an if statement.
		Also if people can get just a \n in there (as opposed to a \r\n
		combo) then i'll need to add and else if (c == '\n') - simple stuff */
		else if (c == '\r')
		{
			String.String += PostProcessingTypes::NewlineCharacterForDescriptions;

			check(InRawComment[Idx + 1] == '\n');
			/* Skip over the newline character */
			Idx++;

			NumNewlinesEncountered++;

			LengthOfLastTokenAdded = LENGTH_OF_NEWLINE_TOKEN;
		}
		else if (c == ' ')
		{
			String.String += c;
			LengthOfLastTokenAdded = 1;
			IndexOfLastSpace = String.String.Len() - 1;
		}
		else if (c == '\\')
		{
			String.String += TEXT("\\\\");
			LengthOfLastTokenAdded = 2;
		}
		else
		{
			String.String += c;
			LengthOfLastTokenAdded = 1;
		}

		ActualStringLength++;

		if (String.HasChopAmountBeenSet() == false)
		{
			/* See if comment has gone over line limit */
			if (NumNewlinesEncountered > HTMLCreation_Default::MAX_USER_ADDED_NEWLINES_IN_DESCRIPTION)
			{
				/* Set chop index so the newline token just added will
				be chopped off */
				String.ChopIndexForSearchComment = String.String.Len() - LENGTH_OF_NEWLINE_TOKEN;
			}
			/* See if comment has gone over character limit. */
			else if (ActualStringLength > HTMLCreation_Default::ROUGH_DESCRIPTION_CHAR_LIMIT)
			{
				if (IndexOfLastSpace == INDEX_NONE)
				{
					/* Must have been one really long word */
					String.ChopIndexForSearchComment = String.String.Len() - LengthOfLastTokenAdded;
				}
				else
				{
					/* Chop at the space so we do not chop a word in half */
					String.ChopIndexForSearchComment = IndexOfLastSpace;
				}
			}
		}
	}
}

void BlueprintAssetParsingHelpers::GetBlueprintAssetDescription_NoShiftEnterToAddNewLineFunctionality(const FString& InRawComment, BlueprintAssetDescriptionString& String)
{
	GetBlueprintAssetDescription(InRawComment, String);
}

void BlueprintAssetParsingHelpers::GetBlueprintAssetDescription(const FText& InRawComment, BlueprintAssetDescriptionText& Text)
{
	BlueprintAssetDescriptionString String;
	GetBlueprintAssetDescription(InRawComment.ToString(), String);
	Text.Text = FText::AsCultureInvariant(String.String);
	Text.ChopIndexForSearchComment = String.ChopIndexForSearchComment;
}

void BlueprintAssetParsingHelpers::GetBlueprintAssetDeprecationMessage(const FString& InRawComment, FString& OutMessage)
{
	/* No reason OutMessage shouldn't be anything other than empty */
	check(OutMessage.Len() == 0);

	/* The extra +(InRawComment.Len()/16) amount is for extra escape characters we might add e.g. we
	encounter " but have to add a \ before it */
	OutMessage.Reserve(InRawComment.Len() + (InRawComment.Len() / 16));

	const int32 CommentLen = InRawComment.Len();
	for (int32 Idx = 0; Idx < CommentLen; ++Idx)
	{
		TCHAR c = InRawComment[Idx];
		if (c == '\"')
		{
			OutMessage += TEXT("\\\"");
		}
		else if (c == '\'')
		{
			OutMessage += TEXT("\\\'");
		}
		/* It appears that if you put a newline into a description in
		a blueprint asset in editor (by doing SHIFT + ENTER) it will
		put in \r\n.
		I'm not sure if someone could get just a \r char (as opposed
		to a \r\n combo) into the description. If yes then I'll need
		to change the check(Comment[Idx + 1] == '\n') to an if statement.
		Also if people can get just a \n in there (as opposed to a \r\n
		combo) then i'll need to add and else if (c == '\n') - simple stuff */
		else if (c == '\r')
		{
			OutMessage += PostProcessingTypes::NewlineCharacterForDescriptions;

			check(InRawComment[Idx + 1] == '\n');
			/* Skip over the newline character */
			Idx++;
		}
		else if (c == '\\')
		{
			OutMessage += TEXT("\\\\");
		}
		else
		{
			OutMessage += c;
		}
	}
}

FString BlueprintAssetParsingHelpers::CreateBlueprintAssetEventGraphName(const FString& InRawName)
{
	return CreateBlueprintAssetName_Inner(InRawName);
}

FString BlueprintAssetParsingHelpers::CreateBlueprintAssetEventInputName(const FString& InRawName)
{
	return CreateBlueprintAssetName_Inner(InRawName);
}

FString BlueprintAssetParsingHelpers::CreateBlueprintAssetEventName(const FString& InRawName)
{
	return CreateBlueprintAssetName_Inner(InRawName);
}

FString BlueprintAssetParsingHelpers::CreateBlueprintAssetAnimGraphInputInputName(const FString& InRawName)
{
	return CreateBlueprintAssetName_Inner(InRawName);
}

FString BlueprintAssetParsingHelpers::CreateBlueprintAssetAnimGraphInputName(const FString& InRawName)
{
	return CreateBlueprintAssetName_Inner(InRawName);
}

FString BlueprintAssetParsingHelpers::CreateBlueprintAssetAnimGraphName(const FString& InRawName)
{
	/* Currently afaik users cannot createanim graphs - the only one
	that exists is the default one called "AnimGraph". Because
	"AnimGraph" doess not need any character escaping we can just
	return it */
	return InRawName;
}

FString BlueprintAssetParsingHelpers::CreateBlueprintAssetAnimLayerInputName(const FString& InRawName)
{
	return CreateBlueprintAssetName_Inner(InRawName);
}

FString BlueprintAssetParsingHelpers::CreateBlueprintAssetAnimLayerName(const FString& InRawName)
{
	return CreateBlueprintAssetName_Inner(InRawName);
}

FString BlueprintAssetParsingHelpers::CreateBlueprintAssetFunctionInputName(const FString& InRawName)
{
	return CreateBlueprintAssetName_Inner(InRawName);
}

FString BlueprintAssetParsingHelpers::CreateBlueprintAssetFunctionOutputName(const FString& InRawName)
{
	return CreateBlueprintAssetName_Inner(InRawName);
}

FString BlueprintAssetParsingHelpers::CreateBlueprintAssetFunctionName(const FString& InRawName)
{
	return CreateBlueprintAssetName_Inner(InRawName);
}

FString BlueprintAssetParsingHelpers::CreateBlueprintAssetMacroInputPinName(const FString& InRawName)
{
	return CreateBlueprintAssetName_Inner(InRawName);
}

FString BlueprintAssetParsingHelpers::CreateBlueprintAssetMacroOutputPinName(const FString& InRawName)
{
	return CreateBlueprintAssetName_Inner(InRawName);
}

FString BlueprintAssetParsingHelpers::CreateBlueprintAssetMacroName(const FString& InRawName)
{
	return CreateBlueprintAssetName_Inner(InRawName);
}

FString BlueprintAssetParsingHelpers::CreateBlueprintAssetVariableName(const FString& InRawName)
{
	return CreateBlueprintAssetName_Inner(InRawName);
}

FString BlueprintAssetParsingHelpers::CreateBlueprintAssetEventDispatcherName(const FString& InRawName)
{
	return CreateBlueprintAssetName_Inner(InRawName);
}

FString BlueprintAssetParsingHelpers::CreateBlueprintAssetName_Inner(const FString& InRawName)
{
	FString S;

	S.Reserve(InRawName.Len());

	const int32 NameLen = InRawName.Len();
	for (int32 Idx = 0; Idx < NameLen; ++Idx)
	{
		TCHAR c = InRawName[Idx];
		if (c == '\"')
		{
			S += TEXT("\\\"");
		}
		else if (c == '\'')
		{
			S += TEXT("\\\'");
		}
		/* It appears that if you put a newline into a name in
		a blueprint asset in editor (by doing SHIFT + ENTER) it will
		put in \r\n.
		I'm not sure if someone could get just a \r char (as opposed
		to a \r\n combo) into the name. If yes then I'll need
		to change the check(InRawName[Idx + 1] == '\n') to an if statement.
		Also if people can get just a \n in there (as opposed to a \r\n
		combo) then i'll need to add and else if (c == '\n') - simple stuff */
		else if (c == '\r')
		{
			S += PostProcessingTypes::NewlineCharacterForDescriptions;

			check(InRawName[Idx + 1] == '\n');
			/* Skip over the newline character */
			Idx++;
		}
		else if (c == '\\')
		{
			S += TEXT("\\\\");
		}
		else
		{
			S += c;
		}
	}

	return S;
}

ENABLE_OPTIMIZATION

#endif
