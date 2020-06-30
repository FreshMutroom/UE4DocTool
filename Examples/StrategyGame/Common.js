/**
 *	Similar to the function sectionOnClick in udn.js
 *
 *	@param headingDiv - the element that is usually clicked
 *	@param elementToExpandOrCollapse - the element that will be expanded or collapsed
 */
function onExpandableHeadingClicked(headingDiv, elementToExpandOrCollapse)
{
	if (headingDiv.className == 'heading expanded')
	{
		headingDiv.classList.remove('expanded');
		headingDiv.classList.add('expandable');
		elementToExpandOrCollapse.style.display = 'none';
	}
	else
	{
		headingDiv.classList.remove('expandable');
		headingDiv.classList.add('expanded');
		elementToExpandOrCollapse.style.display = 'block';
	}
}

