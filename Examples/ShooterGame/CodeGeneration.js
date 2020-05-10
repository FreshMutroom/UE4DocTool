// -------------------------------------------------
// --------------- Variables -----------------------
// -------------------------------------------------

// Example of one place where I use this: in the html page's title
var projectName = "Shooter Game";

// -------------------------------------------------
// --------------- Classes -------------------------
// -------------------------------------------------

class EnumValue
{
	constructor(inComment, inName, inValue)
	{
		this.comment = inComment;
		this.name = inName;
		this.value = inValue;
	}
};

class EnumValues
{
	constructor()
	{
		this.array = [];
	}
};

class EnumInfo
{
	constructor(
		inPathForHeaderFileDeclaredIn,
		inModule,
		inModuleFilters,
		inHeaderFileDeclaredIn,
		inIncludePath,
		inComment,
		inbIsUENUM,
		inbIsEnumClass,
		inNesting,
		inName,
		inBackingInteger,
		inValues
		)
	{
		this.pathForHeaderFileDeclaredIn = inPathForHeaderFileDeclaredIn;
		this.module = inModule;
		this.moduleFilters = inModuleFilters;
		this.headerFileDeclaredIn = inHeaderFileDeclaredIn;
		this.includePath = inIncludePath;
		this.comment = inComment;
		this.bIsUENUM = inbIsUENUM;
		this.bIsEnumClass = inbIsEnumClass;
		this.nesting = inNesting;
		this.name = inName;
		this.backingInteger = inBackingInteger;
		this.values = inValues;
	}
};

class TemplateSpecializationValues
{
	constructor()
	{
		this.name = "";
		this.nestedValues = [];
	}
};

class ReturnValueTemplateParams
{
	constructor()
	{
		this.type = "";
		this.pointers = [];
		this.nestedTemplateValues = [];
	}
};

class FunctionParam
{
	constructor()
	{
		this.bIsConst = false;
		this.variableTypeName = "";
		this.templateValues = [];
		this.variableTypePointers = [];
		this.name = "";
		this.cArray = [];
		this.defaultValue = "";
		this.comment = "";
	}
};

class FunctionParams
{
	constructor()
	{
		this.array = [];
		this.bAtLeastOneParamHasComment = false;
	}
};

class FunctionTemplateParams
{
	constructor()
	{
		this.array = [];
	}
};


class FunctionInfo
{
	constructor(
		inAccessSpecifier,
		inModule,
		inHeader,
		inIncludePath,
		inComment,
		inReturnValueComment,
		inName,
		inbIsConstructor,
		inbIsDestructor,
		inbIsStatic,
		inbIsFriend,
		inbDeclaredWithVirtualKeyword,
		inbIsConst,
		inbIsConstexpr,
		inbIsReturnValueConst,
		inReturnValueNamespacing,
		inReturnValue,
		inReturnValuePointers,
		inReturnValueTemplateValues,
		inReturnValueCArray,
		inParameters,
		inTemplateParameters,
		inClassThisOverridesFrom
		)
	{
		this.accessSpecifier = inAccessSpecifier;
		this.module = inModule;
		this.header = inHeader;
		this.includePath = inIncludePath;
		this.comment = inComment;
		this.returnValueComment = inReturnValueComment;
		this.name = inName;
		this.bIsConstructor = inbIsConstructor;
		this.bIsDestructor = inbIsDestructor;
		this.bIsStatic = inbIsStatic;
		this.bIsFriend = inbIsFriend;
		this.bDeclaredWithVirtualKeyword = inbDeclaredWithVirtualKeyword;
		this.bIsConst = inbIsConst;
		this.bIsConstexpr = inbIsConstexpr;
		this.bIsReturnValueConst = inbIsReturnValueConst;
		this.returnValueNamespacing = inReturnValueNamespacing;
		this.returnValue = inReturnValue;
		this.returnValuePointers = inReturnValuePointers;
		this.returnValueTemplateValues = inReturnValueTemplateValues;
		this.returnValueCArray = inReturnValueCArray;
		this.parameters = inParameters;
		this.templateParameters = inTemplateParameters;
		this.classThisOverridesFrom = inClassThisOverridesFrom;
	}
};

class VariableInfo
{
	constructor(
		inAccessSpecifier,
		inComment,
		inbIsStatic,
		inbIsConst,
		inbIsConstexpr,
		inValueNamespacing,
		inTypeName,
		inTemplateValues,
		inPointers,
		inName,
		inArrays,
		inBitFieldValue
		)
	{
		this.accessSpecifier = inAccessSpecifier;
		this.comment = inComment;
		this.bIsStatic = inbIsStatic;
		this.bIsConst = inbIsConst;
		this.bIsConstexpr = inbIsConstexpr;
		this.valueNamespacing = inValueNamespacing;
		this.typeName = inTypeName;
		this.templateValues = inTemplateValues;
		this.pointers = inPointers;
		this.name = inName;
		this.arrays = inArrays;
		this.bitFieldValue = inBitFieldValue;
	}
};

class ClassParents
{
	constructor()
	{
		this.array = [];
	}
};

class ClassParent
{
	constructor()
	{
		this.accessSpecifier = "";
		this.namespacing = [];
		this.name ="";
		this.templateValues = [];
	}
};

class ClassInfo
{
	constructor(
		inPathForHeaderFileDeclaredIn,
		inModule,
		inModuleFilters,
		inHeaderFileDeclaredIn,
		inIncludePath,
		inComment,
		inbIsClass,
		inbIsInterface,
		inbIsFinal,
		inTemplateParameters,
		inTemplateSpecializationValues,
		inNesting,
		inName,
		inParentsNames,
		inFunctions,
		inVariables
		)
	{
		this.pathForHeaderFileDeclaredIn = inPathForHeaderFileDeclaredIn;
		this.module = inModule;
		this.moduleFilters = inModuleFilters;
		this.headerFileDeclaredIn = inHeaderFileDeclaredIn;
		this.includePath = inIncludePath;
		this.comment = inComment;
		this.bIsClass = inbIsClass;
		this.bIsInterface = inbIsInterface;
		this.bIsFinal = inbIsFinal;
		this.templateParameters = inTemplateParameters;
		this.templateSpecializationValues = inTemplateSpecializationValues;
		this.nesting = inNesting;
		this.name = inName;
		this.parentsNames = inParentsNames;
		this.functions = inFunctions;
		this.variables = inVariables;
	}
};

// ------------ ClassInfo Functions ----------------

/* @return - whether this class/struct is the child of at least 1 other class/struct */
ClassInfo.prototype.isChildClass = function()
{
	return this.parentsNames.array.length > 0;
};

/* @return - whether this class/struct is the parent of at least 1 other class/struct */
ClassInfo.prototype.isParentClass = function()
{
	// todo	return false;
};


// -------------------------------------------------
// --------------- Functions -----------------------
// -------------------------------------------------

// Get what to put next to the title
function getHeaderDescription(inComment)
{
	return inComment;
}

function pointerToHTML(ptrString)
{
	if (ptrString == "P")
	{
		return "*";
	}
	else if (ptrString == "R")
	{
		return "&";
	}
	else // Assumed const pointer
	{
		return "* const";
	}
}

function accessSpecifierToHTML(accessSpecifierString)
{
	if (accessSpecifierString == "U")
	{
		return "public";
	}
	else if (accessSpecifierString == "I")
	{
		return "private";
	}
	else
	{
		return "protected";
	}
}

function toHTMLString_ReturnValueTemplateValues(array)
{
	let S = "";

	if (array.length > 0)
	{
		S += "&lt; ";
		for (var i = 0; i < array.length; ++i)
		{
			let elem = array[i];
			S += elem.type;
			S += toHTMLString_ReturnValueTemplateValues(elem.nestedTemplateValues);
			if (elem.pointers.length > 0)
			{
				S += " ";
				for (var j = 0; j < elem.pointers.length; ++j)
				{
					S += pointerToHTML(elem.pointers[j]);
				}
			}
			S += ", ";
		}
		S = S.slice(0, -2);
		S += "&gt; ";
	}

	return S;
}

function toHTMLString_FunctionParameter(param)
{
	let S = "";

	if (param.bIsConst)
	{
		S += "const ";
	}
	S += param.variableTypeName;
	S += toHTMLString_ReturnValueTemplateValues(param.templateValues);
	S += " ";
	if (param.variableTypePointers.length > 0)
	{
		for (var i = 0; i < param.variableTypePointers.length; ++i)
		{
			let elem = param.variableTypePointers[i];
			S += pointerToHTML(elem);
		}
		S += " ";
	}
	S += param.name;
	for (var i = 0; i < param.cArray.length; ++i)
	{
		let elem = param.cArray[i];
		S += elem;
	}

	return S;
}

// Generates the HTML page for an enum
function createHTML_Enum(enumInfo)
{
	// "#include" the style sheet
	var head = document.getElementsByTagName('HEAD')[0];
	var link = document.createElement('link');
	link.rel = 'stylesheet';
	link.type = 'text/css';
	link.href = 'https://docs.unrealengine.com/Include/CSS/udn_public.css';
	head.appendChild(link);

	document.title = enumInfo.name + " | " + projectName + " Documentation";

	var S = "";
	S += "			<div id='page_head' style>";
	S += "				<div id='pagenav'>";
	S += "					<div id='search_container'>";
	S += "						<form name='bodySearch'>";
	S += "							<input type='image' src='https://docs.unrealengine.com/Include/Images/search_box_icon.png' class='searchbutton'>";
	S += "							<input type='text' name='keyword' class='searchbox' autocomplete='off'>";
	S += "						</form>";
	S += "					</div>";
	S += "				</div>";
	S += "			</div>";
	S += "		<div id='contentContainer' class style='margin-left: 0px;'>";
	S += "			<div id='pagedefault'>";
	S += "				<div id='pagecontainer' style='padding-right: 0px; min-height: 5px;'>";
	S += "					<div class='hero'>";
	S += "						<div class='info'>";
	S += "							<div id='pageTitle'>";
	S += "								<h1 id='H1TitleId'>" + enumInfo.name + "</h1>";
	S += "							</div>";
	S += "							<h2>" + enumInfo.comment + "</h2>";
	S += "						</div>";
	S += "					</div>";
	S += "					<div id='maincol' style='width: calc(100% - 60px); padding-bottom: 100px;'>";
	S += "						<div class='heading expanded'>";
	S += "							<p>References</p>";
	S += "						</div>";
	S += "						<div id='references'>";
	S += "							<div class='member-list'>";
	S += "								<table cellspacing='0'>";
	S += "									<tbody>";
	S += "										<tr class='normal-row'>";
	S += "											<td class='name-cell'>";
	S += "												<p>Module</p>";
	S += "											</td>";
	S += "											<td class='desc-cell'>";
	S += "												<p>";
	S += 													enumInfo.module;
	S += "												</p>";
	S += "											</td>";
	S += "										</tr>";
	S += "										<tr class='normal-row'>";
	S += "											<td class='name-cell'>";
	S += "												<p>Header</p>";
	S += "											</td>";
	S += "											<td class='desc-cell'>";
	S += "												<p>";
	S += 													enumInfo.pathForHeaderFileDeclaredIn;
	S += "												</p>";
	S += "											</td>";
	S += "										</tr>";
	S += "										<tr class='normal-row'>";
	S += "											<td class='name-cell'>";
	S += "												<p>Include</p>";
	S += "											</td>";
	S += "											<td class='desc-cell'>";
	S += "												<p>";
	S += "													#include &#34;" + enumInfo.includePath + "&#34;";
	S += "												</p>";
	S += "											</td>";
	S += "										</tr>";
	S += "									</tbody>";
	S += "								</table>";
	S += "							</div>";
	S += "						</div>";
	S += "						<div class='heading expanded'>";
	S += "							<p>Syntax</p>";
	S += "						</div>";
	S += "						<div id='syntax'>";
	S += "							<div class='simplecode_api'>";
	S += "								<p>";
	S += "									";
	S += "enum ";
	if (enumInfo.bIsEnumClass)
	{
		S += "class ";
	}
	S += enumInfo.name;
	if (enumInfo.backingInteger.length > 0)
	{
		S += " : " + enumInfo.backingInteger;
	}
	S += "<br>{<br>";
	if (enumInfo.values.array.length > 0)
	{
		for (var i = 0; i < enumInfo.values.array.length; ++i)
		{
			let elem = enumInfo.values.array[i];
			S += "&nbsp;&nbsp;&nbsp;&nbsp;" + elem.name + ",<br>";
		}
		S = S.slice(0, -5);
		S += "<br>";
	}
	S += "}<br>";
	S += "							</p>";
	S += "						</div>";
	S += "					</div>";
	S += "				<div class='heading expanded'>";
	S += "					<p>Values</p>";
	S += "				</div>";
	S += "					<div id='values'>";
	S += "						<div class='member-list'>";
	S += "							<table cellspacing='0'>";
	S += "								<tbody>";
	S += "									<tr class='header-row'>";
	S += "										<th class='name-cell' style='width:15%'>";
	S += "											<p>Name</p>";
	S += "										</th>";
	S += "										<th class='desc-cell' style='width:85%'>";
	S += "											<p>Description</p>";
	S += "										</th>";
	S += "									</tr>";
	for (var i = 0; i < enumInfo.values.array.length; ++i)
	{
		let elem = enumInfo.values.array[i];
		S += "									<tr class='normal-row'>";
		S += "										<td class='name-cell'>";
		S += "											<p>" + elem.name + "</p>";
		S += "										</td>";
		S += "										<td class='desc-cell'>";
		S += "											<p>";
		S += "												" + elem.comment;
		S += "											</p>";
		S += "										</td>";
		S += "									</tr>";
	}
	S += "								</tbody>";
	S += "							</table>";
	S += "						</div>";
	S += "					</div>";
	S += "				<div class='heading expanded'>";
	S += "					<p>Remarks</p>";
	S += "				</div>";
	S += "				<div id='description'>";
	S += "					<p>";
	S += "						" + enumInfo.comment;
	S += "					</p>";
	S += "				</div>";
	S += "			</div>";

	document.getElementById("webThree").innerHTML = S;
}

// Generates the HTML page for a variable
function createHTML_Variable(variable)
{
	// "#include" the style sheet
	var head = document.getElementsByTagName('HEAD')[0];
	var link = document.createElement('link');
	link.rel = 'stylesheet';
	link.type = 'text/css';
	link.href = 'https://docs.unrealengine.com/Include/CSS/udn_public.css';
	head.appendChild(link);

	document.title = variable.name + " | " + projectName + " Documentation";

	var S = "";
	S += "			<div id='page_head' style>";
	S += "				<div id='pagenav'>";
	S += "					<div id='search_container'>";
	S += "						<form name='bodySearch'>";
	S += "							<input type='image' src='https://docs.unrealengine.com/Include/Images/search_box_icon.png' class='searchbutton'>";
	S += "							<input type='text' name='keyword' class='searchbox' autocomplete='off'>";
	S += "						</form>";
	S += "					</div>";
	S += "				</div>";
	S += "			</div>";
	S += "		<div id='contentContainer' class style='margin-left: 0px;'>";
	S += "			<div id='pagedefault'>";
	S += "				<div id='pagecontainer' style='padding-right: 0px; min-height: 5px;'>";
	S += "					<div class='hero'>";
	S += "						<div class='info'>";
	S += "							<div id='pageTitle'>";
	S += "								<h1 id='H1TitleId'>" + variable.name + "</h1>";
	S += "							</div>";
	S += "							<h2>" + variable.comment + "</h2>";
	S += "						</div>";
	S += "					</div>";
	S += "					<div id='maincol' style='width: calc(100% - 60px); padding-bottom: 100px;'>";
	S += "						<div class='heading expanded'>";
	S += "							<p>Syntax</p>";
	S += "						</div>";
	S += "						<div id='syntax'>";
	S += "							<div class='simplecode_api'>";
	S += "								<p>";
	S += "									";
	if (variable.bIsStatic)
	{
		S += "static ";
	}
	if (variable.bIsConstexpr)
	{
		S += "constexpr ";
	}
	if (variable.bIsConst)
	{
		S += "const ";
	}
	S += variable.typeName;
	S += toHTMLString_ReturnValueTemplateValues(variable.templateValues);
	S += " ";
	if (variable.pointers.length > 0)
	{
		for (var i = 0; i < variable.pointers.length; ++i)
		{
			let elem = variable.pointers[i];
			S += pointerToHTML(elem);
		}
		S += " ";
	}
	S += variable.name;
	for (var i = 0; i < variable.arrays.length; ++i)
	{
		let elem = variable.arrays[i];
		S += "[" + elem + "]";
	}
	if (variable.bitFieldValue.length > 0)
	{
		S += " : " + variable.bitFieldValue;
	}
	S += "								<br>";
	S += "							</p>";
	S += "						</div>";
	S += "					</div>";
	S += "				<div class='heading expanded'>";
	S += "					<p>Remarks</p>";
	S += "				</div>";
	S += "				<div id='description'>";
	S += "					<p>";
	S += "						" + variable.comment;
	S += "					</p>";
	S += "				</div>";
	S += "			</div>";

	document.getElementById("webThree").innerHTML = S;
}

// Generates the HTML page for a function
function createHTML_Function(func)
{
	// "#include" the style sheet
	var head = document.getElementsByTagName('HEAD')[0];
	var link = document.createElement('link');
	link.rel = 'stylesheet';
	link.type = 'text/css';
	link.href = 'https://docs.unrealengine.com/Include/CSS/udn_public.css';
	head.appendChild(link);

	document.title = func.name + " | " + projectName + " Documentation";

	var S = "";
	S += "			<div id='page_head' style>";
	S += "				<div id='pagenav'>";
	S += "					<div id='search_container'>";
	S += "						<form name='bodySearch'>";
	S += "							<input type='image' src='https://docs.unrealengine.com/Include/Images/search_box_icon.png' class='searchbutton'>";
	S += "							<input type='text' name='keyword' class='searchbox' autocomplete='off'>";
	S += "						</form>";
	S += "					</div>";
	S += "				</div>";
	S += "			</div>";
	S += "		<div id='contentContainer' class style='margin-left: 0px;'>";
	S += "			<div id='pagedefault'>";
	S += "				<div id='pagecontainer' style='padding-right: 0px; min-height: 5px;'>";
	S += "					<div class='hero'>";
	S += "						<div class='info'>";
	S += "							<div id='pageTitle'>";
	S += "								<h1 id='H1TitleId'>" + func.name + "</h1>";
	S += "							</div>";
	S += "							<h2>" + getHeaderDescription(func.comment) + "</h2>";
	S += "						</div>";
	S += "					</div>";
	S += "					<div id='maincol' style='width: calc(100% - 60px); padding-bottom: 100px;'>";
	if (func.bDeclaredWithVirtualKeyword)
	{
		S += "						<div class='heading expanded'>";
		S += "							<p>Override Hierarchy</p>";
		S += "						</div>";
		S += "						<div id='overrides'>";
		S += "							<div class='hierarchy'>";
		S += "								<table class='hierarchy-table' cellspacing='0' id='hrch'>";
		S += "									<tbody>";
		// This is a virtual function. Check if it's either:
		// 1. base version of it
		// 2. overrides from some other class
		if (func.classThisOverridesFrom.length == 0)
		{
			// This virtual function is the "base" one i.e. does not override from any other class
			// todo
		}
		else
		{
			// todo
		}
		S += "									</tbody>";
		S += "								</table>";
		S += "							</div>";
		S += "						</div>";
	}
	if (func.returnValueComment.length > 0)
	{
		S += "						<div class='syntax'>";
		S += "							<div class='heading expanded'>";
		S += "								<p>Returns</p>";
		S += "							</div>";
		S += "							<div id='returns'>";
		S += "								<p>" + func.returnValueComment + "</p>";
		S += "							</div>";
		S += "						</div>";
	}
	S += "					<div class='heading expanded'>";
	S += "						<p>References</p>";
	S += "					</div>";
	S += "					<div id='references'>";
	S += "						<div class='member-list'>";
	S += "							<table cellspacing='0'>";
	S += "								<tbody>";
	S += "									<tr class='normal-row'>";
	S += "										<td class='name-cell'>";
	S += "											<p>Module</p>";
	S += "										</td>";
	S += "										<td class='desc-cell'>";
	S += "											<p>";
	S += 												func.module;
	S += "											</p>";
	S += "										</td>";
	S += "									</tr>";
	S += "									<tr class='normal-row'>";
	S += "										<td class='name-cell'>";
	S += "											<p>Header</p>";
	S += "										</td>";
	S += "										<td class='desc-cell'>";
	S += "											<p>";
	S +=												func.header;
	S += "											</p>";
	S += "										</td>";
	S += "									</tr>";
	S += "									<tr class='normal-row'>";
	S += "										<td class='name-cell'>";
	S += "											<p>Include</p>";
	S += "										</td>";
	S += "										<td class='desc-cell'>";
	S += "											<p>";
	S += "												#include &#34;" + func.includePath + "&#34;";
	S += "											</p>";
	S += "										</td>";
	S += "									</tr>";
	S += "								</tbody>";
	S += "							</table>";
	S += "						</div>";
	S += "					</div>";
	S += "				<div class='heading expanded'>";
	S += "					<p>Syntax</p>";
	S += "				</div>";
	S += "				<div id='syntax'>";
	S += "					<div class='simplecode_api'>";
	S += "						<p>";
	S += "							";
	if (func.templateParameters.array.length > 0)
	{
		S += "template" + "&lt;";
		for(var i = 0; i < func.templateParameters.array.length; ++i)
		{
			let elem = func.templateParameters.array[i];
			S += elem[0] + elem[1] + ", ";
		}
		S = S.slice(0, -2);
		S += "&gt;" + "<br>";
	}
	if (func.bIsStatic)
	{
		S += "static ";
	}
	else if (func.bIsFriend)
	{
		S += "friend ";
	}
	else if (func.bDeclaredWithOverrideKeyword || func.classThisOverridesFrom.length > 0)
	{
		S += "virtual ";
	}
	if (func.bIsReturnValueConst)
	{
		S += "const ";
	}
	for (var i = 0; i < func.returnValueNamespacing.length; ++i)
	{
		let elem = func.returnValueNamespacing[i];
		S += elem + "::";
	}
	S += func.returnValue;
	S += " ";
	S += toHTMLString_ReturnValueTemplateValues(func.returnValueTemplateValues);
	if (func.returnValuePointers.length > 0)
	{
		for (var i = 0; i < func.returnValuePointers.length; ++i)
		{
			let elem = func.returnValuePointers[i];
			S += pointerToHTML(elem);
		}
		S += " ";
	}
	S += func.name;
	if (func.parameters.array.length > 0)
	{
		S += "<br>(<br>";
		for (var i = 0; i < func.parameters.array.length; ++i)
		{
			let elem = func.parameters.array[i];
			S += "&nbsp;&nbsp;&nbsp;&nbsp;" + toHTMLString_FunctionParameter(elem) + ",<br>";
		}
		S = S.slice(0, -5);
		S += "<br>)";
	}
	else
	{
		S += "()";
	}
	if (func.returnValueCArray.length > 0)
	{
		for (var i = 0; i < func.returnValueCArray.length; ++i)
		{
			let elem = func.returnValueCArray[i];
			S += elem;
		}
	}
	if (func.bIsConst)
	{
		S += " const";
	}
	if (func.classThisOverridesFrom.length > 0)
	{
		S += " override";
	}
	S += "						</p>";
	S += "					</div>";
	S += "				</div>";
	S += "				<div class='heading expanded'>";
	S += "					<p>Remarks</p>";
	S += "				</div>";
	S += "				<div id='description'>";
	S += "					<p>" + func.comment + "</p>";
	S += "				</div>";
	if (func.parameters.bAtLeastOneParamHasComment)
	{
		S += "				<div class='syntax'>";
		S += "					<div class='heading expanded'>";
		S += "						<p>Parameters</p>";
		S += "					</div>";
		S += "					<div id='params'>";
		S += "						<div class='member-list'>";
		S += "							<table cellspacing='0'>";
		S += "								<tbody>";
		S += "									<tr class='header-row'>";
		S += "										<th class='name-cell' style='width:15%'>";
		S += "											<p>Parameter</p>";
		S += "										</th>";
		S += "										<th class='desc-cell' style='width:85%'>";
		S += "											<p>Description</p>";
		S += "										</th>";
		S += "									</tr>";
		for (var i = 0; i < func.parameters.array.length; ++i)
		{
			let elem = func.parameters.array[i];
			S += "									<tr class='normal-row'>";
			S += "										<td class='name-cell'>";
			S += "											<p>" + elem.name + "</p>";
			S += "										</td>";
			S += "										<td class='desc-cell'>";
			S += "											<p>" + func.comment + "</p>";
			S += "										</td>";
			S += "									</tr>";
		}
		S += "								</tbody>";
		S += "							</table>";
		S += "						</div>";
		S += "					</div>";
		S += "				</div>";
	}
	S += "			</div>";

	document.getElementById("webThree").innerHTML = S;
}

function createHTML_Class(classInfo)
{
	// "#include" the style sheet
	var head = document.getElementsByTagName('HEAD')[0];
	var link = document.createElement('link');
	link.rel = 'stylesheet';
	link.type = 'text/css';
	link.href = 'https://docs.unrealengine.com/Include/CSS/udn_public.css';
	head.appendChild(link);

	document.title = classInfo.name + " | " + projectName + " Documentation";

	/* For a variable in the list of this class' variables, return 
	whether to create a link on the variable name. e.g. AActor::NetTag 
	does not have a link on it, but AActor::InitialLifeSpan does */
	function createLinkOnVariableName(variableInfo)
	{
		/* Todo: I don't know how Epic chooses whether to show a link or not 
		so for now this just returns true until I can fully figure it out.
		I know whether the variable's whole comment is showing in the table 
		or not has something to do with it, but I can't really work out why 
		they decide to show the whole comment in the first place or not */
		return true;
	}

	var S = "";
	S += "			<div id='page_head' style>";
	S += "				<div id='pagenav'>";
	S += "					<div id='search_container'>";
	S += "						<form name='bodySearch'>";
	S += "							<input type='image' src='https://docs.unrealengine.com/Include/Images/search_box_icon.png' class='searchbutton'>";
	S += "							<input type='text' name='keyword' class='searchbox' autocomplete='off'>";
	S += "						</form>";
	S += "					</div>";
	S += "				</div>";
	S += "			</div>";
	S += "		<div id='contentContainer' class style='margin-left: 0px;'>";
	S += "			<div id='pagedefault'>";
	S += "				<div id='pagecontainer' style='padding-right: 0px; min-height: 5px;'>";
	S += "					<div class='hero'>";
	S += "						<div class='info'>";
	S += "							<div id='pageTitle'>";
	S += "								<h1 id='H1TitleId'>" + classInfo.name + "</h1>";
	S += "							</div>";
	S += "							<h2>" + getHeaderDescription(classInfo.comment) + "</h2>";
	S += "						</div>";
	S += "					</div>";
	S += "					<div id='maincol' style='width: calc(100% - 60px); padding-bottom: 100px;'>";
	/* Check if we should create inheritance hierarchy */
	// Todo I actually have to implement these 2 functions
	if (classInfo.isChildClass() || classInfo.isParentClass())
	{
		S += "						<div class='heading expanded'>";
		S += "							<p>Inheritance Hierarchy</p>";
		S += "						</div>";
		S += "						<div id='hierarchy'>";
		S += "							<div class='hierarchy'>";
		S += "								<table class='hierarchy-table' cellspacing='0' id='hrch'>";
		S += "									<tbody>";
		S += "										<tr>";
		S += "											<td class='hierarchy-button-cell'>";
		S += "												<p>";
		S += "													<img class='hierarchy-spacer' src='data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw=='>";
		S += "												</p>";
		S += "											</td>";
		S += "											<td class='hierarchy-label-cell'>";
		S += "											</td>";
		S += "										</tr>";
		S += "									</tbody>";
		S += "								</table>";
		S += "							</div>";
		S += "						</div>";
	}
	S += "						<div class='heading expanded'>";
	S += "							<p>References</p>";
	S += "						</div>";
	S += "						<div id='references'>";
	S += "							<div class='member-list'>";
	S += "								<table cellspacing='0'>";
	S += "									<tbody>";
	S += "										<tr class='normal-row'>";
	S += "											<td class='name-cell'>";
	S += "												<p>Module</p>";
	S += "											</td>";
	S += "											<td class='desc-cell'>";
	S += "												<p>";
	S += 													classInfo.module;
	S += "												</p>";
	S += "											</td>";
	S += "										</tr>";
	S += "										<tr class='normal-row'>";
	S += "											<td class='name-cell'>";
	S += "												<p>Header</p>";
	S += "											</td>";
	S += "											<td class='desc-cell'>";
	S += "												<p>";
	S += 													classInfo.pathForHeaderFileDeclaredIn;
	S += "												</p>";
	S += "											</td>";
	S += "										</tr>";
	S += "										<tr class='normal-row'>";
	S += "											<td class='name-cell'>";
	S += "												<p>Include</p>";
	S += "											</td>";
	S += "											<td class='desc-cell'>";
	S += "												<p>";
	S += "													#include &#34;" + classInfo.includePath + "&#34;";
	S += "												</p>";
	S += "											</td>";
	S += "										</tr>";
	S += "									</tbody>";
	S += "								</table>";
	S += "							</div>";
	S += "						</div>";
	S += "					<div class='heading expanded'>";
	S += "						<p>Syntax</p>";
	S += "					</div>";
	S += "					<div id='syntax'>";
	S += "						<div class='simplecode_api'>";
	S += "							<p>";
	S += "								";
	if (classInfo.bIsClass)
	{
		S += "class ";
	}
	else
	{
		S += "struct ";
	}
	S += classInfo.name;
	if (classInfo.parentsNames.array.length > 0)
	{
		S += " : ";
		for (var i = 0; i < classInfo.parentsNames.array.length; ++i)
		{
			let elem = classInfo.parentsNames.array[i];
			S += accessSpecifierToHTML(elem.accessSpecifier);
			S += " ";
			S += elem.name;
		}
	}
	S += "<br>";
	S += "							</p>";
	S += "						</div>";
	S += "					</div>";
	S += "				<div class='heading expanded'>";
	S += "					<p>Remarks</p>";
	S += "				</div>";
	S += "				<div id='description' style>";
	S += "					<p>";
	S += "						" + classInfo.comment;
	S += "					</p>";
	S += "				<div class='syntax'>";
	if (classInfo.variables.length > 0)
	{
		S += "					<div class='heading expanded'>";
		S += "						<p>Variables</p>";
		S += "					</div>";
		S += "					<div id='variables'>";
		S += "						<div class='member-list'>";
		S += "							<table cellspacing='0'>";
		S += "								<tbody>";
		S += "									<tr class = 'header-row'>";
		S += "										<th class = 'icon-cell' style = 'width:8%'>";
		S += "										</th>";
		S += "										<th class = 'type-cell' style = 'width:10%'>";
		S += "										</th>";
		S += "										<th class = 'name-cell' style = 'width:15%'>";
		S += "											Name";
		S += "										</th>";
		S += "										<th class = 'desc-cell'>";
		S += "											Description";
		S += "										</th>";
		S += "									</tr>";
		for (var i = 0; i < classInfo.variables.length; ++i)
		{
			let elem = classInfo.variables[i];
			S += "									<tr class='normal-row'>";
			S += "										<td class='icon-cell'>";
			S += "											<p>";
			if (elem.accessSpecifier == "U")
			{
				S += "												<img alt='Public variable' title='Public variable' width='18' src='https://docs.unrealengine.com/Images/api_variable_public.png'>";
			}
			else if (elem.accessSpecifier == "O")
			{
				S += "												<img alt='Protected variable' title='Protected variable' width='18' src='https://docs.unrealengine.com/Images/api_variable_protected.png'>";
			}
			S += "											</p>";
			S += "										</td>";
			S += "										<td class='name-cell' align='right'>";
			S += "											<span class= 'type-span'>";
			S += "												<p>";
			S += "													<span>";
			if (elem.bIsConstexpr)
			{
				S += "constexpr ";
			}
			if (elem.bIsConst)
			{
				S += "const ";
			}
			S += elem.typeName;
			S += toHTMLString_ReturnValueTemplateValues(elem.templateValues);
			S += " ";
			for (var j = 0; j < elem.pointers.length; ++j)
			{
				let ptrElem = elem.pointers[i];
				S += pointerToHTML(ptrElem);
			}
			if (elem.bitFieldValue.length > 0)
			{
				S += " : " + elem.bitFieldValue;
			}
			S += "											</p>";
			S += "										</span>";
			S += "										&nbsp;";
			S += "									</td>";
			S += "									<td class='name-cell'>";
			if (createLinkOnVariableName(elem))
			{
				S += "									<a class='docTool_ClassVariableListLink'>";
				S += "										<p>" + elem.name + "</p>";
				S += "									</a>";
			}
			else
			{
				S += "										<p>" + elem.name + "</p>";
			}
			S += "									</td>";
			S += "									<td class='desc-cell'>";
			S += "										<p>";
			S += "											" + elem.comment;
			S += "										</p>";
			S += "									</td>";
			S += "								</tr>";
		}
		S += "							</tbody>";
		S += "						</table>";
		S += "					</div>";
		S += "				</div>";
	}
	let constructorsArray = [];
	for (var i = 0; i < classInfo.functions.length; ++i)
	{
		let func = classInfo.functions[i];
		if (func.bIsConstructor)
		{
			constructorsArray.push(func);
		}
	}
	let bAtLeastOneConstructor = constructorsArray.length > 0;
	if (bAtLeastOneConstructor)
	{
		S += "			<div class='heading expanded'>";
		S += "				<p>Constructors</p>";
		S += "			</div>";
		S += "			<div id='constructor'>";
		S += "				<div class='member-list'>";
		S += "					<table cellspacing='0'>";
		S += "						<tbody>";
		S += "							<tr class='header-row'>";
		S += "								<th class='icon-cell' style='width:10%'>";
		S += "								</th>";
		S += "								<th class='name-cell' style='width:15%'>";
		S += "									Name";
		S += "								</th>";
		S += "								<th class='desc-cell'>";
		S += "									Description";
		S += "								</th>";
		S += "							</tr>";
		for (var i = 0; i < constructorsArray.length; ++i)
		{
			let ctorElem = constructorsArray[i];
			S += "								<tr class='normal-row'>";
			S += "									<td class='icon-cell'>";
			S += "										<p>";
			if (ctorElem.accessSpecifier == "U")
			{
				S += "											<img alt='Public function' title='Public function' width='18' src='https://docs.unrealengine.com/Images/api_function_public.png'>";
			}
			else if (ctorElem.accessSpecifier == "O")
			{
				S += "											<img alt='Protected function' title='Protected function' width='18' src='https://docs.unrealengine.com/Images/api_function_protected.png'>";
			}
			S += "										</p>";
			S += "									</td>";
			S += "									<td class='name-cell'>";
			S += "										<nobr>";
			if (ctorElem.parameters.length == 0)
			{
				S += "											<p>" + ctorElem.name + "()</p>";
			}
			else
			{
				S += "											<p>" + ctorElem.name + "</p>";
			}
			S += "										</nobr>";
			S += "									<div class='name-cell-arguments'>";
			if (ctorElem.parameters.length > 0)
			{
				S += "										<p>";
				S += "											(";
				S += "											<br>";
				for (var j = 0; j < ctorElem.parameters.array.length; ++j)
				{
					let paramElem = ctorElem.parameters.array[j];
					S += "											&nbsp;&nbsp;&nbsp;&nbsp;";
					S += toHTMLString_FunctionParameter(paramElem) + ",<br>";
				}
				S = S.slice(0, -5);
				S += "											<br>);<br>";
				S += "										</p>";
			}
			S += "									</div>";
			S += "								</td>";
			S += "								<td class='desc-cell'>";
			S += "									<p>";
			S += "										" + ctorElem.comment;
			S += "									</p>";
			S += "								</td>";
			S += "							</tr>";
		}
		S += "						</tbody>";
		S += "					</table>";
		S += "				</div>";
		S += "			</div>";
	}
	if (classInfo.functions.length > constructorsArray.length)
	{
		S += "			<div class='heading expanded'>";
		S += "				<p>Functions</p>";
		S += "			</div>";
		S += "			<div id='functions_0'>";
		S += "				<div class='member-list'>";
		S += "					<table cellspacing='0'>";
		S += "						<tbody>";
		S += "							<tr class = 'header-row'>";
		S += "								<th class='icon-cell' style='width:10%'>";
		S += "								</th>";
		S += "								<th class='name-cell' style = 'width:8%;'>";
		S += "								</th>";
		S += "								<th class='name-cell' style = 'width:15%;'>";
		S += "									Name";
		S += "								</th>";
		S += "								<th class='desc-cell'>";
		S += "									Description";
		S += "								</th>";
		S += "							</tr>";
		for (var i = 0; i < classInfo.functions.length; ++i)
		{
			let func = classInfo.functions[i];
			if (func.bIsConstructor == false && func.bIsDestructor == false)
			{
				S += "							<tr class='normal-row'>";
				S += "								<td class='icon-cell'>";
				S += "									<p>";
				if (func.accessSpecifier == "U")
				{
					S += "											<img alt='Public function' title='Public function' width='18' src='https://docs.unrealengine.com/Images/api_function_public.png'>";
				}
				else if (func.accessSpecifier == "O")
				{
					S += "											<img alt='Protected function' title='Protected function' width='18' src='https://docs.unrealengine.com/Images/api_function_protected.png'>";
				}
				if (func.bIsStatic)
				{
					S += "											<img alt='Static' title='Static' width='18' src='https://docs.unrealengine.com/Images/api_function_static.png'>";
				}
				else if (func.bDeclaredWithVirtualKeyword || func.classThisOverridesFrom.length > 0)
				{
					S += "											<img alt='Virtual' title='Virtual' width='18' src='https://docs.unrealengine.com/Images/api_function_virtual.png'>";
				}
				if (func.bIsConst)
				{
					S += "											<img alt='Const' title='Const' width='18' src='https://docs.unrealengine.com/Images/api_function_const.png'>";
				}
				S += "									</p>";
				S += "								</td>";
				S += "								<td class='name-cell' align='right'>";
				S += "									<span class='type-span'>";
				S += "										<p>";
				if (func.bIsReturnValueConst)
				{
					S += "const ";
				}
				S += func.returnValue;
				S += toHTMLString_ReturnValueTemplateValues(func.returnValueTemplateValues);
				if (func.returnValuePointers.length > 0)
				{
					S += " ";
					for (var j = 0; j < func.returnValuePointers.length; ++j)
					{
						let returnValueElem = func.returnValuePointers[j];
						S += pointerToHTML(returnValueElem);
					}
				}
				S += "										</p>";
				S += "									</span>";
				S += "								</td>";
				S += "								<td class='name-cell'>";
				S += "									<a class='docTool_ClassFunctionListLink'>";
				S += "										<nobr>";
				if (func.parameters.array.length == 0)
				{
					S += "											<p>" + func.name + "()</p>";
				}
				else
				{
					S += "											<p>" + func.name + "</p>";
				}
				S += "										</nobr>";
				S += "									</a>";
				S += "									<div class='name-cell-arguments'>";
				if (func.parameters.array.length > 0)
				{
					S += "										<p>";
					S += "											(";
					S += "											<br>";
					for (var j = 0; j < func.parameters.array.length; ++j)
					{
						let paramElem = func.parameters.array[j];
						S += "											&nbsp;&nbsp;&nbsp;&nbsp;";
						S += toHTMLString_FunctionParameter(paramElem) + ",<br>";
					}
					S = S.slice(0, -5);
					S += "											<br>)<br>";
					S += "										</p>";
				}
				S += "									</div>";
				S += "								</td>";
				S += "								<td class='desc-cell'>";
				S += "									<p>";
				S += "										" + func.comment;
				S += "									</p>";
				S += "								</td>";
				S += "							</tr>";
			}
		}
		S += "						</tbody>";
		S += "					</table>";
		S += "				</div>";
		S += "			</div>";
	}
	S += "		</div>";

	document.getElementById("webThree").innerHTML = S;
}


// Just like setupLinks_ClassFunctions() except this does variables instead
function setupLinks_ClassVariables()
{
	let variable_a_elements = document.getElementsByClassName('docTool_ClassVariableListLink');
	for (var i = 0; i < variable_a_elements.length; ++i)
	{
		let a = variable_a_elements[i];
		let text = a.getElementsByTagName('P')[0].innerHTML;
		let link = "Variables/" + text + ".html";
		a.href = link;
	}
}

/* This function sets values to the href of the <a> elements for functions
in a class's list of functions */
function setupLinks_ClassFunctions()
{
	let function_a_elements = document.getElementsByClassName('docTool_ClassFunctionListLink');
	for (var i = 0; i < function_a_elements.length; ++i)
	{
		let a = function_a_elements[i];
		let text = a.getElementsByTagName('P')[0].innerHTML;
		let link = undefined;
		if (text.endsWith('()'))
		{
			// Remove the brackets at the end - should just be left with function name
			link = "Functions/" + text.slice(0, -2) + ".html";
		}
		else
		{
			link = "Functions/" + text + ".html";
		}
		a.href = link;
	}
}

