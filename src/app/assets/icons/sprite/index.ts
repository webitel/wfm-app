import { fillIconsRepository } from '@webitel/ui-sdk';
import wfmLookups from './wfm-lookups.svg?raw';

const icons = {
	'wfm-lookups': wfmLookups,
};

fillIconsRepository({
	icons: Object.entries(icons).map(([iconName, svg]) => ({
		iconName,
		svg,
	})),
});
