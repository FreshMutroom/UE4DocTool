//-------------------------------------------------------------
// Documentation created: Tue, 30 Jun 2020 21:14:03 GMT
//-------------------------------------------------------------


let head = document.getElementsByTagName('head')[0];
let script = document.createElement('script');
script.src = 'https://rawgit.com/farzher/fuzzysort/master/fuzzysort.js';
script.type = 'text/javascript';
head.appendChild(script);


//----------------------------------------------------------
//	---------- Classes -----------
//----------------------------------------------------------

/**
 *
 */
class SearchData
{
	constructor(inSearchName, inAltSearchName, inRelativeURL, inDescription, inFilterFlags)
	{
		this.searchName = inSearchName;
		this.altSearchName = inAltSearchName;
		this.relativeURL = inRelativeURL;
		this.description = inDescription;
		this.filterFlags = inFilterFlags;
	}
};


//----------------------------------------------------------
//	---------- Functions -----------
//----------------------------------------------------------

function getActiveCustomFilterCheckboxes(customFilterType, customFilterTypeDefinedInParams, inFilterString)
{
	/* Check if the page's params have a custom filter (if statement checks for a custom 'OR'
	filter while else if statement checks for a custom 'AND' filter). If yes then
	we will override the local storage's value with the param's. The
	reason we do this is that users can delete their local storage (e.g. via browser)
	and so if we only go by that then the page will be showing search results
	for the custom filter but all the filter checkboxes will be unchecked
	which may be confusing for the user if they glance at the filter checkboxes,
	see everything is unchecked and then wonder what is the custom filter
	value for this search? (if they check the page's params they will find out
	but I don't really expect people to do that) */
	if (customFilterTypeDefinedInParams === 'OR' && bHaveUpdatedLocalStorageUsingPageParams == false)
	{
		// Get the sub string that is minus the 'custom_OR_['
		// at the start and ']' at the end
		let str = inFilterString.substring(11).slice(0, -1);
		// Add comma at end cause that's how local storage likes it
		str += ',';
		window.localStorage.setItem('_checkedCustomFilterCheckboxes', str);

		bHaveUpdatedLocalStorageUsingPageParams = true;
	}
	else if (customFilterTypeDefinedInParams === 'AND' && bHaveUpdatedLocalStorageUsingPageParams == false)
	{
		// Get the sub string that is minus the 'custom_AND_['
		// at the start and ']' at the end
		let str = inFilterString.substring(12).slice(0, -1);
		// Add comma at end cause that's how local storage likes it
		str += ',';
		window.localStorage.setItem('_checkedCustomFilterCheckboxes', str);

		bHaveUpdatedLocalStorageUsingPageParams = true;
	}

	let set = new Set();
	let checkedCheckboxesStr = window.localStorage.getItem(customFilterType);
	if (checkedCheckboxesStr != null)
	{
		let idx = 0;
		let parsedId = '';
		while (true)
		{
			// Check if at end of string
			if (idx == checkedCheckboxesStr.length)
			{
				break;
			}

			let c = checkedCheckboxesStr[idx++];

			if (c == ',')
			{
				let checkbox = document.getElementById(parsedId);
				if (checkbox != null)
				{
					set.add(checkbox);
				}
				parsedId = '';
			}
			else
			{
				parsedId += c;
			}
		}
	}
	return set;
}

class ASingleFilter
{
	constructor()
	{
		// If the item has any one of these flags then it will not
		// appear as a result of a search
		this.excludeFilter = 0n;

		this.filter = 0n;
	}
}

class AdvancedCustomFilter
{
	constructor()
	{
		this.excludeFilter = 0n;
		this.filters = [];
	}
}

function getSingleFilterUsingFilterString(inFilterString)
{
	let filter = new ASingleFilter();
	let idx = 1;  // Start at 1 to skip over'['
	let str = '';
	while (true)
	{
		let c = inFilterString[idx];
		idx++;

		if (c == '(')
		{
			// Skip
		}
		else if (c == ',')
		{
			filter.filter = BigInt(str);
			str ='';
		}
		else if (c == ')')
		{
			filter.excludeFilter = BigInt(str);
			break;
		}
		else
		{
			str += c;
		}
	}
	return filter;
}

function getFilterUsingFilterString(inFilterString)
{
	let filter = [];
	let idx = 1;  // Start at 1 to skip over '['
	let str = '';
	while (true)
	{
		let c = inFilterString[idx];
		idx++;

		if (c == '(')
		{
			// Skip
		}
		else if (c == ',')
		{
			singleFilter = new ASingleFilter();
			singleFilter.filter = BigInt(str);
			str ='';
		}
		else if (c == ')')
		{
			singleFilter.excludeFilter = BigInt(str);
			str ='';
			filter.push(singleFilter);
		}
		else if (c == ']')
		{
			break;
		}
		else
		{
			str += c;
		}
	}
	return filter;
}

/* Very similar to getCustomANDFilter. Returns an array of
ASingleFilter */
function getCustomORFilter(inActiveCustomFilterCheckboxes)
{
	let filter = [];
	for (let checkbox of inActiveCustomFilterCheckboxes)
	{
		let array = [];
		let singleFilter = null;
		let checkboxsFilterString = checkbox.getAttribute('data-filter');
		let idx = 1;  // Start at 1 to skip over '['
		let str = '';
		while (true)
		{
			let c = checkboxsFilterString[idx];
			idx++;

			if (c == '(')
			{
				// Skip
			}
			else if (c == ',')
			{
				singleFilter = new ASingleFilter();
				singleFilter.filter = BigInt(str);
				str ='';
			}
			else if (c == ')')
			{
				singleFilter.excludeFilter = BigInt(str);
				str ='';
				array.push(singleFilter);
			}
			else if (c == ']')
			{
				filter.push(array);
				break;
			}
			else
			{
				str += c;
			}
		}
	}
	return filter;
}

function getCustomANDFilter(inActiveCustomFilterCheckboxes)
{
	let filter = new AdvancedCustomFilter();
	for (let checkbox of inActiveCustomFilterCheckboxes)
	{
		let checkboxsNotFilter = checkbox.getAttribute('data-antiFilter');
		filter.excludeFilter = filter.excludeFilter | BigInt(checkboxsNotFilter);

		let array = [];
		let singleFilter = null;
		let checkboxsFilterString = checkbox.getAttribute('data-filter');
		let idx = 1;  // Start at 1 to skip over '['
		let str = '';
		while (true)
		{
			let c = checkboxsFilterString[idx];
			idx++;

			if (c == '(')
			{
				// Skip
			}
			else if (c == ',')
			{
				singleFilter = new ASingleFilter();
				singleFilter.filter = BigInt(str);
				str ='';
			}
			else if (c == ')')
			{
				singleFilter.excludeFilter = BigInt(str);
				str ='';
				array.push(singleFilter);
			}
			else if (c == ']')
			{
				filter.filters.push(array);
				break;
			}
			else
			{
				str += c;
			}
		}
	}
	return filter;
}

function getSearchResultsPageURL(inRelativePathingToSearchPage)
{
	return inRelativePathingToSearchPage + 'search.html';
}

/** Sets up a button so that when it is clicked a search will happen */
function setupPerformSearchButton(inButton, inSearchBoxForm, inRelativePathingToSearchPage)
{
	inButton.addEventListener('click', function(event)
	{
		let urlString = getSearchResultsPageURL(inRelativePathingToSearchPage);
		let input = inSearchBoxForm.getElementsByClassName('searchbox')[0];
		urlString += '?keyword=' + input.value;
		let urlParams = new URLSearchParams(window.location.search);
		let filter = undefined;
		if (urlParams.has('filter'))
		{
			filter = urlParams.get('filter');
		}
		else
		{
			filter = inSearchBoxForm.getAttribute('data-filter');
		}
		urlString += '&filter=' + filter;
		window.location.href = urlString;
	});
}

/**
 *	Call this on the search box form element to set it all up
 *	for searches
 *
 * @param inRelativePathingToSearchPage - a series of "../" that will lead
 * back to the search page's folder
 *	@param inNumSearchSuggestions - how many drop down suggestions should
 *	appear when using this search box. Can use 0 if you want none
 *	@param inDefaultFilter - what filter the search box should use by default e.g.
 *	if the search box is on the Blueprint API home page maybe you only want
 *	searches from that box to include Blueprint callable functions or something.
 *	The default value for this parameter is 'everything except constructors and
 *	destructors'
 *	@param inPlaceholderText - placeholder text to appear in search box.
 *	You might wanna make this match your inDefaultFilter i.e. if the filter
 *	only searches functions then your placeholder text might wanna be
 *	something like 'Search Functions...'
 */
function setupSearchBox(inSearchBoxForm, inRelativePathingToSearchPage, inNumSearchSuggestions = 8, inDefaultFilter = 'basic_OR_[(0xffffffffffffffff,0x0000000180000000)]', inPlaceholderText = 'Search Documentation...')
{
	//-------------------------------------------
	//	Helper Functions
	//-------------------------------------------

	// What is 'keyboard' highlighting? See
	// https://www.w3schools.com/howto/howto_js_autocomplete.asp
	// (the site doesn't explicity explain but if you use their
	// search box: whenever elements get highlighted blue that's
	// keyboard highlighted)
	function keyboardHighlight(inSearchBoxForm, inInputElement, inListElement)
	{
		inListElement.style.backgroundColor = 'DodgerBlue';
		inInputElement.value = inListElement.textContent;
	}

	function unKeyboardHighlight(inSearchBoxForm, inInputElement, inListElement)
	{
		/* Check if the element is being moused over */
		if (inListElement.matches(':hover'))
		{
			inListElement.style.backgroundColor = '#e9e9e9';
		}
		else
		{
			inListElement.style.backgroundColor = '#ffffff';
		}
		/* Revert text back to what the user typed/pasted/whatever as
		opposed to what the suggestion was */
		inInputElement.value = inSearchBoxForm.getAttribute('data-userInputedText');
	}

	//-------------------------------------------

	var input = inSearchBoxForm.getElementsByClassName('searchbox')[0];
	input.placeholder = inPlaceholderText;

	inSearchBoxForm.setAttribute('data-maxNumSuggestions', inNumSearchSuggestions.toString());
	inSearchBoxForm.setAttribute('data-currentNumSuggestions', '0');
	// -1 means nothing keyboard highlighted
	inSearchBoxForm.setAttribute('data-keyboardHighlightedSuggestionIndex', '-1');
	inSearchBoxForm.setAttribute('data-userInputedText', '');
	inSearchBoxForm.setAttribute('data-filter', inDefaultFilter);

	inSearchBoxForm.addEventListener('input', function(keyEvent)
	{
		let input = this.getElementsByClassName('searchbox')[0];
		let enteredText = input.value;

		this.setAttribute('data-userInputedText', enteredText);

		// Remove spaces from the start and end of the string
		let postProcessedText = enteredText.trim();
		// Replace runs of spaces/tabs/newlines/etc with a single space
		postProcessedText = postProcessedText.replace(/\s\s+/g, ' ');

		// maxNumSuggestions is a better name
		let numSuggestions = parseInt(this.getAttribute('data-maxNumSuggestions'));
		if (numSuggestions <= 0)
		{
			return false;
		}

		const options = {
			allowTypo: false,
			keys: ['searchName', 'altSearchName'],
			/* Score function that treats searchName and altSearchName equal
			Uhh, I *think* that might happen by default so I have commented it */
			//scoreFn: a => Math.max(a[0] ? a[0].score : -100000, a[1] ? a[1].score : -100000)
		};

		let results = undefined;
		let filter = undefined;
		let urlParams = new URLSearchParams(window.location.search);
		if (urlParams.has('filter'))
		{
			filter = urlParams.get('filter');
		}
		else
		{
			filter = this.getAttribute('data-filter');
		}

		let customFilterType = 'no';
		let activeCustomAdvancedFilterCheckboxes = new Set();
		if (filter.startsWith('custom_OR_'))
		{
			customFilterType = 'OR';
			activeCustomAdvancedFilterCheckboxes = getActiveCustomFilterCheckboxes('_checkedCustomFilterCheckboxes', customFilterType, filter);
		}
		else if (filter.startsWith('custom_AND_'))
		{
			customFilterType = 'AND';
			activeCustomAdvancedFilterCheckboxes = getActiveCustomFilterCheckboxes('_checkedCustomFilterCheckboxes', customFilterType, filter);
		}

		// -1 means no filter i.e. include everything
		if (filter == '-1')
		{
			results = fuzzysort.go(postProcessedText, searchData, options);
		}
		else
		{
			if (customFilterType === 'OR')
			{
				let ORFilter = getCustomORFilter(activeCustomAdvancedFilterCheckboxes);
				results = fuzzysort.go(postProcessedText, searchData.filter(function(x)
				{
					for (let a of ORFilter)
					{
						for (let b of a)
						{
							if (((x.filterFlags & b.excludeFilter) == 0n) && ((x.filterFlags & b.filter) == b.filter))
							{
								return true;
							}
						}
					}
					return false;
				}), options);
			}
			else if (customFilterType === 'AND')
			{
				let ANDFilter = getCustomANDFilter(activeCustomAdvancedFilterCheckboxes);
				results = fuzzysort.go(postProcessedText, searchData.filter(function(x)
				{
					if ((x.filterFlags & ANDFilter.excludeFilter) != 0n)
					{
						return false;
					}

					for (let a of ANDFilter.filters)
					{
						let bInclude = false;
						for (let b of a)
						{
							if (((x.filterFlags & b.excludeFilter) == 0n) && ((x.filterFlags & b.filter) == b.filter))
							{
								bInclude = true;
								break;
							}
						}

						if (bInclude == false)
						{
							return false;
						}
					}

					return true;
				}), options);
			}
			else
			{
				if (filter.startsWith('basic_OR_'))
				{
					let theFilter = getSingleFilterUsingFilterString(filter.substring(9));
					results = fuzzysort.go(postProcessedText, searchData.filter(function(x)
					{
						return ((x.filterFlags & theFilter.filter) != 0n) && ((x.filterFlags & theFilter.excludeFilter) == 0n);
					}), options);
				}
				else
				{
					let ANDFilter = getFilterUsingFilterString(filter);
					results = fuzzysort.go(postProcessedText, searchData.filter(function(x)
					{
						for (let a of ANDFilter)
						{
							if (((x.filterFlags & b.excludeFilter) == 0n) && ((x.filterFlags & b.filter) == b.filter))
							{
								return true;
							}
						}
						return false;
					}), options);
				}
			}
		}
		let finalResults = [];
		for (let i = 0; i < results.length; ++i)
		{
			let elem = results[i];
			let bFound = false;
			/* Here we are checking if suggestions with the same display name
			were added into results. If yes we wanna take them out i.e you
			don't want to type "hea" and see 10 "Health" as suggestions - 
			you just want 1 right? + other phrases like "MaxHealth" etc
			*/
			for (let j = 0; j < finalResults.length; ++j)
			{
				let innerElem = finalResults[j];
				if (innerElem[0] == elem[0])
				{
					bFound = true;
					break;
				}
			}

			if (bFound == false)
			{
				finalResults.push(elem);
				if (finalResults.length == numSuggestions)
				{
					break;
				}
			}
		}

		this.setAttribute('data-currentNumSuggestions', finalResults.length.toString());

		//---------------------------------------------------
		// -------- Update visuals --------
		//---------------------------------------------------
		let suggestionElements = this.getElementsByClassName('searchSuggestion');
		for (let i = 0; i < finalResults.length; ++i)
		{
			/* finalResults[i][0] will be null I think if the alt
			name had a higher score, so null check first */
			suggestionElements[i].textContent = (finalResults[i][0] != null ? finalResults[i][0].target : finalResults[i][1].target);
			suggestionElements[i].style.visibility = 'visible';
		}
		// Make remaining list elements hidden
		for (let i = finalResults.length; i < numSuggestions; ++i)
		{
			suggestionElements[i].style.visibility = 'hidden';
		}

		// Unkeyboard highlight keyboard highlighted list element if any
		let keyboardHighlightedIndex = parseInt(this.getAttribute('data-keyboardHighlightedSuggestionIndex'));
		if (keyboardHighlightedIndex != -1)
		{
			unKeyboardHighlight(this, input, suggestionElements[keyboardHighlightedIndex]);
			keyboardHighlightedIndex = -1;
			this.setAttribute('data-keyboardHighlightedSuggestionIndex', keyboardHighlightedIndex.toString());
		}

		let suggestionsDiv = this.getElementsByClassName('suggestionsDiv')[0];
		if (finalResults.length > 0)
		{
			suggestionsDiv.style.display = 'block';
		}
		else
		{
			suggestionsDiv.style.display = 'none';
		}
	}, false);

	inSearchBoxForm.addEventListener('keydown', function(keyEvent)
	{
		let input = this.getElementsByClassName('searchbox')[0];

		// Check if down arrow was pressed
		if (keyEvent.keyCode == 40)
		{
			// Prevent blinker from going to the end of text
			keyEvent.preventDefault();

			let currentNumSuggestions = parseInt(this.getAttribute('data-currentNumSuggestions'));
			let activeSuggestionIndex = parseInt(this.getAttribute('data-keyboardHighlightedSuggestionIndex'));
			if (activeSuggestionIndex + 1 < currentNumSuggestions)
			{
				let suggestionElements = this.getElementsByClassName('searchSuggestion');

				if (activeSuggestionIndex != -1)
				{
					// Un-highlight previous suggestion
					unKeyboardHighlight(this, input, suggestionElements[activeSuggestionIndex]);
				}

				activeSuggestionIndex++;
				this.setAttribute('data-keyboardHighlightedSuggestionIndex', activeSuggestionIndex.toString());

				// Highlight new suggestion
				keyboardHighlight(this, input, suggestionElements[activeSuggestionIndex]);
			}
		}
		// Check if up arrow was pressed
		else if (keyEvent.keyCode == 38)
		{
			// Prevent blinker from going to the start of text
			keyEvent.preventDefault();

			let activeSuggestionIndex = parseInt(this.getAttribute('data-keyboardHighlightedSuggestionIndex'));
			if (activeSuggestionIndex != -1)
			{
				let suggestionElements = this.getElementsByClassName('searchSuggestion');

				// Un-highlight previous suggestion
				unKeyboardHighlight(this, input, suggestionElements[activeSuggestionIndex]);

				activeSuggestionIndex--;
				this.setAttribute('data-keyboardHighlightedSuggestionIndex', activeSuggestionIndex.toString());

				if (activeSuggestionIndex != -1)
				{
					// Highlight new suggestion
					keyboardHighlight(this, input, suggestionElements[activeSuggestionIndex]);
				}
			}
		}
	}, false);

	inSearchBoxForm.addEventListener('submit', function(e)
	{
		e.preventDefault();

		let urlString = getSearchResultsPageURL(inRelativePathingToSearchPage);
		let input = this.getElementsByClassName('searchbox')[0];
		urlString += '?keyword=' + input.value;
		let urlParams = new URLSearchParams(window.location.search);
		let filter = undefined;
		if (urlParams.has('filter'))
		{
			filter = urlParams.get('filter');
		}
		else
		{
			filter = this.getAttribute('data-filter');
		}
		urlString += '&filter=' + filter;
		window.location.href = urlString;
	}, false);

	/* Create dropdown suggestions elements if that's what you want */
	if (inNumSearchSuggestions > 0)
	{
		var resultsDiv = document.createElement('DIV');
		resultsDiv.className = 'suggestionsDiv';
		resultsDiv.style.visibility = 'hidden';
		resultsDiv.style.position = 'fixed';
		inSearchBoxForm.appendChild(resultsDiv);
		var list = document.createElement('UL');
		list.className = 'suggestionsList';
		list.style.listStyleType = 'none';
		list.style.textAlign = 'left';
		list.style.margin = '0';
		// Set padding equal to input box so suggestions line up
		// with the search box text. Do margin too? (currently I just set it to 0)
		list.style.paddingLeft = window.getComputedStyle(input).paddingLeft;
		resultsDiv.appendChild(list);
		for (let i = 0; i < inNumSearchSuggestions; ++i)
		{
			let li = document.createElement('LI');
			li.className = 'searchSuggestion';
			li.setAttribute('data-listIndex', i.toString());
			li.addEventListener('mouseover', function(event)
			{
				/* Check if this list element is the keyboard highlighted element.
				If yes then we want to do nothing. Basically
				we want the keyboard highlight effect to show and
				not the mouse highlight effect - we consider the
				keyboard highlight effect 'stronger' */
				let keyboardHighlightedIndex = this.parentElement.parentElement.parentElement.getAttribute('data-keyboardHighlightedSuggestionIndex');
				let ourIndex = this.getAttribute('data-listIndex');
				if (ourIndex != keyboardHighlightedIndex)
				{
					this.style.backgroundColor = '#e9e9e9';
				}
			});
			li.addEventListener('mouseout', function(event)
			{
				let keyboardHighlightedIndex = this.parentElement.parentElement.parentElement.getAttribute('data-keyboardHighlightedSuggestionIndex');
				let ourIndex = this.getAttribute('data-listIndex');
				if (ourIndex != keyboardHighlightedIndex)
				{
					this.style.backgroundColor = '#ffffff';
				}
			});
			li.addEventListener('click', function(event)
			{
				let urlString = getSearchResultsPageURL(inRelativePathingToSearchPage);
				urlString += '?keyword=' + this.textContent;
				let urlParams = new URLSearchParams(window.location.search);
				let filter = undefined;
				if (urlParams.has('filter'))
				{
					filter = urlParams.get('filter');
				}
				else
				{
					filter = this.parentElement.parentElement.parentElement.getAttribute('data-filter');
				}
				urlString += '&filter=' + filter;
				window.location.href = urlString;
			});
			li.addEventListener('mousedown', function(event)
			{
				/* Do preventDefault() here to stop the list element
				taking focus. I do this because: I have an onblur event
				for the input textbox that causes the dropdown list to
				become invisible. However if that happens it means that
				when the mouse is released we will always miss the list
				element i.e. it is unclickable.
				There is 1 slight undesired piece of behavior to how I have
				coded all this: if a user mouse downs on a dropwdown list
				element then mouseups somewhere else then focus does not change. */
				event.preventDefault();
			});
			list.appendChild(li);
		}
	}

	input.addEventListener('blur', function(event)
	{
		// Hide the dropdown suggestions
		let suggestionsDiv = document.getElementsByClassName('suggestionsDiv')[0];
		suggestionsDiv.style.display = 'none';
	});

}

function registerSearchData(inSearchName, inAltSearchName, inRelativeURL, inDescription, inFilterFlags)
{
	searchData.push(new SearchData(inSearchName, inAltSearchName, inRelativeURL, inDescription, inFilterFlags));
}


//----------------------------------------------------------
//	---------- Variables -----------
//----------------------------------------------------------

/* This variable exists to avoid calling window.localStorage.setItem(..., ...)
multiple times when it really only needs to be done once. I don't know how
browsers handle localStorage.setItem - my ideas:
1. it writes to RAM (and then at
some time later writes to disk, either when it is 'quiet' or when the browser
closes)
2. every call to setItem causes a write to disk

If it's option 2 then this variable is here to avoid multiple innecessary
writes to disk (for performance) */
let bHaveUpdatedLocalStorageUsingPageParams = false;

// Array of class SearchData
var searchData = [];


//----------------------------------------------------
//  ------- Begin Advanced Search Filters Code -------
//----------------------------------------------------

// Maps unique ID of filter to an array of filters that are incompatible with it
let advancedFiltersToIncompatibleAdvancedFilters = new Map();
advancedFiltersToIncompatibleAdvancedFilters.set('advancedFilter_0', []);
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_0').push('advancedFilter_1');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_0').push('advancedFilter_2');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_0').push('advancedFilter_12');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_0').push('advancedFilter_14');
advancedFiltersToIncompatibleAdvancedFilters.set('advancedFilter_1', []);
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_1').push('advancedFilter_0');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_1').push('advancedFilter_2');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_1').push('advancedFilter_3');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_1').push('advancedFilter_4');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_1').push('advancedFilter_5');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_1').push('advancedFilter_6');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_1').push('advancedFilter_8');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_1').push('advancedFilter_9');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_1').push('advancedFilter_10');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_1').push('advancedFilter_11');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_1').push('advancedFilter_12');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_1').push('advancedFilter_13');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_1').push('advancedFilter_14');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_1').push('advancedFilter_16');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_1').push('advancedFilter_22');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_1').push('advancedFilter_23');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_1').push('advancedFilter_24');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_1').push('advancedFilter_25');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_1').push('advancedFilter_26');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_1').push('advancedFilter_27');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_1').push('advancedFilter_28');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_1').push('advancedFilter_30');
advancedFiltersToIncompatibleAdvancedFilters.set('advancedFilter_2', []);
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_2').push('advancedFilter_0');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_2').push('advancedFilter_1');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_2').push('advancedFilter_5');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_2').push('advancedFilter_6');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_2').push('advancedFilter_9');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_2').push('advancedFilter_10');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_2').push('advancedFilter_11');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_2').push('advancedFilter_13');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_2').push('advancedFilter_16');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_2').push('advancedFilter_22');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_2').push('advancedFilter_23');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_2').push('advancedFilter_24');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_2').push('advancedFilter_25');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_2').push('advancedFilter_26');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_2').push('advancedFilter_27');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_2').push('advancedFilter_28');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_2').push('advancedFilter_30');
advancedFiltersToIncompatibleAdvancedFilters.set('advancedFilter_3', []);
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_3').push('advancedFilter_1');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_3').push('advancedFilter_4');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_3').push('advancedFilter_5');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_3').push('advancedFilter_6');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_3').push('advancedFilter_7');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_3').push('advancedFilter_8');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_3').push('advancedFilter_9');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_3').push('advancedFilter_10');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_3').push('advancedFilter_13');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_3').push('advancedFilter_14');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_3').push('advancedFilter_15');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_3').push('advancedFilter_16');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_3').push('advancedFilter_17');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_3').push('advancedFilter_21');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_3').push('advancedFilter_22');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_3').push('advancedFilter_25');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_3').push('advancedFilter_26');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_3').push('advancedFilter_27');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_3').push('advancedFilter_28');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_3').push('advancedFilter_29');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_3').push('advancedFilter_30');
advancedFiltersToIncompatibleAdvancedFilters.set('advancedFilter_4', []);
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_4').push('advancedFilter_1');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_4').push('advancedFilter_3');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_4').push('advancedFilter_5');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_4').push('advancedFilter_6');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_4').push('advancedFilter_7');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_4').push('advancedFilter_8');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_4').push('advancedFilter_9');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_4').push('advancedFilter_10');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_4').push('advancedFilter_13');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_4').push('advancedFilter_14');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_4').push('advancedFilter_15');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_4').push('advancedFilter_16');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_4').push('advancedFilter_17');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_4').push('advancedFilter_21');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_4').push('advancedFilter_22');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_4').push('advancedFilter_23');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_4').push('advancedFilter_24');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_4').push('advancedFilter_26');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_4').push('advancedFilter_27');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_4').push('advancedFilter_28');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_4').push('advancedFilter_29');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_4').push('advancedFilter_30');
advancedFiltersToIncompatibleAdvancedFilters.set('advancedFilter_5', []);
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_5').push('advancedFilter_1');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_5').push('advancedFilter_2');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_5').push('advancedFilter_3');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_5').push('advancedFilter_4');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_5').push('advancedFilter_6');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_5').push('advancedFilter_7');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_5').push('advancedFilter_8');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_5').push('advancedFilter_9');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_5').push('advancedFilter_10');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_5').push('advancedFilter_11');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_5').push('advancedFilter_12');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_5').push('advancedFilter_13');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_5').push('advancedFilter_14');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_5').push('advancedFilter_15');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_5').push('advancedFilter_16');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_5').push('advancedFilter_17');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_5').push('advancedFilter_21');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_5').push('advancedFilter_22');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_5').push('advancedFilter_23');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_5').push('advancedFilter_24');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_5').push('advancedFilter_25');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_5').push('advancedFilter_27');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_5').push('advancedFilter_28');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_5').push('advancedFilter_29');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_5').push('advancedFilter_30');
advancedFiltersToIncompatibleAdvancedFilters.set('advancedFilter_6', []);
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_6').push('advancedFilter_1');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_6').push('advancedFilter_2');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_6').push('advancedFilter_3');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_6').push('advancedFilter_4');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_6').push('advancedFilter_5');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_6').push('advancedFilter_7');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_6').push('advancedFilter_8');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_6').push('advancedFilter_9');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_6').push('advancedFilter_10');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_6').push('advancedFilter_11');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_6').push('advancedFilter_12');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_6').push('advancedFilter_13');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_6').push('advancedFilter_14');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_6').push('advancedFilter_15');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_6').push('advancedFilter_16');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_6').push('advancedFilter_17');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_6').push('advancedFilter_18');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_6').push('advancedFilter_19');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_6').push('advancedFilter_20');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_6').push('advancedFilter_21');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_6').push('advancedFilter_22');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_6').push('advancedFilter_23');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_6').push('advancedFilter_24');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_6').push('advancedFilter_25');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_6').push('advancedFilter_26');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_6').push('advancedFilter_27');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_6').push('advancedFilter_28');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_6').push('advancedFilter_29');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_6').push('advancedFilter_30');
advancedFiltersToIncompatibleAdvancedFilters.set('advancedFilter_7', []);
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_7').push('advancedFilter_3');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_7').push('advancedFilter_4');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_7').push('advancedFilter_5');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_7').push('advancedFilter_6');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_7').push('advancedFilter_8');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_7').push('advancedFilter_11');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_7').push('advancedFilter_12');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_7').push('advancedFilter_13');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_7').push('advancedFilter_14');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_7').push('advancedFilter_24');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_7').push('advancedFilter_25');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_7').push('advancedFilter_26');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_7').push('advancedFilter_28');
advancedFiltersToIncompatibleAdvancedFilters.set('advancedFilter_8', []);
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_8').push('advancedFilter_1');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_8').push('advancedFilter_3');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_8').push('advancedFilter_4');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_8').push('advancedFilter_5');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_8').push('advancedFilter_6');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_8').push('advancedFilter_7');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_8').push('advancedFilter_9');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_8').push('advancedFilter_10');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_8').push('advancedFilter_11');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_8').push('advancedFilter_12');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_8').push('advancedFilter_13');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_8').push('advancedFilter_14');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_8').push('advancedFilter_16');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_8').push('advancedFilter_17');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_8').push('advancedFilter_23');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_8').push('advancedFilter_24');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_8').push('advancedFilter_25');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_8').push('advancedFilter_26');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_8').push('advancedFilter_27');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_8').push('advancedFilter_29');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_8').push('advancedFilter_30');
advancedFiltersToIncompatibleAdvancedFilters.set('advancedFilter_9', []);
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_9').push('advancedFilter_1');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_9').push('advancedFilter_2');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_9').push('advancedFilter_3');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_9').push('advancedFilter_4');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_9').push('advancedFilter_5');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_9').push('advancedFilter_6');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_9').push('advancedFilter_8');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_9').push('advancedFilter_10');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_9').push('advancedFilter_11');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_9').push('advancedFilter_12');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_9').push('advancedFilter_13');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_9').push('advancedFilter_14');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_9').push('advancedFilter_15');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_9').push('advancedFilter_16');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_9').push('advancedFilter_17');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_9').push('advancedFilter_21');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_9').push('advancedFilter_24');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_9').push('advancedFilter_25');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_9').push('advancedFilter_26');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_9').push('advancedFilter_27');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_9').push('advancedFilter_28');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_9').push('advancedFilter_29');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_9').push('advancedFilter_30');
advancedFiltersToIncompatibleAdvancedFilters.set('advancedFilter_10', []);
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_10').push('advancedFilter_1');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_10').push('advancedFilter_2');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_10').push('advancedFilter_3');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_10').push('advancedFilter_4');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_10').push('advancedFilter_5');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_10').push('advancedFilter_6');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_10').push('advancedFilter_8');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_10').push('advancedFilter_9');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_10').push('advancedFilter_11');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_10').push('advancedFilter_12');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_10').push('advancedFilter_13');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_10').push('advancedFilter_14');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_10').push('advancedFilter_15');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_10').push('advancedFilter_16');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_10').push('advancedFilter_21');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_10').push('advancedFilter_24');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_10').push('advancedFilter_25');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_10').push('advancedFilter_26');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_10').push('advancedFilter_27');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_10').push('advancedFilter_28');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_10').push('advancedFilter_29');
advancedFiltersToIncompatibleAdvancedFilters.set('advancedFilter_11', []);
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_11').push('advancedFilter_1');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_11').push('advancedFilter_2');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_11').push('advancedFilter_5');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_11').push('advancedFilter_6');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_11').push('advancedFilter_7');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_11').push('advancedFilter_8');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_11').push('advancedFilter_9');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_11').push('advancedFilter_10');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_11').push('advancedFilter_12');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_11').push('advancedFilter_13');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_11').push('advancedFilter_14');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_11').push('advancedFilter_15');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_11').push('advancedFilter_16');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_11').push('advancedFilter_17');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_11').push('advancedFilter_21');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_11').push('advancedFilter_22');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_11').push('advancedFilter_26');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_11').push('advancedFilter_27');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_11').push('advancedFilter_28');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_11').push('advancedFilter_30');
advancedFiltersToIncompatibleAdvancedFilters.set('advancedFilter_12', []);
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_12').push('advancedFilter_0');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_12').push('advancedFilter_1');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_12').push('advancedFilter_5');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_12').push('advancedFilter_6');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_12').push('advancedFilter_7');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_12').push('advancedFilter_8');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_12').push('advancedFilter_9');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_12').push('advancedFilter_10');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_12').push('advancedFilter_11');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_12').push('advancedFilter_13');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_12').push('advancedFilter_14');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_12').push('advancedFilter_15');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_12').push('advancedFilter_16');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_12').push('advancedFilter_17');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_12').push('advancedFilter_18');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_12').push('advancedFilter_19');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_12').push('advancedFilter_20');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_12').push('advancedFilter_21');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_12').push('advancedFilter_22');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_12').push('advancedFilter_23');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_12').push('advancedFilter_24');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_12').push('advancedFilter_25');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_12').push('advancedFilter_26');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_12').push('advancedFilter_27');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_12').push('advancedFilter_28');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_12').push('advancedFilter_29');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_12').push('advancedFilter_30');
advancedFiltersToIncompatibleAdvancedFilters.set('advancedFilter_13', []);
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_13').push('advancedFilter_1');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_13').push('advancedFilter_2');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_13').push('advancedFilter_3');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_13').push('advancedFilter_4');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_13').push('advancedFilter_5');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_13').push('advancedFilter_6');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_13').push('advancedFilter_7');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_13').push('advancedFilter_8');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_13').push('advancedFilter_9');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_13').push('advancedFilter_10');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_13').push('advancedFilter_11');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_13').push('advancedFilter_12');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_13').push('advancedFilter_14');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_13').push('advancedFilter_15');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_13').push('advancedFilter_16');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_13').push('advancedFilter_17');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_13').push('advancedFilter_18');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_13').push('advancedFilter_19');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_13').push('advancedFilter_20');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_13').push('advancedFilter_21');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_13').push('advancedFilter_22');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_13').push('advancedFilter_23');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_13').push('advancedFilter_24');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_13').push('advancedFilter_25');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_13').push('advancedFilter_26');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_13').push('advancedFilter_27');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_13').push('advancedFilter_28');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_13').push('advancedFilter_29');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_13').push('advancedFilter_30');
advancedFiltersToIncompatibleAdvancedFilters.set('advancedFilter_14', []);
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_14').push('advancedFilter_0');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_14').push('advancedFilter_1');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_14').push('advancedFilter_3');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_14').push('advancedFilter_4');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_14').push('advancedFilter_5');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_14').push('advancedFilter_6');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_14').push('advancedFilter_7');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_14').push('advancedFilter_8');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_14').push('advancedFilter_9');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_14').push('advancedFilter_10');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_14').push('advancedFilter_11');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_14').push('advancedFilter_12');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_14').push('advancedFilter_13');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_14').push('advancedFilter_15');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_14').push('advancedFilter_16');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_14').push('advancedFilter_17');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_14').push('advancedFilter_18');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_14').push('advancedFilter_19');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_14').push('advancedFilter_20');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_14').push('advancedFilter_21');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_14').push('advancedFilter_22');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_14').push('advancedFilter_23');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_14').push('advancedFilter_24');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_14').push('advancedFilter_25');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_14').push('advancedFilter_26');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_14').push('advancedFilter_27');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_14').push('advancedFilter_28');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_14').push('advancedFilter_29');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_14').push('advancedFilter_30');
advancedFiltersToIncompatibleAdvancedFilters.set('advancedFilter_15', []);
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_15').push('advancedFilter_3');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_15').push('advancedFilter_4');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_15').push('advancedFilter_5');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_15').push('advancedFilter_6');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_15').push('advancedFilter_9');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_15').push('advancedFilter_10');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_15').push('advancedFilter_11');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_15').push('advancedFilter_12');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_15').push('advancedFilter_13');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_15').push('advancedFilter_14');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_15').push('advancedFilter_16');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_15').push('advancedFilter_17');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_15').push('advancedFilter_21');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_15').push('advancedFilter_24');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_15').push('advancedFilter_25');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_15').push('advancedFilter_26');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_15').push('advancedFilter_28');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_15').push('advancedFilter_29');
advancedFiltersToIncompatibleAdvancedFilters.set('advancedFilter_16', []);
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_16').push('advancedFilter_1');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_16').push('advancedFilter_2');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_16').push('advancedFilter_3');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_16').push('advancedFilter_4');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_16').push('advancedFilter_5');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_16').push('advancedFilter_6');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_16').push('advancedFilter_7');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_16').push('advancedFilter_8');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_16').push('advancedFilter_9');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_16').push('advancedFilter_10');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_16').push('advancedFilter_11');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_16').push('advancedFilter_12');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_16').push('advancedFilter_13');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_16').push('advancedFilter_14');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_16').push('advancedFilter_15');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_16').push('advancedFilter_17');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_16').push('advancedFilter_21');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_16').push('advancedFilter_24');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_16').push('advancedFilter_25');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_16').push('advancedFilter_26');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_16').push('advancedFilter_27');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_16').push('advancedFilter_28');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_16').push('advancedFilter_29');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_16').push('advancedFilter_30');
advancedFiltersToIncompatibleAdvancedFilters.set('advancedFilter_17', []);
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_17').push('advancedFilter_3');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_17').push('advancedFilter_4');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_17').push('advancedFilter_5');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_17').push('advancedFilter_6');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_17').push('advancedFilter_8');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_17').push('advancedFilter_9');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_17').push('advancedFilter_11');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_17').push('advancedFilter_12');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_17').push('advancedFilter_13');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_17').push('advancedFilter_14');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_17').push('advancedFilter_15');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_17').push('advancedFilter_16');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_17').push('advancedFilter_23');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_17').push('advancedFilter_24');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_17').push('advancedFilter_25');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_17').push('advancedFilter_26');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_17').push('advancedFilter_28');
advancedFiltersToIncompatibleAdvancedFilters.set('advancedFilter_18', []);
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_18').push('advancedFilter_6');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_18').push('advancedFilter_12');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_18').push('advancedFilter_13');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_18').push('advancedFilter_14');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_18').push('advancedFilter_19');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_18').push('advancedFilter_20');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_18').push('advancedFilter_24');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_18').push('advancedFilter_25');
advancedFiltersToIncompatibleAdvancedFilters.set('advancedFilter_19', []);
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_19').push('advancedFilter_6');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_19').push('advancedFilter_12');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_19').push('advancedFilter_13');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_19').push('advancedFilter_14');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_19').push('advancedFilter_18');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_19').push('advancedFilter_20');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_19').push('advancedFilter_24');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_19').push('advancedFilter_25');
advancedFiltersToIncompatibleAdvancedFilters.set('advancedFilter_20', []);
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_20').push('advancedFilter_6');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_20').push('advancedFilter_12');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_20').push('advancedFilter_13');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_20').push('advancedFilter_14');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_20').push('advancedFilter_18');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_20').push('advancedFilter_19');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_20').push('advancedFilter_24');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_20').push('advancedFilter_25');
advancedFiltersToIncompatibleAdvancedFilters.set('advancedFilter_21', []);
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_21').push('advancedFilter_3');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_21').push('advancedFilter_4');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_21').push('advancedFilter_5');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_21').push('advancedFilter_6');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_21').push('advancedFilter_11');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_21').push('advancedFilter_12');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_21').push('advancedFilter_13');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_21').push('advancedFilter_14');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_21').push('advancedFilter_16');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_21').push('advancedFilter_24');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_21').push('advancedFilter_25');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_21').push('advancedFilter_26');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_21').push('advancedFilter_28');
advancedFiltersToIncompatibleAdvancedFilters.set('advancedFilter_22', []);
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_22').push('advancedFilter_1');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_22').push('advancedFilter_2');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_22').push('advancedFilter_3');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_22').push('advancedFilter_4');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_22').push('advancedFilter_5');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_22').push('advancedFilter_6');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_22').push('advancedFilter_11');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_22').push('advancedFilter_12');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_22').push('advancedFilter_13');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_22').push('advancedFilter_14');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_22').push('advancedFilter_24');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_22').push('advancedFilter_25');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_22').push('advancedFilter_26');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_22').push('advancedFilter_27');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_22').push('advancedFilter_28');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_22').push('advancedFilter_29');
advancedFiltersToIncompatibleAdvancedFilters.set('advancedFilter_23', []);
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_23').push('advancedFilter_2');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_23').push('advancedFilter_3');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_23').push('advancedFilter_4');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_23').push('advancedFilter_5');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_23').push('advancedFilter_6');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_23').push('advancedFilter_8');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_23').push('advancedFilter_12');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_23').push('advancedFilter_13');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_23').push('advancedFilter_14');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_23').push('advancedFilter_17');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_23').push('advancedFilter_24');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_23').push('advancedFilter_25');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_23').push('advancedFilter_26');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_23').push('advancedFilter_27');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_23').push('advancedFilter_28');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_23').push('advancedFilter_29');
advancedFiltersToIncompatibleAdvancedFilters.set('advancedFilter_24', []);
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_24').push('advancedFilter_1');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_24').push('advancedFilter_2');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_24').push('advancedFilter_4');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_24').push('advancedFilter_5');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_24').push('advancedFilter_6');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_24').push('advancedFilter_7');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_24').push('advancedFilter_8');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_24').push('advancedFilter_9');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_24').push('advancedFilter_10');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_24').push('advancedFilter_12');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_24').push('advancedFilter_13');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_24').push('advancedFilter_14');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_24').push('advancedFilter_15');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_24').push('advancedFilter_16');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_24').push('advancedFilter_17');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_24').push('advancedFilter_18');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_24').push('advancedFilter_19');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_24').push('advancedFilter_20');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_24').push('advancedFilter_21');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_24').push('advancedFilter_22');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_24').push('advancedFilter_23');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_24').push('advancedFilter_25');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_24').push('advancedFilter_26');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_24').push('advancedFilter_27');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_24').push('advancedFilter_28');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_24').push('advancedFilter_29');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_24').push('advancedFilter_30');
advancedFiltersToIncompatibleAdvancedFilters.set('advancedFilter_25', []);
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_25').push('advancedFilter_1');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_25').push('advancedFilter_2');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_25').push('advancedFilter_3');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_25').push('advancedFilter_5');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_25').push('advancedFilter_6');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_25').push('advancedFilter_7');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_25').push('advancedFilter_8');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_25').push('advancedFilter_9');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_25').push('advancedFilter_10');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_25').push('advancedFilter_12');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_25').push('advancedFilter_13');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_25').push('advancedFilter_14');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_25').push('advancedFilter_15');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_25').push('advancedFilter_16');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_25').push('advancedFilter_17');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_25').push('advancedFilter_18');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_25').push('advancedFilter_19');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_25').push('advancedFilter_20');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_25').push('advancedFilter_21');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_25').push('advancedFilter_22');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_25').push('advancedFilter_23');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_25').push('advancedFilter_24');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_25').push('advancedFilter_26');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_25').push('advancedFilter_27');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_25').push('advancedFilter_28');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_25').push('advancedFilter_29');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_25').push('advancedFilter_30');
advancedFiltersToIncompatibleAdvancedFilters.set('advancedFilter_26', []);
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_26').push('advancedFilter_1');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_26').push('advancedFilter_2');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_26').push('advancedFilter_3');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_26').push('advancedFilter_4');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_26').push('advancedFilter_6');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_26').push('advancedFilter_7');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_26').push('advancedFilter_8');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_26').push('advancedFilter_9');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_26').push('advancedFilter_10');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_26').push('advancedFilter_11');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_26').push('advancedFilter_12');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_26').push('advancedFilter_13');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_26').push('advancedFilter_14');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_26').push('advancedFilter_15');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_26').push('advancedFilter_16');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_26').push('advancedFilter_17');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_26').push('advancedFilter_21');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_26').push('advancedFilter_22');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_26').push('advancedFilter_23');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_26').push('advancedFilter_24');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_26').push('advancedFilter_25');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_26').push('advancedFilter_27');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_26').push('advancedFilter_28');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_26').push('advancedFilter_29');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_26').push('advancedFilter_30');
advancedFiltersToIncompatibleAdvancedFilters.set('advancedFilter_27', []);
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_27').push('advancedFilter_2');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_27').push('advancedFilter_3');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_27').push('advancedFilter_4');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_27').push('advancedFilter_5');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_27').push('advancedFilter_6');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_27').push('advancedFilter_8');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_27').push('advancedFilter_9');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_27').push('advancedFilter_10');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_27').push('advancedFilter_11');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_27').push('advancedFilter_12');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_27').push('advancedFilter_13');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_27').push('advancedFilter_14');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_27').push('advancedFilter_16');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_27').push('advancedFilter_22');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_27').push('advancedFilter_23');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_27').push('advancedFilter_24');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_27').push('advancedFilter_25');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_27').push('advancedFilter_26');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_27').push('advancedFilter_28');
advancedFiltersToIncompatibleAdvancedFilters.set('advancedFilter_28', []);
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_28').push('advancedFilter_1');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_28').push('advancedFilter_2');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_28').push('advancedFilter_3');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_28').push('advancedFilter_4');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_28').push('advancedFilter_5');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_28').push('advancedFilter_6');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_28').push('advancedFilter_7');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_28').push('advancedFilter_9');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_28').push('advancedFilter_10');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_28').push('advancedFilter_11');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_28').push('advancedFilter_12');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_28').push('advancedFilter_13');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_28').push('advancedFilter_14');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_28').push('advancedFilter_15');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_28').push('advancedFilter_16');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_28').push('advancedFilter_17');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_28').push('advancedFilter_21');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_28').push('advancedFilter_22');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_28').push('advancedFilter_23');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_28').push('advancedFilter_24');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_28').push('advancedFilter_25');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_28').push('advancedFilter_26');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_28').push('advancedFilter_27');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_28').push('advancedFilter_29');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_28').push('advancedFilter_30');
advancedFiltersToIncompatibleAdvancedFilters.set('advancedFilter_29', []);
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_29').push('advancedFilter_3');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_29').push('advancedFilter_4');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_29').push('advancedFilter_5');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_29').push('advancedFilter_6');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_29').push('advancedFilter_8');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_29').push('advancedFilter_9');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_29').push('advancedFilter_10');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_29').push('advancedFilter_12');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_29').push('advancedFilter_13');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_29').push('advancedFilter_14');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_29').push('advancedFilter_15');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_29').push('advancedFilter_16');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_29').push('advancedFilter_22');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_29').push('advancedFilter_23');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_29').push('advancedFilter_24');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_29').push('advancedFilter_25');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_29').push('advancedFilter_26');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_29').push('advancedFilter_28');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_29').push('advancedFilter_30');
advancedFiltersToIncompatibleAdvancedFilters.set('advancedFilter_30', []);
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_30').push('advancedFilter_1');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_30').push('advancedFilter_2');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_30').push('advancedFilter_3');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_30').push('advancedFilter_4');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_30').push('advancedFilter_5');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_30').push('advancedFilter_6');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_30').push('advancedFilter_8');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_30').push('advancedFilter_9');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_30').push('advancedFilter_11');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_30').push('advancedFilter_12');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_30').push('advancedFilter_13');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_30').push('advancedFilter_14');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_30').push('advancedFilter_16');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_30').push('advancedFilter_24');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_30').push('advancedFilter_25');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_30').push('advancedFilter_26');
advancedFiltersToIncompatibleAdvancedFilters.get('advancedFilter_30').push('advancedFilter_28');

// ---------- End Advanced Search Filter Code ----------


registerSearchData('FDecalData', '', 'API/ShooterGame/FDecalData/index.html', '', 0x08000002n);
registerSearchData('FDecalData', '', 'API/ShooterGame/FDecalData/FDecalData/index.html', 'defaults', 0x80100010n);
registerSearchData('DecalMaterial', '', 'API/ShooterGame/FDecalData/DecalMaterial/index.html', 'material', 0x40100020n);
registerSearchData('DecalSize', '', 'API/ShooterGame/FDecalData/DecalSize/index.html', 'quad size (width & height)', 0x40100020n);
registerSearchData('LifeSpan', '', 'API/ShooterGame/FDecalData/LifeSpan/index.html', 'lifespan', 0x40100020n);
registerSearchData('FTakeHitInfo', '', 'API/ShooterGame/FTakeHitInfo/index.html', 'replicated information on a hit we\'ve taken', 0x08000002n);
registerSearchData('FTakeHitInfo', '', 'API/ShooterGame/FTakeHitInfo/FTakeHitInfo/index.html', '', 0x80100010n);
registerSearchData('GetDamageEvent', '', 'API/ShooterGame/FTakeHitInfo/GetDamageEvent/index.html', '', 0x00100010n);
registerSearchData('SetDamageEvent', '', 'API/ShooterGame/FTakeHitInfo/SetDamageEvent/index.html', '', 0x00100010n);
registerSearchData('EnsureReplication', '', 'API/ShooterGame/FTakeHitInfo/EnsureReplication/index.html', '', 0x00100010n);
registerSearchData('ActualDamage', '', 'API/ShooterGame/FTakeHitInfo/ActualDamage/index.html', 'The amount of damage actually applied', 0x40100020n);
registerSearchData('DamageTypeClass', '', 'API/ShooterGame/FTakeHitInfo/DamageTypeClass/index.html', 'The damage type we were hit with.', 0x40100020n);
registerSearchData('PawnInstigator', '', 'API/ShooterGame/FTakeHitInfo/PawnInstigator/index.html', 'Who hit us', 0x40100020n);
registerSearchData('DamageCauser', '', 'API/ShooterGame/FTakeHitInfo/DamageCauser/index.html', 'Who actually caused the damage', 0x40100020n);
registerSearchData('DamageEventClassID', '', 'API/ShooterGame/FTakeHitInfo/DamageEventClassID/index.html', 'Specifies which DamageEvent below describes the damage received.', 0x40100020n);
registerSearchData('bKilled', '', 'API/ShooterGame/FTakeHitInfo/bKilled/index.html', 'Rather this was a kill', 0x40100020n);
registerSearchData('EnsureReplicationByte', '', 'API/ShooterGame/FTakeHitInfo/EnsureReplicationByte/index.html', 'A rolling counter used to ensure the struct is dirty and will replicate.', 0x40400020n);
registerSearchData('GeneralDamageEvent', '', 'API/ShooterGame/FTakeHitInfo/GeneralDamageEvent/index.html', 'Describes general damage.', 0x40400020n);
registerSearchData('PointDamageEvent', '', 'API/ShooterGame/FTakeHitInfo/PointDamageEvent/index.html', 'Describes point damage, if that is what was received.', 0x40400020n);
registerSearchData('RadialDamageEvent', '', 'API/ShooterGame/FTakeHitInfo/RadialDamageEvent/index.html', 'Describes radial damage, if that is what was received.', 0x40400020n);
registerSearchData('FShooterAllTimeMatchResultsRead', '', 'API/ShooterGame/FShooterAllTimeMatchResultsRead/index.html', '\'AllTime\' leaderboard read object', 0x00000001n);
registerSearchData('FShooterAllTimeMatchResultsRead', '', 'API/ShooterGame/FShooterAllTimeMatchResultsRead/FShooterAllTimeMatchResultsRead/index.html', '', 0x80100010n);
registerSearchData('FShooterAllTimeMatchResultsWrite', '', 'API/ShooterGame/FShooterAllTimeMatchResultsWrite/index.html', '\'AllTime\' leaderboard write object', 0x00000001n);
registerSearchData('FShooterAllTimeMatchResultsWrite', '', 'API/ShooterGame/FShooterAllTimeMatchResultsWrite/FShooterAllTimeMatchResultsWrite/index.html', '', 0x80100010n);
registerSearchData('FShooterOnlineSessionSettings', '', 'API/ShooterGame/Online/FShooterOnlineSessionSettings/index.html', 'General session settings for a Shooter game', 0x00000001n);
registerSearchData('FShooterOnlineSessionSettings', '', 'API/ShooterGame/Online/FShooterOnlineSessionSettings/FShooterOnlineSessionSettings/index.html', '', 0x80100010n);
registerSearchData('FShooterOnlineSessionSettings', '', 'API/ShooterGame/Online/FShooterOnlineSessionSettings/FShooterOnlineSessionSettings-2-0/index.html', '', 0x0000000100140010n);
registerSearchData('FShooterOnlineSearchSettings', '', 'API/ShooterGame/Online/FShooterOnlineSearchSettings/index.html', 'General search setting for a Shooter game', 0x00000001n);
registerSearchData('FShooterOnlineSearchSettings', '', 'API/ShooterGame/Online/FShooterOnlineSearchSettings/FShooterOnlineSearchSettings/index.html', '', 0x80100010n);
registerSearchData('FShooterOnlineSearchSettings', '', 'API/ShooterGame/Online/FShooterOnlineSearchSettings/FShooterOnlineSearchSettings-2-0/index.html', '', 0x0000000100140010n);
registerSearchData('FShooterOnlineSearchSettingsEmptyDedicated', '', 'API/ShooterGame/Online/FShooterOnlineSearchSettingsEmptyDedicated/index.html', 'Search settings for an empty dedicated server to host a match', 0x00000001n);
registerSearchData('FShooterOnlineSearchSettingsEmptyDedicated', '', 'API/ShooterGame/Online/FShooterOnlineSearchSettingsEmptyDedicated/FShooterOnlineSearchSettingsEmptyDedicated/index.html', '', 0x80100010n);
registerSearchData('FShooterOnlineSearchSettingsEmptyDedicated', '', 'API/ShooterGame/Online/FShooterOnlineSearchSettingsEmptyDedicated/FShooterOnlineSearchSettingsEmptyDedicated-2-0/index.html', '', 0x0000000100140010n);
registerSearchData('FLogCategoryLogShooterReplicationGraph', '', 'API/ShooterGame/Online/FLogCategoryLogShooterReplicationGraph/index.html', 'Copyright 1998-2019 Epic Games, Inc. All Rights Reserved.', 0x00000002n);
registerSearchData('FLogCategoryLogShooterReplicationGraph', '', 'API/ShooterGame/Online/FLogCategoryLogShooterReplicationGraph/FLogCategoryLogShooterReplicationGraph/index.html', '', 0x80100010n);
registerSearchData('UShooterReplicationGraph', '', 'API/ShooterGame/Online/UShooterReplicationGraph/index.html', 'ShooterGame Replication Graph implementation. See additional notes in ShooterReplicationGraph.cpp!', 0x04000001n);
registerSearchData('UShooterReplicationGraph', '', 'API/ShooterGame/Online/UShooterReplicationGraph/UShooterReplicationGraph/index.html', '', 0x80100010n);
registerSearchData('ResetGameWorldState', '', 'API/ShooterGame/Online/UShooterReplicationGraph/ResetGameWorldState/index.html', '', 0x00140010n);
registerSearchData('InitGlobalActorClassSettings', '', 'API/ShooterGame/Online/UShooterReplicationGraph/InitGlobalActorClassSettings/index.html', '', 0x00140010n);
registerSearchData('InitGlobalGraphNodes', '', 'API/ShooterGame/Online/UShooterReplicationGraph/InitGlobalGraphNodes/index.html', '', 0x00140010n);
registerSearchData('InitConnectionGraphNodes', '', 'API/ShooterGame/Online/UShooterReplicationGraph/InitConnectionGraphNodes/index.html', '', 0x00140010n);
registerSearchData('RouteAddNetworkActorToNodes', '', 'API/ShooterGame/Online/UShooterReplicationGraph/RouteAddNetworkActorToNodes/index.html', '', 0x00140010n);
registerSearchData('RouteRemoveNetworkActorToNodes', '', 'API/ShooterGame/Online/UShooterReplicationGraph/RouteRemoveNetworkActorToNodes/index.html', '', 0x00140010n);
registerSearchData('OnCharacterEquipWeapon', '', 'API/ShooterGame/Online/UShooterReplicationGraph/OnCharacterEquipWeapon/index.html', '', 0x00100010n);
registerSearchData('OnCharacterUnEquipWeapon', '', 'API/ShooterGame/Online/UShooterReplicationGraph/OnCharacterUnEquipWeapon/index.html', '', 0x00100010n);
registerSearchData('OnGameplayDebuggerOwnerChange', '', 'API/ShooterGame/Online/UShooterReplicationGraph/OnGameplayDebuggerOwnerChange/index.html', '', 0x00100010n);
registerSearchData('PrintRepNodePolicies', '', 'API/ShooterGame/Online/UShooterReplicationGraph/PrintRepNodePolicies/index.html', '', 0x00100010n);
registerSearchData('GetMappingPolicy', '', 'API/ShooterGame/Online/UShooterReplicationGraph/GetMappingPolicy/index.html', '', 0x00400010n);
registerSearchData('IsSpatialized', '', 'API/ShooterGame/Online/UShooterReplicationGraph/IsSpatialized/index.html', '', 0x00c00010n);
registerSearchData('SpatializedClasses', '', 'API/ShooterGame/Online/UShooterReplicationGraph/SpatializedClasses/index.html', '', 0x40100020n);
registerSearchData('NonSpatializedChildClasses', '', 'API/ShooterGame/Online/UShooterReplicationGraph/NonSpatializedChildClasses/index.html', '', 0x40100020n);
registerSearchData('AlwaysRelevantClasses', '', 'API/ShooterGame/Online/UShooterReplicationGraph/AlwaysRelevantClasses/index.html', '', 0x40100020n);
registerSearchData('GridNode', '', 'API/ShooterGame/Online/UShooterReplicationGraph/GridNode/index.html', '', 0x40100020n);
registerSearchData('AlwaysRelevantNode', '', 'API/ShooterGame/Online/UShooterReplicationGraph/AlwaysRelevantNode/index.html', '', 0x40100020n);
registerSearchData('AlwaysRelevantStreamingLevelActors', '', 'API/ShooterGame/Online/UShooterReplicationGraph/AlwaysRelevantStreamingLevelActors/index.html', '', 0x00100020n);
registerSearchData('ClassRepNodePolicies', '', 'API/ShooterGame/Online/UShooterReplicationGraph/ClassRepNodePolicies/index.html', '', 0x00400020n);
registerSearchData('UShooterReplicationGraphNode_AlwaysRelevant_ForConnection', '', 'API/ShooterGame/Online/UShooterReplicationGraphNode_AlwaysRelevant_ForConnection/index.html', '', 0x04000001n);
registerSearchData('NotifyAddNetworkActor', '', 'API/ShooterGame/Online/UShooterReplicationGraphNode_AlwaysRelevant_ForConnection/NotifyAddNetworkActor/index.html', '', 0x00140010n);
registerSearchData('NotifyRemoveNetworkActor', '', 'API/ShooterGame/Online/UShooterReplicationGraphNode_AlwaysRelevant_ForConnection/NotifyRemoveNetworkActor/index.html', '', 0x00140010n);
registerSearchData('NotifyResetAllNetworkActors', '', 'API/ShooterGame/Online/UShooterReplicationGraphNode_AlwaysRelevant_ForConnection/NotifyResetAllNetworkActors/index.html', '', 0x00140010n);
registerSearchData('GatherActorListsForConnection', '', 'API/ShooterGame/Online/UShooterReplicationGraphNode_AlwaysRelevant_ForConnection/GatherActorListsForConnection/index.html', '', 0x00140010n);
registerSearchData('LogNode', '', 'API/ShooterGame/Online/UShooterReplicationGraphNode_AlwaysRelevant_ForConnection/LogNode/index.html', '', 0x00940010n);
registerSearchData('OnClientLevelVisibilityAdd', '', 'API/ShooterGame/Online/UShooterReplicationGraphNode_AlwaysRelevant_ForConnection/OnClientLevelVisibilityAdd/index.html', '', 0x00100010n);
registerSearchData('OnClientLevelVisibilityRemove', '', 'API/ShooterGame/Online/UShooterReplicationGraphNode_AlwaysRelevant_ForConnection/OnClientLevelVisibilityRemove/index.html', '', 0x00100010n);
registerSearchData('ResetGameWorldState', '', 'API/ShooterGame/Online/UShooterReplicationGraphNode_AlwaysRelevant_ForConnection/ResetGameWorldState/index.html', '', 0x00100010n);
registerSearchData('GameplayDebugger', '', 'API/ShooterGame/Online/UShooterReplicationGraphNode_AlwaysRelevant_ForConnection/GameplayDebugger/index.html', '', 0x00100020n);
registerSearchData('AlwaysRelevantStreamingLevelsNeedingReplication', '', 'API/ShooterGame/Online/UShooterReplicationGraphNode_AlwaysRelevant_ForConnection/AlwaysRelevantStreamingLevelsNeedingReplication/index.html', '', 0x00400020n);
registerSearchData('ReplicationActorList', '', 'API/ShooterGame/Online/UShooterReplicationGraphNode_AlwaysRelevant_ForConnection/ReplicationActorList/index.html', '', 0x00400020n);
registerSearchData('nullptr', '', 'API/ShooterGame/Online/UShooterReplicationGraphNode_AlwaysRelevant_ForConnection/nullptr/index.html', '', 0x40400020n);
registerSearchData('PastRelevantActors', '', 'API/ShooterGame/Online/UShooterReplicationGraphNode_AlwaysRelevant_ForConnection/PastRelevantActors/index.html', 'List of previously (or currently if nothing changed last tick) focused actor data per connection', 0x40400020n);
registerSearchData('bInitializedPlayerState', '', 'API/ShooterGame/Online/UShooterReplicationGraphNode_AlwaysRelevant_ForConnection/bInitializedPlayerState/index.html', '', 0x00400020n);
registerSearchData('UShooterReplicationGraphNode_PlayerStateFrequencyLimiter', '', 'API/ShooterGame/Online/UShooterReplicationGraphNode_PlayerStateFrequencyLimiter/index.html', 'This is a specialized node for handling PlayerState replication in a frequency limited fashion. It tracks all player states but only returns a subset of them to the replication driver each frame.', 0x04000001n);
registerSearchData('UShooterReplicationGraphNode_PlayerStateFrequencyLimiter', '', 'API/ShooterGame/Online/UShooterReplicationGraphNode_PlayerStateFrequencyLimiter/UShooterReplicationGraphNode_PlayerStateFrequencyLimiter/index.html', '', 0x80400010n);
registerSearchData('NotifyAddNetworkActor', '', 'API/ShooterGame/Online/UShooterReplicationGraphNode_PlayerStateFrequencyLimiter/NotifyAddNetworkActor/index.html', '', 0x00440010n);
registerSearchData('NotifyRemoveNetworkActor', '', 'API/ShooterGame/Online/UShooterReplicationGraphNode_PlayerStateFrequencyLimiter/NotifyRemoveNetworkActor/index.html', '', 0x00440010n);
registerSearchData('GatherActorListsForConnection', '', 'API/ShooterGame/Online/UShooterReplicationGraphNode_PlayerStateFrequencyLimiter/GatherActorListsForConnection/index.html', '', 0x00440010n);
registerSearchData('PrepareForReplication', '', 'API/ShooterGame/Online/UShooterReplicationGraphNode_PlayerStateFrequencyLimiter/PrepareForReplication/index.html', '', 0x00440010n);
registerSearchData('LogNode', '', 'API/ShooterGame/Online/UShooterReplicationGraphNode_PlayerStateFrequencyLimiter/LogNode/index.html', '', 0x00c40010n);
registerSearchData('TargetActorsPerFrame', '', 'API/ShooterGame/Online/UShooterReplicationGraphNode_PlayerStateFrequencyLimiter/TargetActorsPerFrame/index.html', 'How many actors we want to return to the replication driver per frame. Will not suppress ForceNetUpdate.', 0x00400020n);
registerSearchData('ReplicationActorLists', '', 'API/ShooterGame/Online/UShooterReplicationGraphNode_PlayerStateFrequencyLimiter/ReplicationActorLists/index.html', '', 0x00400020n);
registerSearchData('ForceNetUpdateReplicationActorList', '', 'API/ShooterGame/Online/UShooterReplicationGraphNode_PlayerStateFrequencyLimiter/ForceNetUpdateReplicationActorList/index.html', '', 0x00400020n);
registerSearchData('ShooterHUDPCTrackerBase', '', 'API/ShooterGame/UI/ShooterHUDPCTrackerBase/index.html', 'Helps HUD widgets know their context within the game world. e.g. Is this a widget for player 1 or player 2? e.g. In case of multiple PIE sessions, which world do I belong to?', 0x00000001n);
registerSearchData('ShooterHUDPCTrackerBase', '', 'API/ShooterGame/UI/ShooterHUDPCTrackerBase/ShooterHUDPCTrackerBase/index.html', '', 0x0000000100140010n);
registerSearchData('Init', '', 'API/ShooterGame/UI/ShooterHUDPCTrackerBase/Init/index.html', 'Initialize with a world context.', 0x00100010n);
registerSearchData('GetPlayerController', '', 'API/ShooterGame/UI/ShooterHUDPCTrackerBase/GetPlayerController/index.html', 'Returns a pointer to the player controller', 0x00900010n);
registerSearchData('GetWorld', '', 'API/ShooterGame/UI/ShooterHUDPCTrackerBase/GetWorld/index.html', 'Returns a pointer to the World. (Via Player Controller)', 0x00900010n);
registerSearchData('GetContext', '', 'API/ShooterGame/UI/ShooterHUDPCTrackerBase/GetContext/index.html', '', 0x00900010n);
registerSearchData('Context', '', 'API/ShooterGame/UI/ShooterHUDPCTrackerBase/Context/index.html', 'Which player and world this piece of UI belongs to. This is necessary to support', 0x00400020n);
registerSearchData('AShooterGameMode', '', 'API/ShooterGame/Online/AShooterGameMode/index.html', 'Copyright 1998-2019 Epic Games, Inc. All Rights Reserved.', 0x04000001n);
registerSearchData('SetAllowBots', '', 'API/ShooterGame/Online/AShooterGameMode/SetAllowBots/index.html', '', 0x20100010n);
registerSearchData('PreInitializeComponents', '', 'API/ShooterGame/Online/AShooterGameMode/PreInitializeComponents/index.html', '', 0x00140010n);
registerSearchData('InitGame', '', 'API/ShooterGame/Online/AShooterGameMode/InitGame/index.html', 'Initialize the game. This is called before actors\' PreInitializeComponents.', 0x00140010n);
registerSearchData('PreLogin', '', 'API/ShooterGame/Online/AShooterGameMode/PreLogin/index.html', 'Accept or reject a player attempting to join the server. Fails login if you set the ErrorMessage to a non-empty string.', 0x00140010n);
registerSearchData('PostLogin', '', 'API/ShooterGame/Online/AShooterGameMode/PostLogin/index.html', 'starts match warmup', 0x00140010n);
registerSearchData('RestartPlayer', '', 'API/ShooterGame/Online/AShooterGameMode/RestartPlayer/index.html', 'Tries to spawn the player\'s pawn', 0x00140010n);
registerSearchData('ChoosePlayerStart_Implementation', '', 'API/ShooterGame/Online/AShooterGameMode/ChoosePlayerStart_Implementation/index.html', 'select best spawn point for player', 0x00140010n);
registerSearchData('ShouldSpawnAtStartSpot', '', 'API/ShooterGame/Online/AShooterGameMode/ShouldSpawnAtStartSpot/index.html', 'always pick new random spawn', 0x00140010n);
registerSearchData('GetDefaultPawnClassForController_Implementation', '', 'API/ShooterGame/Online/AShooterGameMode/GetDefaultPawnClassForController_Implementation/index.html', 'returns default pawn class for given controller', 0x00140010n);
registerSearchData('ModifyDamage', '', 'API/ShooterGame/Online/AShooterGameMode/ModifyDamage/index.html', 'prevents friendly fire', 0x00940010n);
registerSearchData('Killed', '', 'API/ShooterGame/Online/AShooterGameMode/Killed/index.html', 'notify about kills', 0x00140010n);
registerSearchData('CanDealDamage', '', 'API/ShooterGame/Online/AShooterGameMode/CanDealDamage/index.html', 'can players damage each other?', 0x00940010n);
registerSearchData('AllowCheats', '', 'API/ShooterGame/Online/AShooterGameMode/AllowCheats/index.html', 'always create cheat manager', 0x00140010n);
registerSearchData('DefaultTimer', '', 'API/ShooterGame/Online/AShooterGameMode/DefaultTimer/index.html', 'update remaining time', 0x00140010n);
registerSearchData('HandleMatchIsWaitingToStart', '', 'API/ShooterGame/Online/AShooterGameMode/HandleMatchIsWaitingToStart/index.html', 'called before startmatch', 0x00140010n);
registerSearchData('HandleMatchHasStarted', '', 'API/ShooterGame/Online/AShooterGameMode/HandleMatchHasStarted/index.html', 'starts new match', 0x00140010n);
registerSearchData('HandleStartingNewPlayer_Implementation', '', 'API/ShooterGame/Online/AShooterGameMode/HandleStartingNewPlayer_Implementation/index.html', 'new player joins', 0x00140010n);
registerSearchData('RestartGame', '', 'API/ShooterGame/Online/AShooterGameMode/RestartGame/index.html', 'hides the onscreen hud and restarts the map', 0x00140010n);
registerSearchData('CreateBotControllers', '', 'API/ShooterGame/Online/AShooterGameMode/CreateBotControllers/index.html', 'Creates AIControllers for all bots', 0x00100010n);
registerSearchData('CreateBot', '', 'API/ShooterGame/Online/AShooterGameMode/CreateBot/index.html', 'Create a bot', 0x00100010n);
registerSearchData('StartBots', '', 'API/ShooterGame/Online/AShooterGameMode/StartBots/index.html', 'spawning all bots for this game', 0x00200010n);
registerSearchData('InitBot', '', 'API/ShooterGame/Online/AShooterGameMode/InitBot/index.html', 'initialization for bot after creation', 0x00240010n);
registerSearchData('DetermineMatchWinner', '', 'API/ShooterGame/Online/AShooterGameMode/DetermineMatchWinner/index.html', 'check who won', 0x00240010n);
registerSearchData('IsWinner', '', 'API/ShooterGame/Online/AShooterGameMode/IsWinner/index.html', 'check if PlayerState is a winner', 0x00a40010n);
registerSearchData('IsSpawnpointAllowed', '', 'API/ShooterGame/Online/AShooterGameMode/IsSpawnpointAllowed/index.html', 'check if player can use spawnpoint', 0x00a40010n);
registerSearchData('IsSpawnpointPreferred', '', 'API/ShooterGame/Online/AShooterGameMode/IsSpawnpointPreferred/index.html', 'check if player should use spawnpoint', 0x00a40010n);
registerSearchData('GetGameSessionClass', '', 'API/ShooterGame/Online/AShooterGameMode/GetGameSessionClass/index.html', 'Returns game session class to use', 0x00a40010n);
registerSearchData('FinishMatch', '', 'API/ShooterGame/Online/AShooterGameMode/FinishMatch/index.html', 'finish current match and lock players', 0x20100010n);
registerSearchData('RequestFinishAndExitToMainMenu', '', 'API/ShooterGame/Online/AShooterGameMode/RequestFinishAndExitToMainMenu/index.html', 'Only GameInstance should call this function', 0x00100010n);
registerSearchData('GetBotsCountOptionName', '', 'API/ShooterGame/Online/AShooterGameMode/GetBotsCountOptionName/index.html', 'get the name of the bots count option used in server travel URL', 0x00120010n);
registerSearchData('BotPawnClass', '', 'API/ShooterGame/Online/AShooterGameMode/BotPawnClass/index.html', 'The bot pawn class', 0x40100020n);
registerSearchData('WarmupTime', '', 'API/ShooterGame/Online/AShooterGameMode/WarmupTime/index.html', 'delay between first player login and starting match', 0x40200020n);
registerSearchData('RoundTime', '', 'API/ShooterGame/Online/AShooterGameMode/RoundTime/index.html', 'match duration', 0x40200020n);
registerSearchData('TimeBetweenMatches', '', 'API/ShooterGame/Online/AShooterGameMode/TimeBetweenMatches/index.html', '', 0x40200020n);
registerSearchData('KillScore', '', 'API/ShooterGame/Online/AShooterGameMode/KillScore/index.html', 'score for kill', 0x40200020n);
registerSearchData('DeathScore', '', 'API/ShooterGame/Online/AShooterGameMode/DeathScore/index.html', 'score for death', 0x40200020n);
registerSearchData('DamageSelfScale', '', 'API/ShooterGame/Online/AShooterGameMode/DamageSelfScale/index.html', 'scale for self instigated damage', 0x40200020n);
registerSearchData('MaxBots', '', 'API/ShooterGame/Online/AShooterGameMode/MaxBots/index.html', '', 0x40200020n);
registerSearchData('BotControllers', '', 'API/ShooterGame/Online/AShooterGameMode/BotControllers/index.html', '', 0x40200020n);
registerSearchData('TimerHandle_DefaultTimer', '', 'API/ShooterGame/Online/AShooterGameMode/TimerHandle_DefaultTimer/index.html', 'Handle for efficient management of DefaultTimer timer', 0x00200020n);
registerSearchData('bNeedsBotCreation', '', 'API/ShooterGame/Online/AShooterGameMode/bNeedsBotCreation/index.html', '', 0x00200020n);
registerSearchData('bAllowBots', '', 'API/ShooterGame/Online/AShooterGameMode/bAllowBots/index.html', '', 0x00200020n);
registerSearchData('LevelPickups', '', 'API/ShooterGame/Online/AShooterGameMode/LevelPickups/index.html', '', 0x40100020n);
registerSearchData('AShooterGameState', '', 'API/ShooterGame/Online/AShooterGameState/index.html', '', 0x04000001n);
registerSearchData('GetRankedMap', '', 'API/ShooterGame/Online/AShooterGameState/GetRankedMap/index.html', 'gets ranked PlayerState map for specific team', 0x00900010n);
registerSearchData('RequestFinishAndExitToMainMenu', '', 'API/ShooterGame/Online/AShooterGameState/RequestFinishAndExitToMainMenu/index.html', '', 0x00100010n);
registerSearchData('NumTeams', '', 'API/ShooterGame/Online/AShooterGameState/NumTeams/index.html', 'number of teams in current game (doesn\'t deprecate when no players are left in a team)', 0x40100020n);
registerSearchData('TeamScores', '', 'API/ShooterGame/Online/AShooterGameState/TeamScores/index.html', 'accumulated score per team', 0x40100020n);
registerSearchData('RemainingTime', '', 'API/ShooterGame/Online/AShooterGameState/RemainingTime/index.html', 'time left for warmup / match', 0x40100020n);
registerSearchData('bTimerPaused', '', 'API/ShooterGame/Online/AShooterGameState/bTimerPaused/index.html', 'is timer paused?', 0x40100020n);
registerSearchData('AShooterCharacter', '', 'API/ShooterGame/Player/AShooterCharacter/index.html', '', 0x04000001n);
registerSearchData('BeginDestroy', '', 'API/ShooterGame/Player/AShooterCharacter/BeginDestroy/index.html', '', 0x00140010n);
registerSearchData('PostInitializeComponents', '', 'API/ShooterGame/Player/AShooterCharacter/PostInitializeComponents/index.html', 'spawn inventory, setup initial variables', 0x00140010n);
registerSearchData('Tick', '', 'API/ShooterGame/Player/AShooterCharacter/Tick/index.html', 'Update the character. (Running, health etc).', 0x00140010n);
registerSearchData('Destroyed', '', 'API/ShooterGame/Player/AShooterCharacter/Destroyed/index.html', 'cleanup inventory', 0x00140010n);
registerSearchData('PawnClientRestart', '', 'API/ShooterGame/Player/AShooterCharacter/PawnClientRestart/index.html', 'update mesh for first person view', 0x00140010n);
registerSearchData('PossessedBy', '', 'API/ShooterGame/Player/AShooterCharacter/PossessedBy/index.html', '[server] perform PlayerState related setup', 0x00140010n);
registerSearchData('OnRep_PlayerState', '', 'API/ShooterGame/Player/AShooterCharacter/OnRep_PlayerState/index.html', '[client] perform PlayerState related setup', 0x00140010n);
registerSearchData('IsReplicationPausedForConnection', '', 'API/ShooterGame/Player/AShooterCharacter/IsReplicationPausedForConnection/index.html', '[server] called to determine if we should pause replication this actor to a specific player', 0x00140010n);
registerSearchData('OnReplicationPausedChanged', '', 'API/ShooterGame/Player/AShooterCharacter/OnReplicationPausedChanged/index.html', '[client] called when replication is paused for this actor', 0x00140010n);
registerSearchData('OnCameraUpdate', '', 'API/ShooterGame/Player/AShooterCharacter/OnCameraUpdate/index.html', 'Add camera pitch to first person mesh. ', 0x00100010n);
registerSearchData('GetAimOffsets', '', 'API/ShooterGame/Player/AShooterCharacter/GetAimOffsets/index.html', 'get aim offsets', 0x20100010n);
registerSearchData('GetAimOffsets', 'Get Aim Offsets', 'BlueprintAPI/Game/Weapon/GetAimOffsets/index.html', 'get aim offsets', 0x20100040n);
registerSearchData('IsEnemyFor', '', 'API/ShooterGame/Player/AShooterCharacter/IsEnemyFor/index.html', 'Check if pawn is enemy if given controller. ', 0x00900010n);
registerSearchData('AddWeapon', '', 'API/ShooterGame/Player/AShooterCharacter/AddWeapon/index.html', '[server] add weapon to inventory ', 0x00100010n);
registerSearchData('RemoveWeapon', '', 'API/ShooterGame/Player/AShooterCharacter/RemoveWeapon/index.html', '[server] remove weapon from inventory ', 0x00100010n);
registerSearchData('EquipWeapon', '', 'API/ShooterGame/Player/AShooterCharacter/EquipWeapon/index.html', '[server + local] equips weapon from inventory ', 0x00100010n);
registerSearchData('StartWeaponFire', '', 'API/ShooterGame/Player/AShooterCharacter/StartWeaponFire/index.html', '[local] starts weapon fire', 0x00100010n);
registerSearchData('StopWeaponFire', '', 'API/ShooterGame/Player/AShooterCharacter/StopWeaponFire/index.html', '[local] stops weapon fire', 0x00100010n);
registerSearchData('CanFire', '', 'API/ShooterGame/Player/AShooterCharacter/CanFire/index.html', 'check if pawn can fire weapon', 0x00900010n);
registerSearchData('CanReload', '', 'API/ShooterGame/Player/AShooterCharacter/CanReload/index.html', 'check if pawn can reload weapon', 0x00900010n);
registerSearchData('SetTargeting', '', 'API/ShooterGame/Player/AShooterCharacter/SetTargeting/index.html', '[server + local] change targeting state', 0x00100010n);
registerSearchData('SetRunning', '', 'API/ShooterGame/Player/AShooterCharacter/SetRunning/index.html', '[server + local] change running state', 0x00100010n);
registerSearchData('PlayAnimMontage', '', 'API/ShooterGame/Player/AShooterCharacter/PlayAnimMontage/index.html', 'play anim montage', 0x00140010n);
registerSearchData('StopAnimMontage', '', 'API/ShooterGame/Player/AShooterCharacter/StopAnimMontage/index.html', 'stop playing montage', 0x00140010n);
registerSearchData('StopAllAnimMontages', '', 'API/ShooterGame/Player/AShooterCharacter/StopAllAnimMontages/index.html', 'stop playing all montages', 0x00100010n);
registerSearchData('SetupPlayerInputComponent', '', 'API/ShooterGame/Player/AShooterCharacter/SetupPlayerInputComponent/index.html', 'setup pawn specific input handlers', 0x00140010n);
registerSearchData('MoveForward', '', 'API/ShooterGame/Player/AShooterCharacter/MoveForward/index.html', 'Move forward/back ', 0x00100010n);
registerSearchData('MoveRight', '', 'API/ShooterGame/Player/AShooterCharacter/MoveRight/index.html', 'Strafe right/left ', 0x00100010n);
registerSearchData('MoveUp', '', 'API/ShooterGame/Player/AShooterCharacter/MoveUp/index.html', 'Move Up/Down in allowed movement modes. ', 0x00100010n);
registerSearchData('TurnAtRate', '', 'API/ShooterGame/Player/AShooterCharacter/TurnAtRate/index.html', 'Frame rate independent turn', 0x00100010n);
registerSearchData('LookUpAtRate', '', 'API/ShooterGame/Player/AShooterCharacter/LookUpAtRate/index.html', 'Frame rate independent lookup', 0x00100010n);
registerSearchData('OnStartFire', '', 'API/ShooterGame/Player/AShooterCharacter/OnStartFire/index.html', 'player pressed start fire action', 0x00100010n);
registerSearchData('OnStopFire', '', 'API/ShooterGame/Player/AShooterCharacter/OnStopFire/index.html', 'player released start fire action', 0x00100010n);
registerSearchData('OnStartTargeting', '', 'API/ShooterGame/Player/AShooterCharacter/OnStartTargeting/index.html', 'player pressed targeting action', 0x00100010n);
registerSearchData('OnStopTargeting', '', 'API/ShooterGame/Player/AShooterCharacter/OnStopTargeting/index.html', 'player released targeting action', 0x00100010n);
registerSearchData('OnNextWeapon', '', 'API/ShooterGame/Player/AShooterCharacter/OnNextWeapon/index.html', 'player pressed next weapon action', 0x00100010n);
registerSearchData('OnPrevWeapon', '', 'API/ShooterGame/Player/AShooterCharacter/OnPrevWeapon/index.html', 'player pressed prev weapon action', 0x00100010n);
registerSearchData('OnReload', '', 'API/ShooterGame/Player/AShooterCharacter/OnReload/index.html', 'player pressed reload action', 0x00100010n);
registerSearchData('OnStartJump', '', 'API/ShooterGame/Player/AShooterCharacter/OnStartJump/index.html', 'player pressed jump action', 0x00100010n);
registerSearchData('OnStopJump', '', 'API/ShooterGame/Player/AShooterCharacter/OnStopJump/index.html', 'player released jump action', 0x00100010n);
registerSearchData('OnStartRunning', '', 'API/ShooterGame/Player/AShooterCharacter/OnStartRunning/index.html', 'player pressed run action', 0x00100010n);
registerSearchData('OnStartRunningToggle', '', 'API/ShooterGame/Player/AShooterCharacter/OnStartRunningToggle/index.html', 'player pressed toggled run action', 0x00100010n);
registerSearchData('OnStopRunning', '', 'API/ShooterGame/Player/AShooterCharacter/OnStopRunning/index.html', 'player released run action', 0x00100010n);
registerSearchData('GetPawnMesh', '', 'API/ShooterGame/Player/AShooterCharacter/GetPawnMesh/index.html', 'get mesh component', 0x00900010n);
registerSearchData('GetWeapon', '', 'API/ShooterGame/Player/AShooterCharacter/GetWeapon/index.html', 'get currently equipped weapon', 0x20100010n);
registerSearchData('GetWeapon', 'Get Weapon', 'BlueprintAPI/Game/Weapon/GetWeapon/index.html', 'get currently equipped weapon', 0x20100040n);
registerSearchData('GetWeaponAttachPoint', '', 'API/ShooterGame/Player/AShooterCharacter/GetWeaponAttachPoint/index.html', 'get weapon attach point', 0x00900010n);
registerSearchData('GetInventoryCount', '', 'API/ShooterGame/Player/AShooterCharacter/GetInventoryCount/index.html', 'get total number of inventory items', 0x00900010n);
registerSearchData('GetTargetingSpeedModifier', '', 'API/ShooterGame/Player/AShooterCharacter/GetTargetingSpeedModifier/index.html', 'get weapon taget modifier speed', 0x20100010n);
registerSearchData('GetTargetingSpeedModifier', 'Get Targeting Speed Modifier', 'BlueprintAPI/Game/Weapon/GetTargetingSpeedModifier/index.html', 'get weapon taget modifier speed', 0x20100040n);
registerSearchData('IsTargeting', '', 'API/ShooterGame/Player/AShooterCharacter/IsTargeting/index.html', 'get targeting state', 0x20100010n);
registerSearchData('IsTargeting', 'Is Targeting', 'BlueprintAPI/Game/Weapon/IsTargeting/index.html', 'get targeting state', 0x20100040n);
registerSearchData('IsFiring', '', 'API/ShooterGame/Player/AShooterCharacter/IsFiring/index.html', 'get firing state', 0x20100010n);
registerSearchData('IsFiring', 'Is Firing', 'BlueprintAPI/Game/Weapon/IsFiring/index.html', 'get firing state', 0x20100040n);
registerSearchData('GetRunningSpeedModifier', '', 'API/ShooterGame/Player/AShooterCharacter/GetRunningSpeedModifier/index.html', 'get the modifier value for running speed', 0x20100010n);
registerSearchData('GetRunningSpeedModifier', 'Get Running Speed Modifier', 'BlueprintAPI/Pawn/GetRunningSpeedModifier/index.html', 'get the modifier value for running speed', 0x20100040n);
registerSearchData('IsRunning', '', 'API/ShooterGame/Player/AShooterCharacter/IsRunning/index.html', 'get running state', 0x20100010n);
registerSearchData('IsRunning', 'Is Running', 'BlueprintAPI/Pawn/IsRunning/index.html', 'get running state', 0x20100040n);
registerSearchData('IsFirstPerson', '', 'API/ShooterGame/Player/AShooterCharacter/IsFirstPerson/index.html', 'get camera view type', 0x20140010n);
registerSearchData('IsFirstPerson', 'Is First Person', 'BlueprintAPI/Mesh/IsFirstPerson/index.html', 'get camera view type', 0x20140040n);
registerSearchData('GetMaxHealth', '', 'API/ShooterGame/Player/AShooterCharacter/GetMaxHealth/index.html', 'get max health', 0x00900010n);
registerSearchData('IsAlive', '', 'API/ShooterGame/Player/AShooterCharacter/IsAlive/index.html', 'check if pawn is still alive', 0x00900010n);
registerSearchData('GetLowHealthPercentage', '', 'API/ShooterGame/Player/AShooterCharacter/GetLowHealthPercentage/index.html', 'returns percentage of health when low health effects should start', 0x00900010n);
registerSearchData('GetSpecifcPawnMesh', '', 'API/ShooterGame/Player/AShooterCharacter/GetSpecifcPawnMesh/index.html', 'Get either first or third person mesh. ', 0x00900010n);
registerSearchData('UpdateTeamColorsAllMIDs', '', 'API/ShooterGame/Player/AShooterCharacter/UpdateTeamColorsAllMIDs/index.html', 'Update the team color of all player meshes.', 0x00100010n);
registerSearchData('UpdateRunSounds', '', 'API/ShooterGame/Player/AShooterCharacter/UpdateRunSounds/index.html', 'handles sounds for running', 0x00200010n);
registerSearchData('UpdatePawnMeshes', '', 'API/ShooterGame/Player/AShooterCharacter/UpdatePawnMeshes/index.html', 'handle mesh visibility and updates', 0x00200010n);
registerSearchData('UpdateTeamColors', '', 'API/ShooterGame/Player/AShooterCharacter/UpdateTeamColors/index.html', 'handle mesh colors on specified material instance', 0x00200010n);
registerSearchData('TornOff', '', 'API/ShooterGame/Player/AShooterCharacter/TornOff/index.html', 'Responsible for cleaning up bodies on clients.', 0x00240010n);
registerSearchData('IsMoving', '', 'API/ShooterGame/Player/AShooterCharacter/IsMoving/index.html', 'Whether or not the character is moving (based on movement input).', 0x00400010n);
registerSearchData('TakeDamage', '', 'API/ShooterGame/Player/AShooterCharacter/TakeDamage/index.html', 'Take damage, handle death', 0x00140010n);
registerSearchData('Suicide', '', 'API/ShooterGame/Player/AShooterCharacter/Suicide/index.html', 'Pawn suicide', 0x00140010n);
registerSearchData('KilledBy', '', 'API/ShooterGame/Player/AShooterCharacter/KilledBy/index.html', 'Kill this pawn', 0x00140010n);
registerSearchData('CanDie', '', 'API/ShooterGame/Player/AShooterCharacter/CanDie/index.html', 'Returns True if the pawn can die in the current state', 0x00940010n);
registerSearchData('Die', '', 'API/ShooterGame/Player/AShooterCharacter/Die/index.html', 'Kills pawn. Server/authority only. ', 0x00140010n);
registerSearchData('FellOutOfWorld', '', 'API/ShooterGame/Player/AShooterCharacter/FellOutOfWorld/index.html', 'Die when we fall out of the world.', 0x00140010n);
registerSearchData('PreReplication', '', 'API/ShooterGame/Player/AShooterCharacter/PreReplication/index.html', 'Called on the actor right before replication occurs', 0x00140010n);
registerSearchData('OnDeath', '', 'API/ShooterGame/Player/AShooterCharacter/OnDeath/index.html', 'notification when killed, for both the server and client.', 0x00240010n);
registerSearchData('PlayHit', '', 'API/ShooterGame/Player/AShooterCharacter/PlayHit/index.html', 'play effects on hit', 0x00240010n);
registerSearchData('SetRagdollPhysics', '', 'API/ShooterGame/Player/AShooterCharacter/SetRagdollPhysics/index.html', 'switch to ragdoll', 0x00200010n);
registerSearchData('ReplicateHit', '', 'API/ShooterGame/Player/AShooterCharacter/ReplicateHit/index.html', 'sets up the replication for taking a hit', 0x00200010n);
registerSearchData('OnRep_LastTakeHitInfo', '', 'API/ShooterGame/Player/AShooterCharacter/OnRep_LastTakeHitInfo/index.html', 'play hit or death on client', 0x20200010n);
registerSearchData('SetCurrentWeapon', '', 'API/ShooterGame/Player/AShooterCharacter/SetCurrentWeapon/index.html', 'updates current weapon', 0x00200010n);
registerSearchData('OnRep_CurrentWeapon', '', 'API/ShooterGame/Player/AShooterCharacter/OnRep_CurrentWeapon/index.html', 'current weapon rep handler', 0x20200010n);
registerSearchData('SpawnDefaultInventory', '', 'API/ShooterGame/Player/AShooterCharacter/SpawnDefaultInventory/index.html', '[server] spawns default inventory', 0x00200010n);
registerSearchData('DestroyInventory', '', 'API/ShooterGame/Player/AShooterCharacter/DestroyInventory/index.html', '[server] remove all weapons from inventory and destroy them', 0x00200010n);
registerSearchData('ServerEquipWeapon', '', 'API/ShooterGame/Player/AShooterCharacter/ServerEquipWeapon/index.html', 'equip weapon', 0x20200010n);
registerSearchData('ServerSetTargeting', '', 'API/ShooterGame/Player/AShooterCharacter/ServerSetTargeting/index.html', 'update targeting state', 0x20200010n);
registerSearchData('ServerSetRunning', '', 'API/ShooterGame/Player/AShooterCharacter/ServerSetRunning/index.html', 'update targeting state', 0x20200010n);
registerSearchData('BuildPauseReplicationCheckPoints', '', 'API/ShooterGame/Player/AShooterCharacter/BuildPauseReplicationCheckPoints/index.html', 'Builds list of points to check for pausing replication for a connection', 0x00200010n);
registerSearchData('GetMesh1P', '', 'API/ShooterGame/Player/AShooterCharacter/GetMesh1P/index.html', 'Returns Mesh1P subobject *', 0x00a00010n);
registerSearchData('NotifyEquipWeapon', '', 'API/ShooterGame/Player/AShooterCharacter/NotifyEquipWeapon/index.html', 'Global notification when a character equips a weapon. Needed for replication graph.', 0x00120020n);
registerSearchData('NotifyUnEquipWeapon', '', 'API/ShooterGame/Player/AShooterCharacter/NotifyUnEquipWeapon/index.html', 'Global notification when a character un-equips a weapon. Needed for replication graph.', 0x00120020n);
registerSearchData('Mesh1P', '', 'API/ShooterGame/Player/AShooterCharacter/Mesh1P/index.html', 'pawn mesh: 1st person view', 0x40400020n);
registerSearchData('WeaponAttachPoint', '', 'API/ShooterGame/Player/AShooterCharacter/WeaponAttachPoint/index.html', 'socket or bone name for attaching weapon mesh', 0x40200020n);
registerSearchData('DefaultInventoryClasses', '', 'API/ShooterGame/Player/AShooterCharacter/DefaultInventoryClasses/index.html', 'default inventory list', 0x40200020n);
registerSearchData('Inventory', '', 'API/ShooterGame/Player/AShooterCharacter/Inventory/index.html', 'weapons in inventory', 0x40200020n);
registerSearchData('CurrentWeapon', '', 'API/ShooterGame/Player/AShooterCharacter/CurrentWeapon/index.html', 'currently equipped weapon', 0x40200020n);
registerSearchData('LastTakeHitInfo', '', 'API/ShooterGame/Player/AShooterCharacter/LastTakeHitInfo/index.html', 'Replicate where this pawn was last hit and damaged', 0x40200020n);
registerSearchData('LastTakeHitTimeTimeout', '', 'API/ShooterGame/Player/AShooterCharacter/LastTakeHitTimeTimeout/index.html', 'Time at which point the last take hit info for the actor times out and won\'t be replicated; Used to stop join-in-progress effects all over the screen', 0x00200020n);
registerSearchData('TargetingSpeedModifier', '', 'API/ShooterGame/Player/AShooterCharacter/TargetingSpeedModifier/index.html', 'modifier for max movement speed', 0x40200020n);
registerSearchData('bIsTargeting', '', 'API/ShooterGame/Player/AShooterCharacter/bIsTargeting/index.html', 'current targeting state', 0x40200020n);
registerSearchData('RunningSpeedModifier', '', 'API/ShooterGame/Player/AShooterCharacter/RunningSpeedModifier/index.html', 'modifier for max movement speed', 0x40200020n);
registerSearchData('bWantsToRun', '', 'API/ShooterGame/Player/AShooterCharacter/bWantsToRun/index.html', 'current running state', 0x40200020n);
registerSearchData('bWantsToRunToggled', '', 'API/ShooterGame/Player/AShooterCharacter/bWantsToRunToggled/index.html', 'from gamepad running is toggled', 0x00200020n);
registerSearchData('bWantsToFire', '', 'API/ShooterGame/Player/AShooterCharacter/bWantsToFire/index.html', 'current firing state', 0x00200020n);
registerSearchData('LowHealthPercentage', '', 'API/ShooterGame/Player/AShooterCharacter/LowHealthPercentage/index.html', 'when low health effects should start', 0x00200020n);
registerSearchData('BaseTurnRate', '', 'API/ShooterGame/Player/AShooterCharacter/BaseTurnRate/index.html', 'Base turn rate, in deg/sec. Other scaling may affect final turn rate.', 0x00200020n);
registerSearchData('BaseLookUpRate', '', 'API/ShooterGame/Player/AShooterCharacter/BaseLookUpRate/index.html', 'Base lookup rate, in deg/sec. Other scaling may affect final lookup rate.', 0x00200020n);
registerSearchData('MeshMIDs', '', 'API/ShooterGame/Player/AShooterCharacter/MeshMIDs/index.html', 'material instances for setting team color in mesh (3rd person view)', 0x40200020n);
registerSearchData('DeathAnim', '', 'API/ShooterGame/Player/AShooterCharacter/DeathAnim/index.html', 'animation played on death', 0x40200020n);
registerSearchData('DeathSound', '', 'API/ShooterGame/Player/AShooterCharacter/DeathSound/index.html', 'sound played on death, local player only', 0x40200020n);
registerSearchData('RespawnFX', '', 'API/ShooterGame/Player/AShooterCharacter/RespawnFX/index.html', 'effect played on respawn', 0x40200020n);
registerSearchData('RespawnSound', '', 'API/ShooterGame/Player/AShooterCharacter/RespawnSound/index.html', 'sound played on respawn', 0x40200020n);
registerSearchData('LowHealthSound', '', 'API/ShooterGame/Player/AShooterCharacter/LowHealthSound/index.html', 'sound played when health is low', 0x40200020n);
registerSearchData('RunLoopSound', '', 'API/ShooterGame/Player/AShooterCharacter/RunLoopSound/index.html', 'sound played when running', 0x40200020n);
registerSearchData('RunStopSound', '', 'API/ShooterGame/Player/AShooterCharacter/RunStopSound/index.html', 'sound played when stop running', 0x40200020n);
registerSearchData('TargetingSound', '', 'API/ShooterGame/Player/AShooterCharacter/TargetingSound/index.html', 'sound played when targeting state changes', 0x40200020n);
registerSearchData('RunLoopAC', '', 'API/ShooterGame/Player/AShooterCharacter/RunLoopAC/index.html', 'used to manipulate with run loop sound', 0x40200020n);
registerSearchData('LowHealthWarningPlayer', '', 'API/ShooterGame/Player/AShooterCharacter/LowHealthWarningPlayer/index.html', 'hook to looped low health sound used to stop/adjust volume', 0x40200020n);
registerSearchData('bIsDying', '', 'API/ShooterGame/Player/AShooterCharacter/bIsDying/index.html', 'Identifies if pawn is in its dying state', 0x40100020n);
registerSearchData('Health', '', 'API/ShooterGame/Player/AShooterCharacter/Health/index.html', 'Current health of the Pawn', 0x40100020n);
registerSearchData('UShooterCharacterMovement', '', 'API/ShooterGame/Player/UShooterCharacterMovement/index.html', 'Movement component meant for use with Pawns.', 0x04000001n);
registerSearchData('GetMaxSpeed', '', 'API/ShooterGame/Player/UShooterCharacterMovement/GetMaxSpeed/index.html', '', 0x00940010n);
registerSearchData('AShooterPlayerController', '', 'API/ShooterGame/Player/AShooterPlayerController/index.html', 'Copyright 1998-2019 Epic Games, Inc. All Rights Reserved.', 0x04000001n);
registerSearchData('ClientSetSpectatorCamera', '', 'API/ShooterGame/Player/AShooterPlayerController/ClientSetSpectatorCamera/index.html', 'sets spectator location and rotation', 0x20100010n);
registerSearchData('ClientGameStarted', '', 'API/ShooterGame/Player/AShooterPlayerController/ClientGameStarted/index.html', 'notify player about started match', 0x20100010n);
registerSearchData('ClientStartOnlineGame', '', 'API/ShooterGame/Player/AShooterPlayerController/ClientStartOnlineGame/index.html', 'Starts the online game using the session name in the PlayerState', 0x20100010n);
registerSearchData('ClientEndOnlineGame', '', 'API/ShooterGame/Player/AShooterPlayerController/ClientEndOnlineGame/index.html', 'Ends the online game using the session name in the PlayerState', 0x20100010n);
registerSearchData('ClientGameEnded_Implementation', '', 'API/ShooterGame/Player/AShooterPlayerController/ClientGameEnded_Implementation/index.html', 'notify player about finished match', 0x00140010n);
registerSearchData('ClientSendRoundEndEvent', '', 'API/ShooterGame/Player/AShooterPlayerController/ClientSendRoundEndEvent/index.html', 'Notifies clients to send the end-of-round event', 0x20100010n);
registerSearchData('SimulateInputKey', '', 'API/ShooterGame/Player/AShooterPlayerController/SimulateInputKey/index.html', 'used for input simulation from blueprint (for automatic perf tests)', 0x20100010n);
registerSearchData('SimulateInputKey', 'Simulate Input Key', 'BlueprintAPI/Input/SimulateInputKey/index.html', 'used for input simulation from blueprint (for automatic perf tests)', 0x20100040n);
registerSearchData('ServerCheat', '', 'API/ShooterGame/Player/AShooterPlayerController/ServerCheat/index.html', 'sends cheat message', 0x20100010n);
registerSearchData('ClientTeamMessage_Implementation', '', 'API/ShooterGame/Player/AShooterPlayerController/ClientTeamMessage_Implementation/index.html', 'Overriden Message implementation.', 0x00140010n);
registerSearchData('ToggleChatWindow', '', 'API/ShooterGame/Player/AShooterPlayerController/ToggleChatWindow/index.html', 'Tell the HUD to toggle the chat window.', 0x00100010n);
registerSearchData('Say', '', 'API/ShooterGame/Player/AShooterPlayerController/Say/index.html', 'Local function say a string', 0x20140010n);
registerSearchData('ServerSay', '', 'API/ShooterGame/Player/AShooterPlayerController/ServerSay/index.html', 'RPC for clients to talk to server', 0x20100010n);
registerSearchData('OnDeathMessage', '', 'API/ShooterGame/Player/AShooterPlayerController/OnDeathMessage/index.html', 'notify local client about deaths', 0x00100010n);
registerSearchData('OnToggleInGameMenu', '', 'API/ShooterGame/Player/AShooterPlayerController/OnToggleInGameMenu/index.html', 'toggle InGameMenu handler', 0x00100010n);
registerSearchData('ShowInGameMenu', '', 'API/ShooterGame/Player/AShooterPlayerController/ShowInGameMenu/index.html', 'Show the in-game menu if it\'s not already showing', 0x00100010n);
registerSearchData('OnConditionalCloseScoreboard', '', 'API/ShooterGame/Player/AShooterPlayerController/OnConditionalCloseScoreboard/index.html', 'Hides scoreboard if currently diplayed', 0x00100010n);
registerSearchData('OnToggleScoreboard', '', 'API/ShooterGame/Player/AShooterPlayerController/OnToggleScoreboard/index.html', 'Toggles scoreboard', 0x00100010n);
registerSearchData('OnShowScoreboard', '', 'API/ShooterGame/Player/AShooterPlayerController/OnShowScoreboard/index.html', 'shows scoreboard', 0x00100010n);
registerSearchData('OnHideScoreboard', '', 'API/ShooterGame/Player/AShooterPlayerController/OnHideScoreboard/index.html', 'hides scoreboard', 0x00100010n);
registerSearchData('SetInfiniteAmmo', '', 'API/ShooterGame/Player/AShooterPlayerController/SetInfiniteAmmo/index.html', 'set infinite ammo cheat', 0x00100010n);
registerSearchData('SetInfiniteClip', '', 'API/ShooterGame/Player/AShooterPlayerController/SetInfiniteClip/index.html', 'set infinite clip cheat', 0x00100010n);
registerSearchData('SetHealthRegen', '', 'API/ShooterGame/Player/AShooterPlayerController/SetHealthRegen/index.html', 'set health regen cheat', 0x00100010n);
registerSearchData('SetGodMode', '', 'API/ShooterGame/Player/AShooterPlayerController/SetGodMode/index.html', 'set god mode cheat', 0x20100010n);
registerSearchData('SetIsVibrationEnabled', '', 'API/ShooterGame/Player/AShooterPlayerController/SetIsVibrationEnabled/index.html', 'sets the produce force feedback flag.', 0x00100010n);
registerSearchData('HasInfiniteAmmo', '', 'API/ShooterGame/Player/AShooterPlayerController/HasInfiniteAmmo/index.html', 'get infinite ammo cheat', 0x00900010n);
registerSearchData('HasInfiniteClip', '', 'API/ShooterGame/Player/AShooterPlayerController/HasInfiniteClip/index.html', 'get infinite clip cheat', 0x00900010n);
registerSearchData('HasHealthRegen', '', 'API/ShooterGame/Player/AShooterPlayerController/HasHealthRegen/index.html', 'get health regen cheat', 0x00900010n);
registerSearchData('HasGodMode', '', 'API/ShooterGame/Player/AShooterPlayerController/HasGodMode/index.html', 'get gode mode cheat', 0x00900010n);
registerSearchData('IsVibrationEnabled', '', 'API/ShooterGame/Player/AShooterPlayerController/IsVibrationEnabled/index.html', 'should produce force feedback?', 0x00900010n);
registerSearchData('IsGameInputAllowed', '', 'API/ShooterGame/Player/AShooterPlayerController/IsGameInputAllowed/index.html', 'check if gameplay related actions (movement, weapon usage, etc) are allowed right now', 0x00900010n);
registerSearchData('IsGameMenuVisible', '', 'API/ShooterGame/Player/AShooterPlayerController/IsGameMenuVisible/index.html', 'is game menu currently active?', 0x00900010n);
registerSearchData('CleanupSessionOnReturnToMenu', '', 'API/ShooterGame/Player/AShooterPlayerController/CleanupSessionOnReturnToMenu/index.html', 'Ends and/or destroys game session', 0x00100010n);
registerSearchData('OnQueryAchievementsComplete', '', 'API/ShooterGame/Player/AShooterPlayerController/OnQueryAchievementsComplete/index.html', 'Called when the read achievements request from the server is complete ', 0x00100010n);
registerSearchData('OnLeaderboardReadComplete', '', 'API/ShooterGame/Player/AShooterPlayerController/OnLeaderboardReadComplete/index.html', '', 0x20100010n);
registerSearchData('SetCinematicMode', '', 'API/ShooterGame/Player/AShooterPlayerController/SetCinematicMode/index.html', 'handle weapon visibility', 0x00140010n);
registerSearchData('IsMoveInputIgnored', '', 'API/ShooterGame/Player/AShooterPlayerController/IsMoveInputIgnored/index.html', 'Returns true if movement input is ignored. Overridden to always allow spectators to move.', 0x00940010n);
registerSearchData('IsLookInputIgnored', '', 'API/ShooterGame/Player/AShooterPlayerController/IsLookInputIgnored/index.html', 'Returns true if look input is ignored. Overridden to always allow spectators to look around.', 0x00940010n);
registerSearchData('InitInputSystem', '', 'API/ShooterGame/Player/AShooterPlayerController/InitInputSystem/index.html', 'initialize the input system from the player settings', 0x00140010n);
registerSearchData('SetPause', '', 'API/ShooterGame/Player/AShooterPlayerController/SetPause/index.html', '', 0x00140010n);
registerSearchData('GetFocalLocation', '', 'API/ShooterGame/Player/AShooterPlayerController/GetFocalLocation/index.html', '', 0x00940010n);
registerSearchData('QueryAchievements', '', 'API/ShooterGame/Player/AShooterPlayerController/QueryAchievements/index.html', 'Reads achievements to precache them before first use', 0x00100010n);
registerSearchData('QueryStats', '', 'API/ShooterGame/Player/AShooterPlayerController/QueryStats/index.html', 'Reads backend stats to precache them before first use', 0x00100010n);
registerSearchData('UpdateAchievementProgress', '', 'API/ShooterGame/Player/AShooterPlayerController/UpdateAchievementProgress/index.html', 'Writes a single achievement (unless another write is in progress). ', 0x00100010n);
registerSearchData('GetShooterHUD', '', 'API/ShooterGame/Player/AShooterPlayerController/GetShooterHUD/index.html', 'Returns a pointer to the shooter game hud. May return NULL.', 0x00900010n);
registerSearchData('OnKill', '', 'API/ShooterGame/Player/AShooterPlayerController/OnKill/index.html', 'Informs that player fragged someone', 0x00100010n);
registerSearchData('HandleReturnToMainMenu', '', 'API/ShooterGame/Player/AShooterPlayerController/HandleReturnToMainMenu/index.html', 'Cleans up any resources necessary to return to main menu. Does not modify GameInstance state.', 0x00140010n);
registerSearchData('SetPlayer', '', 'API/ShooterGame/Player/AShooterPlayerController/SetPlayer/index.html', 'Associate a new UPlayer with this PlayerController.', 0x00140010n);
registerSearchData('PreClientTravel', '', 'API/ShooterGame/Player/AShooterPlayerController/PreClientTravel/index.html', 'end AShooterPlayerController-specific', 0x00140010n);
registerSearchData('FindDeathCameraSpot', '', 'API/ShooterGame/Player/AShooterPlayerController/FindDeathCameraSpot/index.html', 'try to find spot for death cam', 0x00200010n);
registerSearchData('BeginDestroy', '', 'API/ShooterGame/Player/AShooterPlayerController/BeginDestroy/index.html', '', 0x00240010n);
registerSearchData('PostInitializeComponents', '', 'API/ShooterGame/Player/AShooterPlayerController/PostInitializeComponents/index.html', 'after all game elements are created', 0x00240010n);
registerSearchData('ClearLeaderboardDelegate', '', 'API/ShooterGame/Player/AShooterPlayerController/ClearLeaderboardDelegate/index.html', '', 0x00200010n);
registerSearchData('TickActor', '', 'API/ShooterGame/Player/AShooterPlayerController/TickActor/index.html', '', 0x00140010n);
registerSearchData('FailedToSpawnPawn', '', 'API/ShooterGame/Player/AShooterPlayerController/FailedToSpawnPawn/index.html', 'transition to dead state, retries spawning later', 0x00140010n);
registerSearchData('PawnPendingDestroy', '', 'API/ShooterGame/Player/AShooterPlayerController/PawnPendingDestroy/index.html', 'update camera when pawn dies', 0x00140010n);
registerSearchData('UnFreeze', '', 'API/ShooterGame/Player/AShooterPlayerController/UnFreeze/index.html', 'respawn after dying', 0x00140010n);
registerSearchData('SetupInputComponent', '', 'API/ShooterGame/Player/AShooterPlayerController/SetupInputComponent/index.html', 'sets up input', 0x00140010n);
registerSearchData('GameHasEnded', '', 'API/ShooterGame/Player/AShooterPlayerController/GameHasEnded/index.html', 'Called from game info upon end of the game, used to transition to proper state. ', 0x00140010n);
registerSearchData('ClientReturnToMainMenu_Implementation', '', 'API/ShooterGame/Player/AShooterPlayerController/ClientReturnToMainMenu_Implementation/index.html', 'Return the client to the main menu gracefully. ONLY sets GI state.', 0x00100010n);
registerSearchData('Suicide', '', 'API/ShooterGame/Player/AShooterPlayerController/Suicide/index.html', 'Causes the player to commit suicide', 0x20140010n);
registerSearchData('ServerSuicide', '', 'API/ShooterGame/Player/AShooterPlayerController/ServerSuicide/index.html', 'Notifies the server that the client has suicided', 0x20100010n);
registerSearchData('UpdateAchievementsOnGameEnd', '', 'API/ShooterGame/Player/AShooterPlayerController/UpdateAchievementsOnGameEnd/index.html', 'Updates achievements based on the PersistentUser stats at the end of a round', 0x00100010n);
registerSearchData('UpdateLeaderboardsOnGameEnd', '', 'API/ShooterGame/Player/AShooterPlayerController/UpdateLeaderboardsOnGameEnd/index.html', 'Updates leaderboard stats at the end of a round', 0x00100010n);
registerSearchData('UpdateStatsOnGameEnd', '', 'API/ShooterGame/Player/AShooterPlayerController/UpdateStatsOnGameEnd/index.html', 'Updates stats at the end of a round', 0x00100010n);
registerSearchData('UpdateSaveFileOnGameEnd', '', 'API/ShooterGame/Player/AShooterPlayerController/UpdateSaveFileOnGameEnd/index.html', 'Updates the save file at the end of a round', 0x00100010n);
registerSearchData('bInfiniteAmmo', '', 'API/ShooterGame/Player/AShooterPlayerController/bInfiniteAmmo/index.html', 'infinite ammo cheat', 0x40200020n);
registerSearchData('bInfiniteClip', '', 'API/ShooterGame/Player/AShooterPlayerController/bInfiniteClip/index.html', 'infinite clip cheat', 0x40200020n);
registerSearchData('bHealthRegen', '', 'API/ShooterGame/Player/AShooterPlayerController/bHealthRegen/index.html', 'health regen cheat', 0x40200020n);
registerSearchData('bGodMode', '', 'API/ShooterGame/Player/AShooterPlayerController/bGodMode/index.html', 'god mode cheat', 0x40200020n);
registerSearchData('bIsVibrationEnabled', '', 'API/ShooterGame/Player/AShooterPlayerController/bIsVibrationEnabled/index.html', 'should produce force feedback?', 0x00200020n);
registerSearchData('bAllowGameActions', '', 'API/ShooterGame/Player/AShooterPlayerController/bAllowGameActions/index.html', 'if set, gameplay related actions (movement, weapn usage, etc) are allowed', 0x00200020n);
registerSearchData('bGameEndedFrame', '', 'API/ShooterGame/Player/AShooterPlayerController/bGameEndedFrame/index.html', 'true for the first frame after the game has ended', 0x00200020n);
registerSearchData('LastDeathLocation', '', 'API/ShooterGame/Player/AShooterPlayerController/LastDeathLocation/index.html', 'stores pawn location at last player death, used where player scores a kill after they died *', 0x00200020n);
registerSearchData('ShooterIngameMenu', '', 'API/ShooterGame/Player/AShooterPlayerController/ShooterIngameMenu/index.html', 'shooter in-game menu', 0x00200020n);
registerSearchData('WriteObject', '', 'API/ShooterGame/Player/AShooterPlayerController/WriteObject/index.html', 'Achievements write object', 0x00200020n);
registerSearchData('StatMatchesPlayed', '', 'API/ShooterGame/Player/AShooterPlayerController/StatMatchesPlayed/index.html', 'Internal. Used to store stats from the online interface. These increment as matches are written', 0x00200020n);
registerSearchData('StatKills', '', 'API/ShooterGame/Player/AShooterPlayerController/StatKills/index.html', '', 0x00200020n);
registerSearchData('StatDeaths', '', 'API/ShooterGame/Player/AShooterPlayerController/StatDeaths/index.html', '', 0x00200020n);
registerSearchData('bHasFetchedPlatformData', '', 'API/ShooterGame/Player/AShooterPlayerController/bHasFetchedPlatformData/index.html', '', 0x00200020n);
registerSearchData('ReadObject', '', 'API/ShooterGame/Player/AShooterPlayerController/ReadObject/index.html', 'Internal. Reads the stats from the platform backend to sync online status with local', 0x00200020n);
registerSearchData('LeaderboardReadCompleteDelegateHandle', '', 'API/ShooterGame/Player/AShooterPlayerController/LeaderboardReadCompleteDelegateHandle/index.html', '', 0x00200020n);
registerSearchData('ServerSayString', '', 'API/ShooterGame/Player/AShooterPlayerController/ServerSayString/index.html', 'End APlayerController interface', 0x00100020n);
registerSearchData('ShooterFriendUpdateTimer', '', 'API/ShooterGame/Player/AShooterPlayerController/ShooterFriendUpdateTimer/index.html', 'Timer used for updating friends in the player tick.', 0x00100020n);
registerSearchData('bHasSentStartEvents', '', 'API/ShooterGame/Player/AShooterPlayerController/bHasSentStartEvents/index.html', 'For tracking whether or not to send the end event', 0x00100020n);
registerSearchData('TimerHandle_ClientStartOnlineGame', '', 'API/ShooterGame/Player/AShooterPlayerController/TimerHandle_ClientStartOnlineGame/index.html', 'Handle for efficient management of ClientStartOnlineGame timer', 0x00400020n);
registerSearchData('FLogCategoryLogShooter', '', 'API/ShooterGame/FLogCategoryLogShooter/index.html', '', 0x00000002n);
registerSearchData('FLogCategoryLogShooter', '', 'API/ShooterGame/FLogCategoryLogShooter/FLogCategoryLogShooter/index.html', '', 0x80100010n);
registerSearchData('FLogCategoryLogShooterWeapon', '', 'API/ShooterGame/FLogCategoryLogShooterWeapon/index.html', '', 0x00000002n);
registerSearchData('FLogCategoryLogShooterWeapon', '', 'API/ShooterGame/FLogCategoryLogShooterWeapon/FLogCategoryLogShooterWeapon/index.html', '', 0x80100010n);
registerSearchData('ShooterUIHelpers', '', 'API/ShooterGame/UI/ShooterUIHelpers/index.html', 'Singleton that contains commonly used UI actions', 0x00000001n);
registerSearchData('Get', '', 'API/ShooterGame/UI/ShooterUIHelpers/Get/index.html', 'gets the singleton.', 0x00120010n);
registerSearchData('GetProfileOpenText', '', 'API/ShooterGame/UI/ShooterUIHelpers/GetProfileOpenText/index.html', 'fetches the string for displaying the profile', 0x00900010n);
registerSearchData('ProfileOpenedUI', '', 'API/ShooterGame/UI/ShooterUIHelpers/ProfileOpenedUI/index.html', 'profile open ui handler', 0x00900010n);
registerSearchData('GetProfileSwapText', '', 'API/ShooterGame/UI/ShooterUIHelpers/GetProfileSwapText/index.html', 'fetches the string for swapping the profile', 0x00900010n);
registerSearchData('ProfileSwapUI', '', 'API/ShooterGame/UI/ShooterUIHelpers/ProfileSwapUI/index.html', 'profile swap ui handler', 0x00900010n);
registerSearchData('SShooterMenuItem', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterMenuItem/index.html', 'class declare', 0x00000001n);
registerSearchData('SLATE_BEGIN_ARGS', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterMenuItem/SLATE_BEGIN_ARGS/index.html', '', 0x80100010n);
registerSearchData('Construct', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterMenuItem/Construct/index.html', 'weak pointer to the parent PC', 0x80100010n);
registerSearchData('SupportsKeyboardFocus', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterMenuItem/SupportsKeyboardFocus/index.html', 'says that we can support keyboard focus', 0x00940010n);
registerSearchData('OnMouseButtonDown', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterMenuItem/OnMouseButtonDown/index.html', 'mouse button down callback', 0x00140010n);
registerSearchData('OnMouseButtonUp', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterMenuItem/OnMouseButtonUp/index.html', 'mouse button up callback', 0x00140010n);
registerSearchData('SetMenuItemActive', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterMenuItem/SetMenuItemActive/index.html', 'sets this menu item as active (selected)', 0x00100010n);
registerSearchData('UpdateItemText', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterMenuItem/UpdateItemText/index.html', 'modify the displayed item text', 0x00100010n);
registerSearchData('GetButtonBgColor', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterMenuItem/GetButtonBgColor/index.html', 'getter for menu item background color', 0x00c00010n);
registerSearchData('GetButtonTextColor', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterMenuItem/GetButtonTextColor/index.html', 'getter for menu item text color', 0x00c00010n);
registerSearchData('GetButtonTextShadowColor', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterMenuItem/GetButtonTextShadowColor/index.html', 'getter for menu item text shadow color', 0x00c00010n);
registerSearchData('GetLeftArrowVisibility', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterMenuItem/GetLeftArrowVisibility/index.html', 'getter for left option arrow visibility', 0x00c00010n);
registerSearchData('GetRightArrowVisibility', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterMenuItem/GetRightArrowVisibility/index.html', 'getter for right option arrow visibility', 0x00c00010n);
registerSearchData('GetOptionPadding', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterMenuItem/GetOptionPadding/index.html', 'getter option padding (depends on right arrow visibility)', 0x00c00010n);
registerSearchData('OnRightArrowDown', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterMenuItem/OnRightArrowDown/index.html', 'calls OnArrowPressed', 0x00400010n);
registerSearchData('OnLeftArrowDown', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterMenuItem/OnLeftArrowDown/index.html', 'calls OnArrowPressed', 0x00400010n);
registerSearchData('', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterMenuItem//index.html', '', 0x00100020n);
registerSearchData('LeftArrowVisible', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterMenuItem/LeftArrowVisible/index.html', 'set in option item to enable left arrow', 0x00100020n);
registerSearchData('RightArrowVisible', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterMenuItem/RightArrowVisible/index.html', 'set in option item to enable right arrow', 0x00100020n);
registerSearchData('OnClicked', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterMenuItem/OnClicked/index.html', 'the delegate to execute when the button is clicked', 0x00200020n);
registerSearchData('OnArrowPressed', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterMenuItem/OnArrowPressed/index.html', 'the delegate to execute when one of arrows was pressed', 0x00200020n);
registerSearchData('Text', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterMenuItem/Text/index.html', 'menu item text attribute', 0x00400020n);
registerSearchData('OptionText', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterMenuItem/OptionText/index.html', 'menu item option text attribute', 0x00400020n);
registerSearchData('TextWidget', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterMenuItem/TextWidget/index.html', 'menu item text widget', 0x00400020n);
registerSearchData('TextColor', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterMenuItem/TextColor/index.html', 'menu item text color', 0x00400020n);
registerSearchData('ItemMargin', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterMenuItem/ItemMargin/index.html', 'item margin', 0x00400020n);
registerSearchData('InactiveTextAlpha', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterMenuItem/InactiveTextAlpha/index.html', 'inactive text alpha value', 0x00400020n);
registerSearchData('bIsActiveMenuItem', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterMenuItem/bIsActiveMenuItem/index.html', 'active item flag', 0x00400020n);
registerSearchData('bIsMultichoice', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterMenuItem/bIsMultichoice/index.html', 'is this menu item represents multi-choice field', 0x00400020n);
registerSearchData('PlayerOwner', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterMenuItem/PlayerOwner/index.html', 'pointer to our parent PC', 0x00400020n);
registerSearchData('ItemStyle', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterMenuItem/ItemStyle/index.html', 'style for the menu item', 0x00c00020n);
registerSearchData('FShooterMenuInfo', '', 'API/ShooterGame/UI/Menu/Widgets/FShooterMenuInfo/index.html', '', 0x00000001n);
registerSearchData('FShooterMenuInfo', '', 'API/ShooterGame/UI/Menu/Widgets/FShooterMenuInfo/FShooterMenuInfo/index.html', 'constructor making filling required information easy', 0x80100010n);
registerSearchData('Menu', '', 'API/ShooterGame/UI/Menu/Widgets/FShooterMenuInfo/Menu/index.html', 'menu items array', 0x00100020n);
registerSearchData('SelectedIndex', '', 'API/ShooterGame/UI/Menu/Widgets/FShooterMenuInfo/SelectedIndex/index.html', 'last selection in this menu', 0x00100020n);
registerSearchData('MenuTitle', '', 'API/ShooterGame/UI/Menu/Widgets/FShooterMenuInfo/MenuTitle/index.html', 'menu title', 0x00100020n);
registerSearchData('FShooterMenuItem', '', 'API/ShooterGame/UI/Menu/Widgets/FShooterMenuItem/index.html', '', 0x00000001n);
registerSearchData('FShooterMenuItem', '', 'API/ShooterGame/UI/Menu/Widgets/FShooterMenuItem/FShooterMenuItem/index.html', 'constructor accepting menu item text', 0x80100010n);
registerSearchData('FShooterMenuItem', '', 'API/ShooterGame/UI/Menu/Widgets/FShooterMenuItem/FShooterMenuItem-2-0/index.html', 'custom widgets cannot contain sub menus, all functionality must be handled by custom widget itself', 0x80100010n);
registerSearchData('FShooterMenuItem', '', 'API/ShooterGame/UI/Menu/Widgets/FShooterMenuItem/FShooterMenuItem-2-1/index.html', 'constructor for multi-choice item', 0x80100010n);
registerSearchData('GetText', '', 'API/ShooterGame/UI/Menu/Widgets/FShooterMenuItem/GetText/index.html', '', 0x00900010n);
registerSearchData('SetText', '', 'API/ShooterGame/UI/Menu/Widgets/FShooterMenuItem/SetText/index.html', '', 0x00100010n);
registerSearchData('CreateRoot', '', 'API/ShooterGame/UI/Menu/Widgets/FShooterMenuItem/CreateRoot/index.html', 'create special root item', 0x00120010n);
registerSearchData('FShooterMenuItem', '', 'API/ShooterGame/UI/Menu/Widgets/FShooterMenuItem/FShooterMenuItem-2-2/index.html', '', 0x80400010n);
registerSearchData('', '', 'API/ShooterGame/UI/Menu/Widgets/FShooterMenuItem//index.html', '', 0x00100020n);
registerSearchData('', '', 'API/ShooterGame/UI/Menu/Widgets/FShooterMenuItem//index.html', '', 0x00100020n);
registerSearchData('', '', 'API/ShooterGame/UI/Menu/Widgets/FShooterMenuItem//index.html', '', 0x00100020n);
registerSearchData('', '', 'API/ShooterGame/UI/Menu/Widgets/FShooterMenuItem//index.html', '', 0x00100020n);
registerSearchData('', '', 'API/ShooterGame/UI/Menu/Widgets/FShooterMenuItem//index.html', '', 0x00100020n);
registerSearchData('', '', 'API/ShooterGame/UI/Menu/Widgets/FShooterMenuItem//index.html', '', 0x00100020n);
registerSearchData('OnConfirmMenuItem', '', 'API/ShooterGame/UI/Menu/Widgets/FShooterMenuItem/OnConfirmMenuItem/index.html', 'delegate, which is executed by SShooterMenuWidget if user confirms this menu item', 0x00100020n);
registerSearchData('OnOptionChanged', '', 'API/ShooterGame/UI/Menu/Widgets/FShooterMenuItem/OnOptionChanged/index.html', 'multi-choice option changed, parameters are menu item itself and new multi-choice index', 0x00100020n);
registerSearchData('OnControllerFacebuttonLeftPressed', '', 'API/ShooterGame/UI/Menu/Widgets/FShooterMenuItem/OnControllerFacebuttonLeftPressed/index.html', 'delegate, which is executed by SShooterMenuWidget if user presses FacebuttonLeft', 0x00100020n);
registerSearchData('OnControllerDownInputPressed', '', 'API/ShooterGame/UI/Menu/Widgets/FShooterMenuItem/OnControllerDownInputPressed/index.html', 'delegate, which is executed by SShooterMenuWidget if user presses ControllerDownInput', 0x00100020n);
registerSearchData('OnControllerUpInputPressed', '', 'API/ShooterGame/UI/Menu/Widgets/FShooterMenuItem/OnControllerUpInputPressed/index.html', 'delegate, which is executed by SShooterMenuWidget if user presses ControllerUpInput', 0x00100020n);
registerSearchData('OnControllerFacebuttonDownPressed', '', 'API/ShooterGame/UI/Menu/Widgets/FShooterMenuItem/OnControllerFacebuttonDownPressed/index.html', 'delegate, which is executed by SShooterMenuWidget if user presses FacebuttonDown', 0x00100020n);
registerSearchData('MenuItemType', '', 'API/ShooterGame/UI/Menu/Widgets/FShooterMenuItem/MenuItemType/index.html', 'menu item type', 0x00100020n);
registerSearchData('bVisible', '', 'API/ShooterGame/UI/Menu/Widgets/FShooterMenuItem/bVisible/index.html', 'if this menu item will be created when menu is opened', 0x00100020n);
registerSearchData('SubMenu', '', 'API/ShooterGame/UI/Menu/Widgets/FShooterMenuItem/SubMenu/index.html', 'sub menu if present', 0x00100020n);
registerSearchData('Widget', '', 'API/ShooterGame/UI/Menu/Widgets/FShooterMenuItem/Widget/index.html', 'shared pointer to actual slate widget representing the menu item', 0x00100020n);
registerSearchData('CustomWidget', '', 'API/ShooterGame/UI/Menu/Widgets/FShooterMenuItem/CustomWidget/index.html', 'shared pointer to actual slate widget representing the custom menu item, ie whole options screen', 0x00100020n);
registerSearchData('MultiChoice', '', 'API/ShooterGame/UI/Menu/Widgets/FShooterMenuItem/MultiChoice/index.html', 'texts for multiple choice menu item (like INF AMMO ON/OFF or difficulty/resolution etc)', 0x00100020n);
registerSearchData('MinMultiChoiceIndex', '', 'API/ShooterGame/UI/Menu/Widgets/FShooterMenuItem/MinMultiChoiceIndex/index.html', 'set to other value than -1 to limit the options range', 0x00100020n);
registerSearchData('MaxMultiChoiceIndex', '', 'API/ShooterGame/UI/Menu/Widgets/FShooterMenuItem/MaxMultiChoiceIndex/index.html', 'set to other value than -1 to limit the options range', 0x00100020n);
registerSearchData('SelectedMultiChoice', '', 'API/ShooterGame/UI/Menu/Widgets/FShooterMenuItem/SelectedMultiChoice/index.html', 'selected multi-choice index for this menu item', 0x00100020n);
registerSearchData('Text', '', 'API/ShooterGame/UI/Menu/Widgets/FShooterMenuItem/Text/index.html', 'menu item text', 0x00400020n);
registerSearchData('SShooterMenuWidget', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterMenuWidget/index.html', 'class declare', 0x00000001n);
registerSearchData('SLATE_BEGIN_ARGS', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterMenuWidget/SLATE_BEGIN_ARGS/index.html', '', 0x80100010n);
registerSearchData('FOnMenuHidden', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterMenuWidget/FOnMenuHidden/index.html', 'weak pointer to the parent HUD base', 0x80100010n);
registerSearchData('Construct', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterMenuWidget/Construct/index.html', 'every widget needs a construction function', 0x00100010n);
registerSearchData('Tick', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterMenuWidget/Tick/index.html', 'update function. Kind of a hack. Allows us to only start fading in once we are done loading.', 0x00140010n);
registerSearchData('OnMouseButtonDown', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterMenuWidget/OnMouseButtonDown/index.html', 'to have the mouse cursor show up at all times, we need the widget to handle all mouse events', 0x00140010n);
registerSearchData('OnKeyDown', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterMenuWidget/OnKeyDown/index.html', 'key down handler', 0x00140010n);
registerSearchData('SupportsKeyboardFocus', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterMenuWidget/SupportsKeyboardFocus/index.html', 'says that we can support keyboard focus', 0x00940010n);
registerSearchData('OnFocusReceived', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterMenuWidget/OnFocusReceived/index.html', 'The menu sets up the appropriate mouse settings upon focus', 0x00140010n);
registerSearchData('SetupAnimations', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterMenuWidget/SetupAnimations/index.html', 'setups animation lengths, start points and launches initial animations', 0x00100010n);
registerSearchData('BuildLeftPanel', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterMenuWidget/BuildLeftPanel/index.html', 'builds left menu panel', 0x00100010n);
registerSearchData('BuildRightPanel', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterMenuWidget/BuildRightPanel/index.html', 'builds inactive next menu panel (current selections submenu preview)', 0x00100010n);
registerSearchData('EnterSubMenu', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterMenuWidget/EnterSubMenu/index.html', 'starts animations to enter submenu, it will become active menu', 0x00100010n);
registerSearchData('MenuGoBack', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterMenuWidget/MenuGoBack/index.html', 'starts reverse animations to go one level up in menu hierarchy', 0x00100010n);
registerSearchData('ConfirmMenuItem', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterMenuWidget/ConfirmMenuItem/index.html', 'confirms current menu item and performs an action', 0x00100010n);
registerSearchData('ControllerFacebuttonLeftPressed', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterMenuWidget/ControllerFacebuttonLeftPressed/index.html', 'views a friend\'s profile in the current user\'s in-game menu friend list', 0x00100010n);
registerSearchData('ControllerUpInputPressed', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterMenuWidget/ControllerUpInputPressed/index.html', 'decrement the index of the friend that the user is currently selecting while in the in-game menu friend list', 0x00100010n);
registerSearchData('ControllerDownInputPressed', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterMenuWidget/ControllerDownInputPressed/index.html', 'increment the index of the friend that the user is currently selecting while in the in-game menu friend list', 0x00100010n);
registerSearchData('ControllerFacebuttonDownPressed', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterMenuWidget/ControllerFacebuttonDownPressed/index.html', 'Sends a friend invite to a friend in the current user\'s in-game menu friend list', 0x00100010n);
registerSearchData('BuildAndShowMenu', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterMenuWidget/BuildAndShowMenu/index.html', 'call to rebuild menu and start animating it', 0x00100010n);
registerSearchData('HideMenu', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterMenuWidget/HideMenu/index.html', 'call to hide menu', 0x00100010n);
registerSearchData('UpdateArrows', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterMenuWidget/UpdateArrows/index.html', 'updates arrows visibility for multi-choice menu item', 0x00100010n);
registerSearchData('ChangeOption', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterMenuWidget/ChangeOption/index.html', 'changes option in multi-choice menu item', 0x00100010n);
registerSearchData('GetNextValidIndex', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterMenuWidget/GetNextValidIndex/index.html', 'get next valid index, ignoring invisible items', 0x00100010n);
registerSearchData('LockControls', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterMenuWidget/LockControls/index.html', 'disable/enable moving around menu', 0x00100010n);
registerSearchData('GetOwnerUserIndex', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterMenuWidget/GetOwnerUserIndex/index.html', 'Cache the UserIndex from the owning PlayerController', 0x00100010n);
registerSearchData('GetMenuLevel', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterMenuWidget/GetMenuLevel/index.html', 'returns the number of sublevels on the menu stack', 0x00100010n);
registerSearchData('GetSlateVisibility', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterMenuWidget/GetSlateVisibility/index.html', 'sets hit test invisibility when console is up', 0x00c00010n);
registerSearchData('GetBottomScale', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterMenuWidget/GetBottomScale/index.html', 'getters used for animating the menu', 0x00c00010n);
registerSearchData('GetBottomColor', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterMenuWidget/GetBottomColor/index.html', '', 0x00c00010n);
registerSearchData('GetTopColor', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterMenuWidget/GetTopColor/index.html', '', 0x00c00010n);
registerSearchData('GetMenuOffset', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterMenuWidget/GetMenuOffset/index.html', '', 0x00c00010n);
registerSearchData('GetLeftMenuOffset', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterMenuWidget/GetLeftMenuOffset/index.html', '', 0x00c00010n);
registerSearchData('GetSubMenuOffset', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterMenuWidget/GetSubMenuOffset/index.html', '', 0x00c00010n);
registerSearchData('GetHeaderColor', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterMenuWidget/GetHeaderColor/index.html', 'gets header image color', 0x00c00010n);
registerSearchData('ButtonClicked', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterMenuWidget/ButtonClicked/index.html', 'callback for when one of the N buttons is clicked', 0x00400010n);
registerSearchData('GetOptionText', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterMenuWidget/GetOptionText/index.html', 'gets currently selected multi-choice option', 0x00c00010n);
registerSearchData('GetMenuTitle', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterMenuWidget/GetMenuTitle/index.html', 'gets current menu title string', 0x00c00010n);
registerSearchData('GetProfileSwapOffset', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterMenuWidget/GetProfileSwapOffset/index.html', 'gets the offset of the swap profile UI from the edge of the screen', 0x00c00010n);
registerSearchData('IsProfileSwapActive', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterMenuWidget/IsProfileSwapActive/index.html', 'should the profile swap be active', 0x00c00010n);
registerSearchData('GetProfileSwapVisibility', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterMenuWidget/GetProfileSwapVisibility/index.html', 'gets the visibility of the swap profile UI', 0x00c00010n);
registerSearchData('ProfileUISwap', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterMenuWidget/ProfileUISwap/index.html', 'called when we want to swap the logged in user', 0x00c00010n);
registerSearchData('HandleProfileUISwapClosed', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterMenuWidget/HandleProfileUISwapClosed/index.html', 'delegate for if the profile is swapped', 0x00400010n);
registerSearchData('FadeIn', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterMenuWidget/FadeIn/index.html', 'this function starts the entire fade in process', 0x00400010n);
registerSearchData('', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterMenuWidget//index.html', '', 0x00100020n);
registerSearchData('', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterMenuWidget//index.html', '', 0x00100020n);
registerSearchData('', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterMenuWidget//index.html', '', 0x00100020n);
registerSearchData('MainMenu', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterMenuWidget/MainMenu/index.html', 'main menu for this instance of widget', 0x00100020n);
registerSearchData('CurrentMenu', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterMenuWidget/CurrentMenu/index.html', 'currently active menu', 0x00100020n);
registerSearchData('NextMenu', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterMenuWidget/NextMenu/index.html', 'next menu (for transition and displaying as the right menu)', 0x00100020n);
registerSearchData('MenuHistory', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterMenuWidget/MenuHistory/index.html', 'stack of previous menus', 0x00100020n);
registerSearchData('OnMenuHidden', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterMenuWidget/OnMenuHidden/index.html', 'delegate, which is executed when menu is finished hiding', 0x00100020n);
registerSearchData('OnToggleMenu', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterMenuWidget/OnToggleMenu/index.html', 'bind if menu should be hidden from outside by controller button', 0x00100020n);
registerSearchData('OnGoBack', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterMenuWidget/OnGoBack/index.html', 'executed when user wants to go back to previous menu', 0x00100020n);
registerSearchData('CurrentMenuTitle', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterMenuWidget/CurrentMenuTitle/index.html', 'current menu title if present', 0x00100020n);
registerSearchData('ControllerHideMenuKey', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterMenuWidget/ControllerHideMenuKey/index.html', 'default - start button, change to use different', 0x00100020n);
registerSearchData('bConsoleVisible', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterMenuWidget/bConsoleVisible/index.html', 'if console is currently opened', 0x00100020n);
registerSearchData('MenuWidgetAnimation', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterMenuWidget/MenuWidgetAnimation/index.html', 'our curve sequence and the related handles', 0x00400020n);
registerSearchData('BottomScaleYCurve', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterMenuWidget/BottomScaleYCurve/index.html', 'used for menu background scaling animation at the beginning', 0x00400020n);
registerSearchData('TopColorCurve', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterMenuWidget/TopColorCurve/index.html', 'used for main menu logo fade in animation at the beginning', 0x00400020n);
registerSearchData('BottomColorCurve', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterMenuWidget/BottomColorCurve/index.html', 'used for menu background fade in animation at the beginning', 0x00400020n);
registerSearchData('ButtonsPosXCurve', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterMenuWidget/ButtonsPosXCurve/index.html', 'used for menu buttons slide in animation at the beginning', 0x00400020n);
registerSearchData('SubMenuWidgetAnimation', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterMenuWidget/SubMenuWidgetAnimation/index.html', 'sub menu transition animation sequence', 0x00400020n);
registerSearchData('SubMenuScrollOutCurve', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterMenuWidget/SubMenuScrollOutCurve/index.html', 'sub menu transition animation curve', 0x00400020n);
registerSearchData('LeftMenuWidgetAnimation', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterMenuWidget/LeftMenuWidgetAnimation/index.html', 'current menu transition animation sequence', 0x00400020n);
registerSearchData('LeftMenuScrollOutCurve', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterMenuWidget/LeftMenuScrollOutCurve/index.html', 'current menu transition animation curve', 0x00400020n);
registerSearchData('PlayerOwner', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterMenuWidget/PlayerOwner/index.html', 'weak pointer to our parent PC', 0x00400020n);
registerSearchData('ScreenRes', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterMenuWidget/ScreenRes/index.html', 'screen resolution', 0x00400020n);
registerSearchData('OutlineWidth', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterMenuWidget/OutlineWidth/index.html', 'space between menu item and border', 0x00400020n);
registerSearchData('MenuHeaderHeight', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterMenuWidget/MenuHeaderHeight/index.html', 'menu header height', 0x00400020n);
registerSearchData('MenuHeaderWidth', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterMenuWidget/MenuHeaderWidth/index.html', 'menu header width', 0x00400020n);
registerSearchData('MenuProfileWidth', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterMenuWidget/MenuProfileWidth/index.html', 'menu profile width', 0x00400020n);
registerSearchData('AnimNumber', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterMenuWidget/AnimNumber/index.html', 'animation type index', 0x00400020n);
registerSearchData('SelectedIndex', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterMenuWidget/SelectedIndex/index.html', 'selected index of current menu', 0x00400020n);
registerSearchData('bSubMenuChanging', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterMenuWidget/bSubMenuChanging/index.html', 'right panel animating flag', 0x00400020n);
registerSearchData('bLeftMenuChanging', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterMenuWidget/bLeftMenuChanging/index.html', 'left panel animating flag', 0x00400020n);
registerSearchData('bGoingBack', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterMenuWidget/bGoingBack/index.html', 'going back to previous menu animation flag', 0x00400020n);
registerSearchData('bMenuHiding', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterMenuWidget/bMenuHiding/index.html', 'flag when playing hiding animation', 0x00400020n);
registerSearchData('bGameMenu', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterMenuWidget/bGameMenu/index.html', 'if this is in game menu, do not show background or logo', 0x00400020n);
registerSearchData('bControlsLocked', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterMenuWidget/bControlsLocked/index.html', 'if moving around menu is currently locked', 0x00400020n);
registerSearchData('PendingLeftMenu', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterMenuWidget/PendingLeftMenu/index.html', 'menu that will override current one after transition animation', 0x00400020n);
registerSearchData('LeftBox', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterMenuWidget/LeftBox/index.html', 'left(current) menu layout box', 0x00400020n);
registerSearchData('RightBox', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterMenuWidget/RightBox/index.html', 'right(sub) menu layout box', 0x00400020n);
registerSearchData('MenuStyle', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterMenuWidget/MenuStyle/index.html', 'style for the menu widget', 0x00c00020n);
registerSearchData('FShooterDemoPlaybackMenu', '', 'API/ShooterGame/UI/Menu/FShooterDemoPlaybackMenu/index.html', '', 0x00000001n);
registerSearchData('Construct', '', 'API/ShooterGame/UI/Menu/FShooterDemoPlaybackMenu/Construct/index.html', 'sets owning player controller', 0x00100010n);
registerSearchData('ToggleGameMenu', '', 'API/ShooterGame/UI/Menu/FShooterDemoPlaybackMenu/ToggleGameMenu/index.html', 'toggles in game menu', 0x00100010n);
registerSearchData('GetOwnerUserIndex', '', 'API/ShooterGame/UI/Menu/FShooterDemoPlaybackMenu/GetOwnerUserIndex/index.html', 'get current user index out of PlayerOwner', 0x00a00010n);
registerSearchData('OnMenuGoBack', '', 'API/ShooterGame/UI/Menu/FShooterDemoPlaybackMenu/OnMenuGoBack/index.html', 'called when going back to previous menu', 0x00200010n);
registerSearchData('CloseSubMenu', '', 'API/ShooterGame/UI/Menu/FShooterDemoPlaybackMenu/CloseSubMenu/index.html', 'goes back in menu structure', 0x00200010n);
registerSearchData('DetachGameMenu', '', 'API/ShooterGame/UI/Menu/FShooterDemoPlaybackMenu/DetachGameMenu/index.html', 'removes widget from viewport', 0x00200010n);
registerSearchData('OnCancelExitToMain', '', 'API/ShooterGame/UI/Menu/FShooterDemoPlaybackMenu/OnCancelExitToMain/index.html', 'Delegate called when user cancels confirmation dialog to exit to main menu', 0x00200010n);
registerSearchData('OnConfirmExitToMain', '', 'API/ShooterGame/UI/Menu/FShooterDemoPlaybackMenu/OnConfirmExitToMain/index.html', 'Delegate called when user confirms confirmation dialog to exit to main menu', 0x00200010n);
registerSearchData('OnUIQuit', '', 'API/ShooterGame/UI/Menu/FShooterDemoPlaybackMenu/OnUIQuit/index.html', 'Plays sound and calls Quit', 0x00200010n);
registerSearchData('Quit', '', 'API/ShooterGame/UI/Menu/FShooterDemoPlaybackMenu/Quit/index.html', 'Quits the game', 0x00200010n);
registerSearchData('PlayerOwner', '', 'API/ShooterGame/UI/Menu/FShooterDemoPlaybackMenu/PlayerOwner/index.html', 'Owning player controller', 0x00200020n);
registerSearchData('GameMenuContainer', '', 'API/ShooterGame/UI/Menu/FShooterDemoPlaybackMenu/GameMenuContainer/index.html', 'game menu container widget - used for removing', 0x00200020n);
registerSearchData('RootMenuItem', '', 'API/ShooterGame/UI/Menu/FShooterDemoPlaybackMenu/RootMenuItem/index.html', 'root menu item pointer', 0x00200020n);
registerSearchData('MainMenuItem', '', 'API/ShooterGame/UI/Menu/FShooterDemoPlaybackMenu/MainMenuItem/index.html', 'main menu item pointer', 0x00200020n);
registerSearchData('GameMenuWidget', '', 'API/ShooterGame/UI/Menu/FShooterDemoPlaybackMenu/GameMenuWidget/index.html', 'HUD menu widget', 0x00200020n);
registerSearchData('bIsAddedToViewport', '', 'API/ShooterGame/UI/Menu/FShooterDemoPlaybackMenu/bIsAddedToViewport/index.html', 'if game menu is currently added to the viewport', 0x00200020n);
registerSearchData('FShooterFriends', '', 'API/ShooterGame/UI/Menu/FShooterFriends/index.html', '', 0x00000001n);
registerSearchData('Construct', '', 'API/ShooterGame/UI/Menu/FShooterFriends/Construct/index.html', 'sets owning player controller', 0x00100010n);
registerSearchData('UpdateFriends', '', 'API/ShooterGame/UI/Menu/FShooterFriends/UpdateFriends/index.html', 'get current Friends values for display', 0x00100010n);
registerSearchData('OnApplySettings', '', 'API/ShooterGame/UI/Menu/FShooterFriends/OnApplySettings/index.html', 'UI callback for applying settings, plays sound', 0x00100010n);
registerSearchData('ApplySettings', '', 'API/ShooterGame/UI/Menu/FShooterFriends/ApplySettings/index.html', 'applies changes in game settings', 0x00100010n);
registerSearchData('TellInputAboutKeybindings', '', 'API/ShooterGame/UI/Menu/FShooterFriends/TellInputAboutKeybindings/index.html', 'needed because we can recreate the subsystem that stores it', 0x00100010n);
registerSearchData('IncrementFriendsCounter', '', 'API/ShooterGame/UI/Menu/FShooterFriends/IncrementFriendsCounter/index.html', 'increment the counter keeping track of which user we\'re looking at', 0x00100010n);
registerSearchData('DecrementFriendsCounter', '', 'API/ShooterGame/UI/Menu/FShooterFriends/DecrementFriendsCounter/index.html', 'decrement the counter keeping track of which user we\'re looking at', 0x00100010n);
registerSearchData('ViewSelectedFriendProfile', '', 'API/ShooterGame/UI/Menu/FShooterFriends/ViewSelectedFriendProfile/index.html', 'view the profile of the selected user', 0x00100010n);
registerSearchData('InviteSelectedFriendToGame', '', 'API/ShooterGame/UI/Menu/FShooterFriends/InviteSelectedFriendToGame/index.html', 'send an invite to the selected user', 0x00100010n);
registerSearchData('OnFriendsUpdated', '', 'API/ShooterGame/UI/Menu/FShooterFriends/OnFriendsUpdated/index.html', '', 0x00200010n);
registerSearchData('GetPersistentUser', '', 'API/ShooterGame/UI/Menu/FShooterFriends/GetPersistentUser/index.html', 'Get the persistence user associated with PCOwner', 0x00a00010n);
registerSearchData('FriendsItem', '', 'API/ShooterGame/UI/Menu/FShooterFriends/FriendsItem/index.html', 'holds Friends menu item', 0x00100020n);
registerSearchData('OnApplyChanges', '', 'API/ShooterGame/UI/Menu/FShooterFriends/OnApplyChanges/index.html', 'called when changes were applied - can be used to close submenu', 0x00100020n);
registerSearchData('OnConfirmMenuItem', '', 'API/ShooterGame/UI/Menu/FShooterFriends/OnConfirmMenuItem/index.html', 'delegate, which is executed by SShooterMenuWidget if user confirms this menu item', 0x00100020n);
registerSearchData('OnControllerFacebuttonLeftPressed', '', 'API/ShooterGame/UI/Menu/FShooterFriends/OnControllerFacebuttonLeftPressed/index.html', 'delegate, which is executed by SShooterMenuWidget if facebutton_left is pressed', 0x00100020n);
registerSearchData('OnControllerDownInputPressed', '', 'API/ShooterGame/UI/Menu/FShooterFriends/OnControllerDownInputPressed/index.html', 'delegate, which is executed by SShooterMenuWidget if down input is pressed', 0x00100020n);
registerSearchData('OnControllerUpInputPressed', '', 'API/ShooterGame/UI/Menu/FShooterFriends/OnControllerUpInputPressed/index.html', 'delegate, which is executed by SShooterMenuWidget if up input is pressed', 0x00100020n);
registerSearchData('OnControllerFacebuttonDownPressed', '', 'API/ShooterGame/UI/Menu/FShooterFriends/OnControllerFacebuttonDownPressed/index.html', 'delegate, which is executed by SShooterMenuWidget if facebutton_down is pressed', 0x00100020n);
registerSearchData('LocalUserNum', '', 'API/ShooterGame/UI/Menu/FShooterFriends/LocalUserNum/index.html', '', 0x00100020n);
registerSearchData('CurrFriendIndex', '', 'API/ShooterGame/UI/Menu/FShooterFriends/CurrFriendIndex/index.html', '', 0x00100020n);
registerSearchData('MinFriendIndex', '', 'API/ShooterGame/UI/Menu/FShooterFriends/MinFriendIndex/index.html', '', 0x00100020n);
registerSearchData('MaxFriendIndex', '', 'API/ShooterGame/UI/Menu/FShooterFriends/MaxFriendIndex/index.html', '', 0x00100020n);
registerSearchData('Friends', '', 'API/ShooterGame/UI/Menu/FShooterFriends/Friends/index.html', '', 0x00100020n);
registerSearchData('OnlineSub', '', 'API/ShooterGame/UI/Menu/FShooterFriends/OnlineSub/index.html', '', 0x00100020n);
registerSearchData('OnlineFriendsPtr', '', 'API/ShooterGame/UI/Menu/FShooterFriends/OnlineFriendsPtr/index.html', '', 0x00100020n);
registerSearchData('UserSettings', '', 'API/ShooterGame/UI/Menu/FShooterFriends/UserSettings/index.html', 'User settings pointer', 0x00200020n);
registerSearchData('PlayerOwner', '', 'API/ShooterGame/UI/Menu/FShooterFriends/PlayerOwner/index.html', 'Owning player controller', 0x00200020n);
registerSearchData('FriendsStyle', '', 'API/ShooterGame/UI/Menu/FShooterFriends/FriendsStyle/index.html', 'style used for the shooter Friends', 0x00a00020n);
registerSearchData('FShooterOptions', '', 'API/ShooterGame/UI/Menu/FShooterOptions/index.html', '', 0x00000001n);
registerSearchData('Construct', '', 'API/ShooterGame/UI/Menu/FShooterOptions/Construct/index.html', 'sets owning player controller', 0x00100010n);
registerSearchData('UpdateOptions', '', 'API/ShooterGame/UI/Menu/FShooterOptions/UpdateOptions/index.html', 'get current options values for display', 0x00100010n);
registerSearchData('OnApplySettings', '', 'API/ShooterGame/UI/Menu/FShooterOptions/OnApplySettings/index.html', 'UI callback for applying settings, plays sound', 0x00100010n);
registerSearchData('ApplySettings', '', 'API/ShooterGame/UI/Menu/FShooterOptions/ApplySettings/index.html', 'applies changes in game settings', 0x00100010n);
registerSearchData('TellInputAboutKeybindings', '', 'API/ShooterGame/UI/Menu/FShooterOptions/TellInputAboutKeybindings/index.html', 'needed because we can recreate the subsystem that stores it', 0x00100010n);
registerSearchData('RevertChanges', '', 'API/ShooterGame/UI/Menu/FShooterOptions/RevertChanges/index.html', 'reverts non-saved changes in game settings', 0x00100010n);
registerSearchData('VideoResolutionOptionChanged', '', 'API/ShooterGame/UI/Menu/FShooterOptions/VideoResolutionOptionChanged/index.html', 'video resolution option changed handler', 0x00200010n);
registerSearchData('GraphicsQualityOptionChanged', '', 'API/ShooterGame/UI/Menu/FShooterOptions/GraphicsQualityOptionChanged/index.html', 'graphics quality option changed handler', 0x00200010n);
registerSearchData('InfiniteAmmoOptionChanged', '', 'API/ShooterGame/UI/Menu/FShooterOptions/InfiniteAmmoOptionChanged/index.html', 'infinite ammo option changed handler', 0x00200010n);
registerSearchData('InfiniteClipOptionChanged', '', 'API/ShooterGame/UI/Menu/FShooterOptions/InfiniteClipOptionChanged/index.html', 'infinite clip option changed handler', 0x00200010n);
registerSearchData('FreezeTimerOptionChanged', '', 'API/ShooterGame/UI/Menu/FShooterOptions/FreezeTimerOptionChanged/index.html', 'freeze timer option changed handler', 0x00200010n);
registerSearchData('HealthRegenOptionChanged', '', 'API/ShooterGame/UI/Menu/FShooterOptions/HealthRegenOptionChanged/index.html', 'health regen option changed handler', 0x00200010n);
registerSearchData('AimSensitivityOptionChanged', '', 'API/ShooterGame/UI/Menu/FShooterOptions/AimSensitivityOptionChanged/index.html', 'aim sensitivity option changed handler', 0x00200010n);
registerSearchData('ToggleVibration', '', 'API/ShooterGame/UI/Menu/FShooterOptions/ToggleVibration/index.html', 'controller vibration toggle handler', 0x00200010n);
registerSearchData('InvertYAxisOptionChanged', '', 'API/ShooterGame/UI/Menu/FShooterOptions/InvertYAxisOptionChanged/index.html', 'invert y axis option changed handler', 0x00200010n);
registerSearchData('FullScreenOptionChanged', '', 'API/ShooterGame/UI/Menu/FShooterOptions/FullScreenOptionChanged/index.html', 'full screen option changed handler', 0x00200010n);
registerSearchData('GammaOptionChanged', '', 'API/ShooterGame/UI/Menu/FShooterOptions/GammaOptionChanged/index.html', 'gamma correction option changed handler', 0x00200010n);
registerSearchData('GetCurrentResolutionIndex', '', 'API/ShooterGame/UI/Menu/FShooterOptions/GetCurrentResolutionIndex/index.html', 'try to match current resolution with selected index', 0x00200010n);
registerSearchData('GetCurrentMouseYAxisInvertedIndex', '', 'API/ShooterGame/UI/Menu/FShooterOptions/GetCurrentMouseYAxisInvertedIndex/index.html', 'Get current mouse y-axis inverted option index', 0x00200010n);
registerSearchData('GetCurrentMouseSensitivityIndex', '', 'API/ShooterGame/UI/Menu/FShooterOptions/GetCurrentMouseSensitivityIndex/index.html', 'get current mouse sensitivity option index', 0x00200010n);
registerSearchData('GetCurrentGammaIndex', '', 'API/ShooterGame/UI/Menu/FShooterOptions/GetCurrentGammaIndex/index.html', 'get current gamma index', 0x00200010n);
registerSearchData('GetOwnerUserIndex', '', 'API/ShooterGame/UI/Menu/FShooterOptions/GetOwnerUserIndex/index.html', 'get current user index out of PlayerOwner', 0x00a00010n);
registerSearchData('GetPersistentUser', '', 'API/ShooterGame/UI/Menu/FShooterOptions/GetPersistentUser/index.html', 'Get the persistence user associated with PlayerOwner', 0x00a00010n);
registerSearchData('OptionsItem', '', 'API/ShooterGame/UI/Menu/FShooterOptions/OptionsItem/index.html', 'holds options menu item', 0x00100020n);
registerSearchData('CheatsItem', '', 'API/ShooterGame/UI/Menu/FShooterOptions/CheatsItem/index.html', 'holds cheats menu item', 0x00100020n);
registerSearchData('OnApplyChanges', '', 'API/ShooterGame/UI/Menu/FShooterOptions/OnApplyChanges/index.html', 'called when changes were applied - can be used to close submenu', 0x00100020n);
registerSearchData('UserSettings', '', 'API/ShooterGame/UI/Menu/FShooterOptions/UserSettings/index.html', 'User settings pointer', 0x00200020n);
registerSearchData('PlayerOwner', '', 'API/ShooterGame/UI/Menu/FShooterOptions/PlayerOwner/index.html', 'Owning player controller', 0x00200020n);
registerSearchData('VibrationOption', '', 'API/ShooterGame/UI/Menu/FShooterOptions/VibrationOption/index.html', 'holds vibration option menu item', 0x00200020n);
registerSearchData('InvertYAxisOption', '', 'API/ShooterGame/UI/Menu/FShooterOptions/InvertYAxisOption/index.html', 'holds invert y axis option menu item', 0x00200020n);
registerSearchData('AimSensitivityOption', '', 'API/ShooterGame/UI/Menu/FShooterOptions/AimSensitivityOption/index.html', 'holds aim sensitivity option menu item', 0x00200020n);
registerSearchData('VideoResolutionOption', '', 'API/ShooterGame/UI/Menu/FShooterOptions/VideoResolutionOption/index.html', 'holds mouse sensitivity option menu item', 0x00200020n);
registerSearchData('GraphicsQualityOption', '', 'API/ShooterGame/UI/Menu/FShooterOptions/GraphicsQualityOption/index.html', 'holds graphics quality option menu item', 0x00200020n);
registerSearchData('GammaOption', '', 'API/ShooterGame/UI/Menu/FShooterOptions/GammaOption/index.html', 'holds gamma correction option menu item', 0x00200020n);
registerSearchData('FullScreenOption', '', 'API/ShooterGame/UI/Menu/FShooterOptions/FullScreenOption/index.html', 'holds full screen option menu item', 0x00200020n);
registerSearchData('GraphicsQualityOpt', '', 'API/ShooterGame/UI/Menu/FShooterOptions/GraphicsQualityOpt/index.html', 'graphics quality option', 0x00200020n);
registerSearchData('MinSensitivity', '', 'API/ShooterGame/UI/Menu/FShooterOptions/MinSensitivity/index.html', 'minimum sensitivity index', 0x00200020n);
registerSearchData('SensitivityOpt', '', 'API/ShooterGame/UI/Menu/FShooterOptions/SensitivityOpt/index.html', 'current sensitivity set in options', 0x00200020n);
registerSearchData('GammaOpt', '', 'API/ShooterGame/UI/Menu/FShooterOptions/GammaOpt/index.html', 'current gamma correction set in options', 0x00200020n);
registerSearchData('bFullScreenOpt', '', 'API/ShooterGame/UI/Menu/FShooterOptions/bFullScreenOpt/index.html', 'full screen setting set in options', 0x00200020n);
registerSearchData('bVibrationOpt', '', 'API/ShooterGame/UI/Menu/FShooterOptions/bVibrationOpt/index.html', 'controller vibration setting set in options', 0x00200020n);
registerSearchData('bInvertYAxisOpt', '', 'API/ShooterGame/UI/Menu/FShooterOptions/bInvertYAxisOpt/index.html', 'invert mouse setting set in options', 0x00200020n);
registerSearchData('ResolutionOpt', '', 'API/ShooterGame/UI/Menu/FShooterOptions/ResolutionOpt/index.html', 'resolution setting set in options', 0x00200020n);
registerSearchData('Resolutions', '', 'API/ShooterGame/UI/Menu/FShooterOptions/Resolutions/index.html', 'available resolutions list', 0x00200020n);
registerSearchData('OptionsStyle', '', 'API/ShooterGame/UI/Menu/FShooterOptions/OptionsStyle/index.html', 'style used for the shooter options', 0x00a00020n);
registerSearchData('FShooterRecentlyMet', '', 'API/ShooterGame/UI/Menu/FShooterRecentlyMet/index.html', '', 0x00000001n);
registerSearchData('Construct', '', 'API/ShooterGame/UI/Menu/FShooterRecentlyMet/Construct/index.html', 'sets owning player controller', 0x00100010n);
registerSearchData('UpdateRecentlyMet', '', 'API/ShooterGame/UI/Menu/FShooterRecentlyMet/UpdateRecentlyMet/index.html', 'get current Friends values for display', 0x00100010n);
registerSearchData('OnApplySettings', '', 'API/ShooterGame/UI/Menu/FShooterRecentlyMet/OnApplySettings/index.html', 'UI callback for applying settings, plays sound', 0x00100010n);
registerSearchData('ApplySettings', '', 'API/ShooterGame/UI/Menu/FShooterRecentlyMet/ApplySettings/index.html', 'applies changes in game settings', 0x00100010n);
registerSearchData('TellInputAboutKeybindings', '', 'API/ShooterGame/UI/Menu/FShooterRecentlyMet/TellInputAboutKeybindings/index.html', 'needed because we can recreate the subsystem that stores it', 0x00100010n);
registerSearchData('IncrementRecentlyMetCounter', '', 'API/ShooterGame/UI/Menu/FShooterRecentlyMet/IncrementRecentlyMetCounter/index.html', 'increment the counter keeping track of which user we\'re looking at', 0x00100010n);
registerSearchData('DecrementRecentlyMetCounter', '', 'API/ShooterGame/UI/Menu/FShooterRecentlyMet/DecrementRecentlyMetCounter/index.html', 'decrement the counter keeping track of which user we\'re looking at', 0x00100010n);
registerSearchData('ViewSelectedUsersProfile', '', 'API/ShooterGame/UI/Menu/FShooterRecentlyMet/ViewSelectedUsersProfile/index.html', 'send friend request to selected user', 0x00100010n);
registerSearchData('GetPersistentUser', '', 'API/ShooterGame/UI/Menu/FShooterRecentlyMet/GetPersistentUser/index.html', 'Get the persistence user associated with PCOwner', 0x00a00010n);
registerSearchData('RecentlyMetItem', '', 'API/ShooterGame/UI/Menu/FShooterRecentlyMet/RecentlyMetItem/index.html', 'holds Recently Met sub-menu', 0x00100020n);
registerSearchData('RecentlyMetRoot', '', 'API/ShooterGame/UI/Menu/FShooterRecentlyMet/RecentlyMetRoot/index.html', 'holds Recently Met menu item', 0x00100020n);
registerSearchData('OnApplyChanges', '', 'API/ShooterGame/UI/Menu/FShooterRecentlyMet/OnApplyChanges/index.html', 'called when changes were applied - can be used to close submenu', 0x00100020n);
registerSearchData('OnConfirmMenuItem', '', 'API/ShooterGame/UI/Menu/FShooterRecentlyMet/OnConfirmMenuItem/index.html', 'delegate, which is executed by SShooterMenuWidget if user confirms this menu item', 0x00100020n);
registerSearchData('OnControllerDownInputPressed', '', 'API/ShooterGame/UI/Menu/FShooterRecentlyMet/OnControllerDownInputPressed/index.html', 'delegate, which is executed by SShooterMenuWidget if down input is pressed', 0x00100020n);
registerSearchData('OnControllerUpInputPressed', '', 'API/ShooterGame/UI/Menu/FShooterRecentlyMet/OnControllerUpInputPressed/index.html', 'delegate, which is executed by SShooterMenuWidget if up input is pressed', 0x00100020n);
registerSearchData('OnControllerFacebuttonDownPressed', '', 'API/ShooterGame/UI/Menu/FShooterRecentlyMet/OnControllerFacebuttonDownPressed/index.html', 'delegate, which is executed by SShooterMenuWidget if facebutton_down is pressed', 0x00100020n);
registerSearchData('LocalUserNum', '', 'API/ShooterGame/UI/Menu/FShooterRecentlyMet/LocalUserNum/index.html', '', 0x00100020n);
registerSearchData('CurrRecentlyMetIndex', '', 'API/ShooterGame/UI/Menu/FShooterRecentlyMet/CurrRecentlyMetIndex/index.html', '', 0x00100020n);
registerSearchData('MinRecentlyMetIndex', '', 'API/ShooterGame/UI/Menu/FShooterRecentlyMet/MinRecentlyMetIndex/index.html', '', 0x00100020n);
registerSearchData('MaxRecentlyMetIndex', '', 'API/ShooterGame/UI/Menu/FShooterRecentlyMet/MaxRecentlyMetIndex/index.html', '', 0x00100020n);
registerSearchData('LocalUsername', '', 'API/ShooterGame/UI/Menu/FShooterRecentlyMet/LocalUsername/index.html', '', 0x00100020n);
registerSearchData('PlayerArray', '', 'API/ShooterGame/UI/Menu/FShooterRecentlyMet/PlayerArray/index.html', '', 0x00100020n);
registerSearchData('OnlineSub', '', 'API/ShooterGame/UI/Menu/FShooterRecentlyMet/OnlineSub/index.html', '', 0x00100020n);
registerSearchData('UserSettings', '', 'API/ShooterGame/UI/Menu/FShooterRecentlyMet/UserSettings/index.html', 'User settings pointer', 0x00200020n);
registerSearchData('PlayerOwner', '', 'API/ShooterGame/UI/Menu/FShooterRecentlyMet/PlayerOwner/index.html', 'Owning player controller', 0x00200020n);
registerSearchData('RecentlyMetStyle', '', 'API/ShooterGame/UI/Menu/FShooterRecentlyMet/RecentlyMetStyle/index.html', 'style used for the shooter Friends', 0x00a00020n);
registerSearchData('FShooterIngameMenu', '', 'API/ShooterGame/UI/Menu/FShooterIngameMenu/index.html', '', 0x00000001n);
registerSearchData('Construct', '', 'API/ShooterGame/UI/Menu/FShooterIngameMenu/Construct/index.html', 'sets owning player controller', 0x00100010n);
registerSearchData('ToggleGameMenu', '', 'API/ShooterGame/UI/Menu/FShooterIngameMenu/ToggleGameMenu/index.html', 'toggles in game menu', 0x00100010n);
registerSearchData('GetIsGameMenuUp', '', 'API/ShooterGame/UI/Menu/FShooterIngameMenu/GetIsGameMenuUp/index.html', 'is game menu currently active?', 0x00900010n);
registerSearchData('UpdateFriendsList', '', 'API/ShooterGame/UI/Menu/FShooterIngameMenu/UpdateFriendsList/index.html', 'updates the friends list of the current owner', 0x00100010n);
registerSearchData('GetShooterFriends', '', 'API/ShooterGame/UI/Menu/FShooterIngameMenu/GetShooterFriends/index.html', 'Getter for the ShooterFriends interface/pointer', 0x00100010n);
registerSearchData('GetOwnerUserIndex', '', 'API/ShooterGame/UI/Menu/FShooterIngameMenu/GetOwnerUserIndex/index.html', 'get current user index out of PlayerOwner', 0x00a00010n);
registerSearchData('OnMenuGoBack', '', 'API/ShooterGame/UI/Menu/FShooterIngameMenu/OnMenuGoBack/index.html', 'called when going back to previous menu', 0x00200010n);
registerSearchData('CloseSubMenu', '', 'API/ShooterGame/UI/Menu/FShooterIngameMenu/CloseSubMenu/index.html', 'goes back in menu structure', 0x00200010n);
registerSearchData('DetachGameMenu', '', 'API/ShooterGame/UI/Menu/FShooterIngameMenu/DetachGameMenu/index.html', 'removes widget from viewport', 0x00200010n);
registerSearchData('OnCancelExitToMain', '', 'API/ShooterGame/UI/Menu/FShooterIngameMenu/OnCancelExitToMain/index.html', 'Delegate called when user cancels confirmation dialog to exit to main menu', 0x00200010n);
registerSearchData('OnConfirmExitToMain', '', 'API/ShooterGame/UI/Menu/FShooterIngameMenu/OnConfirmExitToMain/index.html', 'Delegate called when user confirms confirmation dialog to exit to main menu', 0x00200010n);
registerSearchData('OnUIQuit', '', 'API/ShooterGame/UI/Menu/FShooterIngameMenu/OnUIQuit/index.html', 'Plays sound and calls Quit', 0x00200010n);
registerSearchData('Quit', '', 'API/ShooterGame/UI/Menu/FShooterIngameMenu/Quit/index.html', 'Quits the game', 0x00200010n);
registerSearchData('OnShowInviteUI', '', 'API/ShooterGame/UI/Menu/FShooterIngameMenu/OnShowInviteUI/index.html', 'Shows the system UI to invite friends to the game', 0x00200010n);
registerSearchData('PlayerOwner', '', 'API/ShooterGame/UI/Menu/FShooterIngameMenu/PlayerOwner/index.html', 'Owning player controller', 0x00200020n);
registerSearchData('GameMenuContainer', '', 'API/ShooterGame/UI/Menu/FShooterIngameMenu/GameMenuContainer/index.html', 'game menu container widget - used for removing', 0x00200020n);
registerSearchData('RootMenuItem', '', 'API/ShooterGame/UI/Menu/FShooterIngameMenu/RootMenuItem/index.html', 'root menu item pointer', 0x00200020n);
registerSearchData('MainMenuItem', '', 'API/ShooterGame/UI/Menu/FShooterIngameMenu/MainMenuItem/index.html', 'main menu item pointer', 0x00200020n);
registerSearchData('GameMenuWidget', '', 'API/ShooterGame/UI/Menu/FShooterIngameMenu/GameMenuWidget/index.html', 'HUD menu widget', 0x00200020n);
registerSearchData('bIsGameMenuUp', '', 'API/ShooterGame/UI/Menu/FShooterIngameMenu/bIsGameMenuUp/index.html', 'if game menu is currently opened', 0x00200020n);
registerSearchData('CheatsMenu', '', 'API/ShooterGame/UI/Menu/FShooterIngameMenu/CheatsMenu/index.html', 'holds cheats menu item to toggle it\'s visibility', 0x00200020n);
registerSearchData('ShooterOptions', '', 'API/ShooterGame/UI/Menu/FShooterIngameMenu/ShooterOptions/index.html', 'Shooter options', 0x00200020n);
registerSearchData('ShooterFriends', '', 'API/ShooterGame/UI/Menu/FShooterIngameMenu/ShooterFriends/index.html', 'Shooter friends', 0x00200020n);
registerSearchData('ShooterRecentlyMet', '', 'API/ShooterGame/UI/Menu/FShooterIngameMenu/ShooterRecentlyMet/index.html', 'Shooter recently met users', 0x00200020n);
registerSearchData('FServerEntry', '', 'API/ShooterGame/UI/Menu/Widgets/FServerEntry/index.html', 'Copyright 1998-2019 Epic Games, Inc. All Rights Reserved.', 0x00000002n);
registerSearchData('ServerName', '', 'API/ShooterGame/UI/Menu/Widgets/FServerEntry/ServerName/index.html', '', 0x00100020n);
registerSearchData('CurrentPlayers', '', 'API/ShooterGame/UI/Menu/Widgets/FServerEntry/CurrentPlayers/index.html', '', 0x00100020n);
registerSearchData('MaxPlayers', '', 'API/ShooterGame/UI/Menu/Widgets/FServerEntry/MaxPlayers/index.html', '', 0x00100020n);
registerSearchData('GameType', '', 'API/ShooterGame/UI/Menu/Widgets/FServerEntry/GameType/index.html', '', 0x00100020n);
registerSearchData('MapName', '', 'API/ShooterGame/UI/Menu/Widgets/FServerEntry/MapName/index.html', '', 0x00100020n);
registerSearchData('Ping', '', 'API/ShooterGame/UI/Menu/Widgets/FServerEntry/Ping/index.html', '', 0x00100020n);
registerSearchData('SearchResultsIndex', '', 'API/ShooterGame/UI/Menu/Widgets/FServerEntry/SearchResultsIndex/index.html', '', 0x00100020n);
registerSearchData('SShooterServerList', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterServerList/index.html', 'class declare', 0x00000001n);
registerSearchData('SLATE_BEGIN_ARGS', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterServerList/SLATE_BEGIN_ARGS/index.html', '', 0x80100010n);
registerSearchData('Construct', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterServerList/Construct/index.html', '', 0x80100010n);
registerSearchData('SupportsKeyboardFocus', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterServerList/SupportsKeyboardFocus/index.html', 'if we want to receive focus', 0x00940010n);
registerSearchData('OnFocusReceived', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterServerList/OnFocusReceived/index.html', 'focus received handler - keep the ActionBindingsList focused', 0x00140010n);
registerSearchData('OnFocusLost', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterServerList/OnFocusLost/index.html', 'focus lost handler - keep the ActionBindingsList focused', 0x00140010n);
registerSearchData('OnKeyDown', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterServerList/OnKeyDown/index.html', 'key down handler', 0x00140010n);
registerSearchData('OnListItemDoubleClicked', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterServerList/OnListItemDoubleClicked/index.html', 'SListView item double clicked', 0x00100010n);
registerSearchData('MakeListViewWidget', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterServerList/MakeListViewWidget/index.html', 'creates single item widget, called for every list item', 0x00100010n);
registerSearchData('EntrySelectionChanged', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterServerList/EntrySelectionChanged/index.html', 'selection changed handler', 0x00100010n);
registerSearchData('GetGameSession', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterServerList/GetGameSession/index.html', 'Get the current game session ', 0x00900010n);
registerSearchData('UpdateSearchStatus', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterServerList/UpdateSearchStatus/index.html', 'Updates current search status', 0x00100010n);
registerSearchData('BeginServerSearch', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterServerList/BeginServerSearch/index.html', 'Starts searching for servers', 0x00100010n);
registerSearchData('OnServerSearchFinished', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterServerList/OnServerSearchFinished/index.html', 'Called when server search is finished', 0x00100010n);
registerSearchData('UpdateServerList', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterServerList/UpdateServerList/index.html', 'fill/update server list, should be called before showing this control', 0x00100010n);
registerSearchData('ConnectToServer', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterServerList/ConnectToServer/index.html', 'connect to chosen server', 0x00100010n);
registerSearchData('MoveSelection', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterServerList/MoveSelection/index.html', 'selects item at current + MoveBy index', 0x00100010n);
registerSearchData('Tick', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterServerList/Tick/index.html', 'Ticks this widget. Override in derived classes, but always call the parent implementation. ', 0x00100010n);
registerSearchData('GetBottomText', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterServerList/GetBottomText/index.html', 'get current status text', 0x00a00010n);
registerSearchData('bLANMatchSearch', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterServerList/bLANMatchSearch/index.html', 'Whether last searched for LAN (so spacebar works)', 0x00200020n);
registerSearchData('bDedicatedServer', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterServerList/bDedicatedServer/index.html', 'Whether last searched for Dedicated Server (so spacebar works)', 0x00200020n);
registerSearchData('bSearchingForServers', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterServerList/bSearchingForServers/index.html', 'Whether we\'re searching for servers', 0x00200020n);
registerSearchData('LastSearchTime', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterServerList/LastSearchTime/index.html', 'Time the last search began', 0x00200020n);
registerSearchData('MinTimeBetweenSearches', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterServerList/MinTimeBetweenSearches/index.html', 'Minimum time between searches (platform dependent)', 0x00200020n);
registerSearchData('ServerList', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterServerList/ServerList/index.html', 'action bindings array', 0x00200020n);
registerSearchData('ServerListWidget', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterServerList/ServerListWidget/index.html', 'action bindings list slate widget', 0x00200020n);
registerSearchData('SelectedItem', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterServerList/SelectedItem/index.html', 'currently selected list item', 0x00200020n);
registerSearchData('StatusText', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterServerList/StatusText/index.html', 'current status text', 0x00200020n);
registerSearchData('MapFilterName', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterServerList/MapFilterName/index.html', 'Map filter name to use during server searches', 0x00200020n);
registerSearchData('BoxWidth', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterServerList/BoxWidth/index.html', 'size of standard column in pixels', 0x00200020n);
registerSearchData('PlayerOwner', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterServerList/PlayerOwner/index.html', 'pointer to our owner PC', 0x00200020n);
registerSearchData('OwnerWidget', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterServerList/OwnerWidget/index.html', 'pointer to our parent widget', 0x00200020n);
registerSearchData('SShooterDemoList', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterDemoList/index.html', 'class declare', 0x00000001n);
registerSearchData('SLATE_BEGIN_ARGS', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterDemoList/SLATE_BEGIN_ARGS/index.html', '', 0x80100010n);
registerSearchData('Construct', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterDemoList/Construct/index.html', '', 0x80100010n);
registerSearchData('SupportsKeyboardFocus', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterDemoList/SupportsKeyboardFocus/index.html', 'if we want to receive focus', 0x00940010n);
registerSearchData('OnFocusReceived', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterDemoList/OnFocusReceived/index.html', 'focus received handler - keep the ActionBindingsList focused', 0x00140010n);
registerSearchData('OnFocusLost', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterDemoList/OnFocusLost/index.html', 'focus lost handler - keep the ActionBindingsList focused', 0x00140010n);
registerSearchData('OnKeyDown', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterDemoList/OnKeyDown/index.html', 'key down handler', 0x00140010n);
registerSearchData('OnListItemDoubleClicked', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterDemoList/OnListItemDoubleClicked/index.html', 'SListView item double clicked', 0x00100010n);
registerSearchData('MakeListViewWidget', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterDemoList/MakeListViewWidget/index.html', 'creates single item widget, called for every list item', 0x00100010n);
registerSearchData('EntrySelectionChanged', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterDemoList/EntrySelectionChanged/index.html', 'selection changed handler', 0x00100010n);
registerSearchData('UpdateBuildDemoListStatus', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterDemoList/UpdateBuildDemoListStatus/index.html', 'Updates the list until it\'s completely populated', 0x00100010n);
registerSearchData('BuildDemoList', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterDemoList/BuildDemoList/index.html', 'Populates the demo list', 0x00100010n);
registerSearchData('OnBuildDemoListFinished', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterDemoList/OnBuildDemoListFinished/index.html', 'Called when demo list building finished', 0x00100010n);
registerSearchData('OnEnumerateStreamsComplete', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterDemoList/OnEnumerateStreamsComplete/index.html', 'Called when we get results from the replay streaming interface', 0x00100010n);
registerSearchData('PlayDemo', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterDemoList/PlayDemo/index.html', 'Play chosen demo', 0x00100010n);
registerSearchData('DeleteDemo', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterDemoList/DeleteDemo/index.html', 'Delete chosen demo', 0x00100010n);
registerSearchData('OnDemoDeleteConfirm', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterDemoList/OnDemoDeleteConfirm/index.html', 'Delete chosen demo (really)', 0x00100010n);
registerSearchData('OnDemoDeleteCancel', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterDemoList/OnDemoDeleteCancel/index.html', 'Cancel delete chosen demo', 0x00100010n);
registerSearchData('OnDeleteFinishedStreamComplete', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterDemoList/OnDeleteFinishedStreamComplete/index.html', 'Called by delegate when the replay streaming interface has finished deleting', 0x00100010n);
registerSearchData('MoveSelection', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterDemoList/MoveSelection/index.html', 'selects item at current + MoveBy index', 0x00100010n);
registerSearchData('Tick', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterDemoList/Tick/index.html', 'Ticks this widget. Override in derived classes, but always call the parent implementation. ', 0x00100010n);
registerSearchData('IsShowAllReplaysChecked', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterDemoList/IsShowAllReplaysChecked/index.html', 'Callback for \"show all replay versions\" checkbox', 0x00c00010n);
registerSearchData('OnShowAllReplaysChecked', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterDemoList/OnShowAllReplaysChecked/index.html', 'Callback fired when \"show all replay versions\" checkbox is changed', 0x00400010n);
registerSearchData('GetBottomText', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterDemoList/GetBottomText/index.html', 'get current status text', 0x00a00010n);
registerSearchData('EnumerateStreamsVersion', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterDemoList/EnumerateStreamsVersion/index.html', 'Version used for enumerating replays. This is manipulated depending on whether we want to show all versions or not.', 0x00400020n);
registerSearchData('bUpdatingDemoList', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterDemoList/bUpdatingDemoList/index.html', 'Whether we\'re building the demo list or not', 0x00200020n);
registerSearchData('DemoList', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterDemoList/DemoList/index.html', 'action bindings array', 0x00200020n);
registerSearchData('DemoListWidget', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterDemoList/DemoListWidget/index.html', 'action bindings list slate widget', 0x00200020n);
registerSearchData('SelectedItem', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterDemoList/SelectedItem/index.html', 'currently selected list item', 0x00200020n);
registerSearchData('StatusText', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterDemoList/StatusText/index.html', 'current status text', 0x00200020n);
registerSearchData('PlayerOwner', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterDemoList/PlayerOwner/index.html', 'pointer to our owner PC', 0x00200020n);
registerSearchData('OwnerWidget', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterDemoList/OwnerWidget/index.html', 'pointer to our parent widget', 0x00200020n);
registerSearchData('ReplayStreamer', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterDemoList/ReplayStreamer/index.html', 'Network replay streaming interface', 0x00200020n);
registerSearchData('FLeaderboardRow', '', 'API/ShooterGame/UI/Menu/Widgets/FLeaderboardRow/index.html', 'leaderboard row display information', 0x00000002n);
registerSearchData('FLeaderboardRow', '', 'API/ShooterGame/UI/Menu/Widgets/FLeaderboardRow/FLeaderboardRow/index.html', 'Default Constructor', 0x80100010n);
registerSearchData('Rank', '', 'API/ShooterGame/UI/Menu/Widgets/FLeaderboardRow/Rank/index.html', 'player rank', 0x00100020n);
registerSearchData('PlayerName', '', 'API/ShooterGame/UI/Menu/Widgets/FLeaderboardRow/PlayerName/index.html', 'player name', 0x00100020n);
registerSearchData('Kills', '', 'API/ShooterGame/UI/Menu/Widgets/FLeaderboardRow/Kills/index.html', 'player total kills to display', 0x00100020n);
registerSearchData('Deaths', '', 'API/ShooterGame/UI/Menu/Widgets/FLeaderboardRow/Deaths/index.html', 'player total deaths to display', 0x00100020n);
registerSearchData('PlayerId', '', 'API/ShooterGame/UI/Menu/Widgets/FLeaderboardRow/PlayerId/index.html', 'Unique Id for the player at this rank', 0x00900020n);
registerSearchData('SShooterLeaderboard', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterLeaderboard/index.html', 'class declare', 0x00000001n);
registerSearchData('SLATE_BEGIN_ARGS', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterLeaderboard/SLATE_BEGIN_ARGS/index.html', '', 0x80100010n);
registerSearchData('Construct', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterLeaderboard/Construct/index.html', '', 0x80100010n);
registerSearchData('SupportsKeyboardFocus', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterLeaderboard/SupportsKeyboardFocus/index.html', 'if we want to receive focus', 0x00940010n);
registerSearchData('OnFocusReceived', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterLeaderboard/OnFocusReceived/index.html', 'focus received handler - keep the ActionBindingsList focused', 0x00140010n);
registerSearchData('OnFocusLost', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterLeaderboard/OnFocusLost/index.html', 'focus lost handler - keep the ActionBindingsList focused', 0x00140010n);
registerSearchData('OnKeyDown', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterLeaderboard/OnKeyDown/index.html', 'key down handler', 0x00140010n);
registerSearchData('MakeListViewWidget', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterLeaderboard/MakeListViewWidget/index.html', 'creates single item widget, called for every list item', 0x00100010n);
registerSearchData('EntrySelectionChanged', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterLeaderboard/EntrySelectionChanged/index.html', 'selection changed handler', 0x00100010n);
registerSearchData('IsPlayerSelectedAndValid', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterLeaderboard/IsPlayerSelectedAndValid/index.html', 'is there a valid selected item', 0x00900010n);
registerSearchData('GetProfileUIVisibility', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterLeaderboard/GetProfileUIVisibility/index.html', 'check to see if we can open the profile ui', 0x00900010n);
registerSearchData('ProfileUIOpened', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterLeaderboard/ProfileUIOpened/index.html', 'profile open ui handler', 0x00900010n);
registerSearchData('ReadStats', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterLeaderboard/ReadStats/index.html', 'Starts reading leaderboards for the game', 0x00100010n);
registerSearchData('OnStatsRead', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterLeaderboard/OnStatsRead/index.html', 'Called on a particular leaderboard read', 0x00100010n);
registerSearchData('ReadStatsLoginRequired', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterLeaderboard/ReadStatsLoginRequired/index.html', 'Called to login on relevant platforms first before making a leaderboard read', 0x00100010n);
registerSearchData('OnLoginCompleteReadStats', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterLeaderboard/OnLoginCompleteReadStats/index.html', 'Delegate after login has been been completed', 0x00100010n);
registerSearchData('MoveSelection', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterLeaderboard/MoveSelection/index.html', 'selects item at current + MoveBy index', 0x00100010n);
registerSearchData('ClearOnLeaderboardReadCompleteDelegate', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterLeaderboard/ClearOnLeaderboardReadCompleteDelegate/index.html', 'Removes the bound LeaderboardReadCompleteDelegate if possible', 0x00200010n);
registerSearchData('IsLeaderboardReadInProgress', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterLeaderboard/IsLeaderboardReadInProgress/index.html', 'Returns true if a leaderboard read request is in progress or scheduled', 0x00200010n);
registerSearchData('StatRows', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterLeaderboard/StatRows/index.html', 'action bindings array', 0x00200020n);
registerSearchData('ReadObject', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterLeaderboard/ReadObject/index.html', 'Leaderboard read object', 0x00200020n);
registerSearchData('bReadingStats', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterLeaderboard/bReadingStats/index.html', 'Indicates that a stats read operation has been initiated', 0x00200020n);
registerSearchData('LeaderboardReadCompleteDelegate', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterLeaderboard/LeaderboardReadCompleteDelegate/index.html', 'Delegate called when a leaderboard has been successfully read', 0x00200020n);
registerSearchData('RowListWidget', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterLeaderboard/RowListWidget/index.html', 'action bindings list slate widget', 0x00200020n);
registerSearchData('SelectedItem', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterLeaderboard/SelectedItem/index.html', 'currently selected list item', 0x00200020n);
registerSearchData('PlayerOwner', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterLeaderboard/PlayerOwner/index.html', 'pointer to our owner PC', 0x00200020n);
registerSearchData('OwnerWidget', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterLeaderboard/OwnerWidget/index.html', 'pointer to our parent widget', 0x00200020n);
registerSearchData('LeaderboardReadCompleteDelegateHandle', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterLeaderboard/LeaderboardReadCompleteDelegateHandle/index.html', 'Handle to the registered LeaderboardReadComplete delegate', 0x00200020n);
registerSearchData('OnLoginCompleteDelegateHandle', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterLeaderboard/OnLoginCompleteDelegateHandle/index.html', 'Handle to the registered LoginComplete delegate', 0x00200020n);
registerSearchData('FStoreEntry', '', 'API/ShooterGame/UI/Menu/Widgets/FStoreEntry/index.html', 'Copyright 1998-2019 Epic Games, Inc. All Rights Reserved.', 0x00000002n);
registerSearchData('OnlineId', '', 'API/ShooterGame/UI/Menu/Widgets/FStoreEntry/OnlineId/index.html', '', 0x00100020n);
registerSearchData('Title', '', 'API/ShooterGame/UI/Menu/Widgets/FStoreEntry/Title/index.html', '', 0x00100020n);
registerSearchData('Description', '', 'API/ShooterGame/UI/Menu/Widgets/FStoreEntry/Description/index.html', '', 0x00100020n);
registerSearchData('Price', '', 'API/ShooterGame/UI/Menu/Widgets/FStoreEntry/Price/index.html', '', 0x00100020n);
registerSearchData('bPurchased', '', 'API/ShooterGame/UI/Menu/Widgets/FStoreEntry/bPurchased/index.html', '', 0x00100020n);
registerSearchData('SShooterOnlineStore', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterOnlineStore/index.html', 'class declare', 0x00000001n);
registerSearchData('SLATE_BEGIN_ARGS', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterOnlineStore/SLATE_BEGIN_ARGS/index.html', '', 0x80100010n);
registerSearchData('Construct', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterOnlineStore/Construct/index.html', '', 0x80100010n);
registerSearchData('SupportsKeyboardFocus', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterOnlineStore/SupportsKeyboardFocus/index.html', 'if we want to receive focus', 0x00940010n);
registerSearchData('OnFocusReceived', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterOnlineStore/OnFocusReceived/index.html', 'focus received handler - keep the ActionBindingsList focused', 0x00140010n);
registerSearchData('OnFocusLost', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterOnlineStore/OnFocusLost/index.html', 'focus lost handler - keep the ActionBindingsList focused', 0x00140010n);
registerSearchData('OnKeyDown', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterOnlineStore/OnKeyDown/index.html', 'key down handler', 0x00140010n);
registerSearchData('OnListItemDoubleClicked', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterOnlineStore/OnListItemDoubleClicked/index.html', 'SListView item double clicked', 0x00100010n);
registerSearchData('MakeListViewWidget', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterOnlineStore/MakeListViewWidget/index.html', 'creates single item widget, called for every list item', 0x00100010n);
registerSearchData('EntrySelectionChanged', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterOnlineStore/EntrySelectionChanged/index.html', 'selection changed handler', 0x00100010n);
registerSearchData('BeginGettingOffers', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterOnlineStore/BeginGettingOffers/index.html', 'Starts getting the offers etc', 0x00100010n);
registerSearchData('OnGettingOffersFinished', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterOnlineStore/OnGettingOffersFinished/index.html', 'Called when server search is finished', 0x00100010n);
registerSearchData('UpdateServerList', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterOnlineStore/UpdateServerList/index.html', 'fill/update server list, should be called before showing this control', 0x00100010n);
registerSearchData('PurchaseOffer', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterOnlineStore/PurchaseOffer/index.html', 'purchases the chose offer', 0x00100010n);
registerSearchData('MoveSelection', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterOnlineStore/MoveSelection/index.html', 'selects item at current + MoveBy index', 0x00100010n);
registerSearchData('Tick', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterOnlineStore/Tick/index.html', 'Ticks this widget. Override in derived classes, but always call the parent implementation. ', 0x00100010n);
registerSearchData('SetStoreState', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterOnlineStore/SetStoreState/index.html', 'Transitions to new store state', 0x00200010n);
registerSearchData('MarkAsPurchased', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterOnlineStore/MarkAsPurchased/index.html', 'Marks offers as purchased', 0x00200010n);
registerSearchData('GetLoggedInUser', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterOnlineStore/GetLoggedInUser/index.html', 'Returns logged in user', 0x00200010n);
registerSearchData('GetBottomText', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterOnlineStore/GetBottomText/index.html', 'get current status text', 0x00a00010n);
registerSearchData('State', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterOnlineStore/State/index.html', 'Store state', 0x00200020n);
registerSearchData('OfferList', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterOnlineStore/OfferList/index.html', 'action bindings array', 0x00200020n);
registerSearchData('OfferListWidget', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterOnlineStore/OfferListWidget/index.html', 'action bindings list slate widget', 0x00200020n);
registerSearchData('SelectedItem', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterOnlineStore/SelectedItem/index.html', 'currently selected list item', 0x00200020n);
registerSearchData('StatusText', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterOnlineStore/StatusText/index.html', 'current status text', 0x00200020n);
registerSearchData('BoxWidth', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterOnlineStore/BoxWidth/index.html', 'size of standard column in pixels', 0x00200020n);
registerSearchData('PlayerOwner', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterOnlineStore/PlayerOwner/index.html', 'pointer to our owner PC', 0x00200020n);
registerSearchData('OwnerWidget', '', 'API/ShooterGame/UI/Menu/Widgets/SShooterOnlineStore/OwnerWidget/index.html', 'pointer to our parent widget', 0x00200020n);
registerSearchData('FShooterPendingMessage', '', 'API/ShooterGame/FShooterPendingMessage/index.html', 'This class holds the value of what message to display when we are in the \"MessageMenu\" state', 0x00000001n);
registerSearchData('DisplayString', '', 'API/ShooterGame/FShooterPendingMessage/DisplayString/index.html', '', 0x00100020n);
registerSearchData('OKButtonString', '', 'API/ShooterGame/FShooterPendingMessage/OKButtonString/index.html', 'This is the display message in the main message body', 0x00100020n);
registerSearchData('CancelButtonString', '', 'API/ShooterGame/FShooterPendingMessage/CancelButtonString/index.html', 'This is the ok button text', 0x00100020n);
registerSearchData('NextState', '', 'API/ShooterGame/FShooterPendingMessage/NextState/index.html', 'If this is not empty, it will be the cancel button text', 0x00100020n);
registerSearchData('PlayerOwner', '', 'API/ShooterGame/FShooterPendingMessage/PlayerOwner/index.html', 'Final destination state once message is discarded', 0x00100020n);
registerSearchData('FShooterPendingInvite', '', 'API/ShooterGame/FShooterPendingInvite/index.html', 'Owner of dialog who will have focus (can be NULL)', 0x00000001n);
registerSearchData('FShooterPendingInvite', '', 'API/ShooterGame/FShooterPendingInvite/FShooterPendingInvite/index.html', '', 0x80100010n);
registerSearchData('ControllerId', '', 'API/ShooterGame/FShooterPendingInvite/ControllerId/index.html', '', 0x00100020n);
registerSearchData('UserId', '', 'API/ShooterGame/FShooterPendingInvite/UserId/index.html', '', 0x00100020n);
registerSearchData('InviteResult', '', 'API/ShooterGame/FShooterPendingInvite/InviteResult/index.html', '', 0x00100020n);
registerSearchData('bPrivilegesCheckedAndAllowed', '', 'API/ShooterGame/FShooterPendingInvite/bPrivilegesCheckedAndAllowed/index.html', '', 0x00100020n);
registerSearchData('FShooterPlayTogetherInfo', '', 'API/ShooterGame/FShooterPlayTogetherInfo/index.html', '', 0x00000002n);
registerSearchData('FShooterPlayTogetherInfo', '', 'API/ShooterGame/FShooterPlayTogetherInfo/FShooterPlayTogetherInfo/index.html', '', 0x80100010n);
registerSearchData('FShooterPlayTogetherInfo', '', 'API/ShooterGame/FShooterPlayTogetherInfo/FShooterPlayTogetherInfo-2-0/index.html', '', 0x80100010n);
registerSearchData('UserIndex', '', 'API/ShooterGame/FShooterPlayTogetherInfo/UserIndex/index.html', '', 0x00100020n);
registerSearchData('UserIdList', '', 'API/ShooterGame/FShooterPlayTogetherInfo/UserIdList/index.html', '', 0x00100020n);
registerSearchData('SShooterWaitDialog', '', 'API/ShooterGame/SShooterWaitDialog/index.html', '', 0x00000001n);
registerSearchData('SLATE_BEGIN_ARGS', '', 'API/ShooterGame/SShooterWaitDialog/SLATE_BEGIN_ARGS/index.html', '', 0x80100010n);
registerSearchData('Construct', '', 'API/ShooterGame/SShooterWaitDialog/Construct/index.html', '', 0x80100010n);
registerSearchData('GetTextColor', '', 'API/ShooterGame/SShooterWaitDialog/GetTextColor/index.html', 'Gets the animated text color', 0x00c00010n);
registerSearchData('WidgetAnimation', '', 'API/ShooterGame/SShooterWaitDialog/WidgetAnimation/index.html', 'our curve sequence and the related handles', 0x00400020n);
registerSearchData('TextColorCurve', '', 'API/ShooterGame/SShooterWaitDialog/TextColorCurve/index.html', 'used for animating the text color.', 0x00400020n);
registerSearchData('UShooterGameInstance', '', 'API/ShooterGame/UShooterGameInstance/index.html', '', 0x04000001n);
registerSearchData('Tick', '', 'API/ShooterGame/UShooterGameInstance/Tick/index.html', '', 0x00100010n);
registerSearchData('GetGameSession', '', 'API/ShooterGame/UShooterGameInstance/GetGameSession/index.html', '', 0x00900010n);
registerSearchData('Init', '', 'API/ShooterGame/UShooterGameInstance/Init/index.html', '', 0x00140010n);
registerSearchData('Shutdown', '', 'API/ShooterGame/UShooterGameInstance/Shutdown/index.html', '', 0x00140010n);
registerSearchData('StartGameInstance', '', 'API/ShooterGame/UShooterGameInstance/StartGameInstance/index.html', '', 0x00140010n);
registerSearchData('StartPlayInEditorGameInstance', '', 'API/ShooterGame/UShooterGameInstance/StartPlayInEditorGameInstance/index.html', '', 0x00140010n);
registerSearchData('ReceivedNetworkEncryptionToken', '', 'API/ShooterGame/UShooterGameInstance/ReceivedNetworkEncryptionToken/index.html', '', 0x00140010n);
registerSearchData('ReceivedNetworkEncryptionAck', '', 'API/ShooterGame/UShooterGameInstance/ReceivedNetworkEncryptionAck/index.html', '', 0x00140010n);
registerSearchData('HostGame', '', 'API/ShooterGame/UShooterGameInstance/HostGame/index.html', '', 0x00100010n);
registerSearchData('JoinSession', '', 'API/ShooterGame/UShooterGameInstance/JoinSession/index.html', '', 0x00100010n);
registerSearchData('JoinSession', '', 'API/ShooterGame/UShooterGameInstance/JoinSession-2-0/index.html', '', 0x00100010n);
registerSearchData('SetPendingInvite', '', 'API/ShooterGame/UShooterGameInstance/SetPendingInvite/index.html', '', 0x00100010n);
registerSearchData('PlayDemo', '', 'API/ShooterGame/UShooterGameInstance/PlayDemo/index.html', '', 0x00100010n);
registerSearchData('TravelToSession', '', 'API/ShooterGame/UShooterGameInstance/TravelToSession/index.html', 'Travel directly to the named session', 0x00100010n);
registerSearchData('GetQuickMatchUrl', '', 'API/ShooterGame/UShooterGameInstance/GetQuickMatchUrl/index.html', 'Get the Travel URL for a quick match', 0x00120010n);
registerSearchData('BeginHostingQuickMatch', '', 'API/ShooterGame/UShooterGameInstance/BeginHostingQuickMatch/index.html', 'Begin a hosted quick match', 0x00100010n);
registerSearchData('FindSessions', '', 'API/ShooterGame/UShooterGameInstance/FindSessions/index.html', 'Initiates the session searching', 0x00100010n);
registerSearchData('GotoState', '', 'API/ShooterGame/UShooterGameInstance/GotoState/index.html', 'Sends the game to the specified state.', 0x00100010n);
registerSearchData('GetInitialState', '', 'API/ShooterGame/UShooterGameInstance/GetInitialState/index.html', 'Obtains the initial welcome state, which can be different based on platform', 0x00100010n);
registerSearchData('GotoInitialState', '', 'API/ShooterGame/UShooterGameInstance/GotoInitialState/index.html', 'Sends the game to the initial startup/frontend state', 0x00100010n);
registerSearchData('GetCurrentState', '', 'API/ShooterGame/UShooterGameInstance/GetCurrentState/index.html', 'Gets the current state of the GameInstance', 0x00900010n);
registerSearchData('ShowMessageThenGotoState', '', 'API/ShooterGame/UShooterGameInstance/ShowMessageThenGotoState/index.html', 'Creates the message menu, clears other menus and sets the KingState to Message. ', 0x00100010n);
registerSearchData('RemoveExistingLocalPlayer', '', 'API/ShooterGame/UShooterGameInstance/RemoveExistingLocalPlayer/index.html', '', 0x00100010n);
registerSearchData('RemoveSplitScreenPlayers', '', 'API/ShooterGame/UShooterGameInstance/RemoveSplitScreenPlayers/index.html', '', 0x00100010n);
registerSearchData('GetUniqueNetIdFromControllerId', '', 'API/ShooterGame/UShooterGameInstance/GetUniqueNetIdFromControllerId/index.html', '', 0x00100010n);
registerSearchData('GetOnlineMode', '', 'API/ShooterGame/UShooterGameInstance/GetOnlineMode/index.html', 'Returns true if the game is in online mode', 0x00900010n);
registerSearchData('SetOnlineMode', '', 'API/ShooterGame/UShooterGameInstance/SetOnlineMode/index.html', 'Sets the online mode of the game', 0x00100010n);
registerSearchData('UpdateUsingMultiplayerFeatures', '', 'API/ShooterGame/UShooterGameInstance/UpdateUsingMultiplayerFeatures/index.html', 'Updates the status of using multiplayer features', 0x00100010n);
registerSearchData('SetIgnorePairingChangeForControllerId', '', 'API/ShooterGame/UShooterGameInstance/SetIgnorePairingChangeForControllerId/index.html', 'Sets the controller to ignore for pairing changes. Useful when we are showing external UI for manual profile switching.', 0x00100010n);
registerSearchData('IsLocalPlayerOnline', '', 'API/ShooterGame/UShooterGameInstance/IsLocalPlayerOnline/index.html', 'Returns true if the passed in local player is signed in and online', 0x00100010n);
registerSearchData('IsLocalPlayerSignedIn', '', 'API/ShooterGame/UShooterGameInstance/IsLocalPlayerSignedIn/index.html', 'Returns true if the passed in local player is signed in', 0x00100010n);
registerSearchData('ValidatePlayerForOnlinePlay', '', 'API/ShooterGame/UShooterGameInstance/ValidatePlayerForOnlinePlay/index.html', 'Returns true if owning player is online. Displays proper messaging if the user can\'t play', 0x00100010n);
registerSearchData('ValidatePlayerIsSignedIn', '', 'API/ShooterGame/UShooterGameInstance/ValidatePlayerIsSignedIn/index.html', 'Returns true if owning player is signed in. Displays proper messaging if the user can\'t play', 0x00100010n);
registerSearchData('CleanupSessionOnReturnToMenu', '', 'API/ShooterGame/UShooterGameInstance/CleanupSessionOnReturnToMenu/index.html', 'Shuts down the session, and frees any net driver', 0x00100010n);
registerSearchData('LabelPlayerAsQuitter', '', 'API/ShooterGame/UShooterGameInstance/LabelPlayerAsQuitter/index.html', 'Flag the local player when they quit the game', 0x00900010n);
registerSearchData('OnConfirmGeneric', '', 'API/ShooterGame/UShooterGameInstance/OnConfirmGeneric/index.html', 'Generic confirmation handling (just hide the dialog)', 0x00100010n);
registerSearchData('HasLicense', '', 'API/ShooterGame/UShooterGameInstance/HasLicense/index.html', '', 0x00900010n);
registerSearchData('StartOnlinePrivilegeTask', '', 'API/ShooterGame/UShooterGameInstance/StartOnlinePrivilegeTask/index.html', 'Start task to get user privileges.', 0x00100010n);
registerSearchData('CleanupOnlinePrivilegeTask', '', 'API/ShooterGame/UShooterGameInstance/CleanupOnlinePrivilegeTask/index.html', 'Common cleanup code for any Privilege task delegate', 0x00100010n);
registerSearchData('DisplayOnlinePrivilegeFailureDialogs', '', 'API/ShooterGame/UShooterGameInstance/DisplayOnlinePrivilegeFailureDialogs/index.html', 'Show approved dialogs for various privileges failures', 0x00100010n);
registerSearchData('GetOnlineSessionClass', '', 'API/ShooterGame/UShooterGameInstance/GetOnlineSessionClass/index.html', '', 0x00100010n);
registerSearchData('HostQuickSession', '', 'API/ShooterGame/UShooterGameInstance/HostQuickSession/index.html', 'Create a session with the default map and game-type with the selected online settings', 0x00100010n);
registerSearchData('OnPlayTogetherEventReceived', '', 'API/ShooterGame/UShooterGameInstance/OnPlayTogetherEventReceived/index.html', 'Called when we receive a Play Together system event on PS4', 0x00100010n);
registerSearchData('ResetPlayTogetherInfo', '', 'API/ShooterGame/UShooterGameInstance/ResetPlayTogetherInfo/index.html', 'Resets Play Together PS4 system event info after it\'s been handled', 0x00100010n);
registerSearchData('HandleNetworkConnectionStatusChanged', '', 'API/ShooterGame/UShooterGameInstance/HandleNetworkConnectionStatusChanged/index.html', '', 0x00400010n);
registerSearchData('HandleSessionFailure', '', 'API/ShooterGame/UShooterGameInstance/HandleSessionFailure/index.html', '', 0x00400010n);
registerSearchData('OnPreLoadMap', '', 'API/ShooterGame/UShooterGameInstance/OnPreLoadMap/index.html', '', 0x00400010n);
registerSearchData('OnPostLoadMap', '', 'API/ShooterGame/UShooterGameInstance/OnPostLoadMap/index.html', '', 0x00400010n);
registerSearchData('OnPostDemoPlay', '', 'API/ShooterGame/UShooterGameInstance/OnPostDemoPlay/index.html', '', 0x00400010n);
registerSearchData('HandleDemoPlaybackFailure', '', 'API/ShooterGame/UShooterGameInstance/HandleDemoPlaybackFailure/index.html', '', 0x00440010n);
registerSearchData('OnUserCanPlayInvite', '', 'API/ShooterGame/UShooterGameInstance/OnUserCanPlayInvite/index.html', 'Delegate function executed after checking privileges for starting quick match', 0x00400010n);
registerSearchData('OnUserCanPlayTogether', '', 'API/ShooterGame/UShooterGameInstance/OnUserCanPlayTogether/index.html', 'Delegate function executed after checking privileges for Play Together on PS4', 0x00400010n);
registerSearchData('OnEndSessionComplete', '', 'API/ShooterGame/UShooterGameInstance/OnEndSessionComplete/index.html', '', 0x00400010n);
registerSearchData('MaybeChangeState', '', 'API/ShooterGame/UShooterGameInstance/MaybeChangeState/index.html', '', 0x00400010n);
registerSearchData('EndCurrentState', '', 'API/ShooterGame/UShooterGameInstance/EndCurrentState/index.html', '', 0x00400010n);
registerSearchData('BeginNewState', '', 'API/ShooterGame/UShooterGameInstance/BeginNewState/index.html', '', 0x00400010n);
registerSearchData('BeginPendingInviteState', '', 'API/ShooterGame/UShooterGameInstance/BeginPendingInviteState/index.html', '', 0x00400010n);
registerSearchData('BeginWelcomeScreenState', '', 'API/ShooterGame/UShooterGameInstance/BeginWelcomeScreenState/index.html', '', 0x00400010n);
registerSearchData('BeginMainMenuState', '', 'API/ShooterGame/UShooterGameInstance/BeginMainMenuState/index.html', '', 0x00400010n);
registerSearchData('BeginMessageMenuState', '', 'API/ShooterGame/UShooterGameInstance/BeginMessageMenuState/index.html', '', 0x00400010n);
registerSearchData('BeginPlayingState', '', 'API/ShooterGame/UShooterGameInstance/BeginPlayingState/index.html', '', 0x00400010n);
registerSearchData('EndPendingInviteState', '', 'API/ShooterGame/UShooterGameInstance/EndPendingInviteState/index.html', '', 0x00400010n);
registerSearchData('EndWelcomeScreenState', '', 'API/ShooterGame/UShooterGameInstance/EndWelcomeScreenState/index.html', '', 0x00400010n);
registerSearchData('EndMainMenuState', '', 'API/ShooterGame/UShooterGameInstance/EndMainMenuState/index.html', '', 0x00400010n);
registerSearchData('EndMessageMenuState', '', 'API/ShooterGame/UShooterGameInstance/EndMessageMenuState/index.html', '', 0x00400010n);
registerSearchData('EndPlayingState', '', 'API/ShooterGame/UShooterGameInstance/EndPlayingState/index.html', '', 0x00400010n);
registerSearchData('ShowLoadingScreen', '', 'API/ShooterGame/UShooterGameInstance/ShowLoadingScreen/index.html', '', 0x00400010n);
registerSearchData('AddNetworkFailureHandlers', '', 'API/ShooterGame/UShooterGameInstance/AddNetworkFailureHandlers/index.html', '', 0x00400010n);
registerSearchData('RemoveNetworkFailureHandlers', '', 'API/ShooterGame/UShooterGameInstance/RemoveNetworkFailureHandlers/index.html', '', 0x00400010n);
registerSearchData('TravelLocalSessionFailure', '', 'API/ShooterGame/UShooterGameInstance/TravelLocalSessionFailure/index.html', 'Called when there is an error trying to travel to a local session', 0x00400010n);
registerSearchData('OnJoinSessionComplete', '', 'API/ShooterGame/UShooterGameInstance/OnJoinSessionComplete/index.html', 'Callback which is intended to be called upon joining session', 0x00400010n);
registerSearchData('OnCreatePresenceSessionComplete', '', 'API/ShooterGame/UShooterGameInstance/OnCreatePresenceSessionComplete/index.html', 'Callback which is intended to be called upon session creation', 0x00400010n);
registerSearchData('OnRegisterLocalPlayerComplete', '', 'API/ShooterGame/UShooterGameInstance/OnRegisterLocalPlayerComplete/index.html', 'Callback which is called after adding local users to a session', 0x00400010n);
registerSearchData('FinishSessionCreation', '', 'API/ShooterGame/UShooterGameInstance/FinishSessionCreation/index.html', 'Called after all the local players are registered', 0x00400010n);
registerSearchData('OnRegisterJoiningLocalPlayerComplete', '', 'API/ShooterGame/UShooterGameInstance/OnRegisterJoiningLocalPlayerComplete/index.html', 'Callback which is called after adding local users to a session we\'re joining', 0x00400010n);
registerSearchData('FinishJoinSession', '', 'API/ShooterGame/UShooterGameInstance/FinishJoinSession/index.html', 'Called after all the local players are registered in a session we\'re joining', 0x00400010n);
registerSearchData('SendPlayTogetherInvites', '', 'API/ShooterGame/UShooterGameInstance/SendPlayTogetherInvites/index.html', 'Send all invites for the current game session if we\'ve created it because Play Together on PS4 was initiated', 0x00400010n);
registerSearchData('ShowMessageThenGoMain', '', 'API/ShooterGame/UShooterGameInstance/ShowMessageThenGoMain/index.html', 'Creates the message menu, clears other menus and sets the KingState to Message. ', 0x00400010n);
registerSearchData('OnSearchSessionsComplete', '', 'API/ShooterGame/UShooterGameInstance/OnSearchSessionsComplete/index.html', 'Callback which is intended to be called upon finding sessions', 0x00400010n);
registerSearchData('LoadFrontEndMap', '', 'API/ShooterGame/UShooterGameInstance/LoadFrontEndMap/index.html', '', 0x00400010n);
registerSearchData('SetPresenceForLocalPlayers', '', 'API/ShooterGame/UShooterGameInstance/SetPresenceForLocalPlayers/index.html', 'Sets a rich presence string for all local players.', 0x00400010n);
registerSearchData('InternalTravelToSession', '', 'API/ShooterGame/UShooterGameInstance/InternalTravelToSession/index.html', 'Travel directly to the named session', 0x00400010n);
registerSearchData('HandleSignInChangeMessaging', '', 'API/ShooterGame/UShooterGameInstance/HandleSignInChangeMessaging/index.html', 'Show messaging and punt to welcome screen', 0x00400010n);
registerSearchData('HandleUserLoginChanged', '', 'API/ShooterGame/UShooterGameInstance/HandleUserLoginChanged/index.html', 'OSS delegates to handle', 0x00400010n);
registerSearchData('HandleAppWillDeactivate', '', 'API/ShooterGame/UShooterGameInstance/HandleAppWillDeactivate/index.html', 'Callback to pause the game when the OS has constrained our app.', 0x00400010n);
registerSearchData('HandleAppSuspend', '', 'API/ShooterGame/UShooterGameInstance/HandleAppSuspend/index.html', 'Callback occurs when game being suspended', 0x00400010n);
registerSearchData('HandleAppResume', '', 'API/ShooterGame/UShooterGameInstance/HandleAppResume/index.html', 'Callback occurs when game resuming', 0x00400010n);
registerSearchData('HandleAppLicenseUpdate', '', 'API/ShooterGame/UShooterGameInstance/HandleAppLicenseUpdate/index.html', 'Callback to process game licensing change notifications.', 0x00400010n);
registerSearchData('HandleSafeFrameChanged', '', 'API/ShooterGame/UShooterGameInstance/HandleSafeFrameChanged/index.html', 'Callback to handle safe frame size changes.', 0x00400010n);
registerSearchData('HandleControllerConnectionChange', '', 'API/ShooterGame/UShooterGameInstance/HandleControllerConnectionChange/index.html', 'Callback to handle controller connection changes.', 0x00400010n);
registerSearchData('OnPairingUsePreviousProfile', '', 'API/ShooterGame/UShooterGameInstance/OnPairingUsePreviousProfile/index.html', 'Callback to handle controller pairing changes.', 0x00400010n);
registerSearchData('OnPairingUseNewProfile', '', 'API/ShooterGame/UShooterGameInstance/OnPairingUseNewProfile/index.html', 'Callback to handle controller pairing changes.', 0x00400010n);
registerSearchData('HandleControllerPairingChanged', '', 'API/ShooterGame/UShooterGameInstance/HandleControllerPairingChanged/index.html', 'Callback to handle controller pairing changes.', 0x00400010n);
registerSearchData('OnControllerReconnectConfirm', '', 'API/ShooterGame/UShooterGameInstance/OnControllerReconnectConfirm/index.html', 'Handle confirming the controller disconnected dialog.', 0x00400010n);
registerSearchData('HandleOpenCommand', '', 'API/ShooterGame/UShooterGameInstance/HandleOpenCommand/index.html', '', 0x00200010n);
registerSearchData('HandleDisconnectCommand', '', 'API/ShooterGame/UShooterGameInstance/HandleDisconnectCommand/index.html', '', 0x00200010n);
registerSearchData('HandleTravelCommand', '', 'API/ShooterGame/UShooterGameInstance/HandleTravelCommand/index.html', '', 0x00200010n);
registerSearchData('WelcomeScreenMap', '', 'API/ShooterGame/UShooterGameInstance/WelcomeScreenMap/index.html', '', 0x40400020n);
registerSearchData('MainMenuMap', '', 'API/ShooterGame/UShooterGameInstance/MainMenuMap/index.html', '', 0x40400020n);
registerSearchData('CurrentState', '', 'API/ShooterGame/UShooterGameInstance/CurrentState/index.html', '', 0x00400020n);
registerSearchData('PendingState', '', 'API/ShooterGame/UShooterGameInstance/PendingState/index.html', '', 0x00400020n);
registerSearchData('PendingMessage', '', 'API/ShooterGame/UShooterGameInstance/PendingMessage/index.html', '', 0x00400020n);
registerSearchData('PendingInvite', '', 'API/ShooterGame/UShooterGameInstance/PendingInvite/index.html', '', 0x00400020n);
registerSearchData('TravelURL', '', 'API/ShooterGame/UShooterGameInstance/TravelURL/index.html', 'URL to travel to after pending network operations', 0x00400020n);
registerSearchData('OnlineMode', '', 'API/ShooterGame/UShooterGameInstance/OnlineMode/index.html', 'Current online mode of the game (offline, LAN, or online)', 0x00400020n);
registerSearchData('bPendingEnableSplitscreen', '', 'API/ShooterGame/UShooterGameInstance/bPendingEnableSplitscreen/index.html', 'If true, enable splitscreen when map starts loading', 0x00400020n);
registerSearchData('bIsLicensed', '', 'API/ShooterGame/UShooterGameInstance/bIsLicensed/index.html', 'Whether the user has an active license to play the game', 0x00400020n);
registerSearchData('MainMenuUI', '', 'API/ShooterGame/UShooterGameInstance/MainMenuUI/index.html', 'Main menu UI', 0x00400020n);
registerSearchData('MessageMenuUI', '', 'API/ShooterGame/UShooterGameInstance/MessageMenuUI/index.html', 'Message menu (Shown in the even of errors - unable to connect etc)', 0x00400020n);
registerSearchData('WelcomeMenuUI', '', 'API/ShooterGame/UShooterGameInstance/WelcomeMenuUI/index.html', 'Welcome menu UI (for consoles)', 0x00400020n);
registerSearchData('WaitMessageWidget', '', 'API/ShooterGame/UShooterGameInstance/WaitMessageWidget/index.html', 'Dialog widget to show non-interactive waiting messages for network timeouts and such.', 0x00400020n);
registerSearchData('IgnorePairingChangeForControllerId', '', 'API/ShooterGame/UShooterGameInstance/IgnorePairingChangeForControllerId/index.html', 'Controller to ignore for pairing changes. -1 to skip ignore.', 0x00400020n);
registerSearchData('CurrentConnectionStatus', '', 'API/ShooterGame/UShooterGameInstance/CurrentConnectionStatus/index.html', 'Last connection status that was passed into the HandleNetworkConnectionStatusChanged hander', 0x00400020n);
registerSearchData('TickDelegate', '', 'API/ShooterGame/UShooterGameInstance/TickDelegate/index.html', 'Delegate for callbacks to Tick', 0x00400020n);
registerSearchData('TickDelegateHandle', '', 'API/ShooterGame/UShooterGameInstance/TickDelegateHandle/index.html', 'Handle to various registered delegates', 0x00400020n);
registerSearchData('TravelLocalSessionFailureDelegateHandle', '', 'API/ShooterGame/UShooterGameInstance/TravelLocalSessionFailureDelegateHandle/index.html', '', 0x00400020n);
registerSearchData('OnJoinSessionCompleteDelegateHandle', '', 'API/ShooterGame/UShooterGameInstance/OnJoinSessionCompleteDelegateHandle/index.html', '', 0x00400020n);
registerSearchData('OnSearchSessionsCompleteDelegateHandle', '', 'API/ShooterGame/UShooterGameInstance/OnSearchSessionsCompleteDelegateHandle/index.html', '', 0x00400020n);
registerSearchData('OnStartSessionCompleteDelegateHandle', '', 'API/ShooterGame/UShooterGameInstance/OnStartSessionCompleteDelegateHandle/index.html', '', 0x00400020n);
registerSearchData('OnEndSessionCompleteDelegateHandle', '', 'API/ShooterGame/UShooterGameInstance/OnEndSessionCompleteDelegateHandle/index.html', '', 0x00400020n);
registerSearchData('OnDestroySessionCompleteDelegateHandle', '', 'API/ShooterGame/UShooterGameInstance/OnDestroySessionCompleteDelegateHandle/index.html', '', 0x00400020n);
registerSearchData('OnCreatePresenceSessionCompleteDelegateHandle', '', 'API/ShooterGame/UShooterGameInstance/OnCreatePresenceSessionCompleteDelegateHandle/index.html', '', 0x00400020n);
registerSearchData('PlayTogetherInfo', '', 'API/ShooterGame/UShooterGameInstance/PlayTogetherInfo/index.html', 'Play Together on PS4 system event info', 0x00400020n);
registerSearchData('LocalPlayerOnlineStatus', '', 'API/ShooterGame/UShooterGameInstance/LocalPlayerOnlineStatus/index.html', 'Local player login status when the system is suspended', 0x00400020n);
registerSearchData('DebugTestEncryptionKey', '', 'API/ShooterGame/UShooterGameInstance/DebugTestEncryptionKey/index.html', 'A hard-coded encryption key used to try out the encryption code. This is NOT SECURE, do not use this technique in production!', 0x00400020n);
registerSearchData('OnEndSessionCompleteDelegate', '', 'API/ShooterGame/UShooterGameInstance/OnEndSessionCompleteDelegate/index.html', 'Delegate for ending a session', 0x00400020n);
registerSearchData('SShooterSplitScreenLobby', '', 'API/ShooterGame/UI/Widgets/SShooterSplitScreenLobby/index.html', '', 0x00000001n);
registerSearchData('SLATE_BEGIN_ARGS', '', 'API/ShooterGame/UI/Widgets/SShooterSplitScreenLobby/SLATE_BEGIN_ARGS/index.html', '', 0x80100010n);
registerSearchData('SupportsKeyboardFocus', '', 'API/ShooterGame/UI/Widgets/SShooterSplitScreenLobby/SupportsKeyboardFocus/index.html', '', 0x80940010n);
registerSearchData('Construct', '', 'API/ShooterGame/UI/Widgets/SShooterSplitScreenLobby/Construct/index.html', '', 0x00100010n);
registerSearchData('Clear', '', 'API/ShooterGame/UI/Widgets/SShooterSplitScreenLobby/Clear/index.html', '', 0x00100010n);
registerSearchData('GetNumSupportedSlots', '', 'API/ShooterGame/UI/Widgets/SShooterSplitScreenLobby/GetNumSupportedSlots/index.html', '', 0x00900010n);
registerSearchData('GetIsJoining', '', 'API/ShooterGame/UI/Widgets/SShooterSplitScreenLobby/GetIsJoining/index.html', '', 0x00900010n);
registerSearchData('SetIsJoining', '', 'API/ShooterGame/UI/Widgets/SShooterSplitScreenLobby/SetIsJoining/index.html', '', 0x00100010n);
registerSearchData('IsUniqueIdOnline', '', 'API/ShooterGame/UI/Widgets/SShooterSplitScreenLobby/IsUniqueIdOnline/index.html', '', 0x00c00010n);
registerSearchData('OnKeyDown', '', 'API/ShooterGame/UI/Widgets/SShooterSplitScreenLobby/OnKeyDown/index.html', '', 0x00440010n);
registerSearchData('OnFocusReceived', '', 'API/ShooterGame/UI/Widgets/SShooterSplitScreenLobby/OnFocusReceived/index.html', '', 0x00440010n);
registerSearchData('OnFocusLost', '', 'API/ShooterGame/UI/Widgets/SShooterSplitScreenLobby/OnFocusLost/index.html', '', 0x00440010n);
registerSearchData('UpdateSlots', '', 'API/ShooterGame/UI/Widgets/SShooterSplitScreenLobby/UpdateSlots/index.html', '', 0x00400010n);
registerSearchData('ConditionallyReadyPlayer', '', 'API/ShooterGame/UI/Widgets/SShooterSplitScreenLobby/ConditionallyReadyPlayer/index.html', '', 0x00400010n);
registerSearchData('ReadyPlayer', '', 'API/ShooterGame/UI/Widgets/SShooterSplitScreenLobby/ReadyPlayer/index.html', '', 0x00400010n);
registerSearchData('UnreadyPlayer', '', 'API/ShooterGame/UI/Widgets/SShooterSplitScreenLobby/UnreadyPlayer/index.html', '', 0x00400010n);
registerSearchData('Tick', '', 'API/ShooterGame/UI/Widgets/SShooterSplitScreenLobby/Tick/index.html', '', 0x00440010n);
registerSearchData('HandleLoginUIClosedAndReady', '', 'API/ShooterGame/UI/Widgets/SShooterSplitScreenLobby/HandleLoginUIClosedAndReady/index.html', '', 0x00400010n);
registerSearchData('GetGameInstance', '', 'API/ShooterGame/UI/Widgets/SShooterSplitScreenLobby/GetGameInstance/index.html', '', 0x00c00010n);
registerSearchData('GetPlayFindText', '', 'API/ShooterGame/UI/Widgets/SShooterSplitScreenLobby/GetPlayFindText/index.html', '', 0x00c00010n);
registerSearchData('OnOkOrCancel', '', 'API/ShooterGame/UI/Widgets/SShooterSplitScreenLobby/OnOkOrCancel/index.html', '', 0x00400010n);
registerSearchData('ConfirmSponsorsSatisfied', '', 'API/ShooterGame/UI/Widgets/SShooterSplitScreenLobby/ConfirmSponsorsSatisfied/index.html', '', 0x00c00010n);
registerSearchData('OnUserCanPlay', '', 'API/ShooterGame/UI/Widgets/SShooterSplitScreenLobby/OnUserCanPlay/index.html', '', 0x00400010n);
registerSearchData('OnLoginComplete', '', 'API/ShooterGame/UI/Widgets/SShooterSplitScreenLobby/OnLoginComplete/index.html', '', 0x00400010n);
registerSearchData('MAX_POSSIBLE_SLOTS', '', 'API/ShooterGame/UI/Widgets/SShooterSplitScreenLobby/MAX_POSSIBLE_SLOTS/index.html', '', 0x00c20020n);
registerSearchData('PlayerOwner', '', 'API/ShooterGame/UI/Widgets/SShooterSplitScreenLobby/PlayerOwner/index.html', 'The player that owns the Lobby.', 0x00400020n);
registerSearchData('MasterUserBack', '', 'API/ShooterGame/UI/Widgets/SShooterSplitScreenLobby/MasterUserBack/index.html', '', 0x00400020n);
registerSearchData('MasterUserPlay', '', 'API/ShooterGame/UI/Widgets/SShooterSplitScreenLobby/MasterUserPlay/index.html', '', 0x00400020n);
registerSearchData('UserTextWidgets', '', 'API/ShooterGame/UI/Widgets/SShooterSplitScreenLobby/UserTextWidgets/index.html', '', 0x00400020n);
registerSearchData('UserSlots', '', 'API/ShooterGame/UI/Widgets/SShooterSplitScreenLobby/UserSlots/index.html', '', 0x00400020n);
registerSearchData('SplitScreenLobbyWidget', '', 'API/ShooterGame/UI/Widgets/SShooterSplitScreenLobby/SplitScreenLobbyWidget/index.html', 'used for holding on to the splitscreen lobby widget so we can switch back to that UI after the LoginFailure UI pops up', 0x00400020n);
registerSearchData('PressToPlayText', '', 'API/ShooterGame/UI/Widgets/SShooterSplitScreenLobby/PressToPlayText/index.html', '', 0x00400020n);
registerSearchData('PressToFindText', '', 'API/ShooterGame/UI/Widgets/SShooterSplitScreenLobby/PressToFindText/index.html', '', 0x00400020n);
registerSearchData('PressToStartMatchText', '', 'API/ShooterGame/UI/Widgets/SShooterSplitScreenLobby/PressToStartMatchText/index.html', '', 0x00400020n);
registerSearchData('OnLoginCompleteDelegateHandle', '', 'API/ShooterGame/UI/Widgets/SShooterSplitScreenLobby/OnLoginCompleteDelegateHandle/index.html', '', 0x00400020n);
registerSearchData('PendingControllerId', '', 'API/ShooterGame/UI/Widgets/SShooterSplitScreenLobby/PendingControllerId/index.html', '', 0x00400020n);
registerSearchData('bIsJoining', '', 'API/ShooterGame/UI/Widgets/SShooterSplitScreenLobby/bIsJoining/index.html', 'True if we joining a match', 0x00400020n);
registerSearchData('FShooterMainMenu', '', 'API/ShooterGame/UI/Menu/FShooterMainMenu/index.html', '', 0x00000001n);
registerSearchData('FShooterMainMenu', '', 'API/ShooterGame/UI/Menu/FShooterMainMenu/FShooterMainMenu/index.html', '', 0x0000000100140010n);
registerSearchData('Construct', '', 'API/ShooterGame/UI/Menu/FShooterMainMenu/Construct/index.html', 'build menu', 0x00100010n);
registerSearchData('AddMenuToGameViewport', '', 'API/ShooterGame/UI/Menu/FShooterMainMenu/AddMenuToGameViewport/index.html', 'Add the menu to the gameviewport so it becomes visible', 0x00100010n);
registerSearchData('RemoveMenuFromGameViewport', '', 'API/ShooterGame/UI/Menu/FShooterMainMenu/RemoveMenuFromGameViewport/index.html', 'Remove from the gameviewport.', 0x00100010n);
registerSearchData('Tick', '', 'API/ShooterGame/UI/Menu/FShooterMainMenu/Tick/index.html', 'TickableObject Functions', 0x00140010n);
registerSearchData('GetTickableTickType', '', 'API/ShooterGame/UI/Menu/FShooterMainMenu/GetTickableTickType/index.html', '', 0x00940010n);
registerSearchData('GetStatId', '', 'API/ShooterGame/UI/Menu/FShooterMainMenu/GetStatId/index.html', '', 0x00940010n);
registerSearchData('IsTickableWhenPaused', '', 'API/ShooterGame/UI/Menu/FShooterMainMenu/IsTickableWhenPaused/index.html', '', 0x00940010n);
registerSearchData('GetTickableGameObjectWorld', '', 'API/ShooterGame/UI/Menu/FShooterMainMenu/GetTickableGameObjectWorld/index.html', '', 0x00940010n);
registerSearchData('GetPlayerOwner', '', 'API/ShooterGame/UI/Menu/FShooterMainMenu/GetPlayerOwner/index.html', 'Returns the player that owns the main menu.', 0x00900010n);
registerSearchData('GetPlayerOwnerControllerId', '', 'API/ShooterGame/UI/Menu/FShooterMainMenu/GetPlayerOwnerControllerId/index.html', 'Returns the controller id of player that owns the main menu.', 0x00900010n);
registerSearchData('GetMapName', '', 'API/ShooterGame/UI/Menu/FShooterMainMenu/GetMapName/index.html', 'Returns the string name of the currently selected map', 0x00900010n);
registerSearchData('OnPlayTogetherEventReceived', '', 'API/ShooterGame/UI/Menu/FShooterMainMenu/OnPlayTogetherEventReceived/index.html', 'Called if a play together invite is sent from the PS4 system', 0x00100010n);
registerSearchData('GetSelectedMap', '', 'API/ShooterGame/UI/Menu/FShooterMainMenu/GetSelectedMap/index.html', '', 0x00a00010n);
registerSearchData('CloseSubMenu', '', 'API/ShooterGame/UI/Menu/FShooterMainMenu/CloseSubMenu/index.html', 'goes back in menu structure', 0x00200010n);
registerSearchData('OnMenuGoBack', '', 'API/ShooterGame/UI/Menu/FShooterMainMenu/OnMenuGoBack/index.html', 'called when going back to previous menu', 0x00200010n);
registerSearchData('OnMenuHidden', '', 'API/ShooterGame/UI/Menu/FShooterMainMenu/OnMenuHidden/index.html', 'called when menu hide animation is finished', 0x00200010n);
registerSearchData('OnQuickMatchSelected', '', 'API/ShooterGame/UI/Menu/FShooterMainMenu/OnQuickMatchSelected/index.html', 'called when user chooses to start matchmaking.', 0x00200010n);
registerSearchData('OnQuickMatchSelectedLoginRequired', '', 'API/ShooterGame/UI/Menu/FShooterMainMenu/OnQuickMatchSelectedLoginRequired/index.html', 'called when user chooses to start matchmaking, but a login is required first.', 0x00200010n);
registerSearchData('OnSplitScreenSelectedHostOnlineLoginRequired', '', 'API/ShooterGame/UI/Menu/FShooterMainMenu/OnSplitScreenSelectedHostOnlineLoginRequired/index.html', 'Called when user chooses split screen for the \"host online\" mode. Does some validation before moving on the split screen menu widget.', 0x00200010n);
registerSearchData('OnSplitScreenSelectedHostOnline', '', 'API/ShooterGame/UI/Menu/FShooterMainMenu/OnSplitScreenSelectedHostOnline/index.html', 'Called when user chooses split screen for the \"host online\" mode.', 0x00200010n);
registerSearchData('OnSplitScreenSelected', '', 'API/ShooterGame/UI/Menu/FShooterMainMenu/OnSplitScreenSelected/index.html', 'called when user chooses split screen. Goes to the split screen setup screen. Hides menu widget', 0x00200010n);
registerSearchData('OnHostOnlineSelected', '', 'API/ShooterGame/UI/Menu/FShooterMainMenu/OnHostOnlineSelected/index.html', 'Called whne user selects \"HOST ONLINE\"', 0x00200010n);
registerSearchData('OnHostOfflineSelected', '', 'API/ShooterGame/UI/Menu/FShooterMainMenu/OnHostOfflineSelected/index.html', 'Called whne user selects \"HOST OFFLINE\"', 0x00200010n);
registerSearchData('SplitScreenBackedOut', '', 'API/ShooterGame/UI/Menu/FShooterMainMenu/SplitScreenBackedOut/index.html', 'called when users back out of split screen lobby screen. Shows main menu again.', 0x00200010n);
registerSearchData('OnSplitScreenBackedOut', '', 'API/ShooterGame/UI/Menu/FShooterMainMenu/OnSplitScreenBackedOut/index.html', '', 0x00200010n);
registerSearchData('OnSplitScreenPlay', '', 'API/ShooterGame/UI/Menu/FShooterMainMenu/OnSplitScreenPlay/index.html', '', 0x00200010n);
registerSearchData('OnMatchmakingComplete', '', 'API/ShooterGame/UI/Menu/FShooterMainMenu/OnMatchmakingComplete/index.html', '', 0x00200010n);
registerSearchData('BotCountOptionChanged', '', 'API/ShooterGame/UI/Menu/FShooterMainMenu/BotCountOptionChanged/index.html', 'bot count option changed callback', 0x00200010n);
registerSearchData('LanMatchChanged', '', 'API/ShooterGame/UI/Menu/FShooterMainMenu/LanMatchChanged/index.html', 'lan match option changed callback', 0x00200010n);
registerSearchData('DedicatedServerChanged', '', 'API/ShooterGame/UI/Menu/FShooterMainMenu/DedicatedServerChanged/index.html', 'dedicated server option changed callback', 0x00200010n);
registerSearchData('RecordDemoChanged', '', 'API/ShooterGame/UI/Menu/FShooterMainMenu/RecordDemoChanged/index.html', 'record demo option changed callback', 0x00200010n);
registerSearchData('OnUIHostFreeForAll', '', 'API/ShooterGame/UI/Menu/FShooterMainMenu/OnUIHostFreeForAll/index.html', 'Plays StartGameSound sound and calls HostFreeForAll after sound is played', 0x00200010n);
registerSearchData('OnUIHostTeamDeathMatch', '', 'API/ShooterGame/UI/Menu/FShooterMainMenu/OnUIHostTeamDeathMatch/index.html', 'Plays StartGameSound sound and calls HostTeamDeathMatch after sound is played', 0x00200010n);
registerSearchData('HostGame', '', 'API/ShooterGame/UI/Menu/FShooterMainMenu/HostGame/index.html', 'Hosts a game, using the passed in game type', 0x00200010n);
registerSearchData('HostFreeForAll', '', 'API/ShooterGame/UI/Menu/FShooterMainMenu/HostFreeForAll/index.html', 'Hosts free for all game', 0x00200010n);
registerSearchData('HostTeamDeathMatch', '', 'API/ShooterGame/UI/Menu/FShooterMainMenu/HostTeamDeathMatch/index.html', 'Hosts team deathmatch game', 0x00200010n);
registerSearchData('OnConfirm', '', 'API/ShooterGame/UI/Menu/FShooterMainMenu/OnConfirm/index.html', 'General ok/cancel handler, that simply closes the dialog', 0x00200010n);
registerSearchData('ValidatePlayerForOnlinePlay', '', 'API/ShooterGame/UI/Menu/FShooterMainMenu/ValidatePlayerForOnlinePlay/index.html', 'Returns true if owning player is online. Displays proper messaging if the user can\'t play', 0x00200010n);
registerSearchData('ValidatePlayerIsSignedIn', '', 'API/ShooterGame/UI/Menu/FShooterMainMenu/ValidatePlayerIsSignedIn/index.html', 'Returns true if owning player is signed in to an account. Displays proper messaging if the user can\'t play', 0x00200010n);
registerSearchData('OnJoinSelected', '', 'API/ShooterGame/UI/Menu/FShooterMainMenu/OnJoinSelected/index.html', 'Called when the join menu option is chosen', 0x00200010n);
registerSearchData('OnJoinServerLoginRequired', '', 'API/ShooterGame/UI/Menu/FShooterMainMenu/OnJoinServerLoginRequired/index.html', 'Join server, but login necessary first.', 0x00200010n);
registerSearchData('OnJoinServer', '', 'API/ShooterGame/UI/Menu/FShooterMainMenu/OnJoinServer/index.html', 'Join server', 0x00200010n);
registerSearchData('OnShowLeaderboard', '', 'API/ShooterGame/UI/Menu/FShooterMainMenu/OnShowLeaderboard/index.html', 'Show leaderboard', 0x00200010n);
registerSearchData('OnShowOnlineStore', '', 'API/ShooterGame/UI/Menu/FShooterMainMenu/OnShowOnlineStore/index.html', 'Show online store', 0x00200010n);
registerSearchData('OnShowDemoBrowser', '', 'API/ShooterGame/UI/Menu/FShooterMainMenu/OnShowDemoBrowser/index.html', 'Show demo browser', 0x00200010n);
registerSearchData('OnUIQuit', '', 'API/ShooterGame/UI/Menu/FShooterMainMenu/OnUIQuit/index.html', 'Plays sound and calls Quit', 0x00200010n);
registerSearchData('Quit', '', 'API/ShooterGame/UI/Menu/FShooterMainMenu/Quit/index.html', 'Quits the game', 0x00200010n);
registerSearchData('LockAndHideMenu', '', 'API/ShooterGame/UI/Menu/FShooterMainMenu/LockAndHideMenu/index.html', 'Lock the controls and hide the main menu', 0x00200010n);
registerSearchData('DisplayLoadingScreen', '', 'API/ShooterGame/UI/Menu/FShooterMainMenu/DisplayLoadingScreen/index.html', 'Display the loading screen.', 0x00200010n);
registerSearchData('BeginQuickMatchSearch', '', 'API/ShooterGame/UI/Menu/FShooterMainMenu/BeginQuickMatchSearch/index.html', 'Begins searching for a quick match (matchmaking)', 0x00200010n);
registerSearchData('IsMapReady', '', 'API/ShooterGame/UI/Menu/FShooterMainMenu/IsMapReady/index.html', 'Checks the ChunkInstaller to see if the selected map is ready for play', 0x00a00010n);
registerSearchData('OnGameCreated', '', 'API/ShooterGame/UI/Menu/FShooterMainMenu/OnGameCreated/index.html', 'Callback for when game is created', 0x00200010n);
registerSearchData('DisplayQuickmatchFailureUI', '', 'API/ShooterGame/UI/Menu/FShooterMainMenu/DisplayQuickmatchFailureUI/index.html', 'Displays the UI for when a quickmatch can not be found', 0x00200010n);
registerSearchData('DisplayQuickmatchSearchingUI', '', 'API/ShooterGame/UI/Menu/FShooterMainMenu/DisplayQuickmatchSearchingUI/index.html', 'Displays the UI for when a quickmatch is being searched for', 0x00200010n);
registerSearchData('GetPersistentUser', '', 'API/ShooterGame/UI/Menu/FShooterMainMenu/GetPersistentUser/index.html', 'Get the persistence user associated with PCOwner', 0x00a00010n);
registerSearchData('StartOnlinePrivilegeTask', '', 'API/ShooterGame/UI/Menu/FShooterMainMenu/StartOnlinePrivilegeTask/index.html', 'Start the check for whether the owner of the menu has online privileges', 0x00200010n);
registerSearchData('CleanupOnlinePrivilegeTask', '', 'API/ShooterGame/UI/Menu/FShooterMainMenu/CleanupOnlinePrivilegeTask/index.html', 'Common cleanup code for any Privilege task delegate', 0x00200010n);
registerSearchData('OnUserCanPlayHostOnline', '', 'API/ShooterGame/UI/Menu/FShooterMainMenu/OnUserCanPlayHostOnline/index.html', 'Delegate function executed after checking privileges for hosting an online game', 0x00200010n);
registerSearchData('OnUserCanPlayOnlineJoin', '', 'API/ShooterGame/UI/Menu/FShooterMainMenu/OnUserCanPlayOnlineJoin/index.html', 'Delegate function executed after checking privileges for joining an online game', 0x00200010n);
registerSearchData('OnUserCanPlayOnlineQuickMatch', '', 'API/ShooterGame/UI/Menu/FShooterMainMenu/OnUserCanPlayOnlineQuickMatch/index.html', 'Delegate function executed after checking privileges for starting quick match', 0x00200010n);
registerSearchData('OnConfirmGeneric', '', 'API/ShooterGame/UI/Menu/FShooterMainMenu/OnConfirmGeneric/index.html', 'Generic confirmation handling (just hide the dialog)', 0x00200010n);
registerSearchData('OnCancelMatchmakingComplete', '', 'API/ShooterGame/UI/Menu/FShooterMainMenu/OnCancelMatchmakingComplete/index.html', 'Delegate function executed when the quick match async cancel operation is complete', 0x00200010n);
registerSearchData('OnLoginCompleteHostOnline', '', 'API/ShooterGame/UI/Menu/FShooterMainMenu/OnLoginCompleteHostOnline/index.html', 'Delegate function executed when login completes before an online match is created', 0x00200010n);
registerSearchData('OnLoginCompleteJoin', '', 'API/ShooterGame/UI/Menu/FShooterMainMenu/OnLoginCompleteJoin/index.html', 'Delegate function executed when login completes before an online match is joined', 0x00200010n);
registerSearchData('OnLoginCompleteQuickmatch', '', 'API/ShooterGame/UI/Menu/FShooterMainMenu/OnLoginCompleteQuickmatch/index.html', 'Delegate function executed when login completes before quickmatch is started', 0x00200010n);
registerSearchData('OnQuickMatchFailureUICancel', '', 'API/ShooterGame/UI/Menu/FShooterMainMenu/OnQuickMatchFailureUICancel/index.html', 'Handler for cancel confirmation confirmations on the quickmatch widgets', 0x00200010n);
registerSearchData('HelperQuickMatchSearchingUICancel', '', 'API/ShooterGame/UI/Menu/FShooterMainMenu/HelperQuickMatchSearchingUICancel/index.html', '', 0x00200010n);
registerSearchData('OnQuickMatchSearchingUICancel', '', 'API/ShooterGame/UI/Menu/FShooterMainMenu/OnQuickMatchSearchingUICancel/index.html', 'helper for removing QuickMatch Searching UI', 0x00200010n);
registerSearchData('GameInstance', '', 'API/ShooterGame/UI/Menu/FShooterMainMenu/GameInstance/index.html', 'Owning game instance', 0x00200020n);
registerSearchData('PlayerOwner', '', 'API/ShooterGame/UI/Menu/FShooterMainMenu/PlayerOwner/index.html', 'Owning player', 0x00200020n);
registerSearchData('ShooterOptions', '', 'API/ShooterGame/UI/Menu/FShooterMainMenu/ShooterOptions/index.html', 'shooter options', 0x00200020n);
registerSearchData('MenuWidget', '', 'API/ShooterGame/UI/Menu/FShooterMainMenu/MenuWidget/index.html', 'menu widget', 0x00200020n);
registerSearchData('MenuWidgetContainer', '', 'API/ShooterGame/UI/Menu/FShooterMainMenu/MenuWidgetContainer/index.html', 'used for removing the MenuWidget', 0x00200020n);
registerSearchData('SplitScreenLobbyWidget', '', 'API/ShooterGame/UI/Menu/FShooterMainMenu/SplitScreenLobbyWidget/index.html', 'SplitScreen Lobby Widget', 0x00200020n);
registerSearchData('SplitScreenLobbyWidgetContainer', '', 'API/ShooterGame/UI/Menu/FShooterMainMenu/SplitScreenLobbyWidgetContainer/index.html', 'used for removing the SplitScreenLobby', 0x00200020n);
registerSearchData('ServerListWidget', '', 'API/ShooterGame/UI/Menu/FShooterMainMenu/ServerListWidget/index.html', 'server list widget', 0x00200020n);
registerSearchData('DemoListWidget', '', 'API/ShooterGame/UI/Menu/FShooterMainMenu/DemoListWidget/index.html', 'demo list widget', 0x00200020n);
registerSearchData('LeaderboardWidget', '', 'API/ShooterGame/UI/Menu/FShooterMainMenu/LeaderboardWidget/index.html', 'leaderboard widget', 0x00200020n);
registerSearchData('OnlineStoreWidget', '', 'API/ShooterGame/UI/Menu/FShooterMainMenu/OnlineStoreWidget/index.html', 'online store widget', 0x00200020n);
registerSearchData('JoinServerItem', '', 'API/ShooterGame/UI/Menu/FShooterMainMenu/JoinServerItem/index.html', 'custom menu', 0x00200020n);
registerSearchData('LeaderboardItem', '', 'API/ShooterGame/UI/Menu/FShooterMainMenu/LeaderboardItem/index.html', 'yet another custom menu', 0x00200020n);
registerSearchData('OnlineStoreItem', '', 'API/ShooterGame/UI/Menu/FShooterMainMenu/OnlineStoreItem/index.html', 'yet another custom menu', 0x00200020n);
registerSearchData('DemoBrowserItem', '', 'API/ShooterGame/UI/Menu/FShooterMainMenu/DemoBrowserItem/index.html', 'Custom demo browser menu', 0x00200020n);
registerSearchData('HostLANItem', '', 'API/ShooterGame/UI/Menu/FShooterMainMenu/HostLANItem/index.html', 'LAN Options', 0x00200020n);
registerSearchData('JoinLANItem', '', 'API/ShooterGame/UI/Menu/FShooterMainMenu/JoinLANItem/index.html', '', 0x00200020n);
registerSearchData('DedicatedItem', '', 'API/ShooterGame/UI/Menu/FShooterMainMenu/DedicatedItem/index.html', 'Dedicated Server Option', 0x00200020n);
registerSearchData('RecordDemoItem', '', 'API/ShooterGame/UI/Menu/FShooterMainMenu/RecordDemoItem/index.html', 'Record demo option', 0x00200020n);
registerSearchData('QuickMatchSearchSettings', '', 'API/ShooterGame/UI/Menu/FShooterMainMenu/QuickMatchSearchSettings/index.html', 'Settings and storage for quickmatch searching', 0x00200020n);
registerSearchData('HostOfflineMapOption', '', 'API/ShooterGame/UI/Menu/FShooterMainMenu/HostOfflineMapOption/index.html', 'Map selection widget', 0x00200020n);
registerSearchData('HostOnlineMapOption', '', 'API/ShooterGame/UI/Menu/FShooterMainMenu/HostOnlineMapOption/index.html', '', 0x00200020n);
registerSearchData('JoinMapOption', '', 'API/ShooterGame/UI/Menu/FShooterMainMenu/JoinMapOption/index.html', '', 0x00200020n);
registerSearchData('HostOnlineMenuItem', '', 'API/ShooterGame/UI/Menu/FShooterMainMenu/HostOnlineMenuItem/index.html', 'Host an onine session menu', 0x00200020n);
registerSearchData('bShowingDownloadPct', '', 'API/ShooterGame/UI/Menu/FShooterMainMenu/bShowingDownloadPct/index.html', 'Track if we are showing a map download pct or not.', 0x00200020n);
registerSearchData('MatchType', '', 'API/ShooterGame/UI/Menu/FShooterMainMenu/MatchType/index.html', 'Custom match or quick match', 0x00200020n);
registerSearchData('OnCancelMatchmakingCompleteDelegate', '', 'API/ShooterGame/UI/Menu/FShooterMainMenu/OnCancelMatchmakingCompleteDelegate/index.html', 'Delegate for canceling matchmaking', 0x00200020n);
registerSearchData('OnMatchmakingCompleteDelegate', '', 'API/ShooterGame/UI/Menu/FShooterMainMenu/OnMatchmakingCompleteDelegate/index.html', 'Delegate executed when matchmaking completes', 0x00200020n);
registerSearchData('BotsCountOpt', '', 'API/ShooterGame/UI/Menu/FShooterMainMenu/BotsCountOpt/index.html', 'number of bots in game', 0x00200020n);
registerSearchData('QuickMAnimTimer', '', 'API/ShooterGame/UI/Menu/FShooterMainMenu/QuickMAnimTimer/index.html', 'Length that the UI for searching for a quickmatch should animate', 0x00200020n);
registerSearchData('bRemoveSessionThatWeJustJoined', '', 'API/ShooterGame/UI/Menu/FShooterMainMenu/bRemoveSessionThatWeJustJoined/index.html', 'This is kind of hacky, but it\'s the simplest solution since we\'re out of time. JoinSession was moved to an async event in the PS4 OSS and isn\'t called immediately so we need to wait till it\'s triggered and then remove it', 0x00200020n);
registerSearchData('bIncQuickMAlpha', '', 'API/ShooterGame/UI/Menu/FShooterMainMenu/bIncQuickMAlpha/index.html', 'Custom animation var that is used to determine whether or not to inc or dec the alpha value of the quickmatch UI', 0x00200020n);
registerSearchData('bIsLanMatch', '', 'API/ShooterGame/UI/Menu/FShooterMainMenu/bIsLanMatch/index.html', 'lan game?', 0x00200020n);
registerSearchData('bIsRecordingDemo', '', 'API/ShooterGame/UI/Menu/FShooterMainMenu/bIsRecordingDemo/index.html', 'Recording demos?', 0x00200020n);
registerSearchData('bAnimateQuickmatchSearchingUI', '', 'API/ShooterGame/UI/Menu/FShooterMainMenu/bAnimateQuickmatchSearchingUI/index.html', 'Are we currently animating the Searching for a QuickMatch UI?', 0x00200020n);
registerSearchData('bQuickmatchSearchRequestCanceled', '', 'API/ShooterGame/UI/Menu/FShooterMainMenu/bQuickmatchSearchRequestCanceled/index.html', 'Was the search request for quickmatch canceled while searching?', 0x00200020n);
registerSearchData('bUsedInputToCancelQuickmatchSearch', '', 'API/ShooterGame/UI/Menu/FShooterMainMenu/bUsedInputToCancelQuickmatchSearch/index.html', 'Was input used to cancel the search request for quickmatch?', 0x00200020n);
registerSearchData('bIsDedicatedServer', '', 'API/ShooterGame/UI/Menu/FShooterMainMenu/bIsDedicatedServer/index.html', 'Dedicated server?', 0x00200020n);
registerSearchData('QuickMatchFailureWidget', '', 'API/ShooterGame/UI/Menu/FShooterMainMenu/QuickMatchFailureWidget/index.html', 'used for displaying the quickmatch confirmation dialog when a quickmatch to join is not found', 0x00200020n);
registerSearchData('QuickMatchFailureWidgetContainer', '', 'API/ShooterGame/UI/Menu/FShooterMainMenu/QuickMatchFailureWidgetContainer/index.html', 'used for managing the QuickMatchFailureWidget', 0x00200020n);
registerSearchData('QuickMatchSearchingWidget', '', 'API/ShooterGame/UI/Menu/FShooterMainMenu/QuickMatchSearchingWidget/index.html', 'used for displaying UI for when we are actively searching for a quickmatch', 0x00200020n);
registerSearchData('QuickMatchSearchingWidgetContainer', '', 'API/ShooterGame/UI/Menu/FShooterMainMenu/QuickMatchSearchingWidgetContainer/index.html', 'used for managing the QuickMatchSearchingWidget', 0x00200020n);
registerSearchData('QuickMatchStoppingWidget', '', 'API/ShooterGame/UI/Menu/FShooterMainMenu/QuickMatchStoppingWidget/index.html', 'used for managing the QuickMatchStoppingWidget', 0x00200020n);
registerSearchData('QuickMatchStoppingWidgetContainer', '', 'API/ShooterGame/UI/Menu/FShooterMainMenu/QuickMatchStoppingWidgetContainer/index.html', 'used for displaying a message while we wait for quick match to stop searching', 0x00200020n);
registerSearchData('OnMatchmakingCompleteDelegateHandle', '', 'API/ShooterGame/UI/Menu/FShooterMainMenu/OnMatchmakingCompleteDelegateHandle/index.html', '', 0x00200020n);
registerSearchData('OnCancelMatchmakingCompleteDelegateHandle', '', 'API/ShooterGame/UI/Menu/FShooterMainMenu/OnCancelMatchmakingCompleteDelegateHandle/index.html', '', 0x00200020n);
registerSearchData('OnLoginCompleteDelegateHandle', '', 'API/ShooterGame/UI/Menu/FShooterMainMenu/OnLoginCompleteDelegateHandle/index.html', '', 0x00200020n);
registerSearchData('FShooterMessageMenu', '', 'API/ShooterGame/UI/Menu/FShooterMessageMenu/index.html', '', 0x00000001n);
registerSearchData('Construct', '', 'API/ShooterGame/UI/Menu/FShooterMessageMenu/Construct/index.html', 'build menu', 0x00100010n);
registerSearchData('RemoveFromGameViewport', '', 'API/ShooterGame/UI/Menu/FShooterMessageMenu/RemoveFromGameViewport/index.html', 'Remove from the gameviewport.', 0x00100010n);
registerSearchData('HandleLoginUIClosed', '', 'API/ShooterGame/UI/Menu/FShooterMessageMenu/HandleLoginUIClosed/index.html', 'The delegate function for external login UI closure when a user has signed in. ', 0x00100010n);
registerSearchData('HideDialogAndGotoNextState', '', 'API/ShooterGame/UI/Menu/FShooterMessageMenu/HideDialogAndGotoNextState/index.html', 'Remove dialog, and go to the next state', 0x00100010n);
registerSearchData('SetOKClickedDelegate', '', 'API/ShooterGame/UI/Menu/FShooterMessageMenu/SetOKClickedDelegate/index.html', '', 0x00100010n);
registerSearchData('SetCancelClickedDelegate', '', 'API/ShooterGame/UI/Menu/FShooterMessageMenu/SetCancelClickedDelegate/index.html', '', 0x00100010n);
registerSearchData('OnClickedOK', '', 'API/ShooterGame/UI/Menu/FShooterMessageMenu/OnClickedOK/index.html', 'Handler for ok confirmation.', 0x00400010n);
registerSearchData('OnClickedCancel', '', 'API/ShooterGame/UI/Menu/FShooterMessageMenu/OnClickedCancel/index.html', '', 0x00400010n);
registerSearchData('GameInstance', '', 'API/ShooterGame/UI/Menu/FShooterMessageMenu/GameInstance/index.html', 'Owning game instance', 0x00400020n);
registerSearchData('PlayerOwner', '', 'API/ShooterGame/UI/Menu/FShooterMessageMenu/PlayerOwner/index.html', 'Local player that will have focus of the dialog box (can be NULL)', 0x00400020n);
registerSearchData('PendingNextState', '', 'API/ShooterGame/UI/Menu/FShooterMessageMenu/PendingNextState/index.html', 'Cache the desired next state so we can advance to that after the confirmation dialog', 0x00400020n);
registerSearchData('OKButtonDelegate', '', 'API/ShooterGame/UI/Menu/FShooterMessageMenu/OKButtonDelegate/index.html', '', 0x00400020n);
registerSearchData('CancelButtonDelegate', '', 'API/ShooterGame/UI/Menu/FShooterMessageMenu/CancelButtonDelegate/index.html', '', 0x00400020n);
registerSearchData('FShooterWelcomeMenu', '', 'API/ShooterGame/UI/Menu/FShooterWelcomeMenu/index.html', 'Copyright 1998-2019 Epic Games, Inc. All Rights Reserved.', 0x00000001n);
registerSearchData('Construct', '', 'API/ShooterGame/UI/Menu/FShooterWelcomeMenu/Construct/index.html', 'build menu', 0x00100010n);
registerSearchData('AddToGameViewport', '', 'API/ShooterGame/UI/Menu/FShooterWelcomeMenu/AddToGameViewport/index.html', 'Add the menu to the gameviewport so it becomes visible', 0x00100010n);
registerSearchData('RemoveFromGameViewport', '', 'API/ShooterGame/UI/Menu/FShooterWelcomeMenu/RemoveFromGameViewport/index.html', 'Remove from the gameviewport.', 0x00100010n);
registerSearchData('HandleLoginUIClosed', '', 'API/ShooterGame/UI/Menu/FShooterWelcomeMenu/HandleLoginUIClosed/index.html', 'The delegate function for external login UI closure when a user has signed in. ', 0x00100010n);
registerSearchData('SetControllerAndAdvanceToMainMenu', '', 'API/ShooterGame/UI/Menu/FShooterWelcomeMenu/SetControllerAndAdvanceToMainMenu/index.html', 'Called when a user needs to advance from the welcome screen to the main menu. ', 0x00100010n);
registerSearchData('LockControls', '', 'API/ShooterGame/UI/Menu/FShooterWelcomeMenu/LockControls/index.html', 'Lock/Unlock controls based', 0x00100010n);
registerSearchData('GetControlsLocked', '', 'API/ShooterGame/UI/Menu/FShooterWelcomeMenu/GetControlsLocked/index.html', '', 0x00900010n);
registerSearchData('GetGameInstance', '', 'API/ShooterGame/UI/Menu/FShooterWelcomeMenu/GetGameInstance/index.html', '', 0x00100010n);
registerSearchData('OnContinueWithoutSavingConfirm', '', 'API/ShooterGame/UI/Menu/FShooterWelcomeMenu/OnContinueWithoutSavingConfirm/index.html', 'Handler for continue-without-saving confirmation.', 0x00400010n);
registerSearchData('OnConfirmGeneric', '', 'API/ShooterGame/UI/Menu/FShooterWelcomeMenu/OnConfirmGeneric/index.html', 'Generic Handler for hiding the dialog.', 0x00400010n);
registerSearchData('OnUserCanPlay', '', 'API/ShooterGame/UI/Menu/FShooterWelcomeMenu/OnUserCanPlay/index.html', 'Handler for querying a user\'s privileges', 0x00400010n);
registerSearchData('GameInstance', '', 'API/ShooterGame/UI/Menu/FShooterWelcomeMenu/GameInstance/index.html', 'Owning game instance', 0x00400020n);
registerSearchData('PendingControllerIndex', '', 'API/ShooterGame/UI/Menu/FShooterWelcomeMenu/PendingControllerIndex/index.html', 'Cache the user id that tried to advance, so we can use it again after the confirmation dialog', 0x00400020n);
registerSearchData('MenuWidget', '', 'API/ShooterGame/UI/Menu/FShooterWelcomeMenu/MenuWidget/index.html', '\"Presss A/X to play\" widget', 0x00400020n);
registerSearchData('bControlsLocked', '', 'API/ShooterGame/UI/Menu/FShooterWelcomeMenu/bControlsLocked/index.html', '', 0x00400020n);
registerSearchData('FShooterChatStyle', '', 'API/ShooterGame/UI/Style/FShooterChatStyle/index.html', 'Represents the appearance of an SChatWidget', 0x08000002n);
registerSearchData('FShooterChatStyle', '', 'API/ShooterGame/UI/Style/FShooterChatStyle/FShooterChatStyle/index.html', '', 0x80100010n);
registerSearchData('FShooterChatStyle', '', 'API/ShooterGame/UI/Style/FShooterChatStyle/FShooterChatStyle-2-0/index.html', '', 0x0000000100140010n);
registerSearchData('GetResources', '', 'API/ShooterGame/UI/Style/FShooterChatStyle/GetResources/index.html', 'FSlateWidgetStyle', 0x00940010n);
registerSearchData('GetTypeName', '', 'API/ShooterGame/UI/Style/FShooterChatStyle/GetTypeName/index.html', '', 0x00940010n);
registerSearchData('GetDefault', '', 'API/ShooterGame/UI/Style/FShooterChatStyle/GetDefault/index.html', '', 0x00120010n);
registerSearchData('SetChatEntryStyle', '', 'API/ShooterGame/UI/Style/FShooterChatStyle/SetChatEntryStyle/index.html', '', 0x00100010n);
registerSearchData('SetBackingBrush', '', 'API/ShooterGame/UI/Style/FShooterChatStyle/SetBackingBrush/index.html', '', 0x00100010n);
registerSearchData('SetBoxBorderColor', '', 'API/ShooterGame/UI/Style/FShooterChatStyle/SetBoxBorderColor/index.html', '', 0x00100010n);
registerSearchData('SetTextColor', '', 'API/ShooterGame/UI/Style/FShooterChatStyle/SetTextColor/index.html', '', 0x00100010n);
registerSearchData('SetRxMessgeSound', '', 'API/ShooterGame/UI/Style/FShooterChatStyle/SetRxMessgeSound/index.html', '', 0x00100010n);
registerSearchData('SetTxMessgeSound', '', 'API/ShooterGame/UI/Style/FShooterChatStyle/SetTxMessgeSound/index.html', '', 0x00100010n);
registerSearchData('TypeName', '', 'API/ShooterGame/UI/Style/FShooterChatStyle/TypeName/index.html', '', 0x00920020n);
registerSearchData('', '', 'API/ShooterGame/UI/Style/FShooterChatStyle//index.html', '', 0x00100020n);
registerSearchData('TextEntryStyle', '', 'API/ShooterGame/UI/Style/FShooterChatStyle/TextEntryStyle/index.html', 'The style used for entering chat text', 0x40100020n);
registerSearchData('BackingBrush', '', 'API/ShooterGame/UI/Style/FShooterChatStyle/BackingBrush/index.html', 'The brush used for the chat backing', 0x40100020n);
registerSearchData('BoxBorderColor', '', 'API/ShooterGame/UI/Style/FShooterChatStyle/BoxBorderColor/index.html', 'The color used for the chat box border', 0x40100020n);
registerSearchData('TextColor', '', 'API/ShooterGame/UI/Style/FShooterChatStyle/TextColor/index.html', 'The color used for the chat box text', 0x40100020n);
registerSearchData('RxMessgeSound', '', 'API/ShooterGame/UI/Style/FShooterChatStyle/RxMessgeSound/index.html', 'The sound that should play when receiving a chat message', 0x40100020n);
registerSearchData('TxMessgeSound', '', 'API/ShooterGame/UI/Style/FShooterChatStyle/TxMessgeSound/index.html', 'The sound that should play when sending a chat message', 0x40100020n);
registerSearchData('UShooterChatWidgetStyle', '', 'API/ShooterGame/UI/Style/UShooterChatWidgetStyle/index.html', '', 0x04000001n);
registerSearchData('GetStyle', '', 'API/ShooterGame/UI/Style/UShooterChatWidgetStyle/GetStyle/index.html', '', 0x00940010n);
registerSearchData('ChatStyle', '', 'API/ShooterGame/UI/Style/UShooterChatWidgetStyle/ChatStyle/index.html', 'The actual data describing the chat appearance.', 0x40100020n);
registerSearchData('FShooterMenuItemStyle', '', 'API/ShooterGame/UI/Style/FShooterMenuItemStyle/index.html', 'Represents the appearance of an FShooterMenuItem', 0x08000002n);
registerSearchData('FShooterMenuItemStyle', '', 'API/ShooterGame/UI/Style/FShooterMenuItemStyle/FShooterMenuItemStyle/index.html', '', 0x80100010n);
registerSearchData('FShooterMenuItemStyle', '', 'API/ShooterGame/UI/Style/FShooterMenuItemStyle/FShooterMenuItemStyle-2-0/index.html', '', 0x0000000100140010n);
registerSearchData('GetResources', '', 'API/ShooterGame/UI/Style/FShooterMenuItemStyle/GetResources/index.html', 'FSlateWidgetStyle', 0x00940010n);
registerSearchData('GetTypeName', '', 'API/ShooterGame/UI/Style/FShooterMenuItemStyle/GetTypeName/index.html', '', 0x00940010n);
registerSearchData('GetDefault', '', 'API/ShooterGame/UI/Style/FShooterMenuItemStyle/GetDefault/index.html', '', 0x00120010n);
registerSearchData('SetBackgroundBrush', '', 'API/ShooterGame/UI/Style/FShooterMenuItemStyle/SetBackgroundBrush/index.html', '', 0x00100010n);
registerSearchData('SetLeftArrowImage', '', 'API/ShooterGame/UI/Style/FShooterMenuItemStyle/SetLeftArrowImage/index.html', '', 0x00100010n);
registerSearchData('SetRightArrowImage', '', 'API/ShooterGame/UI/Style/FShooterMenuItemStyle/SetRightArrowImage/index.html', '', 0x00100010n);
registerSearchData('TypeName', '', 'API/ShooterGame/UI/Style/FShooterMenuItemStyle/TypeName/index.html', '', 0x00920020n);
registerSearchData('', '', 'API/ShooterGame/UI/Style/FShooterMenuItemStyle//index.html', '', 0x00100020n);
registerSearchData('BackgroundBrush', '', 'API/ShooterGame/UI/Style/FShooterMenuItemStyle/BackgroundBrush/index.html', 'The brush used for the item background', 0x40100020n);
registerSearchData('LeftArrowImage', '', 'API/ShooterGame/UI/Style/FShooterMenuItemStyle/LeftArrowImage/index.html', 'The image used for the left arrow', 0x40100020n);
registerSearchData('RightArrowImage', '', 'API/ShooterGame/UI/Style/FShooterMenuItemStyle/RightArrowImage/index.html', 'The image used for the right arrow', 0x40100020n);
registerSearchData('UShooterMenuItemWidgetStyle', '', 'API/ShooterGame/UI/Style/UShooterMenuItemWidgetStyle/index.html', '', 0x04000001n);
registerSearchData('GetStyle', '', 'API/ShooterGame/UI/Style/UShooterMenuItemWidgetStyle/GetStyle/index.html', '', 0x00940010n);
registerSearchData('MenuItemStyle', '', 'API/ShooterGame/UI/Style/UShooterMenuItemWidgetStyle/MenuItemStyle/index.html', 'The actual data describing the menu\'s appearance.', 0x40100020n);
registerSearchData('FShooterMenuSoundsStyle', '', 'API/ShooterGame/UI/Style/FShooterMenuSoundsStyle/index.html', 'Represents the common menu sounds used in the shooter game', 0x08000002n);
registerSearchData('FShooterMenuSoundsStyle', '', 'API/ShooterGame/UI/Style/FShooterMenuSoundsStyle/FShooterMenuSoundsStyle/index.html', '', 0x80100010n);
registerSearchData('FShooterMenuSoundsStyle', '', 'API/ShooterGame/UI/Style/FShooterMenuSoundsStyle/FShooterMenuSoundsStyle-2-0/index.html', '', 0x0000000100140010n);
registerSearchData('GetResources', '', 'API/ShooterGame/UI/Style/FShooterMenuSoundsStyle/GetResources/index.html', 'FSlateWidgetStyle', 0x00940010n);
registerSearchData('GetTypeName', '', 'API/ShooterGame/UI/Style/FShooterMenuSoundsStyle/GetTypeName/index.html', '', 0x00940010n);
registerSearchData('GetDefault', '', 'API/ShooterGame/UI/Style/FShooterMenuSoundsStyle/GetDefault/index.html', '', 0x00120010n);
registerSearchData('SetStartGameSound', '', 'API/ShooterGame/UI/Style/FShooterMenuSoundsStyle/SetStartGameSound/index.html', '', 0x00100010n);
registerSearchData('SetExitGameSound', '', 'API/ShooterGame/UI/Style/FShooterMenuSoundsStyle/SetExitGameSound/index.html', '', 0x00100010n);
registerSearchData('TypeName', '', 'API/ShooterGame/UI/Style/FShooterMenuSoundsStyle/TypeName/index.html', '', 0x00920020n);
registerSearchData('', '', 'API/ShooterGame/UI/Style/FShooterMenuSoundsStyle//index.html', '', 0x00100020n);
registerSearchData('StartGameSound', '', 'API/ShooterGame/UI/Style/FShooterMenuSoundsStyle/StartGameSound/index.html', 'The sound that should play when starting the game', 0x40100020n);
registerSearchData('ExitGameSound', '', 'API/ShooterGame/UI/Style/FShooterMenuSoundsStyle/ExitGameSound/index.html', 'The sound that should play when exiting the game', 0x40100020n);
registerSearchData('UShooterMenuSoundsWidgetStyle', '', 'API/ShooterGame/UI/Style/UShooterMenuSoundsWidgetStyle/index.html', '', 0x04000001n);
registerSearchData('GetStyle', '', 'API/ShooterGame/UI/Style/UShooterMenuSoundsWidgetStyle/GetStyle/index.html', '', 0x00940010n);
registerSearchData('SoundsStyle', '', 'API/ShooterGame/UI/Style/UShooterMenuSoundsWidgetStyle/SoundsStyle/index.html', 'The actual data describing the sounds', 0x40100020n);
registerSearchData('FShooterMenuStyle', '', 'API/ShooterGame/UI/Style/FShooterMenuStyle/index.html', 'Represents the appearance of an SShooterMenuWidget', 0x08000002n);
registerSearchData('FShooterMenuStyle', '', 'API/ShooterGame/UI/Style/FShooterMenuStyle/FShooterMenuStyle/index.html', '', 0x80100010n);
registerSearchData('FShooterMenuStyle', '', 'API/ShooterGame/UI/Style/FShooterMenuStyle/FShooterMenuStyle-2-0/index.html', '', 0x0000000100140010n);
registerSearchData('GetResources', '', 'API/ShooterGame/UI/Style/FShooterMenuStyle/GetResources/index.html', 'FSlateWidgetStyle', 0x00940010n);
registerSearchData('GetTypeName', '', 'API/ShooterGame/UI/Style/FShooterMenuStyle/GetTypeName/index.html', '', 0x00940010n);
registerSearchData('GetDefault', '', 'API/ShooterGame/UI/Style/FShooterMenuStyle/GetDefault/index.html', '', 0x00120010n);
registerSearchData('SetHeaderBackgroundBrush', '', 'API/ShooterGame/UI/Style/FShooterMenuStyle/SetHeaderBackgroundBrush/index.html', '', 0x00100010n);
registerSearchData('SetLeftBackgroundBrush', '', 'API/ShooterGame/UI/Style/FShooterMenuStyle/SetLeftBackgroundBrush/index.html', '', 0x00100010n);
registerSearchData('SetRightBackgroundBrush', '', 'API/ShooterGame/UI/Style/FShooterMenuStyle/SetRightBackgroundBrush/index.html', '', 0x00100010n);
registerSearchData('SetMenuEnterSound', '', 'API/ShooterGame/UI/Style/FShooterMenuStyle/SetMenuEnterSound/index.html', '', 0x00100010n);
registerSearchData('SetMenuBackSound', '', 'API/ShooterGame/UI/Style/FShooterMenuStyle/SetMenuBackSound/index.html', '', 0x00100010n);
registerSearchData('SetOptionChangeSound', '', 'API/ShooterGame/UI/Style/FShooterMenuStyle/SetOptionChangeSound/index.html', '', 0x00100010n);
registerSearchData('SetMenuItemChangeSound', '', 'API/ShooterGame/UI/Style/FShooterMenuStyle/SetMenuItemChangeSound/index.html', '', 0x00100010n);
registerSearchData('TypeName', '', 'API/ShooterGame/UI/Style/FShooterMenuStyle/TypeName/index.html', '', 0x00920020n);
registerSearchData('', '', 'API/ShooterGame/UI/Style/FShooterMenuStyle//index.html', '', 0x00100020n);
registerSearchData('HeaderBackgroundBrush', '', 'API/ShooterGame/UI/Style/FShooterMenuStyle/HeaderBackgroundBrush/index.html', 'The brush used for the header background', 0x40100020n);
registerSearchData('LeftBackgroundBrush', '', 'API/ShooterGame/UI/Style/FShooterMenuStyle/LeftBackgroundBrush/index.html', 'The brush used for the left side of the menu', 0x40100020n);
registerSearchData('RightBackgroundBrush', '', 'API/ShooterGame/UI/Style/FShooterMenuStyle/RightBackgroundBrush/index.html', 'The brush used for the right side of the menu', 0x40100020n);
registerSearchData('MenuEnterSound', '', 'API/ShooterGame/UI/Style/FShooterMenuStyle/MenuEnterSound/index.html', 'The sound that should play when entering a sub-menu', 0x40100020n);
registerSearchData('MenuBackSound', '', 'API/ShooterGame/UI/Style/FShooterMenuStyle/MenuBackSound/index.html', 'The sound that should play when leaving a sub-menu', 0x40100020n);
registerSearchData('OptionChangeSound', '', 'API/ShooterGame/UI/Style/FShooterMenuStyle/OptionChangeSound/index.html', 'The sound that should play when changing an option', 0x40100020n);
registerSearchData('MenuItemChangeSound', '', 'API/ShooterGame/UI/Style/FShooterMenuStyle/MenuItemChangeSound/index.html', 'The sound that should play when changing the selected menu item', 0x40100020n);
registerSearchData('UShooterMenuWidgetStyle', '', 'API/ShooterGame/UI/Style/UShooterMenuWidgetStyle/index.html', '', 0x04000001n);
registerSearchData('GetStyle', '', 'API/ShooterGame/UI/Style/UShooterMenuWidgetStyle/GetStyle/index.html', '', 0x00940010n);
registerSearchData('MenuStyle', '', 'API/ShooterGame/UI/Style/UShooterMenuWidgetStyle/MenuStyle/index.html', 'The actual data describing the menu\'s appearance.', 0x40100020n);
registerSearchData('FShooterOptionsStyle', '', 'API/ShooterGame/UI/Style/FShooterOptionsStyle/index.html', 'Represents the appearance of an FShooterOptions', 0x08000002n);
registerSearchData('FShooterOptionsStyle', '', 'API/ShooterGame/UI/Style/FShooterOptionsStyle/FShooterOptionsStyle/index.html', '', 0x80100010n);
registerSearchData('FShooterOptionsStyle', '', 'API/ShooterGame/UI/Style/FShooterOptionsStyle/FShooterOptionsStyle-2-0/index.html', '', 0x0000000100140010n);
registerSearchData('GetResources', '', 'API/ShooterGame/UI/Style/FShooterOptionsStyle/GetResources/index.html', 'FSlateWidgetStyle', 0x00940010n);
registerSearchData('GetTypeName', '', 'API/ShooterGame/UI/Style/FShooterOptionsStyle/GetTypeName/index.html', '', 0x00940010n);
registerSearchData('GetDefault', '', 'API/ShooterGame/UI/Style/FShooterOptionsStyle/GetDefault/index.html', '', 0x00120010n);
registerSearchData('SetAcceptChangesSound', '', 'API/ShooterGame/UI/Style/FShooterOptionsStyle/SetAcceptChangesSound/index.html', '', 0x00100010n);
registerSearchData('SetDiscardChangesSound', '', 'API/ShooterGame/UI/Style/FShooterOptionsStyle/SetDiscardChangesSound/index.html', '', 0x00100010n);
registerSearchData('TypeName', '', 'API/ShooterGame/UI/Style/FShooterOptionsStyle/TypeName/index.html', '', 0x00920020n);
registerSearchData('', '', 'API/ShooterGame/UI/Style/FShooterOptionsStyle//index.html', '', 0x00100020n);
registerSearchData('AcceptChangesSound', '', 'API/ShooterGame/UI/Style/FShooterOptionsStyle/AcceptChangesSound/index.html', 'The sound the options should play when changes are accepted', 0x40100020n);
registerSearchData('DiscardChangesSound', '', 'API/ShooterGame/UI/Style/FShooterOptionsStyle/DiscardChangesSound/index.html', 'The sound the options should play when changes are discarded', 0x40100020n);
registerSearchData('UShooterOptionsWidgetStyle', '', 'API/ShooterGame/UI/Style/UShooterOptionsWidgetStyle/index.html', '', 0x04000001n);
registerSearchData('GetStyle', '', 'API/ShooterGame/UI/Style/UShooterOptionsWidgetStyle/GetStyle/index.html', '', 0x00940010n);
registerSearchData('OptionsStyle', '', 'API/ShooterGame/UI/Style/UShooterOptionsWidgetStyle/OptionsStyle/index.html', 'The actual data describing the menu\'s appearance.', 0x40100020n);
registerSearchData('FShooterScoreboardStyle', '', 'API/ShooterGame/UI/Style/FShooterScoreboardStyle/index.html', 'Represents the appearance of an SShooterScoreboardWidget', 0x08000002n);
registerSearchData('FShooterScoreboardStyle', '', 'API/ShooterGame/UI/Style/FShooterScoreboardStyle/FShooterScoreboardStyle/index.html', '', 0x80100010n);
registerSearchData('FShooterScoreboardStyle', '', 'API/ShooterGame/UI/Style/FShooterScoreboardStyle/FShooterScoreboardStyle-2-0/index.html', '', 0x0000000100140010n);
registerSearchData('GetResources', '', 'API/ShooterGame/UI/Style/FShooterScoreboardStyle/GetResources/index.html', 'FSlateWidgetStyle', 0x00940010n);
registerSearchData('GetTypeName', '', 'API/ShooterGame/UI/Style/FShooterScoreboardStyle/GetTypeName/index.html', '', 0x00940010n);
registerSearchData('GetDefault', '', 'API/ShooterGame/UI/Style/FShooterScoreboardStyle/GetDefault/index.html', '', 0x00120010n);
registerSearchData('SetItemBorderBrush', '', 'API/ShooterGame/UI/Style/FShooterScoreboardStyle/SetItemBorderBrush/index.html', '', 0x00100010n);
registerSearchData('SetKillStatColor', '', 'API/ShooterGame/UI/Style/FShooterScoreboardStyle/SetKillStatColor/index.html', '', 0x00100010n);
registerSearchData('SetDeathStatColor', '', 'API/ShooterGame/UI/Style/FShooterScoreboardStyle/SetDeathStatColor/index.html', '', 0x00100010n);
registerSearchData('SetScoreStatColor', '', 'API/ShooterGame/UI/Style/FShooterScoreboardStyle/SetScoreStatColor/index.html', '', 0x00100010n);
registerSearchData('SetPlayerChangeSound', '', 'API/ShooterGame/UI/Style/FShooterScoreboardStyle/SetPlayerChangeSound/index.html', '', 0x00100010n);
registerSearchData('TypeName', '', 'API/ShooterGame/UI/Style/FShooterScoreboardStyle/TypeName/index.html', '', 0x00920020n);
registerSearchData('', '', 'API/ShooterGame/UI/Style/FShooterScoreboardStyle//index.html', '', 0x00100020n);
registerSearchData('ItemBorderBrush', '', 'API/ShooterGame/UI/Style/FShooterScoreboardStyle/ItemBorderBrush/index.html', 'The brush used for the item border', 0x40100020n);
registerSearchData('KillStatColor', '', 'API/ShooterGame/UI/Style/FShooterScoreboardStyle/KillStatColor/index.html', 'The color used for the kill stat', 0x40100020n);
registerSearchData('DeathStatColor', '', 'API/ShooterGame/UI/Style/FShooterScoreboardStyle/DeathStatColor/index.html', 'The color used for the death stat', 0x40100020n);
registerSearchData('ScoreStatColor', '', 'API/ShooterGame/UI/Style/FShooterScoreboardStyle/ScoreStatColor/index.html', 'The color used for the score stat', 0x40100020n);
registerSearchData('PlayerChangeSound', '', 'API/ShooterGame/UI/Style/FShooterScoreboardStyle/PlayerChangeSound/index.html', 'The sound that should play when the highlighted player changes in the scoreboard', 0x40100020n);
registerSearchData('UShooterScoreboardWidgetStyle', '', 'API/ShooterGame/UI/Style/UShooterScoreboardWidgetStyle/index.html', '', 0x04000001n);
registerSearchData('GetStyle', '', 'API/ShooterGame/UI/Style/UShooterScoreboardWidgetStyle/GetStyle/index.html', '', 0x00940010n);
registerSearchData('ScoreboardStyle', '', 'API/ShooterGame/UI/Style/UShooterScoreboardWidgetStyle/ScoreboardStyle/index.html', 'The actual data describing the scoreboard\'s appearance.', 0x40100020n);
registerSearchData('FShooterStyle', '', 'API/ShooterGame/UI/Style/FShooterStyle/index.html', 'Copyright 1998-2019 Epic Games, Inc. All Rights Reserved.', 0x00000001n);
registerSearchData('Initialize', '', 'API/ShooterGame/UI/Style/FShooterStyle/Initialize/index.html', '', 0x00120010n);
registerSearchData('Shutdown', '', 'API/ShooterGame/UI/Style/FShooterStyle/Shutdown/index.html', '', 0x00120010n);
registerSearchData('ReloadTextures', '', 'API/ShooterGame/UI/Style/FShooterStyle/ReloadTextures/index.html', 'reloads textures used by slate renderer', 0x00120010n);
registerSearchData('Get', '', 'API/ShooterGame/UI/Style/FShooterStyle/Get/index.html', '', 0x00120010n);
registerSearchData('GetStyleSetName', '', 'API/ShooterGame/UI/Style/FShooterStyle/GetStyleSetName/index.html', '', 0x00120010n);
registerSearchData('Create', '', 'API/ShooterGame/UI/Style/FShooterStyle/Create/index.html', '', 0x00420010n);
registerSearchData('ShooterStyleInstance', '', 'API/ShooterGame/UI/Style/FShooterStyle/ShooterStyleInstance/index.html', '', 0x00420020n);
registerSearchData('FChatLine', '', 'API/ShooterGame/UI/Widgets/FChatLine/index.html', 'Struct to hold chat lines.', 0x00000002n);
registerSearchData('FChatLine', '', 'API/ShooterGame/UI/Widgets/FChatLine/FChatLine/index.html', '', 0x80100010n);
registerSearchData('ChatString', '', 'API/ShooterGame/UI/Widgets/FChatLine/ChatString/index.html', 'Source string of this chat message.', 0x00100020n);
registerSearchData('SChatWidget', '', 'API/ShooterGame/UI/Widgets/SChatWidget/index.html', 'A chat widget. Contains a box with history and a text entry box.', 0x00000001n);
registerSearchData('SLATE_BEGIN_ARGS', '', 'API/ShooterGame/UI/Widgets/SChatWidget/SLATE_BEGIN_ARGS/index.html', '', 0x80100010n);
registerSearchData('Construct', '', 'API/ShooterGame/UI/Widgets/SChatWidget/Construct/index.html', 'Should the chat widget be kept visible at all times', 0x80100010n);
registerSearchData('GetEntryVisibility', '', 'API/ShooterGame/UI/Widgets/SChatWidget/GetEntryVisibility/index.html', 'Gets the visibility of the entry widget.', 0x00900010n);
registerSearchData('SetEntryVisibility', '', 'API/ShooterGame/UI/Widgets/SChatWidget/SetEntryVisibility/index.html', 'Sets the visibility of the chat widgets. ', 0x00100010n);
registerSearchData('AddChatLine', '', 'API/ShooterGame/UI/Widgets/SChatWidget/AddChatLine/index.html', 'Add a new chat line. ', 0x00100010n);
registerSearchData('AsWidget', '', 'API/ShooterGame/UI/Widgets/SChatWidget/AsWidget/index.html', '', 0x00100010n);
registerSearchData('Tick', '', 'API/ShooterGame/UI/Widgets/SChatWidget/Tick/index.html', 'Update function. Allows us to focus keyboard.', 0x00100010n);
registerSearchData('OnFocusReceived', '', 'API/ShooterGame/UI/Widgets/SChatWidget/OnFocusReceived/index.html', 'The UI sets up the appropriate mouse settings upon focus.', 0x00100010n);
registerSearchData('OnChatTextCommitted', '', 'API/ShooterGame/UI/Widgets/SChatWidget/OnChatTextCommitted/index.html', 'Delegate called when the text is commited. ', 0x00100010n);
registerSearchData('GetBorderColor', '', 'API/ShooterGame/UI/Widgets/SChatWidget/GetBorderColor/index.html', 'Return the border color.', 0x00900010n);
registerSearchData('GetChatLineColor', '', 'API/ShooterGame/UI/Widgets/SChatWidget/GetChatLineColor/index.html', 'Return the font color.', 0x00900010n);
registerSearchData('GetStyleColor', '', 'API/ShooterGame/UI/Widgets/SChatWidget/GetStyleColor/index.html', 'Return the adjusted color based on whether the chatbox is visible ', 0x00900010n);
registerSearchData('GenerateChatRow', '', 'API/ShooterGame/UI/Widgets/SChatWidget/GenerateChatRow/index.html', '', 0x00100010n);
registerSearchData('LastVisibility', '', 'API/ShooterGame/UI/Widgets/SChatWidget/LastVisibility/index.html', 'Visibility of the entry widget previous frame.', 0x00100020n);
registerSearchData('bVisibiltyNeedsFocus', '', 'API/ShooterGame/UI/Widgets/SChatWidget/bVisibiltyNeedsFocus/index.html', 'If try we should set the focus when we change the visibility', 0x00100020n);
registerSearchData('ChatFadeTime', '', 'API/ShooterGame/UI/Widgets/SChatWidget/ChatFadeTime/index.html', 'Time to show the chat lines as visible after receiving a chat message.', 0x00100020n);
registerSearchData('LastChatLineTime', '', 'API/ShooterGame/UI/Widgets/SChatWidget/LastChatLineTime/index.html', 'When we received our last chat message.', 0x00100020n);
registerSearchData('ChatEditBox', '', 'API/ShooterGame/UI/Widgets/SChatWidget/ChatEditBox/index.html', 'The edit text widget.', 0x00100020n);
registerSearchData('ChatHistoryListView', '', 'API/ShooterGame/UI/Widgets/SChatWidget/ChatHistoryListView/index.html', 'The chat history list view.', 0x00100020n);
registerSearchData('ChatHistory', '', 'API/ShooterGame/UI/Widgets/SChatWidget/ChatHistory/index.html', 'The array of chat history.', 0x00100020n);
registerSearchData('bAlwaysVisible', '', 'API/ShooterGame/UI/Widgets/SChatWidget/bAlwaysVisible/index.html', 'Should this chatbox be kept visible.', 0x00100020n);
registerSearchData('bDismissAfterSay', '', 'API/ShooterGame/UI/Widgets/SChatWidget/bDismissAfterSay/index.html', 'Should this chatbox be dismmised on sending a string.', 0x00100020n);
registerSearchData('ChatStyle', '', 'API/ShooterGame/UI/Widgets/SChatWidget/ChatStyle/index.html', 'Style to use for this chat widget', 0x00900020n);
registerSearchData('ChatFont', '', 'API/ShooterGame/UI/Widgets/SChatWidget/ChatFont/index.html', 'Copy of the font used for chat, with the font fallback value modified', 0x00100020n);
registerSearchData('SShooterConfirmationDialog', '', 'API/ShooterGame/UI/Widgets/SShooterConfirmationDialog/index.html', 'Copyright 1998-2019 Epic Games, Inc. All Rights Reserved.', 0x00000001n);
registerSearchData('SLATE_BEGIN_ARGS', '', 'API/ShooterGame/UI/Widgets/SShooterConfirmationDialog/SLATE_BEGIN_ARGS/index.html', '', 0x80100010n);
registerSearchData('Construct', '', 'API/ShooterGame/UI/Widgets/SShooterConfirmationDialog/Construct/index.html', '', 0x80100010n);
registerSearchData('SupportsKeyboardFocus', '', 'API/ShooterGame/UI/Widgets/SShooterConfirmationDialog/SupportsKeyboardFocus/index.html', '', 0x00940010n);
registerSearchData('OnFocusReceived', '', 'API/ShooterGame/UI/Widgets/SShooterConfirmationDialog/OnFocusReceived/index.html', '', 0x00140010n);
registerSearchData('OnKeyDown', '', 'API/ShooterGame/UI/Widgets/SShooterConfirmationDialog/OnKeyDown/index.html', '', 0x00140010n);
registerSearchData('OnConfirmHandler', '', 'API/ShooterGame/UI/Widgets/SShooterConfirmationDialog/OnConfirmHandler/index.html', '', 0x00400010n);
registerSearchData('ExecuteConfirm', '', 'API/ShooterGame/UI/Widgets/SShooterConfirmationDialog/ExecuteConfirm/index.html', '', 0x00400010n);
registerSearchData('PlayerOwner', '', 'API/ShooterGame/UI/Widgets/SShooterConfirmationDialog/PlayerOwner/index.html', 'The player that owns the dialog.', 0x00100020n);
registerSearchData('OnConfirm', '', 'API/ShooterGame/UI/Widgets/SShooterConfirmationDialog/OnConfirm/index.html', 'The delegate for confirming', 0x00100020n);
registerSearchData('OnCancel', '', 'API/ShooterGame/UI/Widgets/SShooterConfirmationDialog/OnCancel/index.html', 'The delegate for cancelling', 0x00100020n);
registerSearchData('DialogType', '', 'API/ShooterGame/UI/Widgets/SShooterConfirmationDialog/DialogType/index.html', 'The type of dialog this is', 0x00100020n);
registerSearchData('SShooterDemoHUD', '', 'API/ShooterGame/UI/Widgets/SShooterDemoHUD/index.html', 'Shows the replay timeline bar, current time and total time of the replay, current playback speed, and a pause toggle button.', 0x00000001n);
registerSearchData('SLATE_BEGIN_ARGS', '', 'API/ShooterGame/UI/Widgets/SShooterDemoHUD/SLATE_BEGIN_ARGS/index.html', '', 0x80100010n);
registerSearchData('Construct', '', 'API/ShooterGame/UI/Widgets/SShooterDemoHUD/Construct/index.html', '', 0x80100010n);
registerSearchData('SupportsKeyboardFocus', '', 'API/ShooterGame/UI/Widgets/SShooterDemoHUD/SupportsKeyboardFocus/index.html', '', 0x00940010n);
registerSearchData('GetCurrentReplayTime', '', 'API/ShooterGame/UI/Widgets/SShooterDemoHUD/GetCurrentReplayTime/index.html', '', 0x00c00010n);
registerSearchData('GetTotalReplayTime', '', 'API/ShooterGame/UI/Widgets/SShooterDemoHUD/GetTotalReplayTime/index.html', '', 0x00c00010n);
registerSearchData('GetPlaybackSpeed', '', 'API/ShooterGame/UI/Widgets/SShooterDemoHUD/GetPlaybackSpeed/index.html', '', 0x00c00010n);
registerSearchData('IsPauseChecked', '', 'API/ShooterGame/UI/Widgets/SShooterDemoHUD/IsPauseChecked/index.html', '', 0x00c00010n);
registerSearchData('OnPauseCheckStateChanged', '', 'API/ShooterGame/UI/Widgets/SShooterDemoHUD/OnPauseCheckStateChanged/index.html', '', 0x00c00010n);
registerSearchData('PlayerOwner', '', 'API/ShooterGame/UI/Widgets/SShooterDemoHUD/PlayerOwner/index.html', '', 0x00400020n);
registerSearchData('FColumnData', '', 'API/ShooterGame/UI/Widgets/FColumnData/index.html', '', 0x00000002n);
registerSearchData('FColumnData', '', 'API/ShooterGame/UI/Widgets/FColumnData/FColumnData/index.html', 'defaults', 0x80100010n);
registerSearchData('FColumnData', '', 'API/ShooterGame/UI/Widgets/FColumnData/FColumnData-2-0/index.html', '', 0x80100010n);
registerSearchData('Name', '', 'API/ShooterGame/UI/Widgets/FColumnData/Name/index.html', 'Column name', 0x00100020n);
registerSearchData('Color', '', 'API/ShooterGame/UI/Widgets/FColumnData/Color/index.html', 'Column color', 0x00100020n);
registerSearchData('AttributeGetter', '', 'API/ShooterGame/UI/Widgets/FColumnData/AttributeGetter/index.html', 'Stat value getter delegate', 0x00100020n);
registerSearchData('FTeamPlayer', '', 'API/ShooterGame/UI/Widgets/FTeamPlayer/index.html', '', 0x00000002n);
registerSearchData('FTeamPlayer', '', 'API/ShooterGame/UI/Widgets/FTeamPlayer/FTeamPlayer/index.html', 'defaults', 0x80100010n);
registerSearchData('FTeamPlayer', '', 'API/ShooterGame/UI/Widgets/FTeamPlayer/FTeamPlayer-2-0/index.html', '', 0x80100010n);
registerSearchData('operator==', '', 'API/ShooterGame/UI/Widgets/FTeamPlayer/operator==/index.html', 'comparator', 0x00900010n);
registerSearchData('IsValid', '', 'API/ShooterGame/UI/Widgets/FTeamPlayer/IsValid/index.html', 'check to see if we have valid player data', 0x00900010n);
registerSearchData('TeamNum', '', 'API/ShooterGame/UI/Widgets/FTeamPlayer/TeamNum/index.html', 'The team the player belongs to', 0x00100020n);
registerSearchData('PlayerId', '', 'API/ShooterGame/UI/Widgets/FTeamPlayer/PlayerId/index.html', 'The number within that team', 0x00100020n);
registerSearchData('SShooterScoreboardWidget', '', 'API/ShooterGame/UI/Widgets/SShooterScoreboardWidget/index.html', 'class declare', 0x00000001n);
registerSearchData('SLATE_BEGIN_ARGS', '', 'API/ShooterGame/UI/Widgets/SShooterScoreboardWidget/SLATE_BEGIN_ARGS/index.html', '', 0x80400010n);
registerSearchData('Construct', '', 'API/ShooterGame/UI/Widgets/SShooterScoreboardWidget/Construct/index.html', '', 0x80400010n);
registerSearchData('Tick', '', 'API/ShooterGame/UI/Widgets/SShooterScoreboardWidget/Tick/index.html', 'update PlayerState maps with every tick when scoreboard is shown', 0x00440010n);
registerSearchData('SupportsKeyboardFocus', '', 'API/ShooterGame/UI/Widgets/SShooterScoreboardWidget/SupportsKeyboardFocus/index.html', 'if we want to receive focus', 0x00c40010n);
registerSearchData('OnFocusReceived', '', 'API/ShooterGame/UI/Widgets/SShooterScoreboardWidget/OnFocusReceived/index.html', 'when the widget recieves keyboard focus', 0x00440010n);
registerSearchData('OnKeyDown', '', 'API/ShooterGame/UI/Widgets/SShooterScoreboardWidget/OnKeyDown/index.html', 'handle keyboard input', 0x00440010n);
registerSearchData('StoreTalkingPlayerData', '', 'API/ShooterGame/UI/Widgets/SShooterScoreboardWidget/StoreTalkingPlayerData/index.html', 'Called when the scoreboard is displayed, Stores the name and whether or not a player is currently talking', 0x00400010n);
registerSearchData('UpdateScoreboardGrid', '', 'API/ShooterGame/UI/Widgets/SShooterScoreboardWidget/UpdateScoreboardGrid/index.html', 'updates widgets when players leave or join', 0x00200010n);
registerSearchData('MakeTotalsRow', '', 'API/ShooterGame/UI/Widgets/SShooterScoreboardWidget/MakeTotalsRow/index.html', 'makes total row widget', 0x00a00010n);
registerSearchData('MakePlayerRows', '', 'API/ShooterGame/UI/Widgets/SShooterScoreboardWidget/MakePlayerRows/index.html', 'makes player rows', 0x00a00010n);
registerSearchData('MakePlayerRow', '', 'API/ShooterGame/UI/Widgets/SShooterScoreboardWidget/MakePlayerRow/index.html', 'makes player row', 0x00a00010n);
registerSearchData('UpdatePlayerStateMaps', '', 'API/ShooterGame/UI/Widgets/SShooterScoreboardWidget/UpdatePlayerStateMaps/index.html', 'updates PlayerState maps to display accurate scores', 0x00200010n);
registerSearchData('GetRankedMap', '', 'API/ShooterGame/UI/Widgets/SShooterScoreboardWidget/GetRankedMap/index.html', 'gets ranked map for specific team', 0x00a00010n);
registerSearchData('GetSortedPlayerState', '', 'API/ShooterGame/UI/Widgets/SShooterScoreboardWidget/GetSortedPlayerState/index.html', 'gets PlayerState for specific team and player', 0x00a00010n);
registerSearchData('PlayerPresenceToItemVisibility', '', 'API/ShooterGame/UI/Widgets/SShooterScoreboardWidget/PlayerPresenceToItemVisibility/index.html', 'get player visibility', 0x00a00010n);
registerSearchData('SpeakerIconVisibility', '', 'API/ShooterGame/UI/Widgets/SShooterScoreboardWidget/SpeakerIconVisibility/index.html', 'get speaker icon visibility', 0x00a00010n);
registerSearchData('GetScoreboardBorderColor', '', 'API/ShooterGame/UI/Widgets/SShooterScoreboardWidget/GetScoreboardBorderColor/index.html', 'get scoreboard border color', 0x00a00010n);
registerSearchData('GetPlayerName', '', 'API/ShooterGame/UI/Widgets/SShooterScoreboardWidget/GetPlayerName/index.html', 'get player name', 0x00a00010n);
registerSearchData('ShouldPlayerBeDisplayed', '', 'API/ShooterGame/UI/Widgets/SShooterScoreboardWidget/ShouldPlayerBeDisplayed/index.html', 'get whether or not the player should be displayed on the scoreboard', 0x00a00010n);
registerSearchData('GetPlayerColor', '', 'API/ShooterGame/UI/Widgets/SShooterScoreboardWidget/GetPlayerColor/index.html', 'get player color', 0x00a00010n);
registerSearchData('GetColumnColor', '', 'API/ShooterGame/UI/Widgets/SShooterScoreboardWidget/GetColumnColor/index.html', 'get the column color', 0x00a00010n);
registerSearchData('IsOwnerPlayer', '', 'API/ShooterGame/UI/Widgets/SShooterScoreboardWidget/IsOwnerPlayer/index.html', 'checks to see if the specified player is the owner', 0x00a00010n);
registerSearchData('GetStat', '', 'API/ShooterGame/UI/Widgets/SShooterScoreboardWidget/GetStat/index.html', 'get specific stat for team number and optionally player', 0x00a00010n);
registerSearchData('LerpForCountup', '', 'API/ShooterGame/UI/Widgets/SShooterScoreboardWidget/LerpForCountup/index.html', 'linear interpolated score for match outcome animation', 0x00a00010n);
registerSearchData('GetMatchOutcomeText', '', 'API/ShooterGame/UI/Widgets/SShooterScoreboardWidget/GetMatchOutcomeText/index.html', 'get match outcome text', 0x00a00010n);
registerSearchData('GetMatchRestartText', '', 'API/ShooterGame/UI/Widgets/SShooterScoreboardWidget/GetMatchRestartText/index.html', 'Get text for match-restart notification.', 0x00a00010n);
registerSearchData('GetAttributeValue_Kills', '', 'API/ShooterGame/UI/Widgets/SShooterScoreboardWidget/GetAttributeValue_Kills/index.html', 'get attribute value for kills', 0x00a00010n);
registerSearchData('GetAttributeValue_Deaths', '', 'API/ShooterGame/UI/Widgets/SShooterScoreboardWidget/GetAttributeValue_Deaths/index.html', 'get attribute value for deaths', 0x00a00010n);
registerSearchData('GetAttributeValue_Score', '', 'API/ShooterGame/UI/Widgets/SShooterScoreboardWidget/GetAttributeValue_Score/index.html', 'get attribute value for score', 0x00a00010n);
registerSearchData('PlaySound', '', 'API/ShooterGame/UI/Widgets/SShooterScoreboardWidget/PlaySound/index.html', 'triggers a sound effect to play', 0x00a00010n);
registerSearchData('OnMouseOverPlayer', '', 'API/ShooterGame/UI/Widgets/SShooterScoreboardWidget/OnMouseOverPlayer/index.html', 'handle the mouse moving over scoreboard entry', 0x00200010n);
registerSearchData('OnSelectedPlayerPrev', '', 'API/ShooterGame/UI/Widgets/SShooterScoreboardWidget/OnSelectedPlayerPrev/index.html', 'called when the previous player wants to be selected', 0x00200010n);
registerSearchData('OnSelectedPlayerNext', '', 'API/ShooterGame/UI/Widgets/SShooterScoreboardWidget/OnSelectedPlayerNext/index.html', 'called when the next player wants to be selected', 0x00200010n);
registerSearchData('ResetSelectedPlayer', '', 'API/ShooterGame/UI/Widgets/SShooterScoreboardWidget/ResetSelectedPlayer/index.html', 'resets the selected player to be that of the local user', 0x00200010n);
registerSearchData('UpdateSelectedPlayer', '', 'API/ShooterGame/UI/Widgets/SShooterScoreboardWidget/UpdateSelectedPlayer/index.html', 'makes sure the selected player is valid', 0x00200010n);
registerSearchData('SetSelectedPlayerUs', '', 'API/ShooterGame/UI/Widgets/SShooterScoreboardWidget/SetSelectedPlayerUs/index.html', 'sets the currently selected player to be ourselves', 0x00200010n);
registerSearchData('IsSelectedPlayer', '', 'API/ShooterGame/UI/Widgets/SShooterScoreboardWidget/IsSelectedPlayer/index.html', 'checks to see if the specified player is the selected one', 0x00a00010n);
registerSearchData('IsPlayerSelectedAndValid', '', 'API/ShooterGame/UI/Widgets/SShooterScoreboardWidget/IsPlayerSelectedAndValid/index.html', 'is there a valid selected item', 0x00a00010n);
registerSearchData('GetProfileUIVisibility', '', 'API/ShooterGame/UI/Widgets/SShooterScoreboardWidget/GetProfileUIVisibility/index.html', 'check to see if we can open the profile ui', 0x00a00010n);
registerSearchData('ProfileUIOpened', '', 'API/ShooterGame/UI/Widgets/SShooterScoreboardWidget/ProfileUIOpened/index.html', 'profile open ui handler', 0x00a00010n);
registerSearchData('ScoreboardTint', '', 'API/ShooterGame/UI/Widgets/SShooterScoreboardWidget/ScoreboardTint/index.html', 'scoreboard tint color', 0x00200020n);
registerSearchData('ScoreBoxWidth', '', 'API/ShooterGame/UI/Widgets/SShooterScoreboardWidget/ScoreBoxWidth/index.html', 'width of scoreboard item', 0x00200020n);
registerSearchData('ScoreCountUpTime', '', 'API/ShooterGame/UI/Widgets/SShooterScoreboardWidget/ScoreCountUpTime/index.html', 'scoreboard count up time', 0x00200020n);
registerSearchData('ScoreboardStartTime', '', 'API/ShooterGame/UI/Widgets/SShooterScoreboardWidget/ScoreboardStartTime/index.html', 'when the scoreboard was brought up.', 0x00200020n);
registerSearchData('SelectedPlayer', '', 'API/ShooterGame/UI/Widgets/SShooterScoreboardWidget/SelectedPlayer/index.html', 'the player currently selected in the scoreboard', 0x00200020n);
registerSearchData('PlayerStateMaps', '', 'API/ShooterGame/UI/Widgets/SShooterScoreboardWidget/PlayerStateMaps/index.html', 'the Ranked PlayerState map...cleared every frame', 0x00200020n);
registerSearchData('LastTeamPlayerCount', '', 'API/ShooterGame/UI/Widgets/SShooterScoreboardWidget/LastTeamPlayerCount/index.html', 'player count in each team in the last tick', 0x00200020n);
registerSearchData('PlayersTalkingThisFrame', '', 'API/ShooterGame/UI/Widgets/SShooterScoreboardWidget/PlayersTalkingThisFrame/index.html', 'holds talking player data', 0x00200020n);
registerSearchData('ScoreboardData', '', 'API/ShooterGame/UI/Widgets/SShooterScoreboardWidget/ScoreboardData/index.html', 'holds player info rows', 0x00200020n);
registerSearchData('Columns', '', 'API/ShooterGame/UI/Widgets/SShooterScoreboardWidget/Columns/index.html', 'stat columns data', 0x00200020n);
registerSearchData('MatchState', '', 'API/ShooterGame/UI/Widgets/SShooterScoreboardWidget/MatchState/index.html', 'get state of current match', 0x00200020n);
registerSearchData('PCOwner', '', 'API/ShooterGame/UI/Widgets/SShooterScoreboardWidget/PCOwner/index.html', 'pointer to our parent HUD', 0x00200020n);
registerSearchData('ScoreboardStyle', '', 'API/ShooterGame/UI/Widgets/SShooterScoreboardWidget/ScoreboardStyle/index.html', 'style for the scoreboard', 0x00a00020n);
registerSearchData('UShooterEngine', '', 'API/ShooterGame/UShooterEngine/index.html', 'Copyright 1998-2019 Epic Games, Inc. All Rights Reserved.', 0x04000001n);
registerSearchData('Init', '', 'API/ShooterGame/UShooterEngine/Init/index.html', 'Hook up specific callbacks', 0x00140010n);
registerSearchData('HandleNetworkFailure', '', 'API/ShooterGame/UShooterEngine/HandleNetworkFailure/index.html', 'All regular engine handling, plus update ShooterKing state appropriately.', 0x00140010n);
registerSearchData('UShooterGameUserSettings', '', 'API/ShooterGame/UShooterGameUserSettings/index.html', 'Copyright 1998-2019 Epic Games, Inc. All Rights Reserved.', 0x04000001n);
registerSearchData('ApplySettings', '', 'API/ShooterGame/UShooterGameUserSettings/ApplySettings/index.html', 'Applies all current user settings to the game and saves to permanent storage (e.g. file), optionally checking for command line overrides.', 0x00140010n);
registerSearchData('GetGraphicsQuality', '', 'API/ShooterGame/UShooterGameUserSettings/GetGraphicsQuality/index.html', '', 0x00900010n);
registerSearchData('SetGraphicsQuality', '', 'API/ShooterGame/UShooterGameUserSettings/SetGraphicsQuality/index.html', '', 0x00100010n);
registerSearchData('IsLanMatch', '', 'API/ShooterGame/UShooterGameUserSettings/IsLanMatch/index.html', '', 0x00900010n);
registerSearchData('SetLanMatch', '', 'API/ShooterGame/UShooterGameUserSettings/SetLanMatch/index.html', '', 0x00100010n);
registerSearchData('IsDedicatedServer', '', 'API/ShooterGame/UShooterGameUserSettings/IsDedicatedServer/index.html', '', 0x00900010n);
registerSearchData('SetDedicatedServer', '', 'API/ShooterGame/UShooterGameUserSettings/SetDedicatedServer/index.html', '', 0x00100010n);
registerSearchData('SetToDefaults', '', 'API/ShooterGame/UShooterGameUserSettings/SetToDefaults/index.html', 'interface UGameUserSettings', 0x00140010n);
registerSearchData('GraphicsQuality', '', 'API/ShooterGame/UShooterGameUserSettings/GraphicsQuality/index.html', 'Graphics Quality 0 = Low 1 = High', 0x40400020n);
registerSearchData('bIsLanMatch', '', 'API/ShooterGame/UShooterGameUserSettings/bIsLanMatch/index.html', 'is lan match?', 0x40400020n);
registerSearchData('bIsDedicatedServer', '', 'API/ShooterGame/UShooterGameUserSettings/bIsDedicatedServer/index.html', 'is dedicated server?', 0x40400020n);
registerSearchData('FShooterGameLoadingScreenBrush', '', 'API/ShooterGame/FShooterGameLoadingScreenBrush/index.html', 'Copyright 1998-2019 Epic Games, Inc. All Rights Reserved.', 0x00000002n);
registerSearchData('FShooterGameLoadingScreenBrush', '', 'API/ShooterGame/FShooterGameLoadingScreenBrush/FShooterGameLoadingScreenBrush/index.html', '', 0x80100010n);
registerSearchData('AddReferencedObjects', '', 'API/ShooterGame/FShooterGameLoadingScreenBrush/AddReferencedObjects/index.html', '', 0x00140010n);
registerSearchData('SShooterLoadingScreen', '', 'API/ShooterGame/SShooterLoadingScreen/index.html', '', 0x00000001n);
registerSearchData('SLATE_BEGIN_ARGS', '', 'API/ShooterGame/SShooterLoadingScreen/SLATE_BEGIN_ARGS/index.html', '', 0x80100010n);
registerSearchData('Construct', '', 'API/ShooterGame/SShooterLoadingScreen/Construct/index.html', '', 0x80100010n);
registerSearchData('GetLoadIndicatorVisibility', '', 'API/ShooterGame/SShooterLoadingScreen/GetLoadIndicatorVisibility/index.html', '', 0x00c00010n);
registerSearchData('LoadingScreenBrush', '', 'API/ShooterGame/SShooterLoadingScreen/LoadingScreenBrush/index.html', 'loading screen image brush', 0x00400020n);
registerSearchData('UShooterGameViewportClient', '', 'API/ShooterGame/UShooterGameViewportClient/index.html', '', 0x04000001n);
registerSearchData('NotifyPlayerAdded', '', 'API/ShooterGame/UShooterGameViewportClient/NotifyPlayerAdded/index.html', 'start UGameViewportClient interface', 0x00100010n);
registerSearchData('AddViewportWidgetContent', '', 'API/ShooterGame/UShooterGameViewportClient/AddViewportWidgetContent/index.html', '', 0x00100010n);
registerSearchData('RemoveViewportWidgetContent', '', 'API/ShooterGame/UShooterGameViewportClient/RemoveViewportWidgetContent/index.html', '', 0x00100010n);
registerSearchData('ShowDialog', '', 'API/ShooterGame/UShooterGameViewportClient/ShowDialog/index.html', '', 0x00100010n);
registerSearchData('HideDialog', '', 'API/ShooterGame/UShooterGameViewportClient/HideDialog/index.html', '', 0x00100010n);
registerSearchData('ShowLoadingScreen', '', 'API/ShooterGame/UShooterGameViewportClient/ShowLoadingScreen/index.html', '', 0x00100010n);
registerSearchData('HideLoadingScreen', '', 'API/ShooterGame/UShooterGameViewportClient/HideLoadingScreen/index.html', '', 0x00100010n);
registerSearchData('IsShowingDialog', '', 'API/ShooterGame/UShooterGameViewportClient/IsShowingDialog/index.html', '', 0x00900010n);
registerSearchData('GetDialogType', '', 'API/ShooterGame/UShooterGameViewportClient/GetDialogType/index.html', '', 0x00900010n);
registerSearchData('GetDialogOwner', '', 'API/ShooterGame/UShooterGameViewportClient/GetDialogOwner/index.html', '', 0x00900010n);
registerSearchData('GetDialogWidget', '', 'API/ShooterGame/UShooterGameViewportClient/GetDialogWidget/index.html', '', 0x00100010n);
registerSearchData('Tick', '', 'API/ShooterGame/UShooterGameViewportClient/Tick/index.html', 'FTicker Funcs', 0x00140010n);
registerSearchData('BeginDestroy', '', 'API/ShooterGame/UShooterGameViewportClient/BeginDestroy/index.html', '', 0x00140010n);
registerSearchData('DetachViewportClient', '', 'API/ShooterGame/UShooterGameViewportClient/DetachViewportClient/index.html', '', 0x00140010n);
registerSearchData('ReleaseSlateResources', '', 'API/ShooterGame/UShooterGameViewportClient/ReleaseSlateResources/index.html', '', 0x00100010n);
registerSearchData('DrawTransition', '', 'API/ShooterGame/UShooterGameViewportClient/DrawTransition/index.html', '', 0x00140010n);
registerSearchData('HideExistingWidgets', '', 'API/ShooterGame/UShooterGameViewportClient/HideExistingWidgets/index.html', 'end UGameViewportClient interface', 0x00200010n);
registerSearchData('ShowExistingWidgets', '', 'API/ShooterGame/UShooterGameViewportClient/ShowExistingWidgets/index.html', '', 0x00200010n);
registerSearchData('ViewportContentStack', '', 'API/ShooterGame/UShooterGameViewportClient/ViewportContentStack/index.html', 'List of viewport content that the viewport is tracking', 0x00200020n);
registerSearchData('HiddenViewportContentStack', '', 'API/ShooterGame/UShooterGameViewportClient/HiddenViewportContentStack/index.html', '', 0x00200020n);
registerSearchData('OldFocusWidget', '', 'API/ShooterGame/UShooterGameViewportClient/OldFocusWidget/index.html', '', 0x00200020n);
registerSearchData('DialogWidget', '', 'API/ShooterGame/UShooterGameViewportClient/DialogWidget/index.html', 'Dialog widget to show temporary messages (\"Controller disconnected\", \"Parental Controls don\'t allow you to play online\", etc)', 0x00200020n);
registerSearchData('LoadingScreenWidget', '', 'API/ShooterGame/UShooterGameViewportClient/LoadingScreenWidget/index.html', '', 0x00200020n);
registerSearchData('AShooterTeamStart', '', 'API/ShooterGame/AShooterTeamStart/index.html', 'Copyright 1998-2019 Epic Games, Inc. All Rights Reserved.', 0x04000001n);
registerSearchData('SpawnTeam', '', 'API/ShooterGame/AShooterTeamStart/SpawnTeam/index.html', 'Which team can start at this point', 0x40100020n);
registerSearchData('bNotForPlayers', '', 'API/ShooterGame/AShooterTeamStart/bNotForPlayers/index.html', 'Whether players can start at this point', 0x40100020n);
registerSearchData('bNotForBots', '', 'API/ShooterGame/AShooterTeamStart/bNotForBots/index.html', 'Whether bots can start at this point', 0x40100020n);
registerSearchData('UBTDecorator_HasLoSTo', '', 'API/ShooterGame/Bots/UBTDecorator_HasLoSTo/index.html', 'Checks if the AI pawn has Line of sight to the specified Actor or Location(Vector).', 0x04000001n);
registerSearchData('CalculateRawConditionValue', '', 'API/ShooterGame/Bots/UBTDecorator_HasLoSTo/CalculateRawConditionValue/index.html', '', 0x00940010n);
registerSearchData('LOSTrace', '', 'API/ShooterGame/Bots/UBTDecorator_HasLoSTo/LOSTrace/index.html', '', 0x00c00010n);
registerSearchData('EnemyKey', '', 'API/ShooterGame/Bots/UBTDecorator_HasLoSTo/EnemyKey/index.html', '', 0x40200020n);
registerSearchData('UBTTask_FindPickup', '', 'API/ShooterGame/Bots/UBTTask_FindPickup/index.html', 'Bot AI Task that attempts to locate a pickup ', 0x04000001n);
registerSearchData('ExecuteTask', '', 'API/ShooterGame/Bots/UBTTask_FindPickup/ExecuteTask/index.html', '', 0x00140010n);
registerSearchData('UBTTask_FindPointNearEnemy', '', 'API/ShooterGame/Bots/UBTTask_FindPointNearEnemy/index.html', 'Bot AI task that tries to find a location near the current enemy', 0x04000001n);
registerSearchData('ExecuteTask', '', 'API/ShooterGame/Bots/UBTTask_FindPointNearEnemy/ExecuteTask/index.html', '', 0x00140010n);
registerSearchData('AShooterAIController', '', 'API/ShooterGame/Bots/AShooterAIController/index.html', 'Copyright 1998-2019 Epic Games, Inc. All Rights Reserved.', 0x04000001n);
registerSearchData('GameHasEnded', '', 'API/ShooterGame/Bots/AShooterAIController/GameHasEnded/index.html', 'Begin AController interface', 0x00140010n);
registerSearchData('BeginInactiveState', '', 'API/ShooterGame/Bots/AShooterAIController/BeginInactiveState/index.html', '', 0x00140010n);
registerSearchData('OnPossess', '', 'API/ShooterGame/Bots/AShooterAIController/OnPossess/index.html', '', 0x00240010n);
registerSearchData('OnUnPossess', '', 'API/ShooterGame/Bots/AShooterAIController/OnUnPossess/index.html', '', 0x00240010n);
registerSearchData('Respawn', '', 'API/ShooterGame/Bots/AShooterAIController/Respawn/index.html', 'End APlayerController interface', 0x00100010n);
registerSearchData('CheckAmmo', '', 'API/ShooterGame/Bots/AShooterAIController/CheckAmmo/index.html', '', 0x00100010n);
registerSearchData('SetEnemy', '', 'API/ShooterGame/Bots/AShooterAIController/SetEnemy/index.html', '', 0x00100010n);
registerSearchData('ShootEnemy', '', 'API/ShooterGame/Bots/AShooterAIController/ShootEnemy/index.html', 'If there is line of sight to current enemy, start firing at them', 0x20100010n);
registerSearchData('ShootEnemy', 'Shoot Enemy', 'BlueprintAPI/Behavior/ShootEnemy/index.html', 'If there is line of sight to current enemy, start firing at them', 0x20100040n);
registerSearchData('FindClosestEnemy', '', 'API/ShooterGame/Bots/AShooterAIController/FindClosestEnemy/index.html', 'Finds the closest enemy and sets them as current target', 0x20100010n);
registerSearchData('FindClosestEnemy', 'Find Closest Enemy', 'BlueprintAPI/Behavior/FindClosestEnemy/index.html', 'Finds the closest enemy and sets them as current target', 0x20100040n);
registerSearchData('FindClosestEnemyWithLOS', '', 'API/ShooterGame/Bots/AShooterAIController/FindClosestEnemyWithLOS/index.html', '', 0x20100010n);
registerSearchData('FindClosestEnemyWithLOS', 'Find Closest Enemy With LOS', 'BlueprintAPI/Behavior/FindClosestEnemyWithLOS/index.html', '', 0x20100040n);
registerSearchData('HasWeaponLOSToEnemy', '', 'API/ShooterGame/Bots/AShooterAIController/HasWeaponLOSToEnemy/index.html', '', 0x00900010n);
registerSearchData('UpdateControlRotation', '', 'API/ShooterGame/Bots/AShooterAIController/UpdateControlRotation/index.html', 'Update direction AI is looking based on FocalPoint', 0x00140010n);
registerSearchData('LOSTrace', '', 'API/ShooterGame/Bots/AShooterAIController/LOSTrace/index.html', 'Check of we have LOS to a character', 0x00a00010n);
registerSearchData('GetBlackboardComp', '', 'API/ShooterGame/Bots/AShooterAIController/GetBlackboardComp/index.html', 'Returns BlackboardComp subobject *', 0x00900010n);
registerSearchData('GetBehaviorComp', '', 'API/ShooterGame/Bots/AShooterAIController/GetBehaviorComp/index.html', 'Returns BehaviorComp subobject *', 0x00900010n);
registerSearchData('BlackboardComp', '', 'API/ShooterGame/Bots/AShooterAIController/BlackboardComp/index.html', '', 0x40400020n);
registerSearchData('BehaviorComp', '', 'API/ShooterGame/Bots/AShooterAIController/BehaviorComp/index.html', 'Cached BT component', 0x40400020n);
registerSearchData('EnemyKeyID', '', 'API/ShooterGame/Bots/AShooterAIController/EnemyKeyID/index.html', '', 0x00200020n);
registerSearchData('NeedAmmoKeyID', '', 'API/ShooterGame/Bots/AShooterAIController/NeedAmmoKeyID/index.html', '', 0x00200020n);
registerSearchData('TimerHandle_Respawn', '', 'API/ShooterGame/Bots/AShooterAIController/TimerHandle_Respawn/index.html', 'Handle for efficient management of Respawn timer', 0x00200020n);
registerSearchData('AShooterBot', '', 'API/ShooterGame/Bots/AShooterBot/index.html', 'Copyright 1998-2019 Epic Games, Inc. All Rights Reserved.', 0x04000001n);
registerSearchData('IsFirstPerson', '', 'API/ShooterGame/Bots/AShooterBot/IsFirstPerson/index.html', '', 0x00940010n);
registerSearchData('FaceRotation', '', 'API/ShooterGame/Bots/AShooterBot/FaceRotation/index.html', '', 0x00140010n);
registerSearchData('BotBehavior', '', 'API/ShooterGame/Bots/AShooterBot/BotBehavior/index.html', '', 0x40100020n);
registerSearchData('AShooterExplosionEffect', '', 'API/ShooterGame/Effects/AShooterExplosionEffect/index.html', '%UCLASS%(Abstract, Blueprintable)', 0x00000001n);
registerSearchData('ExplosionFX', '', 'API/ShooterGame/Effects/AShooterExplosionEffect/ExplosionFX/index.html', 'explosion FX', 0x00100010n);
registerSearchData('ExplosionLight', '', 'API/ShooterGame/Effects/AShooterExplosionEffect/ExplosionLight/index.html', 'explosion light', 0x00400010n);
registerSearchData('ExplosionLightFadeOut', '', 'API/ShooterGame/Effects/AShooterExplosionEffect/ExplosionLightFadeOut/index.html', 'how long keep explosion light on?', 0x00100010n);
registerSearchData('ExplosionSound', '', 'API/ShooterGame/Effects/AShooterExplosionEffect/ExplosionSound/index.html', 'explosion sound', 0x00100010n);
registerSearchData('Decal', '', 'API/ShooterGame/Effects/AShooterExplosionEffect/Decal/index.html', 'explosion decals', 0x00100010n);
registerSearchData('SurfaceHit', '', 'API/ShooterGame/Effects/AShooterExplosionEffect/SurfaceHit/index.html', 'surface data for spawning', 0x00100010n);
registerSearchData('Tick', '', 'API/ShooterGame/Effects/AShooterExplosionEffect/Tick/index.html', 'update fading light', 0x00140010n);
registerSearchData('BeginPlay', '', 'API/ShooterGame/Effects/AShooterExplosionEffect/BeginPlay/index.html', 'spawn explosion', 0x00240010n);
registerSearchData('GetExplosionLight', '', 'API/ShooterGame/Effects/AShooterExplosionEffect/GetExplosionLight/index.html', 'Returns ExplosionLight subobject *', 0x00900010n);
registerSearchData('ExplosionLightComponentName', '', 'API/ShooterGame/Effects/AShooterExplosionEffect/ExplosionLightComponentName/index.html', 'Point light component name', 0x00400020n);
registerSearchData('AShooterImpactEffect', '', 'API/ShooterGame/Effects/AShooterImpactEffect/index.html', '%UCLASS%(Abstract, Blueprintable)', 0x00000001n);
registerSearchData('DefaultFX', '', 'API/ShooterGame/Effects/AShooterImpactEffect/DefaultFX/index.html', 'default impact FX used when material specific override doesn\'t exist', 0x00100010n);
registerSearchData('ConcreteFX', '', 'API/ShooterGame/Effects/AShooterImpactEffect/ConcreteFX/index.html', 'impact FX on concrete', 0x00100010n);
registerSearchData('DirtFX', '', 'API/ShooterGame/Effects/AShooterImpactEffect/DirtFX/index.html', 'impact FX on dirt', 0x00100010n);
registerSearchData('WaterFX', '', 'API/ShooterGame/Effects/AShooterImpactEffect/WaterFX/index.html', 'impact FX on water', 0x00100010n);
registerSearchData('MetalFX', '', 'API/ShooterGame/Effects/AShooterImpactEffect/MetalFX/index.html', 'impact FX on metal', 0x00100010n);
registerSearchData('WoodFX', '', 'API/ShooterGame/Effects/AShooterImpactEffect/WoodFX/index.html', 'impact FX on wood', 0x00100010n);
registerSearchData('GlassFX', '', 'API/ShooterGame/Effects/AShooterImpactEffect/GlassFX/index.html', 'impact FX on glass', 0x00100010n);
registerSearchData('GrassFX', '', 'API/ShooterGame/Effects/AShooterImpactEffect/GrassFX/index.html', 'impact FX on grass', 0x00100010n);
registerSearchData('FleshFX', '', 'API/ShooterGame/Effects/AShooterImpactEffect/FleshFX/index.html', 'impact FX on flesh', 0x00100010n);
registerSearchData('DefaultSound', '', 'API/ShooterGame/Effects/AShooterImpactEffect/DefaultSound/index.html', 'default impact sound used when material specific override doesn\'t exist', 0x00100010n);
registerSearchData('ConcreteSound', '', 'API/ShooterGame/Effects/AShooterImpactEffect/ConcreteSound/index.html', 'impact FX on concrete', 0x00100010n);
registerSearchData('DirtSound', '', 'API/ShooterGame/Effects/AShooterImpactEffect/DirtSound/index.html', 'impact FX on dirt', 0x00100010n);
registerSearchData('WaterSound', '', 'API/ShooterGame/Effects/AShooterImpactEffect/WaterSound/index.html', 'impact FX on water', 0x00100010n);
registerSearchData('MetalSound', '', 'API/ShooterGame/Effects/AShooterImpactEffect/MetalSound/index.html', 'impact FX on metal', 0x00100010n);
registerSearchData('WoodSound', '', 'API/ShooterGame/Effects/AShooterImpactEffect/WoodSound/index.html', 'impact FX on wood', 0x00100010n);
registerSearchData('GlassSound', '', 'API/ShooterGame/Effects/AShooterImpactEffect/GlassSound/index.html', 'impact FX on glass', 0x00100010n);
registerSearchData('GrassSound', '', 'API/ShooterGame/Effects/AShooterImpactEffect/GrassSound/index.html', 'impact FX on grass', 0x00100010n);
registerSearchData('FleshSound', '', 'API/ShooterGame/Effects/AShooterImpactEffect/FleshSound/index.html', 'impact FX on flesh', 0x00100010n);
registerSearchData('DefaultDecal', '', 'API/ShooterGame/Effects/AShooterImpactEffect/DefaultDecal/index.html', 'default decal when material specific override doesn\'t exist', 0x00100010n);
registerSearchData('SurfaceHit', '', 'API/ShooterGame/Effects/AShooterImpactEffect/SurfaceHit/index.html', 'surface data for spawning', 0x00100010n);
registerSearchData('PostInitializeComponents', '', 'API/ShooterGame/Effects/AShooterImpactEffect/PostInitializeComponents/index.html', 'spawn effect', 0x00140010n);
registerSearchData('GetImpactFX', '', 'API/ShooterGame/Effects/AShooterImpactEffect/GetImpactFX/index.html', 'get FX for material type', 0x00a00010n);
registerSearchData('GetImpactSound', '', 'API/ShooterGame/Effects/AShooterImpactEffect/GetImpactSound/index.html', 'get sound for material type', 0x00a00010n);
registerSearchData('FShooterGameSessionParams', '', 'API/ShooterGame/Online/FShooterGameSessionParams/index.html', 'Copyright 1998-2019 Epic Games, Inc. All Rights Reserved.', 0x00000002n);
registerSearchData('FShooterGameSessionParams', '', 'API/ShooterGame/Online/FShooterGameSessionParams/FShooterGameSessionParams/index.html', '', 0x80100010n);
registerSearchData('SessionName', '', 'API/ShooterGame/Online/FShooterGameSessionParams/SessionName/index.html', 'Name of session settings are stored with', 0x00100020n);
registerSearchData('bIsLAN', '', 'API/ShooterGame/Online/FShooterGameSessionParams/bIsLAN/index.html', 'LAN Match', 0x00100020n);
registerSearchData('bIsPresence', '', 'API/ShooterGame/Online/FShooterGameSessionParams/bIsPresence/index.html', 'Presence enabled session', 0x00100020n);
registerSearchData('UserId', '', 'API/ShooterGame/Online/FShooterGameSessionParams/UserId/index.html', 'Id of player initiating lobby', 0x00100020n);
registerSearchData('BestSessionIdx', '', 'API/ShooterGame/Online/FShooterGameSessionParams/BestSessionIdx/index.html', 'Current search result choice to join', 0x00100020n);
registerSearchData('FOnCreatePresenceSessionComplete', '', 'API/ShooterGame/Online/FOnCreatePresenceSessionComplete/index.html', 'bWasSuccessful', 0x00000001n);
registerSearchData('FOnJoinSessionComplete', '', 'API/ShooterGame/Online/FOnJoinSessionComplete/index.html', 'Result', 0x00000001n);
registerSearchData('FOnFindSessionsComplete', '', 'API/ShooterGame/Online/FOnFindSessionsComplete/index.html', 'bWasSuccessful', 0x00000001n);
registerSearchData('AShooterGameSession', '', 'API/ShooterGame/Online/AShooterGameSession/index.html', '', 0x04000001n);
registerSearchData('OnCreateSessionComplete', '', 'API/ShooterGame/Online/AShooterGameSession/OnCreateSessionComplete/index.html', 'Delegate fired when a session create request has completed ', 0x00240010n);
registerSearchData('OnStartOnlineGameComplete', '', 'API/ShooterGame/Online/AShooterGameSession/OnStartOnlineGameComplete/index.html', 'Delegate fired when a session start request has completed ', 0x00200010n);
registerSearchData('OnFindSessionsComplete', '', 'API/ShooterGame/Online/AShooterGameSession/OnFindSessionsComplete/index.html', 'Delegate fired when a session search query has completed ', 0x00200010n);
registerSearchData('OnJoinSessionComplete', '', 'API/ShooterGame/Online/AShooterGameSession/OnJoinSessionComplete/index.html', 'Delegate fired when a session join request has completed ', 0x00200010n);
registerSearchData('OnDestroySessionComplete', '', 'API/ShooterGame/Online/AShooterGameSession/OnDestroySessionComplete/index.html', 'Delegate fired when a destroying an online session has completed ', 0x00240010n);
registerSearchData('ResetBestSessionVars', '', 'API/ShooterGame/Online/AShooterGameSession/ResetBestSessionVars/index.html', 'Reset the variables the are keeping track of session join attempts', 0x00200010n);
registerSearchData('ChooseBestSession', '', 'API/ShooterGame/Online/AShooterGameSession/ChooseBestSession/index.html', 'Choose the best session from a list of search results based on game criteria', 0x00200010n);
registerSearchData('StartMatchmaking', '', 'API/ShooterGame/Online/AShooterGameSession/StartMatchmaking/index.html', 'Entry point for matchmaking after search results are returned', 0x00200010n);
registerSearchData('ContinueMatchmaking', '', 'API/ShooterGame/Online/AShooterGameSession/ContinueMatchmaking/index.html', 'Return point after each attempt to join a search result', 0x00200010n);
registerSearchData('OnNoMatchesAvailable', '', 'API/ShooterGame/Online/AShooterGameSession/OnNoMatchesAvailable/index.html', 'Delegate triggered when no more search results are available', 0x00200010n);
registerSearchData('RegisterServer', '', 'API/ShooterGame/Online/AShooterGameSession/RegisterServer/index.html', 'Called when this instance is starting up as a dedicated server', 0x00240010n);
registerSearchData('HostSession', '', 'API/ShooterGame/Online/AShooterGameSession/HostSession/index.html', 'Host a new online session ', 0x00100010n);
registerSearchData('HostSession', '', 'API/ShooterGame/Online/AShooterGameSession/HostSession-2-0/index.html', 'Host a new online session with specified settings ', 0x00100010n);
registerSearchData('FindSessions', '', 'API/ShooterGame/Online/AShooterGameSession/FindSessions/index.html', 'Find an online session ', 0x00100010n);
registerSearchData('JoinSession', '', 'API/ShooterGame/Online/AShooterGameSession/JoinSession/index.html', 'Joins one of the session in search results ', 0x00100010n);
registerSearchData('JoinSession', '', 'API/ShooterGame/Online/AShooterGameSession/JoinSession-2-1/index.html', 'Joins a session via a search result ', 0x00100010n);
registerSearchData('IsBusy', '', 'API/ShooterGame/Online/AShooterGameSession/IsBusy/index.html', '', 0x00900010n);
registerSearchData('GetSearchResultStatus', '', 'API/ShooterGame/Online/AShooterGameSession/GetSearchResultStatus/index.html', 'Get the search results found and the current search result being probed ', 0x00100010n);
registerSearchData('GetSearchResults', '', 'API/ShooterGame/Online/AShooterGameSession/GetSearchResults/index.html', 'Get the search results. ', 0x00900010n);
registerSearchData('OnCreatePresenceSessionComplete', '', 'API/ShooterGame/Online/AShooterGameSession/OnCreatePresenceSessionComplete/index.html', '', 0x00100010n);
registerSearchData('OnJoinSessionComplete', '', 'API/ShooterGame/Online/AShooterGameSession/OnJoinSessionComplete-2-2/index.html', '', 0x00100010n);
registerSearchData('OnFindSessionsComplete', '', 'API/ShooterGame/Online/AShooterGameSession/OnFindSessionsComplete-2-3/index.html', '', 0x00100010n);
registerSearchData('HandleMatchHasStarted', '', 'API/ShooterGame/Online/AShooterGameSession/HandleMatchHasStarted/index.html', 'Handle starting the match', 0x00140010n);
registerSearchData('HandleMatchHasEnded', '', 'API/ShooterGame/Online/AShooterGameSession/HandleMatchHasEnded/index.html', 'Handles when the match has ended', 0x00140010n);
registerSearchData('TravelToSession', '', 'API/ShooterGame/Online/AShooterGameSession/TravelToSession/index.html', 'Travel to a session URL (as client) for a given session ', 0x00100010n);
registerSearchData('OnCreateSessionCompleteDelegate', '', 'API/ShooterGame/Online/AShooterGameSession/OnCreateSessionCompleteDelegate/index.html', 'Delegate for creating a new session', 0x00200020n);
registerSearchData('OnStartSessionCompleteDelegate', '', 'API/ShooterGame/Online/AShooterGameSession/OnStartSessionCompleteDelegate/index.html', 'Delegate after starting a session', 0x00200020n);
registerSearchData('OnDestroySessionCompleteDelegate', '', 'API/ShooterGame/Online/AShooterGameSession/OnDestroySessionCompleteDelegate/index.html', 'Delegate for destroying a session', 0x00200020n);
registerSearchData('OnFindSessionsCompleteDelegate', '', 'API/ShooterGame/Online/AShooterGameSession/OnFindSessionsCompleteDelegate/index.html', 'Delegate for searching for sessions', 0x00200020n);
registerSearchData('OnJoinSessionCompleteDelegate', '', 'API/ShooterGame/Online/AShooterGameSession/OnJoinSessionCompleteDelegate/index.html', 'Delegate after joining a session', 0x00200020n);
registerSearchData('CurrentSessionParams', '', 'API/ShooterGame/Online/AShooterGameSession/CurrentSessionParams/index.html', 'Transient properties of a session during game creation/matchmaking', 0x00200020n);
registerSearchData('HostSettings', '', 'API/ShooterGame/Online/AShooterGameSession/HostSettings/index.html', 'Current host settings', 0x00200020n);
registerSearchData('SearchSettings', '', 'API/ShooterGame/Online/AShooterGameSession/SearchSettings/index.html', 'Current search settings', 0x00200020n);
registerSearchData('', '', 'API/ShooterGame/Online/AShooterGameSession//index.html', '', 0x00400020n);
registerSearchData('CreatePresenceSessionCompleteEvent', '', 'API/ShooterGame/Online/AShooterGameSession/CreatePresenceSessionCompleteEvent/index.html', '', 0x00400020n);
registerSearchData('', '', 'API/ShooterGame/Online/AShooterGameSession//index.html', '', 0x00400020n);
registerSearchData('JoinSessionCompleteEvent', '', 'API/ShooterGame/Online/AShooterGameSession/JoinSessionCompleteEvent/index.html', '', 0x00400020n);
registerSearchData('', '', 'API/ShooterGame/Online/AShooterGameSession//index.html', '', 0x00400020n);
registerSearchData('FindSessionsCompleteEvent', '', 'API/ShooterGame/Online/AShooterGameSession/FindSessionsCompleteEvent/index.html', '', 0x00400020n);
registerSearchData('DEFAULT_NUM_PLAYERS', '', 'API/ShooterGame/Online/AShooterGameSession/DEFAULT_NUM_PLAYERS/index.html', 'Default number of players allowed in a game', 0x00920020n);
registerSearchData('OnStartSessionCompleteDelegateHandle', '', 'API/ShooterGame/Online/AShooterGameSession/OnStartSessionCompleteDelegateHandle/index.html', 'Handles to various registered delegates', 0x00100020n);
registerSearchData('OnCreateSessionCompleteDelegateHandle', '', 'API/ShooterGame/Online/AShooterGameSession/OnCreateSessionCompleteDelegateHandle/index.html', '', 0x00100020n);
registerSearchData('OnDestroySessionCompleteDelegateHandle', '', 'API/ShooterGame/Online/AShooterGameSession/OnDestroySessionCompleteDelegateHandle/index.html', '', 0x00100020n);
registerSearchData('OnFindSessionsCompleteDelegateHandle', '', 'API/ShooterGame/Online/AShooterGameSession/OnFindSessionsCompleteDelegateHandle/index.html', '', 0x00100020n);
registerSearchData('OnJoinSessionCompleteDelegateHandle', '', 'API/ShooterGame/Online/AShooterGameSession/OnJoinSessionCompleteDelegateHandle/index.html', '', 0x00100020n);
registerSearchData('AShooterGame_FreeForAll', '', 'API/ShooterGame/Online/AShooterGame_FreeForAll/index.html', 'Copyright 1998-2019 Epic Games, Inc. All Rights Reserved.', 0x04000001n);
registerSearchData('DetermineMatchWinner', '', 'API/ShooterGame/Online/AShooterGame_FreeForAll/DetermineMatchWinner/index.html', 'check who won', 0x00240010n);
registerSearchData('IsWinner', '', 'API/ShooterGame/Online/AShooterGame_FreeForAll/IsWinner/index.html', 'check if PlayerState is a winner', 0x00a40010n);
registerSearchData('WinnerPlayerState', '', 'API/ShooterGame/Online/AShooterGame_FreeForAll/WinnerPlayerState/index.html', 'best player', 0x40200020n);
registerSearchData('AShooterGame_Menu', '', 'API/ShooterGame/Online/AShooterGame_Menu/index.html', 'Copyright 1998-2019 Epic Games, Inc. All Rights Reserved.', 0x04000001n);
registerSearchData('RestartPlayer', '', 'API/ShooterGame/Online/AShooterGame_Menu/RestartPlayer/index.html', 'skip it, menu doesn\'t require player start or pawn', 0x00140010n);
registerSearchData('GetGameSessionClass', '', 'API/ShooterGame/Online/AShooterGame_Menu/GetGameSessionClass/index.html', 'Returns game session class to use', 0x00940010n);
registerSearchData('BeginSession', '', 'API/ShooterGame/Online/AShooterGame_Menu/BeginSession/index.html', 'Perform some final tasks before hosting/joining a session. Remove menus, set king state etc', 0x00200010n);
registerSearchData('ShowLoadingScreen', '', 'API/ShooterGame/Online/AShooterGame_Menu/ShowLoadingScreen/index.html', 'Display a loading screen', 0x00200010n);
registerSearchData('AShooterGame_TeamDeathMatch', '', 'API/ShooterGame/Online/AShooterGame_TeamDeathMatch/index.html', 'Copyright 1998-2019 Epic Games, Inc. All Rights Reserved.', 0x04000001n);
registerSearchData('PostLogin', '', 'API/ShooterGame/Online/AShooterGame_TeamDeathMatch/PostLogin/index.html', 'setup team changes at player login', 0x00100010n);
registerSearchData('InitGameState', '', 'API/ShooterGame/Online/AShooterGame_TeamDeathMatch/InitGameState/index.html', 'initialize replicated game data', 0x00140010n);
registerSearchData('CanDealDamage', '', 'API/ShooterGame/Online/AShooterGame_TeamDeathMatch/CanDealDamage/index.html', 'can players damage each other?', 0x00940010n);
registerSearchData('ChooseTeam', '', 'API/ShooterGame/Online/AShooterGame_TeamDeathMatch/ChooseTeam/index.html', 'pick team with least players in or random when it\'s equal', 0x00a00010n);
registerSearchData('DetermineMatchWinner', '', 'API/ShooterGame/Online/AShooterGame_TeamDeathMatch/DetermineMatchWinner/index.html', 'check who won', 0x00240010n);
registerSearchData('IsWinner', '', 'API/ShooterGame/Online/AShooterGame_TeamDeathMatch/IsWinner/index.html', 'check if PlayerState is a winner', 0x00a40010n);
registerSearchData('IsSpawnpointAllowed', '', 'API/ShooterGame/Online/AShooterGame_TeamDeathMatch/IsSpawnpointAllowed/index.html', 'check team constraints', 0x00a40010n);
registerSearchData('InitBot', '', 'API/ShooterGame/Online/AShooterGame_TeamDeathMatch/InitBot/index.html', 'initialization for bot after spawning', 0x00240010n);
registerSearchData('NumTeams', '', 'API/ShooterGame/Online/AShooterGame_TeamDeathMatch/NumTeams/index.html', 'number of teams', 0x00200020n);
registerSearchData('WinnerTeam', '', 'API/ShooterGame/Online/AShooterGame_TeamDeathMatch/WinnerTeam/index.html', 'best team', 0x00200020n);
registerSearchData('UShooterOnlineSessionClient', '', 'API/ShooterGame/Online/UShooterOnlineSessionClient/index.html', 'Copyright 1998-2019 Epic Games, Inc. All Rights Reserved.', 0x04000001n);
registerSearchData('UShooterOnlineSessionClient', '', 'API/ShooterGame/Online/UShooterOnlineSessionClient/UShooterOnlineSessionClient/index.html', 'Ctor', 0x80100010n);
registerSearchData('OnSessionUserInviteAccepted', '', 'API/ShooterGame/Online/UShooterOnlineSessionClient/OnSessionUserInviteAccepted/index.html', '', 0x00140010n);
registerSearchData('OnPlayTogetherEventReceived', '', 'API/ShooterGame/Online/UShooterOnlineSessionClient/OnPlayTogetherEventReceived/index.html', '', 0x00140010n);
registerSearchData('AShooterPlayerState', '', 'API/ShooterGame/Online/AShooterPlayerState/index.html', 'Copyright 1998-2019 Epic Games, Inc. All Rights Reserved.', 0x04000001n);
registerSearchData('Reset', '', 'API/ShooterGame/Online/AShooterPlayerState/Reset/index.html', 'clear scores', 0x00140010n);
registerSearchData('ClientInitialize', '', 'API/ShooterGame/Online/AShooterPlayerState/ClientInitialize/index.html', 'Set the team ', 0x00140010n);
registerSearchData('UnregisterPlayerWithSession', '', 'API/ShooterGame/Online/AShooterPlayerState/UnregisterPlayerWithSession/index.html', '', 0x00140010n);
registerSearchData('SetTeamNum', '', 'API/ShooterGame/Online/AShooterPlayerState/SetTeamNum/index.html', 'Set new team and update pawn. Also updates player character team colors. ', 0x00100010n);
registerSearchData('ScoreKill', '', 'API/ShooterGame/Online/AShooterPlayerState/ScoreKill/index.html', 'player killed someone', 0x00100010n);
registerSearchData('ScoreDeath', '', 'API/ShooterGame/Online/AShooterPlayerState/ScoreDeath/index.html', 'player died', 0x00100010n);
registerSearchData('GetTeamNum', '', 'API/ShooterGame/Online/AShooterPlayerState/GetTeamNum/index.html', 'get current team', 0x00900010n);
registerSearchData('GetKills', '', 'API/ShooterGame/Online/AShooterPlayerState/GetKills/index.html', 'get number of kills', 0x00900010n);
registerSearchData('GetDeaths', '', 'API/ShooterGame/Online/AShooterPlayerState/GetDeaths/index.html', 'get number of deaths', 0x00900010n);
registerSearchData('GetScore', '', 'API/ShooterGame/Online/AShooterPlayerState/GetScore/index.html', 'get number of points', 0x00900010n);
registerSearchData('GetNumBulletsFired', '', 'API/ShooterGame/Online/AShooterPlayerState/GetNumBulletsFired/index.html', 'get number of bullets fired this match', 0x00900010n);
registerSearchData('GetNumRocketsFired', '', 'API/ShooterGame/Online/AShooterPlayerState/GetNumRocketsFired/index.html', 'get number of rockets fired this match', 0x00900010n);
registerSearchData('IsQuitter', '', 'API/ShooterGame/Online/AShooterPlayerState/IsQuitter/index.html', 'get whether the player quit the match', 0x00900010n);
registerSearchData('GetShortPlayerName', '', 'API/ShooterGame/Online/AShooterPlayerState/GetShortPlayerName/index.html', 'gets truncated player name to fit in death log and scoreboards', 0x00900010n);
registerSearchData('InformAboutKill', '', 'API/ShooterGame/Online/AShooterPlayerState/InformAboutKill/index.html', 'Sends kill (excluding self) to clients', 0x20100010n);
registerSearchData('BroadcastDeath', '', 'API/ShooterGame/Online/AShooterPlayerState/BroadcastDeath/index.html', 'broadcast death to local clients', 0x20100010n);
registerSearchData('OnRep_TeamColor', '', 'API/ShooterGame/Online/AShooterPlayerState/OnRep_TeamColor/index.html', 'replicate team colors. Updated the players mesh colors appropriately', 0x20100010n);
registerSearchData('AddBulletsFired', '', 'API/ShooterGame/Online/AShooterPlayerState/AddBulletsFired/index.html', 'We don\'t need stats about amount of ammo fired to be server authenticated, so just increment these with local functions', 0x00100010n);
registerSearchData('AddRocketsFired', '', 'API/ShooterGame/Online/AShooterPlayerState/AddRocketsFired/index.html', '', 0x00100010n);
registerSearchData('SetQuitter', '', 'API/ShooterGame/Online/AShooterPlayerState/SetQuitter/index.html', 'Set whether the player is a quitter', 0x00100010n);
registerSearchData('CopyProperties', '', 'API/ShooterGame/Online/AShooterPlayerState/CopyProperties/index.html', '', 0x00140010n);
registerSearchData('UpdateTeamColors', '', 'API/ShooterGame/Online/AShooterPlayerState/UpdateTeamColors/index.html', 'Set the mesh colors based on the current teamnum variable', 0x00200010n);
registerSearchData('ScorePoints', '', 'API/ShooterGame/Online/AShooterPlayerState/ScorePoints/index.html', 'helper for scoring points', 0x00200010n);
registerSearchData('TeamNumber', '', 'API/ShooterGame/Online/AShooterPlayerState/TeamNumber/index.html', 'team number', 0x40200020n);
registerSearchData('NumKills', '', 'API/ShooterGame/Online/AShooterPlayerState/NumKills/index.html', 'number of kills', 0x40200020n);
registerSearchData('NumDeaths', '', 'API/ShooterGame/Online/AShooterPlayerState/NumDeaths/index.html', 'number of deaths', 0x40200020n);
registerSearchData('NumBulletsFired', '', 'API/ShooterGame/Online/AShooterPlayerState/NumBulletsFired/index.html', 'number of bullets fired this match', 0x40200020n);
registerSearchData('NumRocketsFired', '', 'API/ShooterGame/Online/AShooterPlayerState/NumRocketsFired/index.html', 'number of rockets fired this match', 0x40200020n);
registerSearchData('bQuitter', '', 'API/ShooterGame/Online/AShooterPlayerState/bQuitter/index.html', 'whether the user quit the match', 0x40200020n);
registerSearchData('AShooterPickup', '', 'API/ShooterGame/Pickups/AShooterPickup/index.html', 'Base class for pickup objects that can be placed in the world', 0x04000001n);
registerSearchData('NotifyActorBeginOverlap', '', 'API/ShooterGame/Pickups/AShooterPickup/NotifyActorBeginOverlap/index.html', 'pickup on touch', 0x00140010n);
registerSearchData('CanBePickedUp', '', 'API/ShooterGame/Pickups/AShooterPickup/CanBePickedUp/index.html', 'check if pawn can use this pickup', 0x00940010n);
registerSearchData('BeginPlay', '', 'API/ShooterGame/Pickups/AShooterPickup/BeginPlay/index.html', 'initial setup', 0x00240010n);
registerSearchData('OnRep_IsActive', '', 'API/ShooterGame/Pickups/AShooterPickup/OnRep_IsActive/index.html', '', 0x20200010n);
registerSearchData('GivePickupTo', '', 'API/ShooterGame/Pickups/AShooterPickup/GivePickupTo/index.html', 'give pickup', 0x00240010n);
registerSearchData('PickupOnTouch', '', 'API/ShooterGame/Pickups/AShooterPickup/PickupOnTouch/index.html', 'handle touches', 0x00200010n);
registerSearchData('RespawnPickup', '', 'API/ShooterGame/Pickups/AShooterPickup/RespawnPickup/index.html', 'show and enable pickup', 0x00240010n);
registerSearchData('OnPickedUp', '', 'API/ShooterGame/Pickups/AShooterPickup/OnPickedUp/index.html', 'show effects when pickup disappears', 0x00240010n);
registerSearchData('OnRespawned', '', 'API/ShooterGame/Pickups/AShooterPickup/OnRespawned/index.html', 'show effects when pickup appears', 0x00240010n);
registerSearchData('OnPickedUpEvent', '', 'API/ShooterGame/Pickups/AShooterPickup/OnPickedUpEvent/index.html', 'blueprint event: pickup disappears', 0x20200010n);
registerSearchData('OnRespawnEvent', '', 'API/ShooterGame/Pickups/AShooterPickup/OnRespawnEvent/index.html', 'blueprint event: pickup appears', 0x20200010n);
registerSearchData('GetPickupPSC', '', 'API/ShooterGame/Pickups/AShooterPickup/GetPickupPSC/index.html', 'Returns PickupPSC subobject *', 0x00a00010n);
registerSearchData('PickupPSC', '', 'API/ShooterGame/Pickups/AShooterPickup/PickupPSC/index.html', 'FX component', 0x40400020n);
registerSearchData('ActiveFX', '', 'API/ShooterGame/Pickups/AShooterPickup/ActiveFX/index.html', 'FX of active pickup', 0x40200020n);
registerSearchData('RespawningFX', '', 'API/ShooterGame/Pickups/AShooterPickup/RespawningFX/index.html', 'FX of pickup on respawn timer', 0x40200020n);
registerSearchData('PickupSound', '', 'API/ShooterGame/Pickups/AShooterPickup/PickupSound/index.html', 'sound played when player picks it up', 0x40200020n);
registerSearchData('RespawnSound', '', 'API/ShooterGame/Pickups/AShooterPickup/RespawnSound/index.html', 'sound played on respawn', 0x40200020n);
registerSearchData('RespawnTime', '', 'API/ShooterGame/Pickups/AShooterPickup/RespawnTime/index.html', 'how long it takes to respawn?', 0x40200020n);
registerSearchData('bIsActive', '', 'API/ShooterGame/Pickups/AShooterPickup/bIsActive/index.html', 'is it ready for interactions?', 0x40200020n);
registerSearchData('PickedUpBy', '', 'API/ShooterGame/Pickups/AShooterPickup/PickedUpBy/index.html', 'The character who has picked up this pickup', 0x40200020n);
registerSearchData('TimerHandle_RespawnPickup', '', 'API/ShooterGame/Pickups/AShooterPickup/TimerHandle_RespawnPickup/index.html', 'Handle for efficient management of RespawnPickup timer', 0x00200020n);
registerSearchData('AShooterPickup_Ammo', '', 'API/ShooterGame/Pickups/AShooterPickup_Ammo/index.html', 'A pickup object that replenishes ammunition for a weapon', 0x04000001n);
registerSearchData('CanBePickedUp', '', 'API/ShooterGame/Pickups/AShooterPickup_Ammo/CanBePickedUp/index.html', 'check if pawn can use this pickup', 0x00940010n);
registerSearchData('IsForWeapon', '', 'API/ShooterGame/Pickups/AShooterPickup_Ammo/IsForWeapon/index.html', '', 0x00100010n);
registerSearchData('GivePickupTo', '', 'API/ShooterGame/Pickups/AShooterPickup_Ammo/GivePickupTo/index.html', 'give pickup', 0x00240010n);
registerSearchData('AmmoClips', '', 'API/ShooterGame/Pickups/AShooterPickup_Ammo/AmmoClips/index.html', 'how much ammo does it give?', 0x40200020n);
registerSearchData('WeaponType', '', 'API/ShooterGame/Pickups/AShooterPickup_Ammo/WeaponType/index.html', 'which weapon gets ammo?', 0x40200020n);
registerSearchData('AShooterPickup_Health', '', 'API/ShooterGame/Pickups/AShooterPickup_Health/index.html', 'A pickup object that replenishes character health', 0x04000001n);
registerSearchData('CanBePickedUp', '', 'API/ShooterGame/Pickups/AShooterPickup_Health/CanBePickedUp/index.html', 'check if pawn can use this pickup', 0x00940010n);
registerSearchData('GivePickupTo', '', 'API/ShooterGame/Pickups/AShooterPickup_Health/GivePickupTo/index.html', 'give pickup', 0x00240010n);
registerSearchData('Health', '', 'API/ShooterGame/Pickups/AShooterPickup_Health/Health/index.html', 'how much health does it give?', 0x40200020n);
registerSearchData('UShooterCheatManager', '', 'API/ShooterGame/Player/UShooterCheatManager/index.html', 'Copyright 1998-2019 Epic Games, Inc. All Rights Reserved.', 0x04000001n);
registerSearchData('ToggleInfiniteAmmo', '', 'API/ShooterGame/Player/UShooterCheatManager/ToggleInfiniteAmmo/index.html', '', 0x20100010n);
registerSearchData('ToggleInfiniteClip', '', 'API/ShooterGame/Player/UShooterCheatManager/ToggleInfiniteClip/index.html', '', 0x20100010n);
registerSearchData('ToggleMatchTimer', '', 'API/ShooterGame/Player/UShooterCheatManager/ToggleMatchTimer/index.html', '', 0x20100010n);
registerSearchData('ForceMatchStart', '', 'API/ShooterGame/Player/UShooterCheatManager/ForceMatchStart/index.html', '', 0x20100010n);
registerSearchData('ChangeTeam', '', 'API/ShooterGame/Player/UShooterCheatManager/ChangeTeam/index.html', '', 0x20100010n);
registerSearchData('Cheat', '', 'API/ShooterGame/Player/UShooterCheatManager/Cheat/index.html', '', 0x20100010n);
registerSearchData('SpawnBot', '', 'API/ShooterGame/Player/UShooterCheatManager/SpawnBot/index.html', '', 0x20100010n);
registerSearchData('AShooterDemoSpectator', '', 'API/ShooterGame/Player/AShooterDemoSpectator/index.html', 'Copyright 1998-2019 Epic Games, Inc. All Rights Reserved.', 0x04000001n);
registerSearchData('SetupInputComponent', '', 'API/ShooterGame/Player/AShooterDemoSpectator/SetupInputComponent/index.html', '', 0x00140010n);
registerSearchData('SetPlayer', '', 'API/ShooterGame/Player/AShooterDemoSpectator/SetPlayer/index.html', '', 0x00140010n);
registerSearchData('Destroyed', '', 'API/ShooterGame/Player/AShooterDemoSpectator/Destroyed/index.html', '', 0x00140010n);
registerSearchData('OnToggleInGameMenu', '', 'API/ShooterGame/Player/AShooterDemoSpectator/OnToggleInGameMenu/index.html', '', 0x00100010n);
registerSearchData('OnIncreasePlaybackSpeed', '', 'API/ShooterGame/Player/AShooterDemoSpectator/OnIncreasePlaybackSpeed/index.html', '', 0x00100010n);
registerSearchData('OnDecreasePlaybackSpeed', '', 'API/ShooterGame/Player/AShooterDemoSpectator/OnDecreasePlaybackSpeed/index.html', '', 0x00100010n);
registerSearchData('ShooterDemoPlaybackMenu', '', 'API/ShooterGame/Player/AShooterDemoSpectator/ShooterDemoPlaybackMenu/index.html', 'shooter in-game menu', 0x00100020n);
registerSearchData('PlaybackSpeed', '', 'API/ShooterGame/Player/AShooterDemoSpectator/PlaybackSpeed/index.html', '', 0x00100020n);
registerSearchData('DemoHUD', '', 'API/ShooterGame/Player/AShooterDemoSpectator/DemoHUD/index.html', '', 0x00400020n);
registerSearchData('UShooterPersistentUser', '', 'API/ShooterGame/Player/UShooterPersistentUser/index.html', 'Copyright 1998-2019 Epic Games, Inc. All Rights Reserved.', 0x04000001n);
registerSearchData('LoadPersistentUser', '', 'API/ShooterGame/Player/UShooterPersistentUser/LoadPersistentUser/index.html', 'Loads user persistence data if it exists, creates an empty record otherwise.', 0x00120010n);
registerSearchData('SaveIfDirty', '', 'API/ShooterGame/Player/UShooterPersistentUser/SaveIfDirty/index.html', 'Saves data if anything has changed.', 0x00100010n);
registerSearchData('AddMatchResult', '', 'API/ShooterGame/Player/UShooterPersistentUser/AddMatchResult/index.html', 'Records the result of a match.', 0x00100010n);
registerSearchData('TellInputAboutKeybindings', '', 'API/ShooterGame/Player/UShooterPersistentUser/TellInputAboutKeybindings/index.html', 'needed because we can recreate the subsystem that stores it', 0x00100010n);
registerSearchData('GetUserIndex', '', 'API/ShooterGame/Player/UShooterPersistentUser/GetUserIndex/index.html', '', 0x00900010n);
registerSearchData('GetKills', '', 'API/ShooterGame/Player/UShooterPersistentUser/GetKills/index.html', '', 0x00900010n);
registerSearchData('GetDeaths', '', 'API/ShooterGame/Player/UShooterPersistentUser/GetDeaths/index.html', '', 0x00900010n);
registerSearchData('GetWins', '', 'API/ShooterGame/Player/UShooterPersistentUser/GetWins/index.html', '', 0x00900010n);
registerSearchData('GetLosses', '', 'API/ShooterGame/Player/UShooterPersistentUser/GetLosses/index.html', '', 0x00900010n);
registerSearchData('GetBulletsFired', '', 'API/ShooterGame/Player/UShooterPersistentUser/GetBulletsFired/index.html', '', 0x00900010n);
registerSearchData('GetRocketsFired', '', 'API/ShooterGame/Player/UShooterPersistentUser/GetRocketsFired/index.html', '', 0x00900010n);
registerSearchData('GetVibration', '', 'API/ShooterGame/Player/UShooterPersistentUser/GetVibration/index.html', 'Is controller vibration turned on?', 0x00900010n);
registerSearchData('GetInvertedYAxis', '', 'API/ShooterGame/Player/UShooterPersistentUser/GetInvertedYAxis/index.html', 'Is the y axis inverted?', 0x00900010n);
registerSearchData('SetVibration', '', 'API/ShooterGame/Player/UShooterPersistentUser/SetVibration/index.html', 'Setter for controller vibration option', 0x00100010n);
registerSearchData('SetInvertedYAxis', '', 'API/ShooterGame/Player/UShooterPersistentUser/SetInvertedYAxis/index.html', 'Setter for inverted y axis', 0x00100010n);
registerSearchData('GetAimSensitivity', '', 'API/ShooterGame/Player/UShooterPersistentUser/GetAimSensitivity/index.html', 'Getter for the aim sensitivity', 0x00900010n);
registerSearchData('SetAimSensitivity', '', 'API/ShooterGame/Player/UShooterPersistentUser/SetAimSensitivity/index.html', '', 0x00100010n);
registerSearchData('GetGamma', '', 'API/ShooterGame/Player/UShooterPersistentUser/GetGamma/index.html', 'Getter for the gamma correction', 0x00900010n);
registerSearchData('SetGamma', '', 'API/ShooterGame/Player/UShooterPersistentUser/SetGamma/index.html', '', 0x00100010n);
registerSearchData('GetBotsCount', '', 'API/ShooterGame/Player/UShooterPersistentUser/GetBotsCount/index.html', '', 0x00900010n);
registerSearchData('SetBotsCount', '', 'API/ShooterGame/Player/UShooterPersistentUser/SetBotsCount/index.html', '', 0x00100010n);
registerSearchData('IsRecordingDemos', '', 'API/ShooterGame/Player/UShooterPersistentUser/IsRecordingDemos/index.html', '', 0x00900010n);
registerSearchData('SetIsRecordingDemos', '', 'API/ShooterGame/Player/UShooterPersistentUser/SetIsRecordingDemos/index.html', '', 0x00100010n);
registerSearchData('GetName', '', 'API/ShooterGame/Player/UShooterPersistentUser/GetName/index.html', '', 0x00900010n);
registerSearchData('SetToDefaults', '', 'API/ShooterGame/Player/UShooterPersistentUser/SetToDefaults/index.html', '', 0x00200010n);
registerSearchData('IsAimSensitivityDirty', '', 'API/ShooterGame/Player/UShooterPersistentUser/IsAimSensitivityDirty/index.html', 'Checks if the Mouse Sensitivity user setting is different from current', 0x00a00010n);
registerSearchData('IsInvertedYAxisDirty', '', 'API/ShooterGame/Player/UShooterPersistentUser/IsInvertedYAxisDirty/index.html', 'Checks if the Inverted Mouse user setting is different from current', 0x00a00010n);
registerSearchData('SavePersistentUser', '', 'API/ShooterGame/Player/UShooterPersistentUser/SavePersistentUser/index.html', 'Triggers a save of this data.', 0x00200010n);
registerSearchData('Kills', '', 'API/ShooterGame/Player/UShooterPersistentUser/Kills/index.html', 'Lifetime count of kills', 0x40200020n);
registerSearchData('Deaths', '', 'API/ShooterGame/Player/UShooterPersistentUser/Deaths/index.html', 'Lifetime count of deaths', 0x40200020n);
registerSearchData('Wins', '', 'API/ShooterGame/Player/UShooterPersistentUser/Wins/index.html', 'Lifetime count of match wins', 0x40200020n);
registerSearchData('Losses', '', 'API/ShooterGame/Player/UShooterPersistentUser/Losses/index.html', 'Lifetime count of match losses', 0x40200020n);
registerSearchData('BulletsFired', '', 'API/ShooterGame/Player/UShooterPersistentUser/BulletsFired/index.html', 'Lifetime count of bullets fired', 0x40200020n);
registerSearchData('RocketsFired', '', 'API/ShooterGame/Player/UShooterPersistentUser/RocketsFired/index.html', 'Lifetime count of rockets fired', 0x40200020n);
registerSearchData('BotsCount', '', 'API/ShooterGame/Player/UShooterPersistentUser/BotsCount/index.html', 'how many bots join hosted game', 0x40200020n);
registerSearchData('bIsRecordingDemos', '', 'API/ShooterGame/Player/UShooterPersistentUser/bIsRecordingDemos/index.html', 'is recording demos?', 0x40200020n);
registerSearchData('Gamma', '', 'API/ShooterGame/Player/UShooterPersistentUser/Gamma/index.html', 'Holds the gamma correction setting', 0x40200020n);
registerSearchData('AimSensitivity', '', 'API/ShooterGame/Player/UShooterPersistentUser/AimSensitivity/index.html', 'Holds the mouse sensitivity', 0x40200020n);
registerSearchData('bInvertedYAxis', '', 'API/ShooterGame/Player/UShooterPersistentUser/bInvertedYAxis/index.html', 'Is the y axis inverted or not?', 0x40200020n);
registerSearchData('bVibrationOpt', '', 'API/ShooterGame/Player/UShooterPersistentUser/bVibrationOpt/index.html', '', 0x40200020n);
registerSearchData('bIsDirty', '', 'API/ShooterGame/Player/UShooterPersistentUser/bIsDirty/index.html', 'Internal. True if data is changed but hasn\'t been saved.', 0x00400020n);
registerSearchData('SlotName', '', 'API/ShooterGame/Player/UShooterPersistentUser/SlotName/index.html', 'The string identifier used to save/load this persistent user.', 0x00400020n);
registerSearchData('UserIndex', '', 'API/ShooterGame/Player/UShooterPersistentUser/UserIndex/index.html', '', 0x00400020n);
registerSearchData('UShooterLocalPlayer', '', 'API/ShooterGame/Player/UShooterLocalPlayer/index.html', '', 0x04000001n);
registerSearchData('SetControllerId', '', 'API/ShooterGame/Player/UShooterLocalPlayer/SetControllerId/index.html', '', 0x00140010n);
registerSearchData('GetNickname', '', 'API/ShooterGame/Player/UShooterLocalPlayer/GetNickname/index.html', '', 0x00940010n);
registerSearchData('LoadPersistentUser', '', 'API/ShooterGame/Player/UShooterLocalPlayer/LoadPersistentUser/index.html', 'Initializes the PersistentUser', 0x00100010n);
registerSearchData('PersistentUser', '', 'API/ShooterGame/Player/UShooterLocalPlayer/PersistentUser/index.html', 'Persistent user data stored between sessions (i.e. the user\'s savegame)', 0x40400020n);
registerSearchData('AShooterPlayerCameraManager', '', 'API/ShooterGame/Player/AShooterPlayerCameraManager/index.html', 'Copyright 1998-2019 Epic Games, Inc. All Rights Reserved.', 0x04000001n);
registerSearchData('UpdateCamera', '', 'API/ShooterGame/Player/AShooterPlayerCameraManager/UpdateCamera/index.html', 'After updating camera, inform pawn to update 1p mesh to match camera\'s location&rotation', 0x00140010n);
registerSearchData('NormalFOV', '', 'API/ShooterGame/Player/AShooterPlayerCameraManager/NormalFOV/index.html', 'normal FOV', 0x00100020n);
registerSearchData('TargetingFOV', '', 'API/ShooterGame/Player/AShooterPlayerCameraManager/TargetingFOV/index.html', 'targeting FOV', 0x00100020n);
registerSearchData('AShooterPlayerController_Menu', '', 'API/ShooterGame/Player/AShooterPlayerController_Menu/index.html', 'Copyright 1998-2019 Epic Games, Inc. All Rights Reserved.', 0x04000001n);
registerSearchData('PostInitializeComponents', '', 'API/ShooterGame/Player/AShooterPlayerController_Menu/PostInitializeComponents/index.html', 'After game is initialized', 0x00140010n);
registerSearchData('AShooterSpectatorPawn', '', 'API/ShooterGame/Player/AShooterSpectatorPawn/index.html', 'Copyright 1998-2019 Epic Games, Inc. All Rights Reserved.', 0x04000001n);
registerSearchData('SetupPlayerInputComponent', '', 'API/ShooterGame/Player/AShooterSpectatorPawn/SetupPlayerInputComponent/index.html', 'Overridden to implement Key Bindings the match the player controls', 0x00140010n);
registerSearchData('LookUpAtRate', '', 'API/ShooterGame/Player/AShooterSpectatorPawn/LookUpAtRate/index.html', 'Frame rate linked look', 0x00100010n);
registerSearchData('USoundNodeLocalPlayer', '', 'API/ShooterGame/Sound/USoundNodeLocalPlayer/index.html', 'Choose different branch for sounds attached to locally controlled player', 0x04000001n);
registerSearchData('ParseNodes', '', 'API/ShooterGame/Sound/USoundNodeLocalPlayer/ParseNodes/index.html', 'Begin USoundNode interface.', 0x00140010n);
registerSearchData('GetMaxChildNodes', '', 'API/ShooterGame/Sound/USoundNodeLocalPlayer/GetMaxChildNodes/index.html', '', 0x00940010n);
registerSearchData('GetMinChildNodes', '', 'API/ShooterGame/Sound/USoundNodeLocalPlayer/GetMinChildNodes/index.html', '', 0x00940010n);
registerSearchData('GetInputPinName', '', 'API/ShooterGame/Sound/USoundNodeLocalPlayer/GetInputPinName/index.html', '', 0x00940010n);
registerSearchData('GetLocallyControlledActorCache', '', 'API/ShooterGame/Sound/USoundNodeLocalPlayer/GetLocallyControlledActorCache/index.html', 'End USoundNode interface.', 0x00120010n);
registerSearchData('LocallyControlledActorCache', '', 'API/ShooterGame/Sound/USoundNodeLocalPlayer/LocallyControlledActorCache/index.html', '', 0x00420020n);
registerSearchData('UShooterTestControllerBase', '', 'API/ShooterGame/Tests/UShooterTestControllerBase/index.html', 'Based on LOGIN_REQUIRED_FOR_ONLINE_PLAY in ShooterMainMenu.cpp', 0x04000001n);
registerSearchData('OnInit', '', 'API/ShooterGame/Tests/UShooterTestControllerBase/OnInit/index.html', '', 0x00140010n);
registerSearchData('OnPostMapChange', '', 'API/ShooterGame/Tests/UShooterTestControllerBase/OnPostMapChange/index.html', '', 0x00140010n);
registerSearchData('OnTick', '', 'API/ShooterGame/Tests/UShooterTestControllerBase/OnTick/index.html', '', 0x00240010n);
registerSearchData('StartPlayerLoginProcess', '', 'API/ShooterGame/Tests/UShooterTestControllerBase/StartPlayerLoginProcess/index.html', 'Login', 0x00240010n);
registerSearchData('OnUserCanPlay', '', 'API/ShooterGame/Tests/UShooterTestControllerBase/OnUserCanPlay/index.html', '', 0x00240010n);
registerSearchData('StartLoginTask', '', 'API/ShooterGame/Tests/UShooterTestControllerBase/StartLoginTask/index.html', '', 0x00240010n);
registerSearchData('OnLoginTaskComplete', '', 'API/ShooterGame/Tests/UShooterTestControllerBase/OnLoginTaskComplete/index.html', '', 0x00240010n);
registerSearchData('StartOnlinePrivilegeTask', '', 'API/ShooterGame/Tests/UShooterTestControllerBase/StartOnlinePrivilegeTask/index.html', '', 0x00240010n);
registerSearchData('OnUserCanPlayOnline', '', 'API/ShooterGame/Tests/UShooterTestControllerBase/OnUserCanPlayOnline/index.html', '', 0x00240010n);
registerSearchData('HostGame', '', 'API/ShooterGame/Tests/UShooterTestControllerBase/HostGame/index.html', 'Host Game', 0x00240010n);
registerSearchData('StartQuickMatch', '', 'API/ShooterGame/Tests/UShooterTestControllerBase/StartQuickMatch/index.html', 'Quick Match', 0x00240010n);
registerSearchData('OnMatchmakingComplete', '', 'API/ShooterGame/Tests/UShooterTestControllerBase/OnMatchmakingComplete/index.html', '', 0x00200010n);
registerSearchData('StartSearchingForGame', '', 'API/ShooterGame/Tests/UShooterTestControllerBase/StartSearchingForGame/index.html', 'Game Search', 0x00240010n);
registerSearchData('UpdateSearchStatus', '', 'API/ShooterGame/Tests/UShooterTestControllerBase/UpdateSearchStatus/index.html', '', 0x00240010n);
registerSearchData('GetGameInstance', '', 'API/ShooterGame/Tests/UShooterTestControllerBase/GetGameInstance/index.html', 'Helper Functions', 0x00a40010n);
registerSearchData('GetGameInstanceState', '', 'API/ShooterGame/Tests/UShooterTestControllerBase/GetGameInstanceState/index.html', '', 0x00a40010n);
registerSearchData('GetGameSession', '', 'API/ShooterGame/Tests/UShooterTestControllerBase/GetGameSession/index.html', '', 0x00a40010n);
registerSearchData('IsInGame', '', 'API/ShooterGame/Tests/UShooterTestControllerBase/IsInGame/index.html', '', 0x00a40010n);
registerSearchData('GetFirstLocalPlayer', '', 'API/ShooterGame/Tests/UShooterTestControllerBase/GetFirstLocalPlayer/index.html', '', 0x00a40010n);
registerSearchData('bIsLoggedIn', '', 'API/ShooterGame/Tests/UShooterTestControllerBase/bIsLoggedIn/index.html', 'Login', 0x00200020n);
registerSearchData('bIsLoggingIn', '', 'API/ShooterGame/Tests/UShooterTestControllerBase/bIsLoggingIn/index.html', '', 0x00200020n);
registerSearchData('OnLoginCompleteDelegateHandle', '', 'API/ShooterGame/Tests/UShooterTestControllerBase/OnLoginCompleteDelegateHandle/index.html', '', 0x00200020n);
registerSearchData('bInQuickMatchSearch', '', 'API/ShooterGame/Tests/UShooterTestControllerBase/bInQuickMatchSearch/index.html', 'Quick Match', 0x00200020n);
registerSearchData('bFoundQuickMatchGame', '', 'API/ShooterGame/Tests/UShooterTestControllerBase/bFoundQuickMatchGame/index.html', '', 0x00200020n);
registerSearchData('QuickMatchSearchSettings', '', 'API/ShooterGame/Tests/UShooterTestControllerBase/QuickMatchSearchSettings/index.html', '', 0x00200020n);
registerSearchData('OnMatchmakingCompleteDelegateHandle', '', 'API/ShooterGame/Tests/UShooterTestControllerBase/OnMatchmakingCompleteDelegateHandle/index.html', '', 0x00200020n);
registerSearchData('bIsSearchingForGame', '', 'API/ShooterGame/Tests/UShooterTestControllerBase/bIsSearchingForGame/index.html', 'Game Search', 0x00200020n);
registerSearchData('bFoundGame', '', 'API/ShooterGame/Tests/UShooterTestControllerBase/bFoundGame/index.html', '', 0x00200020n);
registerSearchData('NumOfCycledMatches', '', 'API/ShooterGame/Tests/UShooterTestControllerBase/NumOfCycledMatches/index.html', 'Match Cycling ', 0x00200020n);
registerSearchData('TargetNumOfCycledMatches', '', 'API/ShooterGame/Tests/UShooterTestControllerBase/TargetNumOfCycledMatches/index.html', '', 0x00200020n);
registerSearchData('UShooterTestControllerBasicDedicatedServerTest', '', 'API/ShooterGame/Tests/UShooterTestControllerBasicDedicatedServerTest/index.html', 'Copyright 1998-2019 Epic Games, Inc.All Rights Reserved.', 0x04000001n);
registerSearchData('OnTick', '', 'API/ShooterGame/Tests/UShooterTestControllerBasicDedicatedServerTest/OnTick/index.html', '', 0x00240010n);
registerSearchData('OnPostMapChange', '', 'API/ShooterGame/Tests/UShooterTestControllerBasicDedicatedServerTest/OnPostMapChange/index.html', '', 0x00140010n);
registerSearchData('UShooterTestControllerBootTest', '', 'API/ShooterGame/Tests/UShooterTestControllerBootTest/index.html', 'Copyright 1998-2019 Epic Games, Inc.All Rights Reserved.', 0x04000001n);
registerSearchData('IsBootProcessComplete', '', 'API/ShooterGame/Tests/UShooterTestControllerBootTest/IsBootProcessComplete/index.html', '', 0x00a40010n);
registerSearchData('TestDelay', '', 'API/ShooterGame/Tests/UShooterTestControllerBootTest/TestDelay/index.html', 'This can cause the test to be over before Gauntlet can even know that it is running and will cause the test to fail.', 0x00a00020n);
registerSearchData('UShooterTestControllerDedicatedServerTest', '', 'API/ShooterGame/Tests/UShooterTestControllerDedicatedServerTest/index.html', 'Copyright 1998-2019 Epic Games, Inc.All Rights Reserved.', 0x04000001n);
registerSearchData('OnTick', '', 'API/ShooterGame/Tests/UShooterTestControllerDedicatedServerTest/OnTick/index.html', '', 0x00240010n);
registerSearchData('UShooterTestControllerListenServerClient', '', 'API/ShooterGame/Tests/UShooterTestControllerListenServerClient/index.html', 'Copyright 1998-2019 Epic Games, Inc.All Rights Reserved.', 0x04000001n);
registerSearchData('OnTick', '', 'API/ShooterGame/Tests/UShooterTestControllerListenServerClient/OnTick/index.html', '', 0x00240010n);
registerSearchData('UShooterTestControllerListenServerHost', '', 'API/ShooterGame/Tests/UShooterTestControllerListenServerHost/index.html', 'Copyright 1998-2019 Epic Games, Inc.All Rights Reserved.', 0x04000001n);
registerSearchData('OnPostMapChange', '', 'API/ShooterGame/Tests/UShooterTestControllerListenServerHost/OnPostMapChange/index.html', '', 0x00140010n);
registerSearchData('OnUserCanPlayOnline', '', 'API/ShooterGame/Tests/UShooterTestControllerListenServerHost/OnUserCanPlayOnline/index.html', '', 0x00240010n);
registerSearchData('UShooterTestControllerListenServerQuickMatchClient', '', 'API/ShooterGame/Tests/UShooterTestControllerListenServerQuickMatchClient/index.html', 'Copyright 1998-2019 Epic Games, Inc.All Rights Reserved.', 0x04000001n);
registerSearchData('OnTick', '', 'API/ShooterGame/Tests/UShooterTestControllerListenServerQuickMatchClient/OnTick/index.html', '', 0x00240010n);
registerSearchData('FHitData', '', 'API/ShooterGame/UI/FHitData/index.html', 'Copyright 1998-2019 Epic Games, Inc. All Rights Reserved.', 0x00000002n);
registerSearchData('FHitData', '', 'API/ShooterGame/UI/FHitData/FHitData/index.html', 'Initialise defaults.', 0x80100010n);
registerSearchData('HitTime', '', 'API/ShooterGame/UI/FHitData/HitTime/index.html', 'Last hit time.', 0x00100020n);
registerSearchData('HitPercentage', '', 'API/ShooterGame/UI/FHitData/HitPercentage/index.html', 'strength of hit icon', 0x00100020n);
registerSearchData('FDeathMessage', '', 'API/ShooterGame/UI/FDeathMessage/index.html', '', 0x00000002n);
registerSearchData('FDeathMessage', '', 'API/ShooterGame/UI/FDeathMessage/FDeathMessage/index.html', 'Initialise defaults.', 0x80100010n);
registerSearchData('KillerDesc', '', 'API/ShooterGame/UI/FDeathMessage/KillerDesc/index.html', 'Name of player scoring kill.', 0x00100020n);
registerSearchData('VictimDesc', '', 'API/ShooterGame/UI/FDeathMessage/VictimDesc/index.html', 'Name of killed player.', 0x00100020n);
registerSearchData('bKillerIsOwner', '', 'API/ShooterGame/UI/FDeathMessage/bKillerIsOwner/index.html', 'Killer is local player.', 0x00100020n);
registerSearchData('bVictimIsOwner', '', 'API/ShooterGame/UI/FDeathMessage/bVictimIsOwner/index.html', 'Victim is local player.', 0x00100020n);
registerSearchData('KillerTeamNum', '', 'API/ShooterGame/UI/FDeathMessage/KillerTeamNum/index.html', 'Team number of the killer.', 0x00100020n);
registerSearchData('VictimTeamNum', '', 'API/ShooterGame/UI/FDeathMessage/VictimTeamNum/index.html', 'Team number of the victim.', 0x00100020n);
registerSearchData('HideTime', '', 'API/ShooterGame/UI/FDeathMessage/HideTime/index.html', 'timestamp for removing message', 0x00100020n);
registerSearchData('DamageType', '', 'API/ShooterGame/UI/FDeathMessage/DamageType/index.html', 'What killed the player.', 0x00100020n);
registerSearchData('AShooterHUD', '', 'API/ShooterGame/UI/AShooterHUD/index.html', '', 0x04000001n);
registerSearchData('EndPlay', '', 'API/ShooterGame/UI/AShooterHUD/EndPlay/index.html', '', 0x00140010n);
registerSearchData('DrawHUD', '', 'API/ShooterGame/UI/AShooterHUD/DrawHUD/index.html', 'Main HUD update loop.', 0x00140010n);
registerSearchData('NotifyWeaponHit', '', 'API/ShooterGame/UI/AShooterHUD/NotifyWeaponHit/index.html', 'Sent from pawn hit, used to calculate hit notification overlay for drawing. ', 0x00100010n);
registerSearchData('NotifyOutOfAmmo', '', 'API/ShooterGame/UI/AShooterHUD/NotifyOutOfAmmo/index.html', 'Sent from ShooterWeapon, shows NO AMMO text.', 0x00100010n);
registerSearchData('NotifyEnemyHit', '', 'API/ShooterGame/UI/AShooterHUD/NotifyEnemyHit/index.html', 'Notifies we have hit the enemy.', 0x00100010n);
registerSearchData('SetMatchState', '', 'API/ShooterGame/UI/AShooterHUD/SetMatchState/index.html', 'Set state of current match. ', 0x00100010n);
registerSearchData('GetMatchState', '', 'API/ShooterGame/UI/AShooterHUD/GetMatchState/index.html', 'Get state of current match.', 0x00900010n);
registerSearchData('ConditionalCloseScoreboard', '', 'API/ShooterGame/UI/AShooterHUD/ConditionalCloseScoreboard/index.html', 'Turns off scoreboard if it is being displayed', 0x00100010n);
registerSearchData('ToggleScoreboard', '', 'API/ShooterGame/UI/AShooterHUD/ToggleScoreboard/index.html', 'Toggles scoreboard', 0x00100010n);
registerSearchData('ShowScoreboard', '', 'API/ShooterGame/UI/AShooterHUD/ShowScoreboard/index.html', 'Toggles in game scoreboard. Note:Will not display if the game menu is visible. ', 0x00100010n);
registerSearchData('ShowDeathMessage', '', 'API/ShooterGame/UI/AShooterHUD/ShowDeathMessage/index.html', 'Add death message. ', 0x00100010n);
registerSearchData('ToggleChat', '', 'API/ShooterGame/UI/AShooterHUD/ToggleChat/index.html', 'Toggle chat window visibility.', 0x00100010n);
registerSearchData('SetChatVisibilty', '', 'API/ShooterGame/UI/AShooterHUD/SetChatVisibilty/index.html', 'Set chat window visibility. ', 0x00100010n);
registerSearchData('AddChatLine', '', 'API/ShooterGame/UI/AShooterHUD/AddChatLine/index.html', 'Add a string to the chat window. ', 0x00100010n);
registerSearchData('IsMatchOver', '', 'API/ShooterGame/UI/AShooterHUD/IsMatchOver/index.html', 'Is the match over (IE Is the state Won or Lost).', 0x00900010n);
registerSearchData('PostInitializeComponents', '', 'API/ShooterGame/UI/AShooterHUD/PostInitializeComponents/index.html', 'Called every time game is started.', 0x00240010n);
registerSearchData('GetTimeString', '', 'API/ShooterGame/UI/AShooterHUD/GetTimeString/index.html', 'Converts floating point seconds to MM:SS string. ', 0x00200010n);
registerSearchData('DrawWeaponHUD', '', 'API/ShooterGame/UI/AShooterHUD/DrawWeaponHUD/index.html', 'Draws weapon HUD.', 0x00200010n);
registerSearchData('DrawKills', '', 'API/ShooterGame/UI/AShooterHUD/DrawKills/index.html', 'Draws kills information.', 0x00200010n);
registerSearchData('DrawHealth', '', 'API/ShooterGame/UI/AShooterHUD/DrawHealth/index.html', 'Draw player\'s health bar.', 0x00200010n);
registerSearchData('DrawMatchTimerAndPosition', '', 'API/ShooterGame/UI/AShooterHUD/DrawMatchTimerAndPosition/index.html', 'Draws match timer and player position.', 0x00200010n);
registerSearchData('DrawCrosshair', '', 'API/ShooterGame/UI/AShooterHUD/DrawCrosshair/index.html', 'Draws weapon crosshair.', 0x00200010n);
registerSearchData('DrawHitIndicator', '', 'API/ShooterGame/UI/AShooterHUD/DrawHitIndicator/index.html', 'Draws hit indicator.', 0x00200010n);
registerSearchData('DrawDeathMessages', '', 'API/ShooterGame/UI/AShooterHUD/DrawDeathMessages/index.html', 'Draw death messages.', 0x00200010n);
registerSearchData('OnPlayerTalkingStateChanged', '', 'API/ShooterGame/UI/AShooterHUD/OnPlayerTalkingStateChanged/index.html', '', 0x00200010n);
registerSearchData('DrawRecentlyKilledPlayer', '', 'API/ShooterGame/UI/AShooterHUD/DrawRecentlyKilledPlayer/index.html', 'Draw the most recently killed player if needed ', 0x00200010n);
registerSearchData('DrawDebugInfoString', '', 'API/ShooterGame/UI/AShooterHUD/DrawDebugInfoString/index.html', 'Temporary helper for drawing text-in-a-box.', 0x00200010n);
registerSearchData('MakeUV', '', 'API/ShooterGame/UI/AShooterHUD/MakeUV/index.html', 'helper for getting uv coords in normalized top,left, bottom, right format', 0x00200010n);
registerSearchData('TryCreateChatWidget', '', 'API/ShooterGame/UI/AShooterHUD/TryCreateChatWidget/index.html', 'Create the chat widget if it doesn\'t already exist. ', 0x00200010n);
registerSearchData('AddMatchInfoString', '', 'API/ShooterGame/UI/AShooterHUD/AddMatchInfoString/index.html', 'Add information string that will be displayed on the hud. They are added as required and rendered together to prevent overlaps ', 0x00200010n);
registerSearchData('ShowInfoItems', '', 'API/ShooterGame/UI/AShooterHUD/ShowInfoItems/index.html', 'Render the info messages. ', 0x00200010n);
registerSearchData('MinHudScale', '', 'API/ShooterGame/UI/AShooterHUD/MinHudScale/index.html', 'Floor for automatic hud scaling.', 0x00a20020n);
registerSearchData('HUDLight', '', 'API/ShooterGame/UI/AShooterHUD/HUDLight/index.html', 'Lighter HUD color.', 0x00200020n);
registerSearchData('HUDDark', '', 'API/ShooterGame/UI/AShooterHUD/HUDDark/index.html', 'Darker HUD color.', 0x00200020n);
registerSearchData('NoAmmoNotifyTime', '', 'API/ShooterGame/UI/AShooterHUD/NoAmmoNotifyTime/index.html', 'When we got last notice about out of ammo.', 0x00200020n);
registerSearchData('NoAmmoFadeOutTime', '', 'API/ShooterGame/UI/AShooterHUD/NoAmmoFadeOutTime/index.html', 'How long notice is fading out.', 0x00200020n);
registerSearchData('LastHitTime', '', 'API/ShooterGame/UI/AShooterHUD/LastHitTime/index.html', 'Most recent hit time, used to check if we need to draw hit indicator at all.', 0x00200020n);
registerSearchData('HitNotifyDisplayTime', '', 'API/ShooterGame/UI/AShooterHUD/HitNotifyDisplayTime/index.html', 'How long till hit notify fades out completely.', 0x00200020n);
registerSearchData('LastEnemyHitTime', '', 'API/ShooterGame/UI/AShooterHUD/LastEnemyHitTime/index.html', 'When we last time hit the enemy.', 0x00200020n);
registerSearchData('LastEnemyHitDisplayTime', '', 'API/ShooterGame/UI/AShooterHUD/LastEnemyHitDisplayTime/index.html', 'How long till enemy hit notify fades out completely.', 0x00200020n);
registerSearchData('HitNotifyIcon[8]', '', 'API/ShooterGame/UI/AShooterHUD/HitNotifyIcon[8]/index.html', 'Icons for hit indicator.', 0x40200020n);
registerSearchData('KillsBg', '', 'API/ShooterGame/UI/AShooterHUD/KillsBg/index.html', 'kills background icon.', 0x40200020n);
registerSearchData('TimePlaceBg', '', 'API/ShooterGame/UI/AShooterHUD/TimePlaceBg/index.html', 'Match timer and player position background icon.', 0x40200020n);
registerSearchData('PrimaryWeapBg', '', 'API/ShooterGame/UI/AShooterHUD/PrimaryWeapBg/index.html', 'Primary weapon background icon.', 0x40200020n);
registerSearchData('SecondaryWeapBg', '', 'API/ShooterGame/UI/AShooterHUD/SecondaryWeapBg/index.html', 'Secondary weapon background icon', 0x40200020n);
registerSearchData('Crosshair[5]', '', 'API/ShooterGame/UI/AShooterHUD/Crosshair[5]/index.html', 'Crosshair icons (left, top, right, bottom and center).', 0x40200020n);
registerSearchData('HitNotifyCrosshair', '', 'API/ShooterGame/UI/AShooterHUD/HitNotifyCrosshair/index.html', 'On crosshair indicator that we hit someone.', 0x40200020n);
registerSearchData('DeathMessagesBg', '', 'API/ShooterGame/UI/AShooterHUD/DeathMessagesBg/index.html', 'Death messages background icon.', 0x40200020n);
registerSearchData('HealthBarBg', '', 'API/ShooterGame/UI/AShooterHUD/HealthBarBg/index.html', 'Health bar background icon.', 0x40200020n);
registerSearchData('HealthBar', '', 'API/ShooterGame/UI/AShooterHUD/HealthBar/index.html', 'Health bar icon.', 0x40200020n);
registerSearchData('HealthIcon', '', 'API/ShooterGame/UI/AShooterHUD/HealthIcon/index.html', 'Health icon on the health bar.', 0x40200020n);
registerSearchData('KillsIcon', '', 'API/ShooterGame/UI/AShooterHUD/KillsIcon/index.html', 'Kills icon.', 0x40200020n);
registerSearchData('KilledIcon', '', 'API/ShooterGame/UI/AShooterHUD/KilledIcon/index.html', 'Bigger killed icon.', 0x40200020n);
registerSearchData('TimerIcon', '', 'API/ShooterGame/UI/AShooterHUD/TimerIcon/index.html', 'Timer icon.', 0x40200020n);
registerSearchData('PlaceIcon', '', 'API/ShooterGame/UI/AShooterHUD/PlaceIcon/index.html', 'Podium icon.', 0x40200020n);
registerSearchData('ScaleUI', '', 'API/ShooterGame/UI/AShooterHUD/ScaleUI/index.html', 'UI scaling factor for other resolutions than Full HD.', 0x00200020n);
registerSearchData('PulseValue', '', 'API/ShooterGame/UI/AShooterHUD/PulseValue/index.html', 'Current animation pulse value.', 0x00200020n);
registerSearchData('ShadowedFont', '', 'API/ShooterGame/UI/AShooterHUD/ShadowedFont/index.html', 'FontRenderInfo enabling casting shadow.s', 0x00200020n);
registerSearchData('CenteredKillMessage', '', 'API/ShooterGame/UI/AShooterHUD/CenteredKillMessage/index.html', 'Big \"KILLED [PLAYER]\" message text above the crosshair.', 0x00200020n);
registerSearchData('LastKillTime', '', 'API/ShooterGame/UI/AShooterHUD/LastKillTime/index.html', 'last time we killed someone.', 0x00200020n);
registerSearchData('KillFadeOutTime', '', 'API/ShooterGame/UI/AShooterHUD/KillFadeOutTime/index.html', 'How long the message will fade out.', 0x00200020n);
registerSearchData('Offsets', '', 'API/ShooterGame/UI/AShooterHUD/Offsets/index.html', 'Offsets to display hit indicator parts.', 0x00200020n);
registerSearchData('HitNotifyTexture', '', 'API/ShooterGame/UI/AShooterHUD/HitNotifyTexture/index.html', 'Texture for hit indicator.', 0x40200020n);
registerSearchData('HUDMainTexture', '', 'API/ShooterGame/UI/AShooterHUD/HUDMainTexture/index.html', 'texture for HUD elements.', 0x40200020n);
registerSearchData('HUDAssets02Texture', '', 'API/ShooterGame/UI/AShooterHUD/HUDAssets02Texture/index.html', 'Texture for HUD elements.', 0x40200020n);
registerSearchData('LowHealthOverlayTexture', '', 'API/ShooterGame/UI/AShooterHUD/LowHealthOverlayTexture/index.html', 'Overlay shown when health is low.', 0x40200020n);
registerSearchData('BigFont', '', 'API/ShooterGame/UI/AShooterHUD/BigFont/index.html', 'Large font - used for ammo display etc.', 0x40200020n);
registerSearchData('NormalFont', '', 'API/ShooterGame/UI/AShooterHUD/NormalFont/index.html', 'Normal font - used for death messages and such.', 0x40200020n);
registerSearchData('Offset', '', 'API/ShooterGame/UI/AShooterHUD/Offset/index.html', 'General offset for HUD elements.', 0x00200020n);
registerSearchData('HitNotifyData', '', 'API/ShooterGame/UI/AShooterHUD/HitNotifyData/index.html', 'Runtime data for hit indicator.', 0x00200020n);
registerSearchData('DeathMessages', '', 'API/ShooterGame/UI/AShooterHUD/DeathMessages/index.html', 'Active death messages.', 0x00200020n);
registerSearchData('MatchState', '', 'API/ShooterGame/UI/AShooterHUD/MatchState/index.html', 'State of match.', 0x00200020n);
registerSearchData('bIsScoreBoardVisible', '', 'API/ShooterGame/UI/AShooterHUD/bIsScoreBoardVisible/index.html', 'Is the scoreboard widget on screen?', 0x00200020n);
registerSearchData('ScoreboardWidget', '', 'API/ShooterGame/UI/AShooterHUD/ScoreboardWidget/index.html', 'Scoreboard widget.', 0x00200020n);
registerSearchData('ScoreboardWidgetOverlay', '', 'API/ShooterGame/UI/AShooterHUD/ScoreboardWidgetOverlay/index.html', 'Scoreboard widget overlay.', 0x00200020n);
registerSearchData('ScoreboardWidgetContainer', '', 'API/ShooterGame/UI/AShooterHUD/ScoreboardWidgetContainer/index.html', 'Scoreboard widget container - used for removing', 0x00200020n);
registerSearchData('ChatWidget', '', 'API/ShooterGame/UI/AShooterHUD/ChatWidget/index.html', 'Chatbox widget.', 0x00200020n);
registerSearchData('InfoItems', '', 'API/ShooterGame/UI/AShooterHUD/InfoItems/index.html', 'Array of information strings to render (Waiting to respawn etc)', 0x00200020n);
registerSearchData('OnPlayerTalkingStateChangedDelegate', '', 'API/ShooterGame/UI/AShooterHUD/OnPlayerTalkingStateChangedDelegate/index.html', 'Delegate for telling other methods when players have started/stopped talking', 0x00200020n);
registerSearchData('UShooterDamageType', '', 'API/ShooterGame/Weapons/UShooterDamageType/index.html', 'DamageType class that specifies an icon to display', 0x04000001n);
registerSearchData('KillIcon', '', 'API/ShooterGame/Weapons/UShooterDamageType/KillIcon/index.html', 'icon displayed in death messages log when killed with this weapon', 0x40100020n);
registerSearchData('HitForceFeedback', '', 'API/ShooterGame/Weapons/UShooterDamageType/HitForceFeedback/index.html', 'force feedback effect to play on a player hit by this damage type', 0x40100020n);
registerSearchData('KilledForceFeedback', '', 'API/ShooterGame/Weapons/UShooterDamageType/KilledForceFeedback/index.html', 'force feedback effect to play on a player killed by this damage type', 0x40100020n);
registerSearchData('FWeaponData', '', 'API/ShooterGame/Weapons/FWeaponData/index.html', '', 0x08000002n);
registerSearchData('FWeaponData', '', 'API/ShooterGame/Weapons/FWeaponData/FWeaponData/index.html', 'defaults', 0x80100010n);
registerSearchData('bInfiniteAmmo', '', 'API/ShooterGame/Weapons/FWeaponData/bInfiniteAmmo/index.html', 'inifite ammo for reloads', 0x40100020n);
registerSearchData('bInfiniteClip', '', 'API/ShooterGame/Weapons/FWeaponData/bInfiniteClip/index.html', 'infinite ammo in clip, no reload required', 0x40100020n);
registerSearchData('MaxAmmo', '', 'API/ShooterGame/Weapons/FWeaponData/MaxAmmo/index.html', 'max ammo', 0x40100020n);
registerSearchData('AmmoPerClip', '', 'API/ShooterGame/Weapons/FWeaponData/AmmoPerClip/index.html', 'clip size', 0x40100020n);
registerSearchData('InitialClips', '', 'API/ShooterGame/Weapons/FWeaponData/InitialClips/index.html', 'initial clips', 0x40100020n);
registerSearchData('TimeBetweenShots', '', 'API/ShooterGame/Weapons/FWeaponData/TimeBetweenShots/index.html', 'time between two consecutive shots', 0x40100020n);
registerSearchData('NoAnimReloadDuration', '', 'API/ShooterGame/Weapons/FWeaponData/NoAnimReloadDuration/index.html', 'failsafe reload duration if weapon doesn\'t have any animation for it', 0x40100020n);
registerSearchData('FWeaponAnim', '', 'API/ShooterGame/Weapons/FWeaponAnim/index.html', '', 0x08000002n);
registerSearchData('Pawn1P', '', 'API/ShooterGame/Weapons/FWeaponAnim/Pawn1P/index.html', 'animation played on pawn (1st person view)', 0x40100020n);
registerSearchData('Pawn3P', '', 'API/ShooterGame/Weapons/FWeaponAnim/Pawn3P/index.html', 'animation played on pawn (3rd person view)', 0x40100020n);
registerSearchData('AShooterWeapon', '', 'API/ShooterGame/Weapons/AShooterWeapon/index.html', '', 0x04000001n);
registerSearchData('PostInitializeComponents', '', 'API/ShooterGame/Weapons/AShooterWeapon/PostInitializeComponents/index.html', 'perform initial setup', 0x00140010n);
registerSearchData('Destroyed', '', 'API/ShooterGame/Weapons/AShooterWeapon/Destroyed/index.html', '', 0x00140010n);
registerSearchData('GiveAmmo', '', 'API/ShooterGame/Weapons/AShooterWeapon/GiveAmmo/index.html', '[server] add ammo', 0x00100010n);
registerSearchData('UseAmmo', '', 'API/ShooterGame/Weapons/AShooterWeapon/UseAmmo/index.html', 'consume a bullet', 0x00100010n);
registerSearchData('GetAmmoType', '', 'API/ShooterGame/Weapons/AShooterWeapon/GetAmmoType/index.html', 'query ammo type', 0x00940010n);
registerSearchData('OnEquip', '', 'API/ShooterGame/Weapons/AShooterWeapon/OnEquip/index.html', 'weapon is being equipped by owner pawn', 0x00140010n);
registerSearchData('OnEquipFinished', '', 'API/ShooterGame/Weapons/AShooterWeapon/OnEquipFinished/index.html', 'weapon is now equipped by owner pawn', 0x00140010n);
registerSearchData('OnUnEquip', '', 'API/ShooterGame/Weapons/AShooterWeapon/OnUnEquip/index.html', 'weapon is holstered by owner pawn', 0x00140010n);
registerSearchData('OnEnterInventory', '', 'API/ShooterGame/Weapons/AShooterWeapon/OnEnterInventory/index.html', '[server] weapon was added to pawn\'s inventory', 0x00140010n);
registerSearchData('OnLeaveInventory', '', 'API/ShooterGame/Weapons/AShooterWeapon/OnLeaveInventory/index.html', '[server] weapon was removed from pawn\'s inventory', 0x00140010n);
registerSearchData('IsEquipped', '', 'API/ShooterGame/Weapons/AShooterWeapon/IsEquipped/index.html', 'check if it\'s currently equipped', 0x00900010n);
registerSearchData('IsAttachedToPawn', '', 'API/ShooterGame/Weapons/AShooterWeapon/IsAttachedToPawn/index.html', 'check if mesh is already attached', 0x00900010n);
registerSearchData('StartFire', '', 'API/ShooterGame/Weapons/AShooterWeapon/StartFire/index.html', '[local + server] start weapon fire', 0x00140010n);
registerSearchData('StopFire', '', 'API/ShooterGame/Weapons/AShooterWeapon/StopFire/index.html', '[local + server] stop weapon fire', 0x00140010n);
registerSearchData('StartReload', '', 'API/ShooterGame/Weapons/AShooterWeapon/StartReload/index.html', '[all] start weapon reload', 0x00140010n);
registerSearchData('StopReload', '', 'API/ShooterGame/Weapons/AShooterWeapon/StopReload/index.html', '[local + server] interrupt weapon reload', 0x00140010n);
registerSearchData('ReloadWeapon', '', 'API/ShooterGame/Weapons/AShooterWeapon/ReloadWeapon/index.html', '[server] performs actual reload', 0x00140010n);
registerSearchData('ClientStartReload', '', 'API/ShooterGame/Weapons/AShooterWeapon/ClientStartReload/index.html', 'trigger reload from server', 0x20100010n);
registerSearchData('CanFire', '', 'API/ShooterGame/Weapons/AShooterWeapon/CanFire/index.html', 'check if weapon can fire', 0x00900010n);
registerSearchData('CanReload', '', 'API/ShooterGame/Weapons/AShooterWeapon/CanReload/index.html', 'check if weapon can be reloaded', 0x00900010n);
registerSearchData('GetCurrentState', '', 'API/ShooterGame/Weapons/AShooterWeapon/GetCurrentState/index.html', 'get current weapon state', 0x00900010n);
registerSearchData('GetCurrentAmmo', '', 'API/ShooterGame/Weapons/AShooterWeapon/GetCurrentAmmo/index.html', 'get current ammo amount (total)', 0x00900010n);
registerSearchData('GetCurrentAmmoInClip', '', 'API/ShooterGame/Weapons/AShooterWeapon/GetCurrentAmmoInClip/index.html', 'get current ammo amount (clip)', 0x00900010n);
registerSearchData('GetAmmoPerClip', '', 'API/ShooterGame/Weapons/AShooterWeapon/GetAmmoPerClip/index.html', 'get clip size', 0x00900010n);
registerSearchData('GetMaxAmmo', '', 'API/ShooterGame/Weapons/AShooterWeapon/GetMaxAmmo/index.html', 'get max ammo amount', 0x00900010n);
registerSearchData('GetWeaponMesh', '', 'API/ShooterGame/Weapons/AShooterWeapon/GetWeaponMesh/index.html', 'get weapon mesh (needs pawn owner to determine variant)', 0x00900010n);
registerSearchData('GetPawnOwner', '', 'API/ShooterGame/Weapons/AShooterWeapon/GetPawnOwner/index.html', 'get pawn owner', 0x20100010n);
registerSearchData('GetPawnOwner', 'Get Pawn Owner', 'BlueprintAPI/Game/Weapon/GetPawnOwner/index.html', 'get pawn owner', 0x20100040n);
registerSearchData('HasInfiniteAmmo', '', 'API/ShooterGame/Weapons/AShooterWeapon/HasInfiniteAmmo/index.html', 'check if weapon has infinite ammo (include owner\'s cheats)', 0x00900010n);
registerSearchData('HasInfiniteClip', '', 'API/ShooterGame/Weapons/AShooterWeapon/HasInfiniteClip/index.html', 'check if weapon has infinite clip (include owner\'s cheats)', 0x00900010n);
registerSearchData('SetOwningPawn', '', 'API/ShooterGame/Weapons/AShooterWeapon/SetOwningPawn/index.html', 'set the weapon\'s owning pawn', 0x00100010n);
registerSearchData('GetEquipStartedTime', '', 'API/ShooterGame/Weapons/AShooterWeapon/GetEquipStartedTime/index.html', 'gets last time when this weapon was switched to', 0x00900010n);
registerSearchData('GetEquipDuration', '', 'API/ShooterGame/Weapons/AShooterWeapon/GetEquipDuration/index.html', 'gets the duration of equipping weapon', 0x00900010n);
registerSearchData('ServerStartFire', '', 'API/ShooterGame/Weapons/AShooterWeapon/ServerStartFire/index.html', 'Input - server side', 0x20200010n);
registerSearchData('ServerStopFire', '', 'API/ShooterGame/Weapons/AShooterWeapon/ServerStopFire/index.html', '', 0x20200010n);
registerSearchData('ServerStartReload', '', 'API/ShooterGame/Weapons/AShooterWeapon/ServerStartReload/index.html', '', 0x20200010n);
registerSearchData('ServerStopReload', '', 'API/ShooterGame/Weapons/AShooterWeapon/ServerStopReload/index.html', '', 0x20200010n);
registerSearchData('OnRep_MyPawn', '', 'API/ShooterGame/Weapons/AShooterWeapon/OnRep_MyPawn/index.html', 'Replication & effects', 0x20200010n);
registerSearchData('OnRep_BurstCounter', '', 'API/ShooterGame/Weapons/AShooterWeapon/OnRep_BurstCounter/index.html', '', 0x20200010n);
registerSearchData('OnRep_Reload', '', 'API/ShooterGame/Weapons/AShooterWeapon/OnRep_Reload/index.html', '', 0x20200010n);
registerSearchData('SimulateWeaponFire', '', 'API/ShooterGame/Weapons/AShooterWeapon/SimulateWeaponFire/index.html', 'Called in network play to do the cosmetic fx for firing', 0x00240010n);
registerSearchData('StopSimulatingWeaponFire', '', 'API/ShooterGame/Weapons/AShooterWeapon/StopSimulatingWeaponFire/index.html', 'Called in network play to stop cosmetic fx (e.g. for a looping shot).', 0x00240010n);
registerSearchData('FireWeapon', '', 'API/ShooterGame/Weapons/AShooterWeapon/FireWeapon/index.html', '[local] weapon specific fire implementation', 0x00240010n);
registerSearchData('ServerHandleFiring', '', 'API/ShooterGame/Weapons/AShooterWeapon/ServerHandleFiring/index.html', '[server] fire & update ammo', 0x20200010n);
registerSearchData('HandleReFiring', '', 'API/ShooterGame/Weapons/AShooterWeapon/HandleReFiring/index.html', '[local + server] handle weapon refire, compensating for slack time if the timer can\'t sample fast enough', 0x00200010n);
registerSearchData('HandleFiring', '', 'API/ShooterGame/Weapons/AShooterWeapon/HandleFiring/index.html', '[local + server] handle weapon fire', 0x00200010n);
registerSearchData('OnBurstStarted', '', 'API/ShooterGame/Weapons/AShooterWeapon/OnBurstStarted/index.html', '[local + server] firing started', 0x00240010n);
registerSearchData('OnBurstFinished', '', 'API/ShooterGame/Weapons/AShooterWeapon/OnBurstFinished/index.html', '[local + server] firing finished', 0x00240010n);
registerSearchData('SetWeaponState', '', 'API/ShooterGame/Weapons/AShooterWeapon/SetWeaponState/index.html', 'update weapon state', 0x00200010n);
registerSearchData('DetermineWeaponState', '', 'API/ShooterGame/Weapons/AShooterWeapon/DetermineWeaponState/index.html', 'determine current weapon state', 0x00200010n);
registerSearchData('AttachMeshToPawn', '', 'API/ShooterGame/Weapons/AShooterWeapon/AttachMeshToPawn/index.html', 'attaches weapon mesh to pawn\'s mesh', 0x00200010n);
registerSearchData('DetachMeshFromPawn', '', 'API/ShooterGame/Weapons/AShooterWeapon/DetachMeshFromPawn/index.html', 'detaches weapon mesh from pawn', 0x00200010n);
registerSearchData('PlayWeaponSound', '', 'API/ShooterGame/Weapons/AShooterWeapon/PlayWeaponSound/index.html', 'play weapon sounds', 0x00200010n);
registerSearchData('PlayWeaponAnimation', '', 'API/ShooterGame/Weapons/AShooterWeapon/PlayWeaponAnimation/index.html', 'play weapon animations', 0x00200010n);
registerSearchData('StopWeaponAnimation', '', 'API/ShooterGame/Weapons/AShooterWeapon/StopWeaponAnimation/index.html', 'stop playing weapon animations', 0x00200010n);
registerSearchData('GetAdjustedAim', '', 'API/ShooterGame/Weapons/AShooterWeapon/GetAdjustedAim/index.html', 'Get the aim of the weapon, allowing for adjustments to be made by the weapon', 0x00a40010n);
registerSearchData('GetCameraAim', '', 'API/ShooterGame/Weapons/AShooterWeapon/GetCameraAim/index.html', 'Get the aim of the camera', 0x00a00010n);
registerSearchData('GetCameraDamageStartLocation', '', 'API/ShooterGame/Weapons/AShooterWeapon/GetCameraDamageStartLocation/index.html', 'get the originating location for camera damage', 0x00a00010n);
registerSearchData('GetMuzzleLocation', '', 'API/ShooterGame/Weapons/AShooterWeapon/GetMuzzleLocation/index.html', 'get the muzzle location of the weapon', 0x00a00010n);
registerSearchData('GetMuzzleDirection', '', 'API/ShooterGame/Weapons/AShooterWeapon/GetMuzzleDirection/index.html', 'get direction of weapon\'s muzzle', 0x00a00010n);
registerSearchData('WeaponTrace', '', 'API/ShooterGame/Weapons/AShooterWeapon/WeaponTrace/index.html', 'find hit', 0x00a00010n);
registerSearchData('GetMesh1P', '', 'API/ShooterGame/Weapons/AShooterWeapon/GetMesh1P/index.html', 'Returns Mesh1P subobject *', 0x00a00010n);
registerSearchData('GetMesh3P', '', 'API/ShooterGame/Weapons/AShooterWeapon/GetMesh3P/index.html', 'Returns Mesh3P subobject *', 0x00a00010n);
registerSearchData('PrimaryIcon', '', 'API/ShooterGame/Weapons/AShooterWeapon/PrimaryIcon/index.html', 'icon displayed on the HUD when weapon is equipped as primary', 0x40100020n);
registerSearchData('SecondaryIcon', '', 'API/ShooterGame/Weapons/AShooterWeapon/SecondaryIcon/index.html', 'icon displayed on the HUD when weapon is secondary', 0x40100020n);
registerSearchData('PrimaryClipIcon', '', 'API/ShooterGame/Weapons/AShooterWeapon/PrimaryClipIcon/index.html', 'bullet icon used to draw current clip (left side)', 0x40100020n);
registerSearchData('SecondaryClipIcon', '', 'API/ShooterGame/Weapons/AShooterWeapon/SecondaryClipIcon/index.html', 'bullet icon used to draw secondary clip (left side)', 0x40100020n);
registerSearchData('AmmoIconsCount', '', 'API/ShooterGame/Weapons/AShooterWeapon/AmmoIconsCount/index.html', 'how many icons to draw per clip', 0x40100020n);
registerSearchData('PrimaryClipIconOffset', '', 'API/ShooterGame/Weapons/AShooterWeapon/PrimaryClipIconOffset/index.html', 'defines spacing between primary ammo icons (left side)', 0x40100020n);
registerSearchData('SecondaryClipIconOffset', '', 'API/ShooterGame/Weapons/AShooterWeapon/SecondaryClipIconOffset/index.html', 'defines spacing between secondary ammo icons (left side)', 0x40100020n);
registerSearchData('Crosshair[5]', '', 'API/ShooterGame/Weapons/AShooterWeapon/Crosshair[5]/index.html', 'crosshair parts icons (left, top, right, bottom and center)', 0x40100020n);
registerSearchData('AimingCrosshair[5]', '', 'API/ShooterGame/Weapons/AShooterWeapon/AimingCrosshair[5]/index.html', 'crosshair parts icons when targeting (left, top, right, bottom and center)', 0x40100020n);
registerSearchData('UseLaserDot', '', 'API/ShooterGame/Weapons/AShooterWeapon/UseLaserDot/index.html', 'only use red colored center part of aiming crosshair', 0x40100020n);
registerSearchData('UseCustomCrosshair', '', 'API/ShooterGame/Weapons/AShooterWeapon/UseCustomCrosshair/index.html', 'false = default crosshair', 0x40100020n);
registerSearchData('UseCustomAimingCrosshair', '', 'API/ShooterGame/Weapons/AShooterWeapon/UseCustomAimingCrosshair/index.html', 'false = use custom one if set, otherwise default crosshair', 0x40100020n);
registerSearchData('bHideCrosshairWhileNotAiming', '', 'API/ShooterGame/Weapons/AShooterWeapon/bHideCrosshairWhileNotAiming/index.html', 'true - crosshair will not be shown unless aiming with the weapon', 0x40100020n);
registerSearchData('TimerIntervalAdjustment', '', 'API/ShooterGame/Weapons/AShooterWeapon/TimerIntervalAdjustment/index.html', 'Adjustment to handle frame rate affecting actual timer interval.', 0x40100020n);
registerSearchData('true', '', 'API/ShooterGame/Weapons/AShooterWeapon/true/index.html', 'Whether to allow automatic weapons to catch up with shorter refire cycles', 0x40100020n);
registerSearchData('MyPawn', '', 'API/ShooterGame/Weapons/AShooterWeapon/MyPawn/index.html', 'pawn owner', 0x40200020n);
registerSearchData('WeaponConfig', '', 'API/ShooterGame/Weapons/AShooterWeapon/WeaponConfig/index.html', 'weapon data', 0x40200020n);
registerSearchData('Mesh1P', '', 'API/ShooterGame/Weapons/AShooterWeapon/Mesh1P/index.html', 'weapon mesh: 1st person view', 0x40400020n);
registerSearchData('Mesh3P', '', 'API/ShooterGame/Weapons/AShooterWeapon/Mesh3P/index.html', 'weapon mesh: 3rd person view', 0x40400020n);
registerSearchData('FireAC', '', 'API/ShooterGame/Weapons/AShooterWeapon/FireAC/index.html', 'firing audio (bLoopedFireSound set)', 0x40200020n);
registerSearchData('MuzzleAttachPoint', '', 'API/ShooterGame/Weapons/AShooterWeapon/MuzzleAttachPoint/index.html', 'name of bone/socket for muzzle in weapon mesh', 0x40200020n);
registerSearchData('MuzzleFX', '', 'API/ShooterGame/Weapons/AShooterWeapon/MuzzleFX/index.html', 'FX for muzzle flash', 0x40200020n);
registerSearchData('MuzzlePSC', '', 'API/ShooterGame/Weapons/AShooterWeapon/MuzzlePSC/index.html', 'spawned component for muzzle FX', 0x40200020n);
registerSearchData('MuzzlePSCSecondary', '', 'API/ShooterGame/Weapons/AShooterWeapon/MuzzlePSCSecondary/index.html', 'spawned component for second muzzle FX (Needed for split screen)', 0x40200020n);
registerSearchData('FireCameraShake', '', 'API/ShooterGame/Weapons/AShooterWeapon/FireCameraShake/index.html', 'camera shake on firing', 0x40200020n);
registerSearchData('FireForceFeedback', '', 'API/ShooterGame/Weapons/AShooterWeapon/FireForceFeedback/index.html', 'force feedback effect to play when the weapon is fired', 0x40200020n);
registerSearchData('FireSound', '', 'API/ShooterGame/Weapons/AShooterWeapon/FireSound/index.html', 'single fire sound (bLoopedFireSound not set)', 0x40200020n);
registerSearchData('FireLoopSound', '', 'API/ShooterGame/Weapons/AShooterWeapon/FireLoopSound/index.html', 'looped fire sound (bLoopedFireSound set)', 0x40200020n);
registerSearchData('FireFinishSound', '', 'API/ShooterGame/Weapons/AShooterWeapon/FireFinishSound/index.html', 'finished burst sound (bLoopedFireSound set)', 0x40200020n);
registerSearchData('OutOfAmmoSound', '', 'API/ShooterGame/Weapons/AShooterWeapon/OutOfAmmoSound/index.html', 'out of ammo sound', 0x40200020n);
registerSearchData('ReloadSound', '', 'API/ShooterGame/Weapons/AShooterWeapon/ReloadSound/index.html', 'reload sound', 0x40200020n);
registerSearchData('ReloadAnim', '', 'API/ShooterGame/Weapons/AShooterWeapon/ReloadAnim/index.html', 'reload animations', 0x40200020n);
registerSearchData('EquipSound', '', 'API/ShooterGame/Weapons/AShooterWeapon/EquipSound/index.html', 'equip sound', 0x40200020n);
registerSearchData('EquipAnim', '', 'API/ShooterGame/Weapons/AShooterWeapon/EquipAnim/index.html', 'equip animations', 0x40200020n);
registerSearchData('FireAnim', '', 'API/ShooterGame/Weapons/AShooterWeapon/FireAnim/index.html', 'fire animations', 0x40200020n);
registerSearchData('bLoopedMuzzleFX', '', 'API/ShooterGame/Weapons/AShooterWeapon/bLoopedMuzzleFX/index.html', 'is muzzle FX looped?', 0x40200020n);
registerSearchData('bLoopedFireSound', '', 'API/ShooterGame/Weapons/AShooterWeapon/bLoopedFireSound/index.html', 'is fire sound looped?', 0x40200020n);
registerSearchData('bLoopedFireAnim', '', 'API/ShooterGame/Weapons/AShooterWeapon/bLoopedFireAnim/index.html', 'is fire animation looped?', 0x40200020n);
registerSearchData('bPlayingFireAnim', '', 'API/ShooterGame/Weapons/AShooterWeapon/bPlayingFireAnim/index.html', 'is fire animation playing?', 0x00200020n);
registerSearchData('bIsEquipped', '', 'API/ShooterGame/Weapons/AShooterWeapon/bIsEquipped/index.html', 'is weapon currently equipped?', 0x00200020n);
registerSearchData('bWantsToFire', '', 'API/ShooterGame/Weapons/AShooterWeapon/bWantsToFire/index.html', 'is weapon fire active?', 0x00200020n);
registerSearchData('bPendingReload', '', 'API/ShooterGame/Weapons/AShooterWeapon/bPendingReload/index.html', 'is reload animation playing?', 0x40200020n);
registerSearchData('bPendingEquip', '', 'API/ShooterGame/Weapons/AShooterWeapon/bPendingEquip/index.html', 'is equip animation playing?', 0x00200020n);
registerSearchData('bRefiring', '', 'API/ShooterGame/Weapons/AShooterWeapon/bRefiring/index.html', 'weapon is refiring', 0x00200020n);
registerSearchData('CurrentState', '', 'API/ShooterGame/Weapons/AShooterWeapon/CurrentState/index.html', 'current weapon state', 0x00200020n);
registerSearchData('LastFireTime', '', 'API/ShooterGame/Weapons/AShooterWeapon/LastFireTime/index.html', 'time of last successful weapon fire', 0x00200020n);
registerSearchData('EquipStartedTime', '', 'API/ShooterGame/Weapons/AShooterWeapon/EquipStartedTime/index.html', 'last time when this weapon was switched to', 0x00200020n);
registerSearchData('EquipDuration', '', 'API/ShooterGame/Weapons/AShooterWeapon/EquipDuration/index.html', 'how much time weapon needs to be equipped', 0x00200020n);
registerSearchData('CurrentAmmo', '', 'API/ShooterGame/Weapons/AShooterWeapon/CurrentAmmo/index.html', 'current total ammo', 0x40200020n);
registerSearchData('CurrentAmmoInClip', '', 'API/ShooterGame/Weapons/AShooterWeapon/CurrentAmmoInClip/index.html', 'current ammo - inside clip', 0x40200020n);
registerSearchData('BurstCounter', '', 'API/ShooterGame/Weapons/AShooterWeapon/BurstCounter/index.html', 'burst counter, used for replicating fire events to remote clients', 0x40200020n);
registerSearchData('TimerHandle_OnEquipFinished', '', 'API/ShooterGame/Weapons/AShooterWeapon/TimerHandle_OnEquipFinished/index.html', 'Handle for efficient management of OnEquipFinished timer', 0x00200020n);
registerSearchData('TimerHandle_StopReload', '', 'API/ShooterGame/Weapons/AShooterWeapon/TimerHandle_StopReload/index.html', 'Handle for efficient management of StopReload timer', 0x00200020n);
registerSearchData('TimerHandle_ReloadWeapon', '', 'API/ShooterGame/Weapons/AShooterWeapon/TimerHandle_ReloadWeapon/index.html', 'Handle for efficient management of ReloadWeapon timer', 0x00200020n);
registerSearchData('TimerHandle_HandleFiring', '', 'API/ShooterGame/Weapons/AShooterWeapon/TimerHandle_HandleFiring/index.html', 'Handle for efficient management of HandleFiring timer', 0x00200020n);
registerSearchData('', '', 'API/ShooterGame/Weapons/AShooterWeapon//index.html', '', 0x00200020n);
registerSearchData('FProjectileWeaponData', '', 'API/ShooterGame/Weapons/FProjectileWeaponData/index.html', '', 0x08000002n);
registerSearchData('FProjectileWeaponData', '', 'API/ShooterGame/Weapons/FProjectileWeaponData/FProjectileWeaponData/index.html', 'defaults', 0x80100010n);
registerSearchData('ProjectileClass', '', 'API/ShooterGame/Weapons/FProjectileWeaponData/ProjectileClass/index.html', 'projectile class', 0x40100020n);
registerSearchData('ProjectileLife', '', 'API/ShooterGame/Weapons/FProjectileWeaponData/ProjectileLife/index.html', 'life time', 0x40100020n);
registerSearchData('ExplosionDamage', '', 'API/ShooterGame/Weapons/FProjectileWeaponData/ExplosionDamage/index.html', 'damage at impact point', 0x40100020n);
registerSearchData('ExplosionRadius', '', 'API/ShooterGame/Weapons/FProjectileWeaponData/ExplosionRadius/index.html', 'radius of damage', 0x40100020n);
registerSearchData('DamageType', '', 'API/ShooterGame/Weapons/FProjectileWeaponData/DamageType/index.html', 'type of damage', 0x40100020n);
registerSearchData('AShooterWeapon_Projectile', '', 'API/ShooterGame/Weapons/AShooterWeapon_Projectile/index.html', 'A weapon that fires a visible projectile', 0x04000001n);
registerSearchData('ApplyWeaponConfig', '', 'API/ShooterGame/Weapons/AShooterWeapon_Projectile/ApplyWeaponConfig/index.html', 'apply config on projectile', 0x00100010n);
registerSearchData('GetAmmoType', '', 'API/ShooterGame/Weapons/AShooterWeapon_Projectile/GetAmmoType/index.html', '', 0x00a40010n);
registerSearchData('FireWeapon', '', 'API/ShooterGame/Weapons/AShooterWeapon_Projectile/FireWeapon/index.html', '[local] weapon specific fire implementation', 0x00240010n);
registerSearchData('ServerFireProjectile', '', 'API/ShooterGame/Weapons/AShooterWeapon_Projectile/ServerFireProjectile/index.html', 'spawn projectile on server', 0x20200010n);
registerSearchData('ProjectileConfig', '', 'API/ShooterGame/Weapons/AShooterWeapon_Projectile/ProjectileConfig/index.html', 'weapon config', 0x40200020n);
registerSearchData('AShooterProjectile', '', 'API/ShooterGame/Weapons/AShooterProjectile/index.html', '%UCLASS%(Abstract, Blueprintable)', 0x00000001n);
registerSearchData('PostInitializeComponents', '', 'API/ShooterGame/Weapons/AShooterProjectile/PostInitializeComponents/index.html', 'initial setup', 0x00140010n);
registerSearchData('InitVelocity', '', 'API/ShooterGame/Weapons/AShooterProjectile/InitVelocity/index.html', 'setup velocity', 0x00100010n);
registerSearchData('OnImpact', '', 'API/ShooterGame/Weapons/AShooterProjectile/OnImpact/index.html', 'handle hit', 0x00100010n);
registerSearchData('MovementComp', '', 'API/ShooterGame/Weapons/AShooterProjectile/MovementComp/index.html', 'movement component', 0x00400010n);
registerSearchData('CollisionComp', '', 'API/ShooterGame/Weapons/AShooterProjectile/CollisionComp/index.html', 'collisions', 0x00400010n);
registerSearchData('ParticleComp', '', 'API/ShooterGame/Weapons/AShooterProjectile/ParticleComp/index.html', '', 0x00400010n);
registerSearchData('ExplosionTemplate', '', 'API/ShooterGame/Weapons/AShooterProjectile/ExplosionTemplate/index.html', 'effects for explosion', 0x00200010n);
registerSearchData('bExploded', '', 'API/ShooterGame/Weapons/AShooterProjectile/bExploded/index.html', 'did it explode?', 0x00200010n);
registerSearchData('OnRep_Exploded', '', 'API/ShooterGame/Weapons/AShooterProjectile/OnRep_Exploded/index.html', '[client] explosion happened', 0x00200010n);
registerSearchData('Explode', '', 'API/ShooterGame/Weapons/AShooterProjectile/Explode/index.html', 'trigger explosion', 0x00200010n);
registerSearchData('DisableAndDestroy', '', 'API/ShooterGame/Weapons/AShooterProjectile/DisableAndDestroy/index.html', 'shutdown projectile and prepare for destruction', 0x00200010n);
registerSearchData('PostNetReceiveVelocity', '', 'API/ShooterGame/Weapons/AShooterProjectile/PostNetReceiveVelocity/index.html', 'update velocity on client', 0x00240010n);
registerSearchData('GetMovementComp', '', 'API/ShooterGame/Weapons/AShooterProjectile/GetMovementComp/index.html', 'Returns MovementComp subobject *', 0x00a00010n);
registerSearchData('GetCollisionComp', '', 'API/ShooterGame/Weapons/AShooterProjectile/GetCollisionComp/index.html', 'Returns CollisionComp subobject *', 0x00a00010n);
registerSearchData('GetParticleComp', '', 'API/ShooterGame/Weapons/AShooterProjectile/GetParticleComp/index.html', 'Returns ParticleComp subobject *', 0x00a00010n);
registerSearchData('MyController', '', 'API/ShooterGame/Weapons/AShooterProjectile/MyController/index.html', 'controller that fired me (cache for damage calculations)', 0x00200020n);
registerSearchData('FInstantHitInfo', '', 'API/ShooterGame/Weapons/FInstantHitInfo/index.html', 'Copyright 1998-2019 Epic Games, Inc. All Rights Reserved.', 0x08000002n);
registerSearchData('Origin', '', 'API/ShooterGame/Weapons/FInstantHitInfo/Origin/index.html', '', 0x40100020n);
registerSearchData('ReticleSpread', '', 'API/ShooterGame/Weapons/FInstantHitInfo/ReticleSpread/index.html', '', 0x40100020n);
registerSearchData('RandomSeed', '', 'API/ShooterGame/Weapons/FInstantHitInfo/RandomSeed/index.html', '', 0x40100020n);
registerSearchData('FInstantWeaponData', '', 'API/ShooterGame/Weapons/FInstantWeaponData/index.html', '', 0x08000002n);
registerSearchData('FInstantWeaponData', '', 'API/ShooterGame/Weapons/FInstantWeaponData/FInstantWeaponData/index.html', 'defaults', 0x80100010n);
registerSearchData('WeaponSpread', '', 'API/ShooterGame/Weapons/FInstantWeaponData/WeaponSpread/index.html', 'base weapon spread (degrees)', 0x40100020n);
registerSearchData('TargetingSpreadMod', '', 'API/ShooterGame/Weapons/FInstantWeaponData/TargetingSpreadMod/index.html', 'targeting spread modifier', 0x40100020n);
registerSearchData('FiringSpreadIncrement', '', 'API/ShooterGame/Weapons/FInstantWeaponData/FiringSpreadIncrement/index.html', 'continuous firing: spread increment', 0x40100020n);
registerSearchData('FiringSpreadMax', '', 'API/ShooterGame/Weapons/FInstantWeaponData/FiringSpreadMax/index.html', 'continuous firing: max increment', 0x40100020n);
registerSearchData('WeaponRange', '', 'API/ShooterGame/Weapons/FInstantWeaponData/WeaponRange/index.html', 'weapon range', 0x40100020n);
registerSearchData('HitDamage', '', 'API/ShooterGame/Weapons/FInstantWeaponData/HitDamage/index.html', 'damage amount', 0x40100020n);
registerSearchData('DamageType', '', 'API/ShooterGame/Weapons/FInstantWeaponData/DamageType/index.html', 'type of damage', 0x40100020n);
registerSearchData('ClientSideHitLeeway', '', 'API/ShooterGame/Weapons/FInstantWeaponData/ClientSideHitLeeway/index.html', 'hit verification: scale for bounding box of hit actor', 0x40100020n);
registerSearchData('AllowedViewDotHitDir', '', 'API/ShooterGame/Weapons/FInstantWeaponData/AllowedViewDotHitDir/index.html', 'hit verification: threshold for dot product between view direction and hit direction', 0x40100020n);
registerSearchData('AShooterWeapon_Instant', '', 'API/ShooterGame/Weapons/AShooterWeapon_Instant/index.html', 'A weapon where the damage impact occurs instantly upon firing', 0x04000001n);
registerSearchData('GetCurrentSpread', '', 'API/ShooterGame/Weapons/AShooterWeapon_Instant/GetCurrentSpread/index.html', 'get current spread', 0x00900010n);
registerSearchData('GetAmmoType', '', 'API/ShooterGame/Weapons/AShooterWeapon_Instant/GetAmmoType/index.html', '', 0x00a40010n);
registerSearchData('ServerNotifyHit', '', 'API/ShooterGame/Weapons/AShooterWeapon_Instant/ServerNotifyHit/index.html', 'server notified of hit from client to verify', 0x20200010n);
registerSearchData('ServerNotifyMiss', '', 'API/ShooterGame/Weapons/AShooterWeapon_Instant/ServerNotifyMiss/index.html', 'server notified of miss to show trail FX', 0x20200010n);
registerSearchData('ProcessInstantHit', '', 'API/ShooterGame/Weapons/AShooterWeapon_Instant/ProcessInstantHit/index.html', 'process the instant hit and notify the server if necessary', 0x00200010n);
registerSearchData('ProcessInstantHit_Confirmed', '', 'API/ShooterGame/Weapons/AShooterWeapon_Instant/ProcessInstantHit_Confirmed/index.html', 'continue processing the instant hit, as if it has been confirmed by the server', 0x00200010n);
registerSearchData('ShouldDealDamage', '', 'API/ShooterGame/Weapons/AShooterWeapon_Instant/ShouldDealDamage/index.html', 'check if weapon should deal damage to actor', 0x00a00010n);
registerSearchData('DealDamage', '', 'API/ShooterGame/Weapons/AShooterWeapon_Instant/DealDamage/index.html', 'handle damage', 0x00200010n);
registerSearchData('FireWeapon', '', 'API/ShooterGame/Weapons/AShooterWeapon_Instant/FireWeapon/index.html', '[local] weapon specific fire implementation', 0x00240010n);
registerSearchData('OnBurstFinished', '', 'API/ShooterGame/Weapons/AShooterWeapon_Instant/OnBurstFinished/index.html', '[local + server] update spread on firing', 0x00240010n);
registerSearchData('OnRep_HitNotify', '', 'API/ShooterGame/Weapons/AShooterWeapon_Instant/OnRep_HitNotify/index.html', 'Effects replication', 0x20200010n);
registerSearchData('SimulateInstantHit', '', 'API/ShooterGame/Weapons/AShooterWeapon_Instant/SimulateInstantHit/index.html', 'called in network play to do the cosmetic fx', 0x00200010n);
registerSearchData('SpawnImpactEffects', '', 'API/ShooterGame/Weapons/AShooterWeapon_Instant/SpawnImpactEffects/index.html', 'spawn effects for impact', 0x00200010n);
registerSearchData('SpawnTrailEffect', '', 'API/ShooterGame/Weapons/AShooterWeapon_Instant/SpawnTrailEffect/index.html', 'spawn trail effect', 0x00200010n);
registerSearchData('InstantConfig', '', 'API/ShooterGame/Weapons/AShooterWeapon_Instant/InstantConfig/index.html', 'weapon config', 0x40200020n);
registerSearchData('ImpactTemplate', '', 'API/ShooterGame/Weapons/AShooterWeapon_Instant/ImpactTemplate/index.html', 'impact effects', 0x40200020n);
registerSearchData('TrailFX', '', 'API/ShooterGame/Weapons/AShooterWeapon_Instant/TrailFX/index.html', 'smoke trail', 0x40200020n);
registerSearchData('TrailTargetParam', '', 'API/ShooterGame/Weapons/AShooterWeapon_Instant/TrailTargetParam/index.html', 'param name for beam target in smoke trail', 0x40200020n);
registerSearchData('HitNotify', '', 'API/ShooterGame/Weapons/AShooterWeapon_Instant/HitNotify/index.html', 'instant hit notify for replication', 0x40200020n);
registerSearchData('CurrentFiringSpread', '', 'API/ShooterGame/Weapons/AShooterWeapon_Instant/CurrentFiringSpread/index.html', 'current spread from continuous firing', 0x00200020n);
registerSearchData('IShooterGameLoadingScreenModule', '', 'API/ShooterGameLoadingScreen/IShooterGameLoadingScreenModule/index.html', 'Module interface for this game\'s loading screens', 0x00000001n);
registerSearchData('StartInGameLoadingScreen', '', 'API/ShooterGameLoadingScreen/IShooterGameLoadingScreenModule/StartInGameLoadingScreen/index.html', 'Kicks off the loading screen for in game loading (not startup)', 0x00140010n);
registerSearchData('Type', '', 'API/ShooterGame/Weapons/Type/index.html', '', 0x00000008n);
registerSearchData('EShooterPhysMaterialType', '', 'API/ShooterGame/EShooterPhysMaterialType/index.html', 'keep in sync with ShooterImpactEffect', 0x10000008n);
registerSearchData('EClassRepNodeMapping', '', 'API/ShooterGame/Online/EClassRepNodeMapping/index.html', 'This is the main enum we use to route actors to the right replication node. Each class maps to one enum.', 0x10000008n);
registerSearchData('EStoreState', '', 'API/ShooterGame/UI/Menu/Widgets/EStoreState/index.html', '', 0x00000008n);
registerSearchData('EOnlineMode', '', 'API/ShooterGame/EOnlineMode/index.html', '', 0x10000008n);
registerSearchData('EMap', '', 'API/ShooterGame/UI/Menu/EMap/index.html', '', 0x00000008n);
registerSearchData('EMatchType', '', 'API/ShooterGame/UI/Menu/EMatchType/index.html', '', 0x00000008n);
registerSearchData('EAmmoType', '', 'API/ShooterGame/Weapons/EAmmoType/index.html', 'Ammo', 0x00000008n);
registerSearchData('EShooterMatchState', '', 'API/ShooterGame/EShooterMatchState/index.html', 'Copyright 1998-2019 Epic Games, Inc. All Rights Reserved.', 0x00000004n);
registerSearchData('EShooterCrosshairDirection', '', 'API/ShooterGame/EShooterCrosshairDirection/index.html', '', 0x00000004n);
registerSearchData('EShooterHudPosition', '', 'API/ShooterGame/EShooterHudPosition/index.html', '', 0x00000004n);
registerSearchData('EShooterDialogType', '', 'API/ShooterGame/EShooterDialogType/index.html', '', 0x00000004n);
registerSearchData('EShooterMenuItemType', '', 'API/ShooterGame/UI/Menu/Widgets/EShooterMenuItemType/index.html', '', 0x00000004n);
registerSearchData('MenuHelper', '', 'API/ShooterGame/UI/Menu/Widgets/MenuHelper/index.html', '', 0x00000004n);
registerSearchData('EnsureValid', '', 'API/ShooterGame/UI/Menu/Widgets/MenuHelper/EnsureValid/index.html', '', 0x00100010n);
registerSearchData('AddMenuItem', '', 'API/ShooterGame/UI/Menu/Widgets/MenuHelper/AddMenuItem/index.html', 'Helper functions for creating menu items', 0x00100010n);
registerSearchData('AddMenuItem', '', 'API/ShooterGame/UI/Menu/Widgets/MenuHelper/AddMenuItem-2-0/index.html', 'add standard item to menu with UObject delegate', 0x02100010n);
registerSearchData('AddMenuItemSP', '', 'API/ShooterGame/UI/Menu/Widgets/MenuHelper/AddMenuItemSP/index.html', 'add standard item to menu with TSharedPtr delegate', 0x02100010n);
registerSearchData('AddMenuOption', '', 'API/ShooterGame/UI/Menu/Widgets/MenuHelper/AddMenuOption/index.html', '', 0x00100010n);
registerSearchData('AddMenuOption', '', 'API/ShooterGame/UI/Menu/Widgets/MenuHelper/AddMenuOption-2-1/index.html', 'add multi-choice item to menu with UObject delegate', 0x02100010n);
registerSearchData('AddMenuOptionSP', '', 'API/ShooterGame/UI/Menu/Widgets/MenuHelper/AddMenuOptionSP/index.html', 'add multi-choice item to menu with TSharedPtr delegate', 0x02100010n);
registerSearchData('AddExistingMenuItem', '', 'API/ShooterGame/UI/Menu/Widgets/MenuHelper/AddExistingMenuItem/index.html', '', 0x00100010n);
registerSearchData('AddCustomMenuItem', '', 'API/ShooterGame/UI/Menu/Widgets/MenuHelper/AddCustomMenuItem/index.html', '', 0x00100010n);
registerSearchData('ClearSubMenu', '', 'API/ShooterGame/UI/Menu/Widgets/MenuHelper/ClearSubMenu/index.html', '', 0x00100010n);
registerSearchData('PlaySoundAndCall', '', 'API/ShooterGame/UI/Menu/Widgets/MenuHelper/PlaySoundAndCall/index.html', '', 0x02100010n);
registerSearchData('ShooterGameInstanceState', '', 'API/ShooterGame/ShooterGameInstanceState/index.html', 'Copyright 1998-2019 Epic Games, Inc. All Rights Reserved.', 0x00000004n);
registerSearchData('None', '', 'API/ShooterGame/ShooterGameInstanceState/None/index.html', '', 0x00900020n);
registerSearchData('PendingInvite', '', 'API/ShooterGame/ShooterGameInstanceState/PendingInvite/index.html', '', 0x00900020n);
registerSearchData('WelcomeScreen', '', 'API/ShooterGame/ShooterGameInstanceState/WelcomeScreen/index.html', '', 0x00900020n);
registerSearchData('MainMenu', '', 'API/ShooterGame/ShooterGameInstanceState/MainMenu/index.html', '', 0x00900020n);
registerSearchData('MessageMenu', '', 'API/ShooterGame/ShooterGameInstanceState/MessageMenu/index.html', '', 0x00900020n);
registerSearchData('Playing', '', 'API/ShooterGame/ShooterGameInstanceState/Playing/index.html', '', 0x00900020n);
registerSearchData('SpecialPlayerIndex', '', 'API/ShooterGame/UI/Widgets/SpecialPlayerIndex/index.html', '', 0x00000004n);
registerSearchData('All', '', 'API/ShooterGame/UI/Widgets/SpecialPlayerIndex/All/index.html', '', 0x00900020n);
registerSearchData('EWeaponState', '', 'API/ShooterGame/Weapons/EWeaponState/index.html', 'for FCanvasIcon', 0x00000004n);
registerSearchData('ShooterGame', '', 'API/ShooterGame/index.html', '', 0x00002000n);
registerSearchData('ShooterGameLoadingScreen', '', 'API/ShooterGameLoadingScreen/index.html', '', 0x00002000n);
registerSearchData('Online', '', 'API/ShooterGame/Online/index.html', '', 0x00004000n);
registerSearchData('UI', '', 'API/ShooterGame/UI/index.html', '', 0x00004000n);
registerSearchData('Player', '', 'API/ShooterGame/Player/index.html', '', 0x00004000n);
registerSearchData('Menu', '', 'API/ShooterGame/UI/Menu/index.html', '', 0x00004000n);
registerSearchData('Widgets', '', 'API/ShooterGame/UI/Menu/Widgets/index.html', '', 0x00004000n);
registerSearchData('Widgets', '', 'API/ShooterGame/UI/Widgets/index.html', '', 0x00004000n);
registerSearchData('Style', '', 'API/ShooterGame/UI/Style/index.html', '', 0x00004000n);
registerSearchData('Bots', '', 'API/ShooterGame/Bots/index.html', '', 0x00004000n);
registerSearchData('Effects', '', 'API/ShooterGame/Effects/index.html', '', 0x00004000n);
registerSearchData('Pickups', '', 'API/ShooterGame/Pickups/index.html', '', 0x00004000n);
registerSearchData('Sound', '', 'API/ShooterGame/Sound/index.html', '', 0x00004000n);
registerSearchData('Tests', '', 'API/ShooterGame/Tests/index.html', '', 0x00004000n);
registerSearchData('Weapons', '', 'API/ShooterGame/Weapons/index.html', '', 0x00004000n);
registerSearchData('Game', '', 'BlueprintAPI/Game/index.html', '', 0x00008000n);
registerSearchData('Weapon', '', 'BlueprintAPI/Game/Weapon/index.html', '', 0x00008000n);
registerSearchData('Pawn', '', 'BlueprintAPI/Pawn/index.html', '', 0x00008000n);
registerSearchData('Mesh', '', 'BlueprintAPI/Mesh/index.html', '', 0x00008000n);
registerSearchData('Input', '', 'BlueprintAPI/Input/index.html', '', 0x00008000n);
registerSearchData('Behavior', '', 'BlueprintAPI/Behavior/index.html', '', 0x00008000n);
registerSearchData('WeapGun_FireCameraShake', '', 'ContentAPI/Game/Blueprints/Weapons/WeapGun_FireCameraShake/index.html', '', 0x00000080n);
registerSearchData('WeapGun_Impacts', '', 'ContentAPI/Game/Blueprints/Weapons/WeapGun_Impacts/index.html', '', 0x00000080n);
registerSearchData('UserConstructionScript', 'User Construction Script', 'ContentAPI/Game/Blueprints/Weapons/WeapGun_Impacts/UserConstructionScript/index.html', '', 0x00140800n);
registerSearchData('DmgType_Instant', '', 'ContentAPI/Game/DmgType_Instant/index.html', '', 0x00000080n);
registerSearchData('WeapGun', '', 'ContentAPI/Game/Blueprints/Weapons/WeapGun/index.html', '', 0x00000080n);
registerSearchData('UserConstructionScript', 'User Construction Script', 'ContentAPI/Game/Blueprints/Weapons/WeapGun/UserConstructionScript/index.html', '', 0x00140800n);
registerSearchData('ProjRocket_Explosion', '', 'ContentAPI/Game/Blueprints/Weapons/ProjRocket_Explosion/index.html', '', 0x00000080n);
registerSearchData('UserConstructionScript', 'User Construction Script', 'ContentAPI/Game/Blueprints/Weapons/ProjRocket_Explosion/UserConstructionScript/index.html', '', 0x00140800n);
registerSearchData('ProjRocket', '', 'ContentAPI/Game/Blueprints/Weapons/ProjRocket/index.html', '', 0x00000080n);
registerSearchData('OnTakeAnyDamage_Event', '', 'ContentAPI/Game/Blueprints/Weapons/ProjRocket/OnTakeAnyDamage_Event/index.html', '', 0x00000400n);
registerSearchData('UserConstructionScript', 'User Construction Script', 'ContentAPI/Game/Blueprints/Weapons/ProjRocket/UserConstructionScript/index.html', '', 0x00140800n);
registerSearchData('WeapLauncher_FireCameraShake', '', 'ContentAPI/Game/Blueprints/Weapons/WeapLauncher_FireCameraShake/index.html', '', 0x00000080n);
registerSearchData('DmgType_Explosion', '', 'ContentAPI/Game/DmgType_Explosion/index.html', '', 0x00000080n);
registerSearchData('WeapLauncher', '', 'ContentAPI/Game/Blueprints/Weapons/WeapLauncher/index.html', '', 0x00000080n);
registerSearchData('UserConstructionScript', 'User Construction Script', 'ContentAPI/Game/Blueprints/Weapons/WeapLauncher/UserConstructionScript/index.html', '', 0x00140800n);
registerSearchData('PlayerPawn', '', 'ContentAPI/Game/Blueprints/Pawns/PlayerPawn/index.html', '', 0x00000080n);
registerSearchData('UserConstructionScript', 'User Construction Script', 'ContentAPI/Game/Blueprints/Pawns/PlayerPawn/UserConstructionScript/index.html', '', 0x00140800n);
registerSearchData('BotSearchEnemyLOS', '', 'ContentAPI/Game/Blueprints/Pawns/BotSearchEnemyLOS/index.html', '', 0x00000080n);
registerSearchData('ReceiveTick', '', 'ContentAPI/Game/Blueprints/Pawns/BotSearchEnemyLOS/ReceiveTick/index.html', '', 0x00000400n);
registerSearchData('BotShootEnemy', '', 'ContentAPI/Game/Blueprints/Pawns/BotShootEnemy/index.html', '', 0x00000080n);
registerSearchData('ReceiveTick', '', 'ContentAPI/Game/Blueprints/Pawns/BotShootEnemy/ReceiveTick/index.html', '', 0x00000400n);
registerSearchData('TaskAlwaysTrue', '', 'ContentAPI/Game/Blueprints/TaskAlwaysTrue/index.html', '', 0x00000080n);
registerSearchData('ReceiveExecute', '', 'ContentAPI/Game/Blueprints/TaskAlwaysTrue/ReceiveExecute/index.html', '', 0x00000400n);
registerSearchData('BotPawn', '', 'ContentAPI/Game/Blueprints/Pawns/BotPawn/index.html', '', 0x00000080n);
registerSearchData('UserConstructionScript', 'User Construction Script', 'ContentAPI/Game/Blueprints/Pawns/BotPawn/UserConstructionScript/index.html', '', 0x00140800n);
registerSearchData('HeroFPP_AnimationBlueprint', '', 'ContentAPI/Game/Characters/HeroFPP/HeroFPP_AnimationBlueprint/index.html', '', 0x00000080n);
registerSearchData('BlueprintUpdateAnimation', '', 'ContentAPI/Game/Characters/HeroFPP/HeroFPP_AnimationBlueprint/BlueprintUpdateAnimation/index.html', '', 0x00000400n);
registerSearchData('IsJumping', 'Is Jumping', 'ContentAPI/Game/Characters/HeroFPP/HeroFPP_AnimationBlueprint/IsJumping/index.html', '', 0x00101000n);
registerSearchData('IsRifle', 'Is Rifle', 'ContentAPI/Game/Characters/HeroFPP/HeroFPP_AnimationBlueprint/IsRifle/index.html', '', 0x00101000n);
registerSearchData('IsRunning', 'Is Running', 'ContentAPI/Game/Characters/HeroFPP/HeroFPP_AnimationBlueprint/IsRunning/index.html', '', 0x00101000n);
registerSearchData('IsTargeting', 'Is Targeting', 'ContentAPI/Game/Characters/HeroFPP/HeroFPP_AnimationBlueprint/IsTargeting/index.html', '', 0x00101000n);
registerSearchData('JumpTime', 'Jump Time', 'ContentAPI/Game/Characters/HeroFPP/HeroFPP_AnimationBlueprint/JumpTime/index.html', '', 0x00101000n);
registerSearchData('Speed', 'Speed', 'ContentAPI/Game/Characters/HeroFPP/HeroFPP_AnimationBlueprint/Speed/index.html', '', 0x00101000n);
registerSearchData('IsWalking', 'Is Walking', 'ContentAPI/Game/Characters/HeroFPP/HeroFPP_AnimationBlueprint/IsWalking/index.html', '', 0x00101000n);
registerSearchData('HeroTPP_AnimBlueprint', '', 'ContentAPI/Game/Characters/HeroTPP/HeroTPP_AnimBlueprint/index.html', '', 0x00000080n);
registerSearchData('BlueprintUpdateAnimation', '', 'ContentAPI/Game/Characters/HeroTPP/HeroTPP_AnimBlueprint/BlueprintUpdateAnimation/index.html', '', 0x00000400n);
registerSearchData('AimPitch', 'Aim Pitch', 'ContentAPI/Game/Characters/HeroTPP/HeroTPP_AnimBlueprint/AimPitch/index.html', '', 0x00101000n);
registerSearchData('AimYaw', 'Aim Yaw', 'ContentAPI/Game/Characters/HeroTPP/HeroTPP_AnimBlueprint/AimYaw/index.html', '', 0x00101000n);
registerSearchData('Speed', 'Speed', 'ContentAPI/Game/Characters/HeroTPP/HeroTPP_AnimBlueprint/Speed/index.html', '', 0x00101000n);
registerSearchData('Direction', 'Direction', 'ContentAPI/Game/Characters/HeroTPP/HeroTPP_AnimBlueprint/Direction/index.html', '', 0x00101000n);
registerSearchData('IsJumping', 'Is Jumping', 'ContentAPI/Game/Characters/HeroTPP/HeroTPP_AnimBlueprint/IsJumping/index.html', '', 0x00101000n);
registerSearchData('JumpTime', 'Jump Time', 'ContentAPI/Game/Characters/HeroTPP/HeroTPP_AnimBlueprint/JumpTime/index.html', '', 0x00101000n);
registerSearchData('IsRunning', 'Is Running', 'ContentAPI/Game/Characters/HeroTPP/HeroTPP_AnimBlueprint/IsRunning/index.html', '', 0x00101000n);
registerSearchData('EffectorTransform', 'Effector Transform', 'ContentAPI/Game/Characters/HeroTPP/HeroTPP_AnimBlueprint/EffectorTransform/index.html', '', 0x00101000n);
registerSearchData('BP_HoloController', '', 'ContentAPI/Game/Blueprints/Environment/BP_HoloController/index.html', '', 0x00000080n);
registerSearchData('ReceiveTick', '', 'ContentAPI/Game/Blueprints/Environment/BP_HoloController/ReceiveTick/index.html', '', 0x00000400n);
registerSearchData('ReactivateSound', '', 'ContentAPI/Game/Blueprints/Environment/BP_HoloController/ReactivateSound/index.html', '', 0x00000400n);
registerSearchData('UserConstructionScript', 'User Construction Script', 'ContentAPI/Game/Blueprints/Environment/BP_HoloController/UserConstructionScript/index.html', '', 0x00140800n);
registerSearchData('X', 'X', 'ContentAPI/Game/Blueprints/Environment/BP_HoloController/X/index.html', '', 0x00101000n);
registerSearchData('HoloPeriod', 'Holo Period', 'ContentAPI/Game/Blueprints/Environment/BP_HoloController/HoloPeriod/index.html', '', 0x00101000n);
registerSearchData('Holo_MID', 'Holo_MID', 'ContentAPI/Game/Blueprints/Environment/BP_HoloController/Holo_MID/index.html', '', 0x00101000n);
registerSearchData('Holo_SM', 'Holo_SM', 'ContentAPI/Game/Blueprints/Environment/BP_HoloController/Holo_SM/index.html', '', 0x00101000n);
registerSearchData('Holo_Mat', 'Holo_Mat', 'ContentAPI/Game/Blueprints/Environment/BP_HoloController/Holo_Mat/index.html', '', 0x00101000n);
registerSearchData('HoloSound', 'Holo Sound', 'ContentAPI/Game/Blueprints/Environment/BP_HoloController/HoloSound/index.html', '', 0x00101000n);
registerSearchData('Pickup_AmmoGun', '', 'ContentAPI/Game/Blueprints/Pickups/Pickup_AmmoGun/index.html', '', 0x00000080n);
registerSearchData('UserConstructionScript', 'User Construction Script', 'ContentAPI/Game/Blueprints/Pickups/Pickup_AmmoGun/UserConstructionScript/index.html', '', 0x00140800n);
registerSearchData('Pickup_AmmoLauncher', '', 'ContentAPI/Game/Blueprints/Pickups/Pickup_AmmoLauncher/index.html', '', 0x00000080n);
registerSearchData('UserConstructionScript', 'User Construction Script', 'ContentAPI/Game/Blueprints/Pickups/Pickup_AmmoLauncher/UserConstructionScript/index.html', '', 0x00140800n);
registerSearchData('Pickup_Health', '', 'ContentAPI/Game/Blueprints/Pickups/Pickup_Health/index.html', '', 0x00000080n);
registerSearchData('UserConstructionScript', 'User Construction Script', 'ContentAPI/Game/Blueprints/Pickups/Pickup_Health/UserConstructionScript/index.html', '', 0x00140800n);
