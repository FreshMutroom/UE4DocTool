//-------------------------------------------------------------
// Documentation created: Tue, 30 Jun 2020 21:15:03 GMT
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


registerSearchData('FActionButtonData', '', 'API/StrategyGame/FActionButtonData/index.html', '', 0x00000002n);
registerSearchData('FActionButtonData', '', 'API/StrategyGame/FActionButtonData/FActionButtonData/index.html', '', 0x80100010n);
registerSearchData('StrButtonText', '', 'API/StrategyGame/FActionButtonData/StrButtonText/index.html', '', 0x00100020n);
registerSearchData('StrTooltip', '', 'API/StrategyGame/FActionButtonData/StrTooltip/index.html', '', 0x00100020n);
registerSearchData('Visibility', '', 'API/StrategyGame/FActionButtonData/Visibility/index.html', '', 0x00100020n);
registerSearchData('bIsEnabled', '', 'API/StrategyGame/FActionButtonData/bIsEnabled/index.html', '', 0x00100020n);
registerSearchData('ActionCost', '', 'API/StrategyGame/FActionButtonData/ActionCost/index.html', '', 0x00100020n);
registerSearchData('ActionIcon', '', 'API/StrategyGame/FActionButtonData/ActionIcon/index.html', '', 0x00100020n);
registerSearchData('TriggerDelegate', '', 'API/StrategyGame/FActionButtonData/TriggerDelegate/index.html', '', 0x00100020n);
registerSearchData('GetQueueLengthDelegate', '', 'API/StrategyGame/FActionButtonData/GetQueueLengthDelegate/index.html', '', 0x00100020n);
registerSearchData('FActionButtonInfo', '', 'API/StrategyGame/FActionButtonInfo/index.html', '', 0x00000002n);
registerSearchData('Widget', '', 'API/StrategyGame/FActionButtonInfo/Widget/index.html', '', 0x00100020n);
registerSearchData('Data', '', 'API/StrategyGame/FActionButtonInfo/Data/index.html', '', 0x00100020n);
registerSearchData('FPawnData', '', 'API/StrategyGame/FPawnData/index.html', '', 0x08000002n);
registerSearchData('FPawnData', '', 'API/StrategyGame/FPawnData/FPawnData/index.html', 'defaults', 0x80100010n);
registerSearchData('AttackMin', '', 'API/StrategyGame/FPawnData/AttackMin/index.html', 'minimal attack damage', 0x40100020n);
registerSearchData('AttackMax', '', 'API/StrategyGame/FPawnData/AttackMax/index.html', 'maximum attack damage', 0x40100020n);
registerSearchData('AttackDistance', '', 'API/StrategyGame/FPawnData/AttackDistance/index.html', 'range of pawn attack', 0x40100020n);
registerSearchData('DamageReduction', '', 'API/StrategyGame/FPawnData/DamageReduction/index.html', 'damage reduction', 0x40100020n);
registerSearchData('MaxHealthBonus', '', 'API/StrategyGame/FPawnData/MaxHealthBonus/index.html', 'maximum health increase', 0x40100020n);
registerSearchData('HealthRegen', '', 'API/StrategyGame/FPawnData/HealthRegen/index.html', 'health change every 5 seconds', 0x40100020n);
registerSearchData('Speed', '', 'API/StrategyGame/FPawnData/Speed/index.html', 'movement speed', 0x40100020n);
registerSearchData('FBuffData', '', 'API/StrategyGame/FBuffData/index.html', '', 0x08000002n);
registerSearchData('FBuffData', '', 'API/StrategyGame/FBuffData/FBuffData/index.html', 'defaults', 0x80100010n);
registerSearchData('ApplyBuff', '', 'API/StrategyGame/FBuffData/ApplyBuff/index.html', 'Helper function for applying buff data. ', 0x00100010n);
registerSearchData('BuffData', '', 'API/StrategyGame/FBuffData/BuffData/index.html', 'additive values', 0x40100020n);
registerSearchData('bInfiniteDuration', '', 'API/StrategyGame/FBuffData/bInfiniteDuration/index.html', 'set to ignore buff duration, not time limited', 0x40100020n);
registerSearchData('Duration', '', 'API/StrategyGame/FBuffData/Duration/index.html', 'buff duration in seconds', 0x40100020n);
registerSearchData('EndTime', '', 'API/StrategyGame/FBuffData/EndTime/index.html', 'runtime: buff ending time calculated when it\'s added', 0x00100020n);
registerSearchData('FPlayerData', '', 'API/StrategyGame/FPlayerData/index.html', '', 0x00000002n);
registerSearchData('ResourcesAvailable', '', 'API/StrategyGame/FPlayerData/ResourcesAvailable/index.html', 'current resources', 0x00100020n);
registerSearchData('ResourcesGathered', '', 'API/StrategyGame/FPlayerData/ResourcesGathered/index.html', 'total resources gathered', 0x00100020n);
registerSearchData('DamageDone', '', 'API/StrategyGame/FPlayerData/DamageDone/index.html', 'total damage done', 0x00100020n);
registerSearchData('Brewery', '', 'API/StrategyGame/FPlayerData/Brewery/index.html', 'HQ', 0x00100020n);
registerSearchData('BuildingsList', '', 'API/StrategyGame/FPlayerData/BuildingsList/index.html', 'player owned buildings list', 0x00100020n);
registerSearchData('SStrategyButtonWidget', '', 'API/StrategyGame/UI/Widgets/SStrategyButtonWidget/index.html', 'Button widget base class', 0x00000001n);
registerSearchData('SLATE_BEGIN_ARGS', '', 'API/StrategyGame/UI/Widgets/SStrategyButtonWidget/SLATE_BEGIN_ARGS/index.html', '', 0x80100010n);
registerSearchData('Construct', '', 'API/StrategyGame/UI/Widgets/SStrategyButtonWidget/Construct/index.html', 'Owning HUD for getting Game World', 0x80100010n);
registerSearchData('SupportsKeyboardFocus', '', 'API/StrategyGame/UI/Widgets/SStrategyButtonWidget/SupportsKeyboardFocus/index.html', 'says that we can support keyboard focus', 0x00940010n);
registerSearchData('OnMouseButtonDown', '', 'API/StrategyGame/UI/Widgets/SStrategyButtonWidget/OnMouseButtonDown/index.html', 'widget sets up the appropriate mouse settings upon focus', 0x00140010n);
registerSearchData('OnMouseButtonUp', '', 'API/StrategyGame/UI/Widgets/SStrategyButtonWidget/OnMouseButtonUp/index.html', '', 0x00140010n);
registerSearchData('OnMouseMove', '', 'API/StrategyGame/UI/Widgets/SStrategyButtonWidget/OnMouseMove/index.html', '', 0x00140010n);
registerSearchData('OnMouseEnter', '', 'API/StrategyGame/UI/Widgets/SStrategyButtonWidget/OnMouseEnter/index.html', '', 0x00140010n);
registerSearchData('OnMouseLeave', '', 'API/StrategyGame/UI/Widgets/SStrategyButtonWidget/OnMouseLeave/index.html', '', 0x00140010n);
registerSearchData('OnTouchForceChanged', '', 'API/StrategyGame/UI/Widgets/SStrategyButtonWidget/OnTouchForceChanged/index.html', '', 0x00140010n);
registerSearchData('OnCursorQuery', '', 'API/StrategyGame/UI/Widgets/SStrategyButtonWidget/OnCursorQuery/index.html', '', 0x00940010n);
registerSearchData('SetImage', '', 'API/StrategyGame/UI/Widgets/SStrategyButtonWidget/SetImage/index.html', '', 0x00100010n);
registerSearchData('SetActionAllowed', '', 'API/StrategyGame/UI/Widgets/SStrategyButtonWidget/SetActionAllowed/index.html', '', 0x00100010n);
registerSearchData('SetActionActive', '', 'API/StrategyGame/UI/Widgets/SStrategyButtonWidget/SetActionActive/index.html', '', 0x00100010n);
registerSearchData('SetUserActionRequired', '', 'API/StrategyGame/UI/Widgets/SStrategyButtonWidget/SetUserActionRequired/index.html', '', 0x00100010n);
registerSearchData('DeferredShow', '', 'API/StrategyGame/UI/Widgets/SStrategyButtonWidget/DeferredShow/index.html', '', 0x00100010n);
registerSearchData('DeferredHide', '', 'API/StrategyGame/UI/Widgets/SStrategyButtonWidget/DeferredHide/index.html', '', 0x00100010n);
registerSearchData('IsAnimating', '', 'API/StrategyGame/UI/Widgets/SStrategyButtonWidget/IsAnimating/index.html', '', 0x00900010n);
registerSearchData('GetButtonImage', '', 'API/StrategyGame/UI/Widgets/SStrategyButtonWidget/GetButtonImage/index.html', '', 0x00a00010n);
registerSearchData('GetTintColor', '', 'API/StrategyGame/UI/Widgets/SStrategyButtonWidget/GetTintColor/index.html', '', 0x00a00010n);
registerSearchData('GetImageColor', '', 'API/StrategyGame/UI/Widgets/SStrategyButtonWidget/GetImageColor/index.html', '', 0x00a00010n);
registerSearchData('GetCoinColor', '', 'API/StrategyGame/UI/Widgets/SStrategyButtonWidget/GetCoinColor/index.html', '', 0x00a00010n);
registerSearchData('GetTextColor', '', 'API/StrategyGame/UI/Widgets/SStrategyButtonWidget/GetTextColor/index.html', '', 0x00a00010n);
registerSearchData('GetTextShadowColor', '', 'API/StrategyGame/UI/Widgets/SStrategyButtonWidget/GetTextShadowColor/index.html', '', 0x00a00010n);
registerSearchData('GetCoinVisibility', '', 'API/StrategyGame/UI/Widgets/SStrategyButtonWidget/GetCoinVisibility/index.html', '', 0x00a00010n);
registerSearchData('GetTextMargin', '', 'API/StrategyGame/UI/Widgets/SStrategyButtonWidget/GetTextMargin/index.html', '', 0x00a00010n);
registerSearchData('GetTextFont', '', 'API/StrategyGame/UI/Widgets/SStrategyButtonWidget/GetTextFont/index.html', '', 0x00a00010n);
registerSearchData('GetCurrentOpacity', '', 'API/StrategyGame/UI/Widgets/SStrategyButtonWidget/GetCurrentOpacity/index.html', '', 0x00a00010n);
registerSearchData('ButtonImage', '', 'API/StrategyGame/UI/Widgets/SStrategyButtonWidget/ButtonImage/index.html', 'brush resource that represents a button', 0x00100020n);
registerSearchData('AlphaMap', '', 'API/StrategyGame/UI/Widgets/SStrategyButtonWidget/AlphaMap/index.html', '', 0x00100020n);
registerSearchData('OnClicked', '', 'API/StrategyGame/UI/Widgets/SStrategyButtonWidget/OnClicked/index.html', 'the delegate to execute when the button is clicked', 0x00200020n);
registerSearchData('OnClickedDisabled', '', 'API/StrategyGame/UI/Widgets/SStrategyButtonWidget/OnClickedDisabled/index.html', 'the delegate to execute when the button is clicked, when action is not allowed', 0x00200020n);
registerSearchData('OnMouseEnterDel', '', 'API/StrategyGame/UI/Widgets/SStrategyButtonWidget/OnMouseEnterDel/index.html', 'the delegate to execute when mouse enters active button area', 0x00200020n);
registerSearchData('OnMouseLeaveDel', '', 'API/StrategyGame/UI/Widgets/SStrategyButtonWidget/OnMouseLeaveDel/index.html', 'the delegate to execute when mouse leave active button area', 0x00200020n);
registerSearchData('ButtonText', '', 'API/StrategyGame/UI/Widgets/SStrategyButtonWidget/ButtonText/index.html', '', 0x00200020n);
registerSearchData('CenterText', '', 'API/StrategyGame/UI/Widgets/SStrategyButtonWidget/CenterText/index.html', '', 0x00200020n);
registerSearchData('CornerText', '', 'API/StrategyGame/UI/Widgets/SStrategyButtonWidget/CornerText/index.html', '', 0x00200020n);
registerSearchData('CoinIconVisible', '', 'API/StrategyGame/UI/Widgets/SStrategyButtonWidget/CoinIconVisible/index.html', '', 0x00200020n);
registerSearchData('TextHAlign', '', 'API/StrategyGame/UI/Widgets/SStrategyButtonWidget/TextHAlign/index.html', '', 0x00200020n);
registerSearchData('TextVAlign', '', 'API/StrategyGame/UI/Widgets/SStrategyButtonWidget/TextVAlign/index.html', '', 0x00200020n);
registerSearchData('TextMargin', '', 'API/StrategyGame/UI/Widgets/SStrategyButtonWidget/TextMargin/index.html', '', 0x00200020n);
registerSearchData('TextFont', '', 'API/StrategyGame/UI/Widgets/SStrategyButtonWidget/TextFont/index.html', '', 0x00200020n);
registerSearchData('Opacity', '', 'API/StrategyGame/UI/Widgets/SStrategyButtonWidget/Opacity/index.html', '', 0x00200020n);
registerSearchData('HideMouse', '', 'API/StrategyGame/UI/Widgets/SStrategyButtonWidget/HideMouse/index.html', '', 0x00200020n);
registerSearchData('WidgetAnimation', '', 'API/StrategyGame/UI/Widgets/SStrategyButtonWidget/WidgetAnimation/index.html', '', 0x00200020n);
registerSearchData('OpacityCurve', '', 'API/StrategyGame/UI/Widgets/SStrategyButtonWidget/OpacityCurve/index.html', '', 0x00200020n);
registerSearchData('bIsMouseButtonDown', '', 'API/StrategyGame/UI/Widgets/SStrategyButtonWidget/bIsMouseButtonDown/index.html', '', 0x00200020n);
registerSearchData('bIsActionAllowed', '', 'API/StrategyGame/UI/Widgets/SStrategyButtonWidget/bIsActionAllowed/index.html', '', 0x00200020n);
registerSearchData('bIsActiveAction', '', 'API/StrategyGame/UI/Widgets/SStrategyButtonWidget/bIsActiveAction/index.html', '', 0x00200020n);
registerSearchData('bIsUserActionRequired', '', 'API/StrategyGame/UI/Widgets/SStrategyButtonWidget/bIsUserActionRequired/index.html', '', 0x00200020n);
registerSearchData('bMouseCursorVisible', '', 'API/StrategyGame/UI/Widgets/SStrategyButtonWidget/bMouseCursorVisible/index.html', '', 0x00200020n);
registerSearchData('OwnerHUD', '', 'API/StrategyGame/UI/Widgets/SStrategyButtonWidget/OwnerHUD/index.html', 'Pointer to our parent HUD', 0x00200020n);
registerSearchData('SStrategyMenuItem', '', 'API/StrategyGame/UI/Menu/SStrategyMenuItem/index.html', 'class declare', 0x00000001n);
registerSearchData('SLATE_BEGIN_ARGS', '', 'API/StrategyGame/UI/Menu/SStrategyMenuItem/SLATE_BEGIN_ARGS/index.html', '', 0x80100010n);
registerSearchData('Construct', '', 'API/StrategyGame/UI/Menu/SStrategyMenuItem/Construct/index.html', '', 0x80100010n);
registerSearchData('SupportsKeyboardFocus', '', 'API/StrategyGame/UI/Menu/SStrategyMenuItem/SupportsKeyboardFocus/index.html', 'Says that we can support keyboard focus', 0x00940010n);
registerSearchData('SStrategyMenuWidget', '', 'API/StrategyGame/UI/Menu/SStrategyMenuWidget/index.html', 'Base menu widget', 0x00000001n);
registerSearchData('SLATE_BEGIN_ARGS', '', 'API/StrategyGame/UI/Menu/SStrategyMenuWidget/SLATE_BEGIN_ARGS/index.html', '', 0x80100010n);
registerSearchData('Construct', '', 'API/StrategyGame/UI/Menu/SStrategyMenuWidget/Construct/index.html', 'weak pointer to the parent HUD base', 0x80100010n);
registerSearchData('Tick', '', 'API/StrategyGame/UI/Menu/SStrategyMenuWidget/Tick/index.html', 'Update function. Kind of a hack. Allows us to only start fading in once we are done loading.', 0x00140010n);
registerSearchData('OnMouseButtonDown', '', 'API/StrategyGame/UI/Menu/SStrategyMenuWidget/OnMouseButtonDown/index.html', 'mouse down on the menu widget skips animation', 0x00140010n);
registerSearchData('SupportsKeyboardFocus', '', 'API/StrategyGame/UI/Menu/SStrategyMenuWidget/SupportsKeyboardFocus/index.html', 'says that we can support keyboard focus', 0x00940010n);
registerSearchData('OnFocusReceived', '', 'API/StrategyGame/UI/Menu/SStrategyMenuWidget/OnFocusReceived/index.html', 'the menu sets up the appropriate mouse settings upon focus', 0x00140010n);
registerSearchData('SetupAnimations', '', 'API/StrategyGame/UI/Menu/SStrategyMenuWidget/SetupAnimations/index.html', 'setups animation lengths, start points and launches initial animations', 0x00100010n);
registerSearchData('BuildLeftPanel', '', 'API/StrategyGame/UI/Menu/SStrategyMenuWidget/BuildLeftPanel/index.html', 'builds left menu panel', 0x00100010n);
registerSearchData('BuildRightPanel', '', 'API/StrategyGame/UI/Menu/SStrategyMenuWidget/BuildRightPanel/index.html', 'builds inactive next menu panel (current selections submenu preview)', 0x00100010n);
registerSearchData('EnterSubMenu', '', 'API/StrategyGame/UI/Menu/SStrategyMenuWidget/EnterSubMenu/index.html', 'starts animations to enter submenu, it will become active menu', 0x00100010n);
registerSearchData('MenuGoBack', '', 'API/StrategyGame/UI/Menu/SStrategyMenuWidget/MenuGoBack/index.html', 'starts reverse animations to go one level up in menu hierarchy', 0x00100010n);
registerSearchData('HideMenu', '', 'API/StrategyGame/UI/Menu/SStrategyMenuWidget/HideMenu/index.html', 'call to hide menu', 0x00100010n);
registerSearchData('LockControls', '', 'API/StrategyGame/UI/Menu/SStrategyMenuWidget/LockControls/index.html', 'disable/enable menu controls', 0x00100010n);
registerSearchData('GetVisibility', '', 'API/StrategyGame/UI/Menu/SStrategyMenuWidget/GetVisibility/index.html', 'sets hit test invisibility when console is up', 0x00c00010n);
registerSearchData('GetUIScale', '', 'API/StrategyGame/UI/Menu/SStrategyMenuWidget/GetUIScale/index.html', 'gets ui scale', 0x00c00010n);
registerSearchData('GetBottomScale', '', 'API/StrategyGame/UI/Menu/SStrategyMenuWidget/GetBottomScale/index.html', 'getters used for animating the menu', 0x00c00010n);
registerSearchData('GetBottomColor', '', 'API/StrategyGame/UI/Menu/SStrategyMenuWidget/GetBottomColor/index.html', '', 0x00c00010n);
registerSearchData('GetTopColor', '', 'API/StrategyGame/UI/Menu/SStrategyMenuWidget/GetTopColor/index.html', '', 0x00c00010n);
registerSearchData('GetButtonColor', '', 'API/StrategyGame/UI/Menu/SStrategyMenuWidget/GetButtonColor/index.html', '', 0x00c00010n);
registerSearchData('GetMenuOffset', '', 'API/StrategyGame/UI/Menu/SStrategyMenuWidget/GetMenuOffset/index.html', '', 0x00c00010n);
registerSearchData('GetLeftMenuOffset', '', 'API/StrategyGame/UI/Menu/SStrategyMenuWidget/GetLeftMenuOffset/index.html', '', 0x00c00010n);
registerSearchData('GetTopDecorPosition', '', 'API/StrategyGame/UI/Menu/SStrategyMenuWidget/GetTopDecorPosition/index.html', 'computes & gets top decor position', 0x00c00010n);
registerSearchData('GetTopDecorSize', '', 'API/StrategyGame/UI/Menu/SStrategyMenuWidget/GetTopDecorSize/index.html', 'gets top decor size', 0x00c00010n);
registerSearchData('ButtonClicked', '', 'API/StrategyGame/UI/Menu/SStrategyMenuWidget/ButtonClicked/index.html', 'callback for when one of the N buttons is clicked', 0x00400010n);
registerSearchData('FadeIn', '', 'API/StrategyGame/UI/Menu/SStrategyMenuWidget/FadeIn/index.html', 'This function starts the entire fade in process', 0x00400010n);
registerSearchData('bConsoleVisible', '', 'API/StrategyGame/UI/Menu/SStrategyMenuWidget/bConsoleVisible/index.html', 'if console is currently opened', 0x00100020n);
registerSearchData('MenuWidgetAnimation', '', 'API/StrategyGame/UI/Menu/SStrategyMenuWidget/MenuWidgetAnimation/index.html', 'our curve sequence and the related handles', 0x00400020n);
registerSearchData('BottomScaleYCurve', '', 'API/StrategyGame/UI/Menu/SStrategyMenuWidget/BottomScaleYCurve/index.html', 'used for menu background scaling animation at the beginning', 0x00400020n);
registerSearchData('TopColorCurve', '', 'API/StrategyGame/UI/Menu/SStrategyMenuWidget/TopColorCurve/index.html', 'used for main menu logo fade in animation at the beginning', 0x00400020n);
registerSearchData('BottomColorCurve', '', 'API/StrategyGame/UI/Menu/SStrategyMenuWidget/BottomColorCurve/index.html', 'used for menu background fade in animation at the beginning', 0x00400020n);
registerSearchData('ButtonsPosXCurve', '', 'API/StrategyGame/UI/Menu/SStrategyMenuWidget/ButtonsPosXCurve/index.html', 'used for menu buttons slide in animation at the beginning', 0x00400020n);
registerSearchData('LeftMenuWidgetAnimation', '', 'API/StrategyGame/UI/Menu/SStrategyMenuWidget/LeftMenuWidgetAnimation/index.html', 'current menu transition animation sequence', 0x00400020n);
registerSearchData('LeftMenuScrollOutCurve', '', 'API/StrategyGame/UI/Menu/SStrategyMenuWidget/LeftMenuScrollOutCurve/index.html', 'current menu transition animation curve', 0x00400020n);
registerSearchData('MyMenuHUD', '', 'API/StrategyGame/UI/Menu/SStrategyMenuWidget/MyMenuHUD/index.html', 'Pointer to our parent HUD', 0x00400020n);
registerSearchData('InputText', '', 'API/StrategyGame/UI/Menu/SStrategyMenuWidget/InputText/index.html', 'Editable text widget', 0x00400020n);
registerSearchData('SelectedIndex', '', 'API/StrategyGame/UI/Menu/SStrategyMenuWidget/SelectedIndex/index.html', 'selected index of current menu', 0x00400020n);
registerSearchData('bLeftMenuChanging', '', 'API/StrategyGame/UI/Menu/SStrategyMenuWidget/bLeftMenuChanging/index.html', 'left panel animating flag', 0x00400020n);
registerSearchData('bGoingBack', '', 'API/StrategyGame/UI/Menu/SStrategyMenuWidget/bGoingBack/index.html', 'going back to previous menu animation flag', 0x00400020n);
registerSearchData('bControlsLocked', '', 'API/StrategyGame/UI/Menu/SStrategyMenuWidget/bControlsLocked/index.html', 'if menu is currently locked', 0x00400020n);
registerSearchData('bMenuHiding', '', 'API/StrategyGame/UI/Menu/SStrategyMenuWidget/bMenuHiding/index.html', 'flag when playing hiding animation', 0x00400020n);
registerSearchData('PendingLeftMenu', '', 'API/StrategyGame/UI/Menu/SStrategyMenuWidget/PendingLeftMenu/index.html', 'menu that will override current one after transition animation', 0x00400020n);
registerSearchData('LeftBox', '', 'API/StrategyGame/UI/Menu/SStrategyMenuWidget/LeftBox/index.html', 'left(current) menu layout box', 0x00400020n);
registerSearchData('TopDecorImage', '', 'API/StrategyGame/UI/Menu/SStrategyMenuWidget/TopDecorImage/index.html', 'top decor image widget', 0x00400020n);
registerSearchData('MenuPaddingX', '', 'API/StrategyGame/UI/Menu/SStrategyMenuWidget/MenuPaddingX/index.html', 'menu padding size X', 0x00400020n);
registerSearchData('MenuPaddingY', '', 'API/StrategyGame/UI/Menu/SStrategyMenuWidget/MenuPaddingY/index.html', 'menu padding size Y', 0x00400020n);
registerSearchData('MenuOffsetX', '', 'API/StrategyGame/UI/Menu/SStrategyMenuWidget/MenuOffsetX/index.html', 'x offset from center', 0x00400020n);
registerSearchData('MenuOffsetY', '', 'API/StrategyGame/UI/Menu/SStrategyMenuWidget/MenuOffsetY/index.html', 'y offset from center', 0x00400020n);
registerSearchData('UIScale', '', 'API/StrategyGame/UI/Menu/SStrategyMenuWidget/UIScale/index.html', 'current UI scale attribute', 0x00400020n);
registerSearchData('MenuStyle', '', 'API/StrategyGame/UI/Menu/SStrategyMenuWidget/MenuStyle/index.html', 'style for this menu', 0x00c00020n);
registerSearchData('FStrategyMenuItem', '', 'API/StrategyGame/UI/Menu/FStrategyMenuItem/index.html', 'Copyright 1998-2019 Epic Games, Inc. All Rights Reserved.', 0x00000001n);
registerSearchData('FStrategyMenuItem', '', 'API/StrategyGame/UI/Menu/FStrategyMenuItem/FStrategyMenuItem/index.html', 'constructor accepting menu item text', 0x80100010n);
registerSearchData('Text', '', 'API/StrategyGame/UI/Menu/FStrategyMenuItem/Text/index.html', 'menu item text', 0x00100020n);
registerSearchData('SubMenu', '', 'API/StrategyGame/UI/Menu/FStrategyMenuItem/SubMenu/index.html', 'sub menu if present', 0x00100020n);
registerSearchData('Widget', '', 'API/StrategyGame/UI/Menu/FStrategyMenuItem/Widget/index.html', 'shared pointer to actual slate widget representing the menu item', 0x00100020n);
registerSearchData('', '', 'API/StrategyGame/UI/Menu/FStrategyMenuItem//index.html', '', 0x00100020n);
registerSearchData('OnConfirmMenuItem', '', 'API/StrategyGame/UI/Menu/FStrategyMenuItem/OnConfirmMenuItem/index.html', 'delegate, which is executed by SShooterMenuWidget if user confirms this menu item', 0x00100020n);
registerSearchData('FStrategyHUDSoundsStyle', '', 'API/StrategyGame/UI/Style/FStrategyHUDSoundsStyle/index.html', 'Represents the common HUD sounds used in the strategy game', 0x08000002n);
registerSearchData('FStrategyHUDSoundsStyle', '', 'API/StrategyGame/UI/Style/FStrategyHUDSoundsStyle/FStrategyHUDSoundsStyle/index.html', '', 0x80100010n);
registerSearchData('FStrategyHUDSoundsStyle', '', 'API/StrategyGame/UI/Style/FStrategyHUDSoundsStyle/FStrategyHUDSoundsStyle-1-0/index.html', '', 0x0000000100140010n);
registerSearchData('GetResources', '', 'API/StrategyGame/UI/Style/FStrategyHUDSoundsStyle/GetResources/index.html', 'FSlateWidgetStyle', 0x00940010n);
registerSearchData('GetTypeName', '', 'API/StrategyGame/UI/Style/FStrategyHUDSoundsStyle/GetTypeName/index.html', '', 0x00940010n);
registerSearchData('GetDefault', '', 'API/StrategyGame/UI/Style/FStrategyHUDSoundsStyle/GetDefault/index.html', '', 0x00120010n);
registerSearchData('SetStartGameSound', '', 'API/StrategyGame/UI/Style/FStrategyHUDSoundsStyle/SetStartGameSound/index.html', '', 0x00100010n);
registerSearchData('SetExitGameSound', '', 'API/StrategyGame/UI/Style/FStrategyHUDSoundsStyle/SetExitGameSound/index.html', '', 0x00100010n);
registerSearchData('SetMenuItemChangeSound', '', 'API/StrategyGame/UI/Style/FStrategyHUDSoundsStyle/SetMenuItemChangeSound/index.html', '', 0x00100010n);
registerSearchData('TypeName', '', 'API/StrategyGame/UI/Style/FStrategyHUDSoundsStyle/TypeName/index.html', '', 0x00920020n);
registerSearchData('', '', 'API/StrategyGame/UI/Style/FStrategyHUDSoundsStyle//index.html', '', 0x00100020n);
registerSearchData('StartGameSound', '', 'API/StrategyGame/UI/Style/FStrategyHUDSoundsStyle/StartGameSound/index.html', 'The sound that should play when starting the game', 0x40100020n);
registerSearchData('ExitGameSound', '', 'API/StrategyGame/UI/Style/FStrategyHUDSoundsStyle/ExitGameSound/index.html', 'The sound that should play when exiting the game', 0x40100020n);
registerSearchData('MenuItemChangeSound', '', 'API/StrategyGame/UI/Style/FStrategyHUDSoundsStyle/MenuItemChangeSound/index.html', 'The sound that should play when changing the selected menu item', 0x40100020n);
registerSearchData('UStrategyHUDSoundsWidgetStyle', '', 'API/StrategyGame/UI/Style/UStrategyHUDSoundsWidgetStyle/index.html', '', 0x04000001n);
registerSearchData('GetStyle', '', 'API/StrategyGame/UI/Style/UStrategyHUDSoundsWidgetStyle/GetStyle/index.html', '', 0x00940010n);
registerSearchData('SoundsStyle', '', 'API/StrategyGame/UI/Style/UStrategyHUDSoundsWidgetStyle/SoundsStyle/index.html', 'The actual data describing the sounds', 0x40100020n);
registerSearchData('FStrategyHUDStyle', '', 'API/StrategyGame/UI/Style/FStrategyHUDStyle/index.html', 'Represents the appearance of an SStrategySlateHUDWidget', 0x08000002n);
registerSearchData('FStrategyHUDStyle', '', 'API/StrategyGame/UI/Style/FStrategyHUDStyle/FStrategyHUDStyle/index.html', '', 0x80100010n);
registerSearchData('FStrategyHUDStyle', '', 'API/StrategyGame/UI/Style/FStrategyHUDStyle/FStrategyHUDStyle-1-0/index.html', '', 0x0000000100140010n);
registerSearchData('GetResources', '', 'API/StrategyGame/UI/Style/FStrategyHUDStyle/GetResources/index.html', 'FSlateWidgetStyle', 0x00940010n);
registerSearchData('GetTypeName', '', 'API/StrategyGame/UI/Style/FStrategyHUDStyle/GetTypeName/index.html', '', 0x00940010n);
registerSearchData('GetDefault', '', 'API/StrategyGame/UI/Style/FStrategyHUDStyle/GetDefault/index.html', '', 0x00120010n);
registerSearchData('SetResourcesBackgroundBrush', '', 'API/StrategyGame/UI/Style/FStrategyHUDStyle/SetResourcesBackgroundBrush/index.html', '', 0x00100010n);
registerSearchData('SetResourcesImage', '', 'API/StrategyGame/UI/Style/FStrategyHUDStyle/SetResourcesImage/index.html', '', 0x00100010n);
registerSearchData('SetMinimapFrameBrush', '', 'API/StrategyGame/UI/Style/FStrategyHUDStyle/SetMinimapFrameBrush/index.html', '', 0x00100010n);
registerSearchData('SetVictoryImage', '', 'API/StrategyGame/UI/Style/FStrategyHUDStyle/SetVictoryImage/index.html', '', 0x00100010n);
registerSearchData('SetDefeatImage', '', 'API/StrategyGame/UI/Style/FStrategyHUDStyle/SetDefeatImage/index.html', '', 0x00100010n);
registerSearchData('SetVictoryTextColor', '', 'API/StrategyGame/UI/Style/FStrategyHUDStyle/SetVictoryTextColor/index.html', '', 0x00100010n);
registerSearchData('SetDefeatTextColor', '', 'API/StrategyGame/UI/Style/FStrategyHUDStyle/SetDefeatTextColor/index.html', '', 0x00100010n);
registerSearchData('TypeName', '', 'API/StrategyGame/UI/Style/FStrategyHUDStyle/TypeName/index.html', '', 0x00920020n);
registerSearchData('', '', 'API/StrategyGame/UI/Style/FStrategyHUDStyle//index.html', '', 0x00100020n);
registerSearchData('ResourcesBackgroundBrush', '', 'API/StrategyGame/UI/Style/FStrategyHUDStyle/ResourcesBackgroundBrush/index.html', 'The brush used to draw the resources area background', 0x40100020n);
registerSearchData('ResourcesImage', '', 'API/StrategyGame/UI/Style/FStrategyHUDStyle/ResourcesImage/index.html', 'The brush used to draw the resources image', 0x40100020n);
registerSearchData('MinimapFrameBrush', '', 'API/StrategyGame/UI/Style/FStrategyHUDStyle/MinimapFrameBrush/index.html', 'The brush used to draw the frame around the mini-map', 0x40100020n);
registerSearchData('VictoryImage', '', 'API/StrategyGame/UI/Style/FStrategyHUDStyle/VictoryImage/index.html', 'The brush used to draw the victory image', 0x40100020n);
registerSearchData('DefeatImage', '', 'API/StrategyGame/UI/Style/FStrategyHUDStyle/DefeatImage/index.html', 'The brush used to draw the defeat image', 0x40100020n);
registerSearchData('VictoryTextColor', '', 'API/StrategyGame/UI/Style/FStrategyHUDStyle/VictoryTextColor/index.html', 'The color used to draw the victory text', 0x40100020n);
registerSearchData('DefeatTextColor', '', 'API/StrategyGame/UI/Style/FStrategyHUDStyle/DefeatTextColor/index.html', 'The color used to draw the defeat text', 0x40100020n);
registerSearchData('UStrategyHUDWidgetStyle', '', 'API/StrategyGame/UI/Style/UStrategyHUDWidgetStyle/index.html', '', 0x04000001n);
registerSearchData('GetStyle', '', 'API/StrategyGame/UI/Style/UStrategyHUDWidgetStyle/GetStyle/index.html', '', 0x00940010n);
registerSearchData('HUDStyle', '', 'API/StrategyGame/UI/Style/UStrategyHUDWidgetStyle/HUDStyle/index.html', 'The actual data describing the HUD appearance.', 0x40100020n);
registerSearchData('FStrategyMenuStyle', '', 'API/StrategyGame/UI/Style/FStrategyMenuStyle/index.html', 'Represents the the appearance of an SStrategyMenuWidget', 0x08000002n);
registerSearchData('FStrategyMenuStyle', '', 'API/StrategyGame/UI/Style/FStrategyMenuStyle/FStrategyMenuStyle/index.html', '', 0x80100010n);
registerSearchData('FStrategyMenuStyle', '', 'API/StrategyGame/UI/Style/FStrategyMenuStyle/FStrategyMenuStyle-1-0/index.html', '', 0x0000000100140010n);
registerSearchData('GetResources', '', 'API/StrategyGame/UI/Style/FStrategyMenuStyle/GetResources/index.html', 'FSlateWidgetStyle', 0x00940010n);
registerSearchData('GetTypeName', '', 'API/StrategyGame/UI/Style/FStrategyMenuStyle/GetTypeName/index.html', '', 0x00940010n);
registerSearchData('GetDefault', '', 'API/StrategyGame/UI/Style/FStrategyMenuStyle/GetDefault/index.html', '', 0x00120010n);
registerSearchData('SetBackgroundBrush', '', 'API/StrategyGame/UI/Style/FStrategyMenuStyle/SetBackgroundBrush/index.html', '', 0x00100010n);
registerSearchData('SetTileBackgroundBrush', '', 'API/StrategyGame/UI/Style/FStrategyMenuStyle/SetTileBackgroundBrush/index.html', '', 0x00100010n);
registerSearchData('SetPopupBackgroundBrush', '', 'API/StrategyGame/UI/Style/FStrategyMenuStyle/SetPopupBackgroundBrush/index.html', '', 0x00100010n);
registerSearchData('SetTopDecoration', '', 'API/StrategyGame/UI/Style/FStrategyMenuStyle/SetTopDecoration/index.html', '', 0x00100010n);
registerSearchData('SetLeftDecoration', '', 'API/StrategyGame/UI/Style/FStrategyMenuStyle/SetLeftDecoration/index.html', '', 0x00100010n);
registerSearchData('SetRightDecoration', '', 'API/StrategyGame/UI/Style/FStrategyMenuStyle/SetRightDecoration/index.html', '', 0x00100010n);
registerSearchData('SetMenuEnterSound', '', 'API/StrategyGame/UI/Style/FStrategyMenuStyle/SetMenuEnterSound/index.html', '', 0x00100010n);
registerSearchData('SetMenuExitSound', '', 'API/StrategyGame/UI/Style/FStrategyMenuStyle/SetMenuExitSound/index.html', '', 0x00100010n);
registerSearchData('TypeName', '', 'API/StrategyGame/UI/Style/FStrategyMenuStyle/TypeName/index.html', '', 0x00920020n);
registerSearchData('', '', 'API/StrategyGame/UI/Style/FStrategyMenuStyle//index.html', '', 0x00100020n);
registerSearchData('BackgroundBrush', '', 'API/StrategyGame/UI/Style/FStrategyMenuStyle/BackgroundBrush/index.html', 'The brush used to draw the menu background', 0x40100020n);
registerSearchData('TileBackgroundBrush', '', 'API/StrategyGame/UI/Style/FStrategyMenuStyle/TileBackgroundBrush/index.html', 'The brush used to draw the menu tile background', 0x40100020n);
registerSearchData('PopupBackgroundBrush', '', 'API/StrategyGame/UI/Style/FStrategyMenuStyle/PopupBackgroundBrush/index.html', 'The brush used to draw the pop-up menu background', 0x40100020n);
registerSearchData('TopDecoration', '', 'API/StrategyGame/UI/Style/FStrategyMenuStyle/TopDecoration/index.html', 'The brush used to draw the top menu decoration', 0x40100020n);
registerSearchData('LeftDecoration', '', 'API/StrategyGame/UI/Style/FStrategyMenuStyle/LeftDecoration/index.html', 'The brush used to draw the left menu decoration', 0x40100020n);
registerSearchData('RightDecoration', '', 'API/StrategyGame/UI/Style/FStrategyMenuStyle/RightDecoration/index.html', 'The brush used to draw the right menu decoration', 0x40100020n);
registerSearchData('MenuEnterSound', '', 'API/StrategyGame/UI/Style/FStrategyMenuStyle/MenuEnterSound/index.html', 'The sound that should play when entering a sub-menu', 0x40100020n);
registerSearchData('MenuExitSound', '', 'API/StrategyGame/UI/Style/FStrategyMenuStyle/MenuExitSound/index.html', 'The sound that should play when leaving a sub- menu', 0x40100020n);
registerSearchData('UStrategyMenuWidgetStyle', '', 'API/StrategyGame/UI/Style/UStrategyMenuWidgetStyle/index.html', '', 0x04000001n);
registerSearchData('GetStyle', '', 'API/StrategyGame/UI/Style/UStrategyMenuWidgetStyle/GetStyle/index.html', '', 0x00940010n);
registerSearchData('MenuStyle', '', 'API/StrategyGame/UI/Style/UStrategyMenuWidgetStyle/MenuStyle/index.html', 'The actual data describing the menu\'s appearance.', 0x40100020n);
registerSearchData('FStrategyStyle', '', 'API/StrategyGame/UI/Style/FStrategyStyle/index.html', 'Copyright 1998-2019 Epic Games, Inc. All Rights Reserved.', 0x00000001n);
registerSearchData('Initialize', '', 'API/StrategyGame/UI/Style/FStrategyStyle/Initialize/index.html', '', 0x00120010n);
registerSearchData('Shutdown', '', 'API/StrategyGame/UI/Style/FStrategyStyle/Shutdown/index.html', '', 0x00120010n);
registerSearchData('ReloadTextures', '', 'API/StrategyGame/UI/Style/FStrategyStyle/ReloadTextures/index.html', 'reloads textures used by slate renderer', 0x00120010n);
registerSearchData('Get', '', 'API/StrategyGame/UI/Style/FStrategyStyle/Get/index.html', '', 0x00120010n);
registerSearchData('GetStyleSetName', '', 'API/StrategyGame/UI/Style/FStrategyStyle/GetStyleSetName/index.html', '', 0x00120010n);
registerSearchData('Create', '', 'API/StrategyGame/UI/Style/FStrategyStyle/Create/index.html', '', 0x00420010n);
registerSearchData('StrategyStyleInstance', '', 'API/StrategyGame/UI/Style/FStrategyStyle/StrategyStyleInstance/index.html', '', 0x00420020n);
registerSearchData('SStrategyActionGrid', '', 'API/StrategyGame/UI/Widgets/SStrategyActionGrid/index.html', 'Grid of actions something can perform', 0x00000001n);
registerSearchData('SLATE_BEGIN_ARGS', '', 'API/StrategyGame/UI/Widgets/SStrategyActionGrid/SLATE_BEGIN_ARGS/index.html', '', 0x80100010n);
registerSearchData('Construct', '', 'API/StrategyGame/UI/Widgets/SStrategyActionGrid/Construct/index.html', '', 0x80100010n);
registerSearchData('SupportsKeyboardFocus', '', 'API/StrategyGame/UI/Widgets/SStrategyActionGrid/SupportsKeyboardFocus/index.html', 'says that we can support keyboard focus', 0x00c40010n);
registerSearchData('TriggerAction', '', 'API/StrategyGame/UI/Widgets/SStrategyActionGrid/TriggerAction/index.html', 'one of the buttons was clicked, trigger action if any', 0x00c00010n);
registerSearchData('GetActionCostText', '', 'API/StrategyGame/UI/Widgets/SStrategyActionGrid/GetActionCostText/index.html', 'gets cost to display associated with action', 0x00c00010n);
registerSearchData('GetActionText', '', 'API/StrategyGame/UI/Widgets/SStrategyActionGrid/GetActionText/index.html', 'gets action text to display, it should display no text if icon is available', 0x00c00010n);
registerSearchData('GetActionQueueText', '', 'API/StrategyGame/UI/Widgets/SStrategyActionGrid/GetActionQueueText/index.html', 'gets action queue length text if queue is supported', 0x00c00010n);
registerSearchData('GetActionVisibility', '', 'API/StrategyGame/UI/Widgets/SStrategyActionGrid/GetActionVisibility/index.html', 'gets action visibility', 0x00c00010n);
registerSearchData('GetCoinIconVisibility', '', 'API/StrategyGame/UI/Widgets/SStrategyActionGrid/GetCoinIconVisibility/index.html', 'gets coin icon visibility - when cost is 0, coin icon is not visible', 0x00c00010n);
registerSearchData('GetTooltip', '', 'API/StrategyGame/UI/Widgets/SStrategyActionGrid/GetTooltip/index.html', 'gets tooltip text', 0x00c00010n);
registerSearchData('GetActionPadding', '', 'API/StrategyGame/UI/Widgets/SStrategyActionGrid/GetActionPadding/index.html', 'gets action padding, used for getting circle layout', 0x00c00010n);
registerSearchData('GetEnabled', '', 'API/StrategyGame/UI/Widgets/SStrategyActionGrid/GetEnabled/index.html', 'gets enabled state of the action', 0x00c00010n);
registerSearchData('ActionButtons', '', 'API/StrategyGame/UI/Widgets/SStrategyActionGrid/ActionButtons/index.html', '3 x 3 grid of action buttons', 0x00100020n);
registerSearchData('ActionGrid', '', 'API/StrategyGame/UI/Widgets/SStrategyActionGrid/ActionGrid/index.html', 'shared pointer to action grid panel', 0x00400020n);
registerSearchData('OwnerHUD', '', 'API/StrategyGame/UI/Widgets/SStrategyActionGrid/OwnerHUD/index.html', 'Pointer to our parent HUD', 0x00400020n);
registerSearchData('SStrategyMiniMapWidget', '', 'API/StrategyGame/UI/Widgets/SStrategyMiniMapWidget/index.html', 'class declare', 0x00000001n);
registerSearchData('SLATE_BEGIN_ARGS', '', 'API/StrategyGame/UI/Widgets/SStrategyMiniMapWidget/SLATE_BEGIN_ARGS/index.html', '', 0x80100010n);
registerSearchData('Construct', '', 'API/StrategyGame/UI/Widgets/SStrategyMiniMapWidget/Construct/index.html', '', 0x80100010n);
registerSearchData('SupportsKeyboardFocus', '', 'API/StrategyGame/UI/Widgets/SStrategyMiniMapWidget/SupportsKeyboardFocus/index.html', 'Says that we can support keyboard focus', 0x00940010n);
registerSearchData('OnMouseButtonDown', '', 'API/StrategyGame/UI/Widgets/SStrategyMiniMapWidget/OnMouseButtonDown/index.html', 'mouse button down callback', 0x00140010n);
registerSearchData('OnMouseButtonUp', '', 'API/StrategyGame/UI/Widgets/SStrategyMiniMapWidget/OnMouseButtonUp/index.html', 'mouse button up callback', 0x00140010n);
registerSearchData('OnMouseMove', '', 'API/StrategyGame/UI/Widgets/SStrategyMiniMapWidget/OnMouseMove/index.html', 'mouse move callback', 0x00140010n);
registerSearchData('OnMouseLeave', '', 'API/StrategyGame/UI/Widgets/SStrategyMiniMapWidget/OnMouseLeave/index.html', 'mouse leave callback', 0x00140010n);
registerSearchData('OnPaint', '', 'API/StrategyGame/UI/Widgets/SStrategyMiniMapWidget/OnPaint/index.html', 'OnPaint override', 0x00940010n);
registerSearchData('bIsMouseButtonDown', '', 'API/StrategyGame/UI/Widgets/SStrategyMiniMapWidget/bIsMouseButtonDown/index.html', 'holds if mouse button is pressed, resets when mouse leaves the widget', 0x00400020n);
registerSearchData('OwnerHUD', '', 'API/StrategyGame/UI/Widgets/SStrategyMiniMapWidget/OwnerHUD/index.html', 'Pointer to our parent HUD', 0x00400020n);
registerSearchData('SStrategySlateHUDWidget', '', 'API/StrategyGame/UI/Widgets/SStrategySlateHUDWidget/index.html', 'HUD widget base class', 0x00000001n);
registerSearchData('SLATE_BEGIN_ARGS', '', 'API/StrategyGame/UI/Widgets/SStrategySlateHUDWidget/SLATE_BEGIN_ARGS/index.html', '', 0x80100010n);
registerSearchData('Construct', '', 'API/StrategyGame/UI/Widgets/SStrategySlateHUDWidget/Construct/index.html', '', 0x80100010n);
registerSearchData('SupportsKeyboardFocus', '', 'API/StrategyGame/UI/Widgets/SStrategySlateHUDWidget/SupportsKeyboardFocus/index.html', 'If we want to recieve mouse/keyboard events', 0x00940010n);
registerSearchData('OnCursorQuery', '', 'API/StrategyGame/UI/Widgets/SStrategySlateHUDWidget/OnCursorQuery/index.html', 'returns what cursor we want when on this widget', 0x00940010n);
registerSearchData('OnFocusReceived', '', 'API/StrategyGame/UI/Widgets/SStrategySlateHUDWidget/OnFocusReceived/index.html', 'The menu sets up the appropriate mouse settings upon focus', 0x00140010n);
registerSearchData('Tick', '', 'API/StrategyGame/UI/Widgets/SStrategySlateHUDWidget/Tick/index.html', 'executed on every frame', 0x00100010n);
registerSearchData('IsPauseMenuUp', '', 'API/StrategyGame/UI/Widgets/SStrategySlateHUDWidget/IsPauseMenuUp/index.html', 'returns if pause menu is currently active', 0x00900010n);
registerSearchData('TogglePauseMenu', '', 'API/StrategyGame/UI/Widgets/SStrategySlateHUDWidget/TogglePauseMenu/index.html', 'callback function for toggling pause menu', 0x00100010n);
registerSearchData('GetSlateVisibility', '', 'API/StrategyGame/UI/Widgets/SStrategySlateHUDWidget/GetSlateVisibility/index.html', 'sets hit test invisibility when console is up', 0x00a00010n);
registerSearchData('GetUIScale', '', 'API/StrategyGame/UI/Widgets/SStrategySlateHUDWidget/GetUIScale/index.html', 'gets current scale for drawing menu', 0x00a00010n);
registerSearchData('GetActionsWidgetPos', '', 'API/StrategyGame/UI/Widgets/SStrategySlateHUDWidget/GetActionsWidgetPos/index.html', 'returns screen position of action grid widget', 0x00a00010n);
registerSearchData('OnExitGame', '', 'API/StrategyGame/UI/Widgets/SStrategySlateHUDWidget/OnExitGame/index.html', 'callback function for pause menu exit button', 0x00200010n);
registerSearchData('OnReturnToMainMenu', '', 'API/StrategyGame/UI/Widgets/SStrategySlateHUDWidget/OnReturnToMainMenu/index.html', 'callback function for pause menu return to main menu button', 0x00200010n);
registerSearchData('OnCheatAddGold', '', 'API/StrategyGame/UI/Widgets/SStrategySlateHUDWidget/OnCheatAddGold/index.html', 'callback function add gold cheat', 0x00a00010n);
registerSearchData('ExitGame', '', 'API/StrategyGame/UI/Widgets/SStrategySlateHUDWidget/ExitGame/index.html', 'exits the game', 0x00a00010n);
registerSearchData('ReturnToMainMenu', '', 'API/StrategyGame/UI/Widgets/SStrategySlateHUDWidget/ReturnToMainMenu/index.html', 'returns to the main menu', 0x00a00010n);
registerSearchData('GetPauseMenuBgVisibility', '', 'API/StrategyGame/UI/Widgets/SStrategySlateHUDWidget/GetPauseMenuBgVisibility/index.html', 'should we display pause menu?', 0x00a00010n);
registerSearchData('GetResourcesVisibility', '', 'API/StrategyGame/UI/Widgets/SStrategySlateHUDWidget/GetResourcesVisibility/index.html', 'should we display resource amount?', 0x00a00010n);
registerSearchData('GetResultScreenVisibility', '', 'API/StrategyGame/UI/Widgets/SStrategySlateHUDWidget/GetResultScreenVisibility/index.html', 'should we display game results?', 0x00a00010n);
registerSearchData('GetResourcesAmount', '', 'API/StrategyGame/UI/Widgets/SStrategySlateHUDWidget/GetResourcesAmount/index.html', 'returns resources amount to display', 0x00a00010n);
registerSearchData('GetGameTime', '', 'API/StrategyGame/UI/Widgets/SStrategySlateHUDWidget/GetGameTime/index.html', 'returns game timer information to display', 0x00a00010n);
registerSearchData('GetGameResultFont', '', 'API/StrategyGame/UI/Widgets/SStrategySlateHUDWidget/GetGameResultFont/index.html', 'returns game result font (used for animation)', 0x00a00010n);
registerSearchData('GetGameResultText', '', 'API/StrategyGame/UI/Widgets/SStrategySlateHUDWidget/GetGameResultText/index.html', 'returns game result string to display', 0x00a00010n);
registerSearchData('GetGameResultColor', '', 'API/StrategyGame/UI/Widgets/SStrategySlateHUDWidget/GetGameResultColor/index.html', 'returns game result text font color', 0x00a00010n);
registerSearchData('GetGameResultImage', '', 'API/StrategyGame/UI/Widgets/SStrategySlateHUDWidget/GetGameResultImage/index.html', 'displays win/lose logo', 0x00a00010n);
registerSearchData('GetMiniMapWidth', '', 'API/StrategyGame/UI/Widgets/SStrategySlateHUDWidget/GetMiniMapWidth/index.html', 'gets mini map width', 0x00a00010n);
registerSearchData('GetMiniMapHeight', '', 'API/StrategyGame/UI/Widgets/SStrategySlateHUDWidget/GetMiniMapHeight/index.html', 'gets mini map height', 0x00a00010n);
registerSearchData('GetOverlayColor', '', 'API/StrategyGame/UI/Widgets/SStrategySlateHUDWidget/GetOverlayColor/index.html', 'gets game menu overlay color and animates it', 0x00a00010n);
registerSearchData('ActionButtonsWidget', '', 'API/StrategyGame/UI/Widgets/SStrategySlateHUDWidget/ActionButtonsWidget/index.html', 'action buttons widget', 0x00100020n);
registerSearchData('MiniMapWidget', '', 'API/StrategyGame/UI/Widgets/SStrategySlateHUDWidget/MiniMapWidget/index.html', 'minimap widget', 0x00100020n);
registerSearchData('ActionWidgetPosition', '', 'API/StrategyGame/UI/Widgets/SStrategySlateHUDWidget/ActionWidgetPosition/index.html', 'screen position of action grid widget', 0x00100020n);
registerSearchData('PauseButton', '', 'API/StrategyGame/UI/Widgets/SStrategySlateHUDWidget/PauseButton/index.html', 'Button that toggles pause menu', 0x00100020n);
registerSearchData('PauseMenuButtons', '', 'API/StrategyGame/UI/Widgets/SStrategySlateHUDWidget/PauseMenuButtons/index.html', 'Buttons inside the pause menu', 0x00100020n);
registerSearchData('bIsPauseMenuActive', '', 'API/StrategyGame/UI/Widgets/SStrategySlateHUDWidget/bIsPauseMenuActive/index.html', 'is pause menu active?', 0x00200020n);
registerSearchData('MiniMapBorderMargin', '', 'API/StrategyGame/UI/Widgets/SStrategySlateHUDWidget/MiniMapBorderMargin/index.html', 'margin for border', 0x00200020n);
registerSearchData('UIScale', '', 'API/StrategyGame/UI/Widgets/SStrategySlateHUDWidget/UIScale/index.html', 'current UI scale attribute', 0x00200020n);
registerSearchData('bConsoleVisible', '', 'API/StrategyGame/UI/Widgets/SStrategySlateHUDWidget/bConsoleVisible/index.html', 'if console is currently opened', 0x00200020n);
registerSearchData('OwnerHUD', '', 'API/StrategyGame/UI/Widgets/SStrategySlateHUDWidget/OwnerHUD/index.html', 'Pointer to our parent HUD', 0x00200020n);
registerSearchData('HUDStyle', '', 'API/StrategyGame/UI/Widgets/SStrategySlateHUDWidget/HUDStyle/index.html', 'style for this HUD', 0x00a00020n);
registerSearchData('ExitGameTimerHandle', '', 'API/StrategyGame/UI/Widgets/SStrategySlateHUDWidget/ExitGameTimerHandle/index.html', 'Handles to various registered timers', 0x00400020n);
registerSearchData('ReturnToMainMenuTimerHandle', '', 'API/StrategyGame/UI/Widgets/SStrategySlateHUDWidget/ReturnToMainMenuTimerHandle/index.html', '', 0x00400020n);
registerSearchData('SStrategyTitle', '', 'API/StrategyGame/UI/Widgets/SStrategyTitle/index.html', 'class declare', 0x00000001n);
registerSearchData('SLATE_BEGIN_ARGS', '', 'API/StrategyGame/UI/Widgets/SStrategyTitle/SLATE_BEGIN_ARGS/index.html', '', 0x80100010n);
registerSearchData('Construct', '', 'API/StrategyGame/UI/Widgets/SStrategyTitle/Construct/index.html', '', 0x80100010n);
registerSearchData('ShowTitle', '', 'API/StrategyGame/UI/Widgets/SStrategyTitle/ShowTitle/index.html', 'animates title and fades away after some amount of time', 0x00100010n);
registerSearchData('DetachTitle', '', 'API/StrategyGame/UI/Widgets/SStrategyTitle/DetachTitle/index.html', 'removes widget from viewport', 0x00100010n);
registerSearchData('OnCursorQuery', '', 'API/StrategyGame/UI/Widgets/SStrategyTitle/OnCursorQuery/index.html', 'returns what cursor we want when on this widget', 0x00940010n);
registerSearchData('GetTitleColors', '', 'API/StrategyGame/UI/Widgets/SStrategyTitle/GetTitleColors/index.html', '', 0x00a00010n);
registerSearchData('GetTitleColor', '', 'API/StrategyGame/UI/Widgets/SStrategyTitle/GetTitleColor/index.html', 'returns title color', 0x00a00010n);
registerSearchData('GetTitleShadowColor', '', 'API/StrategyGame/UI/Widgets/SStrategyTitle/GetTitleShadowColor/index.html', 'returns title shadow color', 0x00a00010n);
registerSearchData('GetTitleFont', '', 'API/StrategyGame/UI/Widgets/SStrategyTitle/GetTitleFont/index.html', 'returns title font (used for animation)', 0x00a00010n);
registerSearchData('GetTitleText', '', 'API/StrategyGame/UI/Widgets/SStrategyTitle/GetTitleText/index.html', 'returns title string to display', 0x00a00010n);
registerSearchData('GetTimeAlive', '', 'API/StrategyGame/UI/Widgets/SStrategyTitle/GetTimeAlive/index.html', 'returns how long this widget has been alive', 0x00a00010n);
registerSearchData('Tick', '', 'API/StrategyGame/UI/Widgets/SStrategyTitle/Tick/index.html', 'SWidget overrides', 0x00440010n);
registerSearchData('TitleRequestedTime', '', 'API/StrategyGame/UI/Widgets/SStrategyTitle/TitleRequestedTime/index.html', 'stores when title was requested, used for animation', 0x00200020n);
registerSearchData('TimeToLive', '', 'API/StrategyGame/UI/Widgets/SStrategyTitle/TimeToLive/index.html', 'how long the widget should be alive', 0x00200020n);
registerSearchData('FadeOutTime', '', 'API/StrategyGame/UI/Widgets/SStrategyTitle/FadeOutTime/index.html', 'how long the widget should take to fade out', 0x00200020n);
registerSearchData('TitleText', '', 'API/StrategyGame/UI/Widgets/SStrategyTitle/TitleText/index.html', 'current title text', 0x00200020n);
registerSearchData('TitleContainer', '', 'API/StrategyGame/UI/Widgets/SStrategyTitle/TitleContainer/index.html', 'pointer to active widget container', 0x00200020n);
registerSearchData('OwnerWorld', '', 'API/StrategyGame/UI/Widgets/SStrategyTitle/OwnerWorld/index.html', 'Owner world', 0x00200020n);
registerSearchData('AStrategyMiniMapCapture', '', 'API/StrategyGame/AStrategyMiniMapCapture/index.html', 'Copyright 1998-2019 Epic Games, Inc. All Rights Reserved.', 0x04000001n);
registerSearchData('BeginPlay', '', 'API/StrategyGame/AStrategyMiniMapCapture/BeginPlay/index.html', 'after the game is initialized', 0x00240010n);
registerSearchData('Tick', '', 'API/StrategyGame/AStrategyMiniMapCapture/Tick/index.html', 'update world bounds if camera position or FOV changed', 0x00140010n);
registerSearchData('EditorApplyRotation', '', 'API/StrategyGame/AStrategyMiniMapCapture/EditorApplyRotation/index.html', 'filter out to apply delta Yaw', 0x00240010n);
registerSearchData('PostEditChangeProperty', '', 'API/StrategyGame/AStrategyMiniMapCapture/PostEditChangeProperty/index.html', 'revert rotations other than Roll', 0x00200010n);
registerSearchData('UpdateWorldBounds', '', 'API/StrategyGame/AStrategyMiniMapCapture/UpdateWorldBounds/index.html', 'updated world bounds', 0x00200010n);
registerSearchData('MiniMapWidth', '', 'API/StrategyGame/AStrategyMiniMapCapture/MiniMapWidth/index.html', 'End Object interface', 0x40100020n);
registerSearchData('MiniMapHeight', '', 'API/StrategyGame/AStrategyMiniMapCapture/MiniMapHeight/index.html', '', 0x40100020n);
registerSearchData('GroundLevel', '', 'API/StrategyGame/AStrategyMiniMapCapture/GroundLevel/index.html', '', 0x40100020n);
registerSearchData('AudioListenerGroundLevel', '', 'API/StrategyGame/AStrategyMiniMapCapture/AudioListenerGroundLevel/index.html', '', 0x40100020n);
registerSearchData('bUseAudioListenerOrientation', '', 'API/StrategyGame/AStrategyMiniMapCapture/bUseAudioListenerOrientation/index.html', '', 0x40100020n);
registerSearchData('AudioListenerFrontDir', '', 'API/StrategyGame/AStrategyMiniMapCapture/AudioListenerFrontDir/index.html', '', 0x40100020n);
registerSearchData('AudioListenerRightDir', '', 'API/StrategyGame/AStrategyMiniMapCapture/AudioListenerRightDir/index.html', '', 0x40100020n);
registerSearchData('AudioListenerLocationOffset', '', 'API/StrategyGame/AStrategyMiniMapCapture/AudioListenerLocationOffset/index.html', '', 0x40100020n);
registerSearchData('MiniMapView', '', 'API/StrategyGame/AStrategyMiniMapCapture/MiniMapView/index.html', '', 0x40200020n);
registerSearchData('CachedLocation', '', 'API/StrategyGame/AStrategyMiniMapCapture/CachedLocation/index.html', 'last known location', 0x00200020n);
registerSearchData('CachedFOV', '', 'API/StrategyGame/AStrategyMiniMapCapture/CachedFOV/index.html', 'last known FOV', 0x00200020n);
registerSearchData('bTextureChanged', '', 'API/StrategyGame/AStrategyMiniMapCapture/bTextureChanged/index.html', 'texture was re-sized to fit desired mini map size', 0x00200020n);
registerSearchData('AStrategyGameState', '', 'API/StrategyGame/AStrategyGameState/index.html', 'class AStrategyMiniMapCapture;', 0x04000001n);
registerSearchData('GetNumberOfLivePawns', '', 'API/StrategyGame/AStrategyGameState/GetNumberOfLivePawns/index.html', 'Return number of living pawns from a team. ', 0x20100010n);
registerSearchData('GetNumberOfLivePawns', 'Get Number Of Live Pawns', 'BlueprintAPI/Game/GetNumberOfLivePawns/index.html', 'Return number of living pawns from a team. ', 0x20100040n);
registerSearchData('SetGamePaused', '', 'API/StrategyGame/AStrategyGameState/SetGamePaused/index.html', 'Set the pause state of the game. ', 0x20100010n);
registerSearchData('SetGamePaused', 'Set Game Paused', 'BlueprintAPI/Game/SetGamePaused/index.html', 'Set the pause state of the game. ', 0x20100040n);
registerSearchData('OnCharDied', '', 'API/StrategyGame/AStrategyGameState/OnCharDied/index.html', 'Notification that a character has died. ', 0x00100010n);
registerSearchData('OnCharSpawned', '', 'API/StrategyGame/AStrategyGameState/OnCharSpawned/index.html', 'Notification that a character has spawned. ', 0x00100010n);
registerSearchData('OnActorDamaged', '', 'API/StrategyGame/AStrategyGameState/OnActorDamaged/index.html', 'Notification that an actor was damaged. ', 0x00100010n);
registerSearchData('GetPlayerData', '', 'API/StrategyGame/AStrategyGameState/GetPlayerData/index.html', 'Get a team\'s data. ', 0x00900010n);
registerSearchData('StartGameplayStateMachine', '', 'API/StrategyGame/AStrategyGameState/StartGameplayStateMachine/index.html', 'Initialize the game-play state machine.', 0x00100010n);
registerSearchData('SetGameplayState', '', 'API/StrategyGame/AStrategyGameState/SetGameplayState/index.html', 'Change game state and notify observers. ', 0x00100010n);
registerSearchData('IsGameActive', '', 'API/StrategyGame/AStrategyGameState/IsGameActive/index.html', 'Is game currently in state: playing ?', 0x00900010n);
registerSearchData('OnGameStart', '', 'API/StrategyGame/AStrategyGameState/OnGameStart/index.html', 'Notification that game has started.', 0x00100010n);
registerSearchData('FinishGame', '', 'API/StrategyGame/AStrategyGameState/FinishGame/index.html', 'Finish the game. ', 0x00100010n);
registerSearchData('GetRemainingWaitTime', '', 'API/StrategyGame/AStrategyGameState/GetRemainingWaitTime/index.html', 'Get time until game starts, in seconds.', 0x00900010n);
registerSearchData('GetWinningTeam', '', 'API/StrategyGame/AStrategyGameState/GetWinningTeam/index.html', 'Get winning team', 0x00900010n);
registerSearchData('GetGameFinishedTime', '', 'API/StrategyGame/AStrategyGameState/GetGameFinishedTime/index.html', 'Get time when game finished', 0x00900010n);
registerSearchData('SetGameDifficulty', '', 'API/StrategyGame/AStrategyGameState/SetGameDifficulty/index.html', 'Set current difficulty level of the game. ', 0x00100010n);
registerSearchData('AddChar', '', 'API/StrategyGame/AStrategyGameState/AddChar/index.html', 'Register new char to get information from it. ', 0x00200010n);
registerSearchData('RemoveChar', '', 'API/StrategyGame/AStrategyGameState/RemoveChar/index.html', 'Unregister char after death. ', 0x00200010n);
registerSearchData('SetTimersPause', '', 'API/StrategyGame/AStrategyGameState/SetTimersPause/index.html', 'Pauses/Unpauses current game timer. ', 0x00200010n);
registerSearchData('MiniMapCamera', '', 'API/StrategyGame/AStrategyGameState/MiniMapCamera/index.html', 'Mini map camera component.', 0x00100020n);
registerSearchData('GameplayState', '', 'API/StrategyGame/AStrategyGameState/GameplayState/index.html', 'Game state.', 0x00100020n);
registerSearchData('WorldBounds', '', 'API/StrategyGame/AStrategyGameState/WorldBounds/index.html', 'World bounds for mini map & camera movement.', 0x00100020n);
registerSearchData('WarmupTime', '', 'API/StrategyGame/AStrategyGameState/WarmupTime/index.html', 'Warm up time before game starts', 0x40100020n);
registerSearchData('GameDifficulty', '', 'API/StrategyGame/AStrategyGameState/GameDifficulty/index.html', 'Current difficulty level of the game.', 0x00100020n);
registerSearchData('PlayersData', '', 'API/StrategyGame/AStrategyGameState/PlayersData/index.html', 'Gameplay information about each player.', 0x00200020n);
registerSearchData('LivePawnCounter', '', 'API/StrategyGame/AStrategyGameState/LivePawnCounter/index.html', 'Count of live pawns for each team', 0x00200020n);
registerSearchData('WinningTeam', '', 'API/StrategyGame/AStrategyGameState/WinningTeam/index.html', 'Team that won. Set at end of game.', 0x00200020n);
registerSearchData('GameFinishedTime', '', 'API/StrategyGame/AStrategyGameState/GameFinishedTime/index.html', 'Time in seconds when the game finished. Set at the end of game.', 0x00200020n);
registerSearchData('TimerHandle_OnGameStart', '', 'API/StrategyGame/AStrategyGameState/TimerHandle_OnGameStart/index.html', 'Handle for efficient management of UpdateHealth timer', 0x00200020n);
registerSearchData('IStrategyTeamInterface', '', 'API/StrategyGame/Interfaces/IStrategyTeamInterface/index.html', 'Interface for actors which can be associated with teams', 0x00000001n);
registerSearchData('GetTeamNum', '', 'API/StrategyGame/Interfaces/IStrategyTeamInterface/GetTeamNum/index.html', 'returns the team number of the actor', 0x00940010n);
registerSearchData('AStrategyChar', '', 'API/StrategyGame/Pawns/AStrategyChar/index.html', 'Base class for the minions', 0x04000001n);
registerSearchData('Die', '', 'API/StrategyGame/Pawns/AStrategyChar/Die/index.html', 'Kills pawn. ', 0x00140010n);
registerSearchData('FellOutOfWorld', '', 'API/StrategyGame/Pawns/AStrategyChar/FellOutOfWorld/index.html', 'Notification that we have fallen out of the world.', 0x00140010n);
registerSearchData('PostInitializeComponents', '', 'API/StrategyGame/Pawns/AStrategyChar/PostInitializeComponents/index.html', 'initial setup', 0x00140010n);
registerSearchData('CanBeBaseForCharacter', '', 'API/StrategyGame/Pawns/AStrategyChar/CanBeBaseForCharacter/index.html', 'prevent units from basing on each other or buildings', 0x00940010n);
registerSearchData('IsComponentRelevantForNavigation', '', 'API/StrategyGame/Pawns/AStrategyChar/IsComponentRelevantForNavigation/index.html', 'don\'t export collisions for navigation', 0x00940010n);
registerSearchData('TakeDamage', '', 'API/StrategyGame/Pawns/AStrategyChar/TakeDamage/index.html', 'Take damage, handle death', 0x00140010n);
registerSearchData('NotifyHit', '', 'API/StrategyGame/Pawns/AStrategyChar/NotifyHit/index.html', 'pass hit notifies to AI', 0x00140010n);
registerSearchData('GetTeamNum', '', 'API/StrategyGame/Pawns/AStrategyChar/GetTeamNum/index.html', 'Begin StrategyTeamInterface interface', 0x00940010n);
registerSearchData('PlayMeleeAnim', '', 'API/StrategyGame/Pawns/AStrategyChar/PlayMeleeAnim/index.html', 'Starts melee attack. ', 0x00100010n);
registerSearchData('OnMeleeImpactNotify', '', 'API/StrategyGame/Pawns/AStrategyChar/OnMeleeImpactNotify/index.html', 'Notification triggered from the melee animation to signal impact.', 0x00100010n);
registerSearchData('SetWeaponAttachment', '', 'API/StrategyGame/Pawns/AStrategyChar/SetWeaponAttachment/index.html', 'set attachment for weapon slot', 0x20100010n);
registerSearchData('SetWeaponAttachment', 'Set Weapon Attachment', 'BlueprintAPI/Attachment/SetWeaponAttachment/index.html', 'set attachment for weapon slot', 0x20100040n);
registerSearchData('IsWeaponAttached', '', 'API/StrategyGame/Pawns/AStrategyChar/IsWeaponAttached/index.html', '', 0x20100010n);
registerSearchData('IsWeaponAttached', 'Is Weapon Attached', 'BlueprintAPI/Attachment/IsWeaponAttached/index.html', '', 0x20100040n);
registerSearchData('SetArmorAttachment', '', 'API/StrategyGame/Pawns/AStrategyChar/SetArmorAttachment/index.html', 'set attachment for armor slot', 0x20100010n);
registerSearchData('SetArmorAttachment', 'Set Armor Attachment', 'BlueprintAPI/Attachment/SetArmorAttachment/index.html', 'set attachment for armor slot', 0x20100040n);
registerSearchData('IsArmorAttached', '', 'API/StrategyGame/Pawns/AStrategyChar/IsArmorAttached/index.html', '', 0x20100010n);
registerSearchData('IsArmorAttached', 'Is Armor Attached', 'BlueprintAPI/Attachment/IsArmorAttached/index.html', '', 0x20100040n);
registerSearchData('SetTeamNum', '', 'API/StrategyGame/Pawns/AStrategyChar/SetTeamNum/index.html', 'set team number', 0x00100010n);
registerSearchData('ApplyBuff', '', 'API/StrategyGame/Pawns/AStrategyChar/ApplyBuff/index.html', 'adds active buff to this pawn', 0x00100010n);
registerSearchData('GetPawnData', '', 'API/StrategyGame/Pawns/AStrategyChar/GetPawnData/index.html', 'get current pawn\'s data', 0x00900010n);
registerSearchData('GetHealth', '', 'API/StrategyGame/Pawns/AStrategyChar/GetHealth/index.html', 'get current health', 0x20100010n);
registerSearchData('GetHealth', 'Get Health', 'BlueprintAPI/Health/GetHealth/index.html', 'get current health', 0x20100040n);
registerSearchData('GetMaxHealth', '', 'API/StrategyGame/Pawns/AStrategyChar/GetMaxHealth/index.html', 'get max health', 0x20100010n);
registerSearchData('GetMaxHealth', 'Get Max Health', 'BlueprintAPI/Health/GetMaxHealth/index.html', 'get max health', 0x20100040n);
registerSearchData('GetModifiedPawnData', '', 'API/StrategyGame/Pawns/AStrategyChar/GetModifiedPawnData/index.html', 'get all modifiers we have now on pawn', 0x00100010n);
registerSearchData('UpdatePawnData', '', 'API/StrategyGame/Pawns/AStrategyChar/UpdatePawnData/index.html', 'update pawn data after changes in active buffs', 0x00200010n);
registerSearchData('UpdateHealth', '', 'API/StrategyGame/Pawns/AStrategyChar/UpdateHealth/index.html', 'update pawn\'s health', 0x00200010n);
registerSearchData('OnDieAnimationEnd', '', 'API/StrategyGame/Pawns/AStrategyChar/OnDieAnimationEnd/index.html', 'event called after die animation to hide character and delete it asap', 0x00200010n);
registerSearchData('ResourcesToGather', '', 'API/StrategyGame/Pawns/AStrategyChar/ResourcesToGather/index.html', 'How many resources this pawn is worth when it dies.', 0x40100020n);
registerSearchData('bIsDying', '', 'API/StrategyGame/Pawns/AStrategyChar/bIsDying/index.html', 'Identifies if pawn is in its dying state', 0x40100020n);
registerSearchData('Health', '', 'API/StrategyGame/Pawns/AStrategyChar/Health/index.html', 'Current health of this Pawn', 0x40100020n);
registerSearchData('MeleeAnim', '', 'API/StrategyGame/Pawns/AStrategyChar/MeleeAnim/index.html', 'melee anim', 0x40200020n);
registerSearchData('DeathAnim', '', 'API/StrategyGame/Pawns/AStrategyChar/DeathAnim/index.html', 'death anim', 0x40200020n);
registerSearchData('ArmorSlot', '', 'API/StrategyGame/Pawns/AStrategyChar/ArmorSlot/index.html', 'Armor attachment slot', 0x40200020n);
registerSearchData('WeaponSlot', '', 'API/StrategyGame/Pawns/AStrategyChar/WeaponSlot/index.html', 'Weapon attachment slot', 0x40200020n);
registerSearchData('MyTeamNum', '', 'API/StrategyGame/Pawns/AStrategyChar/MyTeamNum/index.html', 'team number', 0x00200020n);
registerSearchData('PawnData', '', 'API/StrategyGame/Pawns/AStrategyChar/PawnData/index.html', 'base pawn data', 0x40200020n);
registerSearchData('ModifiedPawnData', '', 'API/StrategyGame/Pawns/AStrategyChar/ModifiedPawnData/index.html', 'pawn data with added buff effects', 0x00200020n);
registerSearchData('ActiveBuffs', '', 'API/StrategyGame/Pawns/AStrategyChar/ActiveBuffs/index.html', 'List of active buffs', 0x00200020n);
registerSearchData('TimerHandle_UpdatePawnData', '', 'API/StrategyGame/Pawns/AStrategyChar/TimerHandle_UpdatePawnData/index.html', 'Handle for efficient management of UpdatePawnData timer', 0x00400020n);
registerSearchData('TimerHandle_UpdateHealth', '', 'API/StrategyGame/Pawns/AStrategyChar/TimerHandle_UpdateHealth/index.html', 'Handle for efficient management of UpdateHealth timer', 0x00400020n);
registerSearchData('AStrategyGameMode', '', 'API/StrategyGame/AStrategyGameMode/index.html', 'Copyright 1998-2019 Epic Games, Inc. All Rights Reserved.', 0x04000001n);
registerSearchData('InitGameState', '', 'API/StrategyGame/AStrategyGameMode/InitGameState/index.html', 'Initialize the GameState actor.', 0x00140010n);
registerSearchData('RestartPlayer', '', 'API/StrategyGame/AStrategyGameMode/RestartPlayer/index.html', 'Handle new player, skips pawn spawning. ', 0x00140010n);
registerSearchData('ModifyDamage', '', 'API/StrategyGame/AStrategyGameMode/ModifyDamage/index.html', 'Modify the damage we want to apply to an actor. ', 0x00940010n);
registerSearchData('FinishGame', '', 'API/StrategyGame/AStrategyGameMode/FinishGame/index.html', 'Finish the game with selected team as winner. ', 0x20100010n);
registerSearchData('FinishGame', 'Finish Game', 'BlueprintAPI/Game/FinishGame/index.html', 'Finish the game with selected team as winner. ', 0x20100040n);
registerSearchData('ReturnToMenu', '', 'API/StrategyGame/AStrategyGameMode/ReturnToMenu/index.html', '', 0x00100010n);
registerSearchData('OnFriendlyTeam', '', 'API/StrategyGame/AStrategyGameMode/OnFriendlyTeam/index.html', 'Helper function to test teams (null = not in friendly team). ', 0x00120010n);
registerSearchData('OnEnemyTeam', '', 'API/StrategyGame/AStrategyGameMode/OnEnemyTeam/index.html', 'Helper function to test teams (null = not in friendly team). ', 0x00120010n);
registerSearchData('ExitGame', '', 'API/StrategyGame/AStrategyGameMode/ExitGame/index.html', 'Helper method for UI, to exit game.', 0x00100010n);
registerSearchData('GetGameplayState', '', 'API/StrategyGame/AStrategyGameMode/GetGameplayState/index.html', 'Helper to return the current gameplay state.', 0x00a00010n);
registerSearchData('EmptyWallSlotClass', '', 'API/StrategyGame/AStrategyGameMode/EmptyWallSlotClass/index.html', 'Class for empty wall slot.', 0x40100020n);
registerSearchData('TimeBeforeReturnToMenu', '', 'API/StrategyGame/AStrategyGameMode/TimeBeforeReturnToMenu/index.html', 'Time before game returns to menu after finish.', 0x40100020n);
registerSearchData('DifficultyOptionName', '', 'API/StrategyGame/AStrategyGameMode/DifficultyOptionName/index.html', 'Name of the difficulty param on the URL options string.', 0x00920020n);
registerSearchData('StrategyTitle', '', 'API/StrategyGame/AStrategyGameMode/StrategyTitle/index.html', 'Pointer to title text widget.', 0x00100020n);
registerSearchData('TimerHandle_ReturnToMenu', '', 'API/StrategyGame/AStrategyGameMode/TimerHandle_ReturnToMenu/index.html', 'Handle for efficient management of UpdateHealth timer', 0x00200020n);
registerSearchData('AStrategyPlayerController', '', 'API/StrategyGame/Player/AStrategyPlayerController/index.html', 'Copyright 1998-2019 Epic Games, Inc. All Rights Reserved.', 0x04000001n);
registerSearchData('UpdateRotation', '', 'API/StrategyGame/Player/AStrategyPlayerController/UpdateRotation/index.html', 'fixed rotation', 0x00140010n);
registerSearchData('ProcessPlayerInput', '', 'API/StrategyGame/Player/AStrategyPlayerController/ProcessPlayerInput/index.html', 'update input detection', 0x00240010n);
registerSearchData('SetupInputComponent', '', 'API/StrategyGame/Player/AStrategyPlayerController/SetupInputComponent/index.html', '', 0x00240010n);
registerSearchData('GetTeamNum', '', 'API/StrategyGame/Player/AStrategyPlayerController/GetTeamNum/index.html', 'Begin StrategyTeamInterface interface', 0x00940010n);
registerSearchData('SetCameraTarget', '', 'API/StrategyGame/Player/AStrategyPlayerController/SetCameraTarget/index.html', 'set desired camera position.', 0x00100010n);
registerSearchData('SetIgnoreInput', '', 'API/StrategyGame/Player/AStrategyPlayerController/SetIgnoreInput/index.html', 'helper function to toggle input detection.', 0x00100010n);
registerSearchData('OnTapPressed', '', 'API/StrategyGame/Player/AStrategyPlayerController/OnTapPressed/index.html', 'Input handlers.', 0x00100010n);
registerSearchData('OnHoldPressed', '', 'API/StrategyGame/Player/AStrategyPlayerController/OnHoldPressed/index.html', '', 0x00100010n);
registerSearchData('OnHoldReleased', '', 'API/StrategyGame/Player/AStrategyPlayerController/OnHoldReleased/index.html', '', 0x00100010n);
registerSearchData('OnSwipeStarted', '', 'API/StrategyGame/Player/AStrategyPlayerController/OnSwipeStarted/index.html', '', 0x00100010n);
registerSearchData('OnSwipeUpdate', '', 'API/StrategyGame/Player/AStrategyPlayerController/OnSwipeUpdate/index.html', '', 0x00100010n);
registerSearchData('OnSwipeReleased', '', 'API/StrategyGame/Player/AStrategyPlayerController/OnSwipeReleased/index.html', '', 0x00100010n);
registerSearchData('OnSwipeTwoPointsStarted', '', 'API/StrategyGame/Player/AStrategyPlayerController/OnSwipeTwoPointsStarted/index.html', '', 0x00100010n);
registerSearchData('OnSwipeTwoPointsUpdate', '', 'API/StrategyGame/Player/AStrategyPlayerController/OnSwipeTwoPointsUpdate/index.html', '', 0x00100010n);
registerSearchData('OnPinchStarted', '', 'API/StrategyGame/Player/AStrategyPlayerController/OnPinchStarted/index.html', '', 0x00100010n);
registerSearchData('OnPinchUpdate', '', 'API/StrategyGame/Player/AStrategyPlayerController/OnPinchUpdate/index.html', '', 0x00100010n);
registerSearchData('OnToggleInGameMenu', '', 'API/StrategyGame/Player/AStrategyPlayerController/OnToggleInGameMenu/index.html', 'Toggles the ingame menu display.', 0x00100010n);
registerSearchData('MouseLeftMinimap', '', 'API/StrategyGame/Player/AStrategyPlayerController/MouseLeftMinimap/index.html', 'Handler for mouse leaving the minimap.', 0x00100010n);
registerSearchData('MousePressedOverMinimap', '', 'API/StrategyGame/Player/AStrategyPlayerController/MousePressedOverMinimap/index.html', 'Handler for mouse pressed over minimap.', 0x00100010n);
registerSearchData('MouseReleasedOverMinimap', '', 'API/StrategyGame/Player/AStrategyPlayerController/MouseReleasedOverMinimap/index.html', 'Handler for mouse release over minimap.', 0x00100010n);
registerSearchData('SetSelectedActor', '', 'API/StrategyGame/Player/AStrategyPlayerController/SetSelectedActor/index.html', 'Change current selection (on toggle on the same). ', 0x00200010n);
registerSearchData('GetFriendlyTarget', '', 'API/StrategyGame/Player/AStrategyPlayerController/GetFriendlyTarget/index.html', 'Get friendly target under screen space coordinates. ', 0x00a00010n);
registerSearchData('GetAudioListenerPosition', '', 'API/StrategyGame/Player/AStrategyPlayerController/GetAudioListenerPosition/index.html', 'Get audio listener position and orientation. ', 0x00240010n);
registerSearchData('GetStrategySpectatorPawn', '', 'API/StrategyGame/Player/AStrategyPlayerController/GetStrategySpectatorPawn/index.html', 'Helper to return cast version of Spectator pawn.', 0x00c00010n);
registerSearchData('GetCameraComponent', '', 'API/StrategyGame/Player/AStrategyPlayerController/GetCameraComponent/index.html', 'Helper to return camera component via spectator pawn.', 0x00c00010n);
registerSearchData('bIgnoreInput', '', 'API/StrategyGame/Player/AStrategyPlayerController/bIgnoreInput/index.html', 'if set, input and camera updates will be ignored', 0x00200020n);
registerSearchData('SelectedActor', '', 'API/StrategyGame/Player/AStrategyPlayerController/SelectedActor/index.html', 'currently selected actor', 0x00200020n);
registerSearchData('SwipeAnchor3D', '', 'API/StrategyGame/Player/AStrategyPlayerController/SwipeAnchor3D/index.html', 'Swipe anchor.', 0x00200020n);
registerSearchData('PrevSwipeScreenPosition', '', 'API/StrategyGame/Player/AStrategyPlayerController/PrevSwipeScreenPosition/index.html', '', 0x00200020n);
registerSearchData('PrevSwipeMidPoint', '', 'API/StrategyGame/Player/AStrategyPlayerController/PrevSwipeMidPoint/index.html', 'Previous swipe mid point.', 0x00200020n);
registerSearchData('InputHandler', '', 'API/StrategyGame/Player/AStrategyPlayerController/InputHandler/index.html', 'Custom input handler.', 0x40200020n);
registerSearchData('AStrategyHUD', '', 'API/StrategyGame/UI/AStrategyHUD/index.html', 'Copyright 1998-2019 Epic Games, Inc. All Rights Reserved.', 0x04000001n);
registerSearchData('DrawHUD', '', 'API/StrategyGame/UI/AStrategyHUD/DrawHUD/index.html', 'Begin HUD interface', 0x00140010n);
registerSearchData('IsPauseMenuUp', '', 'API/StrategyGame/UI/AStrategyHUD/IsPauseMenuUp/index.html', 'Returns true if the \"Pause\" Menu up.', 0x00900010n);
registerSearchData('HideAllActionButtons', '', 'API/StrategyGame/UI/AStrategyHUD/HideAllActionButtons/index.html', 'Hides all the action buttons. ', 0x00100010n);
registerSearchData('ClearActionRequiredStates', '', 'API/StrategyGame/UI/AStrategyHUD/ClearActionRequiredStates/index.html', 'clears any pending actions (blinking button state)', 0x00100010n);
registerSearchData('GetActionButton', '', 'API/StrategyGame/UI/AStrategyHUD/GetActionButton/index.html', 'Gets single action button data. ', 0x00900010n);
registerSearchData('GetHUDWidget', '', 'API/StrategyGame/UI/AStrategyHUD/GetHUDWidget/index.html', 'gets transparent slate widget covering whole screen', 0x00900010n);
registerSearchData('SetActionGridActor', '', 'API/StrategyGame/UI/AStrategyHUD/SetActionGridActor/index.html', 'sets actor for which action grid is displayed', 0x00100010n);
registerSearchData('TogglePauseMenu', '', 'API/StrategyGame/UI/AStrategyHUD/TogglePauseMenu/index.html', 'Toggles the in-game pause menu', 0x00100010n);
registerSearchData('ShowBlackScreen', '', 'API/StrategyGame/UI/AStrategyHUD/ShowBlackScreen/index.html', 'Enables the black screen, used for transition from game', 0x00100010n);
registerSearchData('DrawMousePointer', '', 'API/StrategyGame/UI/AStrategyHUD/DrawMousePointer/index.html', 'draws mouse pointer', 0x00200010n);
registerSearchData('DrawMiniMap', '', 'API/StrategyGame/UI/AStrategyHUD/DrawMiniMap/index.html', 'draws mini map', 0x00200010n);
registerSearchData('BuildMenuWidgets', '', 'API/StrategyGame/UI/AStrategyHUD/BuildMenuWidgets/index.html', 'builds the slate widgets', 0x00200010n);
registerSearchData('DrawLives', '', 'API/StrategyGame/UI/AStrategyHUD/DrawLives/index.html', 'draw number of lives for player', 0x00a00010n);
registerSearchData('DrawHealthBar', '', 'API/StrategyGame/UI/AStrategyHUD/DrawHealthBar/index.html', 'Draws health bar for specific actor. ', 0x00a00010n);
registerSearchData('DrawActorsHealth', '', 'API/StrategyGame/UI/AStrategyHUD/DrawActorsHealth/index.html', 'draw health bars for actors', 0x00200010n);
registerSearchData('GetActionsWidgetPos', '', 'API/StrategyGame/UI/AStrategyHUD/GetActionsWidgetPos/index.html', 'gets position to display action grid', 0x00a00010n);
registerSearchData('ActionGridPos', '', 'API/StrategyGame/UI/AStrategyHUD/ActionGridPos/index.html', 'position to display action grid', 0x00100020n);
registerSearchData('MiniMapMargin', '', 'API/StrategyGame/UI/AStrategyHUD/MiniMapMargin/index.html', 'mini map margin', 0x00100020n);
registerSearchData('DefaultActionTexture', '', 'API/StrategyGame/UI/AStrategyHUD/DefaultActionTexture/index.html', 'default action texture to use', 0x40100020n);
registerSearchData('DefaultCenterActionTexture', '', 'API/StrategyGame/UI/AStrategyHUD/DefaultCenterActionTexture/index.html', 'bigger, centered action default texture', 0x40100020n);
registerSearchData('MiniMapPoints', '', 'API/StrategyGame/UI/AStrategyHUD/MiniMapPoints/index.html', 'minimap frustum points', 0x00100020n);
registerSearchData('UIScale', '', 'API/StrategyGame/UI/AStrategyHUD/UIScale/index.html', 'current UI scale', 0x00100020n);
registerSearchData('MyHUDMenuWidget', '', 'API/StrategyGame/UI/AStrategyHUD/MyHUDMenuWidget/index.html', 'HUD menu widget', 0x00200020n);
registerSearchData('SelectedActor', '', 'API/StrategyGame/UI/AStrategyHUD/SelectedActor/index.html', 'actor for which action grid is displayed', 0x00200020n);
registerSearchData('BarFillTexture', '', 'API/StrategyGame/UI/AStrategyHUD/BarFillTexture/index.html', 'gray health bar texture', 0x40200020n);
registerSearchData('PlayerTeamHPTexture', '', 'API/StrategyGame/UI/AStrategyHUD/PlayerTeamHPTexture/index.html', 'player team health bar texture', 0x40200020n);
registerSearchData('EnemyTeamHPTexture', '', 'API/StrategyGame/UI/AStrategyHUD/EnemyTeamHPTexture/index.html', 'enemy team health bar texture', 0x40200020n);
registerSearchData('MousePointerNeutral', '', 'API/StrategyGame/UI/AStrategyHUD/MousePointerNeutral/index.html', 'mouse pointer material (default)', 0x40200020n);
registerSearchData('MousePointerAttack', '', 'API/StrategyGame/UI/AStrategyHUD/MousePointerAttack/index.html', 'mouse pointer material (attack)', 0x40200020n);
registerSearchData('ActionPauseTexture', '', 'API/StrategyGame/UI/AStrategyHUD/ActionPauseTexture/index.html', 'Pause button texture', 0x40200020n);
registerSearchData('MenuButtonTexture', '', 'API/StrategyGame/UI/AStrategyHUD/MenuButtonTexture/index.html', 'menu button texture', 0x40200020n);
registerSearchData('ResourceTexture', '', 'API/StrategyGame/UI/AStrategyHUD/ResourceTexture/index.html', 'resource texture - gold coin', 0x40200020n);
registerSearchData('LivesTexture', '', 'API/StrategyGame/UI/AStrategyHUD/LivesTexture/index.html', 'lives texture - barrel', 0x40200020n);
registerSearchData('bBlackScreenActive', '', 'API/StrategyGame/UI/AStrategyHUD/bBlackScreenActive/index.html', 'if we are currently drawing black screen', 0x00200020n);
registerSearchData('FLogCategoryLogGame', '', 'API/StrategyGame/FLogCategoryLogGame/index.html', '', 0x00000002n);
registerSearchData('FLogCategoryLogGame', '', 'API/StrategyGame/FLogCategoryLogGame/FLogCategoryLogGame/index.html', '', 0x80100010n);
registerSearchData('UStrategyGameBlueprintLibrary', '', 'API/StrategyGame/UStrategyGameBlueprintLibrary/index.html', 'Copyright 1998-2019 Epic Games, Inc. All Rights Reserved.', 0x04000001n);
registerSearchData('AreFriends', '', 'API/StrategyGame/UStrategyGameBlueprintLibrary/AreFriends/index.html', 'Are the two actors on the same team. ', 0x0000000820120010n);
registerSearchData('AreFriends', 'Are Friends', 'BlueprintAPI/Game/AreFriends/index.html', 'Are the two actors on the same team. ', 0x0000000820120040n);
registerSearchData('AreEnemies', '', 'API/StrategyGame/UStrategyGameBlueprintLibrary/AreEnemies/index.html', 'Are the two actors on different teams. ', 0x0000000820120010n);
registerSearchData('AreEnemies', 'Are Enemies', 'BlueprintAPI/Game/AreEnemies/index.html', 'Are the two actors on different teams. ', 0x0000000820120040n);
registerSearchData('SpawnProjectile', '', 'API/StrategyGame/UStrategyGameBlueprintLibrary/SpawnProjectile/index.html', 'Spawn a projectile. ', 0x20120010n);
registerSearchData('SpawnProjectile', 'Spawn Projectile', 'BlueprintAPI/Game/SpawnProjectile/index.html', 'Spawn a projectile. ', 0x20120040n);
registerSearchData('SpawnProjectileFromClass', '', 'API/StrategyGame/UStrategyGameBlueprintLibrary/SpawnProjectileFromClass/index.html', '', 0x20120010n);
registerSearchData('SpawnProjectileFromClass', 'Spawn Projectile From Class', 'BlueprintAPI/Game/SpawnProjectileFromClass/index.html', '', 0x20120040n);
registerSearchData('GiveBuff', '', 'API/StrategyGame/UStrategyGameBlueprintLibrary/GiveBuff/index.html', 'Adds buff for specified strategy character. ', 0x20120010n);
registerSearchData('GiveBuff', 'Give Buff', 'BlueprintAPI/Pawn/GiveBuff/index.html', 'Adds buff for specified strategy character. ', 0x20120040n);
registerSearchData('GiveWeapon', '', 'API/StrategyGame/UStrategyGameBlueprintLibrary/GiveWeapon/index.html', 'Give a weapon to specified strategy character. ', 0x20120010n);
registerSearchData('GiveWeapon', 'Give Weapon', 'BlueprintAPI/Pawn/GiveWeapon/index.html', 'Give a weapon to specified strategy character. ', 0x20120040n);
registerSearchData('GiveWeaponFromClass', '', 'API/StrategyGame/UStrategyGameBlueprintLibrary/GiveWeaponFromClass/index.html', '', 0x20120010n);
registerSearchData('GiveWeaponFromClass', 'Give Weapon From Class', 'BlueprintAPI/Pawn/GiveWeaponFromClass/index.html', '', 0x20120040n);
registerSearchData('GiveArmor', '', 'API/StrategyGame/UStrategyGameBlueprintLibrary/GiveArmor/index.html', 'Give armor to specified strategy character. ', 0x20120010n);
registerSearchData('GiveArmor', 'Give Armor', 'BlueprintAPI/Pawn/GiveArmor/index.html', 'Give armor to specified strategy character. ', 0x20120040n);
registerSearchData('GiveArmorFromClass', '', 'API/StrategyGame/UStrategyGameBlueprintLibrary/GiveArmorFromClass/index.html', '', 0x20120010n);
registerSearchData('GiveArmorFromClass', 'Give Armor From Class', 'BlueprintAPI/Pawn/GiveArmorFromClass/index.html', '', 0x20120040n);
registerSearchData('ToggleMinionVisibility', '', 'API/StrategyGame/UStrategyGameBlueprintLibrary/ToggleMinionVisibility/index.html', 'Toggle visibility of specified minion. ', 0x20120010n);
registerSearchData('ToggleMinionVisibility', 'Toggle Minion Visibility', 'BlueprintAPI/Pawn/ToggleMinionVisibility/index.html', 'Toggle visibility of specified minion. ', 0x20120040n);
registerSearchData('RemoveMinion', '', 'API/StrategyGame/UStrategyGameBlueprintLibrary/RemoveMinion/index.html', 'Remove specified minion. ', 0x20120010n);
registerSearchData('RemoveMinion', 'Remove Minion', 'BlueprintAPI/Pawn/RemoveMinion/index.html', 'Remove specified minion. ', 0x20120040n);
registerSearchData('ShowTitle', '', 'API/StrategyGame/UStrategyGameBlueprintLibrary/ShowTitle/index.html', 'Deprecated function. Use ShowWaveTitle.', 0x20120010n);
registerSearchData('ShowTitle', 'Show Title', 'BlueprintAPI/Game/ShowTitle/index.html', 'Deprecated function. Use ShowWaveTitle.', 0x20120040n);
registerSearchData('ShowWaveTitle', '', 'API/StrategyGame/UStrategyGameBlueprintLibrary/ShowWaveTitle/index.html', 'Display the wave title. ', 0x20120010n);
registerSearchData('ShowWaveTitle', 'Show Wave Title', 'BlueprintAPI/Game/ShowWaveTitle/index.html', 'Display the wave title. ', 0x20120040n);
registerSearchData('FStrategyHelpers', '', 'API/StrategyGame/FStrategyHelpers/index.html', 'Copyright 1998-2019 Epic Games, Inc. All Rights Reserved.', 0x00000001n);
registerSearchData('DeprojectScreenToWorld', '', 'API/StrategyGame/FStrategyHelpers/DeprojectScreenToWorld/index.html', 'convert point in screen space to ray in world space', 0x00120010n);
registerSearchData('IntersectRayWithPlane', '', 'API/StrategyGame/FStrategyHelpers/IntersectRayWithPlane/index.html', 'find intersection of ray in world space with ground plane', 0x00120010n);
registerSearchData('CreateAlphaMapFromTexture', '', 'API/StrategyGame/FStrategyHelpers/CreateAlphaMapFromTexture/index.html', 'create alpha map from UTexture2D for hit-tests in Slate', 0x00120010n);
registerSearchData('CreateCanvasTri', '', 'API/StrategyGame/FStrategyHelpers/CreateCanvasTri/index.html', 'creates FCanvasUVTri without UV from 3x FVector2D', 0x00120010n);
registerSearchData('AStrategyProjectile', '', 'API/StrategyGame/AStrategyProjectile/index.html', 'Base class for the projectiles in the game', 0x04000001n);
registerSearchData('OnProjectileHit', '', 'API/StrategyGame/AStrategyProjectile/OnProjectileHit/index.html', 'blueprint event: projectile hit something', 0x20100010n);
registerSearchData('OnProjectileDestroyed', '', 'API/StrategyGame/AStrategyProjectile/OnProjectileDestroyed/index.html', 'blueprint event: projectile hit something', 0x20100010n);
registerSearchData('InitProjectile', '', 'API/StrategyGame/AStrategyProjectile/InitProjectile/index.html', 'initial setup', 0x00100010n);
registerSearchData('OnHit', '', 'API/StrategyGame/AStrategyProjectile/OnHit/index.html', 'handle hit', 0x20100010n);
registerSearchData('LifeSpanExpired', '', 'API/StrategyGame/AStrategyProjectile/LifeSpanExpired/index.html', 'Begin Actor interface', 0x00140010n);
registerSearchData('NotifyActorBeginOverlap', '', 'API/StrategyGame/AStrategyProjectile/NotifyActorBeginOverlap/index.html', 'handle touch to detect enemy pawns', 0x00140010n);
registerSearchData('FellOutOfWorld', '', 'API/StrategyGame/AStrategyProjectile/FellOutOfWorld/index.html', 'Handle falling out of the world', 0x00140010n);
registerSearchData('PostLoad', '', 'API/StrategyGame/AStrategyProjectile/PostLoad/index.html', '', 0x00140010n);
registerSearchData('GetTeamNum', '', 'API/StrategyGame/AStrategyProjectile/GetTeamNum/index.html', '[IStrategyTeamInterface] get team number', 0x00940010n);
registerSearchData('DealDamage', '', 'API/StrategyGame/AStrategyProjectile/DealDamage/index.html', 'deal damage', 0x00200010n);
registerSearchData('GetMovementComp', '', 'API/StrategyGame/AStrategyProjectile/GetMovementComp/index.html', 'Returns MovementComp subobject *', 0x00900010n);
registerSearchData('GetCollisionComp', '', 'API/StrategyGame/AStrategyProjectile/GetCollisionComp/index.html', 'Returns CollisionComp subobject *', 0x00900010n);
registerSearchData('MovementComp', '', 'API/StrategyGame/AStrategyProjectile/MovementComp/index.html', 'movement component', 0x40400020n);
registerSearchData('CollisionComp', '', 'API/StrategyGame/AStrategyProjectile/CollisionComp/index.html', 'collisions', 0x40400020n);
registerSearchData('DamageType', '', 'API/StrategyGame/AStrategyProjectile/DamageType/index.html', 'type of damage', 0x40100020n);
registerSearchData('Building', '', 'API/StrategyGame/AStrategyProjectile/Building/index.html', '', 0x40100020n);
registerSearchData('ConstantDamage', '', 'API/StrategyGame/AStrategyProjectile/ConstantDamage/index.html', 'if set, damage will be constant through lifespan', 0x40100020n);
registerSearchData('MyTeamNum', '', 'API/StrategyGame/AStrategyProjectile/MyTeamNum/index.html', 'current team number', 0x00200020n);
registerSearchData('RemainingDamage', '', 'API/StrategyGame/AStrategyProjectile/RemainingDamage/index.html', 'remaining damage value', 0x00200020n);
registerSearchData('HitActors', '', 'API/StrategyGame/AStrategyProjectile/HitActors/index.html', 'list of just hit actors', 0x00200020n);
registerSearchData('bInitialized', '', 'API/StrategyGame/AStrategyProjectile/bInitialized/index.html', 'true, if projectile was initialized', 0x00200020n);
registerSearchData('IStrategyInputInterface', '', 'API/StrategyGame/Interfaces/IStrategyInputInterface/index.html', 'Interface for actors which can be selected', 0x00000001n);
registerSearchData('OnInputTap', '', 'API/StrategyGame/Interfaces/IStrategyInputInterface/OnInputTap/index.html', 'receive input: tap', 0x00100010n);
registerSearchData('OnInputHold', '', 'API/StrategyGame/Interfaces/IStrategyInputInterface/OnInputHold/index.html', 'receive input: hold', 0x00100010n);
registerSearchData('OnInputHoldReleased', '', 'API/StrategyGame/Interfaces/IStrategyInputInterface/OnInputHoldReleased/index.html', 'receive input: hold released', 0x00100010n);
registerSearchData('OnInputSwipeUpdate', '', 'API/StrategyGame/Interfaces/IStrategyInputInterface/OnInputSwipeUpdate/index.html', 'receive input: swipe update (world space, not screen space)', 0x00100010n);
registerSearchData('OnInputSwipeReleased', '', 'API/StrategyGame/Interfaces/IStrategyInputInterface/OnInputSwipeReleased/index.html', 'receive input: swipe finished (world space, not screen space)', 0x00100010n);
registerSearchData('AStrategyResourceNode', '', 'API/StrategyGame/AStrategyResourceNode/index.html', '', 0x04000001n);
registerSearchData('ResetResource', '', 'API/StrategyGame/AStrategyResourceNode/ResetResource/index.html', 'reset resource actor to reuse it again in game (it\'ll not unhide this actor)', 0x20100010n);
registerSearchData('ResetResource', 'Reset Resource', 'BlueprintAPI/ResourceNode/ResetResource/index.html', 'reset resource actor to reuse it again in game (it\'ll not unhide this actor)', 0x20100040n);
registerSearchData('OnInputTap_Implementation', '', 'API/StrategyGame/AStrategyResourceNode/OnInputTap_Implementation/index.html', '[IStrategyInputInterface] receive input: tap', 0x00140010n);
registerSearchData('OnInputHold_Implementation', '', 'API/StrategyGame/AStrategyResourceNode/OnInputHold_Implementation/index.html', '[IStrategyInputInterface] receive input: hold', 0x00140010n);
registerSearchData('OnInputHoldReleased_Implementation', '', 'API/StrategyGame/AStrategyResourceNode/OnInputHoldReleased_Implementation/index.html', '[IStrategyInputInterface] receive input: hold released', 0x00140010n);
registerSearchData('OnInputSwipeUpdate_Implementation', '', 'API/StrategyGame/AStrategyResourceNode/OnInputSwipeUpdate_Implementation/index.html', '[IStrategyInputInterface] receive input: swipe update', 0x00140010n);
registerSearchData('OnInputSwipeReleased_Implementation', '', 'API/StrategyGame/AStrategyResourceNode/OnInputSwipeReleased_Implementation/index.html', '[IStrategyInputInterface] receive input: swipe finished', 0x00140010n);
registerSearchData('GetAvailableResources', '', 'API/StrategyGame/AStrategyResourceNode/GetAvailableResources/index.html', 'amount of resources left in node', 0x00900010n);
registerSearchData('GetInitialResources', '', 'API/StrategyGame/AStrategyResourceNode/GetInitialResources/index.html', 'initial amount of resources', 0x00900010n);
registerSearchData('OnDepleted', '', 'API/StrategyGame/AStrategyResourceNode/OnDepleted/index.html', 'blueprint event: demolished', 0x20200010n);
registerSearchData('NumResources', '', 'API/StrategyGame/AStrategyResourceNode/NumResources/index.html', 'resources in node', 0x40200020n);
registerSearchData('UStrategyAIAction', '', 'API/StrategyGame/AI/UStrategyAIAction/index.html', 'Copyright 1998-2019 Epic Games, Inc. All Rights Reserved.', 0x04000001n);
registerSearchData('Tick', '', 'API/StrategyGame/AI/UStrategyAIAction/Tick/index.html', 'Update this action. ', 0x00140010n);
registerSearchData('Activate', '', 'API/StrategyGame/AI/UStrategyAIAction/Activate/index.html', 'Activate action.', 0x00140010n);
registerSearchData('ShouldActivate', '', 'API/StrategyGame/AI/UStrategyAIAction/ShouldActivate/index.html', 'Should we activate action this time ?', 0x00940010n);
registerSearchData('Abort', '', 'API/StrategyGame/AI/UStrategyAIAction/Abort/index.html', 'Abort action to start something else.', 0x00140010n);
registerSearchData('IsSafeToAbort', '', 'API/StrategyGame/AI/UStrategyAIAction/IsSafeToAbort/index.html', 'Can we abort this action?', 0x00940010n);
registerSearchData('SetController', '', 'API/StrategyGame/AI/UStrategyAIAction/SetController/index.html', 'Set owning AI controller.', 0x00100010n);
registerSearchData('MyAIController', '', 'API/StrategyGame/AI/UStrategyAIAction/MyAIController/index.html', 'Weak pointer to AI controller, to have faster access (cached information).', 0x00200020n);
registerSearchData('bIsExecuted', '', 'API/StrategyGame/AI/UStrategyAIAction/bIsExecuted/index.html', 'Tells us if we are already executed.', 0x00200020n);
registerSearchData('UStrategyAIAction_AttackTarget', '', 'API/StrategyGame/AI/UStrategyAIAction_AttackTarget/index.html', 'Copyright 1998-2019 Epic Games, Inc. All Rights Reserved.', 0x04000001n);
registerSearchData('Tick', '', 'API/StrategyGame/AI/UStrategyAIAction_AttackTarget/Tick/index.html', 'Update in time current action', 0x00140010n);
registerSearchData('Activate', '', 'API/StrategyGame/AI/UStrategyAIAction_AttackTarget/Activate/index.html', 'activate action', 0x00140010n);
registerSearchData('Abort', '', 'API/StrategyGame/AI/UStrategyAIAction_AttackTarget/Abort/index.html', 'abort action to start something else', 0x00140010n);
registerSearchData('IsSafeToAbort', '', 'API/StrategyGame/AI/UStrategyAIAction_AttackTarget/IsSafeToAbort/index.html', 'can we abort this action?', 0x00940010n);
registerSearchData('ShouldActivate', '', 'API/StrategyGame/AI/UStrategyAIAction_AttackTarget/ShouldActivate/index.html', 'Should we activate action this time ?', 0x00940010n);
registerSearchData('NotifyBump', '', 'API/StrategyGame/AI/UStrategyAIAction_AttackTarget/NotifyBump/index.html', 'Pawn has hit something', 0x00200010n);
registerSearchData('OnMoveCompleted', '', 'API/StrategyGame/AI/UStrategyAIAction_AttackTarget/OnMoveCompleted/index.html', 'notify about completing current move', 0x00200010n);
registerSearchData('MoveCloser', '', 'API/StrategyGame/AI/UStrategyAIAction_AttackTarget/MoveCloser/index.html', 'move closer to target', 0x00200010n);
registerSearchData('UpdateTargetInformation', '', 'API/StrategyGame/AI/UStrategyAIAction_AttackTarget/UpdateTargetInformation/index.html', 'updates any information about target, his location, target changes in ai controller, etc.', 0x00200010n);
registerSearchData('TargetActor', '', 'API/StrategyGame/AI/UStrategyAIAction_AttackTarget/TargetActor/index.html', 'target actor to attack', 0x00200020n);
registerSearchData('TargetDestination', '', 'API/StrategyGame/AI/UStrategyAIAction_AttackTarget/TargetDestination/index.html', 'destination to move closer', 0x00200020n);
registerSearchData('MeleeAttackAnimationEndTime', '', 'API/StrategyGame/AI/UStrategyAIAction_AttackTarget/MeleeAttackAnimationEndTime/index.html', 'time when we will finish playing melee animation', 0x00200020n);
registerSearchData('bIsPlayingAnimation', '', 'API/StrategyGame/AI/UStrategyAIAction_AttackTarget/bIsPlayingAnimation/index.html', 'if pawn is playing attack animation', 0x00200020n);
registerSearchData('bMovingToTarget', '', 'API/StrategyGame/AI/UStrategyAIAction_AttackTarget/bMovingToTarget/index.html', 'set to true when we are moving to our target', 0x00200020n);
registerSearchData('FLogCategoryLogStrategyAI', '', 'API/StrategyGame/AI/FLogCategoryLogStrategyAI/index.html', 'Copyright 1998-2019 Epic Games, Inc. All Rights Reserved.', 0x00000002n);
registerSearchData('FLogCategoryLogStrategyAI', '', 'API/StrategyGame/AI/FLogCategoryLogStrategyAI/FLogCategoryLogStrategyAI/index.html', '', 0x80100010n);
registerSearchData('AStrategyAIController', '', 'API/StrategyGame/AI/AStrategyAIController/index.html', '', 0x04000001n);
registerSearchData('Tick', '', 'API/StrategyGame/AI/AStrategyAIController/Tick/index.html', 'Begin AActor Interface', 0x00140010n);
registerSearchData('OnPossess', '', 'API/StrategyGame/AI/AStrategyAIController/OnPossess/index.html', 'Begin Controller Interface', 0x00240010n);
registerSearchData('OnUnPossess', '', 'API/StrategyGame/AI/AStrategyAIController/OnUnPossess/index.html', '', 0x00240010n);
registerSearchData('OnMoveCompleted', '', 'API/StrategyGame/AI/AStrategyAIController/OnMoveCompleted/index.html', 'Begin AIController Interface', 0x00140010n);
registerSearchData('GetTeamNum', '', 'API/StrategyGame/AI/AStrategyAIController/GetTeamNum/index.html', 'Begin StrategyTeamInterface Interface', 0x00940010n);
registerSearchData('IsActionAllowed', '', 'API/StrategyGame/AI/AStrategyAIController/IsActionAllowed/index.html', 'Checks if we are allowed to use some action', 0x00900010n);
registerSearchData('GetInstanceOfAction', '', 'API/StrategyGame/AI/AStrategyAIController/GetInstanceOfAction/index.html', 'Return instance of action we are allowed to use', 0x00900010n);
registerSearchData('NotifyBump', '', 'API/StrategyGame/AI/AStrategyAIController/NotifyBump/index.html', 'pawn has hit something', 0x00100010n);
registerSearchData('EnableLogic', '', 'API/StrategyGame/AI/AStrategyAIController/EnableLogic/index.html', 'master switch: allows disabling all interactions', 0x00100010n);
registerSearchData('IsLogicEnabled', '', 'API/StrategyGame/AI/AStrategyAIController/IsLogicEnabled/index.html', 'returns information if we have logic enabled or disabled', 0x00900010n);
registerSearchData('IsTargetValid', '', 'API/StrategyGame/AI/AStrategyAIController/IsTargetValid/index.html', 'Checks actor and returns true if valid', 0x00900010n);
registerSearchData('ClaimAsTarget', '', 'API/StrategyGame/AI/AStrategyAIController/ClaimAsTarget/index.html', 'Claim controller as target', 0x00100010n);
registerSearchData('UnClaimAsTarget', '', 'API/StrategyGame/AI/AStrategyAIController/UnClaimAsTarget/index.html', 'UnClaim controller as target', 0x00100010n);
registerSearchData('IsClaimedBy', '', 'API/StrategyGame/AI/AStrategyAIController/IsClaimedBy/index.html', 'Check if desired controller claimed this one', 0x00900010n);
registerSearchData('GetNumberOfAttackers', '', 'API/StrategyGame/AI/AStrategyAIController/GetNumberOfAttackers/index.html', 'get number of enemies who claimed this one as target', 0x00900010n);
registerSearchData('RegisterMovementEventDelegate', '', 'API/StrategyGame/AI/AStrategyAIController/RegisterMovementEventDelegate/index.html', 'register movement related notify, to get notify about completed movement', 0x00100010n);
registerSearchData('UnregisterMovementEventDelegate', '', 'API/StrategyGame/AI/AStrategyAIController/UnregisterMovementEventDelegate/index.html', 'unregister movement related notify', 0x00100010n);
registerSearchData('RegisterBumpEventDelegate', '', 'API/StrategyGame/AI/AStrategyAIController/RegisterBumpEventDelegate/index.html', 'register bump notify, to get notify when pawn bumps with something', 0x00100010n);
registerSearchData('UnregisterBumpEventDelegate', '', 'API/StrategyGame/AI/AStrategyAIController/UnregisterBumpEventDelegate/index.html', 'unregister bump notify', 0x00100010n);
registerSearchData('GetAdjustLocation', '', 'API/StrategyGame/AI/AStrategyAIController/GetAdjustLocation/index.html', '', 0x00140010n);
registerSearchData('SelectTarget', '', 'API/StrategyGame/AI/AStrategyAIController/SelectTarget/index.html', 'Check targets list and select one as current target', 0x00240010n);
registerSearchData('GetSensingComponent', '', 'API/StrategyGame/AI/AStrategyAIController/GetSensingComponent/index.html', 'Returns SensingComponent subobject *', 0x00900010n);
registerSearchData('SensingComponent', '', 'API/StrategyGame/AI/AStrategyAIController/SensingComponent/index.html', 'Component used to detect and respond to sight and sound events.', 0x40400020n);
registerSearchData('AllowedActions', '', 'API/StrategyGame/AI/AStrategyAIController/AllowedActions/index.html', 'List of all possible actions for this logic', 0x40100020n);
registerSearchData('AllActions', '', 'API/StrategyGame/AI/AStrategyAIController/AllActions/index.html', 'List for all actions for this logic instance', 0x40100020n);
registerSearchData('CurrentAction', '', 'API/StrategyGame/AI/AStrategyAIController/CurrentAction/index.html', 'Current, selected action to execute', 0x40100020n);
registerSearchData('AllTargets', '', 'API/StrategyGame/AI/AStrategyAIController/AllTargets/index.html', 'List of all possible targets for us', 0x40100020n);
registerSearchData('CurrentTarget', '', 'API/StrategyGame/AI/AStrategyAIController/CurrentTarget/index.html', 'Current selected target to attack', 0x40100020n);
registerSearchData('ClaimedBy', '', 'API/StrategyGame/AI/AStrategyAIController/ClaimedBy/index.html', 'array of controllers claimed this one as target', 0x00200020n);
registerSearchData('OnMoveCompletedDelegate', '', 'API/StrategyGame/AI/AStrategyAIController/OnMoveCompletedDelegate/index.html', 'Event delegate for when pawn movement is complete.', 0x00200020n);
registerSearchData('OnNotifyBumpDelegate', '', 'API/StrategyGame/AI/AStrategyAIController/OnNotifyBumpDelegate/index.html', 'Event delegate for when pawn has hit something.', 0x00200020n);
registerSearchData('bLogicEnabled', '', 'API/StrategyGame/AI/AStrategyAIController/bLogicEnabled/index.html', 'master switch state', 0x00200020n);
registerSearchData('UStrategyAIAction_MoveToBrewery', '', 'API/StrategyGame/AI/UStrategyAIAction_MoveToBrewery/index.html', '', 0x04000001n);
registerSearchData('Tick', '', 'API/StrategyGame/AI/UStrategyAIAction_MoveToBrewery/Tick/index.html', 'Update in time current action', 0x00140010n);
registerSearchData('Activate', '', 'API/StrategyGame/AI/UStrategyAIAction_MoveToBrewery/Activate/index.html', 'activate action', 0x00140010n);
registerSearchData('Abort', '', 'API/StrategyGame/AI/UStrategyAIAction_MoveToBrewery/Abort/index.html', 'abort action to start something else', 0x00140010n);
registerSearchData('IsSafeToAbort', '', 'API/StrategyGame/AI/UStrategyAIAction_MoveToBrewery/IsSafeToAbort/index.html', 'can we abort this action?', 0x00940010n);
registerSearchData('ShouldActivate', '', 'API/StrategyGame/AI/UStrategyAIAction_MoveToBrewery/ShouldActivate/index.html', 'Should we activate action this time ?', 0x00940010n);
registerSearchData('OnPathUpdated', '', 'API/StrategyGame/AI/UStrategyAIAction_MoveToBrewery/OnPathUpdated/index.html', 'Called from owning controller when given PathGenerator updated it\'s path.', 0x00200010n);
registerSearchData('OnMoveCompleted', '', 'API/StrategyGame/AI/UStrategyAIAction_MoveToBrewery/OnMoveCompleted/index.html', 'notify about completing current move', 0x00200010n);
registerSearchData('TargetAcceptanceRadius', '', 'API/StrategyGame/AI/UStrategyAIAction_MoveToBrewery/TargetAcceptanceRadius/index.html', 'Acceptable distance to target destination', 0x00200020n);
registerSearchData('Destination', '', 'API/StrategyGame/AI/UStrategyAIAction_MoveToBrewery/Destination/index.html', 'current destination we are moving to', 0x00200020n);
registerSearchData('bIsMoving', '', 'API/StrategyGame/AI/UStrategyAIAction_MoveToBrewery/bIsMoving/index.html', 'tells if we stared moving to target', 0x00200020n);
registerSearchData('NotMovingFromTime', '', 'API/StrategyGame/AI/UStrategyAIAction_MoveToBrewery/NotMovingFromTime/index.html', 'last time without movement', 0x00200020n);
registerSearchData('UStrategyAIDirector', '', 'API/StrategyGame/AI/UStrategyAIDirector/index.html', 'Copyright 1998-2019 Epic Games, Inc. All Rights Reserved.', 0x04000001n);
registerSearchData('SetDefaultArmor', '', 'API/StrategyGame/AI/UStrategyAIDirector/SetDefaultArmor/index.html', 'set default armor for spawns', 0x20100010n);
registerSearchData('SetDefaultArmor', 'Set Default Armor', 'BlueprintAPI/Pawn/SetDefaultArmor/index.html', 'set default armor for spawns', 0x20100040n);
registerSearchData('SetDefaultArmorClass', '', 'API/StrategyGame/AI/UStrategyAIDirector/SetDefaultArmorClass/index.html', '', 0x20100010n);
registerSearchData('SetDefaultArmorClass', 'Set Default Armor Class', 'BlueprintAPI/Pawn/SetDefaultArmorClass/index.html', '', 0x20100040n);
registerSearchData('SetDefaultWeapon', '', 'API/StrategyGame/AI/UStrategyAIDirector/SetDefaultWeapon/index.html', 'set default wepon for spawns', 0x20100010n);
registerSearchData('SetDefaultWeapon', 'Set Default Weapon', 'BlueprintAPI/Pawn/SetDefaultWeapon/index.html', 'set default wepon for spawns', 0x20100040n);
registerSearchData('SetDefaultWeaponClass', '', 'API/StrategyGame/AI/UStrategyAIDirector/SetDefaultWeaponClass/index.html', '', 0x20100010n);
registerSearchData('SetDefaultWeaponClass', 'Set Default Weapon Class', 'BlueprintAPI/Pawn/SetDefaultWeaponClass/index.html', '', 0x20100040n);
registerSearchData('SetBuffModifier', '', 'API/StrategyGame/AI/UStrategyAIDirector/SetBuffModifier/index.html', 'set default buff modifier for spawns', 0x20100010n);
registerSearchData('SetBuffModifier', 'Set Buff Modifier', 'BlueprintAPI/Pawn/SetBuffModifier/index.html', 'set default buff modifier for spawns', 0x20100040n);
registerSearchData('GetTeamNum', '', 'API/StrategyGame/AI/UStrategyAIDirector/GetTeamNum/index.html', 'Override to return correct team number', 0x00940010n);
registerSearchData('SetTeamNum', '', 'API/StrategyGame/AI/UStrategyAIDirector/SetTeamNum/index.html', 'Override to return correct team number', 0x00140010n);
registerSearchData('TickComponent', '', 'API/StrategyGame/AI/UStrategyAIDirector/TickComponent/index.html', 'Begin UActorComponent Interface', 0x00140010n);
registerSearchData('GetEnemyBrewery', '', 'API/StrategyGame/AI/UStrategyAIDirector/GetEnemyBrewery/index.html', 'Getter for brewery of enemy side', 0x00900010n);
registerSearchData('OnGameplayStateChange', '', 'API/StrategyGame/AI/UStrategyAIDirector/OnGameplayStateChange/index.html', 'notify about new game state', 0x00100010n);
registerSearchData('RequestSpawn', '', 'API/StrategyGame/AI/UStrategyAIDirector/RequestSpawn/index.html', 'request spawn from AI Director', 0x00100010n);
registerSearchData('SpawnMinions', '', 'API/StrategyGame/AI/UStrategyAIDirector/SpawnMinions/index.html', 'check conditions and spawn minions if possible', 0x00200010n);
registerSearchData('WaveSize', '', 'API/StrategyGame/AI/UStrategyAIDirector/WaveSize/index.html', 'Number of pawns to spawn each wave', 0x40100020n);
registerSearchData('RadiusToSpawnOn', '', 'API/StrategyGame/AI/UStrategyAIDirector/RadiusToSpawnOn/index.html', '', 0x40100020n);
registerSearchData('DefaultArmor', '', 'API/StrategyGame/AI/UStrategyAIDirector/DefaultArmor/index.html', 'default armor for spawns', 0x40200020n);
registerSearchData('DefaultWeapon', '', 'API/StrategyGame/AI/UStrategyAIDirector/DefaultWeapon/index.html', 'default weapon for spawns', 0x40200020n);
registerSearchData('BuffModifier', '', 'API/StrategyGame/AI/UStrategyAIDirector/BuffModifier/index.html', 'default modifier for spawns', 0x40200020n);
registerSearchData('CustomScale', '', 'API/StrategyGame/AI/UStrategyAIDirector/CustomScale/index.html', 'Custom scale for spawns', 0x00200020n);
registerSearchData('AnimationRate', '', 'API/StrategyGame/AI/UStrategyAIDirector/AnimationRate/index.html', 'Custom animation rate for spawns', 0x00200020n);
registerSearchData('NextSpawnTime', '', 'API/StrategyGame/AI/UStrategyAIDirector/NextSpawnTime/index.html', 'next time to spawn minion', 0x00200020n);
registerSearchData('MyTeamNum', '', 'API/StrategyGame/AI/UStrategyAIDirector/MyTeamNum/index.html', 'team number', 0x00200020n);
registerSearchData('EnemyBrewery', '', 'API/StrategyGame/AI/UStrategyAIDirector/EnemyBrewery/index.html', 'Brewery of my biggest enemy', 0x00200020n);
registerSearchData('UStrategyAISensingComponent', '', 'API/StrategyGame/AI/UStrategyAISensingComponent/index.html', 'SensingComponent encapsulates sensory (ie sight and hearing) settings and functionality for an Actor, allowing the actor to see/hear Pawns in the world. It does *not* enable hearing and sight sensing by default.', 0x04000001n);
registerSearchData('ShouldCheckVisibilityOf', '', 'API/StrategyGame/AI/UStrategyAISensingComponent/ShouldCheckVisibilityOf/index.html', 'Check pawn to see if we want to check visibility on him', 0x00940010n);
registerSearchData('UpdateAISensing', '', 'API/StrategyGame/AI/UStrategyAISensingComponent/UpdateAISensing/index.html', 'See if there are interesting sounds and sights that we want to detect, and respond to them if so.', 0x00140010n);
registerSearchData('CanSenseAnything', '', 'API/StrategyGame/AI/UStrategyAISensingComponent/CanSenseAnything/index.html', 'Are we capable of sensing anything (and do we have any callbacks that care about sensing)? If so, calls UpdateAISensing().', 0x00940010n);
registerSearchData('InitializeComponent', '', 'API/StrategyGame/AI/UStrategyAISensingComponent/InitializeComponent/index.html', 'Begin UActorComponent interface.', 0x00140010n);
registerSearchData('KnownTargets', '', 'API/StrategyGame/AI/UStrategyAISensingComponent/KnownTargets/index.html', 'list of known targets', 0x40100020n);
registerSearchData('SightDistance', '', 'API/StrategyGame/AI/UStrategyAISensingComponent/SightDistance/index.html', 'End UActorComponent interface.', 0x40200020n);
registerSearchData('IStrategySelectionInterface', '', 'API/StrategyGame/Interfaces/IStrategySelectionInterface/index.html', 'Interface for actors which receive notifies about their selected state', 0x00000001n);
registerSearchData('OnSelectionGained', '', 'API/StrategyGame/Interfaces/IStrategySelectionInterface/OnSelectionGained/index.html', 'tries to select actor', 0x00100010n);
registerSearchData('OnSelectionLost', '', 'API/StrategyGame/Interfaces/IStrategySelectionInterface/OnSelectionLost/index.html', 'tries to deselect actor', 0x00100010n);
registerSearchData('AStrategyBuilding', '', 'API/StrategyGame/Buildings/AStrategyBuilding/index.html', '', 0x04000001n);
registerSearchData('PostInitializeComponents', '', 'API/StrategyGame/Buildings/AStrategyBuilding/PostInitializeComponents/index.html', 'Begin Actor interface', 0x00140010n);
registerSearchData('Destroyed', '', 'API/StrategyGame/Buildings/AStrategyBuilding/Destroyed/index.html', '', 0x00140010n);
registerSearchData('Tick', '', 'API/StrategyGame/Buildings/AStrategyBuilding/Tick/index.html', '', 0x00140010n);
registerSearchData('PostLoad', '', 'API/StrategyGame/Buildings/AStrategyBuilding/PostLoad/index.html', '', 0x00140010n);
registerSearchData('OnSelectionGained_Implementation', '', 'API/StrategyGame/Buildings/AStrategyBuilding/OnSelectionGained_Implementation/index.html', '[IStrategySelectionInterface] tries to select actor', 0x00140010n);
registerSearchData('OnSelectionLost_Implementation', '', 'API/StrategyGame/Buildings/AStrategyBuilding/OnSelectionLost_Implementation/index.html', '[IStrategySelectionInterface] tries to deselect actor', 0x00140010n);
registerSearchData('OnInputTap_Implementation', '', 'API/StrategyGame/Buildings/AStrategyBuilding/OnInputTap_Implementation/index.html', '[IStrategyInputInterface] receive input: tap', 0x00140010n);
registerSearchData('OnInputHold_Implementation', '', 'API/StrategyGame/Buildings/AStrategyBuilding/OnInputHold_Implementation/index.html', '[IStrategyInputInterface] receive input: hold', 0x00140010n);
registerSearchData('OnInputHoldReleased_Implementation', '', 'API/StrategyGame/Buildings/AStrategyBuilding/OnInputHoldReleased_Implementation/index.html', '[IStrategyInputInterface] receive input: hold released', 0x00140010n);
registerSearchData('OnInputSwipeUpdate_Implementation', '', 'API/StrategyGame/Buildings/AStrategyBuilding/OnInputSwipeUpdate_Implementation/index.html', '[IStrategyInputInterface] receive input: swipe update', 0x00140010n);
registerSearchData('OnInputSwipeReleased_Implementation', '', 'API/StrategyGame/Buildings/AStrategyBuilding/OnInputSwipeReleased_Implementation/index.html', '[IStrategyInputInterface] receive input: swipe finished', 0x00140010n);
registerSearchData('GetTeamNum', '', 'API/StrategyGame/Buildings/AStrategyBuilding/GetTeamNum/index.html', '[IStrategyTeamInterface] get team number', 0x00940010n);
registerSearchData('SetTeamNum', '', 'API/StrategyGame/Buildings/AStrategyBuilding/SetTeamNum/index.html', 'set team number', 0x00140010n);
registerSearchData('NotifyActorBeginOverlap', '', 'API/StrategyGame/Buildings/AStrategyBuilding/NotifyActorBeginOverlap/index.html', 'handle touch events', 0x00140010n);
registerSearchData('CanAffectChar', '', 'API/StrategyGame/Buildings/AStrategyBuilding/CanAffectChar/index.html', 'Check if building can affect char', 0x20100010n);
registerSearchData('CanAffectChar', 'Can Affect Char', 'BlueprintAPI/Building/CanAffectChar/index.html', 'Check if building can affect char', 0x20100040n);
registerSearchData('ReplaceBuilding', '', 'API/StrategyGame/Buildings/AStrategyBuilding/ReplaceBuilding/index.html', 'replace building with other class. return true if this building should never be built again', 0x00140010n);
registerSearchData('ReplaceBuilding', '', 'API/StrategyGame/Buildings/AStrategyBuilding/ReplaceBuilding-1-0/index.html', 'replace building with other class, returns new building in second parameter. return true if this building should never be built again', 0x00140010n);
registerSearchData('StartBuild', '', 'API/StrategyGame/Buildings/AStrategyBuilding/StartBuild/index.html', 'Switch building into build state', 0x00100010n);
registerSearchData('FinishBuild', '', 'API/StrategyGame/Buildings/AStrategyBuilding/FinishBuild/index.html', 'Build state is finished, switch building into normal state', 0x00100010n);
registerSearchData('IsBuildFinished', '', 'API/StrategyGame/Buildings/AStrategyBuilding/IsBuildFinished/index.html', 'Returns true if building process is finished, false otherwise.', 0x00100010n);
registerSearchData('GetHealth', '', 'API/StrategyGame/Buildings/AStrategyBuilding/GetHealth/index.html', 'get current health', 0x20100010n);
registerSearchData('GetHealth', 'Get Health', 'BlueprintAPI/Health/GetHealth/index.html', 'get current health', 0x20100040n);
registerSearchData('GetMaxHealth', '', 'API/StrategyGame/Buildings/AStrategyBuilding/GetMaxHealth/index.html', 'get max health', 0x20100010n);
registerSearchData('GetMaxHealth', 'Get Max Health', 'BlueprintAPI/Health/GetMaxHealth/index.html', 'get max health', 0x20100040n);
registerSearchData('GetBuildingName', '', 'API/StrategyGame/Buildings/AStrategyBuilding/GetBuildingName/index.html', 'get building\'s name', 0x00900010n);
registerSearchData('GetBuildingCost', '', 'API/StrategyGame/Buildings/AStrategyBuilding/GetBuildingCost/index.html', 'get building\'s cost', 0x00900010n);
registerSearchData('GetBuildTime', '', 'API/StrategyGame/Buildings/AStrategyBuilding/GetBuildTime/index.html', 'get construction time', 0x00900010n);
registerSearchData('GetRemainingBuildCost', '', 'API/StrategyGame/Buildings/AStrategyBuilding/GetRemainingBuildCost/index.html', 'return cost needed to finish building', 0x00900010n);
registerSearchData('ShowActionMenu', '', 'API/StrategyGame/Buildings/AStrategyBuilding/ShowActionMenu/index.html', 'display action menu for building', 0x00240010n);
registerSearchData('HideActionMenu', '', 'API/StrategyGame/Buildings/AStrategyBuilding/HideActionMenu/index.html', 'hide action menu for building', 0x20240010n);
registerSearchData('HideActionMenu', 'Hide Action Menu', 'BlueprintAPI/Building/HideActionMenu/index.html', 'hide action menu for building', 0x20240040n);
registerSearchData('GetUpgradeList', '', 'API/StrategyGame/Buildings/AStrategyBuilding/GetUpgradeList/index.html', 'collect possible upgrades', 0x00a40010n);
registerSearchData('OnTapEvent', '', 'API/StrategyGame/Buildings/AStrategyBuilding/OnTapEvent/index.html', 'blueprint event: tap', 0x20200010n);
registerSearchData('OnHoldEvent', '', 'API/StrategyGame/Buildings/AStrategyBuilding/OnHoldEvent/index.html', 'blueprint event: hold', 0x20200010n);
registerSearchData('OnHoldReleasedEvent', '', 'API/StrategyGame/Buildings/AStrategyBuilding/OnHoldReleasedEvent/index.html', 'blueprint event: hold released', 0x20200010n);
registerSearchData('OnSwipeUpdateEvent', '', 'API/StrategyGame/Buildings/AStrategyBuilding/OnSwipeUpdateEvent/index.html', 'blueprint event: swipe update', 0x20200010n);
registerSearchData('OnSwipeReleasedEvent', '', 'API/StrategyGame/Buildings/AStrategyBuilding/OnSwipeReleasedEvent/index.html', 'blueprint event: swipe released', 0x20200010n);
registerSearchData('OnCharTouch', '', 'API/StrategyGame/Buildings/AStrategyBuilding/OnCharTouch/index.html', 'blueprint event: touch', 0x20200010n);
registerSearchData('OnBuildStarted', '', 'API/StrategyGame/Buildings/AStrategyBuilding/OnBuildStarted/index.html', 'blueprint event: build started', 0x20200010n);
registerSearchData('OnBuildFinished', '', 'API/StrategyGame/Buildings/AStrategyBuilding/OnBuildFinished/index.html', 'blueprint event: build finished', 0x20200010n);
registerSearchData('GetTriggerBox', '', 'API/StrategyGame/Buildings/AStrategyBuilding/GetTriggerBox/index.html', 'Returns TriggerBox subobject *', 0x00a00010n);
registerSearchData('SpawnTeamNum', '', 'API/StrategyGame/Buildings/AStrategyBuilding/SpawnTeamNum/index.html', 'team', 0x40100020n);
registerSearchData('BuildFinishedDelegate', '', 'API/StrategyGame/Buildings/AStrategyBuilding/BuildFinishedDelegate/index.html', 'multicast about finished construction', 0x00100020n);
registerSearchData('ConstructionStartStinger', '', 'API/StrategyGame/Buildings/AStrategyBuilding/ConstructionStartStinger/index.html', 'construction start sound stinger', 0x40200020n);
registerSearchData('ConstructionEndStinger', '', 'API/StrategyGame/Buildings/AStrategyBuilding/ConstructionEndStinger/index.html', 'construction end sound stinger', 0x40200020n);
registerSearchData('UpgradeStinger', '', 'API/StrategyGame/Buildings/AStrategyBuilding/UpgradeStinger/index.html', 'upgrade construction sound stinger', 0x40200020n);
registerSearchData('Cost', '', 'API/StrategyGame/Buildings/AStrategyBuilding/Cost/index.html', 'cost of building', 0x40200020n);
registerSearchData('AdditionalCost', '', 'API/StrategyGame/Buildings/AStrategyBuilding/AdditionalCost/index.html', 'cost of building', 0x40200020n);
registerSearchData('BuildTime', '', 'API/StrategyGame/Buildings/AStrategyBuilding/BuildTime/index.html', 'construction time', 0x40200020n);
registerSearchData('BuildingName', '', 'API/StrategyGame/Buildings/AStrategyBuilding/BuildingName/index.html', 'name of building', 0x40200020n);
registerSearchData('BuildingIcon', '', 'API/StrategyGame/Buildings/AStrategyBuilding/BuildingIcon/index.html', 'building icon for UI', 0x40200020n);
registerSearchData('Health', '', 'API/StrategyGame/Buildings/AStrategyBuilding/Health/index.html', 'hit points for building', 0x40200020n);
registerSearchData('TriggerBox', '', 'API/StrategyGame/Buildings/AStrategyBuilding/TriggerBox/index.html', 'trigger box component', 0x40400020n);
registerSearchData('bAffectFriendlyMinion', '', 'API/StrategyGame/Buildings/AStrategyBuilding/bAffectFriendlyMinion/index.html', 'affect friendly minions?', 0x40200020n);
registerSearchData('bAffectEnemyMinion', '', 'API/StrategyGame/Buildings/AStrategyBuilding/bAffectEnemyMinion/index.html', 'affect enemy minions?', 0x40200020n);
registerSearchData('bIsContructionFinished', '', 'API/StrategyGame/Buildings/AStrategyBuilding/bIsContructionFinished/index.html', 'if construction is finished, any build actions are repairs (cheaper)', 0x40200020n);
registerSearchData('Upgrades', '', 'API/StrategyGame/Buildings/AStrategyBuilding/Upgrades/index.html', 'list of possible upgrades', 0x40200020n);
registerSearchData('bIsBeingBuild', '', 'API/StrategyGame/Buildings/AStrategyBuilding/bIsBeingBuild/index.html', 'is being build (inactive)?', 0x00200020n);
registerSearchData('bIsActionMenuDisplayed', '', 'API/StrategyGame/Buildings/AStrategyBuilding/bIsActionMenuDisplayed/index.html', 'is action menu displayed?', 0x00200020n);
registerSearchData('bIsCustomActionDisplayed', '', 'API/StrategyGame/Buildings/AStrategyBuilding/bIsCustomActionDisplayed/index.html', 'is custom action displayed?', 0x00200020n);
registerSearchData('MyTeamNum', '', 'API/StrategyGame/Buildings/AStrategyBuilding/MyTeamNum/index.html', 'current team number', 0x00200020n);
registerSearchData('InitialBuildTime', '', 'API/StrategyGame/Buildings/AStrategyBuilding/InitialBuildTime/index.html', 'Built time if building is not attacked in the meantime', 0x00200020n);
registerSearchData('RemainingBuildTime', '', 'API/StrategyGame/Buildings/AStrategyBuilding/RemainingBuildTime/index.html', 'remaining build time', 0x00200020n);
registerSearchData('FWaveSpawnedDelegate', '', 'API/StrategyGame/Buildings/FWaveSpawnedDelegate/index.html', 'Copyright 1998-2019 Epic Games, Inc. All Rights Reserved.', 0x00000001n);
registerSearchData('FWaveSpawnedDelegate', '', 'API/StrategyGame/Buildings/FWaveSpawnedDelegate/FWaveSpawnedDelegate/index.html', '', 0x80100010n);
registerSearchData('FWaveSpawnedDelegate', '', 'API/StrategyGame/Buildings/FWaveSpawnedDelegate/FWaveSpawnedDelegate-1-0/index.html', '', 0x80100010n);
registerSearchData('Broadcast', '', 'API/StrategyGame/Buildings/FWaveSpawnedDelegate/Broadcast/index.html', '', 0x00900010n);
registerSearchData('FGameFinishedDelegate', '', 'API/StrategyGame/Buildings/FGameFinishedDelegate/index.html', '', 0x00000001n);
registerSearchData('FGameFinishedDelegate', '', 'API/StrategyGame/Buildings/FGameFinishedDelegate/FGameFinishedDelegate/index.html', '', 0x80100010n);
registerSearchData('FGameFinishedDelegate', '', 'API/StrategyGame/Buildings/FGameFinishedDelegate/FGameFinishedDelegate-1-0/index.html', '', 0x80100010n);
registerSearchData('Broadcast', '', 'API/StrategyGame/Buildings/FGameFinishedDelegate/Broadcast/index.html', '', 0x00900010n);
registerSearchData('FConstructedUpgradeDelegate', '', 'API/StrategyGame/Buildings/FConstructedUpgradeDelegate/index.html', '', 0x00000001n);
registerSearchData('FConstructedUpgradeDelegate', '', 'API/StrategyGame/Buildings/FConstructedUpgradeDelegate/FConstructedUpgradeDelegate/index.html', '', 0x80100010n);
registerSearchData('FConstructedUpgradeDelegate', '', 'API/StrategyGame/Buildings/FConstructedUpgradeDelegate/FConstructedUpgradeDelegate-1-0/index.html', '', 0x80100010n);
registerSearchData('Broadcast', '', 'API/StrategyGame/Buildings/FConstructedUpgradeDelegate/Broadcast/index.html', '', 0x00900010n);
registerSearchData('AStrategyBuilding_Brewery', '', 'API/StrategyGame/Buildings/AStrategyBuilding_Brewery/index.html', '', 0x04000001n);
registerSearchData('GetNumberOfLives', '', 'API/StrategyGame/Buildings/AStrategyBuilding_Brewery/GetNumberOfLives/index.html', 'get current number of lives', 0x20100010n);
registerSearchData('GetNumberOfLives', 'Get Number Of Lives', 'BlueprintAPI/Brewery/GetNumberOfLives/index.html', 'get current number of lives', 0x20100040n);
registerSearchData('SetNumberOfLives', '', 'API/StrategyGame/Buildings/AStrategyBuilding_Brewery/SetNumberOfLives/index.html', 'set current number of lives', 0x20100010n);
registerSearchData('SetNumberOfLives', 'Set Number Of Lives', 'BlueprintAPI/Brewery/SetNumberOfLives/index.html', 'set current number of lives', 0x20100040n);
registerSearchData('OnConstructedBuilding', '', 'API/StrategyGame/Buildings/AStrategyBuilding_Brewery/OnConstructedBuilding/index.html', 'event about constructed upgrade', 0x00140010n);
registerSearchData('PostInitializeComponents', '', 'API/StrategyGame/Buildings/AStrategyBuilding_Brewery/PostInitializeComponents/index.html', 'initial setup', 0x00140010n);
registerSearchData('SetTeamNum', '', 'API/StrategyGame/Buildings/AStrategyBuilding_Brewery/SetTeamNum/index.html', 'change current team', 0x00140010n);
registerSearchData('ReplaceBuilding', '', 'API/StrategyGame/Buildings/AStrategyBuilding_Brewery/ReplaceBuilding/index.html', 'replace building with other class. return true if this building should never be built again', 0x00140010n);
registerSearchData('ShowActionMenu', '', 'API/StrategyGame/Buildings/AStrategyBuilding_Brewery/ShowActionMenu/index.html', 'add additional button for spawning dwarfs here', 0x00140010n);
registerSearchData('SpawnDwarf', '', 'API/StrategyGame/Buildings/AStrategyBuilding_Brewery/SpawnDwarf/index.html', 'spawns a dwarf', 0x00100010n);
registerSearchData('GetSpawnQueueLength', '', 'API/StrategyGame/Buildings/AStrategyBuilding_Brewery/GetSpawnQueueLength/index.html', 'gets spawn queue length string', 0x00900010n);
registerSearchData('OnGameplayStateChange', '', 'API/StrategyGame/Buildings/AStrategyBuilding_Brewery/OnGameplayStateChange/index.html', 'notify about new game state', 0x00100010n);
registerSearchData('GetAIDirector', '', 'API/StrategyGame/Buildings/AStrategyBuilding_Brewery/GetAIDirector/index.html', 'Returns AIDirector subobject *', 0x00900010n);
registerSearchData('AIDirector', '', 'API/StrategyGame/Buildings/AStrategyBuilding_Brewery/AIDirector/index.html', 'team\'s AI director', 0x40400020n);
registerSearchData('MinionCharClass', '', 'API/StrategyGame/Buildings/AStrategyBuilding_Brewery/MinionCharClass/index.html', 'The class of minion to spawn.', 0x40100020n);
registerSearchData('LeftSlot', '', 'API/StrategyGame/Buildings/AStrategyBuilding_Brewery/LeftSlot/index.html', 'left slot for upgrades to place in', 0x40100020n);
registerSearchData('RightSlot', '', 'API/StrategyGame/Buildings/AStrategyBuilding_Brewery/RightSlot/index.html', 'right slot for upgrades to place in', 0x40100020n);
registerSearchData('SpawnCost', '', 'API/StrategyGame/Buildings/AStrategyBuilding_Brewery/SpawnCost/index.html', 'cost of each requested spawn', 0x40100020n);
registerSearchData('ResourceInitialEasy', '', 'API/StrategyGame/Buildings/AStrategyBuilding_Brewery/ResourceInitialEasy/index.html', 'initial resources on easy difficulty', 0x40100020n);
registerSearchData('ResourceInitialMedium', '', 'API/StrategyGame/Buildings/AStrategyBuilding_Brewery/ResourceInitialMedium/index.html', 'initial resources on medium difficulty', 0x40100020n);
registerSearchData('ResourceInitialHard', '', 'API/StrategyGame/Buildings/AStrategyBuilding_Brewery/ResourceInitialHard/index.html', 'initial resources on hard difficulty', 0x40100020n);
registerSearchData('OnWaveSpawned', '', 'API/StrategyGame/Buildings/AStrategyBuilding_Brewery/OnWaveSpawned/index.html', 'delegate to broadcast about finished wave', 0x40100020n);
registerSearchData('OnConstructedUpgrade', '', 'API/StrategyGame/Buildings/AStrategyBuilding_Brewery/OnConstructedUpgrade/index.html', 'Event delegate for building upgrade construction complete.', 0x40100020n);
registerSearchData('EmptySlotClass', '', 'API/StrategyGame/Buildings/AStrategyBuilding_Brewery/EmptySlotClass/index.html', 'class for empty slot', 0x40100020n);
registerSearchData('NumberOfLives', '', 'API/StrategyGame/Buildings/AStrategyBuilding_Brewery/NumberOfLives/index.html', 'Number of lives.', 0x00200020n);
registerSearchData('AStrategyMenuGameMode', '', 'API/StrategyGame/Menu/AStrategyMenuGameMode/index.html', 'Copyright 1998-2019 Epic Games, Inc. All Rights Reserved.', 0x04000001n);
registerSearchData('SpawnDefaultPawnFor_Implementation', '', 'API/StrategyGame/Menu/AStrategyMenuGameMode/SpawnDefaultPawnFor_Implementation/index.html', 'Begin GameMode interface', 0x00140010n);
registerSearchData('AStrategyMenuHUD', '', 'API/StrategyGame/Menu/AStrategyMenuHUD/index.html', '', 0x04000001n);
registerSearchData('PostInitializeComponents', '', 'API/StrategyGame/Menu/AStrategyMenuHUD/PostInitializeComponents/index.html', 'Begin HUD interface', 0x00140010n);
registerSearchData('RebuildWidgets', '', 'API/StrategyGame/Menu/AStrategyMenuHUD/RebuildWidgets/index.html', 'Clears out the old widgets, rebuilds them ', 0x00100010n);
registerSearchData('AddMenuItem', '', 'API/StrategyGame/Menu/AStrategyMenuHUD/AddMenuItem/index.html', 'Helper for adding menu items . ', 0x00400010n);
registerSearchData('ExecuteQuitAction', '', 'API/StrategyGame/Menu/AStrategyMenuHUD/ExecuteQuitAction/index.html', 'Callback for quit button.', 0x00400010n);
registerSearchData('ExecuteSelectMapAction', '', 'API/StrategyGame/Menu/AStrategyMenuHUD/ExecuteSelectMapAction/index.html', 'Callback for start button. ', 0x00400010n);
registerSearchData('LaunchGame', '', 'API/StrategyGame/Menu/AStrategyMenuHUD/LaunchGame/index.html', 'Starts the game with selected difficulty.', 0x00400010n);
registerSearchData('Quit', '', 'API/StrategyGame/Menu/AStrategyMenuHUD/Quit/index.html', 'Quits the game.', 0x00400010n);
registerSearchData('ShowLoadingScreen', '', 'API/StrategyGame/Menu/AStrategyMenuHUD/ShowLoadingScreen/index.html', 'Show the loading screen.', 0x00400010n);
registerSearchData('MainMenu', '', 'API/StrategyGame/Menu/AStrategyMenuHUD/MainMenu/index.html', 'Main menu.', 0x00100020n);
registerSearchData('CurrentMenu', '', 'API/StrategyGame/Menu/AStrategyMenuHUD/CurrentMenu/index.html', 'Currently visible menu.', 0x00100020n);
registerSearchData('NextMenu', '', 'API/StrategyGame/Menu/AStrategyMenuHUD/NextMenu/index.html', 'Menu that is about to open.', 0x00100020n);
registerSearchData('MenuHistory', '', 'API/StrategyGame/Menu/AStrategyMenuHUD/MenuHistory/index.html', 'Menu history stack.', 0x00100020n);
registerSearchData('MenuButtonTexture', '', 'API/StrategyGame/Menu/AStrategyMenuHUD/MenuButtonTexture/index.html', 'Menu button texture.', 0x40100020n);
registerSearchData('MenuWidget', '', 'API/StrategyGame/Menu/AStrategyMenuHUD/MenuWidget/index.html', 'Menu widget pointer.', 0x00400020n);
registerSearchData('Difficulty', '', 'API/StrategyGame/Menu/AStrategyMenuHUD/Difficulty/index.html', 'Selected game difficulty.', 0x00400020n);
registerSearchData('AStrategyMenuPlayerController', '', 'API/StrategyGame/Menu/AStrategyMenuPlayerController/index.html', 'Copyright 1998-2019 Epic Games, Inc. All Rights Reserved.', 0x04000001n);
registerSearchData('FailedToSpawnPawn', '', 'API/StrategyGame/Menu/AStrategyMenuPlayerController/FailedToSpawnPawn/index.html', 'We know we won\'t have a pawn, so we don\'t care', 0x00140010n);
registerSearchData('SetupInputComponent', '', 'API/StrategyGame/Menu/AStrategyMenuPlayerController/SetupInputComponent/index.html', 'End Controller interface', 0x00240010n);
registerSearchData('UStrategyAnimInstance', '', 'API/StrategyGame/Pawns/UStrategyAnimInstance/index.html', 'Copyright 1998-2019 Epic Games, Inc. All Rights Reserved.', 0x04000001n);
registerSearchData('AnimNotify_Melee', '', 'API/StrategyGame/Pawns/UStrategyAnimInstance/AnimNotify_Melee/index.html', 'Notify pawn of the impact. ', 0x20100010n);
registerSearchData('UStrategyAttachment', '', 'API/StrategyGame/Pawns/UStrategyAttachment/index.html', 'Copyright 1998-2019 Epic Games, Inc. All Rights Reserved.', 0x04000001n);
registerSearchData('Effect', '', 'API/StrategyGame/Pawns/UStrategyAttachment/Effect/index.html', 'BuffData representing attachable effects on the pawn', 0x40100020n);
registerSearchData('AttachPoint', '', 'API/StrategyGame/Pawns/UStrategyAttachment/AttachPoint/index.html', 'Attach point on pawn', 0x40100020n);
registerSearchData('UStrategyCameraComponent', '', 'API/StrategyGame/Pawns/UStrategyCameraComponent/index.html', 'Copyright 1998-2019 Epic Games, Inc. All Rights Reserved.', 0x04000001n);
registerSearchData('GetCameraView', '', 'API/StrategyGame/Pawns/UStrategyCameraComponent/GetCameraView/index.html', 'Begin UCameraComponent interface', 0x00140010n);
registerSearchData('OnZoomIn', '', 'API/StrategyGame/Pawns/UStrategyCameraComponent/OnZoomIn/index.html', 'Handle zooming in.', 0x00100010n);
registerSearchData('OnZoomOut', '', 'API/StrategyGame/Pawns/UStrategyCameraComponent/OnZoomOut/index.html', 'Handle zooming out.', 0x00100010n);
registerSearchData('UpdateCameraMovement', '', 'API/StrategyGame/Pawns/UStrategyCameraComponent/UpdateCameraMovement/index.html', 'Update the mouse controlled camera movement. ', 0x00100010n);
registerSearchData('MoveForward', '', 'API/StrategyGame/Pawns/UStrategyCameraComponent/MoveForward/index.html', 'Move the camera on the forward axis ', 0x00100010n);
registerSearchData('MoveRight', '', 'API/StrategyGame/Pawns/UStrategyCameraComponent/MoveRight/index.html', 'Move the camera on the left/right axis ', 0x00100010n);
registerSearchData('AddNoScrollZone', '', 'API/StrategyGame/Pawns/UStrategyCameraComponent/AddNoScrollZone/index.html', 'Exclude an area from the mouse scroll movement update. (This will be reset at the end of each update). ', 0x00100010n);
registerSearchData('ClampCameraLocation', '', 'API/StrategyGame/Pawns/UStrategyCameraComponent/ClampCameraLocation/index.html', 'CLamp the Camera location. ', 0x00100010n);
registerSearchData('OnPinchStarted', '', 'API/StrategyGame/Pawns/UStrategyCameraComponent/OnPinchStarted/index.html', 'Handle the start of a \'pinch\'. ', 0x00100010n);
registerSearchData('OnPinchUpdate', '', 'API/StrategyGame/Pawns/UStrategyCameraComponent/OnPinchUpdate/index.html', 'Handle the start of a \'pinch\'. ', 0x00100010n);
registerSearchData('SetCameraTarget', '', 'API/StrategyGame/Pawns/UStrategyCameraComponent/SetCameraTarget/index.html', 'Set the desired camera position.', 0x00100010n);
registerSearchData('SetZoomLevel', '', 'API/StrategyGame/Pawns/UStrategyCameraComponent/SetZoomLevel/index.html', 'Sets the desired zoom level; clamping if necessary', 0x00100010n);
registerSearchData('OnSwipeStarted', '', 'API/StrategyGame/Pawns/UStrategyCameraComponent/OnSwipeStarted/index.html', 'Handle the start swipe/drag ', 0x00100010n);
registerSearchData('OnSwipeUpdate', '', 'API/StrategyGame/Pawns/UStrategyCameraComponent/OnSwipeUpdate/index.html', 'Handle the update of a swipe/drag ', 0x00100010n);
registerSearchData('OnSwipeReleased', '', 'API/StrategyGame/Pawns/UStrategyCameraComponent/OnSwipeReleased/index.html', 'Handle the start swipe/drag ', 0x00100010n);
registerSearchData('AreCoordsInNoScrollZone', '', 'API/StrategyGame/Pawns/UStrategyCameraComponent/AreCoordsInNoScrollZone/index.html', 'Handle the start swipe/drag ', 0x00100010n);
registerSearchData('EndSwipeNow', '', 'API/StrategyGame/Pawns/UStrategyCameraComponent/EndSwipeNow/index.html', 'Reset the swipe/drag', 0x00100010n);
registerSearchData('GetOwnerPawn', '', 'API/StrategyGame/Pawns/UStrategyCameraComponent/GetOwnerPawn/index.html', 'Return the pawn that owns this component.', 0x00400010n);
registerSearchData('GetPlayerController', '', 'API/StrategyGame/Pawns/UStrategyCameraComponent/GetPlayerController/index.html', 'Return the player controller of the pawn that owns this component.', 0x00400010n);
registerSearchData('UpdateCameraBounds', '', 'API/StrategyGame/Pawns/UStrategyCameraComponent/UpdateCameraBounds/index.html', 'Update the movement bounds of this component.', 0x00400010n);
registerSearchData('MinCameraOffset', '', 'API/StrategyGame/Pawns/UStrategyCameraComponent/MinCameraOffset/index.html', 'The minimum offset of the camera.', 0x40100020n);
registerSearchData('MaxCameraOffset', '', 'API/StrategyGame/Pawns/UStrategyCameraComponent/MaxCameraOffset/index.html', 'The maximum offset of the camera.', 0x40100020n);
registerSearchData('FixedCameraAngle', '', 'API/StrategyGame/Pawns/UStrategyCameraComponent/FixedCameraAngle/index.html', 'The angle to look down on the map.', 0x40100020n);
registerSearchData('CameraScrollSpeed', '', 'API/StrategyGame/Pawns/UStrategyCameraComponent/CameraScrollSpeed/index.html', 'How fast the camera moves around when the mouse is at the edge of the screen.', 0x40100020n);
registerSearchData('CameraActiveBorder', '', 'API/StrategyGame/Pawns/UStrategyCameraComponent/CameraActiveBorder/index.html', 'Size of the area at the edge of the screen that will trigger camera scrolling.', 0x40100020n);
registerSearchData('MinZoomLevel', '', 'API/StrategyGame/Pawns/UStrategyCameraComponent/MinZoomLevel/index.html', 'Minimum amount of camera zoom (How close we can get to the map).', 0x40100020n);
registerSearchData('MaxZoomLevel', '', 'API/StrategyGame/Pawns/UStrategyCameraComponent/MaxZoomLevel/index.html', 'Maximum amount of camera zoom (How close we can get to the map).', 0x40100020n);
registerSearchData('MiniMapBoundsLimit', '', 'API/StrategyGame/Pawns/UStrategyCameraComponent/MiniMapBoundsLimit/index.html', 'Percentage of minimap where center of camera can be placed.', 0x40100020n);
registerSearchData('CameraMovementBounds', '', 'API/StrategyGame/Pawns/UStrategyCameraComponent/CameraMovementBounds/index.html', 'Bounds for camera movement.', 0x00100020n);
registerSearchData('CameraMovementViewportSize', '', 'API/StrategyGame/Pawns/UStrategyCameraComponent/CameraMovementViewportSize/index.html', 'Viewport size associated with camera bounds.', 0x00100020n);
registerSearchData('bShouldClampCamera', '', 'API/StrategyGame/Pawns/UStrategyCameraComponent/bShouldClampCamera/index.html', 'If set, camera position will be clamped to movement bounds.', 0x40100020n);
registerSearchData('NoScrollZones', '', 'API/StrategyGame/Pawns/UStrategyCameraComponent/NoScrollZones/index.html', 'List of zones to exclude from scrolling during the camera movement update.', 0x00400020n);
registerSearchData('InitialPinchAlpha', '', 'API/StrategyGame/Pawns/UStrategyCameraComponent/InitialPinchAlpha/index.html', 'Initial Zoom alpha when starting pinch.', 0x00400020n);
registerSearchData('ZoomAlpha', '', 'API/StrategyGame/Pawns/UStrategyCameraComponent/ZoomAlpha/index.html', 'Current amount of camera zoom.', 0x00400020n);
registerSearchData('StartSwipeCoords', '', 'API/StrategyGame/Pawns/UStrategyCameraComponent/StartSwipeCoords/index.html', 'The initial position of the swipe/drag.', 0x00400020n);
registerSearchData('AStrategySpectatorPawn', '', 'API/StrategyGame/Pawns/AStrategySpectatorPawn/index.html', '@TODO: Write a comment here', 0x04000001n);
registerSearchData('MoveForward', '', 'API/StrategyGame/Pawns/AStrategySpectatorPawn/MoveForward/index.html', 'event call on move forward input', 0x00140010n);
registerSearchData('MoveRight', '', 'API/StrategyGame/Pawns/AStrategySpectatorPawn/MoveRight/index.html', 'event call on strafe right input', 0x00140010n);
registerSearchData('SetupPlayerInputComponent', '', 'API/StrategyGame/Pawns/AStrategySpectatorPawn/SetupPlayerInputComponent/index.html', 'Add custom key bindings', 0x00140010n);
registerSearchData('OnMouseScrollUp', '', 'API/StrategyGame/Pawns/AStrategySpectatorPawn/OnMouseScrollUp/index.html', 'Handles the mouse scrolling down.', 0x00100010n);
registerSearchData('OnMouseScrollDown', '', 'API/StrategyGame/Pawns/AStrategySpectatorPawn/OnMouseScrollDown/index.html', 'Handles the mouse scrolling up.', 0x00100010n);
registerSearchData('GetStrategyCameraComponent', '', 'API/StrategyGame/Pawns/AStrategySpectatorPawn/GetStrategyCameraComponent/index.html', 'Returns a pointer to the strategy camera component the pawn has.', 0x00100010n);
registerSearchData('StrategyCameraComponent', '', 'API/StrategyGame/Pawns/AStrategySpectatorPawn/StrategyCameraComponent/index.html', 'The camera component for this camera', 0x40400020n);
registerSearchData('UStrategySpectatorPawnMovement', '', 'API/StrategyGame/Pawns/UStrategySpectatorPawnMovement/index.html', 'Copyright 1998-2019 Epic Games, Inc. All Rights Reserved.', 0x04000001n);
registerSearchData('TickComponent', '', 'API/StrategyGame/Pawns/UStrategySpectatorPawnMovement/TickComponent/index.html', '', 0x00140010n);
registerSearchData('bInitialLocationSet', '', 'API/StrategyGame/Pawns/UStrategySpectatorPawnMovement/bInitialLocationSet/index.html', '', 0x00400020n);
registerSearchData('UStrategyCheatManager', '', 'API/StrategyGame/Player/UStrategyCheatManager/index.html', 'Copyright 1998-2019 Epic Games, Inc. All Rights Reserved.', 0x04000001n);
registerSearchData('AddGold', '', 'API/StrategyGame/Player/UStrategyCheatManager/AddGold/index.html', 'Give the player gold. ', 0x20100010n);
registerSearchData('FActionBinding1P', '', 'API/StrategyGame/Player/FActionBinding1P/index.html', '', 0x00000002n);
registerSearchData('Key', '', 'API/StrategyGame/Player/FActionBinding1P/Key/index.html', 'key to bind it to', 0x00100020n);
registerSearchData('KeyEvent', '', 'API/StrategyGame/Player/FActionBinding1P/KeyEvent/index.html', 'Key event to bind it to, e.g. pressed, released, dblclick', 0x00100020n);
registerSearchData('ActionDelegate', '', 'API/StrategyGame/Player/FActionBinding1P/ActionDelegate/index.html', 'action', 0x00100020n);
registerSearchData('FActionBinding2P', '', 'API/StrategyGame/Player/FActionBinding2P/index.html', '', 0x00000002n);
registerSearchData('Key', '', 'API/StrategyGame/Player/FActionBinding2P/Key/index.html', 'key to bind it to', 0x00100020n);
registerSearchData('KeyEvent', '', 'API/StrategyGame/Player/FActionBinding2P/KeyEvent/index.html', 'Key event to bind it to, e.g. pressed, released, dblclick', 0x00100020n);
registerSearchData('ActionDelegate', '', 'API/StrategyGame/Player/FActionBinding2P/ActionDelegate/index.html', 'action', 0x00100020n);
registerSearchData('FSimpleKeyState', '', 'API/StrategyGame/Player/FSimpleKeyState/index.html', '', 0x00000002n);
registerSearchData('FSimpleKeyState', '', 'API/StrategyGame/Player/FSimpleKeyState/FSimpleKeyState/index.html', '', 0x80100010n);
registerSearchData('Events', '', 'API/StrategyGame/Player/FSimpleKeyState/Events/index.html', 'current events indexed with: IE_Pressed, IE_Released, IE_Repeat', 0x00100020n);
registerSearchData('bDown', '', 'API/StrategyGame/Player/FSimpleKeyState/bDown/index.html', 'is it pressed? (unused in tap & hold)', 0x00100020n);
registerSearchData('Position', '', 'API/StrategyGame/Player/FSimpleKeyState/Position/index.html', 'position associated with event', 0x00100020n);
registerSearchData('Position2', '', 'API/StrategyGame/Player/FSimpleKeyState/Position2/index.html', 'position associated with event', 0x00100020n);
registerSearchData('DownTime', '', 'API/StrategyGame/Player/FSimpleKeyState/DownTime/index.html', 'accumulated down time', 0x00100020n);
registerSearchData('UStrategyInput', '', 'API/StrategyGame/Player/UStrategyInput/index.html', '', 0x04000001n);
registerSearchData('UpdateDetection', '', 'API/StrategyGame/Player/UStrategyInput/UpdateDetection/index.html', 'update detection', 0x00100010n);
registerSearchData('GetTouchAnchor', '', 'API/StrategyGame/Player/UStrategyInput/GetTouchAnchor/index.html', 'get touch anchor position', 0x00900010n);
registerSearchData('UpdateGameKeys', '', 'API/StrategyGame/Player/UStrategyInput/UpdateGameKeys/index.html', 'update game key recognition', 0x00200010n);
registerSearchData('ProcessKeyStates', '', 'API/StrategyGame/Player/UStrategyInput/ProcessKeyStates/index.html', 'process input state and call handlers', 0x00200010n);
registerSearchData('DetectOnePointActions', '', 'API/StrategyGame/Player/UStrategyInput/DetectOnePointActions/index.html', 'detect one point actions (touch and mouse)', 0x00200010n);
registerSearchData('DetectTwoPointsActions', '', 'API/StrategyGame/Player/UStrategyInput/DetectTwoPointsActions/index.html', 'detect two points actions (touch only)', 0x00200010n);
registerSearchData('ActionBindings1P', '', 'API/StrategyGame/Player/UStrategyInput/ActionBindings1P/index.html', 'bindings for custom game events', 0x00100020n);
registerSearchData('ActionBindings2P', '', 'API/StrategyGame/Player/UStrategyInput/ActionBindings2P/index.html', '', 0x00100020n);
registerSearchData('KeyStateMap', '', 'API/StrategyGame/Player/UStrategyInput/KeyStateMap/index.html', 'game key states', 0x00200020n);
registerSearchData('TouchAnchors', '', 'API/StrategyGame/Player/UStrategyInput/TouchAnchors/index.html', 'touch anchors', 0x00200020n);
registerSearchData('Touch0DownTime', '', 'API/StrategyGame/Player/UStrategyInput/Touch0DownTime/index.html', 'how long was touch 0 pressed?', 0x00200020n);
registerSearchData('TwoPointsDownTime', '', 'API/StrategyGame/Player/UStrategyInput/TwoPointsDownTime/index.html', 'how long was two points pressed?', 0x00200020n);
registerSearchData('MaxPinchDistanceSq', '', 'API/StrategyGame/Player/UStrategyInput/MaxPinchDistanceSq/index.html', 'max distance delta for current pinch', 0x00200020n);
registerSearchData('PrevTouchState', '', 'API/StrategyGame/Player/UStrategyInput/PrevTouchState/index.html', 'prev touch states for recognition', 0x00200020n);
registerSearchData('bTwoPointsTouch', '', 'API/StrategyGame/Player/UStrategyInput/bTwoPointsTouch/index.html', 'is two points touch active?', 0x00200020n);
registerSearchData('IStrategyGameLoadingScreenModule', '', 'API/StrategyGameLoadingScreen/IStrategyGameLoadingScreenModule/index.html', 'Module interface for this game\'s loading screens', 0x00000001n);
registerSearchData('StartInGameLoadingScreen', '', 'API/StrategyGameLoadingScreen/IStrategyGameLoadingScreenModule/StartInGameLoadingScreen/index.html', 'Kicks off the loading screen for in game loading (not startup)', 0x00140010n);
registerSearchData('EStrategyTeam', '', 'API/StrategyGame/EStrategyTeam/index.html', 'Copyright 1998-2019 Epic Games, Inc. All Rights Reserved.', 0x10000008n);
registerSearchData('Type', '', 'API/StrategyGame/Menu/Type/index.html', '', 0x00000008n);
registerSearchData('EGameDifficulty', '', 'API/StrategyGame/EGameDifficulty/index.html', '', 0x10000008n);
registerSearchData('EGameKey', '', 'API/StrategyGame/EGameKey/index.html', '', 0x00000004n);
registerSearchData('EGameplayState', '', 'API/StrategyGame/EGameplayState/index.html', '', 0x00000004n);
registerSearchData('MenuHelper', '', 'API/StrategyGame/MenuHelper/index.html', '', 0x00000004n);
registerSearchData('PlaySoundAndCall', '', 'API/StrategyGame/MenuHelper/PlaySoundAndCall/index.html', '', 0x02100010n);
registerSearchData('PlaySoundAndCallSP', '', 'API/StrategyGame/MenuHelper/PlaySoundAndCallSP/index.html', '', 0x02100010n);
registerSearchData('PlaySoundAndCallSP', '', 'API/StrategyGame/MenuHelper/PlaySoundAndCallSP-1-0/index.html', '', 0x02100010n);
registerSearchData('GetSoundPlaybackPosition', '', 'API/StrategyGame/MenuHelper/GetSoundPlaybackPosition/index.html', '', 0x00100010n);
registerSearchData('EPathUpdate', '', 'API/StrategyGame/AI/EPathUpdate/index.html', '', 0x00000004n);
registerSearchData('EMenuAction', '', 'API/StrategyGame/Menu/EMenuAction/index.html', 'Copyright 1998-2019 Epic Games, Inc. All Rights Reserved.', 0x00000004n);
registerSearchData('StrategyGame', '', 'API/StrategyGame/index.html', '', 0x00002000n);
registerSearchData('StrategyGameLoadingScreen', '', 'API/StrategyGameLoadingScreen/index.html', '', 0x00002000n);
registerSearchData('UI', '', 'API/StrategyGame/UI/index.html', '', 0x00004000n);
registerSearchData('Widgets', '', 'API/StrategyGame/UI/Widgets/index.html', '', 0x00004000n);
registerSearchData('Menu', '', 'API/StrategyGame/UI/Menu/index.html', '', 0x00004000n);
registerSearchData('Style', '', 'API/StrategyGame/UI/Style/index.html', '', 0x00004000n);
registerSearchData('Interfaces', '', 'API/StrategyGame/Interfaces/index.html', '', 0x00004000n);
registerSearchData('Pawns', '', 'API/StrategyGame/Pawns/index.html', '', 0x00004000n);
registerSearchData('Player', '', 'API/StrategyGame/Player/index.html', '', 0x00004000n);
registerSearchData('AI', '', 'API/StrategyGame/AI/index.html', '', 0x00004000n);
registerSearchData('Buildings', '', 'API/StrategyGame/Buildings/index.html', '', 0x00004000n);
registerSearchData('Menu', '', 'API/StrategyGame/Menu/index.html', '', 0x00004000n);
registerSearchData('Game', '', 'BlueprintAPI/Game/index.html', '', 0x00008000n);
registerSearchData('Attachment', '', 'BlueprintAPI/Attachment/index.html', '', 0x00008000n);
registerSearchData('Health', '', 'BlueprintAPI/Health/index.html', '', 0x00008000n);
registerSearchData('Pawn', '', 'BlueprintAPI/Pawn/index.html', '', 0x00008000n);
registerSearchData('ResourceNode', '', 'BlueprintAPI/ResourceNode/index.html', '', 0x00008000n);
registerSearchData('Building', '', 'BlueprintAPI/Building/index.html', '', 0x00008000n);
registerSearchData('Brewery', '', 'BlueprintAPI/Brewery/index.html', '', 0x00008000n);
registerSearchData('BaseProjectile', '', 'ContentAPI/Game/Projectiles/BaseProjectile/index.html', '', 0x00000080n);
registerSearchData('UserConstructionScript', 'User Construction Script', 'ContentAPI/Game/Projectiles/BaseProjectile/UserConstructionScript/index.html', '', 0x00140800n);
registerSearchData('Projectile_arbalest', '', 'ContentAPI/Game/Projectiles/Projectile_arbalest/index.html', '', 0x00000080n);
registerSearchData('OnProjectileHit', '', 'ContentAPI/Game/Projectiles/Projectile_arbalest/OnProjectileHit/index.html', '', 0x00000400n);
registerSearchData('UserConstructionScript', 'User Construction Script', 'ContentAPI/Game/Projectiles/Projectile_arbalest/UserConstructionScript/index.html', '', 0x00140800n);
registerSearchData('Wall_arbalest', '', 'ContentAPI/Game/Buildings/Wall/Wall_arbalest/index.html', '', 0x00000080n);
registerSearchData('OnSwipeReleasedEvent', '', 'ContentAPI/Game/Buildings/Wall/Wall_arbalest/OnSwipeReleasedEvent/index.html', '', 0x00000400n);
registerSearchData('OnSwipeUpdateEvent', '', 'ContentAPI/Game/Buildings/Wall/Wall_arbalest/OnSwipeUpdateEvent/index.html', '', 0x00000400n);
registerSearchData('OnBuildFinished', '', 'ContentAPI/Game/Buildings/Wall/Wall_arbalest/OnBuildFinished/index.html', '', 0x00000400n);
registerSearchData('AutoShooting', '', 'ContentAPI/Game/Buildings/Wall/Wall_arbalest/AutoShooting/index.html', '', 0x00000400n);
registerSearchData('BndEvt__firefield_K2Node_ComponentBoundEvent_1_ComponentBeginOverlapSignature__DelegateSignature', '', 'ContentAPI/Game/Buildings/Wall/Wall_arbalest/BndEvt__firefield_K2Node_ComponentBoundEvent_1_ComponentBeginOverlapSignature__DelegateSignature/index.html', '', 0x00080400n);
registerSearchData('BndEvt__firefield_K2Node_ComponentBoundEvent_9_ComponentEndOverlapSignature__DelegateSignature', '', 'ContentAPI/Game/Buildings/Wall/Wall_arbalest/BndEvt__firefield_K2Node_ComponentBoundEvent_9_ComponentEndOverlapSignature__DelegateSignature/index.html', '', 0x00080400n);
registerSearchData('OnBuildStarted', '', 'ContentAPI/Game/Buildings/Wall/Wall_arbalest/OnBuildStarted/index.html', '', 0x00000400n);
registerSearchData('Repeat Auto', '', 'ContentAPI/Game/Buildings/Wall/Wall_arbalest/Repeat Auto/index.html', '', 0x00000400n);
registerSearchData('UserConstructionScript', 'User Construction Script', 'ContentAPI/Game/Buildings/Wall/Wall_arbalest/UserConstructionScript/index.html', '', 0x00140800n);
registerSearchData('EnemyTargets', 'Enemy Targets', 'ContentAPI/Game/Buildings/Wall/Wall_arbalest/EnemyTargets/index.html', '', 0x00101000n);
registerSearchData('AutoShoot', 'Auto Shoot', 'ContentAPI/Game/Buildings/Wall/Wall_arbalest/AutoShoot/index.html', '', 0x00101000n);
registerSearchData('LoopAlwaysTrue', 'Loop Always True', 'ContentAPI/Game/Buildings/Wall/Wall_arbalest/LoopAlwaysTrue/index.html', '', 0x00101000n);
registerSearchData('Shoot dir', 'Shoot dir', 'ContentAPI/Game/Buildings/Wall/Wall_arbalest/Shoot dir/index.html', '', 0x00101000n);
registerSearchData('Spawn loc', 'Spawn loc', 'ContentAPI/Game/Buildings/Wall/Wall_arbalest/Spawn loc/index.html', '', 0x00101000n);
registerSearchData('Damage', 'Damage', 'ContentAPI/Game/Buildings/Wall/Wall_arbalest/Damage/index.html', '', 0x00101000n);
registerSearchData('PlayerOperated', 'Player Operated', 'ContentAPI/Game/Buildings/Wall/Wall_arbalest/PlayerOperated/index.html', '', 0x00101000n);
registerSearchData('RepeatAutoShot', 'Repeat Auto Shot', 'ContentAPI/Game/Buildings/Wall/Wall_arbalest/RepeatAutoShot/index.html', '', 0x00101000n);
registerSearchData('ColorOK', 'Color OK', 'ContentAPI/Game/Buildings/Wall/Wall_arbalest/ColorOK/index.html', '', 0x00101000n);
registerSearchData('DirZero', 'Dir Zero', 'ContentAPI/Game/Buildings/Wall/Wall_arbalest/DirZero/index.html', '', 0x00101000n);
registerSearchData('Interface_Auto_Projectile', '', 'ContentAPI/Game/Interface_Auto_Projectile/index.html', '', 0x00000080n);
registerSearchData('DestroyProjectile', 'Destroy Projectile', 'ContentAPI/Game/Interface_Auto_Projectile/DestroyProjectile/index.html', '', 0x00140800n);
registerSearchData('Wall_arbalest_auto', '', 'ContentAPI/Game/Buildings/Wall/Wall_arbalest_auto/index.html', '', 0x00000080n);
registerSearchData('Arbalest Shot Hit', '', 'ContentAPI/Game/Buildings/Wall/Wall_arbalest_auto/Arbalest Shot Hit/index.html', '', 0x00000400n);
registerSearchData('OnBuildStarted', '', 'ContentAPI/Game/Buildings/Wall/Wall_arbalest_auto/OnBuildStarted/index.html', '', 0x00000400n);
registerSearchData('OnSwipeReleasedEvent', '', 'ContentAPI/Game/Buildings/Wall/Wall_arbalest_auto/OnSwipeReleasedEvent/index.html', '', 0x00000400n);
registerSearchData('OnSwipeUpdateEvent', '', 'ContentAPI/Game/Buildings/Wall/Wall_arbalest_auto/OnSwipeUpdateEvent/index.html', '', 0x00000400n);
registerSearchData('OnBuildFinished', '', 'ContentAPI/Game/Buildings/Wall/Wall_arbalest_auto/OnBuildFinished/index.html', '', 0x00000400n);
registerSearchData('UserConstructionScript', 'User Construction Script', 'ContentAPI/Game/Buildings/Wall/Wall_arbalest_auto/UserConstructionScript/index.html', '', 0x00140800n);
registerSearchData('Shoot dir', 'Shoot dir', 'ContentAPI/Game/Buildings/Wall/Wall_arbalest_auto/Shoot dir/index.html', '', 0x00101000n);
registerSearchData('PlayerOperated', 'Player Operated', 'ContentAPI/Game/Buildings/Wall/Wall_arbalest_auto/PlayerOperated/index.html', '', 0x00101000n);
registerSearchData('Damage', 'Damage', 'ContentAPI/Game/Buildings/Wall/Wall_arbalest_auto/Damage/index.html', '', 0x00101000n);
registerSearchData('AutoShootDirection', 'Auto Shoot Direction', 'ContentAPI/Game/Buildings/Wall/Wall_arbalest_auto/AutoShootDirection/index.html', '', 0x00101000n);
registerSearchData('TowerRotation', 'Tower Rotation', 'ContentAPI/Game/Buildings/Wall/Wall_arbalest_auto/TowerRotation/index.html', '', 0x00101000n);
registerSearchData('ColorOK', 'Color OK', 'ContentAPI/Game/Buildings/Wall/Wall_arbalest_auto/ColorOK/index.html', '', 0x00101000n);
registerSearchData('DirZero', 'Dir Zero', 'ContentAPI/Game/Buildings/Wall/Wall_arbalest_auto/DirZero/index.html', '', 0x00101000n);
registerSearchData('Projectile_arbalest_auto', '', 'ContentAPI/Game/Projectiles/Projectile_arbalest_auto/index.html', '', 0x00000080n);
registerSearchData('OnProjectileHit', '', 'ContentAPI/Game/Projectiles/Projectile_arbalest_auto/OnProjectileHit/index.html', '', 0x00000400n);
registerSearchData('DestroyProjectile', '', 'ContentAPI/Game/Projectiles/Projectile_arbalest_auto/DestroyProjectile/index.html', '', 0x00080400n);
registerSearchData('OnProjectileDestroyed', '', 'ContentAPI/Game/Projectiles/Projectile_arbalest_auto/OnProjectileDestroyed/index.html', '', 0x00000400n);
registerSearchData('UserConstructionScript', 'User Construction Script', 'ContentAPI/Game/Projectiles/Projectile_arbalest_auto/UserConstructionScript/index.html', '', 0x00140800n);
registerSearchData('ReferenceToActor', 'Reference To Actor', 'ContentAPI/Game/Projectiles/Projectile_arbalest_auto/ReferenceToActor/index.html', '', 0x00101000n);
registerSearchData('Flamethrower_slowdown_interface', '', 'ContentAPI/Game/Buildings/Wall/Flamethrower_slowdown_interface/index.html', '', 0x00000080n);
registerSearchData('Slowdown interface function', 'Slowdown interface function', 'ContentAPI/Game/Buildings/Wall/Flamethrower_slowdown_interface/Slowdown interface function/index.html', '', 0x00140800n);
registerSearchData('Wall_Flamethrower', '', 'ContentAPI/Game/Buildings/Wall/Wall_Flamethrower/index.html', '', 0x00000080n);
registerSearchData('OnBuildFinished', '', 'ContentAPI/Game/Buildings/Wall/Wall_Flamethrower/OnBuildFinished/index.html', '', 0x00000400n);
registerSearchData('OnHoldReleasedEvent', '', 'ContentAPI/Game/Buildings/Wall/Wall_Flamethrower/OnHoldReleasedEvent/index.html', '', 0x00000400n);
registerSearchData('Damage', '', 'ContentAPI/Game/Buildings/Wall/Wall_Flamethrower/Damage/index.html', '', 0x00000400n);
registerSearchData('OnHoldEvent', '', 'ContentAPI/Game/Buildings/Wall/Wall_Flamethrower/OnHoldEvent/index.html', '', 0x00000400n);
registerSearchData('Set Bar to Ready', '', 'ContentAPI/Game/Buildings/Wall/Wall_Flamethrower/Set Bar to Ready/index.html', '', 0x00000400n);
registerSearchData('Close and Reset Gates', '', 'ContentAPI/Game/Buildings/Wall/Wall_Flamethrower/Close and Reset Gates/index.html', '', 0x00000400n);
registerSearchData('OnBuildStarted', '', 'ContentAPI/Game/Buildings/Wall/Wall_Flamethrower/OnBuildStarted/index.html', '', 0x00000400n);
registerSearchData('Safety HoldOn mechanism', '', 'ContentAPI/Game/Buildings/Wall/Wall_Flamethrower/Safety HoldOn mechanism/index.html', '', 0x00000400n);
registerSearchData('Auto Attack - Flamethrower', '', 'ContentAPI/Game/Buildings/Wall/Wall_Flamethrower/Auto Attack - Flamethrower/index.html', '', 0x00000400n);
registerSearchData('Stop Auto Attack', '', 'ContentAPI/Game/Buildings/Wall/Wall_Flamethrower/Stop Auto Attack/index.html', '', 0x00000400n);
registerSearchData('StartChargingBar', '', 'ContentAPI/Game/Buildings/Wall/Wall_Flamethrower/StartChargingBar/index.html', '', 0x00000400n);
registerSearchData('SetAutoVis', '', 'ContentAPI/Game/Buildings/Wall/Wall_Flamethrower/SetAutoVis/index.html', '', 0x00000400n);
registerSearchData('UserConstructionScript', 'User Construction Script', 'ContentAPI/Game/Buildings/Wall/Wall_Flamethrower/UserConstructionScript/index.html', '', 0x00140800n);
registerSearchData('Slowdown interface function', 'Slowdown interface function', 'ContentAPI/Game/Buildings/Wall/Wall_Flamethrower/Slowdown interface function/index.html', '', 0x00140800n);
registerSearchData('OverlapingActors', 'Overlaping Actors', 'ContentAPI/Game/Buildings/Wall/Wall_Flamethrower/OverlapingActors/index.html', '', 0x00101000n);
registerSearchData('FlamedActors', 'Flamed Actors', 'ContentAPI/Game/Buildings/Wall/Wall_Flamethrower/FlamedActors/index.html', '', 0x00101000n);
registerSearchData('CanAttack', 'Can Attack', 'ContentAPI/Game/Buildings/Wall/Wall_Flamethrower/CanAttack/index.html', '', 0x00101000n);
registerSearchData('Can Auto Attack', 'Can Auto Attack', 'ContentAPI/Game/Buildings/Wall/Wall_Flamethrower/Can Auto Attack/index.html', '', 0x00101000n);
registerSearchData('DamageOverTime', 'Damage Over Time', 'ContentAPI/Game/Buildings/Wall/Wall_Flamethrower/DamageOverTime/index.html', '', 0x00101000n);
registerSearchData('FlamePillars', 'Flame Pillars', 'ContentAPI/Game/Buildings/Wall/Wall_Flamethrower/FlamePillars/index.html', '', 0x00101000n);
registerSearchData('Wall_EmptySlot', '', 'ContentAPI/Game/Buildings/Wall/Wall_EmptySlot/index.html', '', 0x00000080n);
registerSearchData('UserConstructionScript', 'User Construction Script', 'ContentAPI/Game/Buildings/Wall/Wall_EmptySlot/UserConstructionScript/index.html', '', 0x00140800n);
registerSearchData('Brewery', '', 'ContentAPI/Game/Buildings/Brewery/Brewery/index.html', '', 0x00000080n);
registerSearchData('UserConstructionScript', 'User Construction Script', 'ContentAPI/Game/Buildings/Brewery/Brewery/UserConstructionScript/index.html', '', 0x00140800n);
registerSearchData('Is_built', 'Is_built', 'ContentAPI/Game/Buildings/Brewery/Brewery/Is_built/index.html', '', 0x00101000n);
registerSearchData('Is_health<50', 'Is_health<50', 'ContentAPI/Game/Buildings/Brewery/Brewery/Is_health<50/index.html', '', 0x00101000n);
registerSearchData('Is_ready_to_shoot', 'Is_ready_to_shoot', 'ContentAPI/Game/Buildings/Brewery/Brewery/Is_ready_to_shoot/index.html', '', 0x00101000n);
registerSearchData('ArmorerBlueprint', 'Armorer Blueprint', 'ContentAPI/Game/Buildings/Brewery/Brewery/ArmorerBlueprint/index.html', '', 0x00101000n);
registerSearchData('SmithyBlueprint', 'Smithy Blueprint', 'ContentAPI/Game/Buildings/Brewery/Brewery/SmithyBlueprint/index.html', '', 0x00101000n);
registerSearchData('SmithyBuilt', 'Smithy Built', 'ContentAPI/Game/Buildings/Brewery/Brewery/SmithyBuilt/index.html', '', 0x00101000n);
registerSearchData('Wall_Armorer', '', 'ContentAPI/Game/Buildings/Wall/Wall_Armorer/index.html', '', 0x00000080n);
registerSearchData('OnBuildFinished', '', 'ContentAPI/Game/Buildings/Wall/Wall_Armorer/OnBuildFinished/index.html', '', 0x00000400n);
registerSearchData('OnBuildStarted', '', 'ContentAPI/Game/Buildings/Wall/Wall_Armorer/OnBuildStarted/index.html', '', 0x00000400n);
registerSearchData('UserConstructionScript', 'User Construction Script', 'ContentAPI/Game/Buildings/Wall/Wall_Armorer/UserConstructionScript/index.html', '', 0x00140800n);
registerSearchData('IsBuild', 'Is Build', 'ContentAPI/Game/Buildings/Wall/Wall_Armorer/IsBuild/index.html', '', 0x00101000n);
registerSearchData('OverlapingActors', 'Overlaping Actors', 'ContentAPI/Game/Buildings/Wall/Wall_Armorer/OverlapingActors/index.html', '', 0x00101000n);
registerSearchData('Wall_EmptySlot_Brewery', '', 'ContentAPI/Game/Buildings/Wall/Wall_EmptySlot_Brewery/index.html', '', 0x00000080n);
registerSearchData('UserConstructionScript', 'User Construction Script', 'ContentAPI/Game/Buildings/Wall/Wall_EmptySlot_Brewery/UserConstructionScript/index.html', '', 0x00140800n);
registerSearchData('Wall_Smithy', '', 'ContentAPI/Game/Buildings/Wall/Wall_Smithy/index.html', '', 0x00000080n);
registerSearchData('OnBuildFinished', '', 'ContentAPI/Game/Buildings/Wall/Wall_Smithy/OnBuildFinished/index.html', '', 0x00000400n);
registerSearchData('OnBuildStarted', '', 'ContentAPI/Game/Buildings/Wall/Wall_Smithy/OnBuildStarted/index.html', '', 0x00000400n);
registerSearchData('UserConstructionScript', 'User Construction Script', 'ContentAPI/Game/Buildings/Wall/Wall_Smithy/UserConstructionScript/index.html', '', 0x00140800n);
registerSearchData('IsBuild', 'Is Build', 'ContentAPI/Game/Buildings/Wall/Wall_Smithy/IsBuild/index.html', '', 0x00101000n);
registerSearchData('Attachment_Armorer', '', 'ContentAPI/Game/Characters/DwarfGrunt/Blueprint/Attachment_Armorer/index.html', '', 0x00000080n);
registerSearchData('Attachment_Smithy', '', 'ContentAPI/Game/Characters/DwarfGrunt/Blueprint/Attachment_Smithy/index.html', '', 0x00000080n);
registerSearchData('Minion', '', 'ContentAPI/Game/Characters/DwarfGrunt/Blueprint/Minion/index.html', '', 0x00000080n);
registerSearchData('Set Speed', '', 'ContentAPI/Game/Characters/DwarfGrunt/Blueprint/Minion/Set Speed/index.html', '', 0x00000400n);
registerSearchData('ReceiveAnyDamage', '', 'ContentAPI/Game/Characters/DwarfGrunt/Blueprint/Minion/ReceiveAnyDamage/index.html', '', 0x00000400n);
registerSearchData('UserConstructionScript', 'User Construction Script', 'ContentAPI/Game/Characters/DwarfGrunt/Blueprint/Minion/UserConstructionScript/index.html', '', 0x00140800n);
registerSearchData('Slowdown interface function', 'Slowdown interface function', 'ContentAPI/Game/Characters/DwarfGrunt/Blueprint/Minion/Slowdown interface function/index.html', '', 0x00140800n);
registerSearchData('OriginalSpeed', 'Original Speed', 'ContentAPI/Game/Characters/DwarfGrunt/Blueprint/Minion/OriginalSpeed/index.html', '', 0x00101000n);
registerSearchData('GoldPickup', '', 'ContentAPI/Game/Resources/GoldPickup/index.html', '', 0x00000080n);
registerSearchData('OnDepleted', '', 'ContentAPI/Game/Resources/GoldPickup/OnDepleted/index.html', '', 0x00000400n);
registerSearchData('ReceiveBeginPlay', '', 'ContentAPI/Game/Resources/GoldPickup/ReceiveBeginPlay/index.html', '', 0x00000400n);
registerSearchData('MainGoldLoop', '', 'ContentAPI/Game/Resources/GoldPickup/MainGoldLoop/index.html', '', 0x00000400n);
registerSearchData('UserConstructionScript', 'User Construction Script', 'ContentAPI/Game/Resources/GoldPickup/UserConstructionScript/index.html', '', 0x00140800n);
registerSearchData('InitialTrans', 'Initial Trans', 'ContentAPI/Game/Resources/GoldPickup/InitialTrans/index.html', '', 0x00101000n);
registerSearchData('MaxTrans', 'Max Trans', 'ContentAPI/Game/Resources/GoldPickup/MaxTrans/index.html', '', 0x00101000n);
registerSearchData('WasVisible', 'Was Visible', 'ContentAPI/Game/Resources/GoldPickup/WasVisible/index.html', '', 0x00101000n);
registerSearchData('Taken', 'Taken', 'ContentAPI/Game/Resources/GoldPickup/Taken/index.html', '', 0x00101000n);
registerSearchData('MiniMapCapture', '', 'ContentAPI/Game/UI/MiniMapCapture/index.html', '', 0x00000080n);
registerSearchData('UserConstructionScript', 'User Construction Script', 'ContentAPI/Game/UI/MiniMapCapture/UserConstructionScript/index.html', '', 0x00140800n);
registerSearchData('DwarfGruntAnimationBlueprint_new', '', 'ContentAPI/Game/Characters/DwarfGrunt/Blueprint/DwarfGruntAnimationBlueprint_new/index.html', '', 0x00000080n);
registerSearchData('BlueprintUpdateAnimation', '', 'ContentAPI/Game/Characters/DwarfGrunt/Blueprint/DwarfGruntAnimationBlueprint_new/BlueprintUpdateAnimation/index.html', '', 0x00000400n);
registerSearchData('Direction', 'Direction', 'ContentAPI/Game/Characters/DwarfGrunt/Blueprint/DwarfGruntAnimationBlueprint_new/Direction/index.html', '', 0x00101000n);
registerSearchData('Speed', 'Speed', 'ContentAPI/Game/Characters/DwarfGrunt/Blueprint/DwarfGruntAnimationBlueprint_new/Speed/index.html', '', 0x00101000n);
